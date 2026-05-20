'use client'

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend,
  LabelList,
} from 'recharts'
import {
  Filter, Download, X, Search, Building2, Users, AlertTriangle,
  Clock, TrendingUp, ChevronDown, FileText, Printer, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts/AppContext'
import { filtrarDesvios, exportarCSV } from '@/lib/db'
import type { FiltrosRelatorio } from '@/lib/db'
import { CATEGORIAS_PADRAO, CATEGORIAS_CORES } from '@/types'
import type { GravidadeDesvio, StatusDesvio } from '@/types'
import {
  cn, STATUS_CONFIG, GRAVIDADE_CONFIG,
  formatDate, formatDateTime, generateDesvioId, getSlaColor, getSlaLabel,
} from '@/lib/utils'

const MSE_RED = '#E8291C'

const STATUS_HEX: Record<string, string> = {
  aberto:       '#60A5FA',
  em_tratativa: '#FBBF24',
  pendente:     '#FB923C',
  concluido:    '#4ADE80',
  fechado:      '#A1A1AA',
  reincidente:  '#F87171',
}
const GRAV_HEX: Record<string, string> = {
  baixo:   '#34D399',
  medio:   '#FACC15',
  alto:    '#FB923C',
  critico: '#F87171',
}

const PER_PAGE = 15
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-zinc-400 mb-1 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold text-zinc-100">
          {p.name && p.name !== 'total' ? `${p.name}: ` : ''}{p.value}
        </p>
      ))}
    </div>
  )
}

// Print tooltip (light theme)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PrintTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-gray-500 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold text-gray-900">{p.value}</p>
      ))}
    </div>
  )
}

const TABS = [
  { id: 'resumo',      label: 'Resumo'          },
  { id: 'encarregado', label: 'Por Encarregado' },
  { id: 'obra',        label: 'Por Obra'         },
  { id: 'categoria',   label: 'Por Categoria'    },
  { id: 'tst',         label: 'Por TST'          },
  { id: 'tabela',      label: 'Tabela'           },
] as const
type TabId = typeof TABS[number]['id']

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-mse-500/30'

// ── PDF Print Report ────────────────────────────────────────────────────────
interface PrintReportProps {
  filtered: ReturnType<typeof filtrarDesvios>
  filtros: FiltrosRelatorio
  obras: ReturnType<typeof useApp>['obras']
  onClose: () => void
}

function PrintReport({ filtered, filtros, obras, onClose }: PrintReportProps) {
  const hoje = new Date()

  // Aggregates
  const kpis = {
    total:        filtered.length,
    abertos:      filtered.filter(d => d.status === 'aberto').length,
    em_tratativa: filtered.filter(d => d.status === 'em_tratativa').length,
    criticos:     filtered.filter(d => d.gravidade === 'critico').length,
    vencidos:     filtered.filter(d => d.vencido).length,
    concluidos:   filtered.filter(d => ['concluido','fechado'].includes(d.status)).length,
    reincidentes: filtered.filter(d => d.reincidente || d.status === 'reincidente').length,
    pendentes:    filtered.filter(d => d.status === 'pendente').length,
  }

  const evolucaoData = useMemo(() => {
    const monthly: Record<string, { abertos: number; concluidos: number }> = {}
    filtered.forEach(d => {
      const m = d.data_ocorrencia.slice(0, 7)
      if (!monthly[m]) monthly[m] = { abertos: 0, concluidos: 0 }
      monthly[m].abertos++
      if (['concluido','fechado'].includes(d.status)) monthly[m].concluidos++
    })
    return Object.entries(monthly).sort().map(([m, v]) => ({
      mes: `${MONTHS[parseInt(m.split('-')[1]) - 1]}/${m.slice(2, 4)}`, ...v,
    }))
  }, [filtered])

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1 })
    return Object.entries(counts).map(([s, n]) => ({
      name: STATUS_CONFIG[s as StatusDesvio]?.label || s, value: n, fill: STATUS_HEX[s] || '#666',
    }))
  }, [filtered])

  const gravidadeData = useMemo(() =>
    (['baixo','medio','alto','critico'] as GravidadeDesvio[]).map(g => ({
      name: GRAVIDADE_CONFIG[g].label,
      total: filtered.filter(d => d.gravidade === g).length,
      fill: GRAV_HEX[g],
    })), [filtered])

  const encData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(d => { const n = d.encarregado_nome_computado; if (n !== '—') counts[n] = (counts[n] || 0) + 1 })
    return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 12)
  }, [filtered])

  const obraData = useMemo(() => {
    const counts: Record<string, { total: number; abertos: number; criticos: number; fullName: string }> = {}
    filtered.forEach(d => {
      const n = d.obra_nome_computado
      counts[n] = counts[n] || { total: 0, abertos: 0, criticos: 0, fullName: n }
      counts[n].total++
      if (d.status === 'aberto') counts[n].abertos++
      if (d.gravidade === 'critico') counts[n].criticos++
    })
    return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 10)
      .map(o => ({ ...o, name: o.fullName.length > 22 ? o.fullName.slice(0, 22) + '…' : o.fullName }))
  }, [filtered])

  const categoriaData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(d => {
      const cat = d.categoria === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : d.categoria
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).map(([fullName, total]) => ({
      fullName, name: fullName.length > 22 ? fullName.slice(0, 22) + '…' : fullName, total,
      fill: CATEGORIAS_CORES[fullName.startsWith('Outros') ? 'Outros' : fullName] || '#78716C',
    })).sort((a, b) => b.total - a.total)
  }, [filtered])

  const tstData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(d => { const n = d.tst_nome_computado; if (n !== '—') counts[n] = (counts[n] || 0) + 1 })
    return Object.entries(counts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10)
  }, [filtered])

  const filtroDesc = [
    filtros.obra_id && obras.find(o => o.id === filtros.obra_id)?.nome && `Obra: ${obras.find(o => o.id === filtros.obra_id)!.nome}`,
    filtros.status && `Status: ${STATUS_CONFIG[filtros.status as StatusDesvio]?.label || filtros.status}`,
    filtros.gravidade && `Gravidade: ${GRAVIDADE_CONFIG[filtros.gravidade as GravidadeDesvio]?.label || filtros.gravidade}`,
    filtros.categoria && `Categoria: ${filtros.categoria}`,
    (filtros.data_inicio || filtros.data_fim) && `Período: ${filtros.data_inicio || '...'} a ${filtros.data_fim || '...'}`,
    filtros.busca && `Busca: "${filtros.busca}"`,
  ].filter(Boolean).join(' · ') || 'Todos os desvios'

  return (
    <div className="fixed inset-0 bg-white z-[100] overflow-y-auto" id="mse-print-report">
      {/* Actions bar — hidden when printing */}
      <div className="no-print sticky top-0 bg-zinc-900 border-b border-zinc-700 px-6 py-3 flex items-center gap-3 z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-xl font-black" style={{ color: MSE_RED }}>mse</span>
          <span className="text-sm font-semibold text-zinc-300">Relatório HSE</span>
        </div>
        <div className="flex-1" />
        <p className="text-xs text-zinc-500">{filtered.length} desvios · {filtroDesc}</p>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: MSE_RED }}
        >
          <Printer className="w-4 h-4" />
          Imprimir / Salvar PDF
        </button>
        <button onClick={onClose} className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Report content */}
      <div className="max-w-[900px] mx-auto px-8 py-8 text-gray-900">

        {/* Report header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-4xl font-black leading-none" style={{ color: MSE_RED }}>mse</span>
              <p className="text-xs text-gray-400 mt-1">Empresa de Engenharia Industrial</p>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div>
              <h1 className="text-xl font-black text-gray-900">Relatório de Desvios HSE</h1>
              <p className="text-sm text-gray-500">Sistema de Gestão de Segurança do Trabalho</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Gerado em</p>
            <p className="text-sm font-bold text-gray-800">{formatDate(hoje.toISOString())}</p>
            <p className="text-xs text-gray-400">{hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* Filtros aplicados */}
        <div className="mb-6 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Filtros aplicados</p>
          <p className="text-sm text-gray-700 font-medium">{filtroDesc}</p>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-4 gap-3 mb-8 print-avoid-break">
          {[
            { label: 'Total',        value: kpis.total,        color: '#E8291C', bg: '#fff1f0' },
            { label: 'Abertos',      value: kpis.abertos,      color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Em Tratativa', value: kpis.em_tratativa, color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Críticos',     value: kpis.criticos,     color: '#EF4444', bg: '#FEF2F2' },
            { label: 'Concluídos',   value: kpis.concluidos,   color: '#10B981', bg: '#ECFDF5' },
            { label: 'Vencidos',     value: kpis.vencidos,     color: '#F97316', bg: '#FFF7ED' },
            { label: 'Reincidentes', value: kpis.reincidentes, color: '#EF4444', bg: '#FEF2F2' },
            { label: 'Pendentes',    value: kpis.pendentes,    color: '#8B5CF6', bg: '#F5F3FF' },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-3 text-center border" style={{ background: k.bg, borderColor: k.color + '33' }}>
              <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Charts — 2 per row */}

        {/* Row 1: Evolução + Status */}
        <div className="grid grid-cols-2 gap-6 mb-6 print-avoid-break">
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: MSE_RED }} />
              Evolução Mensal
            </h3>
            {evolucaoData.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Sem dados de evolução</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={evolucaoData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="mes" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<PrintTooltip />} />
                  <Line type="monotone" dataKey="abertos" name="Abertos" stroke={MSE_RED} strokeWidth={2}
                    dot={{ fill: MSE_RED, r: 3, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="concluidos" name="Concluídos" stroke="#10B981" strokeWidth={2}
                    dot={{ fill: '#10B981', r: 3, strokeWidth: 0 }} />
                  <Legend formatter={v => <span style={{ color: '#6B7280', fontSize: 10 }}>{v}</span>} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block bg-blue-400" />
              Por Status
            </h3>
            {statusData.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Sem dados</p>
            ) : (
              <div className="flex items-center gap-4">
                <PieChart width={140} height={140}>
                  <Pie data={statusData} dataKey="value" cx={70} cy={70} innerRadius={38} outerRadius={58} paddingAngle={2}>
                    {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<PrintTooltip />} />
                </PieChart>
                <div className="space-y-1.5 flex-1">
                  {statusData.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.fill }} />
                      <span className="text-xs text-gray-600 flex-1">{s.name}</span>
                      <span className="text-xs font-bold text-gray-800">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Gravidade */}
        <div className="mb-6 print-avoid-break">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block bg-orange-400" />
            Por Gravidade
          </h3>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={gravidadeData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis hide />
              <Tooltip content={<PrintTooltip />} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {gravidadeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                <LabelList dataKey="total" position="top" style={{ fill: '#374151', fontSize: 13, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 3: Desvios por Encarregado — PRINCIPAL */}
        <div className="mb-6 print-avoid-break">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: MSE_RED }}>
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: MSE_RED }} />
            Desvios por Encarregado
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: MSE_RED }}>PRINCIPAL</span>
          </h3>
          {encData.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">Sem encarregados associados</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(140, encData.length * 32)}>
                <BarChart data={encData} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 11 }} width={130} />
                  <Tooltip content={<PrintTooltip />} />
                  <Bar dataKey="total" fill={MSE_RED} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="total" position="right" style={{ fill: '#374151', fontSize: 12, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Ranking table */}
              <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: MSE_RED }}>
                      <th className="text-left px-3 py-2 text-white font-semibold">#</th>
                      <th className="text-left px-3 py-2 text-white font-semibold">Encarregado</th>
                      <th className="text-right px-3 py-2 text-white font-semibold">Desvios</th>
                      <th className="text-right px-3 py-2 text-white font-semibold">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encData.map((e, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-1.5 text-gray-400 font-bold">{i + 1}</td>
                        <td className="px-3 py-1.5 text-gray-800 font-medium">{e.name}</td>
                        <td className="px-3 py-1.5 text-right font-black" style={{ color: MSE_RED }}>{e.total}</td>
                        <td className="px-3 py-1.5 text-right text-gray-500">{kpis.total > 0 ? ((e.total / kpis.total) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Row 4: Por Obra + Por TST */}
        <div className="grid grid-cols-2 gap-6 mb-6 print-avoid-break">
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block bg-amber-400" />
              Por Obra
            </h3>
            {obraData.length === 0 ? <p className="text-xs text-gray-400 py-8 text-center">Sem dados</p> : (
              <ResponsiveContainer width="100%" height={Math.max(120, obraData.length * 30)}>
                <BarChart data={obraData} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 9 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 10 }} width={110} />
                  <Tooltip content={<PrintTooltip />} />
                  <Bar dataKey="total" fill="#F59E0B" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="total" position="right" style={{ fill: '#374151', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block bg-cyan-400" />
              Por TST
            </h3>
            {tstData.length === 0 ? <p className="text-xs text-gray-400 py-8 text-center">Sem TSTs associados</p> : (
              <ResponsiveContainer width="100%" height={Math.max(120, tstData.length * 30)}>
                <BarChart data={tstData} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 9 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 10 }} width={100} />
                  <Tooltip content={<PrintTooltip />} />
                  <Bar dataKey="total" fill="#06B6D4" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="total" position="right" style={{ fill: '#374151', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row 5: Por Categoria */}
        <div className="mb-8 print-avoid-break">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block bg-purple-400" />
            Por Categoria
          </h3>
          {categoriaData.length === 0 ? <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={Math.max(120, categoriaData.length * 28)}>
              <BarChart data={categoriaData} layout="vertical" margin={{ top: 4, right: 44, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 9 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 10 }} width={130} />
                <Tooltip content={<PrintTooltip />} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {categoriaData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  <LabelList dataKey="total" position="right" style={{ fill: '#374151', fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Data table */}
        <div className="print-page-break print-avoid-break">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block bg-gray-400" />
            Lista Completa de Desvios
            <span className="text-xs text-gray-400 font-normal">({filtered.length} registros)</span>
          </h3>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: MSE_RED }}>
                  {['#','Data','Obra','Categoria','Gravidade','Status','Encarregado','SLA'].map(h => (
                    <th key={h} className="text-left px-2.5 py-2 text-white font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2.5 py-1.5 font-mono font-bold text-[10px]" style={{ color: MSE_RED }}>
                      {generateDesvioId(d.numero)}
                    </td>
                    <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">{formatDate(d.data_ocorrencia)}</td>
                    <td className="px-2.5 py-1.5 text-gray-800 max-w-[120px] truncate">{d.obra_nome_computado}</td>
                    <td className="px-2.5 py-1.5 text-gray-600 max-w-[90px] truncate">{d.categoria}</td>
                    <td className="px-2.5 py-1.5">
                      <span className="font-bold" style={{ color: GRAV_HEX[d.gravidade] || '#666' }}>
                        {GRAVIDADE_CONFIG[d.gravidade]?.label}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{
                        background: (STATUS_HEX[d.status] || '#666') + '22',
                        color: STATUS_HEX[d.status] || '#666',
                      }}>
                        {STATUS_CONFIG[d.status]?.label}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 text-gray-600 max-w-[100px] truncate">{d.encarregado_nome_computado}</td>
                    <td className={cn('px-2.5 py-1.5 font-semibold whitespace-nowrap text-[10px]', getSlaColor(d.dias_para_vencer, d.vencido))}>
                      {getSlaLabel(d.dias_para_vencer, d.vencido)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span className="font-black text-lg" style={{ color: MSE_RED }}>mse</span>
          <span>Relatório gerado em {formatDateTime(hoje.toISOString())} · Sistema de Gestão HSE</span>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const { obras, tsts, encarregados, desviosComputados, loaded } = useApp()

  const [filtros, setFiltros] = useState<FiltrosRelatorio>({})
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('resumo')
  const [page, setPage] = useState(1)
  const [showPrint, setShowPrint] = useState(false)

  const tstOptions = useMemo(() =>
    filtros.obra_id ? tsts.filter(t => t.obra_id === filtros.obra_id) : tsts
  , [tsts, filtros.obra_id])

  const encOptions = useMemo(() =>
    filtros.obra_id ? encarregados.filter(e => e.obra_id === filtros.obra_id) : encarregados
  , [encarregados, filtros.obra_id])

  const filtered = useMemo(() => filtrarDesvios(desviosComputados, filtros), [desviosComputados, filtros])

  const activeFilterCount = useMemo(() =>
    Object.values(filtros).filter(v => v !== undefined && v !== '').length
  , [filtros])

  function setFiltro<K extends keyof FiltrosRelatorio>(key: K, val: FiltrosRelatorio[K]) {
    setFiltros(prev => ({ ...prev, [key]: val || undefined }))
    setPage(1)
  }

  function handleObraChange(id: string) {
    setFiltros(prev => ({ ...prev, obra_id: id || undefined, tst_id: undefined, encarregado_id: undefined }))
    setPage(1)
  }

  function clearFilters() { setFiltros({}); setPage(1) }

  // ── KPIs ──
  const kpis = useMemo(() => ({
    total:        filtered.length,
    abertos:      filtered.filter(d => d.status === 'aberto').length,
    criticos:     filtered.filter(d => d.gravidade === 'critico').length,
    vencidos:     filtered.filter(d => d.vencido).length,
    em_tratativa: filtered.filter(d => d.status === 'em_tratativa').length,
    concluidos:   filtered.filter(d => ['concluido','fechado'].includes(d.status)).length,
    reincidentes: filtered.filter(d => d.reincidente || d.status === 'reincidente').length,
  }), [filtered])

  // ── Charts data ──
  const evolucaoData = useMemo(() => {
    const monthly: Record<string, number> = {}
    filtered.forEach(d => { const m = d.data_ocorrencia.slice(0, 7); monthly[m] = (monthly[m] || 0) + 1 })
    return Object.entries(monthly).sort().map(([m, total]) => ({
      mes: `${MONTHS[parseInt(m.split('-')[1]) - 1]}/${m.slice(2, 4)}`, total,
    }))
  }, [filtered])

  const statusData = useMemo(() => {
    const counts: Partial<Record<string, number>> = {}
    filtered.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1 })
    return Object.entries(counts).map(([s, n]) => ({
      name: STATUS_CONFIG[s as StatusDesvio]?.label || s, value: n as number, fill: STATUS_HEX[s] || '#666',
    }))
  }, [filtered])

  const gravidadeData = useMemo(() =>
    (['baixo','medio','alto','critico'] as GravidadeDesvio[]).map(g => ({
      name: GRAVIDADE_CONFIG[g].label, total: filtered.filter(d => d.gravidade === g).length, fill: GRAV_HEX[g],
    })), [filtered])

  const encData = useMemo(() => {
    const counts: Record<string, { total: number; abertos: number; criticos: number; concluidos: number }> = {}
    filtered.forEach(d => {
      const n = d.encarregado_nome_computado
      if (n === '—') return
      counts[n] = counts[n] || { total: 0, abertos: 0, criticos: 0, concluidos: 0 }
      counts[n].total++
      if (d.status === 'aberto') counts[n].abertos++
      if (d.gravidade === 'critico') counts[n].criticos++
      if (['concluido','fechado'].includes(d.status)) counts[n].concluidos++
    })
    return Object.entries(counts)
      .map(([name, v]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, ...v }))
      .sort((a, b) => b.total - a.total).slice(0, 10)
  }, [filtered])

  const obraData = useMemo(() => {
    const counts: Record<string, { total: number; fullName: string }> = {}
    filtered.forEach(d => {
      const n = d.obra_nome_computado
      counts[n] = counts[n] || { total: 0, fullName: n }
      counts[n].total++
    })
    return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 10)
      .map(o => ({ ...o, name: o.fullName.length > 22 ? o.fullName.slice(0, 22) + '…' : o.fullName }))
  }, [filtered])

  const categoriaData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(d => {
      const cat = d.categoria === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : d.categoria
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).map(([fullName, total]) => ({
      fullName, name: fullName.length > 24 ? fullName.slice(0, 24) + '…' : fullName, total,
      fill: CATEGORIAS_CORES[fullName.startsWith('Outros') ? 'Outros' : fullName] || '#78716C',
    })).sort((a, b) => b.total - a.total)
  }, [filtered])

  const tstChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(d => { const n = d.tst_nome_computado; if (n !== '—') counts[n] = (counts[n] || 0) + 1 })
    return Object.entries(counts).map(([name, total]) => ({
      name: name.length > 22 ? name.slice(0, 22) + '…' : name, total,
    })).sort((a, b) => b.total - a.total).slice(0, 10)
  }, [filtered])

  // SLA analysis
  const slaData = useMemo(() => [
    { name: 'Vencidos', total: filtered.filter(d => d.vencido).length, fill: '#EF4444' },
    { name: 'Vence hoje', total: filtered.filter(d => !d.vencido && d.dias_para_vencer === 0).length, fill: '#F97316' },
    { name: '1-3 dias', total: filtered.filter(d => !d.vencido && d.dias_para_vencer !== null && d.dias_para_vencer >= 1 && d.dias_para_vencer <= 3).length, fill: '#EAB308' },
    { name: '4-7 dias', total: filtered.filter(d => !d.vencido && d.dias_para_vencer !== null && d.dias_para_vencer >= 4 && d.dias_para_vencer <= 7).length, fill: '#22C55E' },
    { name: '>7 dias',  total: filtered.filter(d => !d.vencido && d.dias_para_vencer !== null && d.dias_para_vencer > 7).length, fill: '#3B82F6' },
    { name: 'Sem prazo',total: filtered.filter(d => d.dias_para_vencer === null).length, fill: '#71717A' },
  ], [filtered])

  // Paginated table
  const pageItems = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page])
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  if (!loaded) {
    return <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: `${MSE_RED} transparent transparent transparent` }} />
    </div>
  }

  if (desviosComputados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(232,41,28,0.08)', border: '1px solid rgba(232,41,28,0.15)' }}>
          <TrendingUp className="w-8 h-8" style={{ color: MSE_RED }} />
        </div>
        <div>
          <p className="text-zinc-200 font-semibold text-lg">Nenhum dado ainda</p>
          <p className="text-zinc-500 text-sm mt-1">Cadastre obras e registre desvios para ver os relatórios</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/obras/nova"><Button variant="outline">Cadastrar Obra</Button></Link>
          <Link href="/desvios/novo">
            <Button className="text-white" style={{ background: MSE_RED }}>Registrar Desvio</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Print modal */}
      <AnimatePresence>
        {showPrint && (
          <PrintReport
            filtered={filtered}
            filtros={filtros}
            obras={obras}
            onClose={() => setShowPrint(false)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-zinc-50">Relatórios</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {filtered.length} desvio{filtered.length !== 1 ? 's' : ''}
              {activeFilterCount > 0 ? ` com ${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} ativo${activeFilterCount > 1 ? 's' : ''}` : ' no total'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => exportarCSV(filtered)} disabled={filtered.length === 0} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1.5" />CSV
            </Button>
            <button
              onClick={() => setShowPrint(true)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: MSE_RED }}
            >
              <FileText className="w-4 h-4" />
              Gerar PDF
            </button>
          </div>
        </div>

        {/* Filter panel */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <button onClick={() => setShowFilters(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: MSE_RED }}>
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button onClick={e => { e.stopPropagation(); clearFilters() }}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Limpar
                </button>
              )}
              <ChevronDown className={cn('w-4 h-4 text-zinc-500 transition-transform', showFilters && 'rotate-180')} />
            </div>
          </button>

          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="search" placeholder="Buscar por descrição, local, número..."
                value={filtros.busca || ''}
                onChange={e => setFiltro('busca', e.target.value || undefined)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none placeholder:text-zinc-600" />
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-zinc-800">
                <div className="px-4 pt-3 pb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Obra</label>
                      <select value={filtros.obra_id || ''} onChange={e => handleObraChange(e.target.value)} className={inputCls}>
                        <option value="">Todas as obras</option>
                        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">TST</label>
                      <select value={filtros.tst_id || ''} onChange={e => setFiltro('tst_id', e.target.value || undefined)} className={inputCls}>
                        <option value="">Todos os TSTs</option>
                        {tstOptions.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Encarregado</label>
                      <select value={filtros.encarregado_id || ''} onChange={e => setFiltro('encarregado_id', e.target.value || undefined)} className={inputCls}>
                        <option value="">Todos</option>
                        {encOptions.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Gravidade</label>
                      <select value={filtros.gravidade || ''} onChange={e => setFiltro('gravidade', (e.target.value as GravidadeDesvio) || undefined)} className={inputCls}>
                        <option value="">Todas</option>
                        <option value="baixo">Baixo</option><option value="medio">Médio</option>
                        <option value="alto">Alto</option><option value="critico">Crítico</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Status</label>
                      <select value={filtros.status || ''} onChange={e => setFiltro('status', (e.target.value as StatusDesvio) || undefined)} className={inputCls}>
                        <option value="">Todos</option>
                        <option value="aberto">Aberto</option><option value="em_tratativa">Em Tratativa</option>
                        <option value="pendente">Pendente</option><option value="concluido">Concluído</option>
                        <option value="fechado">Fechado</option><option value="reincidente">Reincidente</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Categoria</label>
                      <select value={filtros.categoria || ''} onChange={e => setFiltro('categoria', e.target.value || undefined)} className={inputCls}>
                        <option value="">Todas</option>
                        {CATEGORIAS_PADRAO.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Data Início</label>
                      <input type="date" value={filtros.data_inicio || ''} onChange={e => setFiltro('data_inicio', e.target.value || undefined)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Data Fim</label>
                      <input type="date" value={filtros.data_fim || ''} onChange={e => setFiltro('data_fim', e.target.value || undefined)} className={inputCls} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Total',    value: kpis.total,    icon: TrendingUp,    hex: MSE_RED,    bg: 'rgba(232,41,28,0.08)'   },
            { label: 'Abertos',  value: kpis.abertos,  icon: Clock,         hex: '#60A5FA',  bg: 'rgba(96,165,250,0.08)'  },
            { label: 'Críticos', value: kpis.criticos, icon: AlertTriangle, hex: '#F87171',  bg: 'rgba(248,113,113,0.08)' },
            { label: 'Vencidos', value: kpis.vencidos, icon: AlertTriangle, hex: '#FB923C',  bg: 'rgba(251,146,60,0.08)'  },
          ] as const).map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: k.bg }}>
                <k.icon className="w-4 h-4" style={{ color: k.hex }} />
              </div>
              <p className="text-2xl font-black text-zinc-50">{k.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{k.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 border',
                activeTab === tab.id ? 'text-white border-transparent' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border-transparent',
              )}
              style={activeTab === tab.id ? { background: MSE_RED } : {}}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {/* ── RESUMO ── */}
            {activeTab === 'resumo' && (
              <div className="space-y-4">
                {/* Evolução */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-sm font-semibold text-zinc-300 mb-4">Evolução Mensal de Desvios</p>
                  {evolucaoData.length === 0
                    ? <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Sem dados de datas</div>
                    : <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={evolucaoData} margin={{ top: 12, right: 8, left: -28, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                          <XAxis dataKey="mes" tick={{ fill: '#71717A', fontSize: 11 }} />
                          <YAxis tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Line type="monotone" dataKey="total" name="Desvios" stroke={MSE_RED} strokeWidth={2.5}
                            dot={{ fill: MSE_RED, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                  }
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm font-semibold text-zinc-300 mb-3">Por Status</p>
                    {statusData.length === 0
                      ? <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">Sem dados</div>
                      : <div className="flex items-center gap-4">
                          <PieChart width={110} height={110}>
                            <Pie data={statusData} dataKey="value" cx={55} cy={55} innerRadius={30} outerRadius={50} paddingAngle={2}>
                              {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                          </PieChart>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            {statusData.map((s, i) => (
                              <div key={i} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.fill }} />
                                  <span className="text-xs text-zinc-400 truncate">{s.name}</span>
                                </div>
                                <span className="text-xs font-bold text-zinc-200 flex-shrink-0">{s.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                    }
                  </div>

                  {/* Gravidade */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm font-semibold text-zinc-300 mb-3">Por Gravidade</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={gravidadeData} margin={{ top: 16, right: 8, left: -28, bottom: 0 }} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                        <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 11 }} />
                        <YAxis hide />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="total" name="Desvios" radius={[4, 4, 0, 0]}>
                          {gravidadeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                          <LabelList dataKey="total" position="top" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* SLA Analysis */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-sm font-semibold text-zinc-300 mb-4">Análise de SLA (Prazos)</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={slaData} margin={{ top: 16, right: 8, left: -28, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 10 }} />
                      <YAxis hide />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="total" name="Desvios" radius={[4, 4, 0, 0]}>
                        {slaData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        <LabelList dataKey="total" position="top" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Em Tratativa', value: kpis.em_tratativa, color: '#FBBF24' },
                    { label: 'Concluídos',   value: kpis.concluidos,   color: '#4ADE80' },
                    { label: 'Reincidentes', value: kpis.reincidentes, color: '#F87171' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-center">
                      <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── POR ENCARREGADO — PRINCIPAL ── */}
            {activeTab === 'encarregado' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-sm font-semibold text-zinc-300">Desvios por Encarregado</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: MSE_RED }}>PRINCIPAL</span>
                  </div>
                  {encData.length === 0
                    ? <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Nenhum encarregado associado</div>
                    : <>
                        <ResponsiveContainer width="100%" height={Math.max(200, encData.length * 44)}>
                          <BarChart data={encData} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} width={110} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="total" name="Total" fill={MSE_RED} radius={[0, 6, 6, 0]}>
                              <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>

                        {/* Grouped bar: total + abertos + críticos */}
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                          <p className="text-xs font-semibold text-zinc-500 mb-3 uppercase tracking-widest">Detalhe por Encarregado</p>
                          <ResponsiveContainer width="100%" height={Math.max(180, encData.length * 36)}>
                            <BarChart data={encData} layout="vertical" barGap={2} margin={{ top: 4, right: 56, left: 4, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                              <XAxis type="number" tick={{ fill: '#71717A', fontSize: 10 }} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 10 }} width={110} />
                              <Tooltip content={<ChartTooltip />} />
                              <Legend formatter={v => <span style={{ color: '#A1A1AA', fontSize: 11 }}>{v}</span>} />
                              <Bar dataKey="abertos"   name="Abertos"   fill="#60A5FA" radius={[0, 3, 3, 0]} barSize={8} />
                              <Bar dataKey="criticos"  name="Críticos"  fill="#F87171" radius={[0, 3, 3, 0]} barSize={8} />
                              <Bar dataKey="concluidos"name="Concluídos"fill="#4ADE80" radius={[0, 3, 3, 0]} barSize={8} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Ranking table */}
                        <div className="mt-4 rounded-2xl border border-zinc-800 overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-zinc-800" style={{ background: 'rgba(232,41,28,0.06)' }}>
                            <p className="text-xs font-semibold text-zinc-300">Ranking completo</p>
                          </div>
                          <div className="divide-y divide-zinc-800">
                            {encData.map((e, i) => (
                              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                                  i === 0 ? 'text-white' : i === 1 ? 'bg-zinc-500 text-white' : i === 2 ? 'bg-yellow-700 text-white' : 'bg-zinc-800 text-zinc-400',
                                )} style={i === 0 ? { background: MSE_RED } : {}}>{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-zinc-200 truncate">{e.name}</p>
                                  <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${(e.total / encData[0].total) * 100}%`, background: MSE_RED }} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                                  <span className="font-black text-base" style={{ color: MSE_RED }}>{e.total}</span>
                                  <div className="text-right">
                                    <p className="text-blue-400 font-semibold">{e.abertos} ab.</p>
                                    <p className="text-red-400 font-semibold">{e.criticos} cr.</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                  }
                </div>
              </div>
            )}

            {/* ── POR OBRA ── */}
            {activeTab === 'obra' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-sm font-semibold text-zinc-300 mb-4">Desvios por Obra</p>
                  {obraData.length === 0
                    ? <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Nenhum dado</div>
                    : <ResponsiveContainer width="100%" height={Math.max(180, obraData.length * 44)}>
                        <BarChart data={obraData} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                          <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} width={110} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="total" name="Desvios" fill="#F59E0B" radius={[0, 6, 6, 0]}>
                            <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>
                {obraData.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-sm font-semibold text-zinc-300">Ranking</p>
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {obraData.map((o, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                            i === 0 ? 'text-white' : i === 1 ? 'bg-zinc-500 text-white' : 'bg-zinc-800 text-zinc-400',
                          )} style={i === 0 ? { background: MSE_RED } : {}}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-200 truncate">{o.fullName}</p>
                            <div className="mt-1.5 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(o.total / obraData[0].total) * 100}%`, background: '#F59E0B' }} />
                            </div>
                          </div>
                          <span className="text-sm font-black text-amber-400 flex-shrink-0 w-6 text-center">{o.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── POR CATEGORIA ── */}
            {activeTab === 'categoria' && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-5">
                <p className="text-sm font-semibold text-zinc-300">Desvios por Categoria</p>
                {categoriaData.length === 0
                  ? <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Nenhum dado</div>
                  : <>
                      <ResponsiveContainer width="100%" height={Math.max(200, categoriaData.length * 38)}>
                        <BarChart data={categoriaData} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                          <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} width={120} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="total" name="Desvios" radius={[0, 4, 4, 0]}>
                            {categoriaData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 pt-2 border-t border-zinc-800">
                        {categoriaData.map((c, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c.fill }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs text-zinc-300 truncate">{c.fullName}</span>
                                <span className="text-xs font-bold text-zinc-200 ml-2 flex-shrink-0">{c.total}</span>
                              </div>
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(c.total / categoriaData[0].total) * 100}%`, background: c.fill }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                }
              </div>
            )}

            {/* ── POR TST ── */}
            {activeTab === 'tst' && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-sm font-semibold text-zinc-300 mb-4">Desvios por TST</p>
                {tstChartData.length === 0
                  ? <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Nenhum TST associado</div>
                  : <ResponsiveContainer width="100%" height={Math.max(180, tstChartData.length * 44)}>
                      <BarChart data={tstChartData} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} width={110} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="total" name="Desvios" fill="#06B6D4" radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>
            )}

            {/* ── TABELA ── */}
            {activeTab === 'tabela' && (
              <div className="space-y-4">
                {filtered.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 flex flex-col items-center justify-center py-16 gap-3">
                    <Search className="w-8 h-8 text-zinc-600" />
                    <p className="text-zinc-400 font-semibold">Nenhum desvio encontrado</p>
                    {activeFilterCount > 0 && <Button variant="outline" size="sm" onClick={clearFilters}><X className="w-3.5 h-3.5 mr-1" />Limpar filtros</Button>}
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            {['#','Data','Obra','Categoria','Gravidade','Status','Encarregado','SLA'].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {pageItems.map(d => (
                            <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="px-4 py-3">
                                <Link href={`/desvios/${d.id}`} className="font-mono font-bold text-xs hover:underline" style={{ color: MSE_RED }}>
                                  {generateDesvioId(d.numero)}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{formatDate(d.data_ocorrencia)}</td>
                              <td className="px-4 py-3 text-zinc-300 text-xs max-w-[130px]"><span className="truncate block">{d.obra_nome_computado}</span></td>
                              <td className="px-4 py-3 text-zinc-400 text-xs max-w-[100px]"><span className="truncate block">{d.categoria}</span></td>
                              <td className="px-4 py-3"><span className={cn('text-xs font-semibold', GRAVIDADE_CONFIG[d.gravidade]?.color)}>{GRAVIDADE_CONFIG[d.gravidade]?.label}</span></td>
                              <td className="px-4 py-3">
                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', STATUS_CONFIG[d.status]?.bg, STATUS_CONFIG[d.status]?.color)}>
                                  {STATUS_CONFIG[d.status]?.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-zinc-400 text-xs max-w-[120px]"><span className="truncate block">{d.encarregado_nome_computado}</span></td>
                              <td className={cn('px-4 py-3 text-xs font-semibold whitespace-nowrap', getSlaColor(d.dias_para_vencer, d.vencido))}>{getSlaLabel(d.dias_para_vencer, d.vencido)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-2">
                      {pageItems.map(d => (
                        <Link key={d.id} href={`/desvios/${d.id}`}>
                          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2 active:bg-zinc-800">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-sm" style={{ color: MSE_RED }}>{generateDesvioId(d.numero)}</span>
                              <div className="flex items-center gap-1.5">
                                <span className={cn('text-xs font-semibold', GRAVIDADE_CONFIG[d.gravidade]?.color)}>{GRAVIDADE_CONFIG[d.gravidade]?.label}</span>
                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_CONFIG[d.status]?.bg, STATUS_CONFIG[d.status]?.color)}>
                                  {STATUS_CONFIG[d.status]?.label}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-2">{d.descricao}</p>
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                              <span className="flex items-center gap-1 min-w-0"><Building2 className="w-3 h-3 flex-shrink-0" /><span className="truncate">{d.obra_nome_computado}</span></span>
                              <span className="flex-shrink-0 ml-2">{formatDate(d.data_ocorrencia)}</span>
                            </div>
                            {d.encarregado_nome_computado !== '—' && (
                              <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <Users className="w-3 h-3 flex-shrink-0" /><span className="truncate">{d.encarregado_nome_computado}</span>
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-zinc-500">{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
