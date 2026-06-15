import type { VitaAuthResponse, VitaObraConfig, VitaSyncPayload } from './types'

const VITA_API = 'https://api.vita.logon.eng.br'

// ── Configuração por obra ────────────────────────────────────────────────────
// obra_id do nosso sistema → config VITA da empresa correspondente
export const VITA_OBRA_CONFIG: Record<string, VitaObraConfig> = {
  // NN - Eletromecânica UB/SP → MSE ENGENHARIA LTDA (AFRY)
  'mpgtfln4velildphgw': {
    idempresa:            '23f78524-2d2a-41e2-bf6b-f8b3d528c885',
    idlocalizacao:        '32de4a18-06ee-44c2-a457-e255353c7a9d',
    idempregado_gestor:   'c009822b-1ca5-4af0-a515-570c9aeee3f5',
    idoperador_alteracao: '349841f3-fa2b-4024-9c6c-ccb26eb79fab',
  },
  // NN - Eletromecânica AP → MSE ENGENHARIA LTDA (NORDIKA) — localizacao: AP I, gestor: Paulo
  'mpgti8oi0eaqvgbclzfd': {
    idempresa:            'f507ecb2-3aa6-421a-a2ca-2667f00d77c6',
    idlocalizacao:        '46fc3332-7b4e-4fc0-8832-235206ffb417',
    idempregado_gestor:   'd9e4a74d-8de5-430f-bd25-b38d63a50147',
    idoperador_alteracao: '349841f3-fa2b-4024-9c6c-ccb26eb79fab',
  },
}

// ── Auth: cache de tokens por empresa ───────────────────────────────────────
// Cada empresa requer autenticação separada (token diferente por idempresa)
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getVitaToken(idempresa: string): Promise<string> {
  const cached = tokenCache.get(idempresa)
  if (cached && Date.now() < cached.expiresAt) return cached.token

  const cdoperador = process.env.VITA_CDOPERADOR
  const txsenha    = process.env.VITA_TXSENHA
  if (!cdoperador || !txsenha) {
    throw new Error('VITA_CDOPERADOR e VITA_TXSENHA não configurados no .env.local')
  }

  // Passo 1: login inicial
  const loginRes = await fetch(`${VITA_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cdoperador, txsenha }),
  })
  if (!loginRes.ok) {
    throw new Error(`VITA login falhou: ${loginRes.status} ${await loginRes.text()}`)
  }
  const loginData = await loginRes.json() as VitaAuthResponse
  if (!loginData.auth || !loginData.token) {
    throw new Error('VITA login: credenciais inválidas')
  }

  // Passo 2: selecionar empresa → token definitivo com idempresa no JWT
  const empresaRes = await fetch(`${VITA_API}/auth/empresa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`,
    },
    body: JSON.stringify({ idempresa }),
  })
  if (!empresaRes.ok) {
    throw new Error(`VITA auth/empresa falhou: ${empresaRes.status} ${await empresaRes.text()}`)
  }
  const empresaData = await empresaRes.json() as VitaAuthResponse
  if (!empresaData.auth || !empresaData.token) {
    throw new Error('VITA auth/empresa: resposta inválida')
  }

  tokenCache.set(idempresa, { token: empresaData.token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 })
  return empresaData.token
}

export async function submitVitaForm(payload: VitaSyncPayload): Promise<{ id: string }> {
  const token = await getVitaToken(payload.idempresa)

  const res = await fetch(`${VITA_API}/resposta-formulario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`VITA submit falhou: ${res.status} ${body}`)
  }

  const data = await res.json()
  return { id: data.data?.idresposta_formulario ?? data.idresposta_formulario ?? 'ok' }
}
