'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, CheckCircle2, Loader2 } from 'lucide-react'
import { obrasDB } from '@/lib/db'
import { useApp } from '@/contexts/AppContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function NovaObraPage() {
  const router = useRouter()
  const { refresh } = useApp()

  const [form, setForm] = useState({
    nome: '',
    codigo: '',
    empresa: '',
    cidade: '',
    estado: '',
    responsavel: '',
    ativa: true,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.nome.trim()) e.nome = 'Nome da obra é obrigatório'
    if (!form.codigo.trim()) e.codigo = 'Código da obra é obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      await obrasDB.create({ ...form, nome: form.nome.trim(), codigo: form.codigo.trim().toUpperCase() })
      await refresh()
      router.push('/obras')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Nova Obra</h1>
          <p className="text-xs text-zinc-500">Cadastre a obra para depois adicionar TSTs e encarregados</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">

        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-200">Dados da Obra</p>
        </div>

        {/* Nome */}
        <div className="space-y-1.5">
          <Label>Nome da Obra <span className="text-red-400">*</span></Label>
          <Input value={form.nome} onChange={e => set('nome', e.target.value)}
            placeholder="Ex: Residencial Park Tower" />
          {errors.nome && <p className="text-xs text-red-400">{errors.nome}</p>}
        </div>

        {/* Código */}
        <div className="space-y-1.5">
          <Label>Código da Obra <span className="text-red-400">*</span></Label>
          <Input value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())}
            placeholder="Ex: RPT-001" />
          {errors.codigo && <p className="text-xs text-red-400">{errors.codigo}</p>}
        </div>

        {/* Empresa */}
        <div className="space-y-1.5">
          <Label>Empresa / Contratante</Label>
          <Input value={form.empresa} onChange={e => set('empresa', e.target.value)}
            placeholder="Ex: Construtora Alpha S.A." />
        </div>

        {/* Cidade / Estado */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={form.cidade} onChange={e => set('cidade', e.target.value)}
              placeholder="Ex: São Paulo" />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Input value={form.estado} onChange={e => set('estado', e.target.value.toUpperCase().slice(0, 2))}
              placeholder="Ex: SP" maxLength={2} />
          </div>
        </div>

        {/* Responsável */}
        <div className="space-y-1.5">
          <Label>Engenheiro Responsável</Label>
          <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)}
            placeholder="Ex: Eng. Carlos Silva" />
        </div>

        {/* Status */}
        <div className="flex items-center justify-between py-2">
          <Label>Obra Ativa</Label>
          <button
            type="button"
            onClick={() => set('ativa', !form.ativa)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.ativa ? 'bg-amber-500' : 'bg-zinc-700'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${form.ativa ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </motion.div>

      <div className="flex gap-3 mt-4">
        <Button variant="outline" onClick={() => router.back()} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none flex items-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><CheckCircle2 className="w-4 h-4" />Salvar Obra</>}
        </Button>
      </div>
    </div>
  )
}
