'use client'

import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, Download, X, FileText, FileSpreadsheet, Presentation, BarChart3 } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import type { Inspecao } from '@/types'

const INSP_GREEN = '#10B981'
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

interface FiltrosInspecao {
  obra_id?: string
  tst_id?: string
  encarregado_id?: string
  coordenador_id?: string
  data_inicio?: string
  data_fim?: string
  busca?: string
  status?: string
}

function filtrarInspecoes(inspecoes: Inspecao[], f: FiltrosInspecao): Inspecao[] {
  return inspecoes.filter(i => {
    if (f.obra_id && i.obra_id !== f.obra_id) return false
    if (f.tst_id && i.tst_id !== f.tst_id) return false
    if (f.encarregado_id && i.encarregado_id !== f.encarregado_id) return false
    if (f.coordenador_id && i.coordenador_id !== f.coordenador_id) return false
    if (f.status && i.status !== f.status) return false
    if (f.data_inicio && i.data_inspecao < f.data_inicio) return false
    if (f.data_fim && i.data_inspecao > f.data_fim) return false
    if (f.busca) {
      const q = f.busca.toLowerCase()
      return (
        String(i.numero).includes(q) ||
        (i.obra_nome || '').toLowerCase().includes(q) ||
        (i.tst_nome || '').toLowerCase().includes(q) ||
        (i.encarregado_nome || '').toLowerCase().includes(q) ||
        (i.coordenador_nome || '').toLowerCase().includes(q)
      )
    }
    return true
  })
}

function gerarPDF(filtered: Inspecao[], filtros: FiltrosInspecao, obras: { id: string; nome: string }[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const hoje = new Date()
  const GREEN_RGB: [number, number, number] = [16, 185, 129]
  const PW = 297
  const ML = 14

  let y = 0

  function drawHeader() {
    doc.setFillColor(GREEN_RGB[0], GREEN_RGB[1], GREEN_RGB[2])
    doc.rect(0, 0, PW, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text('mse', ML, 12.5)
    doc.setLineWidth(0.3); doc.setDrawColor(255, 255, 255)
    doc.line(ML + 15, 4, ML + 15, 14)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    doc.text('Relatório de Inspeções HSE  ·  MSE Engenharia', ML + 19, 12.5)
    const ds = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    doc.setFontSize(7); doc.setTextColor(200, 240, 230)
    doc.text(ds, PW - ML, 12.5, { align: 'right' })
  }

  drawHeader()
  y = 24

  // KPIs
  const totalDesvios = filtered.reduce((a, i) => a + i.total_desvios, 0)
  const totalReconh = filtered.reduce((a, i) => a + i.total_reconhecimentos, 0)
  const emAberto = filtered.filter(i => i.status === 'em_aberto').length
  const concluidas = filtered.filter(i => i.status === 'concluida').length

  const kpiItems: Array<{ label: string; value: string; c: [number, number, number]; bg: [number, number, number] }> = [
    { label: 'Total Inspeções', value: String(filtered.length), c: [16, 185, 129], bg: [240, 253, 249] },
    { label: 'Em Aberto',       value: String(emAberto),        c: [245, 158, 11], bg: [255, 251, 235] },
    { label: 'Concluídas',      value: String(concluidas),      c: [59, 130, 246], bg: [239, 246, 255] },
    { label: 'Total Desvios',   value: String(totalDesvios),    c: [239, 68, 68],  bg: [254, 242, 242] },
    { label: 'Reconhecimentos', value: String(totalReconh),     c: [16, 185, 129], bg: [240, 253, 249] },
  ]

  const CW = PW - ML * 2
  const kW = (CW - 12) / 5
  kpiItems.forEach((k, col) => {
    const kx = ML + col * (kW + 3)
    doc.setFillColor(k.bg[0], k.bg[1], k.bg[2])
    doc.roundedRect(kx, y, kW, 22, 2, 2, 'F')
    doc.setFillColor(k.c[0], k.c[1], k.c[2])
    doc.roundedRect(kx, y, 3, 22, 1, 1, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(k.c[0], k.c[1], k.c[2])
    doc.text(k.value, kx + kW / 2 + 1.5, y + 11, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(70, 70, 70)
    doc.text(k.label, kx + kW / 2 + 1.5, y + 17, { align: 'center' })
  })
  y += 30

  // Table
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(50, 50, 50)
  doc.text(`Lista de Inspeções (${filtered.length} registros)`, ML, y)
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['#', 'Data', 'Status', 'Obra', 'TST / Inspetor', 'Encarregado', 'Coordenador', 'Desvios', 'Reconhec.', 'Desvios Fech.', 'Fechado em']],
    body: filtered.map(i => [
      `INS-${String(i.numero).padStart(4, '0')}`,
      formatDate(i.data_inspecao),
      i.status === 'em_aberto' ? 'Em Aberto' : 'Concluída',
      (i.obra_nome || '—').slice(0, 20),
      (i.tst_nome || '—').slice(0, 16),
      (i.encarregado_nome || '—').slice(0, 16),
      (i.coordenador_nome || '—').slice(0, 16),
      String(i.total_desvios),
      String(i.total_reconhecimentos),
      `${i.desvios_fechados}/${i.total_desvios}`,
      i.fechado_em ? formatDate(i.fechado_em) : '—',
    ]),
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: { fillColor: GREEN_RGB, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 253, 250] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold', textColor: [16, 185, 129] as [number, number, number] },
      1: { cellWidth: 16 }, 2: { cellWidth: 16 }, 3: { cellWidth: 36 },
      4: { cellWidth: 28 }, 5: { cellWidth: 28 }, 6: { cellWidth: 28 },
      7: { cellWidth: 14 }, 8: { cellWidth: 16 }, 9: { cellWidth: 18 }, 10: { cellWidth: 16 },
    },
    margin: { top: 22, left: ML, right: ML },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (data: any) => { if (data.pageNumber > 1) { drawHeader() } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 2) {
        const status = filtered[data.row.index]?.status
        data.cell.styles.textColor = status === 'em_aberto' ? [245, 158, 11] : [16, 185, 129]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(248, 248, 248); doc.rect(0, 207 - 8, PW, 8, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
    doc.text('MSE Engenharia · Sistema de Gestão HSE · Inspeções', ML, 207 - 2.5)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(GREEN_RGB[0], GREEN_RGB[1], GREEN_RGB[2])
    doc.text(`Página ${i} / ${totalPages}`, PW - ML, 207 - 2.5, { align: 'right' })
  }

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  doc.save(`Inspecoes-HSE-${yy}-${mm}-${dd}.pdf`)
}

function gerarXLSX(filtered: Inspecao[]) {
  const hoje = new Date()
  const wb = XLSX.utils.book_new()
  const headers = ['#', 'Data', 'Status', 'Obra', 'TST', 'Encarregado', 'Coordenador', 'Total Desvios', 'Reconhecimentos', 'Desvios Fechados', 'Fechado em', 'Criado em']
  const rows = filtered.map(i => [
    `INS-${String(i.numero).padStart(4, '0')}`,
    formatDate(i.data_inspecao),
    i.status === 'em_aberto' ? 'Em Aberto' : 'Concluída',
    i.obra_nome || '',
    i.tst_nome || '',
    i.encarregado_nome || '',
    i.coordenador_nome || '',
    i.total_desvios,
    i.total_reconhecimentos,
    i.desvios_fechados,
    i.fechado_em ? formatDate(i.fechado_em) : '',
    formatDate(i.criado_em),
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
    { wch: 26 }, { wch: 26 }, { wch: 26 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Inspeções')

  const resumo = [
    ['Relatório de Inspeções HSE — MSE Engenharia'],
    [`Gerado em: ${hoje.toLocaleDateString('pt-BR')} ${hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`],
    [],
    ['Total', 'Em Aberto', 'Concluídas', 'Total Desvios', 'Reconhecimentos'],
    [
      filtered.length,
      filtered.filter(i => i.status === 'em_aberto').length,
      filtered.filter(i => i.status === 'concluida').length,
      filtered.reduce((a, i) => a + i.total_desvios, 0),
      filtered.reduce((a, i) => a + i.total_reconhecimentos, 0),
    ],
  ]
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  XLSX.writeFile(wb, `Inspecoes-HSE-${yy}-${mm}-${dd}.xlsx`)
}

async function gerarPPT(filtered: Inspecao[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PptxGenJS = (await import('pptxgenjs')).default as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pptx: any = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'MSE Engenharia'
  pptx.subject = 'Relatório de Inspeções HSE'

  const hoje = new Date()
  const dateStr = hoje.toLocaleDateString('pt-BR')
  const BG = '18181B'; const GRN = '10B981'; const WHT = 'FFFFFF'; const Z400 = 'A1A1AA'; const Z800 = '27272A'

  // Cover
  const cover = pptx.addSlide()
  cover.background = { color: BG }
  cover.addShape('rect', { x: 0, y: 0, w: 13.33, h: 1.1, fill: { color: GRN }, line: { color: GRN, width: 0 } })
  cover.addText('mse', { x: 0.35, y: 0.1, w: 2.0, h: 0.9, fontSize: 38, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle' })
  cover.addShape('rect', { x: 2.6, y: 0.2, w: 0.02, h: 0.7, fill: { color: 'AAFCE7' }, line: { color: 'AAFCE7', width: 0 } })
  cover.addText('Inspeções HSE', { x: 2.75, y: 0.37, w: 3, h: 0.36, fontSize: 11, color: 'CCFAE9', fontFace: 'Arial' })
  cover.addText(`Gerado em ${dateStr}`, { x: 9.0, y: 0.42, w: 4.0, h: 0.28, fontSize: 9, color: 'CCFAE9', fontFace: 'Arial', align: 'right' })
  cover.addText('Relatório de Inspeções', { x: 0.4, y: 1.5, w: 11, h: 0.95, fontSize: 46, bold: true, color: WHT, fontFace: 'Arial' })
  cover.addText('HSE · Saúde, Segurança e Meio Ambiente', { x: 0.4, y: 2.4, w: 10, h: 0.45, fontSize: 15, color: Z400, fontFace: 'Arial' })
  const stats = [
    { label: 'Total', value: String(filtered.length), col: '9CA3AF' },
    { label: 'Em Aberto', value: String(filtered.filter(i => i.status === 'em_aberto').length), col: 'F59E0B' },
    { label: 'Concluídas', value: String(filtered.filter(i => i.status === 'concluida').length), col: GRN },
    { label: 'Desvios', value: String(filtered.reduce((a, i) => a + i.total_desvios, 0)), col: 'EF4444' },
  ]
  stats.forEach((s, i) => {
    const cx = 0.4 + i * 3.1
    cover.addShape('rect', { x: cx, y: 4.2, w: 2.9, h: 1.15, fill: { color: Z800 }, line: { color: '3F3F46', width: 0.5 } })
    cover.addText(s.value, { x: cx, y: 4.25, w: 2.9, h: 0.65, fontSize: 32, bold: true, color: s.col, fontFace: 'Arial', align: 'center' })
    cover.addText(s.label, { x: cx, y: 4.92, w: 2.9, h: 0.3, fontSize: 9.5, color: Z400, fontFace: 'Arial', align: 'center' })
  })
  cover.addShape('rect', { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: Z800 }, line: { color: Z800, width: 0 } })
  cover.addText('MSE Engenharia · Sistema de Gestão HSE · Documento gerado automaticamente', { x: 0.3, y: 7.15, w: 13, h: 0.26, fontSize: 8, color: Z400, fontFace: 'Arial' })

  // Per inspection slides
  for (let idx = 0; idx < filtered.length; idx++) {
    const i = filtered[idx]
    const slide = pptx.addSlide()
    slide.background = { color: BG }
    slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.65, fill: { color: GRN }, line: { color: GRN, width: 0 } })
    slide.addText('mse', { x: 0.15, y: 0.06, w: 1.1, h: 0.52, fontSize: 18, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle' })
    slide.addShape('rect', { x: 1.47, y: 0.12, w: 0.02, h: 0.42, fill: { color: 'AAFCE7' }, line: { color: 'AAFCE7', width: 0 } })
    slide.addText(`INS-${String(i.numero).padStart(4, '0')}`, { x: 1.62, y: 0.07, w: 3.2, h: 0.52, fontSize: 15, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle' })
    const statusCol = i.status === 'em_aberto' ? 'F59E0B' : GRN
    slide.addShape('rect', { x: 10.0, y: 0.1, w: 1.8, h: 0.45, fill: { color: statusCol }, line: { color: statusCol, width: 0 } })
    slide.addText(i.status === 'em_aberto' ? 'Em Aberto' : 'Concluída', { x: 10.0, y: 0.1, w: 1.8, h: 0.45, fontSize: 10, bold: true, color: WHT, fontFace: 'Arial', align: 'center', valign: 'middle' })
    slide.addText(`${idx + 1} / ${filtered.length}`, { x: 11.3, y: 0.12, w: 1.85, h: 0.4, fontSize: 9, color: 'CCFAE9', fontFace: 'Arial', align: 'right', valign: 'middle' })

    const infoItems = [
      { label: 'DATA', value: formatDate(i.data_inspecao) + (i.hora_inspecao ? '  ' + i.hora_inspecao : '') },
      { label: 'OBRA', value: i.obra_nome || '—' },
      { label: 'TST / INSPETOR', value: i.tst_nome || '—' },
      { label: 'ENCARREGADO', value: i.encarregado_nome || '—' },
      { label: 'COORDENADOR', value: i.coordenador_nome || '—' },
      { label: 'DESVIOS', value: `${i.desvios_fechados}/${i.total_desvios} fechados` },
      { label: 'RECONHECIMENTOS', value: String(i.total_reconhecimentos) },
      { label: 'FECHADO EM', value: i.fechado_em ? formatDate(i.fechado_em) : 'Em aberto' },
    ]
    const COLS = 4; const CELL_W = (13.0 - 0.44) / COLS; const CELL_H = 0.85
    infoItems.forEach((item, ii) => {
      const col = ii % COLS; const row = Math.floor(ii / COLS)
      const cx = 0.22 + col * CELL_W; const cy = 0.78 + row * CELL_H
      slide.addShape('rect', { x: cx + 0.03, y: cy + 0.03, w: CELL_W - 0.08, h: CELL_H - 0.07, fill: { color: Z800 }, line: { color: '3F3F46', width: 0.3 } })
      slide.addText(item.label, { x: cx + 0.12, y: cy + 0.1, w: CELL_W - 0.22, h: 0.18, fontSize: 7, color: Z400, bold: true, fontFace: 'Arial' })
      slide.addText(item.value, { x: cx + 0.12, y: cy + 0.3, w: CELL_W - 0.22, h: 0.48, fontSize: 10, color: 'F4F4F5', fontFace: 'Arial', wrap: true })
    })
    slide.addShape('rect', { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: Z800 }, line: { color: Z800, width: 0 } })
    slide.addText(`MSE Engenharia · ${i.obra_nome || ''} · ${dateStr}`, { x: 0.3, y: 7.15, w: 9, h: 0.26, fontSize: 7.5, color: Z400, fontFace: 'Arial' })
    slide.addText(`${idx + 1} / ${filtered.length}`, { x: 11.5, y: 7.15, w: 1.6, h: 0.26, fontSize: 7.5, bold: true, color: GRN, fontFace: 'Arial', align: 'right' })
  }

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  await pptx.writeFile({ fileName: `Inspecoes-HSE-${yy}-${mm}-${dd}.pptx` })
}

const inputCls = 'w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30'

export default function InspecoesRelatoriosPage() {
  const { inspecoes, obras, tsts, encarregados, coordenadores, loaded } = useApp()
  const [filtros, setFiltros] = useState<FiltrosInspecao>({})
  const [showFilters, setShowFilters] = useState(true)
  const [generatingPPT, setGeneratingPPT] = useState(false)

  const tstOptions = useMemo(() => filtros.obra_id ? tsts.filter(t => t.obra_id === filtros.obra_id) : tsts, [tsts, filtros.obra_id])
  const encOptions = useMemo(() => filtros.obra_id ? encarregados.filter(e => e.obra_id === filtros.obra_id) : encarregados, [encarregados, filtros.obra_id])
  const coordOptions = useMemo(() => filtros.obra_id ? coordenadores.filter(c => c.obra_id === filtros.obra_id) : coordenadores, [coordenadores, filtros.obra_id])
  const filtered = useMemo(() => filtrarInspecoes(inspecoes, filtros), [inspecoes, filtros])

  const activeFilters = Object.values(filtros).filter(v => v !== undefined && v !== '').length

  function setFiltro<K extends keyof FiltrosInspecao>(k: K, v: FiltrosInspecao[K]) {
    setFiltros(prev => ({ ...prev, [k]: v || undefined }))
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/15">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Relatórios de Inspeções</h1>
          <p className="text-xs text-zinc-500">{filtered.length} inspeção(ões) nos filtros selecionados</p>
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
            activeFilters > 0 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {activeFilters > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Obra</label>
                  <select className={inputCls} value={filtros.obra_id || ''} onChange={e => { setFiltro('obra_id', e.target.value); setFiltro('tst_id', ''); setFiltro('encarregado_id', ''); setFiltro('coordenador_id', '') }}>
                    <option value="">Todas</option>
                    {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">TST</label>
                  <select className={inputCls} value={filtros.tst_id || ''} onChange={e => setFiltro('tst_id', e.target.value)}>
                    <option value="">Todos</option>
                    {tstOptions.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Encarregado</label>
                  <select className={inputCls} value={filtros.encarregado_id || ''} onChange={e => setFiltro('encarregado_id', e.target.value)}>
                    <option value="">Todos</option>
                    {encOptions.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Coordenador</label>
                  <select className={inputCls} value={filtros.coordenador_id || ''} onChange={e => setFiltro('coordenador_id', e.target.value)}>
                    <option value="">Todos</option>
                    {coordOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Status</label>
                  <select className={inputCls} value={filtros.status || ''} onChange={e => setFiltro('status', e.target.value)}>
                    <option value="">Todos</option>
                    <option value="em_aberto">Em Aberto</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Data início</label>
                  <input type="date" className={inputCls} value={filtros.data_inicio || ''} onChange={e => setFiltro('data_inicio', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Data fim</label>
                  <input type="date" className={inputCls} value={filtros.data_fim || ''} onChange={e => setFiltro('data_fim', e.target.value)} />
                </div>
              </div>
              {activeFilters > 0 && (
                <button onClick={() => setFiltros({})} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
                  <X className="w-3 h-3" /> Limpar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => gerarPDF(filtered, filtros, obras)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          Exportar PDF
        </button>
        <button
          onClick={() => gerarXLSX(filtered)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exportar Excel
        </button>
        <button
          onClick={async () => { setGeneratingPPT(true); try { await gerarPPT(filtered) } finally { setGeneratingPPT(false) } }}
          disabled={filtered.length === 0 || generatingPPT}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Presentation className="w-4 h-4" />
          {generatingPPT ? 'Gerando…' : 'Exportar PPT'}
        </button>
      </div>

      {/* Preview table */}
      {filtered.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-300">Prévia — {filtered.length} registro(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['#', 'Data', 'Status', 'Obra', 'TST', 'Encarregado', 'Coordenador', 'Desvios', 'Reconhec.'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-zinc-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((i, idx) => (
                  <tr key={i.id} className={idx % 2 === 1 ? 'bg-zinc-900/50' : ''}>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-400">INS-{String(i.numero).padStart(4, '0')}</td>
                    <td className="px-3 py-2 text-zinc-400">{formatDate(i.data_inspecao)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${i.status === 'em_aberto' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                        {i.status === 'em_aberto' ? 'Em Aberto' : 'Concluída'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-300 max-w-[120px] truncate">{i.obra_nome || '—'}</td>
                    <td className="px-3 py-2 text-zinc-400 max-w-[100px] truncate">{i.tst_nome || '—'}</td>
                    <td className="px-3 py-2 text-zinc-400 max-w-[100px] truncate">{i.encarregado_nome || '—'}</td>
                    <td className="px-3 py-2 text-zinc-400 max-w-[100px] truncate">{i.coordenador_nome || '—'}</td>
                    <td className="px-3 py-2 text-red-400 font-bold text-center">{i.total_desvios}</td>
                    <td className="px-3 py-2 text-emerald-400 font-bold text-center">{i.total_reconhecimentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 20 && (
              <p className="text-xs text-zinc-600 px-4 py-2 border-t border-zinc-800">+ {filtered.length - 20} registros no arquivo exportado</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
