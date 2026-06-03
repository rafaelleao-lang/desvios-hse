'use client'

import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
  LabelList,
} from 'recharts'
import {
  Filter, Download, X, Search, Building2, Users, AlertTriangle,
  TrendingUp, ChevronDown, FileText, CheckCircle2, FileSpreadsheet,
  Presentation,
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
  aberto:       '#3B82F6',
  em_tratativa: '#F59E0B',
  pendente:     '#F97316',
  concluido:    '#22C55E',
  fechado:      '#71717A',
  reincidente:  '#EF4444',
}
const GRAV_HEX: Record<string, string> = {
  baixo:   '#10B981',
  medio:   '#EAB308',
  alto:    '#F97316',
  critico: '#EF4444',
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
  obrasList: { id: string; nome: string }[],
  tstsList: { id: string; nome: string; obra_id: string }[],
  coordsList: { id: string; nome: string; obra_id: string }[]
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

  function drawArc(cx: number, cy: number, r: number, startA: number, endA: number, rgb: [number,number,number], lw: number) {
    const steps = Math.max(40, Math.ceil(Math.abs(endA - startA) / (2 * Math.PI) * 120))
    doc.setDrawColor(rgb[0], rgb[1], rgb[2])
    doc.setLineWidth(lw)
    for (let i = 0; i < steps; i++) {
      const a1 = startA + (endA - startA) * i / steps
      const a2 = startA + (endA - startA) * (i + 1) / steps
      doc.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2))
    }
    doc.setLineWidth(0.1)
  }

  function drawLineChart(cx: number, cy: number, w: number, h: number, data: Array<{label: string; abertos: number; concluidos: number}>) {
    const maxV = Math.max(1, ...data.map(d => Math.max(d.abertos, d.concluidos)))
    const n = data.length
    const pL = 10, pR = 4, pT = 16, pB = 16
    const pw = w - pL - pR, ph = h - pT - pB
    const gx = (i: number) => cx + pL + (n <= 1 ? pw / 2 : pw * i / (n - 1))
    const gy = (v: number) => cy + pT + ph * (1 - v / maxV)

    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.1)
    for (let r = 0; r <= 4; r++) doc.line(cx + pL, cy + pT + ph * r / 4, cx + pL + pw, cy + pT + ph * r / 4)

    data.forEach((d, i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(130, 130, 130)
      doc.text(d.label, gx(i), cy + pT + ph + pB - 2, { align: 'center' })
    })

    const series: Array<{ key: 'abertos' | 'concluidos'; rgb: [number,number,number]; yOff: number }> = [
      { key: 'abertos',    rgb: [232, 41,  28], yOff: -1.8 },
      { key: 'concluidos', rgb: [34,  197, 94], yOff:  3.5 },
    ]
    series.forEach(({ key, rgb, yOff }) => {
      for (let i = 0; i < n - 1; i++) {
        doc.setDrawColor(rgb[0], rgb[1], rgb[2]); doc.setLineWidth(0.65)
        doc.line(gx(i), gy(data[i][key]), gx(i + 1), gy(data[i + 1][key]))
      }
      data.forEach((d, i) => {
        doc.setFillColor(rgb[0], rgb[1], rgb[2])
        doc.circle(gx(i), gy(d[key]), 0.7, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(rgb[0], rgb[1], rgb[2])
        doc.text(String(d[key]), gx(i), gy(d[key]) + yOff, { align: 'center' })
      })
    })

    // Legend — top-right, above the grid
    const ly = cy + 2
    const lx = cx + pL + pw - 50
    doc.setFillColor(232, 41, 28); doc.rect(lx, ly, 4, 2.5, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(90, 90, 90)
    doc.text('Abertos', lx + 5.5, ly + 2)
    doc.setFillColor(34, 197, 94); doc.rect(lx + 25, ly, 4, 2.5, 'F')
    doc.text('Concluídos', lx + 30.5, ly + 2)
  }

  function drawVertBars(cx: number, chartY: number, w: number, h: number, data: Array<{label: string; total: number; hex: string}>) {
    const maxV = Math.max(1, ...data.map(d => d.total))
    const n = data.length
    const pL = 0, pR = 2, pT = 14, pB = 12
    const pw = w - pL - pR, ph = h - pT - pB
    const bSlot = pw / n
    const bW = Math.min(bSlot * 0.6, 14)

    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.1)
    for (let r = 0; r <= 3; r++) doc.line(cx, chartY + pT + ph * r / 3, cx + pw, chartY + pT + ph * r / 3)

    data.forEach((d, i) => {
      const bx = cx + pL + i * bSlot + (bSlot - bW) / 2
      const bh = Math.max(ph * d.total / maxV, d.total > 0 ? 0.5 : 0)
      const by = chartY + pT + ph - bh
      const rgb = h2r(d.hex)
      if (d.total > 0) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(bx, by, bW, bh, 'F') }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(rgb[0], rgb[1], rgb[2])
      doc.text(String(d.total), bx + bW / 2, by - 1, { align: 'center' })
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(130, 130, 130)
      const lbl = d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label
      doc.text(lbl, bx + bW / 2, chartY + pT + ph + pB - 1, { align: 'center' })
    })
  }

  // ── Data ──────────────────────────────────────────────────
  const total    = filtered.length
  const abertos  = filtered.filter(d => d.status === 'aberto').length
  const tratados = filtered.filter(d => d.status !== 'aberto').length
  const kpis = {
    total,
    abertos,
    fechados:       filtered.filter(d => d.status === 'fechado' || d.status === 'reincidente').length,
    vencidos:       filtered.filter(d => d.vencido).length,
    taxa_tratativa: total > 0 ? Math.round((tratados / total) * 1000) / 10 : 0,
  }

  const coordRelRelevant = filtros.obra_id
    ? coordsList.filter(c => c.obra_id === filtros.obra_id)
    : coordsList
  const coordCountMapPDF: Record<string, number> = {}
  coordRelRelevant.forEach(c => { coordCountMapPDF[c.id] = 0 })
  filtered.forEach(d => { if (d.coordenador_id && coordCountMapPDF[d.coordenador_id] !== undefined) coordCountMapPDF[d.coordenador_id] += 1 })
  const coordDataPDF = coordRelRelevant
    .map(c => ({ name: c.nome, total: coordCountMapPDF[c.id] ?? 0 }))
    .sort((a, b) => b.total - a.total)

  const encMap: Record<string, number> = {}
  filtered.forEach(d => { const n = d.encarregado_nome_computado; if (n !== '—') encMap[n] = (encMap[n]||0)+1 })
  const encData = Object.entries(encMap).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total).slice(0,10)

  const obraMap: Record<string, number> = {}
  filtered.forEach(d => { obraMap[d.obra_nome_computado] = (obraMap[d.obra_nome_computado]||0)+1 })
  const obraData = Object.entries(obraMap).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total).slice(0,8)

  const relevantTsts = filtros.obra_id
    ? tstsList.filter(t => t.obra_id === filtros.obra_id)
    : tstsList
  const tstCountMap: Record<string, number> = {}
  relevantTsts.forEach(t => { tstCountMap[t.id] = 0 })
  filtered.forEach(d => { if (d.tst_id && tstCountMap[d.tst_id] !== undefined) tstCountMap[d.tst_id] += 1 })
  const tstData = relevantTsts
    .map(t => ({ name: t.nome, total: tstCountMap[t.id] ?? 0 }))
    .sort((a, b) => b.total - a.total)

  const catMap: Record<string, number> = {}
  filtered.forEach(d => {
    d.categorias.forEach(c => {
      const key = c === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : c
      catMap[key] = (catMap[key]||0)+1
    })
  })
  const catData = Object.entries(catMap).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total)

  const MONTHS_PDF = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const evoData = Array.from({ length: 6 }, (_, i) => {
    const dt = new Date()
    dt.setMonth(dt.getMonth() - (5 - i))
    const mes = dt.toISOString().slice(0, 7)
    return {
      label:     MONTHS_PDF[dt.getMonth()] + '/' + String(dt.getFullYear()).slice(2),
      abertos:   filtered.filter(d => d.criado_em.startsWith(mes)).length,
      concluidos:filtered.filter(d => d.atualizado_em.startsWith(mes) && ['concluido','fechado','reincidente'].includes(d.status)).length,
    }
  })

  const slaItems = [
    { label: 'Vencidos',   total: filtered.filter(d => d.vencido).length, hex: '#EF4444' },
    { label: 'Vence hoje', total: filtered.filter(d => !d.vencido && d.dias_para_vencer === 0).length, hex: '#F97316' },
    { label: '1-3 dias',   total: filtered.filter(d => !d.vencido && d.dias_para_vencer !== null && d.dias_para_vencer >= 1 && d.dias_para_vencer <= 3).length, hex: '#EAB308' },
    { label: '4-7 dias',   total: filtered.filter(d => !d.vencido && d.dias_para_vencer !== null && d.dias_para_vencer >= 4 && d.dias_para_vencer <= 7).length, hex: '#22C55E' },
    { label: '>7 dias',    total: filtered.filter(d => !d.vencido && d.dias_para_vencer !== null && d.dias_para_vencer > 7).length, hex: '#3B82F6' },
    { label: 'Sem prazo',  total: filtered.filter(d => d.dias_para_vencer === null).length, hex: '#71717A' },
  ]

  const gravData = (['baixo','medio','alto','critico'] as GravidadeDesvio[]).map(g => ({
    label: GRAVIDADE_CONFIG[g].label, total: filtered.filter(d=>d.gravidade===g).length, hex: GRAV_HEX[g],
  }))

  const statMap: Record<string, number> = {}
  filtered.forEach(d => {
    const key = d.status === 'reincidente' ? 'fechado' : d.status
    statMap[key] = (statMap[key]||0)+1
  })
  const statData = Object.entries(statMap).filter(([,n]) => n > 0).map(([s,n]) => ({
    label: STATUS_CONFIG[s as StatusDesvio]?.label || s, total: n, hex: STATUS_HEX[s] || '#71717A',
  }))

  const filtroDesc = [
    filtros.obra_id && obrasList.find(o=>o.id===filtros.obra_id)?.nome && `Obra: ${obrasList.find(o=>o.id===filtros.obra_id)!.nome}`,
    filtros.vencido ? 'Status: Vencido' : (filtros.status && `Status: ${STATUS_CONFIG[filtros.status as StatusDesvio]?.label||filtros.status}`),
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

  // ── KPI Row — igual ao dashboard: Abertos, Fechados, Vencidos, Taxa Tratativa ──
  const kpiItems: Array<{label:string; value:string; sub:string; c:[number,number,number]; bg:[number,number,number]}> = [
    { label:'Abertos',        value:String(kpis.abertos),                 sub:'Aguardando tratativa', c:[59,130,246],  bg:[239,246,255] },
    { label:'Fechados',       value:String(kpis.fechados),                sub:'Desvios encerrados',   c:[34,197,94],   bg:[240,253,244] },
    { label:'Vencidos',       value:String(kpis.vencidos),                sub:'Prazo ultrapassado',   c:[249,115,22],  bg:[255,247,237] },
    { label:'Taxa Tratativa', value:`${kpis.taxa_tratativa.toFixed(1)}%`, sub:'Desvios respondidos',  c:[34,197,94],   bg:[240,253,244] },
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

  // ── Evolução Mensal (line chart) ──────────────────────────
  ensureY(62)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(50, 50, 50)
  doc.text('Evolução Mensal', ML, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(120, 120, 120)
  doc.text('Últimos 6 meses', ML, y + 4)
  y += 7
  drawLineChart(ML, y, CW, 50, evoData)
  y += 50 + 8

  // ── Por Status (donut) + Por Gravidade (vertical bars) side by side ──
  ensureY(65)
  const halfW = (CW - 6) / 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(50, 50, 50)
  doc.text('Por Status', ML, y)
  doc.text('Por Gravidade', ML + halfW + 6, y)
  y += 5

  const sectionY = y
  const sectionH = 55

  // Status donut — left half
  const donutCX = ML + 20
  const donutCY = sectionY + sectionH / 2 - 2
  const donutR = 14
  const donutLW = 6
  const statTotal = statData.reduce((a, b) => a + b.total, 0)
  if (statTotal > 0) {
    let angle = -Math.PI / 2
    statData.forEach(s => {
      const sweep = (s.total / statTotal) * 2 * Math.PI
      drawArc(donutCX, donutCY, donutR, angle, angle + sweep, h2r(s.hex), donutLW)
      angle += sweep
    })
  } else {
    drawArc(donutCX, donutCY, donutR, 0, 2 * Math.PI, [200, 200, 200], donutLW)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(50, 50, 50)
  doc.text(String(statTotal), donutCX, donutCY + 2.5, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5)
  doc.setTextColor(130, 130, 130)
  doc.text('total', donutCX, donutCY + 6, { align: 'center' })

  // Status legend — right side of donut
  const legendX = ML + 38
  statData.forEach((s, i) => {
    const lY = sectionY + i * 8 + 3
    const rgb = h2r(s.hex)
    doc.setFillColor(rgb[0], rgb[1], rgb[2])
    doc.circle(legendX, lY + 1.2, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(70, 70, 70)
    const lbl = s.label.length > 12 ? s.label.slice(0, 11) + '…' : s.label
    doc.text(lbl, legendX + 4, lY + 2.2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(rgb[0], rgb[1], rgb[2])
    doc.text(String(s.total), ML + halfW - 2, lY + 2.2, { align: 'right' })
  })

  // Gravidade vertical bars — right half
  drawVertBars(ML + halfW + 6, sectionY, halfW, sectionH, gravData)

  y = sectionY + sectionH + 8

  // ── Análise de SLA (vertical bars) ───────────────────────
  ensureY(58)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(50, 50, 50)
  doc.text('Análise de SLA (Prazos)', ML, y)
  y += 5
  drawVertBars(ML, y, CW, 46, slaItems)
  y += 46 + 8

  // ── Coordenador visual bars ───────────────────────────────
  if (coordDataPDF.length > 0) {
    ensureY(coordDataPDF.length * 9 + 25)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 50)
    doc.text('Desvios por Coordenador', ML, y)
    y += 5

    const coordLabelW = 46
    const coordBarMaxW = CW - coordLabelW - 12
    const maxCoord = Math.max(1, ...coordDataPDF.map(e => e.total))
    const coordYStart = y

    coordDataPDF.forEach((e, i) => {
      const cy = coordYStart + i * 9
      const bw = (e.total / maxCoord) * coordBarMaxW
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(60, 60, 60)
      const lbl = e.name.length > 24 ? e.name.slice(0, 23) + '…' : e.name
      doc.text(lbl, ML, cy + 4.5)
      doc.setFillColor(228, 228, 228)
      doc.rect(ML + coordLabelW, cy, coordBarMaxW, 6, 'F')
      if (e.total > 0) { doc.setFillColor(34, 197, 94); doc.rect(ML + coordLabelW, cy, Math.max(bw, 0.5), 6, 'F') }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(34, 197, 94)
      doc.text(String(e.total), ML + coordLabelW + coordBarMaxW + 3, cy + 4.5)
    })
    y += coordDataPDF.length * 9 + 8
  }

  // ── Encarregado visual bars + table ──────────────────────
  if (encData.length > 0) {
    ensureY(encData.length * 9 + 25)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 50)
    doc.text('Desvios por Encarregado', ML, y)
    y += 5

    const encLabelW = 46
    const encBarMaxW = CW - encLabelW - 12
    const maxEnc = Math.max(1, ...encData.map(e => e.total))
    const encYStart = y

    encData.forEach((e, i) => {
      const ey = encYStart + i * 9
      const bw = (e.total / maxEnc) * encBarMaxW
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(60, 60, 60)
      const lbl = e.name.length > 24 ? e.name.slice(0, 23) + '…' : e.name
      doc.text(lbl, ML, ey + 4.5)
      doc.setFillColor(228, 228, 228)
      doc.rect(ML + encLabelW, ey, encBarMaxW, 6, 'F')
      if (e.total > 0) { doc.setFillColor(232, 41, 28); doc.rect(ML + encLabelW, ey, Math.max(bw, 0.5), 6, 'F') }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(232, 41, 28)
      doc.text(String(e.total), ML + encLabelW + encBarMaxW + 3, ey + 4.5)
    })
    y += encData.length * 9 + 8
  }

  // ── Obra visual bars ──────────────────────────────────────
  if (obraData.length > 0) {
    ensureY(obraData.length * 9 + 25)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 50)
    doc.text('Desvios por Obra', ML, y)
    y += 5

    const obraLabelW = 50
    const obraBarMaxW = CW - obraLabelW - 12
    const maxObra = Math.max(1, ...obraData.map(e => e.total))
    const obraYStart = y

    obraData.forEach((e, i) => {
      const oy = obraYStart + i * 9
      const bw = (e.total / maxObra) * obraBarMaxW
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(60, 60, 60)
      const lbl = e.name.length > 26 ? e.name.slice(0, 25) + '…' : e.name
      doc.text(lbl, ML, oy + 4.5)
      doc.setFillColor(228, 228, 228)
      doc.rect(ML + obraLabelW, oy, obraBarMaxW, 6, 'F')
      if (e.total > 0) { doc.setFillColor(245, 158, 11); doc.rect(ML + obraLabelW, oy, Math.max(bw, 0.5), 6, 'F') }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(245, 158, 11)
      doc.text(String(e.total), ML + obraLabelW + obraBarMaxW + 3, oy + 4.5)
    })
    y += obraData.length * 9 + 5
  }

  // ── TST visual bars ────────────────────────────────────────
  if (tstData.length > 0) {
    ensureY(tstData.length * 9 + 25)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 50)
    doc.text('Desvios por TST', ML, y)
    y += 5

    const tstLabelW = 46
    const tstBarMaxW = CW - tstLabelW - 12
    const maxTst = Math.max(1, ...tstData.map(e => e.total))
    const tstYStart = y

    tstData.forEach((e, i) => {
      const ty = tstYStart + i * 9
      const bw = (e.total / maxTst) * tstBarMaxW
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(60, 60, 60)
      const lbl = e.name.length > 24 ? e.name.slice(0, 23) + '…' : e.name
      doc.text(lbl, ML, ty + 4.5)
      doc.setFillColor(228, 228, 228)
      doc.rect(ML + tstLabelW, ty, tstBarMaxW, 6, 'F')
      if (e.total > 0) { doc.setFillColor(6, 182, 212); doc.rect(ML + tstLabelW, ty, Math.max(bw, 0.5), 6, 'F') }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(6, 182, 212)
      doc.text(String(e.total), ML + tstLabelW + tstBarMaxW + 3, ty + 4.5)
    })
    y += tstData.length * 9 + 5
  }


  // ── Categoria visual bars + table ────────────────────────
  if (catData.length > 0) {
    ensureY(catData.length * 9 + 25)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 50)
    doc.text('Por Categoria', ML, y)
    y += 5

    const catLabelW = 46
    const catBarMaxW = CW - catLabelW - 12
    const maxCat = Math.max(1, ...catData.map(e => e.total))
    const catYStart = y

    catData.forEach((e, i) => {
      const cy = catYStart + i * 9
      const bw = (e.total / maxCat) * catBarMaxW
      const catKey = e.name.startsWith('Outros') ? 'Outros' : e.name
      const catHex = CATEGORIAS_CORES[catKey] || '#78716C'
      const rgb = h2r(catHex)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(60, 60, 60)
      const lbl = e.name.length > 24 ? e.name.slice(0, 23) + '…' : e.name
      doc.text(lbl, ML, cy + 4.5)
      doc.setFillColor(228, 228, 228)
      doc.rect(ML + catLabelW, cy, catBarMaxW, 6, 'F')
      if (e.total > 0) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(ML + catLabelW, cy, Math.max(bw, 0.5), 6, 'F') }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(rgb[0], rgb[1], rgb[2])
      doc.text(String(e.total), ML + catLabelW + catBarMaxW + 3, cy + 4.5)
    })
    y += catData.length * 9 + 8
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
    head: [['ID', 'Data', 'Categoria', 'Gravidade', 'Status', 'Coordenador', 'Encarregado', 'SLA', 'Descrição', 'Tratativa']],
    body: filtered.map(d => {
      const isFechado = ['fechado', 'concluido', 'reincidente'].includes(d.status)
      const lastTratativa = d.tratativas && d.tratativas.length > 0 ? d.tratativas[d.tratativas.length - 1] : null
      const tratativaTexto = isFechado
        ? (lastTratativa?.acao_realizada || lastTratativa?.comentario || 'Sem registro')
        : 'Aberto'
      return [
        generateDesvioId(d.numero),
        formatDate(d.data_ocorrencia),
        d.categorias.map(c => c === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : c).join(', ').slice(0, 14),
        GRAVIDADE_CONFIG[d.gravidade]?.label || d.gravidade,
        STATUS_CONFIG[d.status]?.label || d.status,
        (d.coordenador_nome_computado || '—').length > 14 ? (d.coordenador_nome_computado || '—').slice(0,13)+'…' : (d.coordenador_nome_computado || '—'),
        d.encarregado_nome_computado.length > 14 ? d.encarregado_nome_computado.slice(0,13)+'…' : d.encarregado_nome_computado,
        getSlaLabel(d.dias_para_vencer, d.vencido, d.isClosed),
        d.descricao,
        tratativaTexto,
      ]
    }),
    styles: { fontSize: 6.5, cellPadding: 2 },
    headStyles: { fillColor: RED_RGB, textColor: [255,255,255] as [number,number,number], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [250,250,252] as [number,number,number] },
    columnStyles: {
      0: { cellWidth: 13, fontStyle: 'bold', textColor: RED_RGB },
      1: { cellWidth: 14 },
      2: { cellWidth: 16 },
      3: { cellWidth: 12 },
      4: { cellWidth: 16 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 },
      7: { cellWidth: 12 },
      8: { cellWidth: 28 },
      9: { cellWidth: 31 },
    },
    margin: { top: 22, left: ML, right: MR },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (data: any) => { if (data.pageNumber > 1) { drawHeader() } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const d = filtered[data.row.index]
        if (!d) return
        if (data.column.index === 3) {
          data.cell.styles.textColor = h2r(GRAV_HEX[d.gravidade] || '#71717A')
          data.cell.styles.fontStyle = 'bold'
        }
        if (data.column.index === 4) {
          data.cell.styles.textColor = h2r(STATUS_HEX[d.status] || '#71717A')
        }
        if (data.column.index === 9) {
          const isFechado = ['fechado', 'concluido', 'reincidente'].includes(d.status)
          data.cell.styles.textColor = isFechado ? [34, 197, 94] : [59, 130, 246]
          if (!isFechado) data.cell.styles.fontStyle = 'italic'
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

// ── XLSX Generator ──────────────────────────────────────────────────────────
function gerarXLSX(
  filtered: ReturnType<typeof filtrarDesvios>,
  filtros: FiltrosRelatorio,
  obrasList: { id: string; nome: string }[],
  tstsList: { id: string; nome: string; obra_id: string }[],
  coordsList: { id: string; nome: string; obra_id: string }[]
) {
  const hoje = new Date()
  const wb = XLSX.utils.book_new()

  const filtroDesc = [
    filtros.obra_id && obrasList.find(o => o.id === filtros.obra_id)?.nome && `Obra: ${obrasList.find(o => o.id === filtros.obra_id)!.nome}`,
    filtros.vencido ? 'Status: Vencido' : (filtros.status && `Status: ${STATUS_CONFIG[filtros.status as StatusDesvio]?.label || filtros.status}`),
    filtros.gravidade && `Gravidade: ${GRAVIDADE_CONFIG[filtros.gravidade as GravidadeDesvio]?.label || filtros.gravidade}`,
    filtros.categoria && `Categoria: ${filtros.categoria}`,
    (filtros.data_inicio || filtros.data_fim) && `Período: ${filtros.data_inicio || '...'} a ${filtros.data_fim || '...'}`,
    filtros.busca && `Busca: "${filtros.busca}"`,
  ].filter(Boolean).join(' · ') || 'Todos os desvios'

  const total    = filtered.length
  const abertos  = filtered.filter(d => d.status === 'aberto').length
  const fechados = filtered.filter(d => d.status === 'fechado' || d.status === 'reincidente').length
  const vencidos = filtered.filter(d => d.vencido).length
  const tratados = filtered.filter(d => d.status !== 'aberto').length
  const taxa     = total > 0 ? Math.round((tratados / total) * 1000) / 10 : 0

  // ── Aba Resumo ──
  const resumoData: (string | number)[][] = [
    ['Relatório de Desvios HSE — MSE Engenharia'],
    [`Gerado em: ${hoje.toLocaleDateString('pt-BR')} ${hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`],
    [`Filtros: ${filtroDesc}`],
    [],
    ['Indicadores'],
    ['Abertos', 'Fechados', 'Vencidos', 'Taxa Tratativa (%)'],
    [abertos, fechados, vencidos, taxa],
  ]
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
  wsResumo['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  // ── Aba Por Coordenador ──
  const coordRelRelevantXLSX = filtros.obra_id
    ? coordsList.filter(c => c.obra_id === filtros.obra_id)
    : coordsList
  const coordRelCountMap: Record<string, number> = {}
  coordRelRelevantXLSX.forEach(c => { coordRelCountMap[c.id] = 0 })
  filtered.forEach(d => { if (d.coordenador_id && coordRelCountMap[d.coordenador_id] !== undefined) coordRelCountMap[d.coordenador_id] += 1 })
  const coordRelRows = coordRelRelevantXLSX
    .map(c => [c.nome, coordRelCountMap[c.id] ?? 0])
    .sort((a, b) => (b[1] as number) - (a[1] as number))
  const wsCoord = XLSX.utils.aoa_to_sheet([['Coordenador', 'Total de Desvios'], ...coordRelRows])
  wsCoord['!cols'] = [{ wch: 32 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsCoord, 'Por Coordenador')

  // ── Aba Por TST ──
  const tstRelRelevant = filtros.obra_id
    ? tstsList.filter(t => t.obra_id === filtros.obra_id)
    : tstsList
  const tstRelCountMap: Record<string, number> = {}
  tstRelRelevant.forEach(t => { tstRelCountMap[t.id] = 0 })
  filtered.forEach(d => { if (d.tst_id && tstRelCountMap[d.tst_id] !== undefined) tstRelCountMap[d.tst_id] += 1 })
  const tstRelRows = tstRelRelevant
    .map(t => [t.nome, tstRelCountMap[t.id] ?? 0])
    .sort((a, b) => (b[1] as number) - (a[1] as number))
  const wsTst = XLSX.utils.aoa_to_sheet([['TST', 'Total de Desvios'], ...tstRelRows])
  wsTst['!cols'] = [{ wch: 32 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsTst, 'Por TST')

  // ── Aba Desvios ──
  const headers = [
    'ID', 'Data', 'Hora', 'Obra', 'Setor', 'Local Exato', 'Categoria',
    'Gravidade', 'Status', 'Colaborador', 'Coordenador', 'Encarregado', 'TST',
    'SLA / Prazo', 'Descrição', 'Tratativa', 'Aberto por', 'Criado em',
  ]

  const rows = filtered.map(d => {
    const isFechado = ['fechado', 'concluido', 'reincidente'].includes(d.status)
    const lastTratativa = d.tratativas && d.tratativas.length > 0 ? d.tratativas[d.tratativas.length - 1] : null
    const tratativaTexto = isFechado
      ? (lastTratativa?.acao_realizada || lastTratativa?.comentario || 'Sem registro')
      : 'Aberto'
    return [
      generateDesvioId(d.numero),
      formatDate(d.data_ocorrencia),
      d.hora_ocorrencia || '',
      d.obra_nome_computado,
      d.setor || '',
      d.local_exato || '',
      d.categorias.map(c => c === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : c).join(', '),
      GRAVIDADE_CONFIG[d.gravidade]?.label || d.gravidade,
      STATUS_CONFIG[d.status]?.label || d.status,
      d.colaborador_nome || '',
      d.coordenador_nome_computado || '',
      d.encarregado_nome_computado,
      d.tst_nome_computado || '',
      getSlaLabel(d.dias_para_vencer, d.vencido, d.isClosed),
      d.descricao,
      tratativaTexto,
      d.aberto_por || '',
      formatDate(d.criado_em),
    ]
  })

  const wsDesvios = XLSX.utils.aoa_to_sheet([headers, ...rows])
  wsDesvios['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 8  }, { wch: 28 }, { wch: 14 },
    { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 24 },
    { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 60 },
    { wch: 60 }, { wch: 24 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDesvios, 'Desvios')

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  XLSX.writeFile(wb, `Relatorio-HSE-${yy}-${mm}-${dd}.xlsx`)
}

// ── PPT Generator ──────────────────────────────────────────────────────────
async function gerarPPT(
  filtered: ReturnType<typeof filtrarDesvios>,
  filtros: FiltrosRelatorio,
  obrasList: { id: string; nome: string }[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PptxGenJS = (await import('pptxgenjs')).default as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pptx: any = new PptxGenJS()

  pptx.layout  = 'LAYOUT_WIDE' // 13.33" × 7.5"
  pptx.author  = 'MSE Engenharia'
  pptx.subject = 'Relatório de Desvios HSE'

  const hoje    = new Date()
  const dateStr = hoje.toLocaleDateString('pt-BR')
  const timeStr = hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const BG   = '18181B'
  const RED  = 'E8291C'
  const WHT  = 'FFFFFF'
  const Z100 = 'F4F4F5'
  const Z400 = 'A1A1AA'
  const Z700 = '3F3F46'
  const Z800 = '27272A'

  const obraFiltrada = filtros.obra_id ? obrasList.find(o => o.id === filtros.obra_id) : null
  const obraNome     = obraFiltrada?.nome || 'Todas as Obras'

  const filtroDesc = [
    filtros.vencido ? 'Status: Vencido' : (filtros.status && `Status: ${STATUS_CONFIG[filtros.status as StatusDesvio]?.label || filtros.status}`),
    filtros.gravidade && `Gravidade: ${GRAVIDADE_CONFIG[filtros.gravidade as GravidadeDesvio]?.label || filtros.gravidade}`,
    filtros.categoria && `Categoria: ${filtros.categoria}`,
    (filtros.data_inicio || filtros.data_fim) && `Período: ${filtros.data_inicio || '...'} a ${filtros.data_fim || '...'}`,
  ].filter(Boolean).join(' · ') || ''

  // ── COVER SLIDE ─────────────────────────────────────────────────────────────
  const cover = pptx.addSlide()
  cover.background = { color: BG }

  // Top red band
  cover.addShape('rect', { x: 0, y: 0, w: 13.33, h: 1.1, fill: { color: RED }, line: { color: RED, width: 0 } })

  // "mse" logo
  cover.addText('mse', {
    x: 0.35, y: 0.1, w: 2.0, h: 0.9,
    fontSize: 38, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle',
  })

  // Divider
  cover.addShape('rect', { x: 2.6, y: 0.2, w: 0.02, h: 0.7, fill: { color: 'FFBBBB' }, line: { color: 'FFBBBB', width: 0 } })

  cover.addText('Engenharia', {
    x: 2.75, y: 0.37, w: 2.5, h: 0.36,
    fontSize: 11, color: 'FFCCCC', fontFace: 'Arial',
  })

  cover.addText(`Gerado em ${dateStr} às ${timeStr}`, {
    x: 9.0, y: 0.42, w: 4.0, h: 0.28,
    fontSize: 9, color: 'FFCCCC', fontFace: 'Arial', align: 'right',
  })

  // Title
  cover.addText('Relatório de Desvios', {
    x: 0.4, y: 1.5, w: 11, h: 0.95,
    fontSize: 46, bold: true, color: WHT, fontFace: 'Arial',
  })
  cover.addText('HSE · Saúde, Segurança e Meio Ambiente', {
    x: 0.4, y: 2.4, w: 10, h: 0.45,
    fontSize: 15, color: Z400, fontFace: 'Arial',
  })

  // Accent bar + obra name
  cover.addShape('rect', { x: 0.4, y: 3.15, w: 0.07, h: 0.55, fill: { color: RED }, line: { color: RED, width: 0 } })
  cover.addText(obraNome, {
    x: 0.65, y: 3.1, w: 11, h: 0.65,
    fontSize: 22, bold: true, color: Z100, fontFace: 'Arial',
  })

  if (filtroDesc) {
    cover.addText(filtroDesc, {
      x: 0.65, y: 3.85, w: 10, h: 0.32,
      fontSize: 10, color: Z400, fontFace: 'Arial',
    })
  }

  // Stats cards
  const statsY = filtroDesc ? 4.45 : 4.15
  const stats = [
    { label: 'Total',      value: String(filtered.length), col: '9CA3AF' },
    { label: 'Abertos',    value: String(filtered.filter(d => d.status === 'aberto').length), col: '3B82F6' },
    { label: 'Concluídos', value: String(filtered.filter(d => ['concluido','fechado'].includes(d.status)).length), col: '22C55E' },
    { label: 'Vencidos',   value: String(filtered.filter(d => d.vencido).length), col: 'EF4444' },
  ]
  stats.forEach((s, i) => {
    const cx = 0.4 + i * 3.1
    cover.addShape('rect', { x: cx, y: statsY, w: 2.9, h: 1.15, fill: { color: Z800 }, line: { color: Z700, width: 0.5 } })
    cover.addText(s.value, {
      x: cx, y: statsY + 0.05, w: 2.9, h: 0.65,
      fontSize: 32, bold: true, color: s.col, fontFace: 'Arial', align: 'center',
    })
    cover.addText(s.label, {
      x: cx, y: statsY + 0.72, w: 2.9, h: 0.3,
      fontSize: 9.5, color: Z400, fontFace: 'Arial', align: 'center',
    })
  })

  // Bottom bar
  cover.addShape('rect', { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: Z800 }, line: { color: Z800, width: 0 } })
  cover.addText('MSE Engenharia · Sistema de Gestão HSE · Documento gerado automaticamente', {
    x: 0.3, y: 7.15, w: 13, h: 0.26,
    fontSize: 8, color: Z400, fontFace: 'Arial',
  })

  // ── PER-DESVIO SLIDES ────────────────────────────────────────────────────────
  for (let idx = 0; idx < filtered.length; idx++) {
    const d = filtered[idx]
    const slide = pptx.addSlide()
    slide.background = { color: BG }

    const isClosed     = ['fechado', 'concluido', 'reincidente'].includes(d.status)
    const lastTratativa = d.tratativas?.length > 0 ? d.tratativas[d.tratativas.length - 1] : null
    const tratativaTexto = isClosed
      ? (lastTratativa?.acao_realizada || lastTratativa?.comentario || 'Sem registro de tratativa')
      : 'Aberto'

    const gravCol    = (GRAV_HEX[d.gravidade]  || '#EAB308').replace('#', '')
    const statusCol  = (STATUS_HEX[d.status]   || '#3B82F6').replace('#', '')
    const gravLabel  = GRAVIDADE_CONFIG[d.gravidade]?.label  || d.gravidade
    const statusLabel = STATUS_CONFIG[d.status]?.label        || d.status

    const hasPhotos = d.fotos && d.fotos.length > 0
    const LEFT_W    = hasPhotos ? 7.7  : 13.0
    const RIGHT_X   = 8.1
    const RIGHT_W   = 5.0

    // ── Header ──
    slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.65, fill: { color: RED }, line: { color: RED, width: 0 } })

    slide.addText('mse', {
      x: 0.15, y: 0.06, w: 1.1, h: 0.52,
      fontSize: 18, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle',
    })
    slide.addShape('rect', { x: 1.47, y: 0.12, w: 0.02, h: 0.42, fill: { color: 'FFBBBB' }, line: { color: 'FFBBBB', width: 0 } })
    slide.addText(generateDesvioId(d.numero), {
      x: 1.62, y: 0.07, w: 3.2, h: 0.52,
      fontSize: 15, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle',
    })

    // Gravidade badge
    slide.addShape('rect', { x: 7.55, y: 0.1, w: 1.42, h: 0.45, fill: { color: gravCol }, line: { color: gravCol, width: 0 } })
    slide.addText(gravLabel, {
      x: 7.55, y: 0.1, w: 1.42, h: 0.45,
      fontSize: 10, bold: true, color: WHT, fontFace: 'Arial', align: 'center', valign: 'middle',
    })

    // Status badge
    slide.addShape('rect', { x: 9.1, y: 0.1, w: 1.65, h: 0.45, fill: { color: statusCol }, line: { color: statusCol, width: 0 } })
    slide.addText(statusLabel, {
      x: 9.1, y: 0.1, w: 1.65, h: 0.45,
      fontSize: 10, bold: true, color: WHT, fontFace: 'Arial', align: 'center', valign: 'middle',
    })

    // Slide counter
    slide.addText(`${idx + 1} / ${filtered.length}`, {
      x: 11.3, y: 0.12, w: 1.85, h: 0.4,
      fontSize: 9, color: 'FFCCCC', fontFace: 'Arial', align: 'right', valign: 'middle',
    })

    // ── Info Grid (2×4) ──
    const GRID_X  = 0.22
    const GRID_Y  = 0.78
    const COLS    = 3
    const CELL_W  = (LEFT_W - 0.1) / COLS
    const CELL_H  = 0.75

    const infoItems = [
      { label: 'DATA',          value: formatDate(d.data_ocorrencia) + (d.hora_ocorrencia ? '  ' + d.hora_ocorrencia : '') },
      { label: 'CATEGORIA',     value: d.categorias.map(c => c === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : c).join(', ') },
      { label: 'OBRA',          value: d.obra_nome_computado },
      { label: 'LOCAL / SETOR', value: [d.local_exato, d.setor].filter(Boolean).join(' · ') || '—' },
      { label: 'COORDENADOR',   value: d.coordenador_nome_computado || '—' },
      { label: 'ENCARREGADO',   value: d.encarregado_nome_computado || '—' },
      { label: 'ABERTO POR',    value: d.aberto_por || '—' },
      { label: 'COLABORADOR',   value: d.colaborador_nome || '—' },
      { label: 'SLA / PRAZO',   value: getSlaLabel(d.dias_para_vencer, d.vencido, d.isClosed) },
    ]

    infoItems.forEach((item, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const cx  = GRID_X + col * CELL_W
      const cy  = GRID_Y + row * CELL_H
      slide.addShape('rect', {
        x: cx + 0.03, y: cy + 0.03, w: CELL_W - 0.08, h: CELL_H - 0.07,
        fill: { color: Z800 }, line: { color: Z700, width: 0.3 },
      })
      slide.addText(item.label, {
        x: cx + 0.12, y: cy + 0.1, w: CELL_W - 0.22, h: 0.18,
        fontSize: 7, color: Z400, bold: true, fontFace: 'Arial',
      })
      slide.addText(item.value, {
        x: cx + 0.12, y: cy + 0.3, w: CELL_W - 0.22, h: 0.38,
        fontSize: 10, color: Z100, fontFace: 'Arial', wrap: true,
      })
    })

    // ── Description ──
    const DESC_Y  = GRID_Y + 3 * CELL_H + 0.12
    const BOX_W   = LEFT_W - 0.1
    const SECT_H  = 0.24
    const DESC_CH = 2.0
    const TRAT_CH = 2.0

    slide.addShape('rect', { x: GRID_X, y: DESC_Y, w: BOX_W, h: SECT_H, fill: { color: RED }, line: { color: RED, width: 0 } })
    slide.addText('DESCRIÇÃO DO DESVIO', {
      x: GRID_X + 0.1, y: DESC_Y + 0.03, w: BOX_W - 0.2, h: SECT_H - 0.05,
      fontSize: 8, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle',
    })

    const descText = d.descricao.length > 480 ? d.descricao.slice(0, 477) + '...' : d.descricao
    slide.addShape('rect', { x: GRID_X, y: DESC_Y + SECT_H, w: BOX_W, h: DESC_CH, fill: { color: Z800 }, line: { color: Z700, width: 0.3 } })
    slide.addText(descText, {
      x: GRID_X + 0.12, y: DESC_Y + SECT_H + 0.08, w: BOX_W - 0.25, h: DESC_CH - 0.15,
      fontSize: 10, color: Z100, fontFace: 'Arial', wrap: true, valign: 'top',
    })

    // ── Tratativa ──
    const TRAT_Y  = DESC_Y + SECT_H + DESC_CH + 0.1
    const tratCol = isClosed ? '16A34A' : '3B82F6'

    slide.addShape('rect', { x: GRID_X, y: TRAT_Y, w: BOX_W, h: SECT_H, fill: { color: tratCol }, line: { color: tratCol, width: 0 } })
    slide.addText('TRATATIVA / AÇÃO CORRETIVA', {
      x: GRID_X + 0.1, y: TRAT_Y + 0.03, w: BOX_W - 0.2, h: SECT_H - 0.05,
      fontSize: 8, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle',
    })

    const tratText = tratativaTexto.length > 380 ? tratativaTexto.slice(0, 377) + '...' : tratativaTexto
    slide.addShape('rect', { x: GRID_X, y: TRAT_Y + SECT_H, w: BOX_W, h: TRAT_CH, fill: { color: Z800 }, line: { color: Z700, width: 0.3 } })
    slide.addText(tratText, {
      x: GRID_X + 0.12, y: TRAT_Y + SECT_H + 0.08, w: BOX_W - 0.25, h: TRAT_CH - 0.15,
      fontSize: 10, color: isClosed ? '22C55E' : Z400, fontFace: 'Arial', wrap: true, valign: 'top',
    })

    // ── Footer ──
    slide.addShape('rect', { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: Z800 }, line: { color: Z800, width: 0 } })
    slide.addText(`MSE Engenharia · ${d.obra_nome_computado} · ${dateStr}`, {
      x: 0.3, y: 7.15, w: 9, h: 0.26,
      fontSize: 7.5, color: Z400, fontFace: 'Arial',
    })
    slide.addText(`${idx + 1} / ${filtered.length}`, {
      x: 11.5, y: 7.15, w: 1.6, h: 0.26,
      fontSize: 7.5, bold: true, color: RED, fontFace: 'Arial', align: 'right',
    })

    // ── Photos ──
    if (hasPhotos) {
      const photos = d.fotos.slice(0, 3)
      const photosAvailH = 7.1 - 1.05
      const photoH       = (photosAvailH - (photos.length - 1) * 0.1) / photos.length
      const LBL_H        = 0.24

      slide.addText('FOTOS DO DESVIO', {
        x: RIGHT_X, y: 0.75, w: RIGHT_W, h: 0.25,
        fontSize: 7.5, bold: true, color: Z400, fontFace: 'Arial',
      })

      for (let pi = 0; pi < photos.length; pi++) {
        const foto = photos[pi]
        const py    = 1.05 + pi * (photoH + 0.1)
        const imgH  = photoH - LBL_H
        const lblColor = foto.tipo === 'antes' ? 'EF4444' : '16A34A'

        slide.addShape('rect', { x: RIGHT_X, y: py, w: RIGHT_W, h: LBL_H, fill: { color: lblColor }, line: { color: lblColor, width: 0 } })
        slide.addText(foto.tipo === 'antes' ? 'ANTES' : 'DEPOIS', {
          x: RIGHT_X + 0.1, y: py + 0.03, w: 1.5, h: LBL_H - 0.06,
          fontSize: 8, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle',
        })
        slide.addText(`${pi + 1}/${photos.length}`, {
          x: RIGHT_X + RIGHT_W - 0.65, y: py + 0.03, w: 0.55, h: LBL_H - 0.06,
          fontSize: 8, color: 'FFEEEE', fontFace: 'Arial', align: 'right', valign: 'middle',
        })

        let imgDataUrl = foto.data_url
        if (imgDataUrl && imgDataUrl.startsWith('http')) {
          try {
            // Busca via proxy same-origin: o S3 não tem CORS configurado, então
            // um fetch direto do navegador é bloqueado ao ler o corpo da resposta.
            const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(imgDataUrl)}`)
            if (!res.ok) throw new Error(`proxy HTTP ${res.status}`)
            const blob = await res.blob()
            imgDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          } catch { imgDataUrl = '' }
        }

        if (imgDataUrl?.startsWith('data:')) {
          try {
            slide.addImage({ data: imgDataUrl, x: RIGHT_X, y: py + LBL_H, w: RIGHT_W, h: imgH,
              sizing: { type: 'contain', w: RIGHT_W, h: imgH } })
          } catch { /* skip failed image */ }
        } else {
          slide.addShape('rect', { x: RIGHT_X, y: py + LBL_H, w: RIGHT_W, h: imgH, fill: { color: Z700 }, line: { color: Z700, width: 0 } })
          slide.addText('Sem imagem', {
            x: RIGHT_X, y: py + LBL_H + imgH / 2 - 0.1, w: RIGHT_W, h: 0.3,
            fontSize: 9, color: Z400, fontFace: 'Arial', align: 'center',
          })
        }
      }
    }
  }

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  await pptx.writeFile({ fileName: `Relatorio-HSE-${yy}-${mm}-${dd}.pptx` })
}

const TABS = [
  { id: 'resumo',        label: 'Resumo'            },
  { id: 'coordenador',   label: 'Por Coordenador'   },
  { id: 'encarregado',   label: 'Por Encarregado'   },
  { id: 'obra',          label: 'Por Obra'           },
  { id: 'categoria',     label: 'Por Categoria'      },
  { id: 'tst',           label: 'Por TST'            },
  { id: 'tabela',        label: 'Tabela'             },
] as const
type TabId = typeof TABS[number]['id']

const inputCls =
  'w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-mse-500/30'

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const { obras, tsts, encarregados, coordenadores, desviosComputados, loaded } = useApp()

  const [filtros, setFiltros] = useState<FiltrosRelatorio>({})
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('resumo')
  const [page, setPage] = useState(1)
  const [generatingPPT, setGeneratingPPT] = useState(false)

  const tstOptions = useMemo(() =>
    filtros.obra_id ? tsts.filter(t => t.obra_id === filtros.obra_id) : tsts
  , [tsts, filtros.obra_id])

  const encOptions = useMemo(() =>
    filtros.obra_id ? encarregados.filter(e => e.obra_id === filtros.obra_id) : encarregados
  , [encarregados, filtros.obra_id])

  const coordOptions = useMemo(() =>
    filtros.obra_id ? coordenadores.filter(c => c.obra_id === filtros.obra_id) : coordenadores
  , [coordenadores, filtros.obra_id])

  const filtered = useMemo(() => filtrarDesvios(desviosComputados, filtros), [desviosComputados, filtros])

  const activeFilterCount = useMemo(() =>
    Object.values(filtros).filter(v => v !== undefined && v !== '').length
  , [filtros])

  function setFiltro<K extends keyof FiltrosRelatorio>(key: K, val: FiltrosRelatorio[K]) {
    setFiltros(prev => ({ ...prev, [key]: val || undefined }))
    setPage(1)
  }

  function handleObraChange(id: string) {
    setFiltros(prev => ({ ...prev, obra_id: id || undefined, tst_id: undefined, encarregado_id: undefined, coordenador_id: undefined }))
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
      fechados:      filtered.filter(d => d.status === 'fechado' || d.status === 'reincidente').length,
      vencidos:      filtered.filter(d => d.vencido).length,
      taxa_tratativa: total > 0 ? Math.round((tratados / total) * 1000) / 10 : 0,
    }
  }, [filtered])

  // ── Charts data ──
  const evolucaoData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      const mes = d.toISOString().slice(0, 7)
      return {
        mes: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        abertos:    filtered.filter(x => x.criado_em.startsWith(mes)).length,
        concluidos: filtered.filter(x => x.atualizado_em.startsWith(mes) && ['concluido','fechado','reincidente'].includes(x.status)).length,
      }
    })
  }, [filtered])

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(d => {
      const key = d.status === 'reincidente' ? 'fechado' : d.status
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).filter(([, v]) => v > 0).map(([s, n]) => ({
      name: STATUS_CONFIG[s as StatusDesvio]?.label || s, value: n, fill: STATUS_HEX[s] || '#666',
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
      if (['concluido','fechado','reincidente'].includes(d.status)) counts[n].concluidos++
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
      d.categorias.forEach(c => {
        const key = c === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : c
        counts[key] = (counts[key] || 0) + 1
      })
    })
    return Object.entries(counts).map(([fullName, total]) => ({
      fullName, name: fullName.length > 24 ? fullName.slice(0, 24) + '…' : fullName, total,
      fill: CATEGORIAS_CORES[fullName.startsWith('Outros') ? 'Outros' : fullName] || '#78716C',
    })).sort((a, b) => b.total - a.total)
  }, [filtered])

  const tstChartData = useMemo(() => {
    const relevantTsts = filtros.obra_id
      ? tsts.filter(t => t.obra_id === filtros.obra_id)
      : tsts
    const countMap: Record<string, number> = {}
    relevantTsts.forEach(t => { countMap[t.id] = 0 })
    filtered.forEach(d => { if (d.tst_id && countMap[d.tst_id] !== undefined) countMap[d.tst_id] += 1 })
    return relevantTsts
      .map(t => ({
        name: t.nome.length > 22 ? t.nome.slice(0, 22) + '…' : t.nome,
        total: countMap[t.id] ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [filtered, tsts, filtros.obra_id])

  const coordChartData = useMemo(() => {
    const relevantCoords = filtros.obra_id
      ? coordenadores.filter(c => c.obra_id === filtros.obra_id)
      : coordenadores
    const countMap: Record<string, number> = {}
    relevantCoords.forEach(c => { countMap[c.id] = 0 })
    filtered.forEach(d => { if (d.coordenador_id && countMap[d.coordenador_id] !== undefined) countMap[d.coordenador_id] += 1 })
    return relevantCoords
      .map(c => ({
        name: c.nome.length > 22 ? c.nome.slice(0, 22) + '…' : c.nome,
        total: countMap[c.id] ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [filtered, coordenadores, filtros.obra_id])

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
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => exportarCSV(filtered)} disabled={filtered.length === 0} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1.5" />CSV
            </Button>
            <button
              onClick={() => gerarXLSX(filtered, filtros, obras, tsts, coordenadores)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: '#16A34A' }}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Baixar XLSX
            </button>
            <button
              onClick={async () => {
                setGeneratingPPT(true)
                try { await gerarPPT(filtered, filtros, obras) }
                finally { setGeneratingPPT(false) }
              }}
              disabled={filtered.length === 0 || generatingPPT}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: '#D97706' }}
            >
              <Presentation className="w-4 h-4" />
              {generatingPPT ? 'Gerando...' : 'Baixar PPT'}
            </button>
            <button
              onClick={() => gerarPDF(filtered, filtros, obras, tsts, coordenadores)}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Obra</label>
                      <select value={filtros.obra_id || ''} onChange={e => handleObraChange(e.target.value)} className={inputCls}>
                        <option value="">Todas as obras</option>
                        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1.5 block">Coordenador</label>
                      <select value={filtros.coordenador_id || ''} onChange={e => setFiltro('coordenador_id', e.target.value || undefined)} className={inputCls}>
                        <option value="">Todos</option>
                        {coordOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <select
                        value={filtros.vencido ? 'vencido' : (filtros.status || '')}
                        onChange={e => {
                          const v = e.target.value
                          if (v === 'vencido') {
                            setFiltros(prev => ({ ...prev, status: undefined, vencido: true }))
                          } else {
                            setFiltros(prev => ({ ...prev, status: (v as StatusDesvio) || undefined, vencido: undefined }))
                          }
                        }}
                        className={inputCls}
                      >
                        <option value="">Todos</option>
                        <option value="aberto">Aberto</option>
                        <option value="fechado">Fechado</option>
                        <option value="concluido">Concluído</option>
                        <option value="reincidente">Reincidente</option>
                        <option value="vencido">Vencido</option>
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
            { label: 'Abertos',        value: String(kpis.abertos),                    icon: AlertTriangle, hex: '#3B82F6', bg: 'rgba(59,130,246,0.08)',   sub: 'Aguardando tratativa'   },
            { label: 'Fechados',       value: String(kpis.fechados),                   icon: CheckCircle2,  hex: '#22C55E', bg: 'rgba(34,197,94,0.08)',    sub: 'Desvios encerrados'     },
            { label: 'Vencidos',       value: String(kpis.vencidos),                   icon: AlertTriangle, hex: '#F97316', bg: 'rgba(249,115,22,0.08)',   sub: 'Prazo ultrapassado'     },
            { label: 'Taxa Tratativa', value: `${kpis.taxa_tratativa.toFixed(1)}%`,    icon: TrendingUp,    hex: '#22C55E', bg: 'rgba(34,197,94,0.08)',    sub: 'Desvios respondidos'    },
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
                  <p className="text-sm font-semibold text-zinc-300 mb-0.5">Evolução Mensal</p>
                  <p className="text-xs text-zinc-500 mb-4">Últimos 6 meses</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={evolucaoData} margin={{ top: 20, right: 10, bottom: 10, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis dataKey="mes" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
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

                {/* Por Encarregado */}
                {encData.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm font-semibold text-zinc-300 mb-4">Por Encarregado</p>
                    <ResponsiveContainer width="100%" height={Math.max(160, encData.length * 40)}>
                      <BarChart data={encData} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} width={110} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="total" name="Total" fill={MSE_RED} radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Por Obra */}
                {obraData.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm font-semibold text-zinc-300 mb-4">Por Obra</p>
                    <ResponsiveContainer width="100%" height={Math.max(160, obraData.length * 40)}>
                      <BarChart data={obraData} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} width={110} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="total" name="Desvios" fill="#F59E0B" radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Por Categoria */}
                {categoriaData.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm font-semibold text-zinc-300 mb-4">Por Categoria</p>
                    <ResponsiveContainer width="100%" height={Math.max(160, categoriaData.length * 38)}>
                      <BarChart data={categoriaData} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 0 }}>
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
                  </div>
                )}

                {/* Por Coordenador */}
                {coordChartData.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm font-semibold text-zinc-300 mb-4">Por Coordenador</p>
                    <ResponsiveContainer width="100%" height={Math.max(160, coordChartData.length * 40)}>
                      <BarChart data={coordChartData} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} width={110} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="total" name="Desvios" fill="#22C55E" radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Por TST */}
                {tstChartData.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm font-semibold text-zinc-300 mb-4">Por TST</p>
                    <ResponsiveContainer width="100%" height={Math.max(160, tstChartData.length * 40)}>
                      <BarChart data={tstChartData} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} width={110} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="total" name="Desvios" fill="#06B6D4" radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

              </div>
            )}

            {/* ── POR COORDENADOR ── */}
            {activeTab === 'coordenador' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-sm font-semibold text-zinc-300">Desvios por Coordenador</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-green-600">TODOS</span>
                  </div>
                  {coordChartData.length === 0
                    ? <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Nenhum coordenador associado</div>
                    : <>
                        <ResponsiveContainer width="100%" height={Math.max(200, coordChartData.length * 44)}>
                          <BarChart data={coordChartData} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} width={110} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="total" name="Total" fill="#22C55E" radius={[0, 6, 6, 0]}>
                              <LabelList dataKey="total" position="right" style={{ fill: '#A1A1AA', fontSize: 12, fontWeight: 700 }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>

                        {/* Ranking table */}
                        <div className="mt-4 rounded-2xl border border-zinc-800 overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-zinc-800 bg-green-500/5">
                            <p className="text-xs font-semibold text-zinc-300">Ranking completo — todos os coordenadores</p>
                          </div>
                          <div className="divide-y divide-zinc-800">
                            {coordChartData.map((c, i) => (
                              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                                  i === 0 ? 'text-white bg-green-600' : i === 1 ? 'bg-zinc-500 text-white' : i === 2 ? 'bg-yellow-700 text-white' : 'bg-zinc-800 text-zinc-400',
                                )}>{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-zinc-200 truncate">{c.name}</p>
                                  <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-green-500" style={{ width: `${(c.total / (coordChartData[0]?.total || 1)) * 100}%` }} />
                                  </div>
                                </div>
                                <span className="text-base font-black text-green-400 flex-shrink-0 w-8 text-center">{c.total}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                  }
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
                    <div className="hidden sm:block rounded-2xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: '900px' }}>
                        <thead>
                          <tr className="border-b border-zinc-800">
                            {['#','Data','Obra','Categoria','Gravidade','Status','Coordenador','Encarregado','SLA','Descrição','Tratativa'].map(h => (
                              <th key={h} className="text-left px-3 py-3 text-xs text-zinc-500 font-semibold whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {pageItems.map(d => {
                            const isFechado = ['fechado','concluido','reincidente'].includes(d.status)
                            const lastTratativa = d.tratativas && d.tratativas.length > 0 ? d.tratativas[d.tratativas.length - 1] : null
                            const tratativaTexto = isFechado
                              ? (lastTratativa?.acao_realizada || lastTratativa?.comentario || 'Sem registro')
                              : null
                            return (
                              <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                                <td className="px-3 py-3">
                                  <Link href={`/desvios/${d.id}`} className="font-mono font-bold text-xs hover:underline" style={{ color: MSE_RED }}>
                                    {generateDesvioId(d.numero)}
                                  </Link>
                                </td>
                                <td className="px-3 py-3 text-zinc-400 text-xs whitespace-nowrap">{formatDate(d.data_ocorrencia)}</td>
                                <td className="px-3 py-3 text-zinc-300 text-xs max-w-[110px]"><span className="truncate block">{d.obra_nome_computado}</span></td>
                                <td className="px-3 py-3 text-zinc-400 text-xs max-w-[90px]"><span className="truncate block">{d.categorias.map(c => c === 'Outros' && d.categoria_outro ? d.categoria_outro : c).join(', ')}</span></td>
                                <td className="px-3 py-3"><span className={cn('text-xs font-semibold', GRAVIDADE_CONFIG[d.gravidade]?.color)}>{GRAVIDADE_CONFIG[d.gravidade]?.label}</span></td>
                                <td className="px-3 py-3">
                                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', STATUS_CONFIG[d.status]?.bg, STATUS_CONFIG[d.status]?.color)}>
                                    {STATUS_CONFIG[d.status]?.label}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-zinc-400 text-xs max-w-[100px]"><span className="truncate block">{d.coordenador_nome_computado || '—'}</span></td>
                                <td className="px-3 py-3 text-zinc-400 text-xs max-w-[110px]"><span className="truncate block">{d.encarregado_nome_computado}</span></td>
                                <td className={cn('px-3 py-3 text-xs font-semibold whitespace-nowrap', getSlaColor(d.dias_para_vencer, d.vencido, d.isClosed))}>{getSlaLabel(d.dias_para_vencer, d.vencido, d.isClosed)}</td>
                                <td className="px-3 py-3 text-zinc-300 text-xs">
                                  <span className="block leading-relaxed">{d.descricao}</span>
                                </td>
                                <td className="px-3 py-3 text-xs">
                                  {isFechado ? (
                                    <span className="block text-emerald-400 leading-relaxed">{tratativaTexto}</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 whitespace-nowrap">
                                      Aberto
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
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
