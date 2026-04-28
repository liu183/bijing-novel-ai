// ============================================================================
// Model Configuration
// 笔境 AI - 支持的所有大模型列表（多服务商）
// ============================================================================

export type ModelCategory = 'flagship' | 'balanced' | 'fast' | 'specialized';

export interface ModelInfo {
  id: string;                      // 模型 ID（用于 API 调用）
  name: string;                    // 显示名称
  provider: string;                // 模型提供商（如 Nvidia, 智谱GLM）
  description: string;             // 模型描述
  maxTokens: number;               // 最大上下文长度
  category: ModelCategory;         // 分类
  supportsVision?: boolean;        // 是否支持图像理解
  supportsFunctionCall?: boolean;  // 是否支持函数调用
  apiBase?: string;                // 自定义 API 基础 URL（可选，覆盖默认）
}

// ---------------------------------------------------------------------------
// Provider → API Base 映射
// ---------------------------------------------------------------------------

export const PROVIDER_API_BASE: Record<string, string> = {
  Nvidia: 'https://integrate.api.nvidia.com/v1',
  Meta: 'https://integrate.api.nvidia.com/v1',
  'Mistral AI': 'https://integrate.api.nvidia.com/v1',
  Google: 'https://integrate.api.nvidia.com/v1',
  Microsoft: 'https://integrate.api.nvidia.com/v1',
  Alibaba: 'https://integrate.api.nvidia.com/v1',
  DeepSeek: 'https://integrate.api.nvidia.com/v1',
  '智谱GLM': 'https://open.bigmodel.cn/api/paas/v4',
};

// ---------------------------------------------------------------------------
// Nvidia NIM 平台模型
// ---------------------------------------------------------------------------

const NVIDIA_MODELS: ModelInfo[] = [
  // ===== Nvidia 自研系列 =====
  {
    id: 'nvidia/llama-3.1-nemotron-ultra-253b-instruct',
    name: 'Llama 3.1 Nemotron Ultra 253B',
    provider: 'Nvidia',
    description: 'Nvidia 旗舰级大模型，基于 Llama 3.1 253B 深度优化，适合复杂创作任务',
    maxTokens: 131072,
    category: 'flagship',
    supportsFunctionCall: true,
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    name: 'Llama 3.1 Nemotron 70B',
    provider: 'Nvidia',
    description: 'Nvidia 优化版 Llama 3.1 70B，性能与速度的最佳平衡',
    maxTokens: 131072,
    category: 'balanced',
    supportsFunctionCall: true,
  },
  {
    id: 'nvidia/nemotron-4-340b-instruct',
    name: 'Nemotron-4 340B Instruct',
    provider: 'Nvidia',
    description: 'Nvidia 第四代大模型，擅长中文理解和长文本生成',
    maxTokens: 4096,
    category: 'flagship',
  },
  {
    id: 'nvidia/llama-3.1-nemotron-51b-instruct',
    name: 'Llama 3.1 Nemotron 51B',
    provider: 'Nvidia',
    description: '轻量级 Nemotron 模型，响应速度快，适合日常创作',
    maxTokens: 131072,
    category: 'fast',
  },

  // ===== Meta Llama 系列 =====
  {
    id: 'meta/llama-3.1-405b-instruct',
    name: 'Meta Llama 3.1 405B',
    provider: 'Meta',
    description: 'Meta 最大的开源模型，推理能力极强，适合高质量长篇创作',
    maxTokens: 131072,
    category: 'flagship',
    supportsFunctionCall: true,
  },
  {
    id: 'meta/llama-3.1-70b-instruct',
    name: 'Meta Llama 3.1 70B',
    provider: 'Meta',
    description: 'Meta 旗舰开源模型，性能出色，中文能力强',
    maxTokens: 131072,
    category: 'balanced',
    supportsFunctionCall: true,
  },
  {
    id: 'meta/llama-3.1-8b-instruct',
    name: 'Meta Llama 3.1 8B',
    provider: 'Meta',
    description: '轻量级 Llama 模型，响应极快，适合简单任务',
    maxTokens: 131072,
    category: 'fast',
  },
  {
    id: 'meta/llama-3.2-3b-instruct',
    name: 'Meta Llama 3.2 3B',
    provider: 'Meta',
    description: '超轻量 Llama 模型，极致速度，适合快速交互',
    maxTokens: 131072,
    category: 'fast',
  },
  {
    id: 'meta/llama-3.2-11b-vision-instruct',
    name: 'Meta Llama 3.2 11B Vision',
    provider: 'Meta',
    description: '支持图像理解的 Llama 模型，可以分析小说封面等视觉内容',
    maxTokens: 131072,
    category: 'specialized',
    supportsVision: true,
  },
  {
    id: 'meta/llama-3.2-90b-vision-instruct',
    name: 'Meta Llama 3.2 90B Vision',
    provider: 'Meta',
    description: '大型视觉语言模型，高质量的图文理解能力',
    maxTokens: 131072,
    category: 'specialized',
    supportsVision: true,
  },

  // ===== Mistral 系列 =====
  {
    id: 'mistralai/mixtral-8x22b-instruct-v0.1',
    name: 'Mistral Mixtral 8x22B',
    provider: 'Mistral AI',
    description: 'Mistral 大型 MoE 模型，多专家架构，创作质量优异',
    maxTokens: 65536,
    category: 'flagship',
  },
  {
    id: 'mistralai/mixtral-8x7b-instruct-v0.1',
    name: 'Mistral Mixtral 8x7B',
    provider: 'Mistral AI',
    description: 'Mistral 经典 MoE 模型，高效且高质量',
    maxTokens: 32768,
    category: 'balanced',
  },
  {
    id: 'mistralai/mistral-large-2-instruct',
    name: 'Mistral Large 2',
    provider: 'Mistral AI',
    description: 'Mistral 旗舰模型，多语言能力强，适合文学创作',
    maxTokens: 131072,
    category: 'flagship',
    supportsFunctionCall: true,
  },
  {
    id: 'mistralai/nemo-mistral-7b-instruct',
    name: 'Mistral Nemo 7B',
    provider: 'Mistral AI',
    description: 'Mistral 轻量模型，速度快，适合快速反馈',
    maxTokens: 131072,
    category: 'fast',
  },

  // ===== Google 系列 =====
  {
    id: 'google/gemma-2-27b-it',
    name: 'Google Gemma 2 27B',
    provider: 'Google',
    description: 'Google 开源大模型，中文能力优秀，创作流畅',
    maxTokens: 8192,
    category: 'balanced',
  },
  {
    id: 'google/gemma-2-9b-it',
    name: 'Google Gemma 2 9B',
    provider: 'Google',
    description: 'Google 中型开源模型，平衡性能与速度',
    maxTokens: 8192,
    category: 'fast',
  },

  // ===== Microsoft 系列 =====
  {
    id: 'microsoft/phi-3-medium-128k-instruct',
    name: 'Microsoft Phi-3 Medium 128K',
    provider: 'Microsoft',
    description: 'Microsoft 轻量级模型，支持 128K 超长上下文',
    maxTokens: 131072,
    category: 'specialized',
  },
  {
    id: 'microsoft/phi-3-mini-128k-instruct',
    name: 'Microsoft Phi-3 Mini 128K',
    provider: 'Microsoft',
    description: 'Microsoft 超轻量模型，128K 长上下文支持',
    maxTokens: 131072,
    category: 'fast',
  },
  {
    id: 'microsoft/phi-3.5-mini-instruct',
    name: 'Microsoft Phi-3.5 Mini',
    provider: 'Microsoft',
    description: 'Phi-3.5 最新版轻量模型，推理能力增强',
    maxTokens: 131072,
    category: 'fast',
  },

  // ===== Qwen (通义千问) 系列 =====
  {
    id: 'qwen/qwen2.5-72b-instruct',
    name: 'Qwen 2.5 72B',
    provider: 'Alibaba',
    description: '通义千问最新大模型，中文创作能力顶级',
    maxTokens: 32768,
    category: 'flagship',
  },
  {
    id: 'qwen/qwen2.5-32b-instruct',
    name: 'Qwen 2.5 32B',
    provider: 'Alibaba',
    description: '通义千问中型模型，中文理解和创作质量优秀',
    maxTokens: 32768,
    category: 'balanced',
  },
  {
    id: 'qwen/qwen2.5-7b-instruct',
    name: 'Qwen 2.5 7B',
    provider: 'Alibaba',
    description: '通义千问轻量模型，中文响应迅速',
    maxTokens: 32768,
    category: 'fast',
  },

  // ===== DeepSeek 系列 =====
  {
    id: 'deepseek-ai/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    description: 'DeepSeek 推理模型，深度思考能力强，适合复杂创作任务',
    maxTokens: 65536,
    category: 'flagship',
  },
  {
    id: 'deepseek-ai/deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill 70B',
    provider: 'DeepSeek',
    description: 'DeepSeek R1 蒸馏模型，兼顾推理能力和速度',
    maxTokens: 65536,
    category: 'balanced',
  },
];

// ---------------------------------------------------------------------------
// 智谱 GLM 模型
// API 文档: https://open.bigmodel.cn/dev/api
// ---------------------------------------------------------------------------

const GLM_MODELS: ModelInfo[] = [
  {
    id: 'glm-4-plus',
    name: 'GLM-4-Plus',
    provider: '智谱GLM',
    description: '智谱旗舰模型，能力全面提升，适合高质量小说创作',
    maxTokens: 128000,
    category: 'flagship',
    supportsFunctionCall: true,
  },
  {
    id: 'glm-4-0520',
    name: 'GLM-4',
    provider: '智谱GLM',
    description: '智谱经典模型，中文理解和创作能力强',
    maxTokens: 128000,
    category: 'balanced',
    supportsFunctionCall: true,
  },
  {
    id: 'glm-4-air',
    name: 'GLM-4-Air',
    provider: '智谱GLM',
    description: '高性价比模型，响应速度快，适合日常创作',
    maxTokens: 128000,
    category: 'balanced',
  },
  {
    id: 'glm-4-airx',
    name: 'GLM-4-AirX',
    provider: '智谱GLM',
    description: '极速版模型，超低延迟，适合实时交互',
    maxTokens: 8192,
    category: 'fast',
  },
  {
    id: 'glm-4-flash',
    name: 'GLM-4-Flash',
    provider: '智谱GLM',
    description: '免费模型，零成本创作，适合测试和轻量任务',
    maxTokens: 128000,
    category: 'fast',
  },
  {
    id: 'glm-4-long',
    name: 'GLM-4-Long',
    provider: '智谱GLM',
    description: '超长上下文模型，支持 1M tokens，适合处理超长篇小说',
    maxTokens: 1048576,
    category: 'specialized',
  },
  {
    id: 'glm-4v-plus',
    name: 'GLM-4V-Plus',
    provider: '智谱GLM',
    description: '多模态视觉模型，支持图文理解，可分析小说封面等',
    maxTokens: 8192,
    category: 'specialized',
    supportsVision: true,
  },
  {
    id: 'glm-4v',
    name: 'GLM-4V',
    provider: '智谱GLM',
    description: '视觉理解模型，基础版图文多模态能力',
    maxTokens: 8192,
    category: 'specialized',
    supportsVision: true,
  },
];

// ---------------------------------------------------------------------------
// All models combined
// ---------------------------------------------------------------------------

/** 所有可用模型列表 */
export const ALL_MODELS: ModelInfo[] = [...NVIDIA_MODELS, ...GLM_MODELS];

/** @deprecated 请使用 ALL_MODELS */
export { NVIDIA_MODELS };

/** 默认模型（推荐用于小说创作） */
export const DEFAULT_MODEL_ID = 'glm-4-plus';

/** 按类别分组模型 */
export function getModelsByCategory() {
  const categories: Record<string, { label: string; description: string; models: ModelInfo[] }> = {
    flagship: { label: '旗舰模型', description: '最强性能，适合高质量长篇创作', models: [] },
    balanced: { label: '均衡模型', description: '性能与速度平衡，适合日常创作', models: [] },
    fast: { label: '快速模型', description: '响应迅速，适合快速交互和测试', models: [] },
    specialized: { label: '专业模型', description: '特定领域优化的专用模型', models: [] },
  };

  for (const model of ALL_MODELS) {
    categories[model.category].models.push(model);
  }

  return categories;
}

/** 获取模型信息 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return ALL_MODELS.find((m) => m.id === modelId);
}

/**
 * 根据模型 ID 获取对应的服务商 API Base URL
 */
export function getApiBaseForModel(modelId: string): string {
  const model = getModelInfo(modelId);
  if (!model) return PROVIDER_API_BASE['Nvidia'];
  return model.apiBase || PROVIDER_API_BASE[model.provider] || PROVIDER_API_BASE['Nvidia'];
}

/**
 * 根据模型 ID 获取对应的 API Key 环境变量名
 */
export function getApiKeyEnvForModel(modelId: string): string {
  const model = getModelInfo(modelId);
  if (!model || model.provider === '智谱GLM') return 'GLM_API_KEY';
  return 'NVIDIA_API_KEY';
}
