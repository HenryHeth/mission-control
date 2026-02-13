import { NextRequest, NextResponse } from 'next/server';

const FILE_SERVER = process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:3456';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'telegram-dump') {
    try {
      const res = await fetch(`${FILE_SERVER}/api/actions/telegram-dump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
  }
  
  if (action === 'restart-service') {
    try {
      const body = await request.json();
      const res = await fetch(`${FILE_SERVER}/api/actions/restart-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
  }
  
  if (action === 'service-health') {
    try {
      const res = await fetch(`${FILE_SERVER}/api/service-health`);
      const data = await res.json();
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json({}, { status: 200 });
    }
  }
  
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'service-health') {
    try {
      const res = await fetch(`${FILE_SERVER}/api/service-health`);
      const data = await res.json();
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json({}, { status: 200 });
    }
  }
  
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
