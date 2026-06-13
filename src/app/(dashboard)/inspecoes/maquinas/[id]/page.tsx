'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { inspecoesMEDB } from '@/lib/db-maquinas'
import { TIPO_EQUIPAMENTO_LABEL } from '@/types/maquinas'
import { CHECKLIST_POR_TIPO } from '@/lib/checklist-maquinas'
import type { InspecaoMaquina } from '@/types/maquinas'
import { motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, XCircle, Minus, Clock,
  Building2, Wrench, User, ThumbsUp, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const INSP_GREEN = '#10B981'

function StatusIcon({ status }: { status: string | null }) {
  if (status === 'conforme')     return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
  if (status === 'nao_conforme') return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
  if (status === 'nao_aplicavel') return <Minus className="w-4 h-4 text-zinc-500 flex-shrink-0" />
  return <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
}

export default function VerInspecaoMEPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [insp, setInsp] = useState<InspecaoMaquina | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    inspecoesMEDB.find(id)
      .then(i => setInsp(i ?? null))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!insp) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500">Inspeção não encontrada.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-emerald-400 hover:underline">Voltar</button>
      </div>
    )
  }

  const items = insp.equipamento_tipo ? CHECKLIST_POR_TIPO[insp.equipamento_tipo] ?? [] : []
  const categorias = Array.from(new Set(items.map(i => i.categoria)))

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-xl border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-4 h-4 text-zinc-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-zinc-100">
            Inspeção ME-{String(insp.numero).padStart(4, '0')}
          </h1>
          <p className="text-xs text-zinc-500">{insp.data_inspecao.slice(0, 10).split('-').reverse().join('/')}</p>
        </div>
        <span className={cn(
          'px-3 py-1.5 rounded-xl text-xs font-bold',
          insp.resultado === 'aprovado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
        )}>
          {insp.resultado === 'aprovado' ? 'APROVADO' : 'REPROVADO'}
        </span>
      </div>

      {/* Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 grid grid-cols-2 gap-4">
        <div className="flex items-start gap-2">
          <Building2 className="w-4 h-4 text-zinc-500 mt-0.5" />
          <div>
            <p className="text-[10px] text-zinc-600">Obra</p>
            <p className="text-sm font-semibold text-zinc-200">{insp.obra_nome ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Wrench className="w-4 h-4 text-zinc-500 mt-0.5" />
          <div>
            <p className="text-[10px] text-zinc-600">Equipamento</p>
            <p className="text-sm font-semibold text-zinc-200">{insp.equipamento_nome ?? '—'}</p>
            {insp.equipamento_tipo && <p className="text-[10px] text-zinc-500">{TIPO_EQUIPAMENTO_LABEL[insp.equipamento_tipo]}</p>}
            {insp.equipamento_serie && <p className="text-[10px] text-zinc-600 font-mono">{insp.equipamento_serie}</p>}
          </div>
        </div>
        {insp.tst_nome && (
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-zinc-500 mt-0.5" />
            <div>
              <p className="text-[10px] text-zinc-600">Inspetor (TST)</p>
              <p className="text-sm font-semibold text-zinc-200">{insp.tst_nome}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2">
          <ThumbsUp className="w-4 h-4 text-zinc-500 mt-0.5" />
          <div>
            <p className="text-[10px] text-zinc-600">Liberado para operação</p>
            <p className={cn('text-sm font-semibold', insp.equipamento_liberado ? 'text-emerald-400' : 'text-red-400')}>
              {insp.equipamento_liberado ? 'Sim' : 'Não'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-emerald-400">{insp.total_conformes}</p>
          <p className="text-xs text-zinc-400">Conformes</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-red-400">{insp.total_nao_conformes}</p>
          <p className="text-xs text-zinc-400">Não conformes</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-zinc-400">{insp.total_nao_aplicaveis}</p>
          <p className="text-xs text-zinc-400">N/A</p>
        </div>
      </div>

      {/* Checklist */}
      {categorias.map(cat => {
        const catItems = items.filter(i => i.categoria === cat)
        return (
          <div key={cat} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{cat}</h3>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {catItems.map((item, ii) => {
                const resp = insp.respostas.find(r => r.item_id === item.id)
                const status = resp?.status ?? null
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: ii * 0.01 }}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3',
                      status === 'nao_conforme' ? 'bg-red-500/5' : '',
                    )}
                  >
                    <span className="text-[10px] text-zinc-600 font-mono mt-0.5 flex-shrink-0">{String(ii + 1).padStart(2, '0')}</span>
                    <StatusIcon status={status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300">{item.descricao}</p>
                      {resp?.obs && <p className="text-[11px] text-zinc-500 mt-1 italic">"{resp.obs}"</p>}
                      {resp?.foto_url && (
                        <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden bg-zinc-800 relative">
                          <Image src={resp.foto_url} alt="foto NC" fill className="object-cover" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Assinatura */}
      {insp.assinatura_url && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-zinc-500 mb-3">Assinatura do Inspetor</p>
          <div className="rounded-xl overflow-hidden border border-zinc-700 bg-white">
            <Image src={insp.assinatura_url} alt="Assinatura" width={400} height={160} className="w-full object-contain" />
          </div>
        </div>
      )}

      {/* Desvio criado */}
      {insp.desvio_id && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-300">Desvio vinculado</p>
            <p className="text-xs text-zinc-500">Um desvio foi criado automaticamente para tratativa das não conformidades.</p>
          </div>
        </div>
      )}
    </div>
  )
}
