import { getDb } from "@/lib/db";

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

export function getCategoriesWithStats(userId: string): CategoryWithStats[] {
  const db = getDb();
  const stmt = db.prepare<unknown, CategoryWithStats>(
    `
    SELECT
      c.id,
      c.name,
      COALESCE(COUNT(t.id), 0) AS taskCount,
      COALESCE(SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completedCount
    FROM categories c
    LEFT JOIN sub_categories sc ON sc.category_id = c.id
    LEFT JOIN tasks t ON t.sub_category_id = sc.id
    WHERE c.user_id = ?
    GROUP BY c.id, c.name
    ORDER BY c.sort_order, c.created_at
  `,
  );

  return stmt.all(userId);
}

export function getCategorySubCategories(
  categoryId: string,
  userId: string,
): { id: string; name: string; subCategories: SubCategory[] } | null {
  const db = getDb();

  const categoryStmt = db.prepare<
    unknown,
    { id: string; name: string } | undefined
  >(
    `
    SELECT id, name
    FROM categories
    WHERE id = ? AND user_id = ?
  `,
  );

  const category = categoryStmt.get(categoryId, userId);

  if (!category) {
    return null;
  }

  const subStmt = db.prepare<unknown, SubCategory>(
    `
    SELECT
      sc.id,
      sc.name,
      COALESCE(SUM(CASE WHEN t.is_completed = 0 THEN 1 ELSE 0 END), 0) AS pendingCount
    FROM sub_categories sc
    LEFT JOIN tasks t ON t.sub_category_id = sc.id
    WHERE sc.category_id = ?
    GROUP BY sc.id, sc.name
    ORDER BY sc.sort_order, sc.created_at
  `,
  );

  const subCategories = subStmt.all(categoryId);

  return {
    id: category.id,
    name: category.name,
    subCategories,
  };
}

