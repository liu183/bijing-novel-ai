import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { callAI, type ChatMessage } from '@/lib/ai';
import { buildChapterPrompt } from '@/lib/ai-prompts';
import { getNovelOr404, errorResponse } from '@/lib/agent-helpers';

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { startChapter, endChapter, model: requestModel } = body;

    const novel = await getNovelOr404(id);
    if (!novel) return errorResponse('Novel not found', 404);

    const start = startChapter || 1;
    const end = endChapter || start;
    const total = end - start + 1;

    if (start < 1 || end < start || total > 20) {
      return errorResponse('Invalid chapter range (1-20 chapters max)', 400);
    }

    const completedSteps = await db.novelStep.findMany({
      where: { novelId: id, status: 'completed' },
      orderBy: { stepNumber: 'asc' },
    });

    if (!completedSteps.find(s => s.stepNumber === 2)?.content) {
      return errorResponse('请先完成Step 2（一页提要）才能生成章节', 400);
    }

    // Get existing chapters for context (truncated, same as single-chapter)
    const existingChapters = await db.chapter.findMany({
      where: { novelId: id },
      orderBy: { number: 'asc' },
    });

    const results: Array<Record<string, unknown>> = [];

    for (let chapterNum = start; chapterNum <= end; chapterNum++) {
      const systemPrompt = buildChapterPrompt(
        novel,
        completedSteps.map(s => ({ stepNumber: s.stepNumber, content: s.content })),
        existingChapters,
        chapterNum,
        { isBatch: true },
      );

      try {
        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请创作第${chapterNum}章。` },
        ];

        const result = await callAI({ messages, model: requestModel || undefined });
        const content = result.content;
        if (!content.trim()) continue;

        let title = `第${chapterNum}章`;
        const firstLine = content.split('\n')[0]?.trim();
        if (firstLine && firstLine.startsWith('第') && firstLine.includes('章')) {
          title = firstLine.replace(/^#+\s*/, '');
        }
        const wordCount = content.replace(/\s/g, '').length;

        await db.chapter.upsert({
          where: { novelId_number: { novelId: id, number: chapterNum } },
          create: { novelId: id, number: chapterNum, title, content, wordCount, status: 'completed' },
          update: { title, content, wordCount, status: 'completed' },
        });

        results.push({ chapterNumber: chapterNum, title, wordCount, status: 'completed' });
      } catch (err) {
        results.push({ chapterNumber: chapterNum, title: `第${chapterNum}章`, wordCount: 0, status: 'failed', error: String(err) });
      }
    }

    await db.novel.update({
      where: { id },
      data: { updatedAt: new Date(), ...(novel.status === 'draft' ? { status: 'writing' } : {}) },
    });

    return NextResponse.json({
      success: true,
      total: results.length,
      completed: results.filter(r => r.status === 'completed').length,
      failed: results.filter(r => r.status === 'failed').length,
      chapters: results,
    });
  } catch (error) {
    console.error('Batch chapter generation failed:', error);
    return errorResponse(`批量生成失败: ${error instanceof Error ? error.message : 'Unknown'}`, 500);
  }
}
