'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Live API Configuration ---
// The file-server.js serves files directly from disk.
// Set this to your file server's public URL (e.g., via Cloudflare tunnel, ngrok, etc.)
// Falls back to bundled /api/docs if unreachable.
const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:3456';

interface FileInfo {
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

function getTagClass(tag: string): string {
  const t = tag.toLowerCase();
  if (t === 'journal' || t === 'daily') return 'tag-badge--journal';
  if (t === 'research') return 'tag-badge--research';
  if (t === 'design') return 'tag-badge--design';
  if (t === 'meeting') return 'tag-badge--meeting';
  if (t === 'memory' || t === 'notes') return 'tag-badge--notes';
  if (t === 'call' || t === 'transcript') return 'tag-badge--call';
  if (t === 'config' || t === 'workspace') return 'tag-badge--config';
  if (t === 'telegram') return 'tag-badge--telegram';
  return 'tag-badge--other';
}

function timeAgo(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `about ${hrs} hours ago`;
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function fmtSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function DocsTab() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>('checking');
  const [liveApiAvailable, setLiveApiAvailable] = useState<boolean | null>(null);

  const allTags = Array.from(new Set(files.flatMap(f => f.tags))).sort();
  const allTypes = Array.from(new Set(files.map(f => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    return ext ? '.' + ext : '';
  }))).filter(Boolean).sort();

  const filtered = files.filter(f => {
    const q = searchTerm.toLowerCase();
    const matchQ = !q || f.title.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
    const matchTag = activeTags.length === 0 || activeTags.some(t => f.tags.includes(t));
    const ext = '.' + (f.name.split('.').pop()?.toLowerCase() || '');
    const matchType = activeTypes.length === 0 || activeTypes.includes(ext);
    return matchQ && matchTag && matchType;
  });

  // Try live API first, fall back to bundled
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
      // Live API unreachable — fall through to bundled
    }

    // Fallback: bundled /api/docs
    try {
      setLiveApiAvailable(false);
      const res = await fetch('/api/docs');
      const data = await res.json();
      setFiles(data.files || []);
      setDataSource('bundled');
    } catch (e) {
      console.error('Failed to fetch files from both sources:', e);
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
    // The bundled API uses filename (just the name), not full path
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

  // Auto-refresh file list every 30s when live API is available
  useEffect(() => {
    fetchFiles();
    const interval = setInterval(() => {
      if (liveApiAvailable) fetchFiles();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchFiles, liveApiAvailable]);

  const toggleTag = (t: string) =>
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const toggleType = (t: string) =>
    setActiveTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  // Manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchFiles();
  };

  if (loading) {
    return (
      <div className="docs-layout">
        <div className="content-empty"><span className="loading-text">Loading documents...</span></div>
      </div>
    );
  }

  return (
    <div className="docs-layout">
      {/* Sidebar */}
      <div className="docs-sidebar">
        {/* Source indicator + refresh */}
        <div className="docs-sidebar__source">
          <span className={`source-badge source-badge--${dataSource}`}>
            {dataSource === 'live' ? '🟢 Live' : dataSource === 'bundled' ? '🟡 Bundled' : '⏳ Checking...'}
          </span>
          <span className="source-count">{files.length} files</span>
          <button className="source-refresh" onClick={handleRefresh} title="Refresh file list">↻</button>
        </div>

        {/* Search */}
        <div className="docs-sidebar__search">
          <svg
            className="docs-sidebar__search-icon"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 13, height: 13 }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="docs-sidebar__input"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="docs-sidebar__filters">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`filter-chip ${activeTags.includes(tag) ? 'filter-chip--active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* File type filters */}
        {allTypes.length > 0 && (
          <div className="docs-sidebar__filters">
            {allTypes.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`filter-chip filter-chip--type ${activeTypes.includes(type) ? 'filter-chip--active' : ''}`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* File list */}
        <div className="docs-sidebar__list">
          {filtered.map(file => (
            <div
              key={file.path}
              onClick={() => selectFile(file.path)}
              className={`file-item ${selectedFile === file.path ? 'file-item--selected' : ''}`}
            >
              <div className="file-item__dot" />
              <div className="file-item__info">
                <div className="file-item__name">{file.name}</div>
                {file.path.includes('/') && (
                  <div className="file-item__path">{file.path}</div>
                )}
                <div className="file-item__meta">
                  {file.tags[0] && (
                    <span className={`tag-badge ${getTagClass(file.tags[0])}`}>
                      {file.tags[0]}
                    </span>
                  )}
                  <span className="file-item__date">{timeAgo(file.lastModified)}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: '#555', fontSize: 13 }}>
              {searchTerm || activeTags.length || activeTypes.length ? 'No files match' : 'No documents'}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="content-area">
        {selectedFile && fileContent ? (
          <>
            <div className="content-header">
              <div className="content-header__title">
                <span className="content-header__filename">{fileContent.filename || selectedFile}</span>
                {fileContent.source === 'live' && (
                  <span className="source-badge source-badge--live" style={{ fontSize: 10, marginLeft: 8 }}>LIVE</span>
                )}
                {(fileContent.metadata?.tags as string[])?.map((tag: string) => (
                  <span key={tag} className={`tag-badge ${getTagClass(tag)}`}>{tag}</span>
                ))}
              </div>
              <div className="content-header__meta">
                <span>{fmtSize(fileContent.content?.length || 0)}</span>
                <span>·</span>
                <span>{wordCount(fileContent.content || '').toLocaleString()} words</span>
                <span>·</span>
                <span>Modified {timeAgo(fileContent.lastModified)}</span>
              </div>
            </div>
            <div className="content-body">
              {contentLoading ? (
                <div className="content-empty"><span className="loading-text">Loading...</span></div>
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
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>📄</div>
              <div>Select a document</div>
              {dataSource === 'bundled' && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                  ⚠️ Showing bundled files (live server unavailable)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
