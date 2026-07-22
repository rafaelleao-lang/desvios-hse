'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import { alojamentosDB } from '@/lib/db-alojamentos'
import { gerarPDFAlojamento } from '@/lib/pdf-alojamento'
import { generateAlojamentoId } from '@/types/alojamentos'
import type { Alojamento } from '@/types/alojamentos'
import { Eye, Pencil, Search, Filter, X, BedDouble, Calendar, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const ALOJ_COLOR = '#6366F1'

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

export default function AlojamentosPage() {
  const { obras } = useApp()

  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [obraFiltro, setObraFiltro] = useState('')
  const [dataIni, setDataIni] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    alojamentosDB.list({
      obra_id: obraFiltro || undefined,
      data_inicio: dataIni || undefined,
      data_fim: dataFim || undefined,
    })
      .then(data => { if (active) setAlojamentos(data) })
      .catch(err => console.error('[alojamentos] list:', err))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [obraFiltro, dataIni, dataFim])

  const filtered = useMemo(() => {
    if (!busca) return alojamentos
    const q = busca.toLowerCase()
    return alojamentos.filter(a =>
      generateAlojamentoId(a.numero).toLowerCase().includes(q) ||
      (a.obra_nome || '').toLowerCase().includes(q) ||
      a.empresa_responsavel.toLowerCase().includes(q) ||
      a.responsavel_relatorio.toLowerCase().includes(q),
    )
  }, [alojamentos, busca])

  async function handlePDF(id: string) {
    setPdfLoading(id)
    try {
      const data = await alojamentosDB.find(id)
      if (data) await gerarPDFAlojamento(data)
    } finally {
      setPdfLoading(null)
    }
  }

  const activeFilters = [obraFiltro, dataIni, dataFim, busca].filter(Boolean).length

  function clearFilters() {
    setObraFiltro(''); setDataIni(''); setDataFim(''); setBusca('')
  }

  const inputCls = 'w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ALOJ_COLOR + '20' }}>
          <BedDouble className="w-4 h-4" style={{ color: ALOJ_COLOR }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Relatórios Salvos</h1>
          <p className="text-xs text-zinc-500">{filtered.length} de {alojamentos.length} relatórios</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
              showFilters || activeFilters > 0
                ? 'text-white'
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
            )}
            style={showFilters || activeFilters > 0 ? { borderColor: ALOJ_COLOR + '66', background: ALOJ_COLOR + '1a', color: ALOJ_COLOR } : {}}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {activeFilters > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: ALOJ_COLOR }}>
                {activeFilters}
              </span>
            )}
          </button>
          <Link
            href="/alojamentos/novo"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: ALOJ_COLOR }}
          >
            <BedDouble className="w-3.5 h-3.5" />
            Novo Relatório
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:border-zinc-700"
          placeholder="Buscar por código, obra, empresa ou responsável..."
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Obra</label>
                  <select className={inputCls} value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
                    <option value="">Todas</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
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
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ALOJ_COLOR, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BedDouble className="w-12 h-12 text-zinc-700 mb-3" />
          <p className="text-zinc-500 font-medium">Nenhum relatório de alojamento encontrado</p>
          <p className="text-zinc-600 text-sm mt-1">Clique em &ldquo;Novo Relatório&rdquo; para criar o primeiro.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Obra</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Endereço</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Empresa Responsável</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Resp. Relatório</th>
                  <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => {
                  const isLoadingPdf = pdfLoading === a.id
                  return (
                    <tr key={a.id} className={cn('border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors', idx % 2 === 1 && 'bg-zinc-900/50')}>
                      <td className="px-4 py-3 font-mono font-bold text-xs" style={{ color: ALOJ_COLOR }}>
                        {generateAlojamentoId(a.numero)}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(a.data_vistoria)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-200 text-xs font-medium max-w-[140px] truncate">{a.obra_nome || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs max-w-[160px] truncate">{a.endereco || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs max-w-[150px] truncate">{a.empresa_responsavel}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs max-w-[130px] truncate">{a.responsavel_relatorio}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/alojamentos/${a.id}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-zinc-800 hover:border-indigo-500/20 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link href={`/alojamentos/${a.id}/editar`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/20 transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handlePDF(a.id)}
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
