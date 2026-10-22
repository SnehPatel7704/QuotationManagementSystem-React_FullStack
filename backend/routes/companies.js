const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const ExcelJS = require('exceljs');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();
const prisma = new PrismaClient();

// List tenant companies for SUPERADMIN-scoped workflows
router.get('/tenants', authenticate, authorize('SUPERADMIN'), async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true, currencyCode: true, currencySymbol: true },
      orderBy: { name: 'asc' },
    });
    res.json(companies);
  } catch (error) {
    console.error('Error fetching tenant companies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all client companies
router.get('/', authenticate, async (req, res) => {
  try {
    let whereClause = { companyId: req.user.companyId };
    if (req.user.role === 'SUPERADMIN') {
      if (req.query.companyId !== undefined) {
        const companyId = Number(req.query.companyId);
        if (!Number.isInteger(companyId) || companyId <= 0) {
          return res.status(400).json({ message: 'companyId must be a positive integer.' });
        }
        whereClause = { companyId };
      } else {
        whereClause = {};
      }
    }
    const companies = await prisma.clientCompany.findMany({
      where: whereClause,
      include: {
        tenantCompany: {
          select: { name: true, currencySymbol: true, currencyCode: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export client companies to Excel
router.get('/export-excel', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    let whereClause = { companyId: req.user.companyId };
    if (req.user.role === 'SUPERADMIN') {
      if (req.query.companyId !== undefined) {
        const companyId = Number(req.query.companyId);
        if (!Number.isInteger(companyId) || companyId <= 0) {
          return res.status(400).json({ message: 'companyId must be a positive integer.' });
        }
        whereClause = { companyId };
      } else {
        whereClause = {};
      }
    }
    const companies = await prisma.clientCompany.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Companies');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Address', key: 'address', width: 50 },
    ];

    companies.forEach((company) => {
      worksheet.addRow({
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=companies.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting companies:', error);
    res.status(500).json({ message: 'Server error exporting Excel' });
  }
});

// Import companies from Excel
router.post('/import-excel', authenticate, authorize('ADMIN', 'SUPERADMIN'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      return res.status(400).json({ message: 'Invalid Excel file' });
    }
    if (worksheet.rowCount > 5001) {
      return res.status(413).json({ message: 'The worksheet cannot contain more than 5,000 data rows.' });
    }

    const headers = new Map();
    worksheet.getRow(1).eachCell((cell, column) => {
      headers.set(String(cell.text || cell.value || '').trim().toLowerCase(), column);
    });
    const nameColumn = headers.get('name');
    if (!nameColumn) {
      return res.status(400).json({ message: 'The worksheet must include a Name column.' });
    }

    const targetCompanyId = req.user.role === 'SUPERADMIN'
      ? Number(req.body.companyId)
      : req.user.companyId;
    if (!Number.isInteger(targetCompanyId) || targetCompanyId <= 0) {
      return res.status(400).json({ message: 'A valid companyId is required for this import.' });
    }
    const tenant = await prisma.company.findFirst({
      where: { id: targetCompanyId, isActive: true },
      select: { id: true },
    });
    if (!tenant) {
      return res.status(400).json({ message: 'The selected company does not exist or is inactive.' });
    }

    const companies = [];
    const invalidRows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const readCell = (header) => {
        const column = headers.get(header);
        return column ? String(row.getCell(column).text || '').trim() : '';
      };
      const name = readCell('name');
      const email = readCell('email');
      const phone = readCell('phone');

      if (name) {
        if (name.length > 100 ||
          (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100)) ||
          phone.length > 20) {
          invalidRows.push(rowNumber);
          return;
        }

        companies.push({
          companyId: targetCompanyId,
          name,
          email: email || null,
          phone: phone || null,
          address: readCell('address') || null,
        });
      }
    });

    if (invalidRows.length > 0) {
      return res.status(400).json({
        message: `Invalid client data in worksheet row${invalidRows.length > 1 ? 's' : ''}: ${invalidRows.join(', ')}.`,
      });
    }
    if (companies.length === 0) {
      return res.status(400).json({ message: 'No companies with a name were found in the worksheet.' });
    }

    const existingCompanies = await prisma.clientCompany.findMany({
      where: { companyId: targetCompanyId },
      select: { name: true },
    });
    const existingNames = new Set(existingCompanies.map((company) => company.name.trim().toLowerCase()));
    const uniqueCompanies = companies.filter((company) => {
      const normalizedName = company.name.trim().toLowerCase();
      if (existingNames.has(normalizedName)) {
        return false;
      }
      existingNames.add(normalizedName);
      return true;
    });

    const result = await prisma.clientCompany.createMany({
      data: uniqueCompanies,
      skipDuplicates: true,
    });

    res.json({
      message: `Imported ${result.count} companies.`,
      imported: result.count,
      skipped: companies.length - result.count,
    });
  } catch (error) {
    console.error('Error importing companies:', error);
    res.status(500).json({ message: 'Server error importing Excel' });
  }
});

// Get client company by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const company = await prisma.clientCompany.findFirst({
      where: whereClause,
    });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create client company
router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const { name, email, phone, address } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  if (!normalizedName || normalizedName.length > 100 ||
    (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) ||
    (email !== undefined && email !== null && typeof email !== 'string') ||
    (phone !== undefined && phone !== null && typeof phone !== 'string') ||
    (address !== undefined && address !== null && typeof address !== 'string') ||
    (phone && String(phone).length > 20) ||
    (normalizedEmail && normalizedEmail.length > 100)) {
    return res.status(400).json({ message: 'Provide a company name and valid contact details.' });
  }
  if (!req.user.companyId && req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ message: 'User not assigned to a company' });
  }
  
  const targetCompanyId = Number(
    req.user.role === 'SUPERADMIN' ? (req.body.companyId || req.user.companyId) : req.user.companyId
  );
  if (!Number.isInteger(targetCompanyId) || targetCompanyId <= 0) {
    return res.status(400).json({ message: 'companyId is required for creation' });
  }

  try {
    const tenant = await prisma.company.findFirst({
      where: { id: targetCompanyId, isActive: true },
      select: { id: true },
    });
    if (!tenant) {
      return res.status(400).json({ message: 'The selected company does not exist or is inactive.' });
    }

    const company = await prisma.clientCompany.create({
      data: {
        companyId: targetCompanyId,
        name: normalizedName,
        email: normalizedEmail || null,
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
      },
    });
    res.status(201).json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update client company
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, phone, address } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  if (!Number.isInteger(id) || id <= 0 ||
    !normalizedName || normalizedName.length > 100 ||
    (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) ||
    (email !== undefined && email !== null && typeof email !== 'string') ||
    (phone !== undefined && phone !== null && typeof phone !== 'string') ||
    (address !== undefined && address !== null && typeof address !== 'string') ||
    (phone && String(phone).length > 20) ||
    (normalizedEmail && normalizedEmail.length > 100)) {
    return res.status(400).json({ message: 'Provide a valid company ID, name, and contact details.' });
  }
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.clientCompany.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ message: 'Company not found' });

    const company = await prisma.clientCompany.update({
      where: { id },
      data: {
        name: normalizedName,
        email: normalizedEmail || null,
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
      },
    });
    res.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete client company
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.clientCompany.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ message: 'Company not found' });

    await prisma.clientCompany.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
