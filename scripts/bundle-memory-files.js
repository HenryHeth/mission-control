const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const MEMORY_SOURCE_DIR = path.join(__dirname, '..', 'data', 'memory');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'memory');

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function categorizeFile(filename) {
  const tags = [];
  
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
  } else {
    tags.push('other');
  }
  
  return tags;
}

function processMemoryFiles() {
  console.log('Bundling memory files...');
  
  // Ensure output directory exists
  ensureDirectoryExists(OUTPUT_DIR);
  
  // Check if source directory exists
  if (!fs.existsSync(MEMORY_SOURCE_DIR)) {
    console.warn(`Warning: Memory source directory not found: ${MEMORY_SOURCE_DIR}`);
    // Create empty index for graceful fallback
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify({ files: [] }));
    return;
  }
  
  // Read all .md files from memory directory
  const files = fs.readdirSync(MEMORY_SOURCE_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md'))
    .map(dirent => {
      const filename = dirent.name;
      const filePath = path.join(MEMORY_SOURCE_DIR, filename);
      const stats = fs.statSync(filePath);
      
      try {
        // Read file content and extract front matter
        const content = fs.readFileSync(filePath, 'utf8');
        const { data, content: markdownContent } = matter(content);
        
        // Copy the file to public/memory
        const outputPath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(outputPath, content);
        
        // Generate file metadata
        const title = data.title || filename.replace('.md', '');
        const tags = data.tags || categorizeFile(filename);
        
        return {
          name: filename,
          path: `memory/${filename}`,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          tags: Array.isArray(tags) ? tags : [tags],
          title,
          type: 'md',
        };
      } catch (error) {
        console.warn(`Warning: Could not process file ${filename}:`, error.message);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  
  // Write the index file
  const index = { files };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(index, null, 2));
  
  console.log(`Bundled ${files.length} memory files to ${OUTPUT_DIR}`);
  files.forEach(file => {
    console.log(`  - ${file.name} (${file.tags.join(', ')})`);
  });
}

// Also bundle root workspace config files (TOOLS.md, SOUL.md, etc.)
function bundleRootConfigs() {
  const CLAWD_ROOT = path.join(__dirname, '..', '..'); // /Users/henry_notabot/clawd
  const ROOT_FILES = ['TOOLS.md', 'SOUL.md', 'AGENTS.md', 'USER.md', 'IDENTITY.md', 'MEMORY.md', 'HEARTBEAT.md'];
  
  ensureDirectoryExists(OUTPUT_DIR);
  
  const files = [];
  for (const filename of ROOT_FILES) {
    const filePath = path.join(CLAWD_ROOT, filename);
    if (!fs.existsSync(filePath)) continue;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      const outputPath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(outputPath, content);
      
      files.push({
        name: filename,
        path: `memory/${filename}`,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        tags: ['config', 'workspace'],
        title: filename.replace('.md', ''),
        type: 'md',
      });
      console.log(`  + ${filename} (config, workspace)`);
    } catch (error) {
      console.warn(`Warning: Could not process root file ${filename}:`, error.message);
    }
  }
  return files;
}

// Run the bundling
if (require.main === module) {
  processMemoryFiles();
  
  // Merge root configs into the index
  const rootFiles = bundleRootConfigs();
  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  index.files = [...rootFiles, ...index.files];
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`Total: ${index.files.length} files (including ${rootFiles.length} workspace configs)`);
}

module.exports = { processMemoryFiles };