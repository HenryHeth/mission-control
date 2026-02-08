'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Phone, Calendar, MessageSquare, 
  Heart, Activity, Terminal, Server, Database, FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   System Layout Option 3: Sidebar + Main Content
   - Left sidebar: Services (narrow, always visible)
   - Right main: All other content in 2-column grid
   ═══════════════════════════════════════════════════════ */

export default function System3Page() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div style={styles.loading}>Loading...</div>;

  const services = [
    { name: 'Gateway', port: '18789', status: 'online' },
    { name: 'Voice', port: '6060', status: 'online' },
    { name: 'Files', port: '3456', status: 'online' },
    { name: 'Browser', port: '18800', status: 'online' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚡ System Status - Option 3</h1>
        <span style={styles.badge}>Sidebar Layout</span>
      </div>

      <div style={styles.layout}>
        {/* Left Sidebar: Services */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>
            <Server size={16} /> Services
          </div>
          {services.map(s => (
            <div key={s.name} style={styles.sidebarItem}>
              <CheckCircle2 size={14} color="#10B981" />
              <div style={styles.sidebarItemInfo}>
                <div style={styles.sidebarItemName}>{s.name}</div>
                <div style={styles.sidebarItemPort}>:{s.port}</div>
              </div>
            </div>
          ))}
          <div style={styles.sidebarStatus}>
            4/4 Online
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.main}>
          {/* Top Row: Voice + Heartbeat + Context */}
          <div style={styles.topRow}>
            <div style={styles.miniCard}>
              <Phone size={20} color="#38BDF8" />
              <div style={styles.miniValue}>0</div>
              <div style={styles.miniLabel}>Calls</div>
            </div>
            <div style={styles.miniCard}>
              <Heart size={20} color="#F87171" />
              <div style={styles.miniValue}>2h</div>
              <div style={styles.miniLabel}>Heartbeat</div>
            </div>
            <div style={styles.miniCard}>
              <Activity size={20} color="#FBBF24" />
              <div style={styles.miniValue}>22%</div>
              <div style={styles.miniLabel}>Context</div>
            </div>
            <div style={styles.miniCard}>
              <MessageSquare size={20} color="#10B981" />
              <div style={styles.miniValue}>2.9K</div>
              <div style={styles.miniLabel}>TG Dump</div>
            </div>
          </div>

          {/* 2-Column Grid */}
          <div style={styles.grid2}>
            {/* Scheduled Jobs */}
            <div style={styles.card}>
              <div style={styles.cardTitle}><Calendar size={16} /> Scheduled Jobs</div>
              <table style={styles.table}>
                <tbody>
                  <tr style={styles.tableRow}>
                    <td>Morning Briefing</td>
                    <td style={styles.successBadge}>SUCCESS</td>
                    <td style={styles.timeCol}>Next: 12h</td>
                  </tr>
                  <tr style={styles.tableRow}>
                    <td>Heartbeat Check</td>
                    <td style={styles.successBadge}>SUCCESS</td>
                    <td style={styles.timeCol}>Next: 15m</td>
                  </tr>
                  <tr style={styles.tableRow}>
                    <td>Email Digest</td>
                    <td style={styles.successBadge}>SUCCESS</td>
                    <td style={styles.timeCol}>Next: 4h</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Memory Flow */}
            <div style={styles.card}>
              <div style={styles.cardTitle}><Database size={16} /> Memory Flow</div>
              <div style={styles.memoryItem}>
                <FileText size={14} color="#38BDF8" />
                <span>MEMORY.md</span>
                <span style={styles.memorySize}>16.7 KB</span>
              </div>
              <div style={styles.memoryItem}>
                <MessageSquare size={14} color="#10B981" />
                <span>memory/telegram/</span>
                <span style={styles.memorySize}>2.9 KB</span>
              </div>
              <div style={styles.contextBar}>
                <div style={styles.contextLabel}>Context: 45k / 200k tokens</div>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFill, width: '22%'}} />
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Agent Timeline */}
          <div style={styles.card}>
            <div style={styles.cardTitle}><Terminal size={16} /> Sub-Agent Timeline</div>
            <div style={styles.emptyState}>No sub-agents active today</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, background: '#0F172A', minHeight: '100vh', color: '#F1F5F9' },
  loading: { padding: 48, textAlign: 'center', color: '#64748B' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  title: { fontSize: '1.5rem', fontWeight: 700 },
  badge: { background: '#A78BFA', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 },

  layout: { display: 'flex', gap: 24 },
  
  sidebar: { 
    width: 180, flexShrink: 0,
    background: '#1E293B', borderRadius: 12, padding: 16,
    border: '1px solid #334155', height: 'fit-content'
  },
  sidebarTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 16, color: '#94A3B8' },
  sidebarItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #334155' },
  sidebarItemInfo: { flex: 1 },
  sidebarItemName: { fontWeight: 600, fontSize: '0.9rem' },
  sidebarItemPort: { color: '#64748B', fontSize: '0.75rem' },
  sidebarStatus: { marginTop: 16, textAlign: 'center', color: '#10B981', fontWeight: 700, fontSize: '0.85rem' },

  main: { flex: 1 },
  
  topRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 },
  miniCard: { 
    background: '#1E293B', borderRadius: 10, padding: 16, textAlign: 'center',
    border: '1px solid #334155'
  },
  miniValue: { fontSize: '1.5rem', fontWeight: 700, marginTop: 8, color: '#F1F5F9' },
  miniLabel: { fontSize: '0.75rem', color: '#64748B', marginTop: 4 },

  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 },
  card: { background: '#1E293B', borderRadius: 12, padding: 16, border: '1px solid #334155' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 12, color: '#F1F5F9' },

  table: { width: '100%', borderCollapse: 'collapse' },
  tableRow: { borderBottom: '1px solid #334155' },
  successBadge: { color: '#10B981', fontWeight: 700, fontSize: '0.7rem', padding: '8px 0' },
  timeCol: { color: '#64748B', fontSize: '0.8rem', textAlign: 'right', padding: '8px 0' },

  memoryItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #334155' },
  memorySize: { marginLeft: 'auto', color: '#10B981', fontWeight: 600 },
  contextBar: { marginTop: 12 },
  contextLabel: { fontSize: '0.8rem', color: '#94A3B8', marginBottom: 6 },
  progressBar: { height: 8, background: '#334155', borderRadius: 4 },
  progressFill: { height: '100%', background: '#FBBF24', borderRadius: 4 },

  emptyState: { textAlign: 'center', padding: 24, color: '#64748B' },
};
