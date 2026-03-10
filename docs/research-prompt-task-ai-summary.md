# 深度调研请求：个人任务管理 + AI 总结 Web 应用

## Deep Research Request: 个人任务管理 + AI 总结 Web 应用

<context>
我需要针对「个人任务管理 + AI 总结」Web 应用做技术调研，用于个人练手项目。

**技术背景：**
- 技术栈：Next.js + PWA + SQLite + Docker
- 部署：阿里云自托管
- 多端：桌面、Web、手机（响应式 Web，无需原生 App）
- 约束：自建数据库、采用 PWA
</context>

<instructions>
### 调研目标

为个人练手项目提供可落地的技术方案，重点在架构设计和实现路径。

### 具体问题

1. **Next.js 多端适配最佳实践**
   - 桌面、Web、手机端响应式设计模式
   - 断点、布局、触控与键盘交互
   - 性能与加载优化

2. **PWA 能力与 Next.js 集成**
   - PWA 离线能力、Service Worker 策略
   - 安装体验（添加到主屏幕、安装提示）
   - 多端适配（桌面 PWA vs 移动端 PWA）
   - 与 Next.js App Router 的集成方式（next-pwa、workbox 等）

3. **离线 / 弱网数据同步**
   - 本地优先（Local-first）架构思路
   - 乐观更新（Optimistic Updates）实现
   - CRDT 或其他冲突解决方案（如适用）
   - IndexedDB / SQLite WASM 等本地存储选型
   - 同步策略：何时同步、冲突处理、重试机制

4. **SQLite 选型与部署**
   - 在 Next.js + Docker 中的使用方式
   - 服务端 SQLite vs 客户端 SQLite（sql.js / Turso 等）
   - 数据持久化、备份、迁移
   - 阿里云上的部署实践（Docker 镜像、数据卷）

5. **AI 总结功能集成**
   - 适合任务总结的 API（OpenAI、Claude、本地模型等）
   - 调用方式、缓存、降级策略
   - 成本与延迟的权衡

### 范围定义

- **包含：** PWA、自建数据库、离线同步、Next.js 架构、Docker 部署
- **排除：** 原生 App、第三方 BaaS（Firebase/Supabase）、微服务架构

### 深度要求

- **Technical Architecture：** Deep — 架构图、选型依据、权衡分析
- **Implementation Options：** Deep — 具体方案、库、示例代码
- **其他领域：** Surface

### 信息来源优先级

1. 技术文档
2. GitHub 仓库
3. 案例研究
4. 行业报告
5. 竞品分析
6. 用户论坛 / Reddit
7. 学术论文

### 输出要求

- 提供架构说明，可配合 Mermaid 或文字描述
- 对主要技术决策给出 2–3 个备选方案及 pros/cons
- **重要结论需注明来源 URL 和访问日期**
- 如不同来源有冲突或不确定，需明确标注
- 包含可直接参考的代码示例或仓库链接
</instructions>

<output_format>
- 以中文输出
- 使用表格做方案对比
- 架构部分用 Mermaid 或清晰文字描述
- 每个重要推荐附来源 URL 和访问日期
- 明确标注存在争议或不确定的信息
</output_format>
