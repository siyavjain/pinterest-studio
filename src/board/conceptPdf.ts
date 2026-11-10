import { jsPDF } from 'jspdf'
import { asset } from '../components/asset'

// The concept card as a real A4 PDF, drawn piece by piece (no print dialog): the blurred hero with
// the name over it, the palette, materials, textures, the surface, the statement and the checklist.

export type ConceptPdf = {
  title: string
  about: string
  wash: string
  palette: { colour: string; name: string; share: number }[]
  materials: { name: string; src: string }[]
  textures: { name: string; src: string }[]
  surface: { lo: string; hi: string; at: number }[]
  statement: string
  checklist: { text: string; done: boolean }[]
}

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = asset(src)
  })

/** An image cut to a w × h box (cover), optionally round or blurred, as a data URL. */
function picture(img: HTMLImageElement | null, w: number, h: number, opts: { round?: boolean; blur?: number; bg?: string } = {}) {
  const K = 4 // pixels per mm, plenty for print
  const c = document.createElement('canvas')
  c.width = Math.round(w * K)
  c.height = Math.round(h * K)
  const g = c.getContext('2d')!
  g.fillStyle = opts.bg ?? '#e9e4df'
  g.fillRect(0, 0, c.width, c.height)
  if (opts.round) {
    g.beginPath()
    g.arc(c.width / 2, c.height / 2, Math.min(c.width, c.height) / 2, 0, Math.PI * 2)
    g.clip()
    g.fillRect(0, 0, c.width, c.height)
  }
  if (img) {
    const s = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight) * (opts.blur ? 1.25 : 1)
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s
    if (opts.blur) g.filter = `blur(${opts.blur}px)`
    g.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh)
    g.filter = 'none'
  }
  return { data: c.toDataURL(opts.round ? 'image/png' : 'image/jpeg', 0.9), round: !!opts.round }
}

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
const light = (hex: string) => { const [r, g, b] = rgb(hex); return r * 0.299 + g * 0.587 + b * 0.114 > 150 }

export async function downloadConceptPdf(c: ConceptPdf) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, H = 297, M = 16
  const INK: [number, number, number] = [17, 17, 17]
  const MUTED: [number, number, number] = [95, 95, 95]
  const CANVAS: [number, number, number] = [252, 250, 247]
  const page = () => { pdf.setFillColor(...CANVAS); pdf.rect(0, 0, W, H, 'F') }
  page()
  let y = 0
  const room = (need: number) => { if (y + need > H - M) { pdf.addPage(); page(); y = M } }
  const kicker = (t: string) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...MUTED); pdf.text(t, M, y); y += 7 }
  const heading = (t: string) => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20); pdf.setTextColor(...INK); pdf.text(t, M, y); y += 8 }

  const [wash, ...rest] = await Promise.all([c.wash, ...c.materials.map((m) => m.src), ...c.textures.map((t) => t.src)].map(load))
  const mats = rest.slice(0, c.materials.length), texs = rest.slice(c.materials.length)

  // hero: the blurred wash, edge to edge, with a cream veil and the concept over it
  const HERO = 82
  pdf.addImage(picture(wash, W, HERO, { blur: 60 }).data, 'JPEG', 0, 0, W, HERO)
  pdf.setGState(pdf.GState({ opacity: 0.28 }))
  pdf.setFillColor(...CANVAS)
  pdf.rect(0, 0, W, HERO, 'F')
  pdf.setGState(pdf.GState({ opacity: 1 }))
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...INK)
  pdf.text('Concept', W / 2, 26, { align: 'center' })
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(28)
  pdf.text(c.title, W / 2, 38, { align: 'center', maxWidth: 160 })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
  pdf.text(pdf.splitTextToSize(c.about, 140), W / 2, 48, { align: 'center', lineHeightFactor: 1.45 })
  y = HERO + 13

  // 01 palette: one strip, each colour as wide as its share
  kicker('01 - Color'); heading('The palette')
  const total = c.palette.reduce((n, p) => n + p.share, 0) || 1
  let x = M
  for (const p of c.palette) {
    const w = ((W - 2 * M) * p.share) / total
    pdf.setFillColor(...rgb(p.colour)); pdf.rect(x, y, w, 30, 'F')
    pdf.setTextColor(...(light(p.colour) ? INK : CANVAS))
    pdf.setFontSize(9); pdf.text(p.name, x + w / 2, y + 22, { align: 'center' })
    pdf.setFontSize(7); pdf.text(p.colour.toUpperCase(), x + w / 2, y + 26.5, { align: 'center' })
    x += w
  }
  y += 40

  // 02 materials: round swatches
  room(56); kicker('02 - Material'); heading('What it’s made of')
  const D = 30, gap = (W - 2 * M - D * c.materials.length) / Math.max(1, c.materials.length - 1)
  c.materials.forEach((m, i) => {
    const mx = M + i * (D + gap)
    pdf.addImage(picture(mats[i], D, D, { round: true, bg: '#fcfaf7' }).data, 'PNG', mx, y, D, D)
    pdf.setFontSize(8); pdf.setTextColor(...MUTED); pdf.text(m.name, mx + D / 2, y + D + 5, { align: 'center' })
  })
  y += D + 14

  // 03 textures: close-ups side by side
  const TW = (W - 2 * M - 3 * 4) / 4, TH = TW
  room(15 + TH + 6); kicker('03 - Texture'); heading('Up close')
  c.textures.forEach((t, i) => {
    const tx = M + i * (TW + 4)
    pdf.addImage(picture(texs[i], TW, TH).data, 'JPEG', tx, y, TW, TH)
    pdf.setFontSize(8); pdf.setTextColor(...MUTED); pdf.text(t.name, tx, y + TH + 5)
  })
  y += TH + 16

  // 04 surface: where it sits between opposites
  room(50); kicker('04 - Finish'); heading('The surface')
  for (const s of c.surface) {
    pdf.setFontSize(10)
    pdf.setTextColor(...(s.at < 0.5 ? INK : MUTED)); pdf.text(s.lo, M, y)
    pdf.setTextColor(...(s.at >= 0.5 ? INK : MUTED)); pdf.text(s.hi, W - M, y, { align: 'right' })
    pdf.setDrawColor(210, 207, 202); pdf.setLineWidth(0.3); pdf.line(M, y + 3, W - M, y + 3)
    pdf.setFillColor(173, 0, 26); pdf.circle(M + (W - 2 * M) * s.at, y + 3, 1.6, 'F')
    y += 11
  }
  y += 6

  // 05 statement, in their words
  if (c.statement.trim()) {
    const lines = pdf.splitTextToSize(c.statement.trim(), W - 2 * M)
    room(20 + lines.length * 5.5); kicker('05 - Statement'); heading('In your words')
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor(...INK)
    pdf.text(lines, M, y, { lineHeightFactor: 1.5 })
    y += lines.length * 5.8 + 8
  }

  // 06 checklist
  room(20 + c.checklist.length * 8); kicker('06 - Checklist'); heading('Make sure it has')
  for (const item of c.checklist) {
    room(9)
    pdf.setDrawColor(...INK); pdf.setLineWidth(0.3)
    if (item.done) { pdf.setFillColor(...INK); pdf.circle(M + 2, y - 1.3, 2, 'F'); pdf.setDrawColor(...CANVAS); pdf.line(M + 1, y - 1.3, M + 1.8, y - 0.4); pdf.line(M + 1.8, y - 0.4, M + 3.2, y - 2.3) }
    else pdf.circle(M + 2, y - 1.3, 2, 'S')
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor(...(item.done ? MUTED : INK))
    pdf.text(item.text, M + 7, y)
    y += 8
  }

  pdf.save(`${(c.title || 'Concept').replace(/[^\w\- ]+/g, '').trim() || 'Concept'} - concept card.pdf`)
}
