import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'
import { saveDataUrl } from '@/lib/server/storage'
import type { RowDataPacket } from 'mysql2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Migra fotos armazenadas como data URL (base64) dentro das colunas JSON de
 * `desvios` para arquivos no storage local, substituindo o valor por uma URL.
 */
export async function GET() {
  const desvios = await query<RowDataPacket[]>(
    'SELECT id, numero, fotos, tratativas FROM desvios',
  )

  let migradas = 0
  let ignoradas = 0
  let erros = 0
  const log: string[] = []

  for (const desvio of desvios) {
    const tag = `DEV-${String(desvio.numero).padStart(5, '0')}`
    let mudou = false

    const fotosAtuais = parseJSON<FotoRow[]>(desvio.fotos, [])
    const fotosAtualizadas = await processarFotos(fotosAtuais, {
      onMigrada: () => { migradas++; mudou = true },
      onIgnorada: () => ignoradas++,
      onErro: () => erros++,
    })

    const tratativasAtuais = parseJSON<TratativaRow[]>(desvio.tratativas, [])
    const tratativasAtualizadas: TratativaRow[] = []
    for (const t of tratativasAtuais) {
      const fotosT = await processarFotos(t.fotos ?? [], {
        onMigrada: () => { migradas++; mudou = true },
        onIgnorada: () => ignoradas++,
        onErro: () => erros++,
      })
      tratativasAtualizadas.push({ ...t, fotos: fotosT })
    }

    if (mudou) {
      try {
        await query(
          'UPDATE desvios SET fotos = ?, tratativas = ? WHERE id = ?',
          [JSON.stringify(fotosAtualizadas), JSON.stringify(tratativasAtualizadas), desvio.id],
        )
        log.push(`${tag}: migrado`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'erro desconhecido'
        log.push(`${tag}: erro ao salvar — ${message}`)
      }
    }
  }

  return NextResponse.json({ ok: true, migradas, ignoradas, erros, log })
}

// ── helpers ───────────────────────────────────────────────────────────────────

function parseJSON<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback
  if (typeof v === 'string') {
    try { return JSON.parse(v) as T } catch { return fallback }
  }
  return v as T
}

type Callbacks = { onMigrada: () => void; onIgnorada: () => void; onErro: () => void }

async function processarFotos(fotos: FotoRow[], cb: Callbacks): Promise<FotoRow[]> {
  const result: FotoRow[] = []
  for (const foto of fotos) {
    if (typeof foto.data_url === 'string' && foto.data_url.startsWith('data:')) {
      try {
        const url = await saveDataUrl(foto.data_url)
        result.push({ ...foto, data_url: url })
        cb.onMigrada()
      } catch {
        result.push(foto) // mantém base64 se falhar — nunca perde foto
        cb.onErro()
      }
    } else {
      result.push(foto) // já é URL — pula
      cb.onIgnorada()
    }
  }
  return result
}

interface FotoRow {
  id: string
  tipo: string
  data_url: string
  nome: string
}

interface TratativaRow {
  fotos?: FotoRow[]
  [key: string]: unknown
}
