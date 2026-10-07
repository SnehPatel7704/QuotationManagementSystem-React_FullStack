const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const ExcelJS = require('exceljs');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
const prisma = new PrismaClient();

// Get all client companies
router.get('/', authenticate, async (req, res) => {
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? {} : { companyId: req.user.companyId };
    const companies = await prisma.clientCompany.findMany({
      where: whereClause,
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
    const whereClause = req.user.role === 'SUPERADMIN' ? {} : { companyId: req.user.companyId };
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

    const companies = [];
    let isHeader = true;

    worksheet.eachRow((row, rowNumber) => {
      if (isHeader) {
        isHeader = false;
        return;
      }

      const name = row.getCell(1).value;
      const email = row.getCell(2).value;
      const phone = row.getCell(3).value;
      const address = row.getCell(4).value;

      if (name) {
        companies.push({
          companyId: req.user.companyId,
          name: name.toString(),
          email: email ? email.toString() : null,
          phone: phone ? phone.toString() : null,
          address: address ? address.toString() : null,
        });
      }
    });

    if (companies.length > 0) {
      if (req.user.role === 'SUPERADMIN' && !req.user.companyId) {
         return res.status(400).json({ message: 'SUPERADMIN cannot import without a company scope' });
      }
      await prisma.clientCompany.createMany({
        data: companies,
        skipDuplicates: true,
      });
    }

    res.json({ message: `Successfully imported ${companies.length} companies` });
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
  if (!req.user.companyId && req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ message: 'User not assigned to a company' });
  }
  
  const targetCompanyId = req.user.role === 'SUPERADMIN' ? (req.body.companyId || req.user.companyId) : req.user.companyId;
  if (!targetCompanyId) {
    return res.status(400).json({ message: 'companyId is required for creation' });
  }

  try {
    const company = await prisma.clientCompany.create({
      data: { companyId: targetCompanyId, name, email, phone, address },
    });
    res.status(201).json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update client company
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email, phone, address } = req.body;
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.clientCompany.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ message: 'Company not found' });

    const company = await prisma.clientCompany.update({
      where: { id },
      data: { name, email, phone, address },
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
