import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Smart redirect: if tenant exists → dashboard, otherwise → onboarding
  const tenant = await prisma.tenant.findFirst();
  
  if (tenant) {
    redirect("/dashboard");
  } else {
    redirect("/brand-setup");
  }
}
