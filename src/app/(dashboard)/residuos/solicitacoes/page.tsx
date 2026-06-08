'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, RefreshCw, ClipboardSignature, Trash2, X,
  Check, XCircle, PlayCircle, Calendar, ChevronDown,
  ChevronUp, Building2, List, AlertTriangle,
} from 'lucide-react'
import { solicitacoesDB, tiposDB } from '@/lib/db-residuos'
import { obrasDB } from '@/lib/db'
import type { ResSolicitacao, TipoResiduo } from '@/types/residuos'
import type { Obra } from '@/types'
import { cn } from '@/lib/utils'

const COR = '#22C55E'

const UNIDADES = [
  'Caçamba 5m³', 'Caçamba 15m³', 'Caçamba 30m³',
  'Volume líquido (m³)', 'Peso (kg)', 'Tonelada (ton)', 'Unidade (un)', 'Personalizado',
]

const STATUS_CFG: Record<ResSolicitacao['status'], { label: string; cor: string; bg: string }> = {
  PENDENTE:     { label: 'Pendente',     cor: '#F59E0B', bg: 'bg-amber-500/15' },
  EM_ANDAMENTO: { label: 'Em Andamento', cor: '#3B82F6', bg: 'bg-blue-500/15'  },
  CONCLUIDA:    { label: 'Concluída',    cor: '#22C55E', bg: 'bg-green-500/15' },
  CANCELADA:    { label: 'Cancelada',    cor: '#EF4444', bg: 'bg-red-500/15'   },
}

function StatusBadge({ status }: { status: ResSolicitacao['status'] }) {
  const s = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', s.bg)}
      style={{ color: s.cor }}>
      {s.label}
    </span>
  )
}

function fmtData(d?: string | null) {
  if (!d) return null
  const p = d.slice(0, 10).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d
}

const today = new Date().toISOString().slice(0, 10)
type Visao = 'lista' | 'obras'

// ── Linhas da tabela ─────────────────────────────────────────────────────────
function LinhaTabela({ s, onStatus, onExcluir }: {
  s: ResSolicitacao
  onStatus: (id: string, st: ResSolicitacao['status']) => void
  onExcluir: (id: string) => void
}) {
  return (
    <tr className="hover:bg-zinc-800/30 transition-colors group">
      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={s.status} /></td>
      <td className="px-4 py-3 text-zinc-200 font-medium max-w-[160px] truncate">{s.obra_nome ?? s.obra_id}</td>
      <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{s.tipo_nome ?? s.tipo_id}</td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span className="font-semibold text-zinc-100">{s.quantidade}</span>
        <span className="text-zinc-500 text-xs ml-1">{s.unidade_medida}</span>
      </td>
      <td className="px-4 py-3 text-center text-zinc-400 text-xs whitespace-nowrap">
        <span className="flex items-center justify-center gap-1">
          <Calendar className="w-3 h-3 opacity-50" />
          {fmtData(s.data_solicitacao) ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
        <span className={cn('font-medium', s.status === 'PENDENTE' ? 'text-amber-400' : 'text-zinc-400')}>
          {fmtData(s.data_prevista) ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
        {s.data_finalizacao
          ? <span className="flex items-center justify-center gap-1 text-green-400">
              <Check className="w-3 h-3" />{fmtData(s.data_finalizacao)}
            </span>
          : <span className="text-zinc-700">—</span>}
      </td>
      <td className="px-4 py-3 text-zinc-500 text-xs max-w-[140px] truncate">{s.observacoes || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {s.status === 'PENDENTE' && (
            <>
              <button onClick={() => onStatus(s.id, 'EM_ANDAMENTO')} title="Iniciar"
                className="p-1.5 rounded-lg hover:bg-blue-500/15 text-zinc-600 hover:text-blue-400 transition-colors">
                <PlayCircle className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onStatus(s.id, 'CANCELADA')} title="Cancelar"
                className="p-1.5 rounded-lg hover:bg-red-500/15 text-zinc-600 hover:text-red-400 transition-colors">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {s.status === 'EM_ANDAMENTO' && (
            <button onClick={() => onStatus(s.id, 'CONCLUIDA')} title="Concluir"
              className="p-1.5 rounded-lg hover:bg-green-500/15 text-zinc-600 hover:text-green-400 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onExcluir(s.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-zinc-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

const THEAD = (
  <thead>
    <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide bg-zinc-900/80">
      <th className="text-left px-4 py-3 font-medium">Status</th>
      <th className="text-left px-4 py-3 font-medium">Obra</th>
      <th className="text-left px-4 py-3 font-medium">Resíduo</th>
      <th className="text-right px-4 py-3 font-medium">Qtd / Unidade</th>
      <th className="text-center px-4 py-3 font-medium">Abertura</th>
      <th className="text-center px-4 py-3 font-medium">Previsão</th>
      <th className="text-center px-4 py-3 font-medium">Fechamento</th>
      <th className="text-left px-4 py-3 font-medium">Obs.</th>
      <th className="px-4 py-3" />
    </tr>
  </thead>
)

// ─────────────────────────────────────────────────────────────────────────────

export default function SolicitacoesPage() {
  const [itens, setItens] = useState<ResSolicitacao[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [tipos, setTipos] = useState<TipoResiduo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [visao, setVisao] = useState<Visao>('lista')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroObra, setFiltroObra] = useState('')
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    obra_id: '', tipo_id: '', quantidade: '',
    unidade_medida: 'Caçamba 5m³', unidade_custom: '',
    valor_unitario: '', data_abertura: today, data_prevista: '', observacoes: '',
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [s, o, t] = await Promise.all([solicitacoesDB.list(), obrasDB.list(), tiposDB.list()])
      setItens(s); setObras(o.filter(x => x.ativa)); setTipos(t)
      setExpandidas(new Set(s.filter(x => x.status === 'PENDENTE' || x.status === 'EM_ANDAMENTO').map(x => x.obra_id)))
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = itens
    .filter(i => !filtroStatus || i.status === filtroStatus)
    .filter(i => !filtroObra  || i.obra_id === filtroObra)

  // Agrupado por obra (para visão obras)
  const porObra = filtrados.reduce<Record<string, { nome: string; itens: ResSolicitacao[] }>>((acc, s) => {
    if (!acc[s.obra_id]) acc[s.obra_id] = { nome: s.obra_nome ?? s.obra_id, itens: [] }
    acc[s.obra_id].itens.push(s)
    return acc
  }, {})
  const obraIds = Object.keys(porObra).sort((a, b) => porObra[a].nome.localeCompare(porObra[b].nome))

  function toggleObra(id: string) {
    setExpandidas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function salvar() {
    if (!form.obra_id || !form.tipo_id || !form.quantidade || !form.data_prevista) return
    const un = form.unidade_medida === 'Personalizado' ? form.unidade_custom : form.unidade_medida
    setSalvando(true)
    try {
      await solicitacoesDB.insert({
        obra_id: form.obra_id, tipo_id: form.tipo_id,
        quantidade: Number(form.quantidade), unidade_medida: un || undefined,
        valor_unitario: form.valor_unitario ? Number(form.valor_unitario) : undefined,
        data_prevista: form.data_prevista, data_solicitacao: form.data_abertura,
        observacoes: form.observacoes || undefined, status: 'PENDENTE',
      })
      setModal(false)
      setForm({ obra_id: '', tipo_id: '', quantidade: '', unidade_medida: 'Caçamba 5m³', unidade_custom: '', valor_unitario: '', data_abertura: today, data_prevista: '', observacoes: '' })
      await carregar()
    } finally { setSalvando(false) }
  }

  async function mudarStatus(id: string, status: ResSolicitacao['status']) {
    await solicitacoesDB.updateStatus(id, status); await carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta solicitação?')) return
    await solicitacoesDB.delete(id); await carregar()
  }

  const totalPendentes = itens.filter(i => i.status === 'PENDENTE').length
  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COR + '20' }}>
            <ClipboardSignature className="w-5 h-5" style={{ color: COR }} />
          </div>
          <h1 className="text-lg font-bold text-zinc-100">Solicitações</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} disabled={loading}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: COR }}>
            <Plus className="w-4 h-4" /> Nova
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.entries(STATUS_CFG) as [ResSolicitacao['status'], typeof STATUS_CFG[keyof typeof STATUS_CFG]][]).map(([s, cfg]) => {
          const count = itens.filter(i => i.status === s).length
          const ativo = filtroStatus === s
          return (
            <button key={s} onClick={() => setFiltroStatus(ativo ? '' : s)}
              className={cn('rounded-xl p-3 border text-left transition-all',
                ativo ? '' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800')}
              style={ativo ? { background: cfg.cor + '12', borderColor: cfg.cor + '40' } : {}}>
              <p className="text-2xl font-bold" style={{ color: cfg.cor }}>{count}</p>
              <p className="text-xs text-zinc-500 mt-0.5 font-medium">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Aviso pendentes */}
      {totalPendentes > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300 font-medium">
            {totalPendentes} solicitaç{totalPendentes > 1 ? 'ões' : 'ão'} pendente{totalPendentes > 1 ? 's' : ''} aguardando ação
          </p>
        </div>
      )}

      {/* Barra: visão + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Toggle visão */}
        <div className="flex gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button onClick={() => setVisao('lista')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              visao === 'lista' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}
            style={visao === 'lista' ? { background: COR + '30', color: COR } : {}}>
            <List className="w-3.5 h-3.5" /> Lista
          </button>
          <button onClick={() => setVisao('obras')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              visao === 'obras' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}
            style={visao === 'obras' ? { background: COR + '30', color: COR } : {}}>
            <Building2 className="w-3.5 h-3.5" /> Por Obra
          </button>
        </div>

        {/* Filtro obra */}
        <div className="relative">
          <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)}
            className="appearance-none bg-zinc-900 border border-zinc-700 rounded-lg pl-3 pr-7 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-green-500">
            <option value="">Todas as obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
        </div>

        {(filtroStatus || filtroObra) && (
          <button onClick={() => { setFiltroStatus(''); setFiltroObra('') }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:bg-zinc-800 transition-colors">
            <X className="w-3 h-3" /> Limpar filtros
          </button>
        )}

        <span className="ml-auto text-xs text-zinc-600">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Carregando…</span>
        </div>
      )}

      {/* ── Visão: Lista ── */}
      {!loading && visao === 'lista' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zinc-600 gap-2">
              <ClipboardSignature className="w-9 h-9 opacity-25" />
              <p className="text-sm">Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {THEAD}
                <tbody className="divide-y divide-zinc-800/50">
                  {filtrados.map(s => (
                    <LinhaTabela key={s.id} s={s} onStatus={mudarStatus} onExcluir={excluir} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Visão: Por Obra ── */}
      {!loading && visao === 'obras' && (
        <div className="space-y-3">
          {obraIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zinc-600 gap-2 bg-zinc-900 border border-zinc-800 rounded-xl">
              <Building2 className="w-9 h-9 opacity-25" />
              <p className="text-sm">Nenhuma solicitação encontrada</p>
            </div>
          ) : obraIds.map(obraId => {
            const grupo = porObra[obraId]
            const expandido = expandidas.has(obraId)
            const counts = Object.fromEntries(
              Object.keys(STATUS_CFG).map(s => [s, grupo.itens.filter(i => i.status === s).length])
            ) as Record<ResSolicitacao['status'], number>
            const temAtivos = counts.PENDENTE + counts.EM_ANDAMENTO > 0

            return (
              <div key={obraId}
                className={cn('rounded-xl border overflow-hidden',
                  temAtivos ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/60 border-zinc-800')}>

                <button onClick={() => toggleObra(obraId)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-800/40 transition-colors text-left">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: temAtivos ? COR : '#52525b' }} />
                  <span className="font-semibold text-zinc-100 text-sm flex-1 truncate">{grupo.nome}</span>
                  <div className="flex items-center gap-1.5 mr-2">
                    {(Object.entries(counts) as [ResSolicitacao['status'], number][])
                      .filter(([, c]) => c > 0)
                      .map(([s, c]) => (
                        <span key={s} className={cn('text-xs font-bold px-2 py-0.5 rounded-full', STATUS_CFG[s].bg)}
                          style={{ color: STATUS_CFG[s].cor }}>
                          {c} {STATUS_CFG[s].label}
                        </span>
                      ))}
                  </div>
                  {expandido ? <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                </button>

                {expandido && (
                  <div className="border-t border-zinc-800 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-800/40 text-zinc-500 text-xs uppercase tracking-wide">
                          <th className="text-left px-4 py-2.5 font-medium">Status</th>
                          <th className="text-left px-4 py-2.5 font-medium">Resíduo</th>
                          <th className="text-right px-4 py-2.5 font-medium">Qtd / Unidade</th>
                          <th className="text-center px-4 py-2.5 font-medium">Abertura</th>
                          <th className="text-center px-4 py-2.5 font-medium">Previsão</th>
                          <th className="text-center px-4 py-2.5 font-medium">Fechamento</th>
                          <th className="text-left px-4 py-2.5 font-medium">Obs.</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {grupo.itens.map(s => {
                          const st = STATUS_CFG[s.status]
                          return (
                            <tr key={s.id} className="hover:bg-zinc-800/20 transition-colors group">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', st.bg)}
                                  style={{ color: st.cor }}>{st.label}</span>
                              </td>
                              <td className="px-4 py-3 text-zinc-200 font-medium whitespace-nowrap">{s.tipo_nome ?? s.tipo_id}</td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <span className="font-semibold text-zinc-100">{s.quantidade}</span>
                                <span className="text-zinc-500 text-xs ml-1">{s.unidade_medida}</span>
                              </td>
                              <td className="px-4 py-3 text-center text-zinc-500 text-xs whitespace-nowrap">
                                <span className="flex items-center justify-center gap-1">
                                  <Calendar className="w-3 h-3 opacity-50" />
                                  {fmtData(s.data_solicitacao) ?? '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                                <span className={cn('font-medium', s.status === 'PENDENTE' ? 'text-amber-400' : 'text-zinc-400')}>
                                  {fmtData(s.data_prevista) ?? '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                                {s.data_finalizacao
                                  ? <span className="flex items-center justify-center gap-1 text-green-400">
                                      <Check className="w-3 h-3" />{fmtData(s.data_finalizacao)}
                                    </span>
                                  : <span className="text-zinc-700">—</span>}
                              </td>
                              <td className="px-4 py-3 text-zinc-500 text-xs max-w-[160px] truncate">{s.observacoes || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {s.status === 'PENDENTE' && (
                                    <>
                                      <button onClick={() => mudarStatus(s.id, 'EM_ANDAMENTO')} title="Iniciar"
                                        className="p-1.5 rounded-lg hover:bg-blue-500/15 text-zinc-600 hover:text-blue-400 transition-colors">
                                        <PlayCircle className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => mudarStatus(s.id, 'CANCELADA')} title="Cancelar"
                                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-zinc-600 hover:text-red-400 transition-colors">
                                        <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  {s.status === 'EM_ANDAMENTO' && (
                                    <button onClick={() => mudarStatus(s.id, 'CONCLUIDA')} title="Concluir"
                                      className="p-1.5 rounded-lg hover:bg-green-500/15 text-zinc-600 hover:text-green-400 transition-colors">
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button onClick={() => excluir(s.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-500/15 text-zinc-600 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal Nova Solicitação ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-zinc-100">Nova Solicitação</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Solicitação de retirada de resíduo</p>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <select value={form.obra_id} onChange={e => setForm(f => ({ ...f, obra_id: e.target.value }))} className={inputCls}>
                <option value="">Obra *</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              <select value={form.tipo_id} onChange={e => setForm(f => ({ ...f, tipo_id: e.target.value }))} className={inputCls}>
                <option value="">Tipo de Resíduo *</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="number" min="0" step="0.01" placeholder="Quantidade *" value={form.quantidade}
                  onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} className={inputCls} />
                <select value={form.unidade_medida}
                  onChange={e => setForm(f => ({ ...f, unidade_medida: e.target.value }))} className={inputCls}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {form.unidade_medida === 'Personalizado' && (
                <input type="text" placeholder="Especifique a unidade *" value={form.unidade_custom}
                  onChange={e => setForm(f => ({ ...f, unidade_custom: e.target.value }))} className={inputCls} />
              )}
              <input type="number" min="0" step="0.01" placeholder="Valor unitário R$ (opcional)"
                value={form.valor_unitario}
                onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))} className={inputCls} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Data de Abertura</label>
                  <input type="date" value={form.data_abertura}
                    onChange={e => setForm(f => ({ ...f, data_abertura: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Data Prevista *</label>
                  <input type="date" value={form.data_prevista}
                    onChange={e => setForm(f => ({ ...f, data_prevista: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <textarea placeholder="Observações (opcional)" value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                rows={2} className={`${inputCls} resize-none`} />
            </div>
            <button onClick={salvar}
              disabled={salvando || !form.obra_id || !form.tipo_id || !form.quantidade || !form.data_prevista || (form.unidade_medida === 'Personalizado' && !form.unidade_custom)}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Criar Solicitação'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
