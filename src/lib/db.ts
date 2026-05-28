import { createClient } from '@supabase/supabase-js'
import type { Obra, TST, Encarregado, Desvio, DesvioComputado, StatusDesvio, GravidadeDesvio, Tratativa } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function now(): string {
  return new Date().toISOString()
}

async function nextNum(): Promise<number> {
  const { data } = await supabase
    .from('desvios')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
  return ((data?.[0]?.numero as number) ?? 0) + 1
}

// ── Obras ─────────────────────────────────────────────────────────────────────
export const obrasDB = {
  list: async (): Promise<Obra[]> => {
    const { data, error } = await supabase
      .from('obras').select('*').order('criado_em', { ascending: true })
    if (error) throw error
    return (data ?? []) as Obra[]
  },

  find: async (id: string): Promise<Obra | undefined> => {
    const { data } = await supabase.from('obras').select('*').eq('id', id).maybeSingle()
    return data as Obra | undefined
  },

  create: async (data: Omit<Obra, 'id' | 'criado_em'>): Promise<Obra> => {
    const obra: Obra = { ...data, id: uid(), criado_em: now() }
    const { error } = await supabase.from('obras').insert(obra)
    if (error) throw error
    return obra
  },

  update: async (id: string, data: Partial<Obra>): Promise<Obra | undefined> => {
    const { data: updated, error } = await supabase
      .from('obras').update(data).eq('id', id).select().maybeSingle()
    if (error) throw error
    return updated as Obra | undefined
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('obras').delete().eq('id', id)
    if (error) throw error
    // tsts and encarregados are cascade-deleted via FK constraint
  },
}

// ── TSTs ──────────────────────────────────────────────────────────────────────
export const tstsDB = {
  list: async (): Promise<TST[]> => {
    const { data, error } = await supabase
      .from('tsts').select('*').order('criado_em', { ascending: true })
    if (error) throw error
    return (data ?? []) as TST[]
  },

  byObra: async (obraId: string): Promise<TST[]> => {
    const { data } = await supabase.from('tsts').select('*').eq('obra_id', obraId)
    return (data ?? []) as TST[]
  },

  activeByObra: async (obraId: string): Promise<TST[]> => {
    const { data } = await supabase.from('tsts').select('*').eq('obra_id', obraId).eq('ativo', true)
    return (data ?? []) as TST[]
  },

  find: async (id: string): Promise<TST | undefined> => {
    const { data } = await supabase.from('tsts').select('*').eq('id', id).maybeSingle()
    return data as TST | undefined
  },

  create: async (data: Omit<TST, 'id' | 'criado_em'>): Promise<TST> => {
    const tst: TST = { ...data, id: uid(), criado_em: now() }
    const { error } = await supabase.from('tsts').insert(tst)
    if (error) throw error
    return tst
  },

  update: async (id: string, data: Partial<Pick<TST, 'nome' | 'crea' | 'telefone'>>): Promise<void> => {
    const { error } = await supabase.from('tsts').update(data).eq('id', id)
    if (error) throw error
  },

  toggleAtivo: async (id: string): Promise<void> => {
    const { data: current } = await supabase.from('tsts').select('ativo').eq('id', id).maybeSingle()
    const { error } = await supabase.from('tsts').update({ ativo: !current?.ativo }).eq('id', id)
    if (error) throw error
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('tsts').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Encarregados ──────────────────────────────────────────────────────────────
export const encarregadosDB = {
  list: async (): Promise<Encarregado[]> => {
    const { data, error } = await supabase
      .from('encarregados').select('*').order('criado_em', { ascending: true })
    if (error) throw error
    return (data ?? []) as Encarregado[]
  },

  byObra: async (obraId: string): Promise<Encarregado[]> => {
    const { data } = await supabase.from('encarregados').select('*').eq('obra_id', obraId)
    return (data ?? []) as Encarregado[]
  },

  activeByObra: async (obraId: string): Promise<Encarregado[]> => {
    const { data } = await supabase.from('encarregados').select('*').eq('obra_id', obraId).eq('ativo', true)
    return (data ?? []) as Encarregado[]
  },

  find: async (id: string): Promise<Encarregado | undefined> => {
    const { data } = await supabase.from('encarregados').select('*').eq('id', id).maybeSingle()
    return data as Encarregado | undefined
  },

  create: async (data: Omit<Encarregado, 'id' | 'criado_em'>): Promise<Encarregado> => {
    const enc: Encarregado = { ...data, id: uid(), criado_em: now() }
    const { error } = await supabase.from('encarregados').insert(enc)
    if (error) throw error
    return enc
  },

  update: async (id: string, data: Partial<Pick<Encarregado, 'nome' | 'setor' | 'telefone'>>): Promise<void> => {
    const { error } = await supabase.from('encarregados').update(data).eq('id', id)
    if (error) throw error
  },

  toggleAtivo: async (id: string): Promise<void> => {
    const { data: current } = await supabase.from('encarregados').select('ativo').eq('id', id).maybeSingle()
    const { error } = await supabase.from('encarregados').update({ ativo: !current?.ativo }).eq('id', id)
    if (error) throw error
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('encarregados').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Desvios ───────────────────────────────────────────────────────────────────
export const desviosDB = {
  list: async (): Promise<Desvio[]> => {
    const { data, error } = await supabase
      .from('desvios').select('*').order('numero', { ascending: false })
    if (error) throw error
    return (data ?? []) as Desvio[]
  },

  find: async (id: string): Promise<Desvio | undefined> => {
    const { data } = await supabase.from('desvios').select('*').eq('id', id).maybeSingle()
    return data as Desvio | undefined
  },

  create: async (
    data: Omit<Desvio, 'id' | 'numero' | 'criado_em' | 'atualizado_em' | 'historico_status'>
  ): Promise<Desvio> => {
    const num = await nextNum()
    const d: Desvio = {
      ...data,
      id: uid(),
      numero: num,
      historico_status: [{ id: uid(), status_novo: 'aberto', por: data.aberto_por, criado_em: now() }],
      criado_em: now(),
      atualizado_em: now(),
    }
    const { error } = await supabase.from('desvios').insert(d)
    if (error) throw error
    return d
  },

  update: async (id: string, data: Partial<Desvio>): Promise<Desvio | undefined> => {
    const { data: updated, error } = await supabase
      .from('desvios').update({ ...data, atualizado_em: now() }).eq('id', id).select().maybeSingle()
    if (error) throw error
    return updated as Desvio | undefined
  },

  updateStatus: async (
    id: string, status: StatusDesvio, por: string, observacao?: string
  ): Promise<Desvio | undefined> => {
    const { data: current } = await supabase.from('desvios').select('*').eq('id', id).maybeSingle()
    if (!current) return undefined
    const hist = {
      id: uid(),
      status_anterior: current.status,
      status_novo: status,
      por,
      observacao,
      criado_em: now(),
    }
    const { data: updated, error } = await supabase
      .from('desvios')
      .update({ status, atualizado_em: now(), historico_status: [...(current.historico_status ?? []), hist] })
      .eq('id', id).select().maybeSingle()
    if (error) throw error
    return updated as Desvio | undefined
  },

  addTratativa: async (
    id: string, tratativa: Omit<Tratativa, 'id' | 'criado_em'>
  ): Promise<Desvio | undefined> => {
    const { data: current } = await supabase.from('desvios').select('*').eq('id', id).maybeSingle()
    if (!current) return undefined
    const t: Tratativa = { ...tratativa, id: uid(), criado_em: now() }
    const { data: updated, error } = await supabase
      .from('desvios')
      .update({ tratativas: [...(current.tratativas ?? []), t], atualizado_em: now() })
      .eq('id', id).select().maybeSingle()
    if (error) throw error
    return updated as Desvio | undefined
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('desvios').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Computed / Analytics ──────────────────────────────────────────────────────
export function computeDesvio(d: Desvio, obras: Obra[], tsts: TST[], encarregados: Encarregado[]): DesvioComputado {
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
    vencido = diff < 0 && !['concluido', 'fechado'].includes(d.status)
  }

  const obra = obras.find(o => o.id === d.obra_id)
  const enc = encarregados.find(e => e.id === d.encarregado_id)
  const tst = tsts.find(t => t.id === d.tst_id)

  return {
    ...d,
    vencido,
    dias_para_vencer,
    dias_aberto,
    obra_nome_computado: obra?.nome || d.obra_nome || '—',
    encarregado_nome_computado: enc?.nome || d.encarregado_nome || '—',
    tst_nome_computado: tst?.nome || d.tst_nome || '—',
  }
}

export function computeStats(desvios: Desvio[], obras: Obra[], tsts: TST[], encarregados: Encarregado[]) {
  const computed = desvios.map(d => computeDesvio(d, obras, tsts, encarregados))
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
    if (f.gravidade && d.gravidade !== f.gravidade) return false
    if (f.status && d.status !== f.status) return false
    if (f.categoria && d.categoria !== f.categoria) return false
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
    'Gravidade', 'Status', 'Aberto Por', 'Encarregado', 'TST',
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
    d.categoria === 'Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : d.categoria,
    d.setor || '',
    d.local_exato,
    GRAV_PT[d.gravidade] || d.gravidade,
    STATUS_PT[d.status] || d.status,
    d.aberto_por,
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

// ── Image upload to Supabase Storage ─────────────────────────────────────────
export async function uploadFotoToStorage(file: File): Promise<string> {
  const month = new Date().toISOString().slice(0, 7)
  const path = `fotos/${month}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

  const { data, error } = await supabase.storage
    .from('desvios')
    .upload(path, file, { contentType: 'image/jpeg', cacheControl: '31536000' })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('desvios')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}
