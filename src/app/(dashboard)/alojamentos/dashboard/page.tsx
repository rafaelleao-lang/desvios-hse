'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { alojamentosDB } from '@/lib/db-alojamentos'
import { ALOJAMENTO_ITENS_CONFIG } from '@/types/alojamentos'
import type { Alojamento, AlojamentoItemStats } from '@/types/alojamentos'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList,
} from 'recharts'
import { BedDouble, CheckCircle2, XCircle, ClipboardList, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

const ALOJ_COLOR = '#6366F1'
const GREEN = '#10B981'
const RED = '#E8291C'
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-zinc-400 mb-1 font-medium">{label}</p>}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '20' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-zinc-100 leading-none">{value}</p>
        <p className="text-xs font-semibold text-zinc-400 mt-0.5">{label}</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

export default function AlojamentosDashboardPage() {
  const { obras } = useApp()

  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([])
  const [itemStats, setItemStats] = useState<AlojamentoItemStats[]>([])
  const [loading, setLoading] = useState(true)
  const [obraFiltro, setObraFiltro] = useState('')
  const [periodoMeses, setPeriodoMeses] = useState(12)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([alojamentosDB.list(), alojamentosDB.statsPorItem()])
      .then(([list, stats]) => {
        if (!active) return
        setAlojamentos(list)
        setItemStats(stats)
      })
      .catch(err => console.error('[alojamentos] dashboard:', err))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = useMemo(
    () => alojamentos.filter(a => !obraFiltro || a.obra_id === obraFiltro),
    [alojamentos, obraFiltro],
  )

  const kpis = useMemo(() => {
    const totalRelatorios = filtered.length
    const totalItens = filtered.reduce((s, a) => s + a.total_itens, 0)
    const totalConformes = filtered.reduce((s, a) => s + a.total_conformes, 0)
    const totalNaoConformes = totalItens - totalConformes
    const pctConformidade = totalItens > 0 ? Math.round((totalConformes / totalItens) * 100) : 0
    return { totalRelatorios, totalItens, totalConformes, totalNaoConformes, pctConformidade }
  }, [filtered])

  const donutData = useMemo(() => ([
    { name: 'Conformes', value: kpis.totalConformes, color: GREEN },
    { name: 'Não Conformes', value: kpis.totalNaoConformes, color: RED },
  ]), [kpis])

  // Ranking de itens mais recorrentes em não-conformidade
  const rankingItens = useMemo(() => {
    return itemStats
      .map(s => {
        const cfg = ALOJAMENTO_ITENS_CONFIG.find(c => c.key === s.item_key)
        return {
          nome: cfg?.titulo ?? s.item_key,
          nao_conformes: s.nao_conformes,
          pct: s.total > 0 ? Math.round((s.nao_conformes / s.total) * 100) : 0,
        }
      })
      .filter(s => s.nao_conformes > 0)
      .sort((a, b) => b.nao_conformes - a.nao_conformes)
  }, [itemStats])

  // Por obra
  const porObra = useMemo(() => {
    return obras.filter(o => o.ativa).map(obra => {
      const relatorios = alojamentos.filter(a => a.obra_id === obra.id)
      const totalItens = relatorios.reduce((s, a) => s + a.total_itens, 0)
      const totalConformes = relatorios.reduce((s, a) => s + a.total_conformes, 0)
      return {
        nome: obra.nome.length > 16 ? obra.nome.slice(0, 15) + '…' : obra.nome,
        nomeCompleto: obra.nome,
        relatorios: relatorios.length,
        naoConformes: totalItens - totalConformes,
      }
    }).filter(o => o.relatorios > 0).sort((a, b) => b.relatorios - a.relatorios).slice(0, 8)
  }, [alojamentos, obras])

  // Evolução mensal (quantidade de relatórios)
  const evolucaoMensal = useMemo(() => {
    return Array.from({ length: periodoMeses }, (_, i) => {
      const dt = new Date()
      dt.setMonth(dt.getMonth() - (periodoMeses - 1 - i))
      const mes = dt.toISOString().slice(0, 7)
      const mesReg = filtered.filter(a => a.data_vistoria.startsWith(mes))
      return {
        label: MONTHS[dt.getMonth()] + '/' + String(dt.getFullYear()).slice(2),
        relatorios: mesReg.length,
        naoConformes: mesReg.reduce((s, a) => s + (a.total_itens - a.total_conformes), 0),
      }
    })
  }, [filtered, periodoMeses])

  const activeFilters = [obraFiltro].filter(Boolean).length
  const inputCls = 'w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2'
  const barH = (n: number) => Math.max(160, n * 34 + 30)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ALOJ_COLOR, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ALOJ_COLOR + '20' }}>
          <BedDouble className="w-4 h-4" style={{ color: ALOJ_COLOR }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Dashboard de Alojamentos</h1>
          <p className="text-xs text-zinc-500">{kpis.totalRelatorios} relatório(s) considerado(s)</p>
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={cn(
            'ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
            showFilters || activeFilters > 0 ? 'text-white' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
          )}
          style={showFilters || activeFilters > 0 ? { borderColor: ALOJ_COLOR + '66', background: ALOJ_COLOR + '1a', color: ALOJ_COLOR } : {}}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Obra</label>
                  <select className={inputCls} value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
                    <option value="">Todas</option>
                    {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Período (evolução)</label>
                  <select className={inputCls} value={periodoMeses} onChange={e => setPeriodoMeses(Number(e.target.value))}>
                    <option value={3}>3 meses</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                    <option value={24}>24 meses</option>
                  </select>
                </div>
              </div>
              {activeFilters > 0 && (
                <button onClick={() => setObraFiltro('')} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
                  <X className="w-3 h-3" /> Limpar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Relatórios" value={kpis.totalRelatorios} sub="Total no filtro" icon={ClipboardList} color={ALOJ_COLOR} />
        <KpiCard label="Itens Conformes" value={kpis.totalConformes} sub={`${kpis.pctConformidade}% do total avaliado`} icon={CheckCircle2} color={GREEN} />
        <KpiCard label="Itens Não Conformes" value={kpis.totalNaoConformes} sub="Somatório de todos os relatórios" icon={XCircle} color={RED} />
        <KpiCard label="Itens Avaliados" value={kpis.totalItens} sub="Em todos os relatórios" icon={BedDouble} color="#8B5CF6" />
      </div>

      {/* Donut Conforme x Não Conforme */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-zinc-200 mb-3">Itens Conformes × Não Conformes</h3>
        {kpis.totalItens === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">Sem dados suficientes ainda.</p>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: 0, height: 220 }}>
              <span className="text-2xl font-black text-zinc-100">{kpis.pctConformidade}%</span>
              <span className="text-[10px] text-zinc-500">conformidade</span>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GREEN }} />Conformes ({kpis.totalConformes})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: RED }} />Não Conformes ({kpis.totalNaoConformes})</span>
            </div>
          </div>
        )}
      </div>

      {/* Evolução mensal */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-zinc-200 mb-3">Evolução Mensal de Relatórios</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={evolucaoMensal}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTip />} />
            <Area type="monotone" dataKey="relatorios" name="Relatórios" stroke={ALOJ_COLOR} fill={ALOJ_COLOR + '30'} strokeWidth={2} />
            <Area type="monotone" dataKey="naoConformes" name="Itens Não Conformes" stroke={RED} fill={RED + '20'} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking de itens mais não conformes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-zinc-200 mb-1">Itens Mais Recorrentes em Não Conformidade</h3>
        <p className="text-[11px] text-zinc-600 mb-3">Somatório de todos os relatórios já salvos, por tipo de item.</p>
        {rankingItens.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">Nenhuma não-conformidade registrada ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={barH(rankingItens.length)}>
            <BarChart data={rankingItens} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="nome" width={140} tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="nao_conformes" name="Não Conformes" fill={RED} radius={[0, 6, 6, 0]} barSize={16}>
                <LabelList dataKey="nao_conformes" position="right" fill="#e4e4e7" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Por obra */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-zinc-200 mb-3">Relatórios por Obra</h3>
        {porObra.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">Nenhum relatório encontrado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={barH(porObra.length)}>
            <BarChart data={porObra} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="nome" width={120} tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="relatorios" name="Relatórios" fill={ALOJ_COLOR} radius={[0, 6, 6, 0]} barSize={14}>
                <LabelList dataKey="relatorios" position="right" fill="#e4e4e7" fontSize={11} />
              </Bar>
              <Bar dataKey="naoConformes" name="Itens Não Conformes" fill={RED} radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
