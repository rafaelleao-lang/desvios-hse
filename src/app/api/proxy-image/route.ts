import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Proxy de imagens para uso same-origin (ex.: geração de PPT no navegador).
 *
 * As fotos vivem no S3 (bucket público via bucket policy), mas o bucket NÃO
 * tem CORS configurado — então um `fetch()` cross-origin do navegador é
 * bloqueado e a leitura do corpo falha. Buscando a imagem aqui no servidor e
 * devolvendo same-origin, o navegador consegue ler os bytes normalmente.
 *
 * Uso: /api/proxy-image?url=<url-encoded da foto>
 */

// Hosts cujas imagens podem ser proxyadas (evita SSRF). Inclui o bucket S3 e o
// host público opcional (CloudFront), além do Supabase legado.
const ALLOWED_HOST_SUFFIXES = [
  '.amazonaws.com',
  '.supabase.co',
]

function publicBaseHost(): string | null {
  const base = process.env.S3_PUBLIC_BASE_URL
  if (!base) return null
  try { return new URL(base).hostname } catch { return null }
}

function isAllowed(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase()
  if (ALLOWED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix))) return true
  const base = publicBaseHost()
  return base ? host === base.toLowerCase() : false
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('url')

  if (!raw) {
    return NextResponse.json({ ok: false, error: 'Parâmetro "url" ausente.' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ ok: false, error: 'URL inválida.' }, { status: 400 })
  }

  if (!isAllowed(target)) {
    return NextResponse.json({ ok: false, error: 'Host não permitido.' }, { status: 403 })
  }

  try {
    const upstream = await fetch(target.toString(), { cache: 'no-store' })
    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: `Falha ao buscar imagem (HTTP ${upstream.status}).` },
        { status: 502 },
      )
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const buffer = Buffer.from(await upstream.arrayBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar imagem'
    console.error('[api/proxy-image]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
