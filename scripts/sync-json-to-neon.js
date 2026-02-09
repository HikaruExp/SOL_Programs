#!/usr/bin/env node
/**
 * Sync JSON Database to Neon PostgreSQL
 * Matches actual Neon DB schema
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', 'github-solana-programs.json');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Convert array to PostgreSQL array format
function toPostgresArray(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '{}';
  return '{' + arr.map(item => '"' + String(item).replace(/"/g, '\\"') + '"').join(',') + '}';
}

async function syncJsonToNeon() {
  console.log('🔄 Syncing JSON to Neon PostgreSQL...\n');
  
  // Read JSON
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  const repos = jsonData.repos || [];
  
  console.log(`📁 JSON file has ${repos.length} programs`);
  
  const client = await pool.connect();
  
  try {
    // Get current count in Neon
    const countResult = await client.query('SELECT COUNT(*) FROM programs');
    const neonCount = parseInt(countResult.rows[0].count);
    console.log(`🗄️  Neon DB has ${neonCount} programs`);
    
    // Get existing github_ids from Neon
    const existingResult = await client.query('SELECT github_id FROM programs');
    const existingSet = new Set(existingResult.rows.map(r => r.github_id?.toLowerCase()));
    console.log(`📋 ${existingSet.size} unique programs in Neon`);
    
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each repo from JSON
    for (const repo of repos) {
      try {
        const githubId = repo.fullName || `${repo.owner}/${repo.name}`;
        
        if (!githubId || githubId === '/') {
          console.warn(`⚠️  Skipping repo without valid identifier`);
          skipped++;
          continue;
        }
        
        const lowerId = githubId.toLowerCase();
        
        const data = {
          githubId: githubId,
          owner: repo.owner || '',
          repo: repo.name || '',
          name: repo.name || '',
          url: repo.url || `https://github.com/${githubId}`,
          description: repo.description || '',
          stars: repo.stars || 0,
          language: repo.language || 'Unknown',
          topics: toPostgresArray(repo.topics),
          category: repo.category || 'Infrastructure',
          updated: repo.updated ? new Date(repo.updated) : new Date()
        };
        
        if (existingSet.has(lowerId)) {
          // Update existing
          await client.query(`
            UPDATE programs SET
              owner = $1,
              repo = $2,
              name = $3,
              url = $4,
              description = $5,
              stars = $6,
              language = $7,
              topics = $8,
              category = $9,
              last_synced_at = NOW()
            WHERE LOWER(github_id) = LOWER($10)
          `, [
            data.owner, data.repo, data.name, data.url, data.description,
            data.stars, data.language, data.topics, data.category, githubId
          ]);
          updated++;
        } else {
          // Insert new
          await client.query(`
            INSERT INTO programs (
              github_id, owner, repo, name, url, description, stars,
              language, topics, category, created_at, updated_at, last_synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, NOW())
          `, [
            data.githubId, data.owner, data.repo, data.name, data.url,
            data.description, data.stars, data.language, data.topics,
            data.category, data.updated
          ]);
          inserted++;
        }
        
        // Progress log every 100
        if ((inserted + updated) % 100 === 0) {
          process.stdout.write('.');
        }
        
      } catch (err) {
        console.error(`\n❌ Error processing ${repo.fullName}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n');
    console.log('✅ Sync complete!');
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    
    // Final count
    const finalCount = await client.query('SELECT COUNT(*) FROM programs');
    console.log(`\n📊 Neon DB now has ${finalCount.rows[0].count} programs`);
    
  } catch (err) {
    console.error('❌ Sync failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Check for duplicates in JSON
async function checkDuplicates() {
  console.log('\n🔍 Checking for duplicates in JSON...\n');
  
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  const repos = jsonData.repos || [];
  
  const seen = new Map();
  const duplicates = [];
  
  for (const repo of repos) {
    const lowerName = (repo.fullName || '').toLowerCase();
    if (seen.has(lowerName)) {
      duplicates.push(repo.fullName);
    } else {
      seen.set(lowerName, repo);
    }
  }
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found in JSON');
  } else {
    console.log(`⚠️  Found ${duplicates.length} duplicates:`);
    duplicates.forEach(d => console.log(`   - ${d}`));
  }
  
  return duplicates.length;
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    await checkDuplicates();
  } else {
    // Full sync
    await checkDuplicates();
    await syncJsonToNeon();
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
