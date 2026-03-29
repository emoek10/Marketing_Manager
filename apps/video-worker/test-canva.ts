import { env } from "@repo/env-config";
import { logger } from "@repo/core-logic";

const moduleName = "CanvaTestRunner";

async function sendBlueprintToCanva(blueprint: any, topicId: string): Promise<string | null> {
    if (!env.CANVA_CLIENT_ID || !env.CANVA_CLIENT_SECRET) {
        logger.error(moduleName, "Canva credentials missing. Cannot test API.");
        return null;
    }
    
    try {
        logger.info(moduleName, "Authenticating with Canva Connect API (OAuth2)...");
        const credentials = Buffer.from(`${env.CANVA_CLIENT_ID}:${env.CANVA_CLIENT_SECRET}`).toString('base64');
        
        // Step 1: Real Request for Access Token
        const tokenRes = await fetch("https://api.canva.com/rest/v1/oauth/token", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "grant_type=client_credentials"
        });
        
        if (!tokenRes.ok) {
            const errTxt = await tokenRes.text();
            throw new Error(`Token Request Failed [${tokenRes.status}]: ${errTxt}`);
        }
        
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        
        logger.info(moduleName, `✅ Acquired LIVE Canva Bearer Token!`);
        logger.info(moduleName, "Pushing Design Blueprint to Canva Autofill API...");
        
        // Step 2: Real Push to Canva Autofill API using user's template ID
        const autofillRes = await fetch("https://api.canva.com/rest/v1/autofills", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${accessToken}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                 brand_template_id: "DAHD9-_69H8",
                 data: {
                     "headline_text": {
                         "type": "text",
                         "text": blueprint.textGuide.headline.text
                     }
                 }
            })
        });
        
        if (!autofillRes.ok) {
            const errTxt = await autofillRes.text();
            logger.error(moduleName, `Autofill Request Failed [${autofillRes.status}]`, errTxt);
            return null;
        }

        const autofillData = await autofillRes.json();
        
        logger.info(moduleName, `🚀 NevoraMedia LIVE Canva Output:`, autofillData);
        
        return autofillData.job_id || "Success";
    } catch (error: any) {
        logger.error(moduleName, "Canva API Integration Failed", error.message);
        return null;
    }
}

async function runTest() {
    logger.info(moduleName, "Starting standalone LIVE Canva API test for NevoraMedia...");
    const fakeBlueprint = { 
        blueprintType: "Design Math V7 - Content Design Blueprint",
        textGuide: {
            headline: {
                text: "NEVORA MEDIA B2B INSIGHTS"
            }
        }
    };
    await sendBlueprintToCanva(fakeBlueprint, "TestCampaign_B2B");
}

runTest();
