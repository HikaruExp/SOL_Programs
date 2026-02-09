#!/usr/bin/env node
/**
 * Database Diagnostic Tool
 * Analyzes JSON vs Neon DB discrepancy
 */

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', 'github-solana-programs.json');

console.log('📊 DATABASE DIAGNOSTIC REPORT\n');
console.log('=' .repeat(50));

// Read JSON
const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
const repos = jsonData.repos || [];

console.log(`\n📁 JSON Database:`);
console.log(`   Total programs: ${repos.length}`);

// Check for duplicates
const seen = new Set();
const duplicates = [];
for (const repo of repos) {
  const lowerName = (repo.fullName || '').toLowerCase();
  if (seen.has(lowerName)) {
    duplicates.push(repo.fullName);
  } else {
    seen.add(lowerName);
  }
}

console.log(`   Unique programs: ${seen.size}`);
console.log(`   Duplicates: ${duplicates.length}`);
if (duplicates.length > 0) {
  console.log(`   ⚠️  Duplicate names: ${duplicates.slice(0, 5).join(', ')}...`);
}

// Categories breakdown
const categories = {};
const subCategories = {};
for (const repo of repos) {
  const cat = repo.category || 'Uncategorized';
  categories[cat] = (categories[cat] || 0) + 1;
  
  const sub = repo.subCategory || cat;
  subCategories[sub] = (subCategories[sub] || 0) + 1;
}

console.log(`\n📊 Categories:`);
Object.entries(categories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });

console.log(`\n📊 Top Subcategories:`);
Object.entries(subCategories)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([sub, count]) => {
    console.log(`   ${sub}: ${count}`);
  });

// Programs without subcategories
const withoutSub = repos.filter(r => !r.subCategory || r.subCategory === r.category).length;
console.log(`\n⚠️  Programs without specific subcategory: ${withoutSub}`);

// Stars distribution
const highStars = repos.filter(r => r.stars >= 100).length;
const medStars = repos.filter(r => r.stars >= 50 && r.stars < 100).length;
const lowStars = repos.filter(r => r.stars < 50).length;

console.log(`\n⭐ Stars Distribution:`);
console.log(`   100+ stars: ${highStars}`);
console.log(`   50-99 stars: ${medStars}`);
console.log(`   <50 stars: ${lowStars}`);

// Language distribution
const languages = {};
for (const repo of repos) {
  const lang = repo.language || 'Unknown';
  languages[lang] = (languages[lang] || 0) + 1;
}

console.log(`\n💻 Languages:`);
Object.entries(languages)
  .sort((a, b) => b[1] - a[1])
  .forEach(([lang, count]) => {
    console.log(`   ${lang}: ${count}`);
  });

console.log(`\n${'='.repeat(50)}`);
console.log(`\n🔍 NEON DB DISCREPANCY ANALYSIS:`);
console.log(`   JSON has: ${repos.length} programs`);
console.log(`   Neon has: ~1,014 programs (from monitor report)`);
console.log(`   GAP: ${repos.length - 1014} programs missing from Neon`);
console.log(`\n💡 ROOT CAUSE:`);
console.log(`   1. Discovery script adds to JSON ✓`);
console.log(`   2. No automatic sync JSON → Neon ✗`);
console.log(`   3. LanceDB sync script exists but may not be running`);
console.log(`\n🔧 SOLUTION:`);
console.log(`   - Set up automatic sync after each discovery`);
console.log(`   - Run: node scripts/sync-json-to-neon.js`);
console.log(`   - Or use cron job to sync every hour`);

