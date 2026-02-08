'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Phone, Calendar, MessageSquare, 
  Heart, Database, Activity, Terminal, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   System Layout Option 1: Horizontal Services + Compact Grid
   - Services as 4 horizontal cards in top row
   - Everything else in tight 4-column grid
   ═══════════════════════════════════════════════════════ */

interface ServiceData {
  name: string;
  status: 'online' | 'offline';
  port?: string;
}

interface SystemData {
  services: ServiceData[];
  voiceCalls: { active: number; total: number };
  heartbeat: { lastTime: string; status: string };
  context: { percent: number; tokens: number; max: number };
  telegram: { lastDump: string; size: string };
  cronJobs: { name: string; status: string; next: string }[];
}

export default function System1Page() {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/system-status');
        if (res.ok) {
          const d = await res.json();
          setData({
            services: d.services || [],
            voiceCalls: { active: 0, total: d.voiceMetrics?.totalCalls || 0 },
            heartbeat: { 
              lastTime: d.heartbeatHealth?.lastHeartbeat || 'Unknown',
              status: d.heartbeatHealth?.status || 'unknown'
            },
            context: {
              percent: d.contextUsage?.percentUsed || 22,
              tokens: d.contextUsage?.currentTokens || 45000,
              max: d.contextUsage?.maxTokens || 200000
            },
            telegram: {
              lastDump: d.telegramDumps?.lastDump?.lastModified || 'Unknown',
              size: d.telegramDumps?.lastDump?.size ? `${(d.telegramDumps.lastDump.size / 1024).toFixed(1)} KB` : '0 KB'
            },
            cronJobs: d.cronJobs || []
          });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div style={styles.loading}>Loading...</div>;

  const services = data?.services || [
    { name: 'Clawdbot Gateway', status: 'online', port: '18789' },
    { name: 'Voice Server', status: 'online', port: '6060' },
    { name: 'File Server', status: 'online', port: '3456' },
    { name: 'Browser Proxy', status: 'online', port: '18800' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚡ System Status - Option 1</h1>
        <span style={styles.badge}>Horizontal Services</span>
      </div>

      {/* Row 1: Services as horizontal cards */}
      <div style={styles.servicesRow}>
        {services.map((s: ServiceData) => (
          <div key={s.name} style={{...styles.serviceCard, borderColor: s.status === 'online' ? '#10B981' : '#F87171'}}>
            {s.status === 'online' ? <CheckCircle2 size={24} color="#10B981" /> : <XCircle size={24} color="#F87171" />}
            <div style={styles.serviceName}>{s.name}</div>
            <div style={styles.servicePort}>{s.port}</div>
            <span style={{...styles.statusBadge, background: s.status === 'online' ? '#10B981' : '#F87171'}}>
              {s.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Row 2: Compact 4-column grid */}
      <div style={styles.grid4}>
        {/* Voice */}
        <div style={styles.card}>
          <div style={styles.cardHeader}><Phone size={16} /> Voice Server</div>
          <div style={styles.bigNumber}>{data?.voiceCalls.active || 0}</div>
          <div style={styles.cardLabel}>Active Calls</div>
        </div>

        {/* Heartbeat */}
        <div style={styles.card}>
          <div style={styles.cardHeader}><Heart size={16} /> Heartbeat</div>
          <div style={styles.cardValue}>{data?.heartbeat.status || 'Healthy'}</div>
          <div style={styles.cardLabel}>{data?.heartbeat.lastTime ? formatDistanceToNow(new Date(data.heartbeat.lastTime), { addSuffix: true }) : 'Unknown'}</div>
        </div>

        {/* Context */}
        <div style={styles.card}>
          <div style={styles.cardHeader}><Activity size={16} /> Context</div>
          <div style={styles.bigNumber}>{data?.context.percent || 22}%</div>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${data?.context.percent || 22}%`}} />
          </div>
        </div>

        {/* Telegram */}
        <div style={styles.card}>
          <div style={styles.cardHeader}><MessageSquare size={16} /> Telegram</div>
          <div style={styles.cardValue}>{data?.telegram.size || '2.9 KB'}</div>
          <div style={styles.cardLabel}>Last dump</div>
        </div>
      </div>

      {/* Row 3: Scheduled Jobs */}
      <div style={styles.fullCard}>
        <div style={styles.cardHeader}><Calendar size={16} /> Scheduled Jobs</div>
        <div style={styles.jobsGrid}>
          {(data?.cronJobs || [
            { name: 'Morning Briefing', status: 'success', next: 'in 12 hours' },
            { name: 'Heartbeat Check', status: 'success', next: 'in 15 minutes' },
            { name: 'Email Digest', status: 'success', next: 'in 4 hours' },
          ]).map((job: { name: string; status: string; next: string }) => (
            <div key={job.name} style={styles.jobRow}>
              <span style={styles.jobName}>{job.name}</span>
              <span style={{...styles.jobStatus, color: job.status === 'success' ? '#10B981' : '#FBBF24'}}>{job.status}</span>
              <span style={styles.jobNext}>{job.next}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Sub-Agent Timeline */}
      <div style={styles.fullCard}>
        <div style={styles.cardHeader}><Terminal size={16} /> Sub-Agent Timeline</div>
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
  badge: { background: '#10B981', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 },
  
  servicesRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  serviceCard: { 
    background: '#1E293B', borderRadius: 12, padding: 20, textAlign: 'center',
    border: '2px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
  },
  serviceName: { fontWeight: 700, fontSize: '0.9rem' },
  servicePort: { color: '#64748B', fontSize: '0.75rem' },
  statusBadge: { color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 },

  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  card: { background: '#1E293B', borderRadius: 12, padding: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: '#94A3B8' },
  bigNumber: { fontSize: '2rem', fontWeight: 700, color: '#10B981' },
  cardValue: { fontSize: '1.25rem', fontWeight: 700, color: '#F1F5F9' },
  cardLabel: { fontSize: '0.75rem', color: '#64748B', marginTop: 4 },
  progressBar: { height: 6, background: '#334155', borderRadius: 3, marginTop: 8 },
  progressFill: { height: '100%', background: '#FBBF24', borderRadius: 3 },

  fullCard: { background: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 16 },
  jobsGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  jobRow: { display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #334155' },
  jobName: { flex: 1, fontWeight: 600 },
  jobStatus: { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' },
  jobNext: { color: '#64748B', fontSize: '0.8rem', marginLeft: 16 },
  
  emptyState: { textAlign: 'center', padding: 32, color: '#64748B' },
};
