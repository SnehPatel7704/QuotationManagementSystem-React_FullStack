const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

const FROM_EMAIL = process.env.MAIL_FROM || process.env.MAIL_USERNAME || 'noreply@quotationsystem.com';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function deliverEmail(mailOptions, description) {
  if (!process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
    return { sent: false, message: 'Email delivery is not configured.' };
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`${description} sent to ${mailOptions.to}`);
    return { sent: true };
  } catch (error) {
    console.error(`Error sending ${description.toLowerCase()}:`, error);
    return { sent: false, message: 'Email delivery failed.' };
  }
}

/**
 * Send quotation review alert email to admin
 */
async function sendQuotationToAdmin(quotation, adminEmail) {
  const mailOptions = {
    from: FROM_EMAIL,
    to: adminEmail,
    subject: `Quotation Ready for Review: ${quotation.quotationNumber}`,
    text: `A new quotation ${quotation.quotationNumber} has been created and is ready for your review.\n\nTotal Amount: ${quotation.totalAmount}\nStatus: ${quotation.status}`,
  };

  return deliverEmail(mailOptions, 'Admin notification');
}

const { generateQuotationPDFBuffer } = require('./pdfService');

/**
 * Send approved quotation details to client
 */
async function sendQuotationToClient(quotation, clientEmail) {
  if (!process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
    return { sent: false, message: 'Email delivery is not configured.' };
  }
  
  let pdfBuffer;
  try {
    pdfBuffer = await generateQuotationPDFBuffer(quotation);
  } catch (err) {
    console.error('Failed to generate PDF for email attachment', err);
    return { sent: false, message: 'The quotation PDF could not be generated.' };
  }

  const mailOptions = {
    from: FROM_EMAIL,
    to: clientEmail,
    subject: `Your Quotation: ${quotation.quotationNumber}`,
    text: `Dear Customer,\n\nPlease find your quotation details attached below:\n\nQuotation Number: ${quotation.quotationNumber}\nTotal Amount: ${quotation.totalAmount}\n\nThank you for your business.`,
    attachments: pdfBuffer ? [
      {
        filename: `Quotation_${quotation.quotationNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    ] : [],
  };

  return deliverEmail(mailOptions, 'Quotation email');
}

/**
 * Send approval email to creator
 */
async function sendApprovalNotification(quotation, creator, approverName) {
  const approvalDate = new Date(quotation.updatedAt).toLocaleString('en-GB', { hour12: false });
  const quotationLink = `${FRONTEND_URL}/quotations/${encodeURIComponent(quotation.id)}`;

  const htmlContent = `
    <h2>Quotation Approved</h2>
    <p>Your quotation <strong>${escapeHtml(quotation.quotationNumber)}</strong> has been approved.</p>
    <p><strong>Approved Date:</strong> ${approvalDate}</p>
    <p><strong>Approved By:</strong> ${escapeHtml(approverName || 'Admin')}</p>
    <p><a href="${escapeHtml(quotationLink)}">Click here to view the quotation</a></p>
  `;

  const mailOptions = {
    from: FROM_EMAIL,
    to: creator.email,
    subject: `Quotation Approved: ${quotation.quotationNumber}`,
    html: htmlContent,
  };

  return deliverEmail(mailOptions, 'Approval notification');
}

/**
 * Send rejection email to creator
 */
async function sendRejectionNotification(quotation, creator, rejectionReason, revisionId) {
  const rejectionDate = new Date(quotation.updatedAt).toLocaleString('en-GB', { hour12: false });
  const revisionLink = `${FRONTEND_URL}/quotations/${encodeURIComponent(revisionId)}`;

  const htmlContent = `
    <h2>Quotation Rejected</h2>
    <p>Your quotation <strong>${escapeHtml(quotation.quotationNumber)}</strong> has been rejected.</p>
    <p><strong>Rejection Date:</strong> ${rejectionDate}</p>
    <p><strong>Reason:</strong> ${escapeHtml(rejectionReason)}</p>
    <p>A new revision (Revision ${Number(quotation.revisionNumber) + 1}) has been created for you to adjust.</p>
    <p><a href="${escapeHtml(revisionLink)}">Click here to view and edit the new revision</a></p>
  `;

  const mailOptions = {
    from: FROM_EMAIL,
    to: creator.email,
    subject: `Quotation Rejected: ${quotation.quotationNumber}`,
    html: htmlContent,
  };

  return deliverEmail(mailOptions, 'Rejection notification');
}

module.exports = {
  sendQuotationToAdmin,
  sendQuotationToClient,
  sendApprovalNotification,
  sendRejectionNotification,
};
