'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Calendar, User, Camera,
  Clock, MessageSquare, Edit, Send, Loader2,
  CheckCircle2, ChevronRight, Trash2, Image as ImageIcon, X,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { desviosDB, comprimirImagem } from '@/lib/db'
import { formatDateTime, formatDate, generateDesvioId, getSlaLabel, getSlaColor, cn } from '@/lib/utils'
import { STATUS_CONFIG, GRAVIDADE_CONFIG } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StatusDesvio, FotoDesvio } from '@/types'

const STATUS_TRANSITIONS: { from: StatusDesvio[]; to: StatusDesvio; label: string; cls: string }[] = [
  { from: ['aberto'], to: 'em_tratativa', label: 'Iniciar Tratativa', cls: 'bg-amber-500 text-zinc-950' },
  { from: ['aberto', 'em_tratativa', 'pendente'], to: 'concluido', label: 'Marcar Concluído', cls: 'bg-green-600 text-white' },
  { from: ['aberto', 'em_tratativa'], to: 'pendente', label: 'Marcar Pendente', cls: 'bg-orange-600 text-white' },
  { from: ['concluido'], to: 'fechado', label: 'Fechar Desvio', cls: 'bg-zinc-600 text-white' },
  { from: ['concluido', 'fechado'], to: 'reincidente', label: 'Marcar Reincidente', cls: 'bg-red-600 text-white' },
]

type Tab = 'info' | 'tratativas' | 'fotos' | 'historico'

export default function DesvioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { desviosComputados, obras, tsts, encarregados, refresh } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const desvio = desviosComputados.find(d => d.id === id)
  const [tab, setTab] = useState<Tab>('info')
  const [comentario, setComentario] = useState('')
  const [acaoRealizada, setAcaoRealizada] = useState('')
  const [nomeTratativa, setNomeTratativa] = useState('')
  const [fotosTratativa, setFotosTratativa] = useState<FotoDesvio[]>([])
  const [sending, setSending] = useState(false)
  const [loadingFoto, setLoadingFoto] = useState(false)
  const [editandoStatus, setEditandoStatus] = useState<StatusDesvio | null>(null)

  if (!desvio) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Desvio não encontrado.</p>
        <button onClick={() => router.push('/desvios')} className="mt-2 text-amber-400 text-sm">← Voltar</button>
      </div>
    )
  }

  const sc = STATUS_CONFIG[desvio.status]
  const gc = GRAVIDADE_CONFIG[desvio.gravidade]
  const slaColor = getSlaColor(desvio.dias_para_vencer, desvio.vencido)
  const transitions = STATUS_TRANSITIONS.filter(t => t.from.includes(desvio.status))

  async function handleStatusChange(to: StatusDesvio) {
    setEditandoStatus(null)
    desviosDB.updateStatus(id, to, 'Sistema')
    refresh()
  }

  async function handleAddTratativa() {
    if (!comentario.trim() || !nomeTratativa.trim()) return
    setSending(true)
    desviosDB.addTratativa(id, {
      comentario,
      autor: nomeTratativa,
      acao_realizada: acaoRealizada || undefined,
      fotos: fotosTratativa,
    })
    refresh()
    setComentario('')
    setAcaoRealizada('')
    setFotosTratativa([])
    setSending(false)
  }

  async function handleFotoTratativa(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    setLoadingFoto(true)
    const files = Array.from(e.target.files).slice(0, 2)
    for (const file of files) {
      const data_url = await comprimirImagem(file, 500, 0.5)
      if (data_url) {
        setFotosTratativa(prev => [...prev, { id: Date.now().toString(36), tipo: 'depois', data_url, nome: file.name }])
      }
    }
    setLoadingFoto(false)
    e.target.value = ''
  }

  function handleDelete() {
    if (!confirm('Excluir este desvio permanentemente?')) return
    desviosDB.delete(id)
    refresh()
    router.push('/desvios')
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'info', label: 'Informações' },
    { id: 'tratativas', label: `Tratativas (${desvio.tratativas.length})` },
    { id: 'fotos', label: `Fotos (${desvio.fotos.length})` },
    { id: 'historico', label: 'Histórico' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-bold text-amber-500">{generateDesvioId(desvio.numero)}</span>
            <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5', sc.bg, sc.color, sc.border)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />{sc.label}
            </span>
            <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full border', gc.bg, gc.color, gc.border)}>
              {gc.label}
            </span>
            {desvio.vencido && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">VENCIDO</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{desvio.obra_nome_computado} · {formatDate(desvio.data_ocorrencia)}</p>
        </div>
        <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Action buttons */}
      {transitions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {transitions.map(t => (
            <button key={t.to} onClick={() => handleStatusChange(t.to)}
              className={cn('flex-shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold transition-all active:scale-95', t.cls)}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Description card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-1 min-h-[40px] rounded-full flex-shrink-0 mt-1" style={{ background: GRAVIDADE_CONFIG[desvio.gravidade].color as string }} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: GRAVIDADE_CONFIG[desvio.gravidade].color as string }}>
              {desvio.categoria === 'Outros' && desvio.categoria_outro ? desvio.categoria_outro : desvio.categoria}
            </p>
            <p className="text-base text-zinc-100 leading-relaxed">{desvio.descricao}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
          {[
            { icon: MapPin, label: 'Local', value: desvio.local_exato },
            { icon: Calendar, label: 'Data', value: formatDate(desvio.data_ocorrencia) },
            { icon: User, label: 'Aberto por', value: desvio.aberto_por },
            { icon: User, label: 'Encarregado', value: desvio.encarregado_nome_computado },
            { icon: User, label: 'TST', value: desvio.tst_nome_computado || '—' },
            { icon: Clock, label: 'SLA', value: desvio.prazo_correcao ? getSlaLabel(desvio.dias_para_vencer, desvio.vencido) : '—', valueClass: slaColor },
          ].map(row => (
            <div key={row.label} className="flex items-start gap-2">
              <row.icon className="w-3.5 h-3.5 text-zinc-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{row.label}</p>
                <p className={cn('text-sm text-zinc-300 truncate font-medium', row.valueClass)}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 py-2 px-1 rounded-xl text-[11px] font-semibold transition-all',
              tab === t.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── INFO ── */}
      {tab === 'info' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Ação Corretiva</p>
            {desvio.acao_corretiva
              ? <p className="text-sm text-zinc-300">{desvio.acao_corretiva}</p>
              : <p className="text-sm text-zinc-600 italic">Nenhuma ação corretiva registrada</p>}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Ação Preventiva</p>
            {desvio.acao_preventiva
              ? <p className="text-sm text-zinc-300">{desvio.acao_preventiva}</p>
              : <p className="text-sm text-zinc-600 italic">Nenhuma ação preventiva registrada</p>}
          </div>
        </div>
      )}

      {/* ── TRATATIVAS ── */}
      {tab === 'tratativas' && (
        <div className="space-y-3">
          {desvio.tratativas.length === 0 && (
            <div className="text-center py-8 text-zinc-600">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma tratativa registrada ainda</p>
            </div>
          )}
          {desvio.tratativas.map(t => (
            <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-zinc-200">{t.autor}</span>
                <span className="text-xs text-zinc-500">{formatDateTime(t.criado_em)}</span>
              </div>
              <p className="text-sm text-zinc-300">{t.comentario}</p>
              {t.acao_realizada && (
                <div className="mt-2 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/15">
                  <p className="text-xs text-green-400 font-medium">Ação: {t.acao_realizada}</p>
                </div>
              )}
              {t.fotos && t.fotos.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {t.fotos.map(f => (
                    <div key={f.id} className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800">
                      <img src={f.data_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Add tratativa form */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <p className="text-sm font-semibold text-zinc-200">Registrar Tratativa</p>
            <div className="space-y-1.5">
              <Label>Seu Nome <span className="text-red-400">*</span></Label>
              <Input value={nomeTratativa} onChange={e => setNomeTratativa(e.target.value)} placeholder="Ex: Carlos Mendes" />
            </div>
            <div className="space-y-1.5">
              <Label>Comentário / Observação <span className="text-red-400">*</span></Label>
              <Textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
                placeholder="Descreva a tratativa realizada..." />
            </div>
            <div className="space-y-1.5">
              <Label>Ação Realizada (opcional)</Label>
              <Input value={acaoRealizada} onChange={e => setAcaoRealizada(e.target.value)}
                placeholder="Ex: EPI fornecido, treinamento realizado" />
            </div>

            {/* Fotos da tratativa */}
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleFotoTratativa} />
            {fotosTratativa.length > 0 && (
              <div className="flex gap-2">
                {fotosTratativa.map(f => (
                  <div key={f.id} className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-800">
                    <img src={f.data_url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setFotosTratativa(prev => prev.filter(x => x.id !== f.id))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                <Camera className="w-4 h-4" />Foto da Correção
              </button>
              <div className="ml-auto">
                <Button onClick={handleAddTratativa}
                  disabled={!comentario.trim() || !nomeTratativa.trim() || sending} size="sm">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOTOS ── */}
      {tab === 'fotos' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          {desvio.fotos.length === 0 ? (
            <div className="text-center py-10 text-zinc-600">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma foto registrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {desvio.fotos.map(foto => (
                <div key={foto.id} className="aspect-video rounded-xl overflow-hidden bg-zinc-800">
                  <img src={foto.data_url} alt={foto.nome} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab === 'historico' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="space-y-0">
            {desvio.historico_status.map((h, i) => {
              const sc = STATUS_CONFIG[h.status_novo]
              return (
                <div key={h.id} className="flex gap-3 pb-5 relative">
                  {i < desvio.historico_status.length - 1 && (
                    <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-zinc-800" />
                  )}
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center flex-shrink-0 z-10">
                    <div className={cn('w-2 h-2 rounded-full', sc.dot)} />
                  </div>
                  <div>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border', sc.bg, sc.color, sc.border)}>
                      {sc.label}
                    </span>
                    <p className="text-xs text-zinc-500 mt-1">
                      {h.por} · {formatDateTime(h.criado_em)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
