import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/* ═══════════════════════════════════════════════
   System Status API — Live Services + Filesystem
   ═══════════════════════════════════════════════ */

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  lastCheck: string;
  details?: string;
  uptime?: number;
  version?: string;
}

interface VoiceServerMetrics {
  status: 'online' | 'offline' | 'unknown';
  activeCalls: number;
  totalCalls: number;
  uptime?: number;
  lastError?: string;
  lastErrorTime?: string;
}

// Check if a service is running by trying to connect
async function checkService(url: string, timeoutMs = 2000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok || res.status < 500;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  } catch {
    return false;
  }
}

// Get gateway status from clawdbot CLI or direct check
async function getGatewayStatus(): Promise<ServiceStatus> {
  const result: ServiceStatus = {
    name: 'Clawdbot Gateway',
    status: 'unknown',
    lastCheck: new Date().toISOString(),
    details: 'Port 18789'
  };
  
  try {
    // Gateway runs on port 18789
    const isOnline = await checkService('http://127.0.0.1:18789/');
    result.status = isOnline ? 'online' : 'offline';
  } catch {
    result.status = 'offline';
  }
  
  return result;
}

// Get voice server status
async function getVoiceServerStatus(): Promise<{ service: ServiceStatus; metrics: VoiceServerMetrics }> {
  const service: ServiceStatus = {
    name: 'Voice Server',
    status: 'unknown',
    lastCheck: new Date().toISOString(),
    details: 'Port 6060'
  };
  
  const metrics: VoiceServerMetrics = {
    status: 'unknown',
    activeCalls: 0,
    totalCalls: 0
  };
  
  try {
    const isOnline = await checkService('http://127.0.0.1:6060/');
    if (isOnline) {
      service.status = 'online';
      metrics.status = 'online';
      service.details = 'Port 6060 — Ready';
    } else {
      service.status = 'offline';
      metrics.status = 'offline';
    }
  } catch {
    service.status = 'offline';
    metrics.status = 'offline';
  }
  
  return { service, metrics };
}

// Get file server status (Mission Control live API)
async function getFileServerStatus(): Promise<ServiceStatus> {
  const result: ServiceStatus = {
    name: 'File Server',
    status: 'unknown',
    lastCheck: new Date().toISOString(),
    details: 'Port 3456'
  };
  
  try {
    const isOnline = await checkService('http://127.0.0.1:3456/');
    result.status = isOnline ? 'online' : 'offline';
  } catch {
    result.status = 'offline';
  }
  
  return result;
}

// Get browser proxy status
async function getBrowserProxyStatus(): Promise<ServiceStatus> {
  const result: ServiceStatus = {
    name: 'Browser Proxy',
    status: 'unknown',
    lastCheck: new Date().toISOString(),
    details: 'Port 18800'
  };
  
  try {
    const isOnline = await checkService('http://127.0.0.1:18800/json/version');
    result.status = isOnline ? 'online' : 'offline';
  } catch {
    result.status = 'offline';
  }
  
  return result;
}

// Get all service statuses
async function getAllServices(): Promise<{ services: ServiceStatus[]; voiceMetrics: VoiceServerMetrics }> {
  const [gateway, voiceResult, fileServer, browserProxy] = await Promise.all([
    getGatewayStatus(),
    getVoiceServerStatus(),
    getFileServerStatus(),
    getBrowserProxyStatus()
  ]);
  
  return {
    services: [gateway, voiceResult.service, fileServer, browserProxy],
    voiceMetrics: voiceResult.metrics
  };
}

const SOURCE_DIR = '/Users/henry_notabot/clawd';
const MEMORY_DIR = path.join(SOURCE_DIR, 'memory');
const TELEGRAM_DIR = path.join(MEMORY_DIR, 'telegram');
const VOICE_CALLS_DIR = path.join(MEMORY_DIR, 'voice-calls');
const MEMORY_MD = path.join(SOURCE_DIR, 'MEMORY.md');
const CLAWDBOT_CONFIG = path.join(process.env.HOME || '', '.clawdbot', 'clawdbot.json');

interface TelegramDump {
  filename: string;
  date: string;
  size: number;
  lastModified: string;
  lines?: number;
}

interface HeartbeatConfig {
  every: string;
  activeHours: { start: string; end: string };
  model: string;
  target: string;
}

interface MemoryFlushConfig {
  enabled: boolean;
  prompt: string;
}

interface TelegramDumpsInfo {
  lastDump: TelegramDump | null;
  files: TelegramDump[];
  totalSize: number;
  missingDays: string[];
}

interface MemorySystemInfo {
  memoryMd: {
    size: number;
    lastModified: string;
  } | null;
  memoryFolder: {
    totalSize: number;
    fileCount: number;
    lastModified: string | null;
  };
  telegramDumps: {
    totalSize: number;
    fileCount: number;
    lastModified: string | null;
  };
  voiceCalls: {
    totalSize: number;
    fileCount: number;
    lastModified: string | null;
  };
}

interface HeartbeatHealthInfo {
  config: HeartbeatConfig | null;
  lastHeartbeat: string | null;
  status: 'healthy' | 'stale' | 'unknown';
  history24h: { time: string; ok: boolean }[];
}

interface ContextUsageInfo {
  currentTokens: number;
  maxTokens: number;
  percentUsed: number;
  compactionsToday: number;
  lastCompaction: string | null;
  memoryFlush: MemoryFlushConfig | null;
}

function getDirStats(dirPath: string): { totalSize: number; fileCount: number; lastModified: string | null } {
  let totalSize = 0;
  let fileCount = 0;
  let latestMtime: Date | null = null;
  
  try {
    if (!fs.existsSync(dirPath)) return { totalSize: 0, fileCount: 0, lastModified: null };
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(dirPath, entry.name);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        fileCount++;
        if (!latestMtime || stats.mtime > latestMtime) {
          latestMtime = stats.mtime;
        }
      } else if (entry.isDirectory()) {
        const subResult = getDirStats(path.join(dirPath, entry.name));
        totalSize += subResult.totalSize;
        fileCount += subResult.fileCount;
        if (subResult.lastModified) {
          const subMtime = new Date(subResult.lastModified);
          if (!latestMtime || subMtime > latestMtime) {
            latestMtime = subMtime;
          }
        }
      }
    }
  } catch (e) {
    console.error('getDirStats error:', e);
  }
  
  return { 
    totalSize, 
    fileCount, 
    lastModified: latestMtime ? latestMtime.toISOString() : null 
  };
}

function countFileLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function getTelegramDumps(): TelegramDumpsInfo {
  const result: TelegramDumpsInfo = {
    lastDump: null,
    files: [],
    totalSize: 0,
    missingDays: []
  };
  
  try {
    if (!fs.existsSync(TELEGRAM_DIR)) return result;
    
    const entries = fs.readdirSync(TELEGRAM_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse(); // Most recent first
    
    for (const filename of entries) {
      const filePath = path.join(TELEGRAM_DIR, filename);
      const stats = fs.statSync(filePath);
      const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
      
      if (dateMatch) {
        const dump: TelegramDump = {
          filename,
          date: dateMatch[1],
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          lines: countFileLines(filePath)
        };
        result.files.push(dump);
        result.totalSize += stats.size;
      }
    }
    
    if (result.files.length > 0) {
      result.lastDump = result.files[0];
    }
    
    // Check for missing days in last 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      // Use local date format, not UTC
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      
      // Skip today if it's early morning
      if (i === 0 && new Date().getHours() < 3) continue;
      
      const hasFile = result.files.some(f => f.date === dateStr);
      if (!hasFile) {
        result.missingDays.push(dateStr);
      }
    }
  } catch (e) {
    console.error('getTelegramDumps error:', e);
  }
  
  return result;
}

function getMemorySystemInfo(): MemorySystemInfo {
  const result: MemorySystemInfo = {
    memoryMd: null,
    memoryFolder: { totalSize: 0, fileCount: 0, lastModified: null },
    telegramDumps: { totalSize: 0, fileCount: 0, lastModified: null },
    voiceCalls: { totalSize: 0, fileCount: 0, lastModified: null }
  };
  
  try {
    // MEMORY.md
    if (fs.existsSync(MEMORY_MD)) {
      const stats = fs.statSync(MEMORY_MD);
      result.memoryMd = {
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      };
    }
    
    // Memory folder (*.md files only, not subdirs)
    if (fs.existsSync(MEMORY_DIR)) {
      let latestMtime: Date | null = null;
      const entries = fs.readdirSync(MEMORY_DIR);
      for (const entry of entries) {
        const entryPath = path.join(MEMORY_DIR, entry);
        const stats = fs.statSync(entryPath);
        if (stats.isFile() && entry.endsWith('.md')) {
          result.memoryFolder.totalSize += stats.size;
          result.memoryFolder.fileCount++;
          if (!latestMtime || stats.mtime > latestMtime) {
            latestMtime = stats.mtime;
          }
        }
      }
      result.memoryFolder.lastModified = latestMtime ? latestMtime.toISOString() : null;
    }
    
    // Telegram dumps
    result.telegramDumps = getDirStats(TELEGRAM_DIR);
    
    // Voice calls
    result.voiceCalls = getDirStats(VOICE_CALLS_DIR);
  } catch (e) {
    console.error('getMemorySystemInfo error:', e);
  }
  
  return result;
}

const GATEWAY_LOG = path.join(process.env.HOME || '', '.clawdbot', 'logs', 'gateway.log');
const HEARTBEAT_STATE = path.join(process.env.HOME || '', '.clawdbot', 'logs', 'heartbeat-monitor-state.json');

function getHeartbeatHealth(): HeartbeatHealthInfo {
  const result: HeartbeatHealthInfo = {
    config: null,
    lastHeartbeat: null,
    status: 'unknown',
    history24h: []
  };
  
  try {
    // Read config
    if (fs.existsSync(CLAWDBOT_CONFIG)) {
      const config = JSON.parse(fs.readFileSync(CLAWDBOT_CONFIG, 'utf8'));
      const hbConfig = config?.agents?.defaults?.heartbeat;
      if (hbConfig) {
        result.config = hbConfig;
      }
    }
    
    // Read real heartbeat data from gateway logs
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    if (fs.existsSync(GATEWAY_LOG)) {
      const logContent = fs.readFileSync(GATEWAY_LOG, 'utf8');
      const lines = logContent.split('\n');
      
      // Parse heartbeat entries from last 24h
      const heartbeats: { time: string; ok: boolean }[] = [];
      for (const line of lines) {
        if (line.includes('[heartbeat] started')) {
          const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
          if (match) {
            const timestamp = new Date(match[1]);
            if (timestamp >= twentyFourHoursAgo) {
              heartbeats.push({ time: match[1], ok: true });
            }
          }
        }
      }
      
      result.history24h = heartbeats.reverse(); // Most recent first
    }
    
    // Also check heartbeat monitor state file for last heartbeat
    if (fs.existsSync(HEARTBEAT_STATE)) {
      try {
        const state = JSON.parse(fs.readFileSync(HEARTBEAT_STATE, 'utf8'));
        if (state.lastHeartbeatTime) {
          result.lastHeartbeat = state.lastHeartbeatTime;
        }
      } catch {}
    }
    
    // If no state file, use most recent from history
    if (!result.lastHeartbeat && result.history24h.length > 0) {
      result.lastHeartbeat = result.history24h[0].time;
    }
    
    // Determine health status
    if (result.lastHeartbeat) {
      // Check if stale (>45 minutes since last heartbeat during active hours)
      const lastTime = new Date(result.lastHeartbeat);
      const minutesAgo = (now.getTime() - lastTime.getTime()) / 60000;
      const currentHour = now.getHours();
      const isActiveNow = currentHour >= 7 || currentHour === 0;
      
      if (!isActiveNow) {
        result.status = 'healthy'; // Outside active hours, no heartbeats expected
      } else if (minutesAgo > 45) {
        result.status = 'stale';
      } else {
        result.status = 'healthy';
      }
    }
  } catch (e) {
    console.error('getHeartbeatHealth error:', e);
  }
  
  return result;
}

function getContextUsage(): ContextUsageInfo {
  const result: ContextUsageInfo = {
    currentTokens: 45000, // Placeholder - would come from gateway
    maxTokens: 200000,
    percentUsed: 22.5,
    compactionsToday: 1,
    lastCompaction: null,
    memoryFlush: null
  };
  
  try {
    // Read config for memoryFlush settings
    if (fs.existsSync(CLAWDBOT_CONFIG)) {
      const config = JSON.parse(fs.readFileSync(CLAWDBOT_CONFIG, 'utf8'));
      const compactionConfig = config?.agents?.defaults?.compaction;
      if (compactionConfig?.memoryFlush) {
        result.memoryFlush = compactionConfig.memoryFlush;
      }
    }
    
    // In production, these would come from gateway session state
    // For now, return reasonable placeholders
    result.lastCompaction = new Date(Date.now() - 2 * 3600000).toISOString();
  } catch (e) {
    console.error('getContextUsage error:', e);
  }
  
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    
    // Return specific section or all
    if (section === 'telegram') {
      return NextResponse.json(getTelegramDumps());
    }
    if (section === 'memory') {
      return NextResponse.json(getMemorySystemInfo());
    }
    if (section === 'heartbeat') {
      return NextResponse.json(getHeartbeatHealth());
    }
    if (section === 'context') {
      return NextResponse.json(getContextUsage());
    }
    if (section === 'services') {
      const { services, voiceMetrics } = await getAllServices();
      return NextResponse.json({ services, voiceMetrics });
    }
    
    // Return all sections (including live service checks)
    const { services, voiceMetrics } = await getAllServices();
    
    return NextResponse.json({
      services,
      voiceMetrics,
      telegram: getTelegramDumps(),
      memory: getMemorySystemInfo(),
      heartbeat: getHeartbeatHealth(),
      context: getContextUsage(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('System status API error:', error);
    return NextResponse.json({ error: 'Failed to fetch system status' }, { status: 500 });
  }
}
