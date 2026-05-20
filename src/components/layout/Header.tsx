'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, Search, Plus, X, AlertTriangle, Clock, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatDate, getSlaLabel, getSlaColor, generateDesvioId } from '@/lib/utils'
import { useApp } from '@/contexts/AppContext'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { desviosComputados } = useApp()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Desvios que precisam de atenção
  const urgentes = desviosComputados.filter(d =>
    !['concluido', 'fechado'].includes(d.status) &&
    (d.vencido || d.gravidade === 'critico' || (d.dias_para_vencer !== null && d.dias_para_vencer <= 2))
  ).slice(0, 10)

  const notifCount = urgentes.length

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[260px] z-30 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 flex items-center px-4 gap-3">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* MSE logo (mobile only — sidebar hidden) */}
      <span
        className="lg:hidden text-xl font-black tracking-tight select-none"
        style={{ color: '#E8291C' }}
      >
        mse
      </span>

      <div className="flex-1" />

      {/* Search */}
      <AnimatePresence mode="wait">
        {searchOpen ? (
          <motion.div
            key="search-input"
            initial={{ width: 48, opacity: 0 }}
            animate={{ width: '100%', maxWidth: 340, opacity: 1 }}
            exit={{ width: 48, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="flex items-center gap-2 h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-700"
            style={{ outline: 'none', boxShadow: 'none' }}
          >
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  router.push(`/desvios?busca=${encodeURIComponent(search.trim())}`)
                  setSearchOpen(false); setSearch('')
                }
              }}
              placeholder="Buscar desvios..."
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
            />
            <button onClick={() => { setSearchOpen(false); setSearch('') }} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.button key="search-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <Search className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(v => !v)}
          className={cn(
            'relative p-2 rounded-xl transition-colors',
            notifOpen ? 'bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200',
          )}
        >
          <Bell className="w-5 h-5" />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-black text-white flex items-center justify-center leading-none"
              style={{ background: '#E8291C' }}>
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-semibold text-zinc-200">Alertas</span>
                  {notifCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: '#E8291C' }}>
                      {notifCount}
                    </span>
                  )}
                </div>
                <button onClick={() => setNotifOpen(false)} className="text-zinc-600 hover:text-zinc-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {urgentes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-sm text-zinc-400">Tudo em dia!</p>
                    <p className="text-xs text-zinc-600">Nenhum desvio urgente</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {urgentes.map(d => (
                      <Link key={d.id} href={`/desvios/${d.id}`} onClick={() => setNotifOpen(false)}>
                        <div className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                          <div className={cn(
                            'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                            d.vencido ? 'bg-red-500/10' : d.gravidade === 'critico' ? 'bg-red-500/10' : 'bg-orange-500/10',
                          )}>
                            {d.vencido
                              ? <Clock className="w-4 h-4 text-red-400" />
                              : <AlertTriangle className="w-4 h-4 text-orange-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-mono font-bold" style={{ color: '#E8291C' }}>
                                {generateDesvioId(d.numero)}
                              </span>
                              {d.vencido && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">
                                  VENCIDO
                                </span>
                              )}
                              {d.gravidade === 'critico' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">
                                  CRÍTICO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-300 truncate">{d.descricao || d.categoria}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-zinc-500 truncate">{d.obra_nome_computado}</p>
                              <p className={cn('text-[10px] font-semibold ml-2 flex-shrink-0', getSlaColor(d.dias_para_vencer, d.vencido))}>
                                {getSlaLabel(d.dias_para_vencer, d.vencido)}
                              </p>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-1" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-zinc-800">
                <Link href="/desvios" onClick={() => setNotifOpen(false)}
                  className="text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ color: '#E8291C' }}>
                  Ver todos os desvios →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New deviation CTA — desktop */}
      <button
        onClick={() => router.push('/desvios/novo')}
        className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 text-white"
        style={{ background: '#E8291C' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#C9200F')}
        onMouseLeave={e => (e.currentTarget.style.background = '#E8291C')}
      >
        <Plus className="w-4 h-4" />
        <span>Novo Desvio</span>
      </button>

      {/* New deviation CTA — mobile */}
      <button
        onClick={() => router.push('/desvios/novo')}
        className="sm:hidden p-2 rounded-xl text-white transition-all active:scale-95"
        style={{ background: '#E8291C' }}
      >
        <Plus className="w-5 h-5" />
      </button>
    </header>
  )
}
