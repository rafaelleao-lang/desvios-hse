/**
 * Bot de sincronização: pega evidências pendentes no app Desvios HSE e
 * preenche/envia uma a uma no forms SAR (Microsoft Forms) do cliente Novo
 * Nordisk. Roda via Agendador de Tarefas do Windows:
 *   npx tsx sync.ts
 *
 * O SAR é anônimo (sem login) — não há sessão pra manter entre execuções.
 * Cada evidência pendente vira UMA resposta no forms (1:1).
 */

import 'dotenv/config'
import { chromium, type Page, type Locator } from 'playwright'

const API_BASE_URL = requireEnv('API_BASE_URL')
const FORMS_SYNC_TOKEN = requireEnv('FORMS_SYNC_TOKEN')
const SAR_FORM_URL = requireEnv('SAR_FORM_URL')
// DRY_RUN=true preenche o forms mas NÃO clica em Enviar e NÃO marca a evidência
// como enviada — usado só para validar a automação sem gerar resposta real.
const DRY_RUN = process.env.DRY_RUN === 'true'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Variável de ambiente ${name} não configurada (veja .env.example)`)
  return v
}

interface Pendente {
  evidencia_id: string
  nome_completo: string
  empresa: string
  local: string
  subcategoria_local: string
  empresa_situacao_identificada: string
  origem: string
  disciplina: string[]
  risco_associado: string
  descreva_o_que_viu: string
  descreva_acoes_tomadas: string
  eliminou_risco: boolean
  obra_nome: string
  data_inspecao: string
}

async function fetchPendentes(): Promise<Pendente[]> {
  const res = await fetch(`${API_BASE_URL}/api/forms-sync?resource=pendentes`, {
    headers: { Authorization: `Bearer ${FORMS_SYNC_TOKEN}` },
  })
  if (!res.ok) throw new Error(`GET /api/forms-sync falhou: ${res.status} ${await res.text()}`)
  const json = await res.json()
  if (!json.ok) throw new Error(`GET /api/forms-sync retornou erro: ${json.error}`)
  return json.data as Pendente[]
}

async function marcarResultado(evidenciaId: string, status: 'enviado' | 'erro', erro?: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/forms-sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${FORMS_SYNC_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidencia_id: evidenciaId, status, erro }),
  })
  if (!res.ok) console.error(`POST /api/forms-sync falhou pra ${evidenciaId}: ${res.status} ${await res.text()}`)
}

// Cada pergunta do SAR é um bloco [data-automation-id="questionItem"] com dois
// filhos: o título (id="QuestionId_...", só o texto/número da pergunta) e um
// irmão com o controle de resposta em si (input/botão/rádio/checkbox) — por
// isso o container tem que ser o "questionItem", não o QuestionId_ direto.
// A Nth pergunta (1-indexado) é identificada pelo texto do título começar com
// "N." (resiliente a pequenas mudanças de layout, não depende de índice bruto).
async function getQuestionContainer(page: Page, numero: number): Promise<Locator> {
  const items = page.locator('[data-automation-id="questionItem"]')
  const count = await items.count()
  for (let i = 0; i < count; i++) {
    const el = items.nth(i)
    const text = (await el.innerText()).trim()
    if (text.startsWith(`${numero}.`)) return el
  }
  throw new Error(`Não encontrei a pergunta ${numero} no forms — o layout pode ter mudado.`)
}

async function fillTextbox(container: Locator, value: string): Promise<void> {
  await container.locator('input, textarea').first().fill(value)
}

async function selectDropdown(page: Page, container: Locator, optionText: string): Promise<void> {
  await container.getByRole('button').first().click()
  const option = page.getByRole('option', { name: optionText, exact: true })
  await option.waitFor({ state: 'visible', timeout: 5000 })
  await option.click()
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function selectRadio(container: Locator, label: string): Promise<void> {
  await container.getByRole('radio', { name: new RegExp('^' + escapeRegex(label)) }).click()
}

async function toggleCheckboxes(container: Locator, labels: string[]): Promise<void> {
  for (const label of labels) {
    await container.getByRole('checkbox', { name: new RegExp('^' + escapeRegex(label)) }).click()
  }
}

async function preencherEEnviar(page: Page, item: Pendente): Promise<void> {
  await page.goto(SAR_FORM_URL, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Enviar' }).waitFor({ state: 'visible', timeout: 15000 })

  await fillTextbox(await getQuestionContainer(page, 1), item.nome_completo || 'MSE')
  await selectDropdown(page, await getQuestionContainer(page, 2), item.empresa)
  await selectDropdown(page, await getQuestionContainer(page, 3), item.local)
  await fillTextbox(await getQuestionContainer(page, 4), item.subcategoria_local || '-')
  await selectDropdown(page, await getQuestionContainer(page, 5), item.empresa_situacao_identificada)
  await selectRadio(await getQuestionContainer(page, 6), item.origem)
  await toggleCheckboxes(await getQuestionContainer(page, 7), item.disciplina)
  await selectDropdown(page, await getQuestionContainer(page, 8), item.risco_associado)
  await fillTextbox(await getQuestionContainer(page, 9), item.descreva_o_que_viu || '-')
  await fillTextbox(await getQuestionContainer(page, 10), item.descreva_acoes_tomadas || '-')
  await selectRadio(await getQuestionContainer(page, 11), item.eliminou_risco ? 'Sim' : 'Não')

  if (DRY_RUN) {
    const resumo = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-automation-id="questionItem"]'))
      return items.map(el => {
        const titulo = (el.querySelector('[data-automation-id="questionTitle"]')?.textContent || '').trim()
        const input = el.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null
        const selecionados = Array.from(el.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked'))
          .map(i => i.closest('label')?.textContent?.trim() || i.getAttribute('aria-label'))
        const botoes = Array.from(el.querySelectorAll('[role="button"]')).map(b => b.textContent?.trim())
        return { titulo, valor: input?.value, selecionados, botoes }
      })
    })
    console.log(`[DRY_RUN] ${item.evidencia_id}:`)
    console.log(JSON.stringify(resumo, null, 1))
    return
  }

  await page.getByRole('button', { name: 'Enviar' }).click()
  // MS Forms mostra uma tela de confirmação após o envio
  await page.getByText(/Sua resposta foi enviada|Obrigado/i).waitFor({ state: 'visible', timeout: 15000 })
}

async function main() {
  const pendentes = await fetchPendentes()
  console.log(`${pendentes.length} evidência(s) pendente(s) de sincronização.`)
  if (pendentes.length === 0) return

  const browser = await chromium.launch({ headless: true })
  // O forms SAR renderiza os textos de UI (botão "Enviar", "Obrigatória" etc.)
  // conforme o locale do navegador — sem isso, carrega em inglês ("Submit").
  const context = await browser.newContext({ locale: 'pt-BR' })
  const page = await context.newPage()

  let enviados = 0
  let falhas = 0
  for (const item of pendentes) {
    try {
      await preencherEEnviar(page, item)
      if (!DRY_RUN) {
        await marcarResultado(item.evidencia_id, 'enviado')
        enviados++
        console.log(`✅ ${item.evidencia_id} (${item.obra_nome}) enviado.`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!DRY_RUN) await marcarResultado(item.evidencia_id, 'erro', msg)
      falhas++
      console.error(`❌ ${item.evidencia_id} falhou: ${msg}`)
    }
  }

  await browser.close()
  console.log(`Concluído: ${enviados} enviado(s), ${falhas} falha(s).`)
}

main().catch(err => {
  console.error('Erro fatal no bot de sincronização:', err)
  process.exit(1)
})
