import PDFDocument from 'pdfkit'
import type { ResumeData } from './types'

const MARGIN = 50
const PAGE_W = 595.28  // A4 width in points
const CONTENT_W = PAGE_W - MARGIN * 2

export async function buildResumePdf(data: ResumeData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const c = data.candidate

    // ── Page number footer via addPage event ──
    let pageNum = 1
    function addFooter() {
      const y = doc.page.height - MARGIN + 10
      doc.save()
        .fontSize(8).fillColor('#888888').font('Helvetica')
        .text(`${c.name} - Resume - Page ${pageNum}`, MARGIN, y, { width: CONTENT_W, align: 'center' })
        .restore()
      pageNum++
    }

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
    doc.moveDown(0.5)

    // ── Section helper ──
    function section(title: string) {
      // Check if near bottom of page
      if (doc.y > doc.page.height - MARGIN - 100) {
        addFooter()
        doc.addPage()
      }
      doc.moveDown(0.4)
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a1a2e')
        .text(title.toUpperCase(), MARGIN, doc.y, { width: CONTENT_W })
      const y2 = doc.y
      doc.moveTo(MARGIN, y2).lineTo(PAGE_W - MARGIN, y2).lineWidth(0.5).strokeColor('#cccccc').stroke()
      doc.moveDown(0.4)
    }

    function bodyText(text: string) {
      doc.font('Helvetica').fontSize(9.5).fillColor('#000000')
        .text(text, MARGIN, doc.y, { width: CONTENT_W, align: 'justify' })
      doc.moveDown(0.2)
    }

    function bulletText(text: string) {
      doc.font('Helvetica').fontSize(9.5).fillColor('#000000')
        .text(`- ${text}`, MARGIN + 12, doc.y, { width: CONTENT_W - 12, align: 'justify' })
      doc.moveDown(0.15)
    }

    // ── Summary ──
    section('Summary')
    bodyText(data.summary)

    // ── Key Skills ──
    section('Key Skills')
    bodyText(data.key_skills.join(' | '))

    // ── Professional Experience ──
    section('Professional Experience')
    for (const exp of data.experience) {
      if (doc.y > doc.page.height - MARGIN - 100) {
        addFooter(); doc.addPage()
      }
      doc.moveDown(0.3)
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000')
        .text(`${exp.role}`, MARGIN, doc.y, { continued: true })
        .font('Helvetica').text(` | ${exp.company}`)
      doc.font('Helvetica').fontSize(9).fillColor('#555555')
        .text(`${exp.period} | ${exp.location}`, MARGIN, doc.y)
      doc.moveDown(0.2)
      for (const b of exp.bullets) bulletText(b)
    }

    // ── Education ──
    section('Education')
    for (const ed of data.education) {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000')
        .text(`${ed.degree} | ${ed.institution} | ${ed.location} | ${ed.period}`, MARGIN, doc.y, { width: CONTENT_W })
      if (ed.achievement) {
        doc.moveDown(0.1)
        bulletText(ed.achievement)
      }
      doc.moveDown(0.2)
    }

    // ── Certifications ──
    section('Certifications and Checks')
    bodyText(data.certifications)

    // ── Technical Skills ──
    section('Technical Skills')
    bodyText(data.technical_skills.join(' | '))

    // ── Additional Information ──
    section('Additional Information')
    for (const b of data.additional_info) bulletText(b)

    addFooter()
    doc.end()
  })
}
