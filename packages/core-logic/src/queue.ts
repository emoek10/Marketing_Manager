import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { env } from "@repo/env-config";

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const VIDEO_QUEUE_NAME = "video-rendering-queue";
export const CLEANUP_QUEUE_NAME = "media-cleanup-queue";

/**
 * Shared instance of the Video Queue for producers (e.g. Orchestrator)
 */
export const videoQueue = new Queue(VIDEO_QUEUE_NAME, { connection: connection as any });
export const cleanupQueue = new Queue(CLEANUP_QUEUE_NAME, { connection: connection as any });

/**
 * Shared events listener for tracking job progress
 */
export const videoQueueEvents = new QueueEvents(VIDEO_QUEUE_NAME, { connection: connection as any });

/**
 * Interface for the Social Bundle we will send to the Node.js FFmpeg worker
 */
export interface VideoJobPayload {
  topicId: string;
  targetPlatform: "Reels" | "TikTok" | "Shorts";
  strategy: "Authority" | "Engagement";
  bundle: {
    reelsScript: string;
    storySequence: string[];
    caption_ig: string;
    thread_x: string;
    post_li: string;
    searchKeywords: string[]; // Emphasize querying the raw library 
    visualPrompt: string; // The URL/prompt of the generated image (DALL-E etc) - Fallback ONLY
    audioUrl?: string; // The URL of the generated TTS
  };
}

export interface CleanupJobPayload {
  topicId: string;
  cleanupReason: "rejected_by_critic" | "pipeline_failed" | "orphaned_media";
  filesToDelete: string[]; // List of S3 URLs/keys to remove
}
