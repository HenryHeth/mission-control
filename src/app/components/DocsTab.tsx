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

  // Get unique tags from all files
  const allTags = Array.from(
    new Set(files.flatMap(file => file.tags))
  ).sort();

  // Filter files based on search and tags
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
        <div className="text-gray-400">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar with file list and filters */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold mb-4">📖 Documents</h2>
          
          {/* Search */}
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold mb-2 text-gray-300">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredFiles.map((file) => (
              <div
                key={file.name}
                onClick={() => handleFileSelect(file.name)}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                  selectedFile === file.name
                    ? 'bg-blue-600 border-blue-500'
                    : 'hover:bg-gray-700 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium truncate flex-1">
                    {file.title}
                  </span>
                  <span className="file-badge md ml-2">MD</span>
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  {formatDate(file.lastModified)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </div>
                {file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {file.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-gray-600 text-gray-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {file.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{file.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {filteredFiles.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm || selectedTags.length > 0 
                  ? 'No files match your filters' 
                  : 'No documents found'}
              </div>
            )}
          </div>
        </div>

        {/* Footer stats */}
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
          <div>{filteredFiles.length} of {files.length} files</div>
        </div>
      </div>

      {/* Content pane */}
      <div className="flex-1 flex flex-col">
        {selectedFile && fileContent ? (
          <>
            {/* Content header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {fileContent.metadata.title || selectedFile.replace('.md', '')}
                  </h3>
                  <div className="text-sm text-gray-400 mt-1">
                    Last modified: {formatDate(fileContent.lastModified)}
                  </div>
                </div>
                {fileContent.metadata.tags && (
                  <div className="flex flex-wrap gap-2">
                    {fileContent.metadata.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-blue-900 text-blue-200 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {contentLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">Loading content...</div>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    className="text-gray-100"
                    components={{
                      h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-600 pb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-xl font-semibold mb-3 text-white mt-6">{children}</h2>,
                      h3: ({children}) => <h3 className="text-lg font-medium mb-2 text-white mt-4">{children}</h3>,
                      p: ({children}) => <p className="mb-4 text-gray-100 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-100">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-100">{children}</ol>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic mb-4 text-gray-300">{children}</blockquote>,
                      code: ({children}) => <code className="bg-gray-800 px-2 py-1 rounded text-blue-300 text-sm">{children}</code>,
                      pre: ({children}) => <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4 border border-gray-700">{children}</pre>,
                      a: ({children, href}) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      table: ({children}) => <table className="w-full border-collapse border border-gray-600 mb-4">{children}</table>,
                      th: ({children}) => <th className="border border-gray-600 px-3 py-2 bg-gray-800 text-left font-semibold">{children}</th>,
                      td: ({children}) => <td className="border border-gray-600 px-3 py-2">{children}</td>,
                    }}
                  >
                    {fileContent.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📖</div>
              <div className="text-xl mb-2">Select a document</div>
              <div className="text-sm">Choose a file from the sidebar to view its content</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}