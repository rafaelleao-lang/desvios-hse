'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, AlertTriangle, Building2, BarChart3,
  TrendingUp, X, Plus, ClipboardList, ChevronRight, History,
  ClipboardCheck, AlertCircle, BookOpen, FileText, Recycle,
  ArrowDownUp, ClipboardSignature, Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Sistema detectado pelo pathname ──────────────────────────────────────────

type Sistema = 'obras' | 'desvios' | 'indicadores' | 'inspecoes' | 'residuos' | 'tutorial'

function getSistema(pathname: string): Sistema {
  if (pathname.startsWith('/tutorial'))    return 'tutorial'
  if (pathname.startsWith('/residuos'))    return 'residuos'
  if (pathname.startsWith('/inspecoes'))   return 'inspecoes'
  if (pathname.startsWith('/indicadores')) return 'indicadores'
  if (pathname.startsWith('/obras'))       return 'obras'
  return 'desvios'
}

// ── Configuração dos menus ────────────────────────────────────────────────────

const MENUS: Array<{
  key:      Sistema
  label:    string
  icon:     React.ElementType
  cor:      string
  corHover: string
  homeHref: string
  acao?:    { label: string; href: string }
  subnav:   Array<{ href: string; icon: React.ElementType; label: string }>
}> = [
  {
    key:        'obras',
    label:      'Obras',
    icon:       Building2,
    cor:        '#F97316',
    corHover:   '#EA6C0A',
    homeHref:   '/obras',
    acao:       { label: 'Nova Obra', href: '/obras/nova' },
    subnav: [
      { href: '/obras', icon: Building2, label: 'Obras' },
    ],
  },
  {
    key:        'desvios',
    label:      'Desvios',
    icon:       AlertTriangle,
    cor:        '#E8291C',
    corHover:   '#C9200F',
    homeHref:   '/dashboard',
    acao:       { label: 'Novo Desvio', href: '/desvios/novo' },
    subnav: [
      { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
      { href: '/desvios',    icon: AlertTriangle,   label: 'Desvios'    },
      { href: '/relatorios', icon: BarChart3,       label: 'Relatórios' },
    ],
  },
  {
    key:        'indicadores',
    label:      'Indicadores HSE',
    icon:       TrendingUp,
    cor:        '#3B82F6',
    corHover:   '#2563EB',
    homeHref:   '/indicadores',
    acao:       { label: 'Lançar Indicadores', href: '/indicadores/novo' },
    subnav: [
      { href: '/indicadores',           icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/indicadores/novo',      icon: Plus,            label: 'Lançar'    },
      { href: '/indicadores/historico', icon: History,         label: 'Histórico' },
    ],
  },
  {
    key:        'inspecoes',
    label:      'Inspeções HSE',
    icon:       ClipboardCheck,
    cor:        '#10B981',
    corHover:   '#059669',
    homeHref:   '/inspecoes/dashboard',
    acao:       { label: 'Nova Inspeção', href: '/inspecoes/nova' },
    subnav: [
      { href: '/inspecoes/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
      { href: '/inspecoes/em-aberto',  icon: AlertCircle,     label: 'Em Aberto'  },
      { href: '/inspecoes',            icon: ClipboardList,   label: 'Inspeções'  },
      { href: '/inspecoes/relatorios', icon: BarChart3,       label: 'Relatórios' },
    ],
  },
  {
    key:        'residuos',
    label:      'Gestão de Resíduos',
    icon:       Recycle,
    cor:        '#22C55E',
    corHover:   '#16A34A',
    homeHref:   '/residuos/dashboard',
    subnav: [
      { href: '/residuos/dashboard',    icon: LayoutDashboard,    label: 'Dashboard'       },
      { href: '/residuos/movimentacoes',icon: ArrowDownUp,        label: 'Movimentações'   },
      { href: '/residuos/solicitacoes', icon: ClipboardSignature, label: 'Solicitações'    },
      { href: '/residuos/relatorios',   icon: BarChart3,          label: 'Relatórios'      },
      { href: '/residuos/cadastros',    icon: ClipboardList,      label: 'Cadastros'       },
      { href: '/residuos/alertas',      icon: Bell,               label: 'Alertas'         },
    ],
  },
  {
    key:        'tutorial',
    label:      'Tutoriais',
    icon:       BookOpen,
    cor:        '#8B5CF6',
    corHover:   '#7C3AED',
    homeHref:   '/tutorial',
    subnav: [
      { href: '/tutorial/desvios',     icon: FileText, label: 'Manual Desvios'     },
      { href: '/tutorial/inspecoes',   icon: FileText, label: 'Manual Inspeções'   },
      { href: '/tutorial/indicadores', icon: FileText, label: 'Manual Indicadores' },
    ],
  },
]

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()
  const sistema  = getSistema(pathname)
  const cfg      = MENUS.find(m => m.key === sistema)!

  return (
    <div className="flex flex-col h-full">

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-zinc-800 flex-shrink-0">
        <span
          className="text-2xl font-black leading-none tracking-tight select-none"
          style={{ color: '#E8291C' }}
        >
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

      {/* ── Menu principal com submenus ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {MENUS.map(menu => {
          const aberto = menu.key === sistema
          const Icon   = menu.icon

          return (
            <div key={menu.key}>
              {/* Item principal */}
              <Link
                href={menu.homeHref}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 w-full border',
                  aberto
                    ? 'border'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border-transparent',
                )}
                style={aberto ? {
                  background:   menu.cor + '15',
                  borderColor:  menu.cor + '40',
                  color:        menu.cor,
                } : {}}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{menu.label}</span>
                <motion.div
                  animate={{ rotate: aberto ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.div>
              </Link>

              {/* Submenus animados */}
              <AnimatePresence initial={false}>
                {aberto && (
                  <motion.ul
                    key="sub"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="ml-3 pl-3 border-l border-zinc-800 mt-1 mb-1 space-y-0.5">
                      {menu.subnav.map(item => {
                        const active =
                          item.href === '/indicadores'
                            ? pathname === '/indicadores'
                            : item.href === '/inspecoes'
                              ? pathname === '/inspecoes'
                              : pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                                active
                                  ? 'font-semibold'
                                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/70 font-medium',
                              )}
                              style={active ? { color: menu.cor } : {}}
                            >
                              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                              {item.label}
                              {active && (
                                <div
                                  className="ml-auto w-1 h-1 rounded-full"
                                  style={{ background: menu.cor }}
                                />
                              )}
                            </Link>
                          </li>
                        )
                      })}
                    </div>
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* ── Ação rápida contextual (não exibida no módulo Tutoriais) ── */}
      {cfg.acao && (
        <div className="px-3 pb-3 pt-3 border-t border-zinc-800">
          <AnimatePresence mode="wait">
            <motion.div
              key={`acao-${sistema}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Link
                href={cfg.acao.href}
                onClick={onClose}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 text-white"
                style={{ background: cfg.cor }}
                onMouseEnter={e => (e.currentTarget.style.background = cfg.corHover!)}
                onMouseLeave={e => (e.currentTarget.style.background = cfg.cor)}
              >
                <Plus className="w-4 h-4" />
                {cfg.acao.label}
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

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
