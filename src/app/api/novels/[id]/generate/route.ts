import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { getSystemPrompt, getUserInputPrompt } from '@/lib/ai-prompts';
import { STEPS } from '@/lib/steps-config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stepNumber, inputs } = body;

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

    // Initialize AI
    const zai = await ZAI.create();
    const systemPrompt = getSystemPrompt(stepNumber, novel, previousSteps);
    const userPrompt = getUserInputPrompt(stepNumber, inputs || {});

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const content = completion.choices[0]?.message?.content || '';

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
      novelId: id,
      role: 'user',
      content: userPrompt,
      stepRef: stepNumber,
    });

    // Save assistant response to chat history
    await db.chatMessage.create({
      novelId: id,
      role: 'assistant',
      content,
      stepRef: stepNumber,
    });

    return NextResponse.json({ success: true, content, step });
  } catch (error) {
    console.error('Failed to generate:', error);

    // Reset step status on error
    const { id } = await params;
    await db.novelStep.upsert({
      where: { novelId_stepNumber: { novelId: id, stepNumber: body?.stepNumber || 0 } },
      create: {
        novelId: id,
        stepNumber: body?.stepNumber || 0,
        title: `Step ${body?.stepNumber || 0}`,
        status: 'pending',
      },
      update: { status: 'pending' },
    }).catch(() => {});

    return NextResponse.json(
      { error: `生成失败: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
