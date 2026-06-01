'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts/AppContext'
import { indicadoresDB } from '@/lib/db'

function Field({
  label, hint, value, onChange, type = 'number', step = '1', required = false,
}: {
  label: string; hint?: string; value: string | number; onChange: (v: string) => void
  type?: string; step?: string; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
      <input
        type={type}
        step={step}
        min={type === 'number' ? '0' : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all"
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-zinc-200 mb-4 pb-3 border-b border-zinc-800">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {children}
      </div>
    </div>
  )
}

const SEMANA_ATUAL = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

const ZERO = '0'

function NovoIndicadorPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { obras, loaded } = useApp()

  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const [obraId, setObraId] = useState(params.get('obra_id') ?? '')
  const [semana, setSemana] = useState(String(SEMANA_ATUAL()))
  const [ano, setAno] = useState(String(new Date().getFullYear()))

  // Efetivo
  const [efetivo, setEfetivo] = useState(ZERO)
  const [ausentes, setAusentes] = useState(ZERO)

  // Documentos
  const [apr, setApr] = useState(ZERO)
  const [pt, setPt] = useState(ZERO)

  // Desvios
  const [desvOcorridos, setDesvOcorridos] = useState(ZERO)
  const [desvSolucionados, setDesvSolucionados] = useState(ZERO)

  // Alojamentos
  const [aloConformes, setAloConformes] = useState(ZERO)
  const [aloNaoConformes, setAloNaoConformes] = useState(ZERO)
  const [aloTotais, setAloTotais] = useState(ZERO)

  // Treinamento
  const [hht, setHht] = useState('0.0')
  const [pessoasTreinadas, setPessoasTreinadas] = useState(ZERO)
  const [dds, setDds] = useState(ZERO)

  // Incidentes
  const [acidentes, setAcidentes] = useState(ZERO)
  const [acidenteSemAfastamento, setAcidenteSemAfastamento] = useState(ZERO)
  const [primeirosSocorros, setPrimeirosSocorros] = useState(ZERO)
  const [quaseAcidentes, setQuaseAcidentes] = useState(ZERO)
  const [danosMateriais, setDanosMateriais] = useState(ZERO)

  // Outros
  const [campanhas, setCampanhas] = useState(ZERO)
  const [inspecoes, setInspecoes] = useState(ZERO)
  const [observacoes, setObservacoes] = useState('')

  const obrasAtivas = obras.filter(o => o.ativa)

  const handleSalvar = async () => {
    if (!obraId) { setErro('Selecione uma obra.'); return }
    if (!semana || !ano) { setErro('Informe semana e ano.'); return }

    setSaving(true)
    setErro('')
    try {
      await indicadoresDB.create({
        obra_id: obraId,
        semana: parseInt(semana),
        ano: parseInt(ano),
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setErro(`Já existe um lançamento para esta obra na Se${semana.padStart(2,'0')}/${ano}. Use a edição para atualizar.`)
      } else {
        setErro('Erro ao salvar: ' + msg)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/indicadores">
          <button className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Lançar Indicadores HSE</h1>
          <p className="text-sm text-zinc-500">Preencha os indicadores semanais da obra</p>
        </div>
      </div>

      {/* Identificação */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-200 mb-4 pb-3 border-b border-zinc-800">
          Identificação
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1 flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Obra<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              value={obraId}
              onChange={e => setObraId(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all"
            >
              <option value="">Selecione a obra...</option>
              {obrasAtivas.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Semana<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="number" min="1" max="53"
              value={semana}
              onChange={e => setSemana(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Ano<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="number" min="2020" max="2099"
              value={ano}
              onChange={e => setAno(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all"
            />
          </div>
        </div>
        {semana && ano && (
          <p className="mt-3 text-xs text-zinc-500">
            Referência:{' '}
            <span className="text-zinc-300 font-semibold">
              Se{semana.padStart(2, '0')}/{ano}
            </span>
          </p>
        )}
      </div>

      {/* Efetivo */}
      <Section title="Efetivo MSE">
        <Field label="Efetivo" hint="Headcount total na semana" value={efetivo} onChange={setEfetivo} />
        <Field label="Ausentes" value={ausentes} onChange={setAusentes} />
      </Section>

      {/* Documentos de Segurança */}
      <Section title="Documentos de Segurança">
        <Field label="APR / ABRA realizadas" hint="Análise Preliminar de Risco" value={apr} onChange={setApr} />
        <Field label="PT / Stop Take Five" hint="Permissão de Trabalho" value={pt} onChange={setPt} />
      </Section>

      {/* Desvios */}
      <Section title="Desvios">
        <Field label="Desvios ocorridos" value={desvOcorridos} onChange={setDesvOcorridos} />
        <Field label="Desvios solucionados" value={desvSolucionados} onChange={setDesvSolucionados} />
      </Section>

      {/* Alojamentos */}
      <Section title="Alojamentos">
        <Field label="Conformes" value={aloConformes} onChange={setAloConformes} />
        <Field label="Não conformes" value={aloNaoConformes} onChange={setAloNaoConformes} />
        <Field label="Total" value={aloTotais} onChange={setAloTotais} />
      </Section>

      {/* Treinamento */}
      <Section title="Treinamento">
        <Field label="HHT semanal" hint="Homem Hora Treinamento (horas)" value={hht} onChange={setHht} step="0.1" />
        <Field label="Pessoas treinadas" value={pessoasTreinadas} onChange={setPessoasTreinadas} />
        <Field label="DDS realizados" hint="Diálogo Diário de Segurança" value={dds} onChange={setDds} />
      </Section>

      {/* Incidentes */}
      <Section title="Incidentes e Segurança">
        <Field label="Acidentes com afastamento" value={acidentes} onChange={setAcidentes} />
        <Field label="Acidentes sem afastamento" value={acidenteSemAfastamento} onChange={setAcidenteSemAfastamento} />
        <Field label="Primeiros socorros" value={primeirosSocorros} onChange={setPrimeirosSocorros} />
        <Field label="Quase acidentes" value={quaseAcidentes} onChange={setQuaseAcidentes} />
        <Field label="Danos materiais" value={danosMateriais} onChange={setDanosMateriais} />
        <Field label="Campanhas HSE" value={campanhas} onChange={setCampanhas} />
        <Field label="Inspeções semanais" value={inspecoes} onChange={setInspecoes} />
      </Section>

      {/* Observações */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-200 mb-4 pb-3 border-b border-zinc-800">Observações</h3>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={3}
          placeholder="Observações relevantes da semana..."
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all resize-none"
        />
      </div>

      {/* Error */}
      {erro && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{erro}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-6">
        <Link href="/indicadores">
          <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-zinc-200">
            Cancelar
          </Button>
        </Link>
        <Button
          onClick={handleSalvar}
          disabled={saving}
          className="text-white font-semibold px-6"
          style={{ background: '#E8291C' }}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Salvar Indicadores</>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function NovoIndicadorPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    }>
      <NovoIndicadorPage />
    </Suspense>
  )
}
