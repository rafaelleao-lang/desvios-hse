// Compara o Supabase AO VIVO (REST) com o MySQL atual. Read-only.
// Le credenciais de .env.local. Uso: node scripts/compare-supabase-mysql.mjs
import { readFileSync } from 'fs'
import mysql from 'mysql2/promise'

// ── Carrega .env.local ──────────────────────────────────────────────────────
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
if (!SUPA_URL || !SUPA_KEY) { console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

// ── Normalizadores ──────────────────────────────────────────────────────────
const BOOL = (v) => (v === true || String(v).trim().toLowerCase() === 'true' || v === 1 || v === '1' ? '1' : '0')
const STR = (v) => (v === undefined || v === null ? '' : String(v).trim())
const INT = (v) => String(parseInt(v ?? 0, 10) || 0)
const NUM = (v) => String(Number(v ?? 0))
const JSONN = (v) => {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return '[]'
  try { return JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v) } catch { return String(v) }
}

const SPECS = {
  obras: { cols: {
    nome: STR, codigo: STR, empresa: STR, cidade: STR, estado: STR, responsavel: STR,
    ativa: BOOL, criado_em: STR, destinatarios: JSONN,
  }},
  tsts: { cols: { obra_id: STR, nome: STR, crea: STR, telefone: STR, ativo: BOOL, criado_em: STR }},
  encarregados: { cols: { obra_id: STR, nome: STR, setor: STR, telefone: STR, ativo: BOOL, criado_em: STR }},
  coordenadores: { cols: { obra_id: STR, nome: STR, telefone: STR, email: STR, ativo: BOOL, criado_em: STR }},
  desvios: { cols: {
    numero: INT, obra_id: STR, obra_nome: STR, categoria: STR, categoria_outro: STR, setor: STR,
    local_exato: STR, gravidade: STR, status: STR, descricao: STR, aberto_por: STR, colaborador_nome: STR,
    encarregado_id: STR, encarregado_nome: STR, tst_id: STR, tst_nome: STR,
    coordenador_id: STR, coordenador_nome: STR, data_ocorrencia: STR, hora_ocorrencia: STR,
    prazo_correcao: STR, acao_corretiva: STR, acao_preventiva: STR, reincidente: BOOL,
    fotos: JSONN, tratativas: JSONN, historico_status: JSONN, criado_em: STR, atualizado_em: STR,
  }},
  indicadores_semanais: { cols: {
    obra_id: STR, semana: INT, ano: INT, efetivo: INT, ausentes: INT, hht_trabalhada: NUM,
    apr_realizadas: INT, pt_realizadas: INT, desvios_ocorridos: INT, desvios_solucionados: INT,
    alojamentos_conformes: INT, alojamentos_nao_conformes: INT, alojamentos_totais: INT,
    hht_semanal: NUM, pessoas_treinadas: INT, dds: INT, acidentes: INT, acidente_sem_afastamento: INT,
    primeiros_socorros: INT, quase_acidentes: INT, danos_materiais: INT, campanhas: INT,
    inspecoes_semanais: INT, observacoes: STR, criado_em: STR, atualizado_em: STR,
  }},
}

// ── Fetch Supabase (REST + paginacao por offset) ─────────────────────────────
async function fetchSupabase(table) {
  const out = []
  const page = 1000
  for (let offset = 0; ; offset += page) {
    const url = `${SUPA_URL}/rest/v1/${table}?select=*&order=id&limit=${page}&offset=${offset}`
    const res = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Supabase ${table} HTTP ${res.status}: ${txt.slice(0, 200)}`)
    }
    const rows = await res.json()
    out.push(...rows)
    if (rows.length < page) break
  }
  return out
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

  let totalDiff = 0
  try {
    for (const [table, spec] of Object.entries(SPECS)) {
      let supa
      try { supa = await fetchSupabase(table) }
      catch (e) { console.log(`\n=== ${table.toUpperCase()} — ERRO ao ler Supabase: ${e.message}`); continue }

      const [rows] = await conn.query(`SELECT * FROM ${table}`)
      const supaById = new Map(supa.map((r) => [r.id, r]))
      const dbById = new Map(rows.map((r) => [r.id, r]))

      const soSupa = [...supaById.keys()].filter((id) => !dbById.has(id))
      const soDb = [...dbById.keys()].filter((id) => !supaById.has(id))

      const fieldDiffs = []
      for (const [id, s] of supaById) {
        const d = dbById.get(id)
        if (!d) continue
        for (const [col, norm] of Object.entries(spec.cols)) {
          const a = norm(s[col]); const b = norm(d[col])
          if (a !== b) fieldDiffs.push({ id, col, supabase: a, mysql: b })
        }
      }

      const status = soSupa.length || soDb.length || fieldDiffs.length ? 'DIVERGENCIAS' : 'OK (identico)'
      totalDiff += soSupa.length + soDb.length + fieldDiffs.length

      console.log(`\n=== ${table.toUpperCase()} — ${status} ===`)
      console.log(`  Supabase: ${supa.length} | MySQL: ${rows.length}`)
      if (soSupa.length) console.log(`  So no Supabase (faltam no MySQL) [${soSupa.length}]: ${soSupa.slice(0, 15).join(', ')}${soSupa.length > 15 ? ' ...' : ''}`)
      if (soDb.length) console.log(`  So no MySQL (faltam no Supabase) [${soDb.length}]: ${soDb.slice(0, 15).join(', ')}${soDb.length > 15 ? ' ...' : ''}`)
      if (fieldDiffs.length) {
        console.log(`  Diferencas de campo [${fieldDiffs.length}] (ate 20):`)
        for (const f of fieldDiffs.slice(0, 20)) {
          const cut = (s) => (s.length > 55 ? s.slice(0, 55) + '…' : s)
          console.log(`    [${f.id}] ${f.col}: SUPA="${cut(f.supabase)}" | MySQL="${cut(f.mysql)}"`)
        }
      }
    }
    console.log(`\n================ RESUMO: ${totalDiff === 0 ? 'MYSQL IDENTICO AO SUPABASE' : totalDiff + ' divergencias no total'} ================`)
  } finally {
    await conn.end()
  }
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
