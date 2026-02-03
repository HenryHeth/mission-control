'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  metadata: Record<string, any>;
  content: string;
  lastModified: string;
}

export default function DocsTab() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = Array.from(
    new Set(files.flatMap(file => file.tags))
  ).sort();

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => file.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/docs');
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (filename: string) => {
    setContentLoading(true);
    try {
      const response = await fetch(`/api/docs?file=${encodeURIComponent(filename)}`);
      const data = await response.json();
      setFileContent(data);
    } catch (error) {
      console.error('Error fetching file content:', error);
    } finally {
      setContentLoading(false);
    }
  };

  const handleFileSelect = (filename: string) => {
    setSelectedFile(filename);
    fetchFileContent(filename);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar: search + tags + file list */}
      <div className="w-64 border-r border-[#2a2a2e] flex flex-col bg-[#111113]">
        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-[#1a1a1e] border border-[#2a2a2e] rounded-md text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#444]"
            />
          </div>
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto border-t border-[#2a2a2e]">
          <div className="p-1.5 space-y-0.5">
            {filteredFiles.map((file) => (
              <div
                key={file.name}
                onClick={() => handleFileSelect(file.name)}
                className={`px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                  selectedFile === file.name
                    ? 'bg-[#2a2a30] text-white'
                    : 'text-gray-400 hover:bg-[#1a1a1e] hover:text-gray-200'
                }`}
              >
                <div className="text-sm font-medium truncate">
                  {file.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[0.6875rem] text-gray-600">
                    {formatDate(file.lastModified)}
                  </span>
                  <span className="text-[0.6875rem] text-gray-600">·</span>
                  <span className="text-[0.6875rem] text-gray-600">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
            ))}
            {filteredFiles.length === 0 && (
              <div className="p-4 text-center text-gray-600 text-sm">
                {searchTerm || selectedTags.length > 0 
                  ? 'No files match' 
                  : 'No documents found'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-[#2a2a2e] text-[0.6875rem] text-gray-600">
          {filteredFiles.length} of {files.length} files
        </div>
      </div>

      {/* Right: Content pane */}
      <div className="flex-1 flex flex-col bg-[#111113]">
        {selectedFile && fileContent ? (
          <>
            {/* Content header */}
            <div className="px-6 py-4 border-b border-[#2a2a2e]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {fileContent.metadata.title || selectedFile.replace('.md', '')}
                  </h3>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(fileContent.lastModified)}
                  </div>
                </div>
                {fileContent.metadata.tags && (
                  <div className="flex flex-wrap gap-1.5">
                    {fileContent.metadata.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="tag-chip"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {contentLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({children}) => <h1 className="text-xl font-bold mb-4 text-white border-b border-[#2a2a2e] pb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-lg font-semibold mb-3 text-white mt-6">{children}</h2>,
                      h3: ({children}) => <h3 className="text-base font-medium mb-2 text-gray-200 mt-4">{children}</h3>,
                      p: ({children}) => <p className="mb-3 text-gray-300 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-300">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-300">{children}</ol>,
                      blockquote: ({children}) => <blockquote className="border-l-2 border-[#444] pl-4 italic mb-3 text-gray-400">{children}</blockquote>,
                      code: ({children}) => <code className="bg-[#1a1a1e] px-1.5 py-0.5 rounded text-[#93b4f0] text-xs">{children}</code>,
                      pre: ({children}) => <pre className="bg-[#1a1a1e] p-4 rounded-md overflow-x-auto mb-3 border border-[#2a2a2e] text-xs">{children}</pre>,
                      a: ({children, href}) => <a href={href} className="text-[#6ea1f0] hover:text-[#93b4f0] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      table: ({children}) => <table className="w-full border-collapse border border-[#2a2a2e] mb-3 text-xs">{children}</table>,
                      th: ({children}) => <th className="border border-[#2a2a2e] px-3 py-2 bg-[#1a1a1e] text-left font-semibold text-gray-300">{children}</th>,
                      td: ({children}) => <td className="border border-[#2a2a2e] px-3 py-2 text-gray-400">{children}</td>,
                    }}
                  >
                    {fileContent.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-40">📄</div>
              <div className="text-sm">Select a document</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
