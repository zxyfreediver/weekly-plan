-- 添加 completed_at 字段用于记录任务完成时间
-- 用于高亮显示24小时内刚完成的任务

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE sub_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
