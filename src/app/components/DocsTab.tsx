'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Live API Configuration ---
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

interface FolderStructure {
  name: string;
  path: string;
  files: FileInfo[];
  subfolders: FolderStructure[];
}

type DataSource = 'live' | 'bundled' | 'checking';
type ViewMode = 'list' | 'tree';

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
  if (t === 'personal') return 'tag-badge--personal';
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
  if (hrs < 24) return `${hrs}h ago`;
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

function buildFolderStructure(files: FileInfo[]): FolderStructure {
  const root: FolderStructure = { name: 'root', path: '', files: [], subfolders: [] };
  
  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;
    
    // Navigate/create folder structure
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      let subfolder = current.subfolders.find(f => f.name === folderName);
      if (!subfolder) {
        subfolder = { 
          name: folderName, 
          path: parts.slice(0, i + 1).join('/'),
          files: [], 
          subfolders: [] 
        };
        current.subfolders.push(subfolder);
      }
      current = subfolder;
    }
    
    current.files.push(file);
  }
  
  // Sort subfolders and files
  const sortFolder = (folder: FolderStructure) => {
    folder.subfolders.sort((a, b) => a.name.localeCompare(b.name));
    folder.files.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    folder.subfolders.forEach(sortFolder);
  };
  
  sortFolder(root);
  return root;
}

function FolderView({ 
  folder, 
  depth = 0, 
  selectedFile, 
  onSelectFile,
  expandedFolders,
  onToggleFolder 
}: { 
  folder: FolderStructure; 
  depth?: number;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(folder.path);
  const hasContent = folder.files.length > 0 || folder.subfolders.length > 0;
  
  if (!hasContent && depth > 0) return null;
  
  return (
    <div className="folder-group" style={{ marginLeft: depth > 0 ? 8 : 0 }}>
      {depth > 0 && (
        <div 
          className={`folder-header ${isExpanded ? 'folder-header--expanded' : ''}`}
          onClick={() => onToggleFolder(folder.path)}
        >
          <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
          <span className="folder-name">{folder.name}</span>
          <span className="folder-count">{folder.files.length + folder.subfolders.reduce((acc, f) => acc + f.files.length, 0)}</span>
        </div>
      )}
      
      {(depth === 0 || isExpanded) && (
        <>
          {folder.files.map(file => (
            <div
              key={file.path}
              onClick={() => onSelectFile(file.path)}
              className={`file-item ${selectedFile === file.path ? 'file-item--selected' : ''}`}
            >
              <div className="file-item__dot" />
              <div className="file-item__info">
                <div className="file-item__name">{file.name}</div>
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
          
          {folder.subfolders.map(subfolder => (
            <FolderView
              key={subfolder.path}
              folder={subfolder}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </>
      )}
    </div>
  );
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
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['memory', 'docs']));

  const allTags = useMemo(() => 
    Array.from(new Set(files.flatMap(f => f.tags))).sort(),
    [files]
  );
  
  const allTypes = useMemo(() => 
    Array.from(new Set(files.map(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext ? '.' + ext : '';
    }))).filter(Boolean).sort(),
    [files]
  );

  const filtered = useMemo(() => files.filter(f => {
    const q = searchTerm.toLowerCase();
    const matchQ = !q || f.title.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
    const matchTag = activeTags.length === 0 || activeTags.some(t => f.tags.includes(t));
    const ext = '.' + (f.name.split('.').pop()?.toLowerCase() || '');
    const matchType = activeTypes.length === 0 || activeTypes.includes(ext);
    return matchQ && matchTag && matchType;
  }), [files, searchTerm, activeTags, activeTypes]);

  const folderStructure = useMemo(() => buildFolderStructure(filtered), [filtered]);

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

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

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

        {/* View mode toggle */}
        <div className="docs-sidebar__view-toggle">
          <button 
            className={`view-btn ${viewMode === 'list' ? 'view-btn--active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            ☰
          </button>
          <button 
            className={`view-btn ${viewMode === 'tree' ? 'view-btn--active' : ''}`}
            onClick={() => setViewMode('tree')}
            title="Tree view"
          >
            🌲
          </button>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="docs-sidebar__filters">
            {allTags.slice(0, 10).map(tag => (
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

        {/* File list */}
        <div className="docs-sidebar__list">
          {viewMode === 'tree' ? (
            <FolderView
              folder={folderStructure}
              selectedFile={selectedFile}
              onSelectFile={selectFile}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
            />
          ) : (
            filtered.map(file => (
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
            ))
          )}
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
              {dataSource === 'live' && (
                <div style={{ fontSize: 11, color: '#4a4', marginTop: 8 }}>
                  ✓ Connected to live file server
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
