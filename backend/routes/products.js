const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const ExcelJS = require('exceljs');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
const prisma = new PrismaClient();

// Get all products
router.get('/', authenticate, async (req, res) => {
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? {} : { companyId: req.user.companyId };
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
    const whereClause = req.user.role === 'SUPERADMIN' ? {} : { companyId: req.user.companyId };
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

    const products = [];
    let isHeader = true;

    worksheet.eachRow((row, rowNumber) => {
      if (isHeader) {
        isHeader = false;
        return;
      }

      // Expected columns: Name (1 or 2), Description, Base Price, Category
      // Sometimes ID is 1, so Name is 2. Let's assume a strict format without ID or ignore ID.
      // We'll map by column index: 1: Name, 2: Description, 3: Base Price, 4: Category
      const name = row.getCell(1).value;
      const description = row.getCell(2).value;
      const basePrice = row.getCell(3).value;
      const category = row.getCell(4).value;

      if (name && basePrice) {
        products.push({
          companyId: req.user.companyId,
          name: name.toString(),
          description: description ? description.toString() : null,
          basePrice: parseFloat(basePrice) || 0,
          category: category ? category.toString() : null,
        });
      }
    });

    if (products.length > 0) {
      if (req.user.role === 'SUPERADMIN' && !req.user.companyId) {
         return res.status(400).json({ message: 'SUPERADMIN cannot import without a company scope context here' });
      }
      await prisma.product.createMany({
        data: products,
        skipDuplicates: true, // Avoid breaking on existing names if we add a unique constraint later
      });
    }

    res.json({ message: `Successfully imported ${products.length} products` });
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
  if (!req.user.companyId && req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ message: 'User not assigned to a company' });
  }
  
  // If SUPERADMIN, they must pass companyId in body or we fail for now, but usually ADMIN uses this.
  const targetCompanyId = req.user.role === 'SUPERADMIN' ? (req.body.companyId || req.user.companyId) : req.user.companyId;

  if (!targetCompanyId) {
    return res.status(400).json({ message: 'companyId is required for creation' });
  }

  try {
    const product = await prisma.product.create({
      data: {
        companyId: targetCompanyId,
        name,
        description,
        basePrice: parseFloat(basePrice),
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
  const id = parseInt(req.params.id);
  const { name, description, basePrice, category } = req.body;
  try {
    const whereClause = req.user.role === 'SUPERADMIN' ? { id } : { id, companyId: req.user.companyId };
    
    // First check if product exists and belongs to user
    const existing = await prisma.product.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        basePrice: parseFloat(basePrice),
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
