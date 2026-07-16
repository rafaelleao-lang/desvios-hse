/**
 * Corrige inspeções com apenas reconhecimentos que ficaram com status 'em_aberto'.
 * Regra: se td=0 e tr>0, status deve ser 'concluida'.
 *
 * Rodar uma única vez:
 *   npx tsx scripts/fix-inspecoes-so-reconhecimento.ts
 */

import mysql from 'mysql2/promise'
import * as fs from 'fs'
import * as path from 'path'

const envFile = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const t = line.trim()
    if (t && !t.startsWith('#')) {
      const idx = t.indexOf('=')
      if (idx > 0) process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim()
    }
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     Number(process.env.DB_PORT || 3306),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'desvios',
    charset:  'utf8mb4',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })

  try {
    // Busca todas as inspeções com apenas reconhecimentos e status errado
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT i.id, i.numero, i.status,
             COALESCE(ev.td, 0) AS td,
             COALESCE(ev.tr, 0) AS tr
      FROM inspecoes i
      LEFT JOIN (
        SELECT inspecao_id,
          SUM(tipo = 'desvio')         AS td,
          SUM(tipo = 'reconhecimento') AS tr
        FROM inspecao_evidencias
        GROUP BY inspecao_id
      ) ev ON ev.inspecao_id = i.id
      WHERE i.status = 'em_aberto'
        AND COALESCE(ev.td, 0) = 0
        AND COALESCE(ev.tr, 0) > 0
    `)

    if (rows.length === 0) {
      console.log('Nenhuma inspeção para corrigir.')
      return
    }

    console.log(`Encontradas ${rows.length} inspeção(ões) para corrigir:\n`)
    rows.forEach(r => console.log(`  INS-${String(r.numero).padStart(4,'0')}  id=${r.id}  td=${r.td}  tr=${r.tr}`))
    console.log()

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const ids = rows.map(r => r.id)

    for (const id of ids) {
      await conn.execute(
        `UPDATE inspecoes
         SET status = 'concluida',
             fechado_em = COALESCE(fechado_em, ?),
             atualizado_em = ?
         WHERE id = ?`,
        [now, now, id]
      )
    }

    console.log(`✓ ${ids.length} inspeção(ões) atualizadas para 'concluida'.`)
  } finally {
    await conn.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
