import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2'
import { query } from '@/lib/mysql'
import { inspecoesRepo } from '@/lib/server/repo'
import { enviarAlertaFormsSyncEmail } from '@/lib/mail'
import { OBRAS_NN_IDS, ORIGENS_SAR_PADRAO, parseCategoria } from '@/types'
import type { StatusEnvioForms, OrigemSar } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN = process.env.FORMS_SYNC_TOKEN ?? 'forms-sync-mse-2026'

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${TOKEN}`
}

const ORIGEM_LABELS: Record<OrigemSar, string> = Object.fromEntries(
  ORIGENS_SAR_PADRAO.map(o => [o.value, o.label]),
) as Record<OrigemSar, string>

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized()

  const { searchParams } = req.nextUrl
  const resource = searchParams.get('resource')

  try {
    if (resource === 'pendentes') {
      const placeholders = OBRAS_NN_IDS.map(() => '?').join(',')
      const rows = await query<RowDataPacket[]>(
        `SELECT
           ie.id AS evidencia_id, ie.tipo, ie.local, ie.subcategoria_local, ie.origem,
           ie.disciplina, ie.risco_associado, ie.descricao, ie.acoes_tomadas,
           ie.eliminou_risco, ie.criado_em,
           i.obra_id, i.obra_nome, i.tst_nome, i.coordenador_nome, i.data_inspecao
         FROM inspecao_evidencias ie
         JOIN inspecoes i ON i.id = ie.inspecao_id
         WHERE ie.forms_status = 'pendente' AND i.obra_id IN (${placeholders})
         ORDER BY ie.criado_em ASC`,
        [...OBRAS_NN_IDS],
      )

      const data = rows.map(r => ({
        evidencia_id: r.evidencia_id as string,
        // Campos do forms SAR (See - Act - Report), já resolvidos pro bot preencher 1:1
        nome_completo: r.tst_nome || r.coordenador_nome || '',
        empresa: 'MSE',
        local: r.local as string,
        subcategoria_local: r.subcategoria_local as string,
        empresa_situacao_identificada: 'MSE',
        origem: ORIGEM_LABELS[r.origem as OrigemSar] ?? '',
        disciplina: parseCategoria(r.disciplina),
        risco_associado: r.risco_associado as string,
        descreva_o_que_viu: r.descricao as string,
        descreva_acoes_tomadas: r.acoes_tomadas as string,
        eliminou_risco: r.eliminou_risco === 1 || r.eliminou_risco === true,
        // Contexto (não é campo do forms, útil pro log do bot)
        obra_nome: r.obra_nome as string,
        data_inspecao: r.data_inspecao as string,
      }))
      return NextResponse.json({ ok: true, data })
    }

    return NextResponse.json({ ok: false, error: `resource desconhecido: ${resource}` }, { status: 400 })
  } catch (err) {
    console.error('[forms-sync]', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized()

  try {
    const body = await req.json().catch(() => null) as { evidencia_id?: string; status?: StatusEnvioForms; erro?: string } | null
    if (!body?.evidencia_id || (body.status !== 'enviado' && body.status !== 'erro')) {
      return NextResponse.json({ ok: false, error: 'evidencia_id e status ("enviado"|"erro") são obrigatórios' }, { status: 400 })
    }
    await inspecoesRepo.marcarEnvioForms(body.evidencia_id, { status: body.status, erro: body.erro })
    if (body.status === 'erro') {
      enviarAlertaFormsSyncEmail(body.evidencia_id, body.erro ?? 'Erro desconhecido').catch(
        e => console.error('[forms-sync] falha ao enviar alerta por email:', e),
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[forms-sync]', err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
