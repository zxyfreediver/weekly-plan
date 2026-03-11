-- 子任务截止日期：可选，格式 YYYY-MM-DD
ALTER TABLE sub_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
