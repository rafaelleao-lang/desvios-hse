import 'server-only'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { query } from '@/lib/mysql'
import type {
  TipoResiduo, Fornecedor, FornecedorPreco,
  ResSaldo, ResRetirada, ResSolicitacao, ResAlerta, SaldoObra,
} from '@/types/residuos'

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

function toNum(v: unknown): number {
  return Number(v ?? 0)
}

// ── Mappers ────────────────────────────────────────────────────────────────────

function mapTipo(r: RowDataPacket): TipoResiduo {
  return {
    id:             r.id,
    nome:           r.nome,
    tipo_controle:  r.tipo_controle,
    unidade_medida: r.unidade_medida,
    criado_em:      r.criado_em,
  }
}

function mapFornecedor(r: RowDataPacket): Fornecedor {
  return {
    id:       r.id,
    nome:     r.nome,
    cnpj:     r.cnpj     ?? undefined,
    contato:  r.contato  ?? undefined,
    endereco: r.endereco ?? undefined,
    estado:   r.estado   ?? undefined,
    ativo:    toBool(r.ativo),
    criado_em: r.criado_em,
  }
}

function mapPreco(r: RowDataPacket): FornecedorPreco {
  return {
    id:            r.id,
    fornecedor_id: r.fornecedor_id,
    tipo_id:       r.tipo_id,
    tipo_nome:     r.tipo_nome ?? undefined,
    descricao:     r.descricao ?? undefined,
    valor:         toNum(r.valor),
  }
}

function mapSaldo(r: RowDataPacket): ResSaldo {
  return {
    id:             r.id,
    obra_id:        r.obra_id,
    obra_nome:      r.obra_nome ?? undefined,
    tipo_id:        r.tipo_id,
    tipo_nome:      r.tipo_nome ?? undefined,
    quantidade:     toNum(r.quantidade),
    unidade_medida: r.unidade_medida,
    documento_url:  r.documento_url ?? undefined,
    data:           r.data,
    criado_em:      r.criado_em,
  }
}

function mapRetirada(r: RowDataPacket): ResRetirada {
  return {
    id:              r.id,
    obra_id:         r.obra_id,
    obra_nome:       r.obra_nome      ?? undefined,
    tipo_id:         r.tipo_id,
    tipo_nome:       r.tipo_nome      ?? undefined,
    fornecedor_id:   r.fornecedor_id,
    fornecedor_nome: r.fornecedor_nome ?? undefined,
    quantidade:      toNum(r.quantidade),
    unidade_medida:  r.unidade_medida  ?? undefined,
    descricao_preco: r.descricao_preco ?? undefined,
    valor_unitario:  r.valor_unitario != null ? toNum(r.valor_unitario) : undefined,
    valor_total:     r.valor_total     != null ? toNum(r.valor_total)    : undefined,
    foto_url:        r.foto_url        ?? undefined,
    observacoes:     r.observacoes     ?? undefined,
    data:            r.data,
    criado_em:       r.criado_em,
  }
}

function mapSolicitacao(r: RowDataPacket): ResSolicitacao {
  return {
    id:               r.id,
    obra_id:          r.obra_id,
    obra_nome:        r.obra_nome       ?? undefined,
    tipo_id:          r.tipo_id,
    tipo_nome:        r.tipo_nome       ?? undefined,
    quantidade:       toNum(r.quantidade),
    unidade_medida:   r.unidade_medida  ?? undefined,
    descricao_preco:  r.descricao_preco ?? undefined,
    valor_unitario:   r.valor_unitario != null ? toNum(r.valor_unitario) : undefined,
    data_prevista:    r.data_prevista,
    data_solicitacao: r.data_solicitacao  ?? undefined,
    data_finalizacao: r.data_finalizacao  ?? undefined,
    observacoes:      r.observacoes       ?? undefined,
    status:           r.status,
    criado_em:        r.criado_em,
  }
}

function mapAlerta(r: RowDataPacket): ResAlerta {
  return {
    id:          r.id,
    obra_id:     r.obra_id,
    obra_nome:   r.obra_nome  ?? undefined,
    tipo_id:     r.tipo_id,
    tipo_nome:   r.tipo_nome  ?? undefined,
    minimo:      toNum(r.minimo),
    emails:      r.emails     ?? undefined,
    ativo:       toBool(r.ativo),
    criado_em:   r.criado_em,
    saldo_atual: r.saldo_atual != null ? toNum(r.saldo_atual) : undefined,
  }
}

// ── Tipos de resíduo ──────────────────────────────────────────────────────────

const tiposRepo = {
  async list(): Promise<TipoResiduo[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM res_tipos ORDER BY nome ASC')
    return rows.map(mapTipo)
  },
  async find(id: string): Promise<TipoResiduo | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM res_tipos WHERE id=? LIMIT 1', [id])
    return rows[0] ? mapTipo(rows[0]) : undefined
  },
  async create(data: Pick<TipoResiduo, 'nome' | 'tipo_controle' | 'unidade_medida'>): Promise<TipoResiduo> {
    const id = uid()
    await query<ResultSetHeader>(
      'INSERT INTO res_tipos (id, nome, tipo_controle, unidade_medida, criado_em) VALUES (?,?,?,?,?)',
      [id, data.nome, data.tipo_controle, data.unidade_medida, now()],
    )
    return (await tiposRepo.find(id))!
  },
  async update(id: string, data: Partial<Pick<TipoResiduo, 'nome' | 'tipo_controle' | 'unidade_medida'>>): Promise<void> {
    await query(
      'UPDATE res_tipos SET nome=?, tipo_controle=?, unidade_medida=? WHERE id=?',
      [data.nome, data.tipo_controle, data.unidade_medida, id],
    )
  },
  async delete(id: string): Promise<void> {
    await query('DELETE FROM res_tipos WHERE id=?', [id])
  },
}

// ── Fornecedores ──────────────────────────────────────────────────────────────

const fornecedoresRepo = {
  async list(): Promise<Fornecedor[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM res_fornecedores ORDER BY nome ASC')
    const fornecedores = rows.map(mapFornecedor)
    if (fornecedores.length === 0) return fornecedores
    const precoRows = await query<RowDataPacket[]>(
      `SELECT fp.*, t.nome AS tipo_nome
       FROM res_fornecedor_precos fp
       LEFT JOIN res_tipos t ON t.id = fp.tipo_id`,
    )
    const porForn: Record<string, FornecedorPreco[]> = {}
    for (const p of precoRows) {
      const fp = mapPreco(p)
      if (!porForn[fp.fornecedor_id]) porForn[fp.fornecedor_id] = []
      porForn[fp.fornecedor_id].push(fp)
    }
    for (const f of fornecedores) f.precos = porForn[f.id] ?? []
    return fornecedores
  },
  async find(id: string): Promise<Fornecedor | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM res_fornecedores WHERE id=? LIMIT 1', [id])
    if (!rows[0]) return undefined
    const f = mapFornecedor(rows[0])
    const precos = await query<RowDataPacket[]>(
      `SELECT fp.*, t.nome AS tipo_nome
       FROM res_fornecedor_precos fp
       LEFT JOIN res_tipos t ON t.id = fp.tipo_id
       WHERE fp.fornecedor_id = ?`,
      [id],
    )
    f.precos = precos.map(mapPreco)
    return f
  },
  async create(data: Omit<Fornecedor, 'id' | 'criado_em' | 'precos'>): Promise<Fornecedor> {
    const id = uid()
    await query(
      'INSERT INTO res_fornecedores (id, nome, cnpj, contato, endereco, estado, ativo, criado_em) VALUES (?,?,?,?,?,?,?,?)',
      [id, data.nome, data.cnpj ?? null, data.contato ?? null, data.endereco ?? null, data.estado ?? null, data.ativo ? 1 : 0, now()],
    )
    return (await fornecedoresRepo.find(id))!
  },
  async update(id: string, data: Partial<Omit<Fornecedor, 'id' | 'criado_em' | 'precos'>>): Promise<void> {
    await query(
      'UPDATE res_fornecedores SET nome=?, cnpj=?, contato=?, endereco=?, estado=? WHERE id=?',
      [data.nome, data.cnpj ?? null, data.contato ?? null, data.endereco ?? null, data.estado ?? null, id],
    )
  },
  async toggleAtivo(id: string): Promise<void> {
    await query('UPDATE res_fornecedores SET ativo = IF(ativo=1,0,1) WHERE id=?', [id])
  },
  async delete(id: string): Promise<void> {
    await query('DELETE FROM res_fornecedores WHERE id=?', [id])
  },
  async setPrecos(fornecedorId: string, precos: Array<{ tipo_id: string; descricao?: string; valor: number }>): Promise<void> {
    await query<ResultSetHeader>('DELETE FROM res_fornecedor_precos WHERE fornecedor_id=?', [fornecedorId])
    if (precos.length === 0) return
    // Monta um único INSERT com N linhas de valores
    const placeholders = precos.map(() => '(?,?,?,?,?)').join(', ')
    const flat: unknown[] = []
    for (const p of precos) {
      flat.push(uid(), fornecedorId, p.tipo_id, p.descricao ?? null, p.valor)
    }
    await query<ResultSetHeader>(
      `INSERT INTO res_fornecedor_precos (id, fornecedor_id, tipo_id, descricao, valor) VALUES ${placeholders}`,
      flat,
    )
  },
}

// ── Saldos (entradas) ─────────────────────────────────────────────────────────

const saldosRepo = {
  async list(obraId?: string): Promise<ResSaldo[]> {
    let sql = `SELECT s.*, o.nome AS obra_nome, t.nome AS tipo_nome
               FROM res_saldos s
               INNER JOIN obras o ON o.id = s.obra_id
               INNER JOIN res_tipos t ON t.id = s.tipo_id
               WHERE 1=1`
    const params: unknown[] = []
    if (obraId) { sql += ' AND s.obra_id = ?'; params.push(obraId) }
    sql += ' ORDER BY s.data DESC, s.criado_em DESC'
    const rows = await query<RowDataPacket[]>(sql, params)
    return rows.map(mapSaldo)
  },
  async insert(data: Omit<ResSaldo, 'id' | 'criado_em' | 'obra_nome' | 'tipo_nome'>): Promise<ResSaldo> {
    const id = uid()
    await query(
      'INSERT INTO res_saldos (id, obra_id, tipo_id, quantidade, unidade_medida, documento_url, data, criado_em) VALUES (?,?,?,?,?,?,?,?)',
      [id, data.obra_id, data.tipo_id, data.quantidade, data.unidade_medida, data.documento_url ?? null, data.data, now()],
    )
    return (await saldosRepo.list(data.obra_id)).find(s => s.id === id)!
  },
  async delete(id: string): Promise<void> {
    await query('DELETE FROM res_saldos WHERE id=?', [id])
  },
  async saldosPorObra(): Promise<SaldoObra[]> {
    const rows = await query<RowDataPacket[]>(`
      SELECT
        s.obra_id,
        o.nome AS obra_nome,
        s.tipo_id,
        t.nome AS tipo_nome,
        s.unidade_medida,
        COALESCE(SUM(s.quantidade), 0) AS total_entrada,
        COALESCE((
          SELECT SUM(r.quantidade)
          FROM res_retiradas r
          WHERE r.obra_id = s.obra_id AND r.tipo_id = s.tipo_id
        ), 0) AS total_retirada
      FROM res_saldos s
      INNER JOIN obras o ON o.id = s.obra_id
      INNER JOIN res_tipos t ON t.id = s.tipo_id
      GROUP BY s.obra_id, o.nome, s.tipo_id, t.nome, s.unidade_medida
      ORDER BY o.nome ASC, t.nome ASC
    `)
    return rows.map(r => ({
      obra_id:        r.obra_id,
      obra_nome:      r.obra_nome,
      tipo_id:        r.tipo_id,
      tipo_nome:      r.tipo_nome,
      unidade_medida: r.unidade_medida,
      total_entrada:  toNum(r.total_entrada),
      total_retirada: toNum(r.total_retirada),
      saldo:          toNum(r.total_entrada) - toNum(r.total_retirada),
    }))
  },
}

// ── Retiradas ─────────────────────────────────────────────────────────────────

const retiradasRepo = {
  async list(obraId?: string): Promise<ResRetirada[]> {
    let sql = `SELECT r.*, o.nome AS obra_nome, t.nome AS tipo_nome, f.nome AS fornecedor_nome
               FROM res_retiradas r
               INNER JOIN obras o ON o.id = r.obra_id
               INNER JOIN res_tipos t ON t.id = r.tipo_id
               INNER JOIN res_fornecedores f ON f.id = r.fornecedor_id
               WHERE 1=1`
    const params: unknown[] = []
    if (obraId) { sql += ' AND r.obra_id = ?'; params.push(obraId) }
    sql += ' ORDER BY r.data DESC, r.criado_em DESC'
    const rows = await query<RowDataPacket[]>(sql, params)
    return rows.map(mapRetirada)
  },
  async insert(data: Omit<ResRetirada, 'id' | 'criado_em' | 'obra_nome' | 'tipo_nome' | 'fornecedor_nome'>): Promise<ResRetirada> {
    const id = uid()
    await query(
      `INSERT INTO res_retiradas
         (id, obra_id, tipo_id, fornecedor_id, quantidade, unidade_medida,
          descricao_preco, valor_unitario, valor_total, foto_url, observacoes, data, criado_em)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, data.obra_id, data.tipo_id, data.fornecedor_id,
        data.quantidade, data.unidade_medida ?? null,
        data.descricao_preco ?? null, data.valor_unitario ?? null,
        data.valor_total ?? null, data.foto_url ?? null,
        data.observacoes ?? null, data.data, now(),
      ],
    )
    return (await retiradasRepo.list(data.obra_id)).find(r => r.id === id)!
  },
  async delete(id: string): Promise<void> {
    await query('DELETE FROM res_retiradas WHERE id=?', [id])
  },
  async totalValor(): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(valor_total), 0) AS total FROM res_retiradas',
    )
    return toNum(rows[0]?.total)
  },
}

// ── Solicitações ──────────────────────────────────────────────────────────────

const solicitacoesRepo = {
  async list(obraId?: string): Promise<ResSolicitacao[]> {
    let sql = `SELECT s.*, o.nome AS obra_nome, t.nome AS tipo_nome
               FROM res_solicitacoes s
               INNER JOIN obras o ON o.id = s.obra_id
               INNER JOIN res_tipos t ON t.id = s.tipo_id
               WHERE 1=1`
    const params: unknown[] = []
    if (obraId) { sql += ' AND s.obra_id = ?'; params.push(obraId) }
    sql += ' ORDER BY s.data_prevista ASC, s.criado_em DESC'
    const rows = await query<RowDataPacket[]>(sql, params)
    return rows.map(mapSolicitacao)
  },
  async insert(data: Omit<ResSolicitacao, 'id' | 'criado_em' | 'obra_nome' | 'tipo_nome' | 'data_finalizacao'>): Promise<ResSolicitacao> {
    const id = uid()
    await query(
      `INSERT INTO res_solicitacoes
         (id, obra_id, tipo_id, quantidade, unidade_medida,
          descricao_preco, valor_unitario, data_prevista, data_solicitacao, observacoes, status, criado_em)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, data.obra_id, data.tipo_id, data.quantidade,
        data.unidade_medida ?? null, data.descricao_preco ?? null,
        data.valor_unitario ?? null, data.data_prevista,
        data.data_solicitacao ?? null, data.observacoes ?? null,
        data.status, now(),
      ],
    )
    return (await solicitacoesRepo.list(data.obra_id)).find(s => s.id === id)!
  },
  async updateStatus(id: string, status: ResSolicitacao['status']): Promise<void> {
    if (status === 'CONCLUIDA') {
      await query(
        'UPDATE res_solicitacoes SET status=?, data_finalizacao=? WHERE id=?',
        [status, now(), id],
      )
    } else {
      await query('UPDATE res_solicitacoes SET status=? WHERE id=?', [status, id])
    }
  },
  async delete(id: string): Promise<void> {
    await query('DELETE FROM res_solicitacoes WHERE id=?', [id])
  },
  async countPendentes(): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM res_solicitacoes WHERE status='PENDENTE'",
    )
    return toNum(rows[0]?.c)
  },
}

// ── Alertas ───────────────────────────────────────────────────────────────────

const alertasRepo = {
  async list(): Promise<ResAlerta[]> {
    const rows = await query<RowDataPacket[]>(`
      SELECT a.*, o.nome AS obra_nome, t.nome AS tipo_nome,
        (
          COALESCE((SELECT SUM(s.quantidade) FROM res_saldos s    WHERE s.obra_id=a.obra_id AND s.tipo_id=a.tipo_id), 0)
          - COALESCE((SELECT SUM(r.quantidade) FROM res_retiradas r WHERE r.obra_id=a.obra_id AND r.tipo_id=a.tipo_id), 0)
        ) AS saldo_atual
      FROM res_alertas a
      INNER JOIN obras o ON o.id = a.obra_id
      INNER JOIN res_tipos t ON t.id = a.tipo_id
      ORDER BY a.ativo DESC, o.nome ASC, t.nome ASC
    `)
    return rows.map(mapAlerta)
  },
  async upsert(obraId: string, tipoId: string, minimo: number, emails?: string): Promise<void> {
    await query(`
      INSERT INTO res_alertas (id, obra_id, tipo_id, minimo, emails, ativo, criado_em)
      VALUES (?,?,?,?,?,1,?)
      ON DUPLICATE KEY UPDATE minimo=VALUES(minimo), emails=VALUES(emails), ativo=1
    `, [uid(), obraId, tipoId, minimo, emails ?? null, now()])
  },
  async toggleAtivo(id: string): Promise<void> {
    await query('UPDATE res_alertas SET ativo=IF(ativo=1,0,1) WHERE id=?', [id])
  },
  async delete(id: string): Promise<void> {
    await query('DELETE FROM res_alertas WHERE id=?', [id])
  },
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export async function dispatchResiduos(resource: string, action: string, args: unknown[]): Promise<unknown> {
  switch (resource) {
    case 'tipos':
      if (action === 'list')   return tiposRepo.list()
      if (action === 'find')   return tiposRepo.find(args[0] as string)
      if (action === 'create') return tiposRepo.create(args[0] as Parameters<typeof tiposRepo.create>[0])
      if (action === 'update') return tiposRepo.update(args[0] as string, args[1] as Parameters<typeof tiposRepo.update>[1])
      if (action === 'delete') return tiposRepo.delete(args[0] as string)
      break
    case 'fornecedores':
      if (action === 'list')       return fornecedoresRepo.list()
      if (action === 'find')       return fornecedoresRepo.find(args[0] as string)
      if (action === 'create')     return fornecedoresRepo.create(args[0] as Parameters<typeof fornecedoresRepo.create>[0])
      if (action === 'update')     return fornecedoresRepo.update(args[0] as string, args[1] as Parameters<typeof fornecedoresRepo.update>[1])
      if (action === 'toggleAtivo') return fornecedoresRepo.toggleAtivo(args[0] as string)
      if (action === 'delete')     return fornecedoresRepo.delete(args[0] as string)
      if (action === 'setPrecos')  return fornecedoresRepo.setPrecos(args[0] as string, args[1] as Parameters<typeof fornecedoresRepo.setPrecos>[1])
      break
    case 'saldos':
      if (action === 'list')          return saldosRepo.list(args[0] as string | undefined)
      if (action === 'insert')        return saldosRepo.insert(args[0] as Parameters<typeof saldosRepo.insert>[0])
      if (action === 'delete')        return saldosRepo.delete(args[0] as string)
      if (action === 'saldosPorObra') return saldosRepo.saldosPorObra()
      break
    case 'retiradas':
      if (action === 'list')       return retiradasRepo.list(args[0] as string | undefined)
      if (action === 'insert')     return retiradasRepo.insert(args[0] as Parameters<typeof retiradasRepo.insert>[0])
      if (action === 'delete')     return retiradasRepo.delete(args[0] as string)
      if (action === 'totalValor') return retiradasRepo.totalValor()
      break
    case 'solicitacoes':
      if (action === 'list')           return solicitacoesRepo.list(args[0] as string | undefined)
      if (action === 'insert')         return solicitacoesRepo.insert(args[0] as Parameters<typeof solicitacoesRepo.insert>[0])
      if (action === 'updateStatus')   return solicitacoesRepo.updateStatus(args[0] as string, args[1] as ResSolicitacao['status'])
      if (action === 'delete')         return solicitacoesRepo.delete(args[0] as string)
      if (action === 'countPendentes') return solicitacoesRepo.countPendentes()
      break
    case 'alertas':
      if (action === 'list')       return alertasRepo.list()
      if (action === 'upsert')     return alertasRepo.upsert(args[0] as string, args[1] as string, args[2] as number, args[3] as string | undefined)
      if (action === 'toggleAtivo') return alertasRepo.toggleAtivo(args[0] as string)
      if (action === 'delete')     return alertasRepo.delete(args[0] as string)
      break
    default:
      throw new Error(`Recurso desconhecido: ${resource}`)
  }
  throw new Error(`Ação desconhecida: ${resource}.${action}`)
}
