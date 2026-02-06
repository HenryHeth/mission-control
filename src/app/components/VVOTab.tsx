'use client';

import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Target, Heart, Zap, TrendingUp, Users, Activity, 
  Brain, CheckCircle2, Circle, Clock, Calendar,
  ChevronDown, ChevronRight
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Mission Control — VVO Tab (Vision, Values, Objectives)
   Paul's Ikigai-based quarterly planning dashboard
   ═══════════════════════════════════════════════════════ */

const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:3456';

// VVO Objectives data structure
interface Goal {
  id: string;
  text: string;
  metric: string;
  folder: string;
  status: 'not-started' | 'in-progress' | 'complete';
  progress?: number;
}

interface Objective {
  id: string;
  title: string;
  zone: 'mission' | 'passion' | 'profession' | 'vocation';
  icon: React.ReactNode;
  color: string;
  goals: Goal[];
  whyNow: string;
}

const OBJECTIVES: Objective[] = [
  {
    id: 'obj-1',
    title: 'PRESENT DAD — Own Ski Season with the Kids',
    zone: 'mission',
    icon: <Heart size={18} />,
    color: 'var(--red)',
    whyNow: "Peak ski season. Ailie is 16, Parker is 13. The window where they *want* to ski with Dad is closing.",
    goals: [
      { id: '1.1', text: 'Ski 12+ days with Ailie and/or Parker by March 31', metric: 'Days logged', folder: 'pFamily', status: 'in-progress', progress: 40 },
      { id: '1.2', text: 'Drive Ailie to 90% of soccer/ski commitments', metric: '% of drives', folder: 'pFamily', status: 'in-progress', progress: 85 },
      { id: '1.3', text: '1 weekly device-free dinner with the whole family', metric: '12 dinners by Mar 31', folder: 'pFamily', status: 'in-progress', progress: 33 },
      { id: '1.4', text: 'Plan and book 1 spring break family adventure', metric: 'Booked by Feb 28', folder: 'pEBL', status: 'not-started' },
    ]
  },
  {
    id: 'obj-2',
    title: 'PARTNERSHIP — Invest in Jen',
    zone: 'mission',
    icon: <Heart size={18} />,
    color: 'var(--red)',
    whyNow: "With kids getting more independent, the partnership needs intentional investment, not just logistics.",
    goals: [
      { id: '2.1', text: '1 date night per month (no kids, no screens)', metric: '3 dates by Mar 31', folder: 'pPartnership', status: 'in-progress', progress: 33 },
      { id: '2.2', text: 'Plan 1 couples trip for Q2', metric: 'Booked by Mar 15', folder: 'pPartnership', status: 'not-started' },
      { id: '2.3', text: 'Daily 10-min check-in with Jen', metric: 'Habit tracked', folder: 'pPartnership', status: 'in-progress', progress: 70 },
    ]
  },
  {
    id: 'obj-3',
    title: 'SOCIAL INVESTMENT — Show Up for Friends',
    zone: 'mission',
    icon: <Users size={18} />,
    color: 'var(--red)',
    whyNow: "Retirement can quietly isolate. Winter is the highest-risk season for letting friendships slide.",
    goals: [
      { id: '3.1', text: '2 social events per week', metric: 'Calendar count', folder: 'pSocial', status: 'in-progress', progress: 60 },
      { id: '3.2', text: 'Reach out to 1 old friend per month', metric: '3 reconnections', folder: 'pSocial', status: 'in-progress', progress: 33 },
      { id: '3.3', text: 'Host 1 dinner/gathering at home', metric: 'Event completed', folder: 'pSocial', status: 'not-started' },
    ]
  },
  {
    id: 'obj-4',
    title: 'PEAK FITNESS — Body Comp + Triathlon Base',
    zone: 'passion',
    icon: <Activity size={18} />,
    color: 'var(--emerald)',
    whyNow: "Winter base training. Back health requires consistent movement. Set up a dominant summer race season.",
    goals: [
      { id: '4.1', text: 'Reach 16% body fat', metric: 'DEXA or scale', folder: 'pPhysical', status: 'in-progress', progress: 45 },
      { id: '4.2', text: '4x/week structured training', metric: 'Weekly log', folder: 'pPhysical', status: 'in-progress', progress: 75 },
      { id: '4.3', text: 'Zero weeks with 5+ hours sitting in a single day', metric: 'Sitting sensor', folder: 'pPhysical', status: 'in-progress', progress: 50 },
      { id: '4.4', text: '8 hours average sleep per week', metric: 'Sleep tracker', folder: 'pPhysical', status: 'in-progress', progress: 65 },
      { id: '4.5', text: 'Complete 1 running race (10K or half)', metric: 'Race finish', folder: 'pPhysical', status: 'not-started' },
    ]
  },
  {
    id: 'obj-5',
    title: 'BUILD & SHIP — AI/Vibe Coding Progress',
    zone: 'profession',
    icon: <Zap size={18} />,
    color: 'var(--sky)',
    whyNow: "Energy is high for building. Clawdbot ecosystem is maturing. Ship something real.",
    goals: [
      { id: '5.1', text: 'Ship 1 complete project', metric: 'Deployed + working', folder: 'pCareer', status: 'in-progress', progress: 80 },
      { id: '5.2', text: 'Limit coding sessions to 90 min max', metric: 'Self-tracked', folder: 'pCareer', status: 'in-progress', progress: 40 },
      { id: '5.3', text: 'Write 1 "what I built" post', metric: 'Published', folder: 'pCareer', status: 'not-started' },
      { id: '5.4', text: 'Reduce Toodledo inbox to <20 items', metric: 'Toodledo count', folder: 'pHome', status: 'in-progress', progress: 25 },
    ]
  },
  {
    id: 'obj-6',
    title: 'PLANT SEEDS — Explore Contribution',
    zone: 'vocation',
    icon: <Brain size={18} />,
    color: 'var(--amber)',
    whyNow: "Low-pressure exploration. No commitments, just noticing what pulls.",
    goals: [
      { id: '6.1', text: '1 conversation about mentoring/advising/teaching', metric: 'Completed', folder: 'pCareer', status: 'not-started' },
      { id: '6.2', text: 'Notice 3 moments where someone asked for help you loved giving', metric: 'Journal note', folder: 'pMental', status: 'in-progress', progress: 33 },
    ]
  }
];

// Zone metadata
const ZONES = {
  mission: { name: 'Mission', desc: 'Love + World Needs', color: 'var(--red)', bg: 'var(--red-dim)' },
  passion: { name: 'Passion', desc: 'Love + Good At', color: 'var(--emerald)', bg: 'var(--emerald-dim)' },
  profession: { name: 'Profession', desc: 'Good At + Creates Value', color: 'var(--sky)', bg: 'var(--sky-dim)' },
  vocation: { name: 'Vocation', desc: 'World Needs + Creates Value', color: 'var(--amber)', bg: 'var(--amber-dim)' },
};

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="vvo-progress-bar">
      <div 
        className="vvo-progress-bar__fill" 
        style={{ width: `${progress}%`, background: color }}
      />
    </div>
  );
}

function GoalRow({ goal, color }: { goal: Goal; color: string }) {
  const statusIcon = goal.status === 'complete' ? (
    <CheckCircle2 size={14} style={{ color: 'var(--emerald)' }} />
  ) : goal.status === 'in-progress' ? (
    <Clock size={14} style={{ color: color }} />
  ) : (
    <Circle size={14} style={{ color: 'var(--text-dim)' }} />
  );

  return (
    <div className={`vvo-goal vvo-goal--${goal.status}`}>
      <div className="vvo-goal__status">{statusIcon}</div>
      <div className="vvo-goal__content">
        <div className="vvo-goal__text">{goal.text}</div>
        <div className="vvo-goal__meta">
          <span className="vvo-goal__metric">{goal.metric}</span>
          <span className="vvo-goal__folder">{goal.folder}</span>
        </div>
      </div>
      {goal.progress !== undefined && (
        <div className="vvo-goal__progress">
          <ProgressBar progress={goal.progress} color={color} />
          <span className="vvo-goal__percent">{goal.progress}%</span>
        </div>
      )}
    </div>
  );
}

function ObjectiveCard({ objective, isExpanded, onToggle }: { 
  objective: Objective; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const zone = ZONES[objective.zone];
  const completedGoals = objective.goals.filter(g => g.status === 'complete').length;
  const totalGoals = objective.goals.length;
  const avgProgress = Math.round(
    objective.goals.reduce((sum, g) => sum + (g.progress || 0), 0) / totalGoals
  );

  return (
    <div className={`vvo-objective vvo-objective--${objective.zone}`}>
      <div className="vvo-objective__header" onClick={onToggle}>
        <div className="vvo-objective__icon" style={{ color: objective.color }}>
          {objective.icon}
        </div>
        <div className="vvo-objective__info">
          <div className="vvo-objective__title">{objective.title}</div>
          <div className="vvo-objective__zone" style={{ color: zone.color }}>
            {zone.name} — {zone.desc}
          </div>
        </div>
        <div className="vvo-objective__stats">
          <span className="vvo-objective__count">{completedGoals}/{totalGoals}</span>
          <span className="vvo-objective__avg">{avgProgress}%</span>
        </div>
        <div className="vvo-objective__toggle">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="vvo-objective__body">
          <div className="vvo-objective__why">
            <strong>Why Q1:</strong> {objective.whyNow}
          </div>
          <div className="vvo-objective__goals">
            {objective.goals.map(goal => (
              <GoalRow key={goal.id} goal={goal} color={objective.color} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ZoneSummary({ zone, objectives }: { zone: keyof typeof ZONES; objectives: Objective[] }) {
  const zoneData = ZONES[zone];
  const zoneObjectives = objectives.filter(o => o.zone === zone);
  const totalGoals = zoneObjectives.reduce((sum, o) => sum + o.goals.length, 0);
  const completedGoals = zoneObjectives.reduce(
    (sum, o) => sum + o.goals.filter(g => g.status === 'complete').length, 0
  );

  return (
    <div className="vvo-zone-summary" style={{ borderLeftColor: zoneData.color }}>
      <div className="vvo-zone-summary__header" style={{ color: zoneData.color }}>
        {zoneData.name}
      </div>
      <div className="vvo-zone-summary__desc">{zoneData.desc}</div>
      <div className="vvo-zone-summary__stats">
        <span>{zoneObjectives.length} objectives</span>
        <span>·</span>
        <span>{completedGoals}/{totalGoals} goals</span>
      </div>
    </div>
  );
}

export default function VVOTab() {
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set(['obj-1', 'obj-4']));
  const [vvoContent, setVvoContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showFullVVO, setShowFullVVO] = useState(false);

  useEffect(() => {
    // Load VVO document
    const loadVVO = async () => {
      try {
        const res = await fetch(`${LIVE_API_URL}/api/files/docs%2Fvvo_draft_q1_2026.md`);
        if (res.ok) {
          const data = await res.json();
          setVvoContent(data.content || '');
        }
      } catch (e) {
        console.error('Failed to load VVO:', e);
      } finally {
        setLoading(false);
      }
    };
    loadVVO();
  }, []);

  const toggleObjective = (id: string) => {
    setExpandedObjectives(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalGoals = OBJECTIVES.reduce((sum, o) => sum + o.goals.length, 0);
    const completedGoals = OBJECTIVES.reduce(
      (sum, o) => sum + o.goals.filter(g => g.status === 'complete').length, 0
    );
    const inProgressGoals = OBJECTIVES.reduce(
      (sum, o) => sum + o.goals.filter(g => g.status === 'in-progress').length, 0
    );
    const avgProgress = Math.round(
      OBJECTIVES.reduce((sum, o) => 
        sum + o.goals.reduce((s, g) => s + (g.progress || 0), 0), 0
      ) / totalGoals
    );
    
    return { totalGoals, completedGoals, inProgressGoals, avgProgress };
  }, []);

  return (
    <div className="vvo-dashboard">
      {/* Header */}
      <div className="vvo-header">
        <div className="vvo-header__title">
          <Target size={24} style={{ color: 'var(--amber)' }} />
          <h1>VVO — Q1 2026</h1>
        </div>
        <div className="vvo-header__subtitle">
          Vision · Values · Objectives (Ikigai Framework)
        </div>
      </div>

      {/* Ikigai Statement */}
      <div className="vvo-ikigai-card">
        <div className="vvo-ikigai-card__label">★ IKIGAI — Paul's Reason for Being</div>
        <div className="vvo-ikigai-card__statement">
          Being a fully present, physically vital, deeply connected man who builds cool things and shares what he learns — not because he has to, but because it's who he is.
        </div>
      </div>

      {/* Stats Row */}
      <div className="vvo-stats-row">
        <div className="vvo-stat">
          <div className="vvo-stat__value">{OBJECTIVES.length}</div>
          <div className="vvo-stat__label">Objectives</div>
        </div>
        <div className="vvo-stat">
          <div className="vvo-stat__value">{stats.totalGoals}</div>
          <div className="vvo-stat__label">Goals</div>
        </div>
        <div className="vvo-stat">
          <div className="vvo-stat__value" style={{ color: 'var(--emerald)' }}>{stats.completedGoals}</div>
          <div className="vvo-stat__label">Completed</div>
        </div>
        <div className="vvo-stat">
          <div className="vvo-stat__value" style={{ color: 'var(--sky)' }}>{stats.inProgressGoals}</div>
          <div className="vvo-stat__label">In Progress</div>
        </div>
        <div className="vvo-stat">
          <div className="vvo-stat__value" style={{ color: 'var(--amber)' }}>{stats.avgProgress}%</div>
          <div className="vvo-stat__label">Avg Progress</div>
        </div>
      </div>

      {/* Zone Summaries */}
      <div className="vvo-zones-grid">
        {(Object.keys(ZONES) as Array<keyof typeof ZONES>).map(zone => (
          <ZoneSummary key={zone} zone={zone} objectives={OBJECTIVES} />
        ))}
      </div>

      {/* Objectives List */}
      <div className="vvo-objectives">
        <div className="vvo-objectives__header">
          <h2>Q1 Objectives</h2>
          <button 
            className="vvo-toggle-btn"
            onClick={() => setShowFullVVO(!showFullVVO)}
          >
            {showFullVVO ? 'Show Dashboard' : 'Show Full VVO Doc'}
          </button>
        </div>

        {showFullVVO ? (
          <div className="vvo-full-doc">
            {loading ? (
              <div className="content-empty">
                <Target size={32} className="pulse" style={{ color: 'var(--amber)', opacity: 0.5 }} />
                <span className="loading-text">Loading VVO...</span>
              </div>
            ) : (
              <div className="md-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {vvoContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <div className="vvo-objectives__list">
            {OBJECTIVES.map(objective => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                isExpanded={expandedObjectives.has(objective.id)}
                onToggle={() => toggleObjective(objective.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
