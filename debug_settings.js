
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const settings = await prisma.systemSettings.findMany();
    console.log('Current Settings:', settings);
  } catch (e) {
    console.error('Error fetching settings:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
