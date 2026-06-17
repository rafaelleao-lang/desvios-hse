import nodemailer from 'nodemailer'
import type { RowDataPacket } from 'mysql2'
import { query } from '@/lib/mysql'
import type { Desvio, FotoDesvio } from '@/types'

export interface AlertaPayload {
  obra:       string
  tipo:       string
  saldoAtual: number
  minimo:     number
}

export async function enviarAlertaEmail(emails: string[], payload: AlertaPayload): Promise<void> {
  if (!emails.length) return

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) throw new Error('SMTP não configurado — defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env')

  const port   = Number(process.env.SMTP_PORT ?? 587)
  const secure = port === 465

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })

  const { obra, tipo, saldoAtual, minimo } = payload
  const diferenca = minimo - saldoAtual
  const pct       = minimo > 0 ? Math.round((saldoAtual / minimo) * 100) : 0

  const barFilled = Math.max(0, Math.min(100, pct))
  const barColor  = barFilled < 40 ? '#DC2626' : barFilled < 70 ? '#F59E0B' : '#22C55E'

  await transporter.sendMail({
    from:    `"MSE Engenharia" <${user}>`,
    to:      emails.join(', '),
    subject: `⚠️ Alerta de Resíduo — ${obra}`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#7F1D1D 0%,#DC2626 100%);padding:24px 32px;">
    <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">MSE Engenharia</p>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Gestão de Resíduos · Alerta de Estoque Crítico</p>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px;">
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
      O saldo do resíduo está
      <strong style="color:#DC2626;">${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} unidade${diferenca !== 1 ? 's' : ''} abaixo</strong>
      do mínimo configurado e requer atenção imediata.
    </p>

    <!-- Tabela -->
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <tr>
        <td style="padding:10px 14px;background:#F9FAFB;border:1px solid #E5E7EB;font-weight:600;color:#6B7280;width:38%;">Obra</td>
        <td style="padding:10px 14px;border:1px solid #E5E7EB;color:#111827;font-weight:500;">${obra}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#F9FAFB;border:1px solid #E5E7EB;font-weight:600;color:#6B7280;">Resíduo</td>
        <td style="padding:10px 14px;border:1px solid #E5E7EB;color:#111827;font-weight:500;">${tipo}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#F9FAFB;border:1px solid #E5E7EB;font-weight:600;color:#6B7280;">Saldo Atual</td>
        <td style="padding:10px 14px;border:1px solid #E5E7EB;color:#DC2626;font-weight:700;font-size:18px;">
          ${saldoAtual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} un
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;background:#F9FAFB;border:1px solid #E5E7EB;font-weight:600;color:#6B7280;">Mínimo Configurado</td>
        <td style="padding:10px 14px;border:1px solid #E5E7EB;color:#111827;font-weight:500;">
          ${minimo.toLocaleString('pt-BR')} un
        </td>
      </tr>
    </table>

    <!-- Barra de progresso -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:12px;color:#6B7280;">Nível de estoque</span>
        <span style="font-size:12px;font-weight:700;color:${barColor};">${pct}% do mínimo</span>
      </div>
      <div style="height:10px;background:#F3F4F6;border-radius:999px;overflow:hidden;">
        <div style="height:100%;width:${barFilled}%;background:${barColor};border-radius:999px;"></div>
      </div>
    </div>

    <!-- Caixa de ação -->
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px 18px;margin-bottom:24px;">
      <p style="margin:0 0 6px;color:#991B1B;font-size:14px;font-weight:700;">⚠️ Ação necessária</p>
      <p style="margin:0;color:#B91C1C;font-size:13px;line-height:1.5;">
        Realize uma nova entrada deste resíduo ou revise os registros de retirada no sistema.
      </p>
    </div>

    <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.5;">
      Este é um alerta automático gerado pelo sistema MSE Engenharia · Gestão de Resíduos.<br>
      Você recebeu este e-mail porque está cadastrado como destinatário deste alerta.
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:14px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9CA3AF;">MSE Engenharia · Sistema de Gestão de Resíduos</p>
  </div>
</div>
</body>
</html>`.trim(),
  })
}

// ── Notificação de Desvio ────────────────────────────────────────────────────

function makeTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) throw new Error('SMTP não configurado — defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env')
  const port   = Number(process.env.SMTP_PORT ?? 587)
  const secure = port === 465
  return { transporter: nodemailer.createTransport({ host, port, secure, auth: { user, pass } }), user }
}

const GRAVIDADE_LABEL: Record<string, string>  = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' }
const GRAVIDADE_COLOR: Record<string, string>  = { baixo: '#10B981', medio: '#EAB308', alto: '#F97316', critico: '#EF4444' }
const GRAVIDADE_BG:    Record<string, string>  = { baixo: '#ECFDF5', medio: '#FEFCE8', alto: '#FFF7ED', critico: '#FEF2F2' }
const GRAVIDADE_BORDER: Record<string, string> = { baixo: '#A7F3D0', medio: '#FDE047', alto: '#FED7AA', critico: '#FECACA' }
const GRAVIDADE_EMOJI: Record<string, string>  = { baixo: '🟢', medio: '🟡', alto: '🟠', critico: '🔴' }

function row(label: string, value: string | undefined, highlight = false): string {
  if (!value) return ''
  return `
  <tr>
    <td style="padding:10px 14px;background:#F9FAFB;border:1px solid #E5E7EB;font-weight:600;color:#6B7280;width:36%;vertical-align:top;">${label}</td>
    <td style="padding:10px 14px;border:1px solid #E5E7EB;color:${highlight ? '#111827' : '#374151'};font-weight:${highlight ? '600' : '400'};line-height:1.5;">${value}</td>
  </tr>`
}

function formatDate(d: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return day && m && y ? `${day}/${m}/${y}` : d
}

interface FotoAnexo {
  cid:         string
  filename:    string
  content:     Buffer
  contentType: string
  isAbsolute:  false
}
interface FotoUrl {
  cid:        string
  url:        string
  isAbsolute: true
}
type FotoResolvida = FotoAnexo | FotoUrl

async function resolverFotos(fotos: FotoDesvio[]): Promise<FotoResolvida[]> {
  const MAX = 5
  const resultado: FotoResolvida[] = []

  for (const foto of fotos.slice(0, MAX)) {
    const cid = `foto-${resultado.length}`
    const dbMatch = foto.data_url.match(/^\/api\/uploads\/([^/?#]+)/)

    if (dbMatch) {
      try {
        const rows = await query<RowDataPacket[]>(
          'SELECT dados, mime FROM uploads WHERE id = ? LIMIT 1',
          [dbMatch[1]],
        )
        if (rows[0]?.dados) {
          resultado.push({
            cid,
            filename:    foto.nome || `foto-${resultado.length}.jpg`,
            content:     rows[0].dados as Buffer,
            contentType: (rows[0].mime as string) || 'image/jpeg',
            isAbsolute:  false,
          })
        }
      } catch { /* ignora foto com erro */ }
    } else if (foto.data_url.startsWith('http')) {
      resultado.push({ cid, url: foto.data_url, isAbsolute: true })
    }
  }

  return resultado
}

function renderFotosHtml(fotos: FotoResolvida[]): string {
  if (!fotos.length) return ''
  const imgs = fotos.map(f => {
    const src = f.isAbsolute ? f.url : `cid:${f.cid}`
    return `<td style="padding:4px;width:50%;vertical-align:top;">
      <img src="${src}" alt="Foto do desvio" style="width:100%;max-width:260px;border-radius:8px;border:1px solid #E5E7EB;display:block;" />
    </td>`
  })

  const rows: string[] = []
  for (let i = 0; i < imgs.length; i += 2) {
    rows.push(`<tr>${imgs[i]}${imgs[i + 1] ?? '<td></td>'}</tr>`)
  }

  return `
  <div style="padding:0 32px 24px;">
    <p style="margin:0 0 12px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
      📷 Fotos do Desvio (${fotos.length})
    </p>
    <table style="width:100%;border-collapse:collapse;">${rows.join('')}</table>
  </div>`
}

export async function enviarDesvioEmail(email: string, desvio: Desvio): Promise<void> {
  if (!email) return

  const { transporter, user } = makeTransporter()
  const fotosResolvidas = await resolverFotos(desvio.fotos ?? [])

  const gc      = desvio.gravidade
  const gLabel  = GRAVIDADE_LABEL[gc]  ?? gc
  const gColor  = GRAVIDADE_COLOR[gc]  ?? '#6B7280'
  const gBg     = GRAVIDADE_BG[gc]     ?? '#F9FAFB'
  const gBorder = GRAVIDADE_BORDER[gc] ?? '#E5E7EB'
  const gEmoji  = GRAVIDADE_EMOJI[gc]  ?? '⚪'

  const headerBg = gc === 'critico' ? 'linear-gradient(135deg,#7F1D1D 0%,#EF4444 100%)'
                 : gc === 'alto'    ? 'linear-gradient(135deg,#7C2D12 0%,#F97316 100%)'
                 : gc === 'medio'   ? 'linear-gradient(135deg,#713F12 0%,#EAB308 100%)'
                 :                    'linear-gradient(135deg,#064E3B 0%,#10B981 100%)'

  const categoria = desvio.categoria_outro
    ? `${desvio.categoria} — ${desvio.categoria_outro}`
    : desvio.categoria

  const local = [desvio.setor, desvio.local_exato].filter(Boolean).join(' › ')
  const dataHora = [formatDate(desvio.data_ocorrencia), desvio.hora_ocorrencia].filter(Boolean).join(' às ')
  const prazo    = desvio.prazo_correcao ? formatDate(desvio.prazo_correcao) : undefined

  const attachments = fotosResolvidas
    .filter((f): f is FotoAnexo => !f.isAbsolute)
    .map(f => ({ filename: f.filename, content: f.content, cid: f.cid, contentType: f.contentType }))

  await transporter.sendMail({
    from:        `"MSE Engenharia" <${user}>`,
    to:          email,
    subject:     `${gEmoji} Novo Desvio #${desvio.numero} — ${gLabel} · ${desvio.obra_nome ?? desvio.obra_id}`,
    attachments,
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

  <!-- Header -->
  <div style="background:${headerBg};padding:28px 32px 24px;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <p style="margin:0;color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">MSE Engenharia</p>
        <p style="margin:3px 0 0;color:rgba(255,255,255,0.80);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">HSE · Novo Desvio Registrado</p>
      </div>
      <div style="background:rgba(255,255,255,0.20);border-radius:8px;padding:8px 16px;text-align:center;">
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Desvio</p>
        <p style="margin:2px 0 0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-1px;">#${desvio.numero}</p>
      </div>
    </div>
  </div>

  <!-- Gravity badge -->
  <div style="background:${gBg};border-bottom:2px solid ${gBorder};padding:14px 32px;display:flex;align-items:center;gap:10px;">
    <span style="font-size:20px;">${gEmoji}</span>
    <div>
      <p style="margin:0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Gravidade</p>
      <p style="margin:2px 0 0;font-size:16px;font-weight:800;color:${gColor};">${gLabel}</p>
    </div>
    <div style="margin-left:auto;">
      <span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${gColor};color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Aberto</span>
    </div>
  </div>

  <!-- Descricao destaque -->
  <div style="padding:20px 32px 4px;">
    <p style="margin:0;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Descrição do Desvio</p>
    <p style="margin:8px 0 0;font-size:15px;color:#111827;line-height:1.65;font-style:italic;">"${desvio.descricao}"</p>
  </div>

  <!-- Tabela principal -->
  <div style="padding:20px 32px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${row('Obra',          desvio.obra_nome ?? desvio.obra_id, true)}
      ${row('Categoria',     categoria, true)}
      ${row('Local',         local)}
      ${row('Data / Hora',   dataHora)}
      ${row('Colaborador',   desvio.colaborador_nome)}
      ${row('Encarregado',   desvio.encarregado_nome)}
      ${row('TST',           desvio.tst_nome)}
      ${row('Coordenador',   desvio.coordenador_nome)}
      ${row('Prazo de Correção', prazo)}
      ${row('Ação Corretiva', desvio.acao_corretiva)}
      ${row('Ação Preventiva', desvio.acao_preventiva)}
      ${row('Reincidente',   desvio.reincidente ? '⚠️ Sim — colaborador já recebeu desvio anterior' : undefined)}
    </table>
  </div>

  ${renderFotosHtml(fotosResolvidas)}

  ${gc === 'critico' || gc === 'alto' ? `
  <!-- Alerta urgente -->
  <div style="margin:0 32px 20px;background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px 20px;">
    <p style="margin:0 0 5px;color:#991B1B;font-size:14px;font-weight:700;">⚡ Atenção imediata necessária</p>
    <p style="margin:0;color:#B91C1C;font-size:13px;line-height:1.5;">
      ${gc === 'critico'
        ? 'Este desvio é <strong>Crítico</strong> — risco imediato à vida. Avalie a necessidade de paralisar a atividade até a correção.'
        : 'Este desvio tem gravidade <strong>Alta</strong> — risco significativo. Providencie correção com urgência.'}
    </p>
  </div>` : ''}

  <!-- Rodapé info -->
  <div style="padding:0 32px 24px;">
    <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
      Aberto por <strong>${desvio.aberto_por}</strong> em ${dataHora}.<br>
      Você recebe este e-mail por ser o coordenador responsável pela obra.
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:14px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9CA3AF;">MSE Engenharia · Sistema de Gestão HSE</p>
  </div>

</div>
</body>
</html>`.trim(),
  })
}
