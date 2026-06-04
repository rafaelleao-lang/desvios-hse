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
  const RED: [number, number, number] = [232, 41, 28]
  let y = 0

  function drawHeader() {
    doc.setFillColor(RED[0], RED[1], RED[2])
    doc.rect(0, 0, PW, 18, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255)
    doc.text('mse', ML, 12.5)
    doc.setLineWidth(0.3); doc.setDrawColor(255, 255, 255)
    doc.line(ML + 15, 4, ML + 15, 14)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    doc.text('Relatório de Inspeção HSE  ·  MSE Engenharia', ML + 19, 12.5)
    const ds = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    doc.setFontSize(7); doc.setTextColor(255, 200, 200)
    doc.text(ds, PW - MR, 12.5, { align: 'right' })
  }

  function formatDate(d: string) {
    if (!d) return '—'
    const parts = d.split('T')[0].split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  function formatDateTime(d: string) {
    if (!d) return '—'
    const dt = new Date(d)
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  drawHeader()
  y = 24

  // Title
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(30, 30, 30)
  doc.text(`Inspeção INS-${String(insp.numero).padStart(4, '0')}`, ML, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100)
  doc.text(insp.status === 'concluida' ? 'Concluída' : 'Em Aberto', PW - MR, y, { align: 'right' })
  y += 6

  // Info grid
  const infoItems = [
    ['Obra', insp.obra_nome || '—'],
    ['Data', formatDate(insp.data_inspecao) + (insp.hora_inspecao ? '  ' + insp.hora_inspecao : '')],
    ['TST / Inspetor', insp.tst_nome || '—'],
    ['Encarregado', insp.encarregado_nome || '—'],
    ['Coordenador', insp.coordenador_nome || '—'],
    ['Fechado em', insp.fechado_em ? formatDateTime(insp.fechado_em) : '—'],
  ]
  const colW = (CW - 3) / 2
  infoItems.forEach(([label, value], i) => {
    const col = i % 2, row = Math.floor(i / 2)
    const bx = ML + col * (colW + 3), by = y + row * 9
    doc.setFillColor(248, 248, 248); doc.rect(bx, by, colW, 8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(150, 150, 150)
    doc.text(label.toUpperCase(), bx + 2, by + 3)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 30)
    doc.text(value, bx + 2, by + 6.5)
  })
  y += Math.ceil(infoItems.length / 2) * 9 + 6

  // KPIs
  const kpis = [
    { label: 'Desvios', value: String(insp.total_desvios), c: [239, 68, 68] as [number, number, number] },
    { label: 'Fechados', value: String(insp.desvios_fechados), c: [34, 197, 94] as [number, number, number] },
    { label: 'Reconhec.', value: String(insp.total_reconhecimentos), c: [16, 185, 129] as [number, number, number] },
  ]
  const kW = (CW - 6) / 3
  kpis.forEach((k, i) => {
    const kx = ML + i * (kW + 3)
    doc.setFillColor(k.c[0] + 200, k.c[1] + 40, k.c[2] + 40)
    doc.roundedRect(kx, y, kW, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(k.c[0], k.c[1], k.c[2])
    doc.text(k.value, kx + kW / 2, y + 9, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(80, 80, 80)
    doc.text(k.label, kx + kW / 2, y + 13.5, { align: 'center' })
  })
  y += 22

  // Evidences table
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  doc.text('Evidências', ML, y); y += 2

  const evidencias = insp.evidencias ?? []
  autoTable(doc, {
    startY: y,
    head: [['#', 'Tipo', 'Local', 'Descrição', 'Status', 'Prazo', 'Fechado em', 'Quem fechou', 'Tratativa']],
    body: evidencias.map((ev, i) => {
      const isDesvio = ev.tipo === 'desvio'
      const isClosed = !!ev.data_fechamento
      return [
        String(i + 1),
        isDesvio ? 'Desvio' : 'Reconhec.',
        ev.local,
        (ev.descricao || '—').slice(0, 40),
        isDesvio ? (isClosed ? 'Fechado' : 'Em Aberto') : '—',
        ev.prazo_correcao ? formatDate(ev.prazo_correcao) : '—',
        isClosed ? formatDateTime(ev.data_fechamento!) : '—',
        ev.quem_fechou || '—',
        (ev.tratativa_texto || '—').slice(0, 50),
      ]
    }),
    styles: { fontSize: 6.5, cellPadding: 2 },
    headStyles: { fillColor: RED, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [250, 250, 252] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 8 }, 1: { cellWidth: 16 }, 2: { cellWidth: 22 },
      3: { cellWidth: 28 }, 4: { cellWidth: 16 }, 5: { cellWidth: 14 },
      6: { cellWidth: 20 }, 7: { cellWidth: 22 }, 8: { cellWidth: 36 },
    },
    margin: { top: 22, left: ML, right: MR },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (data: any) => { if (data.pageNumber > 1) drawHeader() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) {
        const ev = evidencias[data.row.index]
        if (ev?.tipo === 'desvio') data.cell.styles.textColor = [239, 68, 68]
        else data.cell.styles.textColor = [16, 185, 129]
      }
      if (data.section === 'body' && data.column.index === 4) {
        const ev = evidencias[data.row.index]
        if (ev?.tipo === 'desvio' && !ev.data_fechamento) {
          data.cell.styles.textColor = [245, 158, 11]
          data.cell.styles.fontStyle = 'italic'
        } else if (ev?.tipo === 'desvio' && ev.data_fechamento) {
          data.cell.styles.textColor = [34, 197, 94]
        }
      }
    },
  })

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(248, 248, 248); doc.rect(0, 287, PW, 10, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
    doc.text('MSE Engenharia · Sistema de Gestão HSE', ML, 293)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(RED[0], RED[1], RED[2])
    doc.text(`Página ${i} / ${totalPages}`, PW - MR, 293, { align: 'right' })
  }

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
