import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { STEPS } from '@/lib/steps-config';

// ---------------------------------------------------------------------------
// Helper: fetch novel by ID or return 404 response
// ---------------------------------------------------------------------------

/**
 * Fetch a novel by its ID. Returns the novel record if found, or null.
 * Used with `getNovelOr404` below for a one-liner pattern in API routes.
 */
export async function fetchNovel(novelId: string) {
  return db.novel.findUnique({ where: { id: novelId } });
}

/**
 * Fetch a novel by ID and return a 404 NextResponse if not found.
 * Usage in route handlers:
 *   const novel = await getNovelOr404(novelId);
 *   if (!novel) return novel; // TypeScript narrows to NextResponse
 *   // ... novel is fully typed here
 */
export async function getNovelOr404(novelId: string) {
  const novel = await fetchNovel(novelId);
  if (!novel) {
    return NextResponse.json({ error: '小说不存在' }, { status: 404 }) as unknown as null;
  }
  return novel;
}

// ---------------------------------------------------------------------------
// Helper: create a standard JSON error response
// ---------------------------------------------------------------------------

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

// ---------------------------------------------------------------------------
// Helper: emit events to the WebSocket agent-service (port 3003)
// ---------------------------------------------------------------------------

export async function emitToAgentService(event: {
  type: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  novelId: string;
  timestamp: number;
  data: Record<string, unknown>;
}) {
  try {
    await fetch('/api/emit?XTransformPort=3003', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (e) {
    // Don't fail if WS service is down
    console.warn('Failed to emit to agent service:', e);
  }
}

// ---------------------------------------------------------------------------
// Helper: save an AgentActivity record & emit WS event
// ---------------------------------------------------------------------------

export async function saveActivity(params: {
  novelId: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  type: string;
  content?: string;
  skillName?: string;
  skillDescription?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}) {
  const now = Date.now();
  const activity = await db.agentActivity.create({
    data: {
      novelId: params.novelId,
      agentId: params.agentId,
      agentName: params.agentName,
      type: params.type,
      content: params.content ?? '',
      skillName: params.skillName ?? null,
      skillDescription: params.skillDescription ?? null,
      status: params.status ?? null,
      metadata: JSON.stringify(params.metadata ?? {}),
    },
  });

  // Fire-and-forget WS notification
  emitToAgentService({
    type: params.type as
      | 'thinking'
      | 'skill_start'
      | 'skill_complete'
      | 'message'
      | 'error'
      | 'status_change',
    agentId: params.agentId,
    agentName: params.agentName,
    agentRole: params.agentRole,
    novelId: params.novelId,
    timestamp: now,
    data: {
      content: params.content,
      skillName: params.skillName,
      skillDescription: params.skillDescription,
      status: params.status,
      metadata: params.metadata,
    },
  }).catch(() => {});

  return activity;
}

// ---------------------------------------------------------------------------
// Helper: build the novel-context block injected into agent prompts
// ---------------------------------------------------------------------------

export interface BuildNovelContextOptions {
  /** How many recent completed chapters to include (default 5) */
  chapterTake?: number;
  /** Max characters per chapter content (default 1500) */
  chapterSliceLength?: number;
  /** Whether to include the novel status field (default true) */
  includeStatus?: boolean;
}

export async function buildNovelContext(
  novelId: string,
  options?: BuildNovelContextOptions
): Promise<string> {
  const {
    chapterTake = 5,
    chapterSliceLength = 1500,
    includeStatus = true,
  } = options ?? {};

  const novel = await db.novel.findUnique({ where: { id: novelId } });
  if (!novel) return '';

  const completedSteps = await db.novelStep.findMany({
    where: { novelId, status: 'completed' },
    orderBy: { stepNumber: 'asc' },
  });

  const chapters = await db.chapter.findMany({
    where: { novelId, status: 'completed' },
    orderBy: { number: 'asc' },
    take: chapterTake,
  });

  const stepsContext = completedSteps
    .map((s) => {
      const cfg = STEPS.find((sc) => sc.number === s.stepNumber);
      return `### 第${s.stepNumber}步：${cfg?.title ?? ''}\n${s.content}`;
    })
    .join('\n\n');

  const chaptersContext = chapters
    .map((c) => `### 第${c.number}章：${c.title}\n${c.content.slice(0, chapterSliceLength)}`)
    .join('\n\n');

  let ctx = `## 当前小说信息\n- **标题**：${novel.title}\n- **类型**：${novel.genre}\n- **子类型**：${novel.subgenre || '未设定'}\n- **风格**：${novel.style}\n- **目标字数**：${novel.targetWords}字\n- **当前进度**：第${novel.currentStep}/12步\n`;

  if (includeStatus) {
    ctx += `- **状态**：${novel.status}\n`;
  }

  if (novel.description) {
    ctx += `- **描述**：${novel.description}\n`;
  }

  if (stepsContext) {
    ctx += `\n## 已完成的创作步骤\n${stepsContext}`;
  }

  if (chaptersContext) {
    const chapterSectionTitle = chapterTake >= 5 ? '已完成的章节（最近5章）' : '已完成的章节';
    ctx += `\n## ${chapterSectionTitle}\n${chaptersContext}`;
  }

  return ctx;
}

// ---------------------------------------------------------------------------
// Helper: get recent chat history for context window
// ---------------------------------------------------------------------------

export async function getRecentMessages(
  novelId: string,
  limit = 10
): Promise<{ role: string; content: string }[]> {
  const messages = await db.chatMessage.findMany({
    where: { novelId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return messages.reverse().map((m) => ({ role: m.role, content: m.content }));
}
