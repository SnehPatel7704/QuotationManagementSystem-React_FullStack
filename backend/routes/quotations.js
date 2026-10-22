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

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
  }
  return Boolean(value);
};

const parseFollowUpDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return { valid: true, date: null };
  }
  if (typeof value !== 'string') {
    return { valid: false, date: null };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, date: null };
  }

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly && date.toISOString().slice(0, 10) !== value) {
    return { valid: false, date: null };
  }

  return { valid: true, date };
};

const getPaginationMeta = (req, totalItems) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25', 10) || 25));
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    page,
    limit,
    totalItems,
    totalPages,
  };
};

const buildQuotationQuery = (req) => {
  const search = (req.query.search || '').trim();
  const status = req.query.status;
  const where = req.user.role === 'SUPERADMIN' ? {} : { companyId: req.user.companyId };

  if (status) {
    where.status = status;
  }

  if (search) {
    const searchTerm = `%${search}%`;
    where.OR = [
      { quotationNumber: { contains: search } },
      { clientCompany: { name: { contains: search } } },
      { company: { name: { contains: search } } },
    ];
  }

  return where;
};

const validateQuotationItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'At least one quotation item is required.';
  }

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return 'Each quotation item must be an object.';
    }

    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const discountValue = item.discountValue === undefined || item.discountValue === null || item.discountValue === ''
      ? null
      : Number(item.discountValue);

    if (!Number.isInteger(productId) || productId <= 0 ||
      !Number.isInteger(quantity) || quantity <= 0 ||
      !Number.isFinite(unitPrice) || unitPrice < 0) {
      return 'Each item must have a valid product, positive quantity, and non-negative unit price.';
    }

    if (item.discountType && !['PERCENTAGE', 'FIXED'].includes(item.discountType)) {
      return 'Item discount type must be PERCENTAGE or FIXED.';
    }

    if (item.discountType && (discountValue === null || !Number.isFinite(discountValue) || discountValue < 0)) {
      return 'A valid non-negative item discount value is required.';
    }

    if (item.discountType === 'PERCENTAGE' && discountValue > 100) {
      return 'Item percentage discounts cannot exceed 100%.';
    }

    const lineSubtotal = unitPrice * quantity;
    const lineDiscount = item.discountType === 'PERCENTAGE'
      ? lineSubtotal * (discountValue / 100)
      : item.discountType === 'FIXED'
        ? discountValue
        : 0;
    if (lineDiscount > lineSubtotal) {
      return 'An item discount cannot exceed its line subtotal.';
    }
  }

  return null;
};

const validateQuotationAssociations = async (tenantCompanyId, clientCompanyId, items) => {
  if (!Number.isInteger(tenantCompanyId) || tenantCompanyId <= 0 ||
    !Number.isInteger(clientCompanyId) || clientCompanyId <= 0) {
    return 'A valid client company is required.';
  }

  const client = await prisma.clientCompany.findFirst({
    where: { id: clientCompanyId, companyId: tenantCompanyId },
    select: { id: true },
  });
  if (!client) {
    return 'The selected client does not belong to this company.';
  }

  const productIds = [...new Set(items.map((item) => Number(item.productId)))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId: tenantCompanyId },
    select: { id: true },
  });
  if (products.length !== productIds.length) {
    return 'All selected products must belong to this company.';
  }

  return null;
};

// Get dashboard analytics
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? {} : { companyId: req.user.companyId };
    const allQuotations = await prisma.quotation.findMany({ where: whereClause });

    const recentActivityWhere = req.user.role === 'SUPERADMIN'
      ? {}
      : { quotation: { companyId: req.user.companyId } };

    const recentActivity = await prisma.quotationAuditLog.findMany({
      where: recentActivityWhere,
      include: {
        quotation: {
          select: {
            quotationNumber: true,
            status: true,
          },
        },
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

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
      pieData,
      recentActivity: recentActivity.map(item => ({
        id: item.id,
        quotationNumber: item.quotation?.quotationNumber || 'N/A',
        action: item.action,
        actor: item.user?.username || 'System',
        oldStatus: item.oldStatus,
        newStatus: item.newStatus,
        notes: item.notes,
        createdAt: item.createdAt,
      })),
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all quotations with support for search, filter, pagination and sorting
router.get('/', authenticate, async (req, res) => {
  try {
    const whereClause = buildQuotationQuery(req);
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25', 10) || 25));
    const sortBy = ['createdAt', 'updatedAt', 'totalAmount', 'quotationNumber', 'followUpDate'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'createdAt';
    const sortOrder = (req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const totalItems = await prisma.quotation.count({ where: whereClause });
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
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    const mapped = quotations.map(q => ({ ...q, company: q.clientCompany }));

    const hasPaging = req.query.page || req.query.limit || req.query.search || req.query.status;
    if (!hasPaging) {
      return res.json(mapped);
    }

    return res.json({
      data: mapped,
      pagination: getPaginationMeta(req, totalItems),
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming followups
router.get('/upcoming-followups', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const { startDate: startDateInput, endDate: endDateInput } = req.query;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const isCalendarDate = (value) => {
      if (!datePattern.test(value)) {
        return false;
      }
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    };
    if ((startDateInput && !datePattern.test(startDateInput)) ||
      (endDateInput && !datePattern.test(endDateInput)) ||
      Boolean(startDateInput) !== Boolean(endDateInput)) {
      return res.status(400).json({ message: 'Provide valid startDate and endDate values in YYYY-MM-DD format.' });
    }
    if ((startDateInput && !isCalendarDate(startDateInput)) ||
      (endDateInput && !isCalendarDate(endDateInput))) {
      return res.status(400).json({ message: 'The follow-up date range contains an invalid calendar date.' });
    }

    const startDate = startDateInput
      ? new Date(`${startDateInput}T00:00:00.000Z`)
      : new Date(new Date().setUTCHours(0, 0, 0, 0));
    const endDate = endDateInput
      ? new Date(`${endDateInput}T23:59:59.999Z`)
      : null;
    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime())) ||
      (endDate && startDate > endDate)) {
      return res.status(400).json({ message: 'The follow-up date range is invalid.' });
    }

    const whereClause = {
      followUpDate: { gte: startDate, ...(endDate ? { lte: endDate } : {}) },
      status: { in: ['PENDING_APPROVAL', 'SENT'] },
    };
    if (req.user.role !== 'SUPERADMIN') {
      whereClause.companyId = req.user.companyId;
    }
    const followups = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        clientCompany: true,
        company: {
          select: {
            currencyCode: true,
            currencySymbol: true,
          },
        },
      },
      orderBy: { followUpDate: 'asc' },
    });
    const mapped = followups.map(q => ({
      ...q,
      company: q.clientCompany,
      currencyCode: q.company.currencyCode,
      currencySymbol: q.company.currencySymbol,
    }));
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
router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const companyId = req.body.companyId !== undefined ? req.body.companyId : req.body.quotation?.companyId;
  const followUpDate = req.body.followUpDate !== undefined ? req.body.followUpDate : req.body.quotation?.followUpDate;
  const items = req.body.items || [];

  try {
    const parsedFollowUpDate = parseFollowUpDate(followUpDate);
    if (!parsedFollowUpDate.valid) {
      return res.status(400).json({ message: 'Follow-up date must be a valid date.' });
    }

    const itemError = validateQuotationItems(items);
    if (itemError) {
      return res.status(400).json({ message: itemError });
    }

    // Get creator user id
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const clientCompanyId = Number(companyId);
    let tenantCompanyId = req.user.companyId;
    if (req.user.role === 'SUPERADMIN') {
      const client = Number.isInteger(clientCompanyId) && clientCompanyId > 0
        ? await prisma.clientCompany.findUnique({ where: { id: clientCompanyId }, select: { companyId: true } })
        : null;
      if (!client) {
        return res.status(400).json({ message: 'A valid client company is required.' });
      }
      tenantCompanyId = client.companyId;
    }

    if (!tenantCompanyId) {
      return res.status(403).json({ message: 'User not assigned to a company' });
    }

    const associationError = await validateQuotationAssociations(tenantCompanyId, clientCompanyId, items);
    if (associationError) {
      return res.status(400).json({ message: associationError });
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
        productId: Number(item.productId),
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

    if (globalDiscountType && !['PERCENTAGE', 'FIXED'].includes(globalDiscountType)) {
      return res.status(400).json({ message: 'Discount type must be PERCENTAGE or FIXED.' });
    }
    
    if (globalDiscountType && globalDiscountValue) {
      const gVal = parseFloat(globalDiscountValue);
      if (!Number.isFinite(gVal) || gVal < 0 ||
        (globalDiscountType === 'PERCENTAGE' && gVal > 100) ||
        (globalDiscountType === 'FIXED' && gVal > subtotalAmount)) {
        return res.status(400).json({ message: 'The quotation discount is invalid or exceeds the subtotal.' });
      }
      if (globalDiscountType === 'PERCENTAGE') {
        totalAmount -= totalAmount * (gVal / 100);
      } else if (globalDiscountType === 'FIXED') {
        totalAmount -= gVal;
      }
    }

    const taxRate = req.body.taxRate || req.body.quotation?.taxRate;
    const isTaxInclusive = normalizeBoolean(req.body.isTaxInclusive ?? req.body.quotation?.isTaxInclusive);
    if (taxRate !== undefined && taxRate !== null &&
      (!Number.isFinite(Number(taxRate)) || Number(taxRate) < 0 || Number(taxRate) > 999.99)) {
      return res.status(400).json({ message: 'Tax rate must be between 0 and 999.99.' });
    }
    if (taxRate && !isTaxInclusive) {
      totalAmount += totalAmount * (parseFloat(taxRate) / 100);
    }

    const template = await prisma.quotationTemplate.findFirst({
      where: { companyId: tenantCompanyId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        companyId: tenantCompanyId,
        clientCompanyId,
        templateId: template?.id || null,
        status: 'DRAFT',
        subtotalAmount,
        discountType: globalDiscountType || null,
        discountValue: globalDiscountValue ? parseFloat(globalDiscountValue) : null,
        taxRate: taxRate ? parseFloat(taxRate) : null,
        isTaxInclusive: isTaxInclusive || false,
        totalAmount,
        createdBy: user.id,
        followUpDate: parsedFollowUpDate.date,
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
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  const companyId = req.body.companyId !== undefined ? req.body.companyId : req.body.quotation?.companyId;
  const followUpDate = req.body.followUpDate !== undefined ? req.body.followUpDate : req.body.quotation?.followUpDate;
  const items = req.body.items || [];

  try {
    const parsedFollowUpDate = parseFollowUpDate(followUpDate);
    if (!parsedFollowUpDate.valid) {
      return res.status(400).json({ message: 'Follow-up date must be a valid date.' });
    }

    const itemError = validateQuotationItems(items);
    if (itemError) {
      return res.status(400).json({ message: itemError });
    }

    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.quotation.findFirst({
      where: whereClause,
    });

    if (!existing) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only DRAFT quotations can be updated.' });
    }

    const clientCompanyId = Number(companyId);
    const associationError = await validateQuotationAssociations(existing.companyId, clientCompanyId, items);
    if (associationError) {
      return res.status(400).json({ message: associationError });
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
        productId: Number(item.productId),
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

    if (globalDiscountType && !['PERCENTAGE', 'FIXED'].includes(globalDiscountType)) {
      return res.status(400).json({ message: 'Discount type must be PERCENTAGE or FIXED.' });
    }
    
    if (globalDiscountType && globalDiscountValue) {
      const gVal = parseFloat(globalDiscountValue);
      if (!Number.isFinite(gVal) || gVal < 0 ||
        (globalDiscountType === 'PERCENTAGE' && gVal > 100) ||
        (globalDiscountType === 'FIXED' && gVal > subtotalAmount)) {
        return res.status(400).json({ message: 'The quotation discount is invalid or exceeds the subtotal.' });
      }
      if (globalDiscountType === 'PERCENTAGE') {
        totalAmount -= totalAmount * (gVal / 100);
      } else if (globalDiscountType === 'FIXED') {
        totalAmount -= gVal;
      }
    }

    const taxRate = req.body.taxRate !== undefined ? req.body.taxRate : req.body.quotation?.taxRate;
    const isTaxInclusive = normalizeBoolean(req.body.isTaxInclusive !== undefined ? req.body.isTaxInclusive : req.body.quotation?.isTaxInclusive);
    if (taxRate !== undefined && taxRate !== null && taxRate !== '' &&
      (!Number.isFinite(Number(taxRate)) || Number(taxRate) < 0 || Number(taxRate) > 999.99)) {
      return res.status(400).json({ message: 'Tax rate must be between 0 and 999.99.' });
    }
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
          clientCompanyId,
          subtotalAmount,
          discountType: globalDiscountType || null,
          discountValue: globalDiscountValue ? parseFloat(globalDiscountValue) : null,
          taxRate: taxRate ? parseFloat(taxRate) : null,
          isTaxInclusive,
          totalAmount,
          followUpDate: parsedFollowUpDate.date,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
        },
      });
    });

    await logAudit(id, req.user.id, 'EDITED', existing.status, existing.status, 'Quotation details updated');

    res.json(updated);
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit draft for approval
router.post('/:id/submit', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.quotation.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ message: 'Quotation not found' });
    if (existing.status !== 'DRAFT') {
      return res.status(409).json({ message: 'Only DRAFT quotations can be submitted for approval.' });
    }

    const changed = await prisma.quotation.updateMany({
      where: { ...whereClause, status: 'DRAFT' },
      data: { status: 'PENDING_APPROVAL' },
    });
    if (!changed.count) {
      return res.status(409).json({ message: 'Quotation status changed before it could be submitted.' });
    }

    const quotation = await prisma.quotation.findUnique({ where: { id } });

    await logAudit(id, req.user.id, 'STATUS_CHANGED', existing.status, 'PENDING_APPROVAL', 'Submitted for approval');

    // Notify admins of new submission
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', companyId: quotation.companyId, enabled: true },
    });

    const notificationResults = await Promise.all(admins.map((admin) => sendQuotationToAdmin(quotation, admin.email)));
    const notificationsSent = admins.length > 0 && notificationResults.every((result) => result.sent);

    res.json({
      ...quotation,
      notificationsSent,
      notificationMessage: notificationsSent
        ? undefined
        : admins.length > 0
          ? 'Quotation submitted, but one or more email notifications could not be delivered.'
          : 'Quotation submitted, but no active company admin is available to notify.',
    });
  } catch (error) {
    console.error('Error submitting quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve quotation
router.post('/:id/approve', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.quotation.findFirst({ where: whereClause });
    if (!existing) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    if (existing.status !== 'PENDING_APPROVAL') {
      return res.status(409).json({ message: 'Only PENDING_APPROVAL quotations can be approved.' });
    }

    const changed = await prisma.quotation.updateMany({
      where: { ...whereClause, status: 'PENDING_APPROVAL' },
      data: { status: 'APPROVED', approvedBy: req.user.id },
    });
    if (!changed.count) {
      return res.status(409).json({ message: 'Quotation status changed before it could be approved.' });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { creator: true },
    });

    await logAudit(id, req.user.id, 'STATUS_CHANGED', 'PENDING_APPROVAL', 'APPROVED', 'Quotation approved');

    // Notify creator
    const notification = await sendApprovalNotification(quotation, quotation.creator, req.user.username);

    res.json({
      ...quotation,
      notificationSent: notification.sent,
      notificationMessage: notification.sent ? undefined : notification.message,
    });
  } catch (error) {
    console.error('Error approving quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject quotation (creates a new DRAFT revision)
router.post('/:id/reject', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  const reason = String(req.body?.reason || req.body?.rejectionReason || req.query.rejectionReason || '').trim();

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ message: 'A rejection reason is required.' });
  }

  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const original = await prisma.quotation.findFirst({
      where: whereClause,
      include: { items: true },
    });

    if (!original) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    if (original.status !== 'PENDING_APPROVAL') {
      return res.status(409).json({ message: 'Only PENDING_APPROVAL quotations can be rejected.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const changed = await tx.quotation.updateMany({
        where: { ...whereClause, status: 'PENDING_APPROVAL' },
        data: {
          status: 'REJECTED',
          approvedBy: req.user.id,
          rejectionReason: reason,
        },
      });
      if (!changed.count) {
        return null;
      }

      const rejected = await tx.quotation.findUnique({
        where: { id },
        include: { creator: true },
      });
      const revision = await tx.quotation.create({
        data: {
          quotationNumber: original.quotationNumber,
          companyId: original.companyId,
          clientCompanyId: original.clientCompanyId,
          templateId: original.templateId,
          status: 'DRAFT',
          subtotalAmount: original.subtotalAmount,
          discountType: original.discountType,
          discountValue: original.discountValue,
          taxRate: original.taxRate,
          isTaxInclusive: original.isTaxInclusive,
          totalAmount: original.totalAmount,
          createdBy: original.createdBy,
          followUpDate: original.followUpDate,
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

      await tx.quotationAuditLog.create({
        data: {
          quotationId: id,
          userId: req.user.id,
          action: 'STATUS_CHANGED',
          oldStatus: 'PENDING_APPROVAL',
          newStatus: 'REJECTED',
          notes: `Rejected: ${reason}`,
        },
      });
      await tx.quotationAuditLog.create({
        data: {
          quotationId: revision.id,
          userId: req.user.id,
          action: 'CREATED',
          newStatus: 'DRAFT',
          notes: 'Created as a new revision from rejected quotation',
        },
      });

      return { rejected, revision };
    });

    if (!result) {
      return res.status(409).json({ message: 'Quotation status changed before it could be rejected.' });
    }

    // Notify creator via email
    const notification = await sendRejectionNotification(result.rejected, result.rejected.creator, reason, result.revision.id);

    res.json({
      ...result,
      notificationSent: notification.sent,
      notificationMessage: notification.sent ? undefined : notification.message,
    });
  } catch (error) {
    console.error('Error rejecting quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send quotation to client via email
router.post('/:id/send', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  const clientEmail = req.body?.clientEmail || req.query.clientEmail || req.body?.email;

  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const quotation = await prisma.quotation.findFirst({
      where: whereClause,
      include: { company: true, clientCompany: true, template: true },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (!['APPROVED', 'SENT'].includes(quotation.status)) {
      return res.status(409).json({ message: 'Only approved quotations can be sent to a client.' });
    }

    const targetEmail = clientEmail || quotation.clientCompany?.email;
    if (!targetEmail) {
      return res.status(400).json({ message: 'No client email is configured for this quotation.' });
    }

    const delivery = await sendQuotationToClient(quotation, targetEmail);
    if (!delivery.sent) {
      return res.status(503).json({ message: delivery.message });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: 'SENT' },
    });

    await logAudit(id, req.user.id, 'STATUS_CHANGED', quotation.status, 'SENT', `Sent to client via email (${targetEmail})`);

    return res.json({ ...updated, emailSent: true });
  } catch (error) {
    console.error('Error sending quotation:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get revision history/tree for a quotation
router.get('/:id/revisions', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const quotation = await prisma.quotation.findFirst({
      where: whereClause,
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const parentId = quotation.parentQuotationId || quotation.id;

    // Find all quotations sharing the same parent (or being the parent)
    const revisions = await prisma.quotation.findMany({
      where: {
        companyId: quotation.companyId,
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

// Clone quotation and create a new draft from an existing record
router.post('/:id/clone', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const original = await prisma.quotation.findFirst({
      where: whereClause,
      include: {
        items: true,
      },
    });

    if (!original) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const clonedQuotation = await prisma.quotation.create({
      data: {
        quotationNumber: `${original.quotationNumber}-CLONE-${Date.now().toString().slice(-4)}`,
        companyId: original.companyId,
        clientCompanyId: original.clientCompanyId,
        templateId: original.templateId,
        status: 'DRAFT',
        subtotalAmount: original.subtotalAmount,
        discountType: original.discountType,
        discountValue: original.discountValue,
        taxRate: original.taxRate,
        isTaxInclusive: original.isTaxInclusive,
        totalAmount: original.totalAmount,
        createdBy: req.user.id,
        followUpDate: original.followUpDate,
        rejectionReason: null,
        revisionNumber: 1,
        parentQuotationId: null,
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
      include: {
        clientCompany: true,
        items: true,
      },
    });

    await logAudit(clonedQuotation.id, req.user.id, 'CLONED', null, 'DRAFT', `Cloned from quotation ${original.quotationNumber}`);

    return res.status(201).json(clonedQuotation);
  } catch (error) {
    console.error('Error cloning quotation:', error);
    return res.status(500).json({ message: 'Server error while cloning quotation' });
  }
});

// Compare a quotation with its parent or prior revision to review changes
router.get('/:id/compare', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const current = await prisma.quotation.findFirst({
      where: whereClause,
      include: {
        items: true,
      },
    });

    if (!current) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const base = current.parentQuotationId ? await prisma.quotation.findFirst({
      where: { id: current.parentQuotationId, companyId: current.companyId },
      include: { items: true },
    }) : null;

    const previousVersion = base || current;
    const compareSummary = {
      currentId: current.id,
      currentNumber: current.quotationNumber,
      previousId: previousVersion.id,
      previousNumber: previousVersion.quotationNumber,
      totalAmountDelta: Number(current.totalAmount) - Number(previousVersion.totalAmount),
      itemCountDelta: current.items.length - previousVersion.items.length,
      statusChanged: current.status !== previousVersion.status,
      currentStatus: current.status,
      previousStatus: previousVersion.status,
    };

    return res.json(compareSummary);
  } catch (error) {
    console.error('Error comparing quotation:', error);
    return res.status(500).json({ message: 'Server error while comparing quotation' });
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
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const quotation = await prisma.quotation.findFirst({
      where: whereClause,
      include: {
        company: true,
        clientCompany: true,
        template: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    if (!['APPROVED', 'SENT'].includes(quotation.status)) {
      return res.status(409).json({ message: 'Only approved quotations can be exported as a client PDF.' });
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
