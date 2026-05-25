import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeDesvio } from '@/lib/db'
import { enviarRelatorio } from '@/lib/email'
import { gerarPDFBuffer } from '@/lib/pdf-server'
import { criarPastaDodia, uploadPDF } from '@/lib/gdrive'
import type { Obra, TST, Encarregado, Desvio } from '@/types'

// Supabase admin client (usa service role para leitura server-side)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

const PADRAO_DESTINATARIOS = (process.env.EMAIL_DESTINATARIOS_PADRAO || '')
  .split(',').map(e => e.trim()).filter(Boolean)

export async function POST(req: NextRequest) {
  // Valida o token de segurança (enviado pelo cron-job.org)
  const auth = req.headers.get('authorization') || req.nextUrl.searchParams.get('token')
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    // Busca todos os dados necessários
    const [obrasRes, tstsRes, encsRes, desviosRes] = await Promise.all([
      supabase.from('obras').select('*').eq('ativa', true).order('criado_em'),
      supabase.from('tsts').select('*'),
      supabase.from('encarregados').select('*'),
      supabase.from('desvios').select('*').order('numero', { ascending: false }),
    ])

    if (obrasRes.error) throw obrasRes.error
    if (desviosRes.error) throw desviosRes.error

    const obras = (obrasRes.data || []) as Obra[]
    const tsts = (tstsRes.data || []) as TST[]
    const encarregados = (encsRes.data || []) as Encarregado[]
    const desviosRaw = (desviosRes.data || []) as Desvio[]

    // Computa todos os desvios
    const todosDesvios = desviosRaw.map(d => computeDesvio(d, obras, tsts, encarregados))

    // Cria a pasta do dia no Drive (uma só para todos os relatórios)
    let pastaId: string | null = null
    try {
      pastaId = await criarPastaDodia()
    } catch (e) {
      console.error('[Drive] Erro ao criar pasta:', e)
    }

    const hoje = new Date()
    const dataStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`
    const resultados: Array<{ obra: string; status: string; destinatarios: string[] }> = []

    // Envia um e-mail por obra ativa
    for (const obra of obras) {
      const desviosObra = todosDesvios.filter(d => d.obra_id === obra.id)

      // Se não há desvios, pula
      if (desviosObra.length === 0) {
        resultados.push({ obra: obra.nome, status: 'sem_desvios', destinatarios: [] })
        continue
      }

      const destinatarios = (obra.destinatarios && obra.destinatarios.length > 0)
        ? obra.destinatarios
        : PADRAO_DESTINATARIOS

      if (destinatarios.length === 0) {
        resultados.push({ obra: obra.nome, status: 'sem_destinatarios', destinatarios: [] })
        continue
      }

      try {
        // Gera PDF
        const pdfBuffer = await gerarPDFBuffer(desviosObra, obra.nome)
        const pdfNome = `Relatorio-HSE-${obra.codigo || 'obra'}-${dataStr}.pdf`

        // Upload no Drive
        let driveLink: string | undefined
        if (pastaId) {
          try {
            driveLink = await uploadPDF(pastaId, pdfNome, pdfBuffer)
          } catch (e) {
            console.error(`[Drive] Erro ao fazer upload para ${obra.nome}:`, e)
          }
        }

        // Envia e-mail
        await enviarRelatorio({
          destinatarios,
          obraNome: obra.nome,
          desvios: desviosObra,
          pdfBuffer,
          pdfNome,
          driveLink,
        })

        resultados.push({ obra: obra.nome, status: 'enviado', destinatarios })
      } catch (e) {
        console.error(`[Email] Erro para obra ${obra.nome}:`, e)
        resultados.push({ obra: obra.nome, status: 'erro', destinatarios })
      }
    }

    return NextResponse.json({
      ok: true,
      data: dataStr,
      pasta_drive: pastaId,
      resultados,
    })
  } catch (err) {
    console.error('[Relatório] Erro geral:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Permite GET também (facilita teste no browser)
export async function GET(req: NextRequest) {
  return POST(req)
}
