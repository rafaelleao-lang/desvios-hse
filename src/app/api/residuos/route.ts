import { NextResponse } from 'next/server'
import { dispatchResiduos } from '@/lib/server/repo-residuos'

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
    const data = await dispatchResiduos(body.resource, body.action, args)
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[api/residuos]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
