// ===========================================
// Database Seed Script
// ===========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed Credit Packages
  const packages = [
    {
      name: 'Starter',
      credits: 50,
      bonusCredits: 0,
      priceUsd: 14.99,
      pricePerCredit: 14.99 / 50,
      discountPercent: 0,
      isPopular: false,
      isActive: true,
    },
    {
      name: 'Popular',
      credits: 120,
      bonusCredits: 10,
      priceUsd: 29.99,
      pricePerCredit: 29.99 / 130,
      discountPercent: 0,
      isPopular: true,
      isActive: true,
    },
    {
      name: 'Pro',
      credits: 300,
      bonusCredits: 30,
      priceUsd: 59.99,
      pricePerCredit: 59.99 / 330,
      discountPercent: 0,
      isPopular: false,
      isActive: true,
    },
  ];

  for (const pkg of packages) {
    const existing = await prisma.creditPackage.findFirst({
      where: { name: pkg.name },
    });

    if (!existing) {
      await prisma.creditPackage.create({ data: pkg });
      console.log(`✅ Created package: ${pkg.name}`);
    } else {
      console.log(`⏭️ Package already exists: ${pkg.name}`);
    }
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
