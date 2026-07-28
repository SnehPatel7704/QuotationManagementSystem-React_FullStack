const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { generateQuotationPDF } = require('../services/pdfService');
const { 
  sendQuotationToAdmin, 
  sendQuotationToClient,
  sendApprovalNotification,
  sendRejectionNotification
} = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

// Get all quotations
router.get('/', authenticate, async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        company: true,
        creator: {
          select: { username: true, email: true },
        },
        approver: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming followups
router.get('/upcoming-followups', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const followups = await prisma.quotation.findMany({
      where: {
        followUpDate: {
          gte: new Date(),
        },
        status: {
          in: ['PENDING_APPROVAL', 'SENT'],
        },
      },
      include: {
        company: true,
      },
      orderBy: { followUpDate: 'asc' },
    });
    res.json(followups);
  } catch (error) {
    console.error('Error fetching upcoming followups:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quotation by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        company: true,
        creator: {
          select: { username: true, email: true },
        },
        approver: {
          select: { username: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    res.json(quotation);
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create quotation
router.post('/', authenticate, async (req, res) => {
  const { companyId, items, followUpDate } = req.body;

  try {
    // Get creator user id
    const user = await prisma.user.findUnique({
      where: { username: req.user.username },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Auto-generate quotation number
    const count = await prisma.quotation.count();
    const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    // Calculate total amount
    let totalAmount = 0;
    const itemsData = items.map((item) => {
      const unitPrice = parseFloat(item.unitPrice);
      const qty = parseInt(item.quantity);
      const total = unitPrice * qty;
      totalAmount += total;

      return {
        productId: item.productId,
        quantity: qty,
        unitPrice,
        totalPrice: total,
      };
    });

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        companyId: parseInt(companyId),
        status: 'DRAFT',
        totalAmount,
        createdBy: user.id,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    });

    res.status(201).json(quotation);
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update quotation
router.put('/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  const { companyId, items, followUpDate } = req.body;

  try {
    const existing = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      return res.status(400).json({ message: 'Only DRAFT or REJECTED quotations can be updated.' });
    }

    // Calculate total
    let totalAmount = 0;
    const itemsData = items.map((item) => {
      const unitPrice = parseFloat(item.unitPrice);
      const qty = parseInt(item.quantity);
      const total = unitPrice * qty;
      totalAmount += total;

      return {
        productId: item.productId,
        quantity: qty,
        unitPrice,
        totalPrice: total,
      };
    });

    // Run in transaction: delete old items, create new items, update quotation
    const updated = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      return tx.quotation.update({
        where: { id },
        data: {
          companyId: parseInt(companyId),
          totalAmount,
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
        },
      });
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit draft for approval
router.post('/:id/submit', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });

    // Notify admins of new submission
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    admins.forEach((admin) => {
      sendQuotationToAdmin(quotation, admin.email);
    });

    res.json(quotation);
  } catch (error) {
    console.error('Error submitting quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve quotation
router.post('/:id/approve', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const approver = await prisma.user.findUnique({
      where: { username: req.user.username },
    });

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approver.id,
      },
      include: {
        creator: true,
      },
    });

    // Notify creator
    await sendApprovalNotification(quotation, quotation.creator, approver.username);

    res.json(quotation);
  } catch (error) {
    console.error('Error approving quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject quotation (creates a new DRAFT revision)
router.post('/:id/reject', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { reason } = req.body;

  try {
    const approver = await prisma.user.findUnique({
      where: { username: req.user.username },
    });

    // Get original quotation with its items
    const original = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!original) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Update original status to REJECTED
    const rejected = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: approver.id,
        rejectionReason: reason,
      },
      include: {
        creator: true,
      },
    });

    // Create a new revision quotation in DRAFT mode
    const revision = await prisma.quotation.create({
      data: {
        quotationNumber: original.quotationNumber,
        companyId: original.companyId,
        status: 'DRAFT',
        totalAmount: original.totalAmount,
        createdBy: original.createdBy,
        revisionNumber: original.revisionNumber + 1,
        parentQuotationId: original.parentQuotationId || original.id,
        items: {
          create: original.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
    });

    // Notify creator via email
    await sendRejectionNotification(rejected, rejected.creator, reason, revision.id);

    res.json({ rejected, revision });
  } catch (error) {
    console.error('Error rejecting quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send quotation to client via email
router.post('/:id/send', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (!quotation.company.email) {
      return res.status(400).json({ message: 'Company does not have an email address configured.' });
    }

    // Send email
    await sendQuotationToClient(quotation, quotation.company.email);

    // Update status to SENT
    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: 'SENT' },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error sending quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get revision history/tree for a quotation
router.get('/:id/revisions', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const parentId = quotation.parentQuotationId || quotation.id;

    // Find all quotations sharing the same parent (or being the parent)
    const revisions = await prisma.quotation.findMany({
      where: {
        OR: [
          { id: parentId },
          { parentQuotationId: parentId },
        ],
      },
      include: {
        creator: {
          select: { username: true },
        },
        approver: {
          select: { username: true },
        },
      },
      orderBy: { revisionNumber: 'asc' },
    });

    res.json(revisions);
  } catch (error) {
    console.error('Error fetching revisions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete quotation
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.quotation.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET PDF Export for quotation
router.get('/:id/pdf', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        company: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${quotation.quotationNumber}.pdf`);

    generateQuotationPDF(quotation, res);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ message: 'Server error exporting PDF' });
  }
});

module.exports = router;
