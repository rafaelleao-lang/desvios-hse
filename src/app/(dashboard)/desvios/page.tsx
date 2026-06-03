'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus, Search, SlidersHorizontal, X, Eye,
  AlertTriangle, Camera, ChevronLeft, ChevronRight,
  Download, Filter,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { filtrarDesvios, exportarCSV } from '@/lib/db'
import { cn, formatDate, generateDesvioId, getSlaColor, getSlaLabel } from '@/lib/utils'
import { STATUS_CONFIG, GRAVIDADE_CONFIG } from '@/lib/utils'
import { CATEGORIAS_PADRAO } from '@/types'
import type { StatusDesvio, GravidadeDesvio } from '@/types'
import type { FiltrosRelatorio } from '@/lib/db'

const PER_PAGE = 15

const STATUS_TABS: { value: StatusDesvio | 'todos' | 'vencido'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'aberto', label: 'Aberto' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'reincidente', label: 'Reincidente' },
  { value: 'vencido', label: 'Vencido' },
]

export default function DesviosPage() {
  const router = useRouter()
  const { obras, tsts, encarregados, coordenadores, desviosComputados, loaded } = useApp()
  const [activeTab, setActiveTab] = useState<StatusDesvio | 'todos' | 'vencido'>('todos')
  const [busca, setBusca] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [filtros, setFiltros] = useState<Omit<FiltrosRelatorio, 'busca' | 'status'>>({})

  // Carrega filtros salvos ao montar
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('desvios-filters')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved.activeTab) setActiveTab(saved.activeTab)
      if (saved.busca) setBusca(saved.busca)
      if (saved.filtros && Object.keys(saved.filtros).length > 0) {
        setFiltros(saved.filtros)
        setShowFilters(true)
      }
    } catch {}
  }, [])

  // Persiste filtros no sessionStorage
  useEffect(() => {
    sessionStorage.setItem('desvios-filters', JSON.stringify({ activeTab, busca, filtros }))
  }, [activeTab, busca, filtros])

  function setFiltro(key: keyof typeof filtros, value: string) {
    setFiltros(f => ({ ...f, [key]: value || undefined }))
    setPage(1)
  }

  const filtered = useMemo(() => {
    let base
    if (activeTab === 'vencido') {
      base = filtrarDesvios(desviosComputados, { ...filtros, busca, vencido: true })
    } else if (activeTab === 'fechado') {
      const fechados = filtrarDesvios(desviosComputados, { ...filtros, busca, status: 'fechado' })
      const reincidentes = filtrarDesvios(desviosComputados, { ...filtros, busca, status: 'reincidente' as StatusDesvio })
      base = [...fechados, ...reincidentes]
    } else {
      base = filtrarDesvios(desviosComputados, {
        ...filtros,
        busca,
        status: activeTab === 'todos' ? undefined : activeTab as StatusDesvio,
      })
    }
    return base.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
  }, [desviosComputados, filtros, busca, activeTab])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: desviosComputados.length }
    desviosComputados.forEach(d => { c[d.status] = (c[d.status] || 0) + 1 })
    c['vencido'] = desviosComputados.filter(d => d.vencido).length
    // Reincidente também conta como fechado (foi encerrado porém marcado como reincidente)
    c['fechado'] = (c['fechado'] || 0) + (c['reincidente'] || 0)
    return c
  }, [desviosComputados])

  const hasFilters = Object.values(filtros).some(Boolean)

  function clearFilters() {
    setFiltros({})
    setBusca('')
    setActiveTab('todos')
    setPage(1)
    sessionStorage.removeItem('desvios-filters')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-zinc-50">Desvios</h1>
          <p className="text-sm text-zinc-500">
            {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
            {hasFilters && ' (filtrado)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportarCSV(filtered)} title="Exportar CSV"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => router.push('/desvios/novo')}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-semibold transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Desvio</span>
          </button>
        </div>
      </motion.div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => { setActiveTab(t.value); setPage(1) }}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
              activeTab === t.value
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800')}>
            {t.label}
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              activeTab === t.value ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-600')}>
              {counts[t.value] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input value={busca} onChange={e => { setBusca(e.target.value); setPage(1) }}
            placeholder="Buscar por descrição, obra, encarregado, TST..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50" />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={cn('flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-medium transition-all',
            showFilters || hasFilters
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200')}>
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
          {hasFilters && <span className="w-2 h-2 bg-amber-500 rounded-full" />}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Obra</label>
              <select value={filtros.obra_id || ''} onChange={e => setFiltro('obra_id', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="">Todas</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Coordenador</label>
              <select value={filtros.coordenador_id || ''} onChange={e => setFiltro('coordenador_id', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="">Todos</option>
                {coordenadores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1.5 block">TST</label>
              <select value={filtros.tst_id || ''} onChange={e => setFiltro('tst_id', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="">Todos</option>
                {tsts.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Encarregado</label>
              <select value={filtros.encarregado_id || ''} onChange={e => setFiltro('encarregado_id', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="">Todos</option>
                {encarregados.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Categoria</label>
              <select value={filtros.categoria || ''} onChange={e => setFiltro('categoria', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="">Todas</option>
                {CATEGORIAS_PADRAO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Gravidade</label>
              <select value={filtros.gravidade || ''} onChange={e => setFiltro('gravidade', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="">Todas</option>
                <option value="baixo">Baixo</option>
                <option value="medio">Médio</option>
                <option value="alto">Alto</option>
                <option value="critico">Crítico</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Data início</label>
              <input type="date" value={filtros.data_inicio || ''} onChange={e => setFiltro('data_inicio', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Data fim</label>
              <input type="date" value={filtros.data_fim || ''} onChange={e => setFiltro('data_fim', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div className="flex items-end">
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                  <X className="w-3 h-3" />Limpar filtros
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {loaded && desviosComputados.length === 0 && (
        <div className="text-center py-20">
          <AlertTriangle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">Nenhum desvio registrado ainda</p>
          <p className="text-sm text-zinc-600 mt-1 mb-4">Registre o primeiro desvio da sua obra</p>
          <button onClick={() => router.push('/desvios/novo')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-all active:scale-95">
            Registrar Primeiro Desvio
          </button>
        </div>
      )}

      {/* No results */}
      {loaded && desviosComputados.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum desvio encontrado com os filtros aplicados</p>
          <button onClick={clearFilters} className="mt-2 text-amber-400 text-sm hover:text-amber-300">Limpar filtros</button>
        </div>
      )}

      {/* Mobile cards */}
      {paginated.length > 0 && (
        <div className="md:hidden space-y-2">
          {paginated.map((d, i) => {
            const sc = STATUS_CONFIG[d.status]
            const gc = GRAVIDADE_CONFIG[d.gravidade]
            const foto = d.fotos?.[0]
            return (
              <motion.button key={d.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => router.push(`/desvios/${d.id}`)}
                className="w-full flex items-start gap-3 p-4 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-left transition-colors active:scale-[0.99]">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                  {foto ? <img src={foto.data_url} alt="" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-zinc-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-amber-500">{generateDesvioId(d.numero)}</span>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', sc.bg, sc.color, sc.border)}>
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-200 line-clamp-2">{d.descricao}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                    <span className="truncate">{d.obra_nome_computado}</span>
                    <span>·</span>
                    <span>{formatDate(d.data_ocorrencia)}</span>
                    <span className={cn('ml-auto font-semibold', gc.color)}>{gc.label}</span>
                  </div>
                  {d.prazo_correcao && (
                    <p className={cn('text-[11px] font-semibold mt-0.5 text-center leading-tight', getSlaColor(d.dias_para_vencer, d.vencido, d.isClosed))}>
                      {getSlaLabel(d.dias_para_vencer, d.vencido, d.isClosed)}
                    </p>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Desktop table */}
      {paginated.length > 0 && (
        <div className="hidden md:block rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Foto', 'ID / Desvio', 'Data', 'Obra', 'Categoria', 'Gravidade', 'Coordenador', 'Encarregado', 'TST', 'Status', 'SLA', ''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider first:px-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {paginated.map((d, i) => {
                const sc = STATUS_CONFIG[d.status]
                const gc = GRAVIDADE_CONFIG[d.gravidade]
                const foto = d.fotos?.[0]
                const slaColor = getSlaColor(d.dias_para_vencer, d.vencido, d.isClosed)
                return (
                  <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden flex items-center justify-center">
                        {foto ? <img src={foto.data_url} alt="" className="w-full h-full object-cover" /> : <Camera className="w-4 h-4 text-zinc-600" />}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs font-mono font-bold text-amber-500">{generateDesvioId(d.numero)}</p>
                      <p className="text-xs text-zinc-400 max-w-[180px] truncate mt-0.5">{d.descricao}</p>
                    </td>
                    <td className="px-3 py-3 text-sm text-zinc-300 whitespace-nowrap">{formatDate(d.data_ocorrencia)}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-zinc-200 max-w-[120px] truncate">{d.obra_nome_computado}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-400 max-w-[120px] truncate">
                      {d.categorias.map(c => c === 'Outros' && d.categoria_outro ? d.categoria_outro : c).join(', ')}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border', gc.bg, gc.color, gc.border)}>
                        {d.gravidade === 'critico' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                        {gc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-zinc-300 max-w-[100px] truncate">{d.coordenador_nome_computado || '—'}</td>
                    <td className="px-3 py-3 text-sm text-zinc-300 max-w-[100px] truncate">{d.encarregado_nome_computado}</td>
                    <td className="px-3 py-3 text-sm text-zinc-400 max-w-[100px] truncate">{d.tst_nome_computado || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border', sc.bg, sc.color, sc.border)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className={cn('text-xs font-semibold text-center leading-tight max-w-[80px]', slaColor)}>
                        {d.prazo_correcao ? getSlaLabel(d.dias_para_vencer, d.vencido, d.isClosed) : '—'}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => router.push(`/desvios/${d.id}`)}
                        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-amber-400 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">Mostrando {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} de {filtered.length}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {(() => {
                  const WINDOW = 5
                  const start = Math.max(1, Math.min(page - 1, totalPages - WINDOW + 1))
                  const end = Math.min(totalPages, start + WINDOW - 1)
                  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={cn('w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                        page === p ? 'bg-amber-500 text-zinc-950' : 'text-zinc-500 hover:bg-zinc-800')}>
                      {p}
                    </button>
                  ))
                })()}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile pagination */}
      {totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 text-zinc-400 disabled:opacity-30 text-sm">
            <ChevronLeft className="w-4 h-4" />Anterior
          </button>
          <span className="text-xs text-zinc-500">{page}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 text-zinc-400 disabled:opacity-30 text-sm">
            Próximo<ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
