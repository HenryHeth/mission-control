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

// Load .env from clawd root
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

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
// Fetch RescueTime data — 7-day averages + today's values
async function fetchRescueTime() {
  const apiKey = process.env.RESCUETIME_API_KEY;
  if (!apiKey) return null;
  const today = new Date().toLocaleDateString('en-CA');
  const weekAgo = new Date(Date.now() - 6 * 86400000).toLocaleDateString('en-CA');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    // Fetch 7-day ranges + today's activity for YouTube
    const [summaryRes, computerRes, mobileRes, activityRes, todayComputerRes, todayMobileRes, todayActivityRes] = await Promise.all([
      fetch(`https://www.rescuetime.com/anapi/daily_summary_feed?key=${apiKey}`, { signal: controller.signal }),
      fetch(`https://www.rescuetime.com/anapi/data?key=${apiKey}&perspective=interval&restrict_kind=overview&restrict_source_type=computers&restrict_begin=${weekAgo}&restrict_end=${today}&format=json`, { signal: controller.signal }),
      fetch(`https://www.rescuetime.com/anapi/data?key=${apiKey}&perspective=interval&restrict_kind=overview&restrict_source_type=mobile&restrict_begin=${weekAgo}&restrict_end=${today}&format=json`, { signal: controller.signal }),
      fetch(`https://www.rescuetime.com/anapi/data?key=${apiKey}&perspective=rank&restrict_kind=activity&restrict_begin=${weekAgo}&restrict_end=${today}&format=json`, { signal: controller.signal }),
      fetch(`https://www.rescuetime.com/anapi/data?key=${apiKey}&perspective=interval&restrict_kind=overview&restrict_source_type=computers&restrict_begin=${today}&restrict_end=${today}&format=json`, { signal: controller.signal }),
      fetch(`https://www.rescuetime.com/anapi/data?key=${apiKey}&perspective=interval&restrict_kind=overview&restrict_source_type=mobile&restrict_begin=${today}&restrict_end=${today}&format=json`, { signal: controller.signal }),
      fetch(`https://www.rescuetime.com/anapi/data?key=${apiKey}&perspective=rank&restrict_kind=activity&restrict_begin=${today}&restrict_end=${today}&format=json`, { signal: controller.signal }),
    ]);
    clearTimeout(timeout);

    // Helper: sum seconds from rows, group by day, return {total, dailyAvg, days}
    const sumByDay = (data) => {
      const byDay = {};
      data.rows?.forEach(r => { const d = r[0].slice(0, 10); byDay[d] = (byDay[d] || 0) + r[1]; });
      const days = Object.keys(byDay).length || 1;
      const total = Object.values(byDay).reduce((a, b) => a + b, 0);
      return { total: total / 3600, avg: total / 3600 / days, days };
    };

    const sumTotal = (data) => {
      let total = 0;
      data.rows?.forEach(r => total += r[1]);
      return total / 3600;
    };

    // Productivity pulse (avg from daily summaries)
    let pulseSum = 0, pulseCount = 0;
    if (summaryRes.ok) {
      const summary = await summaryRes.json();
      summary?.slice(0, 7).forEach(d => { if (d.productivity_pulse) { pulseSum += d.productivity_pulse; pulseCount++; } });
    }

    // 7-day computer
    const computer7d = computerRes.ok ? sumByDay(await computerRes.json()) : { avg: 0 };
    // 7-day mobile
    const mobile7d = mobileRes.ok ? sumByDay(await mobileRes.json()) : { avg: 0 };
    // 7-day YouTube
    let youtube7dTotal = 0;
    if (activityRes.ok) {
      const data = await activityRes.json();
      data.rows?.filter(r => r[3]?.toLowerCase().includes('youtube')).forEach(r => youtube7dTotal += r[1]);
    }

    // Today's values
    const todayComputer = todayComputerRes.ok ? sumTotal(await todayComputerRes.json()) : 0;
    const todayMobile = todayMobileRes.ok ? sumTotal(await todayMobileRes.json()) : 0;
    let todayYoutube = 0;
    if (todayActivityRes.ok) {
      const data = await todayActivityRes.json();
      data.rows?.filter(r => r[3]?.toLowerCase().includes('youtube')).forEach(r => todayYoutube += r[1]);
    }

    return {
      // 7-day daily averages (for the "Last 7 Days" card)
      computer7dAvg: parseFloat(computer7d.avg.toFixed(1)),
      mobile7dAvg: parseFloat(mobile7d.avg.toFixed(1)),
      youtube7dAvg: parseFloat((youtube7dTotal / 3600 / 7).toFixed(1)),
      pulse7dAvg: pulseCount > 0 ? Math.round(pulseSum / pulseCount) : 0,
      // Today's values (for reference)
      computerToday: parseFloat(todayComputer.toFixed(1)),
      mobileToday: parseFloat(todayMobile.toFixed(1)),
      youtubeToday: parseFloat((todayYoutube / 3600).toFixed(1)),
    };
  } catch (e) {
    console.error('RescueTime fetch error:', e.message);
    return null;
  }
}

// Fetch Home Assistant desk sensor
// Fetch today's desk time from Home Assistant
async function fetchDeskTime() {
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!token) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('http://192.168.1.96:8123/api/states/sensor.sitting_at_desk', {
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return parseFloat(parseFloat(data.state).toFixed(1));
  } catch (e) {
    console.error('Home Assistant fetch error:', e.message);
    return null;
  }
}

// Fetch desk time history from Home Assistant (up to 60 days)
async function fetchDeskTimeHistory(days = 7) {
  const token = process.env.HOME_ASSISTANT_TOKEN;
  if (!token) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().slice(0, 19);
    const endStr = new Date().toISOString().slice(0, 19);
    const res = await fetch(
      `http://192.168.1.96:8123/api/history/period/${startStr}?filter_entity_id=sensor.sitting_at_desk&minimal_response&no_attributes&end_time=${endStr}`,
      { signal: controller.signal, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]) return null;

    // Group by LOCAL date, get max value per day (cumulative sensor resets daily)
    const byDay = {};
    data[0].forEach(p => {
      const ts = p.last_changed || p.last_updated || '';
      if (!ts) return;
      // Convert UTC timestamp to local date string
      const localDate = new Date(ts).toLocaleDateString('en-CA'); // YYYY-MM-DD in local TZ
      const val = parseFloat(p.state);
      if (localDate && !isNaN(val)) {
        if (!byDay[localDate] || val > byDay[localDate]) byDay[localDate] = val;
      }
    });
    return Object.entries(byDay).sort().map(([date, hours]) => ({
      date,
      hours: parseFloat(hours.toFixed(1)),
    }));
  } catch (e) {
    console.error('HA history fetch error:', e.message);
    return null;
  }
}

async function fetchDashboardData() {
  // Fetch all data in parallel, with short timeouts on non-critical sources
  const [tasks, weather, calendar, rescueTime, deskTime, deskHistory] = await Promise.all([
    toodledoClient ? fetchToodledoTasks() : Promise.resolve(generateSampleTaskData()),
    fetchWeather('Vancouver').catch(() => ({ available: false })),
    fetchCalendarEvents().catch(() => ({ available: false })),
    fetchRescueTime().catch(() => null),
    fetchDeskTime().catch(() => null),
    fetchDeskTimeHistory(7).catch(() => null),
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

  // Build metrics from live sources
  const metrics = {};
  if (deskTime !== null) metrics.deskToday = deskTime;
  if (deskHistory) {
    metrics.deskHistory = deskHistory;
    // Calculate 7-day desk average from history
    const last7 = deskHistory.slice(-7);
    metrics.desk7dAvg = parseFloat((last7.reduce((s, d) => s + d.hours, 0) / last7.length).toFixed(1));
  }
  if (rescueTime) {
    // 7-day averages for "Last 7 Days" card
    metrics.computer = rescueTime.computer7dAvg;
    metrics.mobile = rescueTime.mobile7dAvg;
    metrics.youtube = rescueTime.youtube7dAvg;
    metrics.productivityPulse = rescueTime.pulse7dAvg;
    // Today's values for reference
    metrics.computerToday = rescueTime.computerToday;
    metrics.mobileToday = rescueTime.mobileToday;
    metrics.youtubeToday = rescueTime.youtubeToday;
  }

  const result = {
    generatedAt: new Date().toISOString(),
    source: 'live',
    tasks: taskSummary,
    weather,
    calendar,
  };

  // Only include metrics if we have any live data
  if (Object.keys(metrics).length > 0) {
    result.metrics = metrics;
  }

  return result;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
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
    const filePath = decodeURIComponent(url.pathname.slice('/api/files/'.length));
    
    // PUT: Save file with backup
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { content, backup } = JSON.parse(body);
          if (typeof content !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Content must be a string' }));
            return;
          }
          
          // Resolve full path (only allow workspace files)
          let fullPath;
          if (['MEMORY.md', 'SOUL.md', 'TOOLS.md', 'USER.md', 'AGENTS.md', 'HEARTBEAT.md', 'IDENTITY.md'].includes(filePath)) {
            fullPath = path.join(CLAWD_ROOT, filePath);
          } else if (filePath.startsWith('memory/') || filePath.startsWith('docs/')) {
            fullPath = path.join(CLAWD_ROOT, filePath);
          } else {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File not editable' }));
            return;
          }
          
          if (!fs.existsSync(fullPath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File not found' }));
            return;
          }
          
          // Create backup if requested (or always for safety)
          const backupDir = path.join(CLAWD_ROOT, '.backups');
          if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const safeName = filePath.replace(/\//g, '_');
          const backupPath = path.join(backupDir, `${safeName}.${timestamp}.bak`);
          
          if (backup !== false) {
            // Always create backup unless explicitly opted out
            fs.copyFileSync(fullPath, backupPath);
            console.log(`Backup created: ${backupPath}`);
          }
          
          // Write the new content
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`File saved: ${fullPath} (${content.length} bytes)`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            ok: true, 
            path: filePath, 
            size: content.length, 
            backupPath: backup !== false ? backupPath : null,
            savedAt: new Date().toISOString()
          }));
        } catch (e) {
          console.error('Save error:', e.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    
    // GET: Read specific file content
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

  // Search API endpoint (v1.5)
  if (url.pathname === '/api/search') {
    const query = url.searchParams.get('q') || '';
    if (!query.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Query parameter "q" is required', results: [] }));
      return;
    }
    
    try {
      const files = getAllFiles();
      const queryLower = query.toLowerCase();
      const results = [];
      
      for (const file of files) {
        // Check if query matches filename
        const nameMatch = file.name.toLowerCase().includes(queryLower);
        
        // Try to read file content and search
        let fullPath;
        if (ROOT_CONFIG_FILES.includes(file.path)) {
          fullPath = path.join(CLAWD_ROOT, file.path);
        } else if (file.path.startsWith('memory/') || file.path.startsWith('docs/')) {
          fullPath = path.join(CLAWD_ROOT, file.path);
        } else {
          fullPath = path.join(MEMORY_DIR, file.path);
        }
        
        if (!fs.existsSync(fullPath)) continue;
        
        const content = fs.readFileSync(fullPath, 'utf8');
        const contentLower = content.toLowerCase();
        
        // Count matches in content
        let matches = 0;
        let idx = 0;
        while ((idx = contentLower.indexOf(queryLower, idx)) !== -1) {
          matches++;
          idx += queryLower.length;
        }
        
        if (nameMatch || matches > 0) {
          // Extract a snippet around the first match
          let snippet = '';
          const firstMatchIdx = contentLower.indexOf(queryLower);
          if (firstMatchIdx !== -1) {
            const start = Math.max(0, firstMatchIdx - 50);
            const end = Math.min(content.length, firstMatchIdx + queryLower.length + 100);
            snippet = content.slice(start, end)
              .replace(/\n/g, ' ')
              .replace(new RegExp(query, 'gi'), '<mark>$&</mark>');
            if (start > 0) snippet = '...' + snippet;
            if (end < content.length) snippet = snippet + '...';
          }
          
          results.push({
            name: file.name,
            path: file.path,
            snippet,
            matches: matches + (nameMatch ? 1 : 0),
          });
        }
      }
      
      // Sort by match count
      results.sort((a, b) => b.matches - a.matches);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results: results.slice(0, 20), query }));
    } catch (err) {
      console.error('Search error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, results: [] }));
    }
    return;
  }
  
  // ═══════════════════════════════════════════════════
  // POST Actions: Telegram Dump, Service Restart
  // ═══════════════════════════════════════════════════
  
  if (req.method === 'POST' && url.pathname === '/api/actions/telegram-dump') {
    // Trigger a telegram dump via qmd update
    const { exec } = require('child_process');
    const bunPath = path.join(process.env.HOME || '', '.bun/bin');
    exec(
      `export PATH="${bunPath}:$PATH" && cd "${CLAWD_ROOT}" && qmd update`,
      { timeout: 30000 },
      (err, stdout, stderr) => {
        if (err) {
          console.error('Telegram dump error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message, stderr }));
        } else {
          console.log('Telegram dump triggered:', stdout.trim());
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, output: stdout.trim() }));
        }
      }
    );
    return;
  }
  
  if (req.method === 'POST' && url.pathname === '/api/actions/restart-service') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { service } = JSON.parse(body);
        const { exec } = require('child_process');
        
        const commands = {
          'voice': `pkill -f "node.*voice-realtime" 2>/dev/null; sleep 1; cd "${path.join(CLAWD_ROOT, 'voice-realtime')}" && nohup node index.js > /dev/null 2>&1 &`,
          'gateway': `clawdbot gateway restart`,
          'file-server': null, // Can't restart ourselves
          'browser': `pkill -f "Brave.*remote-debugging" 2>/dev/null; sleep 2; open -a "Brave Browser" --args --remote-debugging-port=18800 --user-data-dir="${path.join(process.env.HOME || '', '.clawdbot/browser/clawd/user-data')}"`,
        };
        
        if (!service || !commands[service]) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: `Unknown service: ${service}. Valid: ${Object.keys(commands).join(', ')}` }));
          return;
        }
        
        if (service === 'file-server') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Cannot restart self — use process manager' }));
          return;
        }
        
        exec(commands[service], { timeout: 15000 }, (err, stdout, stderr) => {
          if (err && service !== 'voice') { // voice pkill returns non-zero if no process, that's ok
            console.error(`Restart ${service} error:`, err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          } else {
            console.log(`Restarted ${service}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, service, message: `${service} restart initiated` }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  
  // Persistent heartbeat data endpoint
  if (url.pathname === '/api/heartbeat-history') {
    try {
      const data = captureHeartbeatData(); // Always fresh scan
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ timestamps: data, count: data.length }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ timestamps: [], count: 0 }));
    }
    return;
  }
  
  // Service uptime history endpoint
  if (url.pathname === '/api/service-health') {
    const historyPath = path.join(process.env.HOME || '', '.clawdbot', 'logs', 'service-health-history.json');
    try {
      if (fs.existsSync(historyPath)) {
        const data = fs.readFileSync(historyPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({}));
      }
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    }
    return;
  }
  
  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ═══════════════════════════════════════════════════
// Service Health Tracker — records uptime every 5 min
// ═══════════════════════════════════════════════════
const HEALTH_HISTORY_PATH = path.join(process.env.HOME || '', '.clawdbot', 'logs', 'service-health-history.json');

async function checkServiceHealth(url, timeoutMs = 3000) {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    return res.ok || res.status < 500;
  } catch { return false; }
}

const HEARTBEAT_PERSISTENT_PATH = path.join(process.env.HOME || '', '.clawdbot', 'logs', 'heartbeat-persistent.json');
const GATEWAY_LOG_PATH = path.join(process.env.HOME || '', '.clawdbot', 'logs', 'gateway.log');
const HEARTBEAT_LAST_RUN_PATH = path.join(process.env.HOME || '', '.clawdbot', 'logs', 'heartbeat-last-run.json');

// Scan gateway log + heartbeat-last-run for heartbeat timestamps
// Merges into persistent store that survives session restarts
function captureHeartbeatData() {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  // Load existing persistent data
  let timestamps = new Set();
  try {
    if (fs.existsSync(HEARTBEAT_PERSISTENT_PATH)) {
      const data = JSON.parse(fs.readFileSync(HEARTBEAT_PERSISTENT_PATH, 'utf8'));
      if (Array.isArray(data)) {
        data.forEach(ts => {
          if (new Date(ts).getTime() > sevenDaysAgo) timestamps.add(ts);
        });
      }
    }
  } catch {}
  
  // Source 1: Gateway log — scan for [heartbeat] started entries
  try {
    if (fs.existsSync(GATEWAY_LOG_PATH)) {
      const content = fs.readFileSync(GATEWAY_LOG_PATH, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[heartbeat\]\s+started/);
        if (match) {
          const ts = match[1];
          if (new Date(ts).getTime() > sevenDaysAgo) {
            timestamps.add(ts);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading gateway log for heartbeats:', e.message);
  }
  
  // Source 2: heartbeat-last-run.json (written by Henry during heartbeat)
  try {
    if (fs.existsSync(HEARTBEAT_LAST_RUN_PATH)) {
      const data = JSON.parse(fs.readFileSync(HEARTBEAT_LAST_RUN_PATH, 'utf8'));
      if (data.lastRun) {
        const ts = new Date(data.lastRun).toISOString();
        if (new Date(ts).getTime() > sevenDaysAgo) {
          timestamps.add(ts);
        }
      }
    }
  } catch {}
  
  // Source 3: heartbeat-history.json (session-scoped, may have extras)
  const historyPath = path.join(process.env.HOME || '', '.clawdbot', 'logs', 'heartbeat-history.json');
  try {
    if (fs.existsSync(historyPath)) {
      const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      if (Array.isArray(data)) {
        data.forEach(ts => {
          if (new Date(ts).getTime() > sevenDaysAgo) {
            timestamps.add(new Date(ts).toISOString());
          }
        });
      }
    }
  } catch {}
  
  // Deduplicate (within 2 min = same heartbeat)
  const sorted = [...timestamps].map(t => new Date(t)).sort((a, b) => a - b);
  const deduped = [];
  for (const ts of sorted) {
    if (deduped.length === 0 || ts.getTime() - deduped[deduped.length - 1].getTime() > 2 * 60 * 1000) {
      deduped.push(ts);
    }
  }
  
  // Write persistent file
  const result = deduped.map(d => d.toISOString());
  const dir = path.dirname(HEARTBEAT_PERSISTENT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HEARTBEAT_PERSISTENT_PATH, JSON.stringify(result));
  
  return result;
}

async function recordServiceHealth() {
  const now = new Date().toISOString();
  const checks = {
    gateway: await checkServiceHealth('http://127.0.0.1:18789/'),
    voice: await checkServiceHealth('http://127.0.0.1:6060/'),
    'file-server': true, // We're running, so yes
    browser: await checkServiceHealth('http://127.0.0.1:18800/json/version'),
  };
  
  let history = {};
  try {
    if (fs.existsSync(HEALTH_HISTORY_PATH)) {
      history = JSON.parse(fs.readFileSync(HEALTH_HISTORY_PATH, 'utf8'));
    }
  } catch {}
  
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  for (const [service, isUp] of Object.entries(checks)) {
    if (!history[service]) history[service] = [];
    history[service].push({ time: now, ok: isUp });
    // Keep only last 24h (288 entries at 5min intervals)
    history[service] = history[service].filter(e => new Date(e.time).getTime() > twentyFourHoursAgo);
  }
  
  const dir = path.dirname(HEALTH_HISTORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HEALTH_HISTORY_PATH, JSON.stringify(history, null, 2));
  
  // Also capture heartbeat data every check
  captureHeartbeatData();
}

// Record health on startup and every 5 minutes
recordServiceHealth();
setInterval(recordServiceHealth, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     📁 Mission Control File Server v1.5.0                ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Server running at http://localhost:${PORT}               ║
║                                                          ║
║  Endpoints:                                              ║
║    GET /api/files          - List all files              ║
║    GET /api/files/:path    - Get file content            ║
║    GET /api/search?q=...   - Search file contents        ║
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
