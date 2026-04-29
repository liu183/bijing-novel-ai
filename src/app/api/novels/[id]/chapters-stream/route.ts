import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { streamAI, type ChatMessage } from '@/lib/ai';
import { buildChapterPrompt } from '@/lib/ai-prompts';
import { getNovelOr404, errorResponse } from '@/lib/agent-helpers';

export const maxDuration = 120;

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

    // Create/update chapter status
    await db.chapter.upsert({
      where: { novelId_number: { novelId: id, number: chapterNumber } },
      create: { novelId: id, number: chapterNumber, title: `第${chapterNumber}章`, status: 'writing' },
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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        try {
          for await (const chunk of streamAI({
            messages,
            model: requestModel || undefined,
            maxTokens: 8192,
          })) {
            if (chunk.type === 'content') {
              fullContent += chunk.data;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk.data })}\n\n`)
              );
            } else if (chunk.type === 'error') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'error', data: chunk.data })}\n\n`)
              );
              break;
            } else if (chunk.type === 'done') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              );
            }
          }

          // Save completed chapter
          if (fullContent) {
            let title = `第${chapterNumber}章`;
            const firstLine = fullContent.split('\n')[0]?.trim();
            if (firstLine && (firstLine.startsWith('第') && firstLine.includes('章'))) {
              title = firstLine.replace(/^#+\s*/, '');
            }
            const wordCount = fullContent.replace(/\s/g, '').length;

            await db.chapter.upsert({
              where: { novelId_number: { novelId: id, number: chapterNumber } },
              create: { novelId: id, number: chapterNumber, title, content: fullContent, wordCount, status: 'completed' },
              update: { title, content: fullContent, wordCount, status: 'completed' },
            });

            // Update novel updatedAt
            await db.novel.update({
              where: { id },
              data: { updatedAt: new Date() },
            });
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', data: 'Streaming failed' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chapter stream failed:', error);
    return errorResponse('Chapter stream failed', 500);
  }
}
