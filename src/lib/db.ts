import type { Obra, TST, Encarregado, Desvio, DesvioComputado, StatusDesvio, GravidadeDesvio, Tratativa } from '@/types'

// ── Keys ────────────────────────────────────────────────────────────────────
const K = {
  obras:        'hse_obras',
  tsts:         'hse_tsts',
  encarregados: 'hse_encarregados',
  desvios:      'hse_desvios',
  counter:      'hse_counter',
} as const

// ── Helpers ──────────────────────────────────────────────────────────────────
function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

function write<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      alert('Armazenamento cheio! Exporte seus dados e libere espaço.')
    }
  }
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function nextNum(): number {
  const n = parseInt(localStorage.getItem(K.counter) || '0') + 1
  localStorage.setItem(K.counter, String(n))
  return n
}

function now(): string {
  return new Date().toISOString()
}

// ── Obras ────────────────────────────────────────────────────────────────────
export const obrasDB = {
  list: (): Obra[] => read<Obra>(K.obras),
  find: (id: string): Obra | undefined => read<Obra>(K.obras).find(o => o.id === id),
  create: (data: Omit<Obra, 'id' | 'criado_em'>): Obra => {
    const obra: Obra = { ...data, id: uid(), criado_em: now() }
    write(K.obras, [...read<Obra>(K.obras), obra])
    return obra
  },
  update: (id: string, data: Partial<Obra>): Obra | undefined => {
    const list = read<Obra>(K.obras).map(o => o.id === id ? { ...o, ...data } : o)
    write(K.obras, list)
    return list.find(o => o.id === id)
  },
  delete: (id: string): void => {
    write(K.obras, read<Obra>(K.obras).filter(o => o.id !== id))
    // cascade delete TSTs, encarregados, desvios
    write(K.tsts, read<TST>(K.tsts).filter(t => t.obra_id !== id))
    write(K.encarregados, read<Encarregado>(K.encarregados).filter(e => e.obra_id !== id))
  },
}

// ── TSTs ─────────────────────────────────────────────────────────────────────
export const tstsDB = {
  list: (): TST[] => read<TST>(K.tsts),
  byObra: (obraId: string): TST[] => read<TST>(K.tsts).filter(t => t.obra_id === obraId),
  activeByObra: (obraId: string): TST[] => read<TST>(K.tsts).filter(t => t.obra_id === obraId && t.ativo),
  find: (id: string): TST | undefined => read<TST>(K.tsts).find(t => t.id === id),
  create: (data: Omit<TST, 'id' | 'criado_em'>): TST => {
    const tst: TST = { ...data, id: uid(), criado_em: now() }
    write(K.tsts, [...read<TST>(K.tsts), tst])
    return tst
  },
  update: (id: string, data: Partial<TST>): TST | undefined => {
    const list = read<TST>(K.tsts).map(t => t.id === id ? { ...t, ...data } : t)
    write(K.tsts, list)
    return list.find(t => t.id === id)
  },
  toggleAtivo: (id: string): void => {
    const list = read<TST>(K.tsts).map(t => t.id === id ? { ...t, ativo: !t.ativo } : t)
    write(K.tsts, list)
  },
  delete: (id: string): void => {
    write(K.tsts, read<TST>(K.tsts).filter(t => t.id !== id))
  },
}

// ── Encarregados ─────────────────────────────────────────────────────────────
export const encarregadosDB = {
  list: (): Encarregado[] => read<Encarregado>(K.encarregados),
  byObra: (obraId: string): Encarregado[] => read<Encarregado>(K.encarregados).filter(e => e.obra_id === obraId),
  activeByObra: (obraId: string): Encarregado[] => read<Encarregado>(K.encarregados).filter(e => e.obra_id === obraId && e.ativo),
  find: (id: string): Encarregado | undefined => read<Encarregado>(K.encarregados).find(e => e.id === id),
  create: (data: Omit<Encarregado, 'id' | 'criado_em'>): Encarregado => {
    const enc: Encarregado = { ...data, id: uid(), criado_em: now() }
    write(K.encarregados, [...read<Encarregado>(K.encarregados), enc])
    return enc
  },
  update: (id: string, data: Partial<Encarregado>): Encarregado | undefined => {
    const list = read<Encarregado>(K.encarregados).map(e => e.id === id ? { ...e, ...data } : e)
    write(K.encarregados, list)
    return list.find(e => e.id === id)
  },
  toggleAtivo: (id: string): void => {
    const list = read<Encarregado>(K.encarregados).map(e => e.id === id ? { ...e, ativo: !e.ativo } : e)
    write(K.encarregados, list)
  },
  delete: (id: string): void => {
    write(K.encarregados, read<Encarregado>(K.encarregados).filter(e => e.id !== id))
  },
}

// ── Desvios ───────────────────────────────────────────────────────────────────
export const desviosDB = {
  list: (): Desvio[] => read<Desvio>(K.desvios),
  find: (id: string): Desvio | undefined => read<Desvio>(K.desvios).find(d => d.id === id),
  create: (data: Omit<Desvio, 'id' | 'numero' | 'criado_em' | 'atualizado_em' | 'historico_status'>): Desvio => {
    const num = nextNum()
    const d: Desvio = {
      ...data,
      id: uid(),
      numero: num,
      historico_status: [{ id: uid(), status_novo: 'aberto', por: data.aberto_por, criado_em: now() }],
      criado_em: now(),
      atualizado_em: now(),
    }
    write(K.desvios, [...read<Desvio>(K.desvios), d])
    return d
  },
  update: (id: string, data: Partial<Desvio>): Desvio | undefined => {
    const list = read<Desvio>(K.desvios).map(d => d.id === id ? { ...d, ...data, atualizado_em: now() } : d)
    write(K.desvios, list)
    return list.find(d => d.id === id)
  },
  updateStatus: (id: string, status: StatusDesvio, por: string, observacao?: string): Desvio | undefined => {
    const list = read<Desvio>(K.desvios).map(d => {
      if (d.id !== id) return d
      const hist: Desvio['historico_status'][0] = {
        id: uid(), status_anterior: d.status, status_novo: status,
        por, observacao, criado_em: now(),
      }
      return {
        ...d, status, atualizado_em: now(),
        historico_status: [...d.historico_status, hist],
      }
    })
    write(K.desvios, list)
    return list.find(d => d.id === id)
  },
  addTratativa: (id: string, tratativa: Omit<Tratativa, 'id' | 'criado_em'>): Desvio | undefined => {
    const list = read<Desvio>(K.desvios).map(d => {
      if (d.id !== id) return d
      const t: Tratativa = { ...tratativa, id: uid(), criado_em: now() }
      return { ...d, tratativas: [...d.tratativas, t], atualizado_em: now() }
    })
    write(K.desvios, list)
    return list.find(d => d.id === id)
  },
  delete: (id: string): void => {
    write(K.desvios, read<Desvio>(K.desvios).filter(d => d.id !== id))
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
    const prazo = new Date(d.prazo_correcao + 'T23:59:59')
    const diff = Math.ceil((prazo.getTime() - hoje.getTime()) / 86400000)
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

// ── Image compression ─────────────────────────────────────────────────────────
export async function comprimirImagem(file: File, maxSize = 400, quality = 0.4): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      let { width, height } = img
      if (width > height) {
        if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize }
      } else {
        if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize }
      }
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
    img.src = url
  })
}
