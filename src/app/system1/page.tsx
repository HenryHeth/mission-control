'use client';

import NavWrapper from '../components/NavWrapper';
import { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Phone, Calendar, MessageSquare, 
  Heart, Activity, Terminal, RefreshCw, Server
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/* Option 1: Horizontal Services + Compact Grid */

export default function System1Page() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 300);
  }, []);

  const services = [
    { name: 'Clawdbot Gateway', status: 'online', port: '18789' },
    { name: 'Voice Server', status: 'online', port: '6060' },
    { name: 'File Server', status: 'online', port: '3456' },
    { name: 'Browser Proxy', status: 'online', port: '18800' },
  ];

  return (
    <NavWrapper activeTab="system1">
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>System Status</h1>
          <span style={styles.badge}>Option 1: Horizontal</span>
        </div>

        {loading ? <div style={styles.loading}>Loading...</div> : (
          <>
            {/* Services Row */}
            <div style={styles.servicesRow}>
              {services.map(s => (
                <div key={s.name} style={{...styles.serviceCard, borderColor: s.status === 'online' ? '#10B981' : '#F87171'}}>
                  <CheckCircle2 size={20} color="#10B981" />
                  <div style={styles.serviceName}>{s.name}</div>
                  <div style={styles.servicePort}>:{s.port}</div>
                </div>
              ))}
            </div>

            {/* Stats Row */}
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <Phone size={18} color="#38BDF8" />
                <div style={styles.statValue}>0</div>
                <div style={styles.statLabel}>Active Calls</div>
              </div>
              <div style={styles.statCard}>
                <Heart size={18} color="#F87171" />
                <div style={styles.statValue}>2h ago</div>
                <div style={styles.statLabel}>Heartbeat</div>
              </div>
              <div style={styles.statCard}>
                <Activity size={18} color="#FBBF24" />
                <div style={styles.statValue}>22%</div>
                <div style={styles.statLabel}>Context</div>
              </div>
              <div style={styles.statCard}>
                <MessageSquare size={18} color="#10B981" />
                <div style={styles.statValue}>2.9 KB</div>
                <div style={styles.statLabel}>TG Dump</div>
              </div>
            </div>

            {/* Jobs & Timeline */}
            <div style={styles.bottomGrid}>
              <div style={styles.card}>
                <div style={styles.cardTitle}><Calendar size={16} /> Scheduled Jobs</div>
                <div style={styles.jobList}>
                  <div style={styles.job}><span>Morning Briefing</span><span style={styles.jobTime}>12h</span></div>
                  <div style={styles.job}><span>Heartbeat Check</span><span style={styles.jobTime}>15m</span></div>
                  <div style={styles.job}><span>Email Digest</span><span style={styles.jobTime}>4h</span></div>
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}><Terminal size={16} /> Sub-Agents</div>
                <div style={styles.empty}>No active sub-agents</div>
              </div>
            </div>
          </>
        )}
      </div>
    </NavWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, background: '#0F172A', minHeight: '100vh', color: '#F1F5F9' },
  loading: { textAlign: 'center', padding: 48, color: '#64748B' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  title: { fontSize: '1.4rem', fontWeight: 700 },
  badge: { background: '#10B981', padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 },

  servicesRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  serviceCard: { background: '#1E293B', borderRadius: 10, padding: 16, textAlign: 'center', borderBottom: '3px solid' },
  serviceName: { fontWeight: 600, fontSize: '0.85rem', marginTop: 8 },
  servicePort: { color: '#64748B', fontSize: '0.75rem' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: '#1E293B', borderRadius: 10, padding: 16, textAlign: 'center' },
  statValue: { fontSize: '1.3rem', fontWeight: 700, marginTop: 8 },
  statLabel: { fontSize: '0.7rem', color: '#64748B', marginTop: 4 },

  bottomGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  card: { background: '#1E293B', borderRadius: 10, padding: 16 },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 12, color: '#94A3B8' },
  jobList: { display: 'flex', flexDirection: 'column', gap: 8 },
  job: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' },
  jobTime: { color: '#64748B', fontSize: '0.8rem' },
  empty: { textAlign: 'center', padding: 24, color: '#64748B' },
};
