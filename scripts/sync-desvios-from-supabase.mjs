// Sincroniza os desvios do Supabase (ao vivo) para o MySQL via upsert.
// Idempotente: so altera linhas novas/diferentes. NAO apaga nada. Le .env.local.
// Uso: node scripts/sync-desvios-from-supabase.mjs
import { readFileSync } from 'fs'
import mysql from 'mysql2/promise'

function loadEnv(path = '.env.local') {
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (m && !line.trim().startsWith('#')) {
        let v = m[2].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        if (!(m[1] in process.env)) process.env[m[1]] = v
      }
    }
  } catch { /* ignore */ }
}
loadEnv()

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!SUPA_URL || !SUPA_KEY) { console.error('Faltam credenciais Supabase em .env.local'); process.exit(1) }

const bool = (v) => (v === true || String(v).trim().toLowerCase() === 'true' || v === 1 || v === '1' ? 1 : 0)
const nz = (v) => (v === undefined || v === null || v === '' ? null : v)
const jstr = (v) => {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return '[]'
  try { return JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v) } catch { return '[]' }
}

async function fetchAll(table) {
  const out = []
  const page = 1000
  for (let offset = 0; ; offset += page) {
    const url = `${SUPA_URL}/rest/v1/${table}?select=*&order=id&limit=${page}&offset=${offset}`
    const res = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } })
    if (!res.ok) throw new Error(`Supabase ${table} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const rows = await res.json()
    out.push(...rows)
    if (rows.length < page) break
  }
  return out
}

const COLS = [
  'id', 'numero', 'obra_id', 'obra_nome', 'categoria', 'categoria_outro', 'setor', 'local_exato',
  'gravidade', 'status', 'descricao', 'aberto_por', 'colaborador_nome', 'encarregado_id', 'encarregado_nome',
  'tst_id', 'tst_nome', 'coordenador_id', 'coordenador_nome', 'data_ocorrencia', 'hora_ocorrencia',
  'prazo_correcao', 'acao_corretiva', 'acao_preventiva', 'reincidente', 'fotos', 'tratativas',
  'historico_status', 'criado_em', 'atualizado_em',
]

function toValues(r) {
  return [
    r.id, Number(r.numero), r.obra_id, nz(r.obra_nome), r.categoria, nz(r.categoria_outro),
    nz(r.setor), r.local_exato, r.gravidade || 'medio', r.status || 'aberto', r.descricao,
    r.aberto_por || '', nz(r.colaborador_nome), r.encarregado_id, nz(r.encarregado_nome),
    nz(r.tst_id), nz(r.tst_nome), nz(r.coordenador_id), nz(r.coordenador_nome),
    r.data_ocorrencia, nz(r.hora_ocorrencia), nz(r.prazo_correcao),
    nz(r.acao_corretiva), nz(r.acao_preventiva), bool(r.reincidente),
    jstr(r.fotos), jstr(r.tratativas), jstr(r.historico_status),
    r.criado_em, r.atualizado_em || r.criado_em,
  ]
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '123456',
    database: process.env.DB_NAME || 'desvios',
    charset: 'utf8mb4',
  })

  try {
    const desvios = await fetchAll('desvios')
    console.log(`Supabase desvios: ${desvios.length}`)

    const updateClause = COLS.filter((c) => c !== 'id').map((c) => `${c} = VALUES(${c})`).join(', ')
    const placeholders = `(${COLS.map(() => '?').join(', ')})`
    const sql = `INSERT INTO desvios (${COLS.join(', ')}) VALUES ${placeholders}
                 ON DUPLICATE KEY UPDATE ${updateClause}`

    let inseridos = 0, atualizados = 0, inalterados = 0
    for (const r of desvios) {
      const [res] = await conn.execute(sql, toValues(r))
      // mysql2 affectedRows: 1 = insert, 2 = update, 0 = sem mudanca
      if (res.affectedRows === 1) inseridos++
      else if (res.affectedRows === 2) atualizados++
      else inalterados++
    }
    console.log(`Inseridos: ${inseridos} | Atualizados: ${atualizados} | Inalterados: ${inalterados}`)

    const [[c]] = await conn.query('SELECT COUNT(*) AS n FROM desvios')
    console.log(`Total desvios no MySQL agora: ${c.n}`)
  } finally {
    await conn.end()
  }
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
