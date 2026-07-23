import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2'
import { query } from '@/lib/mysql'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Endpoint compatível com a API REST do Supabase (PostgREST), porém servido
 * inteiramente a partir do MySQL — o sistema não depende mais do Supabase.
 *
 * Mantém o mesmo formato de URL e de resposta do Supabase, para que qualquer
 * consumidor que usava `…supabase.co/rest/v1/<tabela>` possa simplesmente
 * apontar para `/api/supabase/<tabela>`.
 *
 * Suporta:
 *   ?select=*  ou  ?select=col1,col2
 *   ?<coluna>=eq.valor  (operadores: eq, neq, gt, gte, lt, lte, like, ilike, in)
 *   ?order=coluna.asc | coluna.desc
 *   ?limit=N  &  ?offset=N
 *
 * Exemplos:
 *   GET /api/supabase/obras?select=*
 *   GET /api/supabase/desvios?order=numero.desc&limit=10
 *   GET /api/supabase/tsts?obra_id=eq.mpfyvfx52k41tiki6iq
 */

// Tabelas expostas (mesmos nomes do Supabase).
const TABLES = new Set(['obras', 'tsts', 'encarregados', 'coordenadores', 'desvios', 'indicadores_semanais', 'res_saldos', 'res_retiradas', 'res_tipos'])
// Colunas que precisam de coerção para reproduzir o JSON do Supabase.
const BOOL_COLS: Record<string, Set<string>> = {
  obras: new Set(['ativa']),
  tsts: new Set(['ativo']),
  encarregados: new Set(['ativo']),
  coordenadores: new Set(['ativo']),
  desvios: new Set(['reincidente']),
  indicadores_semanais: new Set(),
}
const JSON_COLS: Record<string, Set<string>> = {
  obras: new Set(['destinatarios']),
  desvios: new Set(['fotos', 'tratativas', 'historico_status']),
  tsts: new Set(), encarregados: new Set(), coordenadores: new Set(),
  indicadores_semanais: new Set(),
}

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const OPERATORS: Record<string, string> = {
  eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'LIKE', ilike: 'LIKE',
}
// Parâmetros reservados (não são filtros de coluna).
const RESERVED = new Set(['select', 'order', 'limit', 'offset'])

function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function coerceRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const bools = BOOL_COLS[table]
  const jsons = JSON_COLS[table]
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (bools?.has(k)) {
      out[k] = v === 1 || v === true || v === '1'
    } else if (jsons?.has(k)) {
      if (v == null) out[k] = []
      else if (typeof v === 'string') { try { out[k] = JSON.parse(v) } catch { out[k] = [] } }
      else out[k] = v
    } else {
      out[k] = v
    }
  }
  return out
}

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const segments = params.path ?? []
  if (segments.length !== 1) {
    return err('Rota inválida. Use /api/supabase/<tabela>.')
  }
  const table = segments[0]
  if (!TABLES.has(table)) {
    return err(`Tabela desconhecida: ${table}`, 404)
  }

  const sp = req.nextUrl.searchParams

  // ── SELECT ──────────────────────────────────────────────────────────────
  let selectClause = '*'
  const select = sp.get('select')
  if (select && select !== '*') {
    const cols = select.split(',').map((c) => c.trim()).filter(Boolean)
    if (!cols.every((c) => IDENT.test(c))) return err('Parâmetro select inválido.')
    selectClause = cols.join(', ')
  }

  // ── WHERE (filtros col=op.valor) ──────────────────────────────────────────
  const where: string[] = []
  const values: unknown[] = []
  for (const [key, raw] of Array.from(sp.entries())) {
    if (RESERVED.has(key)) continue
    if (!IDENT.test(key)) return err(`Coluna de filtro inválida: ${key}`)
    const dot = raw.indexOf('.')
    if (dot === -1) return err(`Filtro inválido para ${key}. Use o formato ${key}=eq.valor.`)
    const op = raw.slice(0, dot)
    const val = raw.slice(dot + 1)
    if (op === 'in') {
      const list = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim()).filter(Boolean)
      if (!list.length) return err(`Filtro in vazio para ${key}.`)
      where.push(`${key} IN (${list.map(() => '?').join(', ')})`)
      values.push(...list)
    } else if (op in OPERATORS) {
      where.push(`${key} ${OPERATORS[op]} ?`)
      values.push(op === 'like' || op === 'ilike' ? val.replace(/\*/g, '%') : val)
    } else {
      return err(`Operador não suportado: ${op}`)
    }
  }

  // ── ORDER ──────────────────────────────────────────────────────────────
  let orderClause = ''
  const order = sp.get('order')
  if (order) {
    const parts: string[] = []
    for (const token of order.split(',')) {
      const [col, dir] = token.trim().split('.')
      if (!IDENT.test(col)) return err(`Coluna de ordenação inválida: ${col}`)
      const direction = dir?.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
      parts.push(`${col} ${direction}`)
    }
    orderClause = ` ORDER BY ${parts.join(', ')}`
  }

  // ── LIMIT / OFFSET ──────────────────────────────────────────────────────
  let limitClause = ''
  const limit = sp.get('limit')
  const offset = sp.get('offset')
  if (limit != null) {
    const n = parseInt(limit, 10)
    if (!Number.isFinite(n) || n < 0) return err('limit inválido.')
    limitClause = ` LIMIT ${n}`
    if (offset != null) {
      const o = parseInt(offset, 10)
      if (!Number.isFinite(o) || o < 0) return err('offset inválido.')
      limitClause += ` OFFSET ${o}`
    }
  }

  const sql = `SELECT ${selectClause} FROM ${table}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}${orderClause}${limitClause}`

  try {
    const rows = await query<RowDataPacket[]>(sql, values)
    const data = rows.map((r) => coerceRow(table, r as Record<string, unknown>))
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro interno'
    console.error('[api/supabase]', message)
    return err(message, 500)
  }
}
