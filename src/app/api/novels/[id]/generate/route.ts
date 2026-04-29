import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createAIService } from '@/lib/ai';
import { getSystemPrompt, getUserInputPrompt } from '@/lib/ai-prompts';
import { STEPS } from '@/lib/steps-config';

// Vercel Serverless Function 最大执行时间（秒）
// Hobby: 60s, Pro: 300s
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 将变量提升到 try 外部，避免 catch 块中的作用域问题
  let novelId = '';
  let stepNumber = 0;

  try {
    const { id } = await params;
    novelId = id;

    const body = await request.json();
    const { stepNumber: reqStepNumber, inputs, model: requestModel } = body;
    stepNumber = reqStepNumber;

    if (!stepNumber || stepNumber < 1 || stepNumber > 12) {
      return NextResponse.json(
        { error: '无效的步骤编号，请提供 1-12 之间的数字' },
        { status: 400 }
      );
    }

    // Get novel
    const novel = await db.novel.findUnique({ where: { id } });
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Get previous completed steps
    const previousSteps = await db.novelStep.findMany({
      where: {
        novelId: id,
        stepNumber: { lt: stepNumber },
        status: 'completed',
      },
      orderBy: { stepNumber: 'asc' },
    });

    // Update step status to generating
    await db.novelStep.upsert({
      where: { novelId_stepNumber: { novelId: id, stepNumber } },
      create: {
        novelId: id,
        stepNumber,
        title: STEPS.find(s => s.number === stepNumber)?.title || `Step ${stepNumber}`,
        status: 'generating',
      },
      update: { status: 'generating' },
    });

    // Initialize AI (Nvidia NIM)
    const ai = await createAIService();
    const systemPrompt = getSystemPrompt(stepNumber, novel, previousSteps);
    const userPrompt = getUserInputPrompt(stepNumber, inputs || {});

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Generate] Novel: ${novel.title}, Step: ${stepNumber}, Messages: ${previousSteps.length} previous steps`);
    }

    const completion = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: requestModel || undefined,
    });

    const content = completion.choices[0]?.message?.content || '';

    if (!content.trim()) {
      throw new Error('AI 返回了空内容，请重试');
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Generate] Success: ${content.length} chars`);
    }

    // Save result
    const step = await db.novelStep.upsert({
      where: { novelId_stepNumber: { novelId: id, stepNumber } },
      create: {
        novelId: id,
        stepNumber,
        title: STEPS.find(s => s.number === stepNumber)?.title || `Step ${stepNumber}`,
        content,
        status: 'completed',
      },
      update: { content, status: 'completed' },
    });

    // Update novel current step
    await db.novel.update({
      where: { id },
      data: { currentStep: stepNumber, updatedAt: new Date() },
    });

    // Save user message to chat history
    await db.chatMessage.create({
      data: {
        novelId: id,
        role: 'user',
        content: userPrompt,
        stepRef: stepNumber,
      },
    });

    // Save assistant response to chat history
    await db.chatMessage.create({
      data: {
        novelId: id,
        role: 'assistant',
        content,
        stepRef: stepNumber,
      },
    });

    return NextResponse.json({ success: true, content, step });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Generate] Failed: novel=${novelId}, step=${stepNumber}, error=${errorMsg}`, error);

    // Reset step status on error — 使用已保存的 novelId 和 stepNumber
    if (novelId && stepNumber > 0) {
      try {
        await db.novelStep.upsert({
          where: { novelId_stepNumber: { novelId, stepNumber } },
          create: {
            novelId,
            stepNumber,
            title: `Step ${stepNumber}`,
            status: 'pending',
          },
          update: { status: 'pending' },
        });
      } catch (resetError) {
        console.error('[Generate] Failed to reset step status:', resetError);
      }
    }

    // 针对不同错误类型返回更友好的提示
    if (errorMsg.includes('API_KEY') || errorMsg.includes('API Key') || errorMsg.includes('环境变量未设置')) {
      return NextResponse.json(
        { error: 'AI 服务未配置，请先设置对应的服务商 API Key 环境变量' },
        { status: 503 }
      );
    }

    if (errorMsg.includes('timeout') || errorMsg.includes('TIMEOUT') || errorMsg.includes('Timeout')) {
      return NextResponse.json(
        { error: 'AI 生成超时，请稍后重试（可能需要较长时间处理）' },
        { status: 504 }
      );
    }

    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'AI 服务认证失败，请检查 API Key 是否正确' },
        { status: 503 }
      );
    }

    if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      return NextResponse.json(
        { error: 'AI 服务请求频率超限，请稍后重试' },
        { status: 429 }
      );
    }

    if (errorMsg.includes('does not exist') || errorMsg.includes('relation')) {
      return NextResponse.json(
        { error: '数据库表结构异常，请联系管理员初始化数据库' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `生成失败: ${errorMsg}` },
      { status: 500 }
    );
  }
}
