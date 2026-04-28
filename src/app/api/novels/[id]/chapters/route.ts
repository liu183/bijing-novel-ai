import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createAIService } from '@/lib/ai';

// Vercel Serverless Function 最大执行时间（秒）
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { chapterNumber } = body;

    const novel = await db.novel.findUnique({ where: { id } });
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Get all completed steps for context
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

    const ai = await createAIService();
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

    const completion = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请创作第${chapterNumber}章的完整正文。注意与前面章节的衔接。` },
      ],
    });

    const content = completion.choices[0]?.message?.content || '';
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

    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    console.error('Failed to generate chapter:', error);
    return NextResponse.json(
      { error: `章节生成失败: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
