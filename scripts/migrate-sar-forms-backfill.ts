/**
 * Marca como 'nao_aplicavel' as evidências que já existiam antes da
 * integração com o forms SAR (senão o bot tentaria sincronizar meses de
 * histórico). Rodar uma única vez, depois de migrate-sar-forms.ts:
 *   npx tsx scripts/migrate-sar-forms-backfill.ts
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
    multipleStatements: true,
  })

  console.log(`\nConectado em ${process.env.DB_HOST}`)
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'database', 'mysql', 'migrations', '013_sar_forms_backfill.sql'),
    'utf-8',
  )
  const [result] = await conn.query(sql) as any
  console.log(`✅ Backfill aplicado (${result?.affectedRows ?? '?'} linha(s) marcadas 'nao_aplicavel').\n`)
  await conn.end()
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
