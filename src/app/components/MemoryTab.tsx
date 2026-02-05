'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain, Search, Calendar, FileText, Clock, RefreshCw } from 'lucide-react';
import { format, subDays, parseISO, isToday, isYesterday } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   Mission Control — Memory Tab
   Daily notes + MEMORY.md long-term context + Search
   ═══════════════════════════════════════════════════════ */

const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:3456';

interface MemoryFile {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  tags: string[];
  title: string;
  type: string;
}

interface FileContent {
  filename: string;
  metadata: Record<string, unknown>;
  content: string;
  lastModified: string;
  source?: string;
}

type DataSource = 'live' | 'bundled' | 'checking';
type ViewFilter = 'all' | 'daily' | 'long-term';

function timeAgo(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function formatFileDate(filename: string): string {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const date = parseISO(match[1]);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEE, MMM d');
  }
  return filename.replace('.md', '');
}

function getMemoryIcon(filename: string): React.ReactNode {
  if (filename.match(/^\d{4}-\d{2}-\d{2}/)) {
    return <Calendar size={14} style={{ color: 'var(--amber)' }} />;
  }
  if (filename === 'MEMORY.md') {
    return <Brain size={14} style={{ color: 'var(--emerald)' }} />;
  }
  return <FileText size={14} style={{ color: 'var(--sky)' }} />;
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function fmtSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function MemoryTab() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [dataSource, setDataSource] = useState<DataSource>('checking');
  const [liveApiAvailable, setLiveApiAvailable] = useState<boolean | null>(null);

  // Filter to only memory files (daily logs, MEMORY.md, etc.)
  const memoryFiles = useMemo(() => {
    return files.filter(f => {
      // Include daily logs (YYYY-MM-DD.md)
      if (f.name.match(/^\d{4}-\d{2}-\d{2}\.md$/)) return true;
      // Include MEMORY.md
      if (f.name === 'MEMORY.md') return true;
      // Include files in memory/ directory
      if (f.path.startsWith('memory/') && !f.path.includes('voice-calls/') && !f.path.includes('telegram/')) return true;
      return false;
    });
  }, [files]);

  // Apply filters
  const filteredFiles = useMemo(() => {
    let result = memoryFiles;
    
    // Filter by view type
    if (viewFilter === 'daily') {
      result = result.filter(f => f.name.match(/^\d{4}-\d{2}-\d{2}\.md$/));
    } else if (viewFilter === 'long-term') {
      result = result.filter(f => !f.name.match(/^\d{4}-\d{2}-\d{2}\.md$/));
    }
    
    // Filter by search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) || 
        f.title.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q)
      );
    }
    
    // Sort: MEMORY.md first, then daily logs by date (newest first), then others
    return result.sort((a, b) => {
      if (a.name === 'MEMORY.md') return -1;
      if (b.name === 'MEMORY.md') return 1;
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });
  }, [memoryFiles, viewFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const dailyCount = memoryFiles.filter(f => f.name.match(/^\d{4}-\d{2}-\d{2}\.md$/)).length;
    const totalSize = memoryFiles.reduce((sum, f) => sum + f.size, 0);
    return { 
      total: memoryFiles.length, 
      daily: dailyCount, 
      other: memoryFiles.length - dailyCount,
      totalSize 
    };
  }, [memoryFiles]);

  const fetchFiles = useCallback(async () => {
    // Try live API
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${LIVE_API_URL}/api/files`, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.source === 'live') {
          setFiles(data.files);
          setDataSource('live');
          setLiveApiAvailable(true);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fall through to bundled
    }

    // Fallback: bundled /api/docs
    try {
      setLiveApiAvailable(false);
      const res = await fetch('/api/docs');
      const data = await res.json();
      setFiles(data.files || []);
      setDataSource('bundled');
    } catch (e) {
      console.error('Failed to fetch files:', e);
      setFiles([]);
      setDataSource('bundled');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setContentLoading(true);

    // Try live API first if available
    if (liveApiAvailable) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${LIVE_API_URL}/api/files/${encodeURIComponent(filePath)}`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          setFileContent(data);
          setContentLoading(false);
          return;
        }
      } catch {
        // Fall through to bundled
      }
    }

    // Fallback: bundled API
    const name = filePath.includes('/') ? filePath.split('/').pop()! : filePath;
    try {
      const res = await fetch(`/api/docs?file=${encodeURIComponent(name)}`);
      if (res.ok) {
        setFileContent(await res.json());
      } else {
        setFileContent(null);
      }
    } catch (e) {
      console.error('Failed to load file:', e);
      setFileContent(null);
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(() => {
      if (liveApiAvailable) fetchFiles();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchFiles, liveApiAvailable]);

  // Auto-select MEMORY.md or today's file on load
  useEffect(() => {
    if (!loading && !selectedFile && filteredFiles.length > 0) {
      // Try to find today's daily log
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayFile = filteredFiles.find(f => f.name === `${today}.md`);
      if (todayFile) {
        selectFile(todayFile.path);
      } else if (filteredFiles[0]) {
        selectFile(filteredFiles[0].path);
      }
    }
  }, [loading, filteredFiles, selectedFile]);

  if (loading) {
    return (
      <div className="memory-layout">
        <div className="content-empty">
          <Brain size={32} className="pulse" style={{ color: 'var(--emerald)', opacity: 0.5 }} />
          <span className="loading-text">Loading memory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-layout">
      {/* Sidebar */}
      <div className="memory-sidebar">
        {/* Header */}
        <div className="memory-sidebar__header">
          <div className="memory-sidebar__title">
            <Brain size={18} style={{ color: 'var(--emerald)' }} />
            <span>Memory</span>
          </div>
          <span className={`source-badge source-badge--${dataSource}`}>
            {dataSource === 'live' ? '🟢' : '🟡'}
          </span>
        </div>

        {/* Stats */}
        <div className="memory-stats">
          <div className="memory-stat">
            <span className="memory-stat__value">{stats.total}</span>
            <span className="memory-stat__label">Files</span>
          </div>
          <div className="memory-stat">
            <span className="memory-stat__value">{stats.daily}</span>
            <span className="memory-stat__label">Daily</span>
          </div>
          <div className="memory-stat">
            <span className="memory-stat__value">{fmtSize(stats.totalSize)}</span>
            <span className="memory-stat__label">Size</span>
          </div>
        </div>

        {/* Search */}
        <div className="memory-sidebar__search">
          <Search size={14} className="memory-sidebar__search-icon" />
          <input
            className="memory-sidebar__input"
            placeholder="Search memory..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter buttons */}
        <div className="memory-filters">
          {(['all', 'daily', 'long-term'] as ViewFilter[]).map(filter => (
            <button
              key={filter}
              className={`memory-filter ${viewFilter === filter ? 'memory-filter--active' : ''}`}
              onClick={() => setViewFilter(filter)}
            >
              {filter === 'all' ? 'All' : filter === 'daily' ? 'Daily' : 'Long-term'}
            </button>
          ))}
        </div>

        {/* File list */}
        <div className="memory-sidebar__list">
          {filteredFiles.map(file => (
            <div
              key={file.path}
              onClick={() => selectFile(file.path)}
              className={`memory-item ${selectedFile === file.path ? 'memory-item--selected' : ''}`}
            >
              {getMemoryIcon(file.name)}
              <div className="memory-item__info">
                <div className="memory-item__name">
                  {file.name.match(/^\d{4}-\d{2}-\d{2}\.md$/) 
                    ? formatFileDate(file.name)
                    : file.name.replace('.md', '')}
                </div>
                <div className="memory-item__meta">
                  <span>{fmtSize(file.size)}</span>
                  <span>·</span>
                  <span>{timeAgo(file.lastModified)}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredFiles.length === 0 && (
            <div className="content-empty" style={{ padding: 20 }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                {searchTerm ? 'No files match' : 'No memory files'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="memory-content">
        {selectedFile && fileContent ? (
          <>
            <div className="memory-content__header">
              <div className="memory-content__title">
                {getMemoryIcon(fileContent.filename)}
                <span>{fileContent.filename.replace('.md', '')}</span>
                {fileContent.source === 'live' && (
                  <span className="source-badge source-badge--live" style={{ fontSize: 10 }}>LIVE</span>
                )}
              </div>
              <div className="memory-content__meta">
                <span>{fmtSize(fileContent.content?.length || 0)}</span>
                <span>·</span>
                <span>{wordCount(fileContent.content || '').toLocaleString()} words</span>
                <span>·</span>
                <Clock size={12} />
                <span>{timeAgo(fileContent.lastModified)}</span>
              </div>
            </div>
            <div className="memory-content__body">
              {contentLoading ? (
                <div className="content-empty">
                  <span className="loading-text">Loading...</span>
                </div>
              ) : (
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {fileContent.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="content-empty">
            <Brain size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
            <span>Select a memory file</span>
          </div>
        )}
      </div>
    </div>
  );
}
