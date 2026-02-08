'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Phone, Calendar, MessageSquare, 
  Heart, Activity, Terminal, Server, Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   System Layout Option 2: Big Stats Bar + Detail Cards
   - Hero stats row with large numbers
   - Detail cards below in 3-column grid
   ═══════════════════════════════════════════════════════ */

export default function System2Page() {
  const [data, setData] = useState<{
    servicesOnline: number;
    totalServices: number;
    activeCalls: number;
    contextPercent: number;
    heartbeatAge: string;
    lastDump: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/system-status');
        if (res.ok) {
          const d = await res.json();
          const online = d.services?.filter((s: { status: string }) => s.status === 'online').length || 4;
          setData({
            servicesOnline: online,
            totalServices: d.services?.length || 4,
            activeCalls: 0,
            contextPercent: d.contextUsage?.percentUsed || 22,
            heartbeatAge: d.heartbeatHealth?.lastHeartbeat || new Date().toISOString(),
            lastDump: d.telegramDumps?.lastDump?.lastModified || new Date().toISOString(),
          });
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div style={styles.loading}>Loading...</div>;

  const stats = data || {
    servicesOnline: 4, totalServices: 4, activeCalls: 0,
    contextPercent: 22, heartbeatAge: new Date().toISOString(),
    lastDump: new Date().toISOString()
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚡ System Status - Option 2</h1>
        <span style={styles.badge}>Stats Bar Layout</span>
      </div>

      {/* Big Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <Server size={32} color="#10B981" />
          <div style={styles.statNumber}>{stats.servicesOnline}/{stats.totalServices}</div>
          <div style={styles.statLabel}>Services Online</div>
        </div>
        <div style={styles.statItem}>
          <Phone size={32} color="#38BDF8" />
          <div style={styles.statNumber}>{stats.activeCalls}</div>
          <div style={styles.statLabel}>Active Calls</div>
        </div>
        <div style={styles.statItem}>
          <Activity size={32} color="#FBBF24" />
          <div style={styles.statNumber}>{stats.contextPercent}%</div>
          <div style={styles.statLabel}>Context Used</div>
        </div>
        <div style={styles.statItem}>
          <Heart size={32} color="#F87171" />
          <div style={styles.statNumber}>{formatDistanceToNow(new Date(stats.heartbeatAge)).replace(' ago', '').replace('about ', '')}</div>
          <div style={styles.statLabel}>Since Heartbeat</div>
        </div>
        <div style={styles.statItem}>
          <Zap size={32} color="#A78BFA" />
          <div style={styles.statNumber}>0</div>
          <div style={styles.statLabel}>Sub-Agents</div>
        </div>
      </div>

      {/* 3-Column Detail Grid */}
      <div style={styles.grid3}>
        {/* Services Detail */}
        <div style={styles.card}>
          <div style={styles.cardTitle}><Server size={18} /> Services</div>
          {['Clawdbot Gateway', 'Voice Server', 'File Server', 'Browser Proxy'].map(name => (
            <div key={name} style={styles.serviceRow}>
              <CheckCircle2 size={14} color="#10B981" />
              <span style={styles.serviceRowName}>{name}</span>
              <span style={styles.onlineBadge}>ONLINE</span>
            </div>
          ))}
        </div>

        {/* Scheduled Jobs */}
        <div style={styles.card}>
          <div style={styles.cardTitle}><Calendar size={18} /> Scheduled Jobs</div>
          {[
            { name: 'Morning Briefing', next: '12h' },
            { name: 'Heartbeat Check', next: '15m' },
            { name: 'Email Digest', next: '4h' },
          ].map(job => (
            <div key={job.name} style={styles.jobRow}>
              <span>{job.name}</span>
              <span style={styles.nextTime}>Next: {job.next}</span>
            </div>
          ))}
        </div>

        {/* Memory & Dumps */}
        <div style={styles.card}>
          <div style={styles.cardTitle}><MessageSquare size={18} /> Data Flow</div>
          <div style={styles.dataRow}>
            <span>MEMORY.md</span>
            <span style={styles.dataValue}>16.7 KB</span>
          </div>
          <div style={styles.dataRow}>
            <span>Telegram Dumps</span>
            <span style={styles.dataValue}>2.9 KB today</span>
          </div>
          <div style={styles.dataRow}>
            <span>Context Tokens</span>
            <span style={styles.dataValue}>45k / 200k</span>
          </div>
        </div>
      </div>

      {/* Sub-Agent Timeline */}
      <div style={styles.fullCard}>
        <div style={styles.cardTitle}><Terminal size={18} /> Sub-Agent Timeline</div>
        <div style={styles.emptyState}>No sub-agents active today</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, background: '#0F172A', minHeight: '100vh', color: '#F1F5F9' },
  loading: { padding: 48, textAlign: 'center', color: '#64748B' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  title: { fontSize: '1.5rem', fontWeight: 700 },
  badge: { background: '#38BDF8', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 },

  statsBar: { 
    display: 'flex', justifyContent: 'space-between', 
    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    borderRadius: 16, padding: 24, marginBottom: 24,
    border: '1px solid #334155'
  },
  statItem: { textAlign: 'center', flex: 1 },
  statNumber: { fontSize: '2.5rem', fontWeight: 700, color: '#F1F5F9', marginTop: 8 },
  statLabel: { fontSize: '0.8rem', color: '#64748B', marginTop: 4, fontWeight: 600 },

  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  card: { background: '#1E293B', borderRadius: 12, padding: 16, border: '1px solid #334155' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: '#F1F5F9' },

  serviceRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #334155' },
  serviceRowName: { flex: 1, fontSize: '0.85rem' },
  onlineBadge: { background: '#10B981', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700 },

  jobRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #334155', fontSize: '0.9rem' },
  nextTime: { color: '#64748B', fontSize: '0.8rem' },

  dataRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #334155' },
  dataValue: { color: '#10B981', fontWeight: 600 },

  fullCard: { background: '#1E293B', borderRadius: 12, padding: 16, border: '1px solid #334155' },
  emptyState: { textAlign: 'center', padding: 32, color: '#64748B' },
};
