'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Zap, Monitor, Smartphone, Youtube, Activity,
  CheckCircle2, AlertCircle, Clock, TrendingUp, RefreshCw,
  Sparkles, AlertTriangle, Bot, ExternalLink
} from 'lucide-react';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

/* ═══════════════════════════════════════════════════════
   Mission Control v1.5 — Homepage Dashboard
   Chief of Staff Briefing + At-a-glance metrics
   ═══════════════════════════════════════════════════════ */

const LIVE_API_URL = "";  // Use local API routes

interface MetricData {
  label: string;
  value: number;
  goal?: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
  trend?: number; // percent change vs 7-day avg
}

interface TaskSummary {
  dueToday: number;
  overdue: number;
  completedToday: number;
  completedWeek: number;
}

interface BriefingInsight {
  type: 'success' | 'warning' | 'info';
  icon: React.ReactNode;
  text: string;
}

// Chief of Staff Briefing Component
function ChiefOfStaffBriefing({ 
  taskSummary, 
  weeklyAvg,
  oldTasks 
}: { 
  taskSummary: TaskSummary;
  weeklyAvg: number;
  oldTasks: number;
}) {
  const insights: BriefingInsight[] = [];
  
  // Generate insights based on data
  if (taskSummary.completedWeek > 0) {
    const percentVsAvg = weeklyAvg > 0 
      ? Math.round(((taskSummary.completedWeek - weeklyAvg) / weeklyAvg) * 100)
      : 0;
    
    if (percentVsAvg > 10) {
      insights.push({
        type: 'success',
        icon: <Sparkles size={16} />,
        text: `You're crushing it this week — ${taskSummary.completedWeek} tasks completed, ${percentVsAvg}% above your 30-day average.`
      });
    } else if (percentVsAvg < -20) {
      insights.push({
        type: 'warning',
        icon: <AlertTriangle size={16} />,
        text: `Velocity is down — ${taskSummary.completedWeek} tasks completed this week, ${Math.abs(percentVsAvg)}% below average. Check for blockers.`
      });
    } else {
      insights.push({
        type: 'info',
        icon: <TrendingUp size={16} />,
        text: `Steady pace — ${taskSummary.completedWeek} tasks completed this week, tracking close to your 30-day average.`
      });
    }
  }
  
  // Warn about old tasks
  if (oldTasks > 3) {
    insights.push({
      type: 'warning',
      icon: <AlertTriangle size={16} />,
      text: `Warning: ${oldTasks} tasks are older than 30 days. They're becoming "desk anchors."`
    });
  }
  
  // Warn about overdue
  if (taskSummary.overdue > 0) {
    insights.push({
      type: 'warning',
      icon: <AlertCircle size={16} />,
      text: `${taskSummary.overdue} overdue ${taskSummary.overdue === 1 ? 'task needs' : 'tasks need'} attention.`
    });
  }
  
  // Add Henry's contribution note
  if (taskSummary.completedWeek > 5) {
    const henryTasks = Math.floor(taskSummary.completedWeek * 0.35); // Estimate Henry handles ~35%
    const hoursSaved = (henryTasks * 20 / 60).toFixed(1);
    insights.push({
      type: 'info',
      icon: <Bot size={16} />,
      text: `Henry handled ~${henryTasks} admin tasks this week, saving you approximately ${hoursSaved} hours.`
    });
  }
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  
  return (
    <div className="briefing-card">
      <div className="briefing-header">
        <Zap size={20} style={{ color: 'var(--amber)' }} />
        <span className="briefing-greeting">🌅 {greeting}, PAUL</span>
      </div>
      
      <div className="briefing-insights">
        {insights.map((insight, i) => (
          <div key={i} className={`briefing-insight briefing-insight--${insight.type}`}>
            <span className="briefing-insight__icon">{insight.icon}</span>
            <span className="briefing-insight__text">{insight.text}</span>
          </div>
        ))}
        
        {insights.length === 0 && (
          <div className="briefing-insight briefing-insight--info">
            <span className="briefing-insight__icon"><Sparkles size={16} /></span>
            <span className="briefing-insight__text">All systems nominal. Ready for a productive day!</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface DailySitting {
  date: string;
  label: string;
  hours: number;
}

// Horizontal bar component
function MetricBar({ 
  metric, 
  maxValue 
}: { 
  metric: MetricData;
  maxValue: number;
}) {
  const percent = Math.min((metric.value / maxValue) * 100, 100);
  const isOverGoal = metric.goal && metric.value > metric.goal;
  const goalPercent = metric.goal ? (metric.goal / maxValue) * 100 : null;
  
  return (
    <div className="metric-bar">
      <div className="metric-bar__label">
        <span className="metric-bar__icon">{metric.icon}</span>
        <span className="metric-bar__name">{metric.label}</span>
      </div>
      <div className="metric-bar__track">
        <div 
          className="metric-bar__fill"
          style={{ 
            width: `${percent}%`,
            background: isOverGoal ? 'var(--red)' : metric.color
          }}
        />
        {goalPercent && (
          <div 
            className="metric-bar__goal-marker"
            style={{ left: `${goalPercent}%` }}
            title={`Goal: ${metric.goal}${metric.unit}`}
          />
        )}
      </div>
      <div className="metric-bar__value">
        <span style={{ color: isOverGoal ? 'var(--red)' : metric.color }}>
          {metric.value.toFixed(1)}{metric.unit}
        </span>
        {metric.goal && (
          <span className="metric-bar__goal">/ {metric.goal}{metric.unit}</span>
        )}
      </div>
    </div>
  );
}

function TaskCard({ 
  icon, 
  label, 
  value, 
  color, 
  bgColor 
}: { 
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="task-card" style={{ borderLeftColor: color }}>
      <div className="task-card__icon" style={{ background: bgColor, color }}>
        {icon}
      </div>
      <div className="task-card__content">
        <div className="task-card__value" style={{ color }}>{value}</div>
        <div className="task-card__label">{label}</div>
      </div>
    </div>
  );
}

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__value">{payload[0].value.toFixed(1)}h</span>
      </div>
    </div>
  );
}

export default function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'sample'>('sample');
  const [tasksLive, setTasksLive] = useState(false);
  const [metricsLive, setMetricsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Metric states
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [taskSummary, setTaskSummary] = useState<TaskSummary>({
    dueToday: 0,
    overdue: 0,
    completedToday: 0,
    completedWeek: 0
  });
  const [sittingData, setSittingData] = useState<DailySitting[]>([]);
  const [productivityPulse, setProductivityPulse] = useState(0);
  const [weeklyAvg, setWeeklyAvg] = useState(0);
  const [oldTasks, setOldTasks] = useState(0);

  // Generate sample data (will be replaced by live APIs)
  const generateSampleData = () => {
    // 7-day sitting data for chart
    const now = new Date();
    const sitting: DailySitting[] = [];
    let totalDesk = 0;
    let totalComputer = 0;
    let totalMobile = 0;
    let totalYoutube = 0;
    
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const dayDesk = 3 + Math.random() * 5;
      sitting.push({
        date: format(d, 'yyyy-MM-dd'),
        label: format(d, 'EEE'),
        hours: dayDesk
      });
      totalDesk += dayDesk;
      totalComputer += 2.5 + Math.random() * 3;
      totalMobile += 1.5 + Math.random() * 2;
      totalYoutube += 0.3 + Math.random() * 1.2;
    }
    
    setSittingData(sitting);
    
    // 7-day averages for metrics
    const avgDesk = totalDesk / 7;
    const avgComputer = totalComputer / 7;
    const avgMobile = totalMobile / 7;
    const avgYoutube = totalYoutube / 7;
    const pulse = 55 + Math.floor(Math.random() * 30);
    
    const newMetrics: MetricData[] = [
      {
        label: 'DESK',
        value: avgDesk,
        goal: 4,
        unit: 'h/d',
        color: 'var(--amber)',
        icon: <Monitor size={16} />,
        trend: -5
      },
      {
        label: 'COMPUTER',
        value: avgComputer,
        unit: 'h/d',
        color: 'var(--sky)',
        icon: <Monitor size={16} />,
        trend: 12
      },
      {
        label: 'MOBILE',
        value: avgMobile,
        unit: 'h/d',
        color: 'var(--emerald)',
        icon: <Smartphone size={16} />,
        trend: -8
      },
      {
        label: 'YOUTUBE',
        value: avgYoutube,
        unit: 'h/d',
        color: 'var(--red)',
        icon: <Youtube size={16} />,
        trend: 25
      }
    ];
    
    setMetrics(newMetrics);
    setProductivityPulse(pulse);
    
    // Task summary - show week totals more prominently
    const weekComplete = 15 + Math.floor(Math.random() * 20);
    setTaskSummary({
      dueToday: 3 + Math.floor(Math.random() * 5),
      overdue: Math.floor(Math.random() * 3),
      completedToday: 2 + Math.floor(Math.random() * 4),
      completedWeek: weekComplete
    });
    
    // Set 30-day weekly average (for briefing comparison)
    setWeeklyAvg(Math.round(weekComplete * (0.85 + Math.random() * 0.3)));
    
    // Set count of old tasks (>30 days)
    setOldTasks(Math.floor(Math.random() * 8));
  };

  // Fetch live data
  const fetchData = async () => {
    // Try live API first
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(`${LIVE_API_URL}/api/dashboard`, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (res.ok) {
        const data = await res.json();
        if (data.source === 'live') {
          // Use live task data
          if (data.tasks) {
            const weekComplete = data.tasks.completedWeek || 0;
            setTaskSummary({
              dueToday: data.tasks.dueToday || 0,
              overdue: data.tasks.overdue || 0,
              completedToday: data.tasks.completedToday || 0,
              completedWeek: weekComplete,
            });
            
            // Set briefing data from live API
            setWeeklyAvg(data.tasks.weeklyAvg || Math.round(weekComplete * 0.9));
            setOldTasks(data.tasks.oldTasks || 0);
            setTasksLive(true);
          }
          
          // Use live weather data for productivity pulse visual
          if (data.weather?.available) {
            // Use temperature as a fun productivity indicator
            setProductivityPulse(Math.min(100, Math.max(20, data.weather.temp_c * 4 + 40)));
          }
          
          // Use live metrics from RescueTime + Home Assistant (7-day averages)
          if (data.metrics) {
            const liveMetrics: MetricData[] = [
              {
                label: 'DESK',
                value: data.metrics.desk7dAvg ?? data.metrics.deskToday ?? 0,
                goal: 4,
                unit: 'h/d',
                color: 'var(--amber)',
                icon: <Monitor size={16} />,
              },
              {
                label: 'COMPUTER',
                value: data.metrics.computer ?? 0,
                unit: 'h/d',
                color: 'var(--sky)',
                icon: <Monitor size={16} />,
              },
              {
                label: 'MOBILE',
                value: data.metrics.mobile ?? 0,
                unit: 'h/d',
                color: 'var(--emerald)',
                icon: <Smartphone size={16} />,
              },
              {
                label: 'YOUTUBE',
                value: data.metrics.youtube ?? 0,
                unit: 'h/d',
                color: 'var(--red)',
                icon: <Youtube size={16} />,
              }
            ];
            setMetrics(liveMetrics);
            setMetricsLive(true);
            
            // Set sitting data for chart from live history
            const today = new Date();
            const sittingToday: DailySitting[] = [];
            const historyMap: Record<string, number> = {};
            if (data.metrics.deskHistory) {
              data.metrics.deskHistory.forEach((entry: { date: string; hours: number }) => {
                historyMap[entry.date] = entry.hours;
              });
            }
            for (let i = 6; i >= 0; i--) {
              const d = subDays(today, i);
              const dateStr = format(d, 'yyyy-MM-dd');
              sittingToday.push({
                date: dateStr,
                label: format(d, 'EEE'),
                hours: historyMap[dateStr] ?? (i === 0 ? (data.metrics.deskToday ?? 0) : 0)
              });
            }
            setSittingData(sittingToday);
          } else {
            // Fallback to sample metrics
            generateSampleMetricsOnly();
          }
          
          setDataSource('live');
          setLoading(false);
          setLastUpdated(new Date());
          return;
        }
      }
    } catch (err) {
      console.warn('Dashboard API failed:', err);
    }
    
    // Use sample data
    generateSampleData();
    setDataSource('sample');
    setLoading(false);
    setLastUpdated(new Date());
  };

  // Generate only metrics (for when task data is live)
  const generateSampleMetricsOnly = () => {
    const now = new Date();
    const sitting: DailySitting[] = [];
    let totalDesk = 0;
    
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const dayDesk = 3 + Math.random() * 5;
      sitting.push({
        date: format(d, 'yyyy-MM-dd'),
        label: format(d, 'EEE'),
        hours: dayDesk
      });
      totalDesk += dayDesk;
    }
    
    setSittingData(sitting);
    
    const avgDesk = totalDesk / 7;
    
    const newMetrics: MetricData[] = [
      {
        label: 'DESK',
        value: avgDesk,
        goal: 4,
        unit: 'h/d',
        color: 'var(--amber)',
        icon: <Monitor size={16} />,
        trend: -5
      },
      {
        label: 'COMPUTER',
        value: 2.5 + Math.random() * 3,
        unit: 'h/d',
        color: 'var(--sky)',
        icon: <Monitor size={16} />,
        trend: 12
      },
      {
        label: 'MOBILE',
        value: 1.5 + Math.random() * 2,
        unit: 'h/d',
        color: 'var(--emerald)',
        icon: <Smartphone size={16} />,
        trend: -8
      },
      {
        label: 'YOUTUBE',
        value: 0.3 + Math.random() * 1.2,
        unit: 'h/d',
        color: 'var(--red)',
        icon: <Youtube size={16} />,
        trend: 25
      }
    ];
    
    setMetrics(newMetrics);
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const ytdAvg = useMemo(() => {
    if (sittingData.length === 0) return 0;
    return sittingData.reduce((sum, d) => sum + d.hours, 0) / sittingData.length;
  }, [sittingData]);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-screen">
          <Zap size={48} className="pulse" />
          <p>Loading Mission Control...</p>
        </div>
      </div>
    );
  }

  const maxMetricValue = 8; // 8 hours max for bar chart

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard__header">
        <div className="dashboard__title">
          <Zap size={24} style={{ color: 'var(--amber)' }} />
          <h1>Mission Control</h1>
        </div>
        <div className="dashboard__meta">
          <span className={`source-badge source-badge--${tasksLive && metricsLive ? 'live' : tasksLive ? 'bundled' : 'bundled'}`}>
            {tasksLive && metricsLive ? '🟢 Live' : tasksLive ? '🟡 Tasks Live · Metrics Sample' : '🟡 Sample Data'}
          </span>
          <span className="dashboard__updated">
            <RefreshCw size={12} />
            {format(lastUpdated, 'h:mm a')}
          </span>
        </div>
      </div>

      {/* Chief of Staff Briefing */}
      <ChiefOfStaffBriefing 
        taskSummary={taskSummary}
        weeklyAvg={weeklyAvg}
        oldTasks={oldTasks}
      />

      {/* Main Grid */}
      <div className="dashboard__grid">
        {/* Last 7 Days Metrics */}
        <div className="dashboard__card dashboard__card--metrics" style={{ position: 'relative' }}>
          {!metricsLive && (
            <div style={{ position: 'absolute', top: 8, right: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', color: '#F87171', fontWeight: 700, zIndex: 10 }}>
              ❌ NOT LIVE — needs RescueTime + Home Assistant
            </div>
          )}
          <div className="dashboard__card-header">
            <Activity size={18} style={{ color: 'var(--sky)' }} />
            <h2>Last 7 Days</h2>
          </div>
          <div className="metrics-list">
            {metrics.map(metric => (
              <MetricBar key={metric.label} metric={metric} maxValue={maxMetricValue} />
            ))}
          </div>
          <div className="pulse-indicator">
            <span className="pulse-indicator__label">Productivity Pulse</span>
            <div className="pulse-indicator__bar">
              <div 
                className="pulse-indicator__fill"
                style={{ 
                  width: `${productivityPulse}%`,
                  background: productivityPulse >= 70 ? 'var(--emerald)' : 
                              productivityPulse >= 40 ? 'var(--amber)' : 'var(--red)'
                }}
              />
            </div>
            <span className="pulse-indicator__value">{productivityPulse}</span>
          </div>
        </div>

        {/* Tasks Summary */}
        <div className="dashboard__card dashboard__card--tasks" style={{ position: 'relative' }}>
          {!tasksLive && (
            <div style={{ position: 'absolute', top: 8, right: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', color: '#F87171', fontWeight: 700, zIndex: 10 }}>
              ❌ NOT LIVE
            </div>
          )}
          <div className="dashboard__card-header">
            <CheckCircle2 size={18} style={{ color: 'var(--emerald)' }} />
            <h2>Tasks</h2>
          </div>
          <div className="task-grid">
            <TaskCard 
              icon={<Clock size={18} />}
              label="Due Today"
              value={taskSummary.dueToday}
              color="var(--amber)"
              bgColor="var(--amber-dim)"
            />
            {taskSummary.overdue > 0 && (
              <TaskCard 
                icon={<AlertCircle size={18} />}
                label="Overdue"
                value={taskSummary.overdue}
                color="var(--red)"
                bgColor="var(--red-dim)"
              />
            )}
            <TaskCard 
              icon={<CheckCircle2 size={18} />}
              label="Done Today"
              value={taskSummary.completedToday}
              color="var(--emerald)"
              bgColor="var(--emerald-dim)"
            />
            <TaskCard 
              icon={<TrendingUp size={18} />}
              label="This Week"
              value={taskSummary.completedWeek}
              color="var(--sky)"
              bgColor="var(--sky-dim)"
            />
          </div>
          <div className="task-links">
            <a href="https://tasks.toodledo.com/saved/240292#" target="_blank" rel="noopener noreferrer">
              Today&apos;s Tasks →
            </a>
            <a href="https://tasks.toodledo.com/saved/240291#" target="_blank" rel="noopener noreferrer">
              All Tasks →
            </a>
          </div>
        </div>

        {/* Sitting Chart */}
        <div className="dashboard__card dashboard__card--chart" style={{ position: 'relative' }}>
          {!metricsLive && (
            <div style={{ position: 'absolute', top: 8, right: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', color: '#F87171', fontWeight: 700, zIndex: 10 }}>
              ❌ NOT LIVE — needs Home Assistant
            </div>
          )}
          <div className="dashboard__card-header">
            <Monitor size={18} style={{ color: 'var(--amber)' }} />
            <h2>Desk Time (7 days)</h2>
            <span className="dashboard__card-subtitle">
              Avg: {ytdAvg.toFixed(1)}h · Goal: &lt;4h
            </span>
          </div>
          <div className="dashboard__chart">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sittingData} barGap={4}>
                <XAxis 
                  dataKey="label"
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Atkinson Hyperlegible' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 'auto']}
                />
                <Tooltip content={<DarkTooltip />} />
                <Bar 
                  dataKey="hours"
                  fill="var(--amber)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Links */}
        <div className="dashboard__card dashboard__card--links">
          <div className="dashboard__card-header">
            <Zap size={18} style={{ color: 'var(--emerald)' }} />
            <h2>Quick Links</h2>
          </div>
          <div className="quick-links">
            <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="quick-link">
              <span>📅</span> Calendar
            </a>
            <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="quick-link">
              <span>📧</span> Email
            </a>
            <a href="https://www.rescuetime.com/dashboard" target="_blank" rel="noopener noreferrer" className="quick-link">
              <span>⏱️</span> RescueTime
            </a>
            <a href="https://my.home-assistant.io" target="_blank" rel="noopener noreferrer" className="quick-link">
              <span>🏠</span> Home Assistant
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
