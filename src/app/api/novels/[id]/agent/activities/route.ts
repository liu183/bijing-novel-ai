import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/novels/[id]/agent/activities
// Save a single agent activity to the database.
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: novelId } = await params;
    const body = await request.json();

    const {
      agentId,
      agentName,
      type,
      content,
      skillName,
      skillDescription,
      status,
      metadata,
    } = body as {
      agentId: string;
      agentName: string;
      type: string;
      content?: string;
      skillName?: string;
      skillDescription?: string;
      status?: string;
      metadata?: Record<string, unknown>;
    };

    if (!agentId || !agentName || !type) {
      return NextResponse.json(
        { error: 'agentId, agentName, and type are required' },
        { status: 400 }
      );
    }

    const activity = await db.agentActivity.create({
      data: {
        novelId,
        agentId,
        agentName,
        type,
        content: content ?? '',
        skillName: skillName ?? null,
        skillDescription: skillDescription ?? null,
        status: status ?? null,
        metadata: JSON.stringify(metadata ?? {}),
      },
    });

    return NextResponse.json({
      success: true,
      activity: {
        id: activity.id,
        novelId: activity.novelId,
        agentId: activity.agentId,
        agentName: activity.agentName,
        type: activity.type,
        content: activity.content,
        skillName: activity.skillName,
        skillDescription: activity.skillDescription,
        status: activity.status,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
        timestamp: activity.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Agent Activities API] POST Error:', error);
    return NextResponse.json(
      {
        error: `保存活动记录失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/novels/[id]/agent/activities?limit=50
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: novelId } = await params;

    // Parse limit from query string (default 50, max 200)
    const searchParams = _request.nextUrl.searchParams;
    const rawLimit = searchParams.get('limit');
    const limit = Math.min(Math.max(Number(rawLimit) || 50, 1), 200);

    // Parse optional agent filter
    const agentIdFilter = searchParams.get('agentId') || undefined;

    // Parse optional type filter
    const typeFilter = searchParams.get('type') || undefined;

    // Build where clause
    const where: Record<string, unknown> = { novelId };
    if (agentIdFilter) {
      where.agentId = agentIdFilter;
    }
    if (typeFilter) {
      where.type = typeFilter;
    }

    // Query activities
    const activities = await db.agentActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      activities: activities.map((a) => ({
        id: a.id,
        novelId: a.novelId,
        agentId: a.agentId,
        agentName: a.agentName,
        type: a.type,
        content: a.content,
        skillName: a.skillName,
        skillDescription: a.skillDescription,
        status: a.status,
        metadata: a.metadata ? JSON.parse(a.metadata) : {},
        timestamp: a.createdAt.toISOString(),
      })),
      count: activities.length,
      limit,
    });
  } catch (error) {
    console.error('[Agent Activities API] Error:', error);
    return NextResponse.json(
      {
        error: `获取活动记录失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}
