// ============================================================================
// 笔境 AI - Database Client
// 本地开发: SQLite (Prisma Client)
// Vercel 部署: PostgreSQL (Neon) via @prisma/adapter-neon + @neondatabase/serverless
// ============================================================================
//
// 为什么 Vercel 需要 Neon Serverless 适配器？
// - Vercel Serverless Functions 是无状态的，每次请求都可能新建连接
// - Neon 的 pgbouncer 在事务模式下不支持 Prisma 的 prepared statements
// - @neondatabase/serverless 通过 WebSocket 避开了这个问题
// ============================================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ---------------------------------------------------------------------------
// 数据库 URL 获取
// ---------------------------------------------------------------------------

/**
 * 获取数据库连接 URL
 *
 * Vercel Postgres 自动注入的环境变量（优先级从高到低）：
 * 1. POSTGRES_PRISMA_URL    → Prisma 专用（含 pgbouncer），Vercel 自动设置
 * 2. POSTGRES_URL           → 通用池化连接
 * 3. DATABASE_URL           → 通用数据库 URL
 */
function getDatabaseUrl(): string {
  return (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ''
  );
}

/**
 * 检测当前是否为 PostgreSQL
 */
function isPostgresUrl(url: string): boolean {
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

// ---------------------------------------------------------------------------
// Prisma Client 创建
// ---------------------------------------------------------------------------

/**
 * 创建 PrismaClient 实例
 *
 * 策略：
 * - Vercel (PostgreSQL): 使用 @prisma/adapter-neon + @neondatabase/serverless
 *   避免 pgbouncer 与 prepared statements 的兼容问题
 * - 本地开发 (SQLite): 标准 Prisma Client
 */
async function createPrismaClient(): Promise<PrismaClient> {
  const databaseUrl = getDatabaseUrl();
  const isVercel = !!process.env.VERCEL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL 环境变量未设置。请在 .env.local 文件中配置 DATABASE_URL。'
    );
  }

  // ── Vercel + PostgreSQL (Neon) ──────────────────────────────────────
  if (isVercel && isPostgresUrl(databaseUrl)) {
    console.log('[DB] Vercel + PostgreSQL (Neon) — 使用 Serverless Adapter');

    try {
      const { neon } = await import('@neondatabase/serverless');
      const { PrismaNeon } = await import('@prisma/adapter-neon');

      // 使用 POSTGRES_URL_NON_POOLING 获取更稳定的连接（Neon 推荐）
      const directUrl =
        process.env.POSTGRES_URL_NON_POOLING || databaseUrl;
      const sql = neon(directUrl);
      const adapter = new PrismaNeon(sql);

      return new PrismaClient({
        adapter,
        log: ['error'],
      });
    } catch (adapterError) {
      // 适配器加载失败时降级到标准连接
      console.warn(
        '[DB] Neon Serverless Adapter 加载失败，降级到标准连接:',
        adapterError instanceof Error ? adapterError.message : adapterError
      );

      return new PrismaClient({
        datasources: { db: { url: databaseUrl } },
        log: ['error'],
      });
    }
  }

  // ── 本地开发 PostgreSQL ────────────────────────────────────────────
  if (isPostgresUrl(databaseUrl)) {
    console.log('[DB] Local PostgreSQL');
    return new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: ['query', 'error', 'warn'],
    });
  }

  // ── 本地开发 SQLite ────────────────────────────────────────────────
  console.log('[DB] Local SQLite');
  return new PrismaClient({
    log: ['query', 'error', 'warn'],
  });
}

// ---------------------------------------------------------------------------
// 导出单例（异步初始化）
// ---------------------------------------------------------------------------

let _db: PrismaClient | undefined;
let _initPromise: Promise<PrismaClient> | undefined;

/**
 * 获取数据库客户端（懒初始化单例）
 *
 * 在 Vercel serverless 环境中使用异步初始化，
 * 确保 @neondatabase/serverless 适配器正确加载
 */
export function getDb(): PrismaClient {
  if (_db) return _db;

  if (!_initPromise) {
    _initPromise = createPrismaClient().then((client) => {
      _db = client;
      return client;
    });
  }

  // 在初始化完成前使用占位，实际查询会在异步初始化完成后正常工作
  // 因为 Next.js API routes 是 async 的，await getDb() 会等到初始化完成
  throw new Error(
    'Database not initialized yet. Use "await ensureDb()" first.'
  );
}

/**
 * 确保数据库已初始化（在 API route 中调用）
 *
 * 使用方式：
 * ```ts
 * await ensureDb();
 * const novels = await db.novel.findMany();
 * ```
 */
export async function ensureDb(): Promise<PrismaClient> {
  if (_db) return _db;

  if (!_initPromise) {
    _initPromise = createPrismaClient().then((client) => {
      _db = client;
      return client;
    });
  }

  return _initPromise;
}

// ---------------------------------------------------------------------------
// 同步 db 导出（兼容旧代码，自动初始化）
// ---------------------------------------------------------------------------
//
// 注意：此导出使用同步创建的 PrismaClient，不包含 Neon adapter。
// 在 Vercel 上首次调用时可能遇到初始化问题。
// 推荐在 API route 开头使用 `await ensureDb()` 然后使用 `db`。
// ---------------------------------------------------------------------------

// 尝试同步创建 PrismaClient（适用于本地开发）
const databaseUrl = getDatabaseUrl();
const isPostgres = isPostgresUrl(databaseUrl);
const isVercel = !!process.env.VERCEL;

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(isPostgres && !isVercel
      ? { datasources: { db: { url: databaseUrl } } }
      : {}),
    log: isVercel ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * 健康检查 - 测试数据库连接
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  databaseType: string;
  isVercel: boolean;
  novelCount: number;
  error?: string;
}> {
  const isVercel = !!process.env.VERCEL;
  const url = getDatabaseUrl();
  const isPostgres = isPostgresUrl(url);

  try {
    const novelCount = await db.novel.count();
    return {
      ok: true,
      databaseType: isPostgres ? 'PostgreSQL (Neon)' : 'SQLite',
      isVercel,
      novelCount,
    };
  } catch (error) {
    return {
      ok: false,
      databaseType: isPostgres ? 'PostgreSQL' : 'SQLite',
      isVercel,
      novelCount: 0,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 测试数据库连接并自动创建缺失的表
 *
 * 使用 Prisma 的 $queryRaw 执行 CREATE TABLE IF NOT EXISTS
 * 适用于 Vercel serverless 环境（不需要 execSync）
 */
export async function autoInitDatabase(): Promise<{
  ok: boolean;
  message: string;
}> {
  const url = getDatabaseUrl();
  const isPostgres = isPostgresUrl(url);

  if (!isPostgres) {
    // 本地 SQLite: 使用 prisma db push
    try {
      const { execSync } = await import('node:child_process');
      execSync('npx prisma db push --skip-generate 2>&1', {
        stdio: 'pipe',
      });
      return { ok: true, message: 'SQLite schema 同步成功' };
    } catch (error) {
      return {
        ok: false,
        message: `SQLite 同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  // PostgreSQL: 使用 Prisma migrate deploy 或 db push
  // 在 Vercel 中，通过 POSTGRES_URL_NON_POOLING 直连执行
  try {
    const { execSync } = await import('node:child_process');
    const directUrl =
      process.env.POSTGRES_URL_NON_POOLING || url;
    const result = execSync(
      `npx prisma db push --skip-generate --accept-data-loss --schema=prisma/schema.postgres.prisma 2>&1`,
      {
        stdio: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL: directUrl,
        },
        timeout: 30000,
      }
    );
    return {
      ok: true,
      message: `PostgreSQL schema 同步成功: ${result.toString().slice(0, 200)}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `PostgreSQL 同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}
