'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import {
  Recycle, AlertCircle, RefreshCw, DollarSign,
  ClipboardList, TrendingUp, X, FileText,
} from 'lucide-react'
import { saldosDB, retiradasDB, solicitacoesDB, alertasDB, fornecedoresDB } from '@/lib/db-residuos'
import type { SaldoObra, ResRetirada, ResAlerta, Fornecedor } from '@/types/residuos'
import { cn } from '@/lib/utils'

const COR = '#22C55E'
const CORES = ['#22C55E','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1']

// ── Formatadores ──────────────────────────────────────────────────────────────

function fmtR(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtN(v: number) {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}
function fmtEixo(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (v >= 1_000)     return `R$${(v / 1_000).toFixed(0)}k`
  return `R$${Math.round(v)}`
}
function fmtEixoN(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`
  return String(Math.round(v))
}
function abrev(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + '…' : s
}
function mesFmt(mes: string) {
  const [y, m] = mes.split('-')
  return `${m}/${y?.slice(2)}`
}

// ── Filtro de período ─────────────────────────────────────────────────────────

type Periodo = 'mes' | 'trim' | 'ano' | 'tudo'

function dentroDoPeriodo(data: string, periodo: Periodo): boolean {
  if (periodo === 'tudo') return true
  const d = new Date(data + 'T00:00:00')
  const now = new Date()
  if (periodo === 'mes')  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  if (periodo === 'trim') return (now.getTime() - d.getTime()) <= 90 * 86_400_000
  if (periodo === 'ano')  return d.getFullYear() === now.getFullYear()
  return true
}

// ── Estilos base ──────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: '#18181B', border: '1px solid #3F3F46',
  borderRadius: 10, fontSize: 12, color: '#E4E4E7',
}
const AXIS = { tick: { fill: '#71717A', fontSize: 11 }, axisLine: { stroke: '#3F3F46' }, tickLine: false as const }
const GRID = { stroke: '#27272A', strokeDasharray: '4 4' }

// ── Tooltips customizados ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TipMoeda({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 shadow-2xl text-xs space-y-1.5 min-w-[180px]">
      {label && <p className="font-bold text-zinc-200 pb-1.5 border-b border-zinc-800">{label}</p>}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-zinc-400">{p.name}</span>
          </div>
          <span className="font-semibold text-zinc-100">{fmtR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TipNum({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 shadow-2xl text-xs space-y-1.5 min-w-[180px]">
      {label && <p className="font-bold text-zinc-200 pb-1.5 border-b border-zinc-800">{label}</p>}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-zinc-400">{p.name}</span>
          </div>
          <span className="font-semibold text-zinc-100">{fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Componentes de layout ─────────────────────────────────────────────────────

function Secao({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">{titulo}</h2>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

function ChartCard({ titulo, sub, children, className }: {
  titulo: string; sub?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-2xl p-5', className)}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-zinc-100">{titulo}</h3>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

// Recharts não suporta componentes customizados como filhos SVG para defs —
// os gradientes são definidos inline dentro de cada <BarChart> individualmente.

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardResiduosPage() {
  const [saldosPorObra, setSaldosPorObra] = useState<SaldoObra[]>([])
  const [retiradas, setRetiradas]         = useState<ResRetirada[]>([])
  const [fornecedores, setFornecedores]   = useState<Fornecedor[]>([])
  const [pendentes, setPendentes]         = useState(0)
  const [alertas, setAlertas]             = useState<ResAlerta[]>([])
  const [loading, setLoading]             = useState(true)
  const [erro, setErro]                   = useState<string | null>(null)
  const [gerandoPDF, setGerandoPDF]       = useState(false)

  const [periodo, setPeriodo]       = useState<Periodo>('tudo')
  const [obraFiltro, setObraFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [fornFiltro, setFornFiltro] = useState('')

  async function carregar() {
    setLoading(true); setErro(null)
    try {
      const [s, r, p, a, f] = await Promise.all([
        saldosDB.saldosPorObra(), retiradasDB.list(),
        solicitacoesDB.countPendentes(), alertasDB.list(), fornecedoresDB.list(),
      ])
      setSaldosPorObra(s); setRetiradas(r); setPendentes(p); setAlertas(a); setFornecedores(f)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  // ── Valor efetivo ────────────────────────────────────────────────────────────
  const valorEfetivo = useCallback((r: ResRetirada): number => {
    if (r.valor_total != null) return r.valor_total
    const forn = fornecedores.find(f => f.id === r.fornecedor_id)
    const preco = forn?.precos?.find(p => p.tipo_id === r.tipo_id)
    return preco ? preco.valor * r.quantidade : 0
  }, [fornecedores])

  // ── Opções de filtro ─────────────────────────────────────────────────────────
  const opObras = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of retiradas) m.set(r.obra_id, r.obra_nome ?? r.obra_id)
    return Array.from(m.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [retiradas])
  const opTipos = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of retiradas) m.set(r.tipo_id, r.tipo_nome ?? r.tipo_id)
    return Array.from(m.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [retiradas])
  const opForns = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of retiradas) m.set(r.fornecedor_id, r.fornecedor_nome ?? r.fornecedor_id)
    return Array.from(m.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [retiradas])

  // ── Dados filtrados ──────────────────────────────────────────────────────────
  const rf = useMemo(() => retiradas.filter(r => {
    if (obraFiltro && r.obra_id !== obraFiltro) return false
    if (tipoFiltro && r.tipo_id !== tipoFiltro) return false
    if (fornFiltro && r.fornecedor_id !== fornFiltro) return false
    if (r.data && !dentroDoPeriodo(r.data, periodo)) return false
    return true
  }), [retiradas, obraFiltro, tipoFiltro, fornFiltro, periodo])

  const sf = useMemo(() =>
    obraFiltro ? saldosPorObra.filter(s => s.obra_id === obraFiltro) : saldosPorObra,
  [saldosPorObra, obraFiltro])

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const totalGasto    = useMemo(() => rf.reduce((s, r) => s + valorEfetivo(r), 0), [rf, valorEfetivo])
  const totalEntradas = useMemo(() => sf.reduce((s, r) => s + r.total_entrada, 0), [sf])
  const alertasAtivos = useMemo(() => alertas.filter(a => a.ativo && (a.saldo_atual ?? 0) <= a.minimo).length, [alertas])
  const obraIds       = useMemo(() => Array.from(new Set(saldosPorObra.map(s => s.obra_id))), [saldosPorObra])

  // ── Gastos por obra ───────────────────────────────────────────────────────────
  const gastosPorObra = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of rf) { const k = r.obra_nome ?? 'Sem obra'; m[k] = (m[k] ?? 0) + valorEfetivo(r) }
    return Object.entries(m).filter(([, v]) => v > 0)
      .map(([obra, valor]) => ({ obra: abrev(obra, 30), valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 10)
  }, [rf, valorEfetivo])

  const gastosPorTipo = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of rf) { const k = r.tipo_nome ?? 'N/A'; m[k] = (m[k] ?? 0) + valorEfetivo(r) }
    return Object.entries(m).filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: abrev(name, 24), value }))
      .sort((a, b) => b.value - a.value)
  }, [rf, valorEfetivo])

  const gastosPorForn = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of rf) { const k = r.fornecedor_nome ?? 'N/A'; m[k] = (m[k] ?? 0) + valorEfetivo(r) }
    return Object.entries(m).filter(([, v]) => v > 0)
      .map(([fornecedor, valor]) => ({ fornecedor: abrev(fornecedor, 24), valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 8)
  }, [rf, valorEfetivo])

  const stackedFornTipo = useMemo(() => {
    const forns = Array.from(new Set(rf.map(r => r.fornecedor_nome ?? 'N/A'))).slice(0, 6)
    const tipos = Array.from(new Set(rf.map(r => r.tipo_nome ?? 'N/A'))).slice(0, 8)
    if (!forns.length || !tipos.length) return { data: [], tipos: [] }
    const data = forns.map(forn => {
      const row: Record<string, number | string> = { fornecedor: abrev(forn, 20) }
      for (const tipo of tipos)
        row[tipo] = rf.filter(r => (r.fornecedor_nome ?? 'N/A') === forn && (r.tipo_nome ?? 'N/A') === tipo)
          .reduce((s, r) => s + valorEfetivo(r), 0)
      return row
    })
    return { data, tipos }
  }, [rf, valorEfetivo])

  const movPorObra = useMemo(() => {
    const m: Record<string, { entrada: number; retirada: number }> = {}
    for (const s of sf) {
      const k = abrev(s.obra_nome, 18)
      if (!m[k]) m[k] = { entrada: 0, retirada: 0 }
      m[k].entrada += s.total_entrada; m[k].retirada += s.total_retirada
    }
    return Object.entries(m)
      .map(([obra, d]) => ({ obra, Entradas: d.entrada, Retiradas: d.retirada }))
      .sort((a, b) => (b.Entradas + b.Retiradas) - (a.Entradas + a.Retiradas)).slice(0, 8)
  }, [sf])

  const saldoPorTipo = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of sf) m[s.tipo_nome] = (m[s.tipo_nome] ?? 0) + s.saldo
    return Object.entries(m).map(([tipo, saldo]) => ({ tipo: abrev(tipo, 22), saldo }))
      .sort((a, b) => b.saldo - a.saldo)
  }, [sf])

  const taxaUso = useMemo(() => {
    const m: Record<string, { entrada: number; retirada: number }> = {}
    for (const s of sf) {
      const k = abrev(s.obra_nome, 24)
      if (!m[k]) m[k] = { entrada: 0, retirada: 0 }
      m[k].entrada += s.total_entrada; m[k].retirada += s.total_retirada
    }
    return Object.entries(m)
      .map(([obra, d]) => ({ obra, pct: d.entrada > 0 ? Math.round((d.retirada / d.entrada) * 100) : 0, ...d }))
      .sort((a, b) => b.pct - a.pct)
  }, [sf])

  const evolucao = useMemo(() => {
    const base = retiradas.filter(r =>
      (!obraFiltro || r.obra_id === obraFiltro) &&
      (!tipoFiltro || r.tipo_id === tipoFiltro) &&
      (!fornFiltro || r.fornecedor_id === fornFiltro)
    )
    const m: Record<string, number> = {}
    for (const r of base) {
      if (!r.data) continue
      const k = r.data.slice(0, 7)
      m[k] = (m[k] ?? 0) + valorEfetivo(r)
    }
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, Gastos]) => ({ mes: mesFmt(mes), Gastos }))
  }, [retiradas, obraFiltro, tipoFiltro, fornFiltro, valorEfetivo])

  const donutsPorObra = useMemo(() =>
    obraIds.filter(id => !obraFiltro || id === obraFiltro).map(id => {
      const items = saldosPorObra.filter(s => s.obra_id === id)
      const gastoTotal = rf.filter(r => r.obra_id === id).reduce((s, r) => s + valorEfetivo(r), 0)
      return {
        id, nome: items[0]?.obra_nome ?? id,
        total: items.reduce((s, i) => s + i.total_entrada, 0),
        gastoTotal,
        data: items.map(i => ({ name: abrev(i.tipo_nome, 20), value: i.total_entrada })),
      }
    }), [obraIds, saldosPorObra, rf, valorEfetivo, obraFiltro])

  const temDados   = obraIds.length > 0 || retiradas.length > 0
  const temFiltros = !!(obraFiltro || tipoFiltro || fornFiltro || periodo !== 'tudo')

  // ── Gerador de PDF ────────────────────────────────────────────────────────────
  function gerarPDF() {
    setGerandoPDF(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const hoje = new Date()
      const PW = 210, ML = 14, MR = 14, MB = 12
      const CW = PW - ML - MR
      const RED: [number, number, number] = [220, 38, 38]
      let y = 0

      function h2r(hex: string): [number, number, number] {
        return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
      }
      function fmtPDF(v: number) {
        return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      }

      function drawHeader() {
        doc.setFillColor(RED[0], RED[1], RED[2])
        doc.rect(0, 0, PW, 18, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(15)
        doc.setTextColor(255, 255, 255)
        doc.text('mse', ML, 12.5)
        doc.setLineWidth(0.3); doc.setDrawColor(255, 255, 255)
        doc.line(ML + 14, 4, ML + 14, 14)
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
        doc.text('Gestão de Resíduos  ·  MSE Engenharia', ML + 18, 12.5)
        const ds = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        doc.setFontSize(7); doc.setTextColor(255, 200, 200)
        doc.text(ds, PW - MR, 12.5, { align: 'right' })
      }

      function newPage() {
        doc.addPage(); drawHeader(); y = 26
      }

      function ensureY(need: number) {
        if (y + need > 297 - MB) newPage()
      }

      function sectionTitle(txt: string) {
        ensureY(12)
        doc.setFillColor(254, 242, 242)
        doc.rect(ML, y, CW, 7, 'F')
        doc.setFillColor(RED[0], RED[1], RED[2])
        doc.rect(ML, y, 2.5, 7, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(80, 20, 20)
        doc.text(txt.toUpperCase(), ML + 6, y + 5)
        y += 11
      }

      // KPI card
      function kpiCard(x: number, yy: number, w: number, h: number, label: string, value: string, sub: string, rgb: [number,number,number]) {
        doc.setFillColor(250, 250, 250); doc.roundedRect(x, yy, w, h, 2, 2, 'F')
        doc.setDrawColor(rgb[0], rgb[1], rgb[2]); doc.setLineWidth(0.5)
        doc.line(x, yy + h - 1, x + w, yy + h - 1)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(140, 140, 140)
        doc.text(label.toUpperCase(), x + 3, yy + 5)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(rgb[0], rgb[1], rgb[2])
        doc.text(value, x + 3, yy + 13)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(160, 160, 160)
        doc.text(sub, x + 3, yy + 18)
      }

      // Barra horizontal — label | barra | valor (sempre visível fora da barra)
      function horizBar(
        x: number, yy: number, w: number, label: string,
        value: number, maxVal: number, valStr: string, rgb: [number,number,number], rank: number
      ) {
        const labelW = 60, valW = 34, gap = 2
        const trackX = x + labelW + gap
        const trackW = w - labelW - gap - valW - gap
        const bW = trackW * (maxVal > 0 ? value / maxVal : 0)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(60, 60, 60)
        const lbl = label.length > 30 ? label.slice(0, 29) + '…' : label
        doc.text(`${rank}. ${lbl}`, x, yy + 4)
        // track
        doc.setFillColor(230, 230, 230); doc.roundedRect(trackX, yy, trackW, 5, 1, 1, 'F')
        // fill
        if (bW > 0) {
          doc.setFillColor(rgb[0], rgb[1], rgb[2])
          doc.roundedRect(trackX, yy, bW, 5, 1, 1, 'F')
        }
        // valor — sempre à direita, fora da barra
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(rgb[0], rgb[1], rgb[2])
        doc.text(valStr, x + w, yy + 4, { align: 'right' })
      }

      // Donut — arco espesso (padrão do módulo desvios)
      function drawArcSeg(cx: number, cy: number, midR: number, startA: number, endA: number, rgb: [number,number,number], lw: number) {
        const steps = Math.max(40, Math.ceil(Math.abs(endA - startA) / (2 * Math.PI) * 120))
        doc.setDrawColor(rgb[0], rgb[1], rgb[2])
        doc.setLineWidth(lw)
        for (let i = 0; i < steps; i++) {
          const a1 = startA + (endA - startA) * i / steps
          const a2 = startA + (endA - startA) * (i + 1) / steps
          doc.line(cx + midR * Math.cos(a1), cy + midR * Math.sin(a1),
                   cx + midR * Math.cos(a2), cy + midR * Math.sin(a2))
        }
        doc.setLineWidth(0.1)
      }
      function drawDonut(cx: number, cy: number, r: number, inner: number, data: Array<{name: string; value: number; hex: string}>) {
        const total = data.reduce((s, d) => s + d.value, 0)
        if (total === 0) return
        const midR = (r + inner) / 2
        const lw   = r - inner - 0.4
        let angle  = -Math.PI / 2
        data.forEach(d => {
          const slice = (d.value / total) * 2 * Math.PI
          drawArcSeg(cx, cy, midR, angle, angle + slice, h2r(d.hex), lw)
          angle += slice
        })
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(40, 40, 40)
        doc.text(fmtPDF(total), cx, cy + 1.5, { align: 'center' })
        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(140, 140, 140)
        doc.text('Total', cx, cy - 4.5, { align: 'center' })
      }

      // Sparkline de evolução temporal
      function drawSparkline(x: number, yy: number, w: number, h: number, data: Array<{ mes: string; Gastos: number }>) {
        if (data.length === 0) return
        const maxV = Math.max(1, ...data.map(d => d.Gastos))
        const n = data.length
        const pL = 16, pR = 4, pT = 8, pB = 18
        const pw = w - pL - pR, ph = h - pT - pB
        const gx = (i: number) => x + pL + (n <= 1 ? pw / 2 : pw * i / (n - 1))
        const gy = (v: number) => yy + pT + ph * (1 - v / maxV)
        // y-axis labels
        for (let r = 0; r <= 3; r++) {
          const v = maxV * (3 - r) / 3
          doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(160, 160, 160)
          doc.text(fmtEixo(v), x + pL - 1, yy + pT + ph * r / 3 + 1.2, { align: 'right' })
          doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.1)
          doc.line(x + pL, yy + pT + ph * r / 3, x + pL + pw, yy + pT + ph * r / 3)
        }
        // x labels
        data.forEach((d, i) => {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(140, 140, 140)
          doc.text(d.mes, gx(i), yy + pT + ph + pB - 2, { align: 'center' })
        })
        // area fill
        if (n > 1) {
          const pts: [number, number][] = data.map((d, i) => [gx(i), gy(d.Gastos)])
          pts.push([gx(n - 1), yy + pT + ph])
          pts.push([gx(0), yy + pT + ph])
          doc.setFillColor(254, 226, 226)
          doc.lines(pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]) as [number, number][], pts[0][0], pts[0][1], [1,1], 'F')
        }
        // line
        for (let i = 0; i < n - 1; i++) {
          doc.setDrawColor(RED[0], RED[1], RED[2]); doc.setLineWidth(0.9)
          doc.line(gx(i), gy(data[i].Gastos), gx(i+1), gy(data[i+1].Gastos))
        }
        // dots + values
        data.forEach((d, i) => {
          doc.setFillColor(RED[0], RED[1], RED[2]); doc.circle(gx(i), gy(d.Gastos), 1, 'F')
          if (d.Gastos > 0) {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(150, 30, 30)
            doc.text(fmtPDF(d.Gastos), gx(i), gy(d.Gastos) - 2.5, { align: 'center' })
          }
        })
      }

      // ── Construção do PDF ─────────────────────────────────────────────────────
      drawHeader(); y = 24

      // Filtros aplicados
      const filtroDesc = [
        periodo !== 'tudo' && `Período: ${{'mes':'Este mês','trim':'Últimos 90 dias','ano':'Este ano','tudo':''}[periodo]}`,
        obraFiltro && opObras.find(o => o.id === obraFiltro)?.nome && `Obra: ${opObras.find(o => o.id === obraFiltro)!.nome}`,
        tipoFiltro && opTipos.find(t => t.id === tipoFiltro)?.nome && `Resíduo: ${opTipos.find(t => t.id === tipoFiltro)!.nome}`,
        fornFiltro && opForns.find(f => f.id === fornFiltro)?.nome && `Fornecedor: ${opForns.find(f => f.id === fornFiltro)!.nome}`,
      ].filter(Boolean).join('  ·  ') || 'Todos os registros'

      doc.setFillColor(245, 245, 245); doc.rect(ML, y, CW, 6, 'F')
      doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100)
      doc.text(`Filtros: ${filtroDesc}`, ML + 3, y + 4.2)
      y += 10

      // ── KPIs ─────────────────────────────────────────────────────────────────
      sectionTitle('Indicadores')
      const kpiW = (CW - 9) / 4
      kpiCard(ML,                  y, kpiW, 22, 'Total Gasto',    fmtPDF(totalGasto),      `${rf.length} retiradas`,  RED)
      kpiCard(ML + kpiW + 3,       y, kpiW, 22, 'Vol. Entradas',  fmtN(totalEntradas),     'unidades registradas',    [59, 130, 246])
      kpiCard(ML + (kpiW + 3) * 2, y, kpiW, 22, 'Solicitações',  String(pendentes),        'pendentes de aprovação',  [245, 158, 11])
      kpiCard(ML + (kpiW + 3) * 3, y, kpiW, 22, 'Alertas',       String(alertasAtivos),    'saldo abaixo do mínimo',  alertasAtivos > 0 ? [239, 68, 68] : [120, 120, 120])
      y += 28

      // ── Gastos por Obra ───────────────────────────────────────────────────────
      if (gastosPorObra.length > 0) {
        sectionTitle('Gastos por Obra')
        const maxV = Math.max(...gastosPorObra.map(d => d.valor))
        gastosPorObra.slice(0, 10).forEach((d, i) => {
          ensureY(9)
          const rgb = h2r(CORES[i % CORES.length])
          horizBar(ML, y, CW, d.obra, d.valor, maxV, fmtPDF(d.valor), rgb, i + 1)
          y += 8
        })
        y += 4
      }

      // ── Distribuição por Tipo de Resíduo (donut) ──────────────────────────────
      if (gastosPorTipo.length > 0) {
        sectionTitle('Distribuição por Tipo de Resíduo')
        const donutData = gastosPorTipo.slice(0, 8).map((d, i) => ({
          name: d.name, value: d.value, hex: CORES[i % CORES.length],
        }))
        const cx = ML + 28, cy2 = y + 24, donutH = 52
        ensureY(donutH + 10)
        drawDonut(cx, cy2, 22, 12, donutData)
        let lx = ML + 58, ly = y + 4
        donutData.forEach((d, i) => {
          const rgb = h2r(d.hex)
          doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.circle(lx, ly + 1.5, 1.5, 'F')
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(50, 50, 50)
          const pct = totalGasto > 0 ? Math.round((d.value / totalGasto) * 100) : 0
          doc.text(`${d.name}: ${fmtPDF(d.value)} (${pct}%)`, lx + 4, ly + 2.5)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(140, 140, 140)
          ly += 6.5
          if (i === 3) { lx = ML + 58 + 72; ly = y + 4 }
        })
        y += donutH + 6
      }

      // ── Top Fornecedores ──────────────────────────────────────────────────────
      if (gastosPorForn.length > 0) {
        sectionTitle('Top Fornecedores por Custo')
        const maxV = Math.max(...gastosPorForn.map(d => d.valor))
        gastosPorForn.slice(0, 8).forEach((d, i) => {
          ensureY(9)
          const rgb = h2r(CORES[(i + 2) % CORES.length])
          horizBar(ML, y, CW, d.fornecedor, d.valor, maxV, fmtPDF(d.valor), rgb, i + 1)
          y += 8
        })
        y += 4
      }

      // ── Entradas vs Retiradas por Obra ────────────────────────────────────────
      if (movPorObra.length > 0) {
        sectionTitle('Entradas vs Retiradas por Obra')
        const maxV = Math.max(1, ...movPorObra.flatMap(d => [d.Entradas, d.Retiradas]))
        const trackX = ML + 62, trackW = CW - 62 - 28
        movPorObra.slice(0, 10).forEach(d => {
          ensureY(14)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(60, 60, 60)
          doc.text(abrev(d.obra, 28), ML, y + 3.5)
          // Entradas
          const bwE = trackW * (d.Entradas / maxV)
          doc.setFillColor(230, 230, 230); doc.roundedRect(trackX, y, trackW, 4, 1, 1, 'F')
          if (bwE > 0) { doc.setFillColor(34, 197, 94); doc.roundedRect(trackX, y, bwE, 4, 1, 1, 'F') }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(5.8); doc.setTextColor(30, 130, 60)
          doc.text(`↑ ${fmtN(d.Entradas)} un`, ML + CW, y + 3.2, { align: 'right' })
          y += 5
          // Retiradas
          const bwR = trackW * (d.Retiradas / maxV)
          doc.setFillColor(230, 230, 230); doc.roundedRect(trackX, y, trackW, 4, 1, 1, 'F')
          if (bwR > 0) { doc.setFillColor(245, 158, 11); doc.roundedRect(trackX, y, bwR, 4, 1, 1, 'F') }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(5.8); doc.setTextColor(160, 100, 10)
          doc.text(`↓ ${fmtN(d.Retiradas)} un`, ML + CW, y + 3.2, { align: 'right' })
          y += 7
        })
        y += 4
      }

      // ── Taxa de Consumo por Obra ──────────────────────────────────────────────
      if (taxaUso.length > 0) {
        sectionTitle('Taxa de Consumo por Obra')
        taxaUso.slice(0, 10).forEach(t => {
          ensureY(10)
          const cor = t.pct >= 90 ? '#EF4444' : t.pct >= 70 ? '#F59E0B' : t.pct >= 50 ? '#3B82F6' : '#22C55E'
          const rgb = h2r(cor)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(60, 60, 60)
          doc.text(abrev(t.obra, 30), ML, y + 4)
          const bwTrack = CW - 60 - 16
          doc.setFillColor(230, 230, 230); doc.roundedRect(ML + 58, y, bwTrack, 4.5, 1, 1, 'F')
          const fill = bwTrack * Math.min(t.pct, 100) / 100
          if (fill > 0) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.roundedRect(ML + 58, y, fill, 4.5, 1, 1, 'F') }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(rgb[0], rgb[1], rgb[2])
          doc.text(`${t.pct}%`, ML + CW, y + 4, { align: 'right' })
          y += 8
        })
        y += 4
      }

      // ── Saldo Atual por Tipo ──────────────────────────────────────────────────
      if (saldoPorTipo.length > 0) {
        sectionTitle('Saldo Atual por Tipo de Resíduo')
        const maxAbs = Math.max(1, ...saldoPorTipo.map(d => Math.abs(d.saldo)))
        const trackX2 = ML + 62, trackW2 = CW - 62 - 30
        saldoPorTipo.slice(0, 10).forEach(d => {
          ensureY(9)
          const isPos = d.saldo >= 0
          const rgb: [number,number,number] = isPos ? [34, 197, 94] : [239, 68, 68]
          const bW = trackW2 * (Math.abs(d.saldo) / maxAbs)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(60, 60, 60)
          doc.text(abrev(d.tipo, 28), ML, y + 4)
          doc.setFillColor(230, 230, 230); doc.roundedRect(trackX2, y, trackW2, 5, 1, 1, 'F')
          if (bW > 0) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.roundedRect(trackX2, y, bW, 5, 1, 1, 'F') }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(rgb[0], rgb[1], rgb[2])
          doc.text(`${isPos ? '+' : ''}${fmtN(d.saldo)} un`, ML + CW, y + 4, { align: 'right' })
          y += 8
        })
        y += 4
      }

      // ── Evolução Temporal ─────────────────────────────────────────────────────
      if (evolucao.length > 0) {
        sectionTitle('Evolução Temporal de Gastos')
        ensureY(56)
        drawSparkline(ML, y, CW, 48, evolucao)
        y += 54
      }

      // ── Composição por Obra (donuts) ──────────────────────────────────────────
      if (donutsPorObra.length > 0) {
        sectionTitle('Composição de Resíduos por Obra')
        const perRow = 3
        const colW = CW / perRow
        for (let ri = 0; ri < donutsPorObra.length; ri += perRow) {
          const row = donutsPorObra.slice(ri, ri + perRow)
          const maxItems = row.reduce((m, o) => Math.max(m, o.data.length), 0)
          const rowH = 56 + maxItems * 6
          ensureY(rowH)
          row.forEach((obra, ci) => {
            const cx2 = ML + colW * ci + colW / 2
            const cy2 = y + 20
            const dd2 = obra.data.slice(0, 7).map((d, i2) => ({
              name: d.name, value: d.value, hex: CORES[i2 % CORES.length],
            }))
            doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(40, 40, 40)
            doc.text(abrev(obra.nome, 22), cx2, y + 5, { align: 'center' })
            if (obra.gastoTotal > 0) {
              doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(RED[0], RED[1], RED[2])
              doc.text(fmtPDF(obra.gastoTotal), cx2, y + 9.5, { align: 'center' })
            }
            drawDonut(cx2, cy2, 16, 9, dd2)
            let ly2 = cy2 + 18
            const tot2 = dd2.reduce((s, d) => s + d.value, 0)
            dd2.forEach((d, i2) => {
              const rgb2 = h2r(d.hex)
              const pct2 = tot2 > 0 ? Math.round(d.value / tot2 * 100) : 0
              doc.setFillColor(rgb2[0], rgb2[1], rgb2[2]); doc.circle(ML + colW * ci + 2, ly2 + 1.2, 1.2, 'F')
              doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(55, 55, 55)
              doc.text(`${abrev(d.name, 16)}: ${fmtN(d.value)} un (${pct2}%)`, ML + colW * ci + 5.5, ly2 + 2)
              ly2 += 6
            })
          })
          y += rowH
        }
        y += 4
      }

      // ── Tabela de Retiradas ───────────────────────────────────────────────────
      if (rf.length > 0) {
        sectionTitle('Detalhamento de Retiradas')
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Obra', 'Resíduo', 'Fornecedor', 'Qtd', 'Total (R$)']],
          body: rf.map(r => [
            r.data ?? '',
            abrev(r.obra_nome ?? '', 28),
            r.tipo_nome ?? '',
            abrev(r.fornecedor_nome ?? '', 22),
            fmtN(r.quantidade),
            fmtPDF(valorEfetivo(r)),
          ]),
          styles: { fontSize: 7, cellPadding: 2.5, textColor: [50, 50, 50] },
          headStyles: { fillColor: RED, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          alternateRowStyles: { fillColor: [254, 248, 248] },
          columnStyles: {
            0: { cellWidth: 20 }, 1: { cellWidth: 52 }, 2: { cellWidth: 28 },
            3: { cellWidth: 46 }, 4: { cellWidth: 14, halign: 'right' }, 5: { cellWidth: 26, halign: 'right' },
          },
          margin: { left: ML, right: MR },
        })
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
      }

      // ── Footer em todas as páginas ────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFillColor(254, 242, 242); doc.rect(0, 287, PW, 10, 'F')
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
        doc.text('MSE Engenharia · Gestão de Resíduos', ML, 293.5)
        doc.setFont('helvetica', 'bold'); doc.setTextColor(RED[0], RED[1], RED[2])
        doc.text(`Página ${i} / ${totalPages}`, PW - MR, 293.5, { align: 'right' })
      }

      const dd = String(hoje.getDate()).padStart(2,'0')
      const mm = String(hoje.getMonth()+1).padStart(2,'0')
      const yy = hoje.getFullYear()
      doc.save(`Residuos-${yy}-${mm}-${dd}.pdf`)
    } finally {
      setGerandoPDF(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const PERIODOS: { key: Periodo; label: string }[] = [
    { key: 'mes',  label: 'Este mês' },
    { key: 'trim', label: 'Últ. 90d' },
    { key: 'ano',  label: 'Este ano' },
    { key: 'tudo', label: 'Tudo' },
  ]
  const selectCls = 'h-9 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400 focus:outline-none focus:border-green-500 transition-colors cursor-pointer'

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COR + '20' }}>
            <Recycle className="w-5 h-5" style={{ color: COR }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Dashboard · Gestão de Resíduos</h1>
            <p className="text-xs text-zinc-500">Indicadores operacionais e financeiros</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={carregar} disabled={loading}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={gerarPDF}
            disabled={gerandoPDF || loading || (!temDados)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22C55E 100%)' }}>
            <FileText className="w-4 h-4" />
            {gerandoPDF ? 'Gerando…' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-0.5">
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                periodo === p.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}
              style={periodo === p.key ? { background: COR } : {}}>
              {p.label}
            </button>
          ))}
        </div>
        <select value={obraFiltro} onChange={e => setObraFiltro(e.target.value)} className={selectCls}>
          <option value="">Todas as obras</option>
          {opObras.map(o => <option key={o.id} value={o.id}>{abrev(o.nome, 40)}</option>)}
        </select>
        <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} className={selectCls}>
          <option value="">Todos os resíduos</option>
          {opTipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <select value={fornFiltro} onChange={e => setFornFiltro(e.target.value)} className={selectCls}>
          <option value="">Todos os fornecedores</option>
          {opForns.map(f => <option key={f.id} value={f.id}>{abrev(f.nome, 35)}</option>)}
        </select>
        {temFiltros && (
          <button onClick={() => { setObraFiltro(''); setTipoFiltro(''); setFornFiltro(''); setPeriodo('tudo') }}
            className="flex items-center gap-1.5 h-9 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
        {temFiltros && (
          <span className="text-xs text-zinc-600">{rf.length} retirada{rf.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando dados…</span>
        </div>
      )}

      {!loading && erro && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{erro}</span>
          <button onClick={carregar} className="ml-auto underline text-xs hover:text-red-300">Tentar novamente</button>
        </div>
      )}

      {!loading && !erro && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Gasto', icon: DollarSign, cor: '#22C55E', value: fmtR(totalGasto), sub: `${rf.length} retirada${rf.length !== 1 ? 's' : ''}` },
              { label: 'Vol. Entradas', icon: TrendingUp, cor: '#3B82F6', value: fmtN(totalEntradas), sub: 'unidades registradas' },
              { label: 'Solicitações', icon: ClipboardList, cor: '#F59E0B', value: String(pendentes), sub: 'pendentes de aprovação' },
              { label: 'Alertas', icon: AlertCircle, cor: alertasAtivos > 0 ? '#EF4444' : '#52525B', value: String(alertasAtivos), sub: 'saldo abaixo do mínimo' },
            ].map(k => (
              <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{k.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.cor + '20' }}>
                    <k.icon className="w-3.5 h-3.5" style={{ color: k.cor }} />
                  </div>
                </div>
                <p className="text-2xl font-black text-zinc-100 leading-none">{k.value}</p>
                <p className="text-[11px] text-zinc-600">{k.sub}</p>
              </div>
            ))}
          </div>

          {!temDados ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-600">
              <Recycle className="w-14 h-14 opacity-15" />
              <p className="text-sm font-medium">Nenhuma movimentação registrada ainda.</p>
              <p className="text-xs text-zinc-700">Registre entradas e retiradas em Movimentações para ver os gráficos.</p>
            </div>
          ) : (
            <>
              {/* ── Análise de Custos ── */}
              {(gastosPorObra.length > 0 || gastosPorTipo.length > 0) && (
                <>
                  <Secao titulo="Análise de Custos" />
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {gastosPorObra.length > 0 && (
                      <ChartCard titulo="Gastos por Obra"
                        sub={`${gastosPorObra.length} obra${gastosPorObra.length !== 1 ? 's' : ''} · total ${fmtR(totalGasto)}`}
                        className="lg:col-span-3">
                        <ResponsiveContainer width="100%" height={Math.max(200, gastosPorObra.length * 48)}>
                          <BarChart data={gastosPorObra} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid {...GRID} horizontal={false} />
                            <XAxis type="number" tickFormatter={fmtEixo} {...AXIS} />
                            <YAxis type="category" dataKey="obra" width={160} {...AXIS} />
                            <Tooltip content={(p) => <TipMoeda {...p} />} cursor={{ fill: '#27272A' }} />
                            <Bar dataKey="valor" name="Gasto" radius={[0, 7, 7, 0]}>
                              {gastosPorObra.map((_, i) => (
                                <Cell key={i} fill={CORES[i % CORES.length]} fillOpacity={0.9} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    )}
                    {gastosPorTipo.length > 0 && (
                      <ChartCard titulo="Distribuição por Tipo" sub="participação % no custo total" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie data={gastosPorTipo} cx="50%" cy="44%"
                              innerRadius={58} outerRadius={90} paddingAngle={3} dataKey="value"
                              label={({ percent }) => percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : ''}
                              labelLine={false}>
                              {gastosPorTipo.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => [fmtR(v), 'Gasto']} contentStyle={TOOLTIP_STYLE} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: '#A1A1AA' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    )}
                  </div>
                </>
              )}

              {/* ── Fornecedores ── */}
              {gastosPorForn.length > 0 && (
                <>
                  <Secao titulo="Fornecedores" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard titulo="Top Fornecedores por Custo" sub="valor total gasto por fornecedor">
                      <ResponsiveContainer width="100%" height={Math.max(180, gastosPorForn.length * 42)}>
                        <BarChart data={gastosPorForn} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid {...GRID} horizontal={false} />
                          <XAxis type="number" tickFormatter={fmtEixo} {...AXIS} />
                          <YAxis type="category" dataKey="fornecedor" width={150} {...AXIS} />
                          <Tooltip content={(p) => <TipMoeda {...p} />} cursor={{ fill: '#27272A' }} />
                          <Bar dataKey="valor" name="Gasto" radius={[0, 7, 7, 0]}>
                            {gastosPorForn.map((_, i) => (
                              <Cell key={i} fill={CORES[(i + 1) % CORES.length]} fillOpacity={0.9} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    {stackedFornTipo.data.length > 0 && stackedFornTipo.tipos.length > 1 && (
                      <ChartCard titulo="Custo Fornecedor × Tipo" sub="composição empilhada por tipo de resíduo">
                        <ResponsiveContainer width="100%" height={Math.max(180, stackedFornTipo.data.length * 42)}>
                          <BarChart data={stackedFornTipo.data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid {...GRID} horizontal={false} />
                            <XAxis type="number" tickFormatter={fmtEixo} {...AXIS} />
                            <YAxis type="category" dataKey="fornecedor" width={150} {...AXIS} />
                            <Tooltip content={(p) => <TipMoeda {...p} />} cursor={{ fill: '#27272A' }} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: '#A1A1AA' }} />
                            {stackedFornTipo.tipos.map((tipo, i) => (
                              <Bar key={tipo} dataKey={tipo} stackId="a" fill={CORES[i % CORES.length]}
                                radius={i === stackedFornTipo.tipos.length - 1 ? [0, 4, 4, 0] : undefined} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    )}
                  </div>
                </>
              )}

              {/* ── Volume de Resíduos ── */}
              {movPorObra.length > 0 && (
                <>
                  <Secao titulo="Volume de Resíduos" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard titulo="Entradas vs Retiradas por Obra" sub="volume em unidades físicas">
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={movPorObra} margin={{ top: 0, right: 8, left: 0, bottom: 48 }}>
                          <defs>
                            <linearGradient id="vgGreen" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"   stopColor="#22C55E" stopOpacity={1} />
                              <stop offset="100%" stopColor="#22C55E" stopOpacity={0.45} />
                            </linearGradient>
                            <linearGradient id="vgAmber" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"   stopColor="#F59E0B" stopOpacity={1} />
                              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.45} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid {...GRID} vertical={false} />
                          <XAxis dataKey="obra" {...AXIS} interval={0} angle={-30} textAnchor="end" height={64} />
                          <YAxis {...AXIS} tickFormatter={fmtEixoN} />
                          <Tooltip content={(p) => <TipNum {...p} />} cursor={{ fill: '#27272A' }} />
                          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: '#A1A1AA', paddingTop: 12 }} />
                          <Bar dataKey="Entradas"  fill="url(#vgGreen)" radius={[5, 5, 0, 0]} />
                          <Bar dataKey="Retiradas" fill="url(#vgAmber)" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    {taxaUso.length > 0 && (
                      <ChartCard titulo="Taxa de Consumo por Obra" sub="% do volume de entrada já retirado">
                        <div className="space-y-3.5 mt-1">
                          {taxaUso.slice(0, 7).map(t => {
                            const cor = t.pct >= 90 ? '#EF4444' : t.pct >= 70 ? '#F59E0B' : t.pct >= 50 ? '#3B82F6' : '#22C55E'
                            return (
                              <div key={t.obra}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs text-zinc-200 font-medium truncate pr-2">{t.obra}</span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[10px] text-zinc-600">{fmtN(t.retirada)}/{fmtN(t.entrada)}</span>
                                    <span className="text-xs font-black w-9 text-right" style={{ color: cor }}>{t.pct}%</span>
                                  </div>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(t.pct, 100)}%`, background: `linear-gradient(90deg, ${cor}88, ${cor})` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ChartCard>
                    )}
                  </div>
                </>
              )}

              {/* ── Estoque ── */}
              {saldoPorTipo.length > 0 && (
                <>
                  <Secao titulo="Estoque de Resíduos" />
                  <ChartCard titulo="Saldo Atual por Tipo" sub="entradas acumuladas menos retiradas registradas">
                    <ResponsiveContainer width="100%" height={Math.max(140, saldoPorTipo.length * 44)}>
                      <BarChart data={saldoPorTipo} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="hgPos" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%"   stopColor="#22C55E" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#22C55E" stopOpacity={1} />
                          </linearGradient>
                          <linearGradient id="hgNeg" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%"   stopColor="#EF4444" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#EF4444" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...GRID} horizontal={false} />
                        <XAxis type="number" {...AXIS} tickFormatter={fmtEixoN} />
                        <YAxis type="category" dataKey="tipo" width={150} {...AXIS} />
                        <Tooltip content={(p) => <TipNum {...p} />} cursor={{ fill: '#27272A' }} />
                        <Bar dataKey="saldo" name="Saldo" radius={[0, 7, 7, 0]}>
                          {saldoPorTipo.map((e, i) => (
                            <Cell key={i} fill={e.saldo >= 0 ? 'url(#hgPos)' : 'url(#hgNeg)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </>
              )}

              {/* ── Evolução Temporal ── */}
              {evolucao.length > 0 && (
                <>
                  <Secao titulo="Evolução Temporal" />
                  <ChartCard titulo="Gastos Mensais em Retiradas (R$)"
                    sub="histórico completo · não afetado pelo filtro de período">
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={evolucao} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={COR} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={COR} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...GRID} vertical={false} />
                        <XAxis dataKey="mes" {...AXIS} />
                        <YAxis tickFormatter={fmtEixo} {...AXIS} />
                        <Tooltip content={(p) => <TipMoeda {...p} />} cursor={{ stroke: '#52525B', strokeWidth: 1 }} />
                        <Area type="monotone" dataKey="Gastos" stroke={COR} strokeWidth={2.5}
                          fill="url(#gradGastos)"
                          dot={{ fill: COR, r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: COR, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </>
              )}

              {/* ── Composição por Obra ── */}
              {donutsPorObra.length > 0 && (
                <>
                  <Secao titulo="Composição de Resíduos por Obra" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {donutsPorObra.map(obra => (
                      <div key={obra.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                        <h3 className="font-bold text-zinc-100 text-sm truncate" title={obra.nome}>{obra.nome}</h3>
                        <p className="text-xs text-zinc-600 mt-0.5 mb-2">
                          {fmtN(obra.total)} un · {obra.data.length} tipo{obra.data.length !== 1 ? 's' : ''}
                          {obra.gastoTotal > 0 && <> · <span className="text-green-500 font-semibold">{fmtR(obra.gastoTotal)}</span></>}
                        </p>
                        {obra.data.length === 0 ? (
                          <p className="text-xs text-zinc-700 text-center py-6">Sem entradas</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                              <Pie data={obra.data} cx="50%" cy="45%"
                                innerRadius={38} outerRadius={65} paddingAngle={3} dataKey="value"
                                label={({ percent }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''}
                                labelLine={false}>
                                {obra.data.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v: number) => [fmtN(v), 'Volume']} contentStyle={TOOLTIP_STYLE} />
                              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: '#A1A1AA' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Alertas ── */}
              {alertas.filter(a => a.ativo && (a.saldo_atual ?? 0) <= a.minimo).length > 0 && (
                <>
                  <Secao titulo="Alertas de Saldo Baixo" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {alertas.filter(a => a.ativo && (a.saldo_atual ?? 0) <= a.minimo).map(a => {
                      const pct = a.minimo > 0 ? Math.round(((a.saldo_atual ?? 0) / a.minimo) * 100) : 0
                      return (
                        <div key={a.id} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-3.5 flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-200 truncate">{a.tipo_nome}</p>
                            <p className="text-xs text-zinc-500 truncate">{a.obra_nome}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-red-400">{fmtN(a.saldo_atual ?? 0)}</p>
                            <p className="text-[10px] text-zinc-600">mín: {fmtN(a.minimo)} · {pct}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
