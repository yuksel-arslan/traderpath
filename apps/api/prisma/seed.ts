// ===========================================
// Database Seed Script
// ===========================================

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed Admin User
  const adminEmail = 'contact@yukselarslan.com';
  const adminPassword = 'Admin123!'; // Change this after first login!

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        password: hashedPassword,
        creditBalance: {
          create: {
            balance: 10000,
          },
        },
      },
    });
    console.log(`✅ Created admin user: ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
  } else {
    // Update password if user exists
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.update({
      where: { email: adminEmail },
      data: { password: hashedPassword },
    });
    console.log(`✅ Updated admin password for: ${adminEmail}`);
  }

  // Seed Credit Packages - Must match pricing-config.ts in web app
  const packages = [
    {
      name: 'Starter Pack',
      credits: 50,
      bonusCredits: 0,
      priceUsd: 7.99,
      pricePerCredit: 7.99 / 50,
      discountPercent: 0,
      isPopular: false,
      isActive: true,
    },
    {
      name: 'Trader Pack',
      credits: 150,
      bonusCredits: 15,
      priceUsd: 19.99,
      pricePerCredit: 19.99 / 165,
      discountPercent: 0,
      isPopular: true,
      isActive: true,
    },
    {
      name: 'Pro Pack',
      credits: 400,
      bonusCredits: 60,
      priceUsd: 44.99,
      pricePerCredit: 44.99 / 460,
      discountPercent: 0,
      isPopular: false,
      isActive: true,
    },
    {
      name: 'Whale Pack',
      credits: 1000,
      bonusCredits: 200,
      priceUsd: 89.99,
      pricePerCredit: 89.99 / 1200,
      discountPercent: 0,
      isPopular: false,
      isActive: true,
    },
  ];

  for (const pkg of packages) {
    await prisma.creditPackage.upsert({
      where: { name: pkg.name },
      update: {
        credits: pkg.credits,
        bonusCredits: pkg.bonusCredits,
        priceUsd: pkg.priceUsd,
        pricePerCredit: pkg.pricePerCredit,
        discountPercent: pkg.discountPercent,
        isPopular: pkg.isPopular,
        isActive: pkg.isActive,
      },
      create: pkg,
    });
    console.log(`✅ Upserted package: ${pkg.name}`);
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
