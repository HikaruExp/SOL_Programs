import { getCachedData, setCachedData, generateCacheKey } from './code-cache-browser';

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
  html_url: string;
  size: number;
}

export interface RepoFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface RepoContent {
  owner: string;
  repo: string;
  files: RepoFile[];
  fileTree: GitHubFile[];
  fetchedAt: string;
}

// Priority directories to scan for code files
const PRIORITY_DIRS = ['src', 'programs', 'contracts', 'program', 'anchor'];

// File extensions we want to fetch
const CODE_EXTENSIONS = ['.rs', '.ts', '.tsx', '.js', '.jsx', '.sol', '.py', '.go', '.c', '.cpp', '.h'];

// Maximum file size (100KB)
const MAX_FILE_SIZE = 100 * 1024;

// Maximum files to fetch per repo
const MAX_FILES = 20;

function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'rs': 'rust',
    'ts': 'typescript',
    'tsx': 'tsx',
    'js': 'javascript',
    'jsx': 'jsx',
    'sol': 'solidity',
    'py': 'python',
    'go': 'go',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp'
  };
  return langMap[ext] || 'text';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchGitHubAPI(url: string): Promise<Record<string, unknown> | unknown[]> {
  console.log(`[fetch-code] Fetching: ${url}`);
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Solana-Programs-Directory'
  };

  // Add GitHub token if available (increases rate limit from 60 to 5000 requests/hour)
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.error(`[fetch-code] GitHub API error: ${response.status} for ${url}`);
    if (response.status === 404) {
      throw new Error('Repository not found');
    }
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      console.error(`[fetch-code] Rate limit remaining: ${rateLimitRemaining}`);
      if (rateLimitReset) {
        const resetTime = new Date(parseInt(rateLimitReset) * 1000);
        console.error(`[fetch-code] Rate limit resets at: ${resetTime.toISOString()}`);
      }
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

async function fetchFileContent(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }
  return response.text();
}

async function scanDirectory(
  owner: string,
  repo: string,
  path: string = ''
): Promise<GitHubFile[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
  const contents = await fetchGitHubAPI(url) as GitHubFile[];
  return Array.isArray(contents) ? contents : [contents];
}

async function findCodeFiles(
  owner: string,
  repo: string
): Promise<GitHubFile[]> {
  const allFiles: GitHubFile[] = [];
  const scannedPaths = new Set<string>();

  // Helper to check if we should include this file
  const isCodeFile = (file: GitHubFile): boolean => {
    if (file.type !== 'file') return false;
    if (file.size > MAX_FILE_SIZE) return false;
    const ext = CODE_EXTENSIONS.find(e => file.name.endsWith(e));
    return !!ext;
  };

  // Helper to scan a directory recursively
  const scanPath = async (dirPath: string, depth: number = 0): Promise<void> => {
    if (depth > 3 || allFiles.length >= MAX_FILES) return;
    if (scannedPaths.has(dirPath)) return;
    scannedPaths.add(dirPath);

    try {
      const contents = await scanDirectory(owner, repo, dirPath);

      for (const item of contents) {
        if (item.type === 'file' && isCodeFile(item)) {
          allFiles.push(item);
          if (allFiles.length >= MAX_FILES) return;
        } else if (item.type === 'dir' && depth < 3) {
          await scanPath(item.path, depth + 1);
          if (allFiles.length >= MAX_FILES) return;
        }
      }
    } catch (error) {
      // Ignore errors for individual directories
      console.warn(`Failed to scan ${dirPath}:`, error);
    }
  };

  // First, scan priority directories
  for (const priorityDir of PRIORITY_DIRS) {
    try {
      await scanPath(priorityDir, 0);
      if (allFiles.length >= MAX_FILES) break;
    } catch {
      // Priority directory might not exist, continue
    }
  }

  // If we didn't find enough files, scan root
  if (allFiles.length < MAX_FILES) {
    try {
      const rootContents = await scanDirectory(owner, repo);

      for (const item of rootContents) {
        if (item.type === 'file' && isCodeFile(item) && !allFiles.find(f => f.path === item.path)) {
          allFiles.push(item);
          if (allFiles.length >= MAX_FILES) break;
        } else if (item.type === 'dir' && !PRIORITY_DIRS.includes(item.name)) {
          await scanPath(item.path, 1);
          if (allFiles.length >= MAX_FILES) break;
        }
      }
    } catch (error) {
      console.warn('Failed to scan root:', error);
    }
  }

  return allFiles.slice(0, MAX_FILES);
}

export async function fetchRepoCode(owner: string, repo: string): Promise<RepoContent> {
  console.log(`[fetch-code] Starting fetch for ${owner}/${repo}`);
  const cacheKey = generateCacheKey(owner, repo, 'code');

  // Check cache first
  const cached = await getCachedData<RepoContent>(cacheKey);
  if (cached && cached.files.length > 0) {
    console.log(`[fetch-code] Using cached data with ${cached.files.length} files`);
    return cached;
  }

  // Find code files in the repository
  const fileTree = await findCodeFiles(owner, repo);
  console.log(`[fetch-code] Found ${fileTree.length} code files`);

  if (fileTree.length === 0) {
    console.warn(`[fetch-code] No code files found in ${owner}/${repo}`);
    throw new Error('No code files found in repository');
  }

  // Fetch content for each file
  const files: RepoFile[] = [];

  for (const file of fileTree) {
    if (!file.download_url) continue;

    try {
      const content = await fetchFileContent(file.download_url);
      files.push({
        name: file.name,
        path: file.path,
        content,
        language: getLanguageFromExtension(file.name)
      });
      console.log(`[fetch-code] Fetched ${file.path} (${content.length} bytes)`);
    } catch (error) {
      console.warn(`[fetch-code] Failed to fetch ${file.path}:`, error);
    }
  }

  if (files.length === 0) {
    console.error(`[fetch-code] Could not fetch any file content for ${owner}/${repo}`);
    throw new Error('Could not fetch code files from repository');
  }

  const result: RepoContent = {
    owner,
    repo,
    files,
    fileTree,
    fetchedAt: new Date().toISOString()
  };

  // Cache the result
  await setCachedData(cacheKey, result);
  console.log(`[fetch-code] Completed, cached ${files.length} files`);

  return result;
}

export function getGitHubZipUrl(owner: string, repo: string, ref: string = 'main'): string {
  return `https://github.com/${owner}/${repo}/archive/refs/heads/${ref}.zip`;
}

export function getGitHubRepoUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}
