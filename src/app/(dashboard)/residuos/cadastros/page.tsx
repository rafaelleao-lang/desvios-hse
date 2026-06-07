'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, RefreshCw, Plus, Trash2, X, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { tiposDB, fornecedoresResiduosDB } from '@/lib/db-residuos'
import type { TipoResiduo, Fornecedor } from '@/types/residuos'
import { cn } from '@/lib/utils'

const COR = '#22C55E'
type Aba = 'fornecedores' | 'tipos'

export default function CadastrosPage() {
  const [aba, setAba] = useState<Aba>('fornecedores')
  const [tipos, setTipos] = useState<TipoResiduo[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [modalTipo, setModalTipo] = useState<'novo' | TipoResiduo | null>(null)
  const [modalForn, setModalForn] = useState<'novo' | Fornecedor | null>(null)

  const [formTipo, setFormTipo] = useState({ nome: '', tipo_controle: 'cacamba', unidade_medida: 'caçamba' })
  const [formForn, setFormForn] = useState({ nome: '', cnpj: '', contato: '', endereco: '', estado: '', status: 'ATIVO' as 'ATIVO' | 'INATIVO' })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [t, f] = await Promise.all([tiposDB.list(), fornecedoresResiduosDB.list()])
      setTipos(t); setFornecedores(f)
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Tipos
  async function salvarTipo() {
    if (!formTipo.nome) return
    setSalvando(true)
    try {
      if (modalTipo === 'novo') {
        await tiposDB.create({ nome: formTipo.nome, tipo_controle: formTipo.tipo_controle, unidade_medida: formTipo.unidade_medida })
      } else if (modalTipo) {
        await tiposDB.update(modalTipo.id, { nome: formTipo.nome, tipo_controle: formTipo.tipo_controle, unidade_medida: formTipo.unidade_medida })
      }
      setModalTipo(null)
      await carregar()
    } finally { setSalvando(false) }
  }

  async function excluirTipo(id: string) {
    if (!confirm('Excluir este tipo de resíduo?')) return
    await tiposDB.delete(id); await carregar()
  }

  function abrirEditarTipo(t: TipoResiduo) {
    setFormTipo({ nome: t.nome, tipo_controle: t.tipo_controle, unidade_medida: t.unidade_medida })
    setModalTipo(t)
  }

  function abrirNovoTipo() {
    setFormTipo({ nome: '', tipo_controle: 'cacamba', unidade_medida: 'caçamba' })
    setModalTipo('novo')
  }

  // Fornecedores
  async function salvarForn() {
    if (!formForn.nome) return
    setSalvando(true)
    try {
      if (modalForn === 'novo') {
        await fornecedoresResiduosDB.create({
          nome: formForn.nome, cnpj: formForn.cnpj || undefined,
          contato: formForn.contato || undefined, endereco: formForn.endereco || undefined,
          estado: formForn.estado || undefined, status: formForn.status,
        })
      } else if (modalForn) {
        await fornecedoresResiduosDB.update(modalForn.id, {
          nome: formForn.nome, cnpj: formForn.cnpj || undefined,
          contato: formForn.contato || undefined, endereco: formForn.endereco || undefined,
          estado: formForn.estado || undefined,
        })
      }
      setModalForn(null)
      await carregar()
    } finally { setSalvando(false) }
  }

  async function toggleForn(id: string) {
    await fornecedoresResiduosDB.toggleStatus(id); await carregar()
  }

  async function excluirForn(id: string) {
    if (!confirm('Excluir este fornecedor? Todos os preços vinculados serão removidos.')) return
    await fornecedoresResiduosDB.delete(id); await carregar()
  }

  function abrirEditarForn(f: Fornecedor) {
    setFormForn({ nome: f.nome, cnpj: f.cnpj ?? '', contato: f.contato ?? '', endereco: f.endereco ?? '', estado: f.estado ?? '', status: f.status })
    setModalForn(f)
  }

  function abrirNovoForn() {
    setFormForn({ nome: '', cnpj: '', contato: '', endereco: '', estado: '', status: 'ATIVO' })
    setModalForn('novo')
  }

  return (
    <div className="space-y-5">
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
          <button onClick={() => aba === 'fornecedores' ? abrirNovoForn() : abrirNovoTipo()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: COR }}>
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        {(['fornecedores', 'tipos'] as Aba[]).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all', aba === a ? '' : 'text-zinc-500 hover:text-zinc-300')}
            style={aba === a ? { background: COR + '25', color: COR } : {}}>
            {a === 'fornecedores' ? 'Fornecedores' : 'Tipos de Resíduo'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-zinc-500 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Carregando…</span>
        </div>
      )}

      {/* Lista Fornecedores */}
      {!loading && aba === 'fornecedores' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
          {fornecedores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <ClipboardList className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-sm">Nenhum fornecedor cadastrado</p>
            </div>
          ) : fornecedores.map(f => (
            <div key={f.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-200">{f.nome}</p>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold',
                    f.status === 'ATIVO' ? 'bg-green-500/15 text-green-400' : 'bg-zinc-700 text-zinc-500')}>
                    {f.status}
                  </span>
                </div>
                {(f.cnpj || f.contato || f.estado) && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {[f.cnpj, f.contato, f.estado].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => abrirEditarForn(f)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleForn(f.id)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors" title="Alternar status">
                  {f.status === 'ATIVO' ? <ToggleRight className="w-3.5 h-3.5 text-green-500" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => excluirForn(f.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista Tipos */}
      {!loading && aba === 'tipos' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800/60">
          {tipos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <ClipboardList className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-sm">Nenhum tipo cadastrado</p>
            </div>
          ) : tipos.map(t => (
            <div key={t.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{t.nome}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.tipo_controle} · {t.unidade_medida}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => abrirEditarTipo(t)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => excluirTipo(t.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tipo */}
      {modalTipo !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">{modalTipo === 'novo' ? 'Novo Tipo' : 'Editar Tipo'}</h2>
              <button onClick={() => setModalTipo(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome do resíduo" value={formTipo.nome}
                onChange={e => setFormTipo(f => ({ ...f, nome: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <input type="text" placeholder="Tipo de controle (ex: cacamba)" value={formTipo.tipo_controle}
                onChange={e => setFormTipo(f => ({ ...f, tipo_controle: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <input type="text" placeholder="Unidade de medida (ex: caçamba, kg)" value={formTipo.unidade_medida}
                onChange={e => setFormTipo(f => ({ ...f, unidade_medida: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
            </div>
            <button onClick={salvarTipo} disabled={salvando || !formTipo.nome}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Fornecedor */}
      {modalForn !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-100">{modalForn === 'novo' ? 'Novo Fornecedor' : 'Editar Fornecedor'}</h2>
              <button onClick={() => setModalForn(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome do fornecedor*" value={formForn.nome}
                onChange={e => setFormForn(f => ({ ...f, nome: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <input type="text" placeholder="CNPJ" value={formForn.cnpj}
                onChange={e => setFormForn(f => ({ ...f, cnpj: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <input type="text" placeholder="Contato" value={formForn.contato}
                onChange={e => setFormForn(f => ({ ...f, contato: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Estado (UF)" value={formForn.estado}
                  onChange={e => setFormForn(f => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
                <input type="text" placeholder="Endereço" value={formForn.endereco}
                  onChange={e => setFormForn(f => ({ ...f, endereco: e.target.value }))}
                  className="col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500" />
              </div>
            </div>
            <button onClick={salvarForn} disabled={salvando || !formForn.nome}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: COR }}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
