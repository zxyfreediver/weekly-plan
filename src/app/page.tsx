import { redirect } from "next/navigation";
import { getCategoriesWithStats } from "@/lib/services/category";
import { getCurrentUser } from "@/lib/auth";
import { HomePageClient } from "./HomePageClient";

export default async function HomePage() {
  const userId = await getCurrentUser();
  if (!userId) {
    redirect("/login");
  }
  const categories = await getCategoriesWithStats(userId);

  return <HomePageClient categories={categories} />;
}

