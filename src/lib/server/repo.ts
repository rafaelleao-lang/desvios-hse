import 'server-only'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { query } from '@/lib/mysql'
import type {
  Obra, TST, Encarregado, Coordenador, Desvio, StatusDesvio, Tratativa, IndicadorSemanal,
  Inspecao, InspecaoEvidencia, FotoDesvio,
} from '@/types'

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

// ── Mappers (row do MySQL → tipo da aplicação) ─────────────────────────────────
function mapObra(r: RowDataPacket): Obra {
  return {
    id: r.id,
    nome: r.nome,
    codigo: r.codigo,
    empresa: r.empresa ?? undefined,
    cidade: r.cidade ?? undefined,
    estado: r.estado ?? undefined,
    responsavel: r.responsavel ?? undefined,
    ativa: toBool(r.ativa),
    criado_em: r.criado_em,
  }
}

function mapTST(r: RowDataPacket): TST {
  return {
    id: r.id,
    obra_id: r.obra_id,
    nome: r.nome,
    crea: r.crea ?? undefined,
    telefone: r.telefone ?? undefined,
    ativo: toBool(r.ativo),
    criado_em: r.criado_em,
  }
}

function mapEncarregado(r: RowDataPacket): Encarregado {
  return {
    id: r.id,
    obra_id: r.obra_id,
    nome: r.nome,
    setor: r.setor ?? undefined,
    telefone: r.telefone ?? undefined,
    ativo: toBool(r.ativo),
    criado_em: r.criado_em,
  }
}

function mapCoordenador(r: RowDataPacket): Coordenador {
  return {
    id: r.id,
    obra_id: r.obra_id,
    nome: r.nome,
    email: r.email ?? '',
    telefone: r.telefone ?? undefined,
    ativo: toBool(r.ativo),
    criado_em: r.criado_em,
  }
}

function mapIndicador(r: RowDataPacket): IndicadorSemanal {
  const n = (v: unknown): number => Number(v ?? 0)
  return {
    id: r.id,
    obra_id: r.obra_id,
    semana: n(r.semana),
    ano: n(r.ano),
    efetivo: n(r.efetivo),
    ausentes: n(r.ausentes),
    hht_trabalhada: n(r.hht_trabalhada),
    apr_realizadas: n(r.apr_realizadas),
    pt_realizadas: n(r.pt_realizadas),
    desvios_ocorridos: n(r.desvios_ocorridos),
    desvios_solucionados: n(r.desvios_solucionados),
    alojamentos_conformes: n(r.alojamentos_conformes),
    alojamentos_nao_conformes: n(r.alojamentos_nao_conformes),
    alojamentos_totais: n(r.alojamentos_totais),
    hht_semanal: n(r.hht_semanal),
    pessoas_treinadas: n(r.pessoas_treinadas),
    dds: n(r.dds),
    acidentes: n(r.acidentes),
    acidente_sem_afastamento: n(r.acidente_sem_afastamento),
    primeiros_socorros: n(r.primeiros_socorros),
    quase_acidentes: n(r.quase_acidentes),
    danos_materiais: n(r.danos_materiais),
    campanhas: n(r.campanhas),
    inspecoes_semanais: n(r.inspecoes_semanais),
    observacoes: r.observacoes ?? undefined,
    criado_em: r.criado_em,
    atualizado_em: r.atualizado_em,
  }
}

function mapDesvio(r: RowDataPacket): Desvio {
  return {
    id: r.id,
    numero: r.numero,
    obra_id: r.obra_id,
    obra_nome: r.obra_nome ?? undefined,
    categoria: r.categoria,
    categoria_outro: r.categoria_outro ?? undefined,
    setor: r.setor ?? undefined,
    local_exato: r.local_exato,
    gravidade: r.gravidade,
    status: r.status,
    descricao: r.descricao,
    aberto_por: r.aberto_por,
    colaborador_nome: r.colaborador_nome ?? undefined,
    encarregado_id: r.encarregado_id,
    encarregado_nome: r.encarregado_nome ?? undefined,
    tst_id: r.tst_id ?? undefined,
    tst_nome: r.tst_nome ?? undefined,
    coordenador_id: r.coordenador_id ?? undefined,
    coordenador_nome: r.coordenador_nome ?? undefined,
    data_ocorrencia: r.data_ocorrencia,
    hora_ocorrencia: r.hora_ocorrencia ?? undefined,
    prazo_correcao: r.prazo_correcao ?? undefined,
    acao_corretiva: r.acao_corretiva ?? undefined,
    acao_preventiva: r.acao_preventiva ?? undefined,
    reincidente: toBool(r.reincidente),
    fotos: parseJSON(r.fotos, []),
    tratativas: parseJSON(r.tratativas, []),
    historico_status: parseJSON(r.historico_status, []),
    criado_em: r.criado_em,
    atualizado_em: r.atualizado_em,
  }
}

// ── Obras ─────────────────────────────────────────────────────────────────────
export const obrasRepo = {
  async list(): Promise<Obra[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM obras ORDER BY criado_em ASC')
    return rows.map(mapObra)
  },

  async find(id: string): Promise<Obra | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM obras WHERE id = ? LIMIT 1', [id])
    return rows[0] ? mapObra(rows[0]) : undefined
  },

  async create(data: Omit<Obra, 'id' | 'criado_em'>): Promise<Obra> {
    const obra: Obra = { ...data, id: uid(), criado_em: now() }
    await query(
      `INSERT INTO obras (id, nome, codigo, empresa, cidade, estado, responsavel, ativa, criado_em, destinatarios)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        obra.id, obra.nome, obra.codigo,
        obra.empresa ?? null, obra.cidade ?? null, obra.estado ?? null, obra.responsavel ?? null,
        obra.ativa ? 1 : 0, obra.criado_em, '[]',
      ],
    )
    return obra
  },

  async update(id: string, data: Partial<Obra>): Promise<Obra | undefined> {
    const cols: string[] = []
    const vals: unknown[] = []
    const allow: (keyof Obra)[] = ['nome', 'codigo', 'empresa', 'cidade', 'estado', 'responsavel', 'ativa']
    for (const key of allow) {
      if (key in data) {
        cols.push(`${key} = ?`)
        vals.push(key === 'ativa' ? (data[key] ? 1 : 0) : (data[key] ?? null))
      }
    }
    if (cols.length) {
      vals.push(id)
      await query(`UPDATE obras SET ${cols.join(', ')} WHERE id = ?`, vals)
    }
    return obrasRepo.find(id)
  },

  async delete(id: string): Promise<void> {
    // tsts e encarregados saem por ON DELETE CASCADE
    await query('DELETE FROM obras WHERE id = ?', [id])
  },
}

// ── TSTs ──────────────────────────────────────────────────────────────────────
export const tstsRepo = {
  async list(): Promise<TST[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM tsts ORDER BY criado_em ASC')
    return rows.map(mapTST)
  },

  async byObra(obraId: string): Promise<TST[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM tsts WHERE obra_id = ?', [obraId])
    return rows.map(mapTST)
  },

  async activeByObra(obraId: string): Promise<TST[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM tsts WHERE obra_id = ? AND ativo = 1', [obraId])
    return rows.map(mapTST)
  },

  async find(id: string): Promise<TST | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM tsts WHERE id = ? LIMIT 1', [id])
    return rows[0] ? mapTST(rows[0]) : undefined
  },

  async create(data: Omit<TST, 'id' | 'criado_em'>): Promise<TST> {
    const tst: TST = { ...data, id: uid(), criado_em: now() }
    await query(
      `INSERT INTO tsts (id, obra_id, nome, crea, telefone, ativo, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tst.id, tst.obra_id, tst.nome, tst.crea ?? null, tst.telefone ?? null, tst.ativo ? 1 : 0, tst.criado_em],
    )
    return tst
  },

  async update(id: string, data: Partial<Pick<TST, 'nome' | 'crea' | 'telefone'>>): Promise<void> {
    const cols: string[] = []
    const vals: unknown[] = []
    for (const key of ['nome', 'crea', 'telefone'] as const) {
      if (key in data) { cols.push(`${key} = ?`); vals.push(data[key] ?? null) }
    }
    if (!cols.length) return
    vals.push(id)
    await query(`UPDATE tsts SET ${cols.join(', ')} WHERE id = ?`, vals)
  },

  async toggleAtivo(id: string): Promise<void> {
    await query('UPDATE tsts SET ativo = 1 - ativo WHERE id = ?', [id])
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM tsts WHERE id = ?', [id])
  },
}

// ── Encarregados ────────────────────────────────────────────────────────────────
export const encarregadosRepo = {
  async list(): Promise<Encarregado[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM encarregados ORDER BY criado_em ASC')
    return rows.map(mapEncarregado)
  },

  async byObra(obraId: string): Promise<Encarregado[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM encarregados WHERE obra_id = ?', [obraId])
    return rows.map(mapEncarregado)
  },

  async activeByObra(obraId: string): Promise<Encarregado[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM encarregados WHERE obra_id = ? AND ativo = 1', [obraId])
    return rows.map(mapEncarregado)
  },

  async find(id: string): Promise<Encarregado | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM encarregados WHERE id = ? LIMIT 1', [id])
    return rows[0] ? mapEncarregado(rows[0]) : undefined
  },

  async create(data: Omit<Encarregado, 'id' | 'criado_em'>): Promise<Encarregado> {
    const enc: Encarregado = { ...data, id: uid(), criado_em: now() }
    await query(
      `INSERT INTO encarregados (id, obra_id, nome, setor, telefone, ativo, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [enc.id, enc.obra_id, enc.nome, enc.setor ?? null, enc.telefone ?? null, enc.ativo ? 1 : 0, enc.criado_em],
    )
    return enc
  },

  async update(id: string, data: Partial<Pick<Encarregado, 'nome' | 'setor' | 'telefone'>>): Promise<void> {
    const cols: string[] = []
    const vals: unknown[] = []
    for (const key of ['nome', 'setor', 'telefone'] as const) {
      if (key in data) { cols.push(`${key} = ?`); vals.push(data[key] ?? null) }
    }
    if (!cols.length) return
    vals.push(id)
    await query(`UPDATE encarregados SET ${cols.join(', ')} WHERE id = ?`, vals)
  },

  async toggleAtivo(id: string): Promise<void> {
    await query('UPDATE encarregados SET ativo = 1 - ativo WHERE id = ?', [id])
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM encarregados WHERE id = ?', [id])
  },
}

// ── Coordenadores ───────────────────────────────────────────────────────────────
export const coordenadoresRepo = {
  async list(): Promise<Coordenador[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM coordenadores ORDER BY criado_em ASC')
    return rows.map(mapCoordenador)
  },

  async byObra(obraId: string): Promise<Coordenador[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM coordenadores WHERE obra_id = ?', [obraId])
    return rows.map(mapCoordenador)
  },

  async activeByObra(obraId: string): Promise<Coordenador[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM coordenadores WHERE obra_id = ? AND ativo = 1', [obraId])
    return rows.map(mapCoordenador)
  },

  async find(id: string): Promise<Coordenador | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM coordenadores WHERE id = ? LIMIT 1', [id])
    return rows[0] ? mapCoordenador(rows[0]) : undefined
  },

  async create(data: Omit<Coordenador, 'id' | 'criado_em'>): Promise<Coordenador> {
    const coord: Coordenador = { ...data, id: uid(), criado_em: now() }
    await query(
      `INSERT INTO coordenadores (id, obra_id, nome, email, telefone, ativo, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [coord.id, coord.obra_id, coord.nome, coord.email ?? '', coord.telefone ?? null, coord.ativo ? 1 : 0, coord.criado_em],
    )
    return coord
  },

  async update(id: string, data: Partial<Pick<Coordenador, 'nome' | 'email' | 'telefone'>>): Promise<void> {
    const cols: string[] = []
    const vals: unknown[] = []
    for (const key of ['nome', 'email', 'telefone'] as const) {
      if (key in data) { cols.push(`${key} = ?`); vals.push(data[key] ?? null) }
    }
    if (!cols.length) return
    vals.push(id)
    await query(`UPDATE coordenadores SET ${cols.join(', ')} WHERE id = ?`, vals)
  },

  async toggleAtivo(id: string): Promise<void> {
    await query('UPDATE coordenadores SET ativo = 1 - ativo WHERE id = ?', [id])
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM coordenadores WHERE id = ?', [id])
  },
}

// ── Desvios ─────────────────────────────────────────────────────────────────────
async function nextNum(): Promise<number> {
  const rows = await query<RowDataPacket[]>('SELECT MAX(numero) AS max FROM desvios')
  return ((rows[0]?.max as number) ?? 0) + 1
}

const DESVIO_JSON_FIELDS = new Set(['fotos', 'tratativas', 'historico_status'])
const DESVIO_BOOL_FIELDS = new Set(['reincidente'])
const DESVIO_UPDATABLE: (keyof Desvio)[] = [
  'obra_id', 'obra_nome', 'categoria', 'categoria_outro', 'setor', 'local_exato',
  'gravidade', 'status', 'descricao', 'aberto_por', 'colaborador_nome',
  'encarregado_id', 'encarregado_nome', 'tst_id', 'tst_nome',
  'coordenador_id', 'coordenador_nome', 'data_ocorrencia',
  'hora_ocorrencia', 'prazo_correcao', 'acao_corretiva', 'acao_preventiva',
  'reincidente', 'fotos', 'tratativas', 'historico_status', 'atualizado_em',
]

function bindDesvioValue(key: string, value: unknown): unknown {
  if (value === undefined) return null
  if (DESVIO_JSON_FIELDS.has(key)) return JSON.stringify(value ?? [])
  if (DESVIO_BOOL_FIELDS.has(key)) return value ? 1 : 0
  return value ?? null
}

export const desviosRepo = {
  async list(): Promise<Desvio[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM desvios ORDER BY numero DESC')
    return rows.map(mapDesvio)
  },

  async find(id: string): Promise<Desvio | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM desvios WHERE id = ? LIMIT 1', [id])
    return rows[0] ? mapDesvio(rows[0]) : undefined
  },

  async create(
    data: Omit<Desvio, 'id' | 'numero' | 'criado_em' | 'atualizado_em' | 'historico_status'>,
  ): Promise<Desvio> {
    const num = await nextNum()
    const d: Desvio = {
      ...data,
      id: uid(),
      numero: num,
      historico_status: [{ id: uid(), status_novo: 'aberto', por: data.aberto_por, criado_em: now() }],
      criado_em: now(),
      atualizado_em: now(),
    }
    await query(
      `INSERT INTO desvios (
        id, numero, obra_id, obra_nome, categoria, categoria_outro, setor, local_exato,
        gravidade, status, descricao, aberto_por, colaborador_nome, encarregado_id, encarregado_nome,
        tst_id, tst_nome, coordenador_id, coordenador_nome, data_ocorrencia, hora_ocorrencia, prazo_correcao,
        acao_corretiva, acao_preventiva, reincidente, fotos, tratativas, historico_status, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.id, d.numero, d.obra_id, d.obra_nome ?? null, d.categoria, d.categoria_outro ?? null,
        d.setor ?? null, d.local_exato, d.gravidade, d.status, d.descricao, d.aberto_por,
        d.colaborador_nome ?? null, d.encarregado_id, d.encarregado_nome ?? null,
        d.tst_id ?? null, d.tst_nome ?? null, d.coordenador_id ?? null, d.coordenador_nome ?? null,
        d.data_ocorrencia, d.hora_ocorrencia ?? null,
        d.prazo_correcao ?? null, d.acao_corretiva ?? null, d.acao_preventiva ?? null,
        d.reincidente ? 1 : 0, JSON.stringify(d.fotos ?? []),
        JSON.stringify(d.tratativas ?? []), JSON.stringify(d.historico_status ?? []),
        d.criado_em, d.atualizado_em,
      ],
    )
    return d
  },

  async update(id: string, data: Partial<Desvio>): Promise<Desvio | undefined> {
    const payload = { ...data, atualizado_em: now() }
    const cols: string[] = []
    const vals: unknown[] = []
    for (const key of DESVIO_UPDATABLE) {
      if (key in payload) {
        cols.push(`${key} = ?`)
        vals.push(bindDesvioValue(key, (payload as Record<string, unknown>)[key]))
      }
    }
    if (cols.length) {
      vals.push(id)
      await query(`UPDATE desvios SET ${cols.join(', ')} WHERE id = ?`, vals)
    }
    return desviosRepo.find(id)
  },

  async updateStatus(
    id: string, status: StatusDesvio, por: string, observacao?: string,
  ): Promise<Desvio | undefined> {
    const current = await desviosRepo.find(id)
    if (!current) return undefined
    const hist = {
      id: uid(),
      status_anterior: current.status,
      status_novo: status,
      por,
      observacao,
      criado_em: now(),
    }
    await query(
      'UPDATE desvios SET status = ?, atualizado_em = ?, historico_status = ? WHERE id = ?',
      [status, now(), JSON.stringify([...(current.historico_status ?? []), hist]), id],
    )
    // Sync inspection when desvio is closed
    const CLOSED = ['fechado', 'concluido', 'reincidente']
    if (CLOSED.includes(status)) {
      const tratativas = current.tratativas ?? []
      const last = tratativas.length > 0 ? tratativas[tratativas.length - 1] : null
      await inspecoesRepo.syncDesvioFechado(id, {
        data_fechamento: now(),
        tratativa_texto: last?.acao_realizada || last?.comentario || observacao || '',
        quem_fechou: por,
        fotos_fechamento: (last?.fotos ?? []) as FotoDesvio[],
        prazo_correcao: current.prazo_correcao,
      })
    }
    return desviosRepo.find(id)
  },

  async addTratativa(
    id: string, tratativa: Omit<Tratativa, 'id' | 'criado_em'>,
  ): Promise<Desvio | undefined> {
    const current = await desviosRepo.find(id)
    if (!current) return undefined
    const t: Tratativa = { ...tratativa, id: uid(), criado_em: now() }
    await query(
      'UPDATE desvios SET tratativas = ?, atualizado_em = ? WHERE id = ?',
      [JSON.stringify([...(current.tratativas ?? []), t]), now(), id],
    )
    return desviosRepo.find(id)
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM desvios WHERE id = ?', [id])
  },
}

// ── Indicadores Semanais ──────────────────────────────────────────────────────
const INDICADOR_NUM_FIELDS: (keyof IndicadorSemanal)[] = [
  'semana', 'ano', 'efetivo', 'ausentes', 'hht_trabalhada', 'apr_realizadas', 'pt_realizadas',
  'desvios_ocorridos', 'desvios_solucionados', 'alojamentos_conformes', 'alojamentos_nao_conformes',
  'alojamentos_totais', 'hht_semanal', 'pessoas_treinadas', 'dds', 'acidentes',
  'acidente_sem_afastamento', 'primeiros_socorros', 'quase_acidentes', 'danos_materiais',
  'campanhas', 'inspecoes_semanais',
]
const INDICADOR_UPDATABLE: (keyof IndicadorSemanal)[] = [
  'obra_id', ...INDICADOR_NUM_FIELDS, 'observacoes',
]

export const indicadoresRepo = {
  async list(filters?: {
    obra_id?: string
    ano?: number
    semana_ini?: number
    semana_fim?: number
  }): Promise<IndicadorSemanal[]> {
    const where: string[] = []
    const vals: unknown[] = []
    if (filters?.obra_id) { where.push('obra_id = ?'); vals.push(filters.obra_id) }
    if (filters?.ano) { where.push('ano = ?'); vals.push(filters.ano) }
    if (filters?.semana_ini) { where.push('semana >= ?'); vals.push(filters.semana_ini) }
    if (filters?.semana_fim) { where.push('semana <= ?'); vals.push(filters.semana_fim) }
    const sql = `SELECT * FROM indicadores_semanais${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY ano ASC, semana ASC`
    const rows = await query<RowDataPacket[]>(sql, vals)
    return rows.map(mapIndicador)
  },

  async find(id: string): Promise<IndicadorSemanal | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM indicadores_semanais WHERE id = ? LIMIT 1', [id])
    return rows[0] ? mapIndicador(rows[0]) : undefined
  },

  async create(data: Omit<IndicadorSemanal, 'id' | 'criado_em' | 'atualizado_em'>): Promise<IndicadorSemanal> {
    const row: IndicadorSemanal = { ...data, id: uid(), criado_em: now(), atualizado_em: now() }
    await query(
      `INSERT INTO indicadores_semanais (
        id, obra_id, semana, ano, efetivo, ausentes, hht_trabalhada, apr_realizadas, pt_realizadas,
        desvios_ocorridos, desvios_solucionados, alojamentos_conformes, alojamentos_nao_conformes,
        alojamentos_totais, hht_semanal, pessoas_treinadas, dds, acidentes, acidente_sem_afastamento,
        primeiros_socorros, quase_acidentes, danos_materiais, campanhas, inspecoes_semanais,
        observacoes, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id, row.obra_id, row.semana, row.ano, row.efetivo, row.ausentes, row.hht_trabalhada,
        row.apr_realizadas, row.pt_realizadas, row.desvios_ocorridos, row.desvios_solucionados,
        row.alojamentos_conformes, row.alojamentos_nao_conformes, row.alojamentos_totais,
        row.hht_semanal, row.pessoas_treinadas, row.dds, row.acidentes, row.acidente_sem_afastamento,
        row.primeiros_socorros, row.quase_acidentes, row.danos_materiais, row.campanhas,
        row.inspecoes_semanais, row.observacoes ?? null, row.criado_em, row.atualizado_em,
      ],
    )
    return row
  },

  async update(
    id: string,
    data: Partial<Omit<IndicadorSemanal, 'id' | 'criado_em'>>,
  ): Promise<IndicadorSemanal | undefined> {
    const cols: string[] = []
    const vals: unknown[] = []
    for (const key of INDICADOR_UPDATABLE) {
      if (key in data) {
        cols.push(`${key} = ?`)
        const v = (data as Record<string, unknown>)[key]
        vals.push(v ?? (key === 'observacoes' ? null : 0))
      }
    }
    cols.push('atualizado_em = ?')
    vals.push(now())
    vals.push(id)
    await query(`UPDATE indicadores_semanais SET ${cols.join(', ')} WHERE id = ?`, vals)
    return indicadoresRepo.find(id)
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM indicadores_semanais WHERE id = ?', [id])
  },
}

// ── Inspeções HSE ──────────────────────────────────────────────────────────────

function mapInspecao(r: RowDataPacket): Inspecao {
  return {
    id: r.id,
    numero: Number(r.numero),
    obra_id: r.obra_id,
    obra_nome: r.obra_nome ?? undefined,
    encarregado_id: r.encarregado_id ?? undefined,
    encarregado_nome: r.encarregado_nome ?? undefined,
    tst_id: r.tst_id ?? undefined,
    tst_nome: r.tst_nome ?? undefined,
    coordenador_id: r.coordenador_id ?? undefined,
    coordenador_nome: r.coordenador_nome ?? undefined,
    status: r.status,
    data_inspecao: r.data_inspecao,
    hora_inspecao: r.hora_inspecao ?? undefined,
    total_desvios: Number(r.total_desvios ?? 0),
    total_reconhecimentos: Number(r.total_reconhecimentos ?? 0),
    desvios_fechados: Number(r.desvios_fechados ?? 0),
    criado_em: r.criado_em,
    atualizado_em: r.atualizado_em,
    fechado_em: r.fechado_em ?? undefined,
  }
}

function mapEvidencia(r: RowDataPacket): InspecaoEvidencia {
  return {
    id: r.id,
    inspecao_id: r.inspecao_id,
    tipo: r.tipo,
    local: r.local,
    descricao: r.descricao ?? undefined,
    fotos_abertura: parseJSON(r.fotos_abertura, []),
    fotos_fechamento: parseJSON(r.fotos_fechamento, []),
    desvio_id: r.desvio_id ?? undefined,
    prazo_correcao: r.prazo_correcao ?? undefined,
    data_fechamento: r.data_fechamento ?? undefined,
    tratativa_texto: r.tratativa_texto ?? undefined,
    quem_fechou: r.quem_fechou ?? undefined,
    ordem: Number(r.ordem ?? 0),
    criado_em: r.criado_em,
  }
}

async function nextInspecaoNum(): Promise<number> {
  const rows = await query<RowDataPacket[]>('SELECT MAX(numero) AS max FROM inspecoes')
  return ((rows[0]?.max as number) ?? 0) + 1
}

export const inspecoesRepo = {
  async list(): Promise<Inspecao[]> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM inspecoes ORDER BY numero DESC')
    return rows.map(mapInspecao)
  },

  async find(id: string): Promise<(Inspecao & { evidencias: InspecaoEvidencia[] }) | undefined> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM inspecoes WHERE id = ? LIMIT 1', [id])
    if (!rows[0]) return undefined
    const insp = mapInspecao(rows[0])
    const evRows = await query<RowDataPacket[]>(
      'SELECT * FROM inspecao_evidencias WHERE inspecao_id = ? ORDER BY ordem ASC, criado_em ASC',
      [id],
    )
    return { ...insp, evidencias: evRows.map(mapEvidencia) }
  },

  async create(data: {
    obra_id: string; obra_nome?: string
    encarregado_id?: string; encarregado_nome?: string
    tst_id?: string; tst_nome?: string
    coordenador_id?: string; coordenador_nome?: string
    data_inspecao: string; hora_inspecao?: string
  }): Promise<Inspecao> {
    const num = await nextInspecaoNum()
    const insp: Inspecao = {
      ...data, id: uid(), numero: num, status: 'em_aberto',
      total_desvios: 0, total_reconhecimentos: 0, desvios_fechados: 0,
      criado_em: now(), atualizado_em: now(),
    }
    await query(
      `INSERT INTO inspecoes (
        id, numero, obra_id, obra_nome, encarregado_id, encarregado_nome,
        tst_id, tst_nome, coordenador_id, coordenador_nome, status,
        data_inspecao, hora_inspecao, total_desvios, total_reconhecimentos,
        desvios_fechados, criado_em, atualizado_em, fechado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        insp.id, insp.numero, insp.obra_id, insp.obra_nome ?? null,
        insp.encarregado_id ?? null, insp.encarregado_nome ?? null,
        insp.tst_id ?? null, insp.tst_nome ?? null,
        insp.coordenador_id ?? null, insp.coordenador_nome ?? null,
        insp.status, insp.data_inspecao, insp.hora_inspecao ?? null,
        0, 0, 0, insp.criado_em, insp.atualizado_em, null,
      ],
    )
    return insp
  },

  async addEvidencia(
    inspecaoId: string,
    ev: Omit<InspecaoEvidencia, 'id' | 'criado_em' | 'inspecao_id'>,
  ): Promise<InspecaoEvidencia> {
    const evRecord: InspecaoEvidencia = { ...ev, id: uid(), inspecao_id: inspecaoId, criado_em: now() }
    await query(
      `INSERT INTO inspecao_evidencias (
        id, inspecao_id, tipo, local, descricao, fotos_abertura, fotos_fechamento,
        desvio_id, prazo_correcao, data_fechamento, tratativa_texto, quem_fechou, ordem, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        evRecord.id, evRecord.inspecao_id, evRecord.tipo, evRecord.local,
        evRecord.descricao ?? null, JSON.stringify(evRecord.fotos_abertura ?? []),
        JSON.stringify(evRecord.fotos_fechamento ?? []),
        evRecord.desvio_id ?? null, evRecord.prazo_correcao ?? null,
        evRecord.data_fechamento ?? null, evRecord.tratativa_texto ?? null,
        evRecord.quem_fechou ?? null, evRecord.ordem ?? 0, evRecord.criado_em,
      ],
    )
    if (evRecord.tipo === 'desvio') {
      await query('UPDATE inspecoes SET total_desvios = total_desvios + 1, atualizado_em = ? WHERE id = ?', [now(), inspecaoId])
    } else {
      await query('UPDATE inspecoes SET total_reconhecimentos = total_reconhecimentos + 1, atualizado_em = ? WHERE id = ?', [now(), inspecaoId])
    }
    return evRecord
  },

  async syncDesvioFechado(
    desvioId: string,
    dados: { data_fechamento: string; tratativa_texto: string; quem_fechou: string; fotos_fechamento: FotoDesvio[]; prazo_correcao?: string },
  ): Promise<void> {
    const rows = await query<RowDataPacket[]>('SELECT * FROM inspecao_evidencias WHERE desvio_id = ? LIMIT 1', [desvioId])
    if (!rows[0]) return
    const ev = mapEvidencia(rows[0])
    await query(
      `UPDATE inspecao_evidencias SET data_fechamento = ?, tratativa_texto = ?, quem_fechou = ?,
       fotos_fechamento = ?, prazo_correcao = COALESCE(?, prazo_correcao) WHERE id = ?`,
      [dados.data_fechamento, dados.tratativa_texto, dados.quem_fechou,
       JSON.stringify(dados.fotos_fechamento), dados.prazo_correcao ?? null, ev.id],
    )
    await query('UPDATE inspecoes SET desvios_fechados = desvios_fechados + 1, atualizado_em = ? WHERE id = ?', [now(), ev.inspecao_id])
    const inspRows = await query<RowDataPacket[]>('SELECT * FROM inspecoes WHERE id = ? LIMIT 1', [ev.inspecao_id])
    if (!inspRows[0]) return
    const insp = mapInspecao(inspRows[0])
    if (insp.total_desvios > 0 && insp.desvios_fechados >= insp.total_desvios) {
      await query("UPDATE inspecoes SET status = 'concluida', fechado_em = ?, atualizado_em = ? WHERE id = ?", [now(), now(), ev.inspecao_id])
    }
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM inspecoes WHERE id = ?', [id])
  },
}

// ── Dispatcher (usado pela rota /api/db) ────────────────────────────────────────
export const repos = {
  obras: obrasRepo,
  tsts: tstsRepo,
  encarregados: encarregadosRepo,
  coordenadores: coordenadoresRepo,
  desvios: desviosRepo,
  indicadores: indicadoresRepo,
  inspecoes: inspecoesRepo,
} as const

export type ResourceName = keyof typeof repos

export async function dispatch(resource: string, action: string, args: unknown[]): Promise<unknown> {
  const repo = (repos as Record<string, Record<string, unknown>>)[resource]
  if (!repo) throw new Error(`Recurso desconhecido: ${resource}`)
  const fn = repo[action]
  if (typeof fn !== 'function') throw new Error(`Ação desconhecida: ${resource}.${action}`)
  return (fn as (...a: unknown[]) => Promise<unknown>)(...args)
}

// Mantém ResultSetHeader referenciado p/ tipagem futura de mutations.
export type { ResultSetHeader }
