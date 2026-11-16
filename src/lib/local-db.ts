/**
 * 本地文件数据库 —— 仅开发模式使用。
 *
 * 用一个极简的查询构造器模拟项目里用到的 @supabase/supabase-js 子集：
 *   from(table).select()/insert()/update()/delete()
 *   .eq() .in() .gte() .lte() .order() .limit() .single() .maybeSingle()
 *
 * 数据全部来自 data/db.json（由 .temp/export-supabase.mjs 从远程导出），
 * 读写都直接落到这个文件，保证多个路由模块之间数据一致。
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;

const TABLES = [
  "users",
  "categories",
  "sub_categories",
  "tasks",
  "sub_tasks",
  "sub_task_progress",
] as const;

type DbShape = Record<string, Row[]>;

function dbPath(): string {
  return path.join(process.cwd(), "data", "db.json");
}

function emptyDb(): DbShape {
  const db: DbShape = {};
  for (const t of TABLES) db[t] = [];
  return db;
}

function load(): DbShape {
  const p = dbPath();
  try {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const db = emptyDb();
    for (const t of TABLES) {
      const v = parsed[t];
      db[t] = Array.isArray(v) ? (v as Row[]) : [];
    }
    return db;
  } catch {
    // 文件不存在或损坏时返回空库（首次启动）
    return emptyDb();
  }
}

function persist(db: DbShape): void {
  const p = dbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(db, null, 2), "utf8");
}

function withDefaults(table: string, input: Row): Row {
  const now = new Date().toISOString();
  const base: Row = { id: input.id ?? randomUUID() };
  switch (table) {
    case "users":
      base.email = null;
      base.password_hash = null;
      base.name = null;
      base.created_at = now;
      base.updated_at = now;
      break;
    case "categories":
      base.user_id = "";
      base.name = "";
      base.sort_order = 0;
      base.created_at = now;
      base.updated_at = now;
      break;
    case "sub_categories":
      base.category_id = "";
      base.name = "";
      base.sort_order = 0;
      base.created_at = now;
      base.updated_at = now;
      break;
    case "tasks":
      base.sub_category_id = "";
      base.content = "";
      base.description = "";
      base.is_completed = false;
      base.completed_at = null;
      base.week_start = "";
      base.source_task_id = null;
      base.created_at = now;
      base.updated_at = now;
      break;
    case "sub_tasks":
      base.task_id = "";
      base.content = "";
      base.description = "";
      base.assignee = "";
      base.is_completed = false;
      base.is_priority = false;
      base.due_date = null;
      base.sort_order = 0;
      base.source_sub_task_id = null;
      base.created_at = now;
      base.updated_at = now;
      break;
    case "sub_task_progress":
      base.sub_task_id = "";
      base.content = "";
      base.assignee = "";
      base.is_priority = false;
      base.is_completed = false;
      base.due_date = null;
      base.sort_order = 0;
      base.source_progress_id = null;
      base.created_at = now;
      base.updated_at = now;
      break;
  }
  return { ...base, ...input, id: input.id ?? base.id };
}

type Filter =
  | { type: "eq"; col: string; val: any }
  | { type: "in"; col: string; val: any[] }
  | { type: "gte"; col: string; val: any }
  | { type: "lte"; col: string; val: any };

type Order = { col: string; asc: boolean };

function matches(row: Row, filters: Filter[]): boolean {
  for (const f of filters) {
    const v = row[f.col];
    if (f.type === "eq") {
      if (v !== f.val) return false;
    } else if (f.type === "in") {
      if (!Array.isArray(f.val) || !f.val.includes(v)) return false;
    } else if (f.type === "gte") {
      if (!(v >= f.val)) return false;
    } else if (f.type === "lte") {
      if (!(v <= f.val)) return false;
    }
  }
  return true;
}

function sortRows(rows: Row[], orders: Order[]): Row[] {
  if (orders.length === 0) return rows;
  const copy = rows.slice();
  copy.sort((a, b) => {
    for (const o of orders) {
      const av = a[o.col];
      const bv = b[o.col];
      let r = 0;
      if (av === bv) r = 0;
      else if (av === null || av === undefined) r = 1;
      else if (bv === null || bv === undefined) r = -1;
      else r = av < bv ? -1 : av > bv ? 1 : 0;
      if (r !== 0) return o.asc ? r : -r;
    }
    return 0;
  });
  return copy;
}

/** 模拟 Postgres 的 ON DELETE CASCADE */
function removeByIds(db: DbShape, table: string, ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  db[table] = (db[table] ?? []).filter((r) => !set.has(r.id));
}

function cascadeDelete(db: DbShape, table: string, ids: string[]): void {
  if (ids.length === 0) return;
  const set = new Set(ids);
  if (table === "categories") {
    const subIds = (db.sub_categories ?? [])
      .filter((r) => set.has(r.category_id))
      .map((r) => r.id);
    cascadeDelete(db, "sub_categories", subIds);
  } else if (table === "sub_categories") {
    const taskIds = (db.tasks ?? [])
      .filter((r) => set.has(r.sub_category_id))
      .map((r) => r.id);
    cascadeDelete(db, "tasks", taskIds);
  } else if (table === "tasks") {
    const stIds = (db.sub_tasks ?? [])
      .filter((r) => set.has(r.task_id))
      .map((r) => r.id);
    cascadeDelete(db, "sub_tasks", stIds);
  } else if (table === "sub_tasks") {
    const pIds = (db.sub_task_progress ?? [])
      .filter((r) => set.has(r.sub_task_id))
      .map((r) => r.id);
    removeByIds(db, "sub_task_progress", pIds);
  }
  removeByIds(db, table, ids);
}

type Op = "select" | "insert" | "update" | "delete";

class LocalQueryBuilder implements PromiseLike<any> {
  private table: string;
  private op: Op = "select";
  private payload: any = null;
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitN: number | null = null;
  private singleMode: "single" | "maybe" | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: string): this {
    this.op = "select";
    return this;
  }

  insert(data: Row | Row[]): this {
    this.op = "insert";
    this.payload = data;
    return this;
  }

  update(data: Row): this {
    this.op = "update";
    this.payload = data;
    return this;
  }

  delete(): this {
    this.op = "delete";
    return this;
  }

  eq(col: string, val: any): this {
    this.filters.push({ type: "eq", col, val });
    return this;
  }

  in(col: string, val: any[]): this {
    this.filters.push({ type: "in", col, val });
    return this;
  }

  gte(col: string, val: any): this {
    this.filters.push({ type: "gte", col, val });
    return this;
  }

  lte(col: string, val: any): this {
    this.filters.push({ type: "lte", col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orders.push({ col, asc: !(opts && opts.ascending === false) });
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  single(): this {
    this.singleMode = "single";
    return this;
  }

  maybeSingle(): this {
    this.singleMode = "maybe";
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?:
      | ((value: any) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): { data: any; error: any } {
    const db = load();
    if (!db[this.table]) db[this.table] = [];
    const tableRows = db[this.table];

    if (this.op === "insert") {
      const items: Row[] = Array.isArray(this.payload)
        ? this.payload
        : [this.payload];
      const inserted = items.map((it) => withDefaults(this.table, it));
      tableRows.push(...inserted);
      persist(db);
      return { data: inserted.length === 1 ? inserted[0] : inserted, error: null };
    }

    if (this.op === "update") {
      const matched = tableRows.filter((r) => matches(r, this.filters));
      for (const r of matched) Object.assign(r, this.payload);
      if (matched.length > 0) persist(db);
      return { data: matched, error: null };
    }

    if (this.op === "delete") {
      const del = tableRows.filter((r) => matches(r, this.filters));
      const ids = del.map((r) => r.id);
      if (ids.length > 0) {
        cascadeDelete(db, this.table, ids);
        persist(db);
      }
      return { data: null, error: null };
    }

    // select
    let rows = tableRows.filter((r) => matches(r, this.filters));
    rows = sortRows(rows, this.orders);
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    const data = rows.map((r) => ({ ...r }));

    if (this.singleMode === "single") {
      if (data.length === 1) return { data: data[0], error: null };
      return {
        data: null,
        error: {
          message: `single(): expected 1 row, got ${data.length}`,
          code: "PGRST116",
        },
      };
    }
    if (this.singleMode === "maybe") {
      if (data.length === 1) return { data: data[0], error: null };
      if (data.length === 0) return { data: null, error: null };
      return {
        data: null,
        error: {
          message: `maybeSingle(): expected <=1 row, got ${data.length}`,
          code: "PGRST116",
        },
      };
    }

    return { data, error: null };
  }
}

export function createLocalClient() {
  return {
    from(table: string) {
      return new LocalQueryBuilder(table);
    },
  };
}