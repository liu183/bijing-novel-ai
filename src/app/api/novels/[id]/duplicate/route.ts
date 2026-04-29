import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the original novel with all its steps
    const original = await db.novel.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // Create a new novel with "(副本)" suffix
    const newTitle = original.title.replace(/（副本）$/, '') + '（副本）';

    const duplicatedNovel = await db.novel.create({
      data: {
        title: newTitle,
        genre: original.genre,
        subgenre: original.subgenre || '',
        style: original.style,
        targetWords: original.targetWords,
        description: original.description,
        status: 'draft',
        currentStep: 0,
      },
    });

    // Copy all steps
    if (original.steps.length > 0) {
      await db.novelStep.createMany({
        data: original.steps.map((step) => ({
          novelId: duplicatedNovel.id,
          stepNumber: step.stepNumber,
          title: step.title,
          content: step.content,
          status: step.status === 'completed' || step.status === 'locked' ? 'pending' : step.status,
        })),
      });
    }

    return NextResponse.json(duplicatedNovel, { status: 201 });
  } catch (error) {
    console.error('Failed to duplicate novel:', error);
    return NextResponse.json({ error: 'Failed to duplicate novel' }, { status: 500 });
  }
}
