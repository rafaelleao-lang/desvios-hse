import { NextResponse } from 'next/server'
import { saveBuffer } from '@/lib/server/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Recebe um arquivo (multipart/form-data, campo "file") e o grava no storage
 * local, retornando a URL pública.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Arquivo não enviado.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const url = await saveBuffer(buffer, { ext, contentType: file.type || undefined })

    return NextResponse.json({ ok: true, url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar arquivo'
    console.error('[api/upload]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
