import { Pool, PoolClient } from '@neondatabase/serverless';
import { ProgramsData, Program } from '@/types';
import rawData from '@/data/github-solana-programs.json';

// Connection pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  max: 5,
});

let cachedData: ProgramsData | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check if we're in build/static generation mode
function isBuildTime(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build' || 
         process.env.CI === 'true' ||
         !process.env.DATABASE_URL;
}

// Get data from JSON (fallback)
export function getProgramsDataFromJSON(): ProgramsData {
  if (!cachedData || Date.now() - cacheTime > CACHE_TTL) {
    cachedData = rawData as ProgramsData;
    cacheTime = Date.now();
  }
  return cachedData;
}

// Get data from Vector DB (Neon)
async function getProgramsDataFromDB(): Promise<ProgramsData> {
  const client: PoolClient = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        full_name as "fullName",
        owner,
        name,
        url,
        description,
        stars,
        language,
        updated_at as "updated",
        topics,
        category,
        sub_category as "subCategory",
        default_branch as "defaultBranch"
      FROM programs
      ORDER BY stars DESC
    `);

    interface DbRow {
      fullName: string;
      owner: string;
      name: string;
      url: string;
      description: string | null;
      stars: number;
      language: string | null;
      updated: string;
      topics: string[] | null;
      category: string | null;
      subCategory: string | null;
      defaultBranch: string | null;
    }

    const repos: Program[] = result.rows.map((row: DbRow) => ({
      fullName: row.fullName,
      owner: row.owner,
      name: row.name,
      url: row.url,
      description: row.description || '',
      stars: row.stars || 0,
      language: row.language || 'Unknown',
      updated: row.updated ? new Date(row.updated).toISOString() : new Date().toISOString(),
      topics: row.topics || [],
      category: row.category || 'Infrastructure',
      subCategory: row.subCategory || undefined,
      defaultBranch: row.defaultBranch || 'main',
    }));

    return {
      repos,
      scrapedAt: new Date().toISOString(),
      totalRepos: repos.length,
      keywordsSearched: []
    };
  } finally {
    client.release();
  }
}

// Main function: tries DB first, falls back to JSON
export async function getProgramsData(): Promise<ProgramsData> {
  // Always use JSON at build time
  if (isBuildTime()) {
    console.log('[DB] Build time detected, using JSON fallback');
    return getProgramsDataFromJSON();
  }

  try {
    // Try DB first
    const data = await getProgramsDataFromDB();
    console.log(`[DB] Loaded ${data.repos.length} programs from database`);
    return data;
  } catch (error) {
    console.warn('[DB] Failed to load from database, using JSON fallback:', error);
    return getProgramsDataFromJSON();
  }
}

// Synchronous version for static generation
export function getProgramsDataSync(): ProgramsData {
  return getProgramsDataFromJSON();
}

// Vector similarity search (using pgvector)
export async function searchSimilarPrograms(
  query: string,
  limit: number = 10
): Promise<Program[]> {
  // First try vector search in DB
  try {
    const client: PoolClient = await pool.connect();
    try {
      // Get embedding for query (would need OpenAI API here)
      // For now, do text search
      const result = await client.query(`
        SELECT 
          full_name as "fullName",
          owner,
          name,
          url,
          description,
          stars,
          language,
          updated_at as "updated",
          topics,
          category,
          sub_category as "subCategory"
        FROM programs
        WHERE 
          description ILIKE $1 OR
          name ILIKE $1 OR
          topics && ARRAY[$2]
        ORDER BY stars DESC
        LIMIT $3
      `, [`%${query}%`, query, limit]);

      interface SearchRow {
        fullName: string;
        owner: string;
        name: string;
        url: string;
        description: string | null;
        stars: number;
        language: string | null;
        updated: string;
        topics: string[] | null;
        category: string | null;
        subCategory: string | null;
      }

      return result.rows.map((row: SearchRow) => ({
        fullName: row.fullName,
        owner: row.owner,
        name: row.name,
        url: row.url,
        description: row.description || '',
        stars: row.stars || 0,
        language: row.language || 'Unknown',
        updated: row.updated ? new Date(row.updated).toISOString() : new Date().toISOString(),
        topics: row.topics || [],
        category: row.category || 'Infrastructure',
        subCategory: row.subCategory || undefined,
      }));
    } finally {
      client.release();
    }
  } catch {
    console.warn('[DB] Vector search failed, using JSON fallback');
    // Fallback to simple text search on JSON
    const data = getProgramsDataFromJSON();
    const lowerQuery = query.toLowerCase();
    return data.repos
      .filter(p => 
        p.name?.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.topics?.some(t => t?.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  }
}

// Health check for DB connection
export async function checkDBHealth(): Promise<{ ok: boolean; count: number }> {
  try {
    const client: PoolClient = await pool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) FROM programs');
      return { ok: true, count: parseInt(result.rows[0].count) };
    } finally {
      client.release();
    }
  } catch {
    return { ok: false, count: 0 };
  }
}

// Re-export for backward compatibility
export { rawData };
