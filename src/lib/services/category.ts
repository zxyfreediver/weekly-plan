import { supabase } from "@/lib/supabase";

export type CategoryWithStats = {
  id: string;
  name: string;
  taskCount: number;
  completedCount: number;
};

export type SubCategory = {
  id: string;
  name: string;
  pendingCount: number;
};

export async function getCategoriesWithStats(
  userId: string,
): Promise<CategoryWithStats[]> {
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId)
    .order("sort_order")
    .order("created_at");

  if (!categories?.length) return [];

  const result: CategoryWithStats[] = [];
  for (const c of categories) {
    const { data: subs } = await supabase
      .from("sub_categories")
      .select("id")
      .eq("category_id", c.id);
    const subIds = (subs ?? []).map((s) => s.id);
    if (subIds.length === 0) {
      result.push({
        id: c.id,
        name: c.name,
        taskCount: 0,
        completedCount: 0,
      });
      continue;
    }
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, is_completed")
      .in("sub_category_id", subIds);
    const taskCount = tasks?.length ?? 0;
    const completedCount =
      tasks?.filter((t) => t.is_completed).length ?? 0;
    result.push({
      id: c.id,
      name: c.name,
      taskCount,
      completedCount,
    });
  }
  return result;
}

export async function getCategorySubCategories(
  categoryId: string,
  userId: string,
): Promise<{ id: string; name: string; subCategories: SubCategory[] } | null> {
  const { data: category } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .single();

  if (!category) return null;

  const { data: subs } = await supabase
    .from("sub_categories")
    .select("id, name")
    .eq("category_id", categoryId)
    .order("sort_order")
    .order("created_at");

  const subCategories: SubCategory[] = [];
  for (const sc of subs ?? []) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, is_completed")
      .eq("sub_category_id", sc.id);
    const pendingCount =
      tasks?.filter((t) => !t.is_completed).length ?? 0;
    subCategories.push({
      id: sc.id,
      name: sc.name,
      pendingCount,
    });
  }

  return {
    id: category.id,
    name: category.name,
    subCategories,
  };
}

export async function updateSubCategory(
  subCategoryId: string,
  userId: string,
  name: string,
): Promise<boolean> {
  const { data: subCat } = await supabase
    .from("sub_categories")
    .select("id, category_id")
    .eq("id", subCategoryId)
    .single();

  if (!subCat) return false;

  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("id", subCat.category_id)
    .eq("user_id", userId)
    .single();

  if (!cat) return false;

  await supabase
    .from("sub_categories")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", subCategoryId);
  return true;
}
