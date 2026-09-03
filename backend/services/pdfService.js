const PDFDocument = require('pdfkit');

/**
 * Generates a professional quotation PDF using PDFKit.
 * All elements use fixed absolute coordinates to avoid cursor drift.
 */
function generateQuotationPDF(quotation, stream) {
  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  doc.pipe(stream);

  const PAGE_W  = 595;
  const MARGIN  = 40;
  const CONTENT = PAGE_W - MARGIN * 2; // 515

  const company = quotation.company || {};

  // ─────────────────────────────────────────────────────────────────────────────
  // HEADER BANNER
  // ─────────────────────────────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, 70).fill('#1e293b');

  doc
    .fillColor('#ffffff')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('QUOTATION', MARGIN, 18, { width: CONTENT, align: 'center' });

  doc
    .fillColor('#94a3b8')
    .fontSize(9)
    .font('Helvetica')
    .text('Quotation Management System', MARGIN, 44, { width: CONTENT, align: 'center' });

  // ─────────────────────────────────────────────────────────────────────────────
  // INFO SECTION  (two columns: Quotation Details | Company Information)
  // ─────────────────────────────────────────────────────────────────────────────
  const INFO_TOP    = 85;
  const COL_LEFT    = MARGIN;
  const COL_RIGHT   = 310;
  const COL_W_LEFT  = 240;
  const COL_W_RIGHT = 245;
  const LINE_H      = 16;

  // ── Left: Quotation Details ──
  doc
    .fillColor('#0f172a')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Quotation Details', COL_LEFT, INFO_TOP, { width: COL_W_LEFT });

  const details = [
    ['Quotation No', quotation.quotationNumber],
    ['Date', new Date(quotation.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })],
    ['Status', (quotation.status || '').replace(/_/g, ' ')],
    ...(quotation.revisionNumber > 1 ? [['Revision', String(quotation.revisionNumber)]] : []),
  ];

  details.forEach(([label, value], i) => {
    const y = INFO_TOP + 18 + i * LINE_H;
    doc
      .fillColor('#64748b')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(`${label}:`, COL_LEFT, y, { width: 80, continued: false });
    doc
      .fillColor('#334155')
      .font('Helvetica')
      .text(value, COL_LEFT + 82, y, { width: COL_W_LEFT - 82 });
  });

  // ── Right: Company Information ──
  doc
    .fillColor('#0f172a')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Company Information', COL_RIGHT, INFO_TOP, { width: COL_W_RIGHT });

  const companyLines = [
    ['Name',    company.name],
    ['Address', company.address],
    ['Email',   company.email],
    ['Phone',   company.phone],
  ].filter(([, v]) => v);

  companyLines.forEach(([label, value], i) => {
    const y = INFO_TOP + 18 + i * LINE_H;
    doc
      .fillColor('#64748b')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(`${label}:`, COL_RIGHT, y, { width: 45, continued: false });
    doc
      .fillColor('#334155')
      .font('Helvetica')
      .text(value, COL_RIGHT + 47, y, { width: COL_W_RIGHT - 47 });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DIVIDER
  // ─────────────────────────────────────────────────────────────────────────────
  const DIVIDER_Y = INFO_TOP + 18 + Math.max(details.length, companyLines.length) * LINE_H + 10;
  doc.moveTo(MARGIN, DIVIDER_Y).lineTo(PAGE_W - MARGIN, DIVIDER_Y).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // ─────────────────────────────────────────────────────────────────────────────
  // ITEMS TABLE
  // ─────────────────────────────────────────────────────────────────────────────
  const TABLE_TOP     = DIVIDER_Y + 12;
  const TABLE_HEADER  = TABLE_TOP + 18;  // title height
  const ROW_H         = 22;
  const CELL_PAD      = 5;

  // Column definitions [x, width, align]
  const C = {
    no:          { x: MARGIN,       w: 25,  align: 'center' },
    product:     { x: MARGIN + 25,  w: 120, align: 'left'   },
    description: { x: MARGIN + 145, w: 145, align: 'left'   },
    qty:         { x: MARGIN + 290, w: 40,  align: 'center' },
    unitPrice:   { x: MARGIN + 330, w: 80,  align: 'right'  },
    total:       { x: MARGIN + 410, w: 105, align: 'right'  },
  };

  // Section title
  doc
    .fillColor('#0f172a')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Items', MARGIN, TABLE_TOP);

  // Header row background
  doc.rect(MARGIN, TABLE_HEADER, CONTENT, ROW_H).fill('#1e293b');

  // Header labels
  const headers = [
    ['#',          C.no],
    ['Product',    C.product],
    ['Description',C.description],
    ['Qty',        C.qty],
    ['Unit Price', C.unitPrice],
    ['Total (OMR)',C.total],
  ];

  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  headers.forEach(([label, col]) => {
    doc.text(label, col.x + CELL_PAD, TABLE_HEADER + 7, {
      width: col.w - CELL_PAD * 2,
      align: col.align,
      lineBreak: false,
    });
  });

  // Item rows
  let rowY = TABLE_HEADER + ROW_H;
  const items = quotation.items || [];

  items.forEach((item, i) => {
    const product     = item.product || {};
    const productName = product.name        || '';
    const desc        = product.description || '';

    // Dynamic row height based on wrapping content
    const nameH = doc.heightOfString(productName, { width: C.product.w - CELL_PAD * 2,     font: 'Helvetica', fontSize: 9 });
    const descH = doc.heightOfString(desc,        { width: C.description.w - CELL_PAD * 2, font: 'Helvetica', fontSize: 9 });
    const dynamicH = Math.max(ROW_H, nameH + CELL_PAD * 2, descH + CELL_PAD * 2);

    // Alternating stripe
    doc.rect(MARGIN, rowY, CONTENT, dynamicH).fill(i % 2 === 0 ? '#f8fafc' : '#ffffff');

    // Thin bottom border for each row
    doc.moveTo(MARGIN, rowY + dynamicH).lineTo(PAGE_W - MARGIN, rowY + dynamicH)
      .strokeColor('#e2e8f0').lineWidth(0.5).stroke();

    // Cell text
    doc.fillColor('#334155').fontSize(9).font('Helvetica');
    const cy = rowY + CELL_PAD;

    doc.text(String(i + 1), C.no.x + CELL_PAD, cy, {
      width: C.no.w - CELL_PAD * 2, align: 'center', lineBreak: false,
    });
    doc.text(productName, C.product.x + CELL_PAD, cy, {
      width: C.product.w - CELL_PAD * 2, align: 'left',
    });
    doc.text(desc, C.description.x + CELL_PAD, cy, {
      width: C.description.w - CELL_PAD * 2, align: 'left',
    });
    doc.text(String(item.quantity), C.qty.x + CELL_PAD, cy, {
      width: C.qty.w - CELL_PAD * 2, align: 'center', lineBreak: false,
    });
    doc.text(`OMR ${parseFloat(item.unitPrice).toFixed(2)}`, C.unitPrice.x, cy, {
      width: C.unitPrice.w - CELL_PAD, align: 'right', lineBreak: false,
    });
    doc.text(`OMR ${parseFloat(item.totalPrice).toFixed(2)}`, C.total.x, cy, {
      width: C.total.w - CELL_PAD, align: 'right', lineBreak: false,
    });

    rowY += dynamicH;
  });

  // Table bottom border
  doc.moveTo(MARGIN, rowY).lineTo(PAGE_W - MARGIN, rowY).strokeColor('#cbd5e1').lineWidth(1).stroke();

  // ─────────────────────────────────────────────────────────────────────────────
  // TOTAL AMOUNT ROW
  // ─────────────────────────────────────────────────────────────────────────────
  const totalY = rowY + 6;
  doc.rect(MARGIN, totalY, CONTENT, 26).fill('#f1f5f9');

  doc
    .fillColor('#0f172a')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Total Amount:', MARGIN + CELL_PAD, totalY + 7, {
      width: CONTENT - C.total.w - CELL_PAD * 2,
      align: 'right',
      lineBreak: false,
    });

  doc
    .fillColor('#0369a1')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(
      `OMR ${parseFloat(quotation.totalAmount).toFixed(2)}`,
      C.total.x,
      totalY + 7,
      { width: C.total.w - CELL_PAD, align: 'right', lineBreak: false }
    );

  // ─────────────────────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────────────────────
  const FOOTER_Y  = 760;
  const PAGE_H    = 842;

  // Footer background
  doc.rect(0, FOOTER_Y, PAGE_W, PAGE_H - FOOTER_Y).fill('#f8fafc');
  doc.moveTo(MARGIN, FOOTER_Y).lineTo(PAGE_W - MARGIN, FOOTER_Y).strokeColor('#e2e8f0').lineWidth(1).stroke();

  // Terms
  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold')
    .text('Terms & Conditions:', MARGIN, FOOTER_Y + 8);
  doc.font('Helvetica').fillColor('#64748b')
    .text('1. All payments should be made to the company bank account.', MARGIN, FOOTER_Y + 19)
    .text('2. This quotation is valid for 30 days from the date of issue.', MARGIN, FOOTER_Y + 29)
    .text('3. Prices are inclusive of applicable taxes unless stated otherwise.', MARGIN, FOOTER_Y + 39);

  // Thank you note
  doc
    .fillColor('#1e293b')
    .fontSize(10)
    .font('Helvetica-Oblique')
    .text('Thank you for your business!', MARGIN, FOOTER_Y + 54, {
      width: CONTENT,
      align: 'center',
    });

  doc.end();
}

module.exports = { generateQuotationPDF };
