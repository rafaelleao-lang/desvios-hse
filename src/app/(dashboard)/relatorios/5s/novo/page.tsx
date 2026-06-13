'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import JsPDF from 'jspdf'
import {
  ChevronRight, ChevronLeft, Plus, X, Camera, Upload,
  Check, FileDown, Loader2, Building2, User, Calendar,
  Hash, AlertCircle, FileText, Image as ImageIcon,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { cn, compressImage } from '@/lib/utils'
import type { Obra, TST } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Secao {
  id: string
  local: string
  disciplina: string
  fotos: File[]
}

interface ReportFormState {
  obraId: string
  semana: string
  dataInicio: string
  dataFim: string
  tstId: string
  logoCliente: string
  secoes: Secao[]
}

interface ImgInfo {
  dataUrl: string
  w: number
  h: number
  format: 'JPEG' | 'PNG' | 'WEBP'
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CLIENT_LOGOS = [
  { id: 'porto-itapoa',  label: 'Porto de Itapoá',  path: '/logos/clientes/porto-itapoa.png',  ext: 'PNG' as const },
  { id: 'cnpem',         label: 'CNPEM',             path: '/logos/clientes/cnpem.png',          ext: 'PNG' as const },
  { id: 'novo-nordisk',  label: 'Novo Nordisk',      path: '/logos/clientes/novo-nordisk.png',   ext: 'PNG' as const },
  { id: 'hitachi',       label: 'Hitachi',           path: '/logos/clientes/hitachi.jpg',        ext: 'JPEG' as const },
]

const DISCIPLINAS = [
  'Limpeza e Organização', 'Organização', 'Limpeza',
  'Descarte', 'Padronização', 'Disciplina',
]

const MSE_RED   = '#E8291C'
const NAVY_DARK = '#0D1422'

// ── PDF Helpers ───────────────────────────────────────────────────────────────

function h2r(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ]
}

async function fileToImgInfo(file: File): Promise<ImgInfo | null> {
  try {
    const compressed = await compressImage(file, 1400)
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const img = new Image()
        img.onload = () => {
          const ext = file.type.includes('png') ? 'PNG' : file.type.includes('webp') ? 'WEBP' : 'JPEG'
          resolve({ dataUrl, w: img.naturalWidth, h: img.naturalHeight, format: ext })
        }
        img.onerror = () => resolve(null)
        img.src = dataUrl
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(compressed)
    })
  } catch {
    return null
  }
}

async function urlToImgInfo(url: string): Promise<ImgInfo | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const file = new File([blob], 'logo', { type: blob.type })
    return await fileToImgInfo(file)
  } catch {
    return null
  }
}

function fitInBox(
  imgW: number, imgH: number,
  boxW: number, boxH: number,
): { w: number; h: number; ox: number; oy: number } {
  const scale = Math.min(boxW / imgW, boxH / imgH)
  const w = imgW * scale
  const h = imgH * scale
  return { w, h, ox: (boxW - w) / 2, oy: (boxH - h) / 2 }
}

// ── PDF Page Drawers ──────────────────────────────────────────────────────────

function drawCover(
  doc: any,
  info: { obraName: string; cidade: string; estado: string; semana: string; dataInicio: string; dataFim: string; tst: string },
  logoImg: ImgInfo | null,
  logoMSE: ImgInfo | null,
) {
  const W = 297, H = 210
  const split = 162

  // Left panel — dark navy
  doc.setFillColor(...h2r(NAVY_DARK))
  doc.rect(0, 0, split, H, 'F')

  // Right panel — white
  doc.setFillColor(255, 255, 255)
  doc.rect(split, 0, W - split, H, 'F')

  // Left: "RELATÓRIO" label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 210)
  doc.text('RELATÓRIO', 18, 38)

  // Left: "5S" big
  doc.setFont('helvetica', 'black')
  doc.setFontSize(74)
  doc.setTextColor(255, 255, 255)
  doc.text('5S', 18, 80)

  // Red accent line
  doc.setFillColor(...h2r(MSE_RED))
  doc.rect(18, 88, 40, 2.5, 'F')

  // Obra name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  const obraLines = doc.splitTextToSize(info.obraName, split - 36)
  doc.text(obraLines, 18, 100)

  // City/state
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(160, 160, 190)
  const cityLine = [info.cidade, info.estado].filter(Boolean).join(' — ')
  if (cityLine) doc.text(cityLine, 18, 110)

  // 5S colored blocks at bottom left
  const colors5S = ['#E8291C', '#F97316', '#EAB308', '#22C55E', '#3B82F6']
  const labels5S = ['Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke']
  const blockW = 24, blockH = 8, startX = 18, startY = H - 28
  colors5S.forEach((col, i) => {
    doc.setFillColor(...h2r(col))
    doc.roundedRect(startX + i * (blockW + 3), startY, blockW, blockH, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(255, 255, 255)
    doc.text(labels5S[i], startX + i * (blockW + 3) + blockW / 2, startY + 5, { align: 'center' })
  })

  // Right: MSE logo
  if (logoMSE) {
    const { w, h } = fitInBox(logoMSE.w, logoMSE.h, 30, 30)
    doc.addImage(logoMSE.dataUrl, logoMSE.format, split + 7, 4, w, h)
  } else {
    doc.setFont('helvetica', 'black')
    doc.setFontSize(36)
    doc.setTextColor(...h2r(MSE_RED))
    doc.text('mse', split + 7, 20)
  }

  // Right: client logo
  const logoMaxH = 32, logoMaxW = 110
  if (logoImg) {
    const { w, h, ox, oy } = fitInBox(logoImg.w, logoImg.h, logoMaxW, logoMaxH)
    const lx = split + 7 + ox
    const ly = 28 + oy
    doc.addImage(logoImg.dataUrl, logoImg.format, lx, ly, w, h)
  }

  // Separator
  doc.setDrawColor(220, 220, 230)
  doc.setLineWidth(0.4)
  doc.line(split + 7, 68, W - 7, 68)

  // Semana label
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 140)
  doc.text('Semana de Envio', split + 7, 78)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(30, 30, 50)
  doc.text(info.semana ? `Semana ${info.semana}` : '—', split + 7, 92)

  // Date range
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 140)
  if (info.dataInicio || info.dataFim) {
    const fmt = (d: string) => {
      if (!d) return '—'
      const [y, m, dd] = d.split('-')
      return `${dd}/${m}/${y}`
    }
    doc.text(`${fmt(info.dataInicio)}  à  ${fmt(info.dataFim)}`, split + 7, 101)
  }

  // Info box — TST
  if (info.tst) {
    doc.setFillColor(245, 245, 250)
    doc.roundedRect(split + 7, 108, W - split - 14, 16, 3, 3, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(140, 140, 160)
    doc.text('Técnico de Segurança do Trabalho', split + 12, 114)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(40, 40, 60)
    doc.text(info.tst, split + 12, 121)
  }

  // MSE footer on right
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(180, 180, 200)
  doc.text('MSE Engenharia · Gestão HSE', split + 7, H - 8)
}

function drawDivisor(doc: any, local: string, disciplina: string) {
  const W = 297, H = 210

  doc.setFillColor(...h2r(MSE_RED))
  doc.rect(0, 0, W, H, 'F')

  // Large discipline text
  doc.setFont('helvetica', 'black')
  doc.setFontSize(52)
  doc.setTextColor(255, 255, 255)
  const lines = doc.splitTextToSize(disciplina.toUpperCase(), W - 60)
  doc.text(lines, W / 2, H / 2 - (lines.length - 1) * 28 + 10, { align: 'center' })

  // Local label below
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(255, 200, 200)
  doc.text(local.toUpperCase(), W / 2, H / 2 + 38, { align: 'center' })

  // MSE brand bottom-right
  doc.setFont('helvetica', 'black')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text('mse', W - 14, H - 10, { align: 'right' })
}

function drawPhotoPage(
  doc: any,
  local: string,
  disciplina: string,
  photos: ImgInfo[],
  logoMSE: ImgInfo | null,
) {
  const W = 297, H = 210
  const headerH = 24
  const footerH = 8
  const padX = 8
  const gapY = 4

  // Red top bar
  doc.setFillColor(...h2r(MSE_RED))
  doc.rect(0, 0, W, 5, 'F')

  // White header background
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 5, W, headerH, 'F')

  // Header: "Relatório 5S" title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 30, 50)
  doc.text('Relatório 5S', padX, 15)

  // Header: MSE logo right
  if (logoMSE) {
    const logoSize = 15
    const { w, h } = fitInBox(logoMSE.w, logoMSE.h, logoSize, logoSize)
    doc.addImage(logoMSE.dataUrl, logoMSE.format, W - padX - w, 5 + (logoSize - h) / 2, w, h)
  } else {
    doc.setFont('helvetica', 'black')
    doc.setFontSize(14)
    doc.setTextColor(...h2r(MSE_RED))
    doc.text('mse', W - padX, 15, { align: 'right' })
  }

  // Separator line
  doc.setDrawColor(220, 220, 230)
  doc.setLineWidth(0.4)
  doc.line(padX, 20, W - padX, 20)

  // Tags: Local + Disciplina
  const drawTag = (label: string, value: string, x: number) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(130, 130, 150)
    doc.text(label + ': ', x, 27)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(40, 40, 60)
    doc.setFont('helvetica', 'normal')
    const labelW = doc.getTextWidth(label + ': ')
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + labelW, 27)
  }
  drawTag('Local', local, padX)
  drawTag('Disciplina', disciplina, padX + 110)

  // Photo area
  const photoAreaTop = 5 + headerH + gapY
  const photoAreaH = H - photoAreaTop - footerH - gapY

  if (photos.length === 1) {
    const { w, h, ox, oy } = fitInBox(photos[0].w, photos[0].h, W - padX * 2, photoAreaH)
    doc.addImage(photos[0].dataUrl, photos[0].format, padX + ox, photoAreaTop + oy, w, h)
  } else if (photos.length === 2) {
    const slotW = (W - padX * 2 - 4) / 2
    photos.forEach((img, i) => {
      const { w, h, ox, oy } = fitInBox(img.w, img.h, slotW, photoAreaH)
      const baseX = padX + i * (slotW + 4)
      doc.addImage(img.dataUrl, img.format, baseX + ox, photoAreaTop + oy, w, h)
    })
  }

  // Footer
  doc.setFillColor(245, 245, 248)
  doc.rect(0, H - footerH, W, footerH, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(160, 160, 180)
  doc.text('MSE Engenharia · Gestão HSE · Relatório 5S', padX, H - 2.5)
}

function drawClosing(doc: any, logoMSE: ImgInfo | null) {
  const W = 297, H = 210

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')

  // Red bars top/bottom
  doc.setFillColor(...h2r(MSE_RED))
  doc.rect(0, 0, W, 6, 'F')
  doc.rect(0, H - 6, W, 6, 'F')

  // MSE logo centered
  if (logoMSE) {
    const logoSize = 70
    const { w, h } = fitInBox(logoMSE.w, logoMSE.h, logoSize, logoSize)
    doc.addImage(logoMSE.dataUrl, logoMSE.format, (W - w) / 2, H / 2 - h / 2 - 12, w, h)
  } else {
    doc.setFont('helvetica', 'black')
    doc.setFontSize(68)
    doc.setTextColor(...h2r(MSE_RED))
    doc.text('mse', W / 2, H / 2 + 8, { align: 'center' })
  }

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(100, 100, 120)
  doc.text('MSE Engenharia · Gestão HSE', W / 2, H / 2 + 30, { align: 'center' })
}

// ── PDF Generator ─────────────────────────────────────────────────────────────

async function gerarPDF(form: ReportFormState, obra: Obra | undefined, tst: TST | undefined) {
  // Load logos in parallel
  const [logoMSE, logoImgResult] = await Promise.all([
    urlToImgInfo('/logos/mse.png'),
    form.logoCliente
      ? urlToImgInfo(CLIENT_LOGOS.find(l => l.id === form.logoCliente)?.path ?? '')
      : Promise.resolve(null),
  ])
  const logoImg = logoImgResult

  // Load all section photos as ImgInfo (parallel)
  const secoesComImgs = await Promise.all(
    form.secoes.map(async (s) => ({
      ...s,
      imgs: (await Promise.all(s.fotos.map(fileToImgInfo))).filter(Boolean) as ImgInfo[],
    }))
  )

  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Cover
  drawCover(doc, {
    obraName:  obra?.nome ?? 'Obra',
    cidade:    obra?.cidade ?? '',
    estado:    obra?.estado ?? '',
    semana:    form.semana,
    dataInicio: form.dataInicio,
    dataFim:    form.dataFim,
    tst:       tst?.nome ?? '',
  }, logoImg, logoMSE)

  // Sections
  for (const secao of secoesComImgs) {
    if (secao.imgs.length === 0) continue

    doc.addPage()
    drawDivisor(doc, secao.local, secao.disciplina)

    // 2 photos per page
    for (let i = 0; i < secao.imgs.length; i += 2) {
      const chunk = secao.imgs.slice(i, i + 2)
      doc.addPage()
      drawPhotoPage(doc, secao.local, secao.disciplina, chunk, logoMSE)
    }
  }

  // Closing
  doc.addPage()
  drawClosing(doc, logoMSE)

  const obraName = obra?.nome ?? 'Obra'
  doc.save(`Relatório 5S - ${obraName} - Semana ${form.semana || 'S'}.pdf`)
}

// ── UI: Step Indicator ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Identificação' },
    { n: 2, label: 'Seções' },
    { n: 3, label: 'Gerar PDF' },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done   = s.n < current
        const active = s.n === current
        return (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  done   && 'bg-[#E8291C] text-white',
                  active && 'bg-[#E8291C] text-white ring-4 ring-[#E8291C]/25',
                  !done && !active && 'bg-zinc-800 text-zinc-500',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <span className={cn(
                'text-xs mt-1.5 font-medium whitespace-nowrap',
                active ? 'text-zinc-100' : 'text-zinc-500',
              )}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'h-px w-16 mx-2 mb-5 transition-colors',
                done ? 'bg-[#E8291C]' : 'bg-zinc-800',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── UI: Step 1 — Identificação ────────────────────────────────────────────────

function Step1({
  form,
  setForm,
  obras,
  tsts,
  loaded,
}: {
  form: ReportFormState
  setForm: React.Dispatch<React.SetStateAction<ReportFormState>>
  obras: Obra[]
  tsts: TST[]
  loaded: boolean
}) {
  const obra = obras.find(o => o.id === form.obraId)
  const tstsFiltrados = tsts.filter(t => t.obra_id === form.obraId)
  const obrasAtivas = obras.filter(o => o.ativa)

  return (
    <div className="space-y-6">

      {/* Obra */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Obra
        </label>
        <select
          value={form.obraId}
          onChange={e => setForm(f => ({ ...f, obraId: e.target.value, tstId: '' }))}
          disabled={!loaded}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-[#E8291C]/60 focus:ring-2 focus:ring-[#E8291C]/15 transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          <option value="">{loaded ? 'Selecione uma obra...' : 'Carregando obras...'}</option>
          {obrasAtivas.map(o => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
      </div>

      {/* Auto-fill info card */}
      <AnimatePresence>
        {obra && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Hash, label: 'Código', value: obra.codigo },
                { icon: Building2, label: 'Empresa', value: obra.empresa },
                { icon: User, label: 'Responsável', value: obra.responsavel },
                { icon: User, label: 'Cidade', value: [obra.cidade, obra.estado].filter(Boolean).join(' — ') },
              ].map(item => item.value && (
                <div key={item.label} className="flex items-start gap-2">
                  <item.icon className="w-3.5 h-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-500">{item.label}</p>
                    <p className="text-xs font-semibold text-zinc-200">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TST + Semana row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            TST
          </label>
          <select
            value={form.tstId}
            onChange={e => setForm(f => ({ ...f, tstId: e.target.value }))}
            disabled={!loaded || !form.obraId}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-[#E8291C]/60 focus:ring-2 focus:ring-[#E8291C]/15 transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            <option value="">
              {!loaded ? 'Carregando...' : !form.obraId ? 'Selecione uma obra primeiro' : 'Selecione o TST...'}
            </option>
            {tstsFiltrados.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Semana de Envio
          </label>
          <input
            type="number"
            min="1"
            max="53"
            value={form.semana}
            onChange={e => setForm(f => ({ ...f, semana: e.target.value }))}
            placeholder="Ex: 23"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#E8291C]/60 focus:ring-2 focus:ring-[#E8291C]/15 transition-all"
          />
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <Calendar className="w-3 h-3 inline mr-1" />
            Data Início
          </label>
          <input
            type="date"
            value={form.dataInicio}
            onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-[#E8291C]/60 focus:ring-2 focus:ring-[#E8291C]/15 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <Calendar className="w-3 h-3 inline mr-1" />
            Data Fim
          </label>
          <input
            type="date"
            value={form.dataFim}
            onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-[#E8291C]/60 focus:ring-2 focus:ring-[#E8291C]/15 transition-all"
          />
        </div>
      </div>

      {/* Logo picker */}
      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Logo do Cliente (opcional)
        </label>
        <div className="grid grid-cols-3 gap-3">
          {/* Sem logo */}
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, logoCliente: '' }))}
            className={cn(
              'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium',
              form.logoCliente === ''
                ? 'border-[#E8291C] bg-[#E8291C]/10 text-[#E8291C]'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600',
            )}
          >
            <X className="w-5 h-5" />
            <span className="text-xs">Sem logo</span>
          </button>

          {CLIENT_LOGOS.map(logo => (
            <button
              key={logo.id}
              type="button"
              onClick={() => setForm(f => ({ ...f, logoCliente: logo.id }))}
              className={cn(
                'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all',
                form.logoCliente === logo.id
                  ? 'border-[#E8291C] bg-[#E8291C]/10'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.path}
                alt={logo.label}
                className="h-8 object-contain"
              />
              <span className={cn(
                'text-xs font-medium',
                form.logoCliente === logo.id ? 'text-zinc-100' : 'text-zinc-500',
              )}>
                {logo.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── UI: SecaoCard ─────────────────────────────────────────────────────────────

function SecaoCard({
  secao,
  index,
  onChange,
  onRemove,
}: {
  secao: Secao
  index: number
  onChange: (s: Secao) => void
  onRemove: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
    onChange({ ...secao, fotos: [...secao.fotos, ...imgs] })
  }, [secao, onChange])

  const removePhoto = (i: number) => {
    const f = [...secao.fotos]
    f.splice(i, 1)
    onChange({ ...secao, fotos: f })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          Seção {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Local + Disciplina */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Local</label>
          <input
            type="text"
            value={secao.local}
            onChange={e => onChange({ ...secao, local: e.target.value })}
            placeholder="Ex: Almoxarifado"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#E8291C]/60 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Disciplina</label>
          <input
            list={`disc-list-${secao.id}`}
            type="text"
            value={secao.disciplina}
            onChange={e => onChange({ ...secao, disciplina: e.target.value })}
            placeholder="Ex: Limpeza e Organização"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#E8291C]/60 transition-all"
          />
          <datalist id={`disc-list-${secao.id}`}>
            {DISCIPLINAS.map(d => <option key={d} value={d} />)}
          </datalist>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        className={cn(
          'border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer',
          dragging
            ? 'border-[#E8291C] bg-[#E8291C]/5'
            : 'border-zinc-700 hover:border-zinc-500',
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
        <p className="text-xs text-zinc-500">
          Arraste fotos aqui ou <span className="text-[#E8291C] font-medium">clique para selecionar</span>
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">JPG, PNG, WEBP</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={e => addFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => addFiles(e.target.files)}
      />

      {/* Camera button */}
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Camera className="w-3.5 h-3.5" />
        Tirar foto com câmera
      </button>

      {/* Photo thumbnails */}
      {secao.fotos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {secao.fotos.map((f, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(f)}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── UI: Step 2 — Seções ───────────────────────────────────────────────────────

function Step2({
  form,
  setForm,
}: {
  form: ReportFormState
  setForm: React.Dispatch<React.SetStateAction<ReportFormState>>
}) {
  const addSecao = () => {
    setForm(f => ({
      ...f,
      secoes: [
        ...f.secoes,
        { id: crypto.randomUUID(), local: '', disciplina: '', fotos: [] },
      ],
    }))
  }

  const updateSecao = (id: string, s: Secao) => {
    setForm(f => ({ ...f, secoes: f.secoes.map(x => x.id === id ? s : x) }))
  }

  const removeSecao = (id: string) => {
    setForm(f => ({ ...f, secoes: f.secoes.filter(x => x.id !== id) }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {form.secoes.length === 0
            ? 'Adicione pelo menos uma seção com fotos.'
            : `${form.secoes.length} seção${form.secoes.length > 1 ? 'ões' : ''} · ${form.secoes.reduce((a, s) => a + s.fotos.length, 0)} fotos`}
        </p>
      </div>

      <AnimatePresence>
        {form.secoes.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SecaoCard
              secao={s}
              index={i}
              onChange={(updated) => updateSecao(s.id, updated)}
              onRemove={() => removeSecao(s.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <button
        type="button"
        onClick={addSecao}
        className="w-full py-3.5 rounded-xl border-2 border-dashed border-zinc-700 hover:border-[#E8291C]/50 hover:bg-[#E8291C]/5 text-zinc-500 hover:text-[#E8291C] text-sm font-medium transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Adicionar Seção
      </button>
    </div>
  )
}

// ── UI: Step 3 — Gerar PDF ────────────────────────────────────────────────────

function Step3({
  form,
  obra,
  tst,
  onGenerate,
  generating,
  done,
}: {
  form: ReportFormState
  obra: Obra | undefined
  tst: TST | undefined
  onGenerate: () => void
  generating: boolean
  done: boolean
}) {
  const totalFotos = form.secoes.reduce((a, s) => a + s.fotos.length, 0)
  const estimatedPages = 1 + form.secoes.filter(s => s.fotos.length > 0).reduce((a, s) => {
    return a + 1 + Math.ceil(s.fotos.length / 2)
  }, 0) + 1

  const clienteLabel = CLIENT_LOGOS.find(l => l.id === form.logoCliente)?.label

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Resumo do Relatório</h3>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Obra',         value: obra?.nome ?? '—' },
            { label: 'Semana',       value: form.semana ? `Semana ${form.semana}` : '—' },
            { label: 'TST',          value: tst?.nome ?? '—' },
            { label: 'Cliente',      value: clienteLabel ?? 'Sem logo' },
            { label: 'Seções',       value: String(form.secoes.length) },
            { label: 'Total fotos',  value: String(totalFotos) },
            { label: 'Páginas est.', value: String(estimatedPages) },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-semibold text-zinc-100 mt-0.5 truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section list */}
      {form.secoes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Seções</p>
          {form.secoes.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-[#E8291C]/20 text-[#E8291C] flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{s.local || 'Sem local'}</p>
                <p className="text-xs text-zinc-500">{s.disciplina || 'Sem disciplina'}</p>
              </div>
              <div className="flex items-center gap-1 text-zinc-500">
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="text-xs">{s.fotos.length}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {totalFotos === 0 && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">Nenhuma foto adicionada. O PDF será gerado apenas com a capa e a página de encerramento.</p>
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating || done}
        className={cn(
          'w-full py-4 rounded-2xl font-bold text-white text-sm transition-all flex items-center justify-center gap-3 shadow-lg',
          done
            ? 'bg-green-600 shadow-green-600/20'
            : generating
              ? 'bg-zinc-700 cursor-wait'
              : 'bg-[#E8291C] hover:bg-[#C9200F] shadow-[#E8291C]/25 hover:shadow-[#E8291C]/40 active:scale-[0.98]',
        )}
      >
        {done ? (
          <>
            <Check className="w-5 h-5" />
            PDF gerado com sucesso!
          </>
        ) : generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Gerando PDF...
          </>
        ) : (
          <>
            <FileDown className="w-5 h-5" />
            Gerar e Baixar PDF
          </>
        )}
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NovoRelatorio5SPage() {
  const { obras, tsts, loaded } = useApp()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState<ReportFormState>({
    obraId:     '',
    semana:     '',
    dataInicio: '',
    dataFim:    '',
    tstId:      '',
    logoCliente: '',
    secoes:     [],
  })

  const obra = obras.find(o => o.id === form.obraId)
  const tst  = tsts.find(t => t.id === form.tstId)

  const canNext1 = !!form.obraId
  const canNext2 = form.secoes.length > 0

  const handleGenerate = async () => {
    if (generating || done) return
    setGenerating(true)
    try {
      await gerarPDF(form, obra, tst)
      setDone(true)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-[#E8291C]" />
            <span className="text-xs font-semibold text-[#E8291C] uppercase tracking-widest">Novo Relatório</span>
          </div>
          <h1 className="text-2xl font-black text-white">Relatório <span className="text-[#E8291C]">5S</span></h1>
          <p className="text-sm text-zinc-500 mt-1">Preencha as informações e adicione as fotos para gerar o PDF.</p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 16 }}
            animate={{ x: 0 }}
            exit={{ x: -16 }}
            transition={{ duration: 0.18 }}
          >
            {step === 1 && (
              <Step1 form={form} setForm={setForm} obras={obras} tsts={tsts} loaded={loaded} />
            )}
            {step === 2 && (
              <Step2 form={form} setForm={setForm} />
            )}
            {step === 3 && (
              <Step3
                form={form}
                obra={obra}
                tst={tst}
                onGenerate={handleGenerate}
                generating={generating}
                done={done}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(1, s - 1) as 1 | 2 | 3)}
            disabled={step === 1}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
              step === 1
                ? 'text-zinc-700 cursor-not-allowed'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(s => Math.min(3, s + 1) as 1 | 2 | 3)}
              disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all',
                (step === 1 && !canNext1) || (step === 2 && !canNext2)
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-[#E8291C] hover:bg-[#C9200F] active:scale-95 shadow-lg shadow-[#E8291C]/20',
              )}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  )
}
