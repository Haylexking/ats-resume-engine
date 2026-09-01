import { NextResponse } from 'next/server';
import { getJobApplications, updateScreeningOutcome } from '@/lib/db';

export async function GET() {
  const apps = getJobApplications();
  return NextResponse.json(apps);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, screening_outcome } = body;
    if (id && screening_outcome) {
      updateScreeningOutcome(id, screening_outcome);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update application' }, { status: 500 });
  }
}
