import nodemailer from 'nodemailer'
import type { DesvioComputado } from '@/types'

const MSE_RED = '#E8291C'

// ── SMTP transporter ──────────────────────────────────────────────────────────
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  })
}

// ── QuickChart helpers ────────────────────────────────────────────────────────
function quickchartUrl(config: object, w = 600, h = 280): string {
  const encoded = encodeURIComponent(JSON.stringify(config))
  return `https://quickchart.io/chart?c=${encoded}&w=${w}&h=${h}&bkg=white&f=png`
}

function chartEncarregado(data: Array<{ name: string; total: number }>): string {
  return quickchartUrl({
    type: 'horizontalBar',
    data: {
      labels: data.map(d => d.name),
      datasets: [{ data: data.map(d => d.total), backgroundColor: MSE_RED, borderRadius: 4 }],
    },
    options: {
      legend: { display: false },
      title: { display: true, text: 'Desvios por Encarregado', fontSize: 14, fontColor: '#333' },
      scales: {
        xAxes: [{ ticks: { beginAtZero: true, precision: 0 }, gridLines: { color: '#e5e5e5' } }],
        yAxes: [{ gridLines: { display: false } }],
      },
      plugins: { datalabels: { anchor: 'end', align: 'right', color: '#555', font: { weight: 'bold' } } },
    },
  }, 600, Math.max(220, data.length * 36))
}

function chartTST(data: Array<{ name: string; total: number }>): string {
  return quickchartUrl({
    type: 'horizontalBar',
    data: {
      labels: data.map(d => d.name),
      datasets: [{ data: data.map(d => d.total), backgroundColor: '#06B6D4', borderRadius: 4 }],
    },
    options: {
      legend: { display: false },
      title: { display: true, text: 'Desvios por TST', fontSize: 14, fontColor: '#333' },
      scales: {
        xAxes: [{ ticks: { beginAtZero: true, precision: 0 }, gridLines: { color: '#e5e5e5' } }],
        yAxes: [{ gridLines: { display: false } }],
      },
      plugins: { datalabels: { anchor: 'end', align: 'right', color: '#555', font: { weight: 'bold' } } },
    },
  }, 600, Math.max(200, data.length * 36))
}

function chartEvolucao(data: Array<{ mes: string; abertos: number; concluidos: number }>): string {
  return quickchartUrl({
    type: 'line',
    data: {
      labels: data.map(d => d.mes),
      datasets: [
        { label: 'Abertos', data: data.map(d => d.abertos), borderColor: MSE_RED, backgroundColor: 'rgba(232,41,28,0.08)', fill: true, tension: 0.3 },
        { label: 'Concluídos', data: data.map(d => d.concluidos), borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.3 },
      ],
    },
    options: {
      title: { display: true, text: 'Evolução Mensal', fontSize: 14, fontColor: '#333' },
      scales: {
        yAxes: [{ ticks: { beginAtZero: true, precision: 0 } }],
      },
    },
  }, 600, 260)
}

function chartStatus(data: Array<{ name: string; value: number; fill: string }>): string {
  return quickchartUrl({
    type: 'doughnut',
    data: {
      labels: data.map(d => d.name),
      datasets: [{ data: data.map(d => d.value), backgroundColor: data.map(d => d.fill) }],
    },
    options: {
      title: { display: true, text: 'Distribuição por Status', fontSize: 14, fontColor: '#333' },
      cutoutPercentage: 60,
    },
  }, 400, 300)
}

function chartGravidade(data: Array<{ name: string; total: number; fill: string }>): string {
  return quickchartUrl({
    type: 'bar',
    data: {
      labels: data.map(d => d.name),
      datasets: [{ data: data.map(d => d.total), backgroundColor: data.map(d => d.fill), borderRadius: 4 }],
    },
    options: {
      legend: { display: false },
      title: { display: true, text: 'Desvios por Gravidade', fontSize: 14, fontColor: '#333' },
      scales: { yAxes: [{ ticks: { beginAtZero: true, precision: 0 } }] },
      plugins: { datalabels: { anchor: 'end', align: 'top', color: '#555', font: { weight: 'bold' } } },
    },
  }, 500, 260)
}

function chartCategoria(data: Array<{ name: string; total: number; fill: string }>): string {
  return quickchartUrl({
    type: 'horizontalBar',
    data: {
      labels: data.map(d => d.name),
      datasets: [{ data: data.map(d => d.total), backgroundColor: data.map(d => d.fill), borderRadius: 4 }],
    },
    options: {
      legend: { display: false },
      title: { display: true, text: 'Desvios por Categoria', fontSize: 14, fontColor: '#333' },
      scales: {
        xAxes: [{ ticks: { beginAtZero: true, precision: 0 } }],
        yAxes: [{ gridLines: { display: false } }],
      },
      plugins: { datalabels: { anchor: 'end', align: 'right', color: '#555', font: { weight: 'bold' } } },
    },
  }, 600, Math.max(200, data.length * 34))
}

// ── Data computation ──────────────────────────────────────────────────────────
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const STATUS_HEX: Record<string, string> = {
  aberto: '#3B82F6', em_tratativa: '#F59E0B', pendente: '#F97316',
  concluido: '#22C55E', fechado: '#71717A', reincidente: '#EF4444',
}
const STATUS_LABEL: Record<string, string> = {
  aberto: 'Aberto', em_tratativa: 'Em Tratativa', pendente: 'Pendente',
  concluido: 'Concluído', fechado: 'Fechado', reincidente: 'Reincidente',
}
const GRAV_HEX: Record<string, string> = {
  baixo: '#10B981', medio: '#EAB308', alto: '#F97316', critico: '#EF4444',
}
const GRAV_LABEL: Record<string, string> = {
  baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico',
}
const CATEGORIAS_CORES: Record<string, string> = {
  'EPI/EPC': '#EF4444', 'Trabalho em Altura': '#F97316', 'Espaço Confinado': '#8B5CF6',
  'Eletricidade': '#EAB308', 'Içamento de Cargas': '#06B6D4', 'Ferramentas': '#84CC16',
  'Ordem e Limpeza': '#6366F1', 'Incêndio': '#DC2626', 'Veículos/Equipamentos': '#0891B2',
  'Produtos Químicos': '#7C3AED', 'Comportamental': '#DB2777', 'Documentação': '#64748B',
  'Ergonomia': '#0D9488', 'Outros': '#78716C',
}

function computeChartData(desvios: DesvioComputado[]) {
  // Evolução 6 meses
  const evolucao = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const mes = d.toISOString().slice(0, 7)
    return {
      mes: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      abertos: desvios.filter(x => x.criado_em.startsWith(mes)).length,
      concluidos: desvios.filter(x => x.atualizado_em.startsWith(mes) && ['concluido','fechado','reincidente'].includes(x.status)).length,
    }
  })

  // Status
  const statusCounts: Record<string, number> = {}
  desvios.forEach(d => {
    const key = d.status === 'reincidente' ? 'fechado' : d.status
    statusCounts[key] = (statusCounts[key] || 0) + 1
  })
  const statusData = Object.entries(statusCounts).filter(([, v]) => v > 0).map(([s, n]) => ({
    name: STATUS_LABEL[s] || s, value: n, fill: STATUS_HEX[s] || '#666',
  }))

  // Gravidade
  const gravidadeData = (['baixo','medio','alto','critico'] as const).map(g => ({
    name: GRAV_LABEL[g], total: desvios.filter(d => d.gravidade === g).length, fill: GRAV_HEX[g],
  }))

  // Encarregado
  const encCounts: Record<string, number> = {}
  desvios.forEach(d => {
    const n = d.encarregado_nome_computado
    if (n !== '—') encCounts[n] = (encCounts[n] || 0) + 1
  })
  const encData = Object.entries(encCounts)
    .map(([name, total]) => ({ name: name.length > 22 ? name.slice(0,21)+'…' : name, total }))
    .sort((a, b) => b.total - a.total).slice(0, 10)

  // TST
  const tstCounts: Record<string, number> = {}
  desvios.forEach(d => {
    const n = d.tst_nome_computado
    if (n !== '—') tstCounts[n] = (tstCounts[n] || 0) + 1
  })
  const tstData = Object.entries(tstCounts)
    .map(([name, total]) => ({ name: name.length > 22 ? name.slice(0,21)+'…' : name, total }))
    .sort((a, b) => b.total - a.total).slice(0, 10)

  // Categoria
  const catCounts: Record<string, number> = {}
  desvios.forEach(d => {
    const cat = d.categoria === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : d.categoria
    catCounts[cat] = (catCounts[cat] || 0) + 1
  })
  const catData = Object.entries(catCounts)
    .map(([name, total]) => ({
      name: name.length > 24 ? name.slice(0,23)+'…' : name, total,
      fill: CATEGORIAS_CORES[name.startsWith('Outros') ? 'Outros' : name] || '#78716C',
    }))
    .sort((a, b) => b.total - a.total)

  return { evolucao, statusData, gravidadeData, encData, tstData, catData }
}

// ── Table HTML helper ─────────────────────────────────────────────────────────
function tabelaHTML(desvios: DesvioComputado[]): string {
  const rows = desvios.map(d => {
    const isFechado = ['fechado','concluido','reincidente'].includes(d.status)
    const lastTrat = d.tratativas && d.tratativas.length > 0 ? d.tratativas[d.tratativas.length - 1] : null
    const tratText = isFechado ? (lastTrat?.acao_realizada || lastTrat?.comentario || 'Sem registro') : 'Aberto'
    const gravColors: Record<string, string> = { baixo: '#10B981', medio: '#EAB308', alto: '#F97316', critico: '#EF4444' }
    const statusColors: Record<string, string> = { aberto: '#3B82F6', em_tratativa: '#F59E0B', pendente: '#F97316', concluido: '#22C55E', fechado: '#71717A', reincidente: '#EF4444' }
    return `
      <tr style="background:${desvios.indexOf(d) % 2 === 0 ? '#fff' : '#f9fafb'}">
        <td style="padding:8px 10px;font-family:monospace;font-weight:700;color:${MSE_RED};white-space:nowrap;border-bottom:1px solid #f0f0f0">DEV-${String(d.numero).padStart(4,'0')}</td>
        <td style="padding:8px 10px;color:#666;font-size:12px;white-space:nowrap;border-bottom:1px solid #f0f0f0">${new Date(d.data_ocorrencia).toLocaleDateString('pt-BR')}</td>
        <td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #f0f0f0"><span style="color:${gravColors[d.gravidade]||'#666'};font-weight:700">${GRAV_LABEL[d.gravidade]||d.gravidade}</span></td>
        <td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #f0f0f0"><span style="color:${statusColors[d.status]||'#666'};font-weight:600">${STATUS_LABEL[d.status]||d.status}</span></td>
        <td style="padding:8px 10px;font-size:12px;color:#444;border-bottom:1px solid #f0f0f0">${d.encarregado_nome_computado !== '—' ? d.encarregado_nome_computado : '—'}</td>
        <td style="padding:8px 10px;font-size:11px;color:#555;max-width:200px;border-bottom:1px solid #f0f0f0">${d.descricao.length > 80 ? d.descricao.slice(0,79)+'…' : d.descricao}</td>
        <td style="padding:8px 10px;font-size:11px;max-width:200px;border-bottom:1px solid #f0f0f0;color:${isFechado ? '#16a34a' : '#2563eb'};font-style:${isFechado ? 'normal' : 'italic'}">${tratText.length > 80 ? tratText.slice(0,79)+'…' : tratText}</td>
      </tr>`
  }).join('')

  return `
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">
      <thead>
        <tr style="background:${MSE_RED}">
          <th style="padding:10px;color:#fff;text-align:left;font-size:12px">ID</th>
          <th style="padding:10px;color:#fff;text-align:left;font-size:12px">Data</th>
          <th style="padding:10px;color:#fff;text-align:left;font-size:12px">Gravidade</th>
          <th style="padding:10px;color:#fff;text-align:left;font-size:12px">Status</th>
          <th style="padding:10px;color:#fff;text-align:left;font-size:12px">Encarregado</th>
          <th style="padding:10px;color:#fff;text-align:left;font-size:12px">Descrição</th>
          <th style="padding:10px;color:#fff;text-align:left;font-size:12px">Tratativa</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

// ── Email HTML template ───────────────────────────────────────────────────────
export function gerarEmailHTML(params: {
  obraNome: string
  desvios: DesvioComputado[]
  driveLink?: string
}): string {
  const { obraNome, desvios, driveLink } = params
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const total = desvios.length
  const abertos = desvios.filter(d => d.status === 'aberto').length
  const fechados = desvios.filter(d => ['fechado','reincidente'].includes(d.status)).length
  const vencidos = desvios.filter(d => d.vencido).length
  const tratados = desvios.filter(d => d.status !== 'aberto').length
  const taxa = total > 0 ? Math.round((tratados / total) * 100) : 0

  const charts = computeChartData(desvios)

  const kpiCard = (valor: string | number, label: string, sub: string, cor: string) => `
    <td style="width:25%;padding:0 6px">
      <div style="background:#fff;border-radius:12px;padding:16px;text-align:center;border-top:4px solid ${cor};box-shadow:0 1px 4px rgba(0,0,0,0.06)">
        <div style="font-size:28px;font-weight:900;color:${cor};font-family:Arial,sans-serif">${valor}</div>
        <div style="font-size:13px;font-weight:700;color:#333;margin-top:4px">${label}</div>
        <div style="font-size:11px;color:#999;margin-top:2px">${sub}</div>
      </div>
    </td>`

  const chartSection = (title: string, imgUrl: string) => `
    <tr><td style="padding:0 0 24px 0">
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr><td style="padding:0 0 10px 0">
          <span style="font-size:14px;font-weight:700;color:#333;border-left:4px solid ${MSE_RED};padding-left:10px">${title}</span>
        </td></tr>
        <tr><td style="background:#fff;border-radius:8px;padding:12px;border:1px solid #f0f0f0">
          <img src="${imgUrl}" style="width:100%;max-width:100%;display:block" alt="${title}" />
        </td></tr>
      </table>
    </td></tr>`

  const encImg = charts.encData.length > 0 ? chartEncarregado(charts.encData) : ''
  const tstImg = charts.tstData.length > 0 ? chartTST(charts.tstData) : ''
  const evoImg = chartEvolucao(charts.evolucao)
  const statusImg = charts.statusData.length > 0 ? chartStatus(charts.statusData) : ''
  const gravImg = chartGravidade(charts.gravidadeData)
  const catImg = charts.catData.length > 0 ? chartCategoria(charts.catData) : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5">
<tr><td style="padding:20px 0">

  <!-- Wrapper -->
  <table width="680" cellspacing="0" cellpadding="0" align="center" style="max-width:680px;margin:0 auto">

    <!-- Header MSE -->
    <tr><td style="background:${MSE_RED};border-radius:12px 12px 0 0;padding:0">
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding:20px 28px">
            <div style="display:inline-flex;align-items:center;gap:14px">
              <span style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px">mse</span>
              <span style="color:rgba(255,255,255,0.5);font-size:20px">|</span>
              <div>
                <div style="color:#fff;font-size:15px;font-weight:700">Relatório de Desvios HSE</div>
                <div style="color:rgba(255,255,255,0.7);font-size:12px">MSE Engenharia</div>
              </div>
            </div>
          </td>
          <td style="padding:20px 28px;text-align:right;vertical-align:top">
            <div style="color:rgba(255,255,255,0.8);font-size:11px">${hoje}</div>
          </td>
        </tr>
        <tr><td colspan="2" style="padding:0 28px 20px">
          <div style="background:rgba(0,0,0,0.15);border-radius:8px;padding:10px 16px;display:inline-block">
            <span style="color:#fff;font-size:13px;font-weight:600">📍 ${obraNome}</span>
          </div>
        </td></tr>
      </table>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:#f4f4f5;padding:24px 0">
      <table width="100%" cellspacing="0" cellpadding="0">

        <!-- KPI Cards -->
        <tr><td style="padding:0 0 24px 0">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              ${kpiCard(abertos, 'Abertos', 'Aguardando tratativa', '#3B82F6')}
              ${kpiCard(fechados, 'Fechados', 'Desvios encerrados', '#22C55E')}
              ${kpiCard(vencidos, 'Vencidos', 'Prazo ultrapassado', '#F97316')}
              ${kpiCard(taxa + '%', 'Taxa Tratativa', 'Desvios respondidos', MSE_RED)}
            </tr>
          </table>
        </td></tr>

        <!-- Charts: Encarregado → TST → (tabela) → Evolução → Status → Gravidade → Categoria -->
        ${encImg ? chartSection('Desvios por Encarregado', encImg) : ''}
        ${tstImg ? chartSection('Desvios por TST', tstImg) : ''}

        <!-- Lista Completa -->
        <tr><td style="padding:0 0 24px 0">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:0 0 10px 0">
              <span style="font-size:14px;font-weight:700;color:#333;border-left:4px solid ${MSE_RED};padding-left:10px">Lista Completa de Desvios (${total} registros)</span>
            </td></tr>
            <tr><td style="background:#fff;border-radius:8px;border:1px solid #f0f0f0;overflow:hidden">
              ${tabelaHTML(desvios)}
            </td></tr>
          </table>
        </td></tr>

        ${evoImg ? chartSection('Evolução Mensal', evoImg) : ''}
        ${statusImg ? chartSection('Distribuição por Status', statusImg) : ''}
        ${gravImg ? chartSection('Desvios por Gravidade', gravImg) : ''}
        ${catImg ? chartSection('Desvios por Categoria', catImg) : ''}

        ${driveLink ? `
        <tr><td style="padding:0 0 24px 0">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="background:#fff;border-radius:10px;padding:16px 20px;border:1px solid #e5e7eb;text-align:center">
              <p style="font-size:13px;color:#666;margin:0 0 10px 0">O PDF completo deste relat&oacute;rio foi salvo no Google Drive</p>
              <a href="${driveLink}" style="display:inline-block;background:${MSE_RED};color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700">
                &#128193; Abrir no Google Drive
              </a>
            </td></tr>
          </table>
        </td></tr>` : ''}

      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#fff;border-radius:0 0 12px 12px;border-top:2px solid ${MSE_RED};padding:16px 28px">
      <table width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td><span style="font-size:13px;font-weight:900;color:${MSE_RED}">mse</span><span style="color:#999;font-size:12px;margin-left:8px">MSE Engenharia · Sistema de Gestão HSE</span></td>
          <td style="text-align:right;color:#bbb;font-size:11px">Relatório gerado automaticamente</td>
        </tr>
      </table>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`
}

// ── Send email ────────────────────────────────────────────────────────────────
export async function enviarRelatorio(params: {
  destinatarios: string[]
  obraNome: string
  desvios: DesvioComputado[]
  pdfBuffer: Buffer
  pdfNome: string
  driveLink?: string
}): Promise<void> {
  const { destinatarios, obraNome, desvios, pdfBuffer, pdfNome, driveLink } = params
  const transporter = getTransporter()
  const html = gerarEmailHTML({ obraNome, desvios, driveLink })
  const hoje = new Date()
  const dataStr = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`

  await transporter.sendMail({
    from: `"MSE Engenharia HSE" <${process.env.SMTP_USER}>`,
    to: destinatarios.join(', '),
    subject: `📋 Relatório HSE · ${obraNome} · ${dataStr}`,
    html,
    attachments: [{ filename: pdfNome, content: pdfBuffer, contentType: 'application/pdf' }],
  })
}
