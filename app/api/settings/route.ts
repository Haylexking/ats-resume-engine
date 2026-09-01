import { NextResponse } from 'next/server';
import { getAISettings, saveAISettings } from '@/lib/db';
import { AISettingConfig } from '@/lib/engine/types';

export async function GET() {
  const settings = getAISettings();
  // Security: Never expose raw server API keys to the browser client
  return NextResponse.json({
    provider: settings.provider,
    model: settings.model,
    modelParse: settings.modelParse,
    modelReason: settings.modelReason,
    secondaryProvider: settings.secondaryProvider,
    secondaryModel: settings.secondaryModel,
    serverReady: true,
  });
}

export async function POST(req: Request) {
  try {
    const body: Partial<AISettingConfig> = await req.json();
    const current = getAISettings();
    
    // Merge only safe model/provider preference fields, preserving server environment secrets
    const updated: AISettingConfig = {
      ...current,
      provider: body.provider || current.provider,
      model: body.model || current.model,
      modelParse: body.modelParse || current.modelParse,
      modelReason: body.modelReason || current.modelReason,
      secondaryProvider: body.secondaryProvider,
      secondaryModel: body.secondaryModel,
    };

    saveAISettings(updated);
    return NextResponse.json({ success: true, settings: {
      provider: updated.provider,
      model: updated.model,
      modelParse: updated.modelParse,
      modelReason: updated.modelReason,
    }});
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update model settings' }, { status: 500 });
  }
}
