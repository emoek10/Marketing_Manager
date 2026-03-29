// Defines the dynamic safe zone paddings for 9:16 vertical video platforms

export interface PlatformSafeZone {
    SAFE_ZONE_TOP: number; // Pixels from top
    SAFE_ZONE_BOTTOM: number; // Pixels from bottom
    SAFE_ZONE_RIGHT: number; // Pixels from right (for interaction buttons)
}

export const PLATFORM_PADDINGS: Record<"Reels" | "TikTok" | "Shorts", PlatformSafeZone> = {
    Reels: {
        SAFE_ZONE_TOP: 200,
        SAFE_ZONE_BOTTOM: 400, // Account for long captions
        SAFE_ZONE_RIGHT: 160,
    },
    TikTok: {
        SAFE_ZONE_TOP: 150,
        SAFE_ZONE_BOTTOM: 350,
        SAFE_ZONE_RIGHT: 140,
    },
    Shorts: {
        SAFE_ZONE_TOP: 100,
        SAFE_ZONE_BOTTOM: 300,
        SAFE_ZONE_RIGHT: 120,
    }
};

/**
 * Calculates the safe Y coordinate for text rendering, avoiding the bottom caption area
 * and the top UI area.
 */
export function calculateDynamicYOffset(platform: "Reels" | "TikTok" | "Shorts", videoHeight: number = 1920): number {
    const padding = PLATFORM_PADDINGS[platform];
    // Place text dynamically in the lower third, but above the bottom safe zone
    return videoHeight - padding.SAFE_ZONE_BOTTOM - 200; 
}
