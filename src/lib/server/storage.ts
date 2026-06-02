import 'server-only'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Armazenamento de fotos em filesystem local (substitui o Supabase Storage).
 *
 * Os arquivos são gravados em `public/uploads/fotos/AAAA-MM/` e servidos pela
 * própria aplicação via caminho `/uploads/...`.
 *
 * Preparado para evolução futura (ex.: S3) através de variáveis de ambiente:
 *   UPLOAD_DIR        diretório físico raiz dos uploads (padrão: <cwd>/public/uploads)
 *   UPLOAD_PUBLIC_URL prefixo público das URLs (padrão: /uploads)
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')
const PUBLIC_URL = (process.env.UPLOAD_PUBLIC_URL || '/uploads').replace(/\/+$/, '')

function randomName(ext = 'jpg'): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

/** Salva um buffer e retorna a URL pública (`/uploads/fotos/AAAA-MM/arquivo.jpg`). */
export async function saveBuffer(
  buffer: Buffer,
  opts: { ext?: string; prefix?: string } = {},
): Promise<string> {
  const month = new Date().toISOString().slice(0, 7)
  const dir = path.join(UPLOAD_DIR, 'fotos', month)
  await ensureDir(dir)
  const filename = `${opts.prefix ?? ''}${randomName(opts.ext)}`
  await fs.writeFile(path.join(dir, filename), buffer)
  return `${PUBLIC_URL}/fotos/${month}/${filename}`
}

/** Salva uma data URL base64 (`data:image/jpeg;base64,...`). */
export async function saveDataUrl(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('data URL inválida')
  const buffer = Buffer.from(match[2], 'base64')
  const ext = match[1].split('/')[1]?.split('+')[0] || 'jpg'
  return saveBuffer(buffer, { ext, prefix: 'migrado-' })
}
