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
  
  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     📁 Mission Control File Server                       ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Server running at http://localhost:${PORT}               ║
║                                                          ║
║  Endpoints:                                              ║
║    GET /api/files          - List all files              ║
║    GET /api/files/:path    - Get file content            ║
║    GET /health             - Health check                ║
║                                                          ║
║  Watching:                                               ║
║    ${CLAWD_ROOT}
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);
  
  console.log(`Files available: ${getAllFiles().length}`);
});
