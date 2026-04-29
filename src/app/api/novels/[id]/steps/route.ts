import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { STEPS } from '@/lib/steps-config';

// Helper: Auto-detect and update novel status based on all steps
async function autoDetectNovelStatus(novelId: string) {
  try {
    const allSteps = await db.novelStep.findMany({
      where: { novelId },
      select: { status: true },
    });
    const totalSteps = STEPS.length;
    const completedOrLocked = allSteps.filter(
      (s) => s.status === 'completed' || s.status === 'locked'
    ).length;

    if (completedOrLocked >= totalSteps) {
      // All steps done → novel is completed
      await db.novel.update({
        where: { id: novelId },
        data: { status: 'completed' },
      });
    } else if (completedOrLocked > 0) {
      // Some steps done → novel is at least writing
      const novel = await db.novel.findUnique({ where: { id: novelId }, select: { status: true } });
      if (novel && novel.status === 'draft') {
        await db.novel.update({
          where: { id: novelId },
          data: { status: 'writing' },
        });
      }
    }
  } catch {
    // Best-effort, don't fail the main request
  }
}

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stepNumber, content, title, status } = body;

    if (!stepNumber) {
      return NextResponse.json({ error: 'stepNumber is required' }, { status: 400 });
    }

    const step = await db.novelStep.upsert({
      where: { novelId_stepNumber: { novelId: id, stepNumber } },
      create: {
        novelId: id,
        stepNumber,
        title: title || `Step ${stepNumber}`,
        content: content || '',
        status: status || 'pending',
      },
      update: {
        ...(content !== undefined && { content }),
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
      },
    });

    // Auto-detect novel status after PUT
    await autoDetectNovelStatus(id);

    return NextResponse.json(step);
  } catch (error) {
    console.error('Failed to update step:', error);
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
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

    // Auto-detect novel status after POST
    await autoDetectNovelStatus(id);

    return NextResponse.json(step);
  } catch (error) {
    console.error('Failed to save step:', error);
    return NextResponse.json({ error: 'Failed to save step' }, { status: 500 });
  }
}
