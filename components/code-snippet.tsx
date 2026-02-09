'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchRepoCode, RepoFile } from '@/lib/fetch-code';

interface CodeSnippetProps {
  owner: string;
  repo: string;
}

export function CodeSnippet({ owner, repo }: CodeSnippetProps) {
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function loadCode() {
      try {
        const repoContent = await fetchRepoCode(owner, repo);
        setFiles(repoContent.files.slice(0, 5));
      } catch {
        setError('Failed to load code preview');
      } finally {
        setLoading(false);
      }
    }
    loadCode();
  }, [owner, repo]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-4">
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

  const mainFile = files[0];
  const lines = mainFile.content.split('\n');
  const displayLines = expanded ? lines : lines.slice(0, 20);
  const isTruncated = lines.length > 20;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {mainFile.name}
        </h3>
        <span className="text-xs text-muted-foreground capitalize">
          {mainFile.language}
        </span>
      </div>
      
      <div className="relative">
        <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed max-h-[300px] overflow-y-auto font-mono">
          <code>{displayLines.join('\n')}</code>
        </pre>
        {!expanded && isTruncated && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-900 to-transparent" />
        )}
      </div>
      
      {isTruncated && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? 'Show less' : `Show ${lines.length - 20} more lines`}
        </Button>
      )}
      
      {files.length > 1 && (
        <p className="text-xs text-muted-foreground">
          +{files.length - 1} more files available on GitHub
        </p>
      )}
    </div>
  );
}
