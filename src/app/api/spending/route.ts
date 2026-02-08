import { NextRequest, NextResponse } from 'next/server';

const FILE_SERVER_URL = 'http://127.0.0.1:3456';

export async function GET(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${FILE_SERVER_URL}/api/spending`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeout);
    
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ source: 'error' }, { status: res.status });
    }
  } catch (error) {
    console.error('Spending API proxy error:', error);
    return NextResponse.json({ source: 'error' }, { status: 500 });
  }
}
