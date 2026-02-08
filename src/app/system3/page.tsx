'use client';

import NavWrapper from '../components/NavWrapper';
import { useState, useEffect } from 'react';
import { Server, Phone, Activity, Heart, Calendar, Terminal, Database, CheckCircle2 } from 'lucide-react';

/* Option 3: Sidebar Layout */

export default function System3Page() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  return (
    <NavWrapper activeTab="system3">
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>System Status</h1>
          <span style={styles.badge}>Option 3: Sidebar</span>
        </div>

        {loading ? <div style={styles.loading}>Loading...</div> : (
          <div style={styles.layout}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
              <div style={styles.sideTitle}><Server size={14} /> Services</div>
              {[
                { name: 'Gateway', port: '18789' },
                { name: 'Voice', port: '6060' },
                { name: 'Files', port: '3456' },
                { name: 'Browser', port: '18800' },
              ].map(s => (
                <div key={s.name} style={styles.sideItem}>
                  <CheckCircle2 size={12} color="#10B981" />
                  <span>{s.name}</span>
                  <span style={styles.port}>:{s.port}</span>
                </div>
              ))}
              <div style={styles.sideStatus}>4/4 Online</div>
            </div>

            {/* Main */}
            <div style={styles.main}>
              {/* Quick Stats */}
              <div style={styles.quickStats}>
                <div style={styles.qs}><Phone size={16} color="#38BDF8" /><span>0 calls</span></div>
                <div style={styles.qs}><Heart size={16} color="#F87171" /><span>2h ago</span></div>
                <div style={styles.qs}><Activity size={16} color="#FBBF24" /><span>22%</span></div>
              </div>

              {/* 2-Col Grid */}
              <div style={styles.grid2}>
                <div style={styles.card}>
                  <div style={styles.cardTitle}><Calendar size={14} /> Jobs</div>
                  <div style={styles.row}>Morning Briefing <span style={styles.dim}>12h</span></div>
                  <div style={styles.row}>Heartbeat Check <span style={styles.dim}>15m</span></div>
                  <div style={styles.row}>Email Digest <span style={styles.dim}>4h</span></div>
                </div>
                <div style={styles.card}>
                  <div style={styles.cardTitle}><Database size={14} /> Memory</div>
                  <div style={styles.row}>MEMORY.md <span style={styles.green}>16.7 KB</span></div>
                  <div style={styles.row}>Telegram <span style={styles.green}>2.9 KB</span></div>
                  <div style={styles.row}>Context <span style={styles.green}>22%</span></div>
                </div>
              </div>

              {/* Timeline */}
              <div style={styles.card}>
                <div style={styles.cardTitle}><Terminal size={14} /> Sub-Agents</div>
                <div style={styles.empty}>No active sub-agents</div>
              </div>
            </div>
          </div>
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
  badge: { background: '#A78BFA', padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 },

  layout: { display: 'flex', gap: 20 },

  sidebar: { width: 160, background: '#1E293B', borderRadius: 10, padding: 14, flexShrink: 0 },
  sideTitle: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: '#94A3B8' },
  sideItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', borderBottom: '1px solid #334155', fontSize: '0.8rem' },
  port: { marginLeft: 'auto', color: '#64748B', fontSize: '0.7rem' },
  sideStatus: { marginTop: 12, textAlign: 'center', color: '#10B981', fontWeight: 700, fontSize: '0.8rem' },

  main: { flex: 1 },

  quickStats: { display: 'flex', gap: 16, marginBottom: 16 },
  qs: { display: 'flex', alignItems: 'center', gap: 8, background: '#1E293B', padding: '10px 16px', borderRadius: 8, fontSize: '0.85rem' },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  card: { background: '#1E293B', borderRadius: 10, padding: 14 },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: '#94A3B8' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #334155', fontSize: '0.85rem' },
  dim: { color: '#64748B', fontSize: '0.75rem' },
  green: { color: '#10B981', fontWeight: 600, fontSize: '0.85rem' },
  empty: { textAlign: 'center', padding: 20, color: '#64748B', fontSize: '0.85rem' },
};
