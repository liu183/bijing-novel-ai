import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { streamAI, type ChatMessage } from '@/lib/ai';

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { startChapter, endChapter, model: requestModel } = body;

    const novel = await db.novel.findUnique({ where: { id } });
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    const start = startChapter || 1;
    const end = endChapter || start;
    const total = end - start + 1;

    if (start < 1 || end < start || total > 20) {
      return NextResponse.json({ error: 'Invalid chapter range (1-20 chapters max)' }, { status: 400 });
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
      return NextResponse.json({ error: '请先完成Step 2（一页提要）才能生成章节' }, { status: 400 });
    }

    // Get existing chapters for context
    const existingChapters = await db.chapter.findMany({
      where: { novelId: id },
      orderBy: { number: 'asc' },
    });
    const existingContent = existingChapters.map(c => `第${c.number}章 ${c.title}\n${c.content}`).join('\n\n');

    const results = [];

    for (let chapterNum = start; chapterNum <= end; chapterNum++) {
      const systemPrompt = `你是一位专业的网文作家。请为小说《${novel.title}》（${novel.genre}/${novel.style}）创作第${chapterNum}章。

## 故事提要
${synopsis}

${scenes ? `## 场景大纲\n${scenes}` : ''}
${setpieces ? `## 关键场面\n${setpieces}` : ''}
${dialogue ? `## 对白参考\n${dialogue}` : ''}
${pacing ? `## 节奏参考\n${pacing}` : ''}

## 已有章节摘要
${existingContent}

## 创作要求
- 章节字数：3000-5000字
- 每章结尾设置悬念钩子
- 注意与第${chapterNum - 1}章的衔接
- 直接输出小说正文，不要加解释说明
- 用中文创作`;

      try {
        const completion = await (async () => {
          const ai = await import('@/lib/ai').then(m => m.createAIService());
          return ai.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `请创作第${chapterNum}章。` },
            ],
            model: requestModel || undefined,
          });
        })();

        const content = completion.choices[0]?.message?.content || '';
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
      data: { updatedAt: new Date() },
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
    return NextResponse.json(
      { error: `批量生成失败: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
