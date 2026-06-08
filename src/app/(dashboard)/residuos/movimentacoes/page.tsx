'use client'

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Plus, Trash2, RefreshCw, ArrowDownUp, TrendingUp, TrendingDown,
  X, FileText, Upload, ExternalLink, Paperclip, Camera, Image as ImageIcon,
} from 'lucide-react'
import { saldosDB, retiradasDB, tiposDB, fornecedoresDB } from '@/lib/db-residuos'
import { obrasDB } from '@/lib/db'
import type { ResSaldo, ResRetirada, TipoResiduo, Fornecedor } from '@/types/residuos'
import type { Obra } from '@/types'
import { cn } from '@/lib/utils'

const COR = '#22C55E'

const UNIDADES = [
  'Caçamba 5m³',
  'Caçamba 15m³',
  'Caçamba 30m³',
  'Volume líquido (m³)',
  'Peso (kg)',
  'Tonelada (ton)',
  'Unidade (un)',
  'Personalizado',
]

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

type Aba = 'entradas' | 'retiradas'

async function uploadArquivo(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Falha no upload')
  return json.url as string
}

function MovimentacoesContent() {
  const params = useSearchParams()
  const [aba, setAba] = useState<Aba>((params.get('aba') as Aba) ?? 'entradas')
  const [entradas, setEntradas] = useState<ResSaldo[]>([])
  const [retiradas, setRetiradas] = useState<ResRetirada[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [tipos, setTipos] = useState<TipoResiduo[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'entrada' | 'retirada' | null>(
    params.get('novo') === '1' ? 'entrada' : null,
  )
  const [salvando, setSalvando] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [obraFiltro, setObraFiltro] = useState('')

  const docInputRef = useRef<HTMLInputElement>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const fotoInputRefCamera = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10)

  const [formEntrada, setFormEntrada] = useState({
    obra_id: '', tipo_id: '', quantidade: '',
    unidade_medida: 'Caçamba 5m³', unidade_custom: '',
    data: today, documento_url: '', documento_nome: '',
  })
  const [formRetirada, setFormRetirada] = useState({
    obra_id: '', tipo_id: '', fornecedor_id: '', quantidade: '',
    unidade_medida: 'Caçamba 5m³', unidade_custom: '',
    data: today, observacoes: '', foto_url: '', foto_nome: '',
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [e, r, o, t, f] = await Promise.all([
        saldosDB.list(), retiradasDB.list(), obrasDB.list(),
        tiposDB.list(), fornecedoresDB.list(),
      ])
      setEntradas(e); setRetiradas(r)
      setObras(o.filter(x => x.ativa)); setTipos(t)
      setFornecedores(f.filter(x => x.ativo))
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const entradasFiltradas = obraFiltro ? entradas.filter(e => e.obra_id === obraFiltro) : entradas
  const retiradasFiltradas = obraFiltro ? retiradas.filter(r => r.obra_id === obraFiltro) : retiradas

  // Saldo por resíduo da obra filtrada (calculado localmente)
  const resumoSaldo = useMemo(() => {
    if (!obraFiltro) return []
    const e = entradas.filter(x => x.obra_id === obraFiltro)
    const r = retiradas.filter(x => x.obra_id === obraFiltro)
    const ids = Array.from(new Set([...e.map(x => x.tipo_id), ...r.map(x => x.tipo_id)]))
    return ids.map(tid => {
      const eT = e.filter(x => x.tipo_id === tid)
      const rT = r.filter(x => x.tipo_id === tid)
      const nome = eT[0]?.tipo_nome || rT[0]?.tipo_nome || tid
      const un   = eT[0]?.unidade_medida || rT[0]?.unidade_medida || ''
      const tE   = eT.reduce((s, x) => s + x.quantidade, 0)
      const tR   = rT.reduce((s, x) => s + x.quantidade, 0)
      return { tid, nome, un, totalEntrada: tE, totalRetirada: tR, saldo: tE - tR }
    })
  }, [obraFiltro, entradas, retiradas])

  function unidadeEntrada() {
    return formEntrada.unidade_medida === 'Personalizado' ? formEntrada.unidade_custom : formEntrada.unidade_medida
  }
  function unidadeRetirada() {
    return formRetirada.unidade_medida === 'Personalizado' ? formRetirada.unidade_custom : formRetirada.unidade_medida
  }

  async function handleUploadDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingDoc(true)
    try {
      const url = await uploadArquivo(file)
      setFormEntrada(f => ({ ...f, documento_url: url, documento_nome: file.name }))
    } catch (err) { alert(err instanceof Error ? err.message : 'Erro no upload') }
    finally { setUploadingDoc(false); if (docInputRef.current) docInputRef.current.value = '' }
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingFoto(true)
    try {
      const url = await uploadArquivo(file)
      setFormRetirada(f => ({ ...f, foto_url: url, foto_nome: file.name }))
    } catch (err) { alert(err instanceof Error ? err.message : 'Erro no upload') }
    finally { setUploadingFoto(false); if (fotoInputRef.current) fotoInputRef.current.value = '' }
  }

  async function salvarEntrada() {
    if (!formEntrada.obra_id || !formEntrada.tipo_id || !formEntrada.quantidade) return
    const un = unidadeEntrada()
    if (!un) return
    setSalvando(true)
    try {
      await saldosDB.insert({
        obra_id: formEntrada.obra_id, tipo_id: formEntrada.tipo_id,
        quantidade: Number(formEntrada.quantidade), unidade_medida: un,
        documento_url: formEntrada.documento_url || undefined, data: formEntrada.data,
      })
      setModal(null)
      setFormEntrada({ obra_id: '', tipo_id: '', quantidade: '', unidade_medida: 'Caçamba 5m³', unidade_custom: '', data: today, documento_url: '', documento_nome: '' })
      await carregar()
    } finally { setSalvando(false) }
  }

  async function salvarRetirada() {
    if (!formRetirada.obra_id || !formRetirada.tipo_id || !formRetirada.fornecedor_id || !formRetirada.quantidade) return
    const un = unidadeRetirada()
    setSalvando(true)
    try {
      const qt = Number(formRetirada.quantidade)
      // Busca preço automático do cadastro de fornecedores
      const forn = fornecedores.find(f => f.id === formRetirada.fornecedor_id)
      const preco = forn?.precos?.find(p => p.tipo_id === formRetirada.tipo_id)
      const vu = preco?.valor
      await retiradasDB.insert({
        obra_id: formRetirada.obra_id, tipo_id: formRetirada.tipo_id,
        fornecedor_id: formRetirada.fornecedor_id, quantidade: qt,
        unidade_medida: un || undefined,
        descricao_preco: preco?.descricao || undefined,
        valor_unitario: vu, valor_total: vu ? vu * qt : undefined,
        foto_url: formRetirada.foto_url || undefined,
        observacoes: formRetirada.observacoes || undefined, data: formRetirada.data,
      })
      setModal(null)
      setFormRetirada({ obra_id: '', tipo_id: '', fornecedor_id: '', quantidade: '', unidade_medida: 'Caçamba 5m³', unidade_custom: '', data: today, observacoes: '', foto_url: '', foto_nome: '' })
      // Verifica alertas em background — não bloqueia o fluxo
      fetch('/api/residuos/check-alertas', { method: 'POST' }).catch(() => {})
      await carregar()
    } finally { setSalvando(false) }
  }

  async function excluirEntrada(id: string) {
    if (!confirm('Excluir esta entrada?')) return
    await saldosDB.delete(id); await carregar()
  }

  async function excluirRetirada(id: string) {
    if (!confirm('Excluir esta retirada?')) return
    await retiradasDB.delete(id); await carregar()
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500'

  return (
    <div className="space-y-5">
      {/* Hidden file inputs */}
      <input ref={docInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleUploadDoc} />
      <input ref={fotoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadFoto} />
      <input ref={fotoInputRefCamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadFoto} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COR + '20' }}>
            <ArrowDownUp className="w-5 h-5" style={{ color: COR }} />
          </div>
          <h1 className="text-lg font-bold text-zinc-100">Movimentações</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} disabled={loading}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => setModal(aba === 'entradas' ? 'entrada' : 'retirada')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: COR }}>
            <Plus className="w-4 h-4" />
            {aba === 'entradas' ? 'Nova Entrada' : 'Nova Retirada'}
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {(['entradas', 'retiradas'] as Aba[]).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all',
              aba === a ? '' : 'text-zinc-500 hover:text-zinc-300')}
            style={aba === a ? { background: COR + '25', color: COR } : {}}>
            {a === 'entradas' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {a === 'entradas' ? 'Entradas' : 'Retiradas'}
            <span className="ml-1 text-xs rounded-full px-1.5 py-0.5 bg-zinc-800">
              {a === 'entradas' ? entradasFiltradas.length : retiradasFiltradas.length}
            </span>
          </button>
        ))}
      </div>

      {/* Filtro obra */}
      <select value={obraFiltro} onChange={e => setObraFiltro(e.target.value)}
        className="w-full sm:w-72 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
        <option value="">Todas as obras</option>
        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

      {/* Saldo Atual por Resíduo (quando obra filtrada) */}
      {obraFiltro && resumoSaldo.length > 0 && aba === 'entradas' && !loading && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Saldo Atual por Resíduo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {resumoSaldo.map(r => (
              <div key={r.tid} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <p className="text-sm font-semibold text-zinc-200 mb-2 truncate">{r.nome}</p>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-green-500/10 rounded-lg p-2">
                    <p className="text-xs text-zinc-500">Entrada</p>
                    <p className="text-sm font-bold text-green-400">{fmt(r.totalEntrada)}</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-2">
                    <p className="text-xs text-zinc-500">Retirada</p>
                    <p className="text-sm font-bold text-amber-400">{fmt(r.totalRetirada)}</p>
                  </div>
                  <div className={cn('rounded-lg p-2', r.saldo < 0 ? 'bg-red-500/10' : 'bg-zinc-800')}>
                    <p className="text-xs text-zinc-500">Saldo</p>
                    <p className={cn('text-sm font-bold', r.saldo < 0 ? 'text-red-400' : 'text-zinc-100')}>{fmt(r.saldo)}</p>
                  </div>
                </div>
                {r.un && <p className="text-[10px] text-zinc-600 mt-1.5 text-center">{r.un}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Carregando…</span>
        </div>
      )}

      {/* Tabela Entradas */}
      {!loading && aba === 'entradas' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {entradasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <FileText className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-sm">Nenhuma entrada registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Obra</th>
                    <th className="text-left px-4 py-3">Resíduo</th>
                    <th className="text-right px-4 py-3">Qtd</th>
                    <th className="text-left px-4 py-3">Unidade</th>
                    <th className="text-center px-4 py-3">Pedido</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {entradasFiltradas.map(e => (
                    <tr key={e.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{e.data}</td>
                      <td className="px-4 py-3 text-zinc-200 font-medium">{e.obra_nome ?? e.obra_id}</td>
                      <td className="px-4 py-3 text-zinc-300">{e.tipo_nome ?? e.tipo_id}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-semibold">{fmt(e.quantidade)}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{e.unidade_medida}</td>
                      <td className="px-4 py-3 text-center">
                        {e.documento_url ? (
                          <a href={e.documento_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                            <ExternalLink className="w-3 h-3" /> Abrir
                          </a>
                        ) : <span className="text-zinc-700 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => excluirEntrada(e.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tabela Retiradas */}
      {!loading && aba === 'retiradas' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {retiradasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <FileText className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-sm">Nenhuma retirada registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <colgroup>
                  <col style={{ width: '110px' }} />
                  <col />
                  <col style={{ width: '120px' }} />
                  <col />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '44px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide bg-zinc-800/30">
                    <th className="text-left px-4 py-3 font-medium">Data</th>
                    <th className="text-left px-4 py-3 font-medium">Obra</th>
                    <th className="text-left px-4 py-3 font-medium">Resíduo</th>
                    <th className="text-left px-4 py-3 font-medium">Fornecedor</th>
                    <th className="text-right px-4 py-3 font-medium">Qtd</th>
                    <th className="text-right px-4 py-3 font-medium">Total R$</th>
                    <th className="text-center px-4 py-3 font-medium">Foto</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {retiradasFiltradas.map(r => {
                    // Se não tem valor salvo, calcula pelo preço atual do fornecedor
                    const valorDisplay = r.valor_total ?? (() => {
                      const forn = fornecedores.find(f => f.id === r.fornecedor_id)
                      const preco = forn?.precos?.find(p => p.tipo_id === r.tipo_id)
                      return preco ? preco.valor * r.quantidade : null
                    })()
                    const calculado = r.valor_total == null && valorDisplay != null
                    return (
                      <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-4 py-3.5 text-zinc-500 whitespace-nowrap text-xs">{r.data}</td>
                        <td className="px-4 py-3.5 text-zinc-200 font-medium truncate max-w-0">
                          <span className="block truncate">{r.obra_nome ?? r.obra_id}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-medium">
                            {r.tipo_nome ?? r.tipo_id}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-400 text-xs truncate max-w-0">
                          <span className="block truncate">{r.fornecedor_nome ?? r.fornecedor_id}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-bold text-amber-400">{fmt(r.quantidade)}</span>
                          {r.unidade_medida && (
                            <span className="text-zinc-600 text-xs ml-1 hidden group-hover:inline">
                              {r.unidade_medida.split(' ')[0]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {valorDisplay != null ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-green-400">R$ {fmt(valorDisplay)}</span>
                              {calculado && (
                                <span className="text-zinc-600 text-[10px]">calculado</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-700 text-xs">sem preço</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {r.foto_url ? (
                            <a href={r.foto_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                              <ExternalLink className="w-3 h-3" /> Abrir
                            </a>
                          ) : <span className="text-zinc-700 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={() => excluirRetirada(r.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {retiradasFiltradas.length > 0 && (() => {
                  const totalGeral = retiradasFiltradas.reduce((sum, r) => {
                    const v = r.valor_total ?? (() => {
                      const forn = fornecedores.find(f => f.id === r.fornecedor_id)
                      const preco = forn?.precos?.find(p => p.tipo_id === r.tipo_id)
                      return preco ? preco.valor * r.quantidade : null
                    })()
                    return v != null ? sum + v : sum
                  }, 0)
                  return (
                    <tfoot>
                      <tr className="border-t border-zinc-700 bg-zinc-800/40">
                        <td colSpan={4} className="px-4 py-3 text-xs text-zinc-500">
                          {retiradasFiltradas.length} retirada{retiradasFiltradas.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-500">
                          {fmt(retiradasFiltradas.reduce((s, r) => s + r.quantidade, 0))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-green-400 text-sm">R$ {fmt(totalGeral)}</span>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )
                })()}
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Nova Entrada ── */}
      {modal === 'entrada' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">Nova Entrada de Resíduo</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <select value={formEntrada.obra_id} onChange={e => setFormEntrada(f => ({ ...f, obra_id: e.target.value }))} className={inputCls}>
                <option value="">Obra *</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              {tipos.length === 0 ? (
                <a href="/residuos/cadastros" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
                  Nenhum tipo cadastrado → ir para Cadastros
                </a>
              ) : (
                <select value={formEntrada.tipo_id} onChange={e => setFormEntrada(f => ({ ...f, tipo_id: e.target.value }))} className={inputCls}>
                  <option value="">Tipo de Resíduo *</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" step="0.01" placeholder="Quantidade *" value={formEntrada.quantidade}
                  onChange={e => setFormEntrada(f => ({ ...f, quantidade: e.target.value }))} className={inputCls} />
                <select value={formEntrada.unidade_medida}
                  onChange={e => setFormEntrada(f => ({ ...f, unidade_medida: e.target.value }))} className={inputCls}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {formEntrada.unidade_medida === 'Personalizado' && (
                <input type="text" placeholder="Especifique a unidade *" value={formEntrada.unidade_custom}
                  onChange={e => setFormEntrada(f => ({ ...f, unidade_custom: e.target.value }))} className={inputCls} />
              )}
              <input type="date" value={formEntrada.data}
                onChange={e => setFormEntrada(f => ({ ...f, data: e.target.value }))} className={inputCls} />

              {/* Upload Pedido Aprovado */}
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Pedido Aprovado (PDF ou imagem)</label>
                {formEntrada.documento_url ? (
                  <div className="flex items-center gap-2 p-2.5 bg-zinc-800 rounded-lg border border-green-500/30">
                    <Paperclip className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-xs text-zinc-300 truncate flex-1">{formEntrada.documento_nome || 'Arquivo enviado'}</span>
                    <div className="flex items-center gap-1">
                      <a href={formEntrada.documento_url} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-zinc-700 text-green-400">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => setFormEntrada(f => ({ ...f, documento_url: '', documento_nome: '' }))}
                        className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}
                    className="w-full flex items-center justify-center gap-2 p-2.5 bg-zinc-800 border border-zinc-700 border-dashed rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                    {uploadingDoc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingDoc ? 'Enviando…' : 'Escolher arquivo'}
                  </button>
                )}
              </div>
            </div>
            <button onClick={salvarEntrada}
              disabled={salvando || !formEntrada.obra_id || !formEntrada.tipo_id || !formEntrada.quantidade || (formEntrada.unidade_medida === 'Personalizado' && !formEntrada.unidade_custom)}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Registrar Entrada'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Nova Retirada ── */}
      {modal === 'retirada' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">Nova Retirada</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <select value={formRetirada.obra_id} onChange={e => setFormRetirada(f => ({ ...f, obra_id: e.target.value }))} className={inputCls}>
                <option value="">Obra *</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              {tipos.length === 0 ? (
                <a href="/residuos/cadastros" className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
                  Nenhum tipo cadastrado → ir para Cadastros
                </a>
              ) : (
                <select value={formRetirada.tipo_id} onChange={e => setFormRetirada(f => ({ ...f, tipo_id: e.target.value }))} className={inputCls}>
                  <option value="">Tipo de Resíduo *</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              )}
              <select value={formRetirada.fornecedor_id} onChange={e => setFormRetirada(f => ({ ...f, fornecedor_id: e.target.value }))} className={inputCls}>
                <option value="">Fornecedor *</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" step="0.01" placeholder="Quantidade *" value={formRetirada.quantidade}
                  onChange={e => setFormRetirada(f => ({ ...f, quantidade: e.target.value }))} className={inputCls} />
                <select value={formRetirada.unidade_medida}
                  onChange={e => setFormRetirada(f => ({ ...f, unidade_medida: e.target.value }))} className={inputCls}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {formRetirada.unidade_medida === 'Personalizado' && (
                <input type="text" placeholder="Especifique a unidade" value={formRetirada.unidade_custom}
                  onChange={e => setFormRetirada(f => ({ ...f, unidade_custom: e.target.value }))} className={inputCls} />
              )}
              {/* Preço preenchido automaticamente do cadastro de fornecedores */}
              {formRetirada.fornecedor_id && formRetirada.tipo_id && (() => {
                const forn = fornecedores.find(f => f.id === formRetirada.fornecedor_id)
                const preco = forn?.precos?.find(p => p.tipo_id === formRetirada.tipo_id)
                if (!preco) return null
                const total = preco.valor * (Number(formRetirada.quantidade) || 0)
                return (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <span className="text-xs text-zinc-400">
                      Preço: <span className="font-semibold text-green-400">
                        R$ {fmt(preco.valor)}
                      </span>
                      {preco.descricao && <span className="text-zinc-500 ml-1">({preco.descricao})</span>}
                    </span>
                    {formRetirada.quantidade && (
                      <span className="text-xs font-bold text-zinc-200">
                        Total: R$ {fmt(total)}
                      </span>
                    )}
                  </div>
                )
              })()}
              <input type="date" value={formRetirada.data}
                onChange={e => setFormRetirada(f => ({ ...f, data: e.target.value }))} className={inputCls} />
              <textarea placeholder="Observações (opcional)" value={formRetirada.observacoes}
                onChange={e => setFormRetirada(f => ({ ...f, observacoes: e.target.value }))}
                rows={2} className={`${inputCls} resize-none`} />

              {/* Upload foto/comprovante */}
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Foto / Comprovante</label>
                {formRetirada.foto_url ? (
                  <div className="flex items-center gap-2 p-2.5 bg-zinc-800 rounded-lg border border-green-500/30">
                    <Camera className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-xs text-zinc-300 truncate flex-1">{formRetirada.foto_nome || 'Foto enviada'}</span>
                    <div className="flex items-center gap-1">
                      <a href={formRetirada.foto_url} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-zinc-700 text-green-400">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => setFormRetirada(f => ({ ...f, foto_url: '', foto_nome: '' }))}
                        className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => fotoInputRefCamera.current?.click()} disabled={uploadingFoto}
                      className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-zinc-800 border border-zinc-700 border-dashed rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                      {uploadingFoto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      Câmera
                    </button>
                    <button onClick={() => fotoInputRef.current?.click()} disabled={uploadingFoto}
                      className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-zinc-800 border border-zinc-700 border-dashed rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                      <ImageIcon className="w-4 h-4" />
                      Galeria
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button onClick={salvarRetirada}
              disabled={salvando || !formRetirada.obra_id || !formRetirada.tipo_id || !formRetirada.fornecedor_id || !formRetirada.quantidade}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Registrar Retirada'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MovimentacoesPage() {
  return <Suspense><MovimentacoesContent /></Suspense>
}
