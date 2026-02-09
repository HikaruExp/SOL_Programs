const CACHE_PREFIX = 'solana-programs-code-cache-';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheEntry<T = unknown> {
  timestamp: number;
  data: T;
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!stored) return null;

    const entry: CacheEntry<T> = JSON.parse(stored);

    // Check if cache is still valid
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_DURATION_MS) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    const entry: CacheEntry<T> = {
      timestamp: Date.now(),
      data
    };

    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error('Failed to cache data:', error);
  }
}

export async function clearCache(key?: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;

    if (key) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } else {
      // Clear all cache entries with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey?.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(storageKey);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch {
    // Ignore errors when clearing cache
  }
}

export function generateCacheKey(owner: string, repo: string, type: string): string {
  return `${owner}-${repo}-${type}`;
}
