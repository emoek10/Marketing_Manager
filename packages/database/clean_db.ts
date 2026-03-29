import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const dirPath = path.join(__dirname, '..', '..', 'Raw_photos');

async function clean() {
    const dbAssets = await prisma.asset.findMany();
    const actualFiles = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
    
    let deletedCount = 0;
    for (const asset of dbAssets) {
        if (!actualFiles.includes(asset.filename)) {
            console.log(`Deleting zombie asset: ${asset.filename}`);
            await prisma.asset.delete({ where: { id: asset.id } });
            deletedCount++;
        }
    }
    console.log(`Cleanup complete. Deleted ${deletedCount} zombie assets.`);
}

clean().finally(() => prisma.$disconnect());
