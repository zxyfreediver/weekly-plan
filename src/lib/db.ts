import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "db.sqlite");

let db: Database.Database | null = null;
let initialized = false;

function initDb(instance: Database.Database) {
  instance.pragma("journal_mode = WAL");

  instance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sub_categories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      sub_category_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      is_priority INTEGER DEFAULT 0,
      week_start DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const row = instance
    .prepare("SELECT COUNT(*) as count FROM categories")
    .get() as { count: number };

  if (row.count === 0) {
    const now = new Date().toISOString();
    const demoUserId = "demo-user";

    const insertUser = instance.prepare(`
      INSERT OR IGNORE INTO users (id, email, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertUser.run(demoUserId, "demo@example.com", "Demo 用户", now, now);

    const insertCategory = instance.prepare(`
      INSERT INTO categories (id, user_id, name, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertCategory.run("work", demoUserId, "工作", 1, now, now);
    insertCategory.run("life", demoUserId, "生活", 2, now, now);
    insertCategory.run("family", demoUserId, "家庭", 3, now, now);

    const insertSubCategory = instance.prepare(`
      INSERT INTO sub_categories (id, category_id, name, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertSubCategory.run("work-2025", "work", "2025年工作", 1, now, now);
    insertSubCategory.run("work-2026", "work", "2026年工作", 2, now, now);
    insertSubCategory.run("life-2025", "life", "2025年生活", 1, now, now);
    insertSubCategory.run("family-2025", "family", "2025年家庭", 1, now, now);

    const insertTask = instance.prepare(`
      INSERT INTO tasks (
        id,
        sub_category_id,
        content,
        is_completed,
        is_priority,
        week_start,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const weekStart = "2025-03-03";

    insertTask.run(
      "task-1",
      "work-2025",
      "准备下周会议议程",
      0,
      1,
      weekStart,
      now,
      now
    );
    insertTask.run(
      "task-2",
      "work-2025",
      "完成本周项目进度报告",
      1,
      0,
      weekStart,
      now,
      now
    );
    insertTask.run(
      "task-3",
      "work-2025",
      "整理季度预算草案",
      0,
      0,
      weekStart,
      now,
      now
    );
  }
}

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
  }
  if (!initialized && db) {
    initDb(db);
    initialized = true;
  }
  return db;
}

