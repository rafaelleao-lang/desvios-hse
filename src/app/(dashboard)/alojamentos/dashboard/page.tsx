'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { alojamentosDB, alojamentoLocaisDB } from '@/lib/db-alojamentos'
import { computeAlojamentoStatus } from '@/lib/alojamento-status'
import { ALOJAMENTO_ITENS_CONFIG } from '@/types/alojamentos'
import type { Alojamento, AlojamentoItemStats, AlojamentoLocal } from '@/types/alojamentos'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LabelList, ComposedChart, Line,
} from 'recharts'
import { BedDouble, CheckCircle2, XCircle, Clock, ClipboardList, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

const ALOJ_COLOR = '#6366F1'
const GREEN = '#10B981'
const RED = '#E8291C'
const AMBER = '#F59E0B'
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatDateBR(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Enumera os meses (1º dia de cada) entre duas datas, inclusive, com teto de
// segurança para o filtro "de/até" não gerar um gráfico gigante por engano.
function enumerarMeses(inicioStr: string, fimStr: string): Date[] {
  const inicio = new Date(`${inicioStr}T00:00:00`)
  const fim = new Date(`${fimStr}T00:00:00`)
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime()) || inicio > fim) return []
  const meses: Date[] = []
  let cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  const ultimo = new Date(fim.getFullYear(), fim.getMonth(), 1)
  while (cur <= ultimo && meses.length < 36) {
    meses.push(new Date(cur))
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }
  return meses
}

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
  const [locais, setLocais] = useState<AlojamentoLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [obraFiltro, setObraFiltro] = useState('')
  const [periodoMeses, setPeriodoMeses] = useState(12)
  const [showFilters, setShowFilters] = useState(false)

  const hoje = new Date()
  const [dataInicioFiltro, setDataInicioFiltro] = useState(
    new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1).toISOString().split('T')[0],
  )
  const [dataFimFiltro, setDataFimFiltro] = useState(hoje.toISOString().split('T')[0])

  useEffect(() => {
    let active = true
    Promise.all([alojamentosDB.list(), alojamentosDB.statsPorItem(), alojamentoLocaisDB.list()])
      .then(([list, stats, locs]) => {
        if (!active) return
        setAlojamentos(list)
        setItemStats(stats)
        setLocais(locs)
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

  const locaisFiltrados = useMemo(
    () => locais.filter(l => !obraFiltro || l.obra_id === obraFiltro),
    [locais, obraFiltro],
  )

  const relatoriosPorLocal = useMemo(() => {
    const map = new Map<string, Alojamento[]>()
    for (const r of alojamentos) {
      if (!r.alojamento_local_id) continue
      if (!map.has(r.alojamento_local_id)) map.set(r.alojamento_local_id, [])
      map.get(r.alojamento_local_id)!.push(r)
    }
    return map
  }, [alojamentos])

  // Status atual (agora) de cada alojamento cadastrado — conforme/vigente,
  // com prazo (não conforme) ou pendente (nunca vistoriado / vencido)
  const statusAlojamentos = useMemo(() => {
    let vigente = 0, prazoOk = 0, prazoVencido = 0, pendente = 0
    for (const l of locaisFiltrados) {
      const info = computeAlojamentoStatus(relatoriosPorLocal.get(l.id) ?? [])
      if (info.status === 'vigente') vigente++
      else if (info.status === 'prazo_ok') prazoOk++
      else if (info.status === 'prazo_vencido') prazoVencido++
      else pendente++
    }
    const total = locaisFiltrados.length
    const naoConforme = prazoOk + prazoVencido
    const pctConforme = total > 0 ? Math.round((vigente / total) * 100) : 0
    return { vigente, prazoOk, prazoVencido, naoConforme, pendente, total, pctConforme }
  }, [locaisFiltrados, relatoriosPorLocal])

  // Evolução do status dos alojamentos entre as datas do filtro (De/Até)
  const evolucaoStatusAlojamentos = useMemo(() => {
    const meses = enumerarMeses(dataInicioFiltro, dataFimFiltro)
    return meses.map(dt => {
      const fimDoMes = new Date(dt.getFullYear(), dt.getMonth() + 1, 0, 23, 59, 59)

      let conforme = 0, naoConforme = 0, pendente = 0
      for (const l of locaisFiltrados) {
        if (new Date(l.criado_em) > fimDoMes) continue // ainda não existia nesse mês
        const relatoriosAteAqui = (relatoriosPorLocal.get(l.id) ?? [])
          .filter(r => new Date(r.data_vistoria) <= fimDoMes)
        const info = computeAlojamentoStatus(relatoriosAteAqui, fimDoMes)
        if (info.status === 'vigente') conforme++
        else if (info.status === 'prazo_ok' || info.status === 'prazo_vencido') naoConforme++
        else pendente++
      }
      return {
        label: MONTHS[dt.getMonth()] + '/' + String(dt.getFullYear()).slice(2),
        conforme, naoConforme, pendente,
      }
    })
  }, [locaisFiltrados, relatoriosPorLocal, dataInicioFiltro, dataFimFiltro])

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
                  <label className="text-xs text-zinc-500 mb-1 block">Período (Evolução Mensal de Relatórios)</label>
                  <select className={inputCls} value={periodoMeses} onChange={e => setPeriodoMeses(Number(e.target.value))}>
                    <option value={3}>3 meses</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                    <option value={24}>24 meses</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Conformidade dos Alojamentos — De</label>
                  <input type="date" className={inputCls} value={dataInicioFiltro} onChange={e => setDataInicioFiltro(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Conformidade dos Alojamentos — Até</label>
                  <input type="date" className={inputCls} value={dataFimFiltro} onChange={e => setDataFimFiltro(e.target.value)} />
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

      {/* KPIs de Alojamentos (cadastrados) */}
      <div>
        <h2 className="text-sm font-bold text-zinc-300 mb-3">Alojamentos Cadastrados</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total Cadastrado" value={statusAlojamentos.total} sub="Alojamentos no filtro" icon={BedDouble} color={ALOJ_COLOR} />
          <KpiCard label="Conformes (Vigentes)" value={statusAlojamentos.vigente} sub={`${statusAlojamentos.pctConforme}% do total`} icon={CheckCircle2} color={GREEN} />
          <KpiCard label="Não Conformes (c/ prazo)" value={statusAlojamentos.naoConforme} sub={`${statusAlojamentos.prazoVencido} com prazo vencido`} icon={XCircle} color={RED} />
          <KpiCard label="Pendentes" value={statusAlojamentos.pendente} sub="Nunca vistoriados ou vencidos" icon={Clock} color={AMBER} />
        </div>
      </div>

      {/* Alojamentos: Conforme x Não Conforme x Pendente — barras + linha de tendência */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-zinc-200 mb-1">Alojamentos: Conforme × Não Conforme × Pendente</h3>
        <p className="text-[11px] text-zinc-600 mb-3">
          Barras = quantidade de alojamentos em cada status ao final do mês. Linha = tendência de cada série.
          Período: {formatDateBR(dataInicioFiltro)} até {formatDateBR(dataFimFiltro)}.
        </p>
        {evolucaoStatusAlojamentos.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">Ajuste o período — a data inicial não pode ser depois da final.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={evolucaoStatusAlojamentos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="conforme" name="Conforme" fill={GREEN} radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="naoConforme" name="Não Conforme" fill={RED} radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="pendente" name="Pendente Vistoria" fill={AMBER} radius={[4, 4, 0, 0]} barSize={18} />
              <Line type="monotone" dataKey="conforme" name="Conforme (tendência)" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="naoConforme" name="Não Conforme (tendência)" stroke={RED} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="pendente" name="Pendente (tendência)" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* KPIs */}
      <div>
        <h2 className="text-sm font-bold text-zinc-300 mb-3">Itens Avaliados nos Relatórios</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Relatórios" value={kpis.totalRelatorios} sub="Total no filtro" icon={ClipboardList} color={ALOJ_COLOR} />
          <KpiCard label="Itens Conformes" value={kpis.totalConformes} sub={`${kpis.pctConformidade}% do total avaliado`} icon={CheckCircle2} color={GREEN} />
          <KpiCard label="Itens Não Conformes" value={kpis.totalNaoConformes} sub="Somatório de todos os relatórios" icon={XCircle} color={RED} />
          <KpiCard label="Itens Avaliados" value={kpis.totalItens} sub="Em todos os relatórios" icon={BedDouble} color="#8B5CF6" />
        </div>
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
