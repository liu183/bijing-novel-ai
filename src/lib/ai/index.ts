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
// Internal helper: build AI request config (shared by callAI & streamAI)
// ---------------------------------------------------------------------------

interface AIRequestConfig {
  model: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  apiUrl: string;
}

function buildAIRequest(options: ChatCompletionOptions): AIRequestConfig {
  const model = options.model || DEFAULT_MODEL_ID;
  const apiKey = getApiKeyForModel(model);
  const apiBase = getApiBaseForModel(model);
  const modelInfo = getModelInfo(model);
  const provider = modelInfo?.provider;

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

  if (process.env.NODE_ENV === 'development') {
    console.log(`[AI] ${options.stream ? 'Streaming' : 'Calling'} model: ${model} (provider: ${provider || 'unknown'})`);
    console.log(`[AI] API base: ${apiBase}`);
    console.log(`[AI] Messages count: ${options.messages.length}`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  // Nvidia NIM requires an additional NVAPI-KEY header
  if (provider !== '智谱GLM') {
    headers['NVAPI-KEY'] = apiKey;
  }

  return { model, headers, body, apiUrl: `${apiBase}/chat/completions` };
}

// ---------------------------------------------------------------------------
// Core API call — unified for all providers
// ---------------------------------------------------------------------------

export async function callAI(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const { model, headers, body, apiUrl } = buildAIRequest(options);

  // AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(apiUrl, {
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
  const { headers, body, apiUrl } = buildAIRequest({ ...options, stream: true });

  // AbortController for timeout (60s — slightly longer than non-streaming 55s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
      yield { type: 'error', data: 'AI 流式请求超时 (60s)，请稍后重试' };
      return;
    }
    yield { type: 'error', data: `AI 网络错误: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}` };
    return;
  } finally {
    clearTimeout(timeoutId);
  }

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

  // Inactivity timeout: if no chunk arrives within 60s, cancel and yield error
  const STREAM_INACTIVITY_MS = 60_000;
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      reader.cancel().catch(() => {});
    }, STREAM_INACTIVITY_MS);
  };
  resetInactivityTimer();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      resetInactivityTimer(); // reset on every received chunk

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

    if (inactivityTimer) clearTimeout(inactivityTimer);
    yield { type: 'done', data: '' };
  } catch (error) {
    if (inactivityTimer) clearTimeout(inactivityTimer);
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
