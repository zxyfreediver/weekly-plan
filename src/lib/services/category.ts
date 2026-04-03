import { supabase } from "@/lib/supabase";

const SUPABASE_BATCH_LIMIT = 1000;

async function batchQuery<T, R>(
  ids: T[],
  batchSize: number,
  queryFn: (batch: T[]) => Promise<R[]>,
  merge: (acc: R[], batch: R[]) => R[] = (acc, batch) => [...acc, ...batch],
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await queryFn(batch);
    results.push(...merge(results, batchResults));
  }
  return results;
}

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

  const categoryIds = categories.map((category) => category.id);
  const { data: subs } = await supabase
    .from("sub_categories")
    .select("id, category_id")
    .in("category_id", categoryIds);

  const subCategoryIdToCategoryId = new Map<string, string>();
  for (const subCategory of subs ?? []) {
    subCategoryIdToCategoryId.set(subCategory.id, subCategory.category_id);
  }

  const subCategoryIds = Array.from(subCategoryIdToCategoryId.keys());
  const statsByCategoryId = new Map<
    string,
    { taskCount: number; completedCount: number }
  >();

  if (subCategoryIds.length > 0) {
    const tasks = await batchQuery(
      subCategoryIds,
      SUPABASE_BATCH_LIMIT,
      async (batch) => {
        const { data } = await supabase
          .from("tasks")
          .select("sub_category_id, is_completed")
          .in("sub_category_id", batch);
        return data ?? [];
      },
    );

    for (const task of tasks) {
      const categoryId = subCategoryIdToCategoryId.get(task.sub_category_id);

      if (!categoryId) {
        continue;
      }

      const current = statsByCategoryId.get(categoryId) ?? {
        taskCount: 0,
        completedCount: 0,
      };

      current.taskCount += 1;
      if (task.is_completed) {
        current.completedCount += 1;
      }
      statsByCategoryId.set(categoryId, current);
    }
  }

  return categories.map((category) => {
    const stats = statsByCategoryId.get(category.id);
    return {
      id: category.id,
      name: category.name,
      taskCount: stats?.taskCount ?? 0,
      completedCount: stats?.completedCount ?? 0,
    };
  });
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

  const subCategoryIds = (subs ?? []).map((subCategory) => subCategory.id);
  const pendingCountBySubCategoryId = new Map<string, number>();

  if (subCategoryIds.length > 0) {
    const tasks = await batchQuery(
      subCategoryIds,
      SUPABASE_BATCH_LIMIT,
      async (batch) => {
        const { data } = await supabase
          .from("tasks")
          .select("sub_category_id, is_completed")
          .in("sub_category_id", batch);
        return data ?? [];
      },
    );

    for (const task of tasks) {
      if (task.is_completed) {
        continue;
      }

      pendingCountBySubCategoryId.set(
        task.sub_category_id,
        (pendingCountBySubCategoryId.get(task.sub_category_id) ?? 0) + 1,
      );
    }
  }

  const subCategories: SubCategory[] = (subs ?? []).map((subCategory) => ({
    id: subCategory.id,
    name: subCategory.name,
    pendingCount: pendingCountBySubCategoryId.get(subCategory.id) ?? 0,
  }));

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
