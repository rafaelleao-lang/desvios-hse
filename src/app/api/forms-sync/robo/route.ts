import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import type { RowDataPacket } from 'mysql2'
import { query } from '@/lib/mysql'
import { OBRAS_NN_IDS } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)
const BOT_DIR = path.join(process.cwd(), 'bot-forms-sync')

// Botão "ROBO" da tela de Inspeções: dispara manualmente o mesmo bot Playwright
// que roda agendado (bot-forms-sync/sync.ts), apontando pro próprio servidor
// que atendeu a requisição — útil enquanto o Agendador de Tarefas de produção
// não está configurado.
export async function GET() {
  try {
    const placeholders = OBRAS_NN_IDS.map(() => '?').join(',')
    const rows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
         FROM inspecao_evidencias ie
         JOIN inspecoes i ON i.id = ie.inspecao_id
        WHERE ie.forms_status = 'pendente' AND i.obra_id IN (${placeholders})`,
      [...OBRAS_NN_IDS],
    )
    return NextResponse.json({ ok: true, pendentes: Number(rows[0]?.total ?? 0) })
  } catch (err) {
    console.error('[forms-sync/robo][GET]', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { stdout } = await execAsync('npx tsx sync.ts', {
      cwd: BOT_DIR,
      env: {
        ...process.env,
        API_BASE_URL: req.nextUrl.origin,
        FORMS_SYNC_TOKEN: process.env.FORMS_SYNC_TOKEN ?? 'forms-sync-mse-2026',
        SAR_FORM_URL:
          process.env.SAR_FORM_URL ??
          'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=mWQZ5UWiOUSA7Ovoq8PsrHyayMJUjmdJisz419cHuwRUN0lTWE03VUVKSUZKSlg1U0tBRVBCSFlYNS4u&origin=QRCode',
        DRY_RUN: 'false',
      },
      timeout: 5 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
    })

    const match = stdout.match(/Concluído: (\d+) enviado\(s\), (\d+) falha\(s\)\./)
    return NextResponse.json({
      ok: true,
      enviados: match ? Number(match[1]) : 0,
      falhas: match ? Number(match[2]) : 0,
      log: stdout,
    })
  } catch (err) {
    const stdout = (err as { stdout?: string })?.stdout ?? ''
    const stderr = (err as { stderr?: string })?.stderr
    console.error('[forms-sync/robo][POST]', err)
    return NextResponse.json(
      { ok: false, error: stderr || (err instanceof Error ? err.message : 'Erro interno'), log: stdout },
      { status: 500 },
    )
  }
}
