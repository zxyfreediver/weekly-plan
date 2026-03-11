-- 一键导入上周未完成：溯源字段，用于数据分离与 AI 总结去重
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE sub_tasks ADD COLUMN IF NOT EXISTS source_sub_task_id TEXT REFERENCES sub_tasks(id) ON DELETE SET NULL;
ALTER TABLE sub_task_progress ADD COLUMN IF NOT EXISTS source_progress_id TEXT REFERENCES sub_task_progress(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_source_task_id ON tasks(source_task_id);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_source ON sub_tasks(source_sub_task_id);
CREATE INDEX IF NOT EXISTS idx_sub_task_progress_source ON sub_task_progress(source_progress_id);
