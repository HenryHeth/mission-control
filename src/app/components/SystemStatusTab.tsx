'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Server, Phone, Clock, CheckCircle2, 
  XCircle, AlertTriangle, RefreshCw, Cpu, Zap,
  Calendar, Terminal, User, Timer, FileText,
  MessageSquare, Heart, Database, Brain, FolderOpen,
  Mic, ExternalLink, RotateCcw, Download, Play
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
  metricsAvailable?: boolean;
  uptime?: number;
  lastCall?: { timestamp: string; duration: number; caller: string } | null;
  callsLast24h?: number;
  callsLast7d?: number;
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
  agentName?: string;
  agentModel?: string;
}

interface AgentInfo {
  id: string;
  name: string;
  model: string;
  heartbeatEnabled: boolean;
  heartbeatInterval?: string;
  workspace: string;
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

interface ServiceHealthEntry {
  time: string;
  ok: boolean;
}

interface ServiceHealthHistory {
  [serviceName: string]: ServiceHealthEntry[];
}

function ServiceUptimeBar({ history }: { history: ServiceHealthEntry[] }) {
  // Show last 48 ticks (4h of 5-min checks, or whatever we have)
  const ticks = history.slice(-48);
  if (ticks.length === 0) {
    return (
      <div className="service-uptime-bar" style={{ opacity: 0.4, fontSize: '11px', color: 'var(--text-dim)' }}>
        Collecting data...
      </div>
    );
  }
  
  const upCount = ticks.filter(t => t.ok).length;
  const pct = Math.round((upCount / ticks.length) * 100);
  
  return (
    <div className="service-uptime-bar">
      <div className="service-uptime-ticks">
        {ticks.map((t, i) => (
          <div 
            key={i}
            className={`service-uptime-tick ${t.ok ? 'service-uptime-tick--up' : 'service-uptime-tick--down'}`}
            title={`${format(new Date(t.time), 'h:mm a')}: ${t.ok ? 'UP' : 'DOWN'}`}
          />
        ))}
      </div>
      <div className="service-uptime-label">{pct}% uptime</div>
    </div>
  );
}

function ServiceCard({ service, healthHistory, onRestart, isRestarting, voiceMetrics }: { 
  service: ServiceStatus; 
  healthHistory?: ServiceHealthEntry[];
  onRestart?: (serviceKey: string) => void;
  isRestarting?: boolean;
  voiceMetrics?: VoiceServerMetrics;
}) {
  const statusIcon = service.status === 'online' ? (
    <CheckCircle2 size={16} style={{ color: 'var(--emerald)' }} />
  ) : service.status === 'offline' ? (
    <XCircle size={16} style={{ color: 'var(--red)' }} />
  ) : service.status === 'degraded' ? (
    <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
  ) : (
    <Activity size={16} style={{ color: '#64748B' }} />
  );

  // Map service name to restart key
  const restartKeyMap: Record<string, string> = {
    'Clawdbot Gateway': 'gateway',
    'Voice Services': 'voice',
    'MC File Server': 'file-server',
    'Automation Browser': 'browser',
  };
  const restartKey = restartKeyMap[service.name];
  const canRestart = restartKey && restartKey !== 'file-server';

  return (
    <div className={`service-card service-card--${service.status}`}>
      <div className="service-card__top-row">
        <div className="service-card__name-row">
          {statusIcon}
          <span className="service-card__name">{service.name}</span>
          {service.details && (
            <span className="service-card__details">{service.details}</span>
          )}
        </div>
        {canRestart && onRestart && (
          <button 
            className={`service-restart-btn ${isRestarting ? 'service-restart-btn--spinning' : ''}`}
            onClick={() => onRestart(restartKey)}
            disabled={isRestarting}
            title={`Restart ${service.name}`}
          >
            <RotateCcw size={12} className={isRestarting ? 'spin-animation' : ''} />
            {isRestarting ? 'Restarting...' : 'Restart'}
          </button>
        )}
      </div>
      {voiceMetrics && service.name === 'Voice Services' && (
        <div className="service-card__voice-stats">
          {voiceMetrics.metricsAvailable ? (
            <>
              <span className="voice-inline-stat">
                <Phone size={16} style={{ color: voiceMetrics.activeCalls > 0 ? 'var(--sky)' : 'var(--text-dim)' }} />
                {voiceMetrics.activeCalls > 0 ? `${voiceMetrics.activeCalls} active` : 'Idle'}
              </span>
              <span className="voice-inline-stat">
                24h: {voiceMetrics.callsLast24h ?? 0}
              </span>
              <span className="voice-inline-stat">
                7d: {voiceMetrics.callsLast7d ?? 0}
              </span>
              <span className="voice-inline-stat" style={{ color: 'var(--text-dim)' }}>
                Last: {voiceMetrics.lastCall 
                  ? formatDistanceToNow(new Date(voiceMetrics.lastCall.timestamp), { addSuffix: true })
                  : 'Never'}
              </span>
            </>
          ) : (
            <span className="voice-inline-stat" style={{ color: 'var(--text-dim)' }}>
              ✗ No metrics endpoint
            </span>
          )}
        </div>
      )}
      {healthHistory && <ServiceUptimeBar history={healthHistory} />}
    </div>
  );
}

function VoiceServerCard({ metrics }: { metrics: VoiceServerMetrics }) {
  return (
    <div className="voice-server-card">
      <div className="voice-server-card__header">
        <Phone size={20} style={{ color: metrics.status === 'online' ? 'var(--emerald)' : 'var(--red)' }} />
        <span>Voice Services</span>
        <StatusBadge status={metrics.status} />
      </div>
      
      <div className="voice-server-card__stats">
        {metrics.metricsAvailable ? (
          <>
            <div className="voice-stat">
              <div className="voice-stat__value" style={{ color: metrics.activeCalls > 0 ? 'var(--sky)' : 'var(--text-muted)' }}>
                {metrics.activeCalls}
              </div>
              <div className="voice-stat__label">Active Calls</div>
            </div>
            <div className="voice-stat">
              <div className="voice-stat__value">{metrics.callsLast24h ?? 0}</div>
              <div className="voice-stat__label">Last 24h</div>
            </div>
            <div className="voice-stat">
              <div className="voice-stat__value">{metrics.callsLast7d ?? 0}</div>
              <div className="voice-stat__label">Last 7d</div>
            </div>
            <div className="voice-stat">
              <div className="voice-stat__value" style={{ fontSize: '14px' }}>
                {metrics.lastCall 
                  ? formatDistanceToNow(new Date(metrics.lastCall.timestamp), { addSuffix: true })
                  : 'Never'}
              </div>
              <div className="voice-stat__label">Last Call</div>
            </div>
            {metrics.uptime != null && (
              <div className="voice-stat">
                <div className="voice-stat__value">
                  {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
                </div>
                <div className="voice-stat__label">Uptime</div>
              </div>
            )}
          </>
        ) : (
          <div className="voice-stat">
            <div className="voice-stat__value" style={{ color: 'var(--text-dim)', fontSize: '14px' }}>✗</div>
            <div className="voice-stat__label">No metrics endpoint</div>
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

function TelegramDumpsCard({ data, onTriggerDump, isDumping }: { data: TelegramDumpsInfo; onTriggerDump?: () => void; isDumping?: boolean }) {
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
        {onTriggerDump && (
          <button 
            className={`telegram-dump-btn ${isDumping ? 'telegram-dump-btn--running' : ''}`}
            onClick={onTriggerDump}
            disabled={isDumping}
            title="Trigger Telegram dump now"
          >
            {isDumping ? (
              <><RefreshCw size={14} className="spin-animation" /> Dumping...</>
            ) : (
              <><Download size={14} /> Dump Now</>
            )}
          </button>
        )}
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
  
  return (
    <div className="system-status__card system-status__card--heartbeat">
      <div className="system-status__card-header">
        <Heart size={18} style={{ color: data.status === 'healthy' ? 'var(--emerald)' : 'var(--amber)' }} />
        <h2>Heartbeat Health</h2>
        <StatusBadge status={data.status} />
      </div>
      
      {/* Note about which agent runs heartbeats */}
      <div style={{ 
        fontSize: '10px', 
        color: 'var(--sky)', 
        padding: '2px 6px',
        background: 'rgba(56,189,248,0.1)',
        borderRadius: '4px',
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <Terminal size={10} />
        <span>
          {data.agentName ? (
            <>Operated by <strong>{data.agentName}</strong> (ops agent)</>
          ) : (
            '⚡ launchd triggered (30m)'
          )}
        </span>
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
            {successCount}/48 ✓
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
      
      <div className="memory-flow-grid">
        <MemoryFlowLevel
          icon={<FileText size={16} style={{ color: 'var(--sky)' }} />}
          name="MEMORY.md"
          label="curated long-term"
          size={data.memoryMd?.size || 0}
          lastModified={data.memoryMd?.lastModified || null}
        />
        <MemoryFlowLevel
          icon={<FolderOpen size={16} style={{ color: 'var(--emerald)' }} />}
          name="memory/*.md"
          label="daily notes"
          size={data.memoryFolder.totalSize}
          count={data.memoryFolder.fileCount}
          lastModified={data.memoryFolder.lastModified}
        />
        <MemoryFlowLevel
          icon={<MessageSquare size={16} style={{ color: 'var(--sky)' }} />}
          name="telegram/*.md"
          label="chat dumps"
          size={data.telegramDumps.totalSize}
          count={data.telegramDumps.fileCount}
          lastModified={data.telegramDumps.lastModified}
        />
        <MemoryFlowLevel
          icon={<Mic size={16} style={{ color: 'var(--amber)' }} />}
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

function getBarColor(percent: number): string {
  if (percent >= 80) return 'var(--red)';
  if (percent >= 50) return 'var(--amber)';
  return 'var(--emerald)';
}

function getPercentColorStyle(percent: number): React.CSSProperties {
  return { color: getBarColor(percent) };
}

function AgentContextSection({ agent }: { agent: AgentContextInfo }) {
  const barColor = getBarColor(agent.percentUsed);
  const tokensK = Math.round(agent.currentTokens / 1000);
  const maxK = Math.round(agent.maxTokens / 1000);
  const lastComp = agent.lastCompaction 
    ? formatDistanceToNow(new Date(agent.lastCompaction), { addSuffix: true }).replace(' ago', '').replace('about ', '~')
    : null;
  
  return (
    <div className="context-agent-section context-agent-section--compact">
      <div className="context-agent-header">
        <span className="context-agent-name">{agent.agentName}</span>
        <span className="context-compact-tokens">{tokensK}k/{maxK}k</span>
        <span style={{ color: barColor, fontWeight: 600, fontSize: '0.75rem' }}>{agent.percentUsed.toFixed(0)}%</span>
      </div>
      
      <div className="context-usage-bar-container context-usage-bar-container--compact">
        <div className="context-usage-bar-bg" style={{ height: '4px' }}>
          <div 
            className="context-usage-bar-fill"
            style={{ 
              width: `${Math.min(agent.percentUsed, 100)}%`,
              backgroundColor: barColor 
            }}
          />
        </div>
      </div>
      
      <div className="context-compact-meta">
        <span>Compactions: {agent.compactionsToday}</span>
        {lastComp && <span> · Last: {lastComp}</span>}
      </div>
    </div>
  );
}

function CompactionHistoryTable({ history }: { history: { timestamp: string; tokensBefore: number; percentBefore: number; agent: string }[] }) {
  if (history.length === 0) return null;
  
  return (
    <table className="context-compaction-table context-compaction-table--compact" style={{ fontSize: '11px', margin: '2px 0 0 0' }}>
      <thead>
        <tr>
          <th style={{ padding: '2px 4px' }}>Time</th>
          <th style={{ padding: '2px 4px' }}>Tokens</th>
          <th style={{ padding: '2px 4px' }}>%</th>
        </tr>
      </thead>
      <tbody>
        {history.map((c, i) => (
          <tr key={i} style={{ lineHeight: '1.2' }}>
            <td style={{ padding: '1px 4px' }}>{format(new Date(c.timestamp), 'h:mm a')}</td>
            <td style={{ padding: '1px 4px' }}>{c.tokensBefore.toLocaleString()}</td>
            <td style={{ padding: '1px 4px', ...getPercentColorStyle(c.percentBefore) }}>{c.percentBefore.toFixed(0)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ContextUsageCard({ data }: { data: ContextUsageInfo }) {
  const [showHistory, setShowHistory] = useState(false);
  // Find Henry (main) and Oscar (ops) agents — Henry first
  const henry = data.agents.find(a => a.agentId === 'main' || a.agentName.toLowerCase() === 'henry');
  const oscar = data.agents.find(a => a.agentId === 'ops' || a.agentName.toLowerCase() === 'oscar');
  // Fallback: if we can't identify them, just use order
  const orderedAgents = henry && oscar ? [henry, oscar] : data.agents;
  
  const henryHistory = (henry || orderedAgents[0])?.compactionHistory?.map(c => ({ 
    ...c, agent: (henry || orderedAgents[0]).agentName 
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];

  return (
    <div className="system-status__card system-status__card--context">
      <div className="system-status__card-header">
        <Brain size={18} style={{ color: 'var(--sky)' }} />
        <h2>Context Usage</h2>
      </div>
      
      <div className="context-usage-info">
        {/* Henry section */}
        <AgentContextSection agent={henry || orderedAgents[0]} />
        
        {/* Henry compaction history — always visible */}
        {henryHistory.length > 0 && <CompactionHistoryTable history={henryHistory} />}
        
        {/* Divider */}
        <div className="context-agent-divider" style={{ margin: '4px 0' }} />
        
        {/* Oscar section */}
        {(oscar || orderedAgents[1]) && (
          <AgentContextSection agent={oscar || orderedAgents[1]} />
        )}
        
        {/* memoryFlush + collapsible history */}
        <div className="context-compact-footer">
          <span className="context-compact-flush">
            memoryFlush: {data.memoryFlush?.enabled ? (
              <span style={{ color: 'var(--emerald)' }}>✓ On</span>
            ) : (
              <span style={{ color: 'var(--red)' }}>✗ Off</span>
            )}
          </span>
        </div>
        
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NEW: Agents Overview Section
   Shows Henry (coordinator) + Oscar (ops)
   ═══════════════════════════════════════════════════════ */

function AgentsCard({ agents }: { agents: AgentInfo[] }) {
  if (agents.length === 0) return null;
  
  return (
    <div className="system-status__card system-status__card--agents">
      <div className="system-status__card-header">
        <User size={18} style={{ color: 'var(--purple, #8B5CF6)' }} />
        <h2>Active Agents</h2>
        <span className="system-status__card-count">{agents.length} agents</span>
      </div>
      
      <div className="agents-list">
        {agents.map(agent => {
          const modelShort = agent.model.split('/').pop() || agent.model;
          const isHeartbeatAgent = agent.heartbeatEnabled;
          
          return (
            <div key={agent.id} className="agent-card">
              <div className="agent-card__icon">
                {agent.id === 'main' ? (
                  <span style={{ fontSize: '18px' }}>🤖</span>
                ) : (
                  <span style={{ fontSize: '18px' }}>⚙️</span>
                )}
              </div>
              <div className="agent-card__info">
                <div className="agent-card__name">
                  {agent.name}
                  {agent.id === 'main' && (
                    <span className="agent-card__role" style={{ color: 'var(--amber)' }}>coordinator</span>
                  )}
                  {agent.id === 'ops' && (
                    <span className="agent-card__role" style={{ color: 'var(--sky)' }}>ops</span>
                  )}
                </div>
                <div className="agent-card__model">
                  <Cpu size={12} style={{ color: 'var(--text-dim)' }} />
                  <span>{modelShort}</span>
                </div>
                {isHeartbeatAgent && (
                  <div className="agent-card__heartbeat">
                    <Heart size={12} style={{ color: 'var(--emerald)' }} />
                    <span>Heartbeat every {agent.heartbeatInterval}</span>
                  </div>
                )}
                {!isHeartbeatAgent && agent.id === 'main' && (
                  <div className="agent-card__heartbeat" style={{ color: 'var(--text-dim)' }}>
                    <Heart size={12} />
                    <span>Heartbeat disabled</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  
  // Action states
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthHistory>({});
  const [restartingService, setRestartingService] = useState<string | null>(null);
  const [isDumping, setIsDumping] = useState(false);
  const [dumpResult, setDumpResult] = useState<string | null>(null);

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
        name: 'Voice Services',
        status: 'unknown',
        lastCheck: new Date(),
        details: 'Port 6060'
      },
      {
        name: 'MC File Server',
        status: 'unknown',
        lastCheck: new Date(),
        details: 'Port 3456'
      },
      {
        name: 'Automation Browser',
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
        if (data.agents) setAgents(data.agents);
        
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

  // Fetch service health history
  const fetchServiceHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/actions?action=service-health');
      if (res.ok) {
        const data = await res.json();
        setServiceHealth(data);
      }
    } catch (e) {
      console.error('Failed to fetch service health:', e);
    }
  }, []);
  
  // Trigger telegram dump
  const handleTelegramDump = useCallback(async () => {
    setIsDumping(true);
    setDumpResult(null);
    try {
      const res = await fetch('/api/actions?action=telegram-dump', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setDumpResult('✅ Dump complete');
        // Refresh telegram data
        fetchSystemStatus();
      } else {
        setDumpResult(`❌ ${data.error || 'Failed'}`);
      }
    } catch (e) {
      setDumpResult(`❌ ${e}`);
    } finally {
      setIsDumping(false);
      setTimeout(() => setDumpResult(null), 5000);
    }
  }, []);
  
  // Restart a service
  const handleRestartService = useCallback(async (serviceKey: string) => {
    setRestartingService(serviceKey);
    try {
      const res = await fetch('/api/actions?action=restart-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceKey }),
      });
      const data = await res.json();
      if (!data.ok) {
        console.error('Restart failed:', data.error);
      }
      // Wait a bit then refresh services
      setTimeout(() => {
        checkLiveServices();
        setRestartingService(null);
      }, 5000);
    } catch (e) {
      console.error('Restart error:', e);
      setRestartingService(null);
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
        await Promise.all([checkLiveServices(), fetchSystemStatus(), fetchServiceHealth()]);
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
      fetchServiceHealth();
      setLastRefresh(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [generateSampleData, checkLiveServices, fetchSystemStatus, fetchServiceHealth]);

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([checkLiveServices(), fetchSystemStatus(), fetchServiceHealth()]).then(() => {
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
        {/* Agents Overview */}
        {agents.length > 0 && <AgentsCard agents={agents} />}

        {/* Services */}
        <div className="system-status__card system-status__card--services">
          <div className="system-status__card-header">
            <Cpu size={18} style={{ color: 'var(--sky)' }} />
            <h2>Services</h2>
          </div>
          <div className="services-list">
            {services.map(service => {
              const healthKeyMap: Record<string, string> = {
                'Clawdbot Gateway': 'gateway',
                'Voice Services': 'voice',
                'MC File Server': 'file-server',
                'Automation Browser': 'browser',
              };
              const healthKey = healthKeyMap[service.name];
              return (
                <ServiceCard 
                  key={service.name} 
                  service={service} 
                  healthHistory={healthKey ? serviceHealth[healthKey] : undefined}
                  onRestart={handleRestartService}
                  isRestarting={restartingService === healthKeyMap[service.name]}
                  voiceMetrics={service.name === 'Voice Services' ? voiceMetrics : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Heartbeat Health */}
        {heartbeatHealth && <HeartbeatHealthCard data={heartbeatHealth} />}

        {/* Context Usage (Compaction Countdown) */}
        {contextUsage && <ContextUsageCard data={contextUsage} />}

        {/* Memory System (Flow Diagram) */}
        {memorySystem && <MemorySystemCard data={memorySystem} />}

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

        {/* Telegram Dumps */}
        {telegramDumps && (
          <div style={{ gridColumn: 'span 4' }}>
            <TelegramDumpsCard data={telegramDumps} onTriggerDump={handleTelegramDump} isDumping={isDumping} />
            {dumpResult && (
              <div style={{ 
                padding: '6px 12px', 
                marginTop: '4px',
                borderRadius: '6px',
                fontSize: '12px',
                background: dumpResult.startsWith('✅') ? 'var(--emerald-dim)' : 'var(--red-dim)',
                color: dumpResult.startsWith('✅') ? 'var(--emerald)' : 'var(--red)',
              }}>
                {dumpResult}
              </div>
            )}
          </div>
        )}

        {/* Sub-Agent Timeline */}
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
              <span>Peak Concurrency: ✗</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
