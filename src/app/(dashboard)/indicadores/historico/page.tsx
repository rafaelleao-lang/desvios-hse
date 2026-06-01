'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Filter, X, Pencil, RefreshCw, Download, Plus, ChevronDown,
  History, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts/AppContext'
import { indicadoresDB } from '@/lib/db'
import type { IndicadorSemanal } from '@/types'
import { cn } from '@/lib/utils'

const BLUE = '#3B82F6'
const ANOS = [2024, 2025, 2026, 2027]

function semLabel(semana: number, ano: number) {
  return `Se${String(semana).padStart(2, '0')}/${ano}`
}

// ── Cabeçalhos agrupados por seção ────────────────────────────────────────────

const GRUPOS = [
  {
    titulo: 'Efetivo',
    cor: '#3B82F6',
    colunas: [
      { key: 'efetivo',       label: 'Efetivo'        },
      { key: 'hht_trabalhada',label: 'HHT Trab.'      },
    ],
  },
  {
    titulo: 'Docs. Segurança',
    cor: '#06B6D4',
    colunas: [
      { key: 'apr_realizadas', label: 'APR' },
      { key: 'pt_realizadas',  label: 'PT'  },
    ],
  },
  {
    titulo: 'Desvios',
    cor: '#8B5CF6',
    colunas: [
      { key: 'desvios_ocorridos',    label: 'Ocorridos'   },
      { key: 'desvios_solucionados', label: 'Solucionados'},
    ],
  },
  {
    titulo: 'Alojamentos',
    cor: '#22C55E',
    colunas: [
      { key: 'alojamentos_conformes',      label: 'Conformes'   },
      { key: 'alojamentos_nao_conformes',  label: 'Não conf.'   },
      { key: 'alojamentos_totais',         label: 'Total'       },
    ],
  },
  {
    titulo: 'Treinamento',
    cor: '#F59E0B',
    colunas: [
      { key: 'hht_semanal',      label: 'HHT Trein.' },
      { key: 'pessoas_treinadas',label: 'P. Trein.'  },
    ],
  },
  {
    titulo: 'Ações',
    cor: '#10B981',
    colunas: [
      { key: 'dds',       label: 'DDS'      },
      { key: 'campanhas', label: 'Campanhas'},
    ],
  },
  {
    titulo: 'Acidentes e Incidentes',
    cor: '#EF4444',
    colunas: [
      { key: 'acidentes',               label: 'C/ Afastamento' },
      { key: 'acidente_sem_afastamento',label: 'S/ Afastamento' },
      { key: 'primeiros_socorros',      label: 'Prim. Socorros' },
      { key: 'quase_acidentes',         label: 'Quase Acid.'    },
      { key: 'danos_materiais',         label: 'Danos Mat.'     },
    ],
  },
] as const

type Campo = typeof GRUPOS[number]['colunas'][number]['key']

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportarCSV(indicadores: IndicadorSemanal[], obras: { id: string; nome: string }[]) {
  const SEP = ';'
  const todasColunas: { key: string; label: string }[] = [
    { key: 'obra', label: 'Obra' },
    { key: 'semana', label: 'Semana' },
    ...GRUPOS.flatMap(g => g.colunas as readonly { key: string; label: string }[]),
    { key: 'observacoes', label: 'Observações' },
  ]

  const sorted = [...indicadores].sort((a, b) => b.ano - a.ano || b.semana - a.semana)

  const rows = sorted.map(item => {
    const obra = obras.find(o => o.id === item.obra_id)?.nome ?? ''
    return todasColunas.map(col => {
      if (col.key === 'obra') return `"${obra}"`
      if (col.key === 'semana') return semLabel(item.semana, item.ano)
      if (col.key === 'observacoes') return `"${(item.observacoes ?? '').replace(/"/g, '""')}"`
      const v = item[col.key as keyof IndicadorSemanal]
      return v != null ? String(v) : '0'
    }).join(SEP)
  })

  const csv = '﻿' + [todasColunas.map(c => c.label).join(SEP), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `historico_indicadores_${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HistoricoPage() {
  const { obras, loaded } = useApp()
  const router = useRouter()

  const [indicadores,  setIndicadores]  = useState<IndicadorSemanal[]>([])
  const [loadingData,  setLoadingData]  = useState(true)
  const [showFiltros,  setShowFiltros]  = useState(false)

  const [filtroObra,    setFiltroObra]    = useState('todas')
  const [filtroAno,     setFiltroAno]     = useState(new Date().getFullYear())
  const [filtroSemIni,  setFiltroSemIni]  = useState(1)
  const [filtroSemFim,  setFiltroSemFim]  = useState(53)
  const [busca,         setBusca]         = useState('')

  const carregar = async () => {
    setLoadingData(true)
    try {
      const dados = await indicadoresDB.list({
        obra_id:    filtroObra !== 'todas' ? filtroObra : undefined,
        ano:        filtroAno,
        semana_ini: filtroSemIni,
        semana_fim: filtroSemFim,
      })
      setIndicadores(dados)
    } catch (e) { console.error(e) }
    finally { setLoadingData(false) }
  }

  useEffect(() => { carregar() }, [filtroObra, filtroAno, filtroSemIni, filtroSemFim])

  const entradas = useMemo(() => {
    const sorted = [...indicadores].sort((a, b) => b.ano - a.ano || b.semana - a.semana)
    if (!busca.trim()) return sorted
    const q = busca.toLowerCase()
    return sorted.filter(item => {
      const obra = obras.find(o => o.id === item.obra_id)?.nome ?? ''
      return obra.toLowerCase().includes(q) || semLabel(item.semana, item.ano).includes(q)
    })
  }, [indicadores, busca, obras])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BLUE + '20' }}>
            <History className="w-4 h-4" style={{ color: BLUE }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-100">Histórico de Indicadores</h1>
            <p className="text-sm text-zinc-500">{entradas.length} registros encontrados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFiltros(v => !v)}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-2 h-9">
            <Filter className="w-4 h-4" />
            Filtros
            {showFiltros ? <X className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          <Button variant="outline"
            onClick={() => exportarCSV(entradas, obras)}
            disabled={!entradas.length}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-200 gap-2 h-9">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <button onClick={carregar}
            className="p-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all h-9 w-9 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/indicadores/novo">
            <Button className="text-white font-semibold gap-2 h-9" style={{ background: BLUE }}>
              <Plus className="w-4 h-4" /> Lançar
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filtros ── */}
      {showFiltros && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Obra</label>
            <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)}
              className="h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-600">
              <option value="todas">Todas</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Ano</label>
            <select value={filtroAno} onChange={e => setFiltroAno(+e.target.value)}
              className="h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-600">
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Semana de</label>
            <input type="number" min="1" max="53" value={filtroSemIni}
              onChange={e => setFiltroSemIni(Math.max(1, Math.min(53, +e.target.value || 1)))}
              className="h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-600" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Semana até</label>
            <input type="number" min="1" max="53" value={filtroSemFim}
              onChange={e => setFiltroSemFim(Math.max(1, Math.min(53, +e.target.value || 53)))}
              className="h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-600" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Busca</label>
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Obra ou semana..."
              className="h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-600 placeholder-zinc-600" />
          </div>
        </div>
      )}

      {/* ── Tabela completa ── */}
      {loadingData ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : !entradas.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: BLUE + '15' }}>
            <History className="w-7 h-7" style={{ color: BLUE }} />
          </div>
          <p className="text-zinc-300 font-semibold">Nenhum lançamento encontrado</p>
          <p className="text-zinc-600 text-sm">Ajuste os filtros ou lance os primeiros indicadores</p>
          <Link href="/indicadores/novo">
            <Button className="text-white" style={{ background: BLUE }}>
              <Plus className="w-4 h-4 mr-2" /> Lançar indicadores
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs whitespace-nowrap">
              <thead>
                {/* Linha 1 — grupos */}
                <tr className="border-b border-zinc-800">
                  <th className="sticky left-0 z-10 bg-zinc-900 px-4 py-2.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest"
                    rowSpan={2}>
                    Obra
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest"
                    rowSpan={2}>
                    Semana
                  </th>
                  {GRUPOS.map(g => (
                    <th key={g.titulo}
                      colSpan={g.colunas.length}
                      className="px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest border-l border-zinc-800"
                      style={{ color: g.cor }}>
                      {g.titulo}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-l border-zinc-800"
                    rowSpan={2}>
                    Obs.
                  </th>
                  <th className="px-3 py-2.5" rowSpan={2} />
                </tr>
                {/* Linha 2 — sub-colunas */}
                <tr className="border-b border-zinc-800">
                  {GRUPOS.map((g, gi) =>
                    g.colunas.map((col, ci) => (
                      <th key={col.key}
                        className={cn(
                          'px-3 py-1.5 text-center text-[9px] font-semibold text-zinc-500 uppercase tracking-wider',
                          ci === 0 && 'border-l border-zinc-800',
                        )}>
                        {col.label}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {entradas.map(item => {
                  const obra = obras.find(o => o.id === item.obra_id)
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors group">
                      {/* Obra — sticky */}
                      <td className="sticky left-0 z-10 bg-zinc-900 group-hover:bg-zinc-800/40 px-4 py-2.5 font-semibold text-zinc-200 max-w-[140px] truncate">
                        {obra?.nome ?? '—'}
                      </td>
                      {/* Semana */}
                      <td className="px-3 py-2.5 font-mono text-zinc-400">
                        {semLabel(item.semana, item.ano)}
                      </td>

                      {/* Efetivo */}
                      <td className="px-3 py-2.5 text-center text-zinc-300 border-l border-zinc-800/50">{item.efetivo}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{Number(item.hht_trabalhada ?? 0)}</td>

                      {/* Docs */}
                      <td className="px-3 py-2.5 text-center text-zinc-300 border-l border-zinc-800/50">{item.apr_realizadas}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{item.pt_realizadas}</td>

                      {/* Desvios */}
                      <td className="px-3 py-2.5 text-center text-zinc-300 border-l border-zinc-800/50">{item.desvios_ocorridos}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{item.desvios_solucionados}</td>

                      {/* Alojamentos */}
                      <td className="px-3 py-2.5 text-center text-zinc-300 border-l border-zinc-800/50">{item.alojamentos_conformes}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{item.alojamentos_nao_conformes}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{item.alojamentos_totais}</td>

                      {/* Treinamento */}
                      <td className="px-3 py-2.5 text-center text-zinc-300 border-l border-zinc-800/50">{Number(item.hht_semanal).toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{item.pessoas_treinadas}</td>

                      {/* Ações */}
                      <td className="px-3 py-2.5 text-center text-zinc-300 border-l border-zinc-800/50">{item.dds}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{item.campanhas}</td>

                      {/* Acidentes */}
                      <td className="px-3 py-2.5 text-center border-l border-zinc-800/50">
                        <span className={item.acidentes > 0 ? 'text-red-400 font-bold' : 'text-zinc-300'}>{item.acidentes}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={item.acidente_sem_afastamento > 0 ? 'text-amber-400 font-bold' : 'text-zinc-300'}>{item.acidente_sem_afastamento}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{item.primeiros_socorros}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{item.quase_acidentes}</td>
                      <td className="px-3 py-2.5 text-center text-zinc-300">{item.danos_materiais}</td>

                      {/* Obs */}
                      <td className="px-3 py-2.5 text-zinc-500 border-l border-zinc-800/50 max-w-[120px] truncate">
                        {item.observacoes || '—'}
                      </td>

                      {/* Editar */}
                      <td className="px-3 py-2.5">
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

          {/* ── Totais ── */}
          <div className="border-t border-zinc-800 px-4 py-3 flex flex-wrap gap-x-6 gap-y-1">
            {[
              { label: 'Semanas', value: entradas.length },
              { label: 'Efetivo total', value: entradas.reduce((s, d) => s + d.efetivo, 0).toLocaleString('pt-BR') },
              { label: 'HHT Treinamento', value: entradas.reduce((s, d) => s + Number(d.hht_semanal), 0).toFixed(1) },
              { label: 'Acidentes', value: entradas.reduce((s, d) => s + d.acidentes, 0), destaque: true },
              { label: 'DDS', value: entradas.reduce((s, d) => s + d.dds, 0).toLocaleString('pt-BR') },
              { label: 'Campanhas', value: entradas.reduce((s, d) => s + d.campanhas, 0) },
              { label: 'Pessoas treinadas', value: entradas.reduce((s, d) => s + d.pessoas_treinadas, 0).toLocaleString('pt-BR') },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wide font-semibold">{t.label}:</span>
                <span className={cn('text-xs font-bold', (t as {destaque?: boolean}).destaque && Number(t.value) > 0 ? 'text-red-400' : 'text-zinc-300')}>
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
