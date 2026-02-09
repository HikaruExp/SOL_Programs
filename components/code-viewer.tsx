'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  FileCode, 
  FolderTree, 
  ChevronRight, 
  ChevronDown,
  Download,
  Copy,
  Check,
  Code2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// Tabs component imported for future use
import { Badge } from '@/components/ui/badge';
import { RepoContent, RepoFile, fetchRepoCode } from '@/lib/fetch-code';

// Prism imports for syntax highlighting
import Prism from 'prismjs';

// Import Prism languages
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-solidity';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

interface CodeViewerProps {
  owner: string;
  repo: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children: TreeNode[];
}

function buildFileTree(files: { path: string; name: string; type: 'file' | 'dir' }[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let currentPath = '';
    let currentLevel = root;
    
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = index === parts.length - 1;
      
      if (!map.has(currentPath)) {
        const node: TreeNode = {
          name: part,
          path: currentPath,
          type: isLast ? file.type : 'dir',
          children: []
        };
        map.set(currentPath, node);
        currentLevel.push(node);
      }
      
      if (!isLast) {
        const node = map.get(currentPath)!;
        currentLevel = node.children;
      }
    });
  });
  
  return root;
}

function FileTree({ 
  nodes, 
  selectedFile, 
  onSelect,
  expandedDirs,
  onToggleDir
}: { 
  nodes: TreeNode[]; 
  selectedFile: string | null;
  onSelect: (path: string) => void;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
}) {
  const sortedNodes = [...nodes].sort((a, b) => {
    // Directories first
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  
  return (
    <ul className="space-y-0.5">
      {sortedNodes.map(node => (
        <li key={node.path}>
          {node.type === 'dir' ? (
            <div>
              <button
                onClick={() => onToggleDir(node.path)}
                className="flex items-center gap-1.5 w-full px-2 py-1 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
              >
                {expandedDirs.has(node.path) ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <FolderTree className="w-4 h-4 text-violet-500" />
                <span className="truncate">{node.name}</span>
              </button>
              {expandedDirs.has(node.path) && node.children.length > 0 && (
                <div className="ml-4 mt-0.5">
                  <FileTree 
                    nodes={node.children} 
                    selectedFile={selectedFile}
                    onSelect={onSelect}
                    expandedDirs={expandedDirs}
                    onToggleDir={onToggleDir}
                  />
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onSelect(node.path)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md transition-colors ${
                selectedFile === node.path 
                  ? 'bg-violet-50 text-violet-700' 
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <FileCode className="w-4 h-4 text-slate-500" />
              <span className="truncate">{node.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function CodeBlock({ file }: { file: RepoFile }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useCallback((node: HTMLElement | null) => {
    if (node) {
      Prism.highlightElement(node);
    }
  }, []);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const getPrismLanguage = (lang: string): string => {
    const langMap: Record<string, string> = {
      'rust': 'rust',
      'typescript': 'typescript',
      'javascript': 'javascript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'solidity': 'solidity',
      'python': 'python',
      'go': 'go',
      'c': 'c',
      'cpp': 'cpp'
    };
    return langMap[lang] || 'text';
  };
  
  const lines = file.content.split('\n');
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
          <Badge variant="secondary" className="text-xs bg-slate-200 text-slate-700 shrink-0">
            {file.language}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 text-slate-600 hover:text-slate-900 shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="px-3 py-0.5 text-right text-xs text-slate-400 select-none w-12 bg-slate-50 border-r border-slate-100">
                  {index + 1}
                </td>
                <td className="px-4 py-0.5">
                  <pre className="m-0 p-0 bg-transparent overflow-visible">
                    <code 
                      ref={index === 0 ? codeRef : undefined}
                      className={`language-${getPrismLanguage(file.language)} text-sm whitespace-pre`}
                    >
                      {line || ' '}
                    </code>
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CodeViewer({ owner, repo, isOpen, onClose }: CodeViewerProps) {
  const [content, setContent] = useState<RepoContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const loadCode = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchRepoCode(owner, repo);
      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load code');
    } finally {
      setLoading(false);
    }
  }, [owner, repo]);
  
  useEffect(() => {
    if (isOpen && !content && !loading) {
      loadCode();
    }
  }, [isOpen, content, loading, loadCode]);
  
  useEffect(() => {
    if (content?.files.length && !selectedFile) {
      setSelectedFile(content.files[0].path);
      // Auto-expand directories containing selected file
      const parts = content.files[0].path.split('/');
      const dirs = new Set<string>();
      let path = '';
      parts.slice(0, -1).forEach(part => {
        path = path ? `${path}/${part}` : part;
        dirs.add(path);
      });
      setExpandedDirs(dirs);
    }
  }, [content, selectedFile]);
  
  const handleToggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };
  
  const handleDownloadZip = () => {
    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
    window.open(zipUrl, '_blank');
  };
  
  const selectedFileData = content?.files.find(f => f.path === selectedFile);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-[90vh] max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">
                {owner}/{repo}
              </h2>
              <p className="text-sm text-muted-foreground">
                Source Code Explorer
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadZip}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download ZIP
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading source code...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-6">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Failed to Load Code
                </h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={loadCode} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          ) : content?.files.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileCode className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Code Files Found
                </h3>
                <p className="text-muted-foreground">
                  This repository doesn&apos;t have any recognizable source code files.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Sidebar - File Tree */}
              <div className="w-64 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 shrink-0">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Files ({content?.files.length || 0})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {content && (
                    <FileTree 
                      nodes={buildFileTree(content.fileTree.map(f => ({ 
                        path: f.path, 
                        name: f.name, 
                        type: f.type 
                      })))}
                      selectedFile={selectedFile}
                      onSelect={setSelectedFile}
                      expandedDirs={expandedDirs}
                      onToggleDir={handleToggleDir}
                    />
                  )}
                </div>
              </div>
              
              {/* Main Content - Code */}
              <div className="flex-1 overflow-hidden bg-white min-w-0">
                {selectedFileData ? (
                  <CodeBlock file={selectedFileData} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Select a file to view its contents
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        {content && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-muted-foreground flex items-center justify-between shrink-0">
            <span>
              Fetched {new Date(content.fetchedAt).toLocaleDateString()}
            </span>
            <a 
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              View on GitHub →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}