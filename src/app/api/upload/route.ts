import { NextResponse } from 'next/server'
import { saveBuffer } from '@/lib/server/storage'
import { query } from '@/lib/mysql'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HAS_S3 = !!(process.env.IAM_KEY || process.env.AWS_ACCESS_KEY_ID)

let tableReady = false
async function ensureTable() {
  if (tableReady) return
  await query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id       VARCHAR(64)  NOT NULL,
      nome     VARCHAR(500) DEFAULT NULL,
      mime     VARCHAR(200) DEFAULT NULL,
      dados    MEDIUMBLOB   NOT NULL,
      criado_em VARCHAR(64) NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  tableReady = true
}

async function saveDB(buffer: Buffer, nome: string, mime: string): Promise<string> {
  await ensureTable()
  const id = Date.now().toString(36) + crypto.randomBytes(4).toString('hex')
  await query(
    'INSERT INTO uploads (id, nome, mime, dados, criado_em) VALUES (?,?,?,?,?)',
    [id, nome, mime, buffer, new Date().toISOString()],
  )
  return `/api/uploads/${id}`
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Arquivo não enviado.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const mime = file.type || 'application/octet-stream'

    const url = HAS_S3
      ? await saveBuffer(buffer, { ext, contentType: mime })
      : await saveDB(buffer, file.name, mime)

    return NextResponse.json({ ok: true, url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar arquivo'
    console.error('[api/upload]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
