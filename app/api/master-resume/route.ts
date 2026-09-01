import { NextResponse } from 'next/server';
import { getMasterResume, saveMasterResume } from '@/lib/db';
import { INITIAL_MASTER_RESUME } from '@/lib/seed/masterData';

export async function GET() {
  const master = getMasterResume();
  return NextResponse.json(master);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.reset) {
      saveMasterResume(INITIAL_MASTER_RESUME);
      return NextResponse.json({ success: true, master: INITIAL_MASTER_RESUME });
    }
    saveMasterResume(body);
    return NextResponse.json({ success: true, master: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update master resume' }, { status: 500 });
  }
}
