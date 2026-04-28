// ============================================================================
// 笔境 AI - Database Client
// 本地开发: SQLite (Prisma Client)
// Vercel 部署: PostgreSQL via Neon serverless driver
// ============================================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * 检测是否在 Vercel 环境中运行
 */
function isVercelProduction(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    !!process.env.VERCEL ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME
  );
}

/**
 * 获取数据库 URL
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL 环境变量未设置。请在 .env.local 文件中配置 DATABASE_URL。'
    );
  }
  return url;
}

/**
 * 创建 PrismaClient 实例
 *
 * - 本地开发: 使用 SQLite，标准 Prisma Client
 * - Vercel 部署: 使用 PostgreSQL，通过 Neon serverless driver 连接
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl();
  const isPostgres =
    databaseUrl.startsWith('postgresql://') ||
    databaseUrl.startsWith('postgres://');

  // Vercel 生产环境使用 PostgreSQL (Neon)
  if (isVercelProduction() && isPostgres) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neon } = require('@neondatabase/serverless');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require('@prisma/adapter-neon');

    const sql = neon(databaseUrl);
    const adapter = new PrismaNeon(sql);

    console.log('[DB] Using Neon PostgreSQL (serverless)');

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    }) as PrismaClient;
  }

  // 本地开发使用 SQLite
  console.log(`[DB] Using ${isPostgres ? 'PostgreSQL' : 'SQLite'} (local)`);

  return new PrismaClient({
    log: ['query', 'error', 'warn'],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
