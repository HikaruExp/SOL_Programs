'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, AlertCircle } from 'lucide-react';
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

    const branchesToTry = detectedBranch 
      ? [detectedBranch, ...COMMON_BRANCHES.filter(b => b !== detectedBranch)]
      : COMMON_BRANCHES;

    for (const branch of branchesToTry) {
      const url = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
      
      // Create hidden iframe to trigger download
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      
      // Wait a bit to see if download starts
      await new Promise(resolve => setTimeout(resolve, 1500));
      document.body.removeChild(iframe);
      
      // Assume it worked if we got here (downloads are hard to detect)
      setLoading(false);
      return;
    }

    // If all else fails, open GitHub page
    setError('Could not auto-download. Opening GitHub...');
    setTimeout(() => {
      window.open(`https://github.com/${owner}/${repo}`, '_blank');
      setLoading(false);
    }, 1500);
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
        ) : (
          <Download className="h-4 w-4" />
        )}
        {loading ? 'Downloading...' : 'Download ZIP'}
      </Button>
      
      {error && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}
