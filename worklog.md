# 笔境 AI - 工作日志

## 项目当前状态描述/判断

**笔境 AI** 是一个基于 Next.js 16 的网文创作 Agent 系统平台，使用 NVIDIA NIM API 作为大模型服务，部署到 Vercel。

### 核心功能
- **Dashboard**: 小说项目管理（创建/查看/删除）
- **Workspace**: 12步创作流程（步骤生成/内容管理）
- **Reader**: 小说阅读器（章节阅读）
- **Agent Console**: 智能体控制台（多Agent对话/技能调用）
- **Model Selector**: NVIDIA 模型快速切换（新增，Header 下拉选择器）
- **Model Settings**: NVIDIA 模型详细配置（完整 Dialog，高级设置）

### 技术栈
- **前端**: Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
- **状态管理**: Zustand + TanStack Query
- **数据库**: Prisma ORM (SQLite 本地 / PostgreSQL Vercel 生产)
- **AI**: NVIDIA NIM API (OpenAI 兼容接口)
- **部署**: Vercel (自动部署)

### 数据库架构
- 本地开发: SQLite (file:./db/custom.db)
- Vercel 生产: PostgreSQL (Neon) via POSTGRES_PRISMA_URL
- 双 schema 设计: schema.prisma (SQLite) / schema.postgres.prisma (PostgreSQL)

---

## 当前目标/已完成的修改/验证结果

### 最新修改：添加模型快速选择器（Model Selector）

用户请求：增加一个模型选择器，可以自由选择支持的 NVIDIA 模型。

#### 1. 新建 `src/components/novel/model-selector.tsx`
- 紧凑的下拉选择器组件，直接嵌入 Header
- 显示当前模型名称和提供商 Badge
- 支持搜索过滤（名称、ID、提供商、描述）
- 按类别分组展示模型（旗舰/均衡/快速/专业）
- 每个类别有独立颜色和图标
- 提供商彩色 Badge（Nvidia/Meta/Mistral/Google/Microsoft/Alibaba/DeepSeek）
- 显示模型特性标签（视觉/函数调用/上下文长度）
- 点击外部自动关闭，打开时自动聚焦搜索框
- 保留"高级设置"入口跳转到完整 ModelSettingsDialog

#### 2. 更新 `src/components/novel/header.tsx`
- 移除旧的设置齿轮按钮
- 新增 `ModelSelector` 组件嵌入 Header 右侧操作区
- 清理未使用的 `setSettingsOpen`、`selectedModel` 变量

#### 3. 更新后端 API 路由（4个）
所有 AI 调用路由均新增 `model` 参数支持：
- `src/app/api/novels/[id]/generate/route.ts` — 步骤生成
- `src/app/api/novels/[id]/chat/route.ts` — 对话聊天
- `src/app/api/novels/[id]/agent/route.ts` — Agent 对话
- `src/app/api/novels/[id]/chapters/route.ts` — 章节生成

实现方式：从 request body 提取 `model` 参数，传递给 `ai.chat.completions.create()`。未指定时使用默认模型。

#### 4. 更新前端 API 调用（4处）
所有前端 AI 请求均传递 `selectedModel`：
- `src/components/novel/generate-step-dialog.tsx` — generate API
- `src/components/novel/workspace.tsx` — chat API + chapters API
- `src/components/novel/agent-console.tsx` — agent API

#### 5. 支持的模型（22个）
- **Nvidia 自研** (4): Nemotron Ultra 253B, Nemotron 70B, Nemotron-4 340B, Nemotron 51B
- **Meta Llama** (5): Llama 3.1 405B/70B/8B, Llama 3.2 3B/11B Vision/90B Vision
- **Mistral** (4): Mixtral 8x22B/8x7B, Mistral Large 2, Nemo 7B
- **Google** (2): Gemma 2 27B/9B
- **Microsoft** (3): Phi-3 Medium/Mini, Phi-3.5 Mini
- **Qwen 通义千问** (3): Qwen 2.5 72B/32B/7B
- **DeepSeek** (2): DeepSeek R1, R1 Distill 70B

### 验证结果
- ✅ ESLint 检查通过（0 errors, 0 warnings）
- ✅ 开发服务器运行正常
- ✅ 模型选择器 UI 在 Header 正确显示
- ✅ 模型选择持久化（Zustand persist to localStorage）

---

## 未解决问题或风险，建议下一阶段优先事项

### 待确认
1. **线上模型切换测试**: 需要在 Vercel 环境验证不同模型 API 调用是否正常
2. **模型可用性**: 部分 NVIDIA NIM 模型可能需要额外授权或可能下线

### 建议优先事项
1. 优化模型选择器移动端体验（当前宽度 420px 在小屏可能溢出）
2. 添加模型测试/连通性检测功能（验证 API Key 对特定模型是否可用）
3. 修复 generate API 500 错误（上一次遗留问题，可能是 Vercel Postgres 表未初始化）
4. 优化 Agent 系统前端交互
5. 添加更多创作技能和 AI 功能
