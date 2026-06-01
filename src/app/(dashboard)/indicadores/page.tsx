'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LabelList,
} from 'recharts'
import {
  Plus, FileDown, Loader2, TrendingUp, Users, AlertTriangle,
  BookOpen, ShieldCheck, Home, Filter, Pencil, RefreshCw,
  ChevronDown, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts/AppContext'
import { indicadoresDB } from '@/lib/db'
import type { IndicadorSemanal } from '@/types'
import { cn } from '@/lib/utils'

const MSE_RED = '#E8291C'

// ── Helpers ───────────────────────────────────────────────────────────────────

function semLabel(semana: number, ano: number) {
  return `Se${String(semana).padStart(2, '0')}/${ano}`
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

// ── Gauge SVG ─────────────────────────────────────────────────────────────────

function GaugeSVG({
  value, max = 5, label, color = '#3B82F6', size = 160,
}: {
  value: number; max?: number; label: string; color?: string; size?: number
}) {
  const pct = Math.min(value / max, 1)
  const cx = size / 2
  const cy = size * 0.62
  const r = size * 0.38
  const startAngle = Math.PI
  const endAngle = 0
  const angle = startAngle + pct * (endAngle - startAngle) // goes from π to 0
  const actualEnd = Math.PI - pct * Math.PI

  function arc(fromA: number, toA: number, stroke: string, strokeWidth: number) {
    const x1 = cx + r * Math.cos(fromA)
    const y1 = cy - r * Math.sin(fromA)
    const x2 = cx + r * Math.cos(toA)
    const y2 = cy - r * Math.sin(toA)
    const large = Math.abs(toA - fromA) > Math.PI ? 1 : 0
    return (
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    )
  }

  const needleX = cx + (r * 0.75) * Math.cos(Math.PI - pct * Math.PI)
  const needleY = cy - (r * 0.75) * Math.sin(Math.PI - pct * Math.PI)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
        {/* BG arc */}
        {arc(Math.PI, 0, '#3F3F46', 10)}
        {/* Value arc */}
        {pct > 0 && arc(Math.PI, actualEnd, color, 10)}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#E4E4E7" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="#E4E4E7" />
        {/* Min/Max labels */}
        <text x={cx - r - 6} y={cy + 14} fontSize={9} fill="#71717A" textAnchor="middle">0</text>
        <text x={cx + r + 6} y={cy + 14} fontSize={9} fill="#71717A" textAnchor="middle">{max}</text>
        {/* Value */}
        <text x={cx} y={cy + 4} fontSize={size * 0.14} fontWeight="700" fill="#F4F4F5" textAnchor="middle">
          {value.toLocaleString('pt-BR', { minimumFractionDigits: value % 1 !== 0 ? 1 : 0 })}
        </text>
      </svg>
      <p className="text-[10px] text-zinc-500 text-center mt-1 leading-tight max-w-[120px]">{label}</p>
    </div>
  )
}

// Same gauge but for the light PDF export div
function GaugeSVGLight({
  value, max = 5, label, color = '#3B82F6', size = 140,
}: {
  value: number; max?: number; label: string; color?: string; size?: number
}) {
  const pct = Math.min(value / max, 1)
  const cx = size / 2, cy = size * 0.62, r = size * 0.38
  const actualEnd = Math.PI - pct * Math.PI
  function arc(fromA: number, toA: number, stroke: string, sw: number) {
    const x1 = cx + r * Math.cos(fromA), y1 = cy - r * Math.sin(fromA)
    const x2 = cx + r * Math.cos(toA), y2 = cy - r * Math.sin(toA)
    const large = Math.abs(toA - fromA) > Math.PI ? 1 : 0
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
  }
  const needleX = cx + (r * 0.75) * Math.cos(Math.PI - pct * Math.PI)
  const needleY = cy - (r * 0.75) * Math.sin(Math.PI - pct * Math.PI)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
        {arc(Math.PI, 0, '#D4D4D8', 10)}
        {pct > 0 && arc(Math.PI, actualEnd, color, 10)}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#111" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="#111" />
        <text x={cx - r - 6} y={cy + 14} fontSize={9} fill="#666" textAnchor="middle">0</text>
        <text x={cx + r + 6} y={cy + 14} fontSize={9} fill="#666" textAnchor="middle">{max}</text>
        <text x={cx} y={cy + 4} fontSize={size * 0.14} fontWeight="700" fill="#111" textAnchor="middle">
          {value.toLocaleString('pt-BR', { minimumFractionDigits: value % 1 !== 0 ? 1 : 0 })}
        </text>
      </svg>
      <p style={{ fontSize: 9, color: '#666', textAlign: 'center', marginTop: 2, maxWidth: 110 }}>{label}</p>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</span>
        <div className="p-1.5 rounded-lg" style={{ background: color + '20' }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <span className="text-2xl font-black text-zinc-100">{value}</span>
    </div>
  )
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-zinc-300 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{fmt(p.value)}</span></p>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ANOS = [2024, 2025, 2026, 2027]

export default function IndicadoresPage() {
  const { obras, loaded } = useApp()
  const router = useRouter()
  const exportRef = useRef<HTMLDivElement>(null)

  const [indicadores, setIndicadores] = useState<IndicadorSemanal[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [showFiltros, setShowFiltros] = useState(false)

  // Filters
  const [filtroObra, setFiltroObra] = useState('todas')
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear())
  const [filtroSemIni, setFiltroSemIni] = useState(1)
  const [filtroSemFim, setFiltroSemFim] = useState(53)

  const carregarDados = async () => {
    setLoadingData(true)
    try {
      const dados = await indicadoresDB.list({
        obra_id: filtroObra !== 'todas' ? filtroObra : undefined,
        ano: filtroAno,
        semana_ini: filtroSemIni,
        semana_fim: filtroSemFim,
      })
      setIndicadores(dados)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => { carregarDados() }, [filtroObra, filtroAno, filtroSemIni, filtroSemFim])

  // ── Computed: chart data (aggregated by week) ────────────────────────────────

  const chartData = useMemo(() => {
    const map = new Map<string, {
      label: string; semana: number; ano: number
      efetivo: number; ausentes: number
      apr: number; pt: number
      desvOcorridos: number; desvSolucionados: number
      aloConformes: number; aloNaoConformes: number; aloTotais: number
      hht: number; acidentes: number; dds: number; campanhas: number
      pessoasTreinadas: number; primeirosSocorros: number
      quaseAcidentes: number; danosMateriais: number; inspecoes: number
    }>()

    const sorted = [...indicadores].sort((a, b) => a.ano - b.ano || a.semana - b.semana)
    for (const item of sorted) {
      const key = semLabel(item.semana, item.ano)
      const existing = map.get(key)
      if (existing) {
        existing.efetivo += item.efetivo
        existing.ausentes += item.ausentes
        existing.apr += item.apr_realizadas
        existing.pt += item.pt_realizadas
        existing.desvOcorridos += item.desvios_ocorridos
        existing.desvSolucionados += item.desvios_solucionados
        existing.aloConformes += item.alojamentos_conformes
        existing.aloNaoConformes += item.alojamentos_nao_conformes
        existing.aloTotais += item.alojamentos_totais
        existing.hht += item.hht_semanal
        existing.acidentes += item.acidentes
        existing.dds += item.dds
        existing.campanhas += item.campanhas
        existing.pessoasTreinadas += item.pessoas_treinadas
        existing.primeirosSocorros += item.primeiros_socorros
        existing.quaseAcidentes += item.quase_acidentes
        existing.danosMateriais += item.danos_materiais
        existing.inspecoes += item.inspecoes_semanais
      } else {
        map.set(key, {
          label: key, semana: item.semana, ano: item.ano,
          efetivo: item.efetivo, ausentes: item.ausentes,
          apr: item.apr_realizadas, pt: item.pt_realizadas,
          desvOcorridos: item.desvios_ocorridos, desvSolucionados: item.desvios_solucionados,
          aloConformes: item.alojamentos_conformes, aloNaoConformes: item.alojamentos_nao_conformes,
          aloTotais: item.alojamentos_totais,
          hht: item.hht_semanal, acidentes: item.acidentes,
          dds: item.dds, campanhas: item.campanhas,
          pessoasTreinadas: item.pessoas_treinadas, primeirosSocorros: item.primeiros_socorros,
          quaseAcidentes: item.quase_acidentes, danosMateriais: item.danos_materiais,
          inspecoes: item.inspecoes_semanais,
        })
      }
    }
    return Array.from(map.values())
  }, [indicadores])

  // ── KPI Totals ───────────────────────────────────────────────────────────────

  const totais = useMemo(() => ({
    hht: indicadores.reduce((s, d) => s + Number(d.hht_semanal), 0),
    acidentes: indicadores.reduce((s, d) => s + d.acidentes, 0),
    dds: indicadores.reduce((s, d) => s + d.dds, 0),
    campanhas: indicadores.reduce((s, d) => s + d.campanhas, 0),
    pessoasTreinadas: indicadores.reduce((s, d) => s + d.pessoas_treinadas, 0),
    inspecoes: indicadores.reduce((s, d) => s + d.inspecoes_semanais, 0),
    primeirosSocorros: indicadores.reduce((s, d) => s + d.primeiros_socorros, 0),
    quaseAcidentes: indicadores.reduce((s, d) => s + d.quase_acidentes, 0),
  }), [indicadores])

  const ultimaSemana = chartData[chartData.length - 1]

  // ── Obra info ─────────────────────────────────────────────────────────────────

  const obraAtual = obras.find(o => o.id === filtroObra)
  const semanaLabel = filtroSemIni === 1 && filtroSemFim === 53
    ? `Ano ${filtroAno} — todas as semanas`
    : `Se${String(filtroSemIni).padStart(2,'0')} a Se${String(filtroSemFim).padStart(2,'0')}/${filtroAno}`

  // ── PDF Export ─────────────────────────────────────────────────────────────────

  const gerarPDF = async () => {
    if (!exportRef.current) return
    setExportando(true)
    try {
      const el = exportRef.current
      el.style.visibility = 'visible'
      el.style.pointerEvents = 'none'

      await new Promise(r => setTimeout(r, 800))

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      })

      el.style.visibility = 'hidden'
      el.style.pointerEvents = 'none'

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const ratio = canvas.height / canvas.width
      const imgH = pdfW * ratio
      if (imgH <= pdfH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, imgH)
      } else {
        // Scale to fit height
        const imgW = pdfH / ratio
        pdf.addImage(imgData, 'JPEG', (pdfW - imgW) / 2, 0, imgW, pdfH)
      }

      const nomeObra = obraAtual?.nome ?? 'Consolidado'
      pdf.save(`indicadores_hse_${nomeObra.replace(/\s+/g, '_')}_${filtroAno}.pdf`)
    } catch (e) {
      console.error('PDF error:', e)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setExportando(false)
    }
  }

  // ── Table entries sorted ─────────────────────────────────────────────────────

  const entradas = useMemo(() =>
    [...indicadores].sort((a, b) => b.ano - a.ano || b.semana - a.semana),
  [indicadores])

  const tick = { fill: '#71717A', fontSize: 11 }
  const gridProps = { strokeDasharray: '3 3', stroke: '#27272A' }

  if (!loaded) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" style={{ color: MSE_RED }} />
            Indicadores HSE
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{semanaLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFiltros(v => !v)}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
            {showFiltros ? <X className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          <Button
            variant="outline"
            onClick={gerarPDF}
            disabled={exportando || indicadores.length === 0}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-2"
          >
            {exportando
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileDown className="w-4 h-4" />}
            PDF
          </Button>
          <Link href={`/indicadores/novo${filtroObra !== 'todas' ? `?obra_id=${filtroObra}` : ''}`}>
            <Button className="text-white font-semibold gap-2" style={{ background: MSE_RED }}>
              <Plus className="w-4 h-4" />
              Lançar
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filtros ── */}
      {showFiltros && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Obra</label>
            <select
              value={filtroObra}
              onChange={e => setFiltroObra(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600"
            >
              <option value="todas">Todas as obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Ano</label>
            <select
              value={filtroAno}
              onChange={e => setFiltroAno(parseInt(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600"
            >
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Semana de</label>
            <input
              type="number" min="1" max="53"
              value={filtroSemIni}
              onChange={e => setFiltroSemIni(Math.max(1, Math.min(53, parseInt(e.target.value) || 1)))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Semana até</label>
            <input
              type="number" min="1" max="53"
              value={filtroSemFim}
              onChange={e => setFiltroSemFim(Math.max(1, Math.min(53, parseInt(e.target.value) || 53)))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600"
            />
          </div>
        </div>
      )}

      {/* ── Loading / Empty ── */}
      {loadingData ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : indicadores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-zinc-700" />
          </div>
          <div>
            <p className="text-zinc-300 font-semibold">Nenhum indicador encontrado</p>
            <p className="text-zinc-600 text-sm mt-1">Lance os indicadores semanais para visualizar os gráficos</p>
          </div>
          <Link href="/indicadores/novo">
            <Button className="text-white" style={{ background: MSE_RED }}>
              <Plus className="w-4 h-4 mr-2" /> Lançar primeiros indicadores
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KPICard label="HHT Acum." value={fmt(Math.round(totais.hht))} icon={BookOpen} color="#3B82F6" />
            <KPICard label="Acidentes" value={totais.acidentes} icon={AlertTriangle} color="#EF4444" />
            <KPICard label="DDS" value={fmt(totais.dds)} icon={ShieldCheck} color="#10B981" />
            <KPICard label="Campanhas" value={totais.campanhas} icon={TrendingUp} color="#8B5CF6" />
            <KPICard label="P. Treinadas" value={fmt(totais.pessoasTreinadas)} icon={Users} color="#F59E0B" />
            <KPICard label="Inspeções" value={fmt(totais.inspecoes)} icon={ShieldCheck} color="#06B6D4" />
            <KPICard label="1ºs Socorros" value={totais.primeirosSocorros} icon={AlertTriangle} color="#EC4899" />
            <KPICard label="Quase Acid." value={totais.quaseAcidentes} icon={AlertTriangle} color="#F97316" />
          </div>

          {/* ── Gauges ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2 sm:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">HHT Semanal</p>
              <GaugeSVG
                value={ultimaSemana?.hht ?? 0}
                max={Math.max(5, (ultimaSemana?.hht ?? 0) * 1.5)}
                label="Hora Homem de Treinamento"
                color="#3B82F6"
              />
              {ultimaSemana && (
                <p className="text-[10px] text-zinc-600">{ultimaSemana.label}</p>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Acidentes</p>
              <GaugeSVG
                value={ultimaSemana?.acidentes ?? 0}
                max={5}
                label="Quantidade de Acidentes"
                color="#EF4444"
              />
              {ultimaSemana && (
                <p className="text-[10px] text-zinc-600">{ultimaSemana.label}</p>
              )}
            </div>

            {/* Mini KPIs no espaço das gauges */}
            <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Efetivo médio', value: chartData.length ? Math.round(chartData.reduce((s, d) => s + d.efetivo, 0) / chartData.length) : 0 },
                { label: 'Média APR/sem', value: chartData.length ? Math.round(chartData.reduce((s, d) => s + d.apr, 0) / chartData.length) : 0 },
                { label: 'Taxa solução', value: (() => {
                  const oc = indicadores.reduce((s, d) => s + d.desvios_ocorridos, 0)
                  const sol = indicadores.reduce((s, d) => s + d.desvios_solucionados, 0)
                  return oc > 0 ? `${Math.round((sol / oc) * 100)}%` : '—'
                })() },
                { label: 'Semanas lançadas', value: chartData.length },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-semibold">{item.label}</span>
                  <span className="text-xl font-black text-zinc-100">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Charts 2x2 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Efetivo MSE */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Efetivo MSE</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" tick={tick} />
                  <YAxis tick={tick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#A1A1AA' }} />
                  <Bar dataKey="efetivo" name="Efetivo" fill="#3B82F6" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="efetivo" position="top" style={{ fill: '#A1A1AA', fontSize: 10 }} />
                  </Bar>
                  {indicadores.some(d => d.ausentes > 0) && (
                    <Bar dataKey="ausentes" name="Ausentes" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* APR x PT */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">APR x PT</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" tick={tick} />
                  <YAxis tick={tick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#A1A1AA' }} />
                  <Bar dataKey="apr" name="APR / ABRA" fill="#3B82F6" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="apr" position="top" style={{ fill: '#A1A1AA', fontSize: 10 }} />
                  </Bar>
                  <Bar dataKey="pt" name="PT / Stop Take Five" fill="#06B6D4" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="pt" position="top" style={{ fill: '#A1A1AA', fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Desvios */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Desvios Ocorridos × Solucionados</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" tick={tick} />
                  <YAxis tick={tick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#A1A1AA' }} />
                  <Bar dataKey="desvOcorridos" name="Ocorridos" fill="#3B82F6" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="desvOcorridos" position="top" style={{ fill: '#A1A1AA', fontSize: 10 }} />
                  </Bar>
                  <Bar dataKey="desvSolucionados" name="Solucionados" fill="#06B6D4" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="desvSolucionados" position="top" style={{ fill: '#A1A1AA', fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Alojamentos */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Alojamentos</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" tick={tick} />
                  <YAxis tick={tick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#A1A1AA' }} />
                  <Bar dataKey="aloConformes" name="Conformes" fill="#22C55E" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="aloConformes" position="top" style={{ fill: '#A1A1AA', fontSize: 10 }} />
                  </Bar>
                  <Bar dataKey="aloNaoConformes" name="Não conformes" fill="#EF4444" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="aloNaoConformes" position="top" style={{ fill: '#A1A1AA', fontSize: 10 }} />
                  </Bar>
                  <Bar dataKey="aloTotais" name="Totais" fill="#3B82F6" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="aloTotais" position="top" style={{ fill: '#A1A1AA', fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Entries Table ── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <p className="text-sm font-bold text-zinc-200">
                Lançamentos ({entradas.length})
              </p>
              <button
                onClick={carregarDados}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Obra', 'Semana', 'Efetivo', 'APR', 'PT', 'Desv. Oc.', 'Desv. Sol.', 'HHT', 'Acid.', 'DDS', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {entradas.map(item => {
                    const obra = obras.find(o => o.id === item.obra_id)
                    return (
                      <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-4 py-3 text-zinc-300 font-medium whitespace-nowrap max-w-[160px] truncate">
                          {obra?.nome ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                          {semLabel(item.semana, item.ano)}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{fmt(item.efetivo)}</td>
                        <td className="px-4 py-3 text-zinc-300">{item.apr_realizadas}</td>
                        <td className="px-4 py-3 text-zinc-300">{item.pt_realizadas}</td>
                        <td className="px-4 py-3 text-zinc-300">{item.desvios_ocorridos}</td>
                        <td className="px-4 py-3 text-zinc-300">{item.desvios_solucionados}</td>
                        <td className="px-4 py-3 text-zinc-300">{Number(item.hht_semanal).toFixed(1)}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'font-bold',
                            item.acidentes > 0 ? 'text-red-400' : 'text-zinc-300',
                          )}>
                            {item.acidentes}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{item.dds}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/indicadores/${item.id}`)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Hidden PDF Export Div (light theme) ── */}
      <div
        ref={exportRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1122,
          background: '#ffffff',
          padding: '24px 28px',
          fontFamily: 'Arial, Helvetica, sans-serif',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '2px solid #E8291C', paddingBottom: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#E8291C', letterSpacing: -1 }}>mse</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#111', letterSpacing: 0.5 }}>
            INDICADORES HSE{obraAtual ? ` — ${obraAtual.nome.toUpperCase()}` : ' — CONSOLIDADO'}
          </span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#666' }}>Data de emissão:</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>
              {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Main row: 3 charts + KPI column */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 170px', gap: 12, marginBottom: 12 }}>
          {/* Efetivo */}
          <div>
            <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#333', marginBottom: 4 }}>EFETIVO MSE</p>
            <BarChart width={240} height={170} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 8 }} />
              <YAxis tick={{ fill: '#666', fontSize: 8 }} />
              <Bar dataKey="efetivo" fill="#3B82F6" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="efetivo" position="top" style={{ fill: '#333', fontSize: 7 }} />
              </Bar>
            </BarChart>
          </div>

          {/* APR x PT */}
          <div>
            <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#333', marginBottom: 4 }}>APR x PT</p>
            <BarChart width={240} height={170} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 8 }} />
              <YAxis tick={{ fill: '#666', fontSize: 8 }} />
              <Legend wrapperStyle={{ fontSize: 8 }} />
              <Bar dataKey="apr" name="APR" fill="#3B82F6" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="apr" position="top" style={{ fill: '#333', fontSize: 7 }} />
              </Bar>
              <Bar dataKey="pt" name="PT" fill="#06B6D4" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="pt" position="top" style={{ fill: '#333', fontSize: 7 }} />
              </Bar>
            </BarChart>
          </div>

          {/* Desvios */}
          <div>
            <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#333', marginBottom: 4 }}>DESVIOS OCORRIDOS × SOLUCIONADOS</p>
            <BarChart width={240} height={170} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 8 }} />
              <YAxis tick={{ fill: '#666', fontSize: 8 }} />
              <Legend wrapperStyle={{ fontSize: 8 }} />
              <Bar dataKey="desvOcorridos" name="Ocorridos" fill="#3B82F6" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="desvOcorridos" position="top" style={{ fill: '#333', fontSize: 7 }} />
              </Bar>
              <Bar dataKey="desvSolucionados" name="Solucionados" fill="#06B6D4" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="desvSolucionados" position="top" style={{ fill: '#333', fontSize: 7 }} />
              </Bar>
            </BarChart>
          </div>

          {/* KPI Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'DDS', value: fmt(totais.dds) },
              { label: 'Campanhas', value: totais.campanhas },
              { label: 'Primeiros Socorros', value: totais.primeirosSocorros },
              { label: 'Pessoas Treinadas', value: fmt(totais.pessoasTreinadas) },
              { label: 'Quase Acidentes', value: totais.quaseAcidentes },
              { label: 'HHT Acumulado', value: fmt(Math.round(totais.hht)) },
            ].map(k => (
              <div key={k.label} style={{
                background: '#F5F5F5', borderRadius: 8, padding: '6px 8px',
                textAlign: 'center', border: '1px solid #E5E5E5',
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#111', lineHeight: 1.2 }}>{k.value}</div>
                <div style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: Gauges + Alojamentos */}
        <div style={{ display: 'grid', gridTemplateColumns: '170px 170px 1fr', gap: 12 }}>
          {/* HHT Gauge */}
          <div style={{ textAlign: 'center', background: '#F9F9F9', borderRadius: 12, padding: 8, border: '1px solid #E5E5E5' }}>
            <GaugeSVGLight
              value={ultimaSemana?.hht ?? 0}
              max={Math.max(5, (ultimaSemana?.hht ?? 0) * 1.5)}
              label="Hora Homem de Treinamento"
              color="#3B82F6"
              size={140}
            />
          </div>

          {/* Acidentes Gauge */}
          <div style={{ textAlign: 'center', background: '#F9F9F9', borderRadius: 12, padding: 8, border: '1px solid #E5E5E5' }}>
            <GaugeSVGLight
              value={ultimaSemana?.acidentes ?? 0}
              max={5}
              label="Quantidade de Acidentes"
              color="#EF4444"
              size={140}
            />
          </div>

          {/* Alojamentos */}
          <div>
            <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#333', marginBottom: 4 }}>ALOJAMENTOS</p>
            <BarChart width={680} height={180} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 8 }} />
              <YAxis tick={{ fill: '#666', fontSize: 8 }} />
              <Legend wrapperStyle={{ fontSize: 8 }} />
              <Bar dataKey="aloConformes" name="Conformes" fill="#22C55E" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="aloConformes" position="top" style={{ fill: '#333', fontSize: 7 }} />
              </Bar>
              <Bar dataKey="aloNaoConformes" name="Não conformes" fill="#EF4444" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="aloNaoConformes" position="top" style={{ fill: '#333', fontSize: 7 }} />
              </Bar>
              <Bar dataKey="aloTotais" name="Totais" fill="#3B82F6" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="aloTotais" position="top" style={{ fill: '#333', fontSize: 7 }} />
              </Bar>
            </BarChart>
          </div>
        </div>

        {/* Period info */}
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #E5E5E5', fontSize: 9, color: '#999', display: 'flex', justifyContent: 'space-between' }}>
          <span>Período: {semanaLabel}</span>
          <span>Gerado por MSE Desvios HSE</span>
        </div>
      </div>
    </div>
  )
}
