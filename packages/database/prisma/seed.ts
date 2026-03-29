import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.asset.deleteMany({}); // clear existing
  await prisma.asset.createMany({
    data: [
      {
        filename: 'farmer_subsidy_happy.jpg',
        type: 'IMAGE',
        semanticTags: 'farmer, agriculture, subsidy, money, happy, field, tractor, investment',
      },
      {
        filename: 'cow_milking_farm.mp4',
        type: 'VIDEO',
        semanticTags: 'cow, milk, farm, dairy, livestock, cattle, equipment, ayvetsan',
      },
      {
        filename: 'water_management_reservoir.jpg',
        type: 'IMAGE',
        semanticTags: 'water, reservoir, dam, management, sustainable, drought, nature, crisis',
      }
    ]
  });

  console.log("✅ Database seeded with mock Ayvetsan Library Assets.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
