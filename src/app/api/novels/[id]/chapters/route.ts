import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { callAI, type ChatMessage } from '@/lib/ai';
import { buildChapterPrompt } from '@/lib/ai-prompts';
import { getNovelOr404, errorResponse } from '@/lib/agent-helpers';

// Vercel Serverless Function 最大执行时间（秒）
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chapters = await db.chapter.findMany({
      where: { novelId: id },
      orderBy: { number: 'asc' },
    });
    return NextResponse.json(chapters);
  } catch (error) {
    console.error('Failed to fetch chapters:', error);
    return errorResponse('Failed to fetch chapters', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { chapterNumber, model: requestModel } = body;

    const novel = await getNovelOr404(id);
    if (!novel) return errorResponse('Novel not found', 404);

    // Get all completed steps for context
    const completedSteps = await db.novelStep.findMany({
      where: { novelId: id, status: 'completed' },
      orderBy: { stepNumber: 'asc' },
    });

    // Fetch existing chapters for continuity context
    const existingChapters = await db.chapter.findMany({
      where: { novelId: id, number: { lt: chapterNumber }, status: 'completed' },
      orderBy: { number: 'desc' },
      take: 3,
    });

    if (!completedSteps.find(s => s.stepNumber === 2)?.content) {
      return errorResponse('请先完成Step 2（一页提要）才能生成章节', 400);
    }

    // Update or create chapter
    await db.chapter.upsert({
      where: { novelId_number: { novelId: id, number: chapterNumber } },
      create: {
        novelId: id,
        number: chapterNumber,
        title: `第${chapterNumber}章`,
        status: 'writing',
      },
      update: { status: 'writing' },
    });

    const systemPrompt = buildChapterPrompt(
      novel,
      completedSteps.map(s => ({ stepNumber: s.stepNumber, content: s.content })),
      existingChapters,
      chapterNumber,
    );

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请创作第${chapterNumber}章的完整正文。注意与前面章节的衔接。` },
    ];

    const result = await callAI({ messages, model: requestModel || undefined });
    const content = result.content;
    const wordCount = content.replace(/\s/g, '').length;

    // Extract chapter title from first line if it looks like a title
    let title = `第${chapterNumber}章`;
    const firstLine = content.split('\n')[0]?.trim();
    if (firstLine && (firstLine.startsWith('第') && firstLine.includes('章'))) {
      title = firstLine.replace(/^#+\s*/, '');
    }

    const chapter = await db.chapter.upsert({
      where: { novelId_number: { novelId: id, number: chapterNumber } },
      create: {
        novelId: id,
        number: chapterNumber,
        title,
        content,
        wordCount,
        status: 'completed',
      },
      update: { title, content, wordCount, status: 'completed' },
    });

    // Ensure novel status is at least 'writing' after chapter creation
    if (novel.status === 'draft') {
      await db.novel.update({ where: { id }, data: { status: 'writing' } });
    }

    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    console.error('Failed to generate chapter:', error);
    return errorResponse(`章节生成失败: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { chapterNumber, title, content } = body;

    if (!chapterNumber) {
      return errorResponse('chapterNumber is required', 400);
    }

    const chapter = await db.chapter.update({
      where: { novelId_number: { novelId: id, number: chapterNumber } },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && {
          content,
          wordCount: content.replace(/\s/g, '').length,
        }),
      },
    });

    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Failed to update chapter:', error);
    return errorResponse('Failed to update chapter', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const chapterNumber = parseInt(searchParams.get('number') || '0');

    if (!chapterNumber) {
      return errorResponse('chapterNumber query param is required', 400);
    }

    await db.chapter.delete({
      where: { novelId_number: { novelId: id, number: chapterNumber } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chapter:', error);
    return errorResponse('Failed to delete chapter', 500);
  }
}
