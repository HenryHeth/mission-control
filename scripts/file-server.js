#!/usr/bin/env node
/**
 * Live File Server for Mission Control
 * Serves files directly from the workspace for real-time viewing
 * 
 * Usage: node scripts/file-server.js [port]
 * Default port: 3456
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Try to load toodledo_client (may not be available in all environments)
let toodledoClient = null;
try {
  toodledoClient = require(path.join(__dirname, '..', '..', 'scripts', 'toodledo_client'));
} catch (e) {
  console.log('Toodledo client not available - tasks endpoint will return sample data');
}

// Try to load spending collector
let spendingCollector = null;
try {
  spendingCollector = require(path.join(__dirname, 'spending-collector'));
} catch (e) {
  console.log('Spending collector not available - spending endpoint will return sample data');
}

const PORT = parseInt(process.argv[2] || process.env.FILE_SERVER_PORT || '3456', 10);

// Directories to scan for files
const CLAWD_ROOT = path.join(__dirname, '..', '..');  // /Users/henry_notabot/clawd
const MEMORY_DIR = path.join(CLAWD_ROOT, 'memory');
const DOCS_DIR = path.join(CLAWD_ROOT, 'docs');

// Config files in root
const ROOT_CONFIG_FILES = ['TOOLS.md', 'SOUL.md', 'AGENTS.md', 'USER.md', 'IDENTITY.md', 'MEMORY.md', 'HEARTBEAT.md'];

function categorizeFile(filename, filePath) {
  const tags = [];
  
  // Check if it's a root config file
  if (ROOT_CONFIG_FILES.includes(filename)) {
    return ['config', 'workspace'];
  }
  
  // Date-based daily logs
  if (filename.match(/^\d{4}-\d{2}-\d{2}\.md$/)) {
    tags.push('daily', 'journal');
  } else if (filename.startsWith('research_')) {
    tags.push('research');
  } else if (filename.startsWith('meeting_')) {
    tags.push('meeting');
  } else if (filename.startsWith('design_')) {
    tags.push('design');
  } else if (filename.includes('call') || filename.includes('transcript')) {
    tags.push('call', 'transcript');
  } else if (filename.includes('memory') || filename.includes('notes')) {
    tags.push('memory', 'notes');
  } else if (filename.startsWith('ikigai')) {
    tags.push('notes', 'personal');
  } else {
    tags.push('other');
  }
  
  return tags;
}

function getFileInfo(filePath, relativePath) {
  const filename = path.basename(filePath);
  const stats = fs.statSync(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(content);
    
    return {
      name: filename,
      path: relativePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      tags: data.tags || categorizeFile(filename, filePath),
      title: data.title || filename.replace('.md', ''),
      type: path.extname(filename).slice(1) || 'md',
    };
  } catch (error) {
    return {
      name: filename,
      path: relativePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      tags: categorizeFile(filename, filePath),
      title: filename.replace('.md', ''),
      type: path.extname(filename).slice(1) || 'md',
    };
  }
}

function scanDirectory(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;  // Skip hidden files
    
    const fullPath = path.join(dir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    
    if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
      files.push(getFileInfo(fullPath, relativePath));
    } else if (entry.isDirectory()) {
      // Recurse into subdirectories
      files.push(...scanDirectory(fullPath, relativePath));
    }
  }
  
  return files;
}

function getAllFiles() {
  const files = [];
  
  // Root config files
  for (const filename of ROOT_CONFIG_FILES) {
    const filePath = path.join(CLAWD_ROOT, filename);
    if (fs.existsSync(filePath)) {
      files.push(getFileInfo(filePath, filename));
    }
  }
  
  // Memory directory
  files.push(...scanDirectory(MEMORY_DIR, 'memory'));
  
  // Docs directory (if exists)
  if (fs.existsSync(DOCS_DIR)) {
    files.push(...scanDirectory(DOCS_DIR, 'docs'));
  }
  
  // Sort by last modified (newest first)
  files.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  
  return files;
}

function getFileContent(filePath) {
  // Resolve the path - could be root config or in memory/docs
  let fullPath;
  
  if (ROOT_CONFIG_FILES.includes(filePath)) {
    fullPath = path.join(CLAWD_ROOT, filePath);
  } else if (filePath.startsWith('memory/')) {
    fullPath = path.join(CLAWD_ROOT, filePath);
  } else if (filePath.startsWith('docs/')) {
    fullPath = path.join(CLAWD_ROOT, filePath);
  } else {
    // Try memory directory
    fullPath = path.join(MEMORY_DIR, filePath);
  }
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const stats = fs.statSync(fullPath);
  const { data, content: markdownContent } = matter(content);
  
  return {
    filename: path.basename(fullPath),
    path: filePath,
    metadata: {
      ...data,
      tags: data.tags || categorizeFile(path.basename(fullPath), fullPath),
    },
    content: markdownContent,
    lastModified: stats.mtime.toISOString(),
    source: 'live',
  };
}

// Fetch tasks from Toodledo
async function fetchToodledoTasks() {
  if (!toodledoClient) {
    // Return sample data if client not available
    return generateSampleTaskData();
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const sixtyDaysAgo = now - (60 * 24 * 3600);
    
    // Fetch open tasks (Henry's tasks - context 1462384)
    const openData = await toodledoClient.apiCall(
      '/3/tasks/get.php?f=json&comp=0&fields=tag,priority,duedate,status,note,folder,added&num=300'
    );
    
    // Fetch completed tasks (last 60 days worth)
    const completedMeta = await toodledoClient.apiCall('/3/tasks/get.php?f=json&comp=1&num=1&start=0');
    const totalCompleted = (Array.isArray(completedMeta) && completedMeta[0]?.total) || 0;
    const startFrom = Math.max(0, totalCompleted - 500);
    
    const completedData = await toodledoClient.apiCall(
      `/3/tasks/get.php?f=json&comp=1&fields=tag,priority,folder,added&num=500&start=${startFrom}`
    );

    // Filter and format
    const completed = (Array.isArray(completedData) ? completedData : [])
      .filter(t => t.title && t.completed && t.completed >= sixtyDaysAgo)
      .map(t => ({
        id: t.id,
        title: t.title,
        folder: getFolderName(t.folder),
        completed: t.completed,
        added: t.added || t.completed - 86400,
        priority: t.priority || 1,
      }))
      .sort((a, b) => b.completed - a.completed);

    const open = (Array.isArray(openData) ? openData : [])
      .filter(t => t.title)
      .map(t => ({
        id: t.id,
        title: t.title,
        folder: getFolderName(t.folder),
        completed: 0,
        added: t.added || now - 7 * 86400,
        priority: t.priority || 1,
        duedate: t.duedate || undefined,
      }));

    return {
      completed,
      open,
      totalOpen: open.length,
      totalCompleted: completed.length,
      generatedAt: new Date().toISOString(),
      source: 'live'
    };
  } catch (err) {
    console.error('Toodledo API error:', err.message);
    return generateSampleTaskData();
  }
}

// Map folder IDs to names (common folders)
const FOLDER_MAP = {
  9975528: 'pWorkflow',
  9975529: 'pHome',
  9975530: 'pFinancial',
  9975531: 'pPhysical',
  0: 'Inbox',
};

function getFolderName(folderId) {
  return FOLDER_MAP[folderId] || `Folder ${folderId}`;
}

// Generate sample spending data for fallback
function generateSampleSpendingData() {
  const now = new Date();
  return {
    collectedAt: now.toISOString(),
    fromCache: false,
    source: 'sample',
    providers: {
      anthropic: {
        available: false,
        error: 'Sample data mode',
        estimatedMonthly: 150 + Math.random() * 100,
      },
      openai: {
        available: false,
        error: 'Sample data mode',
        estimatedMonthly: 50 + Math.random() * 50,
      },
      openrouter: {
        available: true,
        totalUsed: 15 + Math.random() * 20,
        limit: 50,
      },
      twilio: {
        available: false,
        error: 'Sample data mode',
        estimatedMonthly: 20 + Math.random() * 30,
      },
      elevenlabs: {
        available: true,
        characterCount: Math.floor(5000 + Math.random() * 10000),
        characterLimit: 30000,
        tier: 'starter',
      },
    },
    summary: {
      totalProviders: 5,
      availableCount: 2,
      todayEstimate: 8 + Math.random() * 10,
      calculatedAt: now.toISOString(),
    },
  };
}

// Generate sample task data for fallback
function generateSampleTaskData() {
  const now = Math.floor(Date.now() / 1000);
  const completed = [];
  const open = [];
  
  const SAMPLE_TITLES = [
    'Build Mission Control v1',
    'Review sprint planning docs',
    'Research VVO frameworks',
    'Morning briefing automation',
    'Update MEMORY.md',
    'Toodledo API integration',
    'Deploy to Vercel',
    'Fix authentication flow',
    'Create task velocity chart',
    'Implement dark theme',
  ];
  
  const FOLDERS = ['pWorkflow', 'pHome', 'pFinancial', 'Inbox'];
  
  // Generate completed tasks
  for (let i = 0; i < 150; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const completedTs = now - daysAgo * 86400 - Math.floor(Math.random() * 43200);
    
    completed.push({
      id: i + 1,
      title: SAMPLE_TITLES[i % SAMPLE_TITLES.length],
      folder: FOLDERS[Math.floor(Math.random() * FOLDERS.length)],
      completed: completedTs,
      added: completedTs - Math.floor(Math.random() * 7 * 86400),
      priority: Math.floor(Math.random() * 3) + 1,
    });
  }
  
  // Generate open tasks
  for (let i = 0; i < 45; i++) {
    open.push({
      id: 1000 + i,
      title: SAMPLE_TITLES[(i + 5) % SAMPLE_TITLES.length],
      folder: FOLDERS[Math.floor(Math.random() * FOLDERS.length)],
      completed: 0,
      added: now - Math.floor(Math.random() * 30) * 86400,
      priority: Math.floor(Math.random() * 3) + 1,
      duedate: Math.random() > 0.5 ? now + Math.floor(Math.random() * 7 * 86400) : undefined,
    });
  }
  
  return {
    completed: completed.sort((a, b) => b.completed - a.completed),
    open,
    totalOpen: open.length,
    totalCompleted: completed.length,
    generatedAt: new Date().toISOString(),
    source: 'sample'
  };
}

// Helper to run shell commands
const { exec } = require('child_process');

function runCommand(cmd, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, { timeout }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

// Fetch weather from wttr.in
async function fetchWeather(location = 'Vancouver') {
  try {
    const https = require('https');
    return new Promise((resolve) => {
      const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
      https.get(url, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const weather = JSON.parse(data);
            const current = weather.current_condition?.[0];
            resolve({
              available: true,
              location: weather.nearest_area?.[0]?.areaName?.[0]?.value || location,
              temp_c: parseFloat(current?.temp_C || 0),
              temp_f: parseFloat(current?.temp_F || 0),
              feels_like_c: parseFloat(current?.FeelsLikeC || 0),
              condition: current?.weatherDesc?.[0]?.value || 'Unknown',
              humidity: parseInt(current?.humidity || 0),
              wind_kph: parseFloat(current?.windspeedKmph || 0),
              icon: getWeatherEmoji(current?.weatherCode),
            });
          } catch (e) {
            resolve({ available: false, error: e.message });
          }
        });
      }).on('error', (e) => resolve({ available: false, error: e.message }));
    });
  } catch (e) {
    return { available: false, error: e.message };
  }
}

function getWeatherEmoji(code) {
  const codeNum = parseInt(code || 0);
  if (codeNum >= 200 && codeNum < 300) return '⛈️';
  if (codeNum >= 300 && codeNum < 400) return '🌧️';
  if (codeNum >= 500 && codeNum < 600) return '🌧️';
  if (codeNum >= 600 && codeNum < 700) return '❄️';
  if (codeNum >= 700 && codeNum < 800) return '🌫️';
  if (codeNum === 113) return '☀️';
  if (codeNum === 116) return '⛅';
  if (codeNum === 119 || codeNum === 122) return '☁️';
  return '🌤️';
}

// Fetch calendar events using gog
async function fetchCalendarEvents() {
  try {
    const output = await runCommand(
      'GOG_KEYRING_PASSWORD="henrybot" gog calendar list --days 2 --account paul@heth.ca 2>/dev/null',
      8000
    );
    // Parse text output (columns: ID, START, END, SUMMARY)
    const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('ID'));
    const events = lines.slice(0, 10).map(line => {
      // Split by multiple spaces to separate columns
      const parts = line.split(/\s{2,}/);
      if (parts.length >= 4) {
        const [id, start, end, ...summaryParts] = parts;
        return {
          title: summaryParts.join(' ').trim(),
          start: start.trim(),
          end: end.trim(),
          allDay: !start.includes('T'),
        };
      }
      return null;
    }).filter(Boolean);
    
    return {
      available: true,
      events,
      source: 'live',
    };
  } catch (e) {
    return { available: false, error: e.message, events: [] };
  }
}

// Aggregate dashboard data
async function fetchDashboardData() {
  const [tasks, weather, calendar] = await Promise.all([
    toodledoClient ? fetchToodledoTasks() : Promise.resolve(generateSampleTaskData()),
    fetchWeather('Vancouver'),
    fetchCalendarEvents(),
  ]);

  // Calculate task summary
  const now = Math.floor(Date.now() / 1000);
  const todayStart = new Date().setHours(0, 0, 0, 0) / 1000;
  const weekAgo = now - 7 * 86400;

  const taskSummary = {
    dueToday: (tasks.open || []).filter(t => t.duedate && t.duedate <= now + 86400 && t.duedate > todayStart).length,
    overdue: (tasks.open || []).filter(t => t.duedate && t.duedate < todayStart).length,
    completedToday: (tasks.completed || []).filter(t => t.completed >= todayStart).length,
    completedWeek: (tasks.completed || []).filter(t => t.completed >= weekAgo).length,
    totalOpen: tasks.totalOpen || 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    source: 'live',
    tasks: taskSummary,
    weather,
    calendar,
  };
}

// Fetch system status
async function fetchSystemStatus() {
  const results = {
    generatedAt: new Date().toISOString(),
    source: 'live',
    services: [],
    vm: {},
  };

  // Check gateway
  try {
    const gatewayOutput = await runCommand('clawdbot gateway status 2>/dev/null | head -5', 3000);
    results.services.push({
      name: 'Clawdbot Gateway',
      status: gatewayOutput.includes('running') ? 'online' : 'offline',
      details: gatewayOutput.split('\n')[0],
    });
  } catch (e) {
    results.services.push({ name: 'Clawdbot Gateway', status: 'unknown', error: e.message });
  }

  // Check VM stats
  try {
    const uptime = await runCommand('uptime', 2000);
    const disk = await runCommand("df -h / | tail -1 | awk '{print $5}'", 2000);
    const memory = await runCommand("vm_stat | head -5", 2000);
    
    results.vm = {
      uptime: uptime.replace(/^.*up/, 'up'),
      diskUsage: disk,
      memory: memory,
    };
  } catch (e) {
    results.vm = { error: e.message };
  }

  // Check file-server itself
  results.services.push({
    name: 'File Server',
    status: 'online',
    details: `Port ${PORT}`,
  });

  return results;
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/api/files') {
    // List all files
    const files = getAllFiles();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ files, source: 'live' }));
    return;
  }
  
  if (url.pathname.startsWith('/api/files/')) {
    // Get specific file content
    const filePath = decodeURIComponent(url.pathname.slice('/api/files/'.length));
    const fileData = getFileContent(filePath);
    
    if (fileData) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fileData));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
    }
    return;
  }
  
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', files: getAllFiles().length }));
    return;
  }

  // Tasks API endpoint
  if (url.pathname === '/api/tasks') {
    fetchToodledoTasks()
      .then(data => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      })
      .catch(err => {
        console.error('Error fetching tasks:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, completed: [], open: [] }));
      });
    return;
  }
  
  // Spending API endpoint
  if (url.pathname === '/api/spending') {
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    if (spendingCollector) {
      spendingCollector.getSpendingData(forceRefresh)
        .then(data => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        })
        .catch(err => {
          console.error('Error fetching spending:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message, providers: {} }));
        });
    } else {
      // Return sample spending data
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(generateSampleSpendingData()));
    }
    return;
  }
  
  // Spending history endpoint
  if (url.pathname === '/api/spending/history') {
    const days = parseInt(url.searchParams.get('days') || '7', 10);
    
    if (spendingCollector) {
      const history = spendingCollector.loadHistoricalData(days);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ history, days }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ history: [], days, source: 'sample' }));
    }
    return;
  }

  // Dashboard API endpoint - aggregates calendar, tasks, weather
  if (url.pathname === '/api/dashboard') {
    fetchDashboardData()
      .then(data => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, source: 'error' }));
      });
    return;
  }

  // System status API endpoint
  if (url.pathname === '/api/system') {
    fetchSystemStatus()
      .then(data => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      })
      .catch(err => {
        console.error('Error fetching system status:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, source: 'error' }));
      });
    return;
  }
  
  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     📁 Mission Control File Server v1.5                  ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Server running at http://localhost:${PORT}               ║
║                                                          ║
║  Endpoints:                                              ║
║    GET /api/files          - List all files              ║
║    GET /api/files/:path    - Get file content            ║
║    GET /api/tasks          - Toodledo tasks data         ║
║    GET /api/spending       - API spending/costs          ║
║    GET /api/spending/history?days=7 - Historical data    ║
║    GET /health             - Health check                ║
║                                                          ║
║  Watching:                                               ║
║    ${CLAWD_ROOT}
║                                                          ║
║  Integrations:                                           ║
║    Toodledo: ${toodledoClient ? '✅ Connected' : '❌ Sample data'}
║    Spending: ${spendingCollector ? '✅ Connected' : '❌ Sample data'}
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);
  
  console.log(`Files available: ${getAllFiles().length}`);
});
