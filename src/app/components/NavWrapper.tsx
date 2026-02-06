'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { 
  Zap, CheckSquare, Brain, Camera, FileText, 
  Settings, Target, LucideIcon
} from 'lucide-react';

type Tab = 'dashboard' | 'tasks' | 'memory' | 'captures' | 'docs' | 'vvo' | 'system';

interface TabConfig {
  id: Tab;
  name: string;
  icon: LucideIcon;
  path: string;
  color: string;
}

const tabs: TabConfig[] = [
  { id: 'dashboard', name: 'Mission Control', icon: Zap, path: '/', color: 'var(--amber)' },
  { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/velocity', color: 'var(--emerald)' },
  { id: 'vvo', name: 'VVO', icon: Target, path: '/vvo', color: 'var(--amber)' },
  { id: 'memory', name: 'Memory', icon: Brain, path: '/memory', color: 'var(--emerald)' },
  { id: 'captures', name: 'Captures', icon: Camera, path: '/captures', color: 'var(--sky)' },
  { id: 'docs', name: 'Docs', icon: FileText, path: '/docs', color: 'var(--text-muted)' },
  { id: 'system', name: 'System', icon: Settings, path: '/system', color: 'var(--sky)' },
];

interface NavWrapperProps {
  children: ReactNode;
  activeTab: Tab;
}

export default function NavWrapper({ children, activeTab }: NavWrapperProps) {
  const router = useRouter();

  const handleTabClick = (path: string) => {
    router.push(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Navigation Bar - Dark Bento Style */}
      <div className="nav-bar">
        <div className="nav-bar__logo">
          <Zap size={18} style={{ color: 'var(--amber)' }} />
          <span className="nav-bar__logo-text">Mission Control</span>
        </div>

        <div className="nav-bar__tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.path)}
                className={`nav-tab ${isActive ? 'nav-tab--active' : ''}`}
              >
                <Icon 
                  size={16} 
                  style={{ color: isActive ? tab.color : 'var(--text-dim)' }}
                />
                <span className={isActive ? 'nav-tab__text--active' : ''}>{tab.name}</span>
              </button>
            );
          })}
        </div>

        <div className="nav-bar__actions">
          <button className="nav-action-btn">
            <span className="nav-action-btn__dot" />
            Ping Henry
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {children}
      </div>
    </div>
  );
}
