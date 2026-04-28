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

    if (!databaseUrl) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'DATABASE_URL 环境变量未配置',
          environment: isVercel ? 'vercel' : 'local',
          config: { isPostgres: false, isVercel },
        },
        { status: 500 }
      );
    }

    // Try to connect and query
    const { db } = await import('@/lib/db');

    // Test connection
    const result = await db.novel.count();

    return NextResponse.json({
      status: 'ok',
      message: '数据库连接正常',
      environment: isVercel ? 'vercel' : 'local',
      config: {
        isPostgres,
        isVercel,
        databaseType: isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite',
        schema: isPostgres ? 'bijing_novel' : 'main',
      },
      data: {
        novelCount: result,
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
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const databaseUrl = process.env.DATABASE_URL || '';

    if (!databaseUrl) {
      return NextResponse.json(
        { status: 'error', message: '请先配置有效的 DATABASE_URL' },
        { status: 400 }
      );
    }

    const isPostgres =
      databaseUrl.startsWith('postgresql://') ||
      databaseUrl.startsWith('postgres://');

    if (isPostgres && process.env.VERCEL) {
      // For Vercel PostgreSQL, tables are already created via direct SQL
      return NextResponse.json({
        status: 'ok',
        message: 'PostgreSQL 数据库已初始化 (bijing_novel schema)',
      });
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
