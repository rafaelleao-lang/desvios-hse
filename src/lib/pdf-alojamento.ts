import jsPDF from 'jspdf'
import { ALOJAMENTO_ITENS_CONFIG, SUB_UNIDADE_LABELS, generateAlojamentoId } from '@/types/alojamentos'
import type { Alojamento, AlojamentoItem, FotoAlojamento } from '@/types/alojamentos'

const RED: [number, number, number] = [232, 41, 28]
const GREEN: [number, number, number] = [16, 185, 129]

function fmtDate(d: string): string {
  if (!d) return '—'
  const p = d.split('T')[0].split('-')
  return `${p[2]}/${p[1]}/${p[0]}`
}

// Resolve uma URL de foto (relativa /api/uploads/xxx ou absoluta em S3) para uma
// data: URL embutível no PDF. URLs absolutas passam pelo proxy same-origin
// (o bucket S3 não tem CORS liberado para fetch direto do navegador).
async function resolveDataUrl(url: string): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:')) return url
  try {
    const fetchUrl = url.startsWith('http')
      ? `/api/proxy-image?url=${encodeURIComponent(url)}`
      : url
    const res = await fetch(fetchUrl)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function addPhotoAspect(
  doc: jsPDF, dataUrl: string,
  x: number, y: number, maxW: number, maxH: number,
): Promise<void> {
  const { w: iw, h: ih } = await new Promise<{ w: number; h: number }>(resolve => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 1, h: 1 })
    img.src = dataUrl
  })
  const scale = Math.min(maxW / iw, maxH / ih)
  const fw = iw * scale, fh = ih * scale
  const ox = x + (maxW - fw) / 2, oy = y + (maxH - fh) / 2
  try { doc.addImage(dataUrl, 'JPEG', ox, oy, fw, fh) } catch { /* skip */ }
}

export async function gerarPDFAlojamento(reg: Alojamento & { itens: AlojamentoItem[] }): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const hoje = new Date()
  const PW = 210, ML = 14, MR = 14, CW = PW - ML - MR
  const codigo = generateAlojamentoId(reg.numero)

  function drawHeader() {
    doc.setFillColor(...RED); doc.rect(0, 0, PW, 20, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255)
    doc.text('mse', ML, 14)
    doc.setLineWidth(0.4); doc.setDrawColor(255, 255, 255)
    doc.line(ML + 18, 5, ML + 18, 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('Relatório de Alojamento  ·  MSE Engenharia', ML + 22, 10)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.text(codigo, ML + 22, 15.5)
    const ds = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(255, 210, 210)
    doc.text(ds, PW - MR, 13, { align: 'right' })
  }

  function ensureSpace(need: number) {
    if (y + need > 297 - 14) { doc.addPage(); drawHeader(); y = 26 }
  }

  function drawFooter() {
    const n = doc.getNumberOfPages()
    for (let i = 1; i <= n; i++) {
      doc.setPage(i)
      doc.setFillColor(248, 248, 248); doc.rect(0, 297 - 10, PW, 10, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
      doc.text('MSE Engenharia · Sistema de Gestão HSE · Alojamentos', ML, 297 - 3.5)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...RED)
      doc.text(`${i} / ${n}`, PW - MR, 297 - 3.5, { align: 'right' })
    }
  }

  // ── Página 1: Capa + dados do alojamento ────────────────────────────────────
  drawHeader()
  let y = 26

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(20, 20, 20)
  doc.text('Relatório de Alojamento', ML, y + 1); y += 10

  doc.setDrawColor(...RED); doc.setLineWidth(0.8)
  doc.line(ML, y, PW - MR, y); y += 6

  const metaItems: Array<[string, string]> = [
    ['OBRA', reg.obra_nome || '—'],
    ['ENDEREÇO', reg.endereco || '—'],
    ['EMPRESA RESPONSÁVEL', reg.empresa_responsavel || '—'],
    ['DATA DA VISTORIA', fmtDate(reg.data_vistoria)],
    ['RESPONSÁVEL PELO RELATÓRIO', reg.responsavel_relatorio || '—'],
    ['RESPONSÁVEL PELO ALOJAMENTO', reg.responsavel_alojamento || '—'],
    ['Nº QUARTOS', reg.num_quartos != null ? String(reg.num_quartos) : '—'],
    ['Nº BANHEIROS', reg.num_banheiros != null ? String(reg.num_banheiros) : '—'],
    ['Nº ALOJADOS', reg.num_alojados != null ? String(reg.num_alojados) : '—'],
    ['CAPACIDADE MÁXIMA', reg.capacidade_maxima != null ? String(reg.capacidade_maxima) : '—'],
    ['RESP. COMPRA ITENS FALTANTES', reg.responsavel_compra || '—'],
  ]
  const cols3 = 3, mW = (CW - (cols3 - 1) * 3) / cols3
  metaItems.forEach(([lbl, val], i) => {
    const col = i % cols3, row = Math.floor(i / cols3)
    const bx = ML + col * (mW + 3), by = y + row * 12
    doc.setFillColor(250, 250, 250); doc.roundedRect(bx, by, mW, 11, 1.5, 1.5, 'F')
    doc.setDrawColor(235, 235, 235); doc.setLineWidth(0.3); doc.roundedRect(bx, by, mW, 11, 1.5, 1.5, 'S')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(180, 180, 180)
    doc.text(lbl, bx + 2.5, by + 4)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20)
    const shortVal = val.length > 30 ? val.slice(0, 29) + '…' : val
    doc.text(shortVal, bx + 2.5, by + 8.5)
  })
  y += Math.ceil(metaItems.length / cols3) * 12 + 8

  // KPI strip
  const conformes = reg.itens.filter(it => it.conforme).length
  const naoConformes = reg.itens.length - conformes
  const kpiItems = [
    { label: 'Total de Itens', value: String(reg.itens.length), c: [80, 80, 80] as [number, number, number], bg: [245, 245, 245] as [number, number, number] },
    { label: 'Conformes', value: String(conformes), c: [22, 163, 74] as [number, number, number], bg: [240, 253, 244] as [number, number, number] },
    { label: 'Não Conformes', value: String(naoConformes), c: [220, 38, 38] as [number, number, number], bg: [254, 242, 242] as [number, number, number] },
  ]
  const kW3 = (CW - 6) / 3
  kpiItems.forEach((k, i) => {
    const kx = ML + i * (kW3 + 3)
    doc.setFillColor(...k.bg); doc.roundedRect(kx, y, kW3, 18, 2, 2, 'F')
    doc.setFillColor(...k.c); doc.roundedRect(kx, y, 3, 18, 1, 1, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...k.c)
    doc.text(k.value, kx + kW3 / 2 + 1.5, y + 10, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(70, 70, 70)
    doc.text(k.label, kx + kW3 / 2 + 1.5, y + 15, { align: 'center' })
  })
  y += 24

  // Tabela-resumo dos itens
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20)
  doc.text('Itens de Inspeção', ML, y); y += 4

  const rowH = 6.5
  reg.itens.forEach((it, idx) => {
    const cfg = ALOJAMENTO_ITENS_CONFIG.find(c => c.key === it.item_key)
    if (y + rowH > 297 - 14) { doc.addPage(); drawHeader(); y = 26 }
    doc.setFillColor(idx % 2 === 0 ? 252 : 255, idx % 2 === 0 ? 252 : 255, idx % 2 === 0 ? 254 : 255)
    doc.rect(ML, y, CW, rowH, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(40, 40, 40)
    doc.text(`${cfg?.numero ?? idx + 1}. ${cfg?.titulo ?? it.item_key}`, ML + 2, y + 4.5)
    const badgeColor: [number, number, number] = it.conforme ? GREEN : RED
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...badgeColor)
    doc.text(it.conforme ? 'CONFORME' : 'NÃO CONFORME', ML + CW - 2, y + 4.5, { align: 'right' })
    y += rowH
  })

  // ── Uma página por item, com observação e fotos ─────────────────────────────
  for (const it of reg.itens) {
    const cfg = ALOJAMENTO_ITENS_CONFIG.find(c => c.key === it.item_key)
    doc.addPage(); drawHeader(); y = 26

    const badgeColor: [number, number, number] = it.conforme ? GREEN : RED
    doc.setFillColor(...badgeColor); doc.roundedRect(ML, y, 10, 7, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255)
    doc.text(String(cfg?.numero ?? ''), ML + 5, y + 4.8, { align: 'center' })
    doc.setFontSize(11); doc.setTextColor(20, 20, 20)
    doc.text(cfg?.titulo ?? it.item_key, ML + 14, y + 5)

    doc.setFillColor(...badgeColor); doc.roundedRect(PW - MR - 32, y, 32, 7, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255)
    doc.text(it.conforme ? 'CONFORME' : 'NÃO CONFORME', PW - MR - 16, y + 4.5, { align: 'center' })
    y += 11

    if (cfg?.clausulas?.length) {
      for (const cl of cfg.clausulas) {
        const lines = doc.splitTextToSize(cl.desc, CW - 4)
        ensureSpace(4 + lines.length * 3.6 + 3)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(200, 30, 30)
        doc.text(cl.ref, ML, y); y += 4
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 90, 90)
        doc.text(lines, ML + 4, y); y += lines.length * 3.6 + 3
      }
      y += 2
    }

    function drawObservacao(texto: string) {
      const obsLines = doc.splitTextToSize(texto, CW - 6)
      const boxH = obsLines.length * 4 + 8
      ensureSpace(boxH + 6)
      doc.setFillColor(250, 250, 250); doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3)
      doc.roundedRect(ML, y, CW, boxH, 2, 2, 'FD')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(160, 160, 160)
      doc.text('OBSERVAÇÕES', ML + 3, y + 4)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(40, 40, 40)
      doc.text(obsLines, ML + 3, y + 8.5)
      y += boxH + 6
    }

    async function drawFotos(fotos: FotoAlojamento[]) {
      if (fotos.length === 0) {
        ensureSpace(10)
        doc.setFillColor(255, 251, 235); doc.roundedRect(ML, y, CW, 10, 2, 2, 'F')
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(160, 100, 0)
        doc.text('Nenhuma foto registrada', ML + CW / 2, y + 6.5, { align: 'center' })
        y += 14
        return
      }

      ensureSpace(4)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(180, 180, 180)
      doc.text(`FOTOS (${fotos.length})`, ML, y); y += 4

      const gap = 4
      const photoW = (CW - gap) / 2
      const photoH = 62
      let col = 0

      for (const foto of fotos) {
        if (col === 0 && y + photoH > 297 - 14) { doc.addPage(); drawHeader(); y = 26 }
        const x = ML + col * (photoW + gap)
        const dataUrl = await resolveDataUrl(foto.data_url)
        if (dataUrl) {
          await addPhotoAspect(doc, dataUrl, x, y, photoW, photoH)
        } else {
          doc.setFillColor(240, 240, 240); doc.rect(x, y, photoW, photoH, 'F')
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
          doc.text('Foto indisponível', x + photoW / 2, y + photoH / 2, { align: 'center' })
        }
        doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.2); doc.rect(x, y, photoW, photoH, 'S')

        if (col === 1) { y += photoH + gap; col = 0 } else { col = 1 }
      }
      if (col === 1) y += photoH + gap // fecha a última linha, mesmo com nº ímpar de fotos
      y += 4
    }

    if (it.sub_unidades && it.sub_unidades.length > 0) {
      const label = SUB_UNIDADE_LABELS[it.item_key] ?? 'Unidade'
      for (const su of it.sub_unidades) {
        ensureSpace(9)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20, 20, 20)
        doc.text(`${label} ${su.numero}`, ML, y); y += 5
        if (su.observacao) drawObservacao(su.observacao)
        await drawFotos(su.fotos)
      }
    } else {
      if (it.observacao) drawObservacao(it.observacao)
      await drawFotos(it.fotos)
    }
  }

  drawFooter()

  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const yy = hoje.getFullYear()
  doc.save(`Relatorio-Alojamento-${codigo}-${yy}-${mm}-${dd}.pdf`)
}
