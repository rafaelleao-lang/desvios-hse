'use client'

import { useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X, FileText, FileSpreadsheet, Presentation, BarChart3 } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import type { Inspecao } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'

const INSP_GREEN = '#10B981'
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

interface FiltrosInspecao {
  obra_id?: string
  tst_id?: string
  encarregado_id?: string
  coordenador_id?: string
  data_inicio?: string
  data_fim?: string
  busca?: string
  status?: string
}

function filtrarInspecoes(inspecoes: Inspecao[], f: FiltrosInspecao): Inspecao[] {
  return inspecoes.filter(i => {
    if (f.obra_id && i.obra_id !== f.obra_id) return false
    if (f.tst_id && i.tst_id !== f.tst_id) return false
    if (f.encarregado_id && i.encarregado_id !== f.encarregado_id) return false
    if (f.coordenador_id && i.coordenador_id !== f.coordenador_id) return false
    if (f.status && i.status !== f.status) return false
    if (f.data_inicio && i.data_inspecao < f.data_inicio) return false
    if (f.data_fim && i.data_inspecao > f.data_fim) return false
    if (f.busca) {
      const q = f.busca.toLowerCase()
      return (
        String(i.numero).includes(q) ||
        (i.obra_nome || '').toLowerCase().includes(q) ||
        (i.tst_nome || '').toLowerCase().includes(q) ||
        (i.encarregado_nome || '').toLowerCase().includes(q) ||
        (i.coordenador_nome || '').toLowerCase().includes(q)
      )
    }
    return true
  })
}

function gerarPDF(
  filtered: Inspecao[],
  filtros: FiltrosInspecao,
  obras: { id: string; nome: string }[],
  tsts: { id: string; nome: string; obra_id: string }[],
  encarregados: { id: string; nome: string; obra_id: string }[],
  coordenadores: { id: string; nome: string; obra_id: string }[],
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const hoje = new Date()
  const RED_RGB: [number, number, number] = [232, 41, 28]
  const PW = 297
  const ML = 14
  const CW = PW - ML * 2
  const PAGE_H = 210  // landscape A4 height
  const FOOTER_H = 10

  let y = 0

  function drawHeader() {
    doc.setFillColor(RED_RGB[0], RED_RGB[1], RED_RGB[2])
    doc.rect(0, 0, PW, 18, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255)
    doc.text('mse', ML, 12.5)
    doc.setLineWidth(0.3); doc.setDrawColor(255, 255, 255)
    doc.line(ML + 15, 4, ML + 15, 14)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    doc.text('Relatório de Inspeções HSE  ·  MSE Engenharia', ML + 19, 12.5)
    const ds = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    doc.setFontSize(7); doc.setTextColor(255, 200, 200)
    doc.text(ds, PW - ML, 12.5, { align: 'right' })
  }

  function ensurePageY(need: number): void {
    if (y + need > PAGE_H - FOOTER_H) { doc.addPage(); drawHeader(); y = 24 }
  }

  drawHeader()
  y = 24

  // KPIs
  const totalDesvios = filtered.reduce((a, i) => a + i.total_desvios, 0)
  const totalReconh = filtered.reduce((a, i) => a + i.total_reconhecimentos, 0)
  const emAberto = filtered.filter(i => i.status === 'em_aberto').length
  const concluidas = filtered.filter(i => i.status === 'concluida').length

  const kpiItems: Array<{ label: string; value: string; c: [number, number, number]; bg: [number, number, number] }> = [
    { label: 'Total Inspeções', value: String(filtered.length), c: [16, 185, 129], bg: [240, 253, 249] },
    { label: 'Em Aberto',       value: String(emAberto),        c: [245, 158, 11], bg: [255, 251, 235] },
    { label: 'Concluídas',      value: String(concluidas),      c: [59, 130, 246], bg: [239, 246, 255] },
    { label: 'Total Desvios',   value: String(totalDesvios),    c: [239, 68, 68],  bg: [254, 242, 242] },
    { label: 'Reconhecimentos', value: String(totalReconh),     c: [16, 185, 129], bg: [240, 253, 249] },
  ]

  const kW = (CW - 12) / 5
  kpiItems.forEach((k, col) => {
    const kx = ML + col * (kW + 3)
    doc.setFillColor(k.bg[0], k.bg[1], k.bg[2])
    doc.roundedRect(kx, y, kW, 22, 2, 2, 'F')
    doc.setFillColor(k.c[0], k.c[1], k.c[2])
    doc.roundedRect(kx, y, 3, 22, 1, 1, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(k.c[0], k.c[1], k.c[2])
    doc.text(k.value, kx + kW / 2 + 1.5, y + 11, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(70, 70, 70)
    doc.text(k.label, kx + kW / 2 + 1.5, y + 17, { align: 'center' })
  })
  y += 30

  // Table
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(50, 50, 50)
  doc.text(`Lista de Inspeções (${filtered.length} registros)`, ML, y)
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['#', 'Data', 'Status', 'Obra', 'TST / Inspetor', 'Encarregado', 'Coordenador', 'Desvios', 'Reconhec.', 'Desvios Fech.', 'Fechado em']],
    body: filtered.map(i => [
      `INS-${String(i.numero).padStart(4, '0')}`,
      formatDate(i.data_inspecao),
      i.status === 'em_aberto' ? 'Em Aberto' : 'Concluída',
      (i.obra_nome || '—').slice(0, 20),
      (i.tst_nome || '—').slice(0, 16),
      (i.encarregado_nome || '—').slice(0, 16),
      (i.coordenador_nome || '—').slice(0, 16),
      String(i.total_desvios),
      String(i.total_reconhecimentos),
      `${i.desvios_fechados}/${i.total_desvios}`,
      i.fechado_em ? formatDate(i.fechado_em) : '—',
    ]),
    styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: RED_RGB, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [252, 250, 250] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold', textColor: [232, 41, 28] as [number, number, number] },
      1: { cellWidth: 18 }, 2: { cellWidth: 18 }, 3: { cellWidth: 50 },
      4: { cellWidth: 34 }, 5: { cellWidth: 36 }, 6: { cellWidth: 38 },
      7: { cellWidth: 12 }, 8: { cellWidth: 12 }, 9: { cellWidth: 13 }, 10: { cellWidth: 22 },
    },
    margin: { top: 22, left: ML, right: ML },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (data: any) => { if (data.pageNumber > 1) { drawHeader() } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 2) {
        const status = filtered[data.row.index]?.status
        data.cell.styles.textColor = status === 'em_aberto' ? [245, 158, 11] : [16, 185, 129]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // ── Chart helpers ─────────────────────────────────────────────────────────
  const MONTHS_PDF = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  function h2r(hex: string): [number,number,number] {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
  }

  function drawArc(cx: number, cy: number, r: number, sa: number, ea: number, rgb: [number,number,number], lw: number) {
    const steps = Math.max(40, Math.ceil(Math.abs(ea-sa)/(2*Math.PI)*120))
    doc.setDrawColor(rgb[0],rgb[1],rgb[2]); doc.setLineWidth(lw)
    for (let i=0;i<steps;i++) {
      const a1=sa+(ea-sa)*i/steps, a2=sa+(ea-sa)*(i+1)/steps
      doc.line(cx+r*Math.cos(a1),cy+r*Math.sin(a1),cx+r*Math.cos(a2),cy+r*Math.sin(a2))
    }
    doc.setLineWidth(0.1)
  }

  function drawInspLineChart(cx: number, cy: number, w: number, h: number,
    data: {label:string; inspecoes:number; desvios:number; reconhecimentos:number}[]) {
    const maxV = Math.max(1, ...data.flatMap(d=>[d.inspecoes,d.desvios,d.reconhecimentos]))
    const n = data.length
    const pL=10,pR=4,pT=18,pB=16, pw=w-pL-pR, ph=h-pT-pB
    const gx=(i:number)=>cx+pL+(n<=1?pw/2:pw*i/(n-1))
    const gy=(v:number)=>cy+pT+ph*(1-v/maxV)
    // Grid y-labels
    for (let r=0;r<=4;r++) {
      const gv=Math.round(maxV*(4-r)/4)
      doc.setDrawColor(220,220,220); doc.setLineWidth(0.1)
      doc.line(cx+pL,cy+pT+ph*r/4,cx+pL+pw,cy+pT+ph*r/4)
      doc.setFont('helvetica','normal');doc.setFontSize(4.5);doc.setTextColor(150,150,150)
      doc.text(String(gv),cx+pL-1,cy+pT+ph*r/4+1.5,{align:'right'})
    }
    data.forEach((d,i)=>{ doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.setTextColor(130,130,130); doc.text(d.label,gx(i),cy+pT+ph+pB-2,{align:'center'}) })
    const series=[
      {key:'inspecoes' as const,rgb:h2r('#10B981'),valOff:-2.2,lbl:'Inspeções'},
      {key:'reconhecimentos' as const,rgb:h2r('#3B82F6'),valOff:-2.2,lbl:'Reconhec.'},
      {key:'desvios' as const,rgb:h2r('#EF4444'),valOff:3.8,lbl:'Desvios'},
    ]
    series.forEach(({key,rgb,valOff,lbl},si)=>{
      for (let i=0;i<n-1;i++){ doc.setDrawColor(rgb[0],rgb[1],rgb[2]);doc.setLineWidth(0.7); doc.line(gx(i),gy(data[i][key]),gx(i+1),gy(data[i+1][key])) }
      data.forEach((d,i)=>{
        doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.circle(gx(i),gy(d[key]),0.8,'F')
        if(d[key]>0){doc.setFont('helvetica','bold');doc.setFontSize(5.5);doc.setTextColor(rgb[0],rgb[1],rgb[2]);doc.text(String(d[key]),gx(i),gy(d[key])+valOff,{align:'center'})}
      })
      const lx=cx+pL+pw-72+(si*26)
      doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.rect(lx,cy+3,4,2.5,'F')
      doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(90,90,90);doc.text(lbl,lx+5.5,cy+5.2)
    })
  }

  function drawHorizBars2Col(cx: number, cy: number, w: number, h: number,
    data: {label:string; v1:number; v2:number; rgb1:[number,number,number]; rgb2:[number,number,number]; lbl1:string; lbl2:string}[]) {
    const maxV = Math.max(1,...data.flatMap(d=>[d.v1,d.v2]))
    const lW=52, bMaxW=w-lW-12, bH=4, rowH=h/Math.max(data.length,1)
    data.forEach((d,i)=>{
      const ry=cy+i*rowH
      doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(60,60,60)
      const lbl=d.label.length>25?d.label.slice(0,24)+'…':d.label; doc.text(lbl,cx,ry+6)
      doc.setFillColor(228,228,228); doc.rect(cx+lW,ry,bMaxW,bH,'F')
      if (d.v1>0){const bw=(d.v1/maxV)*bMaxW;doc.setFillColor(d.rgb1[0],d.rgb1[1],d.rgb1[2]);doc.rect(cx+lW,ry,Math.max(bw,0.5),bH,'F')}
      doc.setFillColor(228,228,228); doc.rect(cx+lW,ry+bH+1,bMaxW,bH,'F')
      if (d.v2>0){const bw=(d.v2/maxV)*bMaxW;doc.setFillColor(d.rgb2[0],d.rgb2[1],d.rgb2[2]);doc.rect(cx+lW,ry+bH+1,Math.max(bw,0.5),bH,'F')}
      doc.setFont('helvetica','bold');doc.setFontSize(6.5)
      doc.setTextColor(d.rgb1[0],d.rgb1[1],d.rgb1[2]);doc.text(`${d.lbl1}:${d.v1}`,cx+lW+bMaxW+3,ry+3.5)
      doc.setTextColor(d.rgb2[0],d.rgb2[1],d.rgb2[2]);doc.text(`${d.lbl2}:${d.v2}`,cx+lW+bMaxW+3,ry+bH+4.5)
    })
  }

  function drawHorizBars1Col(cx: number, cy: number, w: number, maxH: number,
    data: {label:string; total:number; hex:string}[]) {
    const maxV=Math.max(1,...data.map(d=>d.total))
    const lW=52, bMaxW=w-lW-12, bH=5.5, rowH=9
    data.slice(0,Math.floor(maxH/rowH)).forEach((d,i)=>{
      const ry=cy+i*rowH
      doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(60,60,60)
      const lbl=d.label.length>24?d.label.slice(0,23)+'…':d.label; doc.text(lbl,cx,ry+4.5)
      doc.setFillColor(228,228,228); doc.rect(cx+lW,ry,bMaxW,bH,'F')
      if (d.total>0){const rgb=h2r(d.hex);const bw=(d.total/maxV)*bMaxW;doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.rect(cx+lW,ry,Math.max(bw,0.5),bH,'F')}
      const rgb=h2r(d.hex); doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(rgb[0],rgb[1],rgb[2])
      doc.text(String(d.total),cx+lW+bMaxW+3,ry+4.5)
    })
  }

  // ── Chart data ──────────────────────────────────────────────────────────────
  const obraFiltro = filtros.obra_id
  const evoData = Array.from({length:12},(_,i)=>{
    const dt=new Date(); dt.setMonth(dt.getMonth()-(11-i))
    const mes=dt.toISOString().slice(0,7)
    const m=filtered.filter(f=>f.data_inspecao.startsWith(mes))
    return {label:MONTHS_PDF[dt.getMonth()]+'/'+String(dt.getFullYear()).slice(2),inspecoes:m.length,desvios:m.reduce((a,f)=>a+f.total_desvios,0),reconhecimentos:m.reduce((a,f)=>a+f.total_reconhecimentos,0)}
  })
  const encList=obraFiltro?encarregados.filter(e=>e.obra_id===obraFiltro):encarregados
  const encData=encList.map(e=>{const m=filtered.filter(f=>f.encarregado_id===e.id);return{label:e.nome,v1:m.reduce((a,f)=>a+f.total_desvios,0),v2:m.reduce((a,f)=>a+f.total_reconhecimentos,0),rgb1:h2r('#EF4444') as [number,number,number],rgb2:h2r('#10B981') as [number,number,number],lbl1:'Desv',lbl2:'Rec'}}).filter(e=>e.v1+e.v2>0).sort((a,b)=>(b.v1+b.v2)-(a.v1+a.v2)).slice(0,10)
  const coordList=obraFiltro?coordenadores.filter(c=>c.obra_id===obraFiltro):coordenadores
  const coordData=coordList.map(c=>{const m=filtered.filter(f=>f.coordenador_id===c.id);return{label:c.nome,v1:m.reduce((a,f)=>a+f.total_desvios,0),v2:m.reduce((a,f)=>a+f.total_reconhecimentos,0),rgb1:h2r('#EF4444') as [number,number,number],rgb2:h2r('#10B981') as [number,number,number],lbl1:'Desv',lbl2:'Rec'}}).filter(c=>c.v1+c.v2>0).sort((a,b)=>b.v1-a.v1).slice(0,8)
  const tstList=obraFiltro?tsts.filter(t=>t.obra_id===obraFiltro):tsts
  const tstData=tstList.map(t=>({label:t.nome,total:filtered.filter(f=>f.tst_id===t.id).length,hex:'#06B6D4'})).filter(t=>t.total>0).sort((a,b)=>b.total-a.total).slice(0,8)
  const obraData=obras.map(o=>({label:o.nome,total:filtered.filter(f=>f.obra_id===o.id).length,hex:'#8B5CF6'})).filter(o=>o.total>0).sort((a,b)=>b.total-a.total).slice(0,8)
  const desvioTotal=filtered.reduce((a,i)=>a+i.total_desvios,0)
  const recoTotal=filtered.reduce((a,i)=>a+i.total_reconhecimentos,0)

  // ── Gráficos: layout dinâmico que preenche cada página antes de criar nova ─
  doc.addPage(); drawHeader(); let cy = 24

  function addSection(title: string, sectionH: number, drawFn: (sy: number) => void) {
    const needed = 5 + sectionH + 4  // label + chart + padding
    if (cy + needed > PAGE_H - FOOTER_H) { doc.addPage(); drawHeader(); cy = 24 }
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(50,50,50)
    doc.text(title, ML, cy); cy += 4
    drawFn(cy); cy += sectionH + 8
  }

  // Evolução (full width)
  addSection('Curva de Evolução (últimos 12 meses)', 62, sy => drawInspLineChart(ML, sy, CW, 62, evoData))

  // Donut
  addSection('Desvios vs Reconhecimentos', 46, sy => {
    const donutCX=ML+22,donutCY=sy+22,donutR=16,donutLW=7
    const dTotal=desvioTotal+recoTotal
    if(dTotal>0){let ang=-Math.PI/2;[{v:desvioTotal,rgb:h2r('#EF4444')},{v:recoTotal,rgb:h2r('#10B981')}].forEach(s=>{const sw=(s.v/dTotal)*2*Math.PI;drawArc(donutCX,donutCY,donutR,ang,ang+sw,s.rgb,donutLW);ang+=sw})}
    else drawArc(donutCX,donutCY,donutR,0,2*Math.PI,[200,200,200],donutLW)
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(50,50,50);doc.text(String(dTotal),donutCX,donutCY+2.5,{align:'center'})
    doc.setFont('helvetica','normal');doc.setFontSize(5);doc.setTextColor(130,130,130);doc.text('total',donutCX,donutCY+6,{align:'center'})
    const lx=ML+48
    const leg: Array<{v:number;rgb:[number,number,number];lbl:string}> = [{v:desvioTotal,rgb:h2r('#EF4444') as [number,number,number],lbl:'Desvios'},{v:recoTotal,rgb:h2r('#10B981') as [number,number,number],lbl:'Reconhec.'}]
    leg.forEach((s,i)=>{const ly=sy+i*10+3;doc.setFillColor(s.rgb[0],s.rgb[1],s.rgb[2]);doc.circle(lx,ly+1.2,1.5,'F');doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(70,70,70);doc.text(s.lbl,lx+4,ly+2.2);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(s.rgb[0],s.rgb[1],s.rgb[2]);doc.text(String(s.v),lx+38,ly+2.2)})
  })

  // Por encarregado
  if(encData.length>0) addSection('Por Encarregado (Desvios e Reconhecimentos)', encData.length*10+2, sy => drawHorizBars2Col(ML,sy,CW,encData.length*10,encData))
  // Por coordenador
  if(coordData.length>0) addSection('Por Coordenador (Desvios e Reconhecimentos)', coordData.length*10+2, sy => drawHorizBars2Col(ML,sy,CW,coordData.length*10,coordData))
  // Por TST
  if(tstData.length>0) addSection('Inspeções por TST', tstData.length*9+2, sy => drawHorizBars1Col(ML,sy,CW,tstData.length*9+4,tstData))
  // Por obra
  if(obraData.length>0) addSection('Inspeções por Obra', obraData.length*9+2, sy => drawHorizBars1Col(ML,sy,CW,obraData.length*9+4,obraData))

  // ── Footer ─────────────────────────────────────────────────────────────────
  const totalPagesAfter = doc.getNumberOfPages()
  for (let i = 1; i <= totalPagesAfter; i++) {
    doc.setPage(i)
    doc.setFillColor(248, 248, 248); doc.rect(0, 207 - 8, PW, 8, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
    doc.text('MSE Engenharia · Sistema de Gestão HSE · Inspeções', ML, 207 - 2.5)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(RED_RGB[0], RED_RGB[1], RED_RGB[2])
    doc.text(`Página ${i} / ${totalPagesAfter}`, PW - ML, 207 - 2.5, { align: 'right' })
  }

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  doc.save(`Inspecoes-HSE-${yy}-${mm}-${dd}.pdf`)
}

function gerarXLSX(filtered: Inspecao[]) {
  const hoje = new Date()
  const wb = XLSX.utils.book_new()
  const headers = ['#', 'Data', 'Status', 'Obra', 'TST', 'Encarregado', 'Coordenador', 'Total Desvios', 'Reconhecimentos', 'Desvios Fechados', 'Fechado em', 'Criado em']
  const rows = filtered.map(i => [
    `INS-${String(i.numero).padStart(4, '0')}`,
    formatDate(i.data_inspecao),
    i.status === 'em_aberto' ? 'Em Aberto' : 'Concluída',
    i.obra_nome || '',
    i.tst_nome || '',
    i.encarregado_nome || '',
    i.coordenador_nome || '',
    i.total_desvios,
    i.total_reconhecimentos,
    i.desvios_fechados,
    i.fechado_em ? formatDate(i.fechado_em) : '',
    formatDate(i.criado_em),
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
    { wch: 26 }, { wch: 26 }, { wch: 26 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Inspeções')

  const resumo = [
    ['Relatório de Inspeções HSE — MSE Engenharia'],
    [`Gerado em: ${hoje.toLocaleDateString('pt-BR')} ${hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`],
    [],
    ['Total', 'Em Aberto', 'Concluídas', 'Total Desvios', 'Reconhecimentos'],
    [
      filtered.length,
      filtered.filter(i => i.status === 'em_aberto').length,
      filtered.filter(i => i.status === 'concluida').length,
      filtered.reduce((a, i) => a + i.total_desvios, 0),
      filtered.reduce((a, i) => a + i.total_reconhecimentos, 0),
    ],
  ]
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  XLSX.writeFile(wb, `Inspecoes-HSE-${yy}-${mm}-${dd}.xlsx`)
}

async function gerarPPT(filtered: Inspecao[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PptxGenJS = (await import('pptxgenjs')).default as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pptx: any = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'MSE Engenharia'
  pptx.subject = 'Relatório de Inspeções HSE'

  const hoje = new Date()
  const dateStr = hoje.toLocaleDateString('pt-BR')
  const BG = '18181B'; const GRN = '10B981'; const WHT = 'FFFFFF'; const Z400 = 'A1A1AA'; const Z800 = '27272A'

  // Cover
  const cover = pptx.addSlide()
  cover.background = { color: BG }
  cover.addShape('rect', { x: 0, y: 0, w: 13.33, h: 1.1, fill: { color: GRN }, line: { color: GRN, width: 0 } })
  cover.addText('mse', { x: 0.35, y: 0.1, w: 2.0, h: 0.9, fontSize: 38, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle' })
  cover.addShape('rect', { x: 2.6, y: 0.2, w: 0.02, h: 0.7, fill: { color: 'AAFCE7' }, line: { color: 'AAFCE7', width: 0 } })
  cover.addText('Inspeções HSE', { x: 2.75, y: 0.37, w: 3, h: 0.36, fontSize: 11, color: 'CCFAE9', fontFace: 'Arial' })
  cover.addText(`Gerado em ${dateStr}`, { x: 9.0, y: 0.42, w: 4.0, h: 0.28, fontSize: 9, color: 'CCFAE9', fontFace: 'Arial', align: 'right' })
  cover.addText('Relatório de Inspeções', { x: 0.4, y: 1.5, w: 11, h: 0.95, fontSize: 46, bold: true, color: WHT, fontFace: 'Arial' })
  cover.addText('HSE · Saúde, Segurança e Meio Ambiente', { x: 0.4, y: 2.4, w: 10, h: 0.45, fontSize: 15, color: Z400, fontFace: 'Arial' })
  const stats = [
    { label: 'Total', value: String(filtered.length), col: '9CA3AF' },
    { label: 'Em Aberto', value: String(filtered.filter(i => i.status === 'em_aberto').length), col: 'F59E0B' },
    { label: 'Concluídas', value: String(filtered.filter(i => i.status === 'concluida').length), col: GRN },
    { label: 'Desvios', value: String(filtered.reduce((a, i) => a + i.total_desvios, 0)), col: 'EF4444' },
  ]
  stats.forEach((s, i) => {
    const cx = 0.4 + i * 3.1
    cover.addShape('rect', { x: cx, y: 4.2, w: 2.9, h: 1.15, fill: { color: Z800 }, line: { color: '3F3F46', width: 0.5 } })
    cover.addText(s.value, { x: cx, y: 4.25, w: 2.9, h: 0.65, fontSize: 32, bold: true, color: s.col, fontFace: 'Arial', align: 'center' })
    cover.addText(s.label, { x: cx, y: 4.92, w: 2.9, h: 0.3, fontSize: 9.5, color: Z400, fontFace: 'Arial', align: 'center' })
  })
  cover.addShape('rect', { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: Z800 }, line: { color: Z800, width: 0 } })
  cover.addText('MSE Engenharia · Sistema de Gestão HSE · Documento gerado automaticamente', { x: 0.3, y: 7.15, w: 13, h: 0.26, fontSize: 8, color: Z400, fontFace: 'Arial' })

  // Per inspection slides
  for (let idx = 0; idx < filtered.length; idx++) {
    const i = filtered[idx]
    const slide = pptx.addSlide()
    slide.background = { color: BG }
    slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.65, fill: { color: GRN }, line: { color: GRN, width: 0 } })
    slide.addText('mse', { x: 0.15, y: 0.06, w: 1.1, h: 0.52, fontSize: 18, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle' })
    slide.addShape('rect', { x: 1.47, y: 0.12, w: 0.02, h: 0.42, fill: { color: 'AAFCE7' }, line: { color: 'AAFCE7', width: 0 } })
    slide.addText(`INS-${String(i.numero).padStart(4, '0')}`, { x: 1.62, y: 0.07, w: 3.2, h: 0.52, fontSize: 15, bold: true, color: WHT, fontFace: 'Arial', valign: 'middle' })
    const statusCol = i.status === 'em_aberto' ? 'F59E0B' : GRN
    slide.addShape('rect', { x: 10.0, y: 0.1, w: 1.8, h: 0.45, fill: { color: statusCol }, line: { color: statusCol, width: 0 } })
    slide.addText(i.status === 'em_aberto' ? 'Em Aberto' : 'Concluída', { x: 10.0, y: 0.1, w: 1.8, h: 0.45, fontSize: 10, bold: true, color: WHT, fontFace: 'Arial', align: 'center', valign: 'middle' })
    slide.addText(`${idx + 1} / ${filtered.length}`, { x: 11.3, y: 0.12, w: 1.85, h: 0.4, fontSize: 9, color: 'CCFAE9', fontFace: 'Arial', align: 'right', valign: 'middle' })

    const infoItems = [
      { label: 'DATA', value: formatDate(i.data_inspecao) + (i.hora_inspecao ? '  ' + i.hora_inspecao : '') },
      { label: 'OBRA', value: i.obra_nome || '—' },
      { label: 'TST / INSPETOR', value: i.tst_nome || '—' },
      { label: 'ENCARREGADO', value: i.encarregado_nome || '—' },
      { label: 'COORDENADOR', value: i.coordenador_nome || '—' },
      { label: 'DESVIOS', value: `${i.desvios_fechados}/${i.total_desvios} fechados` },
      { label: 'RECONHECIMENTOS', value: String(i.total_reconhecimentos) },
      { label: 'FECHADO EM', value: i.fechado_em ? formatDate(i.fechado_em) : 'Em aberto' },
    ]
    const COLS = 4; const CELL_W = (13.0 - 0.44) / COLS; const CELL_H = 0.85
    infoItems.forEach((item, ii) => {
      const col = ii % COLS; const row = Math.floor(ii / COLS)
      const cx = 0.22 + col * CELL_W; const cy = 0.78 + row * CELL_H
      slide.addShape('rect', { x: cx + 0.03, y: cy + 0.03, w: CELL_W - 0.08, h: CELL_H - 0.07, fill: { color: Z800 }, line: { color: '3F3F46', width: 0.3 } })
      slide.addText(item.label, { x: cx + 0.12, y: cy + 0.1, w: CELL_W - 0.22, h: 0.18, fontSize: 7, color: Z400, bold: true, fontFace: 'Arial' })
      slide.addText(item.value, { x: cx + 0.12, y: cy + 0.3, w: CELL_W - 0.22, h: 0.48, fontSize: 10, color: 'F4F4F5', fontFace: 'Arial', wrap: true })
    })
    slide.addShape('rect', { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: Z800 }, line: { color: Z800, width: 0 } })
    slide.addText(`MSE Engenharia · ${i.obra_nome || ''} · ${dateStr}`, { x: 0.3, y: 7.15, w: 9, h: 0.26, fontSize: 7.5, color: Z400, fontFace: 'Arial' })
    slide.addText(`${idx + 1} / ${filtered.length}`, { x: 11.5, y: 7.15, w: 1.6, h: 0.26, fontSize: 7.5, bold: true, color: GRN, fontFace: 'Arial', align: 'right' })
  }

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  await pptx.writeFile({ fileName: `Inspecoes-HSE-${yy}-${mm}-${dd}.pptx` })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-zinc-400 mb-1 font-medium">{label}</p>}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

const inputCls = 'w-full h-9 px-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30'

export default function InspecoesRelatoriosPage() {
  const { inspecoes, obras, tsts, encarregados, coordenadores, loaded } = useApp()
  const [filtros, setFiltros] = useState<FiltrosInspecao>({})
  const [showFilters, setShowFilters] = useState(true)
  const [generatingPPT, setGeneratingPPT] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  const tstOptions = useMemo(() => filtros.obra_id ? tsts.filter(t => t.obra_id === filtros.obra_id) : tsts, [tsts, filtros.obra_id])
  const encOptions = useMemo(() => filtros.obra_id ? encarregados.filter(e => e.obra_id === filtros.obra_id) : encarregados, [encarregados, filtros.obra_id])
  const coordOptions = useMemo(() => filtros.obra_id ? coordenadores.filter(c => c.obra_id === filtros.obra_id) : coordenadores, [coordenadores, filtros.obra_id])
  const filtered = useMemo(() => filtrarInspecoes(inspecoes, filtros), [inspecoes, filtros])

  // ── Chart data (mesmos do Dashboard, mas com filtered) ─────────────────────
  const kpis = useMemo(() => {
    const totalDesvios = filtered.reduce((a, i) => a + i.total_desvios, 0)
    const totalReconh = filtered.reduce((a, i) => a + i.total_reconhecimentos, 0)
    const total = totalDesvios + totalReconh
    return {
      total: filtered.length,
      emAberto: filtered.filter(i => i.status === 'em_aberto').length,
      concluidas: filtered.filter(i => i.status === 'concluida').length,
      totalDesvios, totalReconh,
      taxaDesvio: total > 0 ? Math.round((totalDesvios / total) * 100) : 0,
    }
  }, [filtered])

  const evolucaoMensal = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(); dt.setMonth(dt.getMonth() - (11 - i))
    const mes = dt.toISOString().slice(0, 7)
    const mInsp = filtered.filter(f => f.data_inspecao.startsWith(mes))
    return {
      label: MONTHS[dt.getMonth()] + '/' + String(dt.getFullYear()).slice(2),
      inspecoes: mInsp.length,
      desvios: mInsp.reduce((a, f) => a + f.total_desvios, 0),
      reconhecimentos: mInsp.reduce((a, f) => a + f.total_reconhecimentos, 0),
    }
  }), [filtered])

  const porEncarregado = useMemo(() => {
    const list = filtros.obra_id ? encarregados.filter(e => e.obra_id === filtros.obra_id) : encarregados
    return list.map(enc => {
      const eInsp = filtered.filter(f => f.encarregado_id === enc.id)
      return { nome: enc.nome.split(' ')[0], nomeCompleto: enc.nome, desvios: eInsp.reduce((a, f) => a + f.total_desvios, 0), reconhecimentos: eInsp.reduce((a, f) => a + f.total_reconhecimentos, 0), inspecoes: eInsp.length }
    }).filter(e => e.inspecoes > 0).sort((a, b) => (b.desvios + b.reconhecimentos) - (a.desvios + a.reconhecimentos)).slice(0, 10)
  }, [filtered, encarregados, filtros.obra_id])

  const taxaDesvioEnc = useMemo(() => porEncarregado.map(e => ({
    nome: e.nome, total: e.desvios + e.reconhecimentos,
    pct: e.desvios + e.reconhecimentos > 0 ? Math.round((e.desvios / (e.desvios + e.reconhecimentos)) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct), [porEncarregado])

  const porCoordenador = useMemo(() => {
    const list = filtros.obra_id ? coordenadores.filter(c => c.obra_id === filtros.obra_id) : coordenadores
    return list.map(c => {
      const cInsp = filtered.filter(f => f.coordenador_id === c.id)
      return { nome: c.nome.split(' ')[0], desvios: cInsp.reduce((a, f) => a + f.total_desvios, 0), reconhecimentos: cInsp.reduce((a, f) => a + f.total_reconhecimentos, 0), inspecoes: cInsp.length }
    }).filter(c => c.inspecoes > 0).sort((a, b) => b.inspecoes - a.inspecoes).slice(0, 8)
  }, [filtered, coordenadores, filtros.obra_id])

  const porTst = useMemo(() => {
    const list = filtros.obra_id ? tsts.filter(t => t.obra_id === filtros.obra_id) : tsts
    return list.map(t => ({
      nome: t.nome.split(' ')[0], inspecoes: filtered.filter(f => f.tst_id === t.id).length,
      desvios: filtered.filter(f => f.tst_id === t.id).reduce((a, f) => a + f.total_desvios, 0),
    })).filter(t => t.inspecoes > 0).sort((a, b) => b.inspecoes - a.inspecoes).slice(0, 8)
  }, [filtered, tsts, filtros.obra_id])

  const porObra = useMemo(() => obras.filter(o => o.ativa).map(o => {
    const oInsp = filtered.filter(f => f.obra_id === o.id)
    return { nome: o.nome.length > 14 ? o.nome.slice(0, 13) + '…' : o.nome, nomeCompleto: o.nome, inspecoes: oInsp.length, desvios: oInsp.reduce((a, f) => a + f.total_desvios, 0), reconhecimentos: oInsp.reduce((a, f) => a + f.total_reconhecimentos, 0) }
  }).filter(o => o.inspecoes > 0).sort((a, b) => b.inspecoes - a.inspecoes).slice(0, 8), [filtered, obras])

  const activeFilters = Object.values(filtros).filter(v => v !== undefined && v !== '').length

  function setFiltro<K extends keyof FiltrosInspecao>(k: K, v: FiltrosInspecao[K]) {
    setFiltros(prev => ({ ...prev, [k]: v || undefined }))
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/15">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Relatórios de Inspeções</h1>
          <p className="text-xs text-zinc-500">{filtered.length} inspeção(ões) nos filtros selecionados</p>
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
            activeFilters > 0 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {activeFilters > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Obra</label>
                  <select className={inputCls} value={filtros.obra_id || ''} onChange={e => { setFiltro('obra_id', e.target.value); setFiltro('tst_id', ''); setFiltro('encarregado_id', ''); setFiltro('coordenador_id', '') }}>
                    <option value="">Todas</option>
                    {obras.filter(o => o.ativa).map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">TST</label>
                  <select className={inputCls} value={filtros.tst_id || ''} onChange={e => setFiltro('tst_id', e.target.value)}>
                    <option value="">Todos</option>
                    {tstOptions.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Encarregado</label>
                  <select className={inputCls} value={filtros.encarregado_id || ''} onChange={e => setFiltro('encarregado_id', e.target.value)}>
                    <option value="">Todos</option>
                    {encOptions.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Coordenador</label>
                  <select className={inputCls} value={filtros.coordenador_id || ''} onChange={e => setFiltro('coordenador_id', e.target.value)}>
                    <option value="">Todos</option>
                    {coordOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Status</label>
                  <select className={inputCls} value={filtros.status || ''} onChange={e => setFiltro('status', e.target.value)}>
                    <option value="">Todos</option>
                    <option value="em_aberto">Em Aberto</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Data início</label>
                  <input type="date" className={inputCls} value={filtros.data_inicio || ''} onChange={e => setFiltro('data_inicio', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Data fim</label>
                  <input type="date" className={inputCls} value={filtros.data_fim || ''} onChange={e => setFiltro('data_fim', e.target.value)} />
                </div>
              </div>
              {activeFilters > 0 && (
                <button onClick={() => setFiltros({})} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
                  <X className="w-3 h-3" /> Limpar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => gerarPDF(filtered, filtros, obras, tsts, encarregados, coordenadores)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          Exportar PDF
        </button>
        <button
          onClick={() => gerarXLSX(filtered)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>

      {/* Preview table */}
      {filtered.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-300">Prévia — {filtered.length} registro(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['#', 'Data', 'Status', 'Obra', 'TST', 'Encarregado', 'Coordenador', 'Desvios', 'Reconhec.'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-zinc-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((i, idx) => (
                  <tr key={i.id} className={idx % 2 === 1 ? 'bg-zinc-900/50' : ''}>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-400">INS-{String(i.numero).padStart(4, '0')}</td>
                    <td className="px-3 py-2 text-zinc-400">{formatDate(i.data_inspecao)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${i.status === 'em_aberto' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                        {i.status === 'em_aberto' ? 'Em Aberto' : 'Concluída'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-300 max-w-[120px] truncate">{i.obra_nome || '—'}</td>
                    <td className="px-3 py-2 text-zinc-400 max-w-[100px] truncate">{i.tst_nome || '—'}</td>
                    <td className="px-3 py-2 text-zinc-400 max-w-[100px] truncate">{i.encarregado_nome || '—'}</td>
                    <td className="px-3 py-2 text-zinc-400 max-w-[100px] truncate">{i.coordenador_nome || '—'}</td>
                    <td className="px-3 py-2 text-red-400 font-bold text-center">{i.total_desvios}</td>
                    <td className="px-3 py-2 text-emerald-400 font-bold text-center">{i.total_reconhecimentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 20 && (
              <p className="text-xs text-zinc-600 px-4 py-2 border-t border-zinc-800">+ {filtered.length - 20} registros no arquivo exportado</p>
            )}
          </div>
        </div>
      )}

      {/* ── Análise Visual (mesmos gráficos do Dashboard) ─────────────────── */}
      {filtered.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">Análise Visual</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Inspeções', value: kpis.total, color: INSP_GREEN },
              { label: 'Em Aberto', value: kpis.emAberto, color: '#F59E0B' },
              { label: 'Concluídas', value: kpis.concluidas, color: '#3B82F6' },
              { label: 'Desvios', value: kpis.totalDesvios, color: '#EF4444' },
              { label: 'Reconhec.', value: kpis.totalReconh, color: INSP_GREEN },
              { label: '% Desvios', value: kpis.taxaDesvio + '%', color: kpis.taxaDesvio > 50 ? '#EF4444' : '#F59E0B' },
            ].map(k => (
              <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-1">
                <p className="text-xl font-black leading-none" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-zinc-500 font-medium">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Evolução Mensal */}
          <div id="rel-chart-evolucao" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">Curva de Evolução Mensal</h3>
            <p className="text-xs text-zinc-500 mb-4">Últimos 12 meses</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={evolucaoMensal}>
                <defs>
                  <linearGradient id="rGI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={INSP_GREEN} stopOpacity={0.3} /><stop offset="95%" stopColor={INSP_GREEN} stopOpacity={0} /></linearGradient>
                  <linearGradient id="rGD" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                <Area type="monotone" dataKey="inspecoes" name="Inspeções" stroke={INSP_GREEN} fill="url(#rGI)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="desvios" name="Desvios" stroke="#EF4444" fill="url(#rGD)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="reconhecimentos" name="Reconhec." stroke="#3B82F6" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Donut + Por Obra */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div id="rel-chart-donut" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Desvios vs Reconhecimentos</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={[{ name: 'Desvios', value: kpis.totalDesvios, color: '#EF4444' }, { name: 'Reconhecimentos', value: kpis.totalReconh, color: INSP_GREEN }]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {[{ color: '#EF4444' }, { color: INSP_GREEN }].map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div id="rel-chart-obra" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Inspeções por Obra</h3>
              {porObra.length === 0 ? <div className="flex items-center justify-center h-[180px] text-zinc-600 text-sm">Sem dados</div> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={porObra} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="desvios" name="Desvios" fill="#EF4444" radius={[0, 3, 3, 0]} maxBarSize={14} />
                    <Bar dataKey="reconhecimentos" name="Reconhec." fill={INSP_GREEN} radius={[0, 3, 3, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Por Encarregado */}
          {porEncarregado.length > 0 && (
            <div id="rel-chart-enc" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Encarregado × Desvios × Reconhecimentos</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porEncarregado}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                  <Bar dataKey="desvios" name="Desvios" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="reconhecimentos" name="Reconhecimentos" fill={INSP_GREEN} radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* % Desvios por Encarregado */}
          {taxaDesvioEnc.length > 0 && (
            <div id="rel-chart-pct-enc" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">% Desvios por Encarregado</h3>
              <div className="space-y-3">
                {taxaDesvioEnc.map(e => (
                  <div key={e.nome}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-300 font-medium">{e.nome}</span>
                      <span className="text-zinc-500">{e.pct}% desvios ({e.total} total)</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${e.pct}%`, background: e.pct > 70 ? '#EF4444' : e.pct > 40 ? '#F59E0B' : INSP_GREEN }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TST + Coordenador */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {porTst.length > 0 && (
              <div id="rel-chart-tst" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-zinc-200 mb-4">Inspeções por TST</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porTst} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="inspecoes" name="Inspeções" fill="#06B6D4" radius={[0, 3, 3, 0]} maxBarSize={16} />
                    <Bar dataKey="desvios" name="Desvios" fill="#EF4444" radius={[0, 3, 3, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {porCoordenador.length > 0 && (
              <div id="rel-chart-coord" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-zinc-200 mb-4">Coordenador × Desvios × Reconhecimentos</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={porCoordenador}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="nome" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                    <Bar dataKey="inspecoes" name="Inspeções" fill="#8B5CF6" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="desvios" name="Desvios" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="reconhecimentos" name="Reconhec." fill={INSP_GREEN} radius={[3, 3, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
