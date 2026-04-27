import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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
