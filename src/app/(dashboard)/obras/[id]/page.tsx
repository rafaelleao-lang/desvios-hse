'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Edit, Check, X, Plus,
  UserCheck, UserX, Trash2, HardHat, Users, Save,
  Phone, Hash, MapPin, Pencil,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { obrasDB, tstsDB, encarregadosDB, coordenadoresDB } from '@/lib/db'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TST, Encarregado, Coordenador } from '@/types'

type Tab = 'info' | 'tsts' | 'encarregados' | 'coordenadores'

export default function ObraDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { obras, tsts, encarregados, coordenadores, desvios, refresh } = useApp()

  const obra = obras.find(o => o.id === id)
  const obraTSTs = tsts.filter(t => t.obra_id === id)
  const obraEncarregados = encarregados.filter(e => e.obra_id === id)
  const obraCoordenadores = coordenadores.filter(c => c.obra_id === id)
  const obraDesvios = desvios.filter(d => d.obra_id === id)

  const [tab, setTab] = useState<Tab>('coordenadores')
  const [editingObra, setEditingObra] = useState(false)
  const [obraForm, setObraForm] = useState<Partial<typeof obra>>({})

  // TST form
  const [addingTST, setAddingTST] = useState(false)
  const [tstForm, setTSTForm] = useState({ nome: '', crea: '', telefone: '' })
  const [editingTSTId, setEditingTSTId] = useState<string | null>(null)
  const [tstEditForm, setTSTEditForm] = useState({ nome: '', crea: '', telefone: '' })

  // Encarregado form
  const [addingEnc, setAddingEnc] = useState(false)
  const [encForm, setEncForm] = useState({ nome: '', setor: '', telefone: '' })
  const [editingEncId, setEditingEncId] = useState<string | null>(null)
  const [encEditForm, setEncEditForm] = useState({ nome: '', setor: '', telefone: '' })

  // Coordenador form
  const [addingCoord, setAddingCoord] = useState(false)
  const [coordForm, setCoordForm] = useState({ nome: '', telefone: '' })
  const [editingCoordId, setEditingCoordId] = useState<string | null>(null)
  const [coordEditForm, setCoordEditForm] = useState({ nome: '', telefone: '' })

  if (!obra) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Obra não encontrada.</p>
        <button onClick={() => router.push('/obras')} className="mt-3 text-amber-400 text-sm">
          ← Voltar para obras
        </button>
      </div>
    )
  }

  // ── Obra edit ──
  function startEditObra() {
    setObraForm({ nome: obra!.nome, codigo: obra!.codigo, empresa: obra!.empresa, cidade: obra!.cidade, estado: obra!.estado, responsavel: obra!.responsavel, ativa: obra!.ativa })
    setEditingObra(true)
  }
  async function saveObra() {
    if (!obraForm || !obraForm.nome?.trim() || !obraForm.codigo?.trim()) return
    await obrasDB.update(id, obraForm as Parameters<typeof obrasDB.update>[1])
    await refresh()
    setEditingObra(false)
  }

  // ── TST ──
  async function addTST() {
    if (!tstForm.nome.trim()) return
    await tstsDB.create({ obra_id: id, nome: tstForm.nome.trim(), crea: tstForm.crea, telefone: tstForm.telefone, ativo: true })
    await refresh()
    setTSTForm({ nome: '', crea: '', telefone: '' })
    setAddingTST(false)
  }
  function startEditTST(tst: TST) {
    setEditingTSTId(tst.id)
    setTSTEditForm({ nome: tst.nome, crea: tst.crea || '', telefone: tst.telefone || '' })
  }
  async function saveTST() {
    if (!editingTSTId || !tstEditForm.nome.trim()) return
    await tstsDB.update(editingTSTId, { nome: tstEditForm.nome.trim(), crea: tstEditForm.crea, telefone: tstEditForm.telefone })
    await refresh()
    setEditingTSTId(null)
  }
  async function toggleTST(tstId: string) {
    await tstsDB.toggleAtivo(tstId)
    await refresh()
  }
  async function deleteTST(tstId: string, nome: string) {
    if (!confirm(`Remover o TST "${nome}" desta obra?`)) return
    await tstsDB.delete(tstId)
    await refresh()
  }

  // ── Encarregado ──
  async function addEnc() {
    if (!encForm.nome.trim()) return
    await encarregadosDB.create({ obra_id: id, nome: encForm.nome.trim(), setor: encForm.setor, telefone: encForm.telefone, ativo: true })
    await refresh()
    setEncForm({ nome: '', setor: '', telefone: '' })
    setAddingEnc(false)
  }
  function startEditEnc(enc: Encarregado) {
    setEditingEncId(enc.id)
    setEncEditForm({ nome: enc.nome, setor: enc.setor || '', telefone: enc.telefone || '' })
  }
  async function saveEnc() {
    if (!editingEncId || !encEditForm.nome.trim()) return
    await encarregadosDB.update(editingEncId, { nome: encEditForm.nome.trim(), setor: encEditForm.setor, telefone: encEditForm.telefone })
    await refresh()
    setEditingEncId(null)
  }
  async function toggleEnc(encId: string) {
    await encarregadosDB.toggleAtivo(encId)
    await refresh()
  }
  async function deleteEnc(encId: string, nome: string) {
    if (!confirm(`Remover o encarregado "${nome}" desta obra?`)) return
    await encarregadosDB.delete(encId)
    await refresh()
  }

  // ── Coordenador ──
  async function addCoord() {
    if (!coordForm.nome.trim()) return
    await coordenadoresDB.create({ obra_id: id, nome: coordForm.nome.trim(), telefone: coordForm.telefone, ativo: true })
    await refresh()
    setCoordForm({ nome: '', telefone: '' })
    setAddingCoord(false)
  }
  function startEditCoord(coord: Coordenador) {
    setEditingCoordId(coord.id)
    setCoordEditForm({ nome: coord.nome, telefone: coord.telefone || '' })
  }
  async function saveCoord() {
    if (!editingCoordId || !coordEditForm.nome.trim()) return
    await coordenadoresDB.update(editingCoordId, { nome: coordEditForm.nome.trim(), telefone: coordEditForm.telefone })
    await refresh()
    setEditingCoordId(null)
  }
  async function toggleCoord(coordId: string) {
    await coordenadoresDB.toggleAtivo(coordId)
    await refresh()
  }
  async function deleteCoord(coordId: string, nome: string) {
    if (!confirm(`Remover o coordenador "${nome}" desta obra?`)) return
    await coordenadoresDB.delete(coordId)
    await refresh()
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'coordenadores', label: 'Coordenadores', count: obraCoordenadores.length },
    { id: 'tsts', label: 'TSTs', count: obraTSTs.length },
    { id: 'encarregados', label: 'Encarregados', count: obraEncarregados.length },
    { id: 'info', label: 'Dados da Obra' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/obras')}
          className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-500">{obra.codigo}</span>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold',
              obra.ativa ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-700 text-zinc-400')}>
              {obra.ativa ? 'Ativa' : 'Inativa'}
            </span>
          </div>
          <h1 className="text-lg font-bold text-zinc-50 truncate">{obra.nome}</h1>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Desvios', value: obraDesvios.length, color: 'text-zinc-100' },
          { label: 'Abertos', value: obraDesvios.filter(d => ['aberto','em_tratativa','pendente'].includes(d.status)).length, color: 'text-amber-400' },
          { label: 'Coord.', value: obraCoordenadores.filter(c => c.ativo).length, color: 'text-green-400' },
          { label: 'TSTs ativos', value: obraTSTs.filter(t => t.ativo).length, color: 'text-blue-400' },
          { label: 'Enc. ativos', value: obraEncarregados.filter(e => e.ativo).length, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
            <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all',
              tab === t.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}>
            {t.label}
            {t.count !== undefined && (
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                tab === t.id ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-600')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Coordenadores tab ── */}
      {tab === 'coordenadores' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-300">Coordenadores</p>
            <button onClick={() => setAddingCoord(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors active:scale-95">
              <Plus className="w-3.5 h-3.5" />
              Adicionar Coordenador
            </button>
          </div>

          <AnimatePresence>
            {addingCoord && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-400">Novo Coordenador</p>
                <Input value={coordForm.nome} onChange={e => setCoordForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo *" autoFocus />
                <Input value={coordForm.telefone} onChange={e => setCoordForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="Telefone" type="tel" />
                <div className="flex gap-2">
                  <Button onClick={addCoord} size="sm" disabled={!coordForm.nome.trim()} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />Confirmar
                  </Button>
                  <Button onClick={() => { setAddingCoord(false); setCoordForm({ nome: '', telefone: '' }) }}
                    variant="ghost" size="sm">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {obraCoordenadores.length === 0 ? (
            <div className="text-center py-10 text-zinc-600">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum coordenador cadastrado nesta obra</p>
            </div>
          ) : (
            <div className="space-y-2">
              {obraCoordenadores.map((coord) => (
                <div key={coord.id}>
                  {editingCoordId === coord.id ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
                      <p className="text-xs font-semibold text-green-400">Editar Coordenador</p>
                      <Input value={coordEditForm.nome} onChange={e => setCoordEditForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome completo *" autoFocus />
                      <Input value={coordEditForm.telefone} onChange={e => setCoordEditForm(f => ({ ...f, telefone: e.target.value }))}
                        placeholder="Telefone" type="tel" />
                      <div className="flex gap-2">
                        <Button onClick={saveCoord} size="sm" disabled={!coordEditForm.nome.trim()} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />Salvar
                        </Button>
                        <Button onClick={() => setEditingCoordId(null)} variant="ghost" size="sm">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className={cn('flex items-center gap-3 p-3.5 rounded-xl border transition-colors',
                      coord.ativo ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-800/50 bg-zinc-900/40 opacity-60')}>
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        coord.ativo ? 'bg-green-500/10' : 'bg-zinc-800')}>
                        <Users className={cn('w-4 h-4', coord.ativo ? 'text-green-400' : 'text-zinc-600')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-200">{coord.nome}</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                            coord.ativo ? 'bg-green-500/10 text-green-400' : 'bg-zinc-700 text-zinc-500')}>
                            {coord.ativo ? 'Ativo' : 'Afastado'}
                          </span>
                        </div>
                        {coord.telefone && (
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{coord.telefone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEditCoord(coord)} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-green-500/10 text-zinc-500 hover:text-green-400 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleCoord(coord.id)} title={coord.ativo ? 'Afastar' : 'Retorno'}
                          className={cn('p-1.5 rounded-lg transition-colors',
                            coord.ativo ? 'hover:bg-orange-500/10 text-zinc-500 hover:text-orange-400' : 'hover:bg-green-500/10 text-zinc-500 hover:text-green-400')}>
                          {coord.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteCoord(coord.id, coord.nome)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TSTs tab ── */}
      {tab === 'tsts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-300">
              Técnicos de Segurança do Trabalho
            </p>
            <button onClick={() => setAddingTST(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors active:scale-95">
              <Plus className="w-3.5 h-3.5" />
              Adicionar TST
            </button>
          </div>

          {/* Add TST form */}
          <AnimatePresence>
            {addingTST && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-400">Novo TST</p>
                <div className="space-y-2">
                  <Input value={tstForm.nome} onChange={e => setTSTForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome completo *" autoFocus />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={tstForm.crea} onChange={e => setTSTForm(f => ({ ...f, crea: e.target.value }))}
                      placeholder="CREA / Registro" />
                    <Input value={tstForm.telefone} onChange={e => setTSTForm(f => ({ ...f, telefone: e.target.value }))}
                      placeholder="Telefone" type="tel" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addTST} size="sm" disabled={!tstForm.nome.trim()} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />Confirmar
                  </Button>
                  <Button onClick={() => { setAddingTST(false); setTSTForm({ nome: '', crea: '', telefone: '' }) }}
                    variant="ghost" size="sm">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TST list */}
          {obraTSTs.length === 0 ? (
            <div className="text-center py-10 text-zinc-600">
              <HardHat className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum TST cadastrado nesta obra</p>
            </div>
          ) : (
            <div className="space-y-2">
              {obraTSTs.map((tst) => (
                <div key={tst.id}>
                  {editingTSTId === tst.id ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                      <p className="text-xs font-semibold text-blue-400">Editar TST</p>
                      <Input value={tstEditForm.nome} onChange={e => setTSTEditForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome completo *" autoFocus />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={tstEditForm.crea} onChange={e => setTSTEditForm(f => ({ ...f, crea: e.target.value }))}
                          placeholder="CREA / Registro" />
                        <Input value={tstEditForm.telefone} onChange={e => setTSTEditForm(f => ({ ...f, telefone: e.target.value }))}
                          placeholder="Telefone" type="tel" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveTST} size="sm" disabled={!tstEditForm.nome.trim()} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />Salvar
                        </Button>
                        <Button onClick={() => setEditingTSTId(null)} variant="ghost" size="sm">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className={cn('flex items-center gap-3 p-3.5 rounded-xl border transition-colors',
                      tst.ativo ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-800/50 bg-zinc-900/40 opacity-60')}>
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        tst.ativo ? 'bg-blue-500/10' : 'bg-zinc-800')}>
                        <HardHat className={cn('w-4 h-4', tst.ativo ? 'text-blue-400' : 'text-zinc-600')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-200">{tst.nome}</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                            tst.ativo ? 'bg-green-500/10 text-green-400' : 'bg-zinc-700 text-zinc-500')}>
                            {tst.ativo ? 'No canteiro' : 'Afastado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                          {tst.crea && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{tst.crea}</span>}
                          {tst.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{tst.telefone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEditTST(tst)} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 text-zinc-500 hover:text-blue-400 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleTST(tst.id)} title={tst.ativo ? 'Marcar como afastado' : 'Marcar como no canteiro'}
                          className={cn('p-1.5 rounded-lg transition-colors',
                            tst.ativo ? 'hover:bg-orange-500/10 text-zinc-500 hover:text-orange-400' : 'hover:bg-green-500/10 text-zinc-500 hover:text-green-400')}>
                          {tst.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteTST(tst.id, tst.nome)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-zinc-600 text-center">
            Clique em <UserX className="w-3 h-3 inline" /> para marcar TST como afastado · <UserCheck className="w-3 h-3 inline" /> para retorno ao canteiro
          </p>
        </div>
      )}

      {/* ── Encarregados tab ── */}
      {tab === 'encarregados' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-300">Encarregados</p>
            <button onClick={() => setAddingEnc(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors active:scale-95">
              <Plus className="w-3.5 h-3.5" />
              Adicionar Encarregado
            </button>
          </div>

          <AnimatePresence>
            {addingEnc && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-400">Novo Encarregado</p>
                <Input value={encForm.nome} onChange={e => setEncForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo *" autoFocus />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={encForm.setor} onChange={e => setEncForm(f => ({ ...f, setor: e.target.value }))}
                    placeholder="Setor / Área responsável" />
                  <Input value={encForm.telefone} onChange={e => setEncForm(f => ({ ...f, telefone: e.target.value }))}
                    placeholder="Telefone" type="tel" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={addEnc} size="sm" disabled={!encForm.nome.trim()} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />Confirmar
                  </Button>
                  <Button onClick={() => { setAddingEnc(false); setEncForm({ nome: '', setor: '', telefone: '' }) }}
                    variant="ghost" size="sm">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {obraEncarregados.length === 0 ? (
            <div className="text-center py-10 text-zinc-600">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum encarregado cadastrado nesta obra</p>
            </div>
          ) : (
            <div className="space-y-2">
              {obraEncarregados.map((enc) => (
                <div key={enc.id}>
                  {editingEncId === enc.id ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
                      <p className="text-xs font-semibold text-purple-400">Editar Encarregado</p>
                      <Input value={encEditForm.nome} onChange={e => setEncEditForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome completo *" autoFocus />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={encEditForm.setor} onChange={e => setEncEditForm(f => ({ ...f, setor: e.target.value }))}
                          placeholder="Setor / Área responsável" />
                        <Input value={encEditForm.telefone} onChange={e => setEncEditForm(f => ({ ...f, telefone: e.target.value }))}
                          placeholder="Telefone" type="tel" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveEnc} size="sm" disabled={!encEditForm.nome.trim()} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />Salvar
                        </Button>
                        <Button onClick={() => setEditingEncId(null)} variant="ghost" size="sm">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className={cn('flex items-center gap-3 p-3.5 rounded-xl border transition-colors',
                      enc.ativo ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-800/50 bg-zinc-900/40 opacity-60')}>
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        enc.ativo ? 'bg-purple-500/10' : 'bg-zinc-800')}>
                        <Users className={cn('w-4 h-4', enc.ativo ? 'text-purple-400' : 'text-zinc-600')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-200">{enc.nome}</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                            enc.ativo ? 'bg-green-500/10 text-green-400' : 'bg-zinc-700 text-zinc-500')}>
                            {enc.ativo ? 'Ativo' : 'Afastado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                          {enc.setor && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{enc.setor}</span>}
                          {enc.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{enc.telefone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEditEnc(enc)} title="Editar"
                          className="p-1.5 rounded-lg hover:bg-purple-500/10 text-zinc-500 hover:text-purple-400 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleEnc(enc.id)} title={enc.ativo ? 'Afastar' : 'Retorno ao canteiro'}
                          className={cn('p-1.5 rounded-lg transition-colors',
                            enc.ativo ? 'hover:bg-orange-500/10 text-zinc-500 hover:text-orange-400' : 'hover:bg-green-500/10 text-zinc-500 hover:text-green-400')}>
                          {enc.ativo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteEnc(enc.id, enc.nome)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Info / Edit Obra ── */}
      {tab === 'info' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-300">Dados da Obra</p>
            {!editingObra && (
              <button onClick={startEditObra}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                <Edit className="w-3.5 h-3.5" />Editar
              </button>
            )}
          </div>

          {editingObra ? (
            <div className="space-y-3">
              {[
                { label: 'Nome *', field: 'nome', placeholder: 'Nome da obra' },
                { label: 'Código *', field: 'codigo', placeholder: 'Ex: OBR-001' },
                { label: 'Empresa', field: 'empresa', placeholder: 'Ex: Construtora Alpha' },
                { label: 'Cidade', field: 'cidade', placeholder: 'Cidade' },
                { label: 'Estado', field: 'estado', placeholder: 'SP', maxLen: 2 },
                { label: 'Responsável', field: 'responsavel', placeholder: 'Eng. responsável' },
              ].map(f => (
                <div key={f.field} className="space-y-1">
                  <Label>{f.label}</Label>
                  <Input
                    value={(obraForm as Record<string, string>)[f.field] || ''}
                    onChange={e => setObraForm(x => ({ ...x, [f.field]: e.target.value }))}
                    placeholder={f.placeholder}
                    maxLength={f.maxLen}
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button onClick={saveObra} size="sm" className="flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" />Salvar
                </Button>
                <Button onClick={() => setEditingObra(false)} variant="ghost" size="sm">Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Nome', value: obra.nome },
                { label: 'Código', value: obra.codigo },
                { label: 'Empresa', value: obra.empresa },
                { label: 'Localização', value: [obra.cidade, obra.estado].filter(Boolean).join(', ') },
                { label: 'Responsável', value: obra.responsavel },
                { label: 'Status', value: obra.ativa ? 'Ativa' : 'Inativa' },
              ].map(row => row.value && (
                <div key={row.label} className="flex justify-between gap-3 py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-xs text-zinc-500 font-medium">{row.label}</span>
                  <span className="text-sm text-zinc-200 text-right">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
