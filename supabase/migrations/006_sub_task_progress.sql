-- 子任务进度：每个子任务可有多个进度项
CREATE TABLE IF NOT EXISTS sub_task_progress (
  id TEXT PRIMARY KEY,
  sub_task_id TEXT NOT NULL REFERENCES sub_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  assignee TEXT DEFAULT '',
  is_priority BOOLEAN DEFAULT FALSE,
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_task_progress_sub_task_id ON sub_task_progress(sub_task_id);
