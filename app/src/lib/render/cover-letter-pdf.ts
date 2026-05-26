import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'
import type { CoverLetterData } from './types'

const C_HEADING = rgb(0.102, 0.102, 0.180)
const C_BLACK   = rgb(0, 0, 0)
const C_GREY    = rgb(0.267, 0.267, 0.267)
const C_LGREY   = rgb(0.533, 0.533, 0.533)

const ML = 50, MR = 50, MT = 50, MB = 50
const [W, H] = PageSizes.A4
const CW = W - ML - MR

export async function buildCoverLetterPdf(data: CoverLetterData): Promise<Buffer> {
  const doc  = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const reg  = await doc.embedFont(StandardFonts.Helvetica)

  const page = doc.addPage(PageSizes.A4)
  let y = H - MT

  function drawWrapped(text: string, font: typeof bold, size: number, color: typeof C_BLACK) {
    const words = String(text).split(' ')
    let line = ''
    const lines: string[] = []
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(test, size) > CW && line) { lines.push(line); line = w }
      else line = test
    }
    if (line) lines.push(line)
    for (const l of lines) {
      y -= size
      page.drawText(l, { x: ML, y, size, font, color })
      y -= 2
    }
  }

  function gap(n = 8) { y -= n }

  const c = data.candidate
  // Name
  y -= 20
  page.drawText(c.name.toUpperCase(), { x: ML, y, size: 20, font: bold, color: C_HEADING })
  y -= 6
  // Contact
  const contact = [c.location, c.phone, c.email, c.linkedin ? `LinkedIn: ${c.linkedin}` : ''].filter(Boolean).join('  |  ')
  drawWrapped(contact, reg, 9, C_GREY)
  y -= 2
  page.drawLine({ start: { x: ML, y: y - 1 }, end: { x: W - MR, y: y - 1 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) })
  gap(14)

  // Date
  drawWrapped(data.date, reg, 10, C_BLACK); gap()

  // Recipient
  drawWrapped(data.recipient_name, bold, 10, C_BLACK)
  drawWrapped(data.company,        bold, 10, C_BLACK)
  drawWrapped(data.address,        reg,  10, C_BLACK); gap()

  // Salutation
  drawWrapped(data.salutation, reg, 10, C_BLACK); gap()

  // Body
  for (const para of data.paragraphs) {
    drawWrapped(para, reg, 10, C_BLACK); gap(10)
  }

  // Closing
  drawWrapped(data.closing, reg, 10, C_BLACK)
  gap(36)
  drawWrapped(c.name, reg, 10, C_BLACK)

  // Page footer
  page.drawText(`${c.name} - Cover Letter`, { x: ML, y: MB - 14, size: 8, font: reg, color: C_LGREY })

  return Buffer.from(await doc.save())
}
