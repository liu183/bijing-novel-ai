import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createAIService } from '@/lib/ai';
import { STEPS } from '@/lib/steps-config';
import { getAgent, getSkillsForAgent, type AgentRole } from '@/lib/agents';

// ---------------------------------------------------------------------------
// Helper: emit events to the WebSocket agent-service (port 3003)
// ---------------------------------------------------------------------------

// Vercel Serverless Function 最大执行时间（秒）
export const maxDuration = 60;

async function emitToAgentService(event: {
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

async function saveActivity(params: {
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
// Helper: build the novel-context block injected into every agent prompt
// ---------------------------------------------------------------------------

async function buildNovelContext(novelId: string): Promise<string> {
  const novel = await db.novel.findUnique({ where: { id: novelId } });
  if (!novel) return '';

  const completedSteps = await db.novelStep.findMany({
    where: { novelId, status: 'completed' },
    orderBy: { stepNumber: 'asc' },
  });

  const chapters = await db.chapter.findMany({
    where: { novelId, status: 'completed' },
    orderBy: { number: 'asc' },
    take: 5,
  });

  const stepsContext = completedSteps
    .map((s) => {
      const cfg = STEPS.find((sc) => sc.number === s.stepNumber);
      return `### 第${s.stepNumber}步：${cfg?.title ?? ''}\n${s.content}`;
    })
    .join('\n\n');

  const chaptersContext = chapters
    .map((c) => `### 第${c.number}章：${c.title}\n${c.content.slice(0, 1500)}`)
    .join('\n\n');

  let ctx = `## 当前小说信息\n- **标题**：${novel.title}\n- **类型**：${novel.genre}\n- **子类型**：${novel.subgenre || '未设定'}\n- **风格**：${novel.style}\n- **目标字数**：${novel.targetWords}字\n- **当前进度**：第${novel.currentStep}/12步\n- **状态**：${novel.status}\n`;

  if (novel.description) {
    ctx += `- **描述**：${novel.description}\n`;
  }

  if (stepsContext) {
    ctx += `\n## 已完成的创作步骤\n${stepsContext}`;
  }

  if (chaptersContext) {
    ctx += `\n## 已完成的章节（最近5章）\n${chaptersContext}`;
  }

  return ctx;
}

// ---------------------------------------------------------------------------
// Helper: get recent chat history for context window
// ---------------------------------------------------------------------------

async function getRecentMessages(
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

// ---------------------------------------------------------------------------
// POST /api/novels/[id]/agent
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: novelId } = await params;
    const body = await request.json();
    const { message, agentId: requestedAgentId, model: requestModel } = body as {
      message: string;
      agentId?: string;
      model?: string;
    };

    if (!message?.trim()) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }

    // ── 1. Validate novel exists ──────────────────────────────────────────
    const novel = await db.novel.findUnique({ where: { id: novelId } });
    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    // ── 2. Determine target agent ─────────────────────────────────────────
    const targetAgent = requestedAgentId
      ? getAgent(requestedAgentId)
      : getAgent('director');

    if (!targetAgent) {
      return NextResponse.json(
        { error: `未找到Agent: ${requestedAgentId ?? 'director'}` },
        { status: 400 }
      );
    }

    // ── 3. Save the user message ─────────────────────────────────────────
    await db.chatMessage.create({
      novelId,
      role: 'user',
      content: message,
      agentId: targetAgent.id,
      agentName: targetAgent.name,
    });

    // ── 4. Build context ─────────────────────────────────────────────────
    const novelContext = await buildNovelContext(novelId);
    const recentMessages = await getRecentMessages(novelId, 10);

    const now = Date.now();

    // Emit thinking activity
    await saveActivity({
      novelId,
      agentId: targetAgent.id,
      agentName: targetAgent.name,
      agentRole: targetAgent.role,
      type: 'status_change',
      content: `${targetAgent.name}正在思考中...`,
      status: 'working',
    });

    await saveActivity({
      novelId,
      agentId: targetAgent.id,
      agentName: targetAgent.name,
      agentRole: targetAgent.role,
      type: 'thinking',
      content: `正在分析用户消息并准备回复...`,
    });

    // ── 5. Build available skills list for the agent ─────────────────────
    const availableSkills = getSkillsForAgent(targetAgent.id as AgentRole);
    const skillsDescription = availableSkills
      .map((s) => `- **${s.name}**（${s.id}）：${s.description}`)
      .join('\n');

    // ── 6. Build the full system prompt ──────────────────────────────────
    const systemPrompt = `${targetAgent.systemPrompt}

---

# 当前工作上下文

${novelContext}

---

# 你的可用技能

你有以下专业技能可以使用。如果用户的请求适合使用某个技能，请使用它来提供更专业、更详细的结果。你也可以在回复中提及你正在使用哪个技能。

${skillsDescription || '（暂无可用技能）'}

---

# 交互规则

1. 始终使用中文回复
2. 根据用户的请求，判断是否需要使用某个专业技能
3. 如果你决定使用技能，请在回复开头明确标注：**🔧 使用技能：[技能名称]**
4. 然后执行技能对应的任务，给出专业、详细的结果
5. 如果你认为不需要使用特定技能，直接根据你的专业知识回答即可
6. 保持你独特的角色个性和专业风格`;

    // ── 7. Call LLM (Nvidia NIM) ───────────────────────────────────────
    const ai = await createAIService();

    const chatHistory = recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const completion = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: message },
      ],
      model: requestModel || undefined,
    });

    const agentContent = completion.choices[0]?.message?.content || '';

    // ── 8. Parse response to detect skill usage ──────────────────────────
    let usedSkillId: string | null = null;
    let usedSkillName: string | null = null;
    const activities: Record<string, unknown>[] = [];

    // Detect skill usage pattern: **🔧 使用技能：[技能名称]**
    const skillMatch = agentContent.match(
      /\*\*🔧\s*使用技能[：:]\s*(.+?)\*\*/
    );
    if (skillMatch) {
      const matchedSkillName = skillMatch[1].trim();
      const matchedSkill = availableSkills.find(
        (s) =>
          s.name === matchedSkillName ||
          s.id === matchedSkillName ||
          matchedSkillName.includes(s.name)
      );
      if (matchedSkill) {
        usedSkillId = matchedSkill.id;
        usedSkillName = matchedSkill.name;

        // Create skill activities
        const skillStartActivity = await saveActivity({
          novelId,
          agentId: targetAgent.id,
          agentName: targetAgent.name,
          agentRole: targetAgent.role,
          type: 'skill_start',
          content: `开始使用「${matchedSkill.name}」技能`,
          skillName: matchedSkill.name,
          skillDescription: matchedSkill.description,
        });
        activities.push(skillStartActivity);

        const skillCompleteActivity = await saveActivity({
          novelId,
          agentId: targetAgent.id,
          agentName: targetAgent.name,
          agentRole: targetAgent.role,
          type: 'skill_complete',
          content: `「${matchedSkill.name}」技能执行完成`,
          skillName: matchedSkill.name,
          skillDescription: matchedSkill.description,
        });
        activities.push(skillCompleteActivity);
      }
    }

    // ── 9. Save agent message to DB ──────────────────────────────────────
    const savedMessage = await db.chatMessage.create({
      novelId,
      role: 'agent',
      content: agentContent,
      agentId: targetAgent.id,
      agentName: targetAgent.name,
      skillUsed: usedSkillId,
    });

    // Save message activity
    const messageActivity = await saveActivity({
      novelId,
      agentId: targetAgent.id,
      agentName: targetAgent.name,
      agentRole: targetAgent.role,
      type: 'message',
      content: agentContent.slice(0, 200),
    });

    // Emit done status
    await saveActivity({
      novelId,
      agentId: targetAgent.id,
      agentName: targetAgent.name,
      agentRole: targetAgent.role,
      type: 'status_change',
      content: `${targetAgent.name}已完成回复`,
      status: 'done',
    });

    // ── 10. Return response ──────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      agentMessage: {
        id: savedMessage.id,
        agentId: targetAgent.id,
        agentName: targetAgent.name,
        agentRole: targetAgent.role,
        avatar: targetAgent.avatar,
        content: agentContent,
        skillsUsed: usedSkillId
          ? [{ skillId: usedSkillId, skillName: usedSkillName }]
          : undefined,
        timestamp: savedMessage.createdAt.toISOString(),
      },
      activities: [messageActivity, ...activities],
    });
  } catch (error) {
    console.error('[Agent API] Error:', error);

    // Try to save error activity
    const { id: novelId } = await params;
    saveActivity({
      novelId,
      agentId: 'director',
      agentName: '总导演',
      agentRole: '创作总指挥',
      type: 'error',
      content: `处理请求时出错: ${error instanceof Error ? error.message : '未知错误'}`,
    }).catch(() => {});

    return NextResponse.json(
      {
        error: `Agent处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}
