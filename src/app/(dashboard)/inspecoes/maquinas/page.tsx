'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import { motion } from 'framer-motion'
import { Wrench, ChevronRight, ClipboardCheck, AlertTriangle, Plus } from 'lucide-react'
import { TIPO_EQUIPAMENTO_LABEL } from '@/types/maquinas'
import type { TipoEquipamento } from '@/types/maquinas'
import { cn } from '@/lib/utils'

const INSP_GREEN = '#10B981'

const TIPOS: Array<{
  tipo: TipoEquipamento
  label: string
  descricao: string
  cor: string
  bg: string
}> = [
  { tipo: 'pemt',            label: 'PEMT',              descricao: 'Plataforma Elevatória de Trabalho',  cor: '#3B82F6', bg: 'bg-blue-500/10'    },
  { tipo: 'empilhadeira',    label: 'Empilhadeira',      descricao: 'Empilhadeira elétrica / a combustão', cor: '#F59E0B', bg: 'bg-amber-500/10'   },
  { tipo: 'caminhao',        label: 'Caminhão',          descricao: 'Caminhões de carga e transporte',     cor: '#64748B', bg: 'bg-slate-500/10'   },
  { tipo: 'guindauto',       label: 'Guindauto / Munck', descricao: 'Equipamentos de içamento de carga',   cor: '#8B5CF6', bg: 'bg-violet-500/10'  },
  { tipo: 'manipuladora',    label: 'Manipuladora',      descricao: 'Manipuladora telescópica',            cor: '#10B981', bg: 'bg-emerald-500/10' },
  { tipo: 'retroescavadeira',label: 'Retroescavadeira',  descricao: 'Retroescavadeira / escavadeira',      cor: '#F97316', bg: 'bg-orange-500/10'  },
]

export default function InspecoesMaquinasPage() {
  const { inspecoesME, obras, loaded } = useApp()
  const [obraFiltro, setObraFiltro] = useState('')

  const filteredInsp = useMemo(() =>
    inspecoesME.filter(i => !obraFiltro || i.obra_id === obraFiltro),
  [inspecoesME, obraFiltro])

  const statsPorTipo = useMemo(() => {
    const m: Record<TipoEquipamento, { total: number; aprovados: number; reprovados: number }> = {} as never
    for (const t of TIPOS) {
      const typeInsp = filteredInsp.filter(i => i.equipamento_tipo === t.tipo)
      m[t.tipo] = {
        total: typeInsp.length,
        aprovados: typeInsp.filter(i => i.resultado === 'aprovado').length,
        reprovados: typeInsp.filter(i => i.resultado === 'reprovado').length,
      }
    }
    return m
  }, [filteredInsp])

  const inputCls = 'h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30'

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: INSP_GREEN + '20' }}>
            <Wrench className="w-4 h-4" style={{ color: INSP_GREEN }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Inspeções de Máquinas e Equipamentos</h1>
            <p className="text-xs text-zinc-500">{filteredInsp.length} inspeção(ões) realizadas</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${inputCls} w-full sm:w-auto`} value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
            <option value="">Todas as obras</option>
            {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          <Link
            href="/inspecoes/maquinas/nova"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 w-full sm:w-auto justify-center"
            style={{ background: INSP_GREEN }}
          >
            <Plus className="w-4 h-4" />
            Nova Inspeção
          </Link>
        </div>
      </div>

      {/* Tipo cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TIPOS.map((t, idx) => {
          const stats = statsPorTipo[t.tipo]
          return (
            <motion.div
              key={t.tipo}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
            >
              <Link
                href={`/inspecoes/maquinas/nova?tipo=${t.tipo}${obraFiltro ? `&obra=${obraFiltro}` : ''}`}
                className="group block bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-2xl', t.bg)}>
                    <Wrench className="w-6 h-6" style={{ color: t.cor }} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all mt-1" />
                </div>

                <h3 className="text-base font-bold text-zinc-100 mb-0.5">{t.label}</h3>
                <p className="text-xs text-zinc-500 mb-4">{t.descricao}</p>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-400">{stats.total} inspeção(ões)</span>
                  </div>
                  {stats.reprovados > 0 && (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs text-red-400">{stats.reprovados} reprovado(s)</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  {stats.total > 0 ? (
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((stats.aprovados / stats.total) * 100)}%`,
                        background: stats.reprovados > 0 ? '#F97316' : t.cor,
                      }}
                    />
                  ) : (
                    <div className="h-full w-0" />
                  )}
                </div>
                {stats.total > 0 && (
                  <p className="text-[10px] text-zinc-600 mt-1">
                    {Math.round((stats.aprovados / stats.total) * 100)}% aprovados
                  </p>
                )}
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Quick access row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/inspecoes/maquinas/inventario"
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <ClipboardCheck className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-200">Inventário de M&E</p>
            <p className="text-xs text-zinc-500">Status de inspeção por equipamento</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </Link>

        <Link
          href="/inspecoes/maquinas/equipamentos"
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Plus className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-200">Cadastrar Equipamento</p>
            <p className="text-xs text-zinc-500">Registrar nova máquina no sistema</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </Link>
      </div>
    </div>
  )
}
