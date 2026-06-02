import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2'
import { query } from '@/lib/mysql'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN = process.env.HSE_REPORT_TOKEN ?? 'hse-mse-2026'

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${TOKEN}`) return unauthorized()

  const { searchParams } = req.nextUrl
  const resource = searchParams.get('resource')

  try {
    if (resource === 'obras') {
      const rows = await query<RowDataPacket[]>(
        'SELECT id, nome, codigo, destinatarios FROM obras WHERE ativa = 1 ORDER BY nome'
      )
      const data = rows.map((r) => ({
        id: r.id,
        nome: r.nome,
        codigo: r.codigo,
        destinatarios: (() => {
          try { return JSON.parse(r.destinatarios) } catch { return [] }
        })(),
      }))
      return NextResponse.json({ ok: true, data })
    }

    if (resource === 'desvios') {
      const obra_id = searchParams.get('obra_id')
      if (!obra_id) {
        return NextResponse.json({ ok: false, error: 'obra_id é obrigatório' }, { status: 400 })
      }
      const dias = parseInt(searchParams.get('dias') ?? '30', 10)

      const rows = await query<RowDataPacket[]>(
        `SELECT id, numero, obra_id, obra_nome, categoria, categoria_outro,
                gravidade, status, descricao, encarregado_nome, tst_nome,
                data_ocorrencia, prazo_correcao, tratativas, criado_em, atualizado_em,
                reincidente, acao_corretiva
         FROM desvios
         WHERE obra_id = ?
           AND (
             status IN ('aberto','em_tratativa','pendente','reincidente')
             OR (
               status IN ('concluido','fechado')
               AND data_ocorrencia >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             )
           )
         ORDER BY numero DESC`,
        [obra_id, dias]
      )

      const data = rows.map((r) => ({
        ...r,
        tratativas: (() => {
          try { return JSON.parse(r.tratativas) } catch { return [] }
        })(),
        reincidente: r.reincidente === 1 || r.reincidente === true || r.reincidente === '1',
      }))

      return NextResponse.json({ ok: true, data })
    }

    return NextResponse.json({ ok: false, error: `resource desconhecido: ${resource}` }, { status: 400 })
  } catch (err) {
    console.error('[hse-report]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
