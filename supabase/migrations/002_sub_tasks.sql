-- 子任务功能：每个主任务可有多个子任务
-- 主任务移除 is_priority，子任务有 description、assignee、is_priority

-- 1. 新建 sub_tasks 表
CREATE TABLE IF NOT EXISTS sub_tasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  description TEXT DEFAULT '',
  assignee TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT FALSE,
  is_priority BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_tasks_task_id ON sub_tasks(task_id);

-- 2. 从 tasks 移除 is_priority（PostgreSQL 用 ALTER DROP COLUMN）
ALTER TABLE tasks DROP COLUMN IF EXISTS is_priority;
