'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LabelList, RadialBarChart, RadialBar,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import {
  Plus, FileDown, Loader2, TrendingUp, Users, AlertTriangle,
  BookOpen, ShieldCheck, Filter, History,
  ChevronDown, X, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts/AppContext'
import { indicadoresDB } from '@/lib/db'
import type { IndicadorSemanal } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChartPoint {
  label: string
  semana: number; ano: number
  efetivo: number; ausentes: number
  apr: number; pt: number
  desvOcorridos: number; desvSolucionados: number
  aloConformes: number; aloNaoConformes: number; aloTotais: number
  hht: number; hhtTrabalhada: number; acidentes: number; dds: number
  campanhas: number; pessoasTreinadas: number; primeirosSocorros: number
  quaseAcidentes: number; inspecoes: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BLUE   = '#3B82F6'
const CYAN   = '#06B6D4'
const GREEN  = '#22C55E'
const RED    = '#EF4444'
const PURPLE = '#8B5CF6'
const AMBER  = '#F59E0B'
const ANOS   = [2024, 2025, 2026, 2027]

// ── Helpers ───────────────────────────────────────────────────────────────────

function semLabel(semana: number, ano: number) {
  return `Se${String(semana).padStart(2, '0')}/${ano}`
}
function fmt(n: number) { return n.toLocaleString('pt-BR') }

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800/95 border border-zinc-700 rounded-xl px-3 py-2 shadow-2xl text-xs backdrop-blur">
      <p className="font-bold text-zinc-200 mb-1.5">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-zinc-400">{p.name}:</span>
          <span className="font-bold text-zinc-100">{fmt(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

// ── Gauge com RadialBar ───────────────────────────────────────────────────────

function Gauge({ value, max = 5, label, color, size = 140 }: {
  value: number; max?: number; label: string; color: string; size?: number
}) {
  const pct = Math.min((value / max) * 100, 100)
  const data = [{ value: pct, fill: color }]

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size * 0.6, position: 'relative' }}>
        <RadialBarChart
          width={size} height={size}
          cx={size / 2} cy={size * 0.72}
          innerRadius={size * 0.38} outerRadius={size * 0.5}
          startAngle={180} endAngle={0}
          data={[{ value: 100, fill: '#27272A' }, { value: pct, fill: color }]}
          barSize={size * 0.1}
        >
          <RadialBar dataKey="value" cornerRadius={4} background={false} />
        </RadialBarChart>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          lineHeight: 1,
        }}>
          <div style={{ fontSize: size * 0.18, fontWeight: 800, color: '#F4F4F5', lineHeight: 1 }}>
            {value % 1 !== 0 ? value.toFixed(1) : value}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-zinc-500 text-center leading-tight max-w-[110px]">{label}</p>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string
}) {
  return (
    <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-hidden group hover:border-zinc-700 transition-all">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(circle at top right, ${color}08 0%, transparent 60%)` }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-xl" style={{ background: color + '18' }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-zinc-100 leading-none">{value}</div>
        <div className="text-[11px] sm:text-xs font-semibold text-zinc-500 mt-1.5 uppercase tracking-wide">{label}</div>
        {sub && <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({ ocorridos, solucionados }: { ocorridos: number; solucionados: number }) {
  const taxa = ocorridos > 0 ? Math.round((solucionados / ocorridos) * 100) : 0
  const restante = Math.max(0, ocorridos - solucionados)
  const data = [
    { name: 'Solucionados', value: solucionados, fill: GREEN },
    { name: 'Em aberto', value: restante, fill: '#3F3F46' },
  ]
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <PieChart width={120} height={120}>
          <Pie data={data} dataKey="value" cx={55} cy={55} innerRadius={36} outerRadius={52} strokeWidth={0} startAngle={90} endAngle={-270}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-zinc-100">{taxa}%</span>
          <span className="text-[9px] text-zinc-500">solução</span>
        </div>
      </div>
      <div className="space-y-1 w-full">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.fill }} />
            <span className="text-zinc-500 flex-1">{d.name}</span>
            <span className="font-bold text-zinc-300">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Gauge light (export PDF) ─────────────────────────────────────────────────

function GaugeLight({ value, max = 5, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(value / max, 1)
  const cx = 70, cy = 85, r = 50
  function arcPath(fromA: number, toA: number) {
    const x1 = cx + r * Math.cos(fromA), y1 = cy - r * Math.sin(fromA)
    const x2 = cx + r * Math.cos(toA), y2 = cy - r * Math.sin(toA)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${Math.abs(toA - fromA) > Math.PI ? 1 : 0} 1 ${x2} ${y2}`
  }
  const actualEnd = Math.PI - pct * Math.PI
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={140} height={100} viewBox="0 0 140 100">
        <path d={arcPath(Math.PI, 0)} fill="none" stroke="#D4D4D8" strokeWidth={10} strokeLinecap="round" />
        {pct > 0 && <path d={arcPath(Math.PI, actualEnd)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />}
        <text x={cx} y={cy + 4} fontSize={20} fontWeight="800" fill="#111" textAnchor="middle">
          {value % 1 !== 0 ? value.toFixed(1) : value}
        </text>
        <text x={15} y={cy + 14} fontSize={8} fill="#666" textAnchor="middle">0</text>
        <text x={125} y={cy + 14} fontSize={8} fill="#666" textAnchor="middle">{max}</text>
      </svg>
      <p style={{ fontSize: 9, color: '#666', textAlign: 'center', maxWidth: 110 }}>{label}</p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IndicadoresPage() {
  const { obras, loaded } = useApp()
  const contentRef = useRef<HTMLDivElement>(null)

  const [indicadores,  setIndicadores]  = useState<IndicadorSemanal[]>([])
  const [loadingData,  setLoadingData]  = useState(true)
  const [exportando,   setExportando]   = useState(false)
  const [showFiltros,  setShowFiltros]  = useState(false)
  const [pdfMode,      setPdfMode]      = useState(false)
  const [emissaoData,  setEmissaoData]  = useState('')

  const [filtroObra, setFiltroObra] = useState('todas')
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear())
  const [filtroSemIni, setFiltroSemIni] = useState(1)
  const [filtroSemFim, setFiltroSemFim] = useState(53)
  const [filtroSemKPI, setFiltroSemKPI] = useState<number | null>(null)

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
    } catch (e) { console.error(e) }
    finally { setLoadingData(false) }
  }

  useEffect(() => { carregarDados() }, [filtroObra, filtroAno, filtroSemIni, filtroSemFim])

  // ── Chart data ─────────────────────────────────────────────────────────────

  const chartData = useMemo((): ChartPoint[] => {
    const map = new Map<string, ChartPoint>()
    const sorted = [...indicadores].sort((a, b) => a.ano - b.ano || a.semana - b.semana)
    for (const item of sorted) {
      const key = semLabel(item.semana, item.ano)
      const ex = map.get(key) ?? {
        label: key, semana: item.semana, ano: item.ano,
        efetivo: 0, ausentes: 0, apr: 0, pt: 0,
        desvOcorridos: 0, desvSolucionados: 0,
        aloConformes: 0, aloNaoConformes: 0, aloTotais: 0,
        hht: 0, hhtTrabalhada: 0, acidentes: 0, dds: 0, campanhas: 0,
        pessoasTreinadas: 0, primeirosSocorros: 0,
        quaseAcidentes: 0, inspecoes: 0,
      }
      ex.efetivo          += item.efetivo
      ex.ausentes         += item.ausentes
      ex.apr              += item.apr_realizadas
      ex.pt               += item.pt_realizadas
      ex.desvOcorridos    += item.desvios_ocorridos
      ex.desvSolucionados += item.desvios_solucionados
      ex.aloConformes     += item.alojamentos_conformes
      ex.aloNaoConformes  += item.alojamentos_nao_conformes
      ex.aloTotais        += item.alojamentos_totais
      ex.hht              += Number(item.hht_semanal)
      ex.hhtTrabalhada    += Number(item.hht_trabalhada)
      ex.acidentes        += item.acidentes
      ex.dds              += item.dds
      ex.campanhas        += item.campanhas
      ex.pessoasTreinadas += item.pessoas_treinadas
      ex.primeirosSocorros += item.primeiros_socorros
      ex.quaseAcidentes   += item.quase_acidentes
      ex.inspecoes        += item.inspecoes_semanais
      map.set(key, ex)
    }
    return Array.from(map.values())
  }, [indicadores])

  // ── Taxa de solução por semana (para linha no gráfico de desvios) ──────────
  const chartDataComTaxa = useMemo(() =>
    chartData.map(d => ({
      ...d,
      taxaSolucao: d.desvOcorridos > 0
        ? Math.round((d.desvSolucionados / d.desvOcorridos) * 100)
        : 100,
    })),
  [chartData])

  // ── Totais ─────────────────────────────────────────────────────────────────

  const totais = useMemo(() => ({
    hht: indicadores.reduce((s, d) => s + Number(d.hht_semanal), 0),
    hhtTrabalhada: indicadores.reduce((s, d) => s + Number(d.hht_trabalhada), 0),
    acidentes: indicadores.reduce((s, d) => s + d.acidentes, 0),
    dds: indicadores.reduce((s, d) => s + d.dds, 0),
    campanhas: indicadores.reduce((s, d) => s + d.campanhas, 0),
    pessoasTreinadas: indicadores.reduce((s, d) => s + d.pessoas_treinadas, 0),
    inspecoes: indicadores.reduce((s, d) => s + d.inspecoes_semanais, 0),
    primeirosSocorros: indicadores.reduce((s, d) => s + d.primeiros_socorros, 0),
    quaseAcidentes: indicadores.reduce((s, d) => s + d.quase_acidentes, 0),
    desvOcorridos: indicadores.reduce((s, d) => s + d.desvios_ocorridos, 0),
    desvSolucionados: indicadores.reduce((s, d) => s + d.desvios_solucionados, 0),
  }), [indicadores])

  const indicadoresKPI = useMemo(
    () => filtroSemKPI !== null ? indicadores.filter(d => d.semana === filtroSemKPI) : indicadores,
    [indicadores, filtroSemKPI]
  )

  const totaisKPI = useMemo(() => ({
    hht: indicadoresKPI.reduce((s, d) => s + Number(d.hht_semanal), 0),
    acidentes: indicadoresKPI.reduce((s, d) => s + d.acidentes, 0),
    dds: indicadoresKPI.reduce((s, d) => s + d.dds, 0),
    campanhas: indicadoresKPI.reduce((s, d) => s + d.campanhas, 0),
    pessoasTreinadas: indicadoresKPI.reduce((s, d) => s + d.pessoas_treinadas, 0),
    inspecoes: indicadoresKPI.reduce((s, d) => s + d.inspecoes_semanais, 0),
    primeirosSocorros: indicadoresKPI.reduce((s, d) => s + d.primeiros_socorros, 0),
    quaseAcidentes: indicadoresKPI.reduce((s, d) => s + d.quase_acidentes, 0),
  }), [indicadoresKPI])

  const ultimaSemana = chartData[chartData.length - 1]
  const obraAtual = obras.find(o => o.id === filtroObra)
  const semanaLabel = filtroSemIni === 1 && filtroSemFim === 53
    ? `Ano ${filtroAno}`
    : `Se${String(filtroSemIni).padStart(2,'0')}–Se${String(filtroSemFim).padStart(2,'0')}/${filtroAno}`

  // ── PDF — captura o dashboard real (fundo escuro, 100% fiel) ────────────────

  const gerarPDF = useCallback(async () => {
    if (!contentRef.current) return
    setExportando(true)

    // Formata data/hora de emissão
    const agora = new Date()
    const dataFormatada = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    setEmissaoData(`${dataFormatada} ${horaFormatada}`)

    // Ativa modo PDF: troca botões por data/hora e adiciona obra no título
    setPdfMode(true)
    await new Promise(r => setTimeout(r, 350)) // aguarda re-render

    try {
      window.scrollTo({ top: 0 })
      await new Promise(r => setTimeout(r, 100))

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(contentRef.current, {
        scale: 1.5,
        backgroundColor: '#09090b',
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
      })

      const { jsPDF } = await import('jspdf')

      // Tamanho do PDF baseado nas dimensões reais do conteúdo capturado
      const PX_TO_MM = 0.264583          // 1px a 96dpi = 0.264583mm
      const scale    = 1.5               // mesmo scale passado ao html2canvas
      const pdfW     = (canvas.width  / scale) * PX_TO_MM
      const pdfH     = (canvas.height / scale) * PX_TO_MM

      const pdf = new jsPDF({
        orientation: pdfW > pdfH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfW, pdfH],
        compress: true,
      })

      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.92),
        'JPEG', 0, 0, pdfW, pdfH,
        undefined, 'FAST'
      )

      const nomeObra = obraAtual?.nome ?? 'consolidado'
      pdf.save(`indicadores_${nomeObra.replace(/\s+/g, '_')}_${filtroAno}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setPdfMode(false)
      setExportando(false)
    }
  }, [contentRef, obraAtual, filtroAno])

  // ── Shared chart props ────────────────────────────────────────────────────

  const tick   = { fill: '#52525B', fontSize: 10 }
  const grid   = { strokeDasharray: '3 3', stroke: '#1F1F23', vertical: false }

  if (!loaded) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
    </div>
  )

  return (
    <div ref={contentRef} className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BLUE + '20' }}>
              <TrendingUp className="w-4 h-4" style={{ color: BLUE }} />
            </div>
            <h1 className="text-xl font-black text-zinc-100">
              Indicadores HSE
              {obraAtual && (
                <span className="text-zinc-400 font-semibold"> — {obraAtual.nome}</span>
              )}
            </h1>
          </div>
          <p className="text-sm text-zinc-500 ml-9">{semanaLabel} · {indicadores.length} lançamentos</p>
        </div>

        {/* Botões normais ou data/hora (modo PDF) */}
        {pdfMode ? (
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold">Emissão</p>
            <p className="text-sm font-bold text-zinc-200">{emissaoData}</p>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowFiltros(v => !v)}
              className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-2 h-9">
              <Filter className="w-4 h-4" />
              Filtros
              {showFiltros ? <X className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
            <Button variant="outline" onClick={gerarPDF}
              disabled={exportando || !indicadores.length}
              className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-2 h-9">
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              PDF
            </Button>
            <Link href={`/indicadores/novo${filtroObra !== 'todas' ? `?obra_id=${filtroObra}` : ''}`}>
              <Button className="text-white font-semibold gap-2 h-9" style={{ background: BLUE }}>
                <Plus className="w-4 h-4" /> Lançar
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Filtros (escondido no modo PDF) ── */}
      {showFiltros && !pdfMode && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Obra</label>
            <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-600">
              <option value="todas">Todas as obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Ano</label>
            <select value={filtroAno} onChange={e => setFiltroAno(+e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-600">
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Semana de</label>
            <input type="number" min="1" max="53" value={filtroSemIni}
              onChange={e => setFiltroSemIni(Math.max(1, Math.min(53, +e.target.value || 1)))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-600" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Semana até</label>
            <input type="number" min="1" max="53" value={filtroSemFim}
              onChange={e => setFiltroSemFim(Math.max(1, Math.min(53, +e.target.value || 53)))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-600" />
          </div>
        </div>
      )}

      {/* ── Loading / Empty ── */}
      {loadingData ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
      ) : !indicadores.length ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: BLUE + '15' }}>
            <TrendingUp className="w-8 h-8" style={{ color: BLUE }} />
          </div>
          <div>
            <p className="text-zinc-300 font-semibold">Nenhum indicador encontrado</p>
            <p className="text-zinc-600 text-sm mt-1">Lance os indicadores semanais para ver os gráficos</p>
          </div>
          <Link href="/indicadores/novo">
            <Button className="text-white" style={{ background: BLUE }}>
              <Plus className="w-4 h-4 mr-2" /> Lançar primeiros indicadores
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ── Filtrar semana de envio ── */}
          {!pdfMode && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Filtrar semana de envio</span>
              <select
                value={filtroSemKPI ?? ''}
                onChange={e => setFiltroSemKPI(e.target.value ? +e.target.value : null)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-600"
              >
                <option value="">Todas</option>
                {Array.from(new Set(indicadores.map(d => d.semana))).sort((a, b) => a - b).map(sem => (
                  <option key={sem} value={sem}>Se{String(sem).padStart(2, '0')}</option>
                ))}
              </select>
              {filtroSemKPI !== null && (
                <button
                  onClick={() => setFiltroSemKPI(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Limpar
                </button>
              )}
            </div>
          )}

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard label="HHT Acum." value={fmt(Math.round(totaisKPI.hht))} icon={BookOpen} color={BLUE} sub="horas homem" />
            <KPICard label="Acidentes" value={totaisKPI.acidentes} icon={AlertTriangle} color={RED} />
            <KPICard label="DDS" value={fmt(totaisKPI.dds)} icon={ShieldCheck} color={GREEN} />
            <KPICard label="Campanhas" value={totaisKPI.campanhas} icon={Activity} color={PURPLE} />
            <KPICard label="P. Treinadas" value={fmt(totaisKPI.pessoasTreinadas)} icon={Users} color={AMBER} />
            <KPICard label="Inspeções" value={fmt(totaisKPI.inspecoes)} icon={ShieldCheck} color={CYAN} />
            <KPICard label="1ºs Socorros" value={totaisKPI.primeirosSocorros} icon={AlertTriangle} color="#EC4899" />
            <KPICard label="Quase Acid." value={totaisKPI.quaseAcidentes} icon={AlertTriangle} color="#F97316" />
          </div>

          {/* ── Efetivo (Area) + Taxa de Desvios (Donut) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Area Chart — Efetivo */}
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-zinc-200">Efetivo MSE</p>
                  <p className="text-xs text-zinc-500">Evolução semanal do headcount</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-zinc-100">
                    {ultimaSemana?.efetivo ?? 0}
                  </div>
                  <div className="text-[10px] text-zinc-500">última semana</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradEfetivo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BLUE} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                    </linearGradient>
                    {indicadores.some(d => d.ausentes > 0) && (
                      <linearGradient id="gradAusentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={AMBER} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid {...grid} />
                  <XAxis dataKey="label" tick={tick} />
                  <YAxis tick={tick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="efetivo" name="Efetivo" stroke={BLUE} strokeWidth={2}
                    fill="url(#gradEfetivo)" dot={{ fill: BLUE, r: 3 }} activeDot={{ r: 5 }} />
                  {indicadores.some(d => d.ausentes > 0) && (
                    <Area type="monotone" dataKey="ausentes" name="Ausentes" stroke={AMBER} strokeWidth={2}
                      fill="url(#gradAusentes)" dot={false} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gauges + Donut */}
            <div className="flex flex-col gap-4">
              {/* Gauges row */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-around">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">HHT Sem.</span>
                  <Gauge value={ultimaSemana?.hht ?? 0}
                    max={Math.max(5, (ultimaSemana?.hht ?? 0) * 1.5 || 5)}
                    label="Homem Hora Treinamento" color={BLUE} size={100} />
                </div>
                <div className="w-px h-16 bg-zinc-800" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Acidentes</span>
                  <Gauge value={ultimaSemana?.acidentes ?? 0} max={5}
                    label="Qtd. de Acidentes" color={RED} size={100} />
                </div>
              </div>

              {/* Donut — taxa de solução */}
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col">
                <p className="text-sm font-bold text-zinc-200 mb-1">Taxa de Solução</p>
                <p className="text-xs text-zinc-500 mb-3">Desvios solucionados vs ocorridos</p>
                <div className="flex-1 flex items-center justify-center">
                  <DonutChart ocorridos={totais.desvOcorridos} solucionados={totais.desvSolucionados} />
                </div>
              </div>
            </div>
          </div>

          {/* ── APR×PT + Desvios ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* APR × PT — Grouped bars */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm font-bold text-zinc-200 mb-0.5">APR × PT</p>
              <p className="text-xs text-zinc-500 mb-4">Análises preliminares de risco e permissões de trabalho</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={2} margin={{ top: 16, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAPR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BLUE} />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                    <linearGradient id="gradPT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CYAN} />
                      <stop offset="100%" stopColor="#0E7490" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...grid} />
                  <XAxis dataKey="label" tick={tick} />
                  <YAxis tick={tick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#71717A', paddingTop: 8 }} />
                  <Bar dataKey="apr" name="APR / ABRA" fill="url(#gradAPR)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="apr" position="top" style={{ fill: '#71717A', fontSize: 9 }} />
                  </Bar>
                  <Bar dataKey="pt" name="PT / Stop Take Five" fill="url(#gradPT)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="pt" position="top" style={{ fill: '#71717A', fontSize: 9 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Desvios — bars + taxa line */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm font-bold text-zinc-200 mb-0.5">Desvios Ocorridos × Solucionados</p>
              <p className="text-xs text-zinc-500 mb-4">Com linha de taxa de solução (%)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartDataComTaxa} barGap={2} margin={{ top: 16, right: 30, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOcorridos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BLUE} />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                    <linearGradient id="gradSolucionados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} />
                      <stop offset="100%" stopColor="#15803D" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...grid} />
                  <XAxis dataKey="label" tick={tick} />
                  <YAxis yAxisId="left" tick={tick} />
                  <YAxis yAxisId="right" orientation="right" tick={{ ...tick, fontSize: 9 }} unit="%" domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#71717A', paddingTop: 8 }} />
                  <Bar yAxisId="left" dataKey="desvOcorridos" name="Ocorridos" fill="url(#gradOcorridos)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="desvOcorridos" position="top" style={{ fill: '#71717A', fontSize: 9 }} />
                  </Bar>
                  <Bar yAxisId="left" dataKey="desvSolucionados" name="Solucionados" fill="url(#gradSolucionados)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="desvSolucionados" position="top" style={{ fill: '#71717A', fontSize: 9 }} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="taxaSolucao" name="Taxa solução %" stroke={AMBER}
                    strokeWidth={2} dot={{ r: 3, fill: AMBER }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Alojamentos + HHT semanal ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Alojamentos */}
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm font-bold text-zinc-200 mb-0.5">Alojamentos</p>
              <p className="text-xs text-zinc-500 mb-4">Conformes, não conformes e total</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barGap={2} margin={{ top: 16, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradConformes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} />
                      <stop offset="100%" stopColor="#15803D" />
                    </linearGradient>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BLUE} />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...grid} />
                  <XAxis dataKey="label" tick={tick} />
                  <YAxis tick={tick} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#71717A', paddingTop: 8 }} />
                  <Bar dataKey="aloConformes" name="Conformes" fill="url(#gradConformes)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="aloConformes" position="top" style={{ fill: '#71717A', fontSize: 9 }} />
                  </Bar>
                  <Bar dataKey="aloNaoConformes" name="Não conformes" fill={RED} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aloTotais" name="Totais" fill="url(#gradTotal)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="aloTotais" position="top" style={{ fill: '#71717A', fontSize: 9 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* HHT semanal area */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm font-bold text-zinc-200 mb-0.5">HHT Semanal</p>
              <p className="text-xs text-zinc-500 mb-4">Homem Hora de Treinamento</p>
              <div className="text-2xl font-black mb-3" style={{ color: BLUE }}>
                {fmt(Math.round(totais.hht))}
                <span className="text-sm font-normal text-zinc-500 ml-1">horas</span>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradHHT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PURPLE} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ ...tick, fontSize: 8 }} />
                  <YAxis tick={{ ...tick, fontSize: 8 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="hht" name="HHT" stroke={PURPLE} strokeWidth={2}
                    fill="url(#gradHHT)" dot={{ fill: PURPLE, r: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── HHT Trabalhada ── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm font-bold text-zinc-200 mb-0.5">HHT Trabalhada</p>
            <p className="text-xs text-zinc-500 mb-4">Homem Hora Trabalhada</p>
            <div className="text-2xl font-black mb-3" style={{ color: CYAN }}>
              {fmt(Math.round(totais.hhtTrabalhada))}
              <span className="text-sm font-normal text-zinc-500 ml-1">horas</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradHHTrab" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ ...tick, fontSize: 8 }} />
                <YAxis tick={{ ...tick, fontSize: 8 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="hhtTrabalhada" name="HHT Trabalhada" stroke={CYAN} strokeWidth={2}
                  fill="url(#gradHHTrab)" dot={{ fill: CYAN, r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </>
      )}
    </div>
  )
}


