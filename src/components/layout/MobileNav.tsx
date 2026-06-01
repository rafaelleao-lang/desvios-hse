'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, AlertTriangle, Building2, BarChart3,
  TrendingUp, Plus, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ── Tabs por sistema ──────────────────────────────────────────────────────────

const TABS_DESVIOS = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/desvios',    icon: AlertTriangle,   label: 'Desvios'    },
  { href: '/obras',      icon: Building2,       label: 'Obras'      },
  { href: '/relatorios', icon: BarChart3,       label: 'Relatórios' },
]

const TABS_INDICADORES = [
  { href: '/indicadores',      icon: LayoutDashboard, label: 'Dashboard'   },
  { href: '/indicadores/novo', icon: ClipboardList,   label: 'Lançamentos' },
]

function getSistema(pathname: string) {
  return pathname.startsWith('/indicadores') ? 'indicadores' : 'desvios'
}

// ── Nav Desvios (4 tabs + FAB) ────────────────────────────────────────────────

function DesviosNav({ pathname }: { pathname: string }) {
  const router = useRouter()
  const cor = '#E8291C'

  return (
    <div className="flex items-center h-16">
      {TABS_DESVIOS.slice(0, 2).map(tab => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
            {isActive && (
              <motion.div layoutId="mob-indicator" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: cor }} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
            )}
            <tab.icon className={cn('w-5 h-5 transition-colors', isActive ? '' : 'text-zinc-600')}
              style={isActive ? { color: cor } : {}} />
            <span className={cn('text-[10px] font-medium transition-colors', isActive ? '' : 'text-zinc-600')}
              style={isActive ? { color: cor } : {}}>
              {tab.label}
            </span>
          </Link>
        )
      })}

      {/* FAB */}
      <div className="flex-shrink-0 px-2">
        <button onClick={() => router.push('/desvios/novo')}
          className="w-14 h-14 -mt-5 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95"
          style={{ background: cor }}>
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {TABS_DESVIOS.slice(2).map(tab => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
            {isActive && (
              <motion.div layoutId="mob-indicator" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: cor }} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
            )}
            <tab.icon className={cn('w-5 h-5 transition-colors', isActive ? '' : 'text-zinc-600')}
              style={isActive ? { color: cor } : {}} />
            <span className={cn('text-[10px] font-medium transition-colors', isActive ? '' : 'text-zinc-600')}
              style={isActive ? { color: cor } : {}}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

// ── Nav Indicadores (2 tabs + FAB + switch) ───────────────────────────────────

function IndicadoresNav({ pathname }: { pathname: string }) {
  const router = useRouter()
  const cor = '#3B82F6'

  return (
    <div className="flex items-center h-16">
      {TABS_INDICADORES.map(tab => {
        const isActive =
          tab.href === '/indicadores'
            ? pathname === '/indicadores'
            : pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
            {isActive && (
              <motion.div layoutId="mob-indicator-ind" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: cor }} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
            )}
            <tab.icon className={cn('w-5 h-5 transition-colors', isActive ? '' : 'text-zinc-600')}
              style={isActive ? { color: cor } : {}} />
            <span className={cn('text-[10px] font-medium transition-colors', isActive ? '' : 'text-zinc-600')}
              style={isActive ? { color: cor } : {}}>
              {tab.label}
            </span>
          </Link>
        )
      })}

      {/* FAB */}
      <div className="flex-shrink-0 px-2">
        <button onClick={() => router.push('/indicadores/novo')}
          className="w-14 h-14 -mt-5 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95"
          style={{ background: cor }}>
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* Switch to Desvios */}
      <Link href="/dashboard" className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
        <AlertTriangle className="w-5 h-5 text-zinc-600" />
        <span className="text-[10px] font-medium text-zinc-600">Desvios</span>
      </Link>

      {/* Switch indicator */}
      <Link href="/dashboard" className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
        <TrendingUp className="w-5 h-5" style={{ color: cor }} />
        <span className="text-[10px] font-medium" style={{ color: cor }}>Indicadores</span>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: cor }} />
      </Link>
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname()
  const sistema  = getSistema(pathname)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 mobile-safe-bottom">
      <AnimatePresence mode="wait">
        <motion.div
          key={sistema}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {sistema === 'desvios'
            ? <DesviosNav pathname={pathname} />
            : <IndicadoresNav pathname={pathname} />
          }
        </motion.div>
      </AnimatePresence>
    </nav>
  )
}
