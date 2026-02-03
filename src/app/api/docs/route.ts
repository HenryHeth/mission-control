import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const MEMORY_DIR = '/Users/henry_notabot/clawd/memory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file');

    if (filename) {
      // Return specific file content
      const filePath = path.join(MEMORY_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContent);
      
      return NextResponse.json({
        filename,
        metadata: data,
        content,
        lastModified: fs.statSync(filePath).mtime,
      });
    }

    // Return list of files
    if (!fs.existsSync(MEMORY_DIR)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(MEMORY_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md'))
      .map(dirent => {
        const filePath = path.join(MEMORY_DIR, dirent.name);
        const stats = fs.statSync(filePath);
        
        // Try to extract front matter for tags/metadata
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const { data } = matter(content);
          
          return {
            name: dirent.name,
            path: filePath,
            size: stats.size,
            lastModified: stats.mtime,
            tags: data.tags || [],
            title: data.title || dirent.name.replace('.md', ''),
            type: 'md',
          };
        } catch (error) {
          return {
            name: dirent.name,
            path: filePath,
            size: stats.size,
            lastModified: stats.mtime,
            tags: [],
            title: dirent.name.replace('.md', ''),
            type: 'md',
          };
        }
      })
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error reading memory files:', error);
    return NextResponse.json({ error: 'Failed to read files' }, { status: 500 });
  }
}