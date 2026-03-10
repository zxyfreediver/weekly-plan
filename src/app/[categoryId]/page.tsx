import { notFound, redirect } from "next/navigation";
import { getCategorySubCategories } from "@/lib/services/category";
import { getCurrentUser } from "@/lib/auth";
import { CategoryPageClient } from "./CategoryPageClient";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const userId = await getCurrentUser();
  if (!userId) {
    redirect("/login");
  }
  const data = getCategorySubCategories(categoryId, userId);

  if (!data) {
    return notFound();
  }

  return (
    <CategoryPageClient
      categoryId={categoryId}
      categoryName={data.name}
      subCategories={data.subCategories}
    />
  );
}

