'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, RefreshCw, Download, FileText } from 'lucide-react'
import { saldosDB, retiradasDB, tiposDB } from '@/lib/db-residuos'
import { obrasDB } from '@/lib/db'
import type { Saldo, Retirada, TipoResiduo } from '@/types/residuos'
import type { Obra } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'

const COR = '#22C55E'

type Aba = 'tabela' | 'graficos'

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export default function RelatoriosResiduosPage() {
  const [aba, setAba] = useState<Aba>('tabela')
  const [entradas, setEntradas] = useState<Saldo[]>([])
  const [retiradas, setRetiradas] = useState<Retirada[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [tipos, setTipos] = useState<TipoResiduo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroResiduo, setFiltroResiduo] = useState('')
  const [filtroInicio, setFiltroInicio] = useState('')
  const [filtroFim, setFiltroFim] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [e, r, o, t] = await Promise.all([
        saldosDB.list(), retiradasDB.list(), obrasDB.list(), tiposDB.list(),
      ])
      setEntradas(e); setRetiradas(r); setObras(o); setTipos(t)
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar] )

  const nomeObra = (id: string) => obras.find(o => o.id === id)?.nome ?? id
  const nomeResiduo = (id: string) => tipos.find(t => t.id === id)?.nome ?? id

  function aplicarFiltros<T extends Saldo | Retirada>(lista: T[]): T[] {
    return lista.filter(item => {
      if (filtroObra && item.obra_id !== filtroObra) return false
      if (filtroResiduo && item.residuo_id !== filtroResiduo) return false
      if (filtroInicio && item.data < filtroInicio) return false
      if (filtroFim && item.data > filtroFim) return false
      return true
    })
  }

  const entradasF = aplicarFiltros(entradas)
  const retiradasF = aplicarFiltros(retiradas)

  const totalEntrada = entradasF.reduce((acc, e) => acc + e.quantidade, 0)
  const totalRetirada = retiradasF.reduce((acc, r) => acc + r.quantidade, 0)
  const totalValor = retiradasF.reduce((acc, r) => acc + (r.valor_total ?? 0), 0)

  // Dados para o gráfico: saldo por tipo de resíduo
  const dadosGrafico = tipos
    .map(t => {
      const ent = entradasF.filter(e => e.residuo_id === t.id).reduce((a, e) => a + e.quantidade, 0)
      const ret = retiradasF.filter(r => r.residuo_id === t.id).reduce((a, r) => a + r.quantidade, 0)
      return { nome: t.nome.slice(0, 18), entrada: ent, retirada: ret, saldo: ent - ret }
    })
    .filter(d => d.entrada > 0 || d.retirada > 0)

  async function exportarCSV() {
    const linhas = [
      ['Tipo', 'Data', 'Obra', 'Resíduo', 'Quantidade', 'Unidade', 'Valor Total'],
      ...entradasF.map(e => ['Entrada', e.data, nomeObra(e.obra_id), nomeResiduo(e.residuo_id), e.quantidade, e.unidade_medida, '']),
      ...retiradasF.map(r => ['Retirada', r.data, nomeObra(r.obra_id), nomeResiduo(r.residuo_id), r.quantidade, r.unidade_medida ?? '', r.valor_total ?? '']),
    ]
    const csv = linhas.map(l => l.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'relatorio-residuos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COR + '20' }}>
            <BarChart3 className="w-5 h-5" style={{ color: COR }} />
          </div>
          <h1 className="text-lg font-bold text-zinc-100">Relatórios</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} disabled={loading}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
          <option value="">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select value={filtroResiduo} onChange={e => setFiltroResiduo(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
          <option value="">Todos resíduos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
        <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-xl font-black text-green-400">{fmt(totalEntrada)}</p>
          <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wide">Total Entradas</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-xl font-black text-amber-400">{fmt(totalRetirada)}</p>
          <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wide">Total Retiradas</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-xl font-black text-zinc-100">R$ {fmt(totalValor)}</p>
          <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wide">Valor Total</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {(['tabela', 'graficos'] as Aba[]).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              aba === a ? '' : 'text-zinc-500 hover:text-zinc-300',
            )}
            style={aba === a ? { background: COR + '25', color: COR } : {}}>
            {a === 'tabela' ? 'Tabela' : 'Gráficos'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Carregando…</span>
        </div>
      )}

      {/* Tabela */}
      {!loading && aba === 'tabela' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Obra</th>
                  <th className="text-left px-4 py-3">Resíduo</th>
                  <th className="text-right px-4 py-3">Qtd</th>
                  <th className="text-left px-4 py-3">Unidade</th>
                  <th className="text-right px-4 py-3">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[
                  ...entradasF.map(e => ({ tipo: 'E', data: e.data, obra: e.obra_nome ?? nomeObra(e.obra_id), residuo: e.residuo_nome ?? nomeResiduo(e.residuo_id), qtd: e.quantidade, un: e.unidade_medida, valor: null as number | null })),
                  ...retiradasF.map(r => ({ tipo: 'R', data: r.data, obra: r.obra_nome ?? nomeObra(r.obra_id), residuo: r.residuo_nome ?? nomeResiduo(r.residuo_id), qtd: r.quantidade, un: r.unidade_medida ?? '', valor: r.valor_total ?? null })),
                ].sort((a, b) => b.data.localeCompare(a.data)).map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', row.tipo === 'E' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400')}>
                        {row.tipo === 'E' ? 'Entrada' : 'Retirada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{row.data}</td>
                    <td className="px-4 py-3 text-zinc-200 font-medium">{row.obra}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.residuo}</td>
                    <td className="px-4 py-3 text-right text-zinc-200">{fmt(row.qtd)}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.un}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">
                      {row.valor != null ? `R$ ${fmt(row.valor)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entradasF.length === 0 && retiradasF.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <FileText className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-sm">Nenhum resultado para os filtros selecionados</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gráficos */}
      {!loading && aba === 'graficos' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Entrada vs Retirada por Resíduo</h3>
            {dadosGrafico.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">Sem dados para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dadosGrafico} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="nome" tick={{ fill: '#71717A', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#71717A', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 8 }}
                    labelStyle={{ color: '#E4E4E7' }}
                    itemStyle={{ color: '#A1A1AA' }}
                  />
                  <Bar dataKey="entrada" name="Entrada" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="retirada" name="Retirada" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
