import 'dotenv/config';
import { fetchTrendingTopics } from './content-engine';
import { runMemoryAgent } from './agents/memory-agent';
import { runDecisionAgent, DecisionResult, CriticFeedbackForRetry } from './agents/decision-agent';
import { runCriticAgent, CriticResponse } from './agents/critic-agent';
import { videoQueue, cleanupQueue, VideoJobPayload, CleanupJobPayload } from '@repo/core-logic';
import { logger } from '@repo/core-logic';

const MAX_CRITIC_TURNS = 3;

console.log("🔥 NevoraMedia Agency OS — Orchestrator Engine Started");

/**
 * Core pipeline for a single topic:
 * Decision Agent → Critic Agent → (Reject? Retry with feedback) → max 3 turns → Save to DB
 */
async function processTopicWithRetryLoop(
  topic: any,
  brandProfile: any,
  tenantId: string
): Promise<{ decision: DecisionResult; criticResult: CriticResponse; turns: number; isGraceful: boolean }> {
  
  let lastDecision: DecisionResult | null = null;
  let lastCriticResult: CriticResponse | null = null;
  let criticFeedback: CriticFeedbackForRetry | undefined = undefined;

  for (let turn = 1; turn <= MAX_CRITIC_TURNS; turn++) {
    logger.info("Pipeline", `--- Turn ${turn}/${MAX_CRITIC_TURNS} for: ${topic.title} ---`);

    // 1. Decision Agent (with critic feedback on retries)
    const decision = await runDecisionAgent(topic, brandProfile, criticFeedback);
    lastDecision = decision;

    // If noise, don't even bother with critic
    if (decision.score < 55) {
      logger.info("Pipeline", `Score ${decision.score} < 55 — Noise, skipping.`);
      return {
        decision,
        criticResult: { approved: false, hookStrength: 0, valueScore: 0, fomoUrgency: 0, feedback: "Noise", rejectionReason: "Score too low" },
        turns: turn,
        isGraceful: false
      };
    }

    // 2. Critic Agent review
    const criticResult = await runCriticAgent(topic, decision);
    lastCriticResult = criticResult;

    if (criticResult.approved) {
      logger.info("Pipeline", `[APPROVED on turn ${turn}] Content passed all standards.`);
      return { decision, criticResult, turns: turn, isGraceful: false };
    }

    // 3. If rejected, prepare feedback for next attempt
    logger.warn("Pipeline", `[REJECTED on turn ${turn}] ${criticResult.rejectionReason}`);
    
    if (turn < MAX_CRITIC_TURNS) {
      criticFeedback = {
        rejectionReason: criticResult.rejectionReason || "Unknown",
        feedback: criticResult.feedback,
        hookStrength: criticResult.hookStrength,
        valueScore: criticResult.valueScore,
        fomoUrgency: criticResult.fomoUrgency,
        turn
      };
      logger.info("Pipeline", `Sending feedback to Decision Agent for retry...`);
    }
  }

  // Graceful Degradation: max_turns exhausted, save the best we have
  logger.warn("Pipeline", `⚠️ GRACEFUL DEGRADATION: ${MAX_CRITIC_TURNS} turns exhausted for "${topic.title}". Saving last draft with manual review flag.`);
  
  return {
    decision: lastDecision!,
    criticResult: lastCriticResult!,
    turns: MAX_CRITIC_TURNS,
    isGraceful: true
  };
}

/**
 * Save content job to database with appropriate status
 */
async function saveContentJob(
  topic: any,
  decision: DecisionResult,
  criticResult: CriticResponse,
  turns: number,
  isGraceful: boolean,
  tenantId: string
) {
  const { prisma } = await import("@repo/database");
  
  const status = isGraceful ? "NEEDS_MANUAL_REVIEW" : "NEEDS_REVIEW";
  
  const criticFlags = isGraceful ? JSON.stringify({
    warning: `⚠️ AI Uyarı: Bu içerik ${turns} denemeye rağmen marka kurallarına tam uydurulamadı, lütfen manuel olarak yoğun incelemeden geçirin.`,
    lastRejectionReason: criticResult.rejectionReason,
    lastFeedback: criticResult.feedback,
    specificFixes: criticResult.specificFixes || [],
    metrics: {
      hookStrength: criticResult.hookStrength,
      valueScore: criticResult.valueScore,
      fomoUrgency: criticResult.fomoUrgency
    }
  }) : null;

  await prisma.contentJob.upsert({
    where: { topicId: topic.topicId },
    update: {
      status,
      strategy: decision.strategy,
      criticTurns: turns,
      criticFlags,
    },
    create: {
      topicId: topic.topicId,
      tenantId,
      strategy: decision.strategy,
      status,
      criticTurns: turns,
      criticFlags,
      bundle: decision.bundle ? {
        create: {
          reelsScript: decision.bundle.reelsScript || "",
          storySequence: decision.bundle.storySequence ? JSON.stringify(decision.bundle.storySequence) : "[]",
          caption_ig: decision.bundle.caption_ig || "",
          thread_x: decision.bundle.thread_x || "",
          post_li: decision.bundle.post_li || "",
        }
      } : undefined
    }
  });

  const emoji = isGraceful ? "🚩" : "✅";
  logger.info("Pipeline", `${emoji} Job saved as ${status}. Critic turns: ${turns}`);
}

/**
 * Main orchestrator pipeline
 */
async function runPipeline() {
  console.log("-----------------------------------------");
  console.log("1. Fetching trending topics via Content Engine...");
  
  try {
    const sectorQuery = "livestock animal identification"; 
    const topics = await fetchTrendingTopics(sectorQuery, 3);
    console.log(`✅ Found ${topics.length} trending topics.`);

    const { prisma } = await import("@repo/database");

    // Load brand profile
    let currentBrandProfile: any = null;
    let tenantId = "default-tenant";
    try {
      const tenant = await prisma.tenant.findFirst({
        include: { brandProfile: true },
        orderBy: { createdAt: 'desc' }
      });
      if (tenant?.brandProfile) {
        currentBrandProfile = tenant.brandProfile;
        tenantId = tenant.id;
        logger.info("Pipeline", `🌟 Brand loaded: ${currentBrandProfile.companyStory?.substring(0, 50)}...`);
      } else {
        // Fallback: try old BrandProfile without tenant
        currentBrandProfile = await prisma.brandProfile.findFirst({ orderBy: { createdAt: 'desc' } });
        if (currentBrandProfile) {
          tenantId = currentBrandProfile.tenantId || "default-tenant";
          logger.info("Pipeline", `🌟 Legacy Brand loaded.`);
        } else {
          logger.warn("Pipeline", "No Brand Profile found. Using default fallbacks.");
        }
      }
    } catch (e: any) {
      logger.error("Pipeline", `Failed to load Brand Profile: ${e.message}`);
    }

    console.log("\n2. Processing topics through Agent Pipeline...");
    for (const topic of topics) {
      console.log(`\n   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯`);
      console.log(`   🎯 Topic: ${topic.title}`);
      
      // Memory Agent (dedup)
      let memoryResult: any = { isDuplicate: false, similarityScore: 0 };
      try {
         memoryResult = await runMemoryAgent(topic);
      } catch(e: any) {
         logger.warn("Pipeline", `Memory Agent skipped (Pinecone key missing).`);
      }
      
      if (memoryResult.isDuplicate) {
        logger.info("Pipeline", `[MEMORY REJECT] Duplicate. Similarity: ${memoryResult.similarityScore?.toFixed(2)}`);
        continue; 
      }
      
      // Core loop: Decision → Critic → Retry
      try {
        const { decision, criticResult, turns, isGraceful } = await processTopicWithRetryLoop(
          topic,
          currentBrandProfile,
          tenantId
        );

        // Don't save noise
        if (decision.score < 55) {
          logger.info("Pipeline", `[NOISE] Skipped, score: ${decision.score}`);
          continue;
        }

        // Save to DB (NEEDS_REVIEW or NEEDS_MANUAL_REVIEW)
        await saveContentJob(topic, decision, criticResult, turns, isGraceful, tenantId);

        // Log hook variants
        if (decision.hookVariants?.length) {
          logger.info("Pipeline", `Hook Variants Generated:`);
          decision.hookVariants.forEach((h, i) => {
            logger.info("Pipeline", `  ${i+1}. [${h.angle}] ${h.hookText}`);
          });
        }

      } catch (err: any) {
        logger.error("Pipeline", `Pipeline failed for "${topic.title}": ${err.message}`);
        
        const cleanupPayload: CleanupJobPayload = {
          topicId: topic.topicId,
          cleanupReason: "pipeline_failed",
          filesToDelete: [`temporary/images/${topic.topicId}.png`]
        };
        // await cleanupQueue.add("cleanup-s3", cleanupPayload);
        logger.info("Pipeline", `🧹 Cleanup job triggered (mocked).`);
      }
    }

    console.log("\n✅ Pipeline complete.");

  } catch (error: any) {
    console.error("❌ Pipeline Error:", error.message);
  }
}

// Export for BullMQ worker and direct execution
export { runPipeline };

if (require.main === module) {
  runPipeline();
}
