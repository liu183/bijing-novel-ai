import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createAIService } from '@/lib/ai';
import {
  getAgent,
  getSkill,
  type AgentRole,
} from '@/lib/agents';
import {
  emitToAgentService,
  saveActivity,
  buildNovelContext,
} from '@/lib/agent-helpers';

// Re-export for convenience
export { emitToAgentService };

// Vercel Serverless Function 最大执行时间（秒）
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// POST /api/novels/[id]/agent/skill
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 将变量提升到 try 外部，避免 catch 块中的引用错误
  let novelId = '';
  let savedAgentId = '';

  try {
    const { id } = await params;
    novelId = id;

    const body = await request.json();
    const { agentId, skillId, inputs } = body as {
      agentId: string;
      skillId: string;
      inputs: Record<string, string>;
    };
    savedAgentId = agentId;

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
    const novelContext = await buildNovelContext(novelId, {
      chapterTake: 3,
      chapterSliceLength: 1000,
      includeStatus: false,
    });

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

    // ── 8. Call LLM (Nvidia NIM) ──────────────────────────────────────
    const ai = await createAIService();

    const completion = await ai.chat.completions.create({
      messages: [
        { role: 'system', content: skillSystemPrompt },
        {
          role: 'user',
          content: `请执行技能「${skill.name}」，使用上述参数进行创作。`,
        },
      ],
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
      data: {
        novelId,
        role: 'agent',
        content: result,
        agentId: agent.id,
        agentName: agent.name,
        skillUsed: skill.id,
      },
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

    const errorId = novelId || (await params).id;
    saveActivity({
      novelId: errorId,
      agentId: savedAgentId || 'director',
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
