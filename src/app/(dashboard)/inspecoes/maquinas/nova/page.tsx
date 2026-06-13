'use client'

import { useState, useMemo, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { equipamentosDB, inspecoesMEDB } from '@/lib/db-maquinas'
import { desviosDB, uploadFotoToStorage } from '@/lib/db'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Wrench, ClipboardList, PenLine, CheckCircle2,
  ChevronRight, ChevronLeft, Check, X, Minus, Camera, Upload,
  AlertTriangle, Loader2, Shield, ThumbsUp,
} from 'lucide-react'
import { CHECKLIST_POR_TIPO } from '@/lib/checklist-maquinas'
import { TIPO_EQUIPAMENTO_LABEL } from '@/types/maquinas'
import type { TipoEquipamento, ChecklistRespostaME, StatusItemChecklist, Equipamento } from '@/types/maquinas'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
// no external signature dep

const INSP_GREEN = '#10B981'
const TIPOS: TipoEquipamento[] = ['pemt', 'empilhadeira', 'caminhao', 'guindauto', 'manipuladora', 'retroescavadeira']

const TIPO_COR: Record<TipoEquipamento, string> = {
  pemt: '#3B82F6', empilhadeira: '#F59E0B', caminhao: '#64748B',
  guindauto: '#8B5CF6', manipuladora: '#10B981', retroescavadeira: '#F97316',
}

// ── Wizard steps ──────────────────────────────────────────────────────────────
type Step = 'obra' | 'tipo' | 'equipamento' | 'checklist' | 'assinatura' | 'resultado'

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'obra',        label: 'Obra',          icon: Building2 },
  { key: 'tipo',        label: 'Tipo',          icon: Wrench },
  { key: 'equipamento', label: 'Equipamento',   icon: Wrench },
  { key: 'checklist',   label: 'Checklist',     icon: ClipboardList },
  { key: 'assinatura',  label: 'Assinatura',    icon: PenLine },
  { key: 'resultado',   label: 'Resultado',     icon: CheckCircle2 },
]

// ── Status button component ───────────────────────────────────────────────────
function StatusBtn({ status, current, onClick }: { status: StatusItemChecklist; current: StatusItemChecklist; onClick: () => void }) {
  const configs = {
    conforme:       { icon: Check,  label: 'C',  active: 'bg-emerald-500 border-emerald-500 text-white', base: 'border-zinc-700 text-zinc-500' },
    nao_conforme:   { icon: X,     label: 'NC', active: 'bg-red-500 border-red-500 text-white',     base: 'border-zinc-700 text-zinc-500' },
    nao_aplicavel:  { icon: Minus, label: 'NA', active: 'bg-zinc-600 border-zinc-500 text-white',   base: 'border-zinc-700 text-zinc-500' },
  } as const
  const cfg = configs[status as keyof typeof configs]
  const isActive = current === status
  const Icon = cfg.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95',
        isActive ? cfg.active : 'bg-transparent ' + cfg.base + ' hover:bg-zinc-800',
      )}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </button>
  )
}

// ── Main wizard component ─────────────────────────────────────────────────────
function NovaInspecaoMEContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { obras, tsts, desvios, refresh } = useApp()

  const [step, setStep] = useState<Step>('obra')

  // Step 1: Obra
  const [obraId, setObraId] = useState(params.get('obra') ?? '')

  // Step 2: Tipo
  const [tipo, setTipo] = useState<TipoEquipamento | ''>(params.get('tipo') as TipoEquipamento ?? '')

  // Step 3: Equipamento
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [loadingEq, setLoadingEq] = useState(false)
  const [equipamentoId, setEquipamentoId] = useState(params.get('eq') ?? '')
  const [tstId, setTstId] = useState('')

  // Step 4: Checklist
  const [respostas, setRespostas] = useState<Record<string, ChecklistRespostaME>>({})
  const [fotosPorItem, setFotosPorItem] = useState<Record<string, File[]>>({})
  const [uploadingItem, setUploadingItem] = useState<string | null>(null)

  // Step 5: Signature + liberação
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const sigDrawing = useRef(false)
  const [sigEmpty, setSigEmpty] = useState(true)
  const [liberado, setLiberado] = useState(true)

  // Step 6: Resultado
  const [saving, setSaving] = useState(false)
  const [savedInsp, setSavedInsp] = useState<{ id: string; numero: number; resultado: string } | null>(null)

  const obra = obras.find(o => o.id === obraId)
  const tstsDaObra = tsts.filter(t => t.obra_id === obraId && t.ativo)
  const equipamento = equipamentos.find(e => e.id === equipamentoId)

  const items = tipo ? CHECKLIST_POR_TIPO[tipo as TipoEquipamento] : []

  // Fetch equipamentos quando tipo ou obra mudam
  useEffect(() => {
    if (!obraId || !tipo) { setEquipamentos([]); return }
    setLoadingEq(true)
    equipamentosDB.byObraAndTipo(obraId, tipo as TipoEquipamento)
      .then(setEquipamentos)
      .catch(console.error)
      .finally(() => setLoadingEq(false))
  }, [obraId, tipo])

  // Init respostas
  useEffect(() => {
    if (!items.length) return
    setRespostas(prev => {
      const next = { ...prev }
      for (const item of items) {
        if (!next[item.id]) next[item.id] = { item_id: item.id, status: null }
      }
      return next
    })
  }, [items])

  const totais = useMemo(() => {
    const vals = Object.values(respostas)
    return {
      conformes: vals.filter(r => r.status === 'conforme').length,
      naoConformes: vals.filter(r => r.status === 'nao_conforme').length,
      naoAplicaveis: vals.filter(r => r.status === 'nao_aplicavel').length,
      sem: vals.filter(r => r.status === null).length,
      total: items.length,
    }
  }, [respostas, items])

  const resultado = useMemo(() => {
    if (totais.sem > 0) return null
    if (totais.naoConformes > 0) return 'reprovado'
    return 'aprovado'
  }, [totais])

  function setItemStatus(itemId: string, status: StatusItemChecklist) {
    setRespostas(prev => ({ ...prev, [itemId]: { ...prev[itemId], item_id: itemId, status } }))
  }

  function setItemObs(itemId: string, obs: string) {
    setRespostas(prev => ({ ...prev, [itemId]: { ...prev[itemId], item_id: itemId, obs } }))
  }

  async function handleFotoItem(itemId: string, file: File) {
    setFotosPorItem(prev => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), file] }))
  }

  const canProceed: Record<Step, boolean> = {
    obra:        !!obraId,
    tipo:        !!tipo,
    equipamento: !!equipamentoId,
    checklist:   totais.sem === 0,
    assinatura:  true,
    resultado:   true,
  }

  const STEP_ORDER: Step[] = ['obra', 'tipo', 'equipamento', 'checklist', 'assinatura', 'resultado']
  const stepIdx = STEP_ORDER.indexOf(step)

  function nextStep() {
    if (!canProceed[step]) return
    const next = STEP_ORDER[stepIdx + 1]
    if (next) setStep(next)
  }

  function prevStep() {
    const prev = STEP_ORDER[stepIdx - 1]
    if (prev) setStep(prev)
  }

  async function handleSalvar() {
    setSaving(true)
    try {
      const tst = tsts.find(t => t.id === tstId)

      // Upload fotos dos itens NC
      const respostasFinal: ChecklistRespostaME[] = []
      for (const item of items) {
        const r = respostas[item.id] ?? { item_id: item.id, status: null }
        let fotoUrl: string | undefined
        const fotos = fotosPorItem[item.id] ?? []
        if (fotos.length > 0) {
          try {
            setUploadingItem(item.id)
            fotoUrl = await uploadFotoToStorage(fotos[0])
          } catch { /* ignore upload errors */ }
        }
        respostasFinal.push({ ...r, foto_url: fotoUrl })
      }
      setUploadingItem(null)

      // Upload assinatura
      let assinaturaUrl: string | undefined
      if (sigCanvasRef.current && !sigEmpty) {
        const blob = await new Promise<Blob | null>(res => sigCanvasRef.current!.toBlob(res, 'image/png'))
        if (blob) {
          const file = new File([blob], 'assinatura.png', { type: 'image/png' })
          assinaturaUrl = await uploadFotoToStorage(file).catch(() => undefined)
        }
      }

      const res = resultado ?? 'reprovado'

      // Cria desvio se reprovado
      let desvioId: string | undefined
      if (res === 'reprovado' && equipamento && obra) {
        const ncItems = items.filter(i => respostas[i.id]?.status === 'nao_conforme').map(i => i.descricao)
        const desvio = await desviosDB.create({
          obra_id: obraId,
          obra_nome: obra.nome,
          categoria: 'Veículos/Equipamentos',
          local_exato: `${TIPO_EQUIPAMENTO_LABEL[equipamento.tipo]} - ${equipamento.nome}`,
          gravidade: 'alto',
          status: 'aberto',
          descricao: `Inspeção M&E: não conformidade(s) encontrada(s).\n\nItens NC:\n${ncItems.map(i => `• ${i}`).join('\n')}`,
          aberto_por: tst?.nome ?? 'Sistema',
          encarregado_id: '',
          tst_id: tstId || undefined,
          tst_nome: tst?.nome,
          data_ocorrencia: new Date().toISOString().split('T')[0],
          reincidente: false,
          fotos: [],
          tratativas: [],
        })
        desvioId = desvio.id
      }

      // Salva inspeção
      const insp = await inspecoesMEDB.create({
        obra_id: obraId,
        obra_nome: obra?.nome,
        equipamento_id: equipamentoId,
        equipamento_nome: equipamento?.nome,
        equipamento_tipo: equipamento?.tipo,
        equipamento_serie: equipamento?.numero_serie,
        tst_id: tstId || undefined,
        tst_nome: tst?.nome,
        data_inspecao: new Date().toISOString().split('T')[0],
        respostas: respostasFinal,
        total_conformes: totais.conformes,
        total_nao_conformes: totais.naoConformes,
        total_nao_aplicaveis: totais.naoAplicaveis,
        resultado: res,
        equipamento_liberado: liberado,
        assinatura_url: assinaturaUrl,
        desvio_id: desvioId,
      })

      setSavedInsp({ id: insp.id, numero: insp.numero, resultado: res })
      await refresh()
      setStep('resultado')
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar inspeção. Tente novamente.')
    } finally {
      setSaving(false)
      setUploadingItem(null)
    }
  }

  const inputCls = 'w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800/80 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30'
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5'

  // ── Step progress indicator ────────────────────────────────────────────────
  const stepsToShow = STEPS.filter(s => s.key !== 'resultado')
  const progressIdx = Math.min(stepIdx, stepsToShow.length - 1)

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: INSP_GREEN + '20' }}>
          <ClipboardList className="w-4 h-4" style={{ color: INSP_GREEN }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Nova Inspeção M&E</h1>
          <p className="text-xs text-zinc-500">Máquinas e Equipamentos</p>
        </div>
      </div>

      {/* Progress */}
      {step !== 'resultado' && (
        <div className="flex items-center gap-1">
          {stepsToShow.map((s, i) => {
            const done = i < progressIdx
            const active = i === progressIdx
            const Icon = s.icon
            return (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                  done ? 'bg-emerald-500' : active ? 'border-2 border-emerald-500 bg-emerald-500/10' : 'bg-zinc-800 border border-zinc-700',
                )}>
                  {done ? <Check className="w-3.5 h-3.5 text-white" /> : <Icon className={cn('w-3 h-3', active ? 'text-emerald-400' : 'text-zinc-600')} />}
                </div>
                {i < stepsToShow.length - 1 && (
                  <div className={cn('h-px flex-1', done ? 'bg-emerald-500' : 'bg-zinc-800')} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Step content */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >

            {/* ── Step: Obra ── */}
            {step === 'obra' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-zinc-100">Selecione a Obra</h2>
                <div className="grid gap-2">
                  {obras.filter(o => o.ativa).map(o => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setObraId(o.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        obraId === o.id
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700',
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        obraId === o.id ? 'bg-emerald-500' : 'bg-zinc-800')}>
                        {obraId === o.id ? <Check className="w-4 h-4 text-white" /> : <Building2 className="w-4 h-4 text-zinc-500" />}
                      </div>
                      <div>
                        <p className={cn('text-sm font-semibold', obraId === o.id ? 'text-emerald-300' : 'text-zinc-200')}>{o.nome}</p>
                        {o.cidade && <p className="text-xs text-zinc-500">{o.cidade}{o.estado ? `, ${o.estado}` : ''}</p>}
                      </div>
                    </button>
                  ))}
                </div>
                {tstsDaObra.length > 0 && obraId && (
                  <div className="pt-2">
                    <label className={labelCls}>Inspetor (TST) — opcional</label>
                    <select className={inputCls} value={tstId} onChange={e => setTstId(e.target.value)}>
                      <option value="">Selecione o inspetor</option>
                      {tstsDaObra.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* ── Step: Tipo ── */}
            {step === 'tipo' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-zinc-100">Tipo de Equipamento</h2>
                <div className="grid grid-cols-2 gap-3">
                  {TIPOS.map(t => {
                    const cor = TIPO_COR[t]
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95',
                          tipo === t ? 'border-opacity-60' : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700',
                        )}
                        style={tipo === t ? { borderColor: cor + '80', background: cor + '15' } : {}}
                      >
                        <Wrench className="w-6 h-6" style={{ color: tipo === t ? cor : '#52525B' }} />
                        <span className={cn('text-sm font-semibold text-center leading-tight', tipo === t ? 'text-white' : 'text-zinc-400')}>
                          {TIPO_EQUIPAMENTO_LABEL[t]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Step: Equipamento ── */}
            {step === 'equipamento' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-zinc-100">Selecione o Equipamento</h2>
                {loadingEq ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  </div>
                ) : equipamentos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-zinc-500 mb-3">Nenhum {tipo ? TIPO_EQUIPAMENTO_LABEL[tipo as TipoEquipamento] : 'equipamento'} cadastrado para esta obra.</p>
                    <a href="/inspecoes/maquinas/equipamentos" className="text-xs text-emerald-400 hover:underline">
                      Cadastrar equipamento →
                    </a>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {equipamentos.map(eq => (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => setEquipamentoId(eq.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                          equipamentoId === eq.id
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700',
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          equipamentoId === eq.id ? 'bg-emerald-500' : 'bg-zinc-800')}>
                          {equipamentoId === eq.id ? <Check className="w-4 h-4 text-white" /> : <Wrench className="w-4 h-4 text-zinc-500" />}
                        </div>
                        <div>
                          <p className={cn('text-sm font-semibold', equipamentoId === eq.id ? 'text-emerald-300' : 'text-zinc-200')}>{eq.nome}</p>
                          <p className="text-xs text-zinc-500">
                            {eq.numero_serie ? `Série: ${eq.numero_serie}` : '—'}
                            {eq.fabricante ? ` · ${eq.fabricante}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Step: Checklist ── */}
            {step === 'checklist' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-zinc-100">Checklist de Inspeção</h2>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-400">{totais.conformes}C</span>
                    <span className="text-red-400">{totais.naoConformes}NC</span>
                    <span className="text-zinc-500">{totais.naoAplicaveis}NA</span>
                    {totais.sem > 0 && <span className="text-amber-400">{totais.sem} restantes</span>}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${totais.total > 0 ? Math.round(((totais.conformes + totais.naoConformes + totais.naoAplicaveis) / totais.total) * 100) : 0}%` }}
                  />
                </div>

                {/* Items grouped by category */}
                {Object.entries(
                  items.reduce((acc, item) => {
                    if (!acc[item.categoria]) acc[item.categoria] = []
                    acc[item.categoria].push(item)
                    return acc
                  }, {} as Record<string, typeof items>)
                ).map(([cat, catItems]) => (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 pb-2">{cat}</h3>
                    {catItems.map((item, ii) => {
                      const resp = respostas[item.id] ?? { item_id: item.id, status: null }
                      const isNC = resp.status === 'nao_conforme'
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'rounded-xl border p-3 transition-all',
                            resp.status === null ? 'border-zinc-800 bg-zinc-800/20' :
                            resp.status === 'conforme' ? 'border-emerald-500/20 bg-emerald-500/5' :
                            resp.status === 'nao_conforme' ? 'border-red-500/20 bg-red-500/5' :
                            'border-zinc-700/50 bg-zinc-800/10',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <span className="text-[10px] text-zinc-600 font-mono mt-0.5 flex-shrink-0">{String(ii + 1).padStart(2, '0')}</span>
                              <p className="text-xs text-zinc-300 leading-relaxed">{item.descricao}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <StatusBtn status="conforme"      current={resp.status} onClick={() => setItemStatus(item.id, 'conforme')} />
                              <StatusBtn status="nao_conforme"  current={resp.status} onClick={() => setItemStatus(item.id, 'nao_conforme')} />
                              <StatusBtn status="nao_aplicavel" current={resp.status} onClick={() => setItemStatus(item.id, 'nao_aplicavel')} />
                            </div>
                          </div>
                          {/* NC extras */}
                          {isNC && (
                            <div className="mt-3 space-y-2 border-t border-red-500/10 pt-3">
                              <textarea
                                rows={2}
                                placeholder="Observação sobre a não conformidade..."
                                className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30 placeholder:text-zinc-600"
                                value={resp.obs ?? ''}
                                onChange={e => setItemObs(item.id, e.target.value)}
                              />
                              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-300">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => e.target.files?.[0] && handleFotoItem(item.id, e.target.files[0])}
                                />
                                <Camera className="w-3.5 h-3.5 text-zinc-500" />
                                {(fotosPorItem[item.id] ?? []).length > 0 ? (
                                  <span className="text-emerald-400">{(fotosPorItem[item.id] ?? []).length} foto(s) adicionada(s)</span>
                                ) : (
                                  'Adicionar foto da NC'
                                )}
                              </label>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* ── Step: Assinatura ── */}
            {step === 'assinatura' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-zinc-100">Assinatura e Liberação</h2>
                <div className="rounded-2xl border border-zinc-700 overflow-hidden bg-white relative">
                  <canvas
                    ref={sigCanvasRef}
                    width={560}
                    height={160}
                    className="w-full h-40 cursor-crosshair touch-none"
                    style={{ background: 'white' }}
                    onPointerDown={e => {
                      sigDrawing.current = true
                      const ctx = sigCanvasRef.current?.getContext('2d')
                      if (!ctx) return
                      const r = sigCanvasRef.current!.getBoundingClientRect()
                      const scaleX = sigCanvasRef.current!.width / r.width
                      const scaleY = sigCanvasRef.current!.height / r.height
                      ctx.beginPath()
                      ctx.moveTo((e.clientX - r.left) * scaleX, (e.clientY - r.top) * scaleY)
                      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                    }}
                    onPointerMove={e => {
                      if (!sigDrawing.current) return
                      const ctx = sigCanvasRef.current?.getContext('2d')
                      if (!ctx) return
                      const r = sigCanvasRef.current!.getBoundingClientRect()
                      const scaleX = sigCanvasRef.current!.width / r.width
                      const scaleY = sigCanvasRef.current!.height / r.height
                      ctx.strokeStyle = '#1a1a1a'
                      ctx.lineWidth = 2
                      ctx.lineCap = 'round'
                      ctx.lineJoin = 'round'
                      ctx.lineTo((e.clientX - r.left) * scaleX, (e.clientY - r.top) * scaleY)
                      ctx.stroke()
                      setSigEmpty(false)
                    }}
                    onPointerUp={() => { sigDrawing.current = false }}
                  />
                  {sigEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-xs text-zinc-400">Assine aqui</p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const ctx = sigCanvasRef.current?.getContext('2d')
                    if (!ctx) return
                    ctx.clearRect(0, 0, sigCanvasRef.current!.width, sigCanvasRef.current!.height)
                    setSigEmpty(true)
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Limpar assinatura
                </button>

                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-200">Equipamento liberado para operação?</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setLiberado(true)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex-1 justify-center',
                        liberado ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'border-zinc-700 text-zinc-500 hover:bg-zinc-800',
                      )}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Sim, Liberado
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiberado(false)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex-1 justify-center',
                        !liberado ? 'bg-red-500/15 border-red-500/40 text-red-300' : 'border-zinc-700 text-zinc-500 hover:bg-zinc-800',
                      )}
                    >
                      <X className="w-4 h-4" />
                      Não Liberado
                    </button>
                  </div>
                </div>

                {/* Summary antes de salvar */}
                <div className="rounded-xl bg-zinc-800/50 border border-zinc-700 p-4 space-y-2">
                  <p className="text-xs font-semibold text-zinc-400 mb-2">Resumo da Inspeção</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-500/10 rounded-xl p-2">
                      <p className="text-xl font-black text-emerald-400">{totais.conformes}</p>
                      <p className="text-[10px] text-zinc-500">Conformes</p>
                    </div>
                    <div className="bg-red-500/10 rounded-xl p-2">
                      <p className="text-xl font-black text-red-400">{totais.naoConformes}</p>
                      <p className="text-[10px] text-zinc-500">Não conformes</p>
                    </div>
                    <div className="bg-zinc-700/30 rounded-xl p-2">
                      <p className="text-xl font-black text-zinc-400">{totais.naoAplicaveis}</p>
                      <p className="text-[10px] text-zinc-500">N/A</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {resultado === 'aprovado' ? (
                      <span className="text-sm font-bold text-emerald-400">Resultado: APROVADO</span>
                    ) : resultado === 'reprovado' ? (
                      <span className="text-sm font-bold text-red-400">Resultado: REPROVADO</span>
                    ) : (
                      <span className="text-sm text-zinc-500">Resultado: aguardando...</span>
                    )}
                  </div>
                  {resultado === 'reprovado' && (
                    <p className="text-[10px] text-amber-400 text-center">Um desvio será criado automaticamente.</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Step: Resultado ── */}
            {step === 'resultado' && savedInsp && (
              <div className="text-center space-y-5 py-4">
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto',
                  savedInsp.resultado === 'aprovado' ? 'bg-emerald-500/15' : 'bg-red-500/15',
                )}>
                  {savedInsp.resultado === 'aprovado'
                    ? <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    : <AlertTriangle className="w-8 h-8 text-red-400" />
                  }
                </div>
                <div>
                  <p className="text-xl font-black text-zinc-100 mb-1">
                    {savedInsp.resultado === 'aprovado' ? 'Equipamento Aprovado!' : 'Equipamento Reprovado'}
                  </p>
                  <p className="text-sm text-zinc-400">Inspeção ME-{String(savedInsp.numero).padStart(4, '0')} registrada com sucesso.</p>
                  {savedInsp.resultado === 'reprovado' && (
                    <p className="text-xs text-amber-400 mt-1">Desvio criado automaticamente para tratativa.</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                  <button
                    onClick={() => router.push('/inspecoes/maquinas')}
                    className="px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
                  >
                    Voltar ao início
                  </button>
                  <button
                    onClick={() => router.push('/inspecoes/maquinas/inventario')}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: INSP_GREEN }}
                  >
                    Ver inventário
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        {step !== 'resultado' && (
          <div className={cn(
            'flex items-center border-t border-zinc-800 px-6 py-4',
            stepIdx === 0 ? 'justify-end' : 'justify-between',
          )}>
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            )}

            {step === 'assinatura' ? (
              <button
                type="button"
                onClick={handleSalvar}
                disabled={saving}
                className={cn(
                  'flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95',
                  saving ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90',
                )}
                style={{ background: INSP_GREEN }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Finalizar Inspeção'}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceed[step]}
                className={cn(
                  'flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95',
                  !canProceed[step] ? 'opacity-40 cursor-not-allowed bg-zinc-700' : 'hover:opacity-90',
                )}
                style={canProceed[step] ? { background: INSP_GREEN } : {}}
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function NovaInspecaoMEPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <NovaInspecaoMEContent />
    </Suspense>
  )
}
