-- 默认用户：确保 users 表中有与 AUTH_USERNAME 对应的账号
-- 请确保 .env 中 AUTH_USERNAME=zhaoxingyu 与此处一致

INSERT INTO users (id, name)
VALUES ('zhaoxingyu', 'zhaoxingyu')
ON CONFLICT (id) DO NOTHING;
