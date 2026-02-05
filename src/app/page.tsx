'use client';

import { useState } from 'react';
import DocsTab from './components/DocsTab';
import TasksTab from './components/TasksTab';

type Tab = 'tasks' | 'projects' | 'memory' | 'captures' | 'docs' | 'people';

const tabs: { id: Tab; name: string; icon: string }[] = [
  { id: 'tasks', name: 'Tasks', icon: '✅' },
  { id: 'projects', name: 'Projects', icon: '📂' },
  { id: 'memory', name: 'Memory', icon: '🧠' },
  { id: 'captures', name: 'Captures', icon: '📸' },
  { id: 'docs', name: 'Docs', icon: '📄' },
  { id: 'people', name: 'People', icon: '👥' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');

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
        {activeTab === 'docs' && <DocsTab />}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab !== 'docs' && activeTab !== 'tasks' && (
          <div className="docs-layout">
            <div className="content-empty">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>
                  {tabs.find(t => t.id === activeTab)?.icon}
                </div>
                <div>{tabs.find(t => t.id === activeTab)?.name} coming soon...</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
