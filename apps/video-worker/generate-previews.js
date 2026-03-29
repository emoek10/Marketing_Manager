"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const logoPath = "/Users/sadikekinci/Documents/Antigravity/marketing-architect-monorepo/Raw_photos/ayvetsan_logo_website.png";
const assetStreamUrl = "/Users/sadikekinci/Documents/Antigravity/marketing-architect-monorepo/Raw_photos/P1270373.JPG";
const artifactDir = "/Users/sadikekinci/.gemini/antigravity/brain/48749585-ab18-4c21-9b81-c3baf67aa4fc";
function generatePreview(platform, safeTitle, textTop, outputFilename) {
    const assetScale = 'scale=-1:1920,crop=1080:1920';
    const darkTint = 'drawbox=x=0:y=0:width=1080:height=1920:color=black@0.45:t=fill';
    const brandLabel = "drawtext=text='AYVET GLOBAL':font=Inter-Bold:fontcolor=white:fontsize=36:x=(W-text_w)/2:y=200";
    const centerHook = `drawtext=text='${safeTitle}':fontcolor=white:fontsize=90:x=(W-text_w)/2:y=820`;
    const subTitle = `drawtext=text='${textTop}':fontcolor=#cbd5e1:fontsize=45:x=(W-text_w)/2:y=950`;
    const footerStyle = platform === "LinkedIn"
        ? "drawtext=text='Read the full breakdown in caption':fontcolor=white:fontsize=32:x=(W-text_w)/2:y=1700"
        : "drawtext=text='Tap to read more 👇':fontcolor=white:fontsize=32:x=(W-text_w)/2:y=1700";
    const vfString = `${assetScale},${darkTint},${brandLabel},${centerHook},${subTitle},${footerStyle}`;
    const filterComplex = `[0:v]${vfString}[bg]; [bg][1:v]overlay=W-w-10:10`;
    const outputPathLocal = path_1.default.join(artifactDir, outputFilename);
    const ffmpegPath = "/Users/sadikekinci/Documents/Antigravity/marketing-architect-monorepo/node_modules/ffmpeg-static/ffmpeg";
    // Output 1 frame directly to PNG
    const ffmpegCmd = `"${ffmpegPath}" -y -i "${assetStreamUrl}" -i "${logoPath}" -filter_complex "${filterComplex}" -frames:v 1 "${outputPathLocal}"`;
    console.log(`Generating ${outputFilename}...`);
    try {
        (0, child_process_1.execSync)(ffmpegCmd, { stdio: 'pipe' });
        console.log(`Success: ${outputFilename}`);
    }
    catch (e) {
        console.error("Error generating", e.stderr.toString());
    }
}
// 1. Engagement ToF (IG Carousel)
generatePreview("Reels", "Livestock Market Boom", "ENGAGEMENT ToF", "engagement_tof_ig.png");
// 2. Authority BoF (LinkedIn Static)
generatePreview("LinkedIn", "Ayvetsan Global Logistics", "AUTHORITY BoF", "authority_bof_linkedin.png");
