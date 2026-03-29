import { GoogleGenAI } from "@google/genai";
import { env } from "@repo/env-config";

let aiClient: GoogleGenAI | null = null;

export const initGemini = () => {
  if (aiClient) return aiClient;

  if (!env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  aiClient = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
  });

  return aiClient;
};

/**
 * Helper to generate 768-dimensional embeddings using text-embedding-004
 * Pinecone should be configured to 768 dimensions for this model.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const ai = initGemini();
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });

  return response.embeddings?.[0]?.values || [];
};
