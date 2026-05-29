'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Building2, Plus, Search, MoreVertical, Edit,
  Trash2, ChevronRight, Users, AlertTriangle,
  CheckCircle2, HardHat,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { obrasDB } from '@/lib/db'
import { cn } from '@/lib/utils'

export default function ObrasPage() {
  const router = useRouter()
  const { obras, tsts, encarregados, desvios, refresh } = useApp()
  const [busca, setBusca] = useState('')
  const [menuAberto, setMenuAberto] = useState<string | null>(null)

  const filtradas = obras.filter(o =>
    o.nome.toLowerCase().includes(busca.toLowerCase()) ||
    o.codigo.toLowerCase().includes(busca.toLowerCase()) ||
    (o.empresa || '').toLowerCase().includes(busca.toLowerCase())
  )

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir a obra "${nome}"? Isso também removerá os TSTs e encarregados associados.`)) return
    await obrasDB.delete(id)
    await refresh()
    setMenuAberto(null)
  }

  function statsObra(obraId: string) {
    const d = desvios.filter(x => x.obra_id === obraId)
    const total = d.length
    const abertos = d.filter(x => ['aberto', 'em_tratativa', 'pendente'].includes(x.status)).length
    const criticos = d.filter(x => x.gravidade === 'critico' && x.status !== 'fechado').length
    const tstCount = tsts.filter(t => t.obra_id === obraId && t.ativo).length
    const encCount = encarregados.filter(e => e.obra_id === obraId && e.ativo).length
    return { total, abertos, criticos, tstCount, encCount }
  }

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-zinc-50">Obras</h1>
          <p className="text-sm text-zinc-500">{obras.length} obras cadastradas</p>
        </div>
        <button onClick={() => router.push('/obras/nova')}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-semibold transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Obra</span>
        </button>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar obra, código, empresa..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50" />
      </div>

      {/* Empty state */}
      {filtradas.length === 0 && (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">Nenhuma obra cadastrada</p>
          <p className="text-sm text-zinc-600 mt-1 mb-4">Cadastre sua primeira obra para começar a registrar desvios</p>
          <button onClick={() => router.push('/obras/nova')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-all active:scale-95">
            Cadastrar Primeira Obra
          </button>
        </div>
      )}

      {/* List */}
      <div className="grid gap-3">
        {filtradas.map((obra, i) => {
          const s = statsObra(obra.id)
          return (
            <motion.div key={obra.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-amber-500">{obra.codigo}</span>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          obra.ativa
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-zinc-700 text-zinc-400 border border-zinc-600')}>
                          {obra.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-zinc-100 mt-0.5">{obra.nome}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                        {obra.empresa && <span>{obra.empresa}</span>}
                        {obra.cidade && <span>{obra.cidade}{obra.estado ? `, ${obra.estado}` : ''}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions menu */}
                  <div className="relative flex-shrink-0">
                    <button onClick={() => setMenuAberto(menuAberto === obra.id ? null : obra.id)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuAberto === obra.id && (
                      <div className="absolute right-0 top-8 z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                        <button onClick={() => { router.push(`/obras/${obra.id}`); setMenuAberto(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
                          <Edit className="w-3.5 h-3.5" /> Gerenciar Obra
                        </button>
                        <button onClick={() => handleDelete(obra.id, obra.nome)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-zinc-700 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-zinc-800">
                  <div className="text-center">
                    <p className="text-lg font-black text-zinc-100">{s.total}</p>
                    <p className="text-[10px] text-zinc-600 uppercase">Desvios</p>
                  </div>
                  <div className="text-center">
                    <p className={cn('text-lg font-black', s.abertos > 0 ? 'text-amber-400' : 'text-zinc-500')}>
                      {s.abertos}
                    </p>
                    <p className="text-[10px] text-zinc-600 uppercase">Abertos</p>
                  </div>
                  <div className="text-center">
                    <p className={cn('text-lg font-black', s.criticos > 0 ? 'text-red-400' : 'text-zinc-500')}>
                      {s.criticos}
                    </p>
                    <p className="text-[10px] text-zinc-600 uppercase">Críticos</p>
                  </div>
                  <div className="text-center">
                    <p className={cn('text-lg font-black', s.tstCount > 0 ? 'text-blue-400' : 'text-zinc-500')}>
                      {s.tstCount}
                    </p>
                    <p className="text-[10px] text-zinc-600 uppercase">TSTs</p>
                  </div>
                  <div className="text-center">
                    <p className={cn('text-lg font-black', s.encCount > 0 ? 'text-purple-400' : 'text-zinc-500')}>
                      {s.encCount}
                    </p>
                    <p className="text-[10px] text-zinc-600 uppercase">Enc.</p>
                  </div>
                </div>
              </div>

              {/* Open detail button */}
              <button
                onClick={() => router.push(`/obras/${obra.id}`)}
                className="w-full flex items-center justify-between px-5 py-3 bg-zinc-800/50 hover:bg-zinc-800 border-t border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                <span className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Gerenciar Coordenadores, TSTs e Encarregados
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Click outside to close menu */}
      {menuAberto && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)} />
      )}
    </div>
  )
}
