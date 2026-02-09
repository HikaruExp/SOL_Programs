#!/usr/bin/env node
/**
 * Sync Vector DB (LanceDB) to Neon PostgreSQL with pgvector
 * This syncs local vector embeddings to Neon for production use
 */

const { Pool } = require('pg');
const lancedb = require('@lancedb/lancedb');
const path = require('path');

const DB_PATH = path.join(__dirname, 'lancedb-data');

// Neon DB connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || require('./.env.local').DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function syncVectorDBToNeon() {
  console.log('🔄 Starting Vector DB sync to Neon...\n');
  
  const client = await pool.connect();
  
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ pgvector extension enabled');
    
    // Create programs table with vector support
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
        forks INTEGER DEFAULT 0,
        open_issues INTEGER DEFAULT 0,
        topics TEXT[],
        program_id TEXT,
        is_verified BOOLEAN DEFAULT false,
        has_anchor BOOLEAN DEFAULT false,
        has_tests BOOLEAN DEFAULT false,
        readme_text TEXT,
        readme_embedding VECTOR(384),
        onchain_tvl FLOAT DEFAULT 0,
        onchain_tx_24h INTEGER DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        source_file TEXT
      );
    `);
    console.log('✅ Programs table created');
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_programs_stars ON programs(stars DESC);
      CREATE INDEX IF NOT EXISTS idx_programs_language ON programs(language);
      CREATE INDEX IF NOT EXISTS idx_programs_owner ON programs(owner);
      CREATE INDEX IF NOT EXISTS idx_programs_category ON programs USING GIN(category);
      CREATE INDEX IF NOT EXISTS idx_programs_topics ON programs USING GIN(topics);
      CREATE INDEX IF NOT EXISTS idx_programs_program_id ON programs(program_id);
    `);
    console.log('✅ Indexes created');
    
    // Create IVFFlat index for vector similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_programs_embedding_ivf 
      ON programs 
      USING ivfflat (description_embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    console.log('✅ Vector index created');
    
    // Connect to LanceDB
    const db = await lancedb.connect(DB_PATH);
    const tableNames = await db.tableNames();
    
    if (!tableNames.includes('programs')) {
      console.log('❌ No programs table in LanceDB');
      return;
    }
    
    const table = await db.openTable('programs');
    const results = await table.query().limit(10000).toArray();
    
    console.log(`📊 Found ${results.length} programs in LanceDB\n`);
    
    // Sync each program
    let synced = 0;
    let skipped = 0;
    
    for (const record of results) {
      try {
        // Check if record already exists
        const exists = await client.query(
          'SELECT id FROM programs WHERE id = $1',
          [record.id]
        );
        
        if (exists.rows.length > 0) {
          // Update existing record
          await client.query(`
            UPDATE programs SET
              name = $2,
              description = $3,
              description_embedding = $4::vector,
              category = $5,
              repo_url = $6,
              owner = $7,
              language = $8,
              stars = $9,
              forks = $10,
              open_issues = $11,
              topics = $12,
              program_id = $13,
              is_verified = $14,
              has_anchor = $15,
              has_tests = $16,
              readme_text = $17,
              readme_embedding = $18::vector,
              onchain_tvl = $19,
              onchain_tx_24h = $20,
              last_updated = $21,
              source_file = $22
            WHERE id = $1;
          `, [
            record.id,
            record.name,
            record.description,
            JSON.stringify(record.description_vector || []),
            record.category || [],
            record.repo_url,
            record.repo_owner,
            record.language,
            record.stars || 0,
            record.forks || 0,
            record.open_issues || 0,
            record.topics || [],
            record.program_id,
            record.is_verified || false,
            record.has_anchor || false,
            record.has_tests || false,
            record.readme_text,
            JSON.stringify(record.readme_vector || []),
            record.onchain_tvl || 0,
            record.onchain_tx_24h || 0,
            record.last_updated ? new Date(record.last_updated) : null,
            record.source_file
          ]);
          skipped++;
        } else {
          // Insert new record
          await client.query(`
            INSERT INTO programs (
              id, name, description, description_embedding, category,
              repo_url, owner, language, stars, forks, open_issues,
              topics, program_id, is_verified, has_anchor, has_tests,
              readme_text, readme_embedding, onchain_tvl, onchain_tx_24h,
              last_updated, source_file
            ) VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::vector, $19, $20, $21, $22);
          `, [
            record.id,
            record.name,
            record.description,
            JSON.stringify(record.description_vector || []),
            record.category || [],
            record.repo_url,
            record.repo_owner,
            record.language,
            record.stars || 0,
            record.forks || 0,
            record.open_issues || 0,
            record.topics || [],
            record.program_id,
            record.is_verified || false,
            record.has_anchor || false,
            record.has_tests || false,
            record.readme_text,
            JSON.stringify(record.readme_vector || []),
            record.onchain_tvl || 0,
            record.onchain_tx_24h || 0,
            record.last_updated ? new Date(record.last_updated) : null,
            record.source_file
          ]);
          synced++;
        }
        
        if ((synced + skipped) % 100 === 0) {
          process.stdout.write(`\r  Progress: ${synced + skipped}/${results.length} (${synced} new, ${skipped} updated)`);
        }
      } catch (err) {
        console.error(`\n❌ Error syncing ${record.id}:`, err.message);
      }
    }
    
    console.log(`\n\n✅ Sync complete!`);
    console.log(`   New records: ${synced}`);
    console.log(`   Updated records: ${skipped}`);
    console.log(`   Total in Neon: ${synced + skipped}`);
    
    // Verify count
    const countResult = await client.query('SELECT COUNT(*) FROM programs;');
    console.log(`\n📊 Total programs in Neon DB: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  syncVectorDBToNeon()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { syncVectorDBToNeon };
