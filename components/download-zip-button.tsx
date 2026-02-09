'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, AlertCircle, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DownloadZipButtonProps {
  owner: string;
  repo: string;
}

const COMMON_BRANCHES = ['main', 'master', 'dev', 'develop'];

export function DownloadZipButton({ owner, repo }: DownloadZipButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedBranch, setDetectedBranch] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    async function detectBranch() {
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (response.ok) {
          const data = await response.json();
          setDetectedBranch(data.default_branch);
        }
      } catch {
        // Silently fail, will try common branches
      }
    }
    detectBranch();
  }, [owner, repo]);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    setDownloadStarted(false);

    const branchesToTry = detectedBranch 
      ? [detectedBranch, ...COMMON_BRANCHES.filter(b => b !== detectedBranch)]
      : COMMON_BRANCHES;

    for (const branch of branchesToTry) {
      const url = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
      
      try {
        // Try to check if the URL exists with a HEAD request
        const checkResponse = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        
        // Create temporary link to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `${repo}-${branch}.zip`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setDownloadStarted(true);
        setLoading(false);
        
        // Reset success message after 3 seconds
        setTimeout(() => setDownloadStarted(false), 3000);
        return;
        
      } catch {
        // Try next branch
        continue;
      }
    }

    // If all branches fail, show error with link to GitHub
    setError('Download not available directly. Open on GitHub?');
    setLoading(false);
  };

  const openGitHub = () => {
    window.open(`https://github.com/${owner}/${repo}`, '_blank');
    setError(null);
  };

  return (
    <div className="w-full">
      <Button 
        variant="outline" 
        className="w-full gap-2 rounded-xl" 
        size="lg"
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : downloadStarted ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {loading ? 'Checking...' : downloadStarted ? 'Downloaded!' : 'Download ZIP'}
      </Button>
      
      {error && (
        <div className="mt-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={openGitHub}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </Button>
        </div>
      )}
    </div>
  );
}
