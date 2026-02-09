#!/usr/bin/env node
/**
 * High-Value Solana Programs Discovery
 * Targeted search for specific programs
 */

import fs from 'fs';
import { execSync } from 'child_process';

const MIN_STARS = 10;

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

function categorize(item) {
  const text = (item.name + ' ' + (item.description || '') + ' ' + (item.topics || []).join(' ')).toLowerCase();
  if (text.includes('percolator') || text.includes('pumpfun') || text.includes('sniper')) return 'Trading';
  if (text.includes('mev') || text.includes('arbitrage') || text.includes('sandwich')) return 'Trading';
  if (text.includes('jupiter')) return 'DEX';
  if (text.includes('raydium') || text.includes('clmm')) return 'DEX';
  if (text.includes('metaplex') || text.includes('metadata')) return 'NFT';
  if (text.includes('pay') || text.includes('payment')) return 'DeFi';
  if (text.includes('drift')) return 'Trading';
  if (text.includes('mango')) return 'Lending';
  if (text.includes('bot')) return 'Trading';
  return 'DeFi';
}

function searchGitHub(query) {
  const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=100`;
  try {
    const result = execSync(`curl -s "${url}" -H "Accept: application/vnd.github.v3+json" -H "User-Agent: Solana-Discovery"`, { 
      encoding: 'utf8', 
      timeout: 15000 
    });
    return JSON.parse(result);
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return { items: [] };
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🔍 High-Value Solana Programs Discovery\n');
  
  const existing = loadExisting();
  const existingSet = new Set(existing.map(p => p.fullName));
  console.log(`📊 Existing programs: ${existing.length}\n`);
  
  const searches = [
    { term: 'percolator+pumpfun', name: 'Percolator/PumpFun bots' },
    { term: 'solana+mev+bot', name: 'Solana MEV bots' },
    { term: 'solana+sniper+bot', name: 'Solana sniper bots' },
    { term: 'jupiter+aggregator+solana', name: 'Jupiter aggregator' },
    { term: 'raydium+clmm', name: 'Raydium CLMM' },
    { term: 'metaplex+token+metadata', name: 'Metaplex Token Metadata' },
    { term: 'solana+pay', name: 'Solana Pay' },
    { term: 'drift+protocol', name: 'Drift Protocol' },
    { term: 'mango+markets', name: 'Mango Markets' },
    { term: 'pumpfun+trading', name: 'PumpFun trading' },
    { term: 'solana+sandwich+bot', name: 'Sandwich bots' },
    { term: 'solana+arbitrage+bot', name: 'Arbitrage bots' },
    { term: 'solana+swap+example', name: 'Swap examples' },
    { term: 'solana+liquidity+mining', name: 'Liquidity mining' },
  ];
  
  let newPrograms = [];
  let totalFound = 0;
  
  for (const { term, name } of searches) {
    console.log(`🔎 ${name}`);
    console.log(`   Query: ${term}`);
    
    const data = searchGitHub(term);
    const items = data.items || [];
    
    console.log(`   Results: ${items.length}`);
    
    const validItems = items.filter(item => {
      if (existingSet.has(item.full_name)) return false;
      if (item.stargazers_count < MIN_STARS) return false;
      return true;
    });
    
    console.log(`   New (10+ stars): ${validItems.length}\n`);
    
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
      totalFound++;
      
      console.log(`   ✅ ADDED: ${item.full_name} (${item.stargazers_count}⭐) [${program.category}]`);
    }
    
    if (validItems.length > 0) console.log('');
    await sleep(1500);
  }
  
  // Save results
  if (newPrograms.length > 0) {
    const updated = [...existing, ...newPrograms];
    savePrograms(updated);
    
    console.log(`\n💾 SAVED ${newPrograms.length} NEW PROGRAMS`);
    console.log(`📈 Total: ${existing.length} → ${updated.length}\n`);
    
    // Summary by category
    const byCat = {};
    newPrograms.forEach(p => {
      byCat[p.category] = (byCat[p.category] || 0) + 1;
    });
    
    console.log('📊 By category:');
    Object.entries(byCat).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });
    
    console.log('\n📋 All new programs:');
    newPrograms.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.fullName} (${p.stars}⭐)`);
    });
  } else {
    console.log('\n😴 No new programs found');
  }
  
  console.log(`\n✨ Complete! Added ${newPrograms.length} programs`);
  return newPrograms.length;
}

run().catch(console.error);
