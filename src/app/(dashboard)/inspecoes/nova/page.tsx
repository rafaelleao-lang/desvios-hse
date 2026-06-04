'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { inspecoesDB, desviosDB } from '@/lib/db'
import { CATEGORIAS_PADRAO, serializeCategoria } from '@/types'
import type { FotoDesvio, TST, Encarregado, Coordenador } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Camera, Image, CheckSquare2, X, ChevronRight,
  ShieldAlert, ThumbsUp, MapPin, ArrowLeft, Loader2, AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const INSP_GREEN = '#10B981'
const MSE_RED = '#E8291C'

async function compressImage(file: File, maxW = 1024, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

interface EvidenciaForm {
  id: string
  local: string
  fotos: FotoDesvio[]
  tipo: 'desvio' | 'reconhecimento' | null
  descricao: string
  desvio_id: string | null
  desvio_numero: number | null
}

interface DesvioFormState {
  local_exato: string
  categorias: string[]
  categoria_outro: string
  gravidade: 'baixo' | 'medio' | 'alto' | 'critico'
  descricao: string
  prazo_correcao: string
  fotos: FotoDesvio[]
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const GRAVIDADES = [
  { value: 'baixo', label: 'Baixo', color: '#10B981', desc: 'Risco mínimo' },
  { value: 'medio', label: 'Médio', color: '#EAB308', desc: 'Atenção necessária' },
  { value: 'alto', label: 'Alto', color: '#F97316', desc: 'Ação urgente' },
  { value: 'critico', label: 'Crítico', color: '#EF4444', desc: 'Parar imediatamente' },
] as const

// ── Desvio creation modal ──────────────────────────────────────────────────────

interface DesvioModalProps {
  obra_id: string
  obra_nome: string
  tst: TST | null
  encarregado: Encarregado | null
  coordenador: Coordenador | null
  localPreFill: string
  onSuccess: (desvio_id: string, numero: number, descricao: string) => void
  onClose: () => void
}

function DesvioModal({ obra_id, obra_nome, tst, encarregado, coordenador, localPreFill, onSuccess, onClose }: DesvioModalProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<DesvioFormState>({
    local_exato: localPreFill,
    categorias: [],
    categoria_outro: '',
    gravidade: 'medio',
    descricao: '',
    prazo_correcao: '',
    fotos: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fotoRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function toggleCategoria(cat: string) {
    setForm(f => ({
      ...f,
      categorias: f.categorias.includes(cat)
        ? f.categorias.filter(c => c !== cat)
        : [...f.categorias, cat],
    }))
  }

  const canStep0 = form.local_exato.trim().length >= 3 &&
    form.categorias.length > 0 &&
    (!form.categorias.includes('Outros') || form.categoria_outro.trim().length > 0) &&
    form.descricao.trim().length >= 10 &&
    form.prazo_correcao

  const canStep1 = form.fotos.length >= 1

  async function addFoto(files: FileList | null) {
    if (!files) return
    const newFotos: FotoDesvio[] = []
    for (const file of Array.from(files).slice(0, 4 - form.fotos.length)) {
      const data_url = await compressImage(file)
      newFotos.push({ id: uid(), tipo: 'antes', data_url, nome: file.name })
    }
    setForm(f => ({ ...f, fotos: [...f.fotos, ...newFotos] }))
  }

  async function handleSubmit() {
    if (!canStep1) return
    setSaving(true)
    setError('')
    try {
      const desvio = await desviosDB.create({
        obra_id,
        obra_nome,
        categoria: serializeCategoria(form.categorias),
        categoria_outro: form.categoria_outro || undefined,
        setor: undefined,
        local_exato: form.local_exato,
        gravidade: form.gravidade,
        status: 'aberto',
        descricao: form.descricao,
        aberto_por: tst?.nome || 'TST',
        colaborador_nome: undefined,
        encarregado_id: encarregado?.id || '',
        encarregado_nome: encarregado?.nome,
        tst_id: tst?.id,
        tst_nome: tst?.nome,
        coordenador_id: coordenador?.id,
        coordenador_nome: coordenador?.nome,
        data_ocorrencia: new Date().toISOString().split('T')[0],
        hora_ocorrencia: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        prazo_correcao: form.prazo_correcao,
        reincidente: false,
        fotos: form.fotos,
        tratativas: [],
      })
      onSuccess(desvio.id, desvio.numero, desvio.descricao)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar desvio')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30'

  return (
    <>
      <motion.div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      >
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-5 py-4 flex items-center gap-3 z-10">
            <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-100">Registrar Desvio</p>
              <p className="text-xs text-zinc-500">Passo {step + 1} de 2</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pre-filled info */}
          <div className="mx-5 mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Dados da Inspeção (pré-preenchidos)</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              <p className="text-zinc-400">Obra: <span className="text-zinc-200">{obra_nome}</span></p>
              <p className="text-zinc-400">TST: <span className="text-zinc-200">{tst?.nome || '—'}</span></p>
              <p className="text-zinc-400">Encarregado: <span className="text-zinc-200">{encarregado?.nome || '—'}</span></p>
              <p className="text-zinc-400">Coordenador: <span className="text-zinc-200">{coordenador?.nome || '—'}</span></p>
            </div>
          </div>

          {/* Step 0: Desvio Details */}
          {step === 0 && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Local Exato *</label>
                <input className={inputCls} placeholder="Ex: Bloco A, 3º andar" value={form.local_exato} onChange={e => setForm(f => ({ ...f, local_exato: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Categoria(s) *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIAS_PADRAO.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategoria(cat)}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-left',
                        form.categorias.includes(cat)
                          ? 'border-red-500/40 bg-red-500/10 text-red-300'
                          : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300',
                      )}
                    >
                      <span className={cn('w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center', form.categorias.includes(cat) ? 'bg-red-500 border-red-500' : 'border-zinc-600')}>
                        {form.categorias.includes(cat) && <CheckSquare2 className="w-3 h-3 text-white" />}
                      </span>
                      {cat}
                    </button>
                  ))}
                </div>
                {form.categorias.includes('Outros') && (
                  <input className={cn(inputCls, 'mt-2')} placeholder="Especificar categoria" value={form.categoria_outro} onChange={e => setForm(f => ({ ...f, categoria_outro: e.target.value }))} />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Gravidade *</label>
                <div className="grid grid-cols-4 gap-2">
                  {GRAVIDADES.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, gravidade: g.value }))}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all',
                        form.gravidade === g.value ? 'border-opacity-60' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600',
                      )}
                      style={form.gravidade === g.value ? { borderColor: g.color + '80', background: g.color + '15', color: g.color } : {}}
                    >
                      <span className="font-bold">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Descrição *</label>
                <textarea
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                  rows={3}
                  placeholder="Descreva o desvio observado (mín. 10 caracteres)"
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                />
                {form.descricao.length > 0 && form.descricao.length < 10 && (
                  <p className="text-xs text-red-400 mt-1">{10 - form.descricao.length} caracteres restantes</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Prazo para Correção *</label>
                <input type="date" className={inputCls} value={form.prazo_correcao} onChange={e => setForm(f => ({ ...f, prazo_correcao: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
              </div>

              <button
                onClick={() => setStep(1)}
                disabled={!canStep0}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Próximo — Fotos
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Photos */}
          {step === 1 && (
            <div className="p-5 space-y-4">
              <button onClick={() => setStep(0)} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>

              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Fotos do Desvio * (mín. 1)</label>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => addFoto(e.target.files)} />
                <input ref={fotoRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFoto(e.target.files)} />
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {form.fotos.map((foto, i) => (
                    <div key={foto.id} className="relative aspect-square bg-zinc-800 rounded-xl overflow-hidden group">
                      <img src={foto.data_url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setForm(f => ({ ...f, fotos: f.fotos.filter((_, j) => j !== i) }))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {form.fotos.length < 4 && (
                    <>
                      <button
                        onClick={() => cameraRef.current?.click()}
                        className="aspect-square bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-red-500/40 transition-all"
                      >
                        <Camera className="w-5 h-5 text-zinc-500" />
                        <span className="text-[10px] text-zinc-600">Câmera</span>
                      </button>
                      <button
                        onClick={() => fotoRef.current?.click()}
                        className="aspect-square bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-red-500/40 transition-all"
                      >
                        <Image className="w-5 h-5 text-zinc-500" />
                        <span className="text-[10px] text-zinc-600">Galeria</span>
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-zinc-600">{form.fotos.length}/4 foto(s)</p>
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-xl p-3">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={!canStep1 || saving}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Registrando…</> : <><CheckCircle2 className="w-4 h-4" />Registrar Desvio</>}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ── Main Form ──────────────────────────────────────────────────────────────────

export default function NovaInspecaoPage() {
  const router = useRouter()
  const { obras, tsts, encarregados, coordenadores, refresh } = useApp()

  const hoje = new Date()
  const dataHoje = hoje.toISOString().split('T')[0]
  const horaAgora = hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const [obraId, setObraId] = useState('')
  const [tstId, setTstId] = useState('')
  const [encarregadoId, setEncarregadoId] = useState('')
  const [coordenadorId, setCoordenadorId] = useState('')
  const [dataInspecao] = useState(dataHoje)
  const [horaInspecao] = useState(horaAgora)

  const [evidencias, setEvidencias] = useState<EvidenciaForm[]>([])
  const [desvioModal, setDesvioModal] = useState<{ evidenciaId: string; localPreFill: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<0 | 1>(0)

  const fotoRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const cameraRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const obra = obras.find(o => o.id === obraId)
  const tst = tsts.find(t => t.id === tstId)
  const encarregado = encarregados.find(e => e.id === encarregadoId)
  const coordenador = coordenadores.find(c => c.id === coordenadorId)

  const tstOptions = tsts.filter(t => t.obra_id === obraId && t.ativo)
  const encOptions = encarregados.filter(e => e.obra_id === obraId && e.ativo)
  const coordOptions = coordenadores.filter(c => c.obra_id === obraId && c.ativo)

  const canStep0 = obraId && tstId && encarregadoId && coordenadorId

  function addEvidencia() {
    const id = uid()
    setEvidencias(ev => [...ev, { id, local: '', fotos: [], tipo: null, descricao: '', desvio_id: null, desvio_numero: null }])
  }

  function removeEvidencia(id: string) {
    setEvidencias(ev => ev.filter(e => e.id !== id))
  }

  function updateEvidencia(id: string, patch: Partial<EvidenciaForm>) {
    setEvidencias(ev => ev.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  async function addFotoToEvidencia(evId: string, files: FileList | null) {
    if (!files) return
    const ev = evidencias.find(e => e.id === evId)
    if (!ev) return
    const newFotos: FotoDesvio[] = []
    for (const file of Array.from(files).slice(0, 4 - ev.fotos.length)) {
      const data_url = await compressImage(file)
      newFotos.push({ id: uid(), tipo: 'antes', data_url, nome: file.name })
    }
    updateEvidencia(evId, { fotos: [...ev.fotos, ...newFotos] })
  }

  const canLancar = evidencias.length > 0 &&
    evidencias.every(e => {
      if (!e.tipo || !e.local.trim()) return false
      if (e.tipo === 'desvio') return e.desvio_id !== null  // descrição vem do desvio
      return e.descricao.trim().length > 0
    })

  async function handleLancar() {
    if (!canLancar || !obraId) return
    setSaving(true)
    setError('')
    try {
      const insp = await inspecoesDB.create({
        obra_id: obraId,
        obra_nome: obra?.nome,
        encarregado_id: encarregadoId,
        encarregado_nome: encarregado?.nome,
        tst_id: tstId,
        tst_nome: tst?.nome,
        coordenador_id: coordenadorId,
        coordenador_nome: coordenador?.nome,
        data_inspecao: dataInspecao,
        hora_inspecao: horaInspecao,
      })

      for (let i = 0; i < evidencias.length; i++) {
        const ev = evidencias[i]
        await inspecoesDB.addEvidencia(insp.id, {
          tipo: ev.tipo!,
          local: ev.local,
          descricao: ev.descricao,
          fotos_abertura: ev.fotos,
          fotos_fechamento: [],
          desvio_id: ev.desvio_id || undefined,
          prazo_correcao: undefined,
          data_fechamento: undefined,
          tratativa_texto: undefined,
          quem_fechou: undefined,
          ordem: i,
        })
      }

      await refresh()
      router.push('/inspecoes/em-aberto')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao lançar inspeção')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30'

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6 pb-10">
        {/* Header MSE */}
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4" style={{ background: MSE_RED }}>
              <span className="text-2xl font-black text-white leading-none">mse</span>
              <div className="w-px h-6 bg-white/30" />
              <div>
                <p className="text-sm font-bold text-white">Nova Inspeção HSE</p>
                <p className="text-[11px] text-white/70">MSE Engenharia</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm font-semibold text-white">{dataInspecao.split('-').reverse().join('/')}</p>
                <p className="text-xs text-white/70">{horaInspecao}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 0: Header info */}
        {step === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-zinc-200">Informações da Inspeção</h2>

            <div>
              <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Obra *</label>
              <select className={inputCls} value={obraId} onChange={e => { setObraId(e.target.value); setTstId(''); setEncarregadoId(''); setCoordenadorId('') }}>
                <option value="">Selecione a obra</option>
                {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">TST (Inspetor) *</label>
                <select className={inputCls} value={tstId} onChange={e => setTstId(e.target.value)} disabled={!obraId}>
                  <option value="">Selecione o TST</option>
                  {tstOptions.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Encarregado *</label>
                <select className={inputCls} value={encarregadoId} onChange={e => setEncarregadoId(e.target.value)} disabled={!obraId}>
                  <option value="">Selecione o encarregado</option>
                  {encOptions.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Coordenador *</label>
                <select className={inputCls} value={coordenadorId} onChange={e => setCoordenadorId(e.target.value)} disabled={!obraId}>
                  <option value="">Selecione o coordenador</option>
                  {coordOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={() => { addEvidencia(); setStep(1) }}
              disabled={!canStep0}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: MSE_RED }}
            >
              Adicionar Evidências
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Evidence list */}
        {step === 1 && (
          <>
            {/* Summary bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 flex-wrap text-xs text-zinc-400">
              <span className="font-medium text-zinc-200">{obra?.nome}</span>
              <span className="text-zinc-600">|</span>
              <span>TST: {tst?.nome}</span>
              <span className="text-zinc-600">|</span>
              <span>Enc: {encarregado?.nome}</span>
              <button onClick={() => setStep(0)} className="ml-auto text-emerald-400 hover:underline text-xs">Editar</button>
            </div>

            {/* Evidences */}
            <div className="space-y-4">
              {evidencias.map((ev, idx) => (
                <div
                  key={ev.id}
                  className={cn(
                    'bg-zinc-900 border rounded-2xl p-5 space-y-4',
                    ev.tipo === 'desvio' ? 'border-red-500/20' : ev.tipo === 'reconhecimento' ? 'border-emerald-500/20' : 'border-zinc-800',
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-300">Evidência #{idx + 1}</span>
                    <button onClick={() => removeEvidencia(ev.id)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Local */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 mb-1.5 block flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Local *
                    </label>
                    <input
                      className="w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Ex: Corredor bloco A, frente ao elevador"
                      value={ev.local}
                      onChange={e => updateEvidencia(ev.id, { local: e.target.value })}
                    />
                  </div>

                  {/* Photos */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 mb-1.5 block flex items-center gap-1.5">
                      <Camera className="w-3 h-3" /> Foto(s)
                    </label>
                    {/* Câmera — abre direto a câmera no mobile */}
                    <input
                      ref={el => { cameraRefs.current[ev.id] = el }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => addFotoToEvidencia(ev.id, e.target.files)}
                    />
                    {/* Galeria — abre galeria de fotos */}
                    <input
                      ref={el => { fotoRefs.current[ev.id] = el }}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => addFotoToEvidencia(ev.id, e.target.files)}
                    />
                    <div className="flex gap-2 flex-wrap">
                      {ev.fotos.map((foto, fi) => (
                        <div key={foto.id} className="relative w-16 h-16 bg-zinc-800 rounded-xl overflow-hidden group">
                          <img src={foto.data_url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => updateEvidencia(ev.id, { fotos: ev.fotos.filter((_, j) => j !== fi) })}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                      {ev.fotos.length < 4 && (
                        <>
                          <button
                            onClick={() => cameraRefs.current[ev.id]?.click()}
                            className="w-16 h-16 bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                          >
                            <Camera className="w-5 h-5 text-zinc-500" />
                            <span className="text-[9px] text-zinc-500">Câmera</span>
                          </button>
                          <button
                            onClick={() => fotoRefs.current[ev.id]?.click()}
                            className="w-16 h-16 bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                          >
                            <Image className="w-5 h-5 text-zinc-500" />
                            <span className="text-[9px] text-zinc-500">Galeria</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Type selector */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Tipo *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => updateEvidencia(ev.id, { tipo: 'desvio' })}
                        className={cn(
                          'flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all',
                          ev.tipo === 'desvio'
                            ? 'border-red-500/60 bg-red-500/15 text-red-400'
                            : 'border-zinc-700 text-zinc-500 hover:border-red-500/30 hover:text-red-400',
                        )}
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Desvio
                      </button>
                      <button
                        onClick={() => updateEvidencia(ev.id, { tipo: 'reconhecimento', desvio_id: null, desvio_numero: null })}
                        className={cn(
                          'flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all',
                          ev.tipo === 'reconhecimento'
                            ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400'
                            : 'border-zinc-700 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400',
                        )}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Reconhecimento
                      </button>
                    </div>
                  </div>

                  {/* Description — oculto para desvio (auto-preenchido) */}
                  {ev.tipo !== 'desvio' && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Descrição *</label>
                      <textarea
                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                        rows={2}
                        placeholder="Descreva o que foi observado"
                        value={ev.descricao}
                        onChange={e => updateEvidencia(ev.id, { descricao: e.target.value })}
                      />
                    </div>
                  )}
                  {ev.tipo === 'desvio' && ev.descricao && (
                    <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Descrição (do desvio registrado)</p>
                      <p className="text-sm text-zinc-300">{ev.descricao}</p>
                    </div>
                  )}

                  {/* Desvio action */}
                  {ev.tipo === 'desvio' && (
                    <div>
                      {ev.desvio_id ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                          <CheckCircle2 className="w-4 h-4 text-red-400" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-red-400">
                              Desvio #{ev.desvio_numero !== null ? String(ev.desvio_numero).padStart(5, '0') : ''} vinculado
                            </p>
                            <p className="text-[10px] text-zinc-600">Aparecerá na lista de desvios</p>
                          </div>
                          <button
                            onClick={() => updateEvidencia(ev.id, { desvio_id: null, desvio_numero: null })}
                            className="text-zinc-600 hover:text-zinc-400 p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDesvioModal({ evidenciaId: ev.id, localPreFill: ev.local })}
                          disabled={!ev.local.trim() || !obraId}
                          className="w-full py-2.5 rounded-xl font-semibold text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          Registrar Desvio
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add evidence */}
            <button
              onClick={addEvidencia}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-zinc-700 text-zinc-500 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              + Evidência
            </button>

            {/* Validation hint */}
            {evidencias.some(e => e.tipo === 'desvio' && !e.desvio_id) && (
              <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-400">
                  Há evidência(s) marcadas como <strong>Desvio</strong> sem desvio registrado.
                  Clique em &ldquo;Registrar Desvio&rdquo; em cada uma antes de lançar.
                </p>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">{error}</div>
            )}

            {/* Launch button */}
            <button
              onClick={handleLancar}
              disabled={!canLancar || saving || evidencias.length === 0}
              className="w-full py-3.5 rounded-2xl font-bold text-base text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              style={{ background: canLancar && !saving ? MSE_RED : '#E8291C66' }}
            >
              {saving ? <><Loader2 className="w-5 h-5 animate-spin" />Lançando inspeção…</> : <><CheckCircle2 className="w-5 h-5" />Lançar Inspeção</>}
            </button>
          </>
        )}
      </div>

      {/* Desvio modal */}
      <AnimatePresence>
        {desvioModal && obraId && (
          <DesvioModal
            obra_id={obraId}
            obra_nome={obra?.nome || ''}
            tst={tst || null}
            encarregado={encarregado || null}
            coordenador={coordenador || null}
            localPreFill={desvioModal.localPreFill}
            onSuccess={(desvio_id, numero, descricao) => {
              updateEvidencia(desvioModal.evidenciaId, { desvio_id, desvio_numero: numero, descricao })
              setDesvioModal(null)
            }}
            onClose={() => setDesvioModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
