import type { Alojamento, AlojamentoItem, AlojamentoItemKey, AlojamentoItemStats, FotoAlojamento } from '@/types/alojamentos'

// ── Cliente RPC para o backend MySQL (módulo Alojamentos) ──────────────────────
async function rpc<T>(resource: string, action: string, ...args: unknown[]): Promise<T> {
  const res = await fetch('/api/alojamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource, action, args }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Falha na operação ${resource}.${action}`)
  }
  return json.data as T
}

export interface CreateAlojamentoItemInput {
  item_key: AlojamentoItemKey
  ordem: number
  conforme: boolean
  observacao?: string
  fotos: FotoAlojamento[]
}

export type CreateAlojamentoInput = Omit<
  Alojamento, 'id' | 'numero' | 'criado_em' | 'atualizado_em' | 'itens' | 'total_itens' | 'total_conformes'
>

export const alojamentosDB = {
  list: (filters?: { obra_id?: string; data_inicio?: string; data_fim?: string }): Promise<Alojamento[]> =>
    rpc('alojamentos', 'list', filters),
  find: (id: string): Promise<(Alojamento & { itens: AlojamentoItem[] }) | undefined> =>
    rpc('alojamentos', 'find', id),
  create: (data: CreateAlojamentoInput, itens: CreateAlojamentoItemInput[]): Promise<Alojamento & { itens: AlojamentoItem[] }> =>
    rpc('alojamentos', 'create', data, itens),
  delete: (id: string): Promise<void> => rpc('alojamentos', 'delete', id),
  statsPorItem: (): Promise<AlojamentoItemStats[]> => rpc('alojamentos', 'statsPorItem'),
}
