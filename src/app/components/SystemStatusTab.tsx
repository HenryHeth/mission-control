'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Server, Phone, Clock, CheckCircle2, 
  XCircle, AlertTriangle, RefreshCw, Cpu, Zap,
  Calendar, Terminal, User, Timer, FileText,
  MessageSquare, Heart, Database, Brain, FolderOpen,
  Mic, ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInSeconds, differenceInMinutes, differenceInHours } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   Mission Control — System Status Tab v2.0
   Services, Voice, Cron, Sub-agents, Telegram Dumps, 
   Heartbeat Health, Memory System, Context Usage
   ═══════════════════════════════════════════════════════ */

const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:3456';

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  lastCheck: Date;
  details?: string;
  url?: string;
}

interface VoiceServerMetrics {
  status: 'online' | 'offline' | 'unknown';
  activeCalls: number;
  totalCalls: number;
  uptime?: number;
  lastError?: string;
  lastErrorTime?: Date;
}

interface CronJob {
  name: string;
  schedule: string;
  lastRun?: Date;
  nextRun?: Date;
  status: 'success' | 'failed' | 'pending' | 'running';
  duration?: number;
}

interface SubAgent {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  startTime: Date;
  endTime?: Date;
  task: string;
  model?: string;
  tokensUsed?: number;
}

interface TelegramDump {
  filename: string;
  date: string;
  size: number;
  lastModified: string;
  lines?: number;
}

interface TelegramDumpsInfo {
  lastDump: TelegramDump | null;
  files: TelegramDump[];
  totalSize: number;
  missingDays: string[];
}

interface HeartbeatConfig {
  every: string;
  activeHours: { start: string; end: string };
  model: string;
  target: string;
}

interface HeartbeatHealthInfo {
  config: HeartbeatConfig | null;
  lastHeartbeat: string | null;
  status: 'healthy' | 'stale' | 'unknown';
  history24h: { time: string; ok: boolean }[];
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

interface ContextUsageInfo {
  currentTokens: number;
  maxTokens: number;
  percentUsed: number;
  compactionsToday: number;
  lastCompaction: string | null;
  memoryFlush: {
    enabled: boolean;
    prompt: string;
  } | null;
}

type StatusType = 'online' | 'offline' | 'degraded' | 'unknown' | 'success' | 'failed' | 'pending' | 'running' | 'completed' | 'healthy' | 'stale';

function StatusBadge({ status }: { status: StatusType }) {
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    online: { bg: 'var(--emerald-dim)', color: 'var(--emerald)', label: 'Online' },
    offline: { bg: 'var(--red-dim)', color: 'var(--red)', label: 'Offline' },
    degraded: { bg: 'var(--amber-dim)', color: 'var(--amber)', label: 'Degraded' },
    unknown: { bg: 'rgba(100,116,139,0.12)', color: '#64748B', label: 'Unknown' },
    success: { bg: 'var(--emerald-dim)', color: 'var(--emerald)', label: 'Success' },
    failed: { bg: 'var(--red-dim)', color: 'var(--red)', label: 'Failed' },
    pending: { bg: 'rgba(100,116,139,0.12)', color: '#64748B', label: 'Pending' },
    running: { bg: 'var(--sky-dim)', color: 'var(--sky)', label: 'Running' },
    completed: { bg: 'var(--emerald-dim)', color: 'var(--emerald)', label: 'Done' },
    healthy: { bg: 'var(--emerald-dim)', color: 'var(--emerald)', label: 'Healthy' },
    stale: { bg: 'var(--amber-dim)', color: 'var(--amber)', label: 'Stale' },
  };
  
  const c = colors[status] || colors.unknown;
  
  return (
    <span 
      className="status-badge-pill"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const statusIcon = service.status === 'online' ? (
    <CheckCircle2 size={16} style={{ color: 'var(--emerald)' }} />
  ) : service.status === 'offline' ? (
    <XCircle size={16} style={{ color: 'var(--red)' }} />
  ) : service.status === 'degraded' ? (
    <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
  ) : (
    <Activity size={16} style={{ color: '#64748B' }} />
  );

  return (
    <div className={`service-card service-card--${service.status}`}>
      <div className="service-card__icon">{statusIcon}</div>
      <div className="service-card__info">
        <div className="service-card__name">{service.name}</div>
        {service.details && (
          <div className="service-card__details">{service.details}</div>
        )}
        <div className="service-card__meta">
          Checked {formatDistanceToNow(service.lastCheck, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

function VoiceServerCard({ metrics }: { metrics: VoiceServerMetrics }) {
  return (
    <div className="voice-server-card">
      <div className="voice-server-card__header">
        <Phone size={20} style={{ color: metrics.status === 'online' ? 'var(--emerald)' : 'var(--red)' }} />
        <span>Voice Server</span>
        <StatusBadge status={metrics.status} />
      </div>
      
      <div className="voice-server-card__stats">
        <div className="voice-stat">
          <div className="voice-stat__value" style={{ color: metrics.activeCalls > 0 ? 'var(--sky)' : 'var(--text-muted)' }}>
            {metrics.activeCalls}
          </div>
          <div className="voice-stat__label">Active Calls</div>
        </div>
        <div className="voice-stat">
          <div className="voice-stat__value">{metrics.totalCalls}</div>
          <div className="voice-stat__label">Total Today</div>
        </div>
        {metrics.uptime && (
          <div className="voice-stat">
            <div className="voice-stat__value">
              {Math.floor(metrics.uptime / 3600)}h
            </div>
            <div className="voice-stat__label">Uptime</div>
          </div>
        )}
      </div>
      
      {metrics.lastError && (
        <div className="voice-server-card__error">
          <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
          <span>{metrics.lastError}</span>
          {metrics.lastErrorTime && (
            <span className="voice-server-card__error-time">
              {formatDistanceToNow(metrics.lastErrorTime, { addSuffix: true })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function CronJobRow({ job }: { job: CronJob }) {
  return (
    <div className="cron-row">
      <div className="cron-row__info">
        <div className="cron-row__name">{job.name}</div>
        <div className="cron-row__schedule">
          <Clock size={12} />
          {job.schedule}
        </div>
      </div>
      <div className="cron-row__timing">
        {job.lastRun && (
          <div className="cron-row__last">
            Last: {format(job.lastRun, 'MMM d, h:mm a')}
          </div>
        )}
        {job.nextRun && (
          <div className="cron-row__next">
            Next: {formatDistanceToNow(job.nextRun, { addSuffix: true })}
          </div>
        )}
      </div>
      <StatusBadge status={job.status} />
    </div>
  );
}

function formatDuration(startTime: Date, endTime?: Date): string {
  const end = endTime || new Date();
  const seconds = differenceInSeconds(end, startTime);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = differenceInMinutes(end, startTime);
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = differenceInHours(end, startTime);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function SubAgentTimelineRow({ agent }: { agent: SubAgent }) {
  const isRunning = agent.status === 'running';
  
  return (
    <div className={`agent-timeline-row ${isRunning ? 'agent-timeline-row--running' : ''}`}>
      <div className="agent-timeline-row__status">
        <StatusBadge status={agent.status} />
      </div>
      <div className="agent-timeline-row__name">
        <Terminal size={14} style={{ color: isRunning ? 'var(--sky)' : 'var(--text-dim)' }} />
        <span>{agent.label}</span>
      </div>
      <div className="agent-timeline-row__task">
        <FileText size={12} style={{ color: 'var(--text-dim)' }} />
        <span title={agent.task}>{agent.task}</span>
      </div>
      <div className="agent-timeline-row__time">
        <Clock size={12} style={{ color: 'var(--text-dim)' }} />
        <span>{format(agent.startTime, 'h:mm a')}</span>
      </div>
      <div className="agent-timeline-row__duration">
        <Timer size={12} style={{ color: isRunning ? 'var(--sky)' : 'var(--text-dim)' }} />
        <span className={isRunning ? 'duration--running' : ''}>
          {formatDuration(agent.startTime, agent.endTime)}
          {isRunning && ' ⏱'}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NEW: Telegram Dumps Section
   Shows last 4 days with missing indicator
   ═══════════════════════════════════════════════════════ */

function TelegramDumpsCard({ data }: { data: TelegramDumpsInfo }) {
  // Generate last 4 days for display - use files data directly to avoid timezone issues
  // Show the 4 most recent calendar days, checking if each has a dump
  const [clientDates, setClientDates] = useState<string[]>([]);
  
  useEffect(() => {
    // Generate dates on client side only to avoid SSR timezone mismatch
    const dates = Array.from({ length: 4 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
    setClientDates(dates);
  }, []);

  const last4Days = clientDates.map(dateStr => ({
    date: dateStr,
    file: data.files.find(f => f.date === dateStr)
  }));

  return (
    <div className="system-status__card system-status__card--telegram">
      <div className="system-status__card-header">
        <MessageSquare size={18} style={{ color: 'var(--sky)' }} />
        <h2>Telegram Dumps</h2>
      </div>
      
      <div className="telegram-dumps-info">
        {data.lastDump ? (
          <>
            <div className="telegram-dumps-row">
              <span className="telegram-dumps-label">Last Dump:</span>
              <span className="telegram-dumps-value">
                {formatDistanceToNow(new Date(data.lastDump.lastModified), { addSuffix: true })}
              </span>
            </div>
            <div className="telegram-dumps-row">
              <span className="telegram-dumps-label">File Size:</span>
              <span className="telegram-dumps-value">
                {formatBytes(data.lastDump.size)}
                {data.lastDump.lines && (
                  <span className="telegram-dumps-meta">({data.lastDump.lines} lines)</span>
                )}
              </span>
            </div>
            <div className="telegram-dumps-row">
              <span className="telegram-dumps-label">Folder:</span>
              <span className="telegram-dumps-value telegram-dumps-path">
                memory/telegram/
              </span>
            </div>
          </>
        ) : (
          <div className="telegram-dumps-empty">
            <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
            <span>No Telegram dumps found</span>
          </div>
        )}
        
        <div className="telegram-dumps-recent">
          <div className="telegram-dumps-recent-label">Last 4 Days:</div>
          <div className="telegram-dumps-day-list">
            {last4Days.length === 0 ? (
              <div className="telegram-dumps-loading">Loading...</div>
            ) : last4Days.map(({ date, file }) => (
              <div 
                key={date}
                className={`telegram-dumps-day-item ${file ? '' : 'telegram-dumps-day-item--missing'}`}
              >
                <span className="telegram-dumps-day-date">
                  {format(new Date(date + 'T12:00:00'), 'MMM d')}
                </span>
                {file ? (
                  <>
                    <span className="telegram-dumps-day-size">
                      {formatBytes(file.size)}
                    </span>
                    <CheckCircle2 size={14} style={{ color: 'var(--emerald)' }} />
                  </>
                ) : (
                  <>
                    <span className="telegram-dumps-day-missing">Missing</span>
                    <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NEW: Heartbeat Health Section
   ═══════════════════════════════════════════════════════ */

function HeartbeatHealthCard({ data }: { data: HeartbeatHealthInfo }) {
  // Count successful heartbeats in last 24h
  const successCount = data.history24h.filter(h => h.ok).length;
  const totalCount = data.history24h.length;
  
  return (
    <div className="system-status__card system-status__card--heartbeat">
      <div className="system-status__card-header">
        <Heart size={18} style={{ color: data.status === 'healthy' ? 'var(--emerald)' : 'var(--amber)' }} />
        <h2>Heartbeat Health</h2>
        <StatusBadge status={data.status} />
      </div>
      
      {/* Note about workaround */}
      <div className="heartbeat-workaround-note" style={{ 
        fontSize: '11px', 
        color: 'var(--text-dim)', 
        padding: '4px 8px',
        background: 'rgba(100,116,139,0.08)',
        borderRadius: '4px',
        marginBottom: '8px'
      }}>
        ⚡ Tracking external launchd trigger (workaround), not internal scheduler
      </div>
      
      <div className="heartbeat-info">
        <div className="heartbeat-row">
          <span className="heartbeat-label">Last Heartbeat:</span>
          <span className="heartbeat-value">
            {data.lastHeartbeat 
              ? formatDistanceToNow(new Date(data.lastHeartbeat), { addSuffix: true })
              : 'Unknown'}
          </span>
        </div>
        
        {data.config && (
          <>
            <div className="heartbeat-row">
              <span className="heartbeat-label">Model:</span>
              <span className="heartbeat-value heartbeat-model">
                {data.config.model.split('/').pop() || data.config.model}
              </span>
            </div>
            <div className="heartbeat-row">
              <span className="heartbeat-label">Interval:</span>
              <span className="heartbeat-value">{data.config.every}</span>
            </div>
            <div className="heartbeat-row">
              <span className="heartbeat-label">Active Hours:</span>
              <span className="heartbeat-value">
                {data.config.activeHours.start} - {data.config.activeHours.end} PST
              </span>
            </div>
          </>
        )}
        
        <div className="heartbeat-history">
          <div className="heartbeat-history-label">24h History:</div>
          <div className="heartbeat-history-bar">
            {data.history24h.slice(0, 48).reverse().map((h, i) => (
              <div 
                key={i}
                className={`heartbeat-tick ${h.ok ? 'heartbeat-tick--ok' : 'heartbeat-tick--fail'}`}
                title={`${format(new Date(h.time), 'h:mm a')}: ${h.ok ? '✓' : '✗'}`}
              />
            ))}
          </div>
          <div className="heartbeat-history-summary">
            {successCount}/{totalCount} ✓
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Memory Flow Diagram Section
   Visual cascade of memory hierarchy with last update times
   ═══════════════════════════════════════════════════════ */

function MemoryFlowLevel({ 
  icon, 
  name, 
  label,
  size, 
  count, 
  lastModified 
}: { 
  icon: React.ReactNode; 
  name: string;
  label: string;
  size: number; 
  count?: number;
  lastModified: string | null;
}) {
  return (
    <div className="memory-flow-level">
      <div className="memory-flow-icon">{icon}</div>
      <div className="memory-flow-info">
        <div className="memory-flow-name">{name}</div>
        <div className="memory-flow-label">{label}</div>
        <div className="memory-flow-stats">
          {count !== undefined && (
            <span className="memory-flow-count">{count} files</span>
          )}
          <span className="memory-flow-size">{formatBytes(size)}</span>
          {lastModified ? (
            <span className="memory-flow-time">
              {formatDistanceToNow(new Date(lastModified), { addSuffix: true })}
            </span>
          ) : (
            <span className="memory-flow-missing">No updates</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MemorySystemCard({ data }: { data: MemorySystemInfo }) {
  return (
    <div className="system-status__card system-status__card--memory-system">
      <div className="system-status__card-header">
        <Database size={18} style={{ color: 'var(--amber)' }} />
        <h2>Memory Flow</h2>
      </div>
      
      <div className="memory-flow-diagram">
        {/* Level 1: MEMORY.md (curated) */}
        <MemoryFlowLevel
          icon={<FileText size={18} style={{ color: 'var(--sky)' }} />}
          name="MEMORY.md"
          label="curated long-term"
          size={data.memoryMd?.size || 0}
          lastModified={data.memoryMd?.lastModified || null}
        />
        
        <div className="memory-flow-arrow">↓</div>
        
        {/* Level 2: memory/*.md (daily) */}
        <MemoryFlowLevel
          icon={<FolderOpen size={18} style={{ color: 'var(--emerald)' }} />}
          name="memory/*.md"
          label="daily notes"
          size={data.memoryFolder.totalSize}
          count={data.memoryFolder.fileCount}
          lastModified={data.memoryFolder.lastModified}
        />
        
        <div className="memory-flow-arrow">↓</div>
        
        {/* Level 3: telegram/*.md (chat dumps) */}
        <MemoryFlowLevel
          icon={<MessageSquare size={18} style={{ color: 'var(--sky)' }} />}
          name="telegram/*.md"
          label="chat dumps"
          size={data.telegramDumps.totalSize}
          count={data.telegramDumps.fileCount}
          lastModified={data.telegramDumps.lastModified}
        />
        
        <div className="memory-flow-arrow">↓</div>
        
        {/* Level 4: voice-calls/*.txt (transcripts) */}
        <MemoryFlowLevel
          icon={<Mic size={18} style={{ color: 'var(--amber)' }} />}
          name="voice-calls/*.txt"
          label="transcripts"
          size={data.voiceCalls.totalSize}
          count={data.voiceCalls.fileCount}
          lastModified={data.voiceCalls.lastModified}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NEW: Context Usage Section
   ═══════════════════════════════════════════════════════ */

function ContextUsageCard({ data }: { data: ContextUsageInfo }) {
  const barColor = data.percentUsed > 80 
    ? 'var(--red)' 
    : data.percentUsed > 50 
      ? 'var(--amber)' 
      : 'var(--emerald)';
      
  return (
    <div className="system-status__card system-status__card--context">
      <div className="system-status__card-header">
        <Brain size={18} style={{ color: 'var(--sky)' }} />
        <h2>Context Usage</h2>
      </div>
      
      <div className="context-usage-info">
        <div className="context-usage-bar-container">
          <div className="context-usage-bar-bg">
            <div 
              className="context-usage-bar-fill"
              style={{ 
                width: `${Math.min(data.percentUsed, 100)}%`,
                backgroundColor: barColor 
              }}
            />
          </div>
          <div className="context-usage-bar-label">
            <span>{data.currentTokens.toLocaleString()} / {data.maxTokens.toLocaleString()} tokens</span>
            <span style={{ color: barColor }}>{data.percentUsed.toFixed(1)}%</span>
          </div>
        </div>
        
        <div className="context-usage-stats">
          <div className="context-usage-stat">
            <span className="context-usage-stat-label">Compactions today:</span>
            <span className="context-usage-stat-value">{data.compactionsToday}</span>
          </div>
          
          {data.lastCompaction && (
            <div className="context-usage-stat">
              <span className="context-usage-stat-label">Last compaction:</span>
              <span className="context-usage-stat-value">
                {formatDistanceToNow(new Date(data.lastCompaction), { addSuffix: true })}
              </span>
            </div>
          )}
          
          <div className="context-usage-stat">
            <span className="context-usage-stat-label">memoryFlush:</span>
            <span className="context-usage-stat-value">
              {data.memoryFlush?.enabled ? (
                <span className="memory-flush-enabled">
                  <CheckCircle2 size={12} style={{ color: 'var(--emerald)' }} />
                  Enabled
                  {data.memoryFlush.prompt && (
                    <span className="memory-flush-configured">(prompt configured)</span>
                  )}
                </span>
              ) : (
                <span className="memory-flush-disabled">
                  <XCircle size={12} style={{ color: 'var(--red)' }} />
                  Disabled
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

export default function SystemStatusTab() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceServerMetrics>({
    status: 'unknown',
    activeCalls: 0,
    totalCalls: 0
  });
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // New state for enhanced sections
  const [telegramDumps, setTelegramDumps] = useState<TelegramDumpsInfo | null>(null);
  const [heartbeatHealth, setHeartbeatHealth] = useState<HeartbeatHealthInfo | null>(null);
  const [memorySystem, setMemorySystem] = useState<MemorySystemInfo | null>(null);
  const [contextUsage, setContextUsage] = useState<ContextUsageInfo | null>(null);

  const generateSampleData = useCallback(() => {
    // Fallback sample services (only used if API fails)
    setServices([
      {
        name: 'Clawdbot Gateway',
        status: 'unknown',
        lastCheck: new Date(),
        details: 'Port 18789'
      },
      {
        name: 'Voice Server',
        status: 'unknown',
        lastCheck: new Date(),
        details: 'Port 6060'
      },
      {
        name: 'File Server',
        status: 'unknown',
        lastCheck: new Date(),
        details: 'Port 3456'
      },
      {
        name: 'Browser Proxy',
        status: 'unknown',
        lastCheck: new Date(),
        details: 'Port 18800'
      }
    ]);

    // Voice metrics - will be populated from API
    setVoiceMetrics({
      status: 'unknown',
      activeCalls: 0,
      totalCalls: 0
    });

    // Empty cron jobs - will be populated from API
    setCronJobs([]);

    // Empty sub-agents - will be populated from API
    setSubAgents([]);

    // Telegram dumps - will be populated from API
    setTelegramDumps(null);

    // Heartbeat health - will be populated from API
    setHeartbeatHealth(null);

    // Memory system - will be populated from API
    setMemorySystem(null);

    // Context usage - will be populated from API
    setContextUsage(null);
  }, []);

  const fetchSystemStatus = useCallback(async () => {
    try {
      // Fetch all data from our unified API endpoint
      const res = await fetch('/api/system-status');
      if (res.ok) {
        const data = await res.json();
        
        // Update services from API (server-side checks)
        if (data.services) {
          const mappedServices: ServiceStatus[] = data.services.map((s: { name: string; status: string; lastCheck: string; details?: string }) => ({
            name: s.name,
            status: s.status as 'online' | 'offline' | 'degraded' | 'unknown',
            lastCheck: new Date(s.lastCheck),
            details: s.details
          }));
          setServices(mappedServices);
        }
        
        // Update voice metrics
        if (data.voiceMetrics) {
          setVoiceMetrics(data.voiceMetrics);
        }
        
        // Update other sections
        if (data.telegram) setTelegramDumps(data.telegram);
        if (data.heartbeat) setHeartbeatHealth(data.heartbeat);
        if (data.memory) setMemorySystem(data.memory);
        if (data.context) setContextUsage(data.context);
        
        // Update cron jobs from real data
        if (data.cronJobs && data.cronJobs.length > 0) {
          setCronJobs(data.cronJobs.map((job: { name: string; schedule: string; lastRun?: string; nextRun?: string; status: string }) => ({
            name: job.name,
            schedule: job.schedule,
            lastRun: job.lastRun ? new Date(job.lastRun) : undefined,
            nextRun: job.nextRun ? new Date(job.nextRun) : undefined,
            status: job.status as 'success' | 'failed' | 'pending' | 'running'
          })));
        } else if (data.cronJobs) {
          // API returned empty array - clear sample data
          setCronJobs([]);
        }
        
        // Update sub-agents from real data
        if (data.subAgents && data.subAgents.length > 0) {
          setSubAgents(data.subAgents.map((a: { id: string; label: string; status: string; startTime: string; endTime?: string; task: string; model?: string }) => ({
            id: a.id,
            label: a.label,
            status: a.status as 'running' | 'completed' | 'failed' | 'pending',
            startTime: new Date(a.startTime),
            endTime: a.endTime ? new Date(a.endTime) : undefined,
            task: a.task,
            model: a.model
          })));
        } else if (data.subAgents) {
          // API returned empty array - clear sample data
          setSubAgents([]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch system status:', e);
    }
  }, []);

  const checkLiveServices = useCallback(async () => {
    // Fetch service status from our API (which runs on the server and can check localhost)
    try {
      const res = await fetch('/api/system-status?section=services');
      if (res.ok) {
        const data = await res.json();
        if (data.services) {
          const mappedServices: ServiceStatus[] = data.services.map((s: { name: string; status: string; lastCheck: string; details?: string }) => ({
            name: s.name,
            status: s.status as 'online' | 'offline' | 'degraded' | 'unknown',
            lastCheck: new Date(s.lastCheck),
            details: s.details
          }));
          setServices(mappedServices);
        }
        if (data.voiceMetrics) {
          setVoiceMetrics(data.voiceMetrics);
        }
      }
    } catch (e) {
      console.error('Failed to fetch service status:', e);
    }
  }, []);

  useEffect(() => {
    // Load real data first, fall back to sample data only if API fails
    const initializeData = async () => {
      try {
        await Promise.all([checkLiveServices(), fetchSystemStatus()]);
      } catch (e) {
        console.error('API failed, using sample data:', e);
        generateSampleData();
      }
      setLoading(false);
      setLastRefresh(new Date());
    };
    
    initializeData();
    
    const interval = setInterval(() => {
      checkLiveServices();
      fetchSystemStatus();
      setLastRefresh(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [generateSampleData, checkLiveServices, fetchSystemStatus]);

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([checkLiveServices(), fetchSystemStatus()]).then(() => {
      setLoading(false);
      setLastRefresh(new Date());
    });
  };

  if (loading) {
    return (
      <div className="system-status">
        <div className="loading-screen">
          <Server size={48} className="pulse" style={{ color: 'var(--sky)' }} />
          <p>Checking systems...</p>
        </div>
      </div>
    );
  }

  const onlineCount = services.filter(s => s.status === 'online').length;
  const totalServices = services.length;
  const runningAgents = subAgents.filter(a => a.status === 'running').length;
  const totalAgentsToday = subAgents.length;

  return (
    <div className="system-status">
      {/* Header */}
      <div className="system-status__header">
        <div className="system-status__title">
          <Server size={24} style={{ color: 'var(--sky)' }} />
          <h1>System Status</h1>
        </div>
        <div className="system-status__meta">
          <span className={`health-summary ${onlineCount === totalServices ? 'health-summary--good' : 'health-summary--warn'}`}>
            {onlineCount}/{totalServices} Services Online
          </span>
          <button className="refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <span className="system-status__updated">
            Updated {format(lastRefresh, 'h:mm:ss a')}
          </span>
        </div>
      </div>

      <div className="system-status__grid">
        {/* Services */}
        <div className="system-status__card system-status__card--services">
          <div className="system-status__card-header">
            <Cpu size={18} style={{ color: 'var(--sky)' }} />
            <h2>Services</h2>
          </div>
          <div className="services-list">
            {services.map(service => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </div>

        {/* Voice Server */}
        <div className="system-status__card system-status__card--voice">
          <VoiceServerCard metrics={voiceMetrics} />
        </div>

        {/* Telegram Dumps */}
        {telegramDumps && <TelegramDumpsCard data={telegramDumps} />}

        {/* Heartbeat Health */}
        {heartbeatHealth && <HeartbeatHealthCard data={heartbeatHealth} />}

        {/* Memory System (Flow Diagram) */}
        {memorySystem && <MemorySystemCard data={memorySystem} />}

        {/* Context Usage (Compaction Countdown) */}
        {contextUsage && <ContextUsageCard data={contextUsage} />}

        {/* Cron Jobs */}
        <div className="system-status__card system-status__card--cron">
          <div className="system-status__card-header">
            <Calendar size={18} style={{ color: 'var(--amber)' }} />
            <h2>Scheduled Jobs</h2>
            {cronJobs.length > 0 && (
              <span className="system-status__card-count">{cronJobs.length} jobs</span>
            )}
          </div>
          <div className="cron-list">
            {cronJobs.length === 0 ? (
              <div className="empty-state">No scheduled jobs found</div>
            ) : (
              cronJobs.map(job => (
                <CronJobRow key={job.name} job={job} />
              ))
            )}
          </div>
        </div>

        {/* Sub-Agent Timeline - Full Width */}
        <div className="system-status__card system-status__card--timeline">
          <div className="system-status__card-header">
            <Terminal size={18} style={{ color: 'var(--emerald)' }} />
            <h2>Sub-Agent Timeline</h2>
            <span className="system-status__card-count">
              {runningAgents} running · {totalAgentsToday} today
            </span>
          </div>
          
          <div className="agent-timeline-header">
            <div className="agent-timeline-header__col agent-timeline-header__col--status">Status</div>
            <div className="agent-timeline-header__col agent-timeline-header__col--name">Agent Name</div>
            <div className="agent-timeline-header__col agent-timeline-header__col--task">Task</div>
            <div className="agent-timeline-header__col agent-timeline-header__col--time">Started</div>
            <div className="agent-timeline-header__col agent-timeline-header__col--duration">Duration</div>
          </div>
          
          <div className="agent-timeline-list">
            {subAgents.length === 0 ? (
              <div className="empty-state">No sub-agents active today</div>
            ) : (
              subAgents.map(agent => (
                <SubAgentTimelineRow key={agent.id} agent={agent} />
              ))
            )}
          </div>
          
          <div className="agent-timeline-summary">
            <div className="agent-timeline-summary__item">
              <User size={14} />
              <span>Total Sessions: {totalAgentsToday}</span>
            </div>
            <div className="agent-timeline-summary__item">
              <Timer size={14} />
              <span>Avg Duration: {Math.round(subAgents.filter(a => a.endTime).reduce((sum, a) => {
                return sum + differenceInMinutes(a.endTime!, a.startTime);
              }, 0) / Math.max(1, subAgents.filter(a => a.endTime).length))}m</span>
            </div>
            <div className="agent-timeline-summary__item">
              <Zap size={14} />
              <span>Peak Concurrency: 2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
