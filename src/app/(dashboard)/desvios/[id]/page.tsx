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
import { desviosDB, uploadFotoToStorage } from '@/lib/db'
import { formatDateTime, formatDate, generateDesvioId, getSlaLabel, getSlaColor, cn, compressImage } from '@/lib/utils'
import { STATUS_CONFIG, GRAVIDADE_CONFIG } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StatusDesvio, FotoDesvio } from '@/types'

const STATUS_TRANSITIONS: { from: StatusDesvio[]; to: StatusDesvio; label: string; cls: string }[] = [
  { from: ['aberto'], to: 'concluido', label: 'Marcar Concluído', cls: 'bg-green-600 text-white' },
  { from: ['concluido'], to: 'fechado', label: 'Fechar Desvio', cls: 'bg-zinc-600 text-white' },
  { from: ['concluido', 'fechado'], to: 'reincidente', label: 'Marcar Reincidente', cls: 'bg-red-600 text-white' },
]

type Tab = 'info' | 'tratativas' | 'fotos' | 'historico'

export default function DesvioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { desviosComputados, obras, tsts, encarregados, refresh } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const fileRefCamera = useRef<HTMLInputElement>(null)

  const desvio = desviosComputados.find(d => d.id === id)
  const [tab, setTab] = useState<Tab>('info')
  const [comentario, setComentario] = useState('')
  const [nomeTratativa, setNomeTratativa] = useState('')
  const [fotosTratativa, setFotosTratativa] = useState<FotoDesvio[]>([])
  const [sending, setSending] = useState(false)
  const [loadingFoto, setLoadingFoto] = useState(false)
  const [editandoStatus, setEditandoStatus] = useState<StatusDesvio | null>(null)
  const [tentouEnviarTratativa, setTentouEnviarTratativa] = useState(false)

  // Conclusão com foto obrigatória
  const [showConclusaoForm, setShowConclusaoForm] = useState(false)
  const [conclusaoFotos, setConclusaoFotos] = useState<FotoDesvio[]>([])
  const [conclusaoNome, setConclusaoNome] = useState('')
  const [conclusaoComentario, setConclusaoComentario] = useState('')
  const [loadingConclusaoFoto, setLoadingConclusaoFoto] = useState(false)
  const fileRefConclusao = useRef<HTMLInputElement>(null)

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
  const slaColor = getSlaColor(desvio.dias_para_vencer, desvio.vencido, desvio.isClosed)
  const transitions = STATUS_TRANSITIONS.filter(t => t.from.includes(desvio.status))

  async function handleStatusChange(to: StatusDesvio) {
    if (to === 'concluido') {
      setShowConclusaoForm(true)
      return
    }
    setEditandoStatus(null)
    await desviosDB.updateStatus(id, to, 'Sistema')
    await refresh()
  }

  async function handleConfirmarConclusao() {
    if (conclusaoFotos.length === 0) return
    setSending(true)
    try {
      await desviosDB.addTratativa(id, {
        comentario: conclusaoComentario.trim() || 'Desvio concluído com registro fotográfico.',
        autor: conclusaoNome.trim() || 'Sistema',
        acao_realizada: 'Conclusão registrada',
        fotos: conclusaoFotos,
      })
      await desviosDB.updateStatus(id, 'concluido', conclusaoNome.trim() || 'Sistema')
      await refresh()
      setShowConclusaoForm(false)
      setConclusaoFotos([])
      setConclusaoNome('')
      setConclusaoComentario('')
    } finally {
      setSending(false)
    }
  }

  async function handleFotoConclusao(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    setLoadingConclusaoFoto(true)
    try {
      for (const file of Array.from(e.target.files).slice(0, 3)) {
        const compressed = await compressImage(file, 1024, 0.75)
        const data_url = await uploadFotoToStorage(compressed)
        setConclusaoFotos(prev => [...prev, { id: Date.now().toString(36) + Math.random().toString(36).slice(2), tipo: 'depois', data_url, nome: file.name }])
      }
    } catch {
      // silently ignore upload errors — user can retry by removing and re-adding
    } finally {
      setLoadingConclusaoFoto(false)
      e.target.value = ''
    }
  }

  async function handleAddTratativa() {
    setTentouEnviarTratativa(true)
    if (!comentario.trim() || !nomeTratativa.trim() || fotosTratativa.length === 0) return
    setSending(true)
    try {
      await desviosDB.addTratativa(id, {
        comentario,
        autor: nomeTratativa,
        fotos: fotosTratativa,
      })
      await desviosDB.updateStatus(id, 'concluido', nomeTratativa)
      await refresh()
      setComentario('')
      setFotosTratativa([])
      setTentouEnviarTratativa(false)
    } finally {
      setSending(false)
    }
  }

  async function handleFotoTratativa(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    setLoadingFoto(true)
    try {
      for (const file of Array.from(e.target.files).slice(0, 2)) {
        const compressed = await compressImage(file, 1024, 0.75)
        const data_url = await uploadFotoToStorage(compressed)
        setFotosTratativa(prev => [...prev, { id: Date.now().toString(36), tipo: 'depois', data_url, nome: file.name }])
      }
    } catch {
      // silently ignore upload errors — user can retry
    } finally {
      setLoadingFoto(false)
      e.target.value = ''
    }
  }

  async function handleDelete() {
    if (!confirm('Excluir este desvio permanentemente?')) return
    await desviosDB.delete(id)
    await refresh()
    router.push('/desvios')
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'info', label: 'Informações' },
    { id: 'tratativas', label: `Tratativas (${desvio.tratativas.length})` },
    { id: 'fotos', label: `Fotos (${desvio.fotos.length + desvio.tratativas.reduce((a, t) => a + (t.fotos?.length || 0), 0)})` },
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
      {transitions.length > 0 && !showConclusaoForm && (
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

      {/* ── Formulário de Conclusão com foto obrigatória ── */}
      {showConclusaoForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-sm font-bold text-green-400">Confirmar Conclusão</p>
            </div>
            <button onClick={() => setShowConclusaoForm(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Foto — obrigatória */}
          <div className={cn('rounded-xl border-2 border-dashed p-4 transition-colors',
            conclusaoFotos.length > 0 ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5')}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-zinc-400" />
                <p className="text-xs font-semibold text-zinc-300">Foto do desvio corrigido</p>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">OBRIGATÓRIO</span>
              </div>
              <button
                onClick={() => fileRefConclusao.current?.click()}
                disabled={loadingConclusaoFoto}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#16a34a' }}
              >
                {loadingConclusaoFoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                Adicionar foto
              </button>
            </div>
            <input ref={fileRefConclusao} type="file" accept="image/*" multiple className="sr-only" onChange={handleFotoConclusao} />
            {conclusaoFotos.length === 0 ? (
              <p className="text-xs text-red-400">Adicione pelo menos 1 foto comprovando a correção do desvio</p>
            ) : (
              <div className="flex gap-2 flex-wrap mt-1">
                {conclusaoFotos.map(f => (
                  <div key={f.id} className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-800">
                    <img src={f.data_url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setConclusaoFotos(prev => prev.filter(x => x.id !== f.id))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Responsável pela conclusão</Label>
              <Input value={conclusaoNome} onChange={e => setConclusaoNome(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-1.5">
              <Label>Observação (opcional)</Label>
              <Input value={conclusaoComentario} onChange={e => setConclusaoComentario(e.target.value)}
                placeholder="Descreva brevemente o que foi feito" />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowConclusaoForm(false)}>Cancelar</Button>
            <button
              onClick={handleConfirmarConclusao}
              disabled={conclusaoFotos.length === 0 || sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#16a34a' }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar Conclusão
            </button>
          </div>
        </motion.div>
      )}

      {/* Description card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-1 min-h-[40px] rounded-full flex-shrink-0 mt-1" style={{ background: GRAVIDADE_CONFIG[desvio.gravidade].color as string }} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: GRAVIDADE_CONFIG[desvio.gravidade].color as string }}>
              {desvio.categorias.map(c => c === 'Outros' && desvio.categoria_outro ? desvio.categoria_outro : c).join(' · ')}
            </p>
            <p className="text-base text-zinc-100 leading-relaxed">{desvio.descricao}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
          {[
            { icon: MapPin, label: 'Local', value: desvio.local_exato },
            { icon: Calendar, label: 'Data', value: formatDate(desvio.data_ocorrencia) },
            { icon: User, label: 'Aberto por', value: desvio.aberto_por },
            { icon: User, label: 'Coordenador', value: desvio.coordenador_nome_computado || '—' },
            { icon: User, label: 'Encarregado', value: desvio.encarregado_nome_computado },
            { icon: User, label: 'TST', value: desvio.tst_nome_computado || '—' },
            { icon: Clock, label: 'SLA', value: desvio.prazo_correcao ? getSlaLabel(desvio.dias_para_vencer, desvio.vencido, desvio.isClosed) : '—', valueClass: slaColor },
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
          {/* Dados principais */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 pb-2">Dados do Desvio</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Obra',         value: desvio.obra_nome_computado },
                { label: 'Data',         value: formatDate(desvio.data_ocorrencia) },
                { label: 'Hora',         value: desvio.hora_ocorrencia || '—' },
                { label: 'Aberto por',   value: desvio.aberto_por },
                { label: 'Colaborador',  value: desvio.colaborador_nome || '—' },
                { label: 'Coordenador',  value: desvio.coordenador_nome_computado || '—' },
                { label: 'Encarregado',  value: desvio.encarregado_nome_computado },
                { label: 'TST',          value: desvio.tst_nome_computado || '—' },
                { label: 'Local Exato',  value: desvio.local_exato },
                { label: 'Setor',        value: desvio.setor || '—' },
                { label: 'Prazo',        value: desvio.prazo_correcao ? formatDate(desvio.prazo_correcao) : '—' },
              ].map(row => (
                <div key={row.label} className="min-w-0">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-0.5">{row.label}</p>
                  <p className="text-sm text-zinc-300 font-medium truncate">{row.value}</p>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Categoria</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {desvio.categorias.map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 font-medium border border-zinc-700">
                    {c === 'Outros' && desvio.categoria_outro ? `Outros: ${desvio.categoria_outro}` : c}
                  </span>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Descrição Completa</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{desvio.descricao}</p>
            </div>
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
            {/* Fotos da tratativa — OBRIGATÓRIO */}
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleFotoTratativa} />
            <input ref={fileRefCamera} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleFotoTratativa} />
            <div className={cn('rounded-xl border-2 border-dashed p-3 transition-colors',
              fotosTratativa.length > 0
                ? 'border-amber-500/40 bg-amber-500/5'
                : tentouEnviarTratativa
                  ? 'border-red-500/60 bg-red-500/5'
                  : 'border-zinc-700 bg-zinc-800/40')}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Camera className={cn('w-4 h-4', fotosTratativa.length > 0 ? 'text-amber-400' : tentouEnviarTratativa ? 'text-red-400' : 'text-zinc-500')} />
                  <p className="text-xs font-semibold text-zinc-300">Foto do desvio sendo tratado</p>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">OBRIGATÓRIO</span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => fileRefCamera.current?.click()} disabled={loadingFoto}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-50">
                    {loadingFoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    Câmera
                  </button>
                  <button onClick={() => fileRef.current?.click()} disabled={loadingFoto}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-50">
                    <ImageIcon className="w-3 h-3" />
                    Galeria
                  </button>
                </div>
              </div>
              {fotosTratativa.length === 0 ? (
                <p className={cn('text-xs', tentouEnviarTratativa ? 'text-red-400 font-medium' : 'text-zinc-600')}>
                  {tentouEnviarTratativa
                    ? 'Foto obrigatória — adicione pelo menos 1 foto comprovando a tratativa'
                    : 'Adicione pelo menos 1 foto comprovando a tratativa realizada'}
                </p>
              ) : (
                <div className="flex gap-2 flex-wrap">
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
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={handleAddTratativa}
                disabled={!comentario.trim() || !nomeTratativa.trim() || fotosTratativa.length === 0 || sending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#16a34a' }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Concluir Desvio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOTOS ── */}
      {tab === 'fotos' && (() => {
        const fotosAbertura = desvio.fotos
        const fotosTratativasAll = desvio.tratativas.flatMap(t => (t.fotos || []).map(f => ({ ...f, autor: t.autor, data: t.criado_em })))
        const totalFotos = fotosAbertura.length + fotosTratativasAll.length
        return (
          <div className="space-y-4">
            {totalFotos === 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-12 text-center text-zinc-600">
                <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhuma foto registrada</p>
              </div>
            )}

            {/* Fotos de Abertura */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fotos de Abertura ({fotosAbertura.length})</p>
              </div>
              {fotosAbertura.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 py-6 text-center">
                  <p className="text-sm text-zinc-600">Nenhuma foto na abertura</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fotosAbertura.map(foto => (
                    <div key={foto.id} className="rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700" style={{ aspectRatio: '4/3' }}>
                      <img src={foto.data_url} alt={foto.nome} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fotos de Tratativas/Conclusão */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fotos de Tratativa / Conclusão ({fotosTratativasAll.length})</p>
              </div>
              {fotosTratativasAll.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 py-6 text-center">
                  <p className="text-sm text-zinc-600">Nenhuma foto de tratativa ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fotosTratativasAll.map((foto, i) => (
                    <div key={`${foto.id}-${i}`} className="rounded-2xl overflow-hidden bg-zinc-800 border border-green-500/20">
                      <div style={{ aspectRatio: '4/3' }}>
                        <img src={foto.data_url} alt={foto.nome} className="w-full h-full object-cover" />
                      </div>
                      <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-800">
                        <p className="text-xs text-green-400 font-semibold">{foto.autor}</p>
                        <p className="text-[10px] text-zinc-500">{formatDateTime(foto.data)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

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
