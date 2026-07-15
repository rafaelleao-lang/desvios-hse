'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { alojamentoLocaisDB } from '@/lib/db-alojamentos'
import type { AlojamentoLocal } from '@/types/alojamentos'
import { Building2, MapPin, Pencil, Trash2, Plus, X, Check, Loader2, ClipboardList } from 'lucide-react'

const ALOJ_COLOR = '#6366F1'

export default function CadastroAlojamentosPage() {
  const { obras } = useApp()

  const [locais, setLocais] = useState<AlojamentoLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formObraId, setFormObraId] = useState('')
  const [formEndereco, setFormEndereco] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEndereco, setEditEndereco] = useState('')
  const [editObraId, setEditObraId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [])

  function refresh() {
    setLoading(true)
    alojamentoLocaisDB.list()
      .then(setLocais)
      .catch(err => setError(err instanceof Error ? err.message : 'Erro ao carregar'))
      .finally(() => setLoading(false))
  }

  const porObra = useMemo(() => {
    const grupos = new Map<string, { obraId: string; obraNome: string; itens: AlojamentoLocal[] }>()
    for (const l of locais) {
      if (!grupos.has(l.obra_id)) grupos.set(l.obra_id, { obraId: l.obra_id, obraNome: l.obra_nome || '—', itens: [] })
      grupos.get(l.obra_id)!.itens.push(l)
    }
    return Array.from(grupos.values())
      .map(g => ({ ...g, itens: g.itens.sort((a, b) => a.endereco.localeCompare(b.endereco)) }))
      .sort((a, b) => a.obraNome.localeCompare(b.obraNome))
  }, [locais])

  const canAdd = Boolean(formObraId && formEndereco.trim())

  async function handleAdd() {
    if (!canAdd) return
    setSaving(true)
    setError('')
    try {
      const obra = obras.find(o => o.id === formObraId)
      const novo = await alojamentoLocaisDB.create({ obra_id: formObraId, obra_nome: obra?.nome, endereco: formEndereco.trim() })
      setLocais(list => [...list, novo])
      setFormEndereco('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar alojamento')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(l: AlojamentoLocal) {
    setEditingId(l.id)
    setEditObraId(l.obra_id)
    setEditEndereco(l.endereco)
  }

  async function saveEdit(id: string) {
    if (!editEndereco.trim() || !editObraId) return
    setSavingEdit(true)
    try {
      const obra = obras.find(o => o.id === editObraId)
      const atualizado = await alojamentoLocaisDB.update(id, { obra_id: editObraId, obra_nome: obra?.nome, endereco: editEndereco.trim() })
      if (atualizado) setLocais(list => list.map(l => l.id === id ? atualizado : l))
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao editar alojamento')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(l: AlojamentoLocal) {
    if (!confirm(`Excluir o alojamento "${l.endereco}"? Os relatórios já feitos para ele são mantidos no histórico, apenas deixam de estar vinculados a um cadastro.`)) return
    setDeletingId(l.id)
    try {
      await alojamentoLocaisDB.delete(l.id)
      setLocais(list => list.filter(x => x.id !== l.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir alojamento')
    } finally {
      setDeletingId(null)
    }
  }

  const inputCls = 'w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 disabled:opacity-50'

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ALOJ_COLOR + '20' }}>
          <ClipboardList className="w-4 h-4" style={{ color: ALOJ_COLOR }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Cadastro de Alojamentos</h1>
          <p className="text-xs text-zinc-500">{locais.length} alojamento(s) cadastrado(s)</p>
        </div>
      </div>

      {/* Form de novo alojamento */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-200">Novo Alojamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Obra *</label>
            <select className={inputCls} value={formObraId} onChange={e => setFormObraId(e.target.value)}>
              <option value="">Selecione a obra</option>
              {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 block">Endereço *</label>
            <input className={inputCls} placeholder="Ex: Rua das Flores, 123 - Centro" value={formEndereco} onChange={e => setFormEndereco(e.target.value)} />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAdd || saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: canAdd && !saving ? ALOJ_COLOR : ALOJ_COLOR + '66' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar Alojamento
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">{error}</div>
      )}

      {/* Listas por obra */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: ALOJ_COLOR, borderTopColor: 'transparent' }} />
        </div>
      ) : porObra.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-12 h-12 text-zinc-700 mb-3" />
          <p className="text-zinc-500 font-medium">Nenhum alojamento cadastrado ainda</p>
          <p className="text-zinc-600 text-sm mt-1">Use o formulário acima para cadastrar o primeiro.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {porObra.map(grupo => (
            <div key={grupo.obraId} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800" style={{ background: ALOJ_COLOR + '0d' }}>
                <Building2 className="w-4 h-4" style={{ color: ALOJ_COLOR }} />
                <h3 className="text-sm font-bold text-zinc-200">{grupo.obraNome}</h3>
                <span className="ml-auto text-[11px] text-zinc-500">{grupo.itens.length} alojamento(s)</span>
              </div>
              <div className="divide-y divide-zinc-800/70">
                {grupo.itens.map(l => (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                    {editingId === l.id ? (
                      <>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select className={inputCls} value={editObraId} onChange={e => setEditObraId(e.target.value)}>
                            {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                          </select>
                          <input className={inputCls} value={editEndereco} onChange={e => setEditEndereco(e.target.value)} />
                        </div>
                        <button
                          onClick={() => saveEdit(l.id)}
                          disabled={savingEdit}
                          className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                        >
                          {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="flex-1 text-sm text-zinc-200">{l.endereco}</span>
                        <button
                          onClick={() => startEdit(l)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-zinc-800 hover:border-indigo-500/20 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(l)}
                          disabled={deletingId === l.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 transition-all disabled:opacity-50"
                        >
                          {deletingId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
