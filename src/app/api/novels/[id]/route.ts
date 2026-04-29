import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getNovelOr404, errorResponse } from '@/lib/agent-helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const novel = await getNovelOr404(id, {
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        chapters: { orderBy: { number: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!novel) return errorResponse('Novel not found', 404);

    return NextResponse.json(novel);
  } catch (error) {
    console.error('Failed to fetch novel:', error);
    return errorResponse('Failed to fetch novel', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await getNovelOr404(id);
    if (!existing) return errorResponse('Novel not found', 404);

    const allowedFields = ['title', 'genre', 'subgenre', 'style', 'description', 'targetWords', 'status', 'currentStep'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate fields
    if (updateData.title !== undefined) {
      const t = String(updateData.title);
      if (t.length > 200) return errorResponse('标题不能超过200个字符', 400);
    }
    if (updateData.description !== undefined) {
      const d = String(updateData.description);
      if (d.length > 10000) return errorResponse('描述不能超过10000个字符', 400);
    }
    if (updateData.status !== undefined) {
      const validStatuses = ['draft', 'writing', 'completed', 'archived'];
      if (!validStatuses.includes(updateData.status as string)) {
        return errorResponse('状态值无效', 400);
      }
    }
    if (updateData.targetWords !== undefined) {
      const tw = Number(updateData.targetWords);
      if (!Number.isFinite(tw) || tw <= 0 || tw > 10000000) {
        return errorResponse('目标字数必须为不超过10000000的正数', 400);
      }
    }

    updateData.updatedAt = new Date();

    const novel = await db.novel.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(novel);
  } catch (error) {
    console.error('Failed to update novel:', error);
    return errorResponse('Failed to update novel', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.novel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete novel:', error);
    return errorResponse('Failed to delete novel', 500);
  }
}
