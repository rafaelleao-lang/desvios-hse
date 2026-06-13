import { NextResponse } from 'next/server'
import { dispatchMaquinas } from '@/lib/server/repo-maquinas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body.resource !== 'string' || typeof body.action !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Requisição inválida: informe { resource, action, args }.' },
        { status: 400 },
      )
    }
    const args = Array.isArray(body.args) ? body.args : []
    const data = await dispatchMaquinas(body.resource, body.action, args)
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[api/maquinas]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
