'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain, FileText, Settings, User, BookOpen, Wrench, Edit3, Save, X, RefreshCw } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Mission Control — Memory Tab v1.5
   Direct access to workspace config files:
   - MEMORY.md (editable)
   - SOUL.md
   - TOOLS.md
   - USER.md
   - AGENTS.md
   - clawdbot.json
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

const WORKSPACE_FILES: WorkspaceFile[] = [
  {
    id: 'memory',
    name: 'MEMORY.md',
    path: 'MEMORY.md',
    icon: <Brain size={18} />,
    color: 'var(--emerald)',
    description: "Henry's long-term memory — curated insights and lessons",
    editable: true
  },
  {
    id: 'soul',
    name: 'SOUL.md',
    path: 'SOUL.md',
    icon: <User size={18} />,
    color: 'var(--sky)',
    description: "Henry's identity, personality, and core values",
    editable: false
  },
  {
    id: 'tools',
    name: 'TOOLS.md',
    path: 'TOOLS.md',
    icon: <Wrench size={18} />,
    color: 'var(--amber)',
    description: 'Tool configurations, integrations, and local notes',
    editable: true
  },
  {
    id: 'user',
    name: 'USER.md',
    path: 'USER.md',
    icon: <User size={18} />,
    color: 'var(--purple, #8B5CF6)',
    description: "Paul's profile, preferences, and context",
    editable: false
  },
  {
    id: 'agents',
    name: 'AGENTS.md',
    path: 'AGENTS.md',
    icon: <BookOpen size={18} />,
    color: 'var(--orange, #F97316)',
    description: 'Agent workspace protocols and conventions',
    editable: true
  },
  {
    id: 'config',
    name: 'clawdbot.json',
    path: '../.clawdbot/clawdbot.json',
    icon: <Settings size={18} />,
    color: 'var(--text-muted)',
    description: 'Clawdbot configuration — models, routing, plugins',
    editable: false
  }
];

type DataSource = 'live' | 'bundled' | 'checking';

function FileCard({ 
  file, 
  isSelected, 
  onClick 
}: { 
  file: WorkspaceFile; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <div 
      className={`workspace-file-card ${isSelected ? 'workspace-file-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="workspace-file-card__icon" style={{ color: file.color }}>
        {file.icon}
      </div>
      <div className="workspace-file-card__info">
        <div className="workspace-file-card__name">{file.name}</div>
        <div className="workspace-file-card__desc">{file.description}</div>
      </div>
      {file.editable && (
        <div className="workspace-file-card__badge">
          <Edit3 size={12} />
        </div>
      )}
    </div>
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
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile>(WORKSPACE_FILES[0]);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>('checking');
  const [liveApiAvailable, setLiveApiAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastModified, setLastModified] = useState<string | null>(null);

  const hasChanges = useMemo(() => {
    return editing && fileContent !== originalContent;
  }, [editing, fileContent, originalContent]);

  const loadFile = useCallback(async (file: WorkspaceFile) => {
    setLoading(true);
    setError(null);
    setEditing(false);
    
    // Try live API first
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${LIVE_API_URL}/api/files/${encodeURIComponent(file.path)}`, { 
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
      const res = await fetch(`/api/docs?file=${encodeURIComponent(file.name)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || '');
        setOriginalContent(data.content || '');
        setLastModified(data.lastModified || null);
        setDataSource('bundled');
      } else {
        setError(`File not found: ${file.name}`);
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

  const saveFile = useCallback(async () => {
    if (!liveApiAvailable || !selectedFile.editable) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`${LIVE_API_URL}/api/files/${encodeURIComponent(selectedFile.path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent })
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

  useEffect(() => {
    loadFile(selectedFile);
  }, [selectedFile, loadFile]);

  const handleSelectFile = (file: WorkspaceFile) => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setSelectedFile(file);
  };

  const isJsonFile = selectedFile.name.endsWith('.json');

  return (
    <div className="memory-layout-v2">
      {/* Sidebar - File Cards */}
      <div className="memory-sidebar-v2">
        <div className="memory-sidebar-v2__header">
          <Brain size={20} style={{ color: 'var(--emerald)' }} />
          <span>Workspace Files</span>
          <span className={`source-badge source-badge--${dataSource}`}>
            {dataSource === 'live' ? '🟢' : '🟡'}
          </span>
        </div>

        <div className="memory-sidebar-v2__files">
          {WORKSPACE_FILES.map(file => (
            <FileCard
              key={file.id}
              file={file}
              isSelected={selectedFile.id === file.id}
              onClick={() => handleSelectFile(file)}
            />
          ))}
        </div>

        <div className="memory-sidebar-v2__footer">
          <div className="memory-sidebar-v2__hint">
            <Edit3 size={12} />
            <span>Editable files can be modified in-browser</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="memory-content-v2">
        {/* Header */}
        <div className="memory-content-v2__header">
          <div className="memory-content-v2__title">
            <span style={{ color: selectedFile.color }}>{selectedFile.icon}</span>
            <span>{selectedFile.name}</span>
            {dataSource === 'live' && (
              <span className="source-badge source-badge--live" style={{ fontSize: 10 }}>LIVE</span>
            )}
          </div>
          
          <div className="memory-content-v2__actions">
            {selectedFile.editable && liveApiAvailable && !editing && (
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
              onClick={() => loadFile(selectedFile)}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Meta info */}
        <div className="memory-content-v2__meta">
          <span>{fmtSize(fileContent.length)}</span>
          <span>·</span>
          <span>{wordCount(fileContent).toLocaleString()} words</span>
          {lastModified && (
            <>
              <span>·</span>
              <span>Modified: {new Date(lastModified).toLocaleString()}</span>
            </>
          )}
          {hasChanges && (
            <span className="unsaved-indicator">● Unsaved changes</span>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="memory-content-v2__error">
            {error}
          </div>
        )}

        {/* Content body */}
        <div className="memory-content-v2__body">
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
          ) : isJsonFile ? (
            <pre className="json-content">{fileContent}</pre>
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
