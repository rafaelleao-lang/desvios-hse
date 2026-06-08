'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import { Eye, Search, Filter, X, AlertCircle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const INSP_GREEN = '#10B981'

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

function diasAbertos(criado_em: string) {
  const criado = new Date(criado_em.split('T')[0])
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((hoje.getTime() - criado.getTime()) / 86400000))
}

export default function InspecoesEmAbertoPage() {
  const { inspecoes, obras, tsts, encarregados, coordenadores, loaded } = useApp()

  const [busca, setBusca] = useState('')
  const [obraFiltro, setObraFiltro] = useState('')
  const [tstFiltro, setTstFiltro] = useState('')
  const [encFiltro, setEncFiltro] = useState('')
  const [coordFiltro, setCoordFiltro] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const emAberto = useMemo(
    () => inspecoes.filter(i => i.status === 'em_aberto'),
    [inspecoes],
  )

  const filtered = useMemo(() => {
    return emAberto.filter(i => {
      if (obraFiltro && i.obra_id !== obraFiltro) return false
      if (tstFiltro && i.tst_id !== tstFiltro) return false
      if (encFiltro && i.encarregado_id !== encFiltro) return false
      if (coordFiltro && i.coordenador_id !== coordFiltro) return false
      if (busca) {
        const q = busca.toLowerCase()
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
  }, [emAberto, obraFiltro, tstFiltro, encFiltro, coordFiltro, busca])

  const tstOptions = useMemo(() => obraFiltro ? tsts.filter(t => t.obra_id === obraFiltro) : tsts, [tsts, obraFiltro])
  const encOptions = useMemo(() => obraFiltro ? encarregados.filter(e => e.obra_id === obraFiltro) : encarregados, [encarregados, obraFiltro])
  const coordOptions = useMemo(() => obraFiltro ? coordenadores.filter(c => c.obra_id === obraFiltro) : coordenadores, [coordenadores, obraFiltro])

  const activeFilters = [obraFiltro, tstFiltro, encFiltro, coordFiltro, busca].filter(Boolean).length

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
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#F59E0B20' }}>
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Inspeções em Aberto</h1>
          <p className="text-xs text-zinc-500">{filtered.length} inspeção(ões) com desvios pendentes</p>
        </div>
        <div className="ml-auto">
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
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Buscar por obra, TST, encarregado..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Obra</label>
                  <select className={inputCls} value={obraFiltro} onChange={e => { setObraFiltro(e.target.value); setTstFiltro(''); setEncFiltro(''); setCoordFiltro('') }}>
                    <option value="">Todas</option>
                    {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">TST</label>
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
              </div>
              {activeFilters > 0 && (
                <button onClick={() => { setObraFiltro(''); setTstFiltro(''); setEncFiltro(''); setCoordFiltro(''); setBusca('') }} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
                  <X className="w-3 h-3" /> Limpar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-12 h-12 text-zinc-700 mb-3" />
          <p className="text-zinc-500 font-medium">Nenhuma inspeção em aberto</p>
          <p className="text-zinc-600 text-sm mt-1">Ótimo! Todos os desvios foram tratados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(insp => {
            const dias = diasAbertos(insp.criado_em)
            const progresso = insp.total_desvios > 0 ? Math.round((insp.desvios_fechados / insp.total_desvios) * 100) : 100
            const desviosAbertos = insp.total_desvios - insp.desvios_fechados
            return (
              <div key={insp.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        INS-{String(insp.numero).padStart(4, '0')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                        Em Aberto
                      </span>
                      <span className="text-xs text-zinc-500 ml-auto">{dias}d em aberto</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Obra</p>
                        <p className="text-xs text-zinc-200 font-medium truncate">{insp.obra_nome || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">TST</p>
                        <p className="text-xs text-zinc-400 truncate">{insp.tst_nome || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Encarregado</p>
                        <p className="text-xs text-zinc-400 truncate">{insp.encarregado_nome || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Data</p>
                        <p className="text-xs text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(insp.data_inspecao)}
                        </p>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs text-zinc-400">
                          <span className="text-red-400 font-bold">{desviosAbertos}</span> desvio(s) aberto(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-zinc-400">
                          <span className="text-emerald-400 font-bold">{insp.desvios_fechados}</span>/{insp.total_desvios} fechados
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs text-zinc-400">
                          <span className="text-blue-400 font-bold">{insp.total_reconhecimentos}</span> reconh.
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {insp.total_desvios > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-500">
                          <span>Progresso dos desvios</span>
                          <span>{progresso}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progresso}%`, background: progresso === 100 ? INSP_GREEN : '#F59E0B' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/inspecoes/${insp.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all flex-shrink-0"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
