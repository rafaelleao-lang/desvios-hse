import 'server-only'
import mysql from 'mysql2/promise'

function buildSslConfig(): mysql.PoolOptions['ssl'] {
  if (String(process.env.DB_SSL).toLowerCase() !== 'true') return undefined
  const rejectUnauthorized =
    String(process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false'
  const ssl: Record<string, unknown> = { rejectUnauthorized }
  if (process.env.DB_SSL_CA) {
    const fs = require('fs') as typeof import('fs')
    ssl.ca = fs.readFileSync(process.env.DB_SSL_CA)
  }
  return ssl as mysql.PoolOptions['ssl']
}

const globalForDb = globalThis as unknown as { __mysqlResiduosPool?: mysql.Pool }

function createPool(): mysql.Pool {
  return mysql.createPool({
    host:               process.env.DB_RESIDUOS_HOST     || process.env.DB_HOST     || '127.0.0.1',
    port:               Number(process.env.DB_RESIDUOS_PORT || process.env.DB_PORT  || 3306),
    user:               process.env.DB_RESIDUOS_USER     || process.env.DB_USER     || 'root',
    password:           process.env.DB_RESIDUOS_PASSWORD ?? process.env.DB_PASSWORD ?? '',
    database:           process.env.DB_RESIDUOS_NAME     || 'gestaoresiduos',
    waitForConnections: true,
    connectionLimit:    Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit:         0,
    charset:            'utf8mb4',
    dateStrings:        true,
    enableKeepAlive:    true,
    keepAliveInitialDelay: 0,
    ssl:                buildSslConfig(),
  })
}

export function getResiduosPool(): mysql.Pool {
  if (!globalForDb.__mysqlResiduosPool) {
    globalForDb.__mysqlResiduosPool = createPool()
  }
  return globalForDb.__mysqlResiduosPool
}

export async function queryResiduos<T = mysql.RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  try {
    const [rows] = await getResiduosPool().query(sql, params)
    return rows as T
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'ECONNRESET' || code === 'PROTOCOL_CONNECTION_LOST' || code === 'ENOTFOUND') {
      globalForDb.__mysqlResiduosPool = createPool()
      const [rows] = await getResiduosPool().query(sql, params)
      return rows as T
    }
    throw err
  }
}
