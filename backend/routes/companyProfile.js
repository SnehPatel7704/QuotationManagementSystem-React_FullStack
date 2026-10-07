const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get company profile
router.get('/', authenticate, async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ message: 'User does not belong to any company' });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
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
  if (!req.user.companyId) {
    return res.status(400).json({ message: 'User does not belong to any company' });
  }

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
    const updated = await prisma.company.update({
      where: { id: req.user.companyId },
      data: {
        name,
        email,
        phone,
        address,
        taxRegistrationNumber,
        currencyCode,
        currencySymbol,
        defaultTaxRate: defaultTaxRate ? parseFloat(defaultTaxRate) : 0,
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
  if (!req.user.companyId) {
    return res.status(400).json({ message: 'User does not belong to any company' });
  }

  const {
    name,
    headerLayout,
    termsAndConditions,
    defaultNotes,
    footerText
  } = req.body;

  try {
    // Check if template exists for this company
    const existing = await prisma.quotationTemplate.findFirst({
      where: { companyId: req.user.companyId }
    });

    let template;
    if (existing) {
      template = await prisma.quotationTemplate.update({
        where: { id: existing.id },
        data: {
          name,
          headerLayout,
          termsAndConditions,
          defaultNotes,
          footerText
        }
      });
    } else {
      template = await prisma.quotationTemplate.create({
        data: {
          companyId: req.user.companyId,
          name: name || 'Default Template',
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
