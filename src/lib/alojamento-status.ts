import type { Alojamento } from '@/types/alojamentos'

// ── Regra de vigência do Relatório de Alojamento ────────────────────────────
// - Relatório 100% conforme: vale até o dia 1º do mês seguinte ao da vistoria.
//   Depois disso, o alojamento volta a ficar "pendente" (precisa de nova vistoria).
// - Relatório com alguma não conformidade: fica "com prazo" até a data definida
//   em prazo_resolucao (amarelo dentro do prazo, vermelho se vencido). Só deixa
//   de aparecer quando uma vistoria MAIS RECENTE daquele alojamento sair 100%
//   conforme — não existe uma ação separada de "marcar como resolvido".
// - Alojamento sem nenhum relatório ainda: "pendente" (nunca vistoriado).

export type AlojamentoStatus = 'vigente' | 'prazo_ok' | 'prazo_vencido' | 'pendente'

export interface AlojamentoStatusInfo {
  status: AlojamentoStatus
  relatorio?: Alojamento
  validoAte?: string  // yyyy-mm-dd — quando status === 'vigente'
  prazo?: string      // yyyy-mm-dd — quando status é 'prazo_ok' ou 'prazo_vencido'
}

function primeiroDiaMesSeguinte(dataISO: string): Date {
  const [y, m] = dataISO.split('T')[0].split('-').map(Number)
  return new Date(y, m, 1) // `m` (1-12) usado como índice 0-based do Date já aponta pro mês seguinte
}

export function ultimoRelatorio(relatorios: Alojamento[]): Alojamento | undefined {
  if (relatorios.length === 0) return undefined
  return [...relatorios].sort((a, b) => (b.data_vistoria || '').localeCompare(a.data_vistoria || ''))[0]
}

export function computeAlojamentoStatus(relatorios: Alojamento[], asOf: Date = new Date()): AlojamentoStatusInfo {
  const ultimo = ultimoRelatorio(relatorios)
  if (!ultimo) return { status: 'pendente' }

  const naoConformes = ultimo.total_itens - ultimo.total_conformes
  if (naoConformes <= 0) {
    const validoAte = primeiroDiaMesSeguinte(ultimo.data_vistoria)
    if (asOf < validoAte) {
      return { status: 'vigente', relatorio: ultimo, validoAte: validoAte.toISOString().split('T')[0] }
    }
    return { status: 'pendente', relatorio: ultimo }
  }

  if (!ultimo.prazo_resolucao) {
    // Salvaguarda: relatório com não conformidade mas sem prazo definido (dado legado)
    return { status: 'prazo_vencido', relatorio: ultimo }
  }
  const prazoDate = new Date(`${ultimo.prazo_resolucao}T23:59:59`)
  if (asOf <= prazoDate) return { status: 'prazo_ok', relatorio: ultimo, prazo: ultimo.prazo_resolucao }
  return { status: 'prazo_vencido', relatorio: ultimo, prazo: ultimo.prazo_resolucao }
}

export const STATUS_CONFIG: Record<AlojamentoStatus, { label: string; color: string; bg: string }> = {
  vigente:       { label: 'Vigente',      color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  prazo_ok:      { label: 'Prazo',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  prazo_vencido: { label: 'Prazo Vencido', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  pendente:      { label: 'Pendente',     color: '#71717A', bg: 'rgba(113,113,122,0.14)' },
}
