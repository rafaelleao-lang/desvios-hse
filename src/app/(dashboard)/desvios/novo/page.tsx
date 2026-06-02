'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, Loader2, Camera, X,
  MapPin, AlertTriangle, Users, Image as ImageIcon,
  ChevronRight, Info,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { desviosDB, uploadFotoToStorage } from '@/lib/db'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn, formatDate, compressImage } from '@/lib/utils'
import { CATEGORIAS_PADRAO, serializeCategoria } from '@/types'
import type { FotoDesvio, GravidadeDesvio } from '@/types'

const GRAVIDADES: { value: GravidadeDesvio; label: string; color: string; desc: string }[] = [
  { value: 'baixo',   label: 'Baixo',   color: '#10B981', desc: 'Risco menor, sem urgência imediata' },
  { value: 'medio',   label: 'Médio',   color: '#EAB308', desc: 'Requer atenção e correção planejada' },
  { value: 'alto',    label: 'Alto',    color: '#F97316', desc: 'Risco significativo, correção urgente' },
  { value: 'critico', label: 'Crítico', color: '#EF4444', desc: 'Risco imediato à vida — paralisar!' },
]

const STEP_LABELS = ['Obra & Pessoas', 'Desvio', 'Fotos']

export default function NovoDesvioPage() {
  const router = useRouter()
  const { obras, tsts, encarregados, coordenadores, desviosComputados, refresh } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [obraId, setObraId] = useState('')
  const [tstId, setTstId] = useState('')
  const [encarregadoId, setEncarregadoId] = useState('')
  const [coordenadorId, setCoordenadorId] = useState('')
  const [colaboradorNome, setColaboradorNome] = useState('')
  const [setor, setSetor] = useState('')
  const [localExato, setLocalExato] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  const [categoriaOutro, setCategoriaOutro] = useState('')
  const [gravidade, setGravidade] = useState<GravidadeDesvio>('medio')
  const [descricao, setDescricao] = useState('')
  const [prazoCorrecao, setPrazoCorrecao] = useState('')
  const [fotos, setFotos] = useState<FotoDesvio[]>([])
  const [loadingFoto, setLoadingFoto] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  const desviosDoColaborador = useMemo(() => {
    const nome = colaboradorNome.trim().toLowerCase()
    if (nome.length < 3) return []
    return desviosComputados.filter(d =>
      d.colaborador_nome?.trim().toLowerCase() === nome
    )
  }, [colaboradorNome, desviosComputados])

  // Derived data from selected obra (filtered from context, no extra DB calls)
  const obraAtiva = obras.find(o => o.id === obraId)
  const tstsDaObra = obraId ? tsts.filter(t => t.obra_id === obraId && t.ativo) : []
  const encsDaObra = obraId ? encarregados.filter(e => e.obra_id === obraId && e.ativo) : []
  const coordsDaObra = obraId ? coordenadores.filter(c => c.obra_id === obraId && c.ativo) : []

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!obraId) e.obraId = 'Selecione a obra'
      if (!coordenadorId) e.coordenadorId = 'Selecione o coordenador responsável'
      if (!tstId) e.tstId = 'Selecione o TST responsável (quem está abrindo)'
      if (!colaboradorNome.trim()) e.colaboradorNome = 'Informe o nome do colaborador'
      if (!encarregadoId) e.encarregadoId = 'Selecione o encarregado responsável'
    }
    if (s === 1) {
      if (!localExato.trim()) e.localExato = 'Informe o local exato'
      if (categorias.length === 0) e.categoria = 'Selecione ao menos uma categoria'
      if (categorias.includes('Outros') && !categoriaOutro.trim()) e.categoriaOutro = 'Informe qual é o desvio'
      if (!descricao.trim() || descricao.trim().length < 10) e.descricao = 'Descreva o desvio (mínimo 10 caracteres)'
      if (!prazoCorrecao) e.prazoCorrecao = 'Informe o prazo para correção'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function nextStep() {
    if (validateStep(step)) setStep(s => s + 1)
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    setLoadingFoto(true)
    try {
      const files = Array.from(e.target.files).slice(0, 4 - fotos.length)
      for (const file of files) {
        const compressed = await compressImage(file, 1024, 0.75)
        const data_url = await uploadFotoToStorage(compressed)
        setFotos(prev => [...prev, {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          tipo: 'antes',
          data_url,
          nome: file.name,
        }])
      }
      setErrors(prev => ({ ...prev, fotos: undefined }))
    } catch {
      setErrors(prev => ({ ...prev, fotos: 'Erro ao fazer upload da foto. Tente novamente.' }))
    } finally {
      setLoadingFoto(false)
      e.target.value = ''
    }
  }

  function removerFoto(id: string) {
    setFotos(prev => prev.filter(f => f.id !== id))
  }

  async function handleSave() {
    if (fotos.length === 0) {
      setErrors({ fotos: 'Adicione ao menos 1 foto do desvio — obrigatório' })
      return
    }
    setSaving(true)
    try {
      const agora = new Date()
      const obraObj = obras.find(o => o.id === obraId)
      const encObj = encsDaObra.find(e => e.id === encarregadoId)
      const tstObj = tstsDaObra.find(t => t.id === tstId)
      const coordObj = coordsDaObra.find(c => c.id === coordenadorId)

      await desviosDB.create({
        obra_id: obraId,
        obra_nome: obraObj?.nome,
        categoria: serializeCategoria(categorias),
        categoria_outro: categorias.includes('Outros') ? categoriaOutro : undefined,
        setor,
        local_exato: localExato,
        gravidade,
        status: 'aberto',
        descricao,
        aberto_por: tstObj?.nome || '',
        colaborador_nome: colaboradorNome,
        encarregado_id: encarregadoId,
        encarregado_nome: encObj?.nome,
        tst_id: tstId || undefined,
        tst_nome: tstObj?.nome,
        coordenador_id: coordenadorId || undefined,
        coordenador_nome: coordObj?.nome,
        data_ocorrencia: agora.toISOString().split('T')[0],
        hora_ocorrencia: agora.toTimeString().slice(0, 5),
        prazo_correcao: prazoCorrecao || undefined,
        reincidente: false,
        fotos,
        tratativas: [],
      })
      await refresh()
      router.push('/desvios')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
          className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Novo Desvio</h1>
          <p className="text-xs text-zinc-500">Etapa {step + 1} de {STEP_LABELS.length} — {STEP_LABELS[step]}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-6">
        {STEP_LABELS.map((_, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-300',
            i <= step ? 'bg-amber-500' : 'bg-zinc-800')} />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── STEP 0: Obra & Pessoas ── */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="space-y-4">

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <MapPin className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-semibold text-zinc-200">Obra e Responsáveis</p>
              </div>

              {/* Obra */}
              <div className="space-y-1.5">
                <Label>Obra <span className="text-red-400">*</span></Label>
                <select value={obraId} onChange={e => { setObraId(e.target.value); setTstId(''); setEncarregadoId(''); setCoordenadorId('') }}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50">
                  <option value="">Selecione a obra...</option>
                  {obras.filter(o => o.ativa).map(o => (
                    <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>
                  ))}
                </select>
                {errors.obraId && <p className="text-xs text-red-400">{errors.obraId}</p>}
                {obras.filter(o => o.ativa).length === 0 && (
                  <p className="text-xs text-amber-400">
                    Nenhuma obra ativa. <a href="/obras/nova" className="underline">Cadastre uma obra</a> primeiro.
                  </p>
                )}
              </div>

              {/* Coordenador (obrigatório) */}
              <div className="space-y-1.5">
                <Label>Coordenador Responsável <span className="text-red-400">*</span></Label>
                <select value={coordenadorId} onChange={e => setCoordenadorId(e.target.value)}
                  disabled={!obraId}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 disabled:opacity-50">
                  <option value="">Selecionar coordenador...</option>
                  {coordsDaObra.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                {errors.coordenadorId && <p className="text-xs text-red-400">{errors.coordenadorId}</p>}
                {obraId && coordsDaObra.length === 0 && (
                  <p className="text-xs text-zinc-500">Nenhum coordenador ativo nesta obra. <a href={`/obras/${obraId}`} className="text-amber-400 underline">Adicionar coordenador</a></p>
                )}
              </div>

              {/* TST (obrigatório — quem está abrindo) */}
              <div className="space-y-1.5">
                <Label>TST Responsável (quem está abrindo o desvio) <span className="text-red-400">*</span></Label>
                <select value={tstId} onChange={e => setTstId(e.target.value)}
                  disabled={!obraId}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 disabled:opacity-50">
                  <option value="">Selecione seu nome...</option>
                  {tstsDaObra.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
                {errors.tstId && <p className="text-xs text-red-400">{errors.tstId}</p>}
                {obraId && tstsDaObra.length === 0 && (
                  <p className="text-xs text-zinc-500">Nenhum TST ativo nesta obra. <a href={`/obras/${obraId}`} className="text-amber-400 underline">Adicionar TST</a></p>
                )}
              </div>

              {/* Colaborador */}
              <div className="space-y-1.5">
                <Label>Nome do Colaborador <span className="text-red-400">*</span></Label>
                <Input value={colaboradorNome} onChange={e => setColaboradorNome(e.target.value)}
                  placeholder="Ex: José da Silva" />
                {errors.colaboradorNome && <p className="text-xs text-red-400">{errors.colaboradorNome}</p>}
                <AnimatePresence>
                  {desviosDoColaborador.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-amber-400">
                          Reincidência — {desviosDoColaborador.length} desvio{desviosDoColaborador.length > 1 ? 's' : ''} anterior{desviosDoColaborador.length > 1 ? 'es' : ''}
                        </p>
                        <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                          {colaboradorNome.trim()} já possui desvio{desviosDoColaborador.length > 1 ? 's' : ''} registrado{desviosDoColaborador.length > 1 ? 's' : ''}.
                          {' '}Mais recente: {formatDate(desviosDoColaborador[0].data_ocorrencia)} · {desviosDoColaborador[0].categorias.join(', ')}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Encarregado */}
              <div className="space-y-1.5">
                <Label>Encarregado Responsável pela Área <span className="text-red-400">*</span></Label>
                <select value={encarregadoId} onChange={e => setEncarregadoId(e.target.value)}
                  disabled={!obraId}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 disabled:opacity-50">
                  <option value="">Selecionar encarregado...</option>
                  {encsDaObra.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}{e.setor ? ` — ${e.setor}` : ''}</option>
                  ))}
                </select>
                {errors.encarregadoId && <p className="text-xs text-red-400">{errors.encarregadoId}</p>}
                {obraId && encsDaObra.length === 0 && (
                  <p className="text-xs text-zinc-500">Nenhum encarregado ativo nesta obra. <a href={`/obras/${obraId}`} className="text-amber-400 underline">Adicionar encarregado</a></p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: Desvio ── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="space-y-4">

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <MapPin className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-semibold text-zinc-200">Local do Desvio</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Setor</Label>
                  <Input value={setor} onChange={e => setSetor(e.target.value)} placeholder="Ex: Estrutura" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Local Exato <span className="text-red-400">*</span></Label>
                  <Input value={localExato} onChange={e => setLocalExato(e.target.value)}
                    placeholder="Ex: Bloco B, 3º andar, escada" />
                  {errors.localExato && <p className="text-xs text-red-400">{errors.localExato}</p>}
                </div>
              </div>
            </div>

            {/* Categoria */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-semibold text-zinc-200">Categoria do Desvio <span className="text-red-400">*</span></p>
                </div>
                {categorias.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold">
                    {categorias.length} selecionada{categorias.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">Selecione uma ou mais categorias</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIAS_PADRAO.map(cat => {
                  const selected = categorias.includes(cat)
                  return (
                    <button key={cat} type="button"
                      onClick={() => {
                        setCategorias(prev =>
                          prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                        )
                        if (cat === 'Outros') setCategoriaOutro('')
                      }}
                      className={cn('relative text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all',
                        selected
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200')}>
                      {cat}
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center">
                          <CheckCircle2 className="w-2.5 h-2.5 text-zinc-900" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {errors.categoria && <p className="text-xs text-red-400">{errors.categoria}</p>}

              {/* Outros text input */}
              <AnimatePresence>
                {categorias.includes('Outros') && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 pt-1">
                    <Label>Qual é o desvio? <span className="text-red-400">*</span></Label>
                    <Input value={categoriaOutro} onChange={e => setCategoriaOutro(e.target.value)}
                      placeholder="Descreva a categoria do desvio" autoFocus />
                    {errors.categoriaOutro && <p className="text-xs text-red-400">{errors.categoriaOutro}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Gravidade */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p className="text-sm font-semibold text-zinc-200">Gravidade</p>
              <div className="grid grid-cols-2 gap-2">
                {GRAVIDADES.map(g => (
                  <button key={g.value} type="button" onClick={() => setGravidade(g.value)}
                    className={cn('flex flex-col p-3 rounded-xl border-2 text-left transition-all',
                      gravidade === g.value ? 'border-current' : 'border-zinc-800 hover:border-zinc-700')}
                    style={gravidade === g.value ? { borderColor: `${g.color}60`, background: `${g.color}10` } : {}}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                      <span className="text-sm font-semibold" style={{ color: gravidade === g.value ? g.color : undefined }}>{g.label}</span>
                      {gravidade === g.value && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" style={{ color: g.color }} />}
                    </div>
                    <p className="text-[11px] text-zinc-500">{g.desc}</p>
                  </button>
                ))}
              </div>
              {gravidade === 'critico' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <Info className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">Desvio crítico! Considere paralisar a atividade até a correção.</p>
                </motion.div>
              )}
            </div>

            {/* Descrição */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p className="text-sm font-semibold text-zinc-200">Descrição Detalhada <span className="text-red-400">*</span></p>
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={4}
                placeholder="Descreva o desvio: o que foi observado, quem estava envolvido, qual a atividade, riscos identificados..." />
              {errors.descricao && <p className="text-xs text-red-400">{errors.descricao}</p>}
            </div>

            {/* Prazo */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p className="text-sm font-semibold text-zinc-200">Prazo</p>
              <div className="space-y-1.5">
                <Label>Prazo para Correção <span className="text-red-400">*</span></Label>
                <Input type="date" value={prazoCorrecao} onChange={e => setPrazoCorrecao(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={errors.prazoCorrecao ? 'border-red-500/70' : ''} />
                {errors.prazoCorrecao && <p className="text-xs text-red-400">{errors.prazoCorrecao}</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Fotos ── */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="space-y-4">
            <div className={cn(
              'rounded-2xl border bg-zinc-900 p-5 space-y-4 transition-colors',
              errors.fotos ? 'border-red-500/50' : 'border-zinc-800'
            )}>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Camera className={cn('w-4 h-4', errors.fotos ? 'text-red-400' : 'text-amber-400')} />
                  <p className="text-sm font-semibold text-zinc-200">Fotos do Desvio</p>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-bold',
                    errors.fotos ? 'bg-red-500/20 text-red-400' : 'bg-red-500/10 text-red-400'
                  )}>OBRIGATÓRIO</span>
                </div>
                <span className="text-xs text-zinc-600">{fotos.length}/4</span>
              </div>

              <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only"
                capture="environment" onChange={handleFoto} />

              {/* Preview grid */}
              {fotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {fotos.map(foto => (
                    <div key={foto.id} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800">
                      <img src={foto.data_url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removerFoto(foto.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-600 transition-colors">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload buttons */}
              {fotos.length < 4 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileRef.current) {
                        fileRef.current.setAttribute('capture', 'environment')
                        fileRef.current.click()
                      }
                    }}
                    disabled={loadingFoto}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed transition-colors active:scale-95',
                      errors.fotos
                        ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10'
                        : 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
                    )}>
                    <Camera className={cn('w-6 h-6', errors.fotos ? 'text-red-400' : 'text-amber-400')} />
                    <span className={cn('text-xs font-medium', errors.fotos ? 'text-red-400' : 'text-amber-400')}>Tirar Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileRef.current) {
                        fileRef.current.removeAttribute('capture')
                        fileRef.current.click()
                      }
                    }}
                    disabled={loadingFoto}
                    className="flex-1 flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors active:scale-95">
                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-400">Galeria</span>
                  </button>
                </div>
              )}

              {loadingFoto && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="text-xs text-zinc-400">Processando foto...</span>
                </div>
              )}

              {errors.fotos && (
                <p className="text-xs text-red-400 font-medium text-center">{errors.fotos}</p>
              )}

              <p className="text-xs text-zinc-600 text-center">Fotos são comprimidas automaticamente. Máx. 4 fotos.</p>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Resumo do Desvio</p>
              {[
                { label: 'Obra', value: obras.find(o => o.id === obraId)?.nome },
                { label: 'Coordenador', value: coordsDaObra.find(c => c.id === coordenadorId)?.nome },
                { label: 'TST (quem abre)', value: tstsDaObra.find(t => t.id === tstId)?.nome },
                { label: 'Colaborador', value: colaboradorNome },
                { label: 'Encarregado', value: encsDaObra.find(e => e.id === encarregadoId)?.nome },
                { label: 'Categoria', value: categorias.map(c => c === 'Outros' && categoriaOutro ? `Outros: ${categoriaOutro}` : c).join(', ') || undefined },
                { label: 'Local', value: localExato },
                { label: 'Gravidade', value: GRAVIDADES.find(g => g.value === gravidade)?.label },
              ].map(r => r.value && (
                <div key={r.label} className="flex justify-between gap-2 text-xs">
                  <span className="text-zinc-600">{r.label}</span>
                  <span className="text-zinc-300 text-right font-medium truncate max-w-[60%]">{r.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none"
          onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}>
          {step === 0 ? 'Cancelar' : 'Anterior'}
        </Button>

        {step < 2 ? (
          <Button type="button" className="flex-1 sm:flex-none flex items-center gap-2" onClick={nextStep}>
            Próximo <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none flex items-center gap-2">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
              : <><CheckCircle2 className="w-4 h-4" />Registrar Desvio</>}
          </Button>
        )}
      </div>
    </div>
  )
}
