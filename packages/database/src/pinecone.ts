import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "@repo/env-config";

let pineconeClient: Pinecone | null = null;

export const initPinecone = () => {
  if (pineconeClient) return pineconeClient;

  if (!env.PINECONE_API_KEY || !env.PINECONE_INDEX_NAME) {
    throw new Error("Missing PINECONE_API_KEY or PINECONE_INDEX_NAME environment variables.");
  }

  pineconeClient = new Pinecone({
    apiKey: env.PINECONE_API_KEY,
  });

  console.log("🌲 Pinecone Client Initialized");
  return pineconeClient;
};

export const getIndex = () => {
  const pc = initPinecone();
  return pc.Index(env.PINECONE_INDEX_NAME!);
};
