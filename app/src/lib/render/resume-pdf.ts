import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'
import type { ResumeData } from './types'

const C_HEADING = rgb(0.102, 0.102, 0.180)
const C_BLACK   = rgb(0, 0, 0)
const C_GREY    = rgb(0.267, 0.267, 0.267)
const C_LGREY   = rgb(0.533, 0.533, 0.533)
const C_RULE    = rgb(0.8, 0.8, 0.8)

const ML = 50, MR = 50, MT = 50, MB = 50
const [W, H] = PageSizes.A4
const CW = W - ML - MR

export async function buildResumePdf(data: ResumeData): Promise<Buffer> {
  const doc  = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const reg  = await doc.embedFont(StandardFonts.Helvetica)

  let page = doc.addPage(PageSizes.A4)
  let y = H - MT
  let pageNum = 1

  function footer() {
    page.drawText(`${data.candidate.name} - Resume - Page ${pageNum}`, {
      x: ML, y: MB - 14, size: 8, font: reg, color: C_LGREY,
    })
  }

  function newPage() {
    footer()
    page = doc.addPage(PageSizes.A4)
    y = H - MT
    pageNum++
  }

  function checkRoom(need: number) { if (y - need < MB + 30) newPage() }

  function drawWrapped(
    text: string,
    font: typeof bold,
    size: number,
    color: typeof C_BLACK,
    indent = 0,
  ) {
    const x    = ML + indent
    const maxW = CW - indent
    const words = String(text).split(' ')
    let line = ''
    const lines: string[] = []
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(test, size) > maxW && line) { lines.push(line); line = w }
      else line = test
    }
    if (line) lines.push(line)
    for (const l of lines) {
      checkRoom(size + 3)
      y -= size
      page.drawText(l, { x, y, size, font, color })
      y -= 2
    }
  }

  function rule(color = C_RULE, thick = 0.5) {
    page.drawLine({ start: { x: ML, y: y - 1 }, end: { x: W - MR, y: y - 1 }, thickness: thick, color })
    y -= 5
  }

  function gap(n = 6) { y -= n }

  function section(title: string) {
    gap(8); checkRoom(22)
    drawWrapped(title.toUpperCase(), bold, 10, C_HEADING)
    rule(); gap(2)
  }

  const c = data.candidate
  // Name
  y -= 20
  page.drawText(c.name.toUpperCase(), { x: ML, y, size: 20, font: bold, color: C_HEADING })
  y -= 6
  // Contact
  const contact = [c.location, c.phone, c.email, c.linkedin ? `LinkedIn: ${c.linkedin}` : ''].filter(Boolean).join('  |  ')
  drawWrapped(contact, reg, 9, C_GREY)
  y -= 2
  rule(rgb(0.2, 0.2, 0.2), 1)
  gap(4)

  section('Summary')
  drawWrapped(data.summary, reg, 9.5, C_BLACK)

  section('Key Skills')
  drawWrapped(data.key_skills.join(' | '), reg, 9.5, C_BLACK)

  section('Professional Experience')
  for (const exp of data.experience) {
    gap(4); checkRoom(30)
    const roleW = bold.widthOfTextAtSize(exp.role, 10)
    y -= 10
    page.drawText(exp.role, { x: ML, y, size: 10, font: bold, color: C_BLACK })
    page.drawText(` | ${exp.company}`, { x: ML + roleW, y, size: 10, font: reg, color: C_BLACK })
    y -= 2
    drawWrapped(`${exp.period} | ${exp.location}`, reg, 9, C_GREY)
    y -= 1
    for (const b of exp.bullets) { checkRoom(14); drawWrapped(`- ${b}`, reg, 9.5, C_BLACK, 10) }
  }

  section('Education')
  for (const ed of data.education) {
    gap(4); checkRoom(20)
    drawWrapped(`${ed.degree} | ${ed.institution} | ${ed.location} | ${ed.period}`, bold, 9.5, C_BLACK)
    if (ed.achievement) drawWrapped(`- ${ed.achievement}`, reg, 9.5, C_BLACK, 10)
  }

  section('Certifications and Checks')
  drawWrapped(data.certifications, reg, 9.5, C_BLACK)

  section('Technical Skills')
  drawWrapped(data.technical_skills.join(' | '), reg, 9.5, C_BLACK)

  section('Additional Information')
  for (const b of data.additional_info) { checkRoom(14); drawWrapped(`- ${b}`, reg, 9.5, C_BLACK, 10) }

  footer()
  return Buffer.from(await doc.save())
}
