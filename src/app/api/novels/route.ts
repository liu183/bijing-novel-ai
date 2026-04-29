import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const include = request.nextUrl.searchParams.get('include')?.split(',') || [];

    const novels = await db.novel.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        steps: include.includes('steps') ? { orderBy: { stepNumber: 'asc' } } : undefined,
        chapters: include.includes('chapters') ? { orderBy: { number: 'asc' } } : undefined,
        messages: include.includes('messages') ? undefined : false,
        _count: { select: { steps: true, chapters: true, messages: true } },
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
