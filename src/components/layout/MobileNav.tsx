'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, AlertTriangle, Building2, BarChart3,
  TrendingUp, Plus, History, ClipboardList, AlertCircle, ClipboardCheck,
  BookOpen, FileText,
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
  { href: '/indicadores',           icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/indicadores/historico', icon: History,         label: 'Histórico' },
]

// Dashboard | Inspeções | [+] | Em Aberto | Relatórios
const TABS_INSP_LEFT  = [
  { href: '/inspecoes/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/inspecoes',           icon: ClipboardList,   label: 'Inspeções', exact: true },
]
const TABS_INSP_RIGHT = [
  { href: '/inspecoes/em-aberto',  icon: AlertCircle, label: 'Em Aberto', exact: false },
  { href: '/inspecoes/relatorios', icon: BarChart3,   label: 'Relatórios', exact: false },
]

function getSistema(pathname: string) {
  if (pathname.startsWith('/tutorial'))    return 'tutorial'
  if (pathname.startsWith('/inspecoes'))   return 'inspecoes'
  if (pathname.startsWith('/indicadores')) return 'indicadores'
  return 'desvios'
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

// ── Nav Indicadores (Dashboard | Histórico | FAB | Desvios) ──────────────────

function IndicadoresNav({ pathname }: { pathname: string }) {
  const router = useRouter()
  const cor = '#3B82F6'

  const tabs = [
    { href: '/indicadores',           icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: '/indicadores/historico', icon: History,         label: 'Histórico', exact: false },
  ]

  return (
    <div className="flex items-center h-16">
      {tabs.map(tab => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
            {isActive && (
              <motion.div layoutId="mob-ind-tab" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: cor }} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
            )}
            <tab.icon className={cn('w-5 h-5 transition-colors', isActive ? '' : 'text-zinc-600')}
              style={isActive ? { color: cor } : {}} />
            <span className={cn('text-[10px] font-medium', isActive ? '' : 'text-zinc-600')}
              style={isActive ? { color: cor } : {}}>
              {tab.label}
            </span>
          </Link>
        )
      })}

      {/* FAB — Lançar */}
      <div className="flex-shrink-0 px-2">
        <button onClick={() => router.push('/indicadores/novo')}
          className="w-14 h-14 -mt-5 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95"
          style={{ background: cor }}>
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* Switch to Desvios */}
      <Link href="/dashboard" className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full">
        <AlertTriangle className="w-5 h-5 text-zinc-600" />
        <span className="text-[10px] font-medium text-zinc-600">Desvios</span>
      </Link>

      {/* Indicadores (active system indicator) */}
      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: cor }} />
        <TrendingUp className="w-5 h-5" style={{ color: cor }} />
        <span className="text-[10px] font-medium" style={{ color: cor }}>HSE</span>
      </div>
    </div>
  )
}

// ── Nav Inspeções HSE (Dashboard | Inspeções | FAB | Em Aberto | Relatórios) ──

function InspecoesNav({ pathname }: { pathname: string }) {
  const router = useRouter()
  const cor = '#10B981'

  function Tab({ href, icon: Icon, label, exact }: { href: string; icon: React.ElementType; label: string; exact: boolean }) {
    const isActive = exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
        {isActive && (
          <motion.div layoutId="mob-insp-indicator"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
            style={{ background: cor }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
        )}
        <Icon className={cn('w-5 h-5 transition-colors', isActive ? '' : 'text-zinc-600')}
          style={isActive ? { color: cor } : {}} />
        <span className={cn('text-[10px] font-medium transition-colors', isActive ? '' : 'text-zinc-600')}
          style={isActive ? { color: cor } : {}}>
          {label}
        </span>
      </Link>
    )
  }

  return (
    <div className="flex items-center h-16">
      {TABS_INSP_LEFT.map(tab => (
        <Tab key={tab.href} {...tab} />
      ))}

      {/* FAB — Nova Inspeção */}
      <div className="flex-shrink-0 px-2">
        <button
          onClick={() => router.push('/inspecoes/nova')}
          className="w-14 h-14 -mt-5 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95"
          style={{ background: cor }}
        >
          <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {TABS_INSP_RIGHT.map(tab => (
        <Tab key={tab.href} {...tab} />
      ))}
    </div>
  )
}

// ── Nav Tutoriais (3 tabs sem FAB) ───────────────────────────────────────────

const TABS_TUTORIAL = [
  { href: '/tutorial',             icon: BookOpen,  label: 'Tutoriais',  exact: true  },
  { href: '/tutorial/desvios',     icon: FileText,  label: 'Desvios',    exact: true  },
  { href: '/tutorial/inspecoes',   icon: FileText,  label: 'Inspeções',  exact: true  },
  { href: '/tutorial/indicadores', icon: FileText,  label: 'Indicadores', exact: true },
]

function TutorialNav({ pathname }: { pathname: string }) {
  const cor = '#8B5CF6'
  return (
    <div className="flex items-center h-16">
      {TABS_TUTORIAL.map(tab => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
            {isActive && (
              <motion.div layoutId="mob-tut-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: cor }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
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
          {sistema === 'tutorial'
            ? <TutorialNav pathname={pathname} />
            : sistema === 'inspecoes'
              ? <InspecoesNav pathname={pathname} />
              : sistema === 'indicadores'
                ? <IndicadoresNav pathname={pathname} />
                : <DesviosNav pathname={pathname} />
          }
        </motion.div>
      </AnimatePresence>
    </nav>
  )
}
