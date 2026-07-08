'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, FileText, Camera, ChevronRight, Sparkles } from 'lucide-react'

const FEATURES = [
  { icon: Camera,    title: 'Fotos organizadas por local',  desc: 'Agrupe as evidências por local do canteiro com múltiplas fotos por seção' },
  { icon: FileText,  title: 'PDF profissional MSE',         desc: 'Capa, divisores coloridos e páginas de foto com branding MSE' },
  { icon: Sparkles,  title: 'Logo do cliente na capa',      desc: 'Selecione o logo do cliente para aparecer na capa do relatório' },
]

export default function RelatoriosComunicacaoVisualPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl mb-8"
          style={{ background: 'linear-gradient(135deg, #12182E 0%, #1E2D4A 60%, #0F1520 100%)' }}
        >
          {/* Decorative red bar top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#E8291C]" />

          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-white"
                style={{
                  width: `${200 + i * 100}px`,
                  height: `${200 + i * 100}px`,
                  right: `-${50 + i * 30}px`,
                  top: `${-80 + i * 20}px`,
                }}
              />
            ))}
          </div>

          <div className="relative px-8 py-12 lg:px-12 lg:py-14">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-12">

              {/* Text */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-[#E8291C] uppercase tracking-widest">Módulo</span>
                  <div className="h-px w-8 bg-[#E8291C]/40" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-black text-white leading-none mb-2">
                  Comunicação<span className="text-[#E8291C]"> Visual</span>
                </h1>
                <p className="text-zinc-400 text-base mt-3 leading-relaxed max-w-xl">
                  Documente sinalizações, banners, placas e identificações do canteiro.
                  Selecione a obra, organize as fotos por local e gere um PDF impecável com identidade MSE.
                </p>
              </div>

              {/* CTA */}
              <div className="flex-shrink-0">
                <Link
                  href="/relatorios/comunicacao-visual/novo"
                  className="group inline-flex items-center gap-3 px-7 py-4 rounded-2xl font-bold text-white text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-[#E8291C]/25 hover:shadow-[#E8291C]/40"
                  style={{ background: '#E8291C' }}
                >
                  <Plus className="w-5 h-5" />
                  Novo Relatório
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.08 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: '#E8291C18', border: '1px solid #E8291C30' }}
              >
                <f.icon className="w-5 h-5" style={{ color: '#E8291C' }} />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-1">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Start button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-500 text-sm mb-5">Nenhum relatório criado ainda</p>
          <Link
            href="/relatorios/comunicacao-visual/novo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
            style={{ background: '#E8291C' }}
          >
            <Plus className="w-4 h-4" />
            Criar primeiro relatório
          </Link>
        </motion.div>

      </div>
    </div>
  )
}
