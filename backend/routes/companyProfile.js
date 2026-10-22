const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const getCompanyId = async (req, res) => {
  const companyId = req.user.role === 'SUPERADMIN'
    ? Number(req.query.companyId)
    : req.user.companyId;
  if (!Number.isInteger(companyId) || companyId <= 0) {
    res.status(400).json({ message: 'A valid companyId is required.' });
    return null;
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, isActive: true },
    select: { id: true },
  });
  if (!company) {
    res.status(404).json({ message: 'Active company not found.' });
    return null;
  }

  return company.id;
};

// Get company profile
router.get('/', authenticate, async (req, res) => {
  try {
    const companyId = await getCompanyId(req, res);
    if (!companyId) return;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        quotationTemplates: true
      }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update company profile
router.put('/', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    taxRegistrationNumber,
    currencyCode,
    currencySymbol,
    defaultTaxRate,
  } = req.body;

  try {
    const companyId = await getCompanyId(req, res);
    if (!companyId) return;

    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    const numericTaxRate = Number(defaultTaxRate);
    if (!normalizedName || normalizedName.length > 100 ||
      (normalizedEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 100)) ||
      (phone !== undefined && phone !== null && (typeof phone !== 'string' || phone.length > 20)) ||
      (address !== undefined && address !== null && typeof address !== 'string') ||
      (taxRegistrationNumber !== undefined && taxRegistrationNumber !== null &&
        (typeof taxRegistrationNumber !== 'string' || taxRegistrationNumber.length > 50)) ||
      typeof currencyCode !== 'string' || currencyCode.trim().length < 3 || currencyCode.trim().length > 10 ||
      typeof currencySymbol !== 'string' || !currencySymbol.trim() || currencySymbol.trim().length > 10 ||
      !Number.isFinite(numericTaxRate) || numericTaxRate < 0 || numericTaxRate > 999.99) {
      return res.status(400).json({ message: 'Provide a valid company name, contact details, currency, and tax rate.' });
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: normalizedName,
        email: normalizedEmail || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        taxRegistrationNumber: taxRegistrationNumber?.trim() || null,
        currencyCode: currencyCode.trim().toUpperCase(),
        currencySymbol: currencySymbol.trim(),
        defaultTaxRate: numericTaxRate,
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating company profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update default quotation template
router.put('/template', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const {
    name,
    headerLayout,
    termsAndConditions,
    defaultNotes,
    footerText
  } = req.body;

  try {
    const companyId = await getCompanyId(req, res);
    if (!companyId) return;

    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const templateFields = [headerLayout, termsAndConditions, defaultNotes, footerText];
    if (!normalizedName || normalizedName.length > 100 ||
      templateFields.some((value) => value !== undefined && value !== null && typeof value !== 'string')) {
      return res.status(400).json({ message: 'Provide a valid template name and text fields.' });
    }

    // Check if template exists for this company
    const existing = await prisma.quotationTemplate.findFirst({
      where: { companyId }
    });

    let template;
    if (existing) {
      template = await prisma.quotationTemplate.update({
        where: { id: existing.id },
        data: {
          name: normalizedName,
          headerLayout,
          termsAndConditions,
          defaultNotes,
          footerText
        }
      });
    } else {
      template = await prisma.quotationTemplate.create({
        data: {
          companyId,
          name: normalizedName,
          headerLayout,
          termsAndConditions,
          defaultNotes,
          footerText
        }
      });
    }

    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
