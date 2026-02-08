import { NextResponse } from 'next/server';

const TOODLEDO_API_BASE = 'https://api.toodledo.com';
const SIXTY_DAYS = 60 * 24 * 60 * 60;

// Toodledo credentials path (relative to clawd workspace)
const CREDS_PATH = process.env.TOODLEDO_CREDS_PATH || '/Users/henry_notabot/clawd/toodledo_credentials.json';

async function getCredentials() {
  const fs = await import('fs');
  const data = fs.readFileSync(CREDS_PATH, 'utf8');
  return JSON.parse(data);
}

async function refreshToken(creds: { refresh_token: string; client_id: string; client_secret: string }) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: creds.refresh_token,
  });

  const auth = Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString('base64');
  
  const res = await fetch(`${TOODLEDO_API_BASE}/3/account/token.php`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  const tokens = await res.json();
  
  // Save updated tokens
  const fs = await import('fs');
  const updatedCreds = { ...creds, ...tokens };
  fs.writeFileSync(CREDS_PATH, JSON.stringify(updatedCreds, null, 2));
  
  return tokens.access_token;
}

async function toodledoApiCall(endpoint: string, accessToken: string) {
  const url = `${TOODLEDO_API_BASE}${endpoint}`;
  const separator = endpoint.includes('?') ? '&' : '?';
  
  const res = await fetch(`${url}${separator}access_token=${accessToken}`);
  
  if (!res.ok) {
    throw new Error(`Toodledo API error: ${res.status}`);
  }
  
  const data = await res.json();
  
  // Handle Toodledo error responses
  if (data.errorCode) {
    throw new Error(`Toodledo error ${data.errorCode}: ${data.errorDesc}`);
  }
  
  return data;
}

export async function GET() {
  try {
    // Get credentials
    const creds = await getCredentials();
    let accessToken = creds.access_token;
    
    // Check if token needs refresh (if we have expiry info)
    const tokenAge = Date.now() / 1000 - (creds.token_time || 0);
    if (tokenAge > 3600) { // Refresh if older than 1 hour
      try {
        accessToken = await refreshToken(creds);
      } catch {
        // Token might still be valid, try anyway
      }
    }
    
    // Fetch folders
    const foldersRaw = await toodledoApiCall('/3/folders/get.php?f=json', accessToken);
    const folderMap: Record<number, string> = {};
    for (const f of foldersRaw) {
      if (f && f.id) folderMap[f.id] = f.name;
    }
    
    // Fetch completed tasks (last 60 days)
    const sixtyDaysAgo = Math.floor(Date.now() / 1000) - SIXTY_DAYS;
    const completedRaw = await toodledoApiCall(
      `/3/tasks/get.php?f=json&comp=1&after=${sixtyDaysAgo}&fields=added,folder,tag,priority`,
      accessToken
    );
    const completed = (Array.isArray(completedRaw) ? completedRaw : [])
      .filter((t: { title?: string; completed?: number }) => t && t.title && t.completed && t.completed > 0)
      .map((t: { id: number; title: string; completed: number; added?: number; folder?: number; tag?: string; priority?: number }) => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        added: t.added || 0,
        folder: folderMap[t.folder || 0] || 'Unfiled',
        folderId: t.folder,
        tag: t.tag || '',
        priority: t.priority || 0
      }));
    
    // Fetch open tasks
    const openRaw = await toodledoApiCall(
      '/3/tasks/get.php?f=json&comp=0&fields=added,folder,tag,priority,duedate',
      accessToken
    );
    const open = (Array.isArray(openRaw) ? openRaw : [])
      .filter((t: { title?: string }) => t && t.title)
      .map((t: { id: number; title: string; added?: number; folder?: number; tag?: string; priority?: number; duedate?: number }) => ({
        id: t.id,
        title: t.title,
        added: t.added || 0,
        folder: folderMap[t.folder || 0] || 'Unfiled',
        folderId: t.folder,
        tag: t.tag || '',
        priority: t.priority || 0,
        duedate: t.duedate || 0
      }));
    
    const data = {
      generatedAt: new Date().toISOString(),
      completed,
      open,
      folders: folderMap,
      totalOpen: open.length,
      totalCompleted: completed.length
    };
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
