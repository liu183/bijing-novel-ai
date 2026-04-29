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
