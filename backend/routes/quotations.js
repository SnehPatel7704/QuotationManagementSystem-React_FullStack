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
const { logAudit } = require('../services/auditService');

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard analytics
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? {} : { companyId: req.user.companyId };
    const allQuotations = await prisma.quotation.findMany({ where: whereClause });
    
    let totalRevenue = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    const statusDistribution = {};
    const monthlyValues = {};

    allQuotations.forEach(q => {
      // 1. Distribution
      statusDistribution[q.status] = (statusDistribution[q.status] || 0) + 1;
      
      // 2. Metrics
      if (q.status === 'APPROVED' || q.status === 'SENT') {
        approvedCount++;
        totalRevenue += parseFloat(q.totalAmount);
      }
      if (q.status === 'PENDING_APPROVAL') {
        pendingCount++;
      }

      // 3. Monthly Chart Data
      const month = new Date(q.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyValues[month]) {
        monthlyValues[month] = { amount: 0, count: 0 };
      }
      monthlyValues[month].amount += parseFloat(q.totalAmount);
      monthlyValues[month].count += 1;
    });

    const totalCount = allQuotations.length;
    const winRate = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : 0;

    // Formatting for Recharts
    const chartData = Object.keys(monthlyValues).map(month => ({
      name: month,
      value: monthlyValues[month].amount,
      count: monthlyValues[month].count
    }));

    const pieData = Object.keys(statusDistribution).map(status => ({
      name: status.replace(/_/g, ' '),
      value: statusDistribution[status]
    }));

    res.json({
      metrics: {
        totalRevenue,
        approvedCount,
        pendingCount,
        winRate,
        totalCount
      },
      chartData,
      pieData
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all quotations
router.get('/', authenticate, async (req, res) => {
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? {} : { companyId: req.user.companyId };
    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        clientCompany: true,
        creator: {
          select: { username: true, email: true },
        },
        approver: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const mapped = quotations.map(q => ({ ...q, company: q.clientCompany }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming followups
router.get('/upcoming-followups', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const whereClause = {
      followUpDate: { gte: new Date() },
      status: { in: ['PENDING_APPROVAL', 'SENT'] },
    };
    if (req.user.role !== 'SUPERADMIN') {
      whereClause.companyId = req.user.companyId;
    }
    const followups = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        clientCompany: true,
      },
      orderBy: { followUpDate: 'asc' },
    });
    const mapped = followups.map(q => ({ ...q, company: q.clientCompany }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching upcoming followups:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quotation by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const quotation = await prisma.quotation.findFirst({
      where: whereClause,
      include: {
        clientCompany: true,
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
        auditLogs: {
          include: {
            user: { select: { username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    res.json({ ...quotation, company: quotation.clientCompany });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create quotation
router.post('/', authenticate, async (req, res) => {
  const companyId = req.body.companyId !== undefined ? req.body.companyId : req.body.quotation?.companyId;
  const followUpDate = req.body.followUpDate !== undefined ? req.body.followUpDate : req.body.quotation?.followUpDate;
  const items = req.body.items || [];

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

    // Calculate advanced totals
    let subtotalAmount = 0;
    const itemsData = items.map((item) => {
      const unitPrice = parseFloat(item.unitPrice);
      const qty = parseInt(item.quantity);
      let lineTotal = unitPrice * qty;

      if (item.discountType && item.discountValue) {
        const val = parseFloat(item.discountValue);
        if (item.discountType === 'PERCENTAGE') {
          lineTotal -= lineTotal * (val / 100);
        } else if (item.discountType === 'FIXED') {
          lineTotal -= val;
        }
      }

      subtotalAmount += lineTotal;

      return {
        productId: item.productId,
        quantity: qty,
        unitPrice,
        discountType: item.discountType || null,
        discountValue: item.discountValue ? parseFloat(item.discountValue) : null,
        totalPrice: lineTotal,
      };
    });

    let totalAmount = subtotalAmount;
    const globalDiscountType = req.body.discountType || req.body.quotation?.discountType;
    const globalDiscountValue = req.body.discountValue || req.body.quotation?.discountValue;
    
    if (globalDiscountType && globalDiscountValue) {
      const gVal = parseFloat(globalDiscountValue);
      if (globalDiscountType === 'PERCENTAGE') {
        totalAmount -= totalAmount * (gVal / 100);
      } else if (globalDiscountType === 'FIXED') {
        totalAmount -= gVal;
      }
    }

    const taxRate = req.body.taxRate || req.body.quotation?.taxRate;
    const isTaxInclusive = req.body.isTaxInclusive || req.body.quotation?.isTaxInclusive;
    if (taxRate && !isTaxInclusive) {
      totalAmount += totalAmount * (parseFloat(taxRate) / 100);
    }

    const clientCompanyId = req.body.companyId !== undefined ? req.body.companyId : req.body.quotation?.companyId;
    
    if (!req.user.companyId && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'User not assigned to a company' });
    }
    const tenantCompanyId = req.user.role === 'SUPERADMIN' ? (req.body.tenantCompanyId || req.user.companyId) : req.user.companyId;

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        companyId: tenantCompanyId,
        clientCompanyId: parseInt(clientCompanyId),
        status: 'DRAFT',
        subtotalAmount,
        discountType: globalDiscountType || null,
        discountValue: globalDiscountValue ? parseFloat(globalDiscountValue) : null,
        taxRate: taxRate ? parseFloat(taxRate) : null,
        isTaxInclusive: isTaxInclusive || false,
        totalAmount,
        createdBy: user.id,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
        clientCompany: true,
      },
    });

    await logAudit(quotation.id, user.id, 'CREATED', null, 'DRAFT', 'Initial creation');

    res.status(201).json(quotation);
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update quotation
router.put('/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  const companyId = req.body.companyId !== undefined ? req.body.companyId : req.body.quotation?.companyId;
  const followUpDate = req.body.followUpDate !== undefined ? req.body.followUpDate : req.body.quotation?.followUpDate;
  const items = req.body.items || [];

  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.quotation.findFirst({
      where: whereClause,
    });

    if (!existing) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      return res.status(400).json({ message: 'Only DRAFT or REJECTED quotations can be updated.' });
    }

    // Calculate totals
    let subtotalAmount = 0;
    const itemsData = items.map((item) => {
      const unitPrice = parseFloat(item.unitPrice);
      const qty = parseInt(item.quantity);
      let lineTotal = unitPrice * qty;

      if (item.discountType && item.discountValue) {
        const val = parseFloat(item.discountValue);
        if (item.discountType === 'PERCENTAGE') {
          lineTotal -= lineTotal * (val / 100);
        } else if (item.discountType === 'FIXED') {
          lineTotal -= val;
        }
      }

      subtotalAmount += lineTotal;

      return {
        productId: item.productId,
        quantity: qty,
        unitPrice,
        discountType: item.discountType || null,
        discountValue: item.discountValue ? parseFloat(item.discountValue) : null,
        totalPrice: lineTotal,
      };
    });

    let totalAmount = subtotalAmount;
    const globalDiscountType = req.body.discountType !== undefined ? req.body.discountType : req.body.quotation?.discountType;
    const globalDiscountValue = req.body.discountValue !== undefined ? req.body.discountValue : req.body.quotation?.discountValue;
    
    if (globalDiscountType && globalDiscountValue) {
      const gVal = parseFloat(globalDiscountValue);
      if (globalDiscountType === 'PERCENTAGE') {
        totalAmount -= totalAmount * (gVal / 100);
      } else if (globalDiscountType === 'FIXED') {
        totalAmount -= gVal;
      }
    }

    const taxRate = req.body.taxRate !== undefined ? req.body.taxRate : req.body.quotation?.taxRate;
    const isTaxInclusive = req.body.isTaxInclusive !== undefined ? req.body.isTaxInclusive : req.body.quotation?.isTaxInclusive;
    if (taxRate && !isTaxInclusive) {
      totalAmount += totalAmount * (parseFloat(taxRate) / 100);
    }

    // Run in transaction: delete old items, create new items, update quotation
    const updated = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      return tx.quotation.update({
        where: { id },
        data: {
          companyId: parseInt(companyId),
          subtotalAmount,
          discountType: globalDiscountType || null,
          discountValue: globalDiscountValue ? parseFloat(globalDiscountValue) : null,
          taxRate: taxRate ? parseFloat(taxRate) : null,
          isTaxInclusive: isTaxInclusive || false,
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

    const user = await prisma.user.findUnique({ where: { username: req.user.username } });
    await logAudit(id, user.id, 'EDITED', existing.status, existing.status, 'Quotation details updated');

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
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.quotation.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ message: 'Quotation not found' });
    
    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });

    const user = await prisma.user.findUnique({ where: { username: req.user.username } });
    await logAudit(id, user.id, 'STATUS_CHANGED', existing.status, 'PENDING_APPROVAL', 'Submitted for approval');

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

    await logAudit(id, approver.id, 'STATUS_CHANGED', 'PENDING_APPROVAL', 'APPROVED', 'Quotation approved');

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

    await logAudit(id, approver.id, 'STATUS_CHANGED', 'PENDING_APPROVAL', 'REJECTED', `Rejected: ${reason}`);

    // Create a new revision quotation in DRAFT mode
    const revision = await prisma.quotation.create({
      data: {
        quotationNumber: original.quotationNumber,
        companyId: original.companyId,
        status: 'DRAFT',
        subtotalAmount: original.subtotalAmount,
        discountType: original.discountType,
        discountValue: original.discountValue,
        taxRate: original.taxRate,
        isTaxInclusive: original.isTaxInclusive,
        totalAmount: original.totalAmount,
        createdBy: original.createdBy,
        revisionNumber: original.revisionNumber + 1,
        parentQuotationId: original.parentQuotationId || original.id,
        items: {
          create: original.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountType: item.discountType,
            discountValue: item.discountValue,
            totalPrice: item.totalPrice,
          })),
        },
      },
    });
    
    await logAudit(revision.id, approver.id, 'CREATED', null, 'DRAFT', 'Created as a new revision from rejected quotation');

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

    const user = await prisma.user.findUnique({ where: { username: req.user.username } });
    await logAudit(id, user.id, 'STATUS_CHANGED', quotation.status, 'SENT', 'Sent to client via email');

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
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.quotation.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ message: 'Quotation not found' });
    
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
