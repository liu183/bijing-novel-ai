import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const novel = await db.novel.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        chapters: { orderBy: { number: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    return NextResponse.json(novel);
  } catch (error) {
    console.error('Failed to fetch novel:', error);
    return NextResponse.json({ error: 'Failed to fetch novel' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ['title', 'genre', 'subgenre', 'style', 'description', 'targetWords', 'status', 'currentStep'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
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
    return NextResponse.json({ error: 'Failed to update novel' }, { status: 500 });
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
    return NextResponse.json({ error: 'Failed to delete novel' }, { status: 500 });
  }
}
