import { Pool } from '@neondatabase/serverless';
import { ProgramsData, Program } from '@/types';
import rawData from '@/data/github-solana-programs.json';

// Neon DB connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000, // 5 second timeout
      max: 5, // max 5 connections
    });
  }
  return pool;
}

let cachedData: ProgramsData | null = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fallback to JSON data
function getFallbackData(): ProgramsData {
  return rawData as ProgramsData;
}

// Check if we're in build/SSG context
function isBuildTime(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build' || 
         process.env.NODE_ENV === 'production' && typeof window === 'undefined';
}

export async function getProgramsData(): Promise<ProgramsData> {
  // Return cached data if fresh
  if (cachedData && Date.now() - lastFetch < CACHE_TTL) {
    return cachedData;
  }
  
  // At build time, always use JSON (most reliable)
  if (isBuildTime()) {
    console.log('Build time: Using JSON data');
    return getFallbackData();
  }
  
  // No DATABASE_URL, use fallback
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL: Using JSON fallback');
    return getFallbackData();
  }
  
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      // Quick connection test
      await client.query('SELECT NOW()');
      
      // Check if programs table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'programs'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('Programs table does not exist: Using JSON fallback');
        return getFallbackData();
      }
      
      // Query programs from Neon DB
      const result = await client.query(`
        SELECT 
          COALESCE(github_id, id::text) as "fullName",
          owner,
          name,
          COALESCE(repo_url, url) as url,
          description,
          COALESCE(stars, 0) as stars,
          language,
          COALESCE(topics, '{}') as topics,
          category,
          created_at
        FROM programs 
        ORDER BY stars DESC NULLS LAST
        LIMIT 2000
      `);
      
      if (result.rows.length === 0) {
        console.log('No data in DB: Using JSON fallback');
        return getFallbackData();
      }
      
      interface DbRow {
        fullName?: string;
        owner?: string;
        name?: string;
        url?: string;
        description?: string;
        stars?: string | number;
        language?: string;
        created_at?: string | Date;
        topics?: string[];
        category?: string;
      }
      
      const repos: Program[] = result.rows.map((row: DbRow) => ({
        fullName: row.fullName || `${row.owner}/${row.name}`,
        owner: row.owner || '',
        name: row.name || '',
        url: row.url || '',
        description: row.description || '',
        stars: parseInt(String(row.stars)) || 0,
        language: row.language || 'Unknown',
        updated: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        topics: row.topics || [],
        category: row.category || 'Infrastructure',
      }));
      
      cachedData = {
        scrapedAt: new Date().toISOString(),
        totalRepos: repos.length,
        keywordsSearched: [],
        repos,
      };
      
      lastFetch = Date.now();
      console.log(`Loaded ${repos.length} programs from DB`);
      return cachedData;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('DB connection failed:', error);
    // Always return fallback on error
    return getFallbackData();
  }
}

export async function searchProgramsVector(query: string, limit = 10): Promise<Program[]> {
  const data = await getProgramsData();
  const lowerQuery = query.toLowerCase();
  
  return data.repos
    .filter(p => 
      p.name?.toLowerCase().includes(lowerQuery) ||
      p.description?.toLowerCase().includes(lowerQuery) ||
      p.topics?.some(t => t?.toLowerCase().includes(lowerQuery))
    )
    .slice(0, limit);
}
