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
  metricsAvailable: boolean;
  uptime?: number;
  lastCall?: { timestamp: string; duration: number; caller: string } | null;
  callsLast24h?: number;
  callsLast7d?: number;
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
    name: 'Voice Services',
    status: 'unknown',
    lastCheck: new Date().toISOString(),
    details: 'Port 6060'
  };
  
  const metrics: VoiceServerMetrics = {
    status: 'unknown',
    activeCalls: 0,
    totalCalls: 0,
    metricsAvailable: false  // No metrics endpoint exists
  };
  
  try {
    // Try /status endpoint first for rich metrics
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch('http://127.0.0.1:6060/status', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        service.status = 'online';
        service.details = 'Port 6060 — Ready';
        metrics.status = 'online';
        metrics.metricsAvailable = true;
        metrics.activeCalls = data.activeCalls || 0;
        metrics.totalCalls = data.totalCalls || 0;
        metrics.uptime = data.uptime;
        metrics.lastCall = data.lastCall || null;
        metrics.callsLast24h = data.callsLast24h ?? 0;
        metrics.callsLast7d = data.callsLast7d ?? 0;
        return { service, metrics };
      }
    } catch {
      clearTimeout(timeoutId);
    }

    // Fallback: just check if server is up
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
    name: 'MC File Server',
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
    name: 'Automation Browser',
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

interface AgentInfo {
  id: string;
  name: string;
  model: string;
  heartbeatEnabled: boolean;
  heartbeatInterval?: string;
  workspace: string;
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

interface AgentContextInfo {
  agentId: string;
  agentName: string;
  model: string;
  currentTokens: number;
  maxTokens: number;
  percentUsed: number;
  compactionsToday: number;
  lastCompaction: string | null;
  compactionHistory: { timestamp: string; tokensBefore: number; percentBefore: number }[];
}

interface ContextUsageInfo {
  agents: AgentContextInfo[];
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

// Get info about all configured agents
function getAgentInfo(): AgentInfo[] {
  const agents: AgentInfo[] = [];
  
  try {
    if (!fs.existsSync(CLAWDBOT_CONFIG)) return agents;
    
    const config = JSON.parse(fs.readFileSync(CLAWDBOT_CONFIG, 'utf8'));
    const defaults = config?.agents?.defaults || {};
    const agentList = config?.agents?.list || [];
    
    for (const agent of agentList) {
      // Get model - agent-specific or default
      const agentModel = agent.model?.primary || defaults.model?.primary || 'unknown';
      
      // Get heartbeat config - agent-specific or default
      const heartbeat = agent.heartbeat || defaults.heartbeat || {};
      const heartbeatEvery = heartbeat.every || '0m';
      const heartbeatEnabled = heartbeatEvery !== '0m' && heartbeatEvery !== '0';
      
      agents.push({
        id: agent.id || 'unknown',
        name: agent.name || agent.id || 'Unknown',
        model: agentModel,
        heartbeatEnabled,
        heartbeatInterval: heartbeatEnabled ? heartbeatEvery : undefined,
        workspace: agent.workspace || defaults.workspace || ''
      });
    }
  } catch (e) {
    console.error('getAgentInfo error:', e);
  }
  
  return agents;
}

// Find the agent that actually runs heartbeats (Oscar)
function getHeartbeatAgentConfig(): { config: HeartbeatConfig | null; agentName: string; agentModel: string } {
  try {
    if (!fs.existsSync(CLAWDBOT_CONFIG)) return { config: null, agentName: '', agentModel: '' };
    
    const configData = JSON.parse(fs.readFileSync(CLAWDBOT_CONFIG, 'utf8'));
    const defaults = configData?.agents?.defaults || {};
    const agentList = configData?.agents?.list || [];
    
    // Find the agent with heartbeat enabled (not "0m")
    for (const agent of agentList) {
      const heartbeat = agent.heartbeat || {};
      const every = heartbeat.every;
      
      // Skip if no heartbeat config or disabled
      if (!every || every === '0m' || every === '0') continue;
      
      // Found an agent with heartbeat enabled
      const agentModel = agent.model?.primary || defaults.model?.primary || 'unknown';
      const hbModel = heartbeat.model || defaults.heartbeat?.model || agentModel;
      
      return {
        config: {
          every: heartbeat.every,
          activeHours: heartbeat.activeHours || defaults.heartbeat?.activeHours || { start: '00:00', end: '23:59' },
          model: hbModel,
          target: heartbeat.target || defaults.heartbeat?.target || 'last'
        },
        agentName: agent.name || agent.id,
        agentModel: agentModel
      };
    }
    
    // Fallback: use defaults if no agent-specific heartbeat found
    const defaultHb = defaults.heartbeat;
    if (defaultHb && defaultHb.every && defaultHb.every !== '0m') {
      return {
        config: defaultHb,
        agentName: 'Default',
        agentModel: defaults.model?.primary || 'unknown'
      };
    }
  } catch (e) {
    console.error('getHeartbeatAgentConfig error:', e);
  }
  
  return { config: null, agentName: '', agentModel: '' };
}

function getHeartbeatHealth(): HeartbeatHealthInfo & { agentName?: string; agentModel?: string } {
  const result: HeartbeatHealthInfo & { agentName?: string; agentModel?: string } = {
    config: null,
    lastHeartbeat: null,
    status: 'unknown',
    history24h: []
  };
  
  try {
    // Read config from the agent that actually runs heartbeats (Oscar)
    const { config: hbConfig, agentName, agentModel } = getHeartbeatAgentConfig();
    
    if (hbConfig) {
      result.config = hbConfig;
      result.agentName = agentName;
      result.agentModel = agentModel;
    }
    
    // Parse interval from config (e.g., "30m" -> 30)
    const intervalMinutes = hbConfig?.every ? parseInt(hbConfig.every) || 30 : 30;
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // SINGLE SOURCE OF TRUTH: persistent heartbeat store (maintained by file server)
    // File server scans gateway log + all other sources every 5 min, deduplicates, persists
    const HEARTBEAT_PERSISTENT = path.join(process.env.HOME || '', '.clawdbot', 'logs', 'heartbeat-persistent.json');
    
    let actualHeartbeats: Date[] = [];
    
    if (fs.existsSync(HEARTBEAT_PERSISTENT)) {
      try {
        const data = JSON.parse(fs.readFileSync(HEARTBEAT_PERSISTENT, 'utf8'));
        if (Array.isArray(data)) {
          actualHeartbeats = data
            .map((ts: string) => new Date(ts))
            .filter((d: Date) => d >= twentyFourHoursAgo)
            .sort((a: Date, b: Date) => b.getTime() - a.getTime());
        }
      } catch {}
    }
    
    // Set lastHeartbeat from most recent
    if (actualHeartbeats.length > 0) {
      result.lastHeartbeat = actualHeartbeats[0].toISOString();
    }
    
    // Generate exactly 48 slots (24h ÷ 30min = 48). Always 48. No exceptions.
    const slotMs = intervalMinutes * 60 * 1000;
    
    for (let i = 0; i < 48; i++) {
      // Each slot covers a full interval window: [slotEnd, slotStart)
      const slotEnd = new Date(now.getTime() - i * slotMs);
      const slotStart = new Date(slotEnd.getTime() - slotMs);
      const fired = actualHeartbeats.find(hb => 
        hb.getTime() > slotStart.getTime() && hb.getTime() <= slotEnd.getTime()
      );
      result.history24h.push({ 
        time: slotEnd.toISOString(), 
        ok: !!fired 
      });
    }
    
    // FALLBACK: Check heartbeat monitor state file
    if (!result.lastHeartbeat && fs.existsSync(HEARTBEAT_STATE)) {
      try {
        const state = JSON.parse(fs.readFileSync(HEARTBEAT_STATE, 'utf8'));
        if (state.lastHeartbeatTime) {
          result.lastHeartbeat = state.lastHeartbeatTime;
        }
      } catch {}
    }
    
    // Determine health status based on lastHeartbeat (single calculation)
    if (result.lastHeartbeat) {
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

// Default context limits per model family
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'claude-opus-4-6': 200000,
  'claude-opus-4-5': 200000,
  'gemini-2.5-flash': 1048576,
};

function getContextLimitForModel(model: string): number {
  return MODEL_CONTEXT_LIMITS[model] || 200000;
}

// Scan a JSONL tail for the last usage.totalTokens and model (fallback for agents without those in sessions.json)
function getLastUsageFromJsonl(jsonlPath: string): { totalTokens: number; model: string | null } {
  if (!fs.existsSync(jsonlPath)) return { totalTokens: 0, model: null };
  // Read from end — scan last 50KB for efficiency
  const stats = fs.statSync(jsonlPath);
  const readSize = Math.min(stats.size, 50 * 1024);
  const fd = fs.openSync(jsonlPath, 'r');
  const buf = Buffer.alloc(readSize);
  fs.readSync(fd, buf, 0, readSize, stats.size - readSize);
  fs.closeSync(fd);
  const tail = buf.toString('utf8');
  const lines = tail.split('\n').reverse();
  for (const line of lines) {
    if (!line || !line.includes('"totalTokens"')) continue;
    try {
      const entry = JSON.parse(line);
      if (entry?.message?.usage?.totalTokens) {
        return {
          totalTokens: entry.message.usage.totalTokens,
          model: entry.message?.model || null
        };
      }
    } catch {
      // partial line from slicing — skip
    }
  }
  return { totalTokens: 0, model: null };
}

// Read compaction history from a JSONL file
function readCompactionHistory(jsonlPath: string, contextTokens: number): {
  compactions: { timestamp: string; tokensBefore: number; percentBefore: number }[];
  compactionsToday: number;
  lastCompaction: string | null;
} {
  const compactions: { timestamp: string; tokensBefore: number; percentBefore: number }[] = [];
  
  if (!fs.existsSync(jsonlPath)) {
    return { compactions, compactionsToday: 0, lastCompaction: null };
  }
  
  const content = fs.readFileSync(jsonlPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line || !line.includes('"compaction"')) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'compaction' && entry.timestamp && entry.tokensBefore !== undefined) {
        compactions.push({
          timestamp: entry.timestamp,
          tokensBefore: entry.tokensBefore,
          percentBefore: contextTokens > 0 ? (entry.tokensBefore / contextTokens) * 100 : 0
        });
      }
    } catch {
      // Skip malformed lines
    }
  }
  
  // Sort most recent first
  compactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const lastCompaction = compactions.length > 0 ? compactions[0].timestamp : null;
  
  // Count compactions today (PST / America/Los_Angeles)
  const nowPST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const todayStr = `${nowPST.getFullYear()}-${String(nowPST.getMonth() + 1).padStart(2, '0')}-${String(nowPST.getDate()).padStart(2, '0')}`;
  
  const compactionsToday = compactions.filter(c => {
    const cDate = new Date(new Date(c.timestamp).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const cStr = `${cDate.getFullYear()}-${String(cDate.getMonth() + 1).padStart(2, '0')}-${String(cDate.getDate()).padStart(2, '0')}`;
    return cStr === todayStr;
  }).length;
  
  return { compactions, compactionsToday, lastCompaction };
}

// Read context info for a single agent
function getAgentContext(agentDir: string, sessionKey: string, agentId: string, agentName: string): AgentContextInfo | null {
  const sessionsPath = path.join(agentDir, 'sessions', 'sessions.json');
  if (!fs.existsSync(sessionsPath)) return null;
  
  try {
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
    const session = sessions[sessionKey];
    if (!session) return null;
    
    const sessionId = session.sessionId;
    const jsonlPath = sessionId ? path.join(agentDir, 'sessions', `${sessionId}.jsonl`) : '';
    
    // Get model + current tokens — prefer sessions.json, fall back to JSONL scan
    let model = session.model || '';
    let currentTokens = session.totalTokens || 0;
    
    if ((!currentTokens || !model) && jsonlPath) {
      const jsonlData = getLastUsageFromJsonl(jsonlPath);
      if (!currentTokens) currentTokens = jsonlData.totalTokens;
      if (!model) model = jsonlData.model || 'unknown';
    }
    if (!model) model = 'unknown';
    
    const contextTokens = session.contextTokens || getContextLimitForModel(model);
    const percentUsed = contextTokens > 0 ? (currentTokens / contextTokens) * 100 : 0;
    
    // Read compaction history
    let compactionData = { compactions: [] as { timestamp: string; tokensBefore: number; percentBefore: number }[], compactionsToday: 0, lastCompaction: null as string | null };
    if (jsonlPath) {
      compactionData = readCompactionHistory(jsonlPath, contextTokens);
    }
    
    return {
      agentId,
      agentName,
      model,
      currentTokens,
      maxTokens: contextTokens,
      percentUsed,
      compactionsToday: compactionData.compactionsToday,
      lastCompaction: compactionData.lastCompaction,
      compactionHistory: compactionData.compactions
    };
  } catch (e) {
    console.error(`getAgentContext error for ${agentId}:`, e);
    return null;
  }
}

function getContextUsage(): ContextUsageInfo {
  const result: ContextUsageInfo = {
    agents: [],
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
    
    const agentsBase = path.join(process.env.HOME || '', '.clawdbot', 'agents');
    
    // Henry (main agent)
    const henry = getAgentContext(
      path.join(agentsBase, 'main'),
      'agent:main:main',
      'main',
      'Henry'
    );
    if (henry) result.agents.push(henry);
    
    // Oscar (ops agent)
    const oscar = getAgentContext(
      path.join(agentsBase, 'ops'),
      'agent:ops:main',
      'ops',
      'Oscar'
    );
    if (oscar) result.agents.push(oscar);
  } catch (e) {
    console.error('getContextUsage error:', e);
  }
  
  return result;
}

// Read cron jobs from local state file
function getCronJobs(): { name: string; schedule: string; lastRun?: string; nextRun?: string; status: string }[] {
  try {
    const cronJobsPath = path.join(process.env.HOME || '', '.clawdbot', 'cron', 'jobs.json');
    if (!fs.existsSync(cronJobsPath)) return [];
    
    const data = JSON.parse(fs.readFileSync(cronJobsPath, 'utf-8'));
    if (!data.jobs || !Array.isArray(data.jobs)) return [];
    
    return data.jobs.map((job: { 
      id?: string; 
      name?: string; 
      enabled?: boolean;
      schedule?: { kind: string; expr: string };
      state?: { lastRunAtMs?: number; nextRunAtMs?: number; lastStatus?: string };
    }) => ({
      name: job.name || job.id || 'Unknown',
      schedule: job.schedule?.expr || '',
      lastRun: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : undefined,
      nextRun: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : undefined,
      status: job.enabled === false ? 'pending' : (job.state?.lastStatus === 'ok' ? 'success' : job.state?.lastStatus || 'pending')
    }));
  } catch (e) {
    console.error('getCronJobs error:', e);
    return [];
  }
}

// Read sub-agent sessions from local state file
function getSubAgents(): { id: string; label: string; status: string; startTime: string; endTime?: string; task: string; model?: string }[] {
  try {
    const runsPath = path.join(process.env.HOME || '', '.clawdbot', 'subagents', 'runs.json');
    if (!fs.existsSync(runsPath)) return [];
    
    const data = JSON.parse(fs.readFileSync(runsPath, 'utf-8'));
    if (!data.runs || typeof data.runs !== 'object') return [];
    
    // Convert runs object to array
    const runs = Object.entries(data.runs).map(([id, run]: [string, unknown]) => {
      const r = run as { label?: string; status?: string; startedAt?: number; endedAt?: number; task?: string; model?: string };
      return {
        id,
        label: r.label || id,
        status: r.endedAt ? 'completed' : 'running',
        startTime: r.startedAt ? new Date(r.startedAt).toISOString() : new Date().toISOString(),
        endTime: r.endedAt ? new Date(r.endedAt).toISOString() : undefined,
        task: r.task || r.label || 'Sub-agent task',
        model: r.model
      };
    });
    
    // Sort by start time, most recent first
    return runs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  } catch (e) {
    console.error('getSubAgents error:', e);
    return [];
  }
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
    const [{ services, voiceMetrics }, cronJobs, subAgents] = await Promise.all([
      getAllServices(),
      getCronJobs(),
      getSubAgents()
    ]);
    
    return NextResponse.json({
      services,
      voiceMetrics,
      telegram: getTelegramDumps(),
      memory: getMemorySystemInfo(),
      heartbeat: getHeartbeatHealth(),
      context: getContextUsage(),
      cronJobs,
      subAgents,
      agents: getAgentInfo(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('System status API error:', error);
    return NextResponse.json({ error: 'Failed to fetch system status' }, { status: 500 });
  }
}
