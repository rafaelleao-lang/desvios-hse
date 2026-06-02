import 'server-only'
import mysql from 'mysql2/promise'

/**
 * Pool de conexões MySQL — SOMENTE servidor.
 *
 * Lê a configuração de variáveis de ambiente, permitindo apontar para o
 * MySQL local (XAMPP) durante o desenvolvimento e, sem mudança de código,
 * para uma instância MySQL no Amazon RDS em produção.
 *
 * Variáveis suportadas:
 *   DB_HOST                       host do banco (ex.: 127.0.0.1 ou *.rds.amazonaws.com)
 *   DB_PORT                       porta (padrão 3306)
 *   DB_USER                       usuário
 *   DB_PASSWORD                   senha
 *   DB_NAME                       nome do banco (padrão "desvios")
 *   DB_CONNECTION_LIMIT           máx. de conexões no pool (padrão 10)
 *   DB_SSL                        "true" para habilitar TLS (necessário no RDS)
 *   DB_SSL_REJECT_UNAUTHORIZED    "false" para aceitar certificado não verificado
 *   DB_SSL_CA                     caminho para o bundle CA (ex.: rds-combined-ca-bundle.pem)
 */

function buildSslConfig(): mysql.PoolOptions['ssl'] {
  if (String(process.env.DB_SSL).toLowerCase() !== 'true') return undefined

  const rejectUnauthorized =
    String(process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false'

  const ssl: Record<string, unknown> = { rejectUnauthorized }

  if (process.env.DB_SSL_CA) {
    // Importação tardia para não quebrar o bundle do cliente.
    const fs = require('fs') as typeof import('fs')
    ssl.ca = fs.readFileSync(process.env.DB_SSL_CA)
  }

  return ssl as mysql.PoolOptions['ssl']
}

// Em dev o Next recria módulos a cada hot-reload; guardamos o pool no escopo
// global para não vazar conexões.
const globalForDb = globalThis as unknown as { __mysqlPool?: mysql.Pool }

export function getPool(): mysql.Pool {
  if (!globalForDb.__mysqlPool) {
    globalForDb.__mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME || 'desvios',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      queueLimit: 0,
      charset: 'utf8mb4',
      // Mantém DATE/DATETIME como string, evitando conversões de fuso horário.
      dateStrings: true,
      ssl: buildSslConfig(),
    })
  }
  return globalForDb.__mysqlPool
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [rows] = await getPool().query(sql, params)
  return rows as T
}
