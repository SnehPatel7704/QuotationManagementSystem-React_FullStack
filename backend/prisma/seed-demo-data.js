require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'DemoUser!2026';

async function getOrCreateDemoUser(company, username, email) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    if (existing.role !== 'USER' || existing.companyId !== company.id) {
      throw new Error(`The existing ${username} account does not match the demo user role and company.`);
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      username,
      email,
      password: await bcrypt.hash(DEMO_PASSWORD, 10),
      role: 'USER',
      companyId: company.id,
      enabled: true,
    },
  });
}

async function getOrCreateClient(company, name, email) {
  const existing = await prisma.clientCompany.findFirst({
    where: { companyId: company.id, name },
  });
  if (existing) return existing;

  return prisma.clientCompany.create({
    data: {
      companyId: company.id,
      name,
      email,
      phone: '+1-555-0188',
      address: 'Demo Street, Sample City',
    },
  });
}

async function getOrCreateProduct(company, name, basePrice, category) {
  const existing = await prisma.product.findFirst({
    where: { companyId: company.id, name },
  });
  if (existing) return existing;

  return prisma.product.create({
    data: { companyId: company.id, name, basePrice, category },
  });
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildQuotationTotals(lines, discountType, discountValue, taxRate) {
  const subtotalAmount = roundMoney(lines.reduce((sum, line) => {
    const lineSubtotal = Number(line.unitPrice) * line.quantity;
    const lineDiscount = line.discountType === 'PERCENTAGE'
      ? lineSubtotal * (Number(line.discountValue) / 100)
      : line.discountType === 'FIXED'
        ? Number(line.discountValue)
        : 0;
    return sum + lineSubtotal - lineDiscount;
  }, 0));

  const discountAmount = discountType === 'PERCENTAGE'
    ? subtotalAmount * (discountValue / 100)
    : discountType === 'FIXED'
      ? discountValue
      : 0;
  const afterDiscount = subtotalAmount - discountAmount;
  return {
    subtotalAmount,
    discountType: discountType || null,
    discountValue: discountType ? discountValue : null,
    taxRate: taxRate || null,
    isTaxInclusive: false,
    totalAmount: roundMoney(afterDiscount + afterDiscount * (taxRate / 100)),
  };
}

function addDays(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function createQuotationFixture(fixture) {
  const existing = await prisma.quotation.findFirst({
    where: { quotationNumber: fixture.quotationNumber, revisionNumber: 1 },
  });

  const itemData = fixture.lines.map((line) => {
    const lineSubtotal = Number(line.unitPrice) * line.quantity;
    const discountAmount = line.discountType === 'PERCENTAGE'
      ? lineSubtotal * (Number(line.discountValue) / 100)
      : line.discountType === 'FIXED'
        ? Number(line.discountValue)
        : 0;
    return {
      productId: line.product.id,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountType: line.discountType || null,
      discountValue: line.discountValue ?? null,
      totalPrice: roundMoney(lineSubtotal - discountAmount),
    };
  });
  const totals = buildQuotationTotals(
    fixture.lines,
    fixture.discountType,
    fixture.discountValue,
    fixture.taxRate,
  );

  const quotation = existing || await prisma.$transaction(async (tx) => {
    const created = await tx.quotation.create({
      data: {
        quotationNumber: fixture.quotationNumber,
        companyId: fixture.company.id,
        clientCompanyId: fixture.client.id,
        templateId: fixture.template.id,
        status: fixture.status,
        ...totals,
        createdBy: fixture.creator.id,
        approvedBy: fixture.approvedBy?.id || null,
        followUpDate: fixture.followUpDays === null ? null : addDays(fixture.followUpDays),
        rejectionReason: fixture.rejectionReason || null,
        items: { create: itemData },
      },
    });

    await tx.quotationAuditLog.create({
      data: {
        quotationId: created.id,
        userId: fixture.creator.id,
        action: 'CREATED',
        newStatus: fixture.status,
        notes: 'Non-destructive demo fixture',
      },
    });

    return created;
  });

  if (fixture.revision) {
    const existingRevision = await prisma.quotation.findFirst({
      where: { parentQuotationId: quotation.id, revisionNumber: 2 },
    });
    if (!existingRevision) await prisma.$transaction(async (tx) => {
      const revision = await tx.quotation.create({
        data: {
          quotationNumber: quotation.quotationNumber,
          companyId: quotation.companyId,
          clientCompanyId: quotation.clientCompanyId,
          templateId: quotation.templateId,
          status: 'DRAFT',
          subtotalAmount: quotation.subtotalAmount,
          discountType: quotation.discountType,
          discountValue: quotation.discountValue,
          taxRate: quotation.taxRate,
          isTaxInclusive: quotation.isTaxInclusive,
          totalAmount: quotation.totalAmount,
          createdBy: fixture.creator.id,
          revisionNumber: quotation.revisionNumber + 1,
          parentQuotationId: quotation.id,
          items: { create: itemData },
        },
      });

      await tx.quotationAuditLog.create({
        data: {
          quotationId: revision.id,
          userId: fixture.creator.id,
          action: 'CREATED',
          newStatus: 'DRAFT',
          notes: 'Demo revision from a rejected quotation',
        },
      });
    });
  }

  return !existing;
}

async function seedTenantFixtures(companyName, code, clientName, products, year) {
  const company = await prisma.company.findFirst({
    where: { name: companyName, isActive: true },
  });
  if (!company) {
    throw new Error(`Active tenant "${companyName}" is required. Create it before adding demo data.`);
  }

  const admin = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'ADMIN', enabled: true },
  });
  if (!admin) {
    throw new Error(`An active Admin account is required for tenant "${companyName}".`);
  }

  const viewer = await getOrCreateDemoUser(
    company,
    `demo_viewer_${code.toLowerCase()}`,
    `demo.viewer.${code.toLowerCase()}@example.test`,
  );
  const client = await getOrCreateClient(
    company,
    clientName,
    `sales.${code.toLowerCase()}@example.test`,
  );
  const template = await prisma.quotationTemplate.findFirst({
    where: { companyId: company.id },
    orderBy: { id: 'asc' },
  }) || await prisma.quotationTemplate.create({
    data: {
      companyId: company.id,
      name: `Demo ${code} Quotation Terms`,
      termsAndConditions: 'Valid for 30 days. Payment due within 30 days of invoice.',
      footerText: `Prepared by ${company.name}`,
    },
  });
  const fixtureProducts = [];
  for (const product of products) {
    fixtureProducts.push(await getOrCreateProduct(company, ...product));
  }

  const prefix = `DEMO-${year}-${code}`;
  const shared = {
    company,
    client,
    template,
    admin,
    viewer,
    first: fixtureProducts[0],
    second: fixtureProducts[1],
  };
  const fixtures = [
    {
      ...shared,
      quotationNumber: `${prefix}-DRAFT`,
      status: 'DRAFT',
      creator: viewer,
      followUpDays: 7,
      lines: [
        { product: shared.first, quantity: 2, unitPrice: shared.first.basePrice, discountType: 'PERCENTAGE', discountValue: 5 },
        { product: shared.second, quantity: 1, unitPrice: shared.second.basePrice },
      ],
      discountType: 'FIXED',
      discountValue: 25,
      taxRate: Number(company.defaultTaxRate),
    },
    {
      ...shared,
      quotationNumber: `${prefix}-PENDING`,
      status: 'PENDING_APPROVAL',
      creator: viewer,
      followUpDays: 3,
      lines: [{ product: shared.first, quantity: 1, unitPrice: shared.first.basePrice }],
      taxRate: Number(company.defaultTaxRate),
    },
    {
      ...shared,
      quotationNumber: `${prefix}-APPROVED`,
      status: 'APPROVED',
      creator: admin,
      approvedBy: admin,
      followUpDays: null,
      lines: [{ product: shared.second, quantity: 3, unitPrice: shared.second.basePrice }],
      taxRate: Number(company.defaultTaxRate),
    },
    {
      ...shared,
      quotationNumber: `${prefix}-SENT`,
      status: 'SENT',
      creator: viewer,
      approvedBy: admin,
      followUpDays: 12,
      lines: [
        { product: shared.first, quantity: 1, unitPrice: shared.first.basePrice },
        { product: shared.second, quantity: 2, unitPrice: shared.second.basePrice },
      ],
      taxRate: 0,
    },
    {
      ...shared,
      quotationNumber: `${prefix}-REJECTED`,
      status: 'REJECTED',
      creator: viewer,
      approvedBy: admin,
      followUpDays: null,
      rejectionReason: 'Please confirm the delivery timeline and revise the scope.',
      lines: [{ product: shared.first, quantity: 1, unitPrice: shared.first.basePrice }],
      taxRate: Number(company.defaultTaxRate),
      revision: true,
    },
  ];

  let createdCount = 0;
  for (const fixture of fixtures) {
    if (await createQuotationFixture(fixture)) createdCount += fixture.revision ? 2 : 1;
  }

  return {
    tenant: company.name,
    demoViewer: viewer.username,
    products: fixtureProducts.length,
    quotationsAdded: createdCount,
  };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo data seeding is disabled in production.');
  }

  const year = new Date().getUTCFullYear();
  const results = await Promise.all([
    seedTenantFixtures(
      'Alpha Systems Inc.',
      'ALPHA',
      'Northstar Research Group',
      [
        ['Demo Implementation Package', 2400, 'Services'],
        ['Demo Annual Support', 850, 'Support'],
      ],
      year,
    ),
    seedTenantFixtures(
      'Beta Solutions Ltd.',
      'BETA',
      'Harborview Logistics',
      [
        ['Demo Network Assessment', 1750, 'Consulting'],
        ['Demo Managed Services', 620, 'Services'],
      ],
      year,
    ),
  ]);

  console.log('Added missing demo fixtures without deleting or changing existing records:');
  console.log(JSON.stringify(results, null, 2));
  console.log(`Demo viewer credentials (development only): demo_viewer_alpha / ${DEMO_PASSWORD}, demo_viewer_beta / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Demo data seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
