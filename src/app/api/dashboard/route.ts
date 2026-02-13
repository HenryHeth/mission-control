import { NextRequest, NextResponse } from 'next/server';

/* ═══════════════════════════════════════════════
   Dashboard API — Proxy to file-server
   Fetches live data from localhost:3456 (server-side)
   ═══════════════════════════════════════════════ */

const FILE_SERVER_URL = 'http://127.0.0.1:3456';

export async function GET(request: NextRequest) {
  try {
    // Fetch from file-server (server-side, so localhost works)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    
    const res = await fetch(`${FILE_SERVER_URL}/api/dashboard`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeout);
    
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ 
        error: 'File server returned error',
        source: 'error' 
      }, { status: res.status });
    }
  } catch (error) {
    console.error('Dashboard API proxy error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch from file server',
      source: 'error'
    }, { status: 500 });
  }
}
