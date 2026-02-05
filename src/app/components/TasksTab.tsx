'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, BarChart, AreaChart,
  Bar, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Zap, CheckCircle2, TrendingUp, Clock, ListChecks,
  BarChart3, FolderOpen, RefreshCw, AlertCircle
} from 'lucide-react';
import { format, subDays, formatDistanceToNow } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   Mission Control — Tasks Tab
   Velocity, Recent Closes, New vs Retired, Backlog Trend
   ═══════════════════════════════════════════════════════ */

const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:3456';

interface Task {
  id: number;
  title: string;
  folder: string;
  completed: number; // Unix timestamp (0 if not completed)
  added: number; // Unix timestamp
  priority: number;
  duedate?: number;
}

interface TaskData {
  completed: Task[];
  open: Task[];
  totalOpen: number;
  totalCompleted: number;
  generatedAt: string;
}

// Sample data for demo (will be replaced by API)
function generateSampleData(): TaskData {
  const now = Math.floor(Date.now() / 1000);
  const completed: Task[] = [];
  const open: Task[] = [];
  
  // Generate 60 days of completed tasks
  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const completedTs = now - daysAgo * 86400 - Math.floor(Math.random() * 43200);
    const addedTs = completedTs - Math.floor(Math.random() * 7 * 86400);
    
    completed.push({
      id: i + 1,
      title: SAMPLE_TASK_TITLES[i % SAMPLE_TASK_TITLES.length],
      folder: SAMPLE_FOLDERS[Math.floor(Math.random() * SAMPLE_FOLDERS.length)],
      completed: completedTs,
      added: addedTs,
      priority: Math.floor(Math.random() * 3) + 1,
    });
  }
  
  // Generate open tasks
  for (let i = 0; i < 45; i++) {
    const addedDaysAgo = Math.floor(Math.random() * 30);
    const addedTs = now - addedDaysAgo * 86400;
    
    open.push({
      id: 1000 + i,
      title: SAMPLE_TASK_TITLES[(i + 50) % SAMPLE_TASK_TITLES.length],
      folder: SAMPLE_FOLDERS[Math.floor(Math.random() * SAMPLE_FOLDERS.length)],
      completed: 0,
      added: addedTs,
      priority: Math.floor(Math.random() * 3) + 1,
      duedate: Math.random() > 0.5 ? now + Math.floor(Math.random() * 7 * 86400) : undefined,
    });
  }
  
  return {
    completed: completed.sort((a, b) => b.completed - a.completed),
    open,
    totalOpen: open.length,
    totalCompleted: completed.length,
    generatedAt: new Date().toISOString(),
  };
}

const SAMPLE_TASK_TITLES = [
  'Build Mission Control v1',
  'Review sprint planning docs',
  'Research VVO frameworks',
  'Morning briefing automation',
  'Update MEMORY.md',
  'Toodledo API integration',
  'Deploy to Vercel',
  'Fix authentication flow',
  'Create task velocity chart',
  'Implement dark theme',
  'Add bar charts to dashboard',
  'Review Anthropic usage',
  'Schedule weekly standup',
  'Update TOOLS.md',
  'Research Home Assistant',
  'Configure RescueTime API',
  'Build captures viewer',
  'Test voice calling',
  'Review calendar sync',
  'Optimize API costs',
  'Write documentation',
  'Fix mobile layout',
  'Add search functionality',
  'Create memory browser',
  'Design system status page',
];

const SAMPLE_FOLDERS = ['pWorkflow', 'pHome', 'pFinancial', 'pPhysical', 'Inbox'];

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="chart-tooltip__row">
          <div className="chart-tooltip__dot" style={{ background: entry.color }} />
          <span className="chart-tooltip__name">{entry.name}:</span>
          <span className="chart-tooltip__value">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatPill({ icon, value, label, color, bgColor }: { 
  icon: React.ReactNode; 
  value: number | string; 
  label: string; 
  color: string; 
  bgColor: string; 
}) {
  return (
    <div className="stat-pill">
      <div className="stat-pill__icon" style={{ background: bgColor, color }}>
        {icon}
      </div>
      <div>
        <div className="stat-pill__value" style={{ color }}>{value}</div>
        <div className="stat-pill__label">{label}</div>
      </div>
    </div>
  );
}

export default function TasksTab() {
  const [data, setData] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'sample'>('sample');

  useEffect(() => {
    // Try live API first
    const fetchData = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${LIVE_API_URL}/api/tasks`, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (res.ok) {
          const d = await res.json();
          if (d.completed && d.open) {
            setData(d);
            setDataSource('live');
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through to sample data
      }
      
      // Use sample data
      setData(generateSampleData());
      setDataSource('sample');
      setLoading(false);
    };
    
    fetchData();
  }, []);

  /* ── Task Velocity: daily completions + 7-day moving average ── */
  const velocityData = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const days: { date: string; label: string; count: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = data.completed.filter(t => {
        const completedDate = new Date(t.completed * 1000);
        return format(completedDate, 'yyyy-MM-dd') === dayStr;
      }).length;
      days.push({ date: dayStr, label: format(day, 'M/d'), count });
    }

    // 7-day moving average
    return days.map((d, i) => {
      const start = Math.max(0, i - 6);
      const windowSlice = days.slice(start, i + 1);
      const avg = windowSlice.reduce((sum, p) => sum + p.count, 0) / windowSlice.length;
      return { ...d, avg: Math.round(avg * 10) / 10 };
    });
  }, [data]);

  /* ── Recent Closes: last 20 completed tasks ── */
  const recentCloses = useMemo(() => {
    if (!data) return [];
    return [...data.completed]
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 15);
  }, [data]);

  /* ── New vs Retired: tasks created vs completed per week ── */
  const newVsRetired = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const allTasks = [...data.completed, ...data.open];
    const weeks = [];

    for (let i = 7; i >= 0; i--) {
      const weekEnd = subDays(now, i * 7);
      const weekStart = subDays(weekEnd, 7);
      const startTs = Math.floor(weekStart.getTime() / 1000);
      const endTs = Math.floor(weekEnd.getTime() / 1000);

      const created = allTasks.filter(t => t.added >= startTs && t.added < endTs).length;
      const retired = data.completed.filter(t => t.completed >= startTs && t.completed < endTs).length;

      weeks.push({
        week: format(weekStart, 'MMM d'),
        created,
        retired
      });
    }
    return weeks;
  }, [data]);

  /* ── Backlog Trend: estimated open count over last 60 days ── */
  const backlogData = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const allTasks = [...data.completed, ...data.open];
    const sixtyDaysAgoTs = Math.floor(Date.now() / 1000) - 60 * 86400;

    // Estimate starting open count (60 days ago)
    const createdInPeriod = allTasks.filter(t => t.added >= sixtyDaysAgoTs).length;
    const completedInPeriod = data.completed.length;
    let runningOpen = data.totalOpen - createdInPeriod + completedInPeriod;

    const points = [];
    for (let i = 59; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayStartTs = Math.floor(new Date(dayStr + 'T00:00:00').getTime() / 1000);
      const dayEndTs = dayStartTs + 86400;

      const createdToday = allTasks.filter(t => t.added >= dayStartTs && t.added < dayEndTs).length;
      const completedToday = data.completed.filter(t => t.completed >= dayStartTs && t.completed < dayEndTs).length;

      runningOpen += createdToday - completedToday;
      points.push({
        date: dayStr,
        label: format(day, 'M/d'),
        count: Math.max(0, runningOpen)
      });
    }
    return points;
  }, [data]);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    if (!data) return { open: 0, closedWeek: 0, avgPerDay: '0', overdue: 0 };
    const nowTs = Math.floor(Date.now() / 1000);
    const weekAgoTs = nowTs - 7 * 86400;
    const closedThisWeek = data.completed.filter(t => t.completed >= weekAgoTs).length;
    const daysInData = 60;
    const avgPerDay = (data.totalCompleted / daysInData).toFixed(1);
    const overdue = data.open.filter(t => t.duedate && t.duedate < nowTs).length;

    return {
      open: data.totalOpen,
      closedWeek: closedThisWeek,
      avgPerDay,
      overdue,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="tasks-dashboard">
        <div className="loading-screen">
          <Zap size={48} className="pulse" />
          <p>Loading task data…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="tasks-dashboard">
        <div className="loading-screen">
          <p style={{ color: 'var(--red)' }}>Failed to load data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-dashboard">
      {/* Header */}
      <div className="tasks-header">
        <div className="tasks-header__left">
          <CheckCircle2 size={24} style={{ color: 'var(--emerald)' }} />
          <h1>Task Metrics</h1>
        </div>
        <div className="tasks-header__right">
          <span className={`source-badge source-badge--${dataSource === 'live' ? 'live' : 'bundled'}`}>
            {dataSource === 'live' ? '🟢 Live' : '🟡 Sample Data'}
          </span>
          <span className="tasks-header__updated">
            <RefreshCw size={14} />
            {format(new Date(data.generatedAt), 'MMM d, h:mm a')}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <StatPill
          icon={<FolderOpen size={18} />}
          value={stats.open}
          label="Open Tasks"
          color="var(--amber)"
          bgColor="var(--amber-dim)"
        />
        <StatPill
          icon={<CheckCircle2 size={18} />}
          value={stats.closedWeek}
          label="Closed (7d)"
          color="var(--emerald)"
          bgColor="var(--emerald-dim)"
        />
        <StatPill
          icon={<TrendingUp size={18} />}
          value={stats.avgPerDay}
          label="Per Day (avg)"
          color="var(--sky)"
          bgColor="var(--sky-dim)"
        />
        {stats.overdue > 0 && (
          <StatPill
            icon={<AlertCircle size={18} />}
            value={stats.overdue}
            label="Overdue"
            color="var(--red)"
            bgColor="var(--red-dim)"
          />
        )}
      </div>

      {/* Bento Grid */}
      <div className="bento-grid">
        {/* Task Velocity */}
        <div className="bento-card bento-card--velocity">
          <div className="bento-card__header">
            <TrendingUp size={20} style={{ color: 'var(--emerald)' }} />
            <h2>Task Velocity</h2>
            <span className="bento-card__subtitle">Last 30 days · daily</span>
          </div>
          <div className="bento-card__chart">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={velocityData} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false} tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<DarkTooltip />} />
                <Bar
                  dataKey="count"
                  fill="var(--emerald)"
                  radius={[4, 4, 0, 0]}
                  name="Completed"
                  maxBarSize={18}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="var(--amber)"
                  strokeWidth={2.5}
                  dot={false}
                  name="7-day avg"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Closes */}
        <div className="bento-card bento-card--recent">
          <div className="bento-card__header">
            <ListChecks size={20} style={{ color: 'var(--emerald)' }} />
            <h2>Recent Closes</h2>
          </div>
          <div className="recent-list">
            {recentCloses.map(task => (
              <div key={task.id} className="recent-item">
                <CheckCircle2 size={14} style={{ color: 'var(--emerald)', flexShrink: 0, marginTop: 2 }} />
                <div className="recent-item__info">
                  <span className="recent-item__title">{task.title}</span>
                  <span className="recent-item__meta">
                    <span className="recent-item__folder">{task.folder}</span>
                    {formatDistanceToNow(new Date(task.completed * 1000), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New vs Retired */}
        <div className="bento-card bento-card--nvr">
          <div className="bento-card__header">
            <BarChart3 size={20} style={{ color: 'var(--sky)' }} />
            <h2>New vs Retired</h2>
            <span className="bento-card__subtitle">Weekly</span>
          </div>
          <div className="bento-card__chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={newVsRetired} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<DarkTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 8 }}
                  formatter={(value) => <span style={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.72rem' }}>{value}</span>}
                />
                <Bar dataKey="created" fill="var(--sky)" radius={[4, 4, 0, 0]} name="✦ Created" maxBarSize={24} />
                <Bar dataKey="retired" fill="var(--emerald)" radius={[4, 4, 0, 0]} name="✓ Completed" maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Backlog Trend */}
        <div className="bento-card bento-card--backlog">
          <div className="bento-card__header">
            <Clock size={20} style={{ color: 'var(--amber)' }} />
            <h2>Backlog Trend</h2>
            <span className="bento-card__subtitle">Last 60 days</span>
          </div>
          <div className="bento-card__chart">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={backlogData}>
                <defs>
                  <linearGradient id="backlogGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false} tickLine={false}
                  interval={9}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false} tickLine={false}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip content={<DarkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--amber)"
                  strokeWidth={2.5}
                  fill="url(#backlogGrad)"
                  name="Open Tasks"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
