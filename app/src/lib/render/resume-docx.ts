import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  BorderStyle, Footer, PageNumber, Header,
} from 'docx'
import type { ResumeData } from './types'

const FONT = 'Calibri'
const COLOR_BLACK = '000000'
const COLOR_SECTION = '1a1a2e'

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 20, font: FONT, color: COLOR_SECTION, allCaps: true })],
    spacing: { before: 200, after: 60 },
    border: { bottom: { color: 'cccccc', space: 1, style: BorderStyle.SINGLE, size: 6 } },
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `- ${text}`, size: 18, font: FONT, color: COLOR_BLACK })],
    spacing: { before: 30, after: 30 },
    indent: { left: 200 },
  })
}

function body(text: string, spacing = { before: 60, after: 60 }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, font: FONT, color: COLOR_BLACK })],
    spacing,
    alignment: AlignmentType.JUSTIFIED,
  })
}

function bold(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 18, font: FONT, color: COLOR_BLACK })],
    spacing: { before: 100, after: 20 },
  })
}

function subLine(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, font: FONT, color: '555555', italics: false })],
    spacing: { before: 0, after: 40 },
  })
}

function spacer(): Paragraph {
  return new Paragraph({ children: [], spacing: { before: 60, after: 0 } })
}

export async function buildResumeDocx(data: ResumeData): Promise<Buffer> {
  const c = data.candidate
  const contactLine = [c.location, c.phone, c.email, c.linkedin ? `LinkedIn: ${c.linkedin}` : '']
    .filter(Boolean).join(' | ')

  const children: Paragraph[] = [
    // ── Name ──
    new Paragraph({
      children: [new TextRun({ text: c.name.toUpperCase(), bold: true, size: 36, font: FONT, color: COLOR_SECTION })],
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 60 },
    }),
    // ── Contact line ──
    new Paragraph({
      children: [new TextRun({ text: contactLine, size: 17, font: FONT, color: '444444' })],
      spacing: { before: 0, after: 120 },
      border: { bottom: { color: '333333', space: 4, style: BorderStyle.SINGLE, size: 8 } },
    }),

    // ── Summary ──
    sectionHeader('Summary'),
    body(data.summary),

    // ── Key Skills ──
    sectionHeader('Key Skills'),
    new Paragraph({
      children: [new TextRun({ text: data.key_skills.join(' | '), size: 18, font: FONT, color: COLOR_BLACK })],
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.JUSTIFIED,
    }),

    // ── Professional Experience ──
    sectionHeader('Professional Experience'),
    ...data.experience.flatMap(exp => [
      new Paragraph({
        children: [
          new TextRun({ text: exp.role, bold: true, size: 19, font: FONT, color: COLOR_BLACK }),
          new TextRun({ text: ` | ${exp.company}`, size: 19, font: FONT, color: COLOR_BLACK }),
        ],
        spacing: { before: 120, after: 20 },
      }),
      subLine(`${exp.period} | ${exp.location}`),
      ...exp.bullets.map(b => bullet(b)),
    ]),

    // ── Education ──
    sectionHeader('Education'),
    ...data.education.flatMap(ed => [
      bold(`${ed.degree} | ${ed.institution} | ${ed.location} | ${ed.period}`),
      ...(ed.achievement ? [bullet(ed.achievement)] : []),
    ]),

    // ── Certifications ──
    sectionHeader('Certifications and Checks'),
    body(data.certifications),

    // ── Technical Skills ──
    sectionHeader('Technical Skills'),
    new Paragraph({
      children: [new TextRun({ text: data.technical_skills.join(' | '), size: 18, font: FONT, color: COLOR_BLACK })],
      spacing: { before: 60, after: 60 },
    }),

    // ── Additional Information ──
    sectionHeader('Additional Information'),
    ...data.additional_info.map(b => bullet(b)),

    spacer(),
  ]

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${c.name} - Resume - Page `, size: 16, font: FONT, color: '888888' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: '888888' }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children,
    }],
  })

  return await Packer.toBuffer(doc)
}
