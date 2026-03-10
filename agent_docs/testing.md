# Testing Strategy

## 当前阶段

MVP 初期，以手动验证为主，逐步补充自动化测试。

## 验证方式

### 手动检查

- 每个功能实现后，在浏览器中走一遍完整流程
- 检查：分类 CRUD、任务 CRUD、划掉完成、周切换、未完成同步

### Lint

```bash
npm run lint
```

提交前必须通过。

### 单元测试 (可选，后续补充)

- 工具函数
- Service 层业务逻辑

### E2E (可选，后续补充)

- Playwright 覆盖主流程

## Pre-commit Hooks

建议配置：

- `lint-staged` 运行 ESLint + Prettier
- 可选：`npm test`

## Verification Loop

1. 实现功能
2. 运行 `npm run lint`
3. 手动测试核心流程
4. 修复问题后再继续
