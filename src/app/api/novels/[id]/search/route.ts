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

    // Search steps (content needed server-side for excerpt, but not returned in response)
    const stepMatches = await db.novelStep.findMany({
      where: {
        novelId: id,
        content: { contains: keyword },
      },
      select: { stepNumber: true, title: true, content: true },
    });

    // Search chapters (content needed server-side for excerpt, but not returned in response)
    const chapterMatches = await db.chapter.findMany({
      where: {
        novelId: id,
        content: { contains: keyword },
      },
      select: { id: true, number: true, title: true, wordCount: true, content: true },
    });

    // Build results with excerpts — full content stays server-side only
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
        wordCount: chapter.wordCount,
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
  const matchIndex = lower.indexOf(lowerKeyword);

  if (matchIndex === -1) return content.slice(0, 100);

  const matchLength = keyword.length;
  const contextLength = 50;

  // For CJK text, use character index directly without space-boundary adjustment
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(content.length, matchIndex + matchLength + contextLength);

  let excerpt = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');

  // Highlight the match within the excerpt
  const localStart = matchIndex - start;
  const localEnd = localStart + matchLength;
  excerpt = excerpt.slice(0, localStart) + '<mark>' + excerpt.slice(localStart, localEnd) + '</mark>' + excerpt.slice(localEnd);

  return excerpt;
}
