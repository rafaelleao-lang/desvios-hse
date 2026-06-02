// Atualiza as URLs das fotos no RDS (produção) para apontarem ao S3 `hsemse`.
//
// Estratégia eficiente e SEM duplicar objetos no S3:
//   1) Lê o MySQL LOCAL (já migrado) e monta um mapa { foto.id -> url_S3 }.
//   2) No RDS, para cada foto que ainda aponta ao Supabase Storage:
//        - se o id existir no mapa local -> reaproveita a URL do S3 (não reenvia);
//        - senão (fallback) -> baixa do Supabase e envia ao S3 com chave nova.
//   3) Atualiza desvios no RDS. Idempotente; mantém a original em caso de falha.
//
// Conexões:
//   - RDS (destino): variáveis DB_* do .env.local
//   - Local (origem do mapa): LOCAL_DB_* (padrões: 127.0.0.1 / root / 123456 / desvios)
//
// Uso:
//   node scripts/migrar-fotos-rds.mjs --dry-run   (só relatório)
//   node scripts/migrar-fotos-rds.mjs             (executa)

import { readFileSync } from 'fs'
import crypto from 'crypto'
import mysql from 'mysql2/promise'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

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
const REGION = process.env.AWS_REGION || 'us-east-1'
const BUCKET = process.env.S3_BUCKET || 'hsemse'
const ACCESS_KEY = process.env.IAM_KEY || process.env.AWS_ACCESS_KEY_ID
const SECRET_KEY = process.env.IAM_SECRET || process.env.AWS_SECRET_ACCESS_KEY
const PREFIX = (process.env.S3_PREFIX || 'desvios-hse/fotos').replace(/^\/+|\/+$/g, '')
const PUBLIC_BASE = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '')

const MIME_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', heic: 'image/heic', pdf: 'application/pdf' }
const s3 = new S3Client({ region: REGION, ...(ACCESS_KEY && SECRET_KEY ? { credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY } } : {}) })

const isSupabase = (u) => typeof u === 'string' && u.includes('supabase.co/storage')
const isS3 = (u) => typeof u === 'string' && (u.includes(`${BUCKET}.s3.`) || (PUBLIC_BASE && u.startsWith(PUBLIC_BASE)))
const parse = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : v || [] } catch { return [] } }
const publicUrl = (key) => { const e = key.split('/').map(encodeURIComponent).join('/'); return PUBLIC_BASE ? `${PUBLIC_BASE}/${e}` : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${e}` }
const uniqueName = (ext) => `${Date.now()}${process.hrtime.bigint().toString()}${crypto.randomBytes(4).toString('hex')}.${(ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'}`
const extFromUrl = (u) => { const e = u.split('?')[0].split('.').pop()?.toLowerCase(); return e && e.length <= 5 ? e : 'jpg' }

async function uploadFromUrl(sourceUrl) {
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`download HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const ext = extFromUrl(sourceUrl)
  const month = new Date().toISOString().slice(0, 7)
  const key = `${PREFIX}/${month}/migrado-${uniqueName(ext)}`
  const contentType = res.headers.get('content-type') || MIME_BY_EXT[ext] || 'application/octet-stream'
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: buffer,
    ...(process.env.S3_ACL ? { ACL: process.env.S3_ACL } : {}),
    ContentType: contentType, ContentMD5: crypto.createHash('md5').update(buffer).digest('base64'), ContentDisposition: 'inline',
  }))
  return publicUrl(key)
}

async function buildLocalMap() {
  const conn = await mysql.createConnection({
    host: process.env.LOCAL_DB_HOST || '127.0.0.1',
    port: Number(process.env.LOCAL_DB_PORT || 3306),
    user: process.env.LOCAL_DB_USER || 'root',
    password: process.env.LOCAL_DB_PASSWORD ?? '123456',
    database: process.env.LOCAL_DB_NAME || 'desvios',
    charset: 'utf8mb4',
  })
  const map = new Map()
  try {
    const [rows] = await conn.query('SELECT fotos, tratativas FROM desvios')
    const add = (arr) => { for (const f of arr || []) { if (f?.id && isS3(f.data_url)) map.set(f.id, f.data_url) } }
    for (const d of rows) { add(parse(d.fotos)); for (const t of parse(d.tratativas)) add(t?.fotos) }
  } finally { await conn.end() }
  return map
}

const stats = { supabase: 0, reaproveitadas: 0, fallback: 0, erros: 0, jaS3: 0, outras: 0 }

async function processFotos(arr, localMap) {
  if (!Array.isArray(arr)) return { fotos: arr, mudou: false }
  let mudou = false
  const out = []
  for (const f of arr) {
    const u = f?.data_url
    if (isS3(u)) { stats.jaS3++; out.push(f); continue }
    if (!isSupabase(u)) { if (u) stats.outras++; out.push(f); continue }
    stats.supabase++
    if (DRY_RUN) { if (localMap.has(f.id)) stats.reaproveitadas++; else stats.fallback++; out.push(f); continue }
    try {
      const nova = localMap.get(f.id) ?? await uploadFromUrl(u)
      if (localMap.has(f.id)) stats.reaproveitadas++; else stats.fallback++
      out.push({ ...f, data_url: nova }); mudou = true
    } catch (e) { console.error(`  ! falha ${f.id}: ${e.message}`); stats.erros++; out.push(f) }
  }
  return { fotos: out, mudou }
}

async function main() {
  console.log(`RDS destino: ${process.env.DB_HOST} | Bucket: ${BUCKET} (${REGION})${DRY_RUN ? ' | DRY-RUN' : ''}`)
  const localMap = await buildLocalMap()
  console.log(`Mapa local carregado: ${localMap.size} fotos com URL no S3.`)

  const rds = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    ...(String(process.env.DB_SSL).toLowerCase() === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  })

  try {
    const [rows] = await rds.query('SELECT id, numero, fotos, tratativas FROM desvios')
    console.log(`Desvios no RDS: ${rows.length}`)
    let alterados = 0
    for (const d of rows) {
      let mudou = false
      const r1 = await processFotos(parse(d.fotos), localMap)
      if (r1.mudou) mudou = true
      const trat = parse(d.tratativas)
      const tratFinal = []
      for (const t of trat) { const r2 = await processFotos(t?.fotos, localMap); if (r2.mudou) mudou = true; tratFinal.push({ ...t, fotos: r2.fotos }) }
      if (mudou && !DRY_RUN) {
        await rds.execute('UPDATE desvios SET fotos = ?, tratativas = ? WHERE id = ?', [JSON.stringify(r1.fotos), JSON.stringify(tratFinal), d.id])
        alterados++
      }
    }
    console.log('\n================ RESUMO (RDS) ================')
    console.log(`Fotos no Supabase: ${stats.supabase} | reaproveitadas do S3: ${stats.reaproveitadas} | fallback(download): ${stats.fallback} | erros: ${stats.erros}`)
    console.log(`Já no S3: ${stats.jaS3} | outras URLs (ex: /uploads): ${stats.outras}`)
    if (!DRY_RUN) console.log(`Desvios atualizados no RDS: ${alterados}`)
    else console.log('(dry-run — nada gravado)')
  } finally { await rds.end() }
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
