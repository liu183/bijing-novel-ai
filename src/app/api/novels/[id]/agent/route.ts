import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createAIService } from '@/lib/ai';
import { getAgent, getSkillsForAgent, type AgentRole } from '@/lib/agents';
import {
  emitToAgentService,
  saveActivity,
  buildNovelContext,
  getRecentMessages,
} from '@/lib/agent-helpers';

// Vercel Serverless Function 最大执行时间（秒）
export const maxDuration = 60;

// Re-export for convenience if other agent routes need emitToAgentService directly
export { emitToAgentService };

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
      data: {
        novelId,
        role: 'user',
        content: message,
        agentId: targetAgent.id,
        agentName: targetAgent.name,
      },
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
      data: {
        novelId,
        role: 'agent',
        content: agentContent,
        agentId: targetAgent.id,
        agentName: targetAgent.name,
        skillUsed: usedSkillId,
      },
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
