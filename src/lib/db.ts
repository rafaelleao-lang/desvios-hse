import type { Obra, TST, Encarregado, Coordenador, Desvio, DesvioComputado, StatusDesvio, GravidadeDesvio, Tratativa, IndicadorSemanal } from '@/types'
import { parseCategoria } from '@/types'

// ── Cliente RPC para o backend MySQL ────────────────────────────────────────────
// Conexões MySQL só existem no servidor; toda operação de dados passa pela rota
// /api/db, que executa o repositório server-side (src/lib/server/repo.ts).
async function rpc<T>(resource: string, action: string, ...args: unknown[]): Promise<T> {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource, action, args }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Falha na operação ${resource}.${action}`)
  }
  return json.data as T
}

// ── Obras ─────────────────────────────────────────────────────────────────────
export const obrasDB = {
  list: (): Promise<Obra[]> => rpc('obras', 'list'),
  find: (id: string): Promise<Obra | undefined> => rpc('obras', 'find', id),
  create: (data: Omit<Obra, 'id' | 'criado_em'>): Promise<Obra> => rpc('obras', 'create', data),
  update: (id: string, data: Partial<Obra>): Promise<Obra | undefined> => rpc('obras', 'update', id, data),
  delete: (id: string): Promise<void> => rpc('obras', 'delete', id),
}

// ── TSTs ──────────────────────────────────────────────────────────────────────
export const tstsDB = {
  list: (): Promise<TST[]> => rpc('tsts', 'list'),
  byObra: (obraId: string): Promise<TST[]> => rpc('tsts', 'byObra', obraId),
  activeByObra: (obraId: string): Promise<TST[]> => rpc('tsts', 'activeByObra', obraId),
  find: (id: string): Promise<TST | undefined> => rpc('tsts', 'find', id),
  create: (data: Omit<TST, 'id' | 'criado_em'>): Promise<TST> => rpc('tsts', 'create', data),
  update: (id: string, data: Partial<Pick<TST, 'nome' | 'crea' | 'telefone'>>): Promise<void> =>
    rpc('tsts', 'update', id, data),
  toggleAtivo: (id: string): Promise<void> => rpc('tsts', 'toggleAtivo', id),
  delete: (id: string): Promise<void> => rpc('tsts', 'delete', id),
}

// ── Encarregados ──────────────────────────────────────────────────────────────
export const encarregadosDB = {
  list: (): Promise<Encarregado[]> => rpc('encarregados', 'list'),
  byObra: (obraId: string): Promise<Encarregado[]> => rpc('encarregados', 'byObra', obraId),
  activeByObra: (obraId: string): Promise<Encarregado[]> => rpc('encarregados', 'activeByObra', obraId),
  find: (id: string): Promise<Encarregado | undefined> => rpc('encarregados', 'find', id),
  create: (data: Omit<Encarregado, 'id' | 'criado_em'>): Promise<Encarregado> =>
    rpc('encarregados', 'create', data),
  update: (id: string, data: Partial<Pick<Encarregado, 'nome' | 'setor' | 'telefone'>>): Promise<void> =>
    rpc('encarregados', 'update', id, data),
  toggleAtivo: (id: string): Promise<void> => rpc('encarregados', 'toggleAtivo', id),
  delete: (id: string): Promise<void> => rpc('encarregados', 'delete', id),
}

// ── Coordenadores ─────────────────────────────────────────────────────────────
export const coordenadoresDB = {
  list: (): Promise<Coordenador[]> => rpc('coordenadores', 'list'),
  byObra: (obraId: string): Promise<Coordenador[]> => rpc('coordenadores', 'byObra', obraId),
  activeByObra: (obraId: string): Promise<Coordenador[]> => rpc('coordenadores', 'activeByObra', obraId),
  find: (id: string): Promise<Coordenador | undefined> => rpc('coordenadores', 'find', id),
  create: (data: Omit<Coordenador, 'id' | 'criado_em'>): Promise<Coordenador> =>
    rpc('coordenadores', 'create', data),
  update: (id: string, data: Partial<Pick<Coordenador, 'nome' | 'email' | 'telefone'>>): Promise<void> =>
    rpc('coordenadores', 'update', id, data),
  toggleAtivo: (id: string): Promise<void> => rpc('coordenadores', 'toggleAtivo', id),
  delete: (id: string): Promise<void> => rpc('coordenadores', 'delete', id),
}

// ── Desvios ───────────────────────────────────────────────────────────────────
export const desviosDB = {
  list: (): Promise<Desvio[]> => rpc('desvios', 'list'),
  find: (id: string): Promise<Desvio | undefined> => rpc('desvios', 'find', id),
  create: (
    data: Omit<Desvio, 'id' | 'numero' | 'criado_em' | 'atualizado_em' | 'historico_status'>
  ): Promise<Desvio> => rpc('desvios', 'create', data),
  update: (id: string, data: Partial<Desvio>): Promise<Desvio | undefined> =>
    rpc('desvios', 'update', id, data),
  updateStatus: (
    id: string, status: StatusDesvio, por: string, observacao?: string
  ): Promise<Desvio | undefined> => rpc('desvios', 'updateStatus', id, status, por, observacao),
  addTratativa: (
    id: string, tratativa: Omit<Tratativa, 'id' | 'criado_em'>
  ): Promise<Desvio | undefined> => rpc('desvios', 'addTratativa', id, tratativa),
  delete: (id: string): Promise<void> => rpc('desvios', 'delete', id),
}

// ── Computed / Analytics ──────────────────────────────────────────────────────
export function computeDesvio(d: Desvio, obras: Obra[], tsts: TST[], encarregados: Encarregado[], coordenadores: Coordenador[]): DesvioComputado {
  const hoje = new Date()
  const criado = new Date(d.criado_em)
  const dias_aberto = Math.floor((hoje.getTime() - criado.getTime()) / 86400000)

  let vencido = false
  let dias_para_vencer: number | null = null

  if (d.prazo_correcao) {
    // Parse as local date to avoid UTC offset shifting the day (e.g. BRT = UTC-3)
    const [py, pm, pd] = d.prazo_correcao.split('T')[0].split('-').map(Number)
    const prazo = new Date(py, pm - 1, pd)
    const hojeOnly = new Date(hoje)
    hojeOnly.setHours(0, 0, 0, 0)
    const diff = Math.round((prazo.getTime() - hojeOnly.getTime()) / 86400000)
    dias_para_vencer = diff
    vencido = diff < 0 && !['concluido', 'fechado', 'reincidente'].includes(d.status)
  }

  const obra = obras.find(o => o.id === d.obra_id)
  const enc = encarregados.find(e => e.id === d.encarregado_id)
  const tst = tsts.find(t => t.id === d.tst_id)
  const coord = coordenadores.find(c => c.id === d.coordenador_id)

  return {
    ...d,
    vencido,
    dias_para_vencer,
    dias_aberto,
    obra_nome_computado: obra?.nome || d.obra_nome || '—',
    encarregado_nome_computado: enc?.nome || d.encarregado_nome || '—',
    tst_nome_computado: tst?.nome || d.tst_nome || '—',
    coordenador_nome_computado: coord?.nome || d.coordenador_nome || '—',
    categorias: parseCategoria(d.categoria),
  }
}

export function computeStats(desvios: Desvio[], obras: Obra[], tsts: TST[], encarregados: Encarregado[], coordenadores: Coordenador[] = []) {
  const computed = desvios.map(d => computeDesvio(d, obras, tsts, encarregados, coordenadores))
  const total = computed.length
  const abertos = computed.filter(d => d.status === 'aberto').length
  const em_tratativa = computed.filter(d => d.status === 'em_tratativa').length
  const concluidos = computed.filter(d => d.status === 'concluido').length
  const fechados = computed.filter(d => d.status === 'fechado').length
  const criticos = computed.filter(d => d.gravidade === 'critico').length
  const vencidos = computed.filter(d => d.vencido).length
  const reincidentes = computed.filter(d => d.reincidente).length
  const pendentes = computed.filter(d => d.status === 'pendente').length

  const fechadosCompletos = computed.filter(d => ['concluido', 'fechado'].includes(d.status))
  const tempo_medio = fechadosCompletos.length > 0
    ? Math.round(fechadosCompletos.reduce((s, d) => s + d.dias_aberto, 0) / fechadosCompletos.length)
    : 0

  const tratados = computed.filter(d => !['aberto'].includes(d.status)).length
  const taxa_tratativa = total > 0 ? Math.round((tratados / total) * 1000) / 10 : 0

  return {
    total, abertos, em_tratativa, concluidos, fechados, criticos,
    vencidos, reincidentes, pendentes,
    tempo_medio_fechamento: tempo_medio,
    taxa_tratativa,
  }
}

// ── Filters & Reports ─────────────────────────────────────────────────────────
export interface FiltrosRelatorio {
  obra_id?: string
  tst_id?: string
  encarregado_id?: string
  coordenador_id?: string
  gravidade?: GravidadeDesvio
  status?: StatusDesvio
  categoria?: string
  data_inicio?: string
  data_fim?: string
  vencido?: boolean
  busca?: string
}

export function filtrarDesvios(desvios: DesvioComputado[], f: FiltrosRelatorio): DesvioComputado[] {
  return desvios.filter(d => {
    if (f.obra_id && d.obra_id !== f.obra_id) return false
    if (f.tst_id && d.tst_id !== f.tst_id) return false
    if (f.encarregado_id && d.encarregado_id !== f.encarregado_id) return false
    if (f.coordenador_id && d.coordenador_id !== f.coordenador_id) return false
    if (f.gravidade && d.gravidade !== f.gravidade) return false
    if (f.status && d.status !== f.status) return false
    if (f.categoria && !d.categorias.includes(f.categoria)) return false
    if (f.data_inicio && d.data_ocorrencia < f.data_inicio) return false
    if (f.data_fim && d.data_ocorrencia > f.data_fim) return false
    if (f.vencido !== undefined && d.vencido !== f.vencido) return false
    if (f.busca) {
      const q = f.busca.toLowerCase()
      const match =
        d.descricao.toLowerCase().includes(q) ||
        d.local_exato.toLowerCase().includes(q) ||
        d.obra_nome_computado.toLowerCase().includes(q) ||
        d.encarregado_nome_computado.toLowerCase().includes(q) ||
        d.tst_nome_computado.toLowerCase().includes(q) ||
        d.coordenador_nome_computado.toLowerCase().includes(q) ||
        d.aberto_por.toLowerCase().includes(q) ||
        String(d.numero).includes(q)
      if (!match) return false
    }
    return true
  })
}

// ── CSV Export ────────────────────────────────────────────────────────────────
export function exportarCSV(desvios: DesvioComputado[]): void {
  const SEP = ';'
  const headers = [
    'Número', 'Data', 'Hora', 'Obra', 'Categoria', 'Setor', 'Local Exato',
    'Gravidade', 'Status', 'Aberto Por', 'Coordenador', 'Encarregado', 'TST',
    'Prazo', 'SLA', 'Descrição', 'Ação Corretiva',
  ]

  const STATUS_PT: Record<string, string> = {
    aberto: 'Aberto', em_tratativa: 'Em Tratativa', pendente: 'Pendente',
    concluido: 'Concluído', fechado: 'Fechado', reincidente: 'Reincidente',
  }
  const GRAV_PT: Record<string, string> = {
    baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico',
  }

  const rows = desvios.map(d => [
    `DEV-${String(d.numero).padStart(5, '0')}`,
    d.data_ocorrencia,
    d.hora_ocorrencia?.slice(0, 5) || '',
    d.obra_nome_computado,
    d.categorias.map(c => c === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : c).join(', '),
    d.setor || '',
    d.local_exato,
    GRAV_PT[d.gravidade] || d.gravidade,
    STATUS_PT[d.status] || d.status,
    d.aberto_por,
    d.coordenador_nome_computado,
    d.encarregado_nome_computado,
    d.tst_nome_computado,
    d.prazo_correcao || '',
    d.vencido ? 'VENCIDO' : d.dias_para_vencer !== null ? `${d.dias_para_vencer}d` : 'Sem prazo',
    `"${(d.descricao || '').replace(/"/g, '""')}"`,
    `"${(d.acao_corretiva || '').replace(/"/g, '""')}"`,
  ])

  const csv = '﻿' + [headers, ...rows].map(r => r.join(SEP)).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `desvios-hse-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Indicadores Semanais ──────────────────────────────────────────────────────
export const indicadoresDB = {
  list: (filters?: {
    obra_id?: string
    ano?: number
    semana_ini?: number
    semana_fim?: number
  }): Promise<IndicadorSemanal[]> => rpc('indicadores', 'list', filters),
  find: (id: string): Promise<IndicadorSemanal | undefined> => rpc('indicadores', 'find', id),
  create: (
    data: Omit<IndicadorSemanal, 'id' | 'criado_em' | 'atualizado_em'>
  ): Promise<IndicadorSemanal> => rpc('indicadores', 'create', data),
  update: (
    id: string,
    data: Partial<Omit<IndicadorSemanal, 'id' | 'criado_em'>>
  ): Promise<IndicadorSemanal | undefined> => rpc('indicadores', 'update', id, data),
  delete: (id: string): Promise<void> => rpc('indicadores', 'delete', id),
}

// ── Image upload (storage local via /api/upload) ──────────────────────────────
export async function uploadFotoToStorage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/upload', { method: 'POST', body: form })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || 'Falha ao enviar a foto')
  }
  return json.url as string
}
