import { z } from 'zod';

export const ContentSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  body: z.string(),
});

export const TrendTopicSchema = z.object({
  topicId: z.string(), // e.g. a hash or slug of the title
  title: z.string(),
  context: z.string(), // snippet or summary
  sourceUrl: z.string().url(),
  publishedAt: z.string().optional(),
  channel: z.enum(["TR-Local", "TR-Calendar", "Global-Tech"]).optional(),
  isCalendarPriority: z.boolean().default(false).optional(),
});

export type TrendTopic = z.infer<typeof TrendTopicSchema>;
