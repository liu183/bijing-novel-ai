import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const dmmf = (db as any)._dmmf;
    const chatModel = dmmf?.modelMap?.ChatMessage;

    return NextResponse.json({
      allModels: Object.keys(dmmf?.modelMap || {}),
      chatMessageFields: chatModel?.fields?.map((f: any) => ({
        name: f.name,
        type: f.type,
        isRequired: !f.isOptional,
      })),
      datasourceProvider: dmmf?.datasource?.provider,
      hasDatasourceUrl: !!dmmf?.datasource?.url,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
    }, { status: 500 });
  }
}
