import { z } from 'zod';
import { config } from 'dotenv';
import path from 'path';

// Resolve the monorepo root .env.global file accurately using __dirname
// __dirname here is packages/env-config/src or dist
const globalEnvPath = path.resolve(__dirname, '../../../.env.global');
config({ path: globalEnvPath });
config(); // Default dotenv load for current cwd

const envSchema = z.object({
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().optional(),
  PINECONE_INDEX_NAME: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
  CANVA_CLIENT_ID: z.string().optional(),
  CANVA_CLIENT_SECRET: z.string().optional(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
