'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, AlertTriangle, Building2,
  BarChart3, ChevronRight, X, Plus, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  {
    group: 'Principal',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/desvios', icon: AlertTriangle, label: 'Desvios' },
    ],
  },
  {
    group: 'Gestão',
    items: [
      { href: '/obras', icon: Building2, label: 'Obras' },
    ],
  },
  {
    group: 'Análise',
    items: [
      { href: '/indicadores', icon: TrendingUp, label: 'Indicadores HSE' },
      { href: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      {/* Logo MSE */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {/* MSE logotype */}
          <span
            className="text-2xl font-black leading-none tracking-tight select-none"
            style={{ color: '#E8291C', fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            mse
          </span>
          <div className="w-px h-6 bg-zinc-700" />
          <div>
            <p className="text-xs font-bold text-zinc-200 leading-none">Desvios HSE</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Gestão de Segurança</p>
          </div>
        </div>
        <button onClick={onClose} className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New desvio shortcut */}
      <div className="px-3 pt-4 pb-2">
        <Link
          href="/desvios/novo"
          onClick={onClose}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 text-white"
          style={{ background: '#E8291C' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#C9200F')}
          onMouseLeave={e => (e.currentTarget.style.background = '#E8291C')}
        >
          <Plus className="w-4 h-4" />
          Novo Desvio
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-5">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                        active
                          ? 'border'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent',
                      )}
                      style={active ? {
                        background: 'rgba(232, 41, 28, 0.08)',
                        borderColor: 'rgba(232, 41, 28, 0.20)',
                        color: '#E8291C',
                      } : {}}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                      {active && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: '#E8291C' }} />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-400">Sistema Online</span>
          <span className="ml-auto text-[10px] text-zinc-600">MSE Engenharia</span>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[260px] bg-zinc-950 border-r border-zinc-800 flex-col">
        <SidebarContent onClose={() => {}} />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] bg-zinc-950 border-r border-zinc-800 flex flex-col lg:hidden"
            >
              <SidebarContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
