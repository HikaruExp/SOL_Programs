'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DownloadZipButtonProps {
  owner: string;
  repo: string;
  defaultBranch?: string;
}

export function DownloadZipButton({ owner, repo, defaultBranch }: DownloadZipButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    
    try {
      let branch = defaultBranch;
      
      // If no default branch provided, try to fetch it
      if (!branch) {
        try {
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
          if (response.ok) {
            const data = await response.json();
            branch = data.default_branch;
          }
        } catch {
          // Fallback to common branch names
          branch = 'main';
        }
      }
      
      // Try the detected/default branch first
      const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
      
      // Create a temporary link and click it
      const link = document.createElement('a');
      link.href = zipUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setLoading(false);
    }
  };

  return (
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
      Download ZIP
    </Button>
  );
}