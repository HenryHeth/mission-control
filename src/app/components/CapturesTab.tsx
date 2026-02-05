'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, Phone, Search, Calendar, Clock, Filter, RefreshCw } from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isSameDay } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   Mission Control — Captures Tab
   Telegram logs + Voice call transcripts
   ═══════════════════════════════════════════════════════ */

const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:3456';

interface CaptureFile {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  tags: string[];
  title: string;
  type: string;
  captureType: 'telegram' | 'voice-call';
  timestamp?: Date;
}

interface FileContent {
  filename: string;
  metadata: Record<string, unknown>;
  content: string;
  lastModified: string;
  source?: string;
}

type DataSource = 'live' | 'bundled' | 'checking';
type CaptureFilter = 'all' | 'telegram' | 'voice-calls';

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

function parseTimestamp(filename: string): Date | null {
  // Voice call: 2026-02-05T17-19-09.processed.txt
  const voiceMatch = filename.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/);
  if (voiceMatch) {
    const [, y, m, d, h, min, s] = voiceMatch;
    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
  }
  
  // Telegram: 2026-02-04.md
  const telegramMatch = filename.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
  if (telegramMatch) {
    return parseISO(telegramMatch[1]);
  }
  
  return null;
}

function formatCaptureDate(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

function formatCaptureTime(date: Date): string {
  return format(date, 'h:mm a');
}

function fmtSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function getDuration(words: number): string {
  // Rough estimate: 150 words per minute speaking
  const mins = Math.ceil(words / 150);
  if (mins < 1) return '< 1 min';
  return `~${mins} min`;
}

export default function CapturesTab() {
  const [files, setFiles] = useState<CaptureFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [captureFilter, setCaptureFilter] = useState<CaptureFilter>('all');
  const [dataSource, setDataSource] = useState<DataSource>('checking');
  const [liveApiAvailable, setLiveApiAvailable] = useState<boolean | null>(null);

  // Process files to identify captures
  const captureFiles = useMemo(() => {
    const captures: CaptureFile[] = [];
    
    for (const f of files) {
      // Voice calls
      if (f.path.includes('voice-calls/') && f.name.endsWith('.txt')) {
        const timestamp = parseTimestamp(f.name);
        captures.push({
          ...f,
          captureType: 'voice-call',
          timestamp: timestamp || new Date(f.lastModified),
        });
      }
      // Telegram logs
      else if (f.path.includes('telegram/') && f.name.endsWith('.md')) {
        const timestamp = parseTimestamp(f.name);
        captures.push({
          ...f,
          captureType: 'telegram',
          timestamp: timestamp || new Date(f.lastModified),
        });
      }
    }
    
    // Sort by timestamp (newest first)
    return captures.sort((a, b) => 
      (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
    );
  }, [files]);

  // Apply filters
  const filteredCaptures = useMemo(() => {
    let result = captureFiles;
    
    if (captureFilter === 'telegram') {
      result = result.filter(f => f.captureType === 'telegram');
    } else if (captureFilter === 'voice-calls') {
      result = result.filter(f => f.captureType === 'voice-call');
    }
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [captureFiles, captureFilter, searchTerm]);

  // Group by date
  const groupedCaptures = useMemo(() => {
    const groups: { date: string; captures: CaptureFile[] }[] = [];
    let currentDate = '';
    
    for (const capture of filteredCaptures) {
      const dateStr = capture.timestamp ? format(capture.timestamp, 'yyyy-MM-dd') : 'unknown';
      
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ 
          date: capture.timestamp ? formatCaptureDate(capture.timestamp) : 'Unknown',
          captures: [] 
        });
      }
      
      groups[groups.length - 1].captures.push(capture);
    }
    
    return groups;
  }, [filteredCaptures]);

  // Stats
  const stats = useMemo(() => ({
    total: captureFiles.length,
    telegram: captureFiles.filter(f => f.captureType === 'telegram').length,
    voiceCalls: captureFiles.filter(f => f.captureType === 'voice-call').length,
    totalSize: captureFiles.reduce((sum, f) => sum + f.size, 0),
  }), [captureFiles]);

  const fetchFiles = useCallback(async () => {
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
      // Fall through
    }

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
        // Fall through
      }
    }

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

  if (loading) {
    return (
      <div className="captures-layout">
        <div className="content-empty">
          <MessageSquare size={32} className="pulse" style={{ color: 'var(--sky)', opacity: 0.5 }} />
          <span className="loading-text">Loading captures...</span>
        </div>
      </div>
    );
  }

  const selectedCapture = captureFiles.find(f => f.path === selectedFile);

  return (
    <div className="captures-layout">
      {/* Sidebar */}
      <div className="captures-sidebar">
        {/* Header */}
        <div className="captures-sidebar__header">
          <div className="captures-sidebar__title">
            <MessageSquare size={18} style={{ color: 'var(--sky)' }} />
            <span>Captures</span>
          </div>
          <span className={`source-badge source-badge--${dataSource}`}>
            {dataSource === 'live' ? '🟢' : '🟡'}
          </span>
        </div>

        {/* Stats */}
        <div className="captures-stats">
          <div className="captures-stat">
            <MessageSquare size={14} style={{ color: 'var(--sky)' }} />
            <span className="captures-stat__value">{stats.telegram}</span>
            <span className="captures-stat__label">Telegram</span>
          </div>
          <div className="captures-stat">
            <Phone size={14} style={{ color: 'var(--emerald)' }} />
            <span className="captures-stat__value">{stats.voiceCalls}</span>
            <span className="captures-stat__label">Calls</span>
          </div>
        </div>

        {/* Search */}
        <div className="captures-sidebar__search">
          <Search size={14} className="captures-sidebar__search-icon" />
          <input
            className="captures-sidebar__input"
            placeholder="Search captures..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter buttons */}
        <div className="captures-filters">
          {(['all', 'telegram', 'voice-calls'] as CaptureFilter[]).map(filter => (
            <button
              key={filter}
              className={`captures-filter ${captureFilter === filter ? 'captures-filter--active' : ''}`}
              onClick={() => setCaptureFilter(filter)}
            >
              {filter === 'all' ? 'All' : filter === 'telegram' ? '💬 Telegram' : '📞 Calls'}
            </button>
          ))}
        </div>

        {/* Grouped capture list */}
        <div className="captures-sidebar__list">
          {groupedCaptures.map(group => (
            <div key={group.date} className="captures-group">
              <div className="captures-group__header">{group.date}</div>
              {group.captures.map(capture => (
                <div
                  key={capture.path}
                  onClick={() => selectFile(capture.path)}
                  className={`capture-item ${selectedFile === capture.path ? 'capture-item--selected' : ''}`}
                >
                  {capture.captureType === 'telegram' ? (
                    <MessageSquare size={14} style={{ color: 'var(--sky)', flexShrink: 0 }} />
                  ) : (
                    <Phone size={14} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  )}
                  <div className="capture-item__info">
                    <div className="capture-item__name">
                      {capture.captureType === 'telegram' 
                        ? 'Telegram Log'
                        : `Call ${capture.timestamp ? formatCaptureTime(capture.timestamp) : ''}`}
                    </div>
                    <div className="capture-item__meta">
                      <span>{fmtSize(capture.size)}</span>
                      {capture.captureType === 'voice-call' && capture.timestamp && (
                        <>
                          <span>·</span>
                          <span>{formatCaptureTime(capture.timestamp)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {filteredCaptures.length === 0 && (
            <div className="content-empty" style={{ padding: 20 }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                {searchTerm || captureFilter !== 'all' ? 'No captures match' : 'No captures found'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="captures-content">
        {selectedFile && fileContent ? (
          <>
            <div className="captures-content__header">
              <div className="captures-content__title">
                {selectedCapture?.captureType === 'telegram' ? (
                  <MessageSquare size={18} style={{ color: 'var(--sky)' }} />
                ) : (
                  <Phone size={18} style={{ color: 'var(--emerald)' }} />
                )}
                <span>
                  {selectedCapture?.captureType === 'telegram'
                    ? `Telegram — ${selectedCapture.timestamp ? formatCaptureDate(selectedCapture.timestamp) : ''}`
                    : `Voice Call — ${selectedCapture?.timestamp ? format(selectedCapture.timestamp, 'MMM d, h:mm a') : ''}`}
                </span>
                {fileContent.source === 'live' && (
                  <span className="source-badge source-badge--live" style={{ fontSize: 10 }}>LIVE</span>
                )}
              </div>
              <div className="captures-content__meta">
                <span>{fmtSize(fileContent.content?.length || 0)}</span>
                <span>·</span>
                <span>{wordCount(fileContent.content || '').toLocaleString()} words</span>
                {selectedCapture?.captureType === 'voice-call' && (
                  <>
                    <span>·</span>
                    <span>{getDuration(wordCount(fileContent.content || ''))}</span>
                  </>
                )}
              </div>
            </div>
            <div className="captures-content__body">
              {contentLoading ? (
                <div className="content-empty">
                  <span className="loading-text">Loading...</span>
                </div>
              ) : selectedCapture?.captureType === 'telegram' ? (
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {fileContent.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="transcript-content">
                  <pre>{fileContent.content}</pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="content-empty">
            <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
            <span>Select a capture</span>
          </div>
        )}
      </div>
    </div>
  );
}
