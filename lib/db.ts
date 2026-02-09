import { Pool } from '@neondatabase/serverless';
import { ProgramsData, Program } from '@/types';
import rawData from '@/data/github-solana-programs.json';

// Neon DB connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let cachedData: ProgramsData | null = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get fallback data from JSON file
function getFallbackData(): ProgramsData {
  return rawData as ProgramsData;
}

// Initialize database with schema if needed
async function initDatabase(client: any) {
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    
    // Create programs table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        description_embedding VECTOR(384),
        category TEXT[],
        repo_url TEXT,
        owner TEXT,
        language TEXT,
        stars INTEGER DEFAULT 0,
        topics TEXT[],
        source_file TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_programs_stars ON programs(stars DESC);
      CREATE INDEX IF NOT EXISTS idx_programs_category ON programs USING GIN(category);
      CREATE INDEX IF NOT EXISTS idx_programs_topics ON programs USING GIN(topics);
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Seed database from JSON if empty
async function seedDatabaseIfEmpty(client: any) {
  try {
    const countResult = await client.query('SELECT COUNT(*) FROM programs;');
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      console.log('Seeding database from JSON...');
      const data = rawData as ProgramsData;
      
      for (const repo of data.repos.slice(0, 100)) { // Seed first 100 for now
        await client.query(`
          INSERT INTO programs (id, name, description, repo_url, owner, language, stars, topics)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `, [
          repo.fullName,
          repo.name,
          repo.description,
          repo.url,
          repo.owner,
          repo.language,
          repo.stars,
          repo.topics || []
        ]);
      }
      
      console.log(`Seeded ${Math.min(100, data.repos.length)} programs`);
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

export async function getProgramsData(): Promise<ProgramsData> {
  // Return cached data if fresh
  if (cachedData && Date.now() - lastFetch < CACHE_TTL) {
    return cachedData;
  }
  
  try {
    const client = await pool.connect();
    try {
      // Initialize database if needed
      await initDatabase(client);
      
      // Seed with data if empty
      await seedDatabaseIfEmpty(client);
      
      // Check if programs table exists and has data
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'programs'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('Programs table does not exist, using JSON fallback');
        return getFallbackData();
      }
      
      // Get column names to build dynamic query
      const columnsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'programs';
      `);
      
      const columns = columnsResult.rows.map((r: any) => r.column_name);
      
      // Build query based on available columns
      const selectFields = [];
      if (columns.includes('id')) selectFields.push('id');
      if (columns.includes('name')) selectFields.push('name');
      if (columns.includes('description')) selectFields.push('description');
      if (columns.includes('repo_url')) selectFields.push('repo_url as url');
      if (columns.includes('owner')) selectFields.push('owner');
      if (columns.includes('language')) selectFields.push('language');
      if (columns.includes('stars')) selectFields.push('stars');
      if (columns.includes('topics')) selectFields.push('topics');
      if (columns.includes('category')) selectFields.push('category');
      if (columns.includes('created_at')) selectFields.push('created_at');
      
      if (selectFields.length === 0) {
        return getFallbackData();
      }
      
      // Query programs from Neon DB
      const result = await client.query(`
        SELECT ${selectFields.join(', ')}
        FROM programs 
        ORDER BY stars DESC NULLS LAST
      `);
      
      // If no data in DB, use fallback
      if (result.rows.length === 0) {
        return getFallbackData();
      }
      
      const repos: Program[] = result.rows.map((row: any) => ({
        fullName: row.owner ? `${row.owner}/${row.name}` : row.name || row.id,
        owner: row.owner || '',
        name: row.name || row.id || '',
        url: row.url || '',
        description: row.description || '',
        stars: row.stars || 0,
        language: row.language || 'Unknown',
        updated: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        topics: row.topics || [],
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
    // Return fallback data on error
    return getFallbackData();
  }
}

// Vector search for semantic search
export async function searchProgramsVector(query: string, limit = 10): Promise<Program[]> {
  try {
    const client = await pool.connect();
    try {
      // Check if description_embedding column exists
      const colCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'programs' AND column_name = 'description_embedding'
        );
      `);
      
      if (!colCheck.rows[0].exists) {
        console.log('Vector search not available - no embedding column');
        return [];
      }
      
      // Using pgvector for similarity search
      const result = await client.query(`
        SELECT 
          id,
          name,
          description,
          repo_url as url,
          owner,
          language,
          stars,
          topics,
          category,
          1 - (description_embedding <=> $1::vector) as similarity
        FROM programs
        WHERE description_embedding IS NOT NULL
        ORDER BY description_embedding <=> $1::vector
        LIMIT $2
      `, [query, limit]);
      
      return result.rows.map((row: any) => ({
        fullName: row.owner ? `${row.owner}/${row.name}` : row.name || row.id,
        owner: row.owner || '',
        name: row.name || '',
        url: row.url || '',
        description: row.description || '',
        stars: row.stars || 0,
        language: row.language || 'Unknown',
        updated: new Date().toISOString(),
        topics: row.topics || [],
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
}
