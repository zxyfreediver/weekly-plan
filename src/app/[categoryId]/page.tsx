import { CategoryPageClient } from "./CategoryPageClient";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  return <CategoryPageClient categoryId={categoryId} />;
}

