import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
} from 'docx'
import type { CoverLetterData } from './types'

const FONT = 'Calibri'

export async function buildCoverLetterDocx(data: CoverLetterData): Promise<Buffer> {
  const c = data.candidate
  const contactLine = [c.location, c.phone, c.email, c.linkedin ? `LinkedIn: ${c.linkedin}` : '']
    .filter(Boolean).join(' | ')

  function para(text: string, bold = false, size = 19): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text, bold, size, font: FONT, color: '000000' })],
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.JUSTIFIED,
    })
  }

  function blank(): Paragraph {
    return new Paragraph({ children: [], spacing: { before: 80, after: 0 } })
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } },
      },
      children: [
        // ── Header ──
        new Paragraph({
          children: [new TextRun({ text: c.name.toUpperCase(), bold: true, size: 36, font: FONT, color: '1a1a2e' })],
          spacing: { before: 0, after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: contactLine, size: 17, font: FONT, color: '444444' })],
          spacing: { before: 0, after: 120 },
          border: { bottom: { color: '333333', space: 4, style: BorderStyle.SINGLE, size: 8 } },
        }),

        blank(),

        // ── Date ──
        para(data.date),

        blank(),

        // ── Recipient ──
        para(data.recipient_name, true),
        para(data.company, true),
        para(data.address),

        blank(),

        // ── Salutation ──
        para(data.salutation),

        blank(),

        // ── Body paragraphs ──
        ...data.paragraphs.flatMap(p => [para(p), blank()]),

        // ── Closing ──
        para(data.closing),
        blank(),
        blank(),
        para(c.name),
      ],
    }],
  })

  return await Packer.toBuffer(doc)
}
