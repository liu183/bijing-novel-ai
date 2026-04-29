import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { STEPS } from '@/lib/steps-config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const keyword = query.trim();

    // Search steps
    const stepMatches = await db.novelStep.findMany({
      where: {
        novelId: id,
        content: { contains: keyword },
      },
      select: { stepNumber: true, title: true, content: true },
    });

    // Search chapters
    const chapterMatches = await db.chapter.findMany({
      where: {
        novelId: id,
        content: { contains: keyword },
      },
      select: { number: true, title: true, content: true },
    });

    // Build results with excerpts
    const results = [
      ...stepMatches.map((step) => ({
        type: 'step' as const,
        id: step.stepNumber,
        title: step.title || `Step ${step.stepNumber}`,
        excerpt: buildExcerpt(step.content, keyword),
      })),
      ...chapterMatches.map((chapter) => ({
        type: 'chapter' as const,
        id: chapter.number,
        title: chapter.title,
        excerpt: buildExcerpt(chapter.content, keyword),
      })),
    ];

    return NextResponse.json({ query: keyword, results, total: results.length });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

function buildExcerpt(content: string, keyword: string): string {
  if (!content) return '';
  const lower = content.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const index = lower.indexOf(lowerKeyword);

  if (index === -1) return content.slice(0, 100);

  // Calculate excerpt window around match
  const contextRadius = 50;
  let start = Math.max(0, index - contextRadius);
  let end = Math.min(content.length, index + keyword.length + contextRadius);

  // Try to break at whitespace boundaries
  if (start > 0) {
    const spaceBefore = content.indexOf(' ', start);
    if (spaceBefore !== -1 && spaceBefore < start + 20) start = spaceBefore + 1;
  }
  if (end < content.length) {
    const spaceAfter = content.lastIndexOf(' ', end);
    if (spaceAfter !== -1 && spaceAfter > end - 20) end = spaceAfter;
  }

  let excerpt = '';
  if (start > 0) excerpt += '...';
  excerpt += content.slice(start, end);
  if (end < content.length) excerpt += '...';

  // Highlight the keyword with <mark> tags
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  excerpt = excerpt.replace(regex, '<mark>$1</mark>');

  return excerpt;
}
