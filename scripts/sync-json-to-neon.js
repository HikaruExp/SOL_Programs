#!/usr/bin/env node
/**
 * Sync JSON Database to Neon PostgreSQL
 * One-way sync: JSON → Neon (master is JSON)
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
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
  const jsonData = JSON.parse(await fs.readFile(JSON_PATH, 'utf-8'));
  const repos = jsonData.repos || [];
  
  console.log(`📁 JSON file has ${repos.length} programs`);
  
  const client = await pool.connect();
  
  try {
    // Get current count in Neon
    const countResult = await client.query('SELECT COUNT(*) FROM programs');
    const neonCount = parseInt(countResult.rows[0].count);
    console.log(`🗄️  Neon DB has ${neonCount} programs`);
    
    // Get existing fullNames from Neon
    const existingResult = await client.query('SELECT full_name FROM programs');
    const existingSet = new Set(existingResult.rows.map(r => r.full_name.toLowerCase()));
    console.log(`📋 ${existingSet.size} unique programs in Neon`);
    
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each repo from JSON
    for (const repo of repos) {
      try {
        const fullName = repo.fullName;
        
        if (!fullName) {
          console.warn(`⚠️  Skipping repo without fullName`);
          skipped++;
          continue;
        }
        
        const lowerName = fullName.toLowerCase();
        
        const data = {
          fullName: fullName,
          owner: repo.owner || '',
          name: repo.name || '',
          url: repo.url || `https://github.com/${fullName}`,
          description: repo.description || '',
          stars: repo.stars || 0,
          language: repo.language || 'Unknown',
          updated: repo.updated ? new Date(repo.updated) : new Date(),
          topics: toPostgresArray(repo.topics),
          category: repo.category || 'Infrastructure',
          subCategory: repo.subCategory || null,
          defaultBranch: repo.defaultBranch || 'main'
        };
        
        if (existingSet.has(lowerName)) {
          // Update existing
          await client.query(`
            UPDATE programs SET
              owner = $1,
              name = $2,
              url = $3,
              description = $4,
              stars = $5,
              language = $6,
              updated_at = $7,
              topics = $8,
              category = $9,
              sub_category = $10,
              default_branch = $11
            WHERE LOWER(full_name) = LOWER($12)
          `, [
            data.owner, data.name, data.url, data.description, data.stars,
            data.language, data.updated, data.topics, data.category,
            data.subCategory, data.defaultBranch, fullName
          ]);
          updated++;
        } else {
          // Insert new
          await client.query(`
            INSERT INTO programs (
              full_name, owner, name, url, description, stars,
              language, updated_at, topics, category, sub_category, default_branch
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            data.fullName, data.owner, data.name, data.url, data.description,
            data.stars, data.language, data.updated, data.topics,
            data.category, data.subCategory, data.defaultBranch
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
  
  const jsonData = JSON.parse(await fs.readFile(JSON_PATH, 'utf-8'));
  const repos = jsonData.repos || [];
  
  const seen = new Map();
  const duplicates = [];
  
  for (const repo of repos) {
    const lowerName = (repo.fullName || '').toLowerCase();
    if (seen.has(lowerName)) {
      duplicates.push({
        name: repo.fullName,
        first: seen.get(lowerName),
        second: repo
      });
    } else {
      seen.set(lowerName, repo);
    }
  }
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found in JSON');
  } else {
    console.log(`⚠️  Found ${duplicates.length} duplicates:`);
    duplicates.forEach(d => console.log(`   - ${d.name}`));
  }
  
  return duplicates.length;
}

// Clean duplicates from JSON
async function cleanDuplicates() {
  console.log('\n🧹 Cleaning duplicates from JSON...\n');
  
  const jsonData = JSON.parse(await fs.readFile(JSON_PATH, 'utf-8'));
  const repos = jsonData.repos || [];
  
  const seen = new Set();
  const unique = [];
  let removed = 0;
  
  for (const repo of repos) {
    const lowerName = (repo.fullName || '').toLowerCase();
    if (seen.has(lowerName)) {
      removed++;
    } else {
      seen.add(lowerName);
      unique.push(repo);
    }
  }
  
  if (removed > 0) {
    jsonData.repos = unique;
    jsonData.totalRepos = unique.length;
    await fs.writeFile(JSON_PATH, JSON.stringify(jsonData, null, 2));
    console.log(`✅ Removed ${removed} duplicates`);
    console.log(`📊 JSON now has ${unique.length} unique programs`);
  } else {
    console.log('✅ No duplicates to clean');
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    await checkDuplicates();
  } else if (args.includes('--clean')) {
    await cleanDuplicates();
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
