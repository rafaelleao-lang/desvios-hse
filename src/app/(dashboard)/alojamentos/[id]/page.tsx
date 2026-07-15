'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { alojamentosDB } from '@/lib/db-alojamentos'
import { gerarPDFAlojamento } from '@/lib/pdf-alojamento'
import { ALOJAMENTO_ITENS_CONFIG, SUB_UNIDADE_LABELS, generateAlojamentoId } from '@/types/alojamentos'
import type { Alojamento, AlojamentoItem } from '@/types/alojamentos'
import {
  ArrowLeft, Building2, MapPin, User, Calendar, FileText, Loader2,
  ThumbsUp, ThumbsDown, Image as ImageIcon, X, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ALOJ_COLOR = '#6366F1'

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm text-zinc-200 font-medium">{value}</p>
    </div>
  )
}

function ItemCard({ item, onPreview }: { item: AlojamentoItem; onPreview: (url: string) => void }) {
  const cfg = ALOJAMENTO_ITENS_CONFIG.find(c => c.key === item.item_key)
  return (
    <div className={cn(
      'bg-zinc-900 border rounded-2xl p-4 space-y-3',
      item.conforme ? 'border-emerald-500/20' : 'border-red-500/20',
    )}>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: ALOJ_COLOR }}>
          {cfg?.numero}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-200">{cfg?.titulo}</p>
        </div>
        <span className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0',
          item.conforme ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
        )}>
          {item.conforme ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
          {item.conforme ? 'Conforme' : 'Não Conforme'}
        </span>
      </div>

      {cfg?.clausulas && (
        <div className="bg-zinc-800/40 border-l-4 border-red-500/70 rounded-r-xl px-4 py-3 space-y-2.5">
          {cfg.clausulas.map(cl => (
            <p key={cl.ref} className="text-xs text-zinc-400 leading-relaxed">
              <span className="font-bold text-red-400">{cl.ref}</span> — {cl.desc}
            </p>
          ))}
        </div>
      )}

      {item.sub_unidades && item.sub_unidades.length > 0 ? (
        <div className="space-y-3">
          {item.sub_unidades.map(su => (
            <div key={su.numero} className="bg-zinc-800/30 border border-zinc-700/60 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-zinc-300">{SUB_UNIDADE_LABELS[item.item_key]} {su.numero}</p>
              {su.observacao && (
                <p className="text-xs text-zinc-400 bg-zinc-800/60 rounded-lg px-2.5 py-1.5">{su.observacao}</p>
              )}
              {su.fotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {su.fotos.map(foto => (
                    <div key={foto.id} className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden flex items-center justify-center" style={{ height: 150 }}>
                      <img
                        src={foto.data_url}
                        alt=""
                        className="max-w-full max-h-full object-contain cursor-zoom-in"
                        onClick={() => onPreview(foto.data_url)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-600">Sem fotos</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          {item.observacao && (
            <p className="text-sm text-zinc-400 bg-zinc-800/60 rounded-xl px-3 py-2">{item.observacao}</p>
          )}

          {item.fotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {item.fotos.map(foto => (
                <div key={foto.id} className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden flex items-center justify-center" style={{ height: 180 }}>
                  <img
                    src={foto.data_url}
                    alt=""
                    className="max-w-full max-h-full object-contain cursor-zoom-in"
                    onClick={() => onPreview(foto.data_url)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-800/60 rounded-xl flex items-center justify-center gap-2 py-4">
              <ImageIcon className="w-4 h-4 text-zinc-600" />
              <span className="text-xs text-zinc-600">Sem fotos</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function AlojamentoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [reg, setReg] = useState<(Alojamento & { itens: AlojamentoItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    alojamentosDB.find(id)
      .then(data => { if (active) setReg(data ?? null) })
      .catch(err => console.error('[alojamentos] find:', err))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  async function handlePDF() {
    if (!reg) return
    setPdfLoading(true)
    try {
      await gerarPDFAlojamento(reg)
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ALOJ_COLOR, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!reg) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-zinc-500 font-medium">Relatório não encontrado</p>
        <button onClick={() => router.push('/alojamentos')} className="mt-4 text-sm text-indigo-400 hover:underline">
          Voltar para Relatórios Salvos
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/alojamentos')} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={handlePDF}
          disabled={pdfLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
          style={{ background: '#E8291C' }}
        >
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Gerar PDF
        </button>
      </div>

      {/* Header MSE */}
      <div className="rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#E8291C' }}>
          <span className="text-2xl font-black text-white leading-none">mse</span>
          <div className="w-px h-6 bg-white/30" />
          <div>
            <p className="text-sm font-bold text-white">Relatório de Alojamento</p>
            <p className="text-[11px] text-white/70">{generateAlojamentoId(reg.numero)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold text-white">{formatDate(reg.data_vistoria)}</p>
          </div>
        </div>
      </div>

      {reg.prazo_resolucao && (() => {
        const vencido = new Date(`${reg.prazo_resolucao}T23:59:59`) < new Date()
        return (
          <div className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold',
            vencido ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-amber-500/10 border-amber-500/25 text-amber-400',
          )}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            Prazo para resolução das não conformidades: {formatDate(reg.prazo_resolucao)}
            {vencido && ' — vencido'}
          </div>
        )
      })()}

      {/* Dados do Alojamento */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: ALOJ_COLOR }} /> Dados do Alojamento
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoField label="Obra" value={reg.obra_nome} />
          <InfoField label="Endereço" value={reg.endereco} />
          <InfoField label="Empresa Responsável" value={reg.empresa_responsavel} />
          <InfoField label="Nº Quartos" value={reg.num_quartos} />
          <InfoField label="Nº Banheiros" value={reg.num_banheiros} />
          <InfoField label="Nº Alojados" value={reg.num_alojados} />
          <InfoField label="Capacidade Máxima" value={reg.capacidade_maxima} />
          <InfoField label="Resp. Compra Itens Faltantes" value={reg.responsavel_compra} />
          <InfoField label="Responsável pelo Alojamento" value={reg.responsavel_alojamento} />
          <InfoField label="Responsável pelo Relatório" value={reg.responsavel_relatorio} />
          <InfoField label="Data da Vistoria" value={formatDate(reg.data_vistoria)} />
        </div>
      </div>

      {/* Itens */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-200 px-1">Itens de Inspeção ({reg.itens.length})</h2>
        {reg.itens.map(item => <ItemCard key={item.id} item={item} onPreview={setPreviewUrl} />)}
      </div>

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
