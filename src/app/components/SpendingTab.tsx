'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Server, Cpu, Phone, MessageSquare, Cloud, Database,
  RefreshCw, ExternalLink, ChevronDown, ChevronRight,
  Zap, Monitor
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

/* ═══════════════════════════════════════════════════════
   Mission Control — Spending Tab v1.0
   Track ALL API costs and subscriptions
   "If we miss any, we leak money"
   ═══════════════════════════════════════════════════════ */

const LIVE_API_URL = "";

const COLORS = {
  anthropic: '#D97706',  // Amber
  openai: '#10B981',     // Emerald
  openrouter: '#8B5CF6', // Purple
  twilio: '#F87171',     // Red
  elevenlabs: '#38BDF8', // Sky
  google: '#34D399',     // Green
  other: '#64748B',      // Slate
};

interface ServiceCost {
  id: string;
  name: string;
  category: 'ai' | 'infrastructure' | 'saas' | 'domains';
  icon: React.ReactNode;
  todayCost: number;
  weekCost: number;
  monthCost: number;
  billingType: 'usage' | 'subscription' | 'free';
  apiAvailable: boolean;
  dashboardUrl: string;
  color: string;
  lastUpdated?: Date;
  trend?: number; // percent change vs last week
}

interface DailySpend {
  date: string;
  label: string;
  anthropic: number;
  openai: number;
  twilio: number;
  other: number;
  total: number;
}

interface VoiceCallCost {
  date: string;
  duration: string;
  twilioCost: number;
  openaiCost: number;
  totalCost: number;
}

// Service catalog - comprehensive list of all services
const SERVICE_CATALOG: ServiceCost[] = [
  // AI/LLM Services (HIGH COST)
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    category: 'ai',
    icon: <Cpu size={16} />,
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    billingType: 'usage',
    apiAvailable: true,
    dashboardUrl: 'https://console.anthropic.com/settings/billing',
    color: COLORS.anthropic,
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT + Voice)',
    category: 'ai',
    icon: <Zap size={16} />,
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    billingType: 'usage',
    apiAvailable: true,
    dashboardUrl: 'https://platform.openai.com/account/usage',
    color: COLORS.openai,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'ai',
    icon: <Server size={16} />,
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    billingType: 'usage',
    apiAvailable: true,
    dashboardUrl: 'https://openrouter.ai/account',
    color: COLORS.openrouter,
  },
  {
    id: 'google',
    name: 'Google AI (Gemini)',
    category: 'ai',
    icon: <Cloud size={16} />,
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    billingType: 'free',
    apiAvailable: true,
    dashboardUrl: 'https://aistudio.google.com',
    color: COLORS.google,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs (TTS)',
    category: 'ai',
    icon: <MessageSquare size={16} />,
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    billingType: 'usage',
    apiAvailable: true,
    dashboardUrl: 'https://elevenlabs.io/subscription',
    color: COLORS.elevenlabs,
  },
  // Infrastructure (MEDIUM COST)
  {
    id: 'twilio',
    name: 'Twilio (Voice)',
    category: 'infrastructure',
    icon: <Phone size={16} />,
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    billingType: 'usage',
    apiAvailable: true,
    dashboardUrl: 'https://console.twilio.com/billing',
    color: COLORS.twilio,
  },
  {
    id: 'railway',
    name: 'Railway',
    category: 'infrastructure',
    icon: <Server size={16} />,
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    billingType: 'usage',
    apiAvailable: true,
    dashboardUrl: 'https://railway.app/account/billing',
    color: COLORS.other,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    category: 'infrastructure',
    icon: <Cloud size={16} />,
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    billingType: 'free',
    apiAvailable: true,
    dashboardUrl: 'https://vercel.com/account/billing',
    color: COLORS.other,
  },
  {
    id: 'brave',
    name: 'Brave Search',
    category: 'infrastructure',
    icon: <Monitor size={16} />,
    todayCost: 0,
    weekCost: 0,
    monthCost: 0,
    billingType: 'usage',
    apiAvailable: true,
    dashboardUrl: 'https://api.search.brave.com',
    color: COLORS.other,
  },
  // SaaS Subscriptions (FIXED COST)
  {
    id: 'toodledo',
    name: 'Toodledo',
    category: 'saas',
    icon: <Database size={16} />,
    todayCost: 0.10, // $36/year ÷ 365
    weekCost: 0.69,
    monthCost: 3.00,
    billingType: 'subscription',
    apiAvailable: false,
    dashboardUrl: 'https://toodledo.com/account',
    color: COLORS.other,
  },
  {
    id: 'rescuetime',
    name: 'RescueTime',
    category: 'saas',
    icon: <Monitor size={16} />,
    todayCost: 0.40, // $12/month ÷ 30
    weekCost: 2.80,
    monthCost: 12.00,
    billingType: 'subscription',
    apiAvailable: true,
    dashboardUrl: 'https://rescuetime.com/account',
    color: COLORS.other,
  },
  {
    id: 'snowforecast',
    name: 'Snow-Forecast',
    category: 'saas',
    icon: <Cloud size={16} />,
    todayCost: 0.33,
    weekCost: 2.31,
    monthCost: 10.00,
    billingType: 'subscription',
    apiAvailable: false,
    dashboardUrl: 'https://snow-forecast.com/account',
    color: COLORS.other,
  },
  // Domains (LOW/FIXED)
  {
    id: 'cloudflare',
    name: 'Cloudflare (Domains)',
    category: 'domains',
    icon: <Cloud size={16} />,
    todayCost: 0.04, // ~$15/year per domain
    weekCost: 0.29,
    monthCost: 1.25,
    billingType: 'subscription',
    apiAvailable: true,
    dashboardUrl: 'https://dash.cloudflare.com',
    color: COLORS.other,
  },
];

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip__row">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="chart-tooltip__value">${p.value.toFixed(2)}</span>
        </div>
      ))}
      <div className="chart-tooltip__row chart-tooltip__row--total">
        <span>Total:</span>
        <span className="chart-tooltip__value">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}

function ServiceCard({ service, expanded, onToggle }: { service: ServiceCost; expanded: boolean; onToggle: () => void }) {
  const isVariable = service.billingType === 'usage';
  
  return (
    <div className={`service-card service-card--${service.category}`}>
      <div className="service-card__header" onClick={onToggle}>
        <div className="service-card__icon" style={{ color: service.color }}>
          {service.icon}
        </div>
        <div className="service-card__info">
          <span className="service-card__name">{service.name}</span>
          <span className="service-card__type">
            {isVariable ? '📊 Usage-based' : service.billingType === 'free' ? '🆓 Free tier' : '📅 Subscription'}
          </span>
        </div>
        <div className="service-card__cost">
          <span className="service-card__amount" style={{ color: service.color }}>
            ${service.monthCost.toFixed(2)}
          </span>
          <span className="service-card__period">/mo</span>
        </div>
        <div className="service-card__toggle">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>
      
      {expanded && (
        <div className="service-card__details">
          <div className="service-card__breakdown">
            <div className="service-card__stat">
              <span className="service-card__stat-label">Today</span>
              <span className="service-card__stat-value">${service.todayCost.toFixed(2)}</span>
            </div>
            <div className="service-card__stat">
              <span className="service-card__stat-label">This Week</span>
              <span className="service-card__stat-value">${service.weekCost.toFixed(2)}</span>
            </div>
            <div className="service-card__stat">
              <span className="service-card__stat-label">This Month</span>
              <span className="service-card__stat-value">${service.monthCost.toFixed(2)}</span>
            </div>
          </div>
          <div className="service-card__footer">
            <span className={`service-card__api ${service.apiAvailable ? 'service-card__api--yes' : 'service-card__api--no'}`}>
              {service.apiAvailable ? '✅ API Available' : '📋 Manual Entry'}
            </span>
            <a href={service.dashboardUrl} target="_blank" rel="noopener noreferrer" className="service-card__link">
              Dashboard <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function BurnRateBar({ current, limit, label }: { current: number; limit: number; label: string }) {
  const percent = Math.min((current / limit) * 100, 100);
  const isWarning = percent > 60;
  const isDanger = percent > 80;
  
  return (
    <div className="burn-rate">
      <div className="burn-rate__header">
        <span className="burn-rate__label">{label}</span>
        <span className={`burn-rate__value ${isDanger ? 'burn-rate__value--danger' : isWarning ? 'burn-rate__value--warning' : ''}`}>
          ${current.toFixed(2)} / ${limit}
        </span>
      </div>
      <div className="burn-rate__track">
        <div 
          className={`burn-rate__fill ${isDanger ? 'burn-rate__fill--danger' : isWarning ? 'burn-rate__fill--warning' : ''}`}
          style={{ width: `${percent}%` }}
        />
        <div className="burn-rate__markers">
          <div className="burn-rate__marker" style={{ left: '60%' }} title="Warning: 60%" />
          <div className="burn-rate__marker burn-rate__marker--danger" style={{ left: '80%' }} title="Danger: 80%" />
        </div>
      </div>
    </div>
  );
}

export default function SpendingTab() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceCost[]>(SERVICE_CATALOG);
  const [dailyData, setDailyData] = useState<DailySpend[]>([]);
  const [voiceCalls, setVoiceCalls] = useState<VoiceCallCost[]>([]);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [dataSource, setDataSource] = useState<'live' | 'sample'>('sample');

  // Fetch spending data from API
  const fetchSpendingData = async (forceRefresh = false) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const url = `${LIVE_API_URL}/api/spending${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (res.ok) {
        const data = await res.json();
        
        // Update services with live data
        if (data.providers) {
          const updatedServices = services.map(s => {
            const provider = data.providers[s.id];
            if (provider) {
              if (provider.available) {
                return {
                  ...s,
                  todayCost: provider.todayCost || s.todayCost,
                  monthCost: provider.estimatedMonthly || provider.totalUsed || s.monthCost,
                  weekCost: (provider.estimatedMonthly || provider.totalUsed || s.monthCost) / 4,
                  lastUpdated: new Date(),
                };
              } else if (provider.estimatedMonthly) {
                return {
                  ...s,
                  monthCost: provider.estimatedMonthly,
                  weekCost: provider.estimatedMonthly / 4,
                  todayCost: provider.estimatedMonthly / 30,
                };
              }
            }
            return s;
          });
          setServices(updatedServices);
        }
        
        setDataSource(data.source === 'sample' ? 'sample' : 'live');
        setLastUpdated(new Date(data.collectedAt || Date.now()));
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch live spending data, using sample:', e);
    }
    
    // Fallback to sample data
    generateSampleData();
  };

  // Generate sample data for demo/fallback
  const generateSampleData = () => {
    const now = new Date();
    const daily: DailySpend[] = [];
    
    // Generate 7 days of spending data
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const anthropic = 5 + Math.random() * 10;
      const openai = 1 + Math.random() * 4;
      const twilio = Math.random() * 2;
      const other = 0.5 + Math.random() * 1;
      
      daily.push({
        date: format(d, 'yyyy-MM-dd'),
        label: format(d, 'EEE'),
        anthropic,
        openai,
        twilio,
        other,
        total: anthropic + openai + twilio + other,
      });
    }
    setDailyData(daily);
    
    // Update service costs with realistic estimates
    const updatedServices = services.map(s => {
      if (s.id === 'anthropic') {
        const monthCost = 150 + Math.random() * 100;
        return { ...s, todayCost: monthCost / 30 * (0.8 + Math.random() * 0.4), weekCost: monthCost / 4, monthCost };
      }
      if (s.id === 'openai') {
        const monthCost = 50 + Math.random() * 50;
        return { ...s, todayCost: monthCost / 30 * (0.8 + Math.random() * 0.4), weekCost: monthCost / 4, monthCost };
      }
      if (s.id === 'twilio') {
        const monthCost = 20 + Math.random() * 30;
        return { ...s, todayCost: monthCost / 30 * (0.5 + Math.random() * 1), weekCost: monthCost / 4, monthCost };
      }
      if (s.id === 'elevenlabs') {
        const monthCost = 5 + Math.random() * 10;
        return { ...s, todayCost: monthCost / 30, weekCost: monthCost / 4, monthCost };
      }
      return s;
    });
    setServices(updatedServices);
    
    // Sample voice calls
    setVoiceCalls([
      { date: '2026-02-07 11:45 PM', duration: '12m 34s', twilioCost: 0.15, openaiCost: 3.76, totalCost: 3.91 },
      { date: '2026-02-07 8:30 PM', duration: '5m 12s', twilioCost: 0.06, openaiCost: 1.56, totalCost: 1.62 },
      { date: '2026-02-06 2:15 PM', duration: '3m 48s', twilioCost: 0.05, openaiCost: 1.14, totalCost: 1.19 },
    ]);
    
    setDataSource('sample');
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    fetchSpendingData();
    // Refresh every 15 minutes
    const interval = setInterval(() => fetchSpendingData(), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleService = (id: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totals = useMemo(() => {
    const today = services.reduce((sum, s) => sum + s.todayCost, 0);
    const week = services.reduce((sum, s) => sum + s.weekCost, 0);
    const month = services.reduce((sum, s) => sum + s.monthCost, 0);
    return { today, week, month };
  }, [services]);

  const filteredServices = useMemo(() => {
    if (activeCategory === 'all') return services;
    return services.filter(s => s.category === activeCategory);
  }, [services, activeCategory]);

  const categoryTotals = useMemo(() => {
    const cats = { ai: 0, infrastructure: 0, saas: 0, domains: 0 };
    services.forEach(s => {
      cats[s.category] += s.monthCost;
    });
    return cats;
  }, [services]);

  const pieData = useMemo(() => {
    return [
      { name: 'AI/LLM', value: categoryTotals.ai, color: COLORS.anthropic },
      { name: 'Infrastructure', value: categoryTotals.infrastructure, color: COLORS.twilio },
      { name: 'SaaS', value: categoryTotals.saas, color: COLORS.openrouter },
      { name: 'Domains', value: categoryTotals.domains, color: COLORS.other },
    ].filter(d => d.value > 0);
  }, [categoryTotals]);

  if (loading) {
    return (
      <div className="spending">
        <div className="loading-screen">
          <DollarSign size={48} className="pulse" />
          <p>Loading spending data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spending">
      {/* Header */}
      <div className="spending__header">
        <div className="spending__title">
          <DollarSign size={24} style={{ color: 'var(--amber)' }} />
          <h1>Spending</h1>
        </div>
        <div className="spending__meta">
          <span className={`source-badge source-badge--${dataSource === 'live' ? 'live' : 'bundled'}`}>
            {dataSource === 'live' ? '🟢 Live' : '🟡 Sample Data'}
          </span>
          <button className="refresh-btn" onClick={() => fetchSpendingData(true)}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <span className="spending__updated">
            Updated {format(lastUpdated, 'h:mm a')}
          </span>
        </div>
      </div>

      {/* Burn Rate */}
      <div className="spending__burn-section">
        <BurnRateBar current={totals.today} limit={50} label="TODAY'S BURN" />
      </div>

      {/* Summary Cards */}
      <div className="spending__summary">
        <div className="summary-card">
          <div className="summary-card__label">Today</div>
          <div className="summary-card__value">${totals.today.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">This Week</div>
          <div className="summary-card__value">${totals.week.toFixed(2)}</div>
        </div>
        <div className="summary-card summary-card--highlight">
          <div className="summary-card__label">This Month</div>
          <div className="summary-card__value">${totals.month.toFixed(2)}</div>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="spending__card">
        <div className="spending__card-header">
          <TrendingUp size={18} style={{ color: 'var(--sky)' }} />
          <h2>7-Day Trend</h2>
        </div>
        <div className="spending__chart">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} barGap={2}>
              <XAxis 
                dataKey="label"
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="anthropic" stackId="a" fill={COLORS.anthropic} name="Anthropic" radius={[0, 0, 0, 0]} />
              <Bar dataKey="openai" stackId="a" fill={COLORS.openai} name="OpenAI" radius={[0, 0, 0, 0]} />
              <Bar dataKey="twilio" stackId="a" fill={COLORS.twilio} name="Twilio" radius={[0, 0, 0, 0]} />
              <Bar dataKey="other" stackId="a" fill={COLORS.other} name="Other" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="spending__grid">
        <div className="spending__card spending__card--pie">
          <div className="spending__card-header">
            <DollarSign size={18} style={{ color: 'var(--emerald)' }} />
            <h2>By Category</h2>
          </div>
          <div className="spending__pie">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : value} />
              </PieChart>
            </ResponsiveContainer>
            <div className="spending__pie-legend">
              {pieData.map((d, i) => (
                <div key={i} className="pie-legend-item">
                  <span className="pie-legend-color" style={{ background: d.color }} />
                  <span className="pie-legend-name">{d.name}</span>
                  <span className="pie-legend-value">${d.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Voice Call Costs */}
        <div className="spending__card spending__card--voice">
          <div className="spending__card-header">
            <Phone size={18} style={{ color: 'var(--red)' }} />
            <h2>Voice Calls (Combined)</h2>
          </div>
          <div className="voice-calls">
            {voiceCalls.map((call, i) => (
              <div key={i} className="voice-call">
                <div className="voice-call__info">
                  <span className="voice-call__date">{call.date}</span>
                  <span className="voice-call__duration">{call.duration}</span>
                </div>
                <div className="voice-call__breakdown">
                  <span className="voice-call__part">Twilio: ${call.twilioCost.toFixed(2)}</span>
                  <span className="voice-call__part">OpenAI: ${call.openaiCost.toFixed(2)}</span>
                </div>
                <div className="voice-call__total">${call.totalCost.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="spending__filter">
        <button 
          className={`filter-btn ${activeCategory === 'all' ? 'filter-btn--active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All Services
        </button>
        <button 
          className={`filter-btn ${activeCategory === 'ai' ? 'filter-btn--active' : ''}`}
          onClick={() => setActiveCategory('ai')}
        >
          🤖 AI/LLM
        </button>
        <button 
          className={`filter-btn ${activeCategory === 'infrastructure' ? 'filter-btn--active' : ''}`}
          onClick={() => setActiveCategory('infrastructure')}
        >
          🏗️ Infrastructure
        </button>
        <button 
          className={`filter-btn ${activeCategory === 'saas' ? 'filter-btn--active' : ''}`}
          onClick={() => setActiveCategory('saas')}
        >
          📦 SaaS
        </button>
        <button 
          className={`filter-btn ${activeCategory === 'domains' ? 'filter-btn--active' : ''}`}
          onClick={() => setActiveCategory('domains')}
        >
          🌐 Domains
        </button>
      </div>

      {/* Service List */}
      <div className="spending__services">
        <div className="spending__card-header">
          <Server size={18} style={{ color: 'var(--purple)' }} />
          <h2>Service Catalog ({filteredServices.length})</h2>
        </div>
        <div className="service-list">
          {filteredServices.map(service => (
            <ServiceCard 
              key={service.id}
              service={service}
              expanded={expandedServices.has(service.id)}
              onToggle={() => toggleService(service.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer: Missing Services Warning */}
      <div className="spending__footer">
        <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
        <span>
          Missing a service? Edit <code>SpendingTab.tsx</code> or check <code>docs/PRD-mission-control-v2-modules.md</code>
        </span>
      </div>
    </div>
  );
}
