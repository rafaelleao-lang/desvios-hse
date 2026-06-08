'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardList, RefreshCw, Plus, Trash2, X, Pencil,
  ToggleLeft, ToggleRight, DollarSign, Building2, Tag,
  Phone, MapPin, Hash, Loader2,
} from 'lucide-react'
import { tiposDB, fornecedoresDB } from '@/lib/db-residuos'
import type { TipoResiduo, Fornecedor } from '@/types/residuos'
import { cn } from '@/lib/utils'

const COR = '#22C55E'
type Aba = 'fornecedores' | 'tipos'

type PrecoRow = { _key: string; tipo_id: string; tipo_nome?: string; descricao: string; valor: string; isNovo: boolean }

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function gerarKey() {
  return Math.random().toString(36).slice(2)
}

export default function CadastrosPage() {
  const [aba, setAba] = useState<Aba>('fornecedores')
  const [tipos, setTipos] = useState<TipoResiduo[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [modalTipo, setModalTipo] = useState<'novo' | TipoResiduo | null>(null)
  const [modalForn, setModalForn] = useState<'novo' | Fornecedor | null>(null)
  const [modalPrecos, setModalPrecos] = useState<Fornecedor | null>(null)

  const [formTipo, setFormTipo] = useState({ nome: '', tipo_controle: 'cacamba', unidade_medida: 'caçamba' })
  const [formForn, setFormForn] = useState({ nome: '', cnpj: '', contato: '', cidade: '', estado: '' })

  const [precosEdit, setPrecosEdit] = useState<PrecoRow[]>([])
  const [carregandoPrecos, setCarregandoPrecos] = useState(false)
  const [salvandoPrecos, setSalvandoPrecos] = useState(false)
  const [erroPrecos, setErroPrecos] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [t, f] = await Promise.all([tiposDB.list(), fornecedoresDB.list()])
      setTipos(t); setFornecedores(f)
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // ── Tipos ─────────────────────────────────────────────────────────────────
  async function salvarTipo() {
    if (!formTipo.nome) return
    setSalvando(true)
    try {
      if (modalTipo === 'novo') {
        await tiposDB.create(formTipo)
      } else if (modalTipo) {
        await tiposDB.update(modalTipo.id, formTipo)
      }
      setModalTipo(null); await carregar()
    } finally { setSalvando(false) }
  }

  async function excluirTipo(id: string) {
    if (!confirm('Excluir este tipo de resíduo?')) return
    await tiposDB.delete(id); await carregar()
  }

  // ── Fornecedores ──────────────────────────────────────────────────────────
  async function salvarForn() {
    if (!formForn.nome) return
    setSalvando(true)
    try {
      const data = {
        nome: formForn.nome,
        cnpj: formForn.cnpj || undefined,
        contato: formForn.contato || undefined,
        endereco: formForn.cidade || undefined,
        estado: formForn.estado || undefined,
      }
      if (modalForn === 'novo') {
        await fornecedoresDB.create({ ...data, ativo: true })
      } else if (modalForn) {
        await fornecedoresDB.update(modalForn.id, data)
      }
      setModalForn(null); await carregar()
    } finally { setSalvando(false) }
  }

  async function toggleForn(id: string) { await fornecedoresDB.toggleAtivo(id); await carregar() }

  async function excluirForn(id: string) {
    if (!confirm('Excluir este fornecedor?')) return
    await fornecedoresDB.delete(id); await carregar()
  }

  function abrirEditarForn(f: Fornecedor) {
    setFormForn({ nome: f.nome, cnpj: f.cnpj ?? '', contato: f.contato ?? '', cidade: f.endereco ?? '', estado: f.estado ?? '' })
    setModalForn(f)
  }

  // ── Preços ────────────────────────────────────────────────────────────────
  async function abrirPrecos(f: Fornecedor) {
    setModalPrecos(f)
    setPrecosEdit([])
    setErroPrecos(null)
    setCarregandoPrecos(true)
    try {
      const fresh = await fornecedoresDB.find(f.id)
      setPrecosEdit((fresh.precos ?? []).map(p => ({
        _key: gerarKey(),
        tipo_id: p.tipo_id,
        tipo_nome: p.tipo_nome,
        descricao: p.descricao ?? '',
        valor: String(p.valor),
        isNovo: false,
      })))
    } catch {
      // fallback: usa os dados já carregados na listagem
      setPrecosEdit((f.precos ?? []).map(p => ({
        _key: gerarKey(),
        tipo_id: p.tipo_id,
        tipo_nome: p.tipo_nome,
        descricao: p.descricao ?? '',
        valor: String(p.valor),
        isNovo: false,
      })))
    } finally { setCarregandoPrecos(false) }
  }

  function adicionarLinhaPreco() {
    setPrecosEdit(prev => [...prev, { _key: gerarKey(), tipo_id: '', tipo_nome: '', descricao: '', valor: '', isNovo: true }])
  }

  function atualizarPreco(key: string, campo: keyof Omit<PrecoRow, '_key'>, val: string) {
    setPrecosEdit(prev => prev.map(p => p._key === key ? { ...p, [campo]: val } : p))
  }

  function removerPreco(key: string) {
    setPrecosEdit(prev => prev.filter(p => p._key !== key))
  }

  async function salvarPrecos() {
    if (!modalPrecos) return
    setErroPrecos(null)
    // deduplicar por tipo_id: mantém a última ocorrência de cada tipo
    const mapaValidos = new Map<string, PrecoRow>()
    for (const p of precosEdit) {
      if (p.tipo_id && p.valor && Number(p.valor) > 0) {
        mapaValidos.set(p.tipo_id, p)
      }
    }
    const validos = Array.from(mapaValidos.values())
    setSalvandoPrecos(true)
    try {
      await fornecedoresDB.setPrecos(modalPrecos.id,
        validos.map(p => ({ tipo_id: p.tipo_id, descricao: p.descricao || undefined, valor: Number(p.valor) })))
      setModalPrecos(null)
      await carregar()
    } catch (err) {
      setErroPrecos(err instanceof Error ? err.message : 'Erro ao salvar preços')
    } finally { setSalvandoPrecos(false) }
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-colors'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COR + '20' }}>
            <ClipboardList className="w-5 h-5" style={{ color: COR }} />
          </div>
          <h1 className="text-lg font-bold text-zinc-100">Cadastros</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} disabled={loading}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => aba === 'fornecedores'
            ? (setFormForn({ nome: '', cnpj: '', contato: '', cidade: '', estado: '' }), setModalForn('novo'))
            : (setFormTipo({ nome: '', tipo_controle: 'cacamba', unidade_medida: 'caçamba' }), setModalTipo('novo'))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: COR }}>
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {(['fornecedores', 'tipos'] as Aba[]).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all',
              aba === a ? '' : 'text-zinc-500 hover:text-zinc-300')}
            style={aba === a ? { background: COR + '25', color: COR } : {}}>
            {a === 'fornecedores' ? <Building2 className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
            {a === 'fornecedores' ? 'Fornecedores' : 'Tipos de Resíduo'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Carregando…</span>
        </div>
      )}

      {/* ── Tabela Fornecedores ── */}
      {!loading && aba === 'fornecedores' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {fornecedores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-3">
              <Building2 className="w-10 h-10 opacity-25" />
              <p className="text-sm">Nenhum fornecedor cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <colgroup>
                  <col className="w-52" />
                  <col className="w-40" />
                  <col className="w-36" />
                  <col className="w-36" />
                  <col />
                  <col className="w-20" />
                  <col className="w-28" />
                </colgroup>
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium">CNPJ</th>
                    <th className="text-left px-4 py-3 font-medium">Contato</th>
                    <th className="text-left px-4 py-3 font-medium">Localização</th>
                    <th className="text-left px-4 py-3 font-medium">Resíduos Atendidos</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {fornecedores.map(f => (
                    <tr key={f.id} className="hover:bg-zinc-800/30 transition-colors group align-top">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-zinc-100 text-sm leading-snug">{f.nome}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {f.cnpj
                          ? <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
                              <Hash className="w-3 h-3 opacity-50 flex-shrink-0" />{f.cnpj}
                            </span>
                          : <span className="text-zinc-700 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {f.contato
                          ? <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
                              <Phone className="w-3 h-3 opacity-50 flex-shrink-0" />{f.contato}
                            </span>
                          : <span className="text-zinc-700 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {(f.endereco || f.estado)
                          ? <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
                              <MapPin className="w-3 h-3 opacity-50 flex-shrink-0" />
                              {[f.endereco, f.estado].filter(Boolean).join(' – ')}
                            </span>
                          : <span className="text-zinc-700 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {(f.precos?.length ?? 0) === 0 ? (
                          <button onClick={() => abrirPrecos(f)}
                            className="text-zinc-600 text-xs italic hover:text-green-400 transition-colors">
                            Cadastrar preços
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {f.precos!.map((p, i) => (
                              <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700/50 min-w-0">
                                <span
                                  className="text-zinc-200 text-xs font-medium truncate"
                                  title={p.tipo_nome ?? p.tipo_id}
                                >
                                  {p.tipo_nome ?? p.tipo_id}
                                </span>
                                <span className="text-green-400 text-xs font-bold whitespace-nowrap flex-shrink-0">
                                  {fmtMoeda(p.valor)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
                          f.ativo ? 'bg-green-500/15 text-green-400' : 'bg-zinc-800 text-zinc-500')}>
                          {f.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirPrecos(f)} title="Preços e Resíduos"
                            className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-zinc-600 hover:text-yellow-400 transition-colors">
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => abrirEditarForn(f)} title="Editar"
                            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-600 hover:text-zinc-200 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleForn(f.id)} title={f.ativo ? 'Desativar' : 'Ativar'}
                            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-600 hover:text-zinc-200 transition-colors">
                            {f.ativo
                              ? <ToggleRight className="w-3.5 h-3.5 text-green-500" />
                              : <ToggleLeft className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => excluirForn(f.id)} title="Excluir"
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Lista Tipos ── */}
      {!loading && aba === 'tipos' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {tipos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-3">
              <Tag className="w-10 h-10 opacity-25" />
              <p className="text-sm">Nenhum tipo cadastrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium">Controle</th>
                  <th className="text-left px-4 py-3 font-medium">Unidade Padrão</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {tipos.map(t => (
                  <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-zinc-100">{t.nome}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{t.tipo_controle}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{t.unidade_medida}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setFormTipo({ nome: t.nome, tipo_controle: t.tipo_controle, unidade_medida: t.unidade_medida }); setModalTipo(t) }}
                          className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-600 hover:text-zinc-200 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => excluirTipo(t.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modal Tipo ── */}
      {modalTipo !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">{modalTipo === 'novo' ? 'Novo Tipo de Resíduo' : 'Editar Tipo'}</h2>
              <button onClick={() => setModalTipo(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome do resíduo *" value={formTipo.nome}
                onChange={e => setFormTipo(f => ({ ...f, nome: e.target.value }))} className={inputCls} autoFocus />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Controle (ex: cacamba)" value={formTipo.tipo_controle}
                  onChange={e => setFormTipo(f => ({ ...f, tipo_controle: e.target.value }))} className={inputCls} />
                <input type="text" placeholder="Unidade (ex: caçamba)" value={formTipo.unidade_medida}
                  onChange={e => setFormTipo(f => ({ ...f, unidade_medida: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <button onClick={salvarTipo} disabled={salvando || !formTipo.nome}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all active:scale-95"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Fornecedor ── */}
      {modalForn !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">{modalForn === 'novo' ? 'Novo Fornecedor' : 'Editar Fornecedor'}</h2>
              <button onClick={() => setModalForn(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome da empresa *" value={formForn.nome}
                onChange={e => setFormForn(f => ({ ...f, nome: e.target.value }))} className={inputCls} autoFocus />
              <input type="text" placeholder="CNPJ" value={formForn.cnpj}
                onChange={e => setFormForn(f => ({ ...f, cnpj: e.target.value }))} className={inputCls} />
              <input type="text" placeholder="Contato (telefone)" value={formForn.contato}
                onChange={e => setFormForn(f => ({ ...f, contato: e.target.value }))} className={inputCls} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="text" placeholder="Cidade" value={formForn.cidade}
                  onChange={e => setFormForn(f => ({ ...f, cidade: e.target.value }))}
                  className="sm:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-colors" />
                <input type="text" placeholder="UF" maxLength={2} value={formForn.estado}
                  onChange={e => setFormForn(f => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-colors text-center font-mono tracking-widest" />
              </div>
            </div>
            <button onClick={salvarForn} disabled={salvando || !formForn.nome}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all active:scale-95"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Preços ── */}
      {modalPrecos && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800 flex-shrink-0">
              <div>
                <h2 className="font-bold text-zinc-100">Resíduos e Preços</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{modalPrecos.nome}</p>
              </div>
              <button onClick={() => setModalPrecos(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {erroPrecos && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                  {erroPrecos}
                </div>
              )}
              {carregandoPrecos ? (
                <div className="flex items-center justify-center py-8 gap-2 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Carregando preços…</span>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5 space-y-2">
                  {/* Cabeçalho da tabela */}
                  {precosEdit.length > 0 && (
                    <div className="grid grid-cols-[1fr_130px_100px_36px] gap-2 pb-1 min-w-[480px]">
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide pl-3">Tipo de Resíduo</span>
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide pl-3">Descrição</span>
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide pl-3">Valor</span>
                      <span />
                    </div>
                  )}

                  {/* Linhas editáveis */}
                  {precosEdit.map(p => {
                    const duplicado = p.isNovo && p.tipo_id !== '' && precosEdit.filter(x => x.tipo_id === p.tipo_id).length > 1
                    const nomeTipo = p.tipo_nome || tipos.find(t => t.id === p.tipo_id)?.nome || p.tipo_id
                    return (
                    <div key={p._key} className="grid grid-cols-[1fr_130px_100px_36px] gap-2 items-center min-w-[480px]">
                      {/* Tipo: fixo para existentes, dropdown para novos */}
                      {p.isNovo ? (
                        <select
                          value={p.tipo_id}
                          onChange={e => { atualizarPreco(p._key, 'tipo_id', e.target.value); setErroPrecos(null) }}
                          className={`bg-zinc-800 border rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none transition-colors ${duplicado ? 'border-amber-500 focus:border-amber-400' : 'border-zinc-700 focus:border-green-500'}`}
                        >
                          <option value="">Selecione o tipo…</option>
                          {tipos
                            .filter(t => !precosEdit.some(x => !x.isNovo && x.tipo_id === t.id))
                            .map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                          <span className="text-sm font-medium text-zinc-200 truncate">{nomeTipo}</span>
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Descrição"
                        value={p.descricao}
                        onChange={e => atualizarPreco(p._key, 'descricao', e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-colors"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={p.valor}
                        onChange={e => atualizarPreco(p._key, 'valor', e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500 transition-colors text-right"
                      />
                      <button
                        onClick={() => removerPreco(p._key)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )})}
                  {precosEdit.some(p => p.isNovo && p.tipo_id !== '' && precosEdit.filter(x => x.tipo_id === p.tipo_id).length > 1) && (
                    <p className="text-xs text-amber-400">
                      Este tipo já tem preço — será sobrescrito.
                    </p>
                  )}

                  {/* Vazio */}
                  {precosEdit.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-600">
                      <DollarSign className="w-8 h-8 opacity-20" />
                      <p className="text-xs">Nenhum preço cadastrado. Clique em &quot;+ Adicionar&quot; para começar.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-800 flex-shrink-0">
              <button
                onClick={adicionarLinhaPreco}
                disabled={carregandoPrecos}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
              <div className="flex-1" />
              <button onClick={() => setModalPrecos(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={salvarPrecos}
                disabled={salvandoPrecos || carregandoPrecos}
                className="px-5 py-2 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all active:scale-95"
                style={{ background: COR }}
              >
                {salvandoPrecos ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
