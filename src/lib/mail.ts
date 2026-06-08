import nodemailer from 'nodemailer'

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
