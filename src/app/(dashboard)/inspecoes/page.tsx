'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import { Eye, Search, Filter, X, ClipboardList, Calendar, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const INSP_GREEN = '#10B981'
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((insp, idx) => {
                  const dias = insp.fechado_em ? diasEntre(insp.criado_em, insp.fechado_em) : 0
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
                        <Link href={`/inspecoes/${insp.id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
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
