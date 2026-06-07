import 'server-only'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { queryResiduos } from '@/lib/mysql-residuos'
import type {
  TipoResiduo, Fornecedor, FornecedorResiduo,
  Saldo, Retirada, Solicitacao, AlertaEstoque, SaldoObra,
} from '@/types/residuos'

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  // UUID-like para compatibilidade com CHAR(36) do schema gestaoresiduos
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function toBool(v: unknown): boolean {
  return v === 1 || v === true || v === '1'
}

function toNum(v: unknown): number {
  return Number(v ?? 0)
}

// ── Mappers ────────────────────────────────────────────────────────────────────

function mapTipo(r: RowDataPacket): TipoResiduo {
  return {
    id:              r.id,
    nome:            r.nome,
    tipo_controle:   r.tipo_controle,
    unidade_medida:  r.unidade_medida,
    created_at:      r.created_at,
  }
}

function mapFornecedor(r: RowDataPacket): Fornecedor {
  return {
    id:        r.id,
    nome:      r.nome,
    cnpj:      r.cnpj ?? undefined,
    contato:   r.contato ?? undefined,
    endereco:  r.endereco ?? undefined,
    estado:    r.estado ?? undefined,
    status:    r.status,
    created_at: r.created_at,
  }
}

function mapFornecedorResiduo(r: RowDataPacket): FornecedorResiduo {
  return {
    id:            r.id,
    fornecedor_id: r.fornecedor_id,
    residuo_id:    r.residuo_id,
    residuo_nome:  r.residuo_nome ?? undefined,
    descricao:     r.descricao ?? undefined,
    valor:         toNum(r.valor),
  }
}

function mapSaldo(r: RowDataPacket): Saldo {
  return {
    id:             r.id,
    obra_id:        r.obra_id,
    obra_nome:      r.obra_nome ?? undefined,
    residuo_id:     r.residuo_id,
    residuo_nome:   r.residuo_nome ?? undefined,
    quantidade:     toNum(r.quantidade),
    unidade_medida: r.unidade_medida,
    documento_url:  r.documento_url ?? undefined,
    data:           r.data,
    created_at:     r.created_at,
  }
}

function mapRetirada(r: RowDataPacket): Retirada {
  return {
    id:              r.id,
    obra_id:         r.obra_id,
    obra_nome:       r.obra_nome ?? undefined,
    residuo_id:      r.residuo_id,
    residuo_nome:    r.residuo_nome ?? undefined,
    fornecedor_id:   r.fornecedor_id,
    fornecedor_nome: r.fornecedor_nome ?? undefined,
    quantidade:      toNum(r.quantidade),
    unidade_medida:  r.unidade_medida ?? undefined,
    descricao_preco: r.descricao_preco ?? undefined,
    valor_unitario:  r.valor_unitario != null ? toNum(r.valor_unitario) : undefined,
    valor_total:     r.valor_total != null ? toNum(r.valor_total) : undefined,
    foto_url:        r.foto_url ?? undefined,
    observacoes:     r.observacoes ?? undefined,
    data:            r.data,
    created_at:      r.created_at,
  }
}

function mapSolicitacao(r: RowDataPacket): Solicitacao {
  return {
    id:               r.id,
    obra_id:          r.obra_id,
    obra_nome:        r.obra_nome ?? undefined,
    residuo_id:       r.residuo_id,
    residuo_nome:     r.residuo_nome ?? undefined,
    quantidade:       toNum(r.quantidade),
    unidade_medida:   r.unidade_medida ?? undefined,
    descricao_preco:  r.descricao_preco ?? undefined,
    valor_unitario:   r.valor_unitario != null ? toNum(r.valor_unitario) : undefined,
    data_prevista:    r.data_prevista,
    data_solicitacao: r.data_solicitacao ?? undefined,
    data_finalizacao: r.data_finalizacao ?? undefined,
    observacoes:      r.observacoes ?? undefined,
    status:           r.status,
    created_at:       r.created_at,
  }
}

function mapAlerta(r: RowDataPacket): AlertaEstoque {
  return {
    id:            r.id,
    obra_id:       r.obra_id,
    obra_nome:     r.obra_nome ?? undefined,
    residuo_id:    r.residuo_id,
    residuo_nome:  r.residuo_nome ?? undefined,
    minimo:        toNum(r.minimo),
    emails:        r.emails ?? undefined,
    ativo:         toBool(r.ativo),
    created_at:    r.created_at,
    saldo_atual:   r.saldo_atual != null ? toNum(r.saldo_atual) : undefined,
  }
}

// ── Tipos de resíduo ──────────────────────────────────────────────────────────

const tiposRepo = {
  async list(): Promise<TipoResiduo[]> {
    const rows = await queryResiduos<RowDataPacket[]>(
      'SELECT * FROM residuos ORDER BY nome ASC',
    )
    return rows.map(mapTipo)
  },
  async find(id: string): Promise<TipoResiduo | undefined> {
    const rows = await queryResiduos<RowDataPacket[]>(
      'SELECT * FROM residuos WHERE id = ? LIMIT 1', [id],
    )
    return rows[0] ? mapTipo(rows[0]) : undefined
  },
  async create(data: Omit<TipoResiduo, 'id' | 'created_at'>): Promise<TipoResiduo> {
    const id = uid()
    await queryResiduos<ResultSetHeader>(
      'INSERT INTO residuos (id, nome, tipo_controle, unidade_medida) VALUES (?,?,?,?)',
      [id, data.nome, data.tipo_controle, data.unidade_medida],
    )
    return (await tiposRepo.find(id))!
  },
  async update(id: string, data: Partial<Omit<TipoResiduo, 'id' | 'created_at'>>): Promise<void> {
    await queryResiduos(
      'UPDATE residuos SET nome=?, tipo_controle=?, unidade_medida=? WHERE id=?',
      [data.nome, data.tipo_controle, data.unidade_medida, id],
    )
  },
  async delete(id: string): Promise<void> {
    await queryResiduos('DELETE FROM residuos WHERE id=?', [id])
  },
}

// ── Fornecedores ──────────────────────────────────────────────────────────────

const fornecedoresRepo = {
  async list(): Promise<Fornecedor[]> {
    const rows = await queryResiduos<RowDataPacket[]>(
      "SELECT * FROM fornecedores ORDER BY nome ASC",
    )
    return rows.map(mapFornecedor)
  },
  async find(id: string): Promise<Fornecedor | undefined> {
    const rows = await queryResiduos<RowDataPacket[]>(
      'SELECT * FROM fornecedores WHERE id=? LIMIT 1', [id],
    )
    if (!rows[0]) return undefined
    const f = mapFornecedor(rows[0])
    const precos = await queryResiduos<RowDataPacket[]>(
      `SELECT fr.*, r.nome AS residuo_nome
       FROM fornecedor_residuos fr
       LEFT JOIN residuos r ON r.id = fr.residuo_id
       WHERE fr.fornecedor_id = ?`,
      [id],
    )
    f.precos = precos.map(mapFornecedorResiduo)
    return f
  },
  async create(data: Omit<Fornecedor, 'id' | 'created_at' | 'precos'>): Promise<Fornecedor> {
    const id = uid()
    await queryResiduos(
      'INSERT INTO fornecedores (id, nome, cnpj, contato, endereco, estado, status) VALUES (?,?,?,?,?,?,?)',
      [id, data.nome, data.cnpj ?? null, data.contato ?? null, data.endereco ?? null, data.estado ?? null, data.status],
    )
    return (await fornecedoresRepo.find(id))!
  },
  async update(id: string, data: Partial<Omit<Fornecedor, 'id' | 'created_at' | 'precos'>>): Promise<void> {
    await queryResiduos(
      'UPDATE fornecedores SET nome=?, cnpj=?, contato=?, endereco=?, estado=? WHERE id=?',
      [data.nome, data.cnpj ?? null, data.contato ?? null, data.endereco ?? null, data.estado ?? null, id],
    )
  },
  async toggleStatus(id: string): Promise<void> {
    await queryResiduos(
      "UPDATE fornecedores SET status = IF(status='ATIVO','INATIVO','ATIVO') WHERE id=?",
      [id],
    )
  },
  async delete(id: string): Promise<void> {
    await queryResiduos('DELETE FROM fornecedor_residuos WHERE fornecedor_id=?', [id])
    await queryResiduos('DELETE FROM fornecedores WHERE id=?', [id])
  },
  async setPrecos(fornecedorId: string, precos: Array<{ residuo_id: string; descricao?: string; valor: number }>): Promise<void> {
    await queryResiduos('DELETE FROM fornecedor_residuos WHERE fornecedor_id=?', [fornecedorId])
    for (const p of precos) {
      await queryResiduos(
        'INSERT INTO fornecedor_residuos (id, fornecedor_id, residuo_id, descricao, valor) VALUES (?,?,?,?,?)',
        [uid(), fornecedorId, p.residuo_id, p.descricao ?? null, p.valor],
      )
    }
  },
}

// ── Saldos (entradas) ─────────────────────────────────────────────────────────

const saldosRepo = {
  async list(obraId?: string): Promise<Saldo[]> {
    let sql = `SELECT s.*, r.nome AS residuo_nome
               FROM saldos s
               LEFT JOIN residuos r ON r.id = s.residuo_id
               WHERE 1=1`
    const params: unknown[] = []
    if (obraId) { sql += ' AND s.obra_id = ?'; params.push(obraId) }
    sql += ' ORDER BY s.data DESC, s.created_at DESC'
    const rows = await queryResiduos<RowDataPacket[]>(sql, params)
    return rows.map(mapSaldo)
  },
  async insert(data: Omit<Saldo, 'id' | 'created_at' | 'obra_nome' | 'residuo_nome'>): Promise<Saldo> {
    const id = uid()
    await queryResiduos(
      'INSERT INTO saldos (id, obra_id, residuo_id, quantidade, unidade_medida, documento_url, data) VALUES (?,?,?,?,?,?,?)',
      [id, data.obra_id, data.residuo_id, data.quantidade, data.unidade_medida, data.documento_url ?? null, data.data],
    )
    return (await saldosRepo.list(data.obra_id)).find(s => s.id === id)!
  },
  async delete(id: string): Promise<void> {
    await queryResiduos('DELETE FROM saldos WHERE id=?', [id])
  },
  async saldosPorObra(): Promise<SaldoObra[]> {
    const rows = await queryResiduos<RowDataPacket[]>(`
      SELECT
        s.obra_id,
        s.residuo_id,
        r.nome AS residuo_nome,
        s.unidade_medida,
        COALESCE(SUM(s.quantidade), 0) AS total_entrada,
        COALESCE((
          SELECT SUM(ret.quantidade)
          FROM retiradas ret
          WHERE ret.obra_id = s.obra_id AND ret.residuo_id = s.residuo_id
        ), 0) AS total_retirada
      FROM saldos s
      INNER JOIN residuos r ON r.id = s.residuo_id
      GROUP BY s.obra_id, s.residuo_id, s.unidade_medida, r.nome
      ORDER BY r.nome ASC
    `)
    return rows.map(r => ({
      obra_id:        r.obra_id,
      residuo_id:     r.residuo_id,
      residuo_nome:   r.residuo_nome,
      unidade_medida: r.unidade_medida,
      total_entrada:  toNum(r.total_entrada),
      total_retirada: toNum(r.total_retirada),
      saldo:          toNum(r.total_entrada) - toNum(r.total_retirada),
    }))
  },
}

// ── Retiradas ─────────────────────────────────────────────────────────────────

const retiradasRepo = {
  async list(obraId?: string): Promise<Retirada[]> {
    let sql = `SELECT ret.*, r.nome AS residuo_nome, f.nome AS fornecedor_nome
               FROM retiradas ret
               LEFT JOIN residuos r ON r.id = ret.residuo_id
               LEFT JOIN fornecedores f ON f.id = ret.fornecedor_id
               WHERE 1=1`
    const params: unknown[] = []
    if (obraId) { sql += ' AND ret.obra_id = ?'; params.push(obraId) }
    sql += ' ORDER BY ret.data DESC, ret.created_at DESC'
    const rows = await queryResiduos<RowDataPacket[]>(sql, params)
    return rows.map(mapRetirada)
  },
  async insert(data: Omit<Retirada, 'id' | 'created_at' | 'obra_nome' | 'residuo_nome' | 'fornecedor_nome'>): Promise<Retirada> {
    const id = uid()
    await queryResiduos(
      `INSERT INTO retiradas
         (id, obra_id, residuo_id, fornecedor_id, quantidade, unidade_medida,
          descricao_preco, valor_unitario, valor_total, foto_url, observacoes, data)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, data.obra_id, data.residuo_id, data.fornecedor_id,
        data.quantidade, data.unidade_medida ?? null,
        data.descricao_preco ?? null, data.valor_unitario ?? null,
        data.valor_total ?? null, data.foto_url ?? null,
        data.observacoes ?? null, data.data,
      ],
    )
    return (await retiradasRepo.list(data.obra_id)).find(r => r.id === id)!
  },
  async delete(id: string): Promise<void> {
    await queryResiduos('DELETE FROM retiradas WHERE id=?', [id])
  },
  async totalValorRetiradas(): Promise<number> {
    const rows = await queryResiduos<RowDataPacket[]>(
      'SELECT COALESCE(SUM(valor_total), 0) AS total FROM retiradas',
    )
    return toNum(rows[0]?.total)
  },
}

// ── Solicitações ──────────────────────────────────────────────────────────────

const solicitacoesRepo = {
  async list(obraId?: string): Promise<Solicitacao[]> {
    let sql = `SELECT s.*, r.nome AS residuo_nome
               FROM solicitacoes s
               LEFT JOIN residuos r ON r.id = s.residuo_id
               WHERE 1=1`
    const params: unknown[] = []
    if (obraId) { sql += ' AND s.obra_id = ?'; params.push(obraId) }
    sql += ' ORDER BY s.data_prevista ASC, s.created_at DESC'
    const rows = await queryResiduos<RowDataPacket[]>(sql, params)
    return rows.map(mapSolicitacao)
  },
  async insert(data: Omit<Solicitacao, 'id' | 'created_at' | 'obra_nome' | 'residuo_nome' | 'data_finalizacao'>): Promise<Solicitacao> {
    const id = uid()
    await queryResiduos(
      `INSERT INTO solicitacoes
         (id, obra_id, residuo_id, quantidade, unidade_medida,
          descricao_preco, valor_unitario, data_prevista, data_solicitacao, observacoes, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, data.obra_id, data.residuo_id, data.quantidade,
        data.unidade_medida ?? null, data.descricao_preco ?? null,
        data.valor_unitario ?? null, data.data_prevista,
        data.data_solicitacao ?? null, data.observacoes ?? null, data.status,
      ],
    )
    return (await solicitacoesRepo.list(data.obra_id)).find(s => s.id === id)!
  },
  async updateStatus(id: string, status: Solicitacao['status']): Promise<void> {
    if (status === 'CONCLUIDA') {
      await queryResiduos(
        'UPDATE solicitacoes SET status=?, data_finalizacao=NOW() WHERE id=?',
        [status, id],
      )
    } else {
      await queryResiduos('UPDATE solicitacoes SET status=? WHERE id=?', [status, id])
    }
  },
  async delete(id: string): Promise<void> {
    await queryResiduos('DELETE FROM solicitacoes WHERE id=?', [id])
  },
  async countPendentes(): Promise<number> {
    const rows = await queryResiduos<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM solicitacoes WHERE status = 'PENDENTE'",
    )
    return toNum(rows[0]?.c)
  },
}

// ── Alertas de estoque ────────────────────────────────────────────────────────

const alertasRepo = {
  async list(): Promise<AlertaEstoque[]> {
    const rows = await queryResiduos<RowDataPacket[]>(`
      SELECT ae.*, r.nome AS residuo_nome,
        (
          COALESCE((SELECT SUM(s.quantidade) FROM saldos s WHERE s.obra_id=ae.obra_id AND s.residuo_id=ae.residuo_id), 0)
          - COALESCE((SELECT SUM(ret.quantidade) FROM retiradas ret WHERE ret.obra_id=ae.obra_id AND ret.residuo_id=ae.residuo_id), 0)
        ) AS saldo_atual
      FROM alertas_estoque ae
      LEFT JOIN residuos r ON r.id = ae.residuo_id
      ORDER BY ae.ativo DESC, r.nome ASC
    `)
    return rows.map(mapAlerta)
  },
  async upsert(obraId: string, residuoId: string, minimo: number, emails?: string): Promise<void> {
    await queryResiduos(`
      INSERT INTO alertas_estoque (id, obra_id, residuo_id, minimo, emails, ativo)
      VALUES (?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE minimo=VALUES(minimo), emails=VALUES(emails), ativo=1
    `, [uid(), obraId, residuoId, minimo, emails ?? null])
  },
  async toggleAtivo(id: string): Promise<void> {
    await queryResiduos(
      'UPDATE alertas_estoque SET ativo = IF(ativo=1,0,1) WHERE id=?', [id],
    )
  },
  async delete(id: string): Promise<void> {
    await queryResiduos('DELETE FROM alertas_estoque WHERE id=?', [id])
  },
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export async function dispatchResiduos(
  resource: string,
  action: string,
  args: unknown[],
): Promise<unknown> {
  switch (resource) {
    case 'tipos': {
      if (action === 'list')   return tiposRepo.list()
      if (action === 'find')   return tiposRepo.find(args[0] as string)
      if (action === 'create') return tiposRepo.create(args[0] as Parameters<typeof tiposRepo.create>[0])
      if (action === 'update') return tiposRepo.update(args[0] as string, args[1] as Parameters<typeof tiposRepo.update>[1])
      if (action === 'delete') return tiposRepo.delete(args[0] as string)
      break
    }
    case 'fornecedores': {
      if (action === 'list')         return fornecedoresRepo.list()
      if (action === 'find')         return fornecedoresRepo.find(args[0] as string)
      if (action === 'create')       return fornecedoresRepo.create(args[0] as Parameters<typeof fornecedoresRepo.create>[0])
      if (action === 'update')       return fornecedoresRepo.update(args[0] as string, args[1] as Parameters<typeof fornecedoresRepo.update>[1])
      if (action === 'toggleStatus') return fornecedoresRepo.toggleStatus(args[0] as string)
      if (action === 'delete')       return fornecedoresRepo.delete(args[0] as string)
      if (action === 'setPrecos')    return fornecedoresRepo.setPrecos(args[0] as string, args[1] as Parameters<typeof fornecedoresRepo.setPrecos>[1])
      break
    }
    case 'saldos': {
      if (action === 'list')          return saldosRepo.list(args[0] as string | undefined)
      if (action === 'insert')        return saldosRepo.insert(args[0] as Parameters<typeof saldosRepo.insert>[0])
      if (action === 'delete')        return saldosRepo.delete(args[0] as string)
      if (action === 'saldosPorObra') return saldosRepo.saldosPorObra()
      break
    }
    case 'retiradas': {
      if (action === 'list')              return retiradasRepo.list(args[0] as string | undefined)
      if (action === 'insert')            return retiradasRepo.insert(args[0] as Parameters<typeof retiradasRepo.insert>[0])
      if (action === 'delete')            return retiradasRepo.delete(args[0] as string)
      if (action === 'totalValorRetiradas') return retiradasRepo.totalValorRetiradas()
      break
    }
    case 'solicitacoes': {
      if (action === 'list')         return solicitacoesRepo.list(args[0] as string | undefined)
      if (action === 'insert')       return solicitacoesRepo.insert(args[0] as Parameters<typeof solicitacoesRepo.insert>[0])
      if (action === 'updateStatus') return solicitacoesRepo.updateStatus(args[0] as string, args[1] as Solicitacao['status'])
      if (action === 'delete')       return solicitacoesRepo.delete(args[0] as string)
      if (action === 'countPendentes') return solicitacoesRepo.countPendentes()
      break
    }
    case 'alertas': {
      if (action === 'list')       return alertasRepo.list()
      if (action === 'upsert')     return alertasRepo.upsert(args[0] as string, args[1] as string, args[2] as number, args[3] as string | undefined)
      if (action === 'toggleAtivo') return alertasRepo.toggleAtivo(args[0] as string)
      if (action === 'delete')     return alertasRepo.delete(args[0] as string)
      break
    }
    default:
      throw new Error(`Recurso desconhecido: ${resource}`)
  }
  throw new Error(`Ação desconhecida: ${resource}.${action}`)
}
