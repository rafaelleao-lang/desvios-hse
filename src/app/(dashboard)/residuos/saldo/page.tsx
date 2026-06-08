'use client'
import { useEffect, useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Scale, FileText, RefreshCw, AlertCircle } from 'lucide-react'
import { saldosDB } from '@/lib/db-residuos'
import type { SaldoObra } from '@/types/residuos'

// ── Constantes ────────────────────────────────────────────────────────────────
const RED   = '#DC2626'
const CORES = [
  '#991B1B','#3B82F6','#22C55E','#F59E0B','#8B5CF6',
  '#EC4899','#06B6D4','#84CC16','#F97316','#6366F1',
]

// ── Tipos ─────────────────────────────────────────────────────────────────────
type ItemSaldo = { tipo_id: string; tipo_nome: string; unidade: string; saldo: number }
type ObraCard  = { obra_id: string; obra_nome: string; itens: ItemSaldo[] }

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtQtd(n: number, un: string) {
  const v = Number.isInteger(n) ? n : parseFloat(n.toFixed(2))
  return un ? `${v} ${un}` : `${v} un`
}
function abrev(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── Tooltip customizado ───────────────────────────────────────────────────────
function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ItemSaldo }> }) {
  if (!active || !payload?.[0]) return null
  const item = payload[0].payload
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-200 font-semibold mb-0.5">{item.tipo_nome}</p>
      <p className="text-zinc-400">{fmtQtd(item.saldo, item.unidade)}</p>
    </div>
  )
}

// ── Card de obra ──────────────────────────────────────────────────────────────
function ObraCardView({ obra }: { obra: ObraCard }) {
  const semSaldo = obra.itens.length === 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col"
      style={{ borderLeft: `3px solid ${RED}` }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-800">
        <h3 className="font-bold text-sm leading-tight" style={{ color: RED }} title={obra.obra_nome}>
          {obra.obra_nome}
        </h3>
      </div>

      {/* Lista de tipos */}
      <div className="px-4 py-3 space-y-2">
        {semSaldo ? (
          <p className="text-xs text-zinc-600 italic">Sem saldo disponível</p>
        ) : (
          obra.itens.map((item, i) => (
            <div key={item.tipo_id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: CORES[i % CORES.length] }} />
                <span className="text-xs text-zinc-400 truncate">{item.tipo_nome}</span>
              </div>
              <span className="text-xs font-bold text-zinc-100 flex-shrink-0">
                {fmtQtd(item.saldo, item.unidade)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Donut */}
      {!semSaldo && (
        <div className="px-4 pb-4 flex-1 flex flex-col">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={obra.itens}
                dataKey="saldo"
                nameKey="tipo_nome"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={obra.itens.length > 1 ? 2 : 0}
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              >
                {obra.itens.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legenda */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-1">
            {obra.itens.map((item, i) => (
              <div key={item.tipo_id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: CORES[i % CORES.length] }} />
                <span className="text-[11px] text-zinc-500">
                  {item.tipo_nome} ({fmtQtd(item.saldo, item.unidade)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function SaldoPage() {
  const [saldos, setSaldos]           = useState<SaldoObra[]>([])
  const [loading, setLoading]         = useState(true)
  const [erro, setErro]               = useState<string | null>(null)
  const [obraFiltro, setObraFiltro]   = useState('')
  const [gerandoPDF, setGerandoPDF]   = useState(false)

  async function carregar() {
    setLoading(true); setErro(null)
    try   { setSaldos(await saldosDB.saldosPorObra()) }
    catch { setErro('Erro ao carregar saldos.') }
    finally { setLoading(false) }
  }
  useEffect(() => { carregar() }, [])

  const opObras = useMemo(() => {
    const seen = new Set<string>()
    return saldos
      .filter(s => !seen.has(s.obra_id) && !!seen.add(s.obra_id))
      .map(s => ({ id: s.obra_id, nome: s.obra_nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [saldos])

  const obras = useMemo<ObraCard[]>(() => {
    const map = new Map<string, ObraCard>()
    for (const s of saldos) {
      if (!map.has(s.obra_id))
        map.set(s.obra_id, { obra_id: s.obra_id, obra_nome: s.obra_nome, itens: [] })
      if (s.saldo > 0)
        map.get(s.obra_id)!.itens.push({
          tipo_id: s.tipo_id, tipo_nome: s.tipo_nome,
          unidade: s.unidade_medida, saldo: s.saldo,
        })
    }
    return Array.from(map.values())
      .filter(o => !obraFiltro || o.obra_id === obraFiltro)
      .sort((a, b) => a.obra_nome.localeCompare(b.obra_nome))
  }, [saldos, obraFiltro])

  // ── Gerador de PDF ────────────────────────────────────────────────────────────
  function gerarPDF() {
    setGerandoPDF(true)
    try {
      const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const hoje = new Date()
      const PW = 210, ML = 10, MR = 10, MB = 14
      const CW = PW - ML - MR
      const R: [number,number,number] = [220, 38, 38]
      let y = 0

      const h2r = (hex: string): [number,number,number] => {
        return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
      }

      const drawHeader = () => {
        doc.setFillColor(R[0],R[1],R[2]); doc.rect(0,0,PW,18,'F')
        doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(255,255,255)
        doc.text('mse', ML, 12.5)
        doc.setLineWidth(0.3); doc.setDrawColor(255,255,255); doc.line(ML+14,4,ML+14,14)
        doc.setFontSize(8.5); doc.setFont('helvetica','normal')
        doc.text('Saldo de Resíduos  ·  MSE Engenharia', ML+18, 12.5)
        doc.setFontSize(7); doc.setTextColor(255,200,200)
        doc.text(hoje.toLocaleDateString('pt-BR'), PW-MR, 12.5, { align: 'right' })
      }

      const newPage = () => { doc.addPage(); drawHeader(); y = 26 }
      const ensureY = (n: number) => { if (y + n > 297 - MB) newPage() }

      const drawArcSeg = (
        cx: number, cy: number, midR: number,
        startA: number, endA: number,
        rgb: [number,number,number], lw: number
      ) => {
        const steps = Math.max(30, Math.ceil(Math.abs(endA - startA) / (2 * Math.PI) * 100))
        doc.setDrawColor(rgb[0],rgb[1],rgb[2]); doc.setLineWidth(lw)
        for (let i = 0; i < steps; i++) {
          const a1 = startA + (endA - startA) * i / steps
          const a2 = startA + (endA - startA) * (i + 1) / steps
          doc.line(
            cx + midR * Math.cos(a1), cy + midR * Math.sin(a1),
            cx + midR * Math.cos(a2), cy + midR * Math.sin(a2),
          )
        }
        doc.setLineWidth(0.1)
      }

      // ── Construção ────────────────────────────────────────────────────────────
      drawHeader(); y = 24

      // Barra de filtros
      doc.setFillColor(245,245,245); doc.rect(ML,y,CW,6,'F')
      doc.setFont('helvetica','italic'); doc.setFontSize(6.5); doc.setTextColor(100,100,100)
      const filtLabel = obraFiltro
        ? (opObras.find(o => o.id === obraFiltro)?.nome ?? 'Todas as obras')
        : 'Todas as obras'
      doc.text(
        `Saldo atual de resíduos  ·  ${filtLabel}  ·  ${hoje.toLocaleDateString('pt-BR')}`,
        ML+3, y+4.2,
      )
      y += 10

      // Cards 2 por linha
      const cW = (CW - 6) / 2
      const dR = 14, dI = 8  // raio externo / interno do donut

      const cardH = (n: number): number => {
        // título(14) + itens(n×7) + divisor(5) + donut(dR×2+8) + legenda(n×6)
        return n === 0 ? 28 : 14 + n * 7 + 5 + (dR * 2 + 8) + n * 6 + 4
      }

      const drawCard = (cx: number, cardY: number, obra: ObraCard) => {
        const n = obra.itens.length
        const h = cardH(n)

        // Fundo + borda esquerda vermelha
        doc.setFillColor(252,252,252); doc.roundedRect(cx, cardY, cW, h, 2, 2, 'F')
        doc.setFillColor(R[0],R[1],R[2]); doc.rect(cx, cardY, 2, h, 'F')

        // Título
        doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(R[0],R[1],R[2])
        doc.text(abrev(obra.obra_nome, 34), cx+5, cardY+7)

        let ry = cardY + 13

        if (n === 0) {
          doc.setFont('helvetica','italic'); doc.setFontSize(6.5); doc.setTextColor(160,160,160)
          doc.text('Sem saldo registrado', cx+5, ry+5)
          return
        }

        // Lista de tipos
        obra.itens.forEach((item, i) => {
          const rgb = h2r(CORES[i % CORES.length])
          doc.setFillColor(rgb[0],rgb[1],rgb[2]); doc.roundedRect(cx+4.5, ry+2, 2.8, 2.8, 0.5, 0.5, 'F')
          doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(60,60,60)
          doc.text(abrev(item.tipo_nome, 26), cx+9, ry+4.5)
          doc.setFont('helvetica','bold'); doc.setTextColor(25,25,25)
          doc.text(fmtQtd(item.saldo, item.unidade), cx+cW-2, ry+4.5, { align: 'right' })
          ry += 7
        })

        // Divisor
        doc.setDrawColor(225,225,225); doc.setLineWidth(0.2)
        doc.line(cx+4, ry+2, cx+cW-4, ry+2); ry += 6

        // Donut
        const dcx = cx + cW / 2
        const dcy = ry + dR + 1
        const total = obra.itens.reduce((s, i) => s + i.saldo, 0)
        const midR  = (dR + dI) / 2
        const lw    = dR - dI - 0.4
        let angle   = -Math.PI / 2
        obra.itens.forEach((item, i) => {
          const slice = (item.saldo / total) * 2 * Math.PI
          drawArcSeg(dcx, dcy, midR, angle, angle + slice, h2r(CORES[i % CORES.length]), lw)
          angle += slice
        })
        // total no centro
        doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(40,40,40)
        doc.text(String(Math.round(total)), dcx, dcy+1.5, { align: 'center' })
        doc.setFont('helvetica','normal'); doc.setFontSize(5); doc.setTextColor(150,150,150)
        doc.text('total', dcx, dcy-4.5, { align: 'center' })
        ry += dR * 2 + 6

        // Legenda
        obra.itens.forEach((item, i) => {
          const rgb = h2r(CORES[i % CORES.length])
          doc.setFillColor(rgb[0],rgb[1],rgb[2]); doc.roundedRect(cx+4, ry+0.8, 2.5, 2.5, 0.4, 0.4, 'F')
          doc.setFont('helvetica','normal'); doc.setFontSize(5.5); doc.setTextColor(55,55,55)
          doc.text(`${abrev(item.tipo_nome, 24)} (${fmtQtd(item.saldo, item.unidade)})`, cx+8, ry+2.5)
          ry += 6
        })
      }

      // Renderiza pares de cards
      for (let row = 0; row < obras.length; row += 2) {
        const left  = obras[row]
        const right = obras[row + 1] as ObraCard | undefined
        const h = Math.max(cardH(left.itens.length), right ? cardH(right.itens.length) : 0)
        ensureY(h + 5)
        drawCard(ML, y, left)
        if (right) drawCard(ML + cW + 6, y, right)
        y += h + 5
      }

      // Footer em todas as páginas
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFillColor(254,242,242); doc.rect(0,287,PW,10,'F')
        doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(160,160,160)
        doc.text('MSE Engenharia  ·  Saldo de Resíduos', ML, 293.5)
        doc.setFont('helvetica','bold'); doc.setTextColor(R[0],R[1],R[2])
        doc.text(`Página ${i} / ${totalPages}`, PW-MR, 293.5, { align: 'right' })
      }

      const dd = String(hoje.getDate()).padStart(2,'0')
      const mm = String(hoje.getMonth()+1).padStart(2,'0')
      const yy = hoje.getFullYear()
      doc.save(`Saldo-Residuos-${yy}-${mm}-${dd}.pdf`)
    } finally {
      setGerandoPDF(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const totalObras   = obras.length
  const totalSaldo   = obras.reduce((s, o) => s + o.itens.reduce((ss, i) => ss + i.saldo, 0), 0)
  const obrasZeradas = obras.filter(o => o.itens.length === 0).length

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: RED + '20' }}>
            <Scale className="w-5 h-5" style={{ color: RED }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Saldo de Resíduos</h1>
            <p className="text-xs text-zinc-500">Estoque atual por obra · entradas menos retiradas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={carregar} disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={gerarPDF}
            disabled={gerandoPDF || loading || obras.length === 0}
            className="h-9 flex items-center gap-2 px-4 rounded-xl text-white text-sm font-semibold shadow-sm disabled:opacity-40 transition-all"
            style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)' }}>
            <FileText className="w-4 h-4" />
            {gerandoPDF ? 'Gerando…' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* KPIs rápidos */}
      {!loading && !erro && totalObras > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'Com saldo',  value: String(totalObras - obrasZeradas), sub: 'obras ativas'    },
            { label: 'Em estoque', value: String(Math.round(totalSaldo)),    sub: 'unidades total'  },
            { label: 'Zeradas',    value: String(obrasZeradas),              sub: 'sem pendência'   },
          ].map(k => (
            <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 sm:p-3">
              <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wide truncate">{k.label}</p>
              <p className="text-lg sm:text-xl font-black mt-0.5" style={{ color: RED }}>{k.value}</p>
              <p className="text-[9px] sm:text-[10px] text-zinc-600 mt-0.5 truncate">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtro */}
      {opObras.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Filtrar por obra:</span>
          <select
            value={obraFiltro}
            onChange={e => setObraFiltro(e.target.value)}
            className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400 focus:outline-none transition-colors cursor-pointer"
            style={{ ['--tw-ring-color' as string]: RED }}
          >
            <option value="">Todas as obras</option>
            {opObras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
      )}

      {/* Estados */}
      {loading && (
        <div className="flex items-center justify-center h-48 text-zinc-500 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Carregando saldos…
        </div>
      )}
      {!loading && erro && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {erro}
        </div>
      )}
      {!loading && !erro && obras.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-zinc-500">
          <Scale className="w-8 h-8 opacity-20" />
          <p className="text-sm">Nenhuma obra encontrada</p>
        </div>
      )}

      {/* Grid de cards */}
      {!loading && !erro && obras.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map(obra => (
            <ObraCardView key={obra.obra_id} obra={obra} />
          ))}
        </div>
      )}
    </div>
  )
}
