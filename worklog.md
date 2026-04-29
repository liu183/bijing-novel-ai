---
Task ID: 1
Agent: Main Agent
Task: 添加 GLM-4.5-Air 模型并设为默认模型

Work Log:
- 读取并分析了现有项目结构和代码
- 确认 GLM 集成已在之前会话中基本完成（模型定义、API 层、环境变量）
- 在 `src/lib/ai/models.ts` 的 GLM_MODELS 数组中添加了 GLM-4.5-Air 模型定义
  - id: glm-4.5-air
  - category: balanced（均衡模型）
  - supportsFunctionCall: true
  - maxTokens: 128000
- 将 `DEFAULT_MODEL_ID` 从 `'glm-4-plus'` 改为 `'glm-4.5-air'`
- 更新了模型选择器 UI（`src/components/novel/model-selector.tsx`）：
  - 为默认模型添加了"推荐"渐变徽章
  - 更新了底部文字显示默认模型名称
- 修复了 generate 路由中硬编码的 NVIDIA 错误提示，改为通用的服务商提示
- 确认 `.env` 中 GLM_API_KEY 已配置
- 运行 lint 检查通过

Stage Summary:
- GLM-4.5-Air 已添加到模型列表，作为默认推荐模型
- 所有 4 个 API 路由（generate, chat, agent, chapters）已支持 GLM 模型调用
- Zustand store 持久化会正确初始化为 GLM-4.5-Air
- 模型选择器 UI 会为 GLM-4.5-Air 显示"推荐"标签
- 环境变量已就绪：GLM_API_KEY=b96bcec384c54f598255e255a614a1d5.uuV5kOvxTa1q1eGF

修改的文件:
1. `src/lib/ai/models.ts` - 添加 GLM-4.5-Air 模型定义，更新默认模型
2. `src/components/novel/model-selector.tsx` - 添加推荐徽章，更新底部文字
3. `src/app/api/novels/[id]/generate/route.ts` - 修复硬编码 NVIDIA 错误提示

---
Task ID: 2
Agent: Main Agent
Task: 修复数据库资源适配 Vercel 数据库，实现数据接入数据库存储

Work Log:
- 检查数据库配置：schema.prisma(SQLite)、schema.postgres.prisma(PostgreSQL)、db.ts、vercel.json
- 发现问题1: `@prisma/adapter-neon` v7.8.0 与 `@prisma/client` v6.11.1 版本不匹配 → 降级到 v6.19.3
- 发现问题2: `db.ts` 未使用 Neon Serverless 适配器 → 重写为支持 @prisma/adapter-neon + @neondatabase/serverless
- 发现问题3: `settings/route.ts` 引用 `NVIDIA_MODELS` 而非 `ALL_MODELS` → 已修复
- 发现问题4: Vercel 数据库表不存在 → 通过 `prisma db push` 从本地远程推送到 Vercel 数据库(Supabase)
- 发现问题5: `GLM_API_KEY` 未配置到 Vercel → 通过 Vercel API 添加环境变量
- 通过 Vercel API 触发重新部署
- 全面 API 验证：7/7 全部通过

Stage Summary:
- 修改的文件:
  1. `src/lib/db.ts` — 全面重写，支持 Neon Serverless 适配器 + 自动降级
  2. `src/app/api/settings/route.ts` — 使用 ALL_MODELS 替代 NVIDIA_MODELS
  3. `src/app/api/db/route.ts` — 增加环境变量配置状态展示
  4. `package.json` — `@prisma/adapter-neon` 降级到 6.19.3
  5. `vercel.json` — 优化 installCommand
- Vercel 环境变量:
  - GLM_API_KEY ✅ 已配置
  - DATABASE_URL ✅ (Supabase)
  - NVIDIA_API_KEY ✅
- API 验证结果:
  - GET /api/db → ✅ 数据库连接正常
  - POST /api/novels → ✅ 创建小说成功
  - GET /api/novels → ✅ 列表获取成功
  - GET /api/novels/:id → ✅ 详情获取成功
  - GET /api/novels/:id/steps → ✅ 步骤获取成功
  - GET /api/settings → ✅ 默认模型 glm-4.5-air，共 33 个模型
  - DELETE /api/novels/:id → ✅ 删除成功
