'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import { equipamentosDB } from '@/lib/db-maquinas'
import { motion } from 'framer-motion'
import { Package, CheckCircle2, XCircle, Clock, Eye, Plus, Building2, Search } from 'lucide-react'
import type { TipoEquipamento } from '@/types/maquinas'
import { TIPO_EQUIPAMENTO_LABEL } from '@/types/maquinas'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import type { Equipamento, InspecaoMaquina } from '@/types/maquinas'

const INSP_GREEN = '#10B981'

function StatusBadge({ ultima }: { ultima?: InspecaoMaquina }) {
  if (!ultima) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-400">
        <Clock className="w-3 h-3" />
        Não inspecionado
      </span>
    )
  }
  if (ultima.resultado === 'aprovado') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        Aprovado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400">
      <XCircle className="w-3 h-3" />
      Reprovado
    </span>
  )
}

export default function InventarioMEPage() {
  const { inspecoesME, obras, loaded } = useApp()
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [loadingEq, setLoadingEq] = useState(true)
  const [obraFiltro, setObraFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoEquipamento | ''>('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    equipamentosDB.list()
      .then(setEquipamentos)
      .catch(console.error)
      .finally(() => setLoadingEq(false))
  }, [])

  const ultimaInspecaoPorEquipamento = useMemo(() => {
    const m: Record<string, InspecaoMaquina | undefined> = {}
    for (const eq of equipamentos) {
      const insp = inspecoesME
        .filter(i => i.equipamento_id === eq.id)
        .sort((a, b) => b.data_inspecao.localeCompare(a.data_inspecao))
      m[eq.id] = insp[0]
    }
    return m
  }, [equipamentos, inspecoesME])

  const filtered = useMemo(() => {
    return equipamentos.filter(eq => {
      if (!eq.ativo) return false
      if (obraFiltro && eq.obra_id !== obraFiltro) return false
      if (tipoFiltro && eq.tipo !== tipoFiltro) return false
      if (busca) {
        const q = busca.toLowerCase()
        if (!eq.nome.toLowerCase().includes(q) && !(eq.numero_serie ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [equipamentos, obraFiltro, tipoFiltro, busca])

  const stats = useMemo(() => {
    const total = filtered.length
    const aprovados = filtered.filter(eq => ultimaInspecaoPorEquipamento[eq.id]?.resultado === 'aprovado').length
    const reprovados = filtered.filter(eq => ultimaInspecaoPorEquipamento[eq.id]?.resultado === 'reprovado').length
    const pendentes = filtered.filter(eq => !ultimaInspecaoPorEquipamento[eq.id]).length
    return { total, aprovados, reprovados, pendentes }
  }, [filtered, ultimaInspecaoPorEquipamento])

  const inputCls = 'h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30'

  if (!loaded || loadingEq) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const TIPOS_OPTIONS: TipoEquipamento[] = ['pemt','empilhadeira','caminhao','guindauto','manipuladora','retroescavadeira']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: INSP_GREEN + '20' }}>
            <Package className="w-4 h-4" style={{ color: INSP_GREEN }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Inventário de M&E</h1>
            <p className="text-xs text-zinc-500">{stats.total} equipamento(s) cadastrado(s)</p>
          </div>
        </div>
        <Link
          href="/inspecoes/maquinas/equipamentos"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: INSP_GREEN }}
        >
          <Plus className="w-4 h-4" />
          Cadastrar
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: '#6366F1', icon: Package },
          { label: 'Aprovados', value: stats.aprovados, color: '#10B981', icon: CheckCircle2 },
          { label: 'Reprovados', value: stats.reprovados, color: '#EF4444', icon: XCircle },
          { label: 'Sem inspeção', value: stats.pendentes, color: '#F59E0B', icon: Clock },
        ].map(k => (
          <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: k.color + '20' }}>
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xl font-black text-zinc-100 leading-none">{k.value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            placeholder="Buscar por nome ou série..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select className={inputCls} value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
          <option value="">Todas as obras</option>
          {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select className={inputCls} value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value as TipoEquipamento | '')}>
          <option value="">Todos os tipos</option>
          {TIPOS_OPTIONS.map(t => <option key={t} value={t}>{TIPO_EQUIPAMENTO_LABEL[t]}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm font-medium text-zinc-500">Nenhum equipamento encontrado</p>
          <p className="text-xs text-zinc-600 mt-1">Cadastre equipamentos para visualizá-los aqui</p>
          <Link href="/inspecoes/maquinas/equipamentos" className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: INSP_GREEN }}>
            Cadastrar Equipamento
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Equipamento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 hidden sm:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 hidden md:table-cell">Obra</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 hidden lg:table-cell">Nº Série</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Última Inspeção</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((eq, idx) => {
                  const ultima = ultimaInspecaoPorEquipamento[eq.id]
                  const obra = obras.find(o => o.id === eq.obra_id)
                  return (
                    <motion.tr
                      key={eq.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-200">{eq.nome}</p>
                        {eq.fabricante && <p className="text-[11px] text-zinc-500">{eq.fabricante}{eq.modelo ? ` · ${eq.modelo}` : ''}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-zinc-400">{TIPO_EQUIPAMENTO_LABEL[eq.tipo]}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-zinc-400">{obra?.nome ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-mono text-zinc-500">{eq.numero_serie ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {ultima ? (
                          <p className="text-xs text-zinc-400">{ultima.data_inspecao.slice(0, 10).split('-').reverse().join('/')}</p>
                        ) : (
                          <p className="text-xs text-zinc-600">—</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge ultima={ultima} />
                      </td>
                      <td className="px-4 py-3">
                        {ultima && (
                          <Link
                            href={`/inspecoes/maquinas/${ultima.id}`}
                            className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-zinc-400" />
                          </Link>
                        )}
                        {!ultima && (
                          <Link
                            href={`/inspecoes/maquinas/nova?tipo=${eq.tipo}&eq=${eq.id}`}
                            className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                            title="Inspecionar"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          </Link>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
