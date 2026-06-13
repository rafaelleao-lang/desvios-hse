import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, string> = {}

  // Variáveis de ambiente
  checks.DB_HOST = process.env.DB_HOST ? `✓ ${process.env.DB_HOST}` : '✗ não definido'
  checks.DB_USER = process.env.DB_USER ? `✓ ${process.env.DB_USER}` : '✗ não definido'
  checks.DB_NAME = process.env.DB_NAME ? `✓ ${process.env.DB_NAME}` : '✗ não definido'
  checks.DB_PORT = process.env.DB_PORT ?? '3306 (padrão)'
  checks.DB_SSL  = process.env.DB_SSL  ?? 'false (padrão)'

  // Teste de conexão
  try {
    const rows = await query<any[]>('SELECT 1 AS ok')
    checks.conexao = rows[0]?.ok === 1 ? '✓ OK' : '✗ resposta inesperada'
  } catch (err: any) {
    checks.conexao = `✗ FALHOU: ${err?.message ?? err}`
  }

  // Contagem de desvios
  try {
    const rows = await query<any[]>('SELECT COUNT(*) AS n FROM desvios')
    checks.desvios = `✓ ${rows[0]?.n} registros`
  } catch (err: any) {
    checks.desvios = `✗ ${err?.message ?? err}`
  }

  // Contagem de obras
  try {
    const rows = await query<any[]>('SELECT COUNT(*) AS n FROM obras')
    checks.obras = `✓ ${rows[0]?.n} registros`
  } catch (err: any) {
    checks.obras = `✗ ${err?.message ?? err}`
  }

  // Contagem de inspeções
  try {
    const rows = await query<any[]>('SELECT COUNT(*) AS n FROM inspecoes')
    checks.inspecoes = `✓ ${rows[0]?.n} registros`
  } catch (err: any) {
    checks.inspecoes = `✗ ${err?.message ?? err}`
  }

  const ok = checks.conexao.startsWith('✓')
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 })
}
