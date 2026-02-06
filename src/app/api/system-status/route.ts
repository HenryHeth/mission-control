import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/* ═══════════════════════════════════════════════
   System Status API — Filesystem + Config data
   ═══════════════════════════════════════════════ */

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
  };
  telegramDumps: {
    totalSize: number;
    fileCount: number;
  };
  voiceCalls: {
    totalSize: number;
    fileCount: number;
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

function getDirSize(dirPath: string): { totalSize: number; fileCount: number } {
  let totalSize = 0;
  let fileCount = 0;
  
  try {
    if (!fs.existsSync(dirPath)) return { totalSize: 0, fileCount: 0 };
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(dirPath, entry.name);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        fileCount++;
      } else if (entry.isDirectory()) {
        const subResult = getDirSize(path.join(dirPath, entry.name));
        totalSize += subResult.totalSize;
        fileCount += subResult.fileCount;
      }
    }
  } catch (e) {
    console.error('getDirSize error:', e);
  }
  
  return { totalSize, fileCount };
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
      const dateStr = checkDate.toISOString().split('T')[0];
      
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
    memoryFolder: { totalSize: 0, fileCount: 0 },
    telegramDumps: { totalSize: 0, fileCount: 0 },
    voiceCalls: { totalSize: 0, fileCount: 0 }
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
      const entries = fs.readdirSync(MEMORY_DIR);
      for (const entry of entries) {
        const entryPath = path.join(MEMORY_DIR, entry);
        const stats = fs.statSync(entryPath);
        if (stats.isFile() && entry.endsWith('.md')) {
          result.memoryFolder.totalSize += stats.size;
          result.memoryFolder.fileCount++;
        }
      }
    }
    
    // Telegram dumps
    result.telegramDumps = getDirSize(TELEGRAM_DIR);
    
    // Voice calls
    result.voiceCalls = getDirSize(VOICE_CALLS_DIR);
  } catch (e) {
    console.error('getMemorySystemInfo error:', e);
  }
  
  return result;
}

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
    
    // For now, we'll generate synthetic heartbeat data
    // In production, this would read from gateway logs or a state file
    const now = new Date();
    const intervalMs = 30 * 60 * 1000; // 30 minutes
    
    // Generate 48 entries (24 hours)
    for (let i = 0; i < 48; i++) {
      const time = new Date(now.getTime() - i * intervalMs);
      const hour = time.getHours();
      
      // Check if within active hours (7:00 - 00:00)
      const isActiveHour = hour >= 7 || hour === 0;
      
      result.history24h.push({
        time: time.toISOString(),
        ok: isActiveHour ? Math.random() > 0.05 : false // 95% success during active hours
      });
    }
    
    // Most recent heartbeat
    const lastOk = result.history24h.find(h => h.ok);
    if (lastOk) {
      result.lastHeartbeat = lastOk.time;
      
      // Check if stale (>45 minutes since last heartbeat during active hours)
      const lastTime = new Date(lastOk.time);
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
    
    // Return all sections
    return NextResponse.json({
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
