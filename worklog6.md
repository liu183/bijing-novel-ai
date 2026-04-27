---
Task ID: 6
Agent: Main Coordinator
Task: 集成 Nvidia 大模型服务 + 推送 GitHub + 部署 Vercel

Work Log:
- 创建统一 AI 服务层 (src/lib/ai/index.ts)，使用 Nvidia NIM API (OpenAI 兼容接口)
- 创建模型配置文件 (src/lib/ai/models.ts)，支持 26+ 个 Nvidia NIM 主流模型
  - Nvidia 自研: Nemotron Ultra 253B, Nemotron 70B, Nemotron-4 340B, Nemotron 51B
  - Meta Llama: Llama 3.1 (405B/70B/8B), Llama 3.2 (3B/11B Vision/90B Vision)
  - Mistral: Mixtral 8x22B, Mixtral 8x7B, Mistral Large 2, Nemo 7B
  - Google: Gemma 2 27B, Gemma 2 9B
  - Microsoft: Phi-3 Medium/Mini 128K, Phi-3.5 Mini
  - Qwen: Qwen 2.5 (72B/32B/7B), Qwen 2.5 Coder 32B
  - DeepSeek: DeepSeek R1, DeepSeek R1 Distill 70B
- 模型按4类分组: 旗舰/均衡/快速/专业
- 更新所有 5 个 AI API 路由使用统一 AI 服务
- 新增 /api/settings 端点
- 创建 ModelSettingsDialog 组件
- Header 新增设置按钮
- Zustand store persist 持久化模型选择
- 推送到 GitHub: https://github.com/liu183/bijing-novel-ai.git
- 部署到 Vercel: https://bijing-novel-jqijd7xit-niu1s-projects.vercel.app

Stage Summary:
- ✅ 统一 AI 服务层（Nvidia NIM API）
- ✅ 26+ 模型支持
- ✅ 模型配置 UI
- ✅ 所有 API 路由更新
- ✅ GitHub 推送成功
- ✅ Vercel 部署成功
- ⚠️ Vercel 需要配置云数据库

## 项目当前状态描述/判断
项目已完成 Nvidia 大模型服务集成，所有 AI 功能通过 Nvidia NIM API 运行。代码已推送到 GitHub 并部署到 Vercel。

## 当前目标/已完成的修改/验证结果
✅ 创建统一 AI 服务层 (src/lib/ai/)
✅ 26+ Nvidia NIM 模型支持
✅ 模型配置 UI (ModelSettingsDialog)
✅ 所有 API 路由更新
✅ GitHub 推送成功
✅ Vercel 部署成功
✅ ESLint 0 错误 0 警告

## 未解决问题或风险
- [ ] Vercel 数据库: SQLite 在 Serverless 不工作，建议切换到 Turso
- [ ] Vercel 自定义域名绑定
- [ ] AI 流式输出前端集成
- [ ] Agent 协作编排优化
- [ ] WebSocket 实时推送前端集成
- [ ] 导出功能（Markdown/TXT/DOCX）
- [ ] 角色关系图可视化
