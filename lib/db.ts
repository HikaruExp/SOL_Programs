import { Pool } from '@neondatabase/serverless';
import { ProgramsData, Program } from '@/types';

// Neon DB connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let cachedData: ProgramsData | null = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getProgramsData(): Promise<ProgramsData> {
  // Return cached data if fresh
  if (cachedData && Date.now() - lastFetch < CACHE_TTL) {
    return cachedData;
  }
  
  try {
    const client = await pool.connect();
    try {
      // Query programs from Neon DB
      const result = await client.query(`
        SELECT 
          id,
          name,
          description,
          repo_url as url,
          repo_owner as "owner",
          repo_name as "name",
          language,
          stars,
          forks,
          open_issues as "openIssues",
          last_updated as "updated",
          created_at as "createdAt",
          topics,
          category,
          program_id as "programId",
          is_verified as "isVerified",
          has_anchor as "hasAnchor",
          has_tests as "hasTests"
        FROM programs 
        ORDER BY stars DESC
      `);
      
      const repos: Program[] = result.rows.map(row => ({
        fullName: `${row.owner}/${row.name}`,
        owner: row.owner,
        name: row.name,
        url: row.url,
        description: row.description,
        stars: row.stars || 0,
        language: row.language,
        updated: row.updated?.toISOString() || new Date().toISOString(),
        createdAt: row.createdAt?.toISOString(),
        forks: row.forks || 0,
        openIssues: row.openIssues || 0,
        topics: row.topics || [],
        category: row.category || [],
        programId: row.programId,
        isVerified: row.isVerified || false,
        hasAnchor: row.hasAnchor || false,
        hasTests: row.hasTests || false,
      }));
      
      cachedData = {
        scrapedAt: new Date().toISOString(),
        totalRepos: repos.length,
        keywordsSearched: [],
        repos,
      };
      
      lastFetch = Date.now();
      return cachedData;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    // Fallback to cached data or empty result
    if (cachedData) return cachedData;
    throw error;
  }
}

// Vector search for semantic search
export async function searchProgramsVector(query: string, limit = 10): Promise<Program[]> {
  try {
    const client = await pool.connect();
    try {
      // Using pgvector for similarity search
      const result = await client.query(`
        SELECT 
          id,
          name,
          description,
          repo_url as url,
          repo_owner as "owner",
          repo_name as "name",
          language,
          stars,
          forks,
          open_issues as "openIssues",
          last_updated as "updated",
          created_at as "createdAt",
          topics,
          category,
          program_id as "programId",
          is_verified as "isVerified",
          has_anchor as "hasAnchor",
          has_tests as "hasTests",
          1 - (description_vector <=> $1::vector) as similarity
        FROM programs
        WHERE description_vector IS NOT NULL
        ORDER BY description_vector <=> $1::vector
        LIMIT $2
      `, [query, limit]);
      
      return result.rows.map(row => ({
        fullName: `${row.owner}/${row.name}`,
        owner: row.owner,
        name: row.name,
        url: row.url,
        description: row.description,
        stars: row.stars || 0,
        language: row.language,
        updated: row.updated?.toISOString() || new Date().toISOString(),
        createdAt: row.createdAt?.toISOString(),
        forks: row.forks || 0,
        openIssues: row.openIssues || 0,
        topics: row.topics || [],
        category: row.category || [],
        programId: row.programId,
        isVerified: row.isVerified || false,
        hasAnchor: row.hasAnchor || false,
        hasTests: row.hasTests || false,
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
}
