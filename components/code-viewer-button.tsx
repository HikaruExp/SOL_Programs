'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeViewer } from '@/components/code-viewer';

interface CodeViewerButtonProps {
  owner: string;
  repo: string;
}

export function CodeViewerButton({ owner, repo }: CodeViewerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full gap-2 rounded-xl" 
        size="lg"
        onClick={() => setIsOpen(true)}
      >
        <Eye className="h-4 w-4" />
        View Code
      </Button>
      
      <CodeViewer 
        owner={owner}
        repo={repo}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
