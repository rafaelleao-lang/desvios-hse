// Migra as fotos que ainda estão no Storage do Supabase para o bucket S3 `hsemse`
// e reescreve as URLs dentro do JSON da tabela `desvios` (colunas `fotos` e
// `tratativas[].fotos`) no MySQL.
//
// - Idempotente: pula fotos que já apontam para o S3; em caso de falha mantém a
//   URL original (nunca perde referência).
// - Upload imutável (mesma convenção do uparArquivoSemConverter do portalmse):
//   ACL public-read, ContentMD5, ContentDisposition inline, ContentType do arquivo.
//
// Uso:
//   node scripts/migrar-fotos-para-s3.mjs            (executa a migração)
//   node scripts/migrar-fotos-para-s3.mjs --dry-run  (só relatório, não grava nada)
//
// Requer no .env.local: credenciais MySQL + AWS_REGION, S3_BUCKET (ou usa hsemse),
// IAM_KEY/IAM_SECRET (ou cadeia padrão de credenciais da AWS).

import { readFileSync } from 'fs'
import crypto from 'crypto'
import mysql from 'mysql2/promise'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// ── .env.local ──────────────────────────────────────────────────────────────
function loadEnv(path = '.env.local') {
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (m && !line.trim().startsWith('#')) {
        let v = m[2].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        if (!(m[1] in process.env)) process.env[m[1]] = v
      }
    }
  } catch { /* ignore */ }
}
loadEnv()

const DRY_RUN = process.argv.includes('--dry-run')

const REGION = process.env.AWS_REGION || 'sa-east-1'
const BUCKET = process.env.S3_BUCKET || 'hsemse'
const ACCESS_KEY = process.env.IAM_KEY || process.env.AWS_ACCESS_KEY_ID
const SECRET_KEY = process.env.IAM_SECRET || process.env.AWS_SECRET_ACCESS_KEY
const PREFIX = (process.env.S3_PREFIX || 'desvios-hse/fotos').replace(/^\/+|\/+$/g, '')
const PUBLIC_BASE = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '')

const MIME_BY_EXT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', heic: 'image/heic', pdf: 'application/pdf',
}

const s3 = new S3Client({
  region: REGION,
  ...(ACCESS_KEY && SECRET_KEY ? { credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY } } : {}),
})

function publicUrl(key) {
  const encoded = key.split('/').map(encodeURIComponent).join('/')
  return PUBLIC_BASE ? `${PUBLIC_BASE}/${encoded}` : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encoded}`
}

function uniqueName(ext) {
  const stamp = `${Date.now()}${process.hrtime.bigint().toString()}`
  const rand = crypto.randomBytes(4).toString('hex')
  const safe = (ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  return `${stamp}${rand}.${safe}`
}

function extFromUrl(url) {
  const clean = url.split('?')[0]
  const e = clean.split('.').pop()?.toLowerCase()
  return e && e.length <= 5 ? e : 'jpg'
}

// Considera "já migrada" qualquer foto que não esteja mais no Supabase Storage.
function isSupabaseStorage(url) {
  return typeof url === 'string' && url.includes('supabase.co/storage')
}

async function uploadFromUrl(sourceUrl) {
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`download HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const ext = extFromUrl(sourceUrl)
  const month = new Date().toISOString().slice(0, 7)
  const key = `${PREFIX}/${month}/migrado-${uniqueName(ext)}`
  const contentType = res.headers.get('content-type') || MIME_BY_EXT[ext] || 'application/octet-stream'
  const contentMD5 = crypto.createHash('md5').update(buffer).digest('base64')

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: buffer,
    ...(process.env.S3_ACL ? { ACL: process.env.S3_ACL } : {}),
    ContentType: contentType, ContentMD5: contentMD5, ContentDisposition: 'inline',
  }))
  return publicUrl(key)
}

const stats = { total: 0, migradas: 0, jaNoS3: 0, erros: 0 }

async function migrarFotos(fotos) {
  if (!Array.isArray(fotos)) return { fotos, mudou: false }
  let mudou = false
  const out = []
  for (const f of fotos) {
    const url = f?.data_url
    if (!isSupabaseStorage(url)) { stats.jaNoS3++; out.push(f); continue }
    stats.total++
    if (DRY_RUN) { out.push(f); continue }
    try {
      const novaUrl = await uploadFromUrl(url)
      out.push({ ...f, data_url: novaUrl })
      stats.migradas++
      mudou = true
    } catch (e) {
      console.error(`  ! falha ao migrar ${url}: ${e.message}`)
      out.push(f) // mantém original
      stats.erros++
    }
  }
  return { fotos: out, mudou }
}

const parse = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : v || [] } catch { return [] } }

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '123456',
    database: process.env.DB_NAME || 'desvios',
    charset: 'utf8mb4',
  })

  console.log(`Bucket: ${BUCKET} | Região: ${REGION} | Prefixo: ${PREFIX}${DRY_RUN ? ' | DRY-RUN' : ''}`)
  if (!DRY_RUN && !(ACCESS_KEY && SECRET_KEY)) {
    console.log('Aviso: IAM_KEY/IAM_SECRET não definidos — usando cadeia padrão de credenciais da AWS.')
  }

  try {
    const [rows] = await conn.query('SELECT id, numero, fotos, tratativas FROM desvios')
    let desviosAlterados = 0

    for (const d of rows) {
      const tag = `DEV-${String(d.numero).padStart(5, '0')}`
      let mudou = false

      const r1 = await migrarFotos(parse(d.fotos))
      const fotosFinal = r1.fotos
      if (r1.mudou) mudou = true

      const tratativas = parse(d.tratativas)
      const tratativasFinal = []
      for (const t of tratativas) {
        const r2 = await migrarFotos(t?.fotos)
        if (r2.mudou) mudou = true
        tratativasFinal.push({ ...t, fotos: r2.fotos })
      }

      if (mudou && !DRY_RUN) {
        await conn.execute(
          'UPDATE desvios SET fotos = ?, tratativas = ? WHERE id = ?',
          [JSON.stringify(fotosFinal), JSON.stringify(tratativasFinal), d.id],
        )
        desviosAlterados++
        console.log(`  ${tag}: atualizado`)
      }
    }

    console.log('\n================ RESUMO ================')
    console.log(`Fotos no Supabase encontradas: ${stats.total}`)
    console.log(`Migradas p/ S3: ${stats.migradas} | Erros: ${stats.erros} | Já fora do Supabase: ${stats.jaNoS3}`)
    if (!DRY_RUN) console.log(`Desvios atualizados no MySQL: ${desviosAlterados}`)
    else console.log('(dry-run — nada foi gravado)')
  } finally {
    await conn.end()
  }
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
