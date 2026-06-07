'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Trash2, RefreshCw, ArrowDownUp, TrendingUp, TrendingDown, X, FileText } from 'lucide-react'
import { saldosDB, retiradasDB, tiposDB, fornecedoresDB } from '@/lib/db-residuos'
import { obrasDB } from '@/lib/db'
import type { ResSaldo, ResRetirada, TipoResiduo, Fornecedor } from '@/types/residuos'
import type { Obra } from '@/types'
import { cn } from '@/lib/utils'

const COR = '#22C55E'

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

type Aba = 'entradas' | 'retiradas'

export default function MovimentacoesPage() {
  const params = useSearchParams()
  const [aba, setAba] = useState<Aba>((params.get('aba') as Aba) ?? 'entradas')
  const [entradas, setEntradas] = useState<ResSaldo[]>([])
  const [retiradas, setRetiradas] = useState<ResRetirada[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [tipos, setTipos] = useState<TipoResiduo[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'entrada' | 'retirada' | null>(
    params.get('novo') === '1' ? 'entrada' : null
  )
  const [salvando, setSalvando] = useState(false)
  const [obraFiltro, setObraFiltro] = useState('')

  const [formEntrada, setFormEntrada] = useState({
    obra_id: '', tipo_id: '', quantidade: '', unidade_medida: '', data: new Date().toISOString().slice(0, 10), documento_url: '',
  })
  const [formRetirada, setFormRetirada] = useState({
    obra_id: '', tipo_id: '', fornecedor_id: '', quantidade: '', unidade_medida: '', descricao_preco: '', valor_unitario: '', data: new Date().toISOString().slice(0, 10), observacoes: '',
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

  async function salvarEntrada() {
    if (!formEntrada.obra_id || !formEntrada.tipo_id || !formEntrada.quantidade) return
    setSalvando(true)
    try {
      await saldosDB.insert({
        obra_id: formEntrada.obra_id, tipo_id: formEntrada.tipo_id,
        quantidade: Number(formEntrada.quantidade), unidade_medida: formEntrada.unidade_medida,
        documento_url: formEntrada.documento_url || undefined, data: formEntrada.data,
      })
      setModal(null)
      setFormEntrada({ obra_id: '', tipo_id: '', quantidade: '', unidade_medida: '', data: new Date().toISOString().slice(0, 10), documento_url: '' })
      await carregar()
    } finally { setSalvando(false) }
  }

  async function salvarRetirada() {
    if (!formRetirada.obra_id || !formRetirada.tipo_id || !formRetirada.fornecedor_id || !formRetirada.quantidade) return
    setSalvando(true)
    try {
      const vu = formRetirada.valor_unitario ? Number(formRetirada.valor_unitario) : undefined
      const qt = Number(formRetirada.quantidade)
      await retiradasDB.insert({
        obra_id: formRetirada.obra_id, tipo_id: formRetirada.tipo_id,
        fornecedor_id: formRetirada.fornecedor_id, quantidade: qt,
        unidade_medida: formRetirada.unidade_medida || undefined,
        descricao_preco: formRetirada.descricao_preco || undefined,
        valor_unitario: vu, valor_total: vu ? vu * qt : undefined,
        observacoes: formRetirada.observacoes || undefined, data: formRetirada.data,
      })
      setModal(null)
      setFormRetirada({ obra_id: '', tipo_id: '', fornecedor_id: '', quantidade: '', unidade_medida: '', descricao_preco: '', valor_unitario: '', data: new Date().toISOString().slice(0, 10), observacoes: '' })
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

  return (
    <div className="space-y-5">
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
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all',
              aba === a ? 'text-white' : 'text-zinc-500 hover:text-zinc-300',
            )}
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
        className="w-full sm:w-64 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
        <option value="">Todas as obras</option>
        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

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
                      <td className="px-4 py-3 text-zinc-500">{e.unidade_medida}</td>
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
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Obra</th>
                    <th className="text-left px-4 py-3">Resíduo</th>
                    <th className="text-left px-4 py-3">Fornecedor</th>
                    <th className="text-right px-4 py-3">Qtd</th>
                    <th className="text-right px-4 py-3">Total R$</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {retiradasFiltradas.map(r => (
                    <tr key={r.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{r.data}</td>
                      <td className="px-4 py-3 text-zinc-200 font-medium">{r.obra_nome ?? r.obra_id}</td>
                      <td className="px-4 py-3 text-zinc-300">{r.tipo_nome ?? r.tipo_id}</td>
                      <td className="px-4 py-3 text-zinc-400">{r.fornecedor_nome ?? r.fornecedor_id}</td>
                      <td className="px-4 py-3 text-right text-amber-400 font-semibold">{fmt(r.quantidade)}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">
                        {r.valor_total != null ? `R$ ${fmt(r.valor_total)}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => excluirRetirada(r.id)}
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

      {/* Modal Nova Entrada */}
      {modal === 'entrada' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">Nova Entrada de Resíduo</h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <select value={formEntrada.obra_id} onChange={e => setFormEntrada(f => ({ ...f, obra_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">Selecione a obra…</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              <select value={formEntrada.tipo_id} onChange={e => setFormEntrada(f => ({ ...f, tipo_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">Tipo de resíduo…</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" step="0.01" placeholder="Quantidade" value={formEntrada.quantidade}
                  onChange={e => setFormEntrada(f => ({ ...f, quantidade: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
                <input type="text" placeholder="Unidade (ex: caçamba)" value={formEntrada.unidade_medida}
                  onChange={e => setFormEntrada(f => ({ ...f, unidade_medida: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              </div>
              <input type="date" value={formEntrada.data}
                onChange={e => setFormEntrada(f => ({ ...f, data: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <input type="url" placeholder="URL do documento (opcional)" value={formEntrada.documento_url}
                onChange={e => setFormEntrada(f => ({ ...f, documento_url: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
            </div>
            <button onClick={salvarEntrada} disabled={salvando || !formEntrada.obra_id || !formEntrada.tipo_id || !formEntrada.quantidade}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Registrar Entrada'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Nova Retirada */}
      {modal === 'retirada' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">Nova Retirada</h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <select value={formRetirada.obra_id} onChange={e => setFormRetirada(f => ({ ...f, obra_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">Selecione a obra…</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              <select value={formRetirada.tipo_id} onChange={e => setFormRetirada(f => ({ ...f, tipo_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">Tipo de resíduo…</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <select value={formRetirada.fornecedor_id} onChange={e => setFormRetirada(f => ({ ...f, fornecedor_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500">
                <option value="">Fornecedor…</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" step="0.01" placeholder="Quantidade" value={formRetirada.quantidade}
                  onChange={e => setFormRetirada(f => ({ ...f, quantidade: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
                <input type="text" placeholder="Unidade" value={formRetirada.unidade_medida}
                  onChange={e => setFormRetirada(f => ({ ...f, unidade_medida: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              </div>
              <input type="number" min="0" step="0.01" placeholder="Valor unitário (opcional)" value={formRetirada.valor_unitario}
                onChange={e => setFormRetirada(f => ({ ...f, valor_unitario: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <input type="date" value={formRetirada.data}
                onChange={e => setFormRetirada(f => ({ ...f, data: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <textarea placeholder="Observações (opcional)" value={formRetirada.observacoes}
                onChange={e => setFormRetirada(f => ({ ...f, observacoes: e.target.value }))}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500 resize-none" />
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
