import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { StatusDesvio, GravidadeDesvio } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---- Date formatting ----

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return formatDistanceToNow(d, { locale: ptBR, addSuffix: true })
  } catch {
    return '—'
  }
}

export function formatMonthYear(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'MMM/yy', { locale: ptBR })
  } catch {
    return '—'
  }
}

// ---- Status helpers ----

export const STATUS_CONFIG: Record<
  StatusDesvio,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  aberto: {
    label: 'Aberto',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
  },
  em_tratativa: {
    label: 'Em Tratativa',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
  },
  pendente: {
    label: 'Pendente',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    dot: 'bg-orange-400',
  },
  concluido: {
    label: 'Concluído',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    dot: 'bg-green-400',
  },
  fechado: {
    label: 'Fechado',
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20',
    dot: 'bg-zinc-400',
  },
  reincidente: {
    label: 'Reincidente',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
  },
}

export const GRAVIDADE_CONFIG: Record<
  GravidadeDesvio,
  { label: string; color: string; bg: string; border: string; priority: number }
> = {
  baixo: {
    label: 'Baixo',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    priority: 1,
  },
  medio: {
    label: 'Médio',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    priority: 2,
  },
  alto: {
    label: 'Alto',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    priority: 3,
  },
  critico: {
    label: 'Crítico',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    priority: 4,
  },
}

// ---- Number formatting ----

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n)
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`
}

// ---- File helpers ----

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function compressImage(file: File, maxWidth = 1280, quality = 0.82): Promise<File> {
  // HEIC/HEIF/AVIF: canvas não consegue decodificar — devolve original imediatamente
  const t = file.type.toLowerCase()
  const n = file.name.toLowerCase()
  if (t.includes('heic') || t.includes('heif') || t.includes('avif') ||
      n.endsWith('.heic') || n.endsWith('.heif')) {
    return file
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) { resolve(file); return }

    const url = URL.createObjectURL(file)
    const img = new Image()

    // Timeout: se onload/onerror não dispararem em 12s (formato raro, memória baixa)
    // → devolve o arquivo original para não travar o UI
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url)
      resolve(file)
    }, 12_000)

    const finish = (result: File) => {
      clearTimeout(timer)
      resolve(result)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      finish(file)
    }

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { finish(file); return }
          // Renomeia para .jpg para que o servidor reconheça o mime
          const safeName = file.name.replace(/\.[^.]+$/, '.jpg')
          finish(new File([blob], safeName, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }

    img.src = url
  })
}

export function generateDesvioId(numero: number): string {
  return `DEV-${String(numero).padStart(5, '0')}`
}

export function getSlaColor(diasParaVencer: number | null, vencido: boolean, isClosed = false): string {
  if (isClosed) {
    if (diasParaVencer === null) return 'text-zinc-400'
    return diasParaVencer >= 0 ? 'text-green-400' : 'text-red-400'
  }
  if (vencido) return 'text-red-400'
  if (diasParaVencer === null) return 'text-zinc-400'
  if (diasParaVencer <= 1) return 'text-red-400'
  if (diasParaVencer <= 3) return 'text-orange-400'
  if (diasParaVencer <= 7) return 'text-yellow-400'
  return 'text-green-400'
}

export function getSlaLabel(diasParaVencer: number | null, vencido: boolean, isClosed = false): string {
  if (isClosed) {
    if (diasParaVencer === null) return 'Sem prazo'
    return diasParaVencer >= 0 ? 'Prazo atendido' : 'Fechado fora do prazo'
  }
  if (vencido) return 'Vencido'
  if (diasParaVencer === null) return 'Sem prazo'
  if (diasParaVencer === 0) return 'Vence hoje'
  if (diasParaVencer === 1) return 'Vence amanhã'
  if (diasParaVencer < 0) return `Vencido há ${Math.abs(diasParaVencer)}d`
  return `${diasParaVencer}d restantes`
}
