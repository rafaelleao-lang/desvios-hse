import 'server-only'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { query } from '@/lib/mysql'
import type { Alojamento, AlojamentoItem, AlojamentoItemKey, AlojamentoItemStats, AlojamentoLocal, AlojamentoSubUnidade, FotoAlojamento } from '@/types/alojamentos'

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Mappers ────────────────────────────────────────────────────────────────────
function mapAlojamento(r: RowDataPacket): Alojamento {
  return {
    id: r.id,
    numero: Number(r.numero),
    obra_id: r.obra_id,
    obra_nome: r.obra_nome ?? undefined,
    alojamento_local_id: r.alojamento_local_id ?? undefined,
    endereco: r.endereco,
    empresa_responsavel: r.empresa_responsavel,
    num_quartos: r.num_quartos ?? undefined,
    num_banheiros: r.num_banheiros ?? undefined,
    num_alojados: r.num_alojados ?? undefined,
    capacidade_maxima: r.capacidade_maxima ?? undefined,
    responsavel_compra: r.responsavel_compra ?? undefined,
    responsavel_alojamento: r.responsavel_alojamento ?? undefined,
    responsavel_relatorio: r.responsavel_relatorio,
    data_vistoria: r.data_vistoria,
    prazo_resolucao: r.prazo_resolucao ?? undefined,
    total_itens: Number(r.total_itens ?? 0),
    total_conformes: Number(r.total_conformes ?? 0),
    criado_em: r.criado_em,
    atualizado_em: r.atualizado_em,
  }
}

function mapLocal(r: RowDataPacket): AlojamentoLocal {
  return {
    id: r.id,
    obra_id: r.obra_id,
    obra_nome: r.obra_nome ?? undefined,
    endereco: r.endereco,
    criado_em: r.criado_em,
    atualizado_em: r.atualizado_em,
  }
}

function mapItem(r: RowDataPacket): AlojamentoItem {
  return {
    id: r.id,
    alojamento_id: r.alojamento_id,
    item_key: r.item_key,
    ordem: Number(r.ordem ?? 0),
    conforme: toBool(r.conforme),
    observacao: r.observacao ?? undefined,
    fotos: parseJSON<FotoAlojamento[]>(r.fotos, []),
    sub_unidades: parseJSON<AlojamentoSubUnidade[]>(r.sub_unidades, []),
  }
}

async function nextAlojamentoNum(): Promise<number> {
  const rows = await query<RowDataPacket[]>('SELECT MAX(numero) AS max FROM alojamentos')
  return ((rows[0]?.max as number) ?? 0) + 1
}

type CreateItemInput = {
  item_key: AlojamentoItemKey
  ordem: number
  conforme: boolean
  observacao?: string
  fotos: FotoAlojamento[]
  sub_unidades?: AlojamentoSubUnidade[]
}

type CreateAlojamentoInput = {
  obra_id: string
  obra_nome?: string
  alojamento_local_id?: string
  endereco: string
  empresa_responsavel: string
  num_quartos?: number
  num_banheiros?: number
  num_alojados?: number
  capacidade_maxima?: number
  responsavel_compra?: string
  responsavel_alojamento?: string
  responsavel_relatorio: string
  data_vistoria: string
  prazo_resolucao?: string
}

// ── Repositório ──────────────────────────────────────────────────────────────
const alojamentosRepo = {
  async list(filters?: { obra_id?: string; data_inicio?: string; data_fim?: string }): Promise<Alojamento[]> {
    const where: string[] = []
    const vals: unknown[] = []
    if (filters?.obra_id) { where.push('obra_id = ?'); vals.push(filters.obra_id) }
    if (filters?.data_inicio) { where.push('data_vistoria >= ?'); vals.push(filters.data_inicio) }
    if (filters?.data_fim) { where.push('data_vistoria <= ?'); vals.push(filters.data_fim) }
    const sql = `SELECT * FROM alojamentos${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY numero DESC`
    const rows = await query<RowDataPacket[]>(sql, vals)
    return rows.map(mapAlojamento)
  },

  async find(id: string): Promise<(Alojamento & { itens: AlojamentoItem[] }) | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM alojamentos WHERE id = ? LIMIT 1', [id])
    if (!rows[0]) return undefined
    const aloj = mapAlojamento(rows[0])
    const itemRows = await query<RowDataPacket[]>(
      'SELECT * FROM alojamento_itens WHERE alojamento_id = ? ORDER BY ordem ASC',
      [id],
    )
    return { ...aloj, itens: itemRows.map(mapItem) }
  },

  async create(data: CreateAlojamentoInput, itens: CreateItemInput[]): Promise<Alojamento & { itens: AlojamentoItem[] }> {
    const num = await nextAlojamentoNum()
    const aloj: Alojamento = {
      id: uid(),
      numero: num,
      obra_id: data.obra_id,
      obra_nome: data.obra_nome,
      alojamento_local_id: data.alojamento_local_id,
      endereco: data.endereco.trim(),
      empresa_responsavel: data.empresa_responsavel.trim(),
      num_quartos: data.num_quartos,
      num_banheiros: data.num_banheiros,
      num_alojados: data.num_alojados,
      capacidade_maxima: data.capacidade_maxima,
      responsavel_compra: data.responsavel_compra?.trim() || undefined,
      responsavel_alojamento: data.responsavel_alojamento?.trim() || undefined,
      responsavel_relatorio: data.responsavel_relatorio.trim(),
      data_vistoria: data.data_vistoria,
      prazo_resolucao: data.prazo_resolucao || undefined,
      total_itens: itens.length,
      total_conformes: itens.filter(it => it.conforme).length,
      criado_em: now(),
      atualizado_em: now(),
    }

    await query(
      `INSERT INTO alojamentos (
        id, numero, obra_id, obra_nome, alojamento_local_id, endereco, empresa_responsavel,
        num_quartos, num_banheiros, num_alojados, capacidade_maxima,
        responsavel_compra, responsavel_alojamento, responsavel_relatorio,
        data_vistoria, prazo_resolucao, total_itens, total_conformes, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        aloj.id, aloj.numero, aloj.obra_id, aloj.obra_nome ?? null, aloj.alojamento_local_id ?? null,
        aloj.endereco, aloj.empresa_responsavel,
        aloj.num_quartos ?? null, aloj.num_banheiros ?? null,
        aloj.num_alojados ?? null, aloj.capacidade_maxima ?? null,
        aloj.responsavel_compra ?? null, aloj.responsavel_alojamento ?? null,
        aloj.responsavel_relatorio, aloj.data_vistoria, aloj.prazo_resolucao ?? null,
        aloj.total_itens, aloj.total_conformes,
        aloj.criado_em, aloj.atualizado_em,
      ],
    )

    const itemRecords: AlojamentoItem[] = itens.map(it => ({
      id: uid(),
      alojamento_id: aloj.id,
      item_key: it.item_key,
      ordem: it.ordem,
      conforme: it.conforme,
      observacao: it.observacao,
      fotos: it.fotos ?? [],
      sub_unidades: it.sub_unidades ?? [],
    }))

    if (itemRecords.length > 0) {
      const placeholders = itemRecords.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
      const flat: unknown[] = []
      for (const it of itemRecords) {
        flat.push(
          it.id, it.alojamento_id, it.item_key, it.ordem,
          it.conforme ? 1 : 0, it.observacao ?? null,
          JSON.stringify(it.fotos ?? []), JSON.stringify(it.sub_unidades ?? []), now(),
        )
      }
      await query<ResultSetHeader>(
        `INSERT INTO alojamento_itens (id, alojamento_id, item_key, ordem, conforme, observacao, fotos, sub_unidades, criado_em)
         VALUES ${placeholders}`,
        flat,
      )
    }

    return { ...aloj, itens: itemRecords }
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM alojamentos WHERE id = ?', [id])
  },

  // Agregação por item (para o ranking de não-conformidades mais recorrentes no dashboard)
  async statsPorItem(): Promise<AlojamentoItemStats[]> {
    const rows = await query<RowDataPacket[]>(`
      SELECT item_key, COUNT(*) AS total, SUM(conforme = 0) AS nao_conformes
      FROM alojamento_itens
      GROUP BY item_key
    `)
    return rows.map(r => ({
      item_key: r.item_key as AlojamentoItemKey,
      total: Number(r.total ?? 0),
      nao_conformes: Number(r.nao_conformes ?? 0),
    }))
  },
}

// ── Cadastro de Alojamentos (Obra + Endereço) ─────────────────────────────────
const alojamentoLocaisRepo = {
  async list(filters?: { obra_id?: string }): Promise<AlojamentoLocal[]> {
    const where: string[] = []
    const vals: unknown[] = []
    if (filters?.obra_id) { where.push('obra_id = ?'); vals.push(filters.obra_id) }
    const sql = `SELECT * FROM alojamento_locais${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY obra_nome ASC, endereco ASC`
    const rows = await query<RowDataPacket[]>(sql, vals)
    return rows.map(mapLocal)
  },

  async find(id: string): Promise<AlojamentoLocal | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM alojamento_locais WHERE id = ? LIMIT 1', [id])
    return rows[0] ? mapLocal(rows[0]) : undefined
  },

  async create(data: { obra_id: string; obra_nome?: string; endereco: string }): Promise<AlojamentoLocal> {
    const id = uid()
    const criado = now()
    await query(
      'INSERT INTO alojamento_locais (id, obra_id, obra_nome, endereco, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.obra_id, data.obra_nome ?? null, data.endereco.trim(), criado, criado],
    )
    return (await alojamentoLocaisRepo.find(id))!
  },

  async update(id: string, data: { obra_id?: string; obra_nome?: string; endereco?: string }): Promise<AlojamentoLocal | undefined> {
    const atual = await alojamentoLocaisRepo.find(id)
    if (!atual) return undefined
    await query(
      'UPDATE alojamento_locais SET obra_id = ?, obra_nome = ?, endereco = ?, atualizado_em = ? WHERE id = ?',
      [
        data.obra_id ?? atual.obra_id,
        data.obra_nome !== undefined ? data.obra_nome : atual.obra_nome ?? null,
        data.endereco !== undefined ? data.endereco.trim() : atual.endereco,
        now(), id,
      ],
    )
    return alojamentoLocaisRepo.find(id)
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM alojamento_locais WHERE id = ?', [id])
  },
}

// ── Dispatch ──────────────────────────────────────────────────────────────────
export async function dispatchAlojamentos(resource: string, action: string, args: unknown[]): Promise<unknown> {
  switch (resource) {
    case 'alojamentos':
      if (action === 'list')   return alojamentosRepo.list(args[0] as Parameters<typeof alojamentosRepo.list>[0])
      if (action === 'find')   return alojamentosRepo.find(args[0] as string)
      if (action === 'create') return alojamentosRepo.create(
        args[0] as Parameters<typeof alojamentosRepo.create>[0],
        args[1] as Parameters<typeof alojamentosRepo.create>[1],
      )
      if (action === 'delete') return alojamentosRepo.delete(args[0] as string)
      if (action === 'statsPorItem') return alojamentosRepo.statsPorItem()
      break
    case 'alojamento_locais':
      if (action === 'list')   return alojamentoLocaisRepo.list(args[0] as Parameters<typeof alojamentoLocaisRepo.list>[0])
      if (action === 'find')   return alojamentoLocaisRepo.find(args[0] as string)
      if (action === 'create') return alojamentoLocaisRepo.create(args[0] as Parameters<typeof alojamentoLocaisRepo.create>[0])
      if (action === 'update') return alojamentoLocaisRepo.update(args[0] as string, args[1] as Parameters<typeof alojamentoLocaisRepo.update>[1])
      if (action === 'delete') return alojamentoLocaisRepo.delete(args[0] as string)
      break
    default:
      throw new Error(`Recurso desconhecido: ${resource}`)
  }
  throw new Error(`Ação desconhecida: ${resource}.${action}`)
}
