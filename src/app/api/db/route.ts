// ============================================================================
// 笔境 AI - Database Setup & Health Check API
// 用于检查数据库连接状态和自动初始化表结构
// ============================================================================

import { NextResponse } from 'next/server';
import { checkDatabaseHealth, autoInitDatabase } from '@/lib/db';

export async function GET() {
  try {
    const health = await checkDatabaseHealth();

    if (health.ok) {
      return NextResponse.json({
        status: 'ok',
        message: '数据库连接正常',
        environment: health.isVercel ? 'vercel' : 'local',
        config: {
          databaseType: health.databaseType,
          hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
          hasPostgresUrl: !!process.env.POSTGRES_URL,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasGlmApiKey: !!process.env.GLM_API_KEY,
          hasNvidiaApiKey: !!process.env.NVIDIA_API_KEY,
        },
        data: {
          novelCount: health.novelCount,
        },
      });
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: '数据库连接失败',
          error: health.error,
          environment: health.isVercel ? 'vercel' : 'local',
          config: {
            databaseType: health.databaseType,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[DB Health Check] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: '健康检查失败',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await autoInitDatabase();

    if (result.ok) {
      return NextResponse.json({
        status: 'ok',
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: result.message,
        },
        { status: 500 }
      );
    }
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
