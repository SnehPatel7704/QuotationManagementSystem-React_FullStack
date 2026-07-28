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

const FROM_EMAIL = 'noreply@quotationsystem.com';

/**
 * Send quotation review alert email to admin
 */
async function sendQuotationToAdmin(quotation, adminEmail) {
  if (!process.env.MAIL_USERNAME) return;
  const mailOptions = {
    from: FROM_EMAIL,
    to: adminEmail,
    subject: `Quotation Ready for Review: ${quotation.quotationNumber}`,
    text: `A new quotation ${quotation.quotationNumber} has been created and is ready for your review.\n\nTotal Amount: ${quotation.totalAmount}\nStatus: ${quotation.status}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email notification sent to Admin: ${adminEmail}`);
  } catch (error) {
    console.error('Error sending admin notification email:', error);
  }
}

/**
 * Send approved quotation details to client
 */
async function sendQuotationToClient(quotation, clientEmail) {
  if (!process.env.MAIL_USERNAME) return;
  const mailOptions = {
    from: FROM_EMAIL,
    to: clientEmail,
    subject: `Your Quotation: ${quotation.quotationNumber}`,
    text: `Dear Customer,\n\nPlease find your quotation details below:\n\nQuotation Number: ${quotation.quotationNumber}\nTotal Amount: ${quotation.totalAmount}\n\nThank you for your business.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Quotation email sent to client: ${clientEmail}`);
  } catch (error) {
    console.error('Error sending client quotation email:', error);
  }
}

/**
 * Send approval email to creator
 */
async function sendApprovalNotification(quotation, creator, approverName) {
  if (!process.env.MAIL_USERNAME) return;
  const approvalDate = new Date(quotation.updatedAt).toLocaleString('en-GB', { hour12: false });
  const quotationLink = `http://localhost:3000/quotations/${quotation.id}`;

  const htmlContent = `
    <h2>Quotation Approved</h2>
    <p>Your quotation <strong>${quotation.quotationNumber}</strong> has been approved.</p>
    <p><strong>Approved Date:</strong> ${approvalDate}</p>
    <p><strong>Approved By:</strong> ${approverName || 'Admin'}</p>
    <p><a href="${quotationLink}">Click here to view the quotation</a></p>
  `;

  const mailOptions = {
    from: FROM_EMAIL,
    to: creator.email,
    subject: `Quotation Approved: ${quotation.quotationNumber}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Approval email sent to creator: ${creator.email}`);
  } catch (error) {
    console.error('Error sending approval notification email:', error);
  }
}

/**
 * Send rejection email to creator
 */
async function sendRejectionNotification(quotation, creator, rejectionReason, revisionId) {
  if (!process.env.MAIL_USERNAME) return;
  const rejectionDate = new Date(quotation.updatedAt).toLocaleString('en-GB', { hour12: false });
  const revisionLink = `http://localhost:3000/quotations/${revisionId}`;

  const htmlContent = `
    <h2>Quotation Rejected</h2>
    <p>Your quotation <strong>${quotation.quotationNumber}</strong> has been rejected.</p>
    <p><strong>Rejection Date:</strong> ${rejectionDate}</p>
    <p><strong>Reason:</strong> ${rejectionReason}</p>
    <p>A new revision (Revision ${quotation.revisionNumber + 1}) has been created for you to adjust.</p>
    <p><a href="${revisionLink}">Click here to view and edit the new revision</a></p>
  `;

  const mailOptions = {
    from: FROM_EMAIL,
    to: creator.email,
    subject: `Quotation Rejected: ${quotation.quotationNumber}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to creator: ${creator.email}`);
  } catch (error) {
    console.error('Error sending rejection notification email:', error);
  }
}

module.exports = {
  sendQuotationToAdmin,
  sendQuotationToClient,
  sendApprovalNotification,
  sendRejectionNotification,
};
