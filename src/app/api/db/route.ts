// ============================================================================
// 笔境 AI - Database Setup & Health Check API
// 用于检查数据库连接状态和自动初始化表结构
// ============================================================================

import { NextResponse } from 'next/server';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL || '';
    const isPostgres =
      databaseUrl.startsWith('postgresql://') ||
      databaseUrl.startsWith('postgres://');
    const isVercel = !!process.env.VERCEL;

    // Check if database URL is configured
    if (!databaseUrl) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'DATABASE_URL 环境变量未配置',
          environment: isVercel ? 'vercel' : 'local',
          config: {
            isPostgres: false,
            isVercel,
          },
          instructions: {
            local: '请在 .env.local 中设置 DATABASE_URL=file:./db/custom.db',
            vercel: '请在 Vercel Dashboard > Storage 中创建 Postgres 数据库',
          },
        },
        { status: 500 }
      );
    }

    // Check if it's a placeholder URL
    if (databaseUrl.includes('placeholder')) {
      return NextResponse.json({
        status: 'warning',
        message: 'DATABASE_URL 是占位符，请替换为实际的数据库连接字符串',
        environment: isVercel ? 'vercel' : 'local',
        config: { isPostgres: true, isVercel },
        instructions: {
          vercel:
            '1. 进入 Vercel Dashboard > bijing-novel-ai > Storage\n2. 点击 "Create Database"\n3. 选择 "Postgres (Neon)"\n4. 创建后自动更新 DATABASE_URL',
        },
      });
    }

    // Try to connect and query
    const { db } = await import('@/lib/db');

    // Test connection with a simple query
    await db.$queryRaw`SELECT 1 as health_check`;

    // Get table count
    const novelCount = await db.novel.count();

    return NextResponse.json({
      status: 'ok',
      message: '数据库连接正常',
      environment: isVercel ? 'vercel' : 'local',
      config: {
        isPostgres,
        isVercel,
        databaseType: isPostgres ? 'PostgreSQL (Neon)' : 'SQLite',
      },
      data: {
        novelCount,
      },
    });
  } catch (error) {
    console.error('[DB Health Check] Error:', error);

    const isVercel = !!process.env.VERCEL;
    const databaseUrl = process.env.DATABASE_URL || '';

    return NextResponse.json(
      {
        status: 'error',
        message: '数据库连接失败',
        error: error instanceof Error ? error.message : '未知错误',
        environment: isVercel ? 'vercel' : 'local',
        config: {
          databaseUrlSet: !!databaseUrl,
          isPostgres:
            databaseUrl.startsWith('postgresql://') ||
            databaseUrl.startsWith('postgres://'),
        },
        suggestions: isVercel
          ? [
              '检查 Vercel Dashboard > Settings > Environment Variables 中 DATABASE_URL 是否正确',
              '确认 Postgres 数据库已创建并连接到项目',
              '尝试在 Vercel Dashboard > Storage 中重新创建数据库',
            ]
          : [
              '运行 bun run db:push 同步数据库 schema',
              '检查 .env.local 中 DATABASE_URL 是否正确',
              '确保 db/ 目录存在',
            ],
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const databaseUrl = process.env.DATABASE_URL || '';
    const isPostgres =
      databaseUrl.startsWith('postgresql://') ||
      databaseUrl.startsWith('postgres://');

    if (!databaseUrl || databaseUrl.includes('placeholder')) {
      return NextResponse.json(
        {
          status: 'error',
          message: '请先配置有效的 DATABASE_URL',
        },
        { status: 400 }
      );
    }

    // For PostgreSQL on Vercel
    if (isPostgres && process.env.VERCEL) {
      try {
        // Copy postgres schema to schema.prisma temporarily
        const postgresSchema = readFileSync(
          join(process.cwd(), 'prisma', 'schema.postgres.prisma'),
          'utf-8'
        );

        const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
        const sqliteSchema = readFileSync(schemaPath, 'utf-8');

        // Backup and switch to postgres schema
        const bakPath = schemaPath + '.sqlite.bak';
        writeFileSync(bakPath, sqliteSchema);
        writeFileSync(schemaPath, postgresSchema);

        // Generate and push
        execSync('npx prisma generate --no-hints 2>&1', { stdio: 'pipe' });
        execSync('npx prisma db push --accept-data-loss --skip-generate 2>&1', {
          stdio: 'pipe',
        });

        // Restore SQLite schema
        writeFileSync(schemaPath, sqliteSchema);
        if (existsSync(bakPath)) {
          unlinkSync(bakPath);
        }

        return NextResponse.json({
          status: 'ok',
          message: 'PostgreSQL 数据库 schema 初始化成功',
        });
      } catch (execError) {
        // Restore SQLite schema on error
        const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
        const bakPath = schemaPath + '.sqlite.bak';

        if (existsSync(bakPath)) {
          writeFileSync(schemaPath, readFileSync(bakPath, 'utf-8'));
          unlinkSync(bakPath);
        }

        throw execError;
      }
    }

    // For local SQLite
    execSync('npx prisma db push --skip-generate 2>&1', { stdio: 'pipe' });

    return NextResponse.json({
      status: 'ok',
      message: '数据库 schema 同步成功',
    });
  } catch (error) {
    console.error('[DB Setup] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: '数据库 schema 初始化失败',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
