'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useApp } from '@/contexts/AppContext'
import { indicadoresDB } from '@/lib/db'

// ── Field component — sem hint, altura uniforme ───────────────────────────────

function Field({
  label, value, onChange, type = 'number', step = '1',
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  step?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider leading-none">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type={type}
        step={step}
        min={type === 'number' ? '0' : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className="h-10 bg-zinc-950 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
      />
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title, cols = 4, children,
}: {
  title: string; cols?: 2 | 3 | 4; children: React.ReactNode
}) {
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }[cols]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-zinc-200 mb-4 pb-3 border-b border-zinc-800">{title}</h3>
      <div className={`grid ${colClass} gap-4`}>
        {children}
      </div>
    </div>
  )
}

// ── Cálculo da semana atual ───────────────────────────────────────────────────

function getSemanaAtual() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

// ── Page (usa useSearchParams → precisa de Suspense wrapper) ──────────────────

function NovoIndicadorPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { obras, loaded } = useApp()

  const [saving, setSaving] = useState(false)
  const [erro,   setErro]   = useState('')

  // Identificação
  const [obraId, setObraId] = useState(params.get('obra_id') ?? '')
  const [semana, setSemana] = useState(String(getSemanaAtual()))
  const [ano,    setAno]    = useState(String(new Date().getFullYear()))

  // Efetivo MSE
  const [efetivo,        setEfetivo]        = useState('0')
  const [hhtTrabalhada,  setHhtTrabalhada]  = useState('0')

  // Documentos de Segurança
  const [apr, setApr] = useState('0')
  const [pt,  setPt]  = useState('0')

  // Desvios
  const [desvOcorridos,    setDesvOcorridos]    = useState('0')
  const [desvSolucionados, setDesvSolucionados] = useState('0')

  // Alojamentos
  const [aloConformes,    setAloConformes]    = useState('0')
  const [aloNaoConformes, setAloNaoConformes] = useState('0')
  const [aloTotais,       setAloTotais]       = useState('0')

  // Treinamento
  const [hhtTreinamento,   setHhtTreinamento]   = useState('0')
  const [pessoasTreinadas, setPessoasTreinadas] = useState('0')

  // Ações
  const [dds,       setDds]       = useState('0')
  const [campanhas, setCampanhas] = useState('0')

  // Acidentes e Incidentes
  const [acidentes,              setAcidentes]              = useState('0')
  const [acidenteSemAfastamento, setAcidenteSemAfastamento] = useState('0')
  const [primeirosSocorros,      setPrimeirosSocorros]      = useState('0')
  const [quaseAcidentes,         setQuaseAcidentes]         = useState('0')
  const [danosMateriais,         setDanosMateriais]         = useState('0')

  const [observacoes, setObservacoes] = useState('')

  const obrasAtivas = obras.filter(o => o.ativa)

  const handleSalvar = async () => {
    if (!obraId) { setErro('Selecione uma obra.'); return }
    if (!semana || !ano) { setErro('Informe semana e ano.'); return }

    setSaving(true)
    setErro('')
    try {
      await indicadoresDB.create({
        obra_id:                  obraId,
        semana:                   parseInt(semana),
        ano:                      parseInt(ano),
        efetivo:                  parseInt(efetivo)            || 0,
        ausentes:                 0,
        hht_trabalhada:           parseFloat(hhtTrabalhada)    || 0,
        apr_realizadas:           parseInt(apr)                || 0,
        pt_realizadas:            parseInt(pt)                 || 0,
        desvios_ocorridos:        parseInt(desvOcorridos)      || 0,
        desvios_solucionados:     parseInt(desvSolucionados)   || 0,
        alojamentos_conformes:    parseInt(aloConformes)       || 0,
        alojamentos_nao_conformes:parseInt(aloNaoConformes)    || 0,
        alojamentos_totais:       parseInt(aloTotais)          || 0,
        hht_semanal:              parseFloat(hhtTreinamento)   || 0,
        pessoas_treinadas:        parseInt(pessoasTreinadas)   || 0,
        dds:                      parseInt(dds)                    || 0,
        campanhas:                parseInt(campanhas)              || 0,
        acidentes:                parseInt(acidentes)              || 0,
        acidente_sem_afastamento: parseInt(acidenteSemAfastamento) || 0,
        primeiros_socorros:       parseInt(primeirosSocorros)      || 0,
        quase_acidentes:          parseInt(quaseAcidentes)         || 0,
        danos_materiais:          parseInt(danosMateriais)         || 0,
        inspecoes_semanais:       0,
        observacoes:              observacoes || undefined,
      })
      router.push('/indicadores')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setErro(`Já existe lançamento para esta obra na Se${semana.padStart(2,'0')}/${ano}. Use a edição para atualizar.`)
      } else {
        setErro('Erro ao salvar: ' + msg)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">

      {/* ── Header ── */}
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

      {/* ── Identificação ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-200 mb-4 pb-3 border-b border-zinc-800">Identificação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1 flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider leading-none">
              Obra <span className="text-red-500">*</span>
            </label>
            <select
              value={obraId}
              onChange={e => setObraId(e.target.value)}
              className="h-10 bg-zinc-950 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            >
              <option value="">Selecione a obra...</option>
              {obrasAtivas.map(o => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider leading-none">
              Semana <span className="text-red-500">*</span>
            </label>
            <input
              type="number" min="1" max="53"
              value={semana}
              onChange={e => setSemana(e.target.value)}
              className="h-10 bg-zinc-950 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider leading-none">
              Ano <span className="text-red-500">*</span>
            </label>
            <input
              type="number" min="2020" max="2099"
              value={ano}
              onChange={e => setAno(e.target.value)}
              className="h-10 bg-zinc-950 border border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>
        {semana && ano && (
          <p className="mt-3 text-xs text-zinc-600">
            Referência:{' '}
            <span className="text-zinc-300 font-bold">Se{semana.padStart(2, '0')}/{ano}</span>
          </p>
        )}
      </div>

      {/* ── Efetivo MSE ── */}
      <Section title="Efetivo MSE" cols={2}>
        <Field label="Efetivo" value={efetivo} onChange={setEfetivo} />
        <Field label="HHT (Hora Homem Trabalhada)" value={hhtTrabalhada} onChange={setHhtTrabalhada} step="1" />
      </Section>

      {/* ── Documentos de Segurança ── */}
      <Section title="Documentos de Segurança" cols={2}>
        <Field label="APR realizadas" value={apr} onChange={setApr} />
        <Field label="PT realizadas" value={pt} onChange={setPt} />
      </Section>

      {/* ── Desvios ── */}
      <Section title="Desvios" cols={2}>
        <Field label="Desvios ocorridos"    value={desvOcorridos}    onChange={setDesvOcorridos}    />
        <Field label="Desvios solucionados" value={desvSolucionados} onChange={setDesvSolucionados} />
      </Section>

      {/* ── Alojamentos ── */}
      <Section title="Alojamentos" cols={3}>
        <Field label="Conformes"     value={aloConformes}    onChange={setAloConformes}    />
        <Field label="Não conformes" value={aloNaoConformes} onChange={setAloNaoConformes} />
        <Field label="Total"         value={aloTotais}       onChange={setAloTotais}       />
      </Section>

      {/* ── Treinamento ── */}
      <Section title="Treinamento" cols={2}>
        <Field label="Hora Homem Treinado" value={hhtTreinamento}   onChange={setHhtTreinamento}   step="0.1" />
        <Field label="Pessoas treinadas"   value={pessoasTreinadas} onChange={setPessoasTreinadas} />
      </Section>

      {/* ── Ações ── */}
      <Section title="Ações" cols={2}>
        <Field label="DDS realizados" value={dds}       onChange={setDds}       />
        <Field label="Campanhas HSE"  value={campanhas} onChange={setCampanhas} />
      </Section>

      {/* ── Acidentes e Incidentes ── */}
      <Section title="Acidentes e Incidentes" cols={3}>
        <Field label="Acidentes com afastamento" value={acidentes}              onChange={setAcidentes}              />
        <Field label="Acidentes sem afastamento" value={acidenteSemAfastamento} onChange={setAcidenteSemAfastamento} />
        <Field label="Primeiros socorros"        value={primeirosSocorros}      onChange={setPrimeirosSocorros}      />
        <Field label="Quase acidentes"           value={quaseAcidentes}         onChange={setQuaseAcidentes}         />
        <Field label="Danos materiais"           value={danosMateriais}         onChange={setDanosMateriais}         />
      </Section>

      {/* ── Observações ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-200 mb-4 pb-3 border-b border-zinc-800">Observações</h3>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={3}
          placeholder="Observações relevantes da semana..."
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
        />
      </div>

      {/* ── Erro ── */}
      {erro && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{erro}</p>
        </div>
      )}

      {/* ── Ações ── */}
      <div className="flex gap-3 justify-end">
        <Link href="/indicadores">
          <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-zinc-200 h-10">
            Cancelar
          </Button>
        </Link>
        <Button
          onClick={handleSalvar}
          disabled={saving}
          className="text-white font-semibold px-6 h-10"
          style={{ background: '#3B82F6' }}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
            : <><Save className="w-4 h-4 mr-2" />Salvar Indicadores</>}
        </Button>
      </div>
    </div>
  )
}

// ── Wrapper com Suspense (necessário por causa do useSearchParams) ─────────────

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
