'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, AlertTriangle, Building2, BarChart3, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/desvios',   icon: AlertTriangle,   label: 'Desvios'   },
  { href: '/obras',     icon: Building2,       label: 'Obras'     },
  { href: '/relatorios',icon: BarChart3,       label: 'Relatórios'},
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 mobile-safe-bottom">
      <div className="flex items-center h-16">
        {tabs.slice(0, 2).map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link key={tab.href} href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: '#E8291C' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <tab.icon
                className={cn('w-5 h-5 transition-colors', isActive ? '' : 'text-zinc-600')}
                style={isActive ? { color: '#E8291C' } : {}}
              />
              <span
                className={cn('text-[10px] font-medium transition-colors', isActive ? '' : 'text-zinc-600')}
                style={isActive ? { color: '#E8291C' } : {}}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}

        {/* Center FAB */}
        <div className="flex-shrink-0 px-2">
          <button
            onClick={() => router.push('/desvios/novo')}
            className="w-14 h-14 -mt-5 rounded-2xl flex items-center justify-center shadow-glow-mse transition-all active:scale-95"
            style={{ background: '#E8291C' }}
            onTouchStart={e => (e.currentTarget.style.background = '#C9200F')}
            onTouchEnd={e => (e.currentTarget.style.background = '#E8291C')}
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {tabs.slice(2).map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link key={tab.href} href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: '#E8291C' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <tab.icon
                className={cn('w-5 h-5 transition-colors', isActive ? '' : 'text-zinc-600')}
                style={isActive ? { color: '#E8291C' } : {}}
              />
              <span
                className={cn('text-[10px] font-medium transition-colors', isActive ? '' : 'text-zinc-600')}
                style={isActive ? { color: '#E8291C' } : {}}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
