import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    let limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    limit = Math.min(Math.max(limit, 1), 100);
    const includeRaw = request.nextUrl.searchParams.get('include')?.split(',') || [];
    const validIncludes = ['steps', 'chapters'];
    for (const inc of includeRaw) {
      if (!validIncludes.includes(inc)) {
        return NextResponse.json({ error: `无效的 include 值: ${inc}` }, { status: 400 });
      }
    }
    const include = includeRaw;

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
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ error: '标题不能超过200个字符' }, { status: 400 });
    }
    if (description !== undefined && String(description).length > 10000) {
      return NextResponse.json({ error: '描述不能超过10000个字符' }, { status: 400 });
    }
    if (targetWords !== undefined) {
      const tw = Number(targetWords);
      if (!Number.isInteger(tw) || tw <= 0 || tw > 10000000) {
        return NextResponse.json({ error: '目标字数必须为不超过10000000的正整数' }, { status: 400 });
      }
    }
    if (genre !== undefined && String(genre).length > 50) {
      return NextResponse.json({ error: '类型不能超过50个字符' }, { status: 400 });
    }
    if (style !== undefined && String(style).length > 50) {
      return NextResponse.json({ error: '风格不能超过50个字符' }, { status: 400 });
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
