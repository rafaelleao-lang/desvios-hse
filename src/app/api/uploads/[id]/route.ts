import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await query<RowDataPacket[]>(
      'SELECT dados, mime, nome FROM uploads WHERE id = ? LIMIT 1',
      [params.id],
    )
    if (!rows.length) {
      return new NextResponse('Não encontrado', { status: 404 })
    }
    const { dados, mime, nome } = rows[0]
    return new NextResponse(new Uint8Array(dados as Buffer), {
      headers: {
        'Content-Type': mime || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${nome || params.id}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('[api/uploads/get]', err)
    return new NextResponse('Erro interno', { status: 500 })
  }
}
