'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, ClipboardSignature, Trash2, X, Check, XCircle, PlayCircle } from 'lucide-react'
import { solicitacoesDB, tiposDB } from '@/lib/db-residuos'
import { obrasDB } from '@/lib/db'
import type { ResSolicitacao, TipoResiduo } from '@/types/residuos'
import type { Obra } from '@/types'
import { cn } from '@/lib/utils'

const COR = '#22C55E'

const STATUS_MAP: Record<ResSolicitacao['status'], { label: string; cor: string }> = {
  PENDENTE:     { label: 'Pendente',     cor: '#F59E0B' },
  EM_ANDAMENTO: { label: 'Em Andamento', cor: '#3B82F6' },
  CONCLUIDA:    { label: 'Concluída',    cor: '#22C55E' },
  CANCELADA:    { label: 'Cancelada',    cor: '#EF4444' },
}

export default function SolicitacoesPage() {
  const [itens, setItens] = useState<ResSolicitacao[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [tipos, setTipos] = useState<TipoResiduo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<string>('')

  const [form, setForm] = useState({
    obra_id: '', tipo_id: '', quantidade: '', unidade_medida: '',
    valor_unitario: '', data_prevista: '', observacoes: '', status: 'PENDENTE' as ResSolicitacao['status'],
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [s, o, t] = await Promise.all([solicitacoesDB.list(), obrasDB.list(), tiposDB.list()])
      setItens(s); setObras(o.filter(x => x.ativa)); setTipos(t)
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = filtroStatus ? itens.filter(i => i.status === filtroStatus) : itens

  async function salvar() {
    if (!form.obra_id || !form.tipo_id || !form.quantidade || !form.data_prevista) return
    setSalvando(true)
    try {
      await solicitacoesDB.insert({
        obra_id: form.obra_id, tipo_id: form.tipo_id,
        quantidade: Number(form.quantidade), unidade_medida: form.unidade_medida || undefined,
        valor_unitario: form.valor_unitario ? Number(form.valor_unitario) : undefined,
        data_prevista: form.data_prevista,
        data_solicitacao: new Date().toISOString().slice(0, 10),
        observacoes: form.observacoes || undefined, status: form.status,
      })
      setModal(false)
      setForm({ obra_id: '', tipo_id: '', quantidade: '', unidade_medida: '', valor_unitario: '', data_prevista: '', observacoes: '', status: 'PENDENTE' })
      await carregar()
    } finally { setSalvando(false) }
  }

  async function mudarStatus(id: string, status: ResSolicitacao['status']) {
    await solicitacoesDB.updateStatus(id, status)
    await carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta solicitação?')) return
    await solicitacoesDB.delete(id); await carregar()
  }

  return (
    <div className="space-y-5">
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: COR }}>
            <Plus className="w-4 h-4" /> Nova
          </button>
        </div>
      </div>

      {/* KPIs por status */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(STATUS_MAP).map(([s, cfg]) => {
          const count = itens.filter(i => i.status === s).length
          return (
            <button key={s} onClick={() => setFiltroStatus(filtroStatus === s ? '' : s)}
              className={cn(
                'rounded-xl p-3 border text-center transition-all',
                filtroStatus === s ? 'border-opacity-60' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800',
              )}
              style={filtroStatus === s ? { background: cfg.cor + '15', borderColor: cfg.cor + '40' } : {}}>
              <p className="text-lg font-bold" style={{ color: cfg.cor }}>{count}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Carregando…</span>
        </div>
      )}

      {!loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <ClipboardSignature className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-sm">Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filtrados.map(s => {
                const st = STATUS_MAP[s.status]
                return (
                  <div key={s.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: st.cor + '20', color: st.cor }}>
                          {st.label}
                        </span>
                        <span className="text-xs text-zinc-500">Prev: {s.data_prevista}</span>
                      </div>
                      <p className="text-sm font-medium text-zinc-200">{s.obra_nome ?? s.obra_id}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {s.tipo_nome ?? s.tipo_id} · {s.quantidade} {s.unidade_medida}
                        {s.valor_unitario ? ` · R$ ${s.valor_unitario}/un` : ''}
                      </p>
                      {s.observacoes && <p className="text-xs text-zinc-500 mt-1">{s.observacoes}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {s.status === 'PENDENTE' && (
                        <>
                          <button onClick={() => mudarStatus(s.id, 'EM_ANDAMENTO')}
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-zinc-600 hover:text-blue-400 transition-colors" title="Iniciar">
                            <PlayCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => mudarStatus(s.id, 'CANCELADA')}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors" title="Cancelar">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {s.status === 'EM_ANDAMENTO' && (
                        <button onClick={() => mudarStatus(s.id, 'CONCLUIDA')}
                          className="p-1.5 rounded-lg hover:bg-green-500/10 text-zinc-600 hover:text-green-400 transition-colors" title="Concluir">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => excluir(s.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">Nova Solicitação</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <select value={form.obra_id} onChange={e => setForm(f => ({ ...f, obra_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">Obra…</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              <select value={form.tipo_id} onChange={e => setForm(f => ({ ...f, tipo_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">Tipo de resíduo…</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Quantidade" value={form.quantidade}
                  onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
                <input type="text" placeholder="Unidade" value={form.unidade_medida}
                  onChange={e => setForm(f => ({ ...f, unidade_medida: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              </div>
              <input type="number" placeholder="Valor unitário (opcional)" value={form.valor_unitario}
                onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Data prevista</label>
                <input type="date" value={form.data_prevista}
                  onChange={e => setForm(f => ({ ...f, data_prevista: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              </div>
              <textarea placeholder="Observações (opcional)" value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500 resize-none" />
            </div>
            <button onClick={salvar}
              disabled={salvando || !form.obra_id || !form.tipo_id || !form.quantidade || !form.data_prevista}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Criar Solicitação'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
