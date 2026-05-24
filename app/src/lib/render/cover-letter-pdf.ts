import PDFDocument from 'pdfkit'
import type { CoverLetterData } from './types'

const MARGIN = 50
const PAGE_W = 595.28
const CONTENT_W = PAGE_W - MARGIN * 2

export async function buildCoverLetterPdf(data: CoverLetterData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const c = data.candidate

    // ── Name ──
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#1a1a2e')
      .text(c.name.toUpperCase(), MARGIN, MARGIN)

    // ── Contact line ──
    const contact = [c.location, c.phone, c.email, c.linkedin ? `LinkedIn: ${c.linkedin}` : '']
      .filter(Boolean).join('  |  ')
    doc.font('Helvetica').fontSize(9).fillColor('#444444')
      .text(contact, MARGIN, doc.y + 4, { width: CONTENT_W })

    // ── Divider ──
    doc.moveDown(0.3)
    const lineY = doc.y
    doc.moveTo(MARGIN, lineY).lineTo(PAGE_W - MARGIN, lineY).lineWidth(1).strokeColor('#333333').stroke()
    doc.moveDown(0.8)

    // ── Date ──
    doc.font('Helvetica').fontSize(10).fillColor('#000000').text(data.date, MARGIN, doc.y)
    doc.moveDown(0.8)

    // ── Recipient ──
    doc.font('Helvetica-Bold').fontSize(10).text(data.recipient_name)
    doc.font('Helvetica-Bold').fontSize(10).text(data.company)
    doc.font('Helvetica').fontSize(10).fillColor('#000000').text(data.address)
    doc.moveDown(0.8)

    // ── Salutation ──
    doc.font('Helvetica').fontSize(10).text(data.salutation)
    doc.moveDown(0.6)

    // ── Body paragraphs ──
    for (const para of data.paragraphs) {
      doc.font('Helvetica').fontSize(10).fillColor('#000000')
        .text(para, MARGIN, doc.y, { width: CONTENT_W, align: 'justify' })
      doc.moveDown(0.7)
    }

    // ── Closing ──
    doc.font('Helvetica').fontSize(10).text(data.closing)
    doc.moveDown(2.5)
    doc.font('Helvetica').fontSize(10).text(c.name)

    doc.end()
  })
}
