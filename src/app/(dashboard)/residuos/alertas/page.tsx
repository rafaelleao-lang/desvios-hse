'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Bell, RefreshCw, Plus, Trash2, X,
  ToggleLeft, ToggleRight, AlertCircle, Send, Mail, CheckCircle2,
} from 'lucide-react'
import { alertasDB, tiposDB } from '@/lib/db-residuos'
import { obrasDB } from '@/lib/db'
import type { ResAlerta, TipoResiduo } from '@/types/residuos'
import type { Obra } from '@/types'
import { cn } from '@/lib/utils'

const COR = '#22C55E'

// ── Input de múltiplos e-mails (tags) ─────────────────────────────────────────
function EmailTags({ emails, onChange }: { emails: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')

  function add() {
    const v = input.trim().toLowerCase()
    if (!v || !v.includes('@') || !v.includes('.') || emails.includes(v)) return
    onChange([...emails, v])
    setInput('')
  }

  function remove(e: string) { onChange(emails.filter(x => x !== e)) }

  return (
    <div className="border border-zinc-700 rounded-lg bg-zinc-800 p-2.5 space-y-2 focus-within:border-green-500 transition-colors">
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {emails.map(e => (
            <span key={e}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-700 rounded-full text-xs text-zinc-300 font-medium">
              <Mail className="w-2.5 h-2.5 opacity-50" />
              {e}
              <button type="button" onClick={() => remove(e)}
                className="hover:text-red-400 transition-colors -mr-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="email"
          placeholder={emails.length === 0 ? 'Digite um e-mail e pressione Enter…' : 'Adicionar outro e-mail…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none min-w-0"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.includes('@')}
          className="text-xs px-2.5 py-1 rounded-md font-semibold transition-colors disabled:opacity-30"
          style={{ background: COR + '25', color: COR }}>
          + Add
        </button>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function AlertasPage() {
  const [alertas, setAlertas]         = useState<ResAlerta[]>([])
  const [obras, setObras]             = useState<Obra[]>([])
  const [tipos, setTipos]             = useState<TipoResiduo[]>([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [salvando, setSalvando]       = useState(false)
  const [notificando, setNotificando] = useState(false)
  const [feedback, setFeedback]       = useState<{ ok: boolean; txt: string } | null>(null)

  const [form, setForm] = useState({
    obra_id: '', tipo_id: '', minimo: '', emails: [] as string[],
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [a, o, t] = await Promise.all([alertasDB.list(), obrasDB.list(), tiposDB.list()])
      setAlertas(a)
      setObras(o.filter(x => x.ativa))
      setTipos(t)
    } catch {
      // silencia
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirModal() {
    setForm({ obra_id: '', tipo_id: '', minimo: '', emails: [] })
    setModal(true)
  }

  async function salvar() {
    if (!form.obra_id || !form.tipo_id || !form.minimo) return
    setSalvando(true)
    try {
      await alertasDB.upsert(
        form.obra_id,
        form.tipo_id,
        Number(form.minimo),
        form.emails.length > 0 ? form.emails.join(',') : undefined,
      )
      setModal(false)
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function toggle(id: string) {
    await alertasDB.toggleAtivo(id)
    await carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este alerta?')) return
    await alertasDB.delete(id)
    await carregar()
  }

  async function notificarAgora() {
    setNotificando(true)
    setFeedback(null)
    try {
      const res  = await fetch('/api/residuos/check-alertas', { method: 'POST' })
      const data = await res.json() as {
        ok: boolean; verificados?: number; notificados?: number; erros?: string[]; error?: string
      }
      if (data.ok) {
        const n = data.notificados ?? 0
        const v = data.verificados ?? 0
        if (n > 0) {
          setFeedback({ ok: true, txt: `${n} notificação${n > 1 ? 'ões' : ''} enviada${n > 1 ? 's' : ''} com sucesso.` })
        } else {
          setFeedback({ ok: true, txt: `${v} alerta${v !== 1 ? 's' : ''} verificado${v !== 1 ? 's' : ''} — nenhuma violação com e-mail pendente.` })
        }
        if (data.erros?.length) {
          setFeedback({ ok: false, txt: `Erros ao enviar: ${data.erros.join(' | ')}` })
        }
      } else {
        setFeedback({ ok: false, txt: data.error ?? 'Erro desconhecido' })
      }
    } catch (e) {
      setFeedback({ ok: false, txt: `Falha na requisição: ${String(e)}` })
    } finally {
      setNotificando(false)
    }
  }

  const alertasViolados = alertas.filter(a => a.ativo && (a.saldo_atual ?? Infinity) < a.minimo)
  const temEmailsConfig = alertas.some(a => a.ativo && a.emails)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COR + '20' }}>
            <Bell className="w-5 h-5" style={{ color: COR }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Alertas de Estoque</h1>
            <p className="text-xs text-zinc-500">Notificação por e-mail quando saldo cai abaixo do mínimo</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={carregar} disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-40">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>

          <button
            onClick={notificarAgora}
            disabled={notificando || loading || !temEmailsConfig}
            title={!temEmailsConfig ? 'Configure e-mails nos alertas para habilitar' : 'Verificar violações e enviar e-mails'}
            className="h-9 flex items-center gap-2 px-3 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{notificando ? 'Enviando…' : 'Notificar agora'}</span>
          </button>

          <button onClick={abrirModal}
            className="h-9 flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: COR }}>
            <Plus className="w-4 h-4" /> Novo alerta
          </button>
        </div>
      </div>

      {/* Feedback de envio */}
      {feedback && (
        <div className={cn(
          'flex items-start gap-2.5 p-3.5 rounded-xl text-sm border',
          feedback.ok
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400',
        )}>
          {feedback.ok
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <AlertCircle  className="w-4 h-4 flex-shrink-0 mt-0.5" />
          }
          <span className="flex-1">{feedback.txt}</span>
          <button onClick={() => setFeedback(null)} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Banner de violações */}
      {!loading && alertasViolados.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">
              {alertasViolados.length} alerta{alertasViolados.length > 1 ? 's' : ''} violado{alertasViolados.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              Saldo abaixo do mínimo. {temEmailsConfig ? 'Clique em "Notificar agora" para enviar os e-mails.' : 'Configure e-mails nos alertas para receber notificações.'}
            </p>
          </div>
        </div>
      )}


      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando alertas…</span>
        </div>
      )}

      {/* Lista de alertas */}
      {!loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/60">
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zinc-500 gap-2">
              <Bell className="w-9 h-9 opacity-20" />
              <p className="text-sm font-medium">Nenhum alerta configurado</p>
              <p className="text-xs text-zinc-600">Clique em "Novo alerta" para começar</p>
            </div>
          ) : alertas.map(a => {
            const violado   = a.ativo && (a.saldo_atual ?? Infinity) < a.minimo
            const saldo     = a.saldo_atual ?? 0
            const pct       = a.minimo > 0 ? Math.min(100, Math.round((saldo / a.minimo) * 100)) : 100
            const barCor    = violado ? '#EF4444' : pct < 60 ? '#F59E0B' : COR
            const emailList = a.emails ? a.emails.split(',').map(e => e.trim()).filter(Boolean) : []

            return (
              <div key={a.id}
                className={cn(
                  'p-4 transition-colors',
                  violado ? 'bg-red-500/5' : '',
                  !a.ativo && 'opacity-50',
                )}>
                <div className="flex items-start gap-3">
                  {/* Indicador de status */}
                  <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      violado ? 'bg-red-500 animate-pulse' : a.ativo ? 'bg-green-500' : 'bg-zinc-600',
                    )} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{a.obra_nome ?? a.obra_id}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{a.tipo_nome ?? a.tipo_id}</p>
                    </div>

                    {/* Barra de progresso saldo vs mínimo */}
                    {a.saldo_atual != null && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-zinc-500">
                            Saldo:{' '}
                            <span className="font-bold" style={{ color: barCor }}>
                              {saldo.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-zinc-700 ml-1">/ mínimo {a.minimo}</span>
                          </span>
                          <span className="text-xs font-bold" style={{ color: barCor }}>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: barCor }} />
                        </div>
                      </div>
                    )}

                    {/* E-mails configurados */}
                    {emailList.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {emailList.map(e => (
                          <span key={e}
                            className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700/50 rounded-full text-[11px] text-zinc-500">
                            <Mail className="w-2.5 h-2.5" />{e}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-700 italic">
                        Sem e-mail configurado — este alerta não enviará notificações
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => toggle(a.id)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                      title={a.ativo ? 'Desativar alerta' : 'Ativar alerta'}>
                      {a.ativo
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft  className="w-5 h-5 text-zinc-600" />
                      }
                    </button>
                    <button onClick={() => excluir(a.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — Novo Alerta */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">Novo Alerta</h2>
              <button onClick={() => setModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Obra</label>
                <select
                  value={form.obra_id}
                  onChange={e => setForm(f => ({ ...f, obra_id: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-colors">
                  <option value="">Selecione a obra…</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Tipo de resíduo</label>
                <select
                  value={form.tipo_id}
                  onChange={e => setForm(f => ({ ...f, tipo_id: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-colors">
                  <option value="">Selecione o tipo…</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Quantidade mínima</label>
                <input
                  type="number" min="0" step="1" placeholder="ex: 5"
                  value={form.minimo}
                  onChange={e => setForm(f => ({ ...f, minimo: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-colors" />
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">
                  E-mails para notificação
                  <span className="text-zinc-700 ml-1.5">(pressione Enter ou + Add para cada e-mail)</span>
                </label>
                <EmailTags
                  emails={form.emails}
                  onChange={emails => setForm(f => ({ ...f, emails }))}
                />
                {form.emails.length === 0 && (
                  <p className="text-[11px] text-zinc-700 mt-1">
                    Sem e-mail: o alerta ficará visível no sistema mas não enviará notificações.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={salvar}
              disabled={salvando || !form.obra_id || !form.tipo_id || !form.minimo}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Criar Alerta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
