import { NextResponse } from 'next/server';
import { getAISettings, saveAISettings } from '@/lib/db';
import { AISettingConfig } from '@/lib/engine/types';

export async function GET() {
  const settings = getAISettings();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  try {
    const body: AISettingConfig = await req.json();
    saveAISettings(body);
    return NextResponse.json({ success: true, settings: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save settings' }, { status: 500 });
  }
}
