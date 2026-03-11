# AGENTS.md — 周记清单 Master Plan

## Project Overview

**App:** 周记清单（Weekly Journal Checklist）
**Goal:** 个人周度任务管理 + AI 总结，帮助职场人按周记录、分类、完成待办
**Stack:** Next.js 16 + Tailwind CSS + Supabase + Vercel + PWA
**Current Phase:** Phase 2 — Core Features 已完成，部署 Vercel+Supabase

## How I Should Think

1. **Understand Intent First**: 回答前先理解用户真实需求
2. **Ask If Unsure**: 关键信息缺失时先询问再动手
3. **Plan Before Coding**: 先提出方案，获得确认后再实现
4. **Verify After Changes**: 每次修改后运行测试/lint 或手动检查
5. **Explain Trade-offs**: 推荐方案时说明备选和权衡

## Plan → Execute → Verify

1. **Plan:** 简要说明实现思路，获得确认后再编码
2. **Plan Mode:** 若工具支持 Plan/Reflect 模式，先使用该模式
3. **Execute:** 一次只实现一个功能
4. **Verify:** 每个功能完成后运行测试/lint，修复问题后再继续

## Context & Memory

- `AGENTS.md` 和 `agent_docs/` 为活文档，随项目演进更新
- 使用持久化配置（CLAUDE.md、.cursorrules）维护项目规则
- 项目扩展时更新命令、约定、约束

## Optional Roles (If Supported)

- **Explorer:** 并行扫描代码库或文档获取相关信息
- **Builder:** 按已批准方案实现功能
- **Tester:** 运行测试/lint 并报告失败

## Testing & Verification

- 遵循 `agent_docs/testing.md` 的测试策略
- 若无测试，先提出最小可验证方案再继续
- 验证失败时不要继续推进

## Checkpoints & Pre-Commit Hooks

- 里程碑完成后创建 checkpoint/commit
- 提交前确保 pre-commit hooks 通过

## Context Files

需要时按需加载：
- `agent_docs/tech_stack.md` — 技术栈与库
- `agent_docs/code_patterns.md` — 代码风格与模式
- `agent_docs/project_brief.md` — 项目规则与约定
- `agent_docs/product_requirements.md` — 完整 PRD
- `agent_docs/testing.md` — 验证策略与命令

## Current State (Update This!)

**Last Updated:** 2025-03-10
**Working On:** -
**Recently Completed:** 子任务与进度、一键展开/收起、不展示已完成、Supabase 脚本合并（默认用户 admin）、文档更新
**Blocked By:** None

## Roadmap

### Phase 1: Foundation ✅
- [x] 初始化 Next.js 项目
- [x] 配置 Tailwind CSS
- [x] Supabase 数据库与 schema
- [x] 自建 Cookie 认证
- [x] PWA 配置

### Phase 2: Core Features ✅
- [x] 多级分类（大分类 + 子分类）
- [x] 周度任务列表（主任务 → 子任务 → 进度，增删改、划掉完成）
- [x] 任务优先级（高亮，子任务/进度层）
- [x] 任务描述（2 行预览 + 展开编辑）
- [x] 一键展开/收起、不展示已完成
- [ ] 未完成自动同步到本周

### Phase 3: Enhancement
- [x] AI 总结页预留
- [x] 按年新建工作区（子分类）
- [ ] AI 总结接入
- [ ] 简单统计

### Phase 4: Polish + Deploy ✅
- [x] PWA 配置
- [x] Vercel + Supabase 部署
- [ ] Docker 备选部署

## What NOT To Do

- 未经明确确认删除文件
- 修改数据库 schema 未准备备份/迁移方案
- 添加当前阶段未规划的功能
- 以「简单」为由跳过测试
- 绕过失败测试或 pre-commit hooks
- 使用已废弃的库或模式
