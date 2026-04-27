// ============================================================================
// Nvidia NIM API Client
// 笔境 AI - 统一大模型服务层
// ============================================================================
//
// 使用 Nvidia NIM API (OpenAI 兼容接口) 替代 z-ai-web-dev-sdk
// API 基础URL: https://integrate.api.nvidia.com/v1
// 文档: https://docs.api.nvidia.com/nim/reference/
// ============================================================================

import { DEFAULT_MODEL_ID, getModelInfo } from './models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
}

export interface ChatCompletionResult {
  id: string;
  model: string;
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error(
      'NVIDIA_API_KEY 环境变量未设置。请在 .env.local 文件中配置 NVIDIA_API_KEY。'
    );
  }
  return key;
}

function getCustomModel(): string | null {
  return process.env.NVIDIA_MODEL || null;
}

// ---------------------------------------------------------------------------
// Core API call
// ---------------------------------------------------------------------------

async function callNvidiaAPI(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const apiKey = getApiKey();
  const model = options.model || getCustomModel() || DEFAULT_MODEL_ID;

  const modelInfo = getModelInfo(model);

  const body: Record<string, unknown> = {
    model,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? (modelInfo?.maxTokens ? Math.min(4096, modelInfo.maxTokens) : 4096),
    top_p: options.topP ?? 0.9,
    frequency_penalty: options.frequencyPenalty ?? 0.3,
    presence_penalty: options.presencePenalty ?? 0.3,
  };

  if (options.stream) {
    body.stream = true;
  }

  console.log(`[Nvidia AI] Calling model: ${model}`);
  console.log(`[Nvidia AI] Messages count: ${options.messages.length}`);

  const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'NVAPI-KEY': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Nvidia AI] API Error ${response.status}: ${errorText}`);
    throw new Error(`Nvidia API 调用失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    id: data.id || '',
    model: data.model || model,
    content: data.choices?.[0]?.message?.content || '',
    finishReason: data.choices?.[0]?.finish_reason || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Streaming API call (SSE)
// ---------------------------------------------------------------------------

export async function* streamNvidiaAPI(
  options: ChatCompletionOptions
): AsyncGenerator<{ type: 'content' | 'done' | 'error'; data: string }> {
  const apiKey = getApiKey();
  const model = options.model || getCustomModel() || DEFAULT_MODEL_ID;

  const modelInfo = getModelInfo(model);

  const body = {
    model,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? (modelInfo?.maxTokens ? Math.min(4096, modelInfo.maxTokens) : 4096),
    top_p: options.topP ?? 0.9,
    frequency_penalty: options.frequencyPenalty ?? 0.3,
    presence_penalty: options.presencePenalty ?? 0.3,
    stream: true,
  };

  console.log(`[Nvidia AI] Streaming model: ${model}`);

  const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'NVAPI-KEY': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    yield { type: 'error', data: `Nvidia API 调用失败 (${response.status}): ${errorText}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', data: '无法读取响应流' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          yield { type: 'done', data: '' };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield { type: 'content', data: content };
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    yield { type: 'done', data: '' };
  } catch (error) {
    yield {
      type: 'error',
      data: `流式传输错误: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * 创建一个与 z-ai-web-dev-sdk 兼容的 AI 服务实例
 * 用法与原来的 ZAI.create() 相同，但底层使用 Nvidia API
 */
export async function createAIService() {
  return {
    chat: {
      completions: {
        /**
         * 创建聊天补全
         * 兼容 z-ai-web-dev-sdk 的调用格式
         */
        async create(options: {
          messages: { role: string; content: string }[];
          thinking?: { type: string };
          model?: string;
          temperature?: number;
          max_tokens?: number;
        }): Promise<{
          choices: Array<{
            message: { content: string; role: string };
            finish_reason: string;
          }>;
          model: string;
          id: string;
          usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
        }> {
          const result = await callNvidiaAPI({
            messages: options.messages.map((m) => ({
              role: m.role as 'system' | 'user' | 'assistant',
              content: m.content,
            })),
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.max_tokens,
          });

          return {
            choices: [
              {
                message: {
                  content: result.content,
                  role: 'assistant',
                },
                finish_reason: result.finishReason,
              },
            ],
            model: result.model,
            id: result.id,
            usage: result.usage,
          };
        },

        /**
         * 流式聊天补全
         */
        stream: streamNvidiaAPI,
      },
    },
  };
}

/**
 * 快速调用 - 发送消息并获取回复
 */
export async function chat(messages: ChatMessage[], model?: string): Promise<string> {
  const result = await callNvidiaAPI({ messages, model });
  return result.content;
}

/**
 * 获取当前配置的模型ID
 */
export function getCurrentModelId(): string {
  return getCustomModel() || DEFAULT_MODEL_ID;
}

/**
 * 获取当前模型信息
 */
export function getCurrentModelInfo() {
  return getModelInfo(getCurrentModelId());
}

/**
 * 验证 API Key 是否有效
 */
export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const response = await fetch(`${NVIDIA_API_BASE}/models`, {
      headers: {
        Authorization: `Bearer ${key}`,
        'NVAPI-KEY': key,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
