import 'server-only'
import type { RowDataPacket } from 'mysql2'
import { query } from '@/lib/mysql'
import type { Equipamento, InspecaoMaquina, TipoEquipamento, ChecklistRespostaME, ResultadoInspecaoME, StatusInspecaoME } from '@/types/maquinas'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function now(): string {
  return new Date().toISOString()
}

function toBool(v: unknown): boolean {
  return v === 1 || v === true || v === '1'
}

function parseJSON<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback
  if (typeof v === 'string') {
    try { return JSON.parse(v) as T } catch { return fallback }
  }
  return v as T
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapEquipamento(r: RowDataPacket): Equipamento {
  return {
    id: r.id,
    obra_id: r.obra_id,
    tipo: r.tipo as TipoEquipamento,
    nome: r.nome,
    fabricante: r.fabricante ?? undefined,
    modelo: r.modelo ?? undefined,
    numero_serie: r.numero_serie ?? undefined,
    ano_fabricacao: r.ano_fabricacao ? Number(r.ano_fabricacao) : undefined,
    placa: r.placa ?? undefined,
    ativo: toBool(r.ativo),
    criado_em: r.criado_em,
  }
}

function mapInspecaoME(r: RowDataPacket): InspecaoMaquina {
  return {
    id: r.id,
    numero: Number(r.numero),
    obra_id: r.obra_id,
    obra_nome: r.obra_nome ?? undefined,
    equipamento_id: r.equipamento_id,
    equipamento_nome: r.equipamento_nome ?? undefined,
    equipamento_tipo: r.equipamento_tipo as TipoEquipamento ?? undefined,
    equipamento_serie: r.equipamento_serie ?? undefined,
    tst_id: r.tst_id ?? undefined,
    tst_nome: r.tst_nome ?? undefined,
    status: r.status as StatusInspecaoME,
    resultado: (r.resultado ?? null) as ResultadoInspecaoME,
    data_inspecao: r.data_inspecao,
    total_conformes: Number(r.total_conformes ?? 0),
    total_nao_conformes: Number(r.total_nao_conformes ?? 0),
    total_nao_aplicaveis: Number(r.total_nao_aplicaveis ?? 0),
    equipamento_liberado: toBool(r.equipamento_liberado),
    assinatura_url: r.assinatura_url ?? undefined,
    respostas: parseJSON<ChecklistRespostaME[]>(r.respostas, []),
    desvio_id: r.desvio_id ?? undefined,
    criado_em: r.criado_em,
    atualizado_em: r.atualizado_em,
  }
}

async function nextInspecaoMENum(): Promise<number> {
  const rows = await query<RowDataPacket[]>('SELECT COALESCE(MAX(numero), 0) + 1 AS next FROM inspecoes_maquinas')
  return Number(rows[0]?.next ?? 1)
}

// ── Equipamentos ──────────────────────────────────────────────────────────────

export const equipamentosRepo = {
  async list(): Promise<Equipamento[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM equipamentos')
    return rows.map(mapEquipamento).sort((a, b) => a.nome.localeCompare(b.nome))
  },

  async byObra(obraId: string): Promise<Equipamento[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM equipamentos WHERE obra_id = ?', [obraId])
    return rows.map(mapEquipamento).sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome))
  },

  async byTipo(tipo: TipoEquipamento): Promise<Equipamento[]> {
    const rows = await query<RowDataPacket[]>(
      'SELECT * FROM equipamentos WHERE tipo = ? AND ativo = 1',
      [tipo],
    )
    return rows.map(mapEquipamento).sort((a, b) => a.nome.localeCompare(b.nome))
  },

  async byObraAndTipo(obraId: string, tipo: TipoEquipamento): Promise<Equipamento[]> {
    // Retorna equipamentos do tipo que pertencem à obra OU não têm obra definida
    const rows = await query<RowDataPacket[]>(
      'SELECT * FROM equipamentos WHERE tipo = ? AND ativo = 1 AND (obra_id = ? OR obra_id IS NULL)',
      [tipo, obraId],
    )
    return rows.map(mapEquipamento).sort((a, b) => a.nome.localeCompare(b.nome))
  },

  async find(id: string): Promise<Equipamento | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM equipamentos WHERE id = ? LIMIT 1', [id])
    return rows[0] ? mapEquipamento(rows[0]) : undefined
  },

  async create(data: Omit<Equipamento, 'id' | 'criado_em'>): Promise<Equipamento> {
    const eq: Equipamento = { ...data, id: uid(), criado_em: now() }
    await query(
      `INSERT INTO equipamentos (id, obra_id, tipo, nome, fabricante, modelo, numero_serie, ano_fabricacao, placa, ativo, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eq.id, eq.obra_id ?? null, eq.tipo, eq.nome, eq.fabricante ?? null, eq.modelo ?? null,
       eq.numero_serie ?? null, eq.ano_fabricacao ?? null, eq.placa ?? null, eq.ativo ? 1 : 0, eq.criado_em],
    )
    return eq
  },

  async update(id: string, data: Partial<Equipamento>): Promise<Equipamento | undefined> {
    const fields: string[] = []
    const vals: unknown[] = []
    if (data.nome !== undefined)           { fields.push('nome = ?');           vals.push(data.nome) }
    if (data.fabricante !== undefined)     { fields.push('fabricante = ?');     vals.push(data.fabricante ?? null) }
    if (data.modelo !== undefined)         { fields.push('modelo = ?');         vals.push(data.modelo ?? null) }
    if (data.numero_serie !== undefined)   { fields.push('numero_serie = ?');   vals.push(data.numero_serie ?? null) }
    if (data.ano_fabricacao !== undefined) { fields.push('ano_fabricacao = ?'); vals.push(data.ano_fabricacao ?? null) }
    if (data.placa !== undefined)          { fields.push('placa = ?');          vals.push(data.placa ?? null) }
    if (data.ativo !== undefined)          { fields.push('ativo = ?');          vals.push(data.ativo ? 1 : 0) }
    if (!fields.length) return equipamentosRepo.find(id)
    vals.push(id)
    await query(`UPDATE equipamentos SET ${fields.join(', ')} WHERE id = ?`, vals)
    return equipamentosRepo.find(id)
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM equipamentos WHERE id = ?', [id])
  },
}

// ── Inspeções M&E ─────────────────────────────────────────────────────────────

export const inspecoesMERepo = {
  async list(): Promise<InspecaoMaquina[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM inspecoes_maquinas')
    return rows.map(mapInspecaoME).sort((a, b) => b.numero - a.numero)
  },

  async byObra(obraId: string): Promise<InspecaoMaquina[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM inspecoes_maquinas WHERE obra_id = ?', [obraId])
    return rows.map(mapInspecaoME).sort((a, b) => b.numero - a.numero)
  },

  async byEquipamento(equipamentoId: string): Promise<InspecaoMaquina[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM inspecoes_maquinas WHERE equipamento_id = ?', [equipamentoId])
    return rows.map(mapInspecaoME).sort((a, b) => b.numero - a.numero)
  },

  async find(id: string): Promise<InspecaoMaquina | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM inspecoes_maquinas WHERE id = ? LIMIT 1', [id])
    return rows[0] ? mapInspecaoME(rows[0]) : undefined
  },

  async create(data: {
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
  }): Promise<InspecaoMaquina> {
    const num = await nextInspecaoMENum()
    const insp: InspecaoMaquina = {
      ...data,
      id: uid(),
      numero: num,
      status: 'concluida',
      criado_em: now(),
      atualizado_em: now(),
    }
    await query(
      `INSERT INTO inspecoes_maquinas (
        id, numero, obra_id, obra_nome, equipamento_id, equipamento_nome,
        equipamento_tipo, equipamento_serie, tst_id, tst_nome, status, resultado,
        data_inspecao, total_conformes, total_nao_conformes, total_nao_aplicaveis,
        equipamento_liberado, assinatura_url, respostas, desvio_id, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        insp.id, insp.numero, insp.obra_id, insp.obra_nome ?? null,
        insp.equipamento_id, insp.equipamento_nome ?? null,
        insp.equipamento_tipo ?? null, insp.equipamento_serie ?? null,
        insp.tst_id ?? null, insp.tst_nome ?? null,
        insp.status, insp.resultado,
        insp.data_inspecao, insp.total_conformes, insp.total_nao_conformes, insp.total_nao_aplicaveis,
        insp.equipamento_liberado ? 1 : 0,
        insp.assinatura_url ?? null,
        JSON.stringify(insp.respostas),
        insp.desvio_id ?? null,
        insp.criado_em, insp.atualizado_em,
      ],
    )
    return insp
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM inspecoes_maquinas WHERE id = ?', [id])
  },
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

const repos = {
  equipamentos: equipamentosRepo,
  inspecoesME:  inspecoesMERepo,
} as const

export async function dispatchMaquinas(resource: string, action: string, args: unknown[]): Promise<unknown> {
  const repo = (repos as Record<string, Record<string, unknown>>)[resource]
  if (!repo) throw new Error(`Recurso desconhecido: ${resource}`)
  const fn = repo[action]
  if (typeof fn !== 'function') throw new Error(`Ação desconhecida: ${resource}.${action}`)
  return (fn as (...a: unknown[]) => Promise<unknown>)(...args)
}
