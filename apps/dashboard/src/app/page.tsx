import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export default async function Home() {
  // Smart redirect: if tenant exists → dashboard, otherwise → onboarding
  const tenant = await prisma.tenant.findFirst();
  
  if (tenant) {
    redirect("/dashboard");
  } else {
    redirect("/brand-setup");
  }
}
