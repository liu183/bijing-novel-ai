import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getNovelOr404, errorResponse } from '@/lib/agent-helpers';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the original novel with all its steps
    const original = await getNovelOr404(id, {
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
    if (!original) return errorResponse('Novel not found', 404);

    // Create a new novel with "(副本)" suffix
    const newTitle = (original.title as string).replace(/（副本）$/, '') + '（副本）';

    const duplicatedNovel = await db.novel.create({
      data: {
        title: newTitle,
        genre: original.genre,
        subgenre: (original.subgenre as string) || '',
        style: original.style,
        targetWords: original.targetWords,
        description: original.description,
        status: 'draft',
        currentStep: 0,
      },
    });

    // Copy all steps (include was passed so steps exist on the record)
    const steps = (original as unknown as { steps: Array<{ stepNumber: number; title: string; content: string; status: string }> }).steps;
    if (steps.length > 0) {
      await db.novelStep.createMany({
        data: steps.map((step) => ({
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
    return errorResponse('Failed to duplicate novel', 500);
  }
}
