'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2,
  ShieldAlert, Activity, Building2, Plus, RefreshCw,
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, LabelList,
} from 'recharts'
import { useApp } from '@/contexts/AppContext'
import { computeStats } from '@/lib/db'
import { cn, formatNumber, formatPercent } from '@/lib/utils'
import { STATUS_CONFIG, GRAVIDADE_CONFIG } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && Array.isArray(payload) && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl text-sm">
        {label && <p className="text-xs text-zinc-500 mb-1">{String(label)}</p>}
        {payload.map((e: Record<string, unknown>, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: e.color as string }} />
            <span className="text-zinc-400 text-xs">{String(e.name || '')}:</span>
            <span className="text-zinc-100 font-bold">{String(e.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const MSE_RED = '#E8291C'

export default function DashboardPage() {
  const router = useRouter()
  const { obras, tsts, encarregados, desvios, desviosComputados, loaded } = useApp()

  const [obraFiltro, setObraFiltro] = useState<string>('all')

  // Filter desvios by selected obra
  const desviosFiltrados = useMemo(() =>
    obraFiltro === 'all' ? desviosComputados : desviosComputados.filter(d => d.obra_id === obraFiltro)
  , [desviosComputados, obraFiltro])

  const desviosRaw = useMemo(() =>
    obraFiltro === 'all' ? desvios : desvios.filter(d => d.obra_id === obraFiltro)
  , [desvios, obraFiltro])

  const obrasFiltradas = useMemo(() =>
    obraFiltro === 'all' ? obras : obras.filter(o => o.id === obraFiltro)
  , [obras, obraFiltro])

  const stats = useMemo(
    () => computeStats(desviosRaw, obrasFiltradas, tsts, encarregados),
    [desviosRaw, obrasFiltradas, tsts, encarregados],
  )

  const obraAtual = obras.find(o => o.id === obraFiltro)

  // ── Charts ──
  const statusData = useMemo(() => {
    const colorMap: Record<string, string> = {
      aberto: '#3B82F6', em_tratativa: '#F59E0B', pendente: '#F97316',
      concluido: '#22C55E', fechado: '#71717A',
    }
    const counts: Record<string, number> = {}
    desviosFiltrados.forEach(d => {
      const key = d.status === 'reincidente' ? 'fechado' : d.status
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: STATUS_CONFIG[key as keyof typeof STATUS_CONFIG]?.label || key,
        value,
        color: colorMap[key] || '#71717A',
      }))
  }, [desviosFiltrados])

  const gravidadeData = useMemo(() =>
    [
      { name: 'Baixo',    key: 'baixo',   fill: '#10B981' },
      { name: 'Médio',    key: 'medio',   fill: '#EAB308' },
      { name: 'Alto',     key: 'alto',    fill: '#F97316' },
      { name: 'Crítico',  key: 'critico', fill: '#EF4444' },
    ].map(g => ({ ...g, total: desviosFiltrados.filter(d => d.gravidade === g.key).length })),
    [desviosFiltrados]
  )

  const obrasData = useMemo(() =>
    obras.map(obra => ({
      name: obra.nome.length > 14 ? obra.nome.slice(0, 13) + '…' : obra.nome,
      total:    desviosComputados.filter(d => d.obra_id === obra.id).length,
      abertos:  desviosComputados.filter(d => d.obra_id === obra.id && d.status === 'aberto').length,
      criticos: desviosComputados.filter(d => d.obra_id === obra.id && d.gravidade === 'critico').length,
    })).sort((a, b) => b.total - a.total).slice(0, 6),
    [obras, desviosComputados]
  )

  const encarregadoData = useMemo(() =>
    encarregados
      .filter(enc => obraFiltro === 'all' || enc.obra_id === obraFiltro)
      .map(enc => ({
        name:  enc.nome.length > 14 ? enc.nome.slice(0, 13) + '…' : enc.nome,
        total: desviosFiltrados.filter(d => d.encarregado_id === enc.id).length,
      }))
      .sort((a, b) => b.total - a.total)
      .filter(e => e.total > 0)
      .slice(0, 8)
  , [encarregados, desviosFiltrados, obraFiltro])

  const evolucaoData = useMemo(() => {
    const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      const mes = d.toISOString().slice(0, 7)
      return {
        mes: MONTHS[d.getMonth()] + '/' + String(d.getFullYear()).slice(2),
        abertos:    desviosFiltrados.filter(x => x.criado_em.startsWith(mes)).length,
        concluidos: desviosFiltrados.filter(x => x.atualizado_em.startsWith(mes) && ['concluido','fechado','reincidente'].includes(x.status)).length,
      }
    })
  }, [desviosFiltrados])

  const categoriaData = useMemo(() => {
    const counts: Record<string, number> = {}
    desviosFiltrados.forEach(d => { counts[d.categoria] = (counts[d.categoria] || 0) + 1 })
    return Object.entries(counts)
      .map(([cat, total]) => ({ name: cat.length > 16 ? cat.slice(0, 15) + '…' : cat, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [desviosFiltrados])

  const tstData = useMemo(() =>
    tsts
      .filter(t => obraFiltro === 'all' || t.obra_id === obraFiltro)
      .map(t => ({
        name: t.nome.length > 16 ? t.nome.slice(0, 15) + '…' : t.nome,
        total: desviosFiltrados.filter(d => d.tst_id === t.id).length,
      }))
      .filter(t => t.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  , [tsts, desviosFiltrados, obraFiltro])

  const fechados = useMemo(
    () => desviosFiltrados.filter(d => d.status === 'fechado' || d.status === 'reincidente').length,
    [desviosFiltrados],
  )

  // ── Loading ──
  if (!loaded) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 shimmer mb-4" />
            <div className="w-16 h-7 rounded-lg bg-zinc-800 shimmer mb-2" />
            <div className="w-24 h-4 rounded-lg bg-zinc-800/50 shimmer" />
          </div>
        ))}
      </div>
    )
  }

  // ── Empty state ──
  if (desvios.length === 0 && obras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(232,41,28,0.08)', border: '1px solid rgba(232,41,28,0.15)' }}>
          <ShieldAlert className="w-8 h-8" style={{ color: '#E8291C' }} />
        </div>
        <h2 className="text-2xl font-black text-zinc-50 mb-2">Bem-vindo ao Desvios HSE</h2>
        <p className="text-zinc-400 max-w-md mb-6 text-sm">
          Cadastre sua primeira obra e depois registre os desvios identificados em campo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => router.push('/obras/nova')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 text-white"
            style={{ background: '#E8291C' }}>
            <Building2 className="w-4 h-4" />Cadastrar Obra
          </button>
          <button onClick={() => router.push('/desvios/novo')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-all active:scale-95">
            <Plus className="w-4 h-4" />Registrar Desvio
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    { title: 'Abertos',        value: stats.abertos,                           icon: AlertTriangle, variant: 'info',     sub: 'Aguardando tratativa' },
    { title: 'Fechados',       value: fechados,                                icon: CheckCircle2,  variant: 'success',  sub: 'Desvios encerrados' },
    { title: 'Vencidos',       value: stats.vencidos,                          icon: ShieldAlert,   variant: stats.vencidos > 0 ? 'critical' : 'default', sub: 'Prazo ultrapassado' },
    { title: 'Taxa Tratativa', value: formatPercent(stats.taxa_tratativa),     icon: Activity,      variant: stats.taxa_tratativa >= 70 ? 'success' : 'warning', sub: 'Desvios respondidos' },
  ] as const

  const variantMap = {
    default: { card: 'border-zinc-800',      icon: 'bg-zinc-800',       ic: 'text-zinc-400'  },
    info:    { card: 'stat-card-info',        icon: 'bg-blue-500/10',    ic: 'text-blue-400'  },
    warning: { card: 'stat-card-warning',     icon: 'bg-yellow-500/10',  ic: 'text-yellow-400'},
    critical:{ card: 'stat-card-critical',    icon: 'bg-red-500/10',     ic: 'text-red-400'   },
    success: { card: 'stat-card-success',     icon: 'bg-green-500/10',   ic: 'text-green-400' },
  }

  return (
    <div className="space-y-5">
      {/* Header + Obra Filter */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-50">Dashboard HSE</h1>
          <p className="text-sm text-zinc-500">
            {obraFiltro === 'all'
              ? `${obras.length} obra${obras.length !== 1 ? 's' : ''} · ${desvios.length} desvio${desvios.length !== 1 ? 's' : ''}`
              : `${obraAtual?.nome} · ${desviosFiltrados.length} desvio${desviosFiltrados.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        {/* Obra selector */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <select
            value={obraFiltro}
            onChange={e => setObraFiltro(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 text-sm focus:outline-none appearance-none cursor-pointer min-w-[180px]"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2371717A\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="all">Todas as Obras</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          {obraFiltro !== 'all' && (
            <button onClick={() => setObraFiltro('all')}
              className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" title="Limpar filtro">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card, i) => {
          const v = variantMap[card.variant]
          return (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn('rounded-2xl border bg-zinc-900 p-5 hover:shadow-card-hover transition-all', v.card)}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', v.icon)}>
                <card.icon className={cn('w-5 h-5', v.ic)} />
              </div>
              <p className="text-2xl font-black text-zinc-50">
                {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
              </p>
              <p className="text-sm text-zinc-400 mt-0.5">{card.title}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{card.sub}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Charts section */}
      {desviosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Status donut */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm font-semibold text-zinc-200 mb-0.5">Por Status</p>
            <p className="text-xs text-zinc-500 mb-4">Distribuição atual</p>
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-32 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={56}
                      paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-zinc-50">{stats.total}</span>
                  <span className="text-[10px] text-zinc-500">total</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {statusData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-zinc-400 flex-1 truncate">{d.name}</span>
                    <span className="text-xs font-bold text-zinc-100 flex-shrink-0">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Gravidade bars — with value labels */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.40 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm font-semibold text-zinc-200 mb-0.5">Por Gravidade</p>
            <p className="text-xs text-zinc-500 mb-4">Classificação dos desvios</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={gravidadeData} barSize={36} margin={{ top: 22, right: 20, bottom: 0, left: -28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="total" name="Desvios" radius={[6, 6, 0, 0]}>
                  {gravidadeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  <LabelList dataKey="total" position="top" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Evolução mensal */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-2 xl:col-span-1">
            <p className="text-sm font-semibold text-zinc-200 mb-0.5">Evolução Mensal</p>
            <p className="text-xs text-zinc-500 mb-4">Últimos 6 meses</p>
            <ResponsiveContainer width="100%" height={185}>
              <LineChart data={evolucaoData} margin={{ top: 20, right: 10, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="mes" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span style={{ color: '#A1A1AA', fontSize: 11 }}>{v}</span>} />
                <Line type="monotone" dataKey="abertos" name="Abertos" stroke={MSE_RED} strokeWidth={2.5}
                  dot={{ r: 3, fill: MSE_RED, strokeWidth: 0 }} activeDot={{ r: 5 }}>
                  <LabelList dataKey="abertos" position="top" style={{ fill: MSE_RED, fontSize: 10, fontWeight: 700 }} />
                </Line>
                <Line type="monotone" dataKey="concluidos" name="Concluídos" stroke="#22C55E" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#22C55E', strokeWidth: 0 }} activeDot={{ r: 5 }}>
                  <LabelList dataKey="concluidos" position="bottom" style={{ fill: '#22C55E', fontSize: 10, fontWeight: 700 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Desvios por Encarregado — principal */}
          {encarregadoData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-2">
              <p className="text-sm font-semibold text-zinc-200 mb-0.5">Por Encarregado</p>
              <p className="text-xs text-zinc-500 mb-4">Desvios por responsável de área</p>
              <ResponsiveContainer width="100%" height={Math.max(160, encarregadoData.length * 38)}>
                <BarChart data={encarregadoData} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="total" name="Desvios" fill={MSE_RED} radius={[0, 6, 6, 0]}>
                    <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Obras ranking — só mostra quando filtro = todas */}
          {obraFiltro === 'all' && obrasData.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 xl:col-span-2">
              <p className="text-sm font-semibold text-zinc-200 mb-0.5">Desvios por Obra</p>
              <p className="text-xs text-zinc-500 mb-4">Ranking das obras com mais ocorrências</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={obrasData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend formatter={v => <span style={{ color: '#A1A1AA', fontSize: 11 }}>{v}</span>} />
                  <Bar dataKey="total" name="Total" fill={MSE_RED} radius={[4, 4, 0, 0]} barSize={18}>
                    <LabelList dataKey="total" position="top" style={{ fill: '#E8291C', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                  <Bar dataKey="abertos" name="Abertos" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={18}>
                    <LabelList dataKey="abertos" position="top" style={{ fill: '#3B82F6', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                  <Bar dataKey="criticos" name="Críticos" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={18}>
                    <LabelList dataKey="criticos" position="top" style={{ fill: '#EF4444', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}


          {/* Por TST */}
          {tstData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm font-semibold text-zinc-200 mb-0.5">Por TST</p>
              <p className="text-xs text-zinc-500 mb-4">Desvios por Técnico de Segurança</p>
              <ResponsiveContainer width="100%" height={Math.max(160, tstData.length * 34)}>
                <BarChart data={tstData} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="total" name="Desvios" fill="#06B6D4" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      )}

      {/* No data for filtered obra */}
      {desviosFiltrados.length === 0 && desvios.length > 0 && obraFiltro !== 'all' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 flex flex-col items-center justify-center py-16 gap-3">
          <Building2 className="w-8 h-8 text-zinc-600" />
          <p className="text-zinc-400 font-semibold">Nenhum desvio para {obraAtual?.nome}</p>
          <button onClick={() => router.push('/desvios/novo')}
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-all text-white"
            style={{ background: '#E8291C' }}>
            Registrar Desvio
          </button>
        </div>
      )}

      {/* Recent desvios link */}
      {desviosFiltrados.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-300">
            {obraFiltro !== 'all' && `Desvios de ${obraAtual?.nome}`}
          </p>
          <button onClick={() => router.push('/desvios')} className="text-sm font-semibold transition-colors hover:opacity-70"
            style={{ color: '#E8291C' }}>
            Ver todos os desvios →
          </button>
        </div>
      )}
    </div>
  )
}
