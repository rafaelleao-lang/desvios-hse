'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, RefreshCw, Plus, Trash2, X, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'
import { alertasDB, tiposDB } from '@/lib/db-residuos'
import { obrasDB } from '@/lib/db'
import type { AlertaEstoque, TipoResiduo } from '@/types/residuos'
import type { Obra } from '@/types'
import { cn } from '@/lib/utils'

const COR = '#22C55E'

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [tipos, setTipos] = useState<TipoResiduo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    obra_id: '', residuo_id: '', minimo: '', emails: '',
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [a, o, t] = await Promise.all([alertasDB.list(), obrasDB.list(), tiposDB.list()])
      setAlertas(a); setObras(o.filter(x => x.ativa)); setTipos(t)
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const nomeObra = (id: string) => obras.find(o => o.id === id)?.nome ?? id
  const nomeResiduo = (id: string) => tipos.find(t => t.id === id)?.nome ?? id

  async function salvar() {
    if (!form.obra_id || !form.residuo_id || !form.minimo) return
    setSalvando(true)
    try {
      await alertasDB.upsert(form.obra_id, form.residuo_id, Number(form.minimo), form.emails || undefined)
      setModal(false)
      setForm({ obra_id: '', residuo_id: '', minimo: '', emails: '' })
      await carregar()
    } finally { setSalvando(false) }
  }

  async function toggle(id: string) {
    await alertasDB.toggleAtivo(id); await carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este alerta?')) return
    await alertasDB.delete(id); await carregar()
  }

  const alertasViolados = alertas.filter(a => a.ativo && a.saldo_atual != null && a.saldo_atual < a.minimo)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COR + '20' }}>
            <Bell className="w-5 h-5" style={{ color: COR }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Alertas de Estoque</h1>
            <p className="text-xs text-zinc-500">Mínimo por obra e tipo de resíduo</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} disabled={loading}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: COR }}>
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {alertasViolados.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">
              {alertasViolados.length} alerta{alertasViolados.length > 1 ? 's' : ''} violado{alertasViolados.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              Saldo abaixo do mínimo configurado
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Carregando…</span>
        </div>
      )}

      {!loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Bell className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-sm">Nenhum alerta configurado</p>
            </div>
          ) : alertas.map(a => {
            const violado = a.ativo && a.saldo_atual != null && a.saldo_atual < a.minimo
            return (
              <div key={a.id} className={cn('px-4 py-3 flex items-center gap-3 transition-colors', violado && 'bg-red-500/5')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {violado && <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                    <p className="text-sm font-medium text-zinc-200">
                      {a.obra_nome ?? nomeObra(a.obra_id)}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {a.residuo_nome ?? nomeResiduo(a.residuo_id)}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-500">
                      Mínimo: <span className="font-semibold text-zinc-300">{a.minimo}</span>
                    </span>
                    {a.saldo_atual != null && (
                      <span className={cn('text-xs font-semibold', violado ? 'text-red-400' : 'text-green-400')}>
                        Atual: {a.saldo_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                      </span>
                    )}
                    {a.emails && <span className="text-xs text-zinc-600 truncate max-w-[120px]">{a.emails}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggle(a.id)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors" title="Ativar/desativar">
                    {a.ativo
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4 text-zinc-600" />
                    }
                  </button>
                  <button onClick={() => excluir(a.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">Novo Alerta</h2>
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
              <select value={form.residuo_id} onChange={e => setForm(f => ({ ...f, residuo_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">Tipo de resíduo…</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <input type="number" min="0" placeholder="Quantidade mínima" value={form.minimo}
                onChange={e => setForm(f => ({ ...f, minimo: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <input type="email" placeholder="E-mail para notificação (opcional)" value={form.emails}
                onChange={e => setForm(f => ({ ...f, emails: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
            </div>
            <button onClick={salvar} disabled={salvando || !form.obra_id || !form.residuo_id || !form.minimo}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Criar Alerta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
