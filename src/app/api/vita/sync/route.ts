import { NextRequest, NextResponse } from 'next/server'
import { inspecoesMERepo } from '@/lib/server/repo-maquinas'
import { syncInspecaoToVita } from '@/lib/vita/sync'

export async function POST(req: NextRequest) {
  try {
    const { inspecaoId } = await req.json() as { inspecaoId: string }
    console.log('[vita/sync] chamado para inspecaoId:', inspecaoId)
    if (!inspecaoId) {
      return NextResponse.json({ error: 'inspecaoId obrigatório' }, { status: 400 })
    }

    const insp = await inspecoesMERepo.find(inspecaoId)
    if (!insp) {
      console.log('[vita/sync] inspeção não encontrada:', inspecaoId)
      return NextResponse.json({ error: 'inspeção não encontrada' }, { status: 404 })
    }

    console.log('[vita/sync] insp:', {
      id: insp.id,
      obra_id: insp.obra_id,
      tipo: insp.equipamento_tipo,
      resultado: insp.resultado,
    })

    const result = await syncInspecaoToVita(insp)
    console.log('[vita/sync] resultado:', result)

    if (result.ok) {
      return NextResponse.json({ synced: true, vitaId: result.vitaId })
    } else {
      return NextResponse.json({ synced: false, reason: result.reason }, { status: 422 })
    }
  } catch (err) {
    console.error('[vita/sync] erro:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'erro interno' },
      { status: 500 },
    )
  }
}
