-- 建立 categories.user_id 与 users.id 的外键关联
-- 执行前请确保 003_default_user.sql 已执行
-- 若 categories 中存在 user_id 不在 users 表的记录，需先插入对应用户或删除该分类

ALTER TABLE categories
ADD CONSTRAINT fk_categories_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
