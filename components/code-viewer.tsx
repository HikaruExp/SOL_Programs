'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Copy, Check, ChevronDown, ChevronRight, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchRepoCode, RepoFile } from '@/lib/fetch-code';
import { cn } from '@/lib/utils';

interface CodeViewerProps {
  owner: string;
  repo: string;
}

export function CodeViewer({ owner, repo }: CodeViewerProps) {
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFileList, setShowFileList] = useState(false);

  useEffect(() => {
    async function loadCode() {
      try {
        const repoContent = await fetchRepoCode(owner, repo);
        setFiles(repoContent.files);
        if (repoContent.files.length > 0) {
          setSelectedFile(0);
        }
      } catch {
        setError('Failed to load code preview');
      } finally {
        setLoading(false);
      }
    }
    loadCode();
  }, [owner, repo]);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.warn('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-4 bg-slate-50 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading code preview...
      </div>
    );
  }

  if (error || files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-slate-50 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        Code preview not available
      </div>
    );
  }

  const currentFile = files[selectedFile];
  const lines = currentFile.content.split('\n');
  const displayLines = expanded ? lines : lines.slice(0, 25);
  const isTruncated = lines.length > 25;

  return (
    <div className="space-y-3">
      {/* File Selector */}
      {files.length > 1 && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowFileList(!showFileList)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium">{currentFile.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                ({currentFile.language})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedFile + 1} of {files.length}
              </span>
              {showFileList ? (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </button>
          
          {showFileList && (
            <div className="border-t bg-white">
              {files.map((file, index) => (
                <button
                  key={file.path}
                  onClick={() => {
                    setSelectedFile(index);
                    setShowFileList(false);
                    setExpanded(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors",
                    selectedFile === index && "bg-violet-50 hover:bg-violet-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-slate-400" />
                    <span className={cn(
                      "text-sm",
                      selectedFile === index ? "font-medium text-violet-700" : "text-slate-700"
                    )}>
                      {file.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {file.language}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Single file display (no selector needed) */}
      {files.length === 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium">{currentFile.name}</span>
            <span className="text-xs text-muted-foreground capitalize">
              ({currentFile.language})
            </span>
          </div>
        </div>
      )}

      {/* Code Display */}
      <div className="relative group">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 px-2 bg-slate-700 text-white hover:bg-slate-600"
            onClick={() => handleCopy(currentFile.content)}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <pre className="bg-slate-900 text-slate-50 p-4 pt-10 rounded-lg overflow-x-auto text-xs leading-relaxed max-h-[400px] overflow-y-auto font-mono">
          <code>{displayLines.join('\n')}</code>
        </pre>
        
        {!expanded && isTruncated && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent" />
        )}
      </div>
      
      {/* Show More/Less */}
      {isTruncated && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? 'Show less' : `Show ${lines.length - 25} more lines`}
        </Button>
      )}
    </div>
  );
}
