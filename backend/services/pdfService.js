const PDFDocument = require('pdfkit');

function generateQuotationPDF(quotation, stream) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Pipe the document to the stream
  doc.pipe(stream);

  // Header / Brand Name
  doc.fillColor('#1e293b')
     .fontSize(20)
     .text('QUOTATION MANAGEMENT SYSTEM', 50, 50, { align: 'left' });
  
  doc.fontSize(10)
     .fillColor('#64748b')
     .text('Your Trusted Partner in Enterprise Solutions', 50, 75, { align: 'left' });

  // Horizontal divider
  doc.moveTo(50, 95).lineTo(545, 95).strokeColor('#e2e8f0').stroke();

  // Quotation Info
  doc.fillColor('#0f172a').fontSize(14).text('QUOTATION', 50, 115, { bold: true });
  doc.fontSize(10).fillColor('#334155');
  doc.text(`Quotation Number: ${quotation.quotationNumber}`, 50, 140);
  doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-GB')}`, 50, 155);
  doc.text(`Status: ${quotation.status}`, 50, 170);
  doc.text(`Revision: ${quotation.revisionNumber}`, 50, 185);

  // Bill To (Company Info)
  doc.fillColor('#0f172a').fontSize(12).text('BILL TO:', 320, 115, { bold: true });
  doc.fontSize(10).fillColor('#334155');
  doc.text(quotation.company.name, 320, 135);
  if (quotation.company.email) doc.text(`Email: ${quotation.company.email}`, 320, 150);
  if (quotation.company.phone) doc.text(`Phone: ${quotation.company.phone}`, 320, 165);
  if (quotation.company.address) doc.text(`Address: ${quotation.company.address}`, 320, 180, { width: 220 });

  // Table Headers
  const tableTop = 240;
  doc.fillColor('#1e293b').fontSize(10);
  doc.text('Product Name', 50, tableTop, { bold: true });
  doc.text('Quantity', 250, tableTop, { align: 'right', bold: true, width: 60 });
  doc.text('Unit Price', 340, tableTop, { align: 'right', bold: true, width: 80 });
  doc.text('Total Price', 450, tableTop, { align: 'right', bold: true, width: 95 });

  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#cbd5e1').stroke();

  // Table Items
  let currentY = tableTop + 25;
  quotation.items.forEach((item) => {
    doc.fillColor('#334155');
    doc.text(item.product.name, 50, currentY, { width: 180 });
    doc.text(item.quantity.toString(), 250, currentY, { align: 'right', width: 60 });
    doc.text(`$${parseFloat(item.unitPrice).toFixed(2)}`, 340, currentY, { align: 'right', width: 80 });
    doc.text(`$${parseFloat(item.totalPrice).toFixed(2)}`, 450, currentY, { align: 'right', width: 95 });
    
    currentY += 20;
  });

  doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor('#cbd5e1').stroke();

  // Grand Total
  currentY += 15;
  doc.fillColor('#0f172a').fontSize(12);
  doc.text('Grand Total:', 340, currentY, { align: 'right', bold: true, width: 80 });
  doc.text(`$${parseFloat(quotation.totalAmount).toFixed(2)}`, 450, currentY, { align: 'right', bold: true, width: 95 });

  // Footer / Terms
  doc.fillColor('#64748b').fontSize(8);
  doc.text('Terms & Conditions:', 50, 700);
  doc.text('1. All payments should be made to the company bank account.', 50, 715);
  doc.text('2. This quotation is valid for 30 days from the date of issue.', 50, 725);
  doc.text('Thank you for your business!', 50, 745, { align: 'center' });

  // Finalize PDF
  doc.end();
}

module.exports = { generateQuotationPDF };
