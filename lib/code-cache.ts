// Server-side code cache using filesystem
import { promises as fs } from 'fs';
import path from 'path';

const CACHE_DIR = '/Users/openclaw/.openclaw/workspace/code-cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheEntry<T = unknown> {
  timestamp: number;
  data: T;
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cachePath = path.join(CACHE_DIR, `${key}.json`);
    const stats = await fs.stat(cachePath);

    // Check if cache is still valid
    const age = Date.now() - stats.mtimeMs;
    if (age > CACHE_DURATION_MS) {
      return null;
    }

    const content = await fs.readFile(cachePath, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(content);
    return entry.data;
  } catch {
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cachePath = path.join(CACHE_DIR, `${key}.json`);
    const entry: CacheEntry<T> = {
      timestamp: Date.now(),
      data
    };
    await fs.writeFile(cachePath, JSON.stringify(entry, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to cache data:', error);
  }
}

export async function clearCache(key?: string): Promise<void> {
  try {
    if (key) {
      const cachePath = path.join(CACHE_DIR, `${key}.json`);
      await fs.unlink(cachePath);
    } else {
      // Clear all cache
      const files = await fs.readdir(CACHE_DIR);
      await Promise.all(
        files.map(file => fs.unlink(path.join(CACHE_DIR, file)))
      );
    }
  } catch {
    // Ignore errors when clearing cache
  }
}

export function generateCacheKey(owner: string, repo: string, type: string): string {
  return `${owner}-${repo}-${type}`;
}
