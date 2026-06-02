// Compara os CSVs exportados do Supabase com o conteudo atual do MySQL.
// Read-only. Uso: node scripts/compare-csv-mysql.mjs
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import mysql from 'mysql2/promise'

const CSV_DIR = process.env.CSV_DIR || 'C:/Users/Manutenção/Documents/DESENVOLVIMENTO/DESVIOS/03-06-2026'
const FILES = {
  obras: `${CSV_DIR}/obras_rows (2).csv`,
  tsts: `${CSV_DIR}/tsts_rows (1).csv`,
  encarregados: `${CSV_DIR}/encarregados_rows (1).csv`,
  coordenadores: `${CSV_DIR}/coordenadores_rows.csv`,
  desvios: `${CSV_DIR}/desvios_rows (1).csv`,
}

// Colunas a comparar por tabela e como normalizar cada valor.
const BOOL = (v) => (String(v).trim().toLowerCase() === 'true' || v === 1 || v === '1' ? '1' : '0')
const STR = (v) => (v === undefined || v === null ? '' : String(v).trim())
const INT = (v) => String(parseInt(v ?? 0, 10) || 0)
const JSONN = (v) => {
  if (v === undefined || v === null || String(v).trim() === '') return '[]'
  try { return JSON.stringify(JSON.parse(typeof v === 'string' ? v : JSON.stringify(v))) } catch { return String(v) }
}

const SPECS = {
  obras: { table: 'obras', cols: {
    nome: STR, codigo: STR, empresa: STR, cidade: STR, estado: STR, responsavel: STR,
    ativa: BOOL, criado_em: STR, destinatarios: JSONN,
  }},
  tsts: { table: 'tsts', cols: {
    obra_id: STR, nome: STR, crea: STR, telefone: STR, ativo: BOOL, criado_em: STR,
  }},
  encarregados: { table: 'encarregados', cols: {
    obra_id: STR, nome: STR, setor: STR, telefone: STR, ativo: BOOL, criado_em: STR,
  }},
  coordenadores: { table: 'coordenadores', cols: {
    obra_id: STR, nome: STR, telefone: STR, email: STR, ativo: BOOL, criado_em: STR,
  }},
  desvios: { table: 'desvios', cols: {
    numero: INT, obra_id: STR, obra_nome: STR, categoria: STR, categoria_outro: STR, setor: STR,
    local_exato: STR, gravidade: STR, status: STR, descricao: STR, aberto_por: STR, colaborador_nome: STR,
    encarregado_id: STR, encarregado_nome: STR, tst_id: STR, tst_nome: STR,
    coordenador_id: STR, coordenador_nome: STR, data_ocorrencia: STR, hora_ocorrencia: STR,
    prazo_correcao: STR, acao_corretiva: STR, acao_preventiva: STR, reincidente: BOOL,
    fotos: JSONN, tratativas: JSONN, historico_status: JSONN, criado_em: STR, atualizado_em: STR,
  }},
}

function readCsv(path) {
  const raw = readFileSync(path, 'utf8')
  return parse(raw, { columns: true, skip_empty_lines: true, bom: true, relax_quotes: true })
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
    for (const [name, spec] of Object.entries(SPECS)) {
      const csv = readCsv(FILES[name])
      const [rows] = await conn.query(`SELECT * FROM ${spec.table}`)

      const csvById = new Map(csv.map((r) => [r.id, r]))
      const dbById = new Map(rows.map((r) => [r.id, r]))

      const soCsv = [...csvById.keys()].filter((id) => !dbById.has(id))
      const soDb = [...dbById.keys()].filter((id) => !csvById.has(id))

      // Diferencas campo a campo (apenas ids presentes nos dois lados)
      const fieldDiffs = []
      for (const [id, c] of csvById) {
        const d = dbById.get(id)
        if (!d) continue
        for (const [col, norm] of Object.entries(spec.cols)) {
          const a = norm(c[col])
          const b = norm(d[col])
          if (a !== b) fieldDiffs.push({ id, col, csv: a, mysql: b })
        }
      }

      const dups = csv.length - csvById.size
      const status = soCsv.length || soDb.length || fieldDiffs.length ? 'DIVERGENCIAS' : 'OK (identico)'
      totalDiff += soCsv.length + soDb.length + fieldDiffs.length

      console.log(`\n=== ${name.toUpperCase()} — ${status} ===`)
      console.log(`  CSV: ${csv.length} linhas (${csvById.size} ids unicos${dups ? `, ${dups} ids duplicados no CSV` : ''}) | MySQL: ${rows.length} linhas`)
      if (soCsv.length) console.log(`  So no CSV (ausentes no MySQL) [${soCsv.length}]: ${soCsv.slice(0, 10).join(', ')}${soCsv.length > 10 ? ' ...' : ''}`)
      if (soDb.length) console.log(`  So no MySQL (ausentes no CSV) [${soDb.length}]: ${soDb.slice(0, 10).join(', ')}${soDb.length > 10 ? ' ...' : ''}`)
      if (fieldDiffs.length) {
        console.log(`  Diferencas de campo [${fieldDiffs.length}] (ate 15):`)
        for (const f of fieldDiffs.slice(0, 15)) {
          const cut = (s) => (s.length > 60 ? s.slice(0, 60) + '…' : s)
          console.log(`    [${f.id}] ${f.col}: CSV="${cut(f.csv)}" | MySQL="${cut(f.mysql)}"`)
        }
      }
    }
    console.log(`\n================ RESUMO: ${totalDiff === 0 ? 'TODAS AS TABELAS IDENTICAS' : totalDiff + ' divergencias no total'} ================`)
  } finally {
    await conn.end()
  }
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
