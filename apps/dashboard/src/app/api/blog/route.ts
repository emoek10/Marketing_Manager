import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET — List all blog posts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "desc" } });
    if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 404 });

    const where: any = { tenantId: tenant.id };
    if (status && status !== "ALL") where.status = status;

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ posts, tenantId: tenant.id });
  } catch (error: any) {
    console.error("[API/blog] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — Update a blog post
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    // Recalculate word count and reading time if content changed
    if (updateData.content) {
      const words = updateData.content.split(/\s+/).filter(Boolean).length;
      updateData.wordCount = words;
      updateData.readingTime = Math.max(1, Math.ceil(words / 200));
    }

    // Generate slug from title if title changed
    if (updateData.title) {
      updateData.slug = updateData.title
        .toLowerCase()
        .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
        .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80) + "-" + Date.now().toString(36);
    }

    const updated = await prisma.blogPost.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, post: updated });
  } catch (error: any) {
    console.error("[API/blog] PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Remove a blog post
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API/blog] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
