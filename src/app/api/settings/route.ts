import { NextResponse } from 'next/server';
import { NVIDIA_MODELS, getModelInfo, DEFAULT_MODEL_ID } from '@/lib/ai/models';

export async function GET() {
  const currentModel = process.env.NVIDIA_MODEL || DEFAULT_MODEL_ID;
  const modelInfo = getModelInfo(currentModel);

  return NextResponse.json({
    currentModel,
    modelInfo: modelInfo || null,
    availableModels: NVIDIA_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      description: m.description,
      maxTokens: m.maxTokens,
      category: m.category,
      supportsVision: m.supportsVision || false,
      supportsFunctionCall: m.supportsFunctionCall || false,
    })),
  });
}
