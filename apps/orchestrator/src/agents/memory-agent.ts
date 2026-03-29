import { getIndex, generateEmbedding, TrendTopic } from "@repo/database";
import { logger } from "@repo/core-logic";

const SIMILARITY_THRESHOLD = 0.85;

export interface MemoryCheckResult {
  isDuplicate: boolean;
  similarityScore?: number;
  reason?: string;
  topic: TrendTopic;
}

/**
 * The Memory Agent prevents "Brand Schizophrenia" and redundancy.
 * 
 * 1. Takes the TrendTopic.
 * 2. Creates a combined string (Title + Context).
 * 3. Generates OpenAI text-embedding-3-small vector.
 * 4. Queries Pinecone to see if similar content was generated before.
 * 5. If similarity > 0.85, rejects it.
 * 6. If < 0.85, saves the new vector to Pinecone and approves it.
 */
export async function runMemoryAgent(topic: TrendTopic): Promise<MemoryCheckResult> {
  const moduleName = "MemoryAgent";
  
  try {
    const pineconeIndex = getIndex();
    
    // 1. Combine string for embedding
    const contentToEmbed = `Title: ${topic.title}\nContext: ${topic.context}`;
    
    logger.info(moduleName, `Generating embedding for: ${topic.topicId} via Gemini`);
    
    // 2. Generate vector (Gemini text-embedding-004 is 768 dimensions)
    const vector = await generateEmbedding(contentToEmbed);

    // 3. Query Pinecone
    const queryResponse = await pineconeIndex.query({
      vector: vector,
      topK: 1,
      includeMetadata: true,
    });

    const bestMatch = queryResponse.matches[0];

    // 4. Deduplication Logic
    if (bestMatch && bestMatch.score && bestMatch.score > SIMILARITY_THRESHOLD) {
      logger.warn(moduleName, "Topic Rejected (Duplicate).", {
        topicId: topic.topicId,
        matchedWith: bestMatch.id,
        score: bestMatch.score
      });
      
      return {
        isDuplicate: true,
        similarityScore: bestMatch.score,
        reason: `Cosine similarity (${bestMatch.score.toFixed(2)}) is above the ${SIMILARITY_THRESHOLD} threshold with ${bestMatch.id}.`,
        topic
      };
    }

    // 5. Save the new unique content payload to pinecone memory
    logger.info(moduleName, "Topic Approved. Saving new genome to Pinecone.", {
      topicId: topic.topicId,
      score: bestMatch?.score || 0
    });

    await pineconeIndex.upsert([{
      id: topic.topicId,
      values: vector,
      metadata: {
        title: topic.title,
        url: topic.sourceUrl,
        timestamp: new Date().toISOString(),
      }
    }]);

    return {
      isDuplicate: false,
      similarityScore: bestMatch?.score || 0,
      reason: "Content is unique enough.",
      topic
    };

  } catch (error: any) {
    logger.error(moduleName, "Memory Agent execution failed", { error: error.message });
    throw error;
  }
}
