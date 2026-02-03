'use client';

import { useState } from 'react';
import DocsTab from './components/DocsTab';

type Tab = 'mc' | 'tasks' | 'memory' | 'captures' | 'docs' | 'people' | 'vvo';

const tabs: { id: Tab; name: string; icon: string }[] = [
  { id: 'mc', name: 'Mission Control', icon: '🎯' },
  { id: 'tasks', name: 'Tasks', icon: '✅' },
  { id: 'memory', name: 'Memory', icon: '🧠' },
  { id: 'captures', name: 'Captures', icon: '📸' },
  { id: 'docs', name: 'Docs', icon: '📖' },
  { id: 'people', name: 'People', icon: '👥' },
  { id: 'vvo', name: 'VVO', icon: '🎬' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('docs');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'mc':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Mission Control Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Placeholder bar charts */}
              <div className="content-pane p-4">
                <h3 className="text-lg font-semibold mb-3">Weekly Activity</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tasks</span>
                    <div className="w-24 bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full w-3/4"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Docs</span>
                    <div className="w-24 bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="content-pane p-4">
                <h3 className="text-lg font-semibold mb-3">Memory Usage</h3>
                <div className="text-3xl font-bold text-blue-400 mb-2">156</div>
                <div className="text-sm text-gray-400">Files indexed</div>
              </div>
              <div className="content-pane p-4">
                <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
                <div className="text-sm text-gray-400">Last updated: Now</div>
              </div>
            </div>
          </div>
        );
      case 'tasks':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Tasks</h2>
            <div className="content-pane p-4">
              <p className="text-gray-400">Task summary and links to Toodledo coming soon...</p>
            </div>
          </div>
        );
      case 'memory':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Memory</h2>
            <div className="content-pane p-4">
              <p className="text-gray-400">Memory management interface coming soon...</p>
            </div>
          </div>
        );
      case 'captures':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Captures</h2>
            <div className="content-pane p-4">
              <p className="text-gray-400">Capture management interface coming soon...</p>
            </div>
          </div>
        );
      case 'docs':
        return <DocsTab />;
      case 'people':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">People</h2>
            <div className="content-pane p-4">
              <p className="text-gray-400">People management interface coming soon...</p>
            </div>
          </div>
        );
      case 'vvo':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">VVO</h2>
            <div className="content-pane p-4">
              <p className="text-gray-400">VVO interface coming soon...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-blue-400">Mission Control</h1>
          <p className="text-sm text-gray-400">v1.0</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sidebar-item w-full text-left ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
          <div>Build: {new Date().toLocaleDateString()}</div>
          <div>Status: Online</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
}