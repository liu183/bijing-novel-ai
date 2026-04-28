#!/bin/bash
# ============================================================================
# 笔境 AI - Vercel 部署数据库设置脚本
# 在 Vercel 部署后运行此脚本来初始化 PostgreSQL 数据库
# ============================================================================
set -e

echo "================================================"
echo "  笔境 AI - 数据库设置"
echo "================================================"

# Check Vercel environment
if [ -n "$VERCEL" ]; then
  echo "📦 检测到 Vercel 环境"
  
  DATABASE_URL="${DATABASE_URL:-''}"
  
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL 未设置"
    echo "请在 Vercel Dashboard > Settings > Environment Variables 中设置 DATABASE_URL"
    exit 1
  fi
  
  if echo "$DATABASE_URL" | grep -q "placeholder"; then
    echo "⚠️  DATABASE_URL 是占位符"
    echo "请在 Vercel Dashboard > Storage 中创建 Postgres 数据库"
    exit 1
  fi
  
  echo "✅ DATABASE_URL 已配置"
  echo "🔧 切换到 PostgreSQL schema..."
  
  # Use PostgreSQL schema for Prisma
  cp prisma/schema.prisma prisma/schema.sqlite.bak
  cp prisma/schema.postgres.prisma prisma/schema.prisma
  
  echo "🔧 生成 Prisma Client..."
  npx prisma generate --no-hints
  
  echo "🔧 推送数据库 schema..."
  npx prisma db push --accept-data-loss --skip-generate
  
  echo "✅ 数据库设置完成!"
  
  # Restore SQLite schema
  cp prisma/schema.sqlite.bak prisma/schema.prisma
  rm prisma/schema.sqlite.bak
  
else
  echo "🖥️  本地开发环境"
  
  # Ensure db directory exists
  mkdir -p db
  
  echo "🔧 生成 Prisma Client..."
  npx prisma generate --no-hints
  
  echo "🔧 推送数据库 schema..."
  npx prisma db push --skip-generate
  
  echo "✅ 本地数据库设置完成!"
fi

echo "================================================"
