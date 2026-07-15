'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, Bell, Search, Plus, X, AlertTriangle, Clock, ExternalLink,
  ChevronDown, ShieldAlert, ClipboardList, Recycle, BarChart2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { cn, getSlaLabel, getSlaColor, generateDesvioId } from '@/lib/utils'
import { useApp } from '@/contexts/AppContext'

interface HeaderProps { onMenuClick: () => void }

// ── Module action button config ───────────────────────────────────────────────
type ModuleAction = { key: string; label: string; href: string; color: string; Icon: React.ElementType; module: string }

const MODULE_ACTIONS: ModuleAction[] = [
  { key: 'desvios',     label: 'Novo Desvio',  href: '/desvios/novo',           color: '#E8291C', Icon: ShieldAlert,   module: 'Desvios'     },
  { key: 'inspecoes',   label: 'Nova Inspeção', href: '/inspecoes/nova',         color: '#10B981', Icon: ClipboardList, module: 'Inspeções'   },
  { key: 'residuos',    label: 'Movimentação',  href: '/residuos/movimentacoes', color: '#22C55E', Icon: Recycle,       module: 'Resíduos'    },
  { key: 'indicadores', label: 'Lançar',        href: '/indicadores',            color: '#3B82F6', Icon: BarChart2,     module: 'Indicadores' },
]

function getAction(pathname: string): ModuleAction | undefined {
  return MODULE_ACTIONS.find(a => pathname.startsWith(`/${a.key}`))
}

// ── Search config per module ──────────────────────────────────────────────────
type SearchConf = { placeholder: string; route: (q: string) => string }

const SEARCH_CONF: Record<string, SearchConf> = {
  desvios:     { placeholder: 'Buscar desvios...',       route: q => `/desvios?busca=${q}`                },
  inspecoes:   { placeholder: 'Buscar inspeções...',     route: q => `/inspecoes?busca=${q}`              },
  residuos:    { placeholder: 'Buscar movimentações...', route: q => `/residuos/movimentacoes?busca=${q}` },
  indicadores: { placeholder: 'Buscar indicadores...',   route: q => `/indicadores?busca=${q}`            },
}

// ── Bell config per module ────────────────────────────────────────────────────
type BellConf = { title: string; footerLabel: string; footerHref: string }

const BELL_CONF: Record<string, BellConf> = {
  desvios:     { title: 'Alertas',             footerLabel: 'Ver todos os desvios →',    footerHref: '/desvios'             },
  inspecoes:   { title: 'Inspeções em Aberto', footerLabel: 'Ver inspeções em aberto →', footerHref: '/inspecoes/em-aberto' },
  residuos:    { title: 'Alertas de Estoque',  footerLabel: 'Ver alertas de resíduos →', footerHref: '/residuos/alertas'    },
  indicadores: { title: 'Notificações',        footerLabel: 'Ver indicadores →',         footerHref: '/indicadores'         },
}

// ── Residuos violation type ───────────────────────────────────────────────────
interface ResViolacao { id: number; obra_nome: string; tipo_nome: string; saldo_atual: number; minimo: number }

// ═════════════════════════════════════════════════════════════════════════════
export function Header({ onMenuClick }: HeaderProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const { desviosComputados, inspecoes } = useApp()

  const [searchOpen,   setSearchOpen]   = useState(false)
  const [search,       setSearch]       = useState('')
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [dropOpen,     setDropOpen]     = useState(false)
  const [resViolacoes, setResViolacoes] = useState<ResViolacao[]>([])

  const notifRef   = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  const action     = getAction(pathname)
  const searchConf = action ? SEARCH_CONF[action.key] : undefined
  const bellConf   = action ? BELL_CONF[action.key]   : undefined

  // ── Per-module notification data ──────────────────────────────────────────
  const urgentes = desviosComputados.filter(d =>
    !['concluido', 'fechado'].includes(d.status) &&
    (d.vencido || d.gravidade === 'critico' || (d.dias_para_vencer !== null && d.dias_para_vencer <= 2))
  ).slice(0, 10)

  const inspecoesAbertas = (inspecoes as any[])
    .filter(i => i.status === 'em_aberto')
    .sort((a: any, b: any) => new Date(b.data_inspecao ?? 0).getTime() - new Date(a.data_inspecao ?? 0).getTime())
    .slice(0, 10)

  // Fetch residuos violations whenever the module becomes active
  useEffect(() => {
    if (action?.key !== 'residuos') return
    fetch('/api/residuos/check-alertas')
      .then(r => r.json())
      .then(d => { if (d.ok) setResViolacoes(d.violacoes ?? []) })
      .catch(() => {})
  }, [action?.key])

  const notifCount =
    action?.key === 'desvios'   ? urgentes.length          :
    action?.key === 'inspecoes' ? inspecoesAbertas.length  :
    action?.key === 'residuos'  ? resViolacoes.length       : 0

  // ── Outside click ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false)
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function doSearch(q: string) {
    if (!searchConf) return
    router.push(searchConf.route(encodeURIComponent(q)))
    setSearchOpen(false); setSearch('')
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[260px] z-30 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 flex items-center px-4 gap-3">

      {/* Mobile menu */}
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
        <Menu className="w-5 h-5" />
      </button>

      <span className="lg:hidden text-xl font-black tracking-tight select-none" style={{ color: '#E8291C' }}>mse</span>

      <div className="flex-1" />

      {action && searchConf && bellConf && (
      <>
      {/* ── Search ────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {searchOpen ? (
          <motion.div key="open"
            initial={{ width: 48, opacity: 0 }} animate={{ width: '100%', maxWidth: 320, opacity: 1 }} exit={{ width: 48, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="flex items-center gap-2 h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-700"
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: action.color, transition: 'color 0.4s ease' }} />
            <input
              autoFocus value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && search.trim()) doSearch(search.trim()) }}
              placeholder={searchConf.placeholder}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
            />
            <button onClick={() => { setSearchOpen(false); setSearch('') }} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.button key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <Search className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Bell ──────────────────────────────────────────────────────────── */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(v => !v)}
          className={cn('relative p-2 rounded-xl transition-colors', notifOpen ? 'bg-zinc-800 text-zinc-200' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200')}
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {notifCount > 0 && (
              <motion.span key={`${action.key}-badge`}
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-black text-white flex items-center justify-center leading-none"
                style={{ background: action.color, transition: 'background-color 0.4s ease' }}
              >
                {notifCount > 9 ? '9+' : notifCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              {/* Bell header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-zinc-400" />
                  <AnimatePresence mode="wait">
                    <motion.span key={action.key}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="text-sm font-semibold text-zinc-200">
                      {bellConf.title}
                    </motion.span>
                  </AnimatePresence>
                  {notifCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: action.color, transition: 'background-color 0.4s ease' }}>
                      {notifCount}
                    </span>
                  )}
                </div>
                <button onClick={() => setNotifOpen(false)} className="text-zinc-600 hover:text-zinc-400"><X className="w-4 h-4" /></button>
              </div>

              {/* Bell body */}
              <div className="max-h-80 overflow-y-auto">
                {action.key === 'desvios'     && <PanelDesvios urgentes={urgentes} onClose={() => setNotifOpen(false)} />}
                {action.key === 'inspecoes'   && <PanelInspecoes itens={inspecoesAbertas} onClose={() => setNotifOpen(false)} color={action.color} />}
                {action.key === 'residuos'    && <PanelResiduos violacoes={resViolacoes}  onClose={() => setNotifOpen(false)} color={action.color} />}
                {action.key === 'indicadores' && <PanelEmpty color={action.color} msg="Nenhum alerta de indicadores" />}
              </div>

              {/* Bell footer */}
              <div className="px-4 py-2.5 border-t border-zinc-800">
                <Link href={bellConf.footerHref} onClick={() => setNotifOpen(false)}
                  className="text-xs font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: action.color, transition: 'color 0.4s ease' }}>
                  {bellConf.footerLabel}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Smart action button ───────────────────────────────────────────── */}
      <div className="relative flex items-stretch" ref={actionsRef}>
        {/* Primary — desktop */}
        <button
          onClick={() => { router.push(action.href); setDropOpen(false) }}
          className="hidden sm:flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-l-xl text-sm font-bold text-white active:scale-95 border-r border-white/20"
          style={{ background: action.color, transition: 'background-color 0.4s ease' }}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence mode="wait">
            <motion.span key={action.key} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.14 }} className="whitespace-nowrap">
              {action.label}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Chevron — desktop */}
        <button onClick={() => setDropOpen(v => !v)}
          className="hidden sm:flex items-center justify-center h-9 w-8 rounded-r-xl text-white"
          style={{ background: action.color, transition: 'background-color 0.4s ease' }}>
          <motion.div animate={{ rotate: dropOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </button>

        {/* Icon only — mobile */}
        <button onClick={() => setDropOpen(v => !v)}
          className="sm:hidden flex items-center justify-center h-9 w-9 rounded-xl text-white active:scale-95"
          style={{ background: action.color, transition: 'background-color 0.4s ease' }}>
          <Plus className="w-5 h-5" />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {dropOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              <div className="px-3 pt-3 pb-1.5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ações Rápidas</p>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5">
                {MODULE_ACTIONS.map(a => {
                  const isActive = action.key === a.key
                  return (
                    <Link key={a.key} href={a.href} onClick={() => setDropOpen(false)}
                      className={cn('flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors', isActive ? 'bg-zinc-800' : 'hover:bg-zinc-800/60')}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: a.color + '18', border: `1px solid ${a.color}35` }}>
                        <a.Icon className="w-4 h-4" style={{ color: a.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold leading-none mb-0.5', isActive ? 'text-zinc-100' : 'text-zinc-300')}>{a.label}</p>
                        <p className="text-[10px] text-zinc-500">{a.module}</p>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />}
                    </Link>
                  )
                })}
              </div>
              <div className="h-1.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </>
      )}

    </header>
  )
}

// ─── Notification panels ──────────────────────────────────────────────────────

function PanelDesvios({ urgentes, onClose }: { urgentes: any[]; onClose: () => void }) {
  if (!urgentes.length) return <PanelEmpty color="#E8291C" msg="Nenhum desvio urgente" />
  return (
    <div className="divide-y divide-zinc-800/50">
      {urgentes.map(d => (
        <Link key={d.id} href={`/desvios/${d.id}`} onClick={onClose}>
          <div className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
              d.vencido ? 'bg-red-500/10' : 'bg-orange-500/10')}>
              {d.vencido ? <Clock className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-orange-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-mono font-bold" style={{ color: '#E8291C' }}>{generateDesvioId(d.numero)}</span>
                {d.vencido          && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">VENCIDO</span>}
                {d.gravidade === 'critico' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">CRÍTICO</span>}
              </div>
              <p className="text-xs text-zinc-300 truncate">{d.descricao || d.categoria}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-zinc-500 truncate">{d.obra_nome_computado}</p>
                <p className={cn('text-[10px] font-semibold ml-2 flex-shrink-0', getSlaColor(d.dias_para_vencer, d.vencido, d.isClosed))}>
                  {getSlaLabel(d.dias_para_vencer, d.vencido, d.isClosed)}
                </p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-1" />
          </div>
        </Link>
      ))}
    </div>
  )
}

function PanelInspecoes({ itens, onClose, color }: { itens: any[]; onClose: () => void; color: string }) {
  if (!itens.length) return <PanelEmpty color={color} msg="Nenhuma inspeção em aberto" />
  return (
    <div className="divide-y divide-zinc-800/50">
      {itens.map((i: any) => {
        const pendentes = Math.max(0, (i.total_desvios ?? 0) - (i.desvios_fechados ?? 0))
        return (
          <Link key={i.id} href={`/inspecoes/${i.id}`} onClick={onClose}>
            <div className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: color + '18' }}>
                <ClipboardList className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-mono font-bold" style={{ color }}>
                    INS-{String(i.numero).padStart(4, '0')}
                  </span>
                  {pendentes > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: color + '18', color }}>
                      {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-300 truncate">{i.obra_nome}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{i.data_inspecao}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-1" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function PanelResiduos({ violacoes, onClose, color }: { violacoes: ResViolacao[]; onClose: () => void; color: string }) {
  if (!violacoes.length) return <PanelEmpty color={color} msg="Todos os estoques no limite" />
  return (
    <div className="divide-y divide-zinc-800/50">
      {violacoes.map(v => {
        const pct = v.minimo > 0 ? Math.round((v.saldo_atual / v.minimo) * 100) : 0
        return (
          <Link key={v.id} href="/residuos/alertas" onClick={onClose}>
            <div className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{v.tipo_nome}</p>
                <p className="text-[10px] text-zinc-500 truncate mb-1.5">{v.obra_nome}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-red-400 flex-shrink-0 tabular-nums">
                    {v.saldo_atual}/{v.minimo}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-1" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function PanelEmpty({ color, msg }: { color: string; msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15' }}>
        <Bell className="w-5 h-5" style={{ color }} />
      </div>
      <p className="text-sm text-zinc-400">Tudo em dia!</p>
      <p className="text-xs text-zinc-600">{msg}</p>
    </div>
  )
}
