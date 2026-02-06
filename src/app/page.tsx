'use client';

import { useState } from 'react';
import DashboardTab from './components/DashboardTab';
import DocsTab from './components/DocsTab';
import TasksTab from './components/TasksTab';
import MemoryTab from './components/MemoryTab';
import CapturesTab from './components/CapturesTab';
import SystemStatusTab from './components/SystemStatusTab';

type Tab = 'dashboard' | 'tasks' | 'memory' | 'captures' | 'docs' | 'system';

const tabs: { id: Tab; name: string; icon: string }[] = [
  { id: 'dashboard', name: 'Mission Control', icon: '❖' },
  { id: 'tasks', name: 'Tasks', icon: '✅' },
  { id: 'memory', name: 'Memory', icon: '🧠' },
  { id: 'captures', name: 'Captures', icon: '📸' },
  { id: 'docs', name: 'Docs', icon: '📄' },
  { id: 'system', name: 'System', icon: '🔧' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

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
              onClick={() => setActiveTab(tab.id)}
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
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'memory' && <MemoryTab />}
        {activeTab === 'captures' && <CapturesTab />}
        {activeTab === 'docs' && <DocsTab />}
        {activeTab === 'system' && <SystemStatusTab />}
      </div>
    </div>
  );
}
