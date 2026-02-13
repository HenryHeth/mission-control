'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Brain, FileText, Settings, User, BookOpen, Wrench, Edit3, Save, X, 
  RefreshCw, Search, Calendar, ChevronRight, FolderOpen, Clock
} from 'lucide-react';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';

/* ═══════════════════════════════════════════════════════
   Mission Control v1.5 — Memory Tab
   Enhanced with search and daily logs browser
   ═══════════════════════════════════════════════════════ */

const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:3456';

interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  editable: boolean;
}

interface DailyLog {
  name: string;
  path: string;
  date: Date;
  size: number;
  isToday: boolean;
  isYesterday: boolean;
}

const WORKSPACE_FILES: WorkspaceFile[] = [
  {
    id: 'memory',
    name: 'MEMORY.md',
    path: 'MEMORY.md',
    icon: <Brain size={18} />,
    color: 'var(--emerald)',
    description: "Henry's long-term memory — curated insights",
    editable: true
  },
  {
    id: 'soul',
    name: 'SOUL.md',
    path: 'SOUL.md',
    icon: <User size={18} />,
    color: 'var(--sky)',
    description: "Henry's identity and core values",
    editable: true
  },
  {
    id: 'tools',
    name: 'TOOLS.md',
    path: 'TOOLS.md',
    icon: <Wrench size={18} />,
    color: 'var(--amber)',
    description: 'Tool configurations and local notes',
    editable: true
  },
  {
    id: 'user',
    name: 'USER.md',
    path: 'USER.md',
    icon: <User size={18} />,
    color: 'var(--purple, #8B5CF6)',
    description: "Paul's profile and preferences",
    editable: true
  },
  {
    id: 'agents',
    name: 'AGENTS.md',
    path: 'AGENTS.md',
    icon: <BookOpen size={18} />,
    color: 'var(--orange, #F97316)',
    description: 'Agent workspace protocols',
    editable: true
  },
];

type ViewMode = 'workspace' | 'dailylogs' | 'search';
type DataSource = 'live' | 'bundled' | 'checking';

function QuickFileCard({ 
  file, 
  isSelected, 
  onClick,
  compact = false
}: { 
  file: WorkspaceFile; 
  isSelected: boolean; 
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button 
      className={`quick-file-card ${isSelected ? 'quick-file-card--selected' : ''} ${compact ? 'quick-file-card--compact' : ''}`}
      onClick={onClick}
    >
      <span className="quick-file-card__icon" style={{ color: file.color }}>
        {file.icon}
      </span>
      <span className="quick-file-card__name">{file.name}</span>
      {file.editable && !compact && (
        <span className="quick-file-card__badge"><Edit3 size={10} /></span>
      )}
    </button>
  );
}

function DailyLogItem({ 
  log, 
  isSelected, 
  onClick 
}: { 
  log: DailyLog; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const dateLabel = log.isToday ? 'Today' : 
                    log.isYesterday ? 'Yesterday' : 
                    format(log.date, 'EEEE');
  
  return (
    <button 
      className={`daily-log-item ${isSelected ? 'daily-log-item--selected' : ''}`}
      onClick={onClick}
    >
      <div className="daily-log-item__date">
        <Calendar size={14} style={{ color: 'var(--sky)' }} />
        <span className="daily-log-item__day">{format(log.date, 'MMM d')}</span>
        <span className="daily-log-item__label">{dateLabel}</span>
      </div>
      <div className="daily-log-item__meta">
        <span className="daily-log-item__size">{fmtSize(log.size)}</span>
        <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />
      </div>
    </button>
  );
}

function SearchResult({ 
  result, 
  onClick 
}: { 
  result: { name: string; path: string; snippet: string; matches: number };
  onClick: () => void;
}) {
  return (
    <button className="search-result" onClick={onClick}>
      <div className="search-result__header">
        <FileText size={14} style={{ color: 'var(--sky)' }} />
        <span className="search-result__name">{result.name}</span>
        <span className="search-result__matches">{result.matches} match{result.matches !== 1 ? 'es' : ''}</span>
      </div>
      <div className="search-result__snippet" 
        dangerouslySetInnerHTML={{ __html: result.snippet }} 
      />
    </button>
  );
}

function fmtSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

export default function MemoryTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('workspace');
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(WORKSPACE_FILES[0]);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>('checking');
  const [liveApiAvailable, setLiveApiAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastModified, setLastModified] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; path: string; snippet: string; matches: number }>>([]);
  const [searching, setSearching] = useState(false);
  
  // Daily logs
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const hasChanges = useMemo(() => {
    return editing && fileContent !== originalContent;
  }, [editing, fileContent, originalContent]);

  // Load file content
  const loadFile = useCallback(async (filePath: string) => {
    setLoading(true);
    setError(null);
    setEditing(false);
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${LIVE_API_URL}/api/files/${encodeURIComponent(filePath)}`, { 
        signal: controller.signal 
      });
      clearTimeout(timeout);
      
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || '');
        setOriginalContent(data.content || '');
        setLastModified(data.lastModified || null);
        setDataSource('live');
        setLiveApiAvailable(true);
        setLoading(false);
        return;
      }
    } catch (e) {
      // Fall through to bundled
    }

    // Fallback: try bundled API
    setLiveApiAvailable(false);
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const res = await fetch(`/api/docs?file=${encodeURIComponent(fileName)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || '');
        setOriginalContent(data.content || '');
        setLastModified(data.lastModified || null);
        setDataSource('bundled');
      } else {
        setError(`File not found: ${fileName}`);
        setFileContent('');
        setDataSource('bundled');
      }
    } catch (e) {
      console.error('Failed to load file:', e);
      setError('Failed to load file');
      setFileContent('');
      setDataSource('bundled');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load daily logs list
  const loadDailyLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${LIVE_API_URL}/api/files?dir=memory`);
      if (res.ok) {
        const data = await res.json();
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const logs: DailyLog[] = (data.files || [])
          .filter((f: { name: string }) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f.name))
          .map((f: { name: string; path: string; size: number }) => {
            const dateStr = f.name.replace('.md', '');
            const date = parseISO(dateStr);
            return {
              name: f.name,
              path: f.path || `memory/${f.name}`,
              date: isValid(date) ? date : new Date(),
              size: f.size || 0,
              isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
              isYesterday: format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd'),
            };
          })
          .sort((a: DailyLog, b: DailyLog) => b.date.getTime() - a.date.getTime());
        
        setDailyLogs(logs);
        setLiveApiAvailable(true);
      }
    } catch (e) {
      console.error('Failed to load daily logs:', e);
      // Generate sample logs
      const today = new Date();
      const sampleLogs: DailyLog[] = [];
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        sampleLogs.push({
          name: `${format(date, 'yyyy-MM-dd')}.md`,
          path: `memory/${format(date, 'yyyy-MM-dd')}.md`,
          date,
          size: 5000 + Math.random() * 20000,
          isToday: i === 0,
          isYesterday: i === 1,
        });
      }
      setDailyLogs(sampleLogs);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // Search files
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const res = await fetch(`${LIVE_API_URL}/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      } else {
        // Fallback: client-side search through cached files
        setSearchResults([]);
      }
    } catch (e) {
      console.error('Search failed:', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (viewMode !== 'search') return;
    
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, viewMode, performSearch]);

  // Save file
  const saveFile = useCallback(async () => {
    if (!liveApiAvailable || !selectedFile?.editable) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`${LIVE_API_URL}/api/files/${encodeURIComponent(selectedFile.path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent, backup: true })
      });
      
      if (res.ok) {
        setOriginalContent(fileContent);
        setEditing(false);
        setLastModified(new Date().toISOString());
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save file');
      }
    } catch (e) {
      console.error('Failed to save:', e);
      setError('Failed to save file');
    } finally {
      setSaving(false);
    }
  }, [liveApiAvailable, selectedFile, fileContent]);

  const cancelEditing = useCallback(() => {
    setFileContent(originalContent);
    setEditing(false);
  }, [originalContent]);

  // Load initial data
  useEffect(() => {
    if (selectedFile) {
      loadFile(selectedFile.path);
    }
  }, [selectedFile, loadFile]);

  useEffect(() => {
    if (viewMode === 'dailylogs' && dailyLogs.length === 0) {
      loadDailyLogs();
    }
  }, [viewMode, dailyLogs.length, loadDailyLogs]);

  // Handle file selection
  const handleSelectWorkspaceFile = (file: WorkspaceFile) => {
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    setSelectedFile(file);
    setSelectedLog(null);
    setViewMode('workspace');
  };

  const handleSelectDailyLog = (log: DailyLog) => {
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    setSelectedLog(log);
    setSelectedFile(null);
    loadFile(log.path);
    setViewMode('dailylogs');
  };

  const handleSearchResultClick = (result: { path: string }) => {
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    loadFile(result.path);
    setSelectedFile(null);
    setSelectedLog(null);
  };

  const currentFileName = selectedFile?.name || selectedLog?.name || 'Select a file';
  const currentFileColor = selectedFile?.color || 'var(--sky)';
  const currentFileIcon = selectedFile?.icon || <Calendar size={18} />;
  const isEditable = selectedFile?.editable || false;

  return (
    <div className="memory-v15">
      {/* Sidebar */}
      <div className="memory-v15__sidebar">
        {/* View Mode Tabs */}
        <div className="memory-v15__tabs">
          <button 
            className={`memory-tab ${viewMode === 'workspace' ? 'memory-tab--active' : ''}`}
            onClick={() => setViewMode('workspace')}
          >
            <FolderOpen size={14} />
            <span>Workspace</span>
          </button>
          <button 
            className={`memory-tab ${viewMode === 'dailylogs' ? 'memory-tab--active' : ''}`}
            onClick={() => setViewMode('dailylogs')}
          >
            <Calendar size={14} />
            <span>Daily Logs</span>
          </button>
          <button 
            className={`memory-tab ${viewMode === 'search' ? 'memory-tab--active' : ''}`}
            onClick={() => setViewMode('search')}
          >
            <Search size={14} />
            <span>Search</span>
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="memory-v15__sidebar-content">
          {viewMode === 'workspace' && (
            <div className="workspace-files">
              <div className="workspace-files__header">
                <Brain size={16} style={{ color: 'var(--emerald)' }} />
                <span>Core Files</span>
              </div>
              {WORKSPACE_FILES.map(file => (
                <QuickFileCard
                  key={file.id}
                  file={file}
                  isSelected={selectedFile?.id === file.id}
                  onClick={() => handleSelectWorkspaceFile(file)}
                />
              ))}
            </div>
          )}

          {viewMode === 'dailylogs' && (
            <div className="daily-logs">
              <div className="daily-logs__header">
                <Calendar size={16} style={{ color: 'var(--sky)' }} />
                <span>Daily Notes</span>
                {loadingLogs && <RefreshCw size={12} className="spin" />}
              </div>
              <div className="daily-logs__list">
                {dailyLogs.map(log => (
                  <DailyLogItem
                    key={log.name}
                    log={log}
                    isSelected={selectedLog?.name === log.name}
                    onClick={() => handleSelectDailyLog(log)}
                  />
                ))}
                {dailyLogs.length === 0 && !loadingLogs && (
                  <div className="daily-logs__empty">No daily logs found</div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'search' && (
            <div className="memory-search">
              <div className="memory-search__input-wrapper">
                <Search size={16} style={{ color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Search memory files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="memory-search__input"
                  autoFocus
                />
                {searching && <RefreshCw size={14} className="spin" />}
              </div>
              <div className="memory-search__results">
                {searchResults.map((result, i) => (
                  <SearchResult
                    key={i}
                    result={result}
                    onClick={() => handleSearchResultClick(result)}
                  />
                ))}
                {searchQuery && !searching && searchResults.length === 0 && (
                  <div className="memory-search__empty">
                    No results for &quot;{searchQuery}&quot;
                  </div>
                )}
                {!searchQuery && (
                  <div className="memory-search__hint">
                    Search across all memory files, daily logs, and docs.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Data Source Indicator */}
        <div className="memory-v15__footer">
          <span className={`source-badge source-badge--${dataSource}`}>
            {dataSource === 'live' ? '🟢 Live' : dataSource === 'bundled' ? '🟡 Bundled' : '⏳'}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="memory-v15__content">
        {/* Header */}
        <div className="memory-v15__header">
          <div className="memory-v15__title">
            <span style={{ color: currentFileColor }}>{currentFileIcon}</span>
            <span>{currentFileName}</span>
            {dataSource === 'live' && (
              <span className="source-badge source-badge--live" style={{ fontSize: 10 }}>LIVE</span>
            )}
          </div>
          
          <div className="memory-v15__actions">
            {isEditable && liveApiAvailable && !editing && (
              <button 
                className="memory-action-btn memory-action-btn--edit"
                onClick={() => setEditing(true)}
              >
                <Edit3 size={14} />
                Edit
              </button>
            )}
            {editing && (
              <>
                <button 
                  className="memory-action-btn memory-action-btn--cancel"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  <X size={14} />
                  Cancel
                </button>
                <button 
                  className="memory-action-btn memory-action-btn--save"
                  onClick={saveFile}
                  disabled={saving || !hasChanges}
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
            <button 
              className="memory-action-btn"
              onClick={() => {
                if (selectedFile) loadFile(selectedFile.path);
                else if (selectedLog) loadFile(selectedLog.path);
              }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Meta info */}
        <div className="memory-v15__meta">
          <span>{fmtSize(fileContent.length)}</span>
          <span>·</span>
          <span>{wordCount(fileContent).toLocaleString()} words</span>
          {lastModified && (
            <>
              <span>·</span>
              <span>Modified {formatDistanceToNow(new Date(lastModified), { addSuffix: true })}</span>
            </>
          )}
          {hasChanges && (
            <span className="unsaved-indicator">● Unsaved changes</span>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="memory-v15__error">
            {error}
          </div>
        )}

        {/* Content body */}
        <div className="memory-v15__body">
          {loading ? (
            <div className="content-empty">
              <Brain size={32} className="pulse" style={{ color: 'var(--emerald)', opacity: 0.5 }} />
              <span className="loading-text">Loading...</span>
            </div>
          ) : editing ? (
            <textarea
              className="memory-editor"
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <div className="md-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {fileContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
