import 'server-only'
import crypto from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

/**
 * Armazenamento de fotos no Amazon S3 (bucket `hsemse`).
 *
 * Replica o padrão `uparArquivoSemConverter` do portalmse:
 *   - cada arquivo recebe um nome único (timestamp + aleatório) → IMUTÁVEL,
 *     nunca sobrescreve, edita ou apaga um objeto existente;
 *   - o conteúdo é enviado exatamente como recebido (sem conversão);
 *   - `ACL: public-read`, `ContentDisposition: inline`, `ContentMD5` e
 *     `ContentType` automático;
 *   - retorna a URL pública do objeto.
 *
 * Configuração via variáveis de ambiente:
 *   AWS_REGION            região do bucket (ex.: sa-east-1)
 *   S3_BUCKET             nome do bucket (padrão: hsemse)
 *   IAM_KEY / IAM_SECRET  credenciais (opcional; sem elas usa a IAM Role da EC2)
 *   S3_PREFIX             prefixo/pasta dentro do bucket (padrão: desvios-hse/fotos)
 *   S3_PUBLIC_BASE_URL    base pública opcional (ex.: domínio CloudFront)
 */

const REGION = process.env.AWS_REGION || 'sa-east-1'
const BUCKET = process.env.S3_BUCKET || 'hsemse'
const ACCESS_KEY = process.env.IAM_KEY || process.env.AWS_ACCESS_KEY_ID
const SECRET_KEY = process.env.IAM_SECRET || process.env.AWS_SECRET_ACCESS_KEY
const PREFIX = (process.env.S3_PREFIX || 'desvios-hse/fotos').replace(/^\/+|\/+$/g, '')
const PUBLIC_BASE = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '')

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', heic: 'image/heic',
  pdf: 'application/pdf',
}

// Singleton do cliente S3 (reaproveita conexões entre invocações).
const g = globalThis as typeof globalThis & { __s3Client?: S3Client }
function getClient(): S3Client {
  if (!g.__s3Client) {
    g.__s3Client = new S3Client({
      region: REGION,
      // Se as chaves não forem fornecidas, o SDK usa a cadeia padrão de
      // credenciais (IAM Role da instância EC2, ~/.aws, etc.).
      ...(ACCESS_KEY && SECRET_KEY
        ? { credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY } }
        : {}),
    })
  }
  return g.__s3Client
}

function uniqueName(ext: string): string {
  const stamp = `${Date.now()}${process.hrtime.bigint().toString()}`
  const rand = crypto.randomBytes(4).toString('hex')
  const safeExt = (ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  return `${stamp}${rand}.${safeExt}`
}

function publicUrl(key: string): string {
  const encoded = key.split('/').map(encodeURIComponent).join('/')
  if (PUBLIC_BASE) return `${PUBLIC_BASE}/${encoded}`
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encoded}`
}

/**
 * Envia um buffer ao S3 e retorna a URL pública. Objeto imutável: a chave é
 * sempre nova, então nunca há sobrescrita.
 */
export async function saveBuffer(
  buffer: Buffer,
  opts: { ext?: string; contentType?: string; prefix?: string } = {},
): Promise<string> {
  const month = new Date().toISOString().slice(0, 7)
  const filename = `${opts.prefix ?? ''}${uniqueName(opts.ext ?? 'jpg')}`
  const key = `${PREFIX}/${month}/${filename}`

  const ext = (opts.ext ?? 'jpg').toLowerCase()
  const contentType = opts.contentType || MIME_BY_EXT[ext] || 'application/octet-stream'
  const contentMD5 = crypto.createHash('md5').update(buffer).digest('base64')

  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      // ACL só é enviado se o bucket permitir ACLs (S3_ACL=public-read). Buckets
      // com "Object Ownership: Bucket owner enforced" rejeitam ACLs — nesse caso
      // o acesso público é controlado por bucket policy.
      ...(process.env.S3_ACL ? { ACL: process.env.S3_ACL as 'public-read' } : {}),
      ContentType: contentType,
      ContentMD5: contentMD5,
      ContentDisposition: 'inline',
    }),
  )

  return publicUrl(key)
}

/** Salva uma data URL base64 (`data:image/jpeg;base64,...`). */
export async function saveDataUrl(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('data URL inválida')
  const buffer = Buffer.from(match[2], 'base64')
  const mime = match[1]
  const ext = mime.split('/')[1]?.split('+')[0] || 'jpg'
  return saveBuffer(buffer, { ext, contentType: mime, prefix: 'migrado-' })
}
