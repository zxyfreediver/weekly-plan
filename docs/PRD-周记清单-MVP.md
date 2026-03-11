# Product Requirements Document: 周记清单 MVP

## Executive Summary

**Product:** 周记清单（Weekly Journal Checklist）
**Version:** MVP (1.0)
**Document Status:** Draft
**Last Updated:** 2025-03-10

### Product Vision

个人周度任务管理工具，帮助职场人按周记录、分类、完成待办，并支持选择时间段用 AI 总结已完成工作，快速产出周报/月报。

### Success Criteria

- 自用稳定，每周有实际使用
- 核心流程（分类 → 任务 → 划掉完成 → 未完成顺延）顺畅
- 未来可分享给同事/朋友使用

---

## Problem Statement

### Problem Definition

职场人需要在一个地方随时记录工作内容、分类管理、按优先级执行，并按周延续。现有工具要么过于简单（纯待办），要么过于复杂（项目管理），缺少「周度 + 分类 + 优先级 + AI 总结」的一体化方案。

### Impact Analysis

- **User Impact:** 减少遗漏、理清优先级、快速写周报
- **Market Impact:** 个人效率工具，可扩展至小团队
- **Business Impact:** 个人练手项目，暂无商业化

---

## Target Audience

### Primary Persona: 职场人

**Demographics:**
- 年龄：25–40
- 职业：互联网、传统行业白领
- 技术水平：会用 Web 工具

**Psychographics:**
- 习惯按周规划工作
- 需要写周报/月报
- 希望工具简单、专注

**Jobs to Be Done:**
1. 记录待办并分类，不遗漏
2. 标记优先级，专注重要事项
3. 上周未完成自动进入本周
4. 选择时间段，AI 总结已完成工作

**Current Solutions & Pain Points:**

| 当前方案     | 痛点               | 我们的优势           |
|--------------|--------------------|----------------------|
| 纸质/便签    | 易丢、难检索       | 数字化、可搜索       |
| 通用待办 App | 无周度、无分类层级 | 周度 + 多级分类      |
| 项目管理工具 | 过重、学习成本高   | 轻量、专注个人场景   |

### Secondary Personas

- **同事/朋友**：分享后使用，需求与主用户类似

---

## User Stories

### Epic: 周度任务管理

**Primary User Story:**
> 作为职场人，我想要随时记录待办并分类，以便不遗漏工作

**Acceptance Criteria:**
- [ ] 可创建大分类（工作/生活/家庭等）
- [ ] 可在大分类下创建子分类（如 2025年工作、2026年工作，可自定义）
- [ ] 可在子分类下添加周度任务
- [ ] 任务支持编辑、删除

### Supporting User Stories

1. **优先级**
   > 作为职场人，我想要标记任务优先级，以便优先处理重要事项
   - AC：任务可标记为高优先级，高优先级任务有视觉高亮

2. **周度延续**
   > 作为职场人，我想要上周未完成的任务自动进入本周，以便延续工作流
   - AC：每周切换时，未完成任务自动出现在本周列表
   - AC：已完成任务保留在历史，不再回滚

3. **AI 总结**
   > 作为职场人，我想要选择一段时间让 AI 总结已完成工作，以便快速写周报/月报
   - AC：可选择时间范围（如某周、某月）
   - AC：可对该范围内已完成任务发起 AI 总结
   - AC：总结结果可复制/导出

---

## Functional Requirements

### Core Features (MVP — P0)

#### Feature 1: 多级分类

- **Description:** 大分类（工作/生活/家庭）→ 子分类（2025年工作等，可自定义）→ 周度任务
- **User Value:** 按场景和周期组织任务
- **Business Value:** 核心信息架构
- **Acceptance Criteria:**
  - [ ] 可创建、编辑、删除大分类
  - [ ] 可在大分类下创建、编辑、删除子分类
  - [ ] 子分类名称可自定义，不限于时间
- **Dependencies:** 无
- **Estimated Effort:** M

#### Feature 2: 周度任务列表

- **Description:** 在子分类下管理当周任务，主任务 → 子任务 → 进度，支持新增、划掉完成、展开/收起、显示状态
- **User Value:** 核心操作界面
- **Business Value:** 核心功能
- **Acceptance Criteria:**
  - [x] 可添加主任务、子任务、进度
  - [x] 可划掉任务表示完成（视觉 + 状态）
  - [x] 可编辑、删除任务
  - [x] 可切换查看不同周
  - [x] 一键展开/收起、不展示已完成
- **Dependencies:** Feature 1
- **Estimated Effort:** M

#### Feature 3: 任务优先级

- **Description:** 任务可标记为高优先级，高亮显示
- **User Value:** 聚焦重要事项
- **Business Value:** 差异化能力
- **Acceptance Criteria:**
  - [ ] 任务可标记/取消高优先级
  - [ ] 高优先级任务有视觉区分（如高亮、置顶）
- **Dependencies:** Feature 2
- **Estimated Effort:** S

#### Feature 4: 未完成自动同步

- **Description:** 上周未完成任务自动进入本周
- **User Value:** 延续工作流，无需手动迁移
- **Business Value:** 核心体验
- **Acceptance Criteria:**
  - [ ] 切换周时，上周未完成任务自动出现在本周
  - [ ] 已完成任务保留在历史，不重复出现
- **Dependencies:** Feature 2
- **Estimated Effort:** M

### Should Have (P1)

#### Feature 5: AI 总结

- **Description:** 选择时间范围，对已完成任务进行 AI 总结
- **User Value:** 快速写周报/月报
- **Acceptance Criteria:**
  - [ ] 可选择时间范围
  - [ ] 可发起 AI 总结
  - [ ] 总结结果可复制
- **Estimated Effort:** M

#### Feature 6: 按年新建工作区

- **Description:** 新年度可新建工作区，旧数据保留
- **User Value:** 年度隔离，年终总结后重新开始
- **Acceptance Criteria:**
  - [ ] 可新建工作区（如 2026年工作）
  - [ ] 旧工作区数据可查看，不混入新工作区
- **Estimated Effort:** S

### Could Have (P2)

- 多端适配（桌面 / Web / 手机响应式）
- 离线 / 弱网数据同步（PWA）

### Out of Scope (Won't Have)

- 多人协作
- 团队版
- 付费功能

---

## Non-Functional Requirements

### Performance

- **Page Load:** < 3 秒（p95）
- **操作响应:** 即时反馈
- **Concurrent Users:** 支持个人 + 少量分享用户

### Security

- **Authentication:** 本地/简单账号（MVP 可简化）
- **Data Protection:** 数据存储在用户可控环境（自托管）

### Usability

- **Accessibility:** 常规 Web 标准
- **Browser Support:** Chrome, Safari, Firefox, Edge（最新 2 个版本）
- **Mobile Support:** 响应式设计，支持手机浏览器

### Scalability

- **User Growth:** 个人 + 少量分享用户
- **Data Growth:** 按年/按周累积，SQLite 可支撑

---

## Quality Standards (Anti-Vibe Rules)

### Code Quality Requirements

- **Type Safety:** 使用 TypeScript，避免 `any`
- **Architecture:** 逻辑与 UI 分离
- **Error Handling:** 显式错误处理，不吞异常

### Design Quality Requirements

- **Design System:** 简洁、工具感
- **Consistency:** 统一的颜色、间距、交互

### What This Project Will NOT Accept

- 生产环境使用占位内容（Lorem ipsum）
- 超出当前阶段范围的功能
- 跳过基础测试的「简单」改动

---

## UI/UX Requirements

### Design Principles

1. **简洁**：界面干净，减少干扰
2. **高效**：核心操作步骤少
3. **清晰**：层级分明，状态可见

### Information Architecture

```
├── 首页 / 分类列表
│   ├── 工作
│   │   ├── 2025年工作
│   │   │   └── 周度任务
│   │   └── 2026年工作
│   │       └── 周度任务
│   ├── 生活
│   └── 家庭
├── 周度任务视图
│   ├── 任务列表（含优先级、完成状态）
│   └── 周切换
└── AI 总结
    ├── 时间范围选择
    └── 总结结果
```

### Key User Flows

#### Flow 1: 记录并完成任务

```
进入分类 → 选择子分类 → 查看本周任务 → 添加任务 → 标记优先级 → 划掉完成
```

#### Flow 2: 周度延续

```
本周结束 → 切换至下周 → 未完成任务自动出现 → 继续完成
```

#### Flow 3: AI 总结

```
选择子分类 → 选择时间范围 → 发起 AI 总结 → 查看/复制结果
```

---

## Success Metrics

### North Star Metric

**周活跃使用**：每周至少有一次任务记录或完成操作

### MVP Metrics (First 30 Days)

| Category   | Metric       | Target      | Measurement   |
|------------|--------------|-------------|---------------|
| Activation | 首次创建任务 | 1           | 产品内统计    |
| Engagement | 每周使用次数 | ≥ 3         | 产品内统计    |
| Retention  | 连续使用周数 | ≥ 2         | 产品内统计    |
| Revenue    | -            | 无          | -             |

---

## Constraints & Assumptions

### Constraints

- **Budget:** 个人项目，尽量免费/低成本
- **Timeline:** 无硬性截止日期
- **Resources:** 个人开发
- **Technical:** Next.js + PWA + SQLite + Docker 自托管

### Assumptions

- 用户习惯按周规划
- 单用户或少量分享用户，无需复杂权限
- AI 总结为增值功能，可后续完善

### Open Questions

- 认证方式：本地存储 vs 简单账号
- AI 总结 API 选型与成本

---

## MVP Definition of Done

The MVP is ready when:

- [ ] 所有 P0 功能可用
- [ ] 基础错误处理到位
- [ ] 桌面和手机浏览器可正常使用
- [ ] 完整用户流程可走通（分类 → 任务 → 完成 → 顺延）
- [ ] 可部署到自托管环境（Docker）
- [ ] 自用测试通过

---

## Next Steps

1. 评审并确认本 PRD
2. 创建 Technical Design Document（Part 3）
3. 搭建开发环境
4. 按 PRD 实现 MVP
5. 自用验证并迭代

---

*Document created: 2025-03-10*
*Status: Draft — Ready for Technical Design*
