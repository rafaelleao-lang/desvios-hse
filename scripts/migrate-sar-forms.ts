/**
 * Adiciona as colunas de integração com o forms SAR do cliente (Novo Nordisk)
 * em inspecao_evidencias (banco desvios). Rodar uma única vez:
 *   npx tsx scripts/migrate-sar-forms.ts
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
    path.join(__dirname, '..', 'database', 'mysql', 'migrations', '012_sar_forms.sql'),
    'utf-8',
  )
  await conn.query(sql)
  console.log('✅ Colunas de integração com o forms SAR adicionadas em inspecao_evidencias.\n')
  await conn.end()
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
