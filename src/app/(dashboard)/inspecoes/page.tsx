'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import { Eye, Search, Filter, X, ClipboardList, Calendar, CheckCircle2, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { inspecoesDB } from '@/lib/db'
import type { Inspecao, InspecaoEvidencia } from '@/types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const INSP_GREEN = '#10B981'
const MSE_RED = '#E8291C'

async function gerarPDFInspecao(insp: Inspecao & { evidencias: InspecaoEvidencia[] }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const hoje = new Date()
  const PW = 210, ML = 14, MR = 14, CW = PW - ML - MR
  const MB = 14  // bottom margin
  const RED: [number, number, number] = [232, 41, 28]
  let y = 0

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function fmtDate(d: string) {
    if (!d) return '—'
    const p = d.split('T')[0].split('-'); return `${p[2]}/${p[1]}/${p[0]}`
  }
  function fmtDT(d: string) {
    if (!d) return '—'
    const dt = new Date(d)
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function drawHeader() {
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(0, 0, PW, 20, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255)
    doc.text('mse', ML, 14)
    doc.setLineWidth(0.4); doc.setDrawColor(255, 255, 255)
    doc.line(ML + 18, 5, ML + 18, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('Relatório de Inspeção HSE  ·  MSE Engenharia', ML + 22, 10)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.text(`INS-${String(insp.numero).padStart(4, '0')}`, ML + 22, 15.5)
    const ds = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(255, 210, 210)
    doc.text(ds, PW - MR, 13, { align: 'right' })
  }

  function drawFooter() {
    const n = doc.getNumberOfPages()
    for (let i = 1; i <= n; i++) {
      doc.setPage(i)
      doc.setFillColor(248, 248, 248); doc.rect(0, 297 - 10, PW, 10, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
      doc.text('MSE Engenharia · Sistema de Gestão HSE · Inspeção HSE', ML, 297 - 3.5)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(RED[0], RED[1], RED[2])
      doc.text(`${i} / ${n}`, PW - MR, 297 - 3.5, { align: 'right' })
    }
  }

  function ensureY(need: number) {
    if (y + need > 297 - MB - 10) { doc.addPage(); drawHeader(); y = 26 }
  }

  // ── Page 1: Cover ────────────────────────────────────────────────────────────
  drawHeader(); y = 26

  // Status badge
  const isConcluida = insp.status === 'concluida'
  const statusC: [number,number,number] = isConcluida ? [22, 163, 74] : [234, 179, 8]
  doc.setFillColor(...statusC); doc.roundedRect(PW - MR - 28, y - 5, 28, 8, 2, 2, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255)
  doc.text(isConcluida ? '✓ Concluída' : '⟳ Em Aberto', PW - MR - 14, y - 0.5, { align: 'center' })

  // Title
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(20, 20, 20)
  doc.text('Relatório de Inspeção HSE', ML, y + 1); y += 10

  // Divider
  doc.setDrawColor(RED[0], RED[1], RED[2]); doc.setLineWidth(0.8)
  doc.line(ML, y, PW - MR, y); y += 6

  // Metadata grid 3×2
  const metaItems = [
    ['OBRA',          insp.obra_nome || '—'],
    ['DATA / HORA',   fmtDate(insp.data_inspecao) + (insp.hora_inspecao ? '  ' + insp.hora_inspecao : '')],
    ['TST / INSPETOR', insp.tst_nome || '—'],
    ['ENCARREGADO',   insp.encarregado_nome || '—'],
    ['COORDENADOR',   insp.coordenador_nome || '—'],
    ['CONCLUÍDA EM',  insp.fechado_em ? fmtDT(insp.fechado_em) : '—'],
  ]
  const cols3 = 3, mW = (CW - (cols3 - 1) * 3) / cols3
  metaItems.forEach(([lbl, val], i) => {
    const col = i % cols3, row = Math.floor(i / cols3)
    const bx = ML + col * (mW + 3), by = y + row * 12
    doc.setFillColor(250, 250, 250); doc.roundedRect(bx, by, mW, 11, 1.5, 1.5, 'F')
    doc.setDrawColor(235, 235, 235); doc.setLineWidth(0.3); doc.roundedRect(bx, by, mW, 11, 1.5, 1.5, 'S')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(180, 180, 180)
    doc.text(lbl, bx + 2.5, by + 4)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20)
    const shortVal = val.length > 30 ? val.slice(0, 29) + '…' : val
    doc.text(shortVal, bx + 2.5, by + 8.5)
  })
  y += Math.ceil(metaItems.length / cols3) * 12 + 8

  // KPI strip
  const kpiItems = [
    { label: 'Total Desvios',    value: String(insp.total_desvios),         c: [239, 68, 68] as [number,number,number] },
    { label: 'Desvios Fechados', value: String(insp.desvios_fechados),       c: [22, 163, 74] as [number,number,number] },
    { label: 'Reconhecimentos',  value: String(insp.total_reconhecimentos),  c: [16, 185, 129] as [number,number,number] },
  ]
  const kW3 = (CW - 6) / 3
  kpiItems.forEach((k, i) => {
    const kx = ML + i * (kW3 + 3)
    doc.setFillColor(k.c[0], k.c[1], k.c[2]); doc.roundedRect(kx, y, kW3, 18, 2, 2, 'F')
    doc.setFillColor(255, 255, 255, 30); doc.roundedRect(kx, y, kW3, 18, 2, 2, 'F')
    doc.setFont('helvetica', 'black'); doc.setFontSize(22); doc.setTextColor(k.c[0], k.c[1], k.c[2])
    // Draw white text
    doc.setTextColor(255, 255, 255)
    doc.text(k.value, kx + kW3 / 2, y + 11, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(255, 255, 255)
    doc.text(k.label, kx + kW3 / 2, y + 15.5, { align: 'center' })
  })
  y += 24

  // ── Evidências ───────────────────────────────────────────────────────────────
  const evidencias = insp.evidencias ?? []

  // Summary table first
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20)
  doc.text(`Evidências (${evidencias.length})`, ML, y); y += 3

  autoTable(doc, {
    startY: y,
    head: [['#', 'Tipo', 'Local', 'Descrição', 'Status', 'Prazo', 'Fechado em', 'Responsável', 'Tratativa']],
    body: evidencias.map((ev, idx) => {
      const isD = ev.tipo === 'desvio', isCl = !!ev.data_fechamento
      return [
        String(idx + 1),
        isD ? 'Desvio' : 'Reconhec.',
        ev.local || '—',
        (ev.descricao || '—').slice(0, 35),
        isD ? (isCl ? 'Fechado' : 'Em Aberto') : '—',
        ev.prazo_correcao ? fmtDate(ev.prazo_correcao) : '—',
        isCl ? fmtDT(ev.data_fechamento!) : '—',
        (ev.quem_fechou || '—').slice(0, 18),
        (ev.tratativa_texto || '—').slice(0, 45),
      ]
    }),
    styles: { fontSize: 6.5, cellPadding: 2.5 },
    headStyles: { fillColor: RED, textColor: [255,255,255] as [number,number,number], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [252, 252, 254] as [number,number,number] },
    columnStyles: {
      0: { cellWidth: 7 }, 1: { cellWidth: 16 }, 2: { cellWidth: 22 },
      3: { cellWidth: 28 }, 4: { cellWidth: 15 }, 5: { cellWidth: 13 },
      6: { cellWidth: 19 }, 7: { cellWidth: 22 }, 8: { cellWidth: 40 },
    },
    margin: { top: 22, left: ML, right: MR },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (data: any) => { if (data.pageNumber > 1) drawHeader() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section !== 'body') return
      const ev = evidencias[data.row.index]
      if (data.column.index === 1) data.cell.styles.textColor = ev?.tipo === 'desvio' ? [239,68,68] : [16,185,129]
      if (data.column.index === 4 && ev?.tipo === 'desvio') {
        data.cell.styles.textColor = ev.data_fechamento ? [22,163,74] : [245,158,11]
        if (!ev.data_fechamento) data.cell.styles.fontStyle = 'italic'
      }
    },
  })

  // ── Detalhe individual de cada evidência com fotos ───────────────────────────
  for (let idx = 0; idx < evidencias.length; idx++) {
    const ev = evidencias[idx]
    const isD = ev.tipo === 'desvio'
    const isCl = !!ev.data_fechamento
    const fotosAb = ev.fotos_abertura ?? []
    const fotosFech = ev.fotos_fechamento ?? []
    const hasAbFotos = fotosAb.length > 0
    const hasFechFotos = fotosFech.length > 0 && isCl
    const photoH = 52  // height per photo row

    // Estimate section height
    let sectionH = 8 + 14  // header + local+desc
    if (hasAbFotos || isD) sectionH += photoH + 6
    if (isD && isCl) sectionH += 22
    sectionH += 4  // bottom padding

    doc.addPage(); drawHeader(); y = 26

    // Section header
    const badgeC: [number,number,number] = isD ? [239,68,68] : [16,185,129]
    doc.setFillColor(...badgeC); doc.roundedRect(ML, y, isD ? 16 : 28, 7, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255,255,255)
    doc.text(isD ? 'DESVIO' : 'RECONHEC.', ML + (isD ? 8 : 14), y + 4.5, { align: 'center' })
    doc.setFontSize(10); doc.setTextColor(20,20,20)
    doc.text(`Evidência #${idx + 1}`, ML + (isD ? 20 : 32), y + 5)
    if (isD && isCl) {
      doc.setFillColor(22,163,74); doc.roundedRect(PW - MR - 22, y, 22, 7, 2, 2, 'F')
      doc.setFontSize(7); doc.setTextColor(255,255,255)
      doc.text('✓ Fechado', PW - MR - 11, y + 4.5, { align: 'center' })
    } else if (isD && !isCl) {
      doc.setFillColor(245,158,11); doc.roundedRect(PW - MR - 22, y, 22, 7, 2, 2, 'F')
      doc.setFontSize(7); doc.setTextColor(255,255,255)
      doc.text('Em Aberto', PW - MR - 11, y + 4.5, { align: 'center' })
    }
    y += 11

    // Local
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(180,180,180)
    doc.text('LOCAL', ML, y); y += 4
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20,20,20)
    doc.text(ev.local || '—', ML, y); y += 6

    // Description
    if (ev.descricao) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60,60,60)
      const lines = doc.splitTextToSize(ev.descricao, CW)
      doc.text(lines, ML, y); y += lines.length * 4 + 4
    }

    // Photos row
    const photoColW = isD ? (CW - 6) / 2 : CW
    if (hasAbFotos || isD) {
      // Opening photo label
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(180,180,180)
      doc.text(isD ? 'FOTO DE ABERTURA' : 'EVIDÊNCIA FOTOGRÁFICA', ML, y); y += 3

      // Opening photos
      const firstAb = fotosAb[0]
      if (firstAb?.data_url?.startsWith('data:')) {
        try {
          doc.addImage(firstAb.data_url, 'JPEG', ML, y, photoColW, photoH, undefined, 'FAST')
        } catch { /* ignore bad image */ }
      } else {
        doc.setFillColor(240,240,240); doc.rect(ML, y, photoColW, photoH, 'F')
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160,160,160)
        doc.text('Sem foto', ML + photoColW / 2, y + photoH / 2, { align: 'center' })
      }

      // Closing photo (desvios only)
      if (isD) {
        const closingX = ML + photoColW + 6
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(180,180,180)
        doc.text('FOTO DE FECHAMENTO', closingX, y - 3)
        if (hasFechFotos && fotosFech[0]?.data_url?.startsWith('data:')) {
          try {
            doc.addImage(fotosFech[0].data_url, 'JPEG', closingX, y, photoColW, photoH, undefined, 'FAST')
          } catch { /* ignore */ }
        } else if (hasFechFotos && fotosFech[0]?.data_url) {
          try {
            const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(fotosFech[0].data_url)}`)
            if (res.ok) {
              const blob = await res.blob()
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(blob)
              })
              doc.addImage(dataUrl, 'JPEG', closingX, y, photoColW, photoH, undefined, 'FAST')
            }
          } catch { /* ignore */ }
        } else {
          doc.setFillColor(255, 251, 235); doc.rect(closingX, y, photoColW, photoH, 'F')
          doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.3); doc.rect(closingX, y, photoColW, photoH, 'S')
          doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(180, 130, 0)
          doc.text(isCl ? 'Sem foto de fechamento' : 'Aguardando fechamento', closingX + photoColW / 2, y + photoH / 2, { align: 'center' })
        }
      }
      y += photoH + 6
    }

    // Closing info (desvios only)
    if (isD && isCl) {
      doc.setFillColor(240, 253, 244); doc.roundedRect(ML, y, CW, 20, 2, 2, 'F')
      doc.setDrawColor(134, 239, 172); doc.setLineWidth(0.3); doc.roundedRect(ML, y, CW, 20, 2, 2, 'S')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(21, 128, 61)
      doc.text('FECHAMENTO DO DESVIO', ML + 3, y + 5)
      const closingCols = [
        ['Prazo', ev.prazo_correcao ? fmtDate(ev.prazo_correcao) : '—'],
        ['Data Fechamento', fmtDT(ev.data_fechamento!)],
        ['Responsável', ev.quem_fechou || '—'],
      ]
      const cW = (CW - 6) / 3
      closingCols.forEach(([lbl, val], ci) => {
        const cx = ML + 3 + ci * (cW + 3)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(100, 160, 100)
        doc.text(lbl.toUpperCase(), cx, y + 10)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(20, 80, 20)
        const v = val.length > 22 ? val.slice(0, 21) + '…' : val
        doc.text(v, cx, y + 15)
      })
      y += 22
      if (ev.tratativa_texto) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(180,180,180)
        doc.text('TRATATIVA REALIZADA', ML, y + 2)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(40,40,40)
        const tratLines = doc.splitTextToSize(ev.tratativa_texto, CW)
        doc.text(tratLines.slice(0, 4), ML, y + 7)
        y += tratLines.slice(0, 4).length * 4 + 10
      }
    } else if (isD && !isCl) {
      doc.setFillColor(255, 251, 235); doc.roundedRect(ML, y, CW, 10, 2, 2, 'F')
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(160, 100, 0)
      doc.text('Desvio em andamento — aguardando fechamento na aba Desvios', ML + CW / 2, y + 6.5, { align: 'center' })
      y += 14
    }
  }

  drawFooter()

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  doc.save(`Inspecao-INS${String(insp.numero).padStart(4, '0')}-${yy}-${mm}-${dd}.pdf`)
}

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

function diasEntre(a: string, b: string) {
  const da = new Date(a.split('T')[0])
  const db = new Date(b.split('T')[0])
  return Math.max(0, Math.round((db.getTime() - da.getTime()) / 86400000))
}

export default function InspecoesPage() {
  const { inspecoes, obras, tsts, encarregados, coordenadores, loaded } = useApp()

  const [busca, setBusca] = useState('')
  const [obraFiltro, setObraFiltro] = useState('')
  const [tstFiltro, setTstFiltro] = useState('')
  const [encFiltro, setEncFiltro] = useState('')
  const [coordFiltro, setCoordFiltro] = useState('')
  const [dataIni, setDataIni] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)

  async function handlePDF(id: string) {
    setPdfLoading(id)
    try {
      const data = await inspecoesDB.find(id)
      if (data) await gerarPDFInspecao(data)
    } finally {
      setPdfLoading(null)
    }
  }

  const concluidas = useMemo(
    () => inspecoes.filter(i => i.status === 'concluida'),
    [inspecoes],
  )

  const filtered = useMemo(() => {
    return concluidas.filter(i => {
      if (obraFiltro && i.obra_id !== obraFiltro) return false
      if (tstFiltro && i.tst_id !== tstFiltro) return false
      if (encFiltro && i.encarregado_id !== encFiltro) return false
      if (coordFiltro && i.coordenador_id !== coordFiltro) return false
      if (dataIni && i.data_inspecao < dataIni) return false
      if (dataFim && i.data_inspecao > dataFim) return false
      if (busca) {
        const q = busca.toLowerCase()
        const match =
          String(i.numero).includes(q) ||
          (i.obra_nome || '').toLowerCase().includes(q) ||
          (i.tst_nome || '').toLowerCase().includes(q) ||
          (i.encarregado_nome || '').toLowerCase().includes(q) ||
          (i.coordenador_nome || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [concluidas, obraFiltro, tstFiltro, encFiltro, coordFiltro, dataIni, dataFim, busca])

  const tstOptions = useMemo(() => obraFiltro ? tsts.filter(t => t.obra_id === obraFiltro) : tsts, [tsts, obraFiltro])
  const encOptions = useMemo(() => obraFiltro ? encarregados.filter(e => e.obra_id === obraFiltro) : encarregados, [encarregados, obraFiltro])
  const coordOptions = useMemo(() => obraFiltro ? coordenadores.filter(c => c.obra_id === obraFiltro) : coordenadores, [coordenadores, obraFiltro])

  const activeFilters = [obraFiltro, tstFiltro, encFiltro, coordFiltro, dataIni, dataFim, busca].filter(Boolean).length

  function clearFilters() {
    setObraFiltro(''); setTstFiltro(''); setEncFiltro(''); setCoordFiltro('')
    setDataIni(''); setDataFim(''); setBusca('')
  }

  const inputCls = 'w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30'

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: INSP_GREEN + '20' }}>
          <ClipboardList className="w-4 h-4" style={{ color: INSP_GREEN }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Inspeções</h1>
          <p className="text-xs text-zinc-500">{filtered.length} de {concluidas.length} concluídas</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
              showFilters || activeFilters > 0
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {activeFilters > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-zinc-700"
          placeholder="Buscar por obra, TST, encarregado..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Obra</label>
                  <select className={inputCls} value={obraFiltro} onChange={e => { setObraFiltro(e.target.value); setTstFiltro(''); setEncFiltro(''); setCoordFiltro('') }}>
                    <option value="">Todas</option>
                    {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">TST (Inspetor)</label>
                  <select className={inputCls} value={tstFiltro} onChange={e => setTstFiltro(e.target.value)}>
                    <option value="">Todos</option>
                    {tstOptions.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Encarregado</label>
                  <select className={inputCls} value={encFiltro} onChange={e => setEncFiltro(e.target.value)}>
                    <option value="">Todos</option>
                    {encOptions.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Coordenador</label>
                  <select className={inputCls} value={coordFiltro} onChange={e => setCoordFiltro(e.target.value)}>
                    <option value="">Todos</option>
                    {coordOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Data início</label>
                  <input type="date" className={inputCls} value={dataIni} onChange={e => setDataIni(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Data fim</label>
                  <input type="date" className={inputCls} value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </div>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
                  <X className="w-3 h-3" /> Limpar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-zinc-700 mb-3" />
          <p className="text-zinc-500 font-medium">Nenhuma inspeção concluída</p>
          <p className="text-zinc-600 text-sm mt-1">As inspeções aparecem aqui quando todos os desvios são fechados.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Abertura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Fechamento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Dias</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Obra</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">TST</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Encarregado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Coordenador</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">Desvios</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">Reconh.</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((insp, idx) => {
                  const dias = insp.fechado_em ? diasEntre(insp.criado_em, insp.fechado_em) : 0
                  const isLoadingPdf = pdfLoading === insp.id
                  return (
                    <tr key={insp.id} className={cn('border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors', idx % 2 === 1 && 'bg-zinc-900/50')}>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400 text-xs">
                        INS-{String(insp.numero).padStart(4, '0')}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(insp.data_inspecao)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{insp.fechado_em ? formatDate(insp.fechado_em) : '—'}</td>
                      <td className="px-4 py-3 text-zinc-300 text-xs font-medium">{dias}d</td>
                      <td className="px-4 py-3 text-zinc-200 text-xs font-medium max-w-[140px] truncate">{insp.obra_nome || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs max-w-[100px] truncate">{insp.tst_nome || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs max-w-[100px] truncate">{insp.encarregado_nome || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs max-w-[100px] truncate">{insp.coordenador_nome || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold text-red-400">{insp.total_desvios}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold text-emerald-400">{insp.total_reconhecimentos}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/inspecoes/${insp.id}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/20 transition-all">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handlePDF(insp.id)}
                            disabled={isLoadingPdf}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 transition-all disabled:opacity-50"
                          >
                            {isLoadingPdf
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <FileText className="w-3.5 h-3.5" />
                            }
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
