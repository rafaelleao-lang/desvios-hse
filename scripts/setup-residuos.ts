/**
 * Cria as tabelas do módulo Gestão de Resíduos no banco desvios (principal).
 * Rodar uma única vez:
 *   npx tsx scripts/setup-residuos.ts
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
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true,
  })

  console.log(`\nConectado em ${process.env.DB_HOST}`)
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'database', 'mysql', 'migrations', '008_gestao_residuos.sql'),
    'utf-8',
  )
  await conn.query(sql)
  console.log('✅ Tabelas criadas com sucesso no banco desvios.\n')
  await conn.end()
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
