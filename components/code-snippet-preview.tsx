import { RepoFile } from '@/lib/fetch-code';

interface CodeSnippetPreviewProps {
  files: RepoFile[];
}

export function CodeSnippetPreview({ files }: CodeSnippetPreviewProps) {
  if (!files || files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-slate-50 rounded-lg">
        No code files available for preview.
      </div>
    );
  }

  // Get the first file that's not too large
  const mainFile = files.find(f => f.content.length < 5000) || files[0];
  if (!mainFile) return null;

  // Truncate content to first 30 lines
  const lines = mainFile.content.split('\n').slice(0, 30);
  const truncatedContent = lines.join('\n');
  const isTruncated = mainFile.content.split('\n').length > 30;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Preview: {mainFile.name}
        </h3>
        <span className="text-xs text-muted-foreground capitalize">
          {mainFile.language}
        </span>
      </div>
      
      <div className="relative">
        <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed max-h-[400px] overflow-y-auto">
          <code>{truncatedContent}</code>
        </pre>
        {isTruncated && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-900 to-transparent" />
        )}
      </div>
      
      {files.length > 1 && (
        <p className="text-xs text-muted-foreground">
          +{files.length - 1} more files available
        </p>
      )}
    </div>
  );
}
