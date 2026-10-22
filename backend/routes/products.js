const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const ExcelJS = require('exceljs');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();
const prisma = new PrismaClient();

// Get all products
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
    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export products to Excel
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
    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Base Price', key: 'basePrice', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
    ];

    products.forEach((product) => {
      worksheet.addRow({
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        category: product.category,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting products:', error);
    res.status(500).json({ message: 'Server error exporting Excel' });
  }
});

// Import products from Excel
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
    const priceColumn = headers.get('base price');
    if (!nameColumn || !priceColumn) {
      return res.status(400).json({ message: 'The worksheet must include Name and Base Price columns.' });
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

    const products = [];
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
      const rawPrice = readCell('base price');
      const category = readCell('category');
      if (!name && !rawPrice) {
        return;
      }

      const basePrice = Number(rawPrice);
      if (!name || name.length > 100 || !rawPrice ||
        !Number.isFinite(basePrice) || basePrice < 0 || basePrice > 99999999.99 ||
        category.length > 50) {
        invalidRows.push(rowNumber);
        return;
      }

      products.push({
        companyId: targetCompanyId,
        name,
        description: readCell('description') || null,
        basePrice,
        category: category || null,
      });
    });

    if (invalidRows.length > 0) {
      return res.status(400).json({
        message: `Invalid product data in worksheet row${invalidRows.length > 1 ? 's' : ''}: ${invalidRows.join(', ')}.`,
      });
    }
    if (products.length === 0) {
      return res.status(400).json({ message: 'No products with a name and base price were found in the worksheet.' });
    }

    const existingProducts = await prisma.product.findMany({
      where: { companyId: targetCompanyId },
      select: { name: true },
    });
    const existingNames = new Set(existingProducts.map((product) => product.name.trim().toLowerCase()));
    const uniqueProducts = products.filter((product) => {
      const normalizedName = product.name.trim().toLowerCase();
      if (existingNames.has(normalizedName)) {
        return false;
      }
      existingNames.add(normalizedName);
      return true;
    });

    const result = await prisma.product.createMany({
      data: uniqueProducts,
      skipDuplicates: true,
    });

    res.json({
      message: `Imported ${result.count} products.`,
      imported: result.count,
      skipped: products.length - result.count,
    });
  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ message: 'Server error importing Excel' });
  }
});

// Get product by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const product = await prisma.product.findFirst({
      where: whereClause,
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create product
router.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const { name, description, basePrice, category } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const numericPrice = Number(basePrice);
  if (!normalizedName || normalizedName.length > 100 ||
    !Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 99999999.99 ||
    (description !== undefined && description !== null && typeof description !== 'string') ||
    (category !== undefined && category !== null && typeof category !== 'string') ||
    (typeof category === 'string' && category.length > 50)) {
    return res.status(400).json({ message: 'Provide a product name and a valid non-negative base price.' });
  }
  if (!req.user.companyId && req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ message: 'User not assigned to a company' });
  }
  
  // If SUPERADMIN, they must pass companyId in body or we fail for now, but usually ADMIN uses this.
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

    const product = await prisma.product.create({
      data: {
        companyId: targetCompanyId,
        name: normalizedName,
        description,
        basePrice: numericPrice,
        category,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, basePrice, category } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const numericPrice = Number(basePrice);
  if (!Number.isInteger(id) || id <= 0 ||
    !normalizedName || normalizedName.length > 100 ||
    !Number.isFinite(numericPrice) || numericPrice < 0 || numericPrice > 99999999.99 ||
    (description !== undefined && description !== null && typeof description !== 'string') ||
    (category !== undefined && category !== null && typeof category !== 'string') ||
    (typeof category === 'string' && category.length > 50)) {
    return res.status(400).json({ message: 'Provide a valid product ID, name, and non-negative base price.' });
  }
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    
    // First check if product exists and belongs to user
    const existing = await prisma.product.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: normalizedName,
        description,
        basePrice: numericPrice,
        category,
      },
    });
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    const existing = await prisma.product.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    await prisma.product.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
