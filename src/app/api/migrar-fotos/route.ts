import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data: desvios, error } = await supabase
    .from('desvios')
    .select('id, numero, fotos, tratativas')

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  let migradas = 0
  let ignoradas = 0
  let erros = 0
  const log: string[] = []

  for (const desvio of desvios ?? []) {
    const tag = `DEV-${String(desvio.numero).padStart(5, '0')}`
    let mudou = false

    const fotosAtualizadas = await processarFotos(desvio.fotos ?? [], {
      onMigrada: () => { migradas++; mudou = true },
      onIgnorada: () => ignoradas++,
      onErro: () => erros++,
    })

    const tratativasAtualizadas = []
    for (const t of desvio.tratativas ?? []) {
      const fotosT = await processarFotos(t.fotos ?? [], {
        onMigrada: () => { migradas++; mudou = true },
        onIgnorada: () => ignoradas++,
        onErro: () => erros++,
      })
      tratativasAtualizadas.push({ ...t, fotos: fotosT })
    }

    if (mudou) {
      const { error: upd } = await supabase
        .from('desvios')
        .update({ fotos: fotosAtualizadas, tratativas: tratativasAtualizadas })
        .eq('id', desvio.id)

      if (upd) {
        log.push(`${tag}: erro ao salvar — ${upd.message}`)
      } else {
        log.push(`${tag}: migrado`)
      }
    }
  }

  return NextResponse.json({ ok: true, migradas, ignoradas, erros, log })
}

// ── helpers ───────────────────────────────────────────────────────────────────

type Callbacks = { onMigrada: () => void; onIgnorada: () => void; onErro: () => void }

async function processarFotos(fotos: FotoRow[], cb: Callbacks): Promise<FotoRow[]> {
  const result: FotoRow[] = []
  for (const foto of fotos) {
    if (typeof foto.data_url === 'string' && foto.data_url.startsWith('data:')) {
      try {
        const url = await uploadBase64(foto.data_url)
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

async function uploadBase64(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('data URL inválida')

  const buffer = Buffer.from(match[2], 'base64')
  const month = new Date().toISOString().slice(0, 7)
  const path = `fotos/${month}/migrado-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

  const { data, error } = await supabase.storage
    .from('desvios')
    .upload(path, buffer, { contentType: 'image/jpeg', cacheControl: '31536000' })

  if (error) throw error

  const { data: urlData } = supabase.storage.from('desvios').getPublicUrl(data.path)
  return urlData.publicUrl
}

interface FotoRow {
  id: string
  tipo: string
  data_url: string
  nome: string
}
