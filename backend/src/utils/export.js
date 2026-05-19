const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, HeadingLevel, AlignmentType, BorderStyle,
} = require('docx');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const FONTS_DIR = path.join(__dirname, '../../../fonts');
const FONT_PATHS = [
  path.join(FONTS_DIR, 'DejaVuSans.ttf'),
  '/usr/share/fonts/ttf-dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
];
const FONT_BOLD_PATHS = [
  path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf'),
  '/usr/share/fonts/ttf-dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
];

function findFont(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  console.warn('DejaVu font not found, PDF will use fallback (no Cyrillic support)');
  return null;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
}

function duration(start, end) {
  if (!start || !end) return '—';
  const secs = Math.round((new Date(end) - new Date(start)) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m} мин ${s} сек`;
}

// ──────────────────────────────────────────────
// DOCX
// ──────────────────────────────────────────────
async function generateDocx(session) {
  const borderNone = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone };

  const headerRows = [
    ['Участник', session.participant_name],
    ['Тест', session.test_title],
    ['Начало', formatDate(session.started_at)],
    ['Окончание', formatDate(session.finished_at)],
    ['Затрачено', duration(session.started_at, session.finished_at)],
    ['Результат', `${session.score} / ${session.total_questions} (${session.total_questions > 0 ? Math.round(session.score / session.total_questions * 100) : 0}%)`],
  ];

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: headerRows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [new Paragraph({ children: [new TextRun({ text: String(value) })] })],
          }),
        ],
      })
    ),
  });

  const questionBlocks = (session.responses || []).flatMap((r, i) => {
    const mark = r.is_correct ? '✓' : '✗';
    return [
      new Paragraph({
        children: [
          new TextRun({ text: `${i + 1}. ${r.question_text}`, bold: true }),
        ],
        spacing: { before: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Ответ участника: ', bold: true }),
          new TextRun({
            text: r.chosen_answer || '(нет ответа)',
            color: r.is_correct ? '2E7D32' : 'C62828',
          }),
          new TextRun({ text: `  ${mark}`, bold: true, color: r.is_correct ? '2E7D32' : 'C62828' }),
        ],
      }),
      ...(!r.is_correct
        ? [new Paragraph({
            children: [
              new TextRun({ text: 'Правильный ответ: ', bold: true }),
              new TextRun({ text: r.correct_answer, color: '2E7D32' }),
            ],
          })]
        : []),
    ];
  });

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: 'Результаты тестирования',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
        infoTable,
        new Paragraph({
          text: 'Ответы на вопросы',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }),
        ...questionBlocks,
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

// ──────────────────────────────────────────────
// PDF
// ──────────────────────────────────────────────
function generatePdf(session) {
  return new Promise((resolve, reject) => {
    const fontPath = findFont(FONT_PATHS);
    const fontBoldPath = findFont(FONT_BOLD_PATHS);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (fontPath) {
      doc.registerFont('Regular', fontPath);
      doc.registerFont('Bold', fontBoldPath || fontPath);
    }

    const useCustomFont = !!fontPath;
    const reg = useCustomFont ? 'Regular' : 'Helvetica';
    const bold = useCustomFont ? 'Bold' : 'Helvetica-Bold';

    const W = doc.page.width - 100;

    // Title
    doc.font(bold).fontSize(16)
      .text('Результаты тестирования', { align: 'center' })
      .moveDown(1);

    // Info table
    const info = [
      ['Участник', session.participant_name],
      ['Тест', session.test_title],
      ['Начало', formatDate(session.started_at)],
      ['Окончание', formatDate(session.finished_at)],
      ['Затрачено', duration(session.started_at, session.finished_at)],
      ['Результат', `${session.score} / ${session.total_questions} (${session.total_questions > 0 ? Math.round(session.score / session.total_questions * 100) : 0}%)`],
    ];

    const colW = W / 2;
    for (const [label, value] of info) {
      const y = doc.y;
      doc.font(bold).fontSize(11).text(label, 50, y, { width: colW, continued: false });
      doc.font(reg).fontSize(11).text(String(value), 50 + colW, y, { width: colW });
    }

    doc.moveDown(1.5);

    // Divider
    doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).stroke('#cccccc').moveDown(0.5);

    doc.font(bold).fontSize(13).text('Ответы на вопросы').moveDown(0.5);

    for (let i = 0; i < (session.responses || []).length; i++) {
      const r = session.responses[i];
      const color = r.is_correct ? '#2E7D32' : '#C62828';
      const mark = r.is_correct ? '✓' : '✗';

      doc.font(bold).fontSize(11).fillColor('#000000')
        .text(`${i + 1}. ${r.question_text}`, { width: W });

      doc.font(reg).fontSize(10).fillColor(color)
        .text(`Ответ: ${r.chosen_answer || '(нет ответа)'}  ${mark}`, { width: W });

      if (!r.is_correct) {
        doc.font(reg).fontSize(10).fillColor('#2E7D32')
          .text(`Правильно: ${r.correct_answer}`, { width: W });
      }

      doc.fillColor('#000000').moveDown(0.4);
    }

    doc.end();
  });
}

module.exports = { generateDocx, generatePdf };
