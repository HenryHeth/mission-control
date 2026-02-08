'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, BarChart, AreaChart, PieChart,
  Bar, Area, Line, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Zap, CheckCircle2, TrendingUp, Clock, ListChecks,
  BarChart3, FolderOpen, RefreshCw, AlertCircle, Calendar
} from 'lucide-react';
import { format, subDays, formatDistanceToNow, startOfYear, endOfYear, isWithinInterval, fromUnixTime } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   Mission Control — Tasks Tab v1.5
   LIVE: Velocity, Recent Closes, Due Today
   HISTORIC: Yearly trends, Folder breakdown, Productivity
   ═══════════════════════════════════════════════════════ */

// Use local API route - no external dependency needed
const LIVE_API_URL = '';

const COLORS = ['#10B981', '#38BDF8', '#FBBF24', '#F87171', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface Task {
  id: number;
  title: string;
  folder: string;
  folderId?: number;
  completed: number;
  added: number;
  priority: number;
  duedate?: number;
}

interface TaskData {
  completed: Task[];
  open: Task[];
  totalOpen: number;
  totalCompleted: number;
  generatedAt: string;
  folders?: { id: number; name: string }[];
}

// Sample data for demo
function generateSampleData(): TaskData {
  const now = Math.floor(Date.now() / 1000);
  const completed: Task[] = [];
  const open: Task[] = [];
  
  const folders = [
    { id: 1, name: 'pWorkflow' },
    { id: 2, name: 'pHome' },
    { id: 3, name: 'pFinancial' },
    { id: 4, name: 'pPhysical' },
    { id: 5, name: 'Inbox' },
  ];
  
  // Generate 365 days of completed tasks for yearly view
  for (let i = 0; i < 500; i++) {
    const daysAgo = Math.floor(Math.random() * 365);
    const completedTs = now - daysAgo * 86400 - Math.floor(Math.random() * 43200);
    const addedTs = completedTs - Math.floor(Math.random() * 7 * 86400);
    const folder = folders[Math.floor(Math.random() * folders.length)];
    
    completed.push({
      id: i + 1,
      title: SAMPLE_TASK_TITLES[i % SAMPLE_TASK_TITLES.length],
      folder: folder.name,
      folderId: folder.id,
      completed: completedTs,
      added: addedTs,
      priority: Math.floor(Math.random() * 3) + 1,
    });
  }
  
  // Generate open tasks
  for (let i = 0; i < 45; i++) {
    const addedDaysAgo = Math.floor(Math.random() * 30);
    const addedTs = now - addedDaysAgo * 86400;
    const folder = folders[Math.floor(Math.random() * folders.length)];
    
    open.push({
      id: 1000 + i,
      title: SAMPLE_TASK_TITLES[(i + 50) % SAMPLE_TASK_TITLES.length],
      folder: folder.name,
      folderId: folder.id,
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
    folders,
  };
}

const SAMPLE_TASK_TITLES = [
  'Build Mission Control v1.5',
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
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
      
      setData(generateSampleData());
      setDataSource('sample');
      setLoading(false);
    };
    
    fetchData();
  }, []);

  /* ═══════════════════════════════════════════════════════
     LIVE DATA COMPUTATIONS
     ═══════════════════════════════════════════════════════ */

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

    return days.map((d, i) => {
      const start = Math.max(0, i - 6);
      const windowSlice = days.slice(start, i + 1);
      const avg = windowSlice.reduce((sum, p) => sum + p.count, 0) / windowSlice.length;
      return { ...d, avg: Math.round(avg * 10) / 10 };
    });
  }, [data]);

  /* ── Recent Closes: last 15 completed tasks ── */
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
        week: format(weekEnd, 'MMM d'),
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

  /* ═══════════════════════════════════════════════════════
     HISTORIC DATA COMPUTATIONS (Year-based)
     ═══════════════════════════════════════════════════════ */

  /* ── Filter tasks by selected year ── */
  const yearlyTasks = useMemo(() => {
    if (!data) return [];
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 0, 1));
    return data.completed.filter(t => {
      if (t.completed > 0) {
        return isWithinInterval(fromUnixTime(t.completed), { start, end });
      }
      return false;
    });
  }, [data, selectedYear]);

  /* ── Folder breakdown ── */
  const folderData = useMemo(() => {
    if (!yearlyTasks.length) return [];
    const folderCounts: Record<string, number> = {};
    yearlyTasks.forEach(t => {
      const folder = t.folder || 'Unfiled';
      folderCounts[folder] = (folderCounts[folder] || 0) + 1;
    });
    return Object.entries(folderCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [yearlyTasks]);

  /* ── Monthly productivity trend ── */
  const monthlyData = useMemo(() => {
    if (!yearlyTasks.length) return [];
    const monthCounts: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize all months
    months.forEach(m => { monthCounts[m] = 0; });
    
    yearlyTasks.forEach(t => {
      const month = format(fromUnixTime(t.completed), 'MMM');
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    return months.map(name => ({ name, count: monthCounts[name] || 0 }));
  }, [yearlyTasks]);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    if (!data) return { open: 0, closedWeek: 0, avgPerDay: '0', overdue: 0, dueToday: 0 };
    const nowTs = Math.floor(Date.now() / 1000);
    const weekAgoTs = nowTs - 7 * 86400;
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const todayEnd = todayStart + 86400;
    
    const closedThisWeek = data.completed.filter(t => t.completed >= weekAgoTs).length;
    const daysInData = 60;
    const avgPerDay = (data.totalCompleted / daysInData).toFixed(1);
    const overdue = data.open.filter(t => t.duedate && t.duedate < nowTs).length;
    const dueToday = data.open.filter(t => t.duedate && t.duedate >= todayStart && t.duedate < todayEnd).length;

    return {
      open: data.totalOpen,
      closedWeek: closedThisWeek,
      avgPerDay,
      overdue,
      dueToday,
    };
  }, [data]);

  /* ── Yearly stats ── */
  const yearlyStats = useMemo(() => {
    const total = yearlyTasks.length;
    const avgDaily = (total / 365).toFixed(1);
    return { total, avgDaily, folders: folderData.length };
  }, [yearlyTasks, folderData]);

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
      {/* ═══════════════════════════════════════════════════════
         HEADER
         ═══════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════
         LIVE SECTION: Stats Bar
         ═══════════════════════════════════════════════════════ */}
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
        {stats.dueToday > 0 && (
          <StatPill
            icon={<Clock size={18} />}
            value={stats.dueToday}
            label="Due Today"
            color="var(--amber)"
            bgColor="var(--amber-dim)"
          />
        )}
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

      {/* ═══════════════════════════════════════════════════════
         LIVE SECTION: Bento Grid
         ═══════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════
         HISTORIC SECTION DIVIDER
         ═══════════════════════════════════════════════════════ */}
      <div className="section-divider">
        <div className="section-divider__line" />
        <span className="section-divider__text">
          <Calendar size={14} style={{ marginRight: 6 }} />
          Historic Trends
        </span>
        <div className="section-divider__line" />
      </div>

      {/* ═══════════════════════════════════════════════════════
         HISTORIC SECTION: Year Selector & Stats
         ═══════════════════════════════════════════════════════ */}
      <div className="historic-header">
        <div className="historic-stats">
          <div className="historic-stat">
            <span className="historic-stat__value">{yearlyStats.total}</span>
            <span className="historic-stat__label">Total Completed</span>
          </div>
          <div className="historic-stat">
            <span className="historic-stat__value">{yearlyStats.avgDaily}</span>
            <span className="historic-stat__label">Avg Per Day</span>
          </div>
          <div className="historic-stat">
            <span className="historic-stat__value">{yearlyStats.folders}</span>
            <span className="historic-stat__label">Active Folders</span>
          </div>
        </div>
        <div className="year-selector">
          {[2026, 2025, 2024].map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`year-btn ${selectedYear === y ? 'year-btn--active' : ''}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         HISTORIC SECTION: Charts
         ═══════════════════════════════════════════════════════ */}
      <div className="bento-grid">
        {/* Productivity Trend (Monthly) */}
        <div className="bento-card bento-card--productivity">
          <div className="bento-card__header">
            <TrendingUp size={20} style={{ color: 'var(--emerald)' }} />
            <h2>Productivity Trend</h2>
            <span className="bento-card__subtitle">{selectedYear} · Monthly</span>
          </div>
          <div className="bento-card__chart">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="productivityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<DarkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--emerald)"
                  strokeWidth={2.5}
                  fill="url(#productivityGrad)"
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Folder Breakdown */}
        <div className="bento-card bento-card--folders">
          <div className="bento-card__header">
            <FolderOpen size={20} style={{ color: 'var(--sky)' }} />
            <h2>Folder Breakdown</h2>
            <span className="bento-card__subtitle">{selectedYear}</span>
          </div>
          <div className="folder-list">
            {folderData.map((folder, i) => {
              const percent = yearlyStats.total > 0 ? ((folder.count / yearlyStats.total) * 100).toFixed(0) : 0;
              return (
                <div key={folder.name} className="folder-item">
                  <div className="folder-item__icon" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                    {folder.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="folder-item__info">
                    <span className="folder-item__name">{folder.name}</span>
                    <span className="folder-item__count">{folder.count} tasks</span>
                  </div>
                  <div className="folder-item__bar">
                    <div 
                      className="folder-item__fill"
                      style={{ 
                        width: `${percent}%`,
                        backgroundColor: COLORS[i % COLORS.length]
                      }}
                    />
                  </div>
                  <span className="folder-item__percent">{percent}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
