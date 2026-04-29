// ============================================================================
// Unified AI Service Layer
// 笔境 AI - 多服务商大模型统一调用层
// ============================================================================
//
// 支持 Nvidia NIM、智谱 GLM 等多个服务商
// 所有服务商均使用 OpenAI 兼容接口
// ============================================================================

import { DEFAULT_MODEL_ID, getModelInfo, getApiBaseForModel, getApiKeyEnvForModel } from './models';

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

// 默认超时时间：55 秒（留出 Vercel maxDuration 60s 的余量）
const API_TIMEOUT_MS = 55_000;

/**
 * 根据模型 ID 获取 API Key
 * 智谱 GLM → GLM_API_KEY
 * Nvidia / 其他 → NVIDIA_API_KEY
 */
function getApiKeyForModel(modelId: string): string {
  const envName = getApiKeyEnvForModel(modelId);
  const key = process.env[envName];

  if (!key) {
    const provider = getModelInfo(modelId)?.provider || 'Nvidia';
    throw new Error(
      `${envName} 环境变量未设置。请在 .env.local 文件中配置 ${envName}（当前模型: ${modelId}，服务商: ${provider}）。`
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// Core API call — unified for all providers
// ---------------------------------------------------------------------------

async function callAI(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const model = options.model || DEFAULT_MODEL_ID;
  const apiKey = getApiKeyForModel(model);
  const apiBase = getApiBaseForModel(model);
  const modelInfo = getModelInfo(model);

  // Build request body (OpenAI compatible)
  const body: Record<string, unknown> = {
    model,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? (modelInfo?.maxTokens ? Math.min(8192, modelInfo.maxTokens) : 8192),
    top_p: options.topP ?? 0.9,
    frequency_penalty: options.frequencyPenalty ?? 0.3,
    presence_penalty: options.presencePenalty ?? 0.3,
  };

  if (options.stream) {
    body.stream = true;
  }

  console.log(`[AI] Calling model: ${model} (provider: ${modelInfo?.provider || 'unknown'})`);
  console.log(`[AI] API base: ${apiBase}`);
  console.log(`[AI] Messages count: ${options.messages.length}`);

  // Build headers based on provider
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  // Nvidia NIM requires an additional NVAPI-KEY header
  const provider = modelInfo?.provider;
  if (provider !== '智谱GLM') {
    headers['NVAPI-KEY'] = apiKey;
  }

  // AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
      console.error(`[AI] Request timeout after ${API_TIMEOUT_MS / 1000}s`);
      throw new Error(`AI 请求超时 (${API_TIMEOUT_MS / 1000}s)，请稍后重试`);
    }
    console.error('[AI] Network error:', fetchError);
    throw new Error(`AI 网络错误: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI] API Error ${response.status}: ${errorText}`);
    throw new Error(`AI 调用失败 (${response.status}): ${errorText}`);
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

export async function* streamAI(
  options: ChatCompletionOptions
): AsyncGenerator<{ type: 'content' | 'done' | 'error'; data: string }> {
  const model = options.model || DEFAULT_MODEL_ID;
  const apiKey = getApiKeyForModel(model);
  const apiBase = getApiBaseForModel(model);
  const modelInfo = getModelInfo(model);

  const body = {
    model,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? (modelInfo?.maxTokens ? Math.min(8192, modelInfo.maxTokens) : 8192),
    top_p: options.topP ?? 0.9,
    frequency_penalty: options.frequencyPenalty ?? 0.3,
    presence_penalty: options.presencePenalty ?? 0.3,
    stream: true,
  };

  console.log(`[AI] Streaming model: ${model}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (modelInfo?.provider !== '智谱GLM') {
    headers['NVAPI-KEY'] = apiKey;
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    yield { type: 'error', data: `AI 调用失败 (${response.status}): ${errorText}` };
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
 * 创建一个兼容的 AI 服务实例
 */
export async function createAIService() {
  return {
    chat: {
      completions: {
        /**
         * 创建聊天补全
         * 兼容 OpenAI SDK 的调用格式
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
          const result = await callAI({
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
        stream: streamAI,
      },
    },
  };
}

/**
 * 快速调用 - 发送消息并获取回复
 */
export async function chat(messages: ChatMessage[], model?: string): Promise<string> {
  const result = await callAI({ messages, model });
  return result.content;
}

/**
 * 获取当前默认模型ID
 */
export function getCurrentModelId(): string {
  return DEFAULT_MODEL_ID;
}

/**
 * 获取当前默认模型信息
 */
export function getCurrentModelInfo() {
  return getModelInfo(DEFAULT_MODEL_ID);
}

/**
 * 验证 API Key 是否有效
 */
export async function validateApiKey(modelId?: string): Promise<boolean> {
  const model = modelId || DEFAULT_MODEL_ID;
  const apiKey = getApiKeyForModel(model);
  const apiBase = getApiBaseForModel(model);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    const modelInfo = getModelInfo(model);
    if (modelInfo?.provider !== '智谱GLM') {
      headers['NVAPI-KEY'] = apiKey;
    }

    const response = await fetch(`${apiBase}/models`, { headers });
    return response.ok;
  } catch {
    return false;
  }
}
