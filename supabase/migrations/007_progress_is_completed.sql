-- 进度可勾选已完成
ALTER TABLE sub_task_progress ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;
