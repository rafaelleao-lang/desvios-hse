// Server-side PDF generator (returns Buffer instead of downloading)
import type { DesvioComputado } from '@/types'

const STATUS_HEX: Record<string, string> = {
  aberto: '#3B82F6', em_tratativa: '#F59E0B', pendente: '#F97316',
  concluido: '#22C55E', fechado: '#71717A', reincidente: '#EF4444',
}
const GRAV_HEX: Record<string, string> = {
  baixo: '#10B981', medio: '#EAB308', alto: '#F97316', critico: '#EF4444',
}
const GRAV_LABEL: Record<string, string> = {
  baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico',
}
const STATUS_LABEL: Record<string, string> = {
  aberto: 'Aberto', em_tratativa: 'Em Tratativa', pendente: 'Pendente',
  concluido: 'Concluído', fechado: 'Fechado', reincidente: 'Reincidente',
}
const CATEGORIAS_CORES: Record<string, string> = {
  'EPI/EPC': '#EF4444', 'Trabalho em Altura': '#F97316', 'Espaço Confinado': '#8B5CF6',
  'Eletricidade': '#EAB308', 'Içamento de Cargas': '#06B6D4', 'Ferramentas': '#84CC16',
  'Ordem e Limpeza': '#6366F1', 'Incêndio': '#DC2626', 'Veículos/Equipamentos': '#0891B2',
  'Produtos Químicos': '#7C3AED', 'Comportamental': '#DB2777', 'Documentação': '#64748B',
  'Ergonomia': '#0D9488', 'Outros': '#78716C',
}
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtDate(s: string) {
  try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s }
}

function desvioId(num: number) {
  return `DEV-${String(num).padStart(4,'0')}`
}

function getSlaLabel(dias: number | null, vencido: boolean): string {
  if (vencido) return dias !== null ? `Vencido há ${Math.abs(dias)}d` : 'Vencido'
  if (dias === null) return 'Sem prazo'
  if (dias === 0) return 'Vence hoje'
  if (dias === 1) return 'Vence amanhã'
  return `Vence em ${dias}d`
}

export async function gerarPDFBuffer(
  desvios: DesvioComputado[],
  obraNome: string,
): Promise<Buffer> {
  // Dynamic import so this only runs server-side
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const hoje = new Date()
  const PW = 210, ML = 14, MR = 14, MB = 12
  const CW = PW - ML - MR
  const RED_RGB: [number,number,number] = [232, 41, 28]
  let y = 0

  function h2r(hex: string): [number,number,number] {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
  }

  function drawHeader() {
    doc.setFillColor(232, 41, 28)
    doc.rect(0, 0, PW, 18, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255,255,255)
    doc.text('mse', ML, 12.5)
    doc.setLineWidth(0.3); doc.setDrawColor(255,255,255)
    doc.line(ML+15, 4, ML+15, 14)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    doc.text(`Relatório de Desvios HSE  ·  ${obraNome}`, ML+19, 12.5)
    const ds = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
    doc.setFontSize(7); doc.setTextColor(255,200,200)
    doc.text(ds, PW-MR, 12.5, { align: 'right' })
  }

  function ensureY(need: number) {
    if (y + need > 297 - MB) {
      doc.addPage(); drawHeader(); y = 26
    }
  }

  function drawArc(cx: number, cy: number, r: number, startA: number, endA: number, rgb: [number,number,number], lw: number) {
    const steps = Math.max(40, Math.ceil(Math.abs(endA-startA)/(2*Math.PI)*120))
    doc.setDrawColor(rgb[0],rgb[1],rgb[2]); doc.setLineWidth(lw)
    for (let i = 0; i < steps; i++) {
      const a1 = startA + (endA-startA)*i/steps
      const a2 = startA + (endA-startA)*(i+1)/steps
      doc.line(cx+r*Math.cos(a1), cy+r*Math.sin(a1), cx+r*Math.cos(a2), cy+r*Math.sin(a2))
    }
    doc.setLineWidth(0.1)
  }

  function drawLineChart(cx: number, cy: number, w: number, h: number, data: Array<{label:string;abertos:number;concluidos:number}>) {
    const maxV = Math.max(1, ...data.map(d => Math.max(d.abertos, d.concluidos)))
    const n = data.length
    const pL=10, pR=4, pT=16, pB=16
    const pw = w-pL-pR, ph = h-pT-pB
    const gx = (i: number) => cx+pL+(n<=1 ? pw/2 : pw*i/(n-1))
    const gy = (v: number) => cy+pT+ph*(1-v/maxV)
    doc.setDrawColor(220,220,220); doc.setLineWidth(0.1)
    for (let r=0;r<=4;r++) doc.line(cx+pL, cy+pT+ph*r/4, cx+pL+pw, cy+pT+ph*r/4)
    data.forEach((d,i) => {
      doc.setFont('helvetica','normal'); doc.setFontSize(5.5); doc.setTextColor(130,130,130)
      doc.text(d.label, gx(i), cy+pT+ph+pB-2, { align:'center' })
    })
    const series: Array<{key:'abertos'|'concluidos';rgb:[number,number,number];yOff:number}> = [
      { key:'abertos', rgb:[232,41,28], yOff:-1.8 },
      { key:'concluidos', rgb:[34,197,94], yOff:3.5 },
    ]
    series.forEach(({key,rgb,yOff}) => {
      for (let i=0;i<n-1;i++) {
        doc.setDrawColor(rgb[0],rgb[1],rgb[2]); doc.setLineWidth(0.65)
        doc.line(gx(i), gy(data[i][key]), gx(i+1), gy(data[i+1][key]))
      }
      data.forEach((d,i) => {
        doc.setFillColor(rgb[0],rgb[1],rgb[2])
        doc.circle(gx(i), gy(d[key]), 0.7, 'F')
        doc.setFont('helvetica','bold'); doc.setFontSize(5.5); doc.setTextColor(rgb[0],rgb[1],rgb[2])
        doc.text(String(d[key]), gx(i), gy(d[key])+yOff, { align:'center' })
      })
    })
    const ly=cy+2, lx=cx+pL+pw-50
    doc.setFillColor(232,41,28); doc.rect(lx,ly,4,2.5,'F')
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(90,90,90)
    doc.text('Abertos', lx+5.5, ly+2)
    doc.setFillColor(34,197,94); doc.rect(lx+25,ly,4,2.5,'F')
    doc.text('Concluídos', lx+30.5, ly+2)
  }

  function drawVertBars(cx: number, chartY: number, w: number, h: number, data: Array<{label:string;total:number;hex:string}>) {
    const maxV=Math.max(1,...data.map(d=>d.total))
    const n=data.length, pL=0, pR=2, pT=14, pB=12
    const pw=w-pL-pR, ph=h-pT-pB
    const bSlot=pw/n, bW=Math.min(bSlot*0.6,14)
    doc.setDrawColor(220,220,220); doc.setLineWidth(0.1)
    for (let r=0;r<=3;r++) doc.line(cx, chartY+pT+ph*r/3, cx+pw, chartY+pT+ph*r/3)
    data.forEach((d,i) => {
      const bx=cx+pL+i*bSlot+(bSlot-bW)/2
      const bh=Math.max(ph*d.total/maxV, d.total>0 ? 0.5 : 0)
      const by=chartY+pT+ph-bh
      const rgb=h2r(d.hex)
      if (d.total>0) { doc.setFillColor(rgb[0],rgb[1],rgb[2]); doc.rect(bx,by,bW,bh,'F') }
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(rgb[0],rgb[1],rgb[2])
      doc.text(String(d.total), bx+bW/2, by-1, { align:'center' })
      doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(130,130,130)
      const lbl=d.label.length>9 ? d.label.slice(0,8)+'…' : d.label
      doc.text(lbl, bx+bW/2, chartY+pT+ph+pB-1, { align:'center' })
    })
  }

  // ── Compute data ──────────────────────────────────────────
  const total = desvios.length
  const abertos = desvios.filter(d => d.status === 'aberto').length
  const tratados = desvios.filter(d => d.status !== 'aberto').length
  const kpis = {
    abertos,
    fechados: desvios.filter(d => ['fechado','reincidente'].includes(d.status)).length,
    vencidos: desvios.filter(d => d.vencido).length,
    taxa: total > 0 ? Math.round((tratados/total)*1000)/10 : 0,
  }

  const encMap: Record<string,number> = {}
  desvios.forEach(d => { const n=d.encarregado_nome_computado; if (n!=='—') encMap[n]=(encMap[n]||0)+1 })
  const encData = Object.entries(encMap).map(([name,t])=>({name,total:t})).sort((a,b)=>b.total-a.total).slice(0,10)

  const tstMap: Record<string,number> = {}
  desvios.forEach(d => { const n=d.tst_nome_computado; if (n!=='—') tstMap[n]=(tstMap[n]||0)+1 })
  const tstData = Object.entries(tstMap).map(([name,t])=>({name,total:t})).sort((a,b)=>b.total-a.total).slice(0,8)

  const catMap: Record<string,number> = {}
  desvios.forEach(d => {
    const cat = d.categoria==='Outros' && d.categoria_outro ? `Outros: ${d.categoria_outro}` : d.categoria
    catMap[cat]=(catMap[cat]||0)+1
  })
  const catData = Object.entries(catMap).map(([name,t])=>({name,total:t})).sort((a,b)=>b.total-a.total)

  const evoData = Array.from({length:6},(_,i) => {
    const dt=new Date(); dt.setMonth(dt.getMonth()-(5-i))
    const mes=dt.toISOString().slice(0,7)
    return {
      label: `${MONTHS[dt.getMonth()]}/${String(dt.getFullYear()).slice(2)}`,
      abertos: desvios.filter(d=>d.criado_em.startsWith(mes)).length,
      concluidos: desvios.filter(d=>d.atualizado_em.startsWith(mes)&&['concluido','fechado','reincidente'].includes(d.status)).length,
    }
  })

  const slaItems = [
    { label:'Vencidos',   total:desvios.filter(d=>d.vencido).length, hex:'#EF4444' },
    { label:'Vence hoje', total:desvios.filter(d=>!d.vencido&&d.dias_para_vencer===0).length, hex:'#F97316' },
    { label:'1-3 dias',   total:desvios.filter(d=>!d.vencido&&d.dias_para_vencer!==null&&d.dias_para_vencer>=1&&d.dias_para_vencer<=3).length, hex:'#EAB308' },
    { label:'4-7 dias',   total:desvios.filter(d=>!d.vencido&&d.dias_para_vencer!==null&&d.dias_para_vencer>=4&&d.dias_para_vencer<=7).length, hex:'#22C55E' },
    { label:'>7 dias',    total:desvios.filter(d=>!d.vencido&&d.dias_para_vencer!==null&&d.dias_para_vencer>7).length, hex:'#3B82F6' },
    { label:'Sem prazo',  total:desvios.filter(d=>d.dias_para_vencer===null).length, hex:'#71717A' },
  ]

  const gravData = (['baixo','medio','alto','critico'] as const).map(g => ({
    label: GRAV_LABEL[g], total: desvios.filter(d=>d.gravidade===g).length, hex: GRAV_HEX[g],
  }))

  const statMap: Record<string,number> = {}
  desvios.forEach(d => {
    const key = d.status==='reincidente' ? 'fechado' : d.status
    statMap[key]=(statMap[key]||0)+1
  })
  const statData = Object.entries(statMap).filter(([,n])=>n>0).map(([s,n]) => ({
    label: STATUS_LABEL[s]||s, total: n, hex: STATUS_HEX[s]||'#71717A',
  }))

  // ── Page 1 ────────────────────────────────────────────────
  drawHeader(); y=24

  // KPI cards
  const kpiItems: Array<{label:string;value:string;sub:string;c:[number,number,number];bg:[number,number,number]}> = [
    { label:'Abertos',        value:String(kpis.abertos),           sub:'Aguardando tratativa', c:[59,130,246],  bg:[239,246,255] },
    { label:'Fechados',       value:String(kpis.fechados),          sub:'Desvios encerrados',   c:[34,197,94],   bg:[240,253,244] },
    { label:'Vencidos',       value:String(kpis.vencidos),          sub:'Prazo ultrapassado',   c:[249,115,22],  bg:[255,247,237] },
    { label:'Taxa Tratativa', value:`${kpis.taxa.toFixed(1)}%`,     sub:'Desvios respondidos',  c:[34,197,94],   bg:[240,253,244] },
  ]
  const kW=(CW-9)/4, kH=24
  for (let col=0;col<4;col++) {
    const k=kpiItems[col], kx=ML+col*(kW+3), ky=y
    doc.setFillColor(k.bg[0],k.bg[1],k.bg[2]); doc.roundedRect(kx,ky,kW,kH,2,2,'F')
    doc.setFillColor(k.c[0],k.c[1],k.c[2]); doc.roundedRect(kx,ky,3,kH,1,1,'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(k.value.includes('%')?14:18); doc.setTextColor(k.c[0],k.c[1],k.c[2])
    doc.text(k.value, kx+kW/2+1.5, ky+12, { align:'center' })
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(70,70,70)
    doc.text(k.label, kx+kW/2+1.5, ky+17.5, { align:'center' })
    doc.setFontSize(5.5); doc.setTextColor(140,140,140)
    doc.text(k.sub, kx+kW/2+1.5, ky+21.5, { align:'center' })
  }
  y+=kH+8

  // Evolução
  ensureY(62)
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(50,50,50)
  doc.text('Evolução Mensal', ML, y)
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(120,120,120)
  doc.text('Últimos 6 meses', ML, y+4)
  y+=7; drawLineChart(ML, y, CW, 50, evoData); y+=50+8

  // Status + Gravidade side by side
  ensureY(65)
  const halfW=(CW-6)/2
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(50,50,50)
  doc.text('Por Status', ML, y); doc.text('Por Gravidade', ML+halfW+6, y); y+=5
  const sectionY=y, sectionH=55
  const donutCX=ML+20, donutCY=sectionY+sectionH/2-2, donutR=14, donutLW=6
  const statTotal=statData.reduce((a,b)=>a+b.total,0)
  if (statTotal>0) {
    let angle=-Math.PI/2
    statData.forEach(s => {
      const sweep=(s.total/statTotal)*2*Math.PI
      drawArc(donutCX, donutCY, donutR, angle, angle+sweep, h2r(s.hex), donutLW)
      angle+=sweep
    })
  } else {
    drawArc(donutCX, donutCY, donutR, 0, 2*Math.PI, [200,200,200], donutLW)
  }
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(50,50,50)
  doc.text(String(statTotal), donutCX, donutCY+2.5, { align:'center' })
  doc.setFont('helvetica','normal'); doc.setFontSize(5); doc.setTextColor(130,130,130)
  doc.text('total', donutCX, donutCY+6, { align:'center' })
  const legendX=ML+38
  statData.forEach((s,i) => {
    const lY=sectionY+i*8+3, rgb=h2r(s.hex)
    doc.setFillColor(rgb[0],rgb[1],rgb[2]); doc.circle(legendX, lY+1.2, 1.5, 'F')
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(70,70,70)
    const lbl=s.label.length>12 ? s.label.slice(0,11)+'…' : s.label
    doc.text(lbl, legendX+4, lY+2.2)
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(rgb[0],rgb[1],rgb[2])
    doc.text(String(s.total), ML+halfW-2, lY+2.2, { align:'right' })
  })
  drawVertBars(ML+halfW+6, sectionY, halfW, sectionH, gravData)
  y=sectionY+sectionH+8

  // SLA
  ensureY(58)
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(50,50,50)
  doc.text('Análise de SLA (Prazos)', ML, y); y+=5
  drawVertBars(ML, y, CW, 46, slaItems); y+=46+8

  // Encarregado
  if (encData.length>0) {
    ensureY(encData.length*9+25)
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(50,50,50)
    doc.text('Desvios por Encarregado', ML, y); y+=5
    const encLW=46, encBMW=CW-encLW-12, maxEnc=Math.max(1,...encData.map(e=>e.total))
    const encYS=y
    encData.forEach((e,i) => {
      const ey=encYS+i*9, bw=(e.total/maxEnc)*encBMW
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(60,60,60)
      doc.text(e.name.length>24?e.name.slice(0,23)+'…':e.name, ML, ey+4.5)
      doc.setFillColor(228,228,228); doc.rect(ML+encLW, ey, encBMW, 6, 'F')
      if (e.total>0) { doc.setFillColor(232,41,28); doc.rect(ML+encLW, ey, Math.max(bw,0.5), 6, 'F') }
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(232,41,28)
      doc.text(String(e.total), ML+encLW+encBMW+3, ey+4.5)
    })
    y+=encData.length*9+8
  }

  // TST
  if (tstData.length>0) {
    ensureY(tstData.length*9+25)
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(50,50,50)
    doc.text('Desvios por TST', ML, y); y+=5
    const tstLW=46, tstBMW=CW-tstLW-12, maxTst=Math.max(1,...tstData.map(e=>e.total))
    const tstYS=y
    tstData.forEach((e,i) => {
      const ty=tstYS+i*9, bw=(e.total/maxTst)*tstBMW
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(60,60,60)
      doc.text(e.name.length>24?e.name.slice(0,23)+'…':e.name, ML, ty+4.5)
      doc.setFillColor(228,228,228); doc.rect(ML+tstLW, ty, tstBMW, 6, 'F')
      if (e.total>0) { doc.setFillColor(6,182,212); doc.rect(ML+tstLW, ty, Math.max(bw,0.5), 6, 'F') }
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(6,182,212)
      doc.text(String(e.total), ML+tstLW+tstBMW+3, ty+4.5)
    })
    y+=tstData.length*9+5
  }

  // Categoria
  if (catData.length>0) {
    ensureY(catData.length*9+25)
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(50,50,50)
    doc.text('Por Categoria', ML, y); y+=5
    const catLW=46, catBMW=CW-catLW-12, maxCat=Math.max(1,...catData.map(e=>e.total))
    const catYS=y
    catData.forEach((e,i) => {
      const cy2=catYS+i*9, bw=(e.total/maxCat)*catBMW
      const catKey=e.name.startsWith('Outros')?'Outros':e.name
      const catHex=CATEGORIAS_CORES[catKey]||'#78716C', rgb=h2r(catHex)
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(60,60,60)
      doc.text(e.name.length>24?e.name.slice(0,23)+'…':e.name, ML, cy2+4.5)
      doc.setFillColor(228,228,228); doc.rect(ML+catLW, cy2, catBMW, 6, 'F')
      if (e.total>0) { doc.setFillColor(rgb[0],rgb[1],rgb[2]); doc.rect(ML+catLW, cy2, Math.max(bw,0.5), 6, 'F') }
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(rgb[0],rgb[1],rgb[2])
      doc.text(String(e.total), ML+catLW+catBMW+3, cy2+4.5)
    })
    y+=catData.length*9+8
  }

  // ── Full desvios list (new page) ──────────────────────────
  doc.addPage(); drawHeader(); y=24
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(50,50,50)
  doc.text(`Lista Completa de Desvios (${desvios.length} registros)`, ML, y); y+=3

  autoTable(doc, {
    startY: y,
    head: [['ID','Data','Categoria','Gravidade','Status','Encarregado','SLA','Descrição','Tratativa']],
    body: desvios.map(d => {
      const isFechado=['fechado','concluido','reincidente'].includes(d.status)
      const lastT=d.tratativas&&d.tratativas.length>0 ? d.tratativas[d.tratativas.length-1] : null
      const trat=isFechado ? (lastT?.acao_realizada||lastT?.comentario||'Sem registro') : 'Aberto'
      return [
        desvioId(d.numero),
        fmtDate(d.data_ocorrencia),
        d.categoria.length>14 ? d.categoria.slice(0,13)+'…' : d.categoria,
        GRAV_LABEL[d.gravidade]||d.gravidade,
        STATUS_LABEL[d.status]||d.status,
        d.encarregado_nome_computado.length>14 ? d.encarregado_nome_computado.slice(0,13)+'…' : d.encarregado_nome_computado,
        getSlaLabel(d.dias_para_vencer, d.vencido),
        d.descricao.length>60 ? d.descricao.slice(0,59)+'…' : d.descricao,
        trat.length>60 ? trat.slice(0,59)+'…' : trat,
      ]
    }),
    styles: { fontSize:6.5, cellPadding:2 },
    headStyles: { fillColor:RED_RGB, textColor:[255,255,255] as [number,number,number], fontStyle:'bold', fontSize:7 },
    alternateRowStyles: { fillColor:[250,250,252] as [number,number,number] },
    columnStyles: {
      0: { cellWidth:14, fontStyle:'bold', textColor:RED_RGB },
      1: { cellWidth:15 }, 2: { cellWidth:18 }, 3: { cellWidth:13 },
      4: { cellWidth:17 }, 5: { cellWidth:22 }, 6: { cellWidth:13 },
      7: { cellWidth:34 }, 8: { cellWidth:36 },
    },
    margin: { top:22, left:ML, right:MR },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawPage: (data: any) => { if (data.pageNumber>1) drawHeader() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section==='body') {
        const d=desvios[data.row.index]; if (!d) return
        if (data.column.index===3) { data.cell.styles.textColor=h2r(GRAV_HEX[d.gravidade]||'#71717A'); data.cell.styles.fontStyle='bold' }
        if (data.column.index===4) { data.cell.styles.textColor=h2r(STATUS_HEX[d.status]||'#71717A') }
        if (data.column.index===8) {
          const ok=['fechado','concluido','reincidente'].includes(d.status)
          data.cell.styles.textColor=ok ? [34,197,94] : [59,130,246]
          if (!ok) data.cell.styles.fontStyle='italic'
        }
      }
    },
  })

  // Footer
  const totalPages=doc.getNumberOfPages()
  for (let i=1;i<=totalPages;i++) {
    doc.setPage(i)
    doc.setFillColor(248,248,248); doc.rect(0, 297-10, PW, 10, 'F')
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(160,160,160)
    doc.text('MSE Engenharia · Sistema de Gestão HSE', ML, 297-3.5)
    doc.setFont('helvetica','bold'); doc.setTextColor(232,41,28)
    doc.text(`Página ${i} / ${totalPages}`, PW-MR, 297-3.5, { align:'right' })
  }

  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
}
