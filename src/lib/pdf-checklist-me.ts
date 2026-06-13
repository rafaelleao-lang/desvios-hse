import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InspecaoMaquina, Equipamento } from '@/types/maquinas'
import { TIPO_EQUIPAMENTO_LABEL } from '@/types/maquinas'
import { CHECKLIST_POR_TIPO } from '@/lib/checklist-maquinas'

// ── Colors ────────────────────────────────────────────────────────────────────
const C_DARK_BLUE: [number, number, number] = [28, 55, 90]
const C_BLUE_SEC:  [number, number, number] = [30, 86, 160]
const C_MSE_RED:   [number, number, number] = [220, 38, 38]
const C_GREEN:     [number, number, number] = [16, 185, 129]
const C_RED_BOX:   [number, number, number] = [220, 38, 38]
const C_GRAY_BOX:  [number, number, number] = [120, 120, 120]
const C_BORDER:    [number, number, number] = [210, 210, 210]
const C_TEXT:      [number, number, number] = [30, 30, 30]
const C_LABEL:     [number, number, number] = [140, 140, 140]
const C_ROW_ALT:   [number, number, number] = [248, 249, 250]

type DocExt = jsPDF & { lastAutoTable: { finalY: number } }

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const fetchUrl = url.startsWith('http')
      ? `/api/proxy-image?url=${encodeURIComponent(url)}`
      : url
    const res = await fetch(fetchUrl)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function drawCheckbox(
  doc: jsPDF,
  cx: number,
  cy: number,
  type: 'conforme' | 'nao_conforme' | 'nao_aplicavel' | 'empty',
) {
  const sz = 4.5
  const x = cx - sz / 2
  const yy = cy - sz / 2

  if (type === 'empty') {
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, yy, sz, sz, 0.6, 0.6, 'S')
    return
  }

  const fill =
    type === 'conforme'     ? C_GREEN :
    type === 'nao_conforme' ? C_RED_BOX :
    C_GRAY_BOX

  doc.setFillColor(...fill)
  doc.roundedRect(x, yy, sz, sz, 0.6, 0.6, 'F')
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.65)

  if (type === 'conforme') {
    doc.line(cx - 1.3, cy + 0.1, cx - 0.2, cy + 1.2)
    doc.line(cx - 0.2, cy + 1.2, cx + 1.5, cy - 0.9)
  } else if (type === 'nao_conforme') {
    doc.line(cx - 1.2, cy - 1.2, cx + 1.2, cy + 1.2)
    doc.line(cx + 1.2, cy - 1.2, cx - 1.2, cy + 1.2)
  } else {
    doc.line(cx - 1.3, cy, cx + 1.3, cy)
  }
}

function sectionHeader(doc: jsPDF, text: string, x: number, y: number, w: number) {
  doc.setFillColor(...C_BLUE_SEC)
  doc.rect(x, y, w, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(text, x + 3, y + 5)
  return y + 7
}

export async function gerarPDFChecklistME(insp: InspecaoMaquina, equip?: Equipamento): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const ML = 12
  const MR = 12
  const UW = W - ML - MR
  let y = 10

  // ── Pre-fetch imagens ────────────────────────────────────────────────────────
  const sigDataUrl = insp.assinatura_url
    ? await fetchImageDataUrl(insp.assinatura_url)
    : null

  // Pré-carrega todas as fotos dos itens
  const photoDataUrls: Record<string, string> = {}
  for (const resp of insp.respostas) {
    if (resp.foto_url) {
      const dataUrl = await fetchImageDataUrl(resp.foto_url)
      if (dataUrl) photoDataUrls[resp.item_id] = dataUrl
    }
  }

  // ── Dados auxiliares ─────────────────────────────────────────────────────────
  const horaStr = insp.criado_em
    ? new Date(insp.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''
  const dateStr = insp.data_inspecao.slice(0, 10).split('-').reverse().join('/')
  // Placa / Nº Série: mostra placa se existir, senão número de série
  const placaSerie = equip?.placa ?? insp.equipamento_serie ?? ''
  const tipoLabel = insp.equipamento_tipo ? TIPO_EQUIPAMENTO_LABEL[insp.equipamento_tipo] : ''
  // Nome completo do equipamento (ex.: "Caminhão Carroceria"), fallback para tipo
  const nomeEquip = insp.equipamento_nome ?? tipoLabel

  // ── HEADER ───────────────────────────────────────────────────────────────────
  doc.setFillColor(...C_MSE_RED)
  doc.roundedRect(ML, y, 22, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text('mse', ML + 11, y + 9.5, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C_TEXT)
  doc.text('MSE Engenharia', ML + 26, y + 5.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C_LABEL)
  doc.text('Sistema de Gestão em Segurança do Trabalho', ML + 26, y + 10.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C_DARK_BLUE)
  doc.text('CHECK LIST DE INSPEÇÃO', W - MR, y + 5.5, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C_LABEL)
  doc.text(`${tipoLabel} - ${nomeEquip}`, W - MR, y + 10.5, { align: 'right' })

  y += 17
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.3)
  doc.line(ML, y, W - MR, y)
  y += 4

  // ── STATUS BANNER ────────────────────────────────────────────────────────────
  const isAprovado = insp.resultado === 'aprovado'
  const bannerBg:   [number, number, number] = isAprovado ? [209, 237, 218] : [248, 215, 218]
  const bannerText: [number, number, number] = isAprovado ? [21, 128, 61]   : [185, 28, 28]
  doc.setFillColor(...bannerBg)
  doc.rect(ML, y, UW, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...bannerText)
  doc.text(isAprovado ? 'EQUIPAMENTO  /  APROVADO' : 'EQUIPAMENTO  X  REPROVADO', ML + 4, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(
    `${insp.total_conformes} Conformes  •  ${insp.total_nao_conformes} Não Conformes  •  ${insp.total_nao_aplicaveis} N/A`,
    W - MR - 2, y + 7, { align: 'right' },
  )
  y += 13

  // ── DADOS PARA MOBILIZAÇÃO ───────────────────────────────────────────────────
  // Removido: Subcontratada, Contrato
  y = sectionHeader(doc, 'DADOS PARA MOBILIZAÇÃO', ML, y, UW)
  const rowH = 9.5

  const drawInfoGrid = (
    fields: { label: string; value: string; w?: number }[],
    startY: number,
  ) => {
    const totalW = fields.reduce((s, f) => s + (f.w ?? 1), 0)
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.2)
    doc.rect(ML, startY, UW, rowH, 'S')
    let cx = ML
    for (let i = 0; i < fields.length; i++) {
      const colW = ((fields[i].w ?? 1) / totalW) * UW
      if (i > 0) doc.line(cx, startY, cx, startY + rowH)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...C_LABEL)
      doc.text(fields[i].label, cx + 2, startY + 3.5)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...C_TEXT)
      const val = doc.splitTextToSize(fields[i].value, colW - 4)
      doc.text(val[0] ?? '', cx + 2, startY + 7.8)
      cx += colW
    }
    return startY + rowH
  }

  // Linha 1: Empresa | Data da Inspeção | Hora
  y = drawInfoGrid([
    { label: 'Empresa',          value: 'MSE Engenharia', w: 2 },
    { label: 'Data da Inspeção', value: dateStr,          w: 1.5 },
    { label: 'Hora',             value: horaStr,          w: 0.8 },
  ], y)

  // Linha 2: Obra / Local | Técnico Responsável
  y = drawInfoGrid([
    { label: 'Obra / Local',        value: insp.obra_nome ?? '', w: 1.5 },
    { label: 'Técnico Responsável', value: insp.tst_nome  ?? '', w: 1.5 },
  ], y)

  y += 4

  // ── ACESSÓRIOS — EQUIPAMENTO ─────────────────────────────────────────────────
  // Removido: TAG/Nº Série, Ano, Modelo, Fabricante
  // "Tipo" mostra o nome do equipamento (ex.: Caminhão Carroceria)
  // "Placa / Nº Série" mostra placa se disponível, senão número de série
  y = sectionHeader(doc, 'ACESSÓRIOS — EQUIPAMENTO', ML, y, UW)
  y = drawInfoGrid([
    { label: 'Tipo',              value: nomeEquip,  w: 2 },
    { label: 'Placa / Nº Série',  value: placaSerie, w: 1.5 },
  ], y)

  y += 5

  // ── CHECKLIST ────────────────────────────────────────────────────────────────
  const allItems = insp.equipamento_tipo ? (CHECKLIST_POR_TIPO[insp.equipamento_tipo] ?? []) : []
  const categorias = Array.from(new Set(allItems.map(i => i.categoria)))

  for (const cat of categorias) {
    const catItems = allItems.filter(i => i.categoria === cat)

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      tableWidth: UW,
      head: [[
        { content: 'Nº',         styles: { halign: 'center', cellWidth: 8 } },
        { content: cat,          styles: { halign: 'left' } },
        { content: 'C',          styles: { halign: 'center', cellWidth: 10 } },
        { content: 'NC',         styles: { halign: 'center', cellWidth: 10 } },
        { content: 'N/A',        styles: { halign: 'center', cellWidth: 10 } },
        { content: 'Observação', styles: { halign: 'left',   cellWidth: 35 } },
      ]],
      body: catItems.map((item, i) => {
        const resp = insp.respostas.find(r => r.item_id === item.id)
        return [
          { content: String(i + 1), styles: { halign: 'center' as const } },
          item.descricao,
          '', '', '',
          resp?.obs ?? '',
        ]
      }),
      headStyles: {
        fillColor: C_DARK_BLUE,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: { top: 2, bottom: 2, left: 2, right: 1 },
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 1 },
        textColor: C_TEXT,
        lineColor: C_BORDER,
        lineWidth: 0.1,
        minCellHeight: 8,
      },
      alternateRowStyles: { fillColor: C_ROW_ALT },
      didDrawCell: (data) => {
        if (data.section !== 'body') return
        const col = data.column.index
        if (col < 2 || col > 4) return
        const item = catItems[data.row.index]
        if (!item) return
        const resp = insp.respostas.find(r => r.item_id === item.id)
        const status = resp?.status ?? null
        const cx = data.cell.x + data.cell.width / 2
        const cy = data.cell.y + data.cell.height / 2
        if (col === 2) drawCheckbox(doc, cx, cy, status === 'conforme'      ? 'conforme'      : 'empty')
        if (col === 3) drawCheckbox(doc, cx, cy, status === 'nao_conforme'  ? 'nao_conforme'  : 'empty')
        if (col === 4) drawCheckbox(doc, cx, cy, status === 'nao_aplicavel' ? 'nao_aplicavel' : 'empty')
      },
    })

    y = (doc as DocExt).lastAutoTable.finalY + 2
  }

  // ── FOTOS DOS ITENS ──────────────────────────────────────────────────────────
  const respostasComFoto = insp.respostas.filter(r => photoDataUrls[r.item_id])
  if (respostasComFoto.length > 0) {
    if (y > 230) { doc.addPage(); y = 15 }
    y = sectionHeader(doc, 'FOTOS DA INSPEÇÃO', ML, y, UW)

    const thumbW = 56
    const thumbH = 44
    const gap = 5
    const perRow = 3
    let col = 0

    for (const resp of respostasComFoto) {
      const photoUrl = photoDataUrls[resp.item_id]
      const item = allItems.find(i => i.id === resp.item_id)

      if (col === 0 && y + thumbH + 14 > 280) { doc.addPage(); y = 15 }

      const px = ML + col * (thumbW + gap)

      // Status label bar
      const statusColor =
        resp.status === 'conforme'     ? C_GREEN :
        resp.status === 'nao_conforme' ? C_RED_BOX :
        C_GRAY_BOX
      doc.setFillColor(...statusColor)
      doc.rect(px, y, thumbW, 5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(255, 255, 255)
      const statusLabel =
        resp.status === 'conforme'     ? 'CONFORME' :
        resp.status === 'nao_conforme' ? 'NÃO CONFORME' :
        'N/A'
      doc.text(statusLabel, px + thumbW / 2, y + 3.5, { align: 'center' })

      // Foto
      try {
        doc.addImage(photoUrl, 'JPEG', px, y + 5, thumbW, thumbH)
      } catch { /* skip if image fails */ }

      // Item description below
      if (item) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(5.5)
        doc.setTextColor(...C_LABEL)
        const desc = doc.splitTextToSize(item.descricao, thumbW)
        doc.text(desc[0] ?? '', px, y + thumbH + 8.5)
      }

      col++
      if (col >= perRow) {
        col = 0
        y += thumbH + 14
      }
    }
    if (col > 0) y += thumbH + 14
    y += 3
  }

  // ── OBSERVAÇÕES GERAIS ────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 15 }
  y = sectionHeader(doc, 'OBSERVAÇÕES GERAIS', ML, y, UW)
  const obsHeight = 14
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.2)
  doc.rect(ML, y, UW, obsHeight, 'S')
  const obsTexts = insp.respostas.filter(r => r.obs).map(r => r.obs as string)
  if (obsTexts.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C_TEXT)
    const wrapped = doc.splitTextToSize(obsTexts.join('; '), UW - 6)
    doc.text(wrapped[0] ?? '', ML + 3, y + 6)
  }
  y += obsHeight + 4

  // ── RESPONSÁVEL ──────────────────────────────────────────────────────────────
  if (y > 228) { doc.addPage(); y = 15 }
  y = sectionHeader(doc, 'RESPONSÁVEL PELA INSPEÇÃO OU VISTORIA', ML, y, UW)

  const sigBoxH = 42
  const leftW = UW * 0.58
  const rightX = ML + leftW

  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.2)
  doc.rect(ML, y, UW, sigBoxH, 'S')
  doc.line(rightX, y, rightX, y + sigBoxH)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C_TEXT)
  doc.text(`Nome: ${insp.tst_nome ?? ''}`, ML + 3, y + 6)

  if (sigDataUrl) {
    try { doc.addImage(sigDataUrl, 'PNG', ML + 3, y + 9, leftW - 10, 24) } catch { /* skip */ }
  }

  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.4)
  doc.line(ML + 3, y + sigBoxH - 7, rightX - 4, y + sigBoxH - 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C_LABEL)
  doc.text('Assinatura', ML + 3, y + sigBoxH - 3.5)

  const rx = rightX + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...C_TEXT)
  doc.text('Equipamento Liberado:', rx, y + 11)

  const simY = y + 16
  const boxSz = 4
  if (insp.equipamento_liberado) {
    doc.setFillColor(...C_GREEN)
    doc.rect(rx, simY, boxSz, boxSz, 'F')
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.6)
    doc.line(rx + 0.8, simY + 2, rx + 1.7, simY + 3)
    doc.line(rx + 1.7, simY + 3, rx + 3.2, simY + 0.8)
  } else {
    doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.25)
    doc.rect(rx, simY, boxSz, boxSz, 'S')
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(21, 128, 61)
  doc.text('SIM', rx + 5.5, simY + 3.5)

  const naoX = rx + 20
  if (!insp.equipamento_liberado) {
    doc.setFillColor(...C_RED_BOX)
    doc.rect(naoX, simY, boxSz, boxSz, 'F')
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.6)
    doc.line(naoX + 0.8, simY + 0.8, naoX + 3.2, simY + 3.2)
    doc.line(naoX + 3.2, simY + 0.8, naoX + 0.8, simY + 3.2)
  } else {
    doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.25)
    doc.rect(naoX, simY, boxSz, boxSz, 'S')
  }
  doc.setTextColor(185, 28, 28)
  doc.text('NÃO', naoX + 5.5, simY + 3.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C_TEXT)
  doc.text('Validade da Credencial: ___/___/______', rx, y + 33)

  y += sigBoxH + 5

  // ── FOOTER em todas as páginas ────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const footerY = 291
    doc.setDrawColor(...C_BORDER); doc.setLineWidth(0.25)
    doc.line(ML, footerY - 4, W - MR, footerY - 4)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C_LABEL)
    doc.text('LEGENDA:  C (conforme)   NC (não conforme)   N.A (não se aplica)', ML, footerY)
    const now = new Date()
    doc.text(`Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, W - MR, footerY, { align: 'right' })
    if (totalPages > 1) doc.text(`Pág. ${p}/${totalPages}`, W / 2, footerY, { align: 'center' })
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const tipo = (insp.equipamento_tipo ?? 'EQ').toUpperCase()
  const serie = (equip?.placa ?? insp.equipamento_serie ?? 'sem-serie').replace(/[^a-zA-Z0-9]/g, '')
  const dateFile = insp.data_inspecao.slice(0, 10).split('-').reverse().join('-')
  doc.save(`MSE_CheckList_${tipo}_${serie}_${dateFile}.pdf`)
}
