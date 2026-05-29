// Importa os CSVs exportados (Supabase) para o MySQL local.
// Uso: node scripts/import-csv.mjs
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import mysql from 'mysql2/promise'

const CSV_DIR = 'C:/Users/Manutenção/Documents/DESENVOLVIMENTO/DESVIOS'
const FILES = {
  obras: `${CSV_DIR}/obras_rows (1).csv`,
  tsts: `${CSV_DIR}/tsts_rows.csv`,
  encarregados: `${CSV_DIR}/encarregados_rows.csv`,
  desvios: `${CSV_DIR}/desvios_rows.csv`,
}

const bool = (v) => (String(v).trim().toLowerCase() === 'true' ? 1 : 0)
const nz = (v) => (v === undefined || v === null || v === '' ? null : v)
const jsonOr = (v, fallback = '[]') => {
  if (v === undefined || v === null || String(v).trim() === '') return fallback
  try { return JSON.stringify(JSON.parse(v)) } catch { return fallback }
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
    multipleStatements: true,
  })

  try {
    // Limpa as tabelas (ordem segura p/ FK)
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')
    await conn.query('DELETE FROM desvios')
    await conn.query('DELETE FROM encarregados')
    await conn.query('DELETE FROM tsts')
    await conn.query('DELETE FROM obras')
    await conn.query('SET FOREIGN_KEY_CHECKS = 1')

    // ── Obras ──────────────────────────────────────────────────────────────
    const obras = readCsv(FILES.obras)
    for (const r of obras) {
      await conn.execute(
        `INSERT INTO obras (id, nome, codigo, empresa, cidade, estado, responsavel, ativa, criado_em, destinatarios)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.nome, r.codigo, nz(r.empresa), nz(r.cidade), nz(r.estado), nz(r.responsavel),
         bool(r.ativa), r.criado_em, jsonOr(r.destinatarios)],
      )
    }
    console.log(`obras: ${obras.length} importadas`)

    // ── TSTs ───────────────────────────────────────────────────────────────
    const tsts = readCsv(FILES.tsts)
    let tstSkip = 0
    for (const r of tsts) {
      await conn.execute(
        `INSERT INTO tsts (id, obra_id, nome, crea, telefone, ativo, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.obra_id, r.nome, nz(r.crea), nz(r.telefone), bool(r.ativo), r.criado_em],
      ).catch((e) => { if (e.code === 'ER_NO_REFERENCED_ROW_2') { tstSkip++ } else throw e })
    }
    console.log(`tsts: ${tsts.length - tstSkip} importados${tstSkip ? ` (${tstSkip} ignorados sem obra)` : ''}`)

    // ── Encarregados ─────────────────────────────────────────────────────────
    const encs = readCsv(FILES.encarregados)
    let encSkip = 0
    for (const r of encs) {
      await conn.execute(
        `INSERT INTO encarregados (id, obra_id, nome, setor, telefone, ativo, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.obra_id, r.nome, nz(r.setor), nz(r.telefone), bool(r.ativo), r.criado_em],
      ).catch((e) => { if (e.code === 'ER_NO_REFERENCED_ROW_2') { encSkip++ } else throw e })
    }
    console.log(`encarregados: ${encs.length - encSkip} importados${encSkip ? ` (${encSkip} ignorados sem obra)` : ''}`)

    // ── Desvios ────────────────────────────────────────────────────────────
    const desvios = readCsv(FILES.desvios)
    for (const r of desvios) {
      await conn.execute(
        `INSERT INTO desvios (
          id, numero, obra_id, obra_nome, categoria, categoria_outro, setor, local_exato,
          gravidade, status, descricao, aberto_por, colaborador_nome, encarregado_id, encarregado_nome,
          tst_id, tst_nome, data_ocorrencia, hora_ocorrencia, prazo_correcao, acao_corretiva, acao_preventiva,
          reincidente, fotos, tratativas, historico_status, criado_em, atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id, Number(r.numero), r.obra_id, nz(r.obra_nome), r.categoria, nz(r.categoria_outro),
          nz(r.setor), r.local_exato, r.gravidade || 'medio', r.status || 'aberto', r.descricao,
          r.aberto_por || '', nz(r.colaborador_nome), r.encarregado_id, nz(r.encarregado_nome),
          nz(r.tst_id), nz(r.tst_nome), r.data_ocorrencia, nz(r.hora_ocorrencia), nz(r.prazo_correcao),
          nz(r.acao_corretiva), nz(r.acao_preventiva), bool(r.reincidente),
          jsonOr(r.fotos), jsonOr(r.tratativas), jsonOr(r.historico_status),
          r.criado_em, r.atualizado_em || r.criado_em,
        ],
      )
    }
    console.log(`desvios: ${desvios.length} importados`)

    const [[counts]] = await conn.query(
      `SELECT (SELECT COUNT(*) FROM obras) obras, (SELECT COUNT(*) FROM tsts) tsts,
              (SELECT COUNT(*) FROM encarregados) encarregados, (SELECT COUNT(*) FROM desvios) desvios`,
    )
    console.log('Totais no banco:', counts)
  } finally {
    await conn.end()
  }
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
