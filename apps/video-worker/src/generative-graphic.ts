import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { logger } from "@repo/core-logic";
import { env } from "@repo/env-config";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const moduleName = "GenAI-GraphicWorker";

export async function generateContextAwareGraphic(
    rawImagePath: string,
    outputPath: string,
    platform: string,
    safeTitle: string,
    textTop: string
): Promise<boolean> {
    try {
        logger.info(moduleName, `Analyzing context and generating premium typography for: ${rawImagePath}`);
        
        // 1. Convert Image to base64 buffer for Gemini
        const imageBuffer = fs.readFileSync(rawImagePath);
        const base64Data = imageBuffer.toString("base64");
        const mimeType = rawImagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        // 2. Define Context-Aware Design Instructions
        let dimensionPrompt = platform === "LinkedIn" 
            ? "Create a 4:5 vertical portrait image." 
            : "Create a 9:16 full-screen vertical image.";
            
        let footerPrompt = platform === "LinkedIn"
            ? "Include subtle professional bottom branding that says 'AYVET GLOBAL - Professional Insights'"
            : "Include sleek bottom branding that says 'Tap to read more'";

        const designPrompt = `
Task: Transform this exact input image into a world-class, premium B2B advertising background plate executing the "Design Math V6.1" protocol.

CRITICAL DESIGN MATH V6.1 RULES:
1. STRICTLY NO TYPOGRAPHY: You are acting purely as a Luminance & Color Grading Engine. DO NOT DRAW, GENERATE, OR RENDER ANY TEXT, LETTERS, OR TYPOGRAPHY ON THE IMAGE. Leave the canvas completely blank of text.
2. The Scrim Layer & Context Awareness (VITAL): "Fotoğrafın derinliğini analiz et ve Navy & Orange color grade'i uygulayarak metni sahnenin negatif boşluğuna zarifçe yedir." (Analyze the depth of the photo and apply a Navy & Orange color grade to gracefully prepare the negative space for text).
3. Generate a dark gradient (85% Navy Blue to 0%) from the absolute bottom edge upwards, covering exactly the bottom 35% of the canvas height. This provides the shadow foundation in the negative space.
4. Active Luminance & Product Clarity: DO NOT darken the entire image with a muddy global overlay. The products must shine. Let the brand colors (Navy/Orange) "marry" the photo's natural light. Keep the underlying subject (e.g., circular ear tags, farm animals) bright, crisp, and popping with their original high-quality photography luminance.

Formatting: ${dimensionPrompt}
Flawless execution is required. Zero AI hallucinations. Output ONLY the perfectly graded background plate.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: designPrompt },
                        { inlineData: { data: base64Data, mimeType } }
                    ]
                }
            ],
            config: {
                temperature: 0.3,
            }
        });

        // The exact API mechanism to capture the "Img2Img" generated image array from Gemini
        // NOTE: Standard Gemini 2.5 Flash `generateContent` normally returns text analyses. 
        // In a true Nanobanana/Imagen Img2Img pipeline, we'd use the `imagen-3.0-generate-001` editing model.
        // For this architectural simulation built on 2.5-flash, if we get an image blob back, we write to disk.
        
        const candidate = response.candidates?.[0];
        // Searching for an image part response (assuming the generative engine supports returning edited images directly here)
        let generatedImageBuffer;
        if (candidate && candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                 // @ts-ignore - Assuming standard part formats
                 if (part.inlineData && part.inlineData.data) {
                     generatedImageBuffer = Buffer.from(part.inlineData.data, 'base64');
                     break;
                 }
            }
        }
        
        if (generatedImageBuffer) {
             fs.writeFileSync(outputPath, generatedImageBuffer);
             logger.info(moduleName, `Successfully generated premium context-aware asset: ${outputPath}`);
             return true;
        } else {
             logger.warn(moduleName, "No graphical binary returned from GenAI. The model returned text interpretation instead of an edited image buffer.");
             return false;
        }

    } catch (e: any) {
        logger.error(moduleName, `Failed to generate GenAI graphic: ${e.message}`, e);
        return false;
    }
}
