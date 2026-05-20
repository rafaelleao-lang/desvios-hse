import { cn, STATUS_CONFIG, GRAVIDADE_CONFIG } from '@/lib/utils'
import type { StatusDesvio, GravidadeDesvio } from '@/types'

interface StatusBadgeProps {
  status: StatusDesvio
  size?: 'sm' | 'md'
  pulse?: boolean
}

export function StatusBadge({ status, size = 'md', pulse = false }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-semibold',
      cfg.bg, cfg.color, cfg.border,
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
    )}>
      <span className={cn('rounded-full flex-shrink-0', cfg.dot, size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5', pulse && 'animate-pulse')} />
      {cfg.label}
    </span>
  )
}

interface GravidadeBadgeProps {
  gravidade: GravidadeDesvio
  size?: 'sm' | 'md'
}

export function GravidadeBadge({ gravidade, size = 'md' }: GravidadeBadgeProps) {
  const cfg = GRAVIDADE_CONFIG[gravidade]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-semibold',
      cfg.bg, cfg.color, cfg.border,
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
    )}>
      {gravidade === 'critico' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {cfg.label}
    </span>
  )
}
