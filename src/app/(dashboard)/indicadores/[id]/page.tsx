'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts/AppContext'
import { indicadoresDB } from '@/lib/db'
import type { IndicadorSemanal } from '@/types'

function Field({
  label, hint, value, onChange, type = 'number', step = '1',
}: {
  label: string; hint?: string; value: string | number; onChange: (v: string) => void
  type?: string; step?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{label}</label>
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
      <input
        type={type} step={step} min={type === 'number' ? '0' : undefined}
        value={value} onChange={e => onChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all"
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-zinc-200 mb-4 pb-3 border-b border-zinc-800">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{children}</div>
    </div>
  )
}

export default function EditarIndicadorPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { obras } = useApp()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [obraId, setObraId] = useState('')
  const [semana, setSemana] = useState('')
  const [ano, setAno] = useState('')
  const [efetivo, setEfetivo] = useState('0')
  const [ausentes, setAusentes] = useState('0')
  const [apr, setApr] = useState('0')
  const [pt, setPt] = useState('0')
  const [desvOcorridos, setDesvOcorridos] = useState('0')
  const [desvSolucionados, setDesvSolucionados] = useState('0')
  const [aloConformes, setAloConformes] = useState('0')
  const [aloNaoConformes, setAloNaoConformes] = useState('0')
  const [aloTotais, setAloTotais] = useState('0')
  const [hht, setHht] = useState('0.0')
  const [pessoasTreinadas, setPessoasTreinadas] = useState('0')
  const [dds, setDds] = useState('0')
  const [acidentes, setAcidentes] = useState('0')
  const [acidenteSemAfastamento, setAcidenteSemAfastamento] = useState('0')
  const [primeirosSocorros, setPrimeirosSocorros] = useState('0')
  const [quaseAcidentes, setQuaseAcidentes] = useState('0')
  const [danosMateriais, setDanosMateriais] = useState('0')
  const [campanhas, setCampanhas] = useState('0')
  const [inspecoes, setInspecoes] = useState('0')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    indicadoresDB.find(id).then(ind => {
      if (!ind) { router.push('/indicadores'); return }
      setObraId(ind.obra_id)
      setSemana(String(ind.semana))
      setAno(String(ind.ano))
      setEfetivo(String(ind.efetivo))
      setAusentes(String(ind.ausentes))
      setApr(String(ind.apr_realizadas))
      setPt(String(ind.pt_realizadas))
      setDesvOcorridos(String(ind.desvios_ocorridos))
      setDesvSolucionados(String(ind.desvios_solucionados))
      setAloConformes(String(ind.alojamentos_conformes))
      setAloNaoConformes(String(ind.alojamentos_nao_conformes))
      setAloTotais(String(ind.alojamentos_totais))
      setHht(String(ind.hht_semanal))
      setPessoasTreinadas(String(ind.pessoas_treinadas))
      setDds(String(ind.dds))
      setAcidentes(String(ind.acidentes))
      setAcidenteSemAfastamento(String(ind.acidente_sem_afastamento))
      setPrimeirosSocorros(String(ind.primeiros_socorros))
      setQuaseAcidentes(String(ind.quase_acidentes))
      setDanosMateriais(String(ind.danos_materiais))
      setCampanhas(String(ind.campanhas))
      setInspecoes(String(ind.inspecoes_semanais))
      setObservacoes(ind.observacoes ?? '')
      setLoading(false)
    }).catch(() => router.push('/indicadores'))
  }, [id, router])

  const obraNome = obras.find(o => o.id === obraId)?.nome ?? ''

  const handleSalvar = async () => {
    setSaving(true); setErro('')
    try {
      await indicadoresDB.update(id, {
        efetivo: parseInt(efetivo) || 0,
        ausentes: parseInt(ausentes) || 0,
        apr_realizadas: parseInt(apr) || 0,
        pt_realizadas: parseInt(pt) || 0,
        desvios_ocorridos: parseInt(desvOcorridos) || 0,
        desvios_solucionados: parseInt(desvSolucionados) || 0,
        alojamentos_conformes: parseInt(aloConformes) || 0,
        alojamentos_nao_conformes: parseInt(aloNaoConformes) || 0,
        alojamentos_totais: parseInt(aloTotais) || 0,
        hht_semanal: parseFloat(hht) || 0,
        pessoas_treinadas: parseInt(pessoasTreinadas) || 0,
        dds: parseInt(dds) || 0,
        acidentes: parseInt(acidentes) || 0,
        acidente_sem_afastamento: parseInt(acidenteSemAfastamento) || 0,
        primeiros_socorros: parseInt(primeirosSocorros) || 0,
        quase_acidentes: parseInt(quaseAcidentes) || 0,
        danos_materiais: parseInt(danosMateriais) || 0,
        campanhas: parseInt(campanhas) || 0,
        inspecoes_semanais: parseInt(inspecoes) || 0,
        observacoes: observacoes || undefined,
      })
      router.push('/indicadores')
    } catch (e) {
      setErro('Erro ao salvar: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  const handleDeletar = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await indicadoresDB.delete(id)
      router.push('/indicadores')
    } catch (e) {
      setErro('Erro ao excluir: ' + (e instanceof Error ? e.message : String(e)))
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/indicadores">
          <button className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Editar Indicadores</h1>
          <p className="text-sm text-zinc-500">
            {obraNome} — Se{semana.padStart(2,'0')}/{ano}
          </p>
        </div>
      </div>

      <Section title="Efetivo MSE">
        <Field label="Efetivo" value={efetivo} onChange={setEfetivo} />
        <Field label="Ausentes" value={ausentes} onChange={setAusentes} />
      </Section>

      <Section title="Documentos de Segurança">
        <Field label="APR / ABRA realizadas" value={apr} onChange={setApr} />
        <Field label="PT / Stop Take Five" value={pt} onChange={setPt} />
      </Section>

      <Section title="Desvios">
        <Field label="Desvios ocorridos" value={desvOcorridos} onChange={setDesvOcorridos} />
        <Field label="Desvios solucionados" value={desvSolucionados} onChange={setDesvSolucionados} />
      </Section>

      <Section title="Alojamentos">
        <Field label="Conformes" value={aloConformes} onChange={setAloConformes} />
        <Field label="Não conformes" value={aloNaoConformes} onChange={setAloNaoConformes} />
        <Field label="Total" value={aloTotais} onChange={setAloTotais} />
      </Section>

      <Section title="Treinamento">
        <Field label="HHT semanal (h)" value={hht} onChange={setHht} step="0.1" />
        <Field label="Pessoas treinadas" value={pessoasTreinadas} onChange={setPessoasTreinadas} />
        <Field label="DDS realizados" value={dds} onChange={setDds} />
      </Section>

      <Section title="Incidentes e Segurança">
        <Field label="Acidentes com afastamento" value={acidentes} onChange={setAcidentes} />
        <Field label="Acidentes sem afastamento" value={acidenteSemAfastamento} onChange={setAcidenteSemAfastamento} />
        <Field label="Primeiros socorros" value={primeirosSocorros} onChange={setPrimeirosSocorros} />
        <Field label="Quase acidentes" value={quaseAcidentes} onChange={setQuaseAcidentes} />
        <Field label="Danos materiais" value={danosMateriais} onChange={setDanosMateriais} />
        <Field label="Campanhas HSE" value={campanhas} onChange={setCampanhas} />
        <Field label="Inspeções semanais" value={inspecoes} onChange={setInspecoes} />
      </Section>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-200 mb-4 pb-3 border-b border-zinc-800">Observações</h3>
        <textarea
          value={observacoes} onChange={e => setObservacoes(e.target.value)}
          rows={3} placeholder="Observações relevantes da semana..."
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all resize-none"
        />
      </div>

      {erro && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{erro}</p>
        </div>
      )}

      <div className="flex gap-3 justify-between pb-6">
        <Button
          variant="outline"
          onClick={handleDeletar}
          disabled={deleting}
          className={confirmDelete
            ? 'border-red-600 text-red-400 hover:bg-red-600/10'
            : 'border-zinc-700 text-zinc-500 hover:text-red-400'}
        >
          {deleting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Excluindo...</>
            : confirmDelete
              ? <><Trash2 className="w-4 h-4 mr-2" />Confirmar exclusão</>
              : <><Trash2 className="w-4 h-4 mr-2" />Excluir</>}
        </Button>

        <div className="flex gap-3">
          <Link href="/indicadores">
            <Button variant="outline" className="border-zinc-700 text-zinc-400">Cancelar</Button>
          </Link>
          <Button
            onClick={handleSalvar} disabled={saving}
            className="text-white font-semibold px-6" style={{ background: '#E8291C' }}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              : <><Save className="w-4 h-4 mr-2" />Salvar Alterações</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
