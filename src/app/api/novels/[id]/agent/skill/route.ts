import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { STEPS } from '@/lib/steps-config';
import {
  getAgent,
  getSkill,
  type AgentRole,
} from '@/lib/agents';

// ---------------------------------------------------------------------------
// Helper: emit events to the WebSocket agent-service (port 3003)
// ---------------------------------------------------------------------------

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
// Helper: build the novel-context block for skill prompts
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
    take: 3,
  });

  const stepsContext = completedSteps
    .map((s) => {
      const cfg = STEPS.find((sc) => sc.number === s.stepNumber);
      return `### 第${s.stepNumber}步：${cfg?.title ?? ''}\n${s.content}`;
    })
    .join('\n\n');

  const chaptersContext = chapters
    .map((c) => `### 第${c.number}章：${c.title}\n${c.content.slice(0, 1000)}`)
    .join('\n\n');

  let ctx = `## 当前小说信息\n- **标题**：${novel.title}\n- **类型**：${novel.genre}\n- **子类型**：${novel.subgenre || '未设定'}\n- **风格**：${novel.style}\n- **目标字数**：${novel.targetWords}字\n- **当前进度**：第${novel.currentStep}/12步\n`;

  if (novel.description) {
    ctx += `- **描述**：${novel.description}\n`;
  }

  if (stepsContext) {
    ctx += `\n## 已完成的创作步骤\n${stepsContext}`;
  }

  if (chaptersContext) {
    ctx += `\n## 已完成的章节\n${chaptersContext}`;
  }

  return ctx;
}

// ---------------------------------------------------------------------------
// POST /api/novels/[id]/agent/skill
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: novelId } = await params;
    const body = await request.json();
    const { agentId, skillId, inputs } = body as {
      agentId: string;
      skillId: string;
      inputs: Record<string, string>;
    };

    // ── 1. Validate inputs ───────────────────────────────────────────────
    if (!agentId) {
      return NextResponse.json(
        { error: '请指定目标Agent' },
        { status: 400 }
      );
    }
    if (!skillId) {
      return NextResponse.json(
        { error: '请指定要执行的技能' },
        { status: 400 }
      );
    }

    // ── 2. Validate agent exists ─────────────────────────────────────────
    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: `未找到Agent: ${agentId}` },
        { status: 404 }
      );
    }

    // ── 3. Validate skill exists ─────────────────────────────────────────
    const skill = getSkill(skillId);
    if (!skill) {
      return NextResponse.json(
        { error: `未找到技能: ${skillId}` },
        { status: 404 }
      );
    }

    // ── 4. Validate novel exists ─────────────────────────────────────────
    const novel = await db.novel.findUnique({ where: { id: novelId } });
    if (!novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 });
    }

    // ── 5. Validate required skill parameters ────────────────────────────
    const missingParams = skill.parameters
      .filter((p) => p.required && !inputs?.[p.key])
      .map((p) => p.label);

    if (missingParams.length > 0) {
      return NextResponse.json(
        {
          error: `缺少必要参数: ${missingParams.join('、')}`,
          missingParams,
        },
        { status: 400 }
      );
    }

    // ── 6. Build activities timeline ─────────────────────────────────────
    const activities: Record<string, unknown>[] = [];

    // Status: working
    const statusActivity = await saveActivity({
      novelId,
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      type: 'status_change',
      content: `${agent.name}正在使用「${skill.name}」技能...`,
      status: 'working',
    });
    activities.push(statusActivity);

    // Thinking activity
    const thinkingActivity = await saveActivity({
      novelId,
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      type: 'thinking',
      content: `正在准备执行技能「${skill.name}」，参数：${JSON.stringify(inputs ?? {})}`,
    });
    activities.push(thinkingActivity);

    // Skill start activity
    const skillStartActivity = await saveActivity({
      novelId,
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      type: 'skill_start',
      content: `开始执行技能「${skill.name}」- ${skill.description}`,
      skillName: skill.name,
      skillDescription: skill.description,
      metadata: { inputs: inputs ?? {} },
    });
    activities.push(skillStartActivity);

    // ── 7. Build specialized skill prompt ────────────────────────────────
    const novelContext = await buildNovelContext(novelId);

    // Format inputs into a readable block
    const inputsBlock = Object.entries(inputs ?? {})
      .map(([key, value]) => {
        const paramDef = skill.parameters.find((p) => p.key === key);
        const label = paramDef?.label ?? key;
        return `- **${label}**：${value}`;
      })
      .join('\n');

    const skillSystemPrompt = `${agent.systemPrompt}

---

# 当前工作上下文

${novelContext}

---

# 技能执行任务

你现在需要执行你的专业技能。请严格按照以下要求执行：

## 🎯 技能名称
${skill.name}

## 📋 技能描述
${skill.description}

## 📥 输入参数
${inputsBlock}

## 📤 输出格式
${skill.outputFormat}

---

# 执行要求

1. 根据上述输入参数和小说上下文，执行此技能
2. 严格按照指定的输出格式输出结果
3. 确保输出内容与小说的整体设定和风格保持一致
4. 内容要专业、详细、有深度，不要敷衍了事
5. 如果某些参数未提供但有默认值，请使用默认值
6. 始终使用中文输出`;

    // ── 8. Call LLM ──────────────────────────────────────────────────────
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: skillSystemPrompt },
        {
          role: 'user',
          content: `请执行技能「${skill.name}」，使用上述参数进行创作。`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const result = completion.choices[0]?.message?.content || '';

    // ── 9. Save activities ───────────────────────────────────────────────
    const skillCompleteActivity = await saveActivity({
      novelId,
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      type: 'skill_complete',
      content: `技能「${skill.name}」执行完成，输出长度：${result.length}字`,
      skillName: skill.name,
      skillDescription: skill.description,
      metadata: { outputLength: result.length },
    });
    activities.push(skillCompleteActivity);

    // Save the skill result as an agent chat message
    await db.chatMessage.create({
      novelId,
      role: 'agent',
      content: result,
      agentId: agent.id,
      agentName: agent.name,
      skillUsed: skill.id,
    });

    // Status: done
    const doneActivity = await saveActivity({
      novelId,
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      type: 'status_change',
      content: `${agent.name}已完成「${skill.name}」技能执行`,
      status: 'done',
    });
    activities.push(doneActivity);

    // ── 10. Return result ────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      result,
      activities,
      skill: {
        id: skill.id,
        name: skill.name,
        description: skill.description,
      },
      agent: {
        id: agent.id,
        name: agent.name,
        avatar: agent.avatar,
      },
    });
  } catch (error) {
    console.error('[Agent Skill API] Error:', error);

    const { id: novelId } = await params;
    saveActivity({
      novelId,
      agentId: body?.agentId ?? 'director',
      agentName: '系统',
      agentRole: '系统',
      type: 'error',
      content: `技能执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
    }).catch(() => {});

    return NextResponse.json(
      {
        error: `技能执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}
