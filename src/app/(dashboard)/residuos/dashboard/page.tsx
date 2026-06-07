'use client'

import { useEffect, useState } from 'react'
import { Recycle, TrendingDown, ClipboardList, AlertCircle, RefreshCw } from 'lucide-react'
import { saldosDB } from '@/lib/db-residuos'
import { obrasDB } from '@/lib/db'
import type { SaldoObra } from '@/types/residuos'
import type { Obra } from '@/types'
import { cn } from '@/lib/utils'

const COR = '#22C55E'

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export default function DashboardResiduosPage() {
  const [saldos, setSaldos] = useState<SaldoObra[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const [s, o] = await Promise.all([saldosDB.saldosPorObra(), obrasDB.list()])
      setSaldos(s)
      setObras(o.filter(o => o.ativa))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const obraIds = Array.from(new Set(saldos.map(s => s.obra_id)))
  const totalRetirada = saldos.reduce((acc, s) => acc + s.total_retirada, 0)
  const abaixoZero = saldos.filter(s => s.saldo < 0).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COR + '20' }}>
            <Recycle className="w-5 h-5" style={{ color: COR }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Gestão de Resíduos</h1>
            <p className="text-xs text-zinc-500">Saldo por obra e tipo de resíduo</p>
          </div>
        </div>
        <button onClick={carregar} disabled={loading}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Obras com Movimento', value: obraIds.length, icon: Recycle, cor: COR },
          { label: 'Total Retirado', value: fmt(totalRetirada), icon: TrendingDown, cor: '#F59E0B' },
          { label: 'Saldos Negativos', value: abaixoZero, icon: AlertCircle, cor: abaixoZero > 0 ? '#EF4444' : '#71717A' },
        ].map(k => (
          <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: k.cor + '20' }}>
              <k.icon className="w-4 h-4" style={{ color: k.cor }} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-zinc-100 leading-none">{k.value}</p>
            <p className="text-[11px] sm:text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-wide">{k.label}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      )}

      {erro && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {erro}
        </div>
      )}

      {!loading && !erro && obraIds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
          <ClipboardList className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nenhuma movimentação registrada ainda.</p>
        </div>
      )}

      {/* Cards por obra */}
      {!loading && obraIds.map(obraId => {
        const saldosObra = saldos.filter(s => s.obra_id === obraId)
        const obraNome = saldosObra[0]?.obra_nome
        const obra = obras.find(o => o.id === obraId)
        return (
          <div key={obraId} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COR }} />
              <h2 className="font-semibold text-zinc-200 text-sm">
                {obraNome ?? `Obra ${obraId.slice(0, 8)}…`}
              </h2>
              {obra?.codigo && (
                <span className="ml-auto text-xs text-zinc-600 font-mono">{obra.codigo}</span>
              )}
            </div>
            <div className="divide-y divide-zinc-800/60">
              {saldosObra.map(item => {
                const negativo = item.saldo < 0
                return (
                  <div key={`${item.tipo_id}-${item.unidade_medida}`}
                    className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{item.tipo_nome}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.unidade_medida}</p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>E: <span className="text-green-400">{fmt(item.total_entrada)}</span></span>
                        <span>R: <span className="text-amber-400">{fmt(item.total_retirada)}</span></span>
                      </div>
                      <p className={cn('text-base font-bold', negativo ? 'text-red-400' : 'text-zinc-100')}>
                        {negativo ? '-' : ''}{fmt(Math.abs(item.saldo))}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
