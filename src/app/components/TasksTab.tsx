'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// Task API - connects to file server or uses sample data
const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_API_URL || 'http://localhost:3456';

interface Task {
  id: string;
  title: string;
  status: 'open' | 'in-progress' | 'done';
  priority: 'high' | 'med' | 'low';
  folder: string;
  dueDate?: string;
  context?: string;
  tags: string[];
  note?: string;
  modified: string;
}

type FilterStatus = 'all' | 'open' | 'in-progress' | 'done';
type SortBy = 'priority' | 'due' | 'modified' | 'title';

function getPriorityClass(priority: string): string {
  if (priority === 'high') return 'priority--high';
  if (priority === 'med') return 'priority--med';
  return 'priority--low';
}

function getPriorityIcon(priority: string): string {
  if (priority === 'high') return '🔴';
  if (priority === 'med') return '🟡';
  return '🟢';
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

function formatDueDate(dateString?: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Sample tasks for demo (will be replaced by API)
const SAMPLE_TASKS: Task[] = [
  {
    id: '1',
    title: 'Build Mission Control v1',
    status: 'in-progress',
    priority: 'high',
    folder: 'pWorkflow',
    context: 'Henry',
    tags: ['dev', 'dashboard'],
    note: 'Continue building Next.js + Tailwind dashboard',
    modified: new Date().toISOString(),
    dueDate: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: '2',
    title: 'Review sprint planning docs',
    status: 'open',
    priority: 'med',
    folder: 'pWorkflow',
    context: 'Henry',
    tags: ['planning'],
    modified: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    title: 'Research VVO frameworks',
    status: 'done',
    priority: 'med',
    folder: 'pWorkflow',
    context: 'Henry',
    tags: ['research'],
    note: 'Completed ikigai integration analysis',
    modified: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    title: 'Morning briefing automation',
    status: 'open',
    priority: 'high',
    folder: 'pWorkflow',
    context: 'Henry',
    tags: ['automation'],
    modified: new Date(Date.now() - 7200000).toISOString(),
    dueDate: new Date(Date.now() + 172800000).toISOString(),
  },
  {
    id: '5',
    title: 'Update MEMORY.md with lessons learned',
    status: 'open',
    priority: 'low',
    folder: 'pWorkflow',
    context: 'Henry',
    tags: ['memory'],
    modified: new Date(Date.now() - 10800000).toISOString(),
  },
];

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [searchTerm, setSearchTerm] = useState('');
  const [dataSource, setDataSource] = useState<'live' | 'sample'>('sample');

  const fetchTasks = useCallback(async () => {
    // Try live API first
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${LIVE_API_URL}/api/tasks`, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          setTasks(data.tasks);
          setDataSource('live');
          setLoading(false);
          return;
        }
      }
    } catch {
      // Live API unreachable — use sample data
    }

    // Fallback to sample data
    setTasks(SAMPLE_TASKS);
    setDataSource('sample');
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }
    
    // Filter by search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.folder.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'priority') {
        const order = { high: 0, med: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      if (sortBy === 'due') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'modified') {
        return new Date(b.modified).getTime() - new Date(a.modified).getTime();
      }
      return a.title.localeCompare(b.title);
    });
    
    return result;
  }, [tasks, filterStatus, searchTerm, sortBy]);

  const stats = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter(t => t.status === 'open').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }), [tasks]);

  if (loading) {
    return (
      <div className="tasks-layout">
        <div className="content-empty"><span className="loading-text">Loading tasks...</span></div>
      </div>
    );
  }

  return (
    <div className="tasks-layout">
      {/* Sidebar */}
      <div className="tasks-sidebar">
        {/* Stats */}
        <div className="tasks-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card stat-card--open">
            <div className="stat-value">{stats.open}</div>
            <div className="stat-label">Open</div>
          </div>
          <div className="stat-card stat-card--progress">
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card stat-card--done">
            <div className="stat-value">{stats.done}</div>
            <div className="stat-label">Done</div>
          </div>
        </div>

        {/* Search */}
        <div className="tasks-sidebar__search">
          <input
            className="tasks-sidebar__input"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="tasks-filters">
          <div className="filter-group">
            <div className="filter-label">Status</div>
            <div className="filter-buttons">
              {(['all', 'open', 'in-progress', 'done'] as FilterStatus[]).map(status => (
                <button
                  key={status}
                  className={`filter-btn ${filterStatus === status ? 'filter-btn--active' : ''}`}
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="filter-group">
            <div className="filter-label">Sort by</div>
            <div className="filter-buttons">
              {(['priority', 'due', 'modified', 'title'] as SortBy[]).map(sort => (
                <button
                  key={sort}
                  className={`filter-btn ${sortBy === sort ? 'filter-btn--active' : ''}`}
                  onClick={() => setSortBy(sort)}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Source indicator */}
        <div className="tasks-source">
          <span className={`source-badge source-badge--${dataSource === 'live' ? 'live' : 'bundled'}`}>
            {dataSource === 'live' ? '🟢 Live' : '🟡 Sample Data'}
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="tasks-list-area">
        <div className="tasks-list">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`task-card ${selectedTask?.id === task.id ? 'task-card--selected' : ''} task-card--${task.status}`}
              onClick={() => setSelectedTask(task)}
            >
              <div className="task-card__header">
                <span className="task-card__priority">{getPriorityIcon(task.priority)}</span>
                <span className="task-card__title">{task.title}</span>
                {task.dueDate && (
                  <span className={`task-card__due ${new Date(task.dueDate) < new Date() ? 'task-card__due--overdue' : ''}`}>
                    {formatDueDate(task.dueDate)}
                  </span>
                )}
              </div>
              <div className="task-card__meta">
                <span className={`task-status task-status--${task.status}`}>
                  {task.status === 'in-progress' ? '⏳ In Progress' : task.status === 'done' ? '✓ Done' : '○ Open'}
                </span>
                <span className="task-folder">{task.folder}</span>
                {task.context && <span className="task-context">@{task.context}</span>}
              </div>
              {task.tags.length > 0 && (
                <div className="task-card__tags">
                  {task.tags.map(tag => (
                    <span key={tag} className="task-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {filteredTasks.length === 0 && (
            <div className="content-empty">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>✅</div>
                <div>{searchTerm || filterStatus !== 'all' ? 'No tasks match' : 'No tasks'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail */}
      <div className="task-detail">
        {selectedTask ? (
          <>
            <div className="task-detail__header">
              <span className="task-detail__priority">{getPriorityIcon(selectedTask.priority)}</span>
              <h2 className="task-detail__title">{selectedTask.title}</h2>
            </div>
            
            <div className="task-detail__meta">
              <div className="meta-row">
                <span className="meta-label">Status</span>
                <span className={`task-status task-status--${selectedTask.status}`}>
                  {selectedTask.status === 'in-progress' ? 'In Progress' : selectedTask.status.charAt(0).toUpperCase() + selectedTask.status.slice(1)}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Priority</span>
                <span className={getPriorityClass(selectedTask.priority)}>
                  {selectedTask.priority.toUpperCase()}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Folder</span>
                <span>{selectedTask.folder}</span>
              </div>
              {selectedTask.context && (
                <div className="meta-row">
                  <span className="meta-label">Context</span>
                  <span>@{selectedTask.context}</span>
                </div>
              )}
              {selectedTask.dueDate && (
                <div className="meta-row">
                  <span className="meta-label">Due</span>
                  <span className={new Date(selectedTask.dueDate) < new Date() ? 'text-overdue' : ''}>
                    {new Date(selectedTask.dueDate).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}
              <div className="meta-row">
                <span className="meta-label">Modified</span>
                <span>{timeAgo(selectedTask.modified)}</span>
              </div>
            </div>
            
            {selectedTask.tags.length > 0 && (
              <div className="task-detail__tags">
                <span className="meta-label">Tags</span>
                <div className="task-tags-list">
                  {selectedTask.tags.map(tag => (
                    <span key={tag} className="task-tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            
            {selectedTask.note && (
              <div className="task-detail__note">
                <span className="meta-label">Notes</span>
                <div className="task-note-content">{selectedTask.note}</div>
              </div>
            )}
          </>
        ) : (
          <div className="content-empty">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>✅</div>
              <div>Select a task</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
