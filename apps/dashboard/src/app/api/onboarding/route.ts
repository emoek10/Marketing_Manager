import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantName,
      industry,
      websiteUrl,
      companyStory,
      brandValues,
      toneAnchor,
      competitorUrls,
    } = body;

    if (!tenantName || !industry) {
      return NextResponse.json(
        { error: "tenantName and industry are required" },
        { status: 400 }
      );
    }

    // Create Tenant + BrandProfile in a single transaction
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        brandProfile: {
          create: {
            industry,
            websiteUrl: websiteUrl || null,
            companyStory: companyStory || null,
            brandValues: brandValues || null,
            toneAnchor: toneAnchor || null,
            competitorUrls: competitorUrls
              ? JSON.stringify(
                  competitorUrls
                    .split(",")
                    .map((u: string) => u.trim())
                    .filter(Boolean)
                )
              : null,
          },
        },
      },
      include: { brandProfile: true },
    });

    return NextResponse.json({ success: true, tenant }, { status: 201 });
  } catch (error: any) {
    console.error("[API/onboarding] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", detail: error.message },
      { status: 500 }
    );
  }
}
