-- 周记清单 Supabase 完整表结构（合并版）
-- 在 Supabase Dashboard -> SQL Editor 中执行，或使用 supabase db push

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 默认用户（AUTH_USERNAME 需与此 id 一致）
INSERT INTO users (id, name)
VALUES ('admin', 'admin')
ON CONFLICT (id) DO NOTHING;

-- 3. 分类
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- 4. 子分类
CREATE TABLE IF NOT EXISTS sub_categories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_categories_category_id ON sub_categories(category_id);

-- 5. 主任务
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  sub_category_id TEXT NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT FALSE,
  week_start DATE NOT NULL,
  source_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_sub_category_week ON tasks(sub_category_id, week_start);

-- 6. 子任务
CREATE TABLE IF NOT EXISTS sub_tasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  description TEXT DEFAULT '',
  assignee TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT FALSE,
  is_priority BOOLEAN DEFAULT FALSE,
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  source_sub_task_id TEXT REFERENCES sub_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_tasks_task_id ON sub_tasks(task_id);

-- 6. 子任务进度
CREATE TABLE IF NOT EXISTS sub_task_progress (
  id TEXT PRIMARY KEY,
  sub_task_id TEXT NOT NULL REFERENCES sub_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  assignee TEXT DEFAULT '',
  is_priority BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  source_progress_id TEXT REFERENCES sub_task_progress(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_task_progress_sub_task_id ON sub_task_progress(sub_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_task_id ON tasks(source_task_id);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_source ON sub_tasks(source_sub_task_id);
CREATE INDEX IF NOT EXISTS idx_sub_task_progress_source ON sub_task_progress(source_progress_id);
