import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { callAI, type ChatMessage } from '@/lib/ai';
import { STEPS } from '@/lib/steps-config';
import { getNovelOr404, errorResponse } from '@/lib/agent-helpers';

// Vercel Serverless Function 最大执行时间（秒）
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, model: requestModel } = body;

    if (!message?.trim()) {
      return errorResponse('Message is required', 400);
    }

    const novel = await getNovelOr404(id);
    if (!novel) return errorResponse('Novel not found', 404);

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
    const chatHistory: ChatMessage[] = recentMessages.reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message },
    ];

    const result = await callAI({ messages, model: requestModel || undefined });
    const response = result.content;

    // Save messages to database
    await db.chatMessage.create({
      data: {
        novelId: id,
        role: 'user',
        content: message,
      },
    });

    await db.chatMessage.create({
      data: {
        novelId: id,
        role: 'assistant',
        content: response,
      },
    });

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Failed to chat:', error);
    return errorResponse(`对话失败: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}
