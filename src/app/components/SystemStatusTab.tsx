'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Server, Phone, Clock, CheckCircle2, 
  XCircle, AlertTriangle, RefreshCw, Cpu, Zap,
  Calendar, Terminal, User, Timer, FileText
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInSeconds, differenceInMinutes, differenceInHours } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   Mission Control — System Status Tab v1.5
   Services, Voice server, Cron jobs, Sub-agent Timeline
   ═══════════════════════════════════════════════════════ */

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

type StatusType = 'online' | 'offline' | 'degraded' | 'unknown' | 'success' | 'failed' | 'pending' | 'running' | 'completed';

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
      <StatusBadge status={service.status} />
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

  const generateSampleData = useCallback(() => {
    // Sample services
    setServices([
      {
        name: 'Clawdbot Gateway',
        status: 'online',
        lastCheck: new Date(),
        details: 'Port 3001',
        url: 'http://localhost:3001'
      },
      {
        name: 'Voice Server',
        status: 'online',
        lastCheck: new Date(),
        details: 'Port 6060',
        url: 'http://localhost:6060'
      },
      {
        name: 'File Server',
        status: 'online',
        lastCheck: new Date(),
        details: 'Port 3456',
        url: 'http://localhost:3456'
      },
      {
        name: 'Browser Proxy',
        status: 'online',
        lastCheck: new Date(),
        details: 'Port 18800',
      }
    ]);

    // Voice metrics
    setVoiceMetrics({
      status: 'online',
      activeCalls: 0,
      totalCalls: 3,
      uptime: 7200 + Math.floor(Math.random() * 14400),
      lastError: Math.random() > 0.7 ? 'Connection timeout after 30s' : undefined,
      lastErrorTime: Math.random() > 0.7 ? new Date(Date.now() - 3600000) : undefined
    });

    // Sample cron jobs
    const now = new Date();
    setCronJobs([
      {
        name: 'Morning Briefing',
        schedule: '0 7 * * *',
        lastRun: new Date(now.getTime() - 12 * 3600000),
        nextRun: new Date(now.getTime() + 12 * 3600000),
        status: 'success',
        duration: 45
      },
      {
        name: 'Heartbeat Check',
        schedule: '*/30 * * * *',
        lastRun: new Date(now.getTime() - 15 * 60000),
        nextRun: new Date(now.getTime() + 15 * 60000),
        status: 'success',
        duration: 12
      },
      {
        name: 'Email Digest',
        schedule: '0 9,17 * * *',
        lastRun: new Date(now.getTime() - 8 * 3600000),
        nextRun: new Date(now.getTime() + 4 * 3600000),
        status: 'success',
        duration: 28
      }
    ]);

    // Sample sub-agents with realistic data
    setSubAgents([
      {
        id: 'overnight-mc-dashboard',
        label: 'overnight-mc-dashboard-merge',
        status: 'running',
        startTime: new Date(Date.now() - 180000), // 3 min ago
        task: 'Mission Control v1.5 dashboard merging',
        model: 'claude-opus-4-5',
        tokensUsed: 45000
      },
      {
        id: 'research-travel',
        label: 'research-travel-apis',
        status: 'completed',
        startTime: new Date(Date.now() - 2 * 3600000), // 2 hours ago
        endTime: new Date(Date.now() - 1.5 * 3600000),
        task: 'Research flight booking APIs for trip planning',
        model: 'claude-sonnet-4',
        tokensUsed: 28000
      },
      {
        id: 'calendar-sync',
        label: 'calendar-event-sync',
        status: 'completed',
        startTime: new Date(Date.now() - 4 * 3600000),
        endTime: new Date(Date.now() - 3.9 * 3600000),
        task: 'Sync Google Calendar events',
        model: 'gemini-2.5-flash-lite',
        tokensUsed: 3500
      },
      {
        id: 'email-draft',
        label: 'email-draft-writer',
        status: 'completed',
        startTime: new Date(Date.now() - 6 * 3600000),
        endTime: new Date(Date.now() - 5.8 * 3600000),
        task: 'Draft follow-up emails for meetings',
        model: 'claude-sonnet-4',
        tokensUsed: 12000
      },
      {
        id: 'doc-research',
        label: 'doc-research-agent',
        status: 'failed',
        startTime: new Date(Date.now() - 8 * 3600000),
        endTime: new Date(Date.now() - 7.9 * 3600000),
        task: 'Research legal documents (timeout)',
        model: 'claude-opus-4-5',
        tokensUsed: 5000
      }
    ]);

    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  const checkLiveServices = useCallback(async () => {
    const serviceChecks = [
      { name: 'Clawdbot Gateway', url: 'http://localhost:3001/health', details: 'Port 3001' },
      { name: 'Voice Server', url: 'http://localhost:6060/health', details: 'Port 6060' },
      { name: 'File Server', url: 'http://localhost:3456/health', details: 'Port 3456' },
    ];

    const results: ServiceStatus[] = [];

    for (const svc of serviceChecks) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(svc.url, { signal: controller.signal });
        clearTimeout(timeout);
        
        results.push({
          name: svc.name,
          status: res.ok ? 'online' : 'degraded',
          lastCheck: new Date(),
          details: svc.details
        });
      } catch {
        results.push({
          name: svc.name,
          status: 'offline',
          lastCheck: new Date(),
          details: svc.details
        });
      }
    }

    setServices(prev => {
      const browserProxy = prev.find(s => s.name === 'Browser Proxy');
      return browserProxy ? [...results, browserProxy] : results;
    });
  }, []);

  useEffect(() => {
    generateSampleData();
    checkLiveServices();
    
    const interval = setInterval(() => {
      checkLiveServices();
      setLastRefresh(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [generateSampleData, checkLiveServices]);

  const handleRefresh = () => {
    setLoading(true);
    checkLiveServices().then(() => {
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

        {/* Cron Jobs */}
        <div className="system-status__card system-status__card--cron">
          <div className="system-status__card-header">
            <Calendar size={18} style={{ color: 'var(--amber)' }} />
            <h2>Scheduled Jobs</h2>
          </div>
          <div className="cron-list">
            {cronJobs.map(job => (
              <CronJobRow key={job.name} job={job} />
            ))}
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
          
          {/* Timeline Table Header */}
          <div className="agent-timeline-header">
            <div className="agent-timeline-header__col agent-timeline-header__col--status">Status</div>
            <div className="agent-timeline-header__col agent-timeline-header__col--name">Agent Name</div>
            <div className="agent-timeline-header__col agent-timeline-header__col--task">Task</div>
            <div className="agent-timeline-header__col agent-timeline-header__col--time">Started</div>
            <div className="agent-timeline-header__col agent-timeline-header__col--duration">Duration</div>
          </div>
          
          {/* Timeline Rows */}
          <div className="agent-timeline-list">
            {subAgents.length === 0 ? (
              <div className="empty-state">No sub-agents active today</div>
            ) : (
              subAgents.map(agent => (
                <SubAgentTimelineRow key={agent.id} agent={agent} />
              ))
            )}
          </div>
          
          {/* Capacity Summary */}
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
