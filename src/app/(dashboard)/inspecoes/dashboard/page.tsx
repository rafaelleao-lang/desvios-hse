'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/contexts/AppContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area, LabelList,
} from 'recharts'
import {
  ClipboardCheck, AlertCircle, CheckCircle2, TrendingUp,
  Building2, Users, Eye, ShieldAlert, ThumbsUp, Filter, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

const INSP_GREEN = '#10B981'
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

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

export default function InspDashboardPage() {
  const { inspecoes, inspecoesME, obras, tsts, encarregados, coordenadores, loaded } = useApp()

  const [obraFiltro, setObraFiltro] = useState('')
  const [periodoMeses, setPeriodoMeses] = useState(12)
  const [showFilters, setShowFilters] = useState(false)
  const [periodoEvo, setPeriodoEvo] = useState<'mes' | 'semana'>('mes')

  const filtered = useMemo(() => {
    return inspecoes.filter(i => !obraFiltro || i.obra_id === obraFiltro)
  }, [inspecoes, obraFiltro])

  const filteredME = useMemo(() => {
    return inspecoesME.filter(i => !obraFiltro || i.obra_id === obraFiltro)
  }, [inspecoesME, obraFiltro])

  // KPIs
  const kpis = useMemo(() => {
    const totalPadrao = filtered.length
    const totalME = filteredME.length
    const total = totalPadrao + totalME
    const emAberto = filtered.filter(i => i.status === 'em_aberto').length
    const concluidas = filtered.filter(i => i.status === 'concluida').length + filteredME.filter(i => i.status === 'concluida').length
    const totalDesvios = filtered.reduce((a, i) => a + i.total_desvios, 0)
    const totalNaoConf = filteredME.reduce((a, i) => a + i.total_nao_conformes, 0)
    const totalReconh = filtered.reduce((a, i) => a + i.total_reconhecimentos, 0)
    const totalEvidencias = totalDesvios + totalReconh
    const taxaDesvio = totalEvidencias > 0 ? Math.round((totalDesvios / totalEvidencias) * 100) : 0
    return { total, totalPadrao, totalME, emAberto, concluidas, totalDesvios, totalNaoConf, totalReconh, taxaDesvio }
  }, [filtered, filteredME])

  // Evolução mensal
  const evolucaoMensal = useMemo(() => {
    return Array.from({ length: periodoMeses }, (_, i) => {
      const dt = new Date()
      dt.setMonth(dt.getMonth() - (periodoMeses - 1 - i))
      const mes = dt.toISOString().slice(0, 7)
      const mesInsp = filtered.filter(insp => insp.data_inspecao.startsWith(mes))
      const mesME = filteredME.filter(insp => insp.data_inspecao.startsWith(mes))
      return {
        label: MONTHS[dt.getMonth()] + '/' + String(dt.getFullYear()).slice(2),
        inspecoes: mesInsp.length + mesME.length,
        padrao: mesInsp.length,
        me: mesME.length,
        desvios: mesInsp.reduce((a, i) => a + i.total_desvios, 0),
        reconhecimentos: mesInsp.reduce((a, i) => a + i.total_reconhecimentos, 0),
      }
    })
  }, [filtered, filteredME, periodoMeses])

  // Evolução semanal (últimas 12 semanas)
  const evolucaoSemanal = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const dt = new Date()
      dt.setDate(dt.getDate() - (11 - i) * 7)
      const weekStart = new Date(dt)
      weekStart.setDate(dt.getDate() - dt.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const ws = weekStart.toISOString().split('T')[0]
      const we = weekEnd.toISOString().split('T')[0]
      const weekInsp = filtered.filter(insp => insp.data_inspecao >= ws && insp.data_inspecao <= we)
      return {
        label: `S${i + 1}`,
        inspecoes: weekInsp.length,
        desvios: weekInsp.reduce((a, i) => a + i.total_desvios, 0),
        reconhecimentos: weekInsp.reduce((a, i) => a + i.total_reconhecimentos, 0),
      }
    })
  }, [filtered])

  // Por encarregado
  const porEncarregado = useMemo(() => {
    const encList = obraFiltro ? encarregados.filter(e => e.obra_id === obraFiltro) : encarregados
    return encList.map(enc => {
      const encInsp = filtered.filter(i => i.encarregado_id === enc.id)
      return {
        nome: enc.nome.length > 22 ? enc.nome.slice(0, 21) + '…' : enc.nome,
        nomeCompleto: enc.nome,
        desvios: encInsp.reduce((a, i) => a + i.total_desvios, 0),
        reconhecimentos: encInsp.reduce((a, i) => a + i.total_reconhecimentos, 0),
        inspecoes: encInsp.length,
      }
    }).filter(e => e.inspecoes > 0).sort((a, b) => (b.desvios + b.reconhecimentos) - (a.desvios + a.reconhecimentos)).slice(0, 10)
  }, [filtered, encarregados, obraFiltro])

  // Por coordenador
  const porCoordenador = useMemo(() => {
    const coordList = obraFiltro ? coordenadores.filter(c => c.obra_id === obraFiltro) : coordenadores
    return coordList.map(coord => {
      const cInsp = filtered.filter(i => i.coordenador_id === coord.id)
      return {
        nome: coord.nome.length > 22 ? coord.nome.slice(0, 21) + '…' : coord.nome,
        nomeCompleto: coord.nome,
        desvios: cInsp.reduce((a, i) => a + i.total_desvios, 0),
        reconhecimentos: cInsp.reduce((a, i) => a + i.total_reconhecimentos, 0),
        inspecoes: cInsp.length,
      }
    }).filter(c => c.inspecoes > 0).sort((a, b) => b.inspecoes - a.inspecoes).slice(0, 8)
  }, [filtered, coordenadores, obraFiltro])

  // Por TST (inspetor)
  const porTst = useMemo(() => {
    const tstList = obraFiltro ? tsts.filter(t => t.obra_id === obraFiltro) : tsts
    return tstList.map(tst => ({
      nome: tst.nome.length > 22 ? tst.nome.slice(0, 21) + '…' : tst.nome,
      nomeCompleto: tst.nome,
      inspecoes: filtered.filter(i => i.tst_id === tst.id).length,
      desvios: filtered.filter(i => i.tst_id === tst.id).reduce((a, i) => a + i.total_desvios, 0),
    })).filter(t => t.inspecoes > 0).sort((a, b) => b.inspecoes - a.inspecoes).slice(0, 8)
  }, [filtered, tsts, obraFiltro])

  // Por obra
  const porObra = useMemo(() => {
    return obras.filter(o => o.ativa).map(obra => {
      const oInsp = filtered.filter(i => i.obra_id === obra.id)
      return {
        nome: obra.nome.length > 14 ? obra.nome.slice(0, 13) + '…' : obra.nome,
        nomeCompleto: obra.nome,
        inspecoes: oInsp.length,
        desvios: oInsp.reduce((a, i) => a + i.total_desvios, 0),
        reconhecimentos: oInsp.reduce((a, i) => a + i.total_reconhecimentos, 0),
      }
    }).filter(o => o.inspecoes > 0).sort((a, b) => b.inspecoes - a.inspecoes).slice(0, 8)
  }, [filtered, obras])

  // % desvio vs reconhecimento por encarregado
  const taxaDesvioEnc = useMemo(() => {
    return porEncarregado.map(e => ({
      nome: e.nome,
      total: e.desvios + e.reconhecimentos,
      pct: e.desvios + e.reconhecimentos > 0 ? Math.round((e.desvios / (e.desvios + e.reconhecimentos)) * 100) : 0,
    })).sort((a, b) => b.pct - a.pct)
  }, [porEncarregado])

  // Desvios vs Reconhecimentos donut
  const donutData = [
    { name: 'Desvios', value: kpis.totalDesvios, color: '#EF4444' },
    { name: 'Reconhecimentos', value: kpis.totalReconh, color: INSP_GREEN },
  ]

  const inputCls = 'h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30'

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const evoData = periodoEvo === 'mes' ? evolucaoMensal : evolucaoSemanal

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: INSP_GREEN + '20' }}>
            <ClipboardCheck className="w-4 h-4" style={{ color: INSP_GREEN }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Dashboard Inspeções</h1>
            <p className="text-xs text-zinc-500">{filtered.length} inspeção(ões)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
              showFilters || obraFiltro
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Obra</label>
                <select className={inputCls} value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}>
                  <option value="">Todas as obras</option>
                  {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Período (meses)</label>
                <select className={inputCls} value={periodoMeses} onChange={e => setPeriodoMeses(Number(e.target.value))}>
                  {[3, 6, 12, 24].map(m => <option key={m} value={m}>Últimos {m} meses</option>)}
                </select>
              </div>
              {obraFiltro && (
                <button onClick={() => setObraFiltro('')} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 mt-5">
                  <X className="w-3 h-3" /> Limpar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Inspeções" value={kpis.total} sub={`${kpis.totalPadrao} Padrão · ${kpis.totalME} M&E`} icon={ClipboardCheck} color={INSP_GREEN} />
        <KpiCard label="Em Aberto" value={kpis.emAberto} sub="Com desvios pendentes" icon={AlertCircle} color="#F59E0B" />
        <KpiCard label="Concluídas" value={kpis.concluidas} sub="Padrão + M&E" icon={CheckCircle2} color="#3B82F6" />
        <KpiCard label="Total Desvios" value={kpis.totalDesvios} sub="Inspeções Padrão" icon={ShieldAlert} color="#EF4444" />
        <KpiCard label="Reconhecimentos" value={kpis.totalReconh} sub="Boas práticas" icon={ThumbsUp} color={INSP_GREEN} />
        <KpiCard label="NC em M&E" value={kpis.totalNaoConf} sub="Itens não conformes" icon={TrendingUp} color="#F97316" />
      </div>

      {/* Evolução com toggle mês/semana */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Curva de Evolução</h3>
            <p className="text-xs text-zinc-500">Inspeções, desvios e reconhecimentos ao longo do tempo</p>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-zinc-700">
            {(['mes', 'semana'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodoEvo(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-all',
                  periodoEvo === p ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:bg-zinc-800',
                )}
              >
                {p === 'mes' ? 'Mês' : 'Semana'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={evoData}>
            <defs>
              <linearGradient id="gInsp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={INSP_GREEN} stopOpacity={0.3} />
                <stop offset="95%" stopColor={INSP_GREEN} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gDesv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
            <Area type="monotone" dataKey="inspecoes" name="Inspeções" stroke={INSP_GREEN} fill="url(#gInsp)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="desvios" name="Desvios" stroke="#EF4444" fill="url(#gDesv)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="reconhecimentos" name="Reconhec." stroke="#3B82F6" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Row: Donut + Por Obra */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Donut desvios vs reconhecimentos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">Desvios vs Reconhecimentos</h3>
          <p className="text-xs text-zinc-500 mb-4">Distribuição total das evidências</p>
          <div className="flex items-center gap-6 justify-center mt-2">
            {/* Donut com total no centro */}
            <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-black text-zinc-100">{kpis.totalDesvios + kpis.totalReconh}</p>
                <p className="text-xs text-zinc-500">total</p>
              </div>
            </div>
            {/* Legenda com valores */}
            <div className="flex flex-col gap-3 min-w-[140px]">
              {donutData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-sm text-zinc-400 flex-1">{item.name}</span>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Por obra */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">Inspeções por Obra</h3>
          <p className="text-xs text-zinc-500 mb-4">Desvios e reconhecimentos por obra</p>
          {porObra.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-zinc-600 text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, porObra.length * 36 + 40)}>
              <BarChart data={porObra} layout="vertical" margin={{ left: 0, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="desvios" name="Desvios" fill="#EF4444" radius={[0, 3, 3, 0]} maxBarSize={14}>
                  <LabelList dataKey="desvios" position="right" style={{ fill: '#EF4444', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="reconhecimentos" name="Reconhec." fill={INSP_GREEN} radius={[0, 3, 3, 0]} maxBarSize={14}>
                  <LabelList dataKey="reconhecimentos" position="right" style={{ fill: INSP_GREEN, fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Por Encarregado */}
      {porEncarregado.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">Encarregado × Desvios × Reconhecimentos</h3>
          <p className="text-xs text-zinc-500 mb-4">Comparativo por responsável</p>
          <ResponsiveContainer width="100%" height={Math.max(200, porEncarregado.length * 40 + 50)}>
            <BarChart data={porEncarregado} layout="vertical" margin={{ left: 0, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={130} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
              <Bar dataKey="desvios" name="Desvios" fill="#EF4444" radius={[0, 3, 3, 0]} maxBarSize={14}>
                <LabelList dataKey="desvios" position="right" style={{ fill: '#EF4444', fontSize: 10, fontWeight: 'bold' }} />
              </Bar>
              <Bar dataKey="reconhecimentos" name="Reconhecimentos" fill={INSP_GREEN} radius={[0, 3, 3, 0]} maxBarSize={14}>
                <LabelList dataKey="reconhecimentos" position="right" style={{ fill: INSP_GREEN, fontSize: 10, fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* % Desvio por Encarregado */}
      {taxaDesvioEnc.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">% Desvios por Encarregado</h3>
          <p className="text-xs text-zinc-500 mb-4">Proporção de desvios em relação ao total de evidências</p>
          <div className="space-y-3">
            {taxaDesvioEnc.map(e => (
              <div key={e.nome}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300 font-medium">{e.nome}</span>
                  <span className="text-zinc-500">{e.pct}% desvios ({e.total} total)</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${e.pct}%`,
                      background: e.pct > 70 ? '#EF4444' : e.pct > 40 ? '#F59E0B' : INSP_GREEN,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row: Por TST + Por Coordenador */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Por TST */}
        {porTst.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">Inspeções por TST</h3>
            <p className="text-xs text-zinc-500 mb-4">Quantidade de inspeções realizadas por inspetor</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porTst} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={130} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="inspecoes" name="Inspeções" fill="#06B6D4" radius={[0, 3, 3, 0]} maxBarSize={16}>
                  <LabelList dataKey="inspecoes" position="right" style={{ fill: '#06B6D4', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="desvios" name="Desvios" fill="#EF4444" radius={[0, 3, 3, 0]} maxBarSize={16}>
                  <LabelList dataKey="desvios" position="right" style={{ fill: '#EF4444', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Por Coordenador */}
        {porCoordenador.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">Coordenador × Desvios × Reconhecimentos</h3>
            <p className="text-xs text-zinc-500 mb-4">Visão por coordenador responsável</p>
            <ResponsiveContainer width="100%" height={Math.max(220, porCoordenador.length * 40 + 50)}>
              <BarChart data={porCoordenador} layout="vertical" margin={{ left: 0, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={130} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                <Bar dataKey="inspecoes" name="Inspeções" fill="#8B5CF6" radius={[0, 3, 3, 0]} maxBarSize={14}>
                  <LabelList dataKey="inspecoes" position="right" style={{ fill: '#8B5CF6', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="desvios" name="Desvios" fill="#EF4444" radius={[0, 3, 3, 0]} maxBarSize={14}>
                  <LabelList dataKey="desvios" position="right" style={{ fill: '#EF4444', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="reconhecimentos" name="Reconhec." fill={INSP_GREEN} radius={[0, 3, 3, 0]} maxBarSize={14}>
                  <LabelList dataKey="reconhecimentos" position="right" style={{ fill: INSP_GREEN, fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Status inspeções donut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">Status das Inspeções</h3>
          <p className="text-xs text-zinc-500 mb-4">Em aberto vs concluídas</p>
          {(() => {
            const statusData = [
              { name: 'Em Aberto', value: kpis.emAberto, color: '#F59E0B' },
              { name: 'Concluídas', value: kpis.concluidas, color: INSP_GREEN },
            ]
            const statusTotal = kpis.emAberto + kpis.concluidas
            return (
              <div className="flex items-center gap-4 justify-center mt-2">
                <div className="relative flex-shrink-0" style={{ width: 130, height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                        {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xl font-black text-zinc-100">{statusTotal}</p>
                    <p className="text-[10px] text-zinc-500">total</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  {statusData.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-xs text-zinc-400 flex-1">{item.name}</span>
                      <span className="text-xs font-bold ml-2" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Top obras por desvios */}
        <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">Ranking de Obras</h3>
          <p className="text-xs text-zinc-500 mb-4">Por total de desvios encontrados</p>
          <div className="space-y-2.5">
            {porObra.sort((a, b) => b.desvios - a.desvios).slice(0, 5).map((obra, i) => {
              const maxD = Math.max(...porObra.map(o => o.desvios), 1)
              return (
                <div key={obra.nomeCompleto}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300 font-medium flex items-center gap-2">
                      <span className="text-zinc-600 font-mono">#{i + 1}</span>
                      {obra.nomeCompleto}
                    </span>
                    <span className="text-red-400 font-bold">{obra.desvios} desvios</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(obra.desvios / maxD) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
