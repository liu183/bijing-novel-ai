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
