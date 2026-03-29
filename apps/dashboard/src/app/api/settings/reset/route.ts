import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(req: NextRequest) {
  // Safety: Disable in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Reset disabled in production environment" },
      { status: 403 }
    );
  }

  // Safety: Require admin secret
  const adminSecret = req.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET) {
    // If ADMIN_SECRET is not set in env, allow reset (dev convenience)
    console.warn("[RESET] ADMIN_SECRET not set — allowing reset in dev mode");
  } else if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid admin secret" },
      { status: 401 }
    );
  }

  try {
    // Delete all SocialBundles first (FK constraint)
    const deletedBundles = await prisma.socialBundle.deleteMany({});
    const deletedJobs = await prisma.contentJob.deleteMany({});

    return NextResponse.json({
      success: true,
      deleted: {
        contentJobs: deletedJobs.count,
        socialBundles: deletedBundles.count,
      },
    });
  } catch (error: any) {
    console.error("[API/settings/reset] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
