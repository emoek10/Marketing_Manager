import { readdirSync, statSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import * as mime from "mime-types";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const RAW_PHOTOS_DIR = join(process.cwd(), "..", "..", "Raw_photos");

async function ingestAssets() {
    console.log(`🔍 Scanning directory: ${RAW_PHOTOS_DIR}`);
    const files = readdirSync(RAW_PHOTOS_DIR);
    
    for (const file of files) {
        const filePath = join(RAW_PHOTOS_DIR, file);
        if (statSync(filePath).isDirectory()) continue;
        
        // Skip already ingested files
        const existing = await prisma.asset.findFirst({ where: { filename: file } });
        if (existing) {
            console.log(`⏩ Skipping ${file} (Already in DB)`);
            continue;
        }

        const mimeType = mime.lookup(filePath) || "application/octet-stream";
        const isImage = mimeType.startsWith("image/");
        const isVideo = mimeType.startsWith("video/");
        
        let tags = "nature, farm, agriculture"; // Fallback tags
        let type = "video";

        if (isImage) {
            type = "image";
            console.log(`👁️ Analyzing Image with Gemini: ${file}...`);
            try {
                // Read file as base64
                const fileData = readFileSync(filePath).toString("base64");
                
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: [
                        { text: "Analyze this image and provide 10 highly relevant, comma-separated keywords/tags related to agriculture, livestock, farming, technology, or nature. Output ONLY the comma-separated words." },
                        { inlineData: { data: fileData, mimeType } }
                    ]
                });
                
                if (response.text) {
                     tags = response.text.replace(/\n/g, "").trim().toLowerCase();
                     console.log(`   ✅ Tags generated: [${tags}]`);
                }
            } catch (err) {
                console.error(`   ❌ Failed to analyze image with Gemini. Using fallback tags.`, err);
            }
        } else if (isVideo) {
            type = "video";
            console.log(`📹 Video detected: ${file}. Applying general tags (Deep video embedding skipped for speed).`);
            // For full production, we would extract a frame via FFmpeg and send it to Gemini.
            // For now, we apply general tags or parse the filename.
            const nameTags = file.replace(/\..+$/, '').split(/[-_]+/).join(", ").toLowerCase();
            tags = `video, livestock, farm, ${nameTags}`;
        } else {
            console.log(`⚠️ Skipping unsupported file type: ${file} (${mimeType})`);
            continue;
        }
        
        // Save to Database
        await prisma.asset.create({
            data: {
                filename: file,
                type: type,
                semanticTags: tags
            }
        });
        
        console.log(`💾 Saved ${file} to localized Asset Database.\n`);
    }
    
    console.log("🎉 Asset ingestion complete!");
    await prisma.$disconnect();
}

ingestAssets().catch(console.error);
