'use client';

import NavWrapper from '../components/NavWrapper';
import { useState, useEffect } from 'react';
import { Server, Phone, Activity, Heart, Zap, Calendar, Terminal, Database } from 'lucide-react';

/* Option 2: Big Stats Bar + Detail Cards */

export default function System2Page() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  return (
    <NavWrapper activeTab="system2">
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>System Status</h1>
          <span style={styles.badge}>Option 2: Stats Bar</span>
        </div>

        {loading ? <div style={styles.loading}>Loading...</div> : (
          <>
            {/* Big Stats Bar */}
            <div style={styles.statsBar}>
              <div style={styles.stat}>
                <Server size={28} color="#10B981" />
                <div style={styles.statNum}>4/4</div>
                <div style={styles.statLbl}>Services</div>
              </div>
              <div style={styles.stat}>
                <Phone size={28} color="#38BDF8" />
                <div style={styles.statNum}>0</div>
                <div style={styles.statLbl}>Calls</div>
              </div>
              <div style={styles.stat}>
                <Activity size={28} color="#FBBF24" />
                <div style={styles.statNum}>22%</div>
                <div style={styles.statLbl}>Context</div>
              </div>
              <div style={styles.stat}>
                <Heart size={28} color="#F87171" />
                <div style={styles.statNum}>2h</div>
                <div style={styles.statLbl}>Heartbeat</div>
              </div>
              <div style={styles.stat}>
                <Zap size={28} color="#A78BFA" />
                <div style={styles.statNum}>0</div>
                <div style={styles.statLbl}>Agents</div>
              </div>
            </div>

            {/* 3-Column Grid */}
            <div style={styles.grid3}>
              <div style={styles.card}>
                <div style={styles.cardTitle}><Server size={16} /> Services</div>
                {['Gateway :18789', 'Voice :6060', 'Files :3456', 'Browser :18800'].map(s => (
                  <div key={s} style={styles.row}><span style={styles.dot} />{s}</div>
                ))}
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}><Calendar size={16} /> Scheduled</div>
                <div style={styles.row}>Morning Briefing <span style={styles.dim}>12h</span></div>
                <div style={styles.row}>Heartbeat Check <span style={styles.dim}>15m</span></div>
                <div style={styles.row}>Email Digest <span style={styles.dim}>4h</span></div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}><Database size={16} /> Memory</div>
                <div style={styles.row}>MEMORY.md <span style={styles.green}>16.7 KB</span></div>
                <div style={styles.row}>Telegram <span style={styles.green}>2.9 KB</span></div>
                <div style={styles.row}>Context <span style={styles.green}>45k/200k</span></div>
              </div>
            </div>

            {/* Timeline */}
            <div style={styles.card}>
              <div style={styles.cardTitle}><Terminal size={16} /> Sub-Agent Timeline</div>
              <div style={styles.empty}>No active sub-agents</div>
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
  badge: { background: '#38BDF8', padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 },

  statsBar: { display: 'flex', justifyContent: 'space-around', background: '#1E293B', borderRadius: 12, padding: 24, marginBottom: 20 },
  stat: { textAlign: 'center' },
  statNum: { fontSize: '2rem', fontWeight: 700, marginTop: 8 },
  statLbl: { fontSize: '0.75rem', color: '#64748B', marginTop: 4 },

  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  card: { background: '#1E293B', borderRadius: 10, padding: 16 },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 12, color: '#94A3B8' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155', fontSize: '0.9rem' },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#10B981', marginRight: 8, display: 'inline-block' },
  dim: { color: '#64748B', fontSize: '0.8rem' },
  green: { color: '#10B981', fontWeight: 600 },
  empty: { textAlign: 'center', padding: 24, color: '#64748B' },
};
