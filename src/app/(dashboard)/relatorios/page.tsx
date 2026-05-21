'use client'

import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
  LabelList,
} from 'recharts'
import {
  Filter, Download, X, Search, Building2, Users, AlertTriangle,
  Clock, TrendingUp, ChevronDown, FileText,
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
  formatDate, generateDesvioId, getSlaColor, getSlaLabel,
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

// ── PDF Generator ───────────────────────────────────────────────────────────
function gerarPDF(
  filtered: ReturnType<typeof filtrarDesvios>,
  filtros: FiltrosRelatorio,
  obrasList: { id: string; nome: string }[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const hoje = new Date()
  const PW = 210
  const ML = 14
  const MR = 14
  const MB = 12
  const CW = PW - ML - MR
  const RED_RGB: [number, number, number] = [232, 41, 28]

  let y = 0

  function h2r(hex: string): [number, number, number] {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
  }

  function drawHeader() {
    doc.setFillColor(232, 41, 28)
    doc.rect(0, 0, PW, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text('mse', ML, 12.5)
    doc.setLineWidth(0.3)
    doc.setDrawColor(255, 255, 255)
    doc.line(ML + 15, 4, ML + 15, 14)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.text('Relatório de Desvios HSE  ·  MSE Engenharia', ML + 19, 12.5)
    const ds = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    doc.setFontSize(7)
    doc.setTextColor(255, 200, 200)
    doc.text(ds, PW - MR, 12.5, { align: 'right' })
  }

  function ensureY(need: number) {
    if (y + need > 297 - MB) {
      doc.addPage()
      drawHeader()
      y = 26
    }
  }

  // ── Data ──────────────────────────────────────────────────
  const total    = filtered.length
  const abertos  = filtered.filter(d => d.status === 'aberto').length
  const tratados = filtered.filter(d => d.status !== 'aberto').length
  const kpis = {
    total,
    abertos,
    vencidos:       filtered.filter(d => d.vencido).length,
    taxa_tratativa: total > 0 ? Math.round((tratados / total) * 1000) / 10 : 0,
  }

  const encMap: Record<string, number> = {}
  filtered.forEach(d => { const n = d.encarregado_nome_computado; if (n !== '—') encMap[n] = (encMap[n]||0)+1 })
  const encData = Object.entries(encMap).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total).slice(0,10)

  const obraMap: Record<string, number> = {}
  filtered.forEach(d => { obraMap[d.obra_nome_computado] = (obraMap[d.obra_nome_computado]||0)+1 })
  const obraData = Object.entries(obraMap).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total).slice(0,8)

  const tstMap: Record<string, number> = {}
  filtered.forEach(d => { const n = d.tst_nome_computado; if (n !== '—') tstMap[n] = (tstMap[n]||0)+1 })
  const tstData = Object.entries(tstMap).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total).slice(0,8)

  const catMap: Record<string, number> = {}
  filtered.forEach(d => {
    const cat = d.categoria === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : d.categoria
    catMap[cat] = (catMap[cat]||0)+1
  })
  const catData = Object.entries(catMap).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total)

  const gravData = (['baixo','medio','alto','critico'] as GravidadeDesvio[]).map(g => ({
    label: GRAVIDADE_CONFIG[g].label, total: filtered.filter(d=>d.gravidade===g).length, hex: GRAV_HEX[g],
  }))

  const statMap: Record<string, number> = {}
  filtered.forEach(d => { statMap[d.status] = (statMap[d.status]||0)+1 })
  const statData = Object.entries(statMap).map(([s,n]) => ({
    label: STATUS_CONFIG[s as StatusDesvio]?.label || s, total: n, hex: STATUS_HEX[s] || '#71717A',
  }))

  const filtroDesc = [
    filtros.obra_id && obrasList.find(o=>o.id===filtros.obra_id)?.nome && `Obra: ${obrasList.find(o=>o.id===filtros.obra_id)!.nome}`,
    filtros.status && `Status: ${STATUS_CONFIG[filtros.status as StatusDesvio]?.label||filtros.status}`,
    filtros.gravidade && `Gravidade: ${GRAVIDADE_CONFIG[filtros.gravidade as GravidadeDesvio]?.label||filtros.gravidade}`,
    filtros.categoria && `Categoria: ${filtros.categoria}`,
    (filtros.data_inicio||filtros.data_fim) && `Período: ${filtros.data_inicio||'...'} a ${filtros.data_fim||'...'}`,
    filtros.busca && `Busca: "${filtros.busca}"`,
  ].filter(Boolean).join(' · ') || 'Todos os desvios'

  // ── Page 1 ────────────────────────────────────────────────
  drawHeader()
  y = 24

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(110, 110, 110)
  const filtroLines = doc.splitTextToSize(`Filtros: ${filtroDesc}`, CW)
  doc.text(filtroLines, ML, y)
  y += filtroLines.length * 3.8 + 5

  // ── KPI Row — igual ao dashboard: Total, Abertos, Vencidos, Taxa Tratativa ──
  const kpiItems: Array<{label:string; value:string; sub:string; c:[number,number,number]; bg:[number,number,number]}> = [
    { label:'Total',          value:String(kpis.total),                   sub:'Total de desvios',    c:RED_RGB,      bg:[255,241,240] },
    { label:'Abertos',        value:String(kpis.abertos),                 sub:'Aguardando tratativa',c:[59,130,246], bg:[239,246,255] },
    { label:'Vencidos',       value:String(kpis.vencidos),                sub:'Prazo ultrapassado',  c:[249,115,22], bg:[255,247,237] },
    { label:'Taxa Tratativa', value:`${kpis.taxa_tratativa.toFixed(1)}%`, sub:'Desvios respondidos', c:[16,185,129], bg:[236,253,245] },
  ]
  const kW = (CW - 9) / 4
  const kH = 24

  for (let col = 0; col < 4; col++) {
    const k = kpiItems[col]
    const kx = ML + col * (kW + 3)
    const ky = y
    doc.setFillColor(k.bg[0], k.bg[1], k.bg[2])
    doc.roundedRect(kx, ky, kW, kH, 2, 2, 'F')
    doc.setFillColor(k.c[0], k.c[1], k.c[2])
    doc.roundedRect(kx, ky, 3, kH, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(k.value.includes('%') ? 14 : 18)
    doc.setTextColor(k.c[0], k.c[1], k.c[2])
    doc.text(k.value, kx + kW / 2 + 1.5, ky + 12, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(70, 70, 70)
    doc.text(k.label, kx + kW / 2 + 1.5, ky + 17.5, { align: 'center' })
    doc.setFontSize(5.5)
    doc.setTextColor(140, 140, 140)
    doc.text(k.sub, kx + kW / 2 + 1.5, ky + 21.5, { align: 'center' })
  }
  y += kH + 8

  // ── Gravidade + Status side by side ───────────────────────
  ensureY(55)
  const halfW = (CW - 6) / 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(50, 50, 50)
  doc.text('Por Gravidade', ML, y)
  doc.text('Por Status', ML + halfW + 6, y)
  y += 5

  const gravYStart = y
  const gravLabelW = 22
  const gravBarW = halfW - gravLabelW - 8
  const maxGrav = Math.max(...gravData.map(g => g.total), 1)

  gravData.forEach((g, i) => {
    const gy = gravYStart + i * 9
    const bw = (g.total / maxGrav) * gravBarW
    const rgb = h2r(g.hex)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(60, 60, 60)
    doc.text(g.label, ML, gy + 4.5)
    doc.setFillColor(228, 228, 228)
    doc.rect(ML + gravLabelW, gy, gravBarW, 6, 'F')
    if (g.total > 0) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(ML + gravLabelW, gy, Math.max(bw, 0.5), 6, 'F') }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(rgb[0], rgb[1], rgb[2])
    doc.text(String(g.total), ML + gravLabelW + gravBarW + 3, gy + 4.5)
  })

  const statLabelW = 28
  const statBarW = halfW - statLabelW - 8
  const statX = ML + halfW + 6
  const maxStat = Math.max(...statData.map(s => s.total), 1)

  statData.forEach((s, i) => {
    const sy = gravYStart + i * 9
    const bw = (s.total / maxStat) * statBarW
    const rgb = h2r(s.hex)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(60, 60, 60)
    const lbl = s.label.length > 15 ? s.label.slice(0,14)+'…' : s.label
    doc.text(lbl, statX, sy + 4.5)
    doc.setFillColor(228, 228, 228)
    doc.rect(statX + statLabelW, sy, statBarW, 5.5, 'F')
    if (s.total > 0) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(statX + statLabelW, sy, Math.max(bw, 0.5), 5.5, 'F') }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(rgb[0], rgb[1], rgb[2])
    doc.text(String(s.total), statX + statLabelW + statBarW + 3, sy + 4.5)
  })

  y = gravYStart + Math.max(gravData.length * 9, statData.length * 9) + 8

  // ── Encarregado table ──────────────────────────────────────
  if (encData.length > 0) {
    ensureY(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 50)
    doc.text('Desvios por Encarregado', ML, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['#', 'Encarregado', 'Desvios', '% do Total']],
      body: encData.map((e,i) => [`${i+1}`, e.name, `${e.total}`, kpis.total > 0 ? `${((e.total/kpis.total)*100).toFixed(1)}%` : '0%']),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: RED_RGB, textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250,250,252] as [number,number,number] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', textColor: [160,160,160] as [number,number,number] },
        2: { halign: 'right', fontStyle: 'bold', textColor: RED_RGB, cellWidth: 20 },
        3: { halign: 'right', textColor: [120,120,120] as [number,number,number], cellWidth: 25 },
      },
      margin: { top: 22, left: ML, right: MR },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didDrawPage: (data: any) => { if (data.pageNumber > 1) { drawHeader() } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Obra + TST side by side ────────────────────────────────
  if (obraData.length > 0 || tstData.length > 0) {
    ensureY(20)
    const tw = (CW - 6) / 2

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 50)
    if (obraData.length > 0) doc.text('Por Obra', ML, y)
    if (tstData.length > 0) doc.text('Por TST', ML + tw + 6, y)
    y += 3

    const sideY = y

    if (obraData.length > 0) {
      autoTable(doc, {
        startY: sideY,
        head: [['Obra', 'Total']],
        body: obraData.map(o => [o.name.length > 30 ? o.name.slice(0,29)+'…' : o.name, `${o.total}`]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [245,158,11] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250,250,252] as [number,number,number] },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold', cellWidth: 16 } },
        margin: { top: 22, left: ML, right: MR + tw + 6 },
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yLeft = obraData.length > 0 ? (doc as any).lastAutoTable.finalY : sideY

    if (tstData.length > 0) {
      autoTable(doc, {
        startY: sideY,
        head: [['TST', 'Total']],
        body: tstData.map(t => [t.name.length > 28 ? t.name.slice(0,27)+'…' : t.name, `${t.total}`]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [6,182,212] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250,250,252] as [number,number,number] },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold', cellWidth: 16 } },
        margin: { top: 22, left: ML + tw + 6, right: MR },
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yRight = tstData.length > 0 ? (doc as any).lastAutoTable.finalY : sideY
    y = Math.max(yLeft, yRight) + 8
  }

  // ── Categoria table ────────────────────────────────────────
  if (catData.length > 0) {
    ensureY(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 50)
    doc.text('Por Categoria', ML, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['Categoria', 'Total', '% do Total']],
      body: catData.map(c => [c.name, `${c.total}`, kpis.total > 0 ? `${((c.total/kpis.total)*100).toFixed(1)}%` : '0%']),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [139,92,246] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250,250,252] as [number,number,number] },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
        2: { halign: 'right', textColor: [120,120,120] as [number,number,number], cellWidth: 25 },
      },
      margin: { top: 22, left: ML, right: MR },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didDrawPage: (data: any) => { if (data.pageNumber > 1) { drawHeader() } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Full desvios list (new page) ───────────────────────────
  doc.addPage()
  drawHeader()
  y = 24

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(50, 50, 50)
  doc.text(`Lista Completa de Desvios (${filtered.length} registros)`, ML, y)
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['ID', 'Data', 'Obra', 'Categoria', 'Gravidade', 'Status', 'Encarregado', 'SLA']],
    body: filtered.map(d => [
      generateDesvioId(d.numero),
      formatDate(d.data_ocorrencia),
      d.obra_nome_computado.length > 18 ? d.obra_nome_computado.slice(0,17)+'…' : d.obra_nome_computado,
      d.categoria.length > 14 ? d.categoria.slice(0,13)+'…' : d.categoria,
      GRAVIDADE_CONFIG[d.gravidade]?.label || d.gravidade,
      STATUS_CONFIG[d.status]?.label || d.status,
      d.encarregado_nome_computado.length > 14 ? d.encarregado_nome_computado.slice(0,13)+'…' : d.encarregado_nome_computado,
      getSlaLabel(d.dias_para_vencer, d.vencido),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: RED_RGB, textColor: [255,255,255] as [number,number,number], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [250,250,252] as [number,number,number] },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold', textColor: RED_RGB },
      1: { cellWidth: 18 },
      4: { cellWidth: 16 },
      5: { cellWidth: 20 },
      7: { cellWidth: 18 },
    },
    margin: { top: 22, left: ML, right: MR },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (data: any) => { if (data.pageNumber > 1) { drawHeader() } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const d = filtered[data.row.index]
        if (!d) return
        if (data.column.index === 4) {
          data.cell.styles.textColor = h2r(GRAV_HEX[d.gravidade] || '#71717A')
          data.cell.styles.fontStyle = 'bold'
        }
        if (data.column.index === 5) {
          data.cell.styles.textColor = h2r(STATUS_HEX[d.status] || '#71717A')
        }
      }
    },
  })

  // ── Footer on all pages ────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(248, 248, 248)
    doc.rect(0, 297 - 10, PW, 10, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text('MSE Engenharia · Sistema de Gestão HSE', ML, 297 - 3.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(232, 41, 28)
    doc.text(`Página ${i} / ${totalPages}`, PW - MR, 297 - 3.5, { align: 'right' })
  }

  const dd = String(hoje.getDate()).padStart(2,'0')
  const mm = String(hoje.getMonth()+1).padStart(2,'0')
  const yy = hoje.getFullYear()
  doc.save(`Relatorio-HSE-${yy}-${mm}-${dd}.pdf`)
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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const { obras, tsts, encarregados, desviosComputados, loaded } = useApp()

  const [filtros, setFiltros] = useState<FiltrosRelatorio>({})
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('resumo')
  const [page, setPage] = useState(1)

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
  const kpis = useMemo(() => {
    const total   = filtered.length
    const abertos = filtered.filter(d => d.status === 'aberto').length
    const tratados = filtered.filter(d => d.status !== 'aberto').length
    return {
      total,
      abertos,
      vencidos:      filtered.filter(d => d.vencido).length,
      taxa_tratativa: total > 0 ? Math.round((tratados / total) * 1000) / 10 : 0,
    }
  }, [filtered])

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
              onClick={() => gerarPDF(filtered, filtros, obras)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: MSE_RED }}
            >
              <FileText className="w-4 h-4" />
              Baixar PDF
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

        {/* KPI row — igual ao dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Total',          value: String(kpis.total),                      icon: TrendingUp,    hex: MSE_RED,   bg: 'rgba(232,41,28,0.08)',   sub: 'Total de desvios'       },
            { label: 'Abertos',        value: String(kpis.abertos),                    icon: Clock,         hex: '#60A5FA', bg: 'rgba(96,165,250,0.08)',   sub: 'Aguardando tratativa'   },
            { label: 'Vencidos',       value: String(kpis.vencidos),                   icon: AlertTriangle, hex: '#FB923C', bg: 'rgba(251,146,60,0.08)',   sub: 'Prazo ultrapassado'     },
            { label: 'Taxa Tratativa', value: `${kpis.taxa_tratativa.toFixed(1)}%`,    icon: TrendingUp,    hex: '#4ADE80', bg: 'rgba(74,222,128,0.08)',   sub: 'Desvios respondidos'    },
          ] as const).map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: k.bg }}>
                <k.icon className="w-4 h-4" style={{ color: k.hex }} />
              </div>
              <p className="text-2xl font-black text-zinc-50">{k.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{k.label}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{k.sub}</p>
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
  )
}
