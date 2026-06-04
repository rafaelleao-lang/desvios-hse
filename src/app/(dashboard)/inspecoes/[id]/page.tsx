'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { inspecoesDB } from '@/lib/db'
import type { Inspecao, InspecaoEvidencia } from '@/types'
import {
  ArrowLeft, Calendar, User, Building2, ShieldAlert, ThumbsUp,
  Clock, CheckCircle2, MapPin, Camera, AlertCircle, Image,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const INSP_GREEN = '#10B981'

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

function formatDateTime(d: string) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function EvidenciaCard({ ev, index }: { ev: InspecaoEvidencia; index: number }) {
  const isDesvio = ev.tipo === 'desvio'
  const isFechado = !!ev.data_fechamento

  return (
    <div className={cn(
      'bg-zinc-900 border rounded-2xl p-4 space-y-4',
      isDesvio ? 'border-red-500/20' : 'border-emerald-500/20',
    )}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white',
          isDesvio ? 'bg-red-500' : 'bg-emerald-500',
        )}>
          {index + 1}
        </div>
        <div className="flex items-center gap-2">
          {isDesvio
            ? <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-semibold"><ShieldAlert className="w-3 h-3" />Desvio</span>
            : <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold"><ThumbsUp className="w-3 h-3" />Reconhecimento</span>
          }
        </div>
      </div>

      {/* Local + Descrição */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
          <span className="text-sm text-zinc-200 font-medium">{ev.local}</span>
        </div>
        {ev.descricao && (
          <p className="text-sm text-zinc-400 pl-5">{ev.descricao}</p>
        )}
      </div>

      {/* Photos */}
      <div className={cn('grid gap-4', isDesvio ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
        {/* Foto de abertura */}
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium mb-2 flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {isDesvio ? 'Foto de Abertura' : 'Evidência Fotográfica'}
          </p>
          {ev.fotos_abertura && ev.fotos_abertura.length > 0 ? (
            <div className={cn('grid gap-2', ev.fotos_abertura.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
              {ev.fotos_abertura.slice(0, 4).map((foto, i) => (
                <div key={i} className="bg-zinc-800 rounded-xl overflow-hidden" style={{ height: 220 }}>
                  <img src={foto.data_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-800/60 rounded-xl flex items-center justify-center" style={{ height: 180 }}>
              <Image className="w-8 h-8 text-zinc-600" />
            </div>
          )}
        </div>

        {/* Foto de fechamento (apenas desvios) */}
        {isDesvio && (
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium mb-2 flex items-center gap-1">
              <Camera className="w-3 h-3" />
              Foto de Fechamento
            </p>
            {isFechado && ev.fotos_fechamento && ev.fotos_fechamento.length > 0 ? (
              <div className={cn('grid gap-2', ev.fotos_fechamento.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                {ev.fotos_fechamento.slice(0, 4).map((foto, i) => (
                  <div key={i} className="bg-zinc-800 rounded-xl overflow-hidden" style={{ height: 220 }}>
                    <img src={foto.data_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center gap-3" style={{ height: 180 }}>
                <Clock className="w-8 h-8 text-amber-400" />
                <p className="text-xs text-amber-400 text-center font-medium leading-tight px-4">
                  Aguardando fechamento do desvio
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fechamento info (desvios fechados) */}
      {isDesvio && isFechado && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] text-emerald-400 uppercase tracking-wide font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Desvio Fechado
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {ev.prazo_correcao && (
              <div>
                <p className="text-zinc-600">Prazo</p>
                <p className="text-zinc-300">{formatDate(ev.prazo_correcao)}</p>
              </div>
            )}
            <div>
              <p className="text-zinc-600">Fechado em</p>
              <p className="text-zinc-300">{formatDateTime(ev.data_fechamento!)}</p>
            </div>
            {ev.quem_fechou && (
              <div>
                <p className="text-zinc-600">Quem fechou</p>
                <p className="text-zinc-300">{ev.quem_fechou}</p>
              </div>
            )}
          </div>
          {ev.tratativa_texto && (
            <div className="mt-2">
              <p className="text-zinc-600 text-xs mb-1">Tratativa realizada</p>
              <p className="text-zinc-300 text-xs leading-relaxed">{ev.tratativa_texto}</p>
            </div>
          )}
        </div>
      )}

      {/* Desvio em aberto */}
      {isDesvio && !isFechado && ev.desvio_id && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
          <p className="text-xs text-amber-400 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Desvio em andamento — acompanhe na aba <strong>Desvios</strong>
          </p>
          {ev.prazo_correcao && (
            <p className="text-xs text-zinc-500 mt-1">Prazo: {formatDate(ev.prazo_correcao)}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function InspecaoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [inspecao, setInspecao] = useState<(Inspecao & { evidencias: InspecaoEvidencia[] }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    inspecoesDB.find(id).then(data => {
      setInspecao(data ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!inspecao) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500">Inspeção não encontrada.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-emerald-400 hover:underline">Voltar</button>
      </div>
    )
  }

  const isAberto = inspecao.status === 'em_aberto'
  const evidencias = inspecao.evidencias ?? []
  const desvios = evidencias.filter(e => e.tipo === 'desvio')
  const reconhecimentos = evidencias.filter(e => e.tipo === 'reconhecimento')
  const desviosFechados = desvios.filter(e => !!e.data_fechamento)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Header card — estilo relatório MSE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Faixa MSE */}
        <div className="h-12 flex items-center px-5 gap-3" style={{ background: INSP_GREEN }}>
          <span className="text-2xl font-black text-white leading-none">mse</span>
          <div className="w-px h-6 bg-white/30" />
          <span className="text-sm font-semibold text-white">Relatório de Inspeção HSE</span>
          <span className="ml-auto text-xs text-white/70">{formatDate(inspecao.data_inspecao)} {inspecao.hora_inspecao || ''}</span>
        </div>

        {/* Info */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-zinc-100">
                INS-{String(inspecao.numero).padStart(4, '0')}
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">{inspecao.obra_nome || '—'}</p>
            </div>
            <span className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border',
              isAberto
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            )}>
              {isAberto ? 'Em Aberto' : 'Concluída'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-zinc-500 mt-0.5" />
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wide">TST / Inspetor</p>
                <p className="text-sm text-zinc-200 font-medium">{inspecao.tst_nome || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-zinc-500 mt-0.5" />
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Encarregado</p>
                <p className="text-sm text-zinc-200 font-medium">{inspecao.encarregado_nome || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-zinc-500 mt-0.5" />
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Coordenador</p>
                <p className="text-sm text-zinc-200 font-medium">{inspecao.coordenador_nome || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-zinc-500 mt-0.5" />
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Obra</p>
                <p className="text-sm text-zinc-200 font-medium">{inspecao.obra_nome || '—'}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
            <div className="text-center">
              <p className="text-2xl font-black text-red-400">{desvios.length}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Desvios</p>
              <p className="text-[10px] text-zinc-600">{desviosFechados.length} fechados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-400">{reconhecimentos.length}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Reconhec.</p>
              <p className="text-[10px] text-zinc-600">Boas práticas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-200">{evidencias.length}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total</p>
              <p className="text-[10px] text-zinc-600">Evidências</p>
            </div>
          </div>

          {/* Progress */}
          {desvios.length > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Desvios fechados</span>
                <span>{desviosFechados.length}/{desvios.length}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(desviosFechados.length / desvios.length) * 100}%`,
                    background: desviosFechados.length === desvios.length ? INSP_GREEN : '#F59E0B',
                  }}
                />
              </div>
            </div>
          )}

          {inspecao.fechado_em && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Inspeção concluída em {formatDateTime(inspecao.fechado_em)}
            </div>
          )}
        </div>
      </div>

      {/* Evidences */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
          <Camera className="w-4 h-4 text-zinc-500" />
          Evidências ({evidencias.length})
        </h2>
        {evidencias.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-sm">Sem evidências registradas.</div>
        ) : (
          <div className="space-y-4">
            {evidencias.map((ev, i) => <EvidenciaCard key={ev.id} ev={ev} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
