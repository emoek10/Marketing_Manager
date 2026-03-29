"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_config_1 = require("@repo/env-config");
const core_logic_1 = require("@repo/core-logic");
const moduleName = "CanvaTestRunner";
async function sendBlueprintToCanva(blueprint, topicId) {
    if (!env_config_1.env.CANVA_CLIENT_ID || !env_config_1.env.CANVA_CLIENT_SECRET) {
        core_logic_1.logger.error(moduleName, "Canva credentials missing. Cannot test API.");
        return null;
    }
    try {
        core_logic_1.logger.info(moduleName, "Authenticating with Canva Connect API (OAuth2)...");
        const credentials = Buffer.from(`${env_config_1.env.CANVA_CLIENT_ID}:${env_config_1.env.CANVA_CLIENT_SECRET}`).toString('base64');
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
        core_logic_1.logger.info(moduleName, `✅ Acquired LIVE Canva Bearer Token!`);
        core_logic_1.logger.info(moduleName, "Pushing Design Blueprint to Canva Autofill API...");
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
        const autofillData = await autofillRes.json();
        if (!autofillRes.ok) {
            core_logic_1.logger.error(moduleName, `Autofill Request Failed [${autofillRes.status}]`, autofillData);
            return null;
        }
        core_logic_1.logger.info(moduleName, `🚀 NevoraMedia LIVE Canva Output:`, autofillData);
        return autofillData.job_id || "Success";
    }
    catch (error) {
        core_logic_1.logger.error(moduleName, "Canva API Integration Failed", error.message);
        return null;
    }
}
async function runTest() {
    core_logic_1.logger.info(moduleName, "Starting standalone LIVE Canva API test for NevoraMedia...");
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
