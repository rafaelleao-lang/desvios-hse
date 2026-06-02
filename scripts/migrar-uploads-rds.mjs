// Migra as fotos que ainda estão no filesystem do EC2 (URLs `/uploads/...` no
// RDS) para o S3 `hsemse`, baixando-as pela URL pública de produção.
//
// Uso:
//   node scripts/migrar-uploads-rds.mjs --dry-run
//   node scripts/migrar-uploads-rds.mjs
//
// Env: DB_* (RDS) + AWS_REGION/S3_BUCKET/IAM_* ; PROD_BASE_URL (padrão abaixo).

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
const PROD_BASE = (process.env.PROD_BASE_URL || 'https://desvios.portalmse.com.br').replace(/\/+$/, '')
const REGION = process.env.AWS_REGION || 'us-east-1'
const BUCKET = process.env.S3_BUCKET || 'hsemse'
const ACCESS_KEY = process.env.IAM_KEY || process.env.AWS_ACCESS_KEY_ID
const SECRET_KEY = process.env.IAM_SECRET || process.env.AWS_SECRET_ACCESS_KEY
const PREFIX = (process.env.S3_PREFIX || 'desvios-hse/fotos').replace(/^\/+|\/+$/g, '')
const PUBLIC_BASE = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '')

const MIME_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', heic: 'image/heic', pdf: 'application/pdf' }
const s3 = new S3Client({ region: REGION, ...(ACCESS_KEY && SECRET_KEY ? { credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY } } : {}) })

const isUploads = (u) => typeof u === 'string' && u.startsWith('/uploads/')
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

const stats = { uploads: 0, migradas: 0, erros: 0 }

async function processFotos(arr) {
  if (!Array.isArray(arr)) return { fotos: arr, mudou: false }
  let mudou = false
  const out = []
  for (const f of arr) {
    if (!isUploads(f?.data_url)) { out.push(f); continue }
    stats.uploads++
    if (DRY_RUN) { out.push(f); continue }
    try {
      const nova = await uploadFromUrl(`${PROD_BASE}${f.data_url}`)
      out.push({ ...f, data_url: nova }); stats.migradas++; mudou = true
    } catch (e) { console.error(`  ! falha ${f.data_url}: ${e.message}`); stats.erros++; out.push(f) }
  }
  return { fotos: out, mudou }
}

async function main() {
  console.log(`RDS: ${process.env.DB_HOST} | origem: ${PROD_BASE} | bucket: ${BUCKET}${DRY_RUN ? ' | DRY-RUN' : ''}`)
  const rds = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, charset: 'utf8mb4',
    ...(String(process.env.DB_SSL).toLowerCase() === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  })
  try {
    const [rows] = await rds.query('SELECT id, numero, fotos, tratativas FROM desvios')
    let alterados = 0
    for (const d of rows) {
      let mudou = false
      const r1 = await processFotos(parse(d.fotos)); if (r1.mudou) mudou = true
      const trat = parse(d.tratativas); const tratFinal = []
      for (const t of trat) { const r2 = await processFotos(t?.fotos); if (r2.mudou) mudou = true; tratFinal.push({ ...t, fotos: r2.fotos }) }
      if (mudou && !DRY_RUN) {
        await rds.execute('UPDATE desvios SET fotos = ?, tratativas = ? WHERE id = ?', [JSON.stringify(r1.fotos), JSON.stringify(tratFinal), d.id])
        alterados++
      }
    }
    console.log('\n================ RESUMO (/uploads -> S3) ================')
    console.log(`URLs /uploads: ${stats.uploads} | migradas: ${stats.migradas} | erros: ${stats.erros}`)
    if (!DRY_RUN) console.log(`Desvios atualizados no RDS: ${alterados}`)
    else console.log('(dry-run — nada gravado)')
  } finally { await rds.end() }
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1) })
