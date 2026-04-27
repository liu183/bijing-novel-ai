import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { STEPS } from '@/lib/steps-config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const steps = await db.novelStep.findMany({
      where: { novelId: id },
      orderBy: { stepNumber: 'asc' },
    });
    return NextResponse.json(steps);
  } catch (error) {
    console.error('Failed to fetch steps:', error);
    return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stepNumber, content, status } = body;

    const stepConfig = STEPS.find(s => s.number === stepNumber);
    if (!stepConfig) {
      return NextResponse.json({ error: 'Invalid step number' }, { status: 400 });
    }

    // Upsert step
    const step = await db.novelStep.upsert({
      where: {
        novelId_stepNumber: { novelId: id, stepNumber },
      },
      create: {
        novelId: id,
        stepNumber,
        title: stepConfig.title,
        content: content || '',
        status: status || 'pending',
      },
      update: {
        content: content !== undefined ? content : undefined,
        status: status || undefined,
      },
    });

    // Update novel current step
    if (status === 'completed') {
      await db.novel.update({
        where: { id },
        data: { currentStep: Math.max(stepNumber, (await db.novel.findUnique({ where: { id } }))?.currentStep || 0) },
      });
    }

    return NextResponse.json(step);
  } catch (error) {
    console.error('Failed to save step:', error);
    return NextResponse.json({ error: 'Failed to save step' }, { status: 500 });
  }
}
