const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  // Seed Users
  const passwordHash = await bcrypt.hash('password123', 10);
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

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: await bcrypt.hash('password', 10),
      email: 'admin@quotationsystem.com',
      role: 'ADMIN',
      enabled: true,
    },
  });

  const user1 = await prisma.user.create({
    data: {
      username: 'user',
      password: await bcrypt.hash('password', 10),
      email: 'user1@quotationsystem.com',
      role: 'USER',
      enabled: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'user2',
      password: passwordHash,
      email: 'user2@quotationsystem.com',
      role: 'USER',
      enabled: true,
    },
  });

  console.log('✅ Users seeded');

  // Seed Companies
  const companies = await Promise.all([
    prisma.company.create({
      data: { name: 'Acme Corporation', address: '123 Business St, New York, NY 10001', phone: '+1-555-0101', email: 'contact@acmecorp.com' },
    }),
    prisma.company.create({
      data: { name: 'Global Tech Solutions', address: '456 Innovation Ave, San Francisco, CA 94102', phone: '+1-555-0102', email: 'info@globaltech.com' },
    }),
    prisma.company.create({
      data: { name: 'Premier Industries', address: '789 Industrial Blvd, Chicago, IL 60601', phone: '+1-555-0103', email: 'sales@premierindustries.com' },
    }),
    prisma.company.create({
      data: { name: 'Sunrise Enterprises', address: '321 Commerce Dr, Austin, TX 78701', phone: '+1-555-0104', email: 'hello@sunriseent.com' },
    }),
    prisma.company.create({
      data: { name: 'Metro Services LLC', address: '654 Market St, Boston, MA 02101', phone: '+1-555-0105', email: 'contact@metroservices.com' },
    }),
    prisma.company.create({
      data: { name: 'Pacific Trading Co', address: '987 Harbor Way, Seattle, WA 98101', phone: '+1-555-0106', email: 'info@pacifictrading.com' },
    }),
    prisma.company.create({
      data: { name: 'Eastern Manufacturing', address: '147 Factory Rd, Philadelphia, PA 19101', phone: '+1-555-0107', email: 'sales@easternmfg.com' },
    }),
    prisma.company.create({
      data: { name: 'Western Distributors', address: '258 Warehouse Ln, Denver, CO 80201', phone: '+1-555-0108', email: 'orders@westerndist.com' },
    }),
    prisma.company.create({
      data: { name: 'Northern Solutions', address: '369 Office Park, Minneapolis, MN 55401', phone: '+1-555-0109', email: 'contact@northernsol.com' },
    }),
    prisma.company.create({
      data: { name: 'Southern Supplies Inc', address: '741 Trade Center, Atlanta, GA 30301', phone: '+1-555-0110', email: 'info@southernsupplies.com' },
    }),
  ]);

  console.log('✅ Companies seeded');

  // Seed Products
  const productsData = [
    { name: 'Premium Laptop', description: 'High-performance business laptop with 16GB RAM', basePrice: 1299.99, category: 'Hardware' },
    { name: 'Wireless Mouse', description: 'Ergonomic wireless mouse with USB receiver', basePrice: 29.99, category: 'Hardware' },
    { name: 'Mechanical Keyboard', description: 'Professional mechanical keyboard with RGB lighting', basePrice: 149.99, category: 'Hardware' },
    { name: '27" Monitor', description: '4K UHD monitor with HDR support', basePrice: 449.99, category: 'Hardware' },
    { name: 'Office Chair', description: 'Ergonomic office chair with lumbar support', basePrice: 299.99, category: 'Furniture' },
    { name: 'Standing Desk', description: 'Electric height-adjustable standing desk', basePrice: 599.99, category: 'Furniture' },
    { name: 'Desk Lamp', description: 'LED desk lamp with adjustable brightness', basePrice: 49.99, category: 'Office Supplies' },
    { name: 'Webcam HD', description: '1080p HD webcam with built-in microphone', basePrice: 79.99, category: 'Hardware' },
    { name: 'Headset', description: 'Noise-cancelling wireless headset', basePrice: 199.99, category: 'Hardware' },
    { name: 'USB Hub', description: '7-port USB 3.0 hub with power adapter', basePrice: 39.99, category: 'Hardware' },
    { name: 'Software License', description: 'Annual software license for productivity suite', basePrice: 499.99, category: 'Software' },
    { name: 'Cloud Storage', description: 'Enterprise cloud storage - 1TB per user/year', basePrice: 120.00, category: 'Software' },
    { name: 'Security Suite', description: 'Comprehensive security software package', basePrice: 89.99, category: 'Software' },
    { name: 'Project Management Tool', description: 'Annual subscription for project management platform', basePrice: 299.99, category: 'Software' },
    { name: 'Video Conferencing', description: 'Professional video conferencing solution', basePrice: 199.99, category: 'Software' },
    { name: 'Network Router', description: 'Enterprise-grade wireless router', basePrice: 249.99, category: 'Hardware' },
    { name: 'External SSD', description: '1TB external solid state drive', basePrice: 129.99, category: 'Hardware' },
    { name: 'Printer', description: 'All-in-one color laser printer', basePrice: 399.99, category: 'Hardware' },
    { name: 'Scanner', description: 'High-speed document scanner', basePrice: 299.99, category: 'Hardware' },
    { name: 'Projector', description: 'Full HD business projector', basePrice: 699.99, category: 'Hardware' },
    { name: 'Filing Cabinet', description: '4-drawer locking filing cabinet', basePrice: 199.99, category: 'Furniture' },
    { name: 'Bookshelf', description: '5-tier wooden bookshelf', basePrice: 149.99, category: 'Furniture' },
    { name: 'Whiteboard', description: '6ft x 4ft magnetic whiteboard', basePrice: 179.99, category: 'Office Supplies' },
    { name: 'Conference Table', description: 'Large conference table seats 10', basePrice: 899.99, category: 'Furniture' },
    { name: 'Office Plant', description: 'Low-maintenance office plant with pot', basePrice: 49.99, category: 'Office Supplies' },
    { name: 'Printer Paper', description: 'Case of 10 reams (5000 sheets)', basePrice: 45.99, category: 'Consumables' },
    { name: 'Toner Cartridge', description: 'High-yield black toner cartridge', basePrice: 89.99, category: 'Consumables' },
    { name: 'Pens (Box)', description: 'Box of 50 ballpoint pens', basePrice: 12.99, category: 'Consumables' },
    { name: 'Notebooks', description: 'Pack of 10 spiral notebooks', basePrice: 24.99, category: 'Consumables' },
    { name: 'Sticky Notes', description: 'Assorted colors sticky notes pack', basePrice: 9.99, category: 'Consumables' },
  ];

  const products = await Promise.all(
    productsData.map((p) => prisma.product.create({ data: p }))
  );

  console.log('✅ Products seeded');

  // Helper to find product by name
  const findProduct = (name) => products.find((p) => p.name === name);

  // Seed Sample Quotations
  const now = new Date();
  const addDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  // Quotation 1: PENDING_APPROVAL
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-001',
      companyId: companies[0].id,
      status: 'PENDING_APPROVAL',
      totalAmount: 3599.91,
      createdBy: user1.id,
      followUpDate: addDays(5),
      items: {
        create: [
          { productId: findProduct('Premium Laptop').id, quantity: 2, unitPrice: 1299.99, totalPrice: 2599.98 },
          { productId: findProduct('Wireless Mouse').id, quantity: 5, unitPrice: 29.99, totalPrice: 149.95 },
          { productId: findProduct('Mechanical Keyboard').id, quantity: 2, unitPrice: 149.99, totalPrice: 299.98 },
        ],
      },
    },
  });

  // Quotation 2: APPROVED
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-002',
      companyId: companies[1].id,
      status: 'APPROVED',
      totalAmount: 2499.95,
      createdBy: user1.id,
      approvedBy: admin.id,
      followUpDate: addDays(10),
      items: {
        create: [
          { productId: findProduct('Software License').id, quantity: 5, unitPrice: 499.99, totalPrice: 2499.95 },
        ],
      },
    },
  });

  // Quotation 3: DRAFT
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-003',
      companyId: companies[2].id,
      status: 'DRAFT',
      totalAmount: 1549.94,
      createdBy: user2.id,
      items: {
        create: [
          { productId: findProduct('Office Chair').id, quantity: 2, unitPrice: 299.99, totalPrice: 599.98 },
          { productId: findProduct('Standing Desk').id, quantity: 1, unitPrice: 599.99, totalPrice: 599.99 },
          { productId: findProduct('Desk Lamp').id, quantity: 5, unitPrice: 49.99, totalPrice: 249.95 },
        ],
      },
    },
  });

  // Quotation 4: SENT
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-004',
      companyId: companies[3].id,
      status: 'SENT',
      totalAmount: 3899.89,
      createdBy: user1.id,
      approvedBy: admin.id,
      followUpDate: addDays(3),
      items: {
        create: [
          { productId: findProduct('Conference Table').id, quantity: 1, unitPrice: 899.99, totalPrice: 899.99 },
          { productId: findProduct('Office Chair').id, quantity: 10, unitPrice: 299.99, totalPrice: 2999.90 },
        ],
      },
    },
  });

  // Quotation 5: REJECTED
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-005',
      companyId: companies[4].id,
      status: 'REJECTED',
      totalAmount: 1199.97,
      createdBy: user2.id,
      approvedBy: admin.id,
      rejectionReason: 'Prices need to be adjusted. Please revise with 10% discount.',
      items: {
        create: [
          { productId: findProduct('Printer').id, quantity: 3, unitPrice: 399.99, totalPrice: 1199.97 },
        ],
      },
    },
  });

  // Quotation 6: PENDING_APPROVAL
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-006',
      companyId: companies[0].id,
      status: 'PENDING_APPROVAL',
      totalAmount: 1799.96,
      createdBy: user1.id,
      followUpDate: addDays(20),
      items: {
        create: [
          { productId: findProduct('27" Monitor').id, quantity: 4, unitPrice: 449.99, totalPrice: 1799.96 },
        ],
      },
    },
  });

  // Quotation 7: APPROVED
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-007',
      companyId: companies[1].id,
      status: 'APPROVED',
      totalAmount: 2399.88,
      createdBy: user1.id,
      approvedBy: admin.id,
      followUpDate: addDays(7),
      items: {
        create: [
          { productId: findProduct('Headset').id, quantity: 12, unitPrice: 199.99, totalPrice: 2399.88 },
        ],
      },
    },
  });

  // Quotation 8: DRAFT
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-008',
      companyId: companies[4].id,
      status: 'DRAFT',
      totalAmount: 1079.97,
      createdBy: user2.id,
      items: {
        create: [
          { productId: findProduct('Printer').id, quantity: 3, unitPrice: 359.99, totalPrice: 1079.97 },
        ],
      },
    },
  });

  console.log('✅ Quotations seeded');
  console.log('');
  console.log('=== LOGIN CREDENTIALS ===');
  console.log('Super Admin: spadmin / pass');
  console.log('Admin:       admin / password');
  console.log('User:        user / password');
  console.log('User 2:      user2 / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
