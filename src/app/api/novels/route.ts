import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const novels = await db.novel.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { steps: true, chapters: true } },
      },
    });
    return NextResponse.json(novels);
  } catch (error) {
    console.error('Failed to fetch novels:', error);
    return NextResponse.json({ error: 'Failed to fetch novels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, genre, subgenre, style, targetWords, description } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const novel = await db.novel.create({
      data: {
        title: title.trim(),
        genre: genre || '未分类',
        subgenre: subgenre || '',
        style: style || '爽文',
        targetWords: targetWords || 50000,
        description: description || '',
      },
    });

    return NextResponse.json(novel, { status: 201 });
  } catch (error) {
    console.error('Failed to create novel:', error);
    return NextResponse.json({ error: 'Failed to create novel' }, { status: 500 });
  }
}
