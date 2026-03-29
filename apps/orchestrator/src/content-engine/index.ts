import { z } from "zod";
import { env } from "@repo/env-config";
import { TrendTopic, TrendTopicSchema } from "@repo/database";
import { TR_CALENDAR, NEGATIVE_FILTERS } from "./guardrails";

// --- Zod Schemas ---

export const SerperNewsItemSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  snippet: z.string().optional(),
  date: z.string().optional(),
  source: z.string().optional(),
});

export const SerperNewsResponseSchema = z.object({
  news: z.array(SerperNewsItemSchema).optional().default([]),
});

// --- Guardrail Logic ---

/**
 * Applies blacklist filters to check if the text contains restricted terms.
 */
function isBlacklisted(text: string): boolean {
  const lowerText = text.toLowerCase();
  return NEGATIVE_FILTERS.some((filter) => lowerText.includes(filter));
}

// --- API Functions ---

/**
 * Helper to fetch Serper news for a specific query
 */
async function fetchSerper(query: string, limit: number = 3) {
  const SERPER_API_URL = "https://google.serper.dev/news";
  if (!env.SERPER_API_KEY) {
    throw new Error("Missing SERPER_API_KEY in environment variables.");
  }

  const response = await fetch(SERPER_API_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": env.SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, tbs: "qdr:d", num: limit }),
  });

  if (!response.ok) {
    throw new Error(`Serper API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return SerperNewsResponseSchema.parse(data);
}

/**
 * Check if today matches any date in the calendar JSON.
 */
function getActiveCalendarEvents(): TrendTopic[] {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${mm}-${dd}`;

  const events: TrendTopic[] = [];
  
  for (const cal of TR_CALENDAR) {
    if (cal.date === todayStr) {
      events.push({
        topicId: `cal-${cal.date}-${cal.event.replace(/\s+/g, '-').toLowerCase()}`,
        title: `Özel Gün Yaklaşıyor: ${cal.event}`,
        context: `Bugün ${cal.event}. Odaklanılacak anahtar kelimeler: ${cal.keywords.join(", ")}.`,
        sourceUrl: `https://calendar.internal/${cal.date}`,
        channel: "TR-Calendar",
        isCalendarPriority: true,
      });
    }
  }

  return events;
}

/**
 * Refactored Fetch Topics that handles the 3 channels and guardrails.
 */
export async function fetchTrendingTopics(userQueryOverride?: string, limit: number = 2): Promise<TrendTopic[]> {
  const allTopics: TrendTopic[] = [];

  // Channel 1: TR-Calendar (Static JSON Trigger)
  const calendarEvents = getActiveCalendarEvents();
  allTopics.push(...calendarEvents);

  // Channel 2: TR-Local (Türkiye Gündemi)
  const localQueries = [
    "Hayvancılık ithalat Türkiye 2026", 
    "Et fiyatları analiz güncel", 
    "Tarım Bakanlığı hayvancılık destekleri"
  ];
  
  // Channel 3: Global-Tech (Kimliklendirme & IoT)
  const globalQueries = [
    "Future of RFID livestock tracking",
    "Electronic Identification EID standards innovation",
    "Smart farming IoT livestock 2026"
  ];

  // Fetching from Serper
  const fetchChannel = async (queries: string[], channel: "TR-Local" | "Global-Tech" | "TR-Calendar") => {
    for (const q of queries) {
      try {
         const result = await fetchSerper(q, limit);
         
         for (const news of result.news) {
            const context = news.snippet || "";
            const combinedText = `${news.title} ${context}`;
            
            // 1. Guardrail: Negative Filter check
            if (isBlacklisted(combinedText)) {
              console.log(`   [ContentEngine] Filtered out (Blacklist): ${news.title}`);
              continue; 
            }
            
            allTopics.push({
              topicId: news.link.split('/').pop()?.substring(0, 50) || `serper-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              title: news.title,
              context: context,
              sourceUrl: news.link,
              publishedAt: news.date || new Date().toISOString(),
              channel: channel,
            });
         }
      } catch (e: any) {
        console.error(`Error fetching channel ${channel} query ${q}:`, e.message);
      }
    }
  };

  await fetchChannel(localQueries, "TR-Local");
  await fetchChannel(globalQueries, "Global-Tech");

  return allTopics;
}
