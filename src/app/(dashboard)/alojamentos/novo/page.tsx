'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { alojamentosDB } from '@/lib/db-alojamentos'
import { uploadFotoToStorage } from '@/lib/db'
import { compressImage, cn } from '@/lib/utils'
import { ALOJAMENTO_ITENS_CONFIG, SUB_UNIDADE_LABELS } from '@/types/alojamentos'
import type { AlojamentoItemKey, FotoAlojamento } from '@/types/alojamentos'
import {
  ArrowLeft, Camera, Image as ImageIcon, X, Loader2, CheckCircle2,
  ThumbsUp, ThumbsDown, ChevronDown,
} from 'lucide-react'

const ALOJ_COLOR = '#6366F1'
const MSE_RED = '#E8291C'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

interface SubUnidadeForm {
  numero: number
  fotos: FotoAlojamento[]
  observacao: string
  uploading: boolean
}

interface ItemFormState {
  item_key: AlojamentoItemKey
  conforme: boolean
  observacao: string
  fotos: FotoAlojamento[]
  uploading: boolean
  aberto: boolean
  subUnidades?: SubUnidadeForm[]
}

function novaSubUnidade(numero: number): SubUnidadeForm {
  return { numero, fotos: [], observacao: '', uploading: false }
}

export default function NovoAlojamentoPage() {
  const router = useRouter()
  const { obras } = useApp()

  const [obraId, setObraId] = useState('')
  const [endereco, setEndereco] = useState('')
  const [empresaResponsavel, setEmpresaResponsavel] = useState('')
  const [numQuartos, setNumQuartos] = useState('')
  const [numBanheiros, setNumBanheiros] = useState('')
  const [numAlojados, setNumAlojados] = useState('')
  const [capacidadeMaxima, setCapacidadeMaxima] = useState('')
  const [responsavelCompra, setResponsavelCompra] = useState('')
  const [responsavelAlojamento, setResponsavelAlojamento] = useState('')
  const [responsavelRelatorio, setResponsavelRelatorio] = useState('')
  const [dataVistoria, setDataVistoria] = useState(new Date().toISOString().split('T')[0])

  const [itens, setItens] = useState<ItemFormState[]>(() =>
    ALOJAMENTO_ITENS_CONFIG.map((cfg, i) => ({
      item_key: cfg.key,
      conforme: false, // default Não Conforme — mesma lógica do relatório original
      observacao: '',
      fotos: [],
      uploading: false,
      aberto: i === 0,
      subUnidades: SUB_UNIDADE_LABELS[cfg.key] ? [novaSubUnidade(1)] : undefined,
    })),
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const cameraRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const fotoRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const obra = obras.find(o => o.id === obraId)

  function updateItem(key: AlojamentoItemKey, patch: Partial<ItemFormState>) {
    setItens(list => list.map(it => it.item_key === key ? { ...it, ...patch } : it))
  }

  function updateSubUnidade(key: AlojamentoItemKey, numero: number, patch: Partial<SubUnidadeForm>) {
    setItens(list => list.map(it => it.item_key === key
      ? { ...it, subUnidades: (it.subUnidades ?? []).map(su => su.numero === numero ? { ...su, ...patch } : su) }
      : it))
  }

  // Sincroniza a quantidade de sub-unidades (Dormitório 1, 2, 3... / Sanitário 1, 2...)
  // com os campos Nº de Quartos / Nº de Banheiros, preservando fotos/observações já
  // preenchidas nas unidades que continuam existindo.
  function syncSubUnidades(key: AlojamentoItemKey, quantidade: string) {
    const count = Math.max(1, Number(quantidade) || 1)
    setItens(list => list.map(it => {
      if (it.item_key !== key) return it
      const atual = it.subUnidades ?? []
      const proximo = Array.from({ length: count }, (_, i) => atual[i] ?? novaSubUnidade(i + 1))
      return { ...it, subUnidades: proximo }
    }))
  }

  useEffect(() => { syncSubUnidades('dormitorios', numQuartos) }, [numQuartos])
  useEffect(() => { syncSubUnidades('sanitarios', numBanheiros) }, [numBanheiros])

  async function addFoto(key: AlojamentoItemKey, files: FileList | null, subNumero?: number) {
    if (!files || files.length === 0) return
    if (subNumero !== undefined) updateSubUnidade(key, subNumero, { uploading: true })
    else updateItem(key, { uploading: true })
    try {
      const novasFotos: FotoAlojamento[] = []
      for (const file of Array.from(files)) {
        const comprimido = await compressImage(file, 1280, 0.8)
        const url = await uploadFotoToStorage(comprimido)
        novasFotos.push({ id: uid(), data_url: url, nome: comprimido.name })
      }
      if (subNumero !== undefined) {
        setItens(list => list.map(it => it.item_key === key
          ? { ...it, subUnidades: (it.subUnidades ?? []).map(su => su.numero === subNumero ? { ...su, fotos: [...su.fotos, ...novasFotos] } : su) }
          : it))
      } else {
        setItens(list => list.map(it => it.item_key === key
          ? { ...it, fotos: [...it.fotos, ...novasFotos] }
          : it))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar foto')
    } finally {
      if (subNumero !== undefined) updateSubUnidade(key, subNumero, { uploading: false })
      else updateItem(key, { uploading: false })
    }
  }

  function renderFotos(
    fotoKey: string, fotos: FotoAlojamento[], uploading: boolean,
    onFiles: (files: FileList | null) => void, onRemove: (fotoId: string) => void,
  ) {
    return (
      <div>
        <label className="text-xs font-semibold text-zinc-400 mb-1.5 block flex items-center gap-1.5">
          <Camera className="w-3 h-3" /> Fotos
        </label>
        <input
          ref={el => { cameraRefs.current[fotoKey] = el }}
          type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => onFiles(e.target.files)}
        />
        <input
          ref={el => { fotoRefs.current[fotoKey] = el }}
          type="file" accept="image/*" multiple className="hidden"
          onChange={e => onFiles(e.target.files)}
        />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {fotos.map(foto => (
            <div key={foto.id} className="relative aspect-square bg-zinc-800 rounded-xl overflow-hidden group border border-zinc-700">
              <img
                src={foto.data_url}
                alt=""
                className="w-full h-full object-contain cursor-zoom-in"
                onClick={() => setPreviewUrl(foto.data_url)}
              />
              <button
                onClick={() => onRemove(foto.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
          <button
            onClick={() => cameraRefs.current[fotoKey]?.click()}
            disabled={uploading}
            className="aspect-square bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-indigo-500/50 transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /> : <Camera className="w-6 h-6 text-zinc-500" />}
            <span className="text-[10px] text-zinc-500">Câmera</span>
          </button>
          <button
            onClick={() => fotoRefs.current[fotoKey]?.click()}
            disabled={uploading}
            className="aspect-square bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-indigo-500/50 transition-all disabled:opacity-50"
          >
            <ImageIcon className="w-6 h-6 text-zinc-500" />
            <span className="text-[10px] text-zinc-500">Galeria</span>
          </button>
        </div>
        {fotos.length > 0 && (
          <p className="text-[10px] text-zinc-600 mt-1.5">Clique em uma foto para ampliar. A foto aparece no PDF sem cortes, preservando a proporção.</p>
        )}
      </div>
    )
  }

  const canSave = Boolean(
    obraId && endereco.trim() && empresaResponsavel.trim() &&
    numQuartos.trim() && numBanheiros.trim() && numAlojados.trim() && capacidadeMaxima.trim() &&
    responsavelRelatorio.trim() && dataVistoria,
  )

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const result = await alojamentosDB.create(
        {
          obra_id: obraId,
          obra_nome: obra?.nome,
          endereco: endereco.trim(),
          empresa_responsavel: empresaResponsavel.trim(),
          num_quartos: Number(numQuartos),
          num_banheiros: Number(numBanheiros),
          num_alojados: Number(numAlojados),
          capacidade_maxima: Number(capacidadeMaxima),
          responsavel_compra: responsavelCompra.trim() || undefined,
          responsavel_alojamento: responsavelAlojamento.trim() || undefined,
          responsavel_relatorio: responsavelRelatorio.trim(),
          data_vistoria: dataVistoria,
        },
        itens.map((it, i) => ({
          item_key: it.item_key,
          ordem: i,
          conforme: it.conforme,
          observacao: it.subUnidades ? undefined : (it.observacao.trim() || undefined),
          fotos: it.subUnidades ? [] : it.fotos,
          sub_unidades: it.subUnidades?.map(su => ({
            numero: su.numero,
            fotos: su.fotos,
            observacao: su.observacao.trim() || undefined,
          })),
        })),
      )
      router.push(`/alojamentos/${result.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar relatório')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-2 disabled:opacity-50'
  const conformeCount = itens.filter(it => it.conforme).length

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
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
              <p className="text-sm font-bold text-white">Relatório de Alojamento</p>
              <p className="text-[11px] text-white/70">MSE Engenharia</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold text-white">{conformeCount}/{itens.length}</p>
              <p className="text-xs text-white/70">itens conformes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dados do Alojamento */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-200">Dados do Alojamento</h2>

        <div>
          <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Obra *</label>
          <select className={inputCls} style={{ '--tw-ring-color': ALOJ_COLOR + '4d' } as React.CSSProperties} value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">Selecione a obra</option>
            {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Endereço do Alojamento *</label>
          <input className={inputCls} placeholder="Ex: Rua das Flores, 123 - Centro" value={endereco} onChange={e => setEndereco(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Empresa Responsável pelo Alojamento *</label>
          <input className={inputCls} placeholder="Ex: Locadora XYZ Ltda" value={empresaResponsavel} onChange={e => setEmpresaResponsavel(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Nº de Quartos *</label>
            <input type="number" min={1} className={inputCls} value={numQuartos} onChange={e => setNumQuartos(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Nº de Banheiros *</label>
            <input type="number" min={1} className={inputCls} value={numBanheiros} onChange={e => setNumBanheiros(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Nº de Alojados *</label>
            <input type="number" min={0} className={inputCls} value={numAlojados} onChange={e => setNumAlojados(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Capacidade Máxima *</label>
            <input type="number" min={0} className={inputCls} value={capacidadeMaxima} onChange={e => setCapacidadeMaxima(e.target.value)} />
          </div>
        </div>
        <p className="text-[11px] text-zinc-600 -mt-2">Nº de Quartos e Nº de Banheiros definem quantos blocos de Dormitório e Sanitário aparecem abaixo, um para cada quarto/banheiro real do alojamento.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Responsável pela Compra dos Itens Faltantes</label>
            <input className={inputCls} value={responsavelCompra} onChange={e => setResponsavelCompra(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Responsável pelo Alojamento</label>
            <input className={inputCls} value={responsavelAlojamento} onChange={e => setResponsavelAlojamento(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Responsável pelo Relatório *</label>
            <input className={inputCls} value={responsavelRelatorio} onChange={e => setResponsavelRelatorio(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Data *</label>
            <input type="date" className={inputCls} value={dataVistoria} onChange={e => setDataVistoria(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Itens de Inspeção */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200 px-1">Itens de Inspeção</h2>

        {itens.map((it, idx) => {
          const cfg = ALOJAMENTO_ITENS_CONFIG[idx]
          return (
            <div key={it.item_key} className={cn(
              'bg-zinc-900 border rounded-2xl overflow-hidden transition-colors',
              it.conforme ? 'border-emerald-500/25' : 'border-red-500/20',
            )}>
              {/* Header (colapsável) */}
              <button
                onClick={() => updateItem(it.item_key, { aberto: !it.aberto })}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: ALOJ_COLOR }}>
                  {cfg.numero}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-200">{cfg.titulo}</p>
                </div>
                <span className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0',
                  it.conforme ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
                )}>
                  {it.conforme ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                  {it.conforme ? 'Conforme' : 'Não Conforme'}
                </span>
                <ChevronDown className={cn('w-4 h-4 text-zinc-500 transition-transform flex-shrink-0', it.aberto && 'rotate-180')} />
              </button>

              {it.aberto && (
                <div className="px-5 pb-5 space-y-4 border-t border-zinc-800 pt-4">
                  <div className="bg-zinc-800/40 border-l-4 border-red-500/70 rounded-r-xl px-4 py-3 space-y-2.5">
                    {cfg.clausulas.map(cl => (
                      <p key={cl.ref} className="text-xs text-zinc-400 leading-relaxed">
                        <span className="font-bold text-red-400">{cl.ref}</span> — {cl.desc}
                      </p>
                    ))}
                  </div>

                  {/* Classificação */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateItem(it.item_key, { conforme: true })}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-sm transition-all',
                        it.conforme ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-zinc-700 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400',
                      )}
                    >
                      <ThumbsUp className="w-4 h-4" /> Conforme
                    </button>
                    <button
                      onClick={() => updateItem(it.item_key, { conforme: false })}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-sm transition-all',
                        !it.conforme ? 'border-red-500/60 bg-red-500/15 text-red-400' : 'border-zinc-700 text-zinc-500 hover:border-red-500/30 hover:text-red-400',
                      )}
                    >
                      <ThumbsDown className="w-4 h-4" /> Não Conforme
                    </button>
                  </div>

                  {it.subUnidades ? (
                    /* Sub-unidades — um bloco de fotos+observação por quarto/banheiro */
                    <div className="space-y-4">
                      {it.subUnidades.map(su => (
                        <div key={su.numero} className="bg-zinc-800/30 border border-zinc-700/60 rounded-xl p-4 space-y-3">
                          <p className="text-sm font-bold text-zinc-300">{SUB_UNIDADE_LABELS[it.item_key]} {su.numero}</p>

                          {renderFotos(
                            `${it.item_key}:${su.numero}`, su.fotos, su.uploading,
                            files => addFoto(it.item_key, files, su.numero),
                            fotoId => updateSubUnidade(it.item_key, su.numero, { fotos: su.fotos.filter(f => f.id !== fotoId) }),
                          )}

                          <div>
                            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Observações</label>
                            <textarea
                              className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 resize-none"
                              rows={2}
                              maxLength={255}
                              placeholder={`Observações sobre ${SUB_UNIDADE_LABELS[it.item_key]?.toLowerCase()} ${su.numero} (opcional)`}
                              value={su.observacao}
                              onChange={e => updateSubUnidade(it.item_key, su.numero, { observacao: e.target.value })}
                            />
                            <p className="text-[10px] text-zinc-600 text-right mt-1">{su.observacao.length}/255</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {renderFotos(
                        it.item_key, it.fotos, it.uploading,
                        files => addFoto(it.item_key, files),
                        fotoId => updateItem(it.item_key, { fotos: it.fotos.filter(f => f.id !== fotoId) }),
                      )}

                      <div>
                        <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Observações</label>
                        <textarea
                          className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 resize-none"
                          rows={2}
                          maxLength={255}
                          placeholder="Observações sobre este item (opcional)"
                          value={it.observacao}
                          onChange={e => updateItem(it.item_key, { observacao: e.target.value })}
                        />
                        <p className="text-[10px] text-zinc-600 text-right mt-1">{it.observacao.length}/255</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="w-full py-3.5 rounded-2xl font-bold text-base text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        style={{ background: canSave && !saving ? ALOJ_COLOR : ALOJ_COLOR + '66' }}
      >
        {saving ? <><Loader2 className="w-5 h-5 animate-spin" />Salvando relatório…</> : <><CheckCircle2 className="w-5 h-5" />Salvar Relatório</>}
      </button>

      {/* Preview ampliado da foto */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-white hover:bg-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
          <img src={previewUrl} alt="" className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
