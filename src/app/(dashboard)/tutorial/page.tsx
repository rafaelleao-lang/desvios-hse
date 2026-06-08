'use client'

import Link from 'next/link'
import { BookOpen, FileText, ArrowRight } from 'lucide-react'

const MANUAIS = [
  {
    href:    '/tutorial/desvios',
    label:   'Manual de Desvios',
    desc:    'Aprenda a registrar, acompanhar e fechar desvios de segurança. Inclui fluxo completo, filtros, relatórios em PDF/XLSX/PPT e Dashboard.',
    cor:     '#E8291C',
    corDim:  'rgba(232,41,28,0.1)',
    border:  'rgba(232,41,28,0.25)',
    secoes:  '23 seções',
  },
  {
    href:    '/tutorial/inspecoes',
    label:   'Manual de Inspeções HSE',
    desc:    'Guia para realizar inspeções em campo, registrar evidências fotográficas, classificar desvios e reconhecimentos e emitir relatório PDF.',
    cor:     '#10B981',
    corDim:  'rgba(16,185,129,0.1)',
    border:  'rgba(16,185,129,0.25)',
    secoes:  '15 seções',
  },
  {
    href:    '/tutorial/indicadores',
    label:   'Manual de Indicadores HSE',
    desc:    'Entenda como lançar os indicadores semanais de segurança por obra, acompanhar o histórico e interpretar os gráficos e KPIs.',
    cor:     '#3B82F6',
    corDim:  'rgba(59,130,246,0.1)',
    border:  'rgba(59,130,246,0.25)',
    secoes:  '21 seções',
  },
  {
    href:    '/tutorial/residuos',
    label:   'Manual de Gestão de Resíduos',
    desc:    'Aprenda a registrar entradas e retiradas, acompanhar o saldo por obra, configurar fornecedores, gerar relatórios PDF e configurar alertas por e-mail.',
    cor:     '#22C55E',
    corDim:  'rgba(34,197,94,0.1)',
    border:  'rgba(34,197,94,0.25)',
    secoes:  '8 seções',
  },
]

export default function TutorialPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-100">Tutoriais</h1>
          <p className="text-sm text-zinc-500">Manuais completos do sistema MSE HSE</p>
        </div>
      </div>

      <p className="text-sm text-zinc-400 mt-4 mb-8 leading-relaxed">
        Selecione um módulo abaixo para abrir o manual interativo. Cada manual contém explicações
        detalhadas, exemplos visuais, fluxos passo a passo e referência completa de campos.
      </p>

      <div className="flex flex-col gap-4">
        {MANUAIS.map(m => (
          <Link
            key={m.href}
            href={m.href}
            className="group block rounded-2xl border p-5 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
            style={{ background: m.corDim, borderColor: m.border }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: m.cor + '20', border: `1px solid ${m.cor}40` }}
              >
                <FileText className="w-5 h-5" style={{ color: m.cor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-zinc-100 text-base">{m.label}</span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: m.cor + '20', color: m.cor }}
                  >
                    {m.secoes}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{m.desc}</p>
              </div>
              <ArrowRight
                className="w-4 h-4 flex-shrink-0 mt-1 transition-transform group-hover:translate-x-1"
                style={{ color: m.cor }}
              />
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
