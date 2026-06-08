import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'
import { enviarAlertaEmail } from '@/lib/mail'
import type { RowDataPacket } from 'mysql2'

const VIOLACOES_SQL = `
  SELECT
    a.id, a.obra_id, a.tipo_id, a.minimo, a.emails,
    o.nome  AS obra_nome,
    t.nome  AS tipo_nome,
    (
      COALESCE((SELECT SUM(s.quantidade)  FROM res_saldos    s WHERE s.obra_id = a.obra_id AND s.tipo_id = a.tipo_id), 0)
      - COALESCE((SELECT SUM(r.quantidade) FROM res_retiradas r WHERE r.obra_id = a.obra_id AND r.tipo_id = a.tipo_id), 0)
    ) AS saldo_atual
  FROM res_alertas a
  INNER JOIN obras     o ON o.id = a.obra_id
  INNER JOIN res_tipos t ON t.id = a.tipo_id
  WHERE a.ativo = 1
`

// GET /api/residuos/check-alertas
// Retorna violações atuais sem enviar e-mails (usado pelo painel de notificações).
export async function GET() {
  try {
    const rows = await query<RowDataPacket[]>(VIOLACOES_SQL)
    const violacoes = rows
      .map(r => ({
        id:          r.id  as number,
        obra_nome:   String(r.obra_nome),
        tipo_nome:   String(r.tipo_nome),
        saldo_atual: Number(r.saldo_atual ?? 0),
        minimo:      Number(r.minimo),
      }))
      .filter(r => r.saldo_atual < r.minimo)
    return NextResponse.json({ ok: true, violacoes })
  } catch (err) {
    return NextResponse.json({ ok: false, violacoes: [] }, { status: 500 })
  }
}

// POST /api/residuos/check-alertas
// Verifica todos os alertas ativos e envia e-mails para os violados.
export async function POST() {
  try {
    const rows = await query<RowDataPacket[]>(`
      SELECT
        a.id, a.obra_id, a.tipo_id, a.minimo, a.emails,
        o.nome  AS obra_nome,
        t.nome  AS tipo_nome,
        (
          COALESCE((SELECT SUM(s.quantidade)  FROM res_saldos    s WHERE s.obra_id = a.obra_id AND s.tipo_id = a.tipo_id), 0)
          - COALESCE((SELECT SUM(r.quantidade) FROM res_retiradas r WHERE r.obra_id = a.obra_id AND r.tipo_id = a.tipo_id), 0)
        ) AS saldo_atual
      FROM res_alertas a
      INNER JOIN obras    o ON o.id = a.obra_id
      INNER JOIN res_tipos t ON t.id = a.tipo_id
      WHERE a.ativo = 1
        AND a.emails IS NOT NULL
        AND a.emails != ''
    `)

    let notificados  = 0
    let semViolacao  = 0
    const erros: string[] = []

    for (const row of rows) {
      const saldoAtual = Number(row.saldo_atual ?? 0)
      const minimo     = Number(row.minimo)

      if (saldoAtual >= minimo) { semViolacao++; continue }

      const emails = String(row.emails)
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean)

      if (!emails.length) continue

      try {
        await enviarAlertaEmail(emails, {
          obra:       String(row.obra_nome),
          tipo:       String(row.tipo_nome),
          saldoAtual,
          minimo,
        })
        notificados++
      } catch (err) {
        erros.push(`[${row.obra_nome} / ${row.tipo_nome}]: ${String(err)}`)
      }
    }

    return NextResponse.json({
      ok:          true,
      verificados: rows.length,
      notificados,
      semViolacao,
      erros:       erros.length ? erros : undefined,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
