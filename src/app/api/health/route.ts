import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'
import { dispatch } from '@/lib/server/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, string> = {}

  // Variáveis de ambiente — banco
  checks.DB_HOST = process.env.DB_HOST ? `✓ ${process.env.DB_HOST}` : '✗ não definido'
  checks.DB_USER = process.env.DB_USER ? `✓ ${process.env.DB_USER}` : '✗ não definido'
  checks.DB_NAME = process.env.DB_NAME ? `✓ ${process.env.DB_NAME}` : '✗ não definido'

  // Variáveis de ambiente — SMTP (e-mail)
  checks.SMTP_HOST = process.env.SMTP_HOST ? `✓ ${process.env.SMTP_HOST}` : '✗ não definido'
  checks.SMTP_PORT = process.env.SMTP_PORT ? `✓ ${process.env.SMTP_PORT}` : '✗ não definido'
  checks.SMTP_USER = process.env.SMTP_USER ? `✓ ${process.env.SMTP_USER}` : '✗ não definido'
  checks.SMTP_PASS = process.env.SMTP_PASS ? '✓ definido' : '✗ não definido'

  // Teste de conexão SMTP
  try {
    const nodemailer = (await import('nodemailer')).default
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await transporter.verify()
    checks.smtp_conexao = '✓ OK — autenticação Gmail bem-sucedida'
  } catch (err: any) {
    checks.smtp_conexao = `✗ FALHOU: ${err?.message ?? err}`
  }

  // Conexão direta
  try {
    const rows = await query<any[]>('SELECT 1 AS ok')
    checks.conexao_direta = rows[0]?.ok === 1 ? '✓ OK' : '✗ resposta inesperada'
  } catch (err: any) {
    checks.conexao_direta = `✗ FALHOU: ${err?.message ?? err}`
  }

  // Dispatch desvios.list (exatamente como o frontend chama)
  try {
    const desvios = await dispatch('desvios', 'list', []) as any[]
    checks.dispatch_desvios = `✓ ${desvios.length} registros retornados`
  } catch (err: any) {
    checks.dispatch_desvios = `✗ ${err?.message ?? err}`
  }

  // Dispatch obras.list
  try {
    const obras = await dispatch('obras', 'list', []) as any[]
    checks.dispatch_obras = `✓ ${obras.length} registros`
  } catch (err: any) {
    checks.dispatch_obras = `✗ ${err?.message ?? err}`
  }

  // Dispatch inspecoes.list
  try {
    const insp = await dispatch('inspecoes', 'list', []) as any[]
    checks.dispatch_inspecoes = `✓ ${insp.length} registros`
  } catch (err: any) {
    checks.dispatch_inspecoes = `✗ ${err?.message ?? err}`
  }

  const ok = checks.conexao_direta.startsWith('✓')
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 })
}
