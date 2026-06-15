import { NextResponse } from 'next/server'
import { dispatchMaquinas } from '@/lib/server/repo-maquinas'
import { syncInspecaoToVita } from '@/lib/vita/sync'
import type { InspecaoMaquina } from '@/types/maquinas'

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

    // Sync automático com VITA ao criar inspeção aprovada
    let vitaSyncResult: { ok: boolean; vitaId?: string; reason?: string } | undefined
    if (body.resource === 'inspecoesME' && body.action === 'create') {
      const insp = data as InspecaoMaquina
      if (insp.resultado === 'aprovado') {
        console.log('[maquinas/create] sincronizando com VITA:', insp.id, insp.obra_id, insp.equipamento_tipo)
        const syncResult = await syncInspecaoToVita(insp)
        console.log('[maquinas/create] vita sync:', syncResult)
        vitaSyncResult = syncResult
      }
    }

    return NextResponse.json({ ok: true, data, vitaSyncResult })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[api/maquinas]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
