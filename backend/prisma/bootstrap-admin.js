require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!username || username.length < 3 || username.length > 50) {
    throw new Error('BOOTSTRAP_ADMIN_USERNAME must contain between 3 and 50 characters.');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
  }
  if (!password || password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.');
  }

  if (await prisma.user.count() > 0) {
    throw new Error('An administrator can only be bootstrapped into a database with no users.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      username,
      email,
      password: passwordHash,
      role: 'SUPERADMIN',
      enabled: true,
    },
  });

  console.log(`Created the initial Super Admin account for ${email}.`);
}

main()
  .catch((error) => {
    console.error('Failed to bootstrap the initial administrator:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
