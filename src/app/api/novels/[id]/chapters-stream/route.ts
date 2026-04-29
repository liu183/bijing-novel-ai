import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { streamAI, type ChatMessage } from '@/lib/ai';

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { chapterNumber, model: requestModel } = body;

    const novel = await db.novel.findUnique({ where: { id } });
    if (!novel) {
      return new Response(JSON.stringify({ error: 'Novel not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    const completedSteps = await db.novelStep.findMany({
      where: { novelId: id, status: 'completed' },
      orderBy: { stepNumber: 'asc' },
    });

    const synopsis = completedSteps.find(s => s.stepNumber === 2)?.content || '';
    const scenes = completedSteps.find(s => s.stepNumber === 6)?.content || '';
    const setpieces = completedSteps.find(s => s.stepNumber === 7)?.content || '';
    const dialogue = completedSteps.find(s => s.stepNumber === 8)?.content || '';
    const pacing = completedSteps.find(s => s.stepNumber === 10)?.content || '';

    if (!synopsis) {
      return new Response(JSON.stringify({ error: '请先完成Step 2（一页提要）才能生成章节' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create/update chapter status
    await db.chapter.upsert({
      where: { novelId_number: { novelId: id, number: chapterNumber } },
      create: { novelId: id, number: chapterNumber, title: `第${chapterNumber}章`, status: 'writing' },
      update: { status: 'writing' },
    });

    const systemPrompt = `你是一位专业的网文作家。请为小说《${novel.title}》（${novel.genre}/${novel.style}）创作第${chapterNumber}章。

## 故事提要
${synopsis}

${scenes ? `## 场景大纲\n${scenes}` : ''}
${setpieces ? `## 关键场面\n${setpieces}` : ''}
${dialogue ? `## 对白参考\n${dialogue}` : ''}
${pacing ? `## 节奏参考\n${pacing}` : ''}

## 创作要求
- 章节字数：3000-5000字
- 每章结尾设置悬念钩子
- 体现角色个性和关系张力
- 保持与前文的连贯性
- 体现${novel.style}风格特点
- 直接输出小说正文，不要加任何解释说明
- 用中文创作`;

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
    return new Response(
      JSON.stringify({ error: 'Chapter stream failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
