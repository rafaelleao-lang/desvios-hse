'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { alojamentosDB, alojamentoLocaisDB } from '@/lib/db-alojamentos'
import { gerarPDFAlojamento } from '@/lib/pdf-alojamento'
import { computeAlojamentoStatus, ultimoRelatorio, STATUS_CONFIG } from '@/lib/alojamento-status'
import type { Alojamento, AlojamentoLocal } from '@/types/alojamentos'
import { Building2, MapPin, Eye, FileText, Loader2, ShieldCheck } from 'lucide-react'

const ALOJ_COLOR = '#6366F1'

function formatDate(d?: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

export default function ControleAlojamentosPage() {
  const router = useRouter()

  const [locais, setLocais] = useState<AlojamentoLocal[]>([])
  const [relatorios, setRelatorios] = useState<Alojamento[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([alojamentoLocaisDB.list(), alojamentosDB.list()])
      .then(([l, r]) => { setLocais(l); setRelatorios(r) })
      .catch(err => console.error('[alojamentos] controle:', err))
      .finally(() => setLoading(false))
  }, [])

  const relatoriosPorLocal = useMemo(() => {
    const map = new Map<string, Alojamento[]>()
    for (const r of relatorios) {
      if (!r.alojamento_local_id) continue
      if (!map.has(r.alojamento_local_id)) map.set(r.alojamento_local_id, [])
      map.get(r.alojamento_local_id)!.push(r)
    }
    return map
  }, [relatorios])

  const porObra = useMemo(() => {
    const grupos = new Map<string, { obraId: string; obraNome: string; itens: AlojamentoLocal[] }>()
    for (const l of locais) {
      if (!grupos.has(l.obra_id)) grupos.set(l.obra_id, { obraId: l.obra_id, obraNome: l.obra_nome || '—', itens: [] })
      grupos.get(l.obra_id)!.itens.push(l)
    }
    return Array.from(grupos.values())
      .map(g => ({ ...g, itens: g.itens.sort((a, b) => a.endereco.localeCompare(b.endereco)) }))
      .sort((a, b) => a.obraNome.localeCompare(b.obraNome))
  }, [locais])

  async function handlePDF(local: AlojamentoLocal) {
    const relatoriosDoLocal = relatoriosPorLocal.get(local.id) ?? []
    const ultimo = ultimoRelatorio(relatoriosDoLocal)
    if (!ultimo) return
    setPdfLoading(local.id)
    try {
      const data = await alojamentosDB.find(ultimo.id)
      if (data) await gerarPDFAlojamento(data)
    } finally {
      setPdfLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ALOJ_COLOR, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ALOJ_COLOR + '20' }}>
          <ShieldCheck className="w-4 h-4" style={{ color: ALOJ_COLOR }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Controle de Alojamentos</h1>
          <p className="text-xs text-zinc-500">{locais.length} alojamento(s) cadastrado(s)</p>
        </div>
      </div>

      {porObra.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-12 h-12 text-zinc-700 mb-3" />
          <p className="text-zinc-500 font-medium">Nenhum alojamento cadastrado ainda</p>
          <p className="text-zinc-600 text-sm mt-1">Cadastre em &ldquo;Cadastro de Alojamentos&rdquo; para começar a controlar.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {porObra.map(grupo => (
            <div key={grupo.obraId} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800" style={{ background: ALOJ_COLOR + '0d' }}>
                <Building2 className="w-4 h-4" style={{ color: ALOJ_COLOR }} />
                <h3 className="text-sm font-bold text-zinc-200">{grupo.obraNome}</h3>
                <span className="ml-auto text-[11px] text-zinc-500">{grupo.itens.length} alojamento(s)</span>
              </div>
              <div className="divide-y divide-zinc-800/70">
                {grupo.itens.map(l => {
                  const relatoriosDoLocal = relatoriosPorLocal.get(l.id) ?? []
                  const info = computeAlojamentoStatus(relatoriosDoLocal)
                  const cfg = STATUS_CONFIG[info.status]
                  const temRelatorio = relatoriosDoLocal.length > 0
                  const ultimo = info.relatorio
                  const isLoadingPdf = pdfLoading === l.id

                  return (
                    <div key={l.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <span className="flex-1 min-w-[160px] text-sm text-zinc-200">{l.endereco}</span>

                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {info.status === 'vigente' && `Vigente até ${formatDate(info.validoAte)}`}
                          {info.status === 'prazo_ok' && `Prazo ${formatDate(info.prazo)}`}
                          {info.status === 'prazo_vencido' && `Prazo Vencido (${formatDate(info.prazo)})`}
                          {info.status === 'pendente' && (ultimo ? 'Pendente' : 'Nunca vistoriado')}
                        </span>

                        <button
                          onClick={() => ultimo && router.push(`/alojamentos/${ultimo.id}`)}
                          disabled={!temRelatorio}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-zinc-800 hover:border-indigo-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePDF(l)}
                          disabled={!temRelatorio || isLoadingPdf}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {isLoadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                          PDF
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
