#!/usr/bin/env node
/**
 * SOL Programs - Automated Discovery System
 * Uses GitHub API directly via curl
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';

const CONFIG = {
  queries: [
    'solana+program+anchor+rust',
    'solana+defi+protocol',
    'solana+nft+contract',
    'solana+dex+amm',
    'solana+lending+protocol',
    'solana+staking+validator',
    'solana+governance+dao',
    'solana+trading+bot',
    'solana+infrastructure+sdk',
    'solana+anchor+lang',
    'solana+smart+contract',
    'solana+token+program',
    'solana+wallet+adapter',
    'solana+metaplex',
    'solana+raydium',
    'solana+orca+dex',
    'solana+jupiter+aggregator',
    'solana+drift+trading',
    'solana+marginfi',
    'solana+squads+multisig',
  ],
  languages: ['Rust', 'TypeScript', 'JavaScript'],
  minStars: 50,
  maxNewProgramsPerRun: 50,
  dataDir: './data',
  programsFile: './data/github-solana-programs.json',
  logFile: './data/discovery-log.json',
};

async function loadExistingPrograms() {
  try {
    const data = await fs.readFile(CONFIG.programsFile, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.repos || [];
  } catch {
    return [];
  }
}

async function savePrograms(programs) {
  await fs.mkdir(CONFIG.dataDir, { recursive: true });
  await fs.writeFile(CONFIG.programsFile, JSON.stringify({ repos: programs }, null, 2));
}

async function saveLog(log) {
  await fs.writeFile(CONFIG.logFile, JSON.stringify(log, null, 2));
}

function categorizeProgram(item) {
  const text = `${item.name} ${item.description || ''} ${(item.topics || []).join(' ')}`.toLowerCase();
  
  if (text.includes('dex') || text.includes('swap') || text.includes('amm')) return 'DEX';
  if (text.includes('nft') || text.includes('metaplex') || text.includes('token')) return 'NFT';
  if (text.includes('lend') || text.includes('borrow') || text.includes('yield')) return 'Lending';
  if (text.includes('stake') || text.includes('validator')) return 'Staking';
  if (text.includes('governance') || text.includes('dao') || text.includes('vote')) return 'Governance';
  if (text.includes('trading') || text.includes('bot') || text.includes('sniper')) return 'Trading';
  if (text.includes('wallet') || text.includes('adapter')) return 'Infrastructure';
  if (text.includes('bridge') || text.includes('cross-chain')) return 'DeFi';
  
  return 'Infrastructure';
}

function subCategorizeProgram(item) {
  const text = `${item.name} ${item.description || ''} ${(item.topics || []).join(' ')}`.toLowerCase();
  
  if (text.includes('raydium')) return 'Raydium';
  if (text.includes('orca')) return 'Orca';
  if (text.includes('jupiter')) return 'Jupiter';
  if (text.includes('amm')) return 'AMM';
  if (text.includes('orderbook')) return 'Orderbook';
  if (text.includes('marketplace')) return 'Marketplace';
  if (text.includes('mint')) return 'Minting';
  if (text.includes('metaplex')) return 'Metaplex';
  if (text.includes('sniper')) return 'Sniper';
  if (text.includes('bot')) return 'Trading Bot';
  if (text.includes('anchor')) return 'Anchor';
  if (text.includes('sdk')) return 'SDK';
  
  return categorizeProgram(item);
}

async function searchGitHub(query, page = 1) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/search/repositories?q=${query}+stars:>=50+language:rust&sort=stars&order=desc&per_page=100&page=${page}`;
    
    const args = [
      '-s',
      '-H', 'Accept: application/vnd.github.v3+json',
      '-H', 'User-Agent: Solana-Discovery',
      url
    ];
    
    const curl = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let errors = '';
    
    curl.stdout.on('data', (data) => { output += data.toString(); });
    curl.stderr.on('data', (data) => { errors += data.toString(); });
    
    curl.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`curl failed: ${errors}`));
        return;
      }
      
      try {
        const response = JSON.parse(output);
        if (!response.items) {
          resolve([]);
          return;
        }
        
        const programs = response.items.map(item => ({
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
          category: categorizeProgram(item),
          subCategory: subCategorizeProgram(item),
          discoveredAt: new Date().toISOString(),
        }));
        resolve(programs);
      } catch (e) {
        reject(new Error(`Parse error: ${e.message}, output: ${output.substring(0, 200)}`));
      }
    });
  });
}

function filterNewPrograms(found, existingSet) {
  return found.filter(p => {
    if (existingSet.has(p.fullName)) return false;
    if (p.stars < CONFIG.minStars) return false;
    if (!CONFIG.languages.includes(p.language)) return false;
    if (p.name.endsWith('-fork') || p.name.includes('fork-')) return false;
    return true;
  });
}

async function runDiscovery() {
  console.log('🔍 Starting Solana program discovery...\n');
  
  const existingPrograms = await loadExistingPrograms();
  const existingSet = new Set(existingPrograms.map(p => p.fullName));
  
  console.log(`📊 Existing programs: ${existingPrograms.length}`);
  
  const log = {
    lastRun: new Date().toISOString(),
    totalPrograms: existingPrograms.length,
    newProgramsThisRun: 0,
    queriesUsed: [],
    errors: [],
  };
  
  let allNewPrograms = [];
  const shuffledQueries = [...CONFIG.queries].sort(() => Math.random() - 0.5);
  
  for (const query of shuffledQueries) {
    if (allNewPrograms.length >= CONFIG.maxNewProgramsPerRun) break;
    
    console.log(`\n🔎 Searching: ${query}`);
    log.queriesUsed.push(query);
    
    try {
      const found = await searchGitHub(query);
      const newPrograms = filterNewPrograms(found, existingSet);
      
      console.log(`  Found: ${found.length}, New: ${newPrograms.length}`);
      
      allNewPrograms.push(...newPrograms);
      newPrograms.forEach(p => existingSet.add(p.fullName));
      
      if (allNewPrograms.length >= CONFIG.maxNewProgramsPerRun) {
        console.log(`\n✅ Reached max limit (${CONFIG.maxNewProgramsPerRun})`);
        break;
      }
      
      // Rate limiting - be nice to GitHub API
      await new Promise(r => setTimeout(r, 3000));
    } catch (error) {
      const errorMsg = `Query "${query}" failed: ${error.message}`;
      console.error(`  ❌ ${errorMsg}`);
      log.errors.push(errorMsg);
      
      // If rate limited, stop
      if (error.message.includes('rate limit') || error.message.includes('403')) {
        console.log('⛔ Rate limited, stopping...');
        break;
      }
    }
  }
  
  const programsToAdd = allNewPrograms.slice(0, CONFIG.maxNewProgramsPerRun);
  
  if (programsToAdd.length > 0) {
    const updated = [...existingPrograms, ...programsToAdd];
    await savePrograms(updated);
    
    log.totalPrograms = updated.length;
    log.newProgramsThisRun = programsToAdd.length;
    
    console.log(`\n💾 Saved ${programsToAdd.length} new programs`);
    console.log(`📈 Total: ${existingPrograms.length} → ${updated.length}`);
    
    console.log(`\n🆕 New programs discovered:`);
    programsToAdd.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.fullName} (${p.stars}⭐) [${p.category}]`);
    });
    if (programsToAdd.length > 10) {
      console.log(`  ... and ${programsToAdd.length - 10} more`);
    }
  } else {
    console.log(`\n😴 No new programs found this run`);
  }
  
  await saveLog(log);
  console.log(`\n✨ Discovery complete!`);
  
  return log;
}

runDiscovery()
  .then((log) => {
    console.log(`\n📊 Summary: ${log.newProgramsThisRun} new programs added`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Discovery failed:', error);
    process.exit(1);
  });
