#!/usr/bin/env node
/**
 * Sync Vector DB (LanceDB) to Neon PostgreSQL
 * Adapts to existing schema with integer IDs
 */

const { Pool } = require('pg');
const lancedb = require('@lancedb/lancedb');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'lancedb-data');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Generate integer ID from string (stay within PostgreSQL integer range)
function generateIntId(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  // Use first 7 hex digits to stay within signed 32-bit integer range
  return parseInt(hash.substring(0, 7), 16);
}

// Convert array to PostgreSQL array format
function toPostgresArray(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '{}';
  return '{' + arr.map(item => '"' + String(item).replace(/"/g, '\\"') + '"').join(',') + '}';
}

// Clean vector - remove nulls and ensure proper format
function cleanVector(vec) {
  if (!vec || !Array.isArray(vec)) return new Array(384).fill(0);
  return vec.map(v => v === null ? 0 : parseFloat(v));
}

async function syncToNeon() {
  console.log('🔄 Syncing LanceDB to Neon...\n');
  
  const client = await pool.connect();
  
  try {
    // Connect to LanceDB
    const db = await lancedb.connect(DB_PATH);
    const table = await db.openTable('programs');
    const records = await table.query().limit(10000).toArray();
    
    console.log(`📊 Found ${records.length} records in LanceDB\n`);
    
    let synced = 0;
    let updated = 0;
    let errors = 0;
    
    for (const record of records) {
      try {
        const intId = generateIntId(record.id);
        const cleanEmbed = cleanVector(record.description_embedding);
        
        // Check if exists by github_id
        const exists = await client.query('SELECT id FROM programs WHERE github_id = $1', [record.id]);
        
        if (exists.rows.length > 0) {
          // Update existing
          await client.query(`
            UPDATE programs SET
              name = $1,
              description = $2,
              owner = $3,
              repo = $4,
              url = $5,
              stars = $6,
              language = $7,
              topics = $8,
              category = $9,
              embedding = $10::vector,
              updated_at = NOW()
            WHERE github_id = $11
          `, [
            record.name || '',
            record.description || '',
            record.owner || '',
            record.name || '',
            record.repo_url || '',
            record.stars || 0,
            record.language || '',
            toPostgresArray(record.topics),
            Array.isArray(record.category) ? record.category[0] || 'Infrastructure' : 'Infrastructure',
            JSON.stringify(cleanEmbed),
            record.id
          ]);
          updated++;
        } else {
          // Insert new
          await client.query(`
            INSERT INTO programs (
              id, name, description, owner, repo, url, stars, 
              language, topics, category, embedding, github_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector, $12, NOW(), NOW())
          `, [
            intId,
            record.name || '',
            record.description || '',
            record.owner || '',
            record.name || '',
            record.repo_url || '',
            record.stars || 0,
            record.language || '',
            toPostgresArray(record.topics),
            Array.isArray(record.category) ? record.category[0] || 'Infrastructure' : 'Infrastructure',
            JSON.stringify(cleanEmbed),
            record.id
          ]);
          synced++;
        }
        
        if ((synced + updated) % 100 === 0) {
          process.stdout.write(`\r  Progress: ${synced + updated}/${records.length} (${errors} errors)`);
        }
      } catch (err) {
        errors++;
        if (errors <= 5) {
          console.error(`\n❌ Error with ${record.id}:`, err.message);
        }
      }
    }
    
    console.log(`\n\n✅ Sync complete!`);
    console.log(`   Inserted: ${synced}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    
    const count = await client.query('SELECT COUNT(*) FROM programs;');
    console.log(`   Total in Neon: ${count.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

syncToNeon().catch(console.error);
