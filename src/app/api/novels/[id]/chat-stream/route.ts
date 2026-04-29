import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { streamAI, type ChatMessage } from '@/lib/ai';

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, model: requestModel } = body;

    const novel = await db.novel.findUnique({ where: { id } });
    if (!novel) {
      return new Response(JSON.stringify({ error: 'Novel not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build message history from DB
    const recentMessages = await db.chatMessage.findMany({
      where: { novelId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const history: ChatMessage[] = recentMessages
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

    const systemPrompt = `你是一位专业的网文创作助手，正在帮助用户创作小说《${novel.title}》（${novel.genre}/${novel.style}）。
目标字数：${novel.targetWords}字。
请用中文回答，提供专业、有建设性的创作建议。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    // Save user message
    await db.chatMessage.create({
      data: {
        novelId: id,
        role: 'user',
        content: message,
      },
    });

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';
          for await (const chunk of streamAI({
            messages,
            model: requestModel || undefined,
          })) {
            if (chunk.type === 'content') {
              fullContent += chunk.data;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', data: chunk.data })}\n\n`)
              );
            } else if (chunk.type === 'error') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'error', data: chunk.data })}\n\n`)
              );
              break;
            } else if (chunk.type === 'done') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done', data: '' })}\n\n`)
              );
            }
          }

          // Save assistant response
          if (fullContent) {
            await db.chatMessage.create({
              data: {
                novelId: id,
                role: 'assistant',
                content: fullContent,
              },
            });
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', data: 'Streaming failed' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Chat stream failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
