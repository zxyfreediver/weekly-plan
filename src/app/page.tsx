import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HomePageClient } from "./HomePageClient";

export default async function HomePage() {
  const userId = await getCurrentUser();

  if (!userId) {
    redirect("/login");
  }

  return <HomePageClient />;
}

