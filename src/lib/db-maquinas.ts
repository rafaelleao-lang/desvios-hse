import type { Equipamento, InspecaoMaquina, TipoEquipamento, ChecklistRespostaME, ResultadoInspecaoME } from '@/types/maquinas'

async function rpc<T>(resource: string, action: string, ...args: unknown[]): Promise<T> {
  const res = await fetch('/api/maquinas', {
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

async function rpcFull<T>(resource: string, action: string, ...args: unknown[]): Promise<{ data: T; vitaSyncResult?: { ok: boolean; vitaId?: string; reason?: string } }> {
  const res = await fetch('/api/maquinas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource, action, args }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Falha na operação ${resource}.${action}`)
  }
  return { data: json.data as T, vitaSyncResult: json.vitaSyncResult }
}

// ── Equipamentos ──────────────────────────────────────────────────────────────

export const equipamentosDB = {
  list: (): Promise<Equipamento[]> => rpc('equipamentos', 'list'),
  byObra: (obraId: string): Promise<Equipamento[]> => rpc('equipamentos', 'byObra', obraId),
  byTipo: (tipo: TipoEquipamento): Promise<Equipamento[]> => rpc('equipamentos', 'byTipo', tipo),
  byObraAndTipo: (obraId: string, tipo: TipoEquipamento): Promise<Equipamento[]> =>
    rpc('equipamentos', 'byObraAndTipo', obraId, tipo),
  find: (id: string): Promise<Equipamento | undefined> => rpc('equipamentos', 'find', id),
  create: (data: Omit<Equipamento, 'id' | 'criado_em'>): Promise<Equipamento> =>
    rpc('equipamentos', 'create', data),
  update: (id: string, data: Partial<Equipamento>): Promise<Equipamento | undefined> =>
    rpc('equipamentos', 'update', id, data),
  delete: (id: string): Promise<void> => rpc('equipamentos', 'delete', id),
}

// ── Inspeções M&E ─────────────────────────────────────────────────────────────

type CreateInspecaoMEData = {
  obra_id: string
  obra_nome?: string
  equipamento_id: string
  equipamento_nome?: string
  equipamento_tipo?: TipoEquipamento
  equipamento_serie?: string
  tst_id?: string
  tst_nome?: string
  data_inspecao: string
  respostas: ChecklistRespostaME[]
  total_conformes: number
  total_nao_conformes: number
  total_nao_aplicaveis: number
  resultado: ResultadoInspecaoME
  equipamento_liberado: boolean
  assinatura_url?: string
  desvio_id?: string
}

export const inspecoesMEDB = {
  list: (): Promise<InspecaoMaquina[]> => rpc('inspecoesME', 'list'),
  byObra: (obraId: string): Promise<InspecaoMaquina[]> => rpc('inspecoesME', 'byObra', obraId),
  byEquipamento: (equipamentoId: string): Promise<InspecaoMaquina[]> =>
    rpc('inspecoesME', 'byEquipamento', equipamentoId),
  find: (id: string): Promise<InspecaoMaquina | undefined> => rpc('inspecoesME', 'find', id),
  create: (data: CreateInspecaoMEData): Promise<{ insp: InspecaoMaquina; vitaSyncResult?: { ok: boolean; vitaId?: string; reason?: string } }> =>
    rpcFull<InspecaoMaquina>('inspecoesME', 'create', data).then(r => ({ insp: r.data, vitaSyncResult: r.vitaSyncResult })),
  delete: (id: string): Promise<void> => rpc('inspecoesME', 'delete', id),
}
