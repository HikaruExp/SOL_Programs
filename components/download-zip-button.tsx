'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DownloadZipButtonProps {
  owner: string;
  repo: string;
}

export function DownloadZipButton({ owner, repo }: DownloadZipButtonProps) {
  const [loading, setLoading] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function fetchDefaultBranch() {
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (response.ok) {
          const data = await response.json();
          setDefaultBranch(data.default_branch || 'main');
        }
      } catch (error) {
        console.warn('Failed to fetch default branch:', error);
      } finally {
        setChecking(false);
      }
    }
    fetchDefaultBranch();
  }, [owner, repo]);

  const handleDownload = () => {
    setLoading(true);
    
    // Try the detected/default branch
    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${defaultBranch}.zip`;
    
    // Create a temporary link and click it
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `${repo}-${defaultBranch}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <Button 
      variant="outline" 
      className="w-full gap-2 rounded-xl" 
      size="lg"
      onClick={handleDownload}
      disabled={loading || checking}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {checking ? 'Checking...' : loading ? 'Downloading...' : 'Download ZIP'}
    </Button>
  );
}
