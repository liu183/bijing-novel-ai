import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { STEPS } from '@/lib/steps-config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const novel = await db.novel.findUnique({ where: { id } });
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Get recent chat history
    const recentMessages = await db.chatMessage.findMany({
      where: { novelId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get all completed steps for context
    const completedSteps = await db.novelStep.findMany({
      where: { novelId: id, status: 'completed' },
      orderBy: { stepNumber: 'asc' },
    });

    // Build system prompt with full context
    const stepsContext = completedSteps.map(s => {
      const cfg = STEPS.find(sc => sc.number === s.stepNumber);
      return `### Step ${s.stepNumber}: ${cfg?.title || ''}\n${s.content}`;
    }).join('\n\n');

    const systemPrompt = `你是一位专业的小说创作顾问，正在协助用户创作小说《${novel.title}》。

类型：${novel.genre}，风格：${novel.style}
${novel.description ? `描述：${novel.description}` : ''}

## 已完成的创作步骤
${stepsContext || '（暂无已完成步骤）'}

## 你的职责
- 回答用户关于小说创作的任何问题
- 对已完成的内容提供建议和改进意见
- 帮助用户细化创意和情节
- 保持对整个故事一致性的把控
- 用专业但易懂的语言交流
- 用中文回答`;

    // Build message history
    const chatHistory = recentMessages.reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const messages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...chatHistory,
      { role: 'user' as const, content: message },
    ];

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content || '';

    // Save messages to database
    await db.chatMessage.create({
      novelId: id,
      role: 'user',
      content: message,
    });

    await db.chatMessage.create({
      novelId: id,
      role: 'assistant',
      content: response,
    });

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Failed to chat:', error);
    return NextResponse.json(
      { error: `对话失败: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
