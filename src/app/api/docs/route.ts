import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// On Vercel: read from bundled public/memory/
// Locally: read from source memory dir
const BUNDLED_DIR = path.join(process.cwd(), 'public', 'memory');
const SOURCE_DIR = '/Users/henry_notabot/clawd/memory';

function getMemoryDir(): string {
  // Prefer bundled dir (works on Vercel)
  if (fs.existsSync(BUNDLED_DIR)) return BUNDLED_DIR;
  // Fallback to source dir (local dev)
  if (fs.existsSync(SOURCE_DIR)) return SOURCE_DIR;
  return BUNDLED_DIR; // will gracefully fail
}

function categorizeFile(filename: string): string[] {
  if (filename.match(/^\d{4}-\d{2}-\d{2}\.md$/)) return ['journal'];
  if (filename.startsWith('research_')) return ['research'];
  if (filename.startsWith('meeting_')) return ['meeting'];
  if (filename.startsWith('design_')) return ['design'];
  if (filename.includes('call') || filename.includes('transcript')) return ['call'];
  if (filename.includes('memory') || filename.includes('notes')) return ['notes'];
  return ['other'];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file');
    const memDir = getMemoryDir();

    // Check for bundled index first
    const indexPath = path.join(BUNDLED_DIR, 'index.json');
    
    if (filename) {
      const filePath = path.join(memDir, filename);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(raw);
      const stats = fs.statSync(filePath);
      
      return NextResponse.json({
        filename,
        metadata: {
          ...data,
          tags: data.tags || categorizeFile(filename),
        },
        content,
        lastModified: stats.mtime.toISOString(),
      });
    }

    // Use bundled index if available
    if (fs.existsSync(indexPath)) {
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      return NextResponse.json(index);
    }

    // Fallback: scan directory
    if (!fs.existsSync(memDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(memDir, { withFileTypes: true })
      .filter(d => d.isFile() && d.name.endsWith('.md'))
      .map(d => {
        const fp = path.join(memDir, d.name);
        const stats = fs.statSync(fp);
        try {
          const raw = fs.readFileSync(fp, 'utf8');
          const { data } = matter(raw);
          return {
            name: d.name,
            path: `memory/${d.name}`,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            tags: data.tags || categorizeFile(d.name),
            title: data.title || d.name.replace('.md', ''),
            type: 'md',
          };
        } catch {
          return {
            name: d.name,
            path: `memory/${d.name}`,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            tags: categorizeFile(d.name),
            title: d.name.replace('.md', ''),
            type: 'md',
          };
        }
      })
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Docs API error:', error);
    return NextResponse.json({ error: 'Failed to read files' }, { status: 500 });
  }
}
