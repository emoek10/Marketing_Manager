"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const logoPath = "/Users/sadikekinci/Documents/Antigravity/marketing-architect-monorepo/Raw_photos/ayvetsan_logo_website.png";
const assetStreamUrl = "/Users/sadikekinci/Documents/Antigravity/marketing-architect-monorepo/Raw_photos/P1270373.JPG";
const outputPathLocal = "/Users/sadikekinci/Documents/Antigravity/marketing-architect-monorepo/public/outputs/test-debug.mp4";
const isStatic = true;
const safeTitle = "Debug Title";
// SIMULATE AI BYPASS: Assume assetStreamUrl is the already-baked AI image with beautiful text.
const inputFlag = `-loop 1 -i "${assetStreamUrl}"`;
// V7 PROTOCOL: Solid Footer Bar & Enlarged (+40%) Pure White Logo
// [0:v] The base image (AI output)
// color filter creates 120px high solid Navy #1d3557
// [1:v] Convert logo to pure white using alpha channel, then scale to 101px height (+40% scaling logic)
// overlay footer at bottom
// overlay logo centered in footer, 80px padding from right
const filterComplex = `[0:v]scale=-1:1920,crop=1080:1920[bg]; color=c=#1d3557:s=1080x120[footer]; [1:v]colorchannelmixer=rr=0:rg=0:rb=0:ra=1:gr=0:gg=0:gb=0:ga=1:br=0:bg=0:bb=0:ba=1:ar=0:ag=0:ab=0:aa=1,scale=-1:101[logo]; [bg][footer]overlay=0:H-120[with_footer]; [with_footer][logo]overlay=W-w-80:H-120+(120-h)/2`;
const ffmpegPath = "/Users/sadikekinci/Documents/Antigravity/marketing-architect-monorepo/node_modules/ffmpeg-static/ffmpeg";
const ffmpegCmd = `"${ffmpegPath}" -y ${inputFlag} -i "${logoPath}" -t 5 -filter_complex "${filterComplex}" -vcodec libx264 -c:a aac -pix_fmt yuv420p "${outputPathLocal}"`;
console.log("Running CMD:", ffmpegCmd);
try {
    const stdout = (0, child_process_1.execSync)(ffmpegCmd, { stdio: 'pipe' });
    console.log("SUCCESS!");
}
catch (error) {
    console.error("FFMPEG ERROR OCCURRED!");
    console.error(error.stderr.toString());
}
