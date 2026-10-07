const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.quotationAuditLog.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.product.deleteMany();
  await prisma.clientCompany.deleteMany();
  await prisma.company.updateMany({ data: { adminUserId: null } }); // break foreign key
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // Create Super Admin
  const spadminHash = await bcrypt.hash('pass', 10);
  const superadmin = await prisma.user.create({
    data: {
      username: 'spadmin',
      password: spadminHash,
      email: 'superadmin@quotationsystem.com',
      role: 'SUPERADMIN',
      enabled: true,
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('password', 10);

  // Tenant 1
  const company1 = await prisma.company.create({
    data: {
      name: 'Alpha Systems Inc.',
      email: 'contact@alphasystems.com',
      phone: '+1-555-1000',
      address: '100 Alpha Way, Tech City, USA',
      currencyCode: 'USD',
      currencySymbol: '$',
      defaultTaxRate: 5.00,
    }
  });

  const admin1 = await prisma.user.create({
    data: {
      username: 'admin_alpha',
      password: adminHash,
      email: 'admin@alphasystems.com',
      role: 'ADMIN',
      companyId: company1.id,
      enabled: true,
    }
  });

  const user1_alpha = await prisma.user.create({
    data: {
      username: 'user_alpha',
      password: passwordHash,
      email: 'user@alphasystems.com',
      role: 'USER',
      companyId: company1.id,
      enabled: true,
    }
  });

  await prisma.company.update({
    where: { id: company1.id },
    data: { adminUserId: admin1.id }
  });

  // Tenant 2
  const company2 = await prisma.company.create({
    data: {
      name: 'Beta Solutions Ltd.',
      email: 'hello@betasolutions.co.uk',
      phone: '+44-20-7946-0958',
      address: '200 Beta Road, London, UK',
      currencyCode: 'GBP',
      currencySymbol: '£',
      defaultTaxRate: 20.00,
    }
  });

  const admin2 = await prisma.user.create({
    data: {
      username: 'admin_beta',
      password: adminHash,
      email: 'admin@betasolutions.co.uk',
      role: 'ADMIN',
      companyId: company2.id,
      enabled: true,
    }
  });

  const user1_beta = await prisma.user.create({
    data: {
      username: 'user_beta',
      password: passwordHash,
      email: 'user@betasolutions.co.uk',
      role: 'USER',
      companyId: company2.id,
      enabled: true,
    }
  });

  await prisma.company.update({
    where: { id: company2.id },
    data: { adminUserId: admin2.id }
  });

  console.log('✅ Users & Tenant Companies seeded');

  // Quotation Templates
  const template1 = await prisma.quotationTemplate.create({
    data: {
      companyId: company1.id,
      name: 'Standard Software Template',
      termsAndConditions: '1. Net 30 days.\n2. Software licenses are non-refundable.',
      footerText: 'Thank you for choosing Alpha Systems Inc.',
    }
  });

  const template2 = await prisma.quotationTemplate.create({
    data: {
      companyId: company2.id,
      name: 'Hardware Consulting Template',
      termsAndConditions: '1. 50% upfront, 50% upon delivery.\n2. Hardware carries a 1-year warranty.',
      footerText: 'Beta Solutions - Your trusted IT partner.',
    }
  });

  // Client Companies
  const clients1 = await Promise.all([
    prisma.clientCompany.create({ data: { companyId: company1.id, name: 'Acme Corporation' } }),
    prisma.clientCompany.create({ data: { companyId: company1.id, name: 'Global Tech Solutions' } }),
  ]);

  const clients2 = await Promise.all([
    prisma.clientCompany.create({ data: { companyId: company2.id, name: 'Premier Industries' } }),
    prisma.clientCompany.create({ data: { companyId: company2.id, name: 'Sunrise Enterprises' } }),
  ]);

  console.log('✅ Templates & Client Companies seeded');

  // Products
  const productsData1 = [
    { companyId: company1.id, name: 'Premium Laptop', basePrice: 1299.99, category: 'Hardware' },
    { companyId: company1.id, name: 'Software License', basePrice: 499.99, category: 'Software' },
    { companyId: company1.id, name: 'Cloud Storage', basePrice: 120.00, category: 'Software' },
  ];
  
  const productsData2 = [
    { companyId: company2.id, name: 'Office Chair', basePrice: 299.99, category: 'Furniture' },
    { companyId: company2.id, name: 'Standing Desk', basePrice: 599.99, category: 'Furniture' },
    { companyId: company2.id, name: 'Desk Lamp', basePrice: 49.99, category: 'Office Supplies' },
  ];

  const products1 = await Promise.all(productsData1.map(p => prisma.product.create({ data: p })));
  const products2 = await Promise.all(productsData2.map(p => prisma.product.create({ data: p })));

  console.log('✅ Products seeded');

  // Quotations
  const now = new Date();
  const addDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  // Company 1 Quotes
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-001',
      companyId: company1.id,
      clientCompanyId: clients1[0].id,
      templateId: template1.id,
      status: 'PENDING_APPROVAL',
      totalAmount: 1299.99,
      createdBy: user1_alpha.id,
      followUpDate: addDays(5),
      items: {
        create: [
          { productId: products1[0].id, quantity: 1, unitPrice: 1299.99, totalPrice: 1299.99 },
        ],
      },
    },
  });

  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-002',
      companyId: company1.id,
      clientCompanyId: clients1[1].id,
      templateId: template1.id,
      status: 'APPROVED',
      totalAmount: 999.98,
      createdBy: admin1.id,
      approvedBy: admin1.id,
      items: {
        create: [
          { productId: products1[1].id, quantity: 2, unitPrice: 499.99, totalPrice: 999.98 },
        ],
      },
    },
  });

  // Company 2 Quotes
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-003',
      companyId: company2.id,
      clientCompanyId: clients2[0].id,
      templateId: template2.id,
      status: 'DRAFT',
      totalAmount: 899.98,
      createdBy: user1_beta.id,
      items: {
        create: [
          { productId: products2[0].id, quantity: 2, unitPrice: 299.99, totalPrice: 599.98 },
          { productId: products2[1].id, quantity: 1, unitPrice: 299.99, totalPrice: 299.99 },
        ],
      },
    },
  });

  console.log('✅ Quotations seeded');
  console.log('');
  console.log('=== LOGIN CREDENTIALS ===');
  console.log('Super Admin: spadmin / pass');
  console.log('Alpha Admin: admin_alpha / password');
  console.log('Alpha User:  user_alpha / password123');
  console.log('Beta Admin:  admin_beta / password');
  console.log('Beta User:   user_beta / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
