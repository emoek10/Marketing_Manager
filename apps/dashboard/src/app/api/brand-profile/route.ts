import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const BrandProfileUpdateSchema = z.object({
  companyStory: z.string().optional(),
  industry: z.string().optional(),
  websiteUrl: z.string().optional(),
  toneAnchor: z.string().optional(),
  brandValues: z.string().optional(),
  designSpec: z.string().optional(),
  brandColors: z.string().optional(),
  brandFonts: z.string().optional(),
  logoUrl: z.string().optional(),
  newsFilters: z.string().optional(),
  competitorUrls: z.string().optional(),
});

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({
      include: { brandProfile: true },
      orderBy: { createdAt: "desc" },
    });

    if (!tenant) {
      return NextResponse.json({ error: "No tenant found" }, { status: 404 });
    }

    return NextResponse.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      plan: tenant.subscriptionTier,
      brand: tenant.brandProfile,
    });
  } catch (error: any) {
    console.error("[API/brand-profile] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = BrandProfileUpdateSchema.parse(body);

    const tenant = await prisma.tenant.findFirst({
      include: { brandProfile: true },
      orderBy: { createdAt: "desc" },
    });

    if (!tenant || !tenant.brandProfile) {
      return NextResponse.json(
        { error: "No brand profile found" },
        { status: 404 }
      );
    }

    const updated = await prisma.brandProfile.update({
      where: { id: tenant.brandProfile.id },
      data: validated,
    });

    return NextResponse.json({ success: true, brand: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[API/brand-profile] PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
