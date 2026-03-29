import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // Check env vars (existence only, never expose values)
    const apiStatus = {
      gemini: !!process.env.GEMINI_API_KEY,
      serper: !!process.env.SERPER_API_KEY,
      canva: !!(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET),
      pinecone: !!process.env.PINECONE_API_KEY,
      redis: !!process.env.REDIS_URL,
    };

    return NextResponse.json({
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            plan: tenant.subscriptionTier,
            createdAt: tenant.createdAt.toISOString(),
          }
        : null,
      apiStatus,
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error: any) {
    console.error("[API/settings] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
