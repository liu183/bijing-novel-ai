---
Task ID: 1
Agent: Main Agent
Task: 配置Vercel PostgreSQL数据库资源（Supabase）

Work Log:
- 通过 Vercel API 获取已有 Supabase store (store_JaIhYvO97Ga31Bff) 的数据库凭证
- 使用 pg 直接连接 Supabase PostgreSQL 数据库
- 在 public schema 创建 PascalCase 表名（带引号）：Novel, NovelStep, Chapter, ChatMessage, AgentActivity
- 解决 pgbouncer 不兼容 search_path 的问题：直接在 public schema 使用带引号的 PascalCase 表名
- 解决 Prisma Driver Adapter 与 SQLite provider 不兼容问题：Vercel 构建时自动切换到 PostgreSQL schema
- 解决 Prisma datasourceUrl 与 adapter 冲突问题：改用原生 Prisma PostgreSQL 连接
- 更新 db.ts 简化连接逻辑

Stage Summary:
- ✅ 部署成功: https://bijing-novel-ai.vercel.app
- ✅ 数据库连接正常: Supabase PostgreSQL
- ✅ CRUD 测试通过: 创建/查询小说正常
- ✅ 表结构: Novel, NovelStep, Chapter, ChatMessage, AgentActivity (public schema)
- ✅ 环境变量: DATABASE_URL, NVIDIA_API_KEY, NVIDIA_MODEL 已配置

Vercel 环境变量:
- DATABASE_URL: postgres://***@supabase.com:5432/postgres (production)
- NVIDIA_API_KEY: nvapi-***WvOnc (production)
- NVIDIA_MODEL: nvidia/llama-3.1-nemotron-ultra-253b-instruct (production+preview)
