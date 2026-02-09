#!/usr/bin/env node
/**
 * Batch Discovery Script - Finds Solana programs and saves them
 */

import fs from 'fs';

const QUERIES = [
  { q: 'solana+metaplex', cat: 'NFT' },
  { q: 'solana+jupiter+aggregator', cat: 'DEX' },
  { q: 'solana+anchor+lang', cat: 'Infrastructure' },
  { q: 'solana+trading+bot', cat: 'Trading' },
  { q: 'solana+governance+dao', cat: 'Governance' },
  { q: 'solana+raydium+amm', cat: 'DEX' },
  { q: 'solana+orca+dex', cat: 'DEX' },
  { q: 'solana+staking+validator', cat: 'Staking' },
  { q: 'solana+lending+protocol', cat: 'Lending' },
  { q: 'solana+drift+trading', cat: 'Trading' },
  { q: 'solana+marginfi', cat: 'Lending' },
  { q: 'solana+squads+multisig', cat: 'Governance' },
  { q: 'solana+wallet+adapter', cat: 'Infrastructure' },
  { q: 'solana+nft+contract', cat: 'NFT' },
  { q: 'solana+dex+amm', cat: 'DEX' },
  { q: 'solana+defi+protocol', cat: 'DeFi' },
  { q: 'solana+program+rust', cat: 'Infrastructure' },
  { q: 'solana+token+program', cat: 'DeFi' },
  { q: 'solana+smart+contract', cat: 'Infrastructure' },
  { q: 'solana+infrastructure+sdk', cat: 'Infrastructure' },
];

const MIN_STARS = 50;
const TARGET_NEW = 50;

function loadExisting() {
  try {
    const data = fs.readFileSync('./data/github-solana-programs.json', 'utf8');
    return JSON.parse(data).repos || [];
  } catch {
    return [];
  }
}

function savePrograms(programs) {
  fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync('./data/github-solana-programs.json', JSON.stringify({ repos: programs }, null, 2));
}

function saveLog(log) {
  fs.writeFileSync('./data/discovery-log.json', JSON.stringify(log, null, 2));
}

function categorize(item) {
  const text = `${item.name} ${item.description || ''} ${(item.topics || []).join(' ')}`.toLowerCase();
  if (text.includes('dex') || text.includes('swap') || text.includes('amm')) return 'DEX';
  if (text.includes('nft') || text.includes('metaplex')) return 'NFT';
  if (text.includes('lend') || text.includes('borrow') || text.includes('yield')) return 'Lending';
  if (text.includes('stake') || text.includes('validator')) return 'Staking';
  if (text.includes('governance') || text.includes('dao')) return 'Governance';
  if (text.includes('trading') || text.includes('bot')) return 'Trading';
  if (text.includes('wallet') || text.includes('adapter')) return 'Infrastructure';
  return 'DeFi';
}

async function searchGitHub(query) {
  const url = `https://api.github.com/search/repositories?q=${query}+stars:>=${MIN_STARS}&sort=stars&order=desc&per_page=100`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Solana-Discovery'
    }
  });
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Rate limited');
    }
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return data.items || [];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🔍 Solana Program Discovery\n');
  
  const existing = loadExisting();
  const existingSet = new Set(existing.map(p => p.fullName));
  console.log(`📊 Existing programs: ${existing.length}`);
  
  const log = {
    startTime: new Date().toISOString(),
    queries: [],
    newPrograms: [],
    errors: []
  };
  
  let newPrograms = [];
  
  for (const { q, cat } of QUERIES) {
    if (newPrograms.length >= TARGET_NEW) {
      console.log(`\n✅ Reached target of ${TARGET_NEW} new programs`);
      break;
    }
    
    console.log(`\n🔎 Searching: ${q} [${cat}]`);
    
    try {
      const items = await searchGitHub(q);
      console.log(`  Found: ${items.length} repos`);
      
      const validItems = items.filter(item => {
        if (existingSet.has(item.full_name)) return false;
        if (item.stargazers_count < MIN_STARS) return false;
        if (!['Rust', 'TypeScript', 'JavaScript'].includes(item.language)) return false;
        return true;
      });
      
      console.log(`  New valid: ${validItems.length}`);
      
      for (const item of validItems) {
        const program = {
          fullName: item.full_name,
          owner: item.owner.login,
          name: item.name,
          url: item.html_url,
          description: item.description,
          stars: item.stargazers_count,
          language: item.language,
          updated: item.updated_at,
          topics: item.topics || [],
          defaultBranch: item.default_branch,
          category: categorize(item),
          discoveredAt: new Date().toISOString()
        };
        
        newPrograms.push(program);
        existingSet.add(item.full_name);
        log.newPrograms.push(program.fullName);
        
        if (newPrograms.length >= TARGET_NEW) break;
      }
      
      log.queries.push({ query: q, found: items.length, newValid: validItems.length });
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      log.errors.push({ query: q, error: error.message });
      
      if (error.message === 'Rate limited') {
        console.log('⛔ Rate limited, stopping...');
        break;
      }
    }
    
    // Rate limiting
    await sleep(2000);
  }
  
  // Save results
  if (newPrograms.length > 0) {
    const updated = [...existing, ...newPrograms];
    savePrograms(updated);
    
    console.log(`\n💾 Saved ${newPrograms.length} new programs`);
    console.log(`📈 Total: ${existing.length} → ${updated.length}`);
    
    console.log(`\n🆕 New programs by category:`);
    const byCat = {};
    newPrograms.forEach(p => {
      byCat[p.category] = (byCat[p.category] || 0) + 1;
    });
    Object.entries(byCat).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    
    console.log(`\n📋 Sample new programs:`);
    newPrograms.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i+1}. ${p.fullName} (${p.stars}⭐) [${p.category}]`);
    });
    if (newPrograms.length > 10) {
      console.log(`  ... and ${newPrograms.length - 10} more`);
    }
  } else {
    console.log(`\n😴 No new programs found`);
  }
  
  log.endTime = new Date().toISOString();
  log.totalNew = newPrograms.length;
  saveLog(log);
  
  console.log(`\n✨ Discovery complete! Found ${newPrograms.length} new programs`);
  return newPrograms.length;
}

run().catch(console.error);
