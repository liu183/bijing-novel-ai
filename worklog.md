# 笔境 AI - 工作日志

## 项目当前状态描述/判断

**笔境 AI** 是一个基于 Next.js 16 的网文创作 Agent 系统平台，支持多服务商大模型（Nvidia NIM + 智谱 GLM），部署到 Vercel。

### 核心功能
- **Dashboard**: 小说项目管理（创建/查看/删除）
- **Workspace**: 12步创作流程（步骤生成/内容管理）
- **Reader**: 小说阅读器（章节阅读）
- **Agent Console**: 智能体控制台（多Agent对话/技能调用）
- **Model Selector**: 多服务商模型快速切换（Header 下拉选择器，30个模型）
- **Model Settings**: 模型详细配置（完整 Dialog，高级设置）

### 技术栈
- **前端**: Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
- **状态管理**: Zustand + TanStack Query
- **数据库**: Prisma ORM (SQLite 本地 / PostgreSQL Vercel 生产)
- **AI**: 多服务商统一调用层（Nvidia NIM + 智谱 GLM，OpenAI 兼容接口）
- **部署**: Vercel (自动部署)

### 数据库架构
- 本地开发: SQLite (file:./db/custom.db)
- Vercel 生产: PostgreSQL (Neon) via POSTGRES_PRISMA_URL
- 双 schema 设计: schema.prisma (SQLite) / schema.postgres.prisma (PostgreSQL)

---

## 当前目标/已完成的修改/验证结果

### 最新修改：添加智谱 GLM 模型服务商

用户请求：使用提供的 API Key 添加 GLM 模型服务商。

#### 1. 重构 `src/lib/ai/models.ts` — 多服务商模型架构
- 新增 `PROVIDER_API_BASE` 映射表：Nvidia 系列走 `integrate.api.nvidia.com`，GLM 走 `open.bigmodel.cn`
- 新增 `getApiBaseForModel(modelId)` — 根据模型 ID 自动路由到正确的 API 地址
- 新增 `getApiKeyEnvForModel(modelId)` — GLM 模型读取 `GLM_API_KEY`，其他读取 `NVIDIA_API_KEY`
- 导出 `ALL_MODELS`（合并列表）替代原来的 `NVIDIA_MODELS`
- 新增 GLM 模型定义 8 个：
  - **GLM-4-Plus** — 旗舰模型，128K 上下文，支持函数调用
  - **GLM-4** — 经典模型，128K 上下文
  - **GLM-4-Air** — 高性价比模型，128K 上下文
  - **GLM-4-AirX** — 极速模型，8K 上下文
  - **GLM-4-Flash** — 免费模型，128K 上下文
  - **GLM-4-Long** — 超长上下文模型，1M tokens
  - **GLM-4V-Plus** — 多模态视觉模型
  - **GLM-4V** — 视觉理解模型
- 默认模型改为 `glm-4-plus`（智谱旗舰，中文创作能力强）
- 上下文长度显示支持 1M（GLM-4-Long）

#### 2. 重构 `src/lib/ai/index.ts` — 多服务商统一 AI 服务层
- 移除硬编码的 `NVIDIA_API_BASE`，改为根据模型 ID 动态获取 API 地址
- `getApiKeyForModel(modelId)` — 根据模型 ID 路由到正确的环境变量
- `callAI()` — 统一调用函数，自动处理不同服务商的 header 差异（Nvidia 需要 `NVAPI-KEY`，GLM 不需要）
- `streamAI()` — 统一流式调用函数
- `validateApiKey()` — 支持按模型验证对应服务商的 API Key
- 日志中显示当前使用的 provider 和 API base

#### 3. 更新前端组件
- `src/components/novel/model-selector.tsx`:
  - 使用 `ALL_MODELS` 替代 `NVIDIA_MODELS`
  - 新增 GLM 提供商颜色（teal）
  - 底部文案更新为 "Nvidia NIM · 智谱 GLM"
- `src/components/novel/model-settings-dialog.tsx`:
  - 上下文长度显示支持 1M
  - 已通过 `getModelsByCategory()` 自动包含 GLM 模型

#### 4. 配置环境变量
- `.env` 添加 `GLM_API_KEY=b96bcec384c54f598255e255a614a1d5.uuV5kOvxTa1q1eGF`
- `.env.example` 更新文档说明两个 Key 的用途

### 支持的模型（30个）
- **Nvidia 自研** (4): Nemotron Ultra 253B, Nemotron 70B, Nemotron-4 340B, Nemotron 51B
- **Meta Llama** (5): Llama 3.1 405B/70B/8B, Llama 3.2 3B/11B Vision/90B Vision
- **Mistral** (4): Mixtral 8x22B/8x7B, Mistral Large 2, Nemo 7B
- **Google** (2): Gemma 2 27B/9B
- **Microsoft** (3): Phi-3 Medium/Mini, Phi-3.5 Mini
- **Qwen 通义千问** (3): Qwen 2.5 72B/32B/7B
- **DeepSeek** (2): DeepSeek R1, R1 Distill 70B
- **智谱 GLM** (8): GLM-4-Plus, GLM-4, GLM-4-Air, GLM-4-AirX, GLM-4-Flash, GLM-4-Long, GLM-4V-Plus, GLM-4V

### 验证结果
- ✅ ESLint 检查通过（0 errors, 0 warnings）
- ✅ 开发服务器运行正常
- ✅ GLM API Key 连通性测试通过（glm-4-flash 返回正常响应）
- ✅ 模型选择器显示 30 个模型，GLM 模型带青色 Badge
- ✅ 默认模型切换为 GLM-4-Plus
- ⚠️ 注意：Vercel 部署时需要在 Vercel Dashboard 添加 `GLM_API_KEY` 环境变量

---

## 未解决问题或风险，建议下一阶段优先事项

### 待确认
1. **Vercel 环境变量**: 部署到 Vercel 需要在 Vercel Dashboard > Settings > Environment Variables 中添加 `GLM_API_KEY`
2. **线上模型切换测试**: 需要在 Vercel 环境验证 GLM 和 Nvidia 模型 API 调用是否正常
3. **generate API 500 错误**: 之前遗留问题，可能是 Vercel Postgres 表未初始化

### 建议优先事项
1. 在 Vercel 配置 GLM_API_KEY 环境变量
2. 修复 generate API 500 错误（可能需要初始化数据库表）
3. 优化模型选择器移动端体验
4. 添加模型连通性检测功能
5. 优化 Agent 系统前端交互
6. 添加更多创作技能和 AI 功能
