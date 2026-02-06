'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

type Tab = 'dashboard' | 'tasks' | 'memory' | 'captures' | 'docs' | 'system';

const tabs: { id: Tab; name: string; icon: string; path: string }[] = [
  { id: 'dashboard', name: 'Mission Control', icon: '❖', path: '/' },
  { id: 'tasks', name: 'Tasks', icon: '✅', path: '/velocity' },
  { id: 'memory', name: 'Memory', icon: '🧠', path: '/memory' },
  { id: 'captures', name: 'Captures', icon: '📸', path: '/captures' },
  { id: 'docs', name: 'Docs', icon: '📄', path: '/docs' },
  { id: 'system', name: 'System', icon: '🔧', path: '/system' },
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
      {/* Top Navigation Bar */}
      <div className="top-nav">
        <div className="top-nav__logo">
          <span className="top-nav__logo-icon">❖</span>
          <span className="top-nav__logo-text">Mission Control</span>
        </div>

        <div className="top-nav__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              className={`top-nav__tab ${activeTab === tab.id ? 'top-nav__tab--active' : ''}`}
            >
              <span className="top-nav__tab-icon">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        <div className="top-nav__actions">
          <button className="top-nav__action">⏸ Pause</button>
          <button className="top-nav__action">Ping Henry</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {children}
      </div>
    </div>
  );
}
