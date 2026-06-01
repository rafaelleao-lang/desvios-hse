'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, AlertTriangle, Building2, BarChart3,
  TrendingUp, X, Plus, FileBarChart2, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Sistema detectado pelo pathname ──────────────────────────────────────────

type Sistema = 'desvios' | 'indicadores'

function getSistema(pathname: string): Sistema {
  return pathname.startsWith('/indicadores') ? 'indicadores' : 'desvios'
}

// ── Configuração dos sistemas ─────────────────────────────────────────────────

const SISTEMAS = {
  desvios: {
    cor:       '#E8291C',
    corHover:  '#C9200F',
    label:     'Desvios',
    icon:      AlertTriangle,
    acao:      { label: 'Novo Desvio', href: '/desvios/novo' },
    nav: [
      { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
      { href: '/desvios',    icon: AlertTriangle,   label: 'Desvios'    },
      { href: '/obras',      icon: Building2,       label: 'Obras'      },
      { href: '/relatorios', icon: BarChart3,       label: 'Relatórios' },
    ],
  },
  indicadores: {
    cor:       '#3B82F6',
    corHover:  '#2563EB',
    label:     'Indicadores',
    icon:      TrendingUp,
    acao:      { label: 'Lançar Indicadores', href: '/indicadores/novo' },
    nav: [
      { href: '/indicadores',      icon: LayoutDashboard, label: 'Dashboard'   },
      { href: '/indicadores/novo', icon: ClipboardList,   label: 'Lançamentos' },
    ],
  },
} as const

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname  = usePathname()
  const sistema   = getSistema(pathname)
  const cfg       = SISTEMAS[sistema]

  return (
    <div className="flex flex-col h-full">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-zinc-800 flex-shrink-0">
        <span className="text-2xl font-black leading-none tracking-tight select-none" style={{ color: '#E8291C' }}>
          mse
        </span>
        <div className="w-px h-6 bg-zinc-700" />
        <div>
          <p className="text-xs font-bold text-zinc-200 leading-none">Gestão HSE</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">MSE Engenharia</p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Switcher de sistemas ── */}
      <div className="px-3 pt-4 pb-3 border-b border-zinc-800/60">
        <p className="px-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
          Sistema
        </p>
        <div className="flex gap-1.5">
          {(Object.keys(SISTEMAS) as Sistema[]).map(sys => {
            const s      = SISTEMAS[sys]
            const ativo  = sistema === sys
            const Icon   = s.icon
            return (
              <Link
                key={sys}
                href={sys === 'desvios' ? '/dashboard' : '/indicadores'}
                onClick={onClose}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-200',
                  ativo ? 'text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800',
                )}
                style={ativo ? { background: s.cor } : {}}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{s.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Navegação do sistema ativo (animada) ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <p className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1.5">
          {cfg.label}
        </p>

        <AnimatePresence mode="wait">
          <motion.ul
            key={sistema}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="space-y-0.5"
          >
            {cfg.nav.map(item => {
              const active =
                item.href === '/indicadores'
                  ? pathname === '/indicadores'
                  : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border',
                      active
                        ? 'border'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border-transparent',
                    )}
                    style={active ? {
                      background: cfg.cor + '14',
                      borderColor: cfg.cor + '35',
                      color: cfg.cor,
                    } : {}}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                    {active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: cfg.cor }} />
                    )}
                  </Link>
                </li>
              )
            })}
          </motion.ul>
        </AnimatePresence>
      </nav>

      {/* ── Ação rápida ── */}
      <div className="px-3 pb-3 border-t border-zinc-800 pt-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={`acao-${sistema}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Link
              href={cfg.acao.href}
              onClick={onClose}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 text-white"
              style={{ background: cfg.cor }}
              onMouseEnter={e => (e.currentTarget.style.background = cfg.corHover)}
              onMouseLeave={e => (e.currentTarget.style.background = cfg.cor)}
            >
              <Plus className="w-4 h-4" />
              {cfg.acao.label}
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
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

// ── Export ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[260px] bg-zinc-950 border-r border-zinc-800 flex-col">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile drawer */}
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
