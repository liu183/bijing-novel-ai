// ============================================================================
// 笔境 AI - Database Client
// 本地开发: SQLite (Prisma Client)
// Vercel 部署: PostgreSQL (Supabase)
// ============================================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * 获取数据库 URL
 */
function getDatabaseUrl(): string {
  return (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ''
  );
}

function isPostgresUrl(url: string): boolean {
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

// ---------------------------------------------------------------------------
// 导出单例
// ---------------------------------------------------------------------------

// Override DATABASE_URL for local dev if it points to the wrong file
if (!process.env.VERCEL) {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('custom.db')) {
    process.env.DATABASE_URL = 'file:/home/z/my-project/bijing-novel-ai/db/bijing.db';
  }
}

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.VERCEL ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

export async function checkDatabaseHealth() {
  const url = getDatabaseUrl();
  const isPostgres = isPostgresUrl(url);

  try {
    const novelCount = await db.novel.count();
    return {
      ok: true,
      databaseType: isPostgres ? 'PostgreSQL' : 'SQLite',
      isVercel: !!process.env.VERCEL,
      novelCount,
    };
  } catch (error) {
    return {
      ok: false,
      databaseType: isPostgres ? 'PostgreSQL' : 'SQLite',
      isVercel: !!process.env.VERCEL,
      novelCount: 0,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

export async function autoInitDatabase() {
  const url = getDatabaseUrl();
  const isPostgres = isPostgresUrl(url);

  try {
    const { execSync } = await import('node:child_process');

    if (isPostgres) {
      const directUrl = process.env.POSTGRES_URL_NON_POOLING || url;
      const result = execSync(
        `DATABASE_URL="${directUrl}" npx prisma db push --skip-generate --accept-data-loss --schema=prisma/schema.postgres.prisma 2>&1`,
        {
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: directUrl },
          timeout: 30000,
        }
      );
      return {
        ok: true,
        message: `PostgreSQL schema 同步成功: ${result.toString().slice(0, 200)}`,
      };
    }

    execSync('npx prisma db push --skip-generate 2>&1', { stdio: 'pipe' });
    return { ok: true, message: 'SQLite schema 同步成功' };
  } catch (error) {
    return {
      ok: false,
      message: `Schema 同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}
