'use client'

import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { equipamentosDB } from '@/lib/db-maquinas'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Wrench, Building2 } from 'lucide-react'
import { TIPO_EQUIPAMENTO_LABEL } from '@/types/maquinas'
import type { TipoEquipamento } from '@/types/maquinas'
import { cn } from '@/lib/utils'

const TIPOS: TipoEquipamento[] = ['pemt', 'empilhadeira', 'caminhao', 'guindauto', 'manipuladora', 'retroescavadeira']

const INSP_GREEN = '#10B981'

export default function CadastrarEquipamentoPage() {
  const { obras, refresh, loaded } = useApp()
  const [obraId, setObraId] = useState('')
  const [tipo, setTipo] = useState<TipoEquipamento | ''>('')
  const [nome, setNome] = useState('')
  const [fabricante, setFabricante] = useState('')
  const [modelo, setModelo] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')
  const [anoFabricacao, setAnoFabricacao] = useState('')
  const [placa, setPlaca] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const inputCls = 'w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-800/80 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-zinc-600'
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!obraId || !tipo || !nome.trim() || !numeroSerie.trim()) {
      setError('Preencha os campos obrigatórios: Obra, Tipo, Nome e Número de Série.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await equipamentosDB.create({
        obra_id: obraId,
        tipo: tipo as TipoEquipamento,
        nome: nome.trim(),
        fabricante: fabricante.trim() || undefined,
        modelo: modelo.trim() || undefined,
        numero_serie: numeroSerie.trim(),
        ano_fabricacao: anoFabricacao ? Number(anoFabricacao) : undefined,
        placa: placa.trim() || undefined,
        ativo: true,
      })
      setSuccess(true)
      setObraId('')
      setTipo('')
      setNome('')
      setFabricante('')
      setModelo('')
      setNumeroSerie('')
      setAnoFabricacao('')
      setPlaca('')
      await refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar equipamento.')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: INSP_GREEN + '20' }}>
          <Plus className="w-4 h-4" style={{ color: INSP_GREEN }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Cadastrar Equipamento</h1>
          <p className="text-xs text-zinc-500">Registre uma nova máquina no inventário M&E</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">

        {/* Obra + Tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              <Building2 className="inline w-3.5 h-3.5 mr-1" />
              Obra <span className="text-red-400">*</span>
            </label>
            <select className={inputCls} value={obraId} onChange={e => setObraId(e.target.value)} required>
              <option value="">Selecione a obra</option>
              {obras.filter(o => o.ativa).map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>
              <Wrench className="inline w-3.5 h-3.5 mr-1" />
              Tipo de Equipamento <span className="text-red-400">*</span>
            </label>
            <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value as TipoEquipamento)} required>
              <option value="">Selecione o tipo</option>
              {TIPOS.map(t => (
                <option key={t} value={t}>{TIPO_EQUIPAMENTO_LABEL[t]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Nome */}
        <div>
          <label className={labelCls}>Nome / Identificação <span className="text-red-400">*</span></label>
          <input
            className={inputCls}
            placeholder="Ex.: PEMT Skyjack #03, Empilhadeira Yale 3T"
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
          />
        </div>

        {/* Número de Série */}
        <div>
          <label className={labelCls}>Número de Série <span className="text-red-400">*</span></label>
          <input
            className={inputCls}
            placeholder="Ex.: SJ3219-456789"
            value={numeroSerie}
            onChange={e => setNumeroSerie(e.target.value)}
            required
          />
        </div>

        {/* Fabricante + Modelo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fabricante</label>
            <input
              className={inputCls}
              placeholder="Ex.: Skyjack, Linde, Volvo"
              value={fabricante}
              onChange={e => setFabricante(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Modelo</label>
            <input
              className={inputCls}
              placeholder="Ex.: SJIII 3219"
              value={modelo}
              onChange={e => setModelo(e.target.value)}
            />
          </div>
        </div>

        {/* Ano + Placa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Ano de Fabricação</label>
            <input
              type="number"
              className={inputCls}
              placeholder="Ex.: 2022"
              min={1990}
              max={2030}
              value={anoFabricacao}
              onChange={e => setAnoFabricacao(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Placa (se aplicável)</label>
            <input
              className={inputCls}
              placeholder="Ex.: ABC-1D23"
              value={placa}
              onChange={e => setPlaca(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </motion.p>
          )}
          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <Check className="w-4 h-4" />
              Equipamento cadastrado com sucesso!
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setObraId(''); setTipo(''); setNome(''); setFabricante(''); setModelo(''); setNumeroSerie(''); setAnoFabricacao(''); setPlaca(''); setError('') }}
            className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-all"
          >
            Limpar
          </button>
          <button
            type="submit"
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95',
              saving ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90',
            )}
            style={{ background: INSP_GREEN }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? 'Salvando...' : 'Cadastrar Equipamento'}
          </button>
        </div>
      </form>
    </div>
  )
}
