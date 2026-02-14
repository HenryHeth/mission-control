'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ComposedChart, BarChart, AreaChart, PieChart,
  Bar, Area, Line, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Zap, CheckCircle2, TrendingUp, Clock, ListChecks,
  BarChart3, FolderOpen, RefreshCw, AlertCircle, Calendar,
  Target, Gauge, CalendarDays
} from 'lucide-react';
import { format, subDays, formatDistanceToNow } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   Mission Control — Tasks Tab v2.0
   LIVE: Velocity, Recent Closes, Due Today
   HISTORIC: Yearly trends, 6 visualizations, 9 years
   ═══════════════════════════════════════════════════════ */

const LIVE_API_URL = '';

const COLORS = ['#10B981', '#38BDF8', '#FBBF24', '#F87171', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const PRIORITY_COLORS: Record<string, string> = {
  '3': '#F87171', // High - red
  '2': '#FBBF24', // Med - amber
  '1': '#38BDF8', // Low - sky
  '0': '#64748B', // None - slate
};
const PRIORITY_LABELS: Record<string, string> = {
  '3': 'High',
  '2': 'Medium',
  '1': 'Low',
  '0': 'None',
};
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Task {
  id: number;
  title: string;
  folder: string;
  folderId?: number;
  completed: number;
  added: number;
  modified?: number;
  priority: number;
  duedate?: number;
  tag?: string;
  repeat?: string;
}

interface TaskData {
  completed: Task[];
  open: Task[];
  totalOpen: number;
  totalCompleted: number;
  generatedAt: string;
  folders?: { id: number; name: string }[];
}

interface HistoricData {
  year: number;
  totalCompleted: number;
  monthlyBreakdown: { month: number; count: number; avgDaysToClose: number }[];
  priorityBreakdown: Record<string, number>;
  folderBreakdown: { name: string; count: number }[];
  dayOfWeekBreakdown: number[];
  yearlyTotals: { year: number; count: number; monthly: number[] }[];
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
  'Build Mission Control v1.5', 'Review sprint planning docs', 'Research VVO frameworks',
  'Morning briefing automation', 'Update MEMORY.md', 'Toodledo API integration',
  'Deploy to Vercel', 'Fix authentication flow', 'Create task velocity chart',
  'Implement dark theme', 'Add bar charts to dashboard', 'Review Anthropic usage',
  'Schedule weekly standup', 'Update TOOLS.md', 'Research Home Assistant',
  'Configure RescueTime API', 'Build captures viewer', 'Test voice calling',
  'Review calendar sync', 'Optimize API costs', 'Write documentation',
  'Fix mobile layout', 'Add search functionality', 'Create memory browser',
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
          <span className="chart-tooltip__value">{typeof entry.value === 'number' ? (Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(1)) : entry.value}</span>
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

/* ═══════════════════════════════════════════════════════
   Mini Sparkline — pure SVG, no library needed
   ═══════════════════════════════════════════════════════ */
function MiniSparkline({ data, width = 60, height = 20, color = '#10B981' }: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   Custom Pie Chart Label
   ═══════════════════════════════════════════════════════ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!percent || percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function TasksTab() {
  const [data, setData] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'sample'>('sample');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [includeSomeday, setIncludeSomeday] = useState(false);
  const [excludeRecurringLive, setExcludeRecurringLive] = useState(true);

  // Historic data from dedicated API
  const [historicData, setHistoricData] = useState<HistoricData | null>(null);
  const [historicLoading, setHistoricLoading] = useState(false);
  const [excludeRecurring, setExcludeRecurring] = useState(true);

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

  // Fetch historic data when year or recurring filter changes
  const fetchHistoric = useCallback(async (year: number, inclRecurring: boolean) => {
    setHistoricLoading(true);
    try {
      const res = await fetch(
        `${LIVE_API_URL}/api/tasks/historic?year=${year}&includeRecurring=${inclRecurring}`
      );
      if (res.ok) {
        const d = await res.json();
        setHistoricData(d);
      }
    } catch (err) {
      console.error('Historic fetch failed:', err);
    } finally {
      setHistoricLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistoric(selectedYear, !excludeRecurring);
  }, [selectedYear, excludeRecurring, fetchHistoric]);

  /* ═══════════════════════════════════════════════════════
     TASK FILTERING: exclude obsolete (always), someday (toggle), recurring (toggle)
     ═══════════════════════════════════════════════════════ */
  const filteredData = useMemo(() => {
    if (!data) return null;

    const shouldExclude = (t: Task): boolean => {
      const tag = t.tag;
      if (tag) {
        const lower = tag.toLowerCase();
        if (lower.includes('obsolete')) return true;
        if (!includeSomeday && lower.includes('someday')) return true;
      }
      // Exclude recurring in live section if toggle is on
      if (excludeRecurringLive && t.repeat && t.repeat !== '' && t.repeat !== 'None') return true;
      return false;
    };

    const completed = data.completed.filter(t => !shouldExclude(t));
    const open = data.open.filter(t => !shouldExclude(t));

    return {
      ...data,
      completed,
      open,
      totalOpen: open.length,
      totalCompleted: completed.length,
    };
  }, [data, includeSomeday, excludeRecurringLive]);

  /* ═══════════════════════════════════════════════════════
     LIVE DATA COMPUTATIONS
     ═══════════════════════════════════════════════════════ */
  const velocityData = useMemo(() => {
    if (!filteredData) return [];
    const now = new Date();
    const days: { date: string; label: string; count: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = filteredData.completed.filter(t => {
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
  }, [filteredData]);

  const recentCloses = useMemo(() => {
    if (!filteredData) return [];
    return [...filteredData.completed]
      .sort((a, b) => (b.modified || b.completed) - (a.modified || a.completed))
      .slice(0, 15);
  }, [filteredData]);

  const newVsRetired = useMemo(() => {
    if (!filteredData) return [];
    const now = new Date();
    const allTasks = [...filteredData.completed, ...filteredData.open];
    const weeks = [];

    for (let i = 7; i >= 0; i--) {
      const weekEnd = subDays(now, i * 7);
      const weekStart = subDays(weekEnd, 7);
      const startTs = Math.floor(weekStart.getTime() / 1000);
      const endTs = Math.floor(weekEnd.getTime() / 1000);

      const created = allTasks.filter(t => t.added >= startTs && t.added < endTs).length;
      const retired = filteredData.completed.filter(t => t.completed >= startTs && t.completed < endTs).length;

      weeks.push({ week: format(weekEnd, 'MMM d'), created, retired });
    }
    return weeks;
  }, [filteredData]);

  const backlogData = useMemo(() => {
    if (!filteredData) return [];
    const now = new Date();
    const allTasks = [...filteredData.completed, ...filteredData.open];
    const sixtyDaysAgoTs = Math.floor(Date.now() / 1000) - 60 * 86400;

    const createdInPeriod = allTasks.filter(t => t.added >= sixtyDaysAgoTs).length;
    const completedInPeriod = filteredData.completed.length;
    let runningOpen = filteredData.totalOpen - createdInPeriod + completedInPeriod;

    const points = [];
    for (let i = 59; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayStartTs = Math.floor(new Date(dayStr + 'T00:00:00').getTime() / 1000);
      const dayEndTs = dayStartTs + 86400;

      const createdToday = allTasks.filter(t => t.added >= dayStartTs && t.added < dayEndTs).length;
      const completedToday = filteredData.completed.filter(t => t.completed >= dayStartTs && t.completed < dayEndTs).length;

      runningOpen += createdToday - completedToday;
      points.push({ date: dayStr, label: format(day, 'M/d'), count: Math.max(0, runningOpen) });
    }
    return points;
  }, [filteredData]);

  const stats = useMemo(() => {
    if (!filteredData) return { open: 0, closedWeek: 0, avgPerDay: '0', overdue: 0, dueToday: 0 };
    const nowTs = Math.floor(Date.now() / 1000);
    const weekAgoTs = nowTs - 7 * 86400;
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const todayEnd = todayStart + 86400;
    
    const closedThisWeek = filteredData.completed.filter(t => t.completed >= weekAgoTs).length;
    const daysInData = 60;
    const avgPerDay = (filteredData.totalCompleted / daysInData).toFixed(1);
    const overdue = filteredData.open.filter(t => t.duedate && t.duedate < nowTs).length;
    const dueToday = filteredData.open.filter(t => t.duedate && t.duedate >= todayStart && t.duedate < todayEnd).length;

    return { open: filteredData.totalOpen, closedWeek: closedThisWeek, avgPerDay, overdue, dueToday };
  }, [filteredData]);

  /* ═══════════════════════════════════════════════════════
     HISTORIC DATA COMPUTATIONS (from API)
     ═══════════════════════════════════════════════════════ */
  const monthlyChartData = useMemo(() => {
    if (!historicData) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return historicData.monthlyBreakdown.map((m, i) => ({
      name: months[i],
      count: m.count,
      avgDays: m.avgDaysToClose,
    }));
  }, [historicData]);

  const folderDonutData = useMemo(() => {
    if (!historicData) return [];
    return historicData.folderBreakdown.map((f, i) => ({
      name: f.name,
      value: f.count,
      color: COLORS[i % COLORS.length],
    }));
  }, [historicData]);

  const priorityDonutData = useMemo(() => {
    if (!historicData) return [];
    return Object.entries(historicData.priorityBreakdown)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        name: PRIORITY_LABELS[key] || 'Unknown',
        value: count,
        color: PRIORITY_COLORS[key] || '#64748B',
      }))
      .sort((a, b) => b.value - a.value);
  }, [historicData]);

  const dayOfWeekData = useMemo(() => {
    if (!historicData) return [];
    return historicData.dayOfWeekBreakdown
      .map((count, i) => ({ day: DOW_LABELS[i], count }))
      .sort((a, b) => b.count - a.count);
  }, [historicData]);

  const completionSpeedData = useMemo(() => {
    if (!historicData) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return historicData.monthlyBreakdown
      .filter(m => m.count > 0)
      .map((m, i) => ({
        name: months[m.month - 1],
        avgDays: m.avgDaysToClose,
        color: m.avgDaysToClose <= 7 ? '#10B981' : m.avgDaysToClose <= 30 ? '#FBBF24' : '#F87171',
      }));
  }, [historicData]);

  const yearlyStats = useMemo(() => {
    if (!historicData) return { total: 0, avgDaily: '0' };
    const daysInYear = selectedYear === new Date().getFullYear()
      ? Math.floor((Date.now() - new Date(selectedYear, 0, 1).getTime()) / 86400000) || 1
      : 365;
    return {
      total: historicData.totalCompleted,
      avgDaily: (historicData.totalCompleted / daysInYear).toFixed(1),
    };
  }, [historicData, selectedYear]);

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

  if (!data || !filteredData) {
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
          <label className="someday-toggle" style={{
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, userSelect: 'none',
          }}>
            <input type="checkbox" checked={includeSomeday} onChange={(e) => setIncludeSomeday(e.target.checked)}
              style={{ accentColor: 'var(--emerald)', width: '16px', height: '16px', cursor: 'pointer' }} />
            Include Someday
          </label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, userSelect: 'none',
          }}>
            <input type="checkbox" checked={excludeRecurringLive} onChange={(e) => setExcludeRecurringLive(e.target.checked)}
              style={{ accentColor: 'var(--amber)', width: '16px', height: '16px', cursor: 'pointer' }} />
            Exclude Recurring
          </label>
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
        <StatPill icon={<FolderOpen size={18} />} value={stats.open} label="Open Tasks" color="var(--amber)" bgColor="var(--amber-dim)" />
        <StatPill icon={<CheckCircle2 size={18} />} value={stats.closedWeek} label="Closed (7d)" color="var(--emerald)" bgColor="var(--emerald-dim)" />
        <StatPill icon={<TrendingUp size={18} />} value={stats.avgPerDay} label="Per Day (avg)" color="var(--sky)" bgColor="var(--sky-dim)" />
        {stats.dueToday > 0 && <StatPill icon={<Clock size={18} />} value={stats.dueToday} label="Due Today" color="var(--amber)" bgColor="var(--amber-dim)" />}
        {stats.overdue > 0 && <StatPill icon={<AlertCircle size={18} />} value={stats.overdue} label="Overdue" color="var(--red)" bgColor="var(--red-dim)" />}
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
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" fill="var(--emerald)" radius={[4, 4, 0, 0]} name="Completed" maxBarSize={18} />
                <Line type="monotone" dataKey="avg" stroke="var(--amber)" strokeWidth={2.5} dot={false} name="7-day avg" />
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
                    {formatDistanceToNow(new Date((task.modified || task.completed) * 1000), { addSuffix: true })}
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
                <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 8 }} formatter={(value) => <span style={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.72rem' }}>{value}</span>} />
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
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} interval={9} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="count" stroke="var(--amber)" strokeWidth={2.5} fill="url(#backlogGrad)" name="Open Tasks" />
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
         HISTORIC: Yearly Sparkline Row
         ═══════════════════════════════════════════════════════ */}
      {historicData && historicData.yearlyTotals.length > 0 && (
        <div className="sparkline-row">
          {historicData.yearlyTotals.map(yt => (
            <button
              key={yt.year}
              className={`sparkline-pill ${selectedYear === yt.year ? 'sparkline-pill--active' : ''}`}
              onClick={() => setSelectedYear(yt.year)}
            >
              <span className="sparkline-pill__year">{yt.year}</span>
              <span className="sparkline-pill__count">{yt.count.toLocaleString()}</span>
              <MiniSparkline
                data={yt.monthly}
                width={48}
                height={16}
                color={selectedYear === yt.year ? '#10B981' : '#64748B'}
              />
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
         HISTORIC: Header with stats + recurring toggle
         ═══════════════════════════════════════════════════════ */}
      <div className="historic-header">
        <div className="historic-stats">
          <div className="historic-stat">
            <span className="historic-stat__value">{yearlyStats.total.toLocaleString()}</span>
            <span className="historic-stat__label">Total Completed</span>
          </div>
          <div className="historic-stat">
            <span className="historic-stat__value">{yearlyStats.avgDaily}</span>
            <span className="historic-stat__label">Avg Per Day</span>
          </div>
          <div className="historic-stat">
            <span className="historic-stat__value">{historicData?.folderBreakdown.length || 0}</span>
            <span className="historic-stat__label">Active Folders</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, userSelect: 'none',
          }}>
            <input type="checkbox" checked={excludeRecurring} onChange={(e) => setExcludeRecurring(e.target.checked)}
              style={{ accentColor: 'var(--amber)', width: '16px', height: '16px', cursor: 'pointer' }} />
            Exclude Recurring
          </label>
          {historicLoading && (
            <RefreshCw size={16} style={{ color: '#64748B', animation: 'spin 1s linear infinite' }} />
          )}
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
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="productivityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="count" stroke="var(--emerald)" strokeWidth={2.5} fill="url(#productivityGrad)" name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Folder Breakdown — Donut Pie Chart */}
        <div className="bento-card bento-card--folders">
          <div className="bento-card__header">
            <FolderOpen size={20} style={{ color: 'var(--sky)' }} />
            <h2>Folder Breakdown</h2>
            <span className="bento-card__subtitle">{selectedYear}</span>
          </div>
          <div className="bento-card__chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {folderDonutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={folderDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {folderDonutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: '#CBD5E1', fontSize: '0.75rem', fontWeight: 600 }}>{value}</span>}
                  />
                  {/* Center text */}
                  <text x="50%" y="46%" textAnchor="middle" fill="#E2E8F0" fontSize={22} fontWeight={800}>
                    {yearlyStats.total.toLocaleString()}
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" fill="#64748B" fontSize={11} fontWeight={600}>
                    tasks
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No data</p>
            )}
          </div>
        </div>

        {/* Completion Speed — Bar Chart */}
        <div className="bento-card bento-card--speed">
          <div className="bento-card__header">
            <Gauge size={20} style={{ color: 'var(--amber)' }} />
            <h2>Completion Speed</h2>
            <span className="bento-card__subtitle">Avg days to close · {selectedYear}</span>
          </div>
          <div className="bento-card__chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={completionSpeedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }} axisLine={false} tickLine={false} allowDecimals={false} label={{ value: 'days', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 11 }} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="avgDays" name="Avg Days" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {completionSpeedData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown — Donut */}
        <div className="bento-card bento-card--priority">
          <div className="bento-card__header">
            <Target size={20} style={{ color: '#F87171' }} />
            <h2>Priority Breakdown</h2>
            <span className="bento-card__subtitle">{selectedYear}</span>
          </div>
          <div className="bento-card__chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {priorityDonutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={priorityDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {priorityDonutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: '#CBD5E1', fontSize: '0.75rem', fontWeight: 600 }}>{value}</span>}
                  />
                  {/* Center: most common priority */}
                  <text x="50%" y="46%" textAnchor="middle" fill="#E2E8F0" fontSize={16} fontWeight={800}>
                    {priorityDonutData[0]?.name || ''}
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" fill="#64748B" fontSize={11} fontWeight={600}>
                    most common
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No data</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         Day-of-Week — Full width horizontal bars
         ═══════════════════════════════════════════════════════ */}
      <div className="bento-card" style={{ marginTop: '16px' }}>
        <div className="bento-card__header">
          <CalendarDays size={20} style={{ color: 'var(--sky)' }} />
          <h2>Day of Week</h2>
          <span className="bento-card__subtitle">Tasks completed by day · {selectedYear}</span>
        </div>
        <div style={{ padding: '16px 20px 12px' }}>
          {dayOfWeekData.map((d, i) => {
            const maxCount = dayOfWeekData[0]?.count || 1;
            const pct = (d.count / maxCount) * 100;
            return (
              <div key={d.day} style={{
                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < dayOfWeekData.length - 1 ? '8px' : 0,
              }}>
                <span style={{ width: '36px', textAlign: 'right', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Atkinson Hyperlegible' }}>
                  {d.day}
                </span>
                <div style={{ flex: 1, height: '24px', borderRadius: '4px', background: 'rgba(148,163,184,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: '4px',
                    background: `linear-gradient(90deg, #38BDF8, #10B981)`,
                    transition: 'width 0.6s ease',
                    minWidth: d.count > 0 ? '4px' : '0',
                  }} />
                </div>
                <span style={{ width: '48px', textAlign: 'right', color: '#E2E8F0', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Atkinson Hyperlegible' }}>
                  {d.count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
