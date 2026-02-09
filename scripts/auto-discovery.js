#!/usr/bin/env node
/**
 * SOL Programs - Automated Discovery System
 * Neverending loop to find and add new Solana programs
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  // Search queries to rotate through
  queries: [
    'solana program anchor rust stars:>10',
    'solana smart contract language:Rust',
    'solana defi protocol anchor',
    'solana nft contract metaplex',
    'solana staking program',
    'solana dex raydium orca',
    'solana lending protocol',
    'solana governance program',
    'solana wallet adapter',
    'solana token program',
  ],
  
  // GitHub API search configurations
  languages: ['Rust', 'TypeScript', 'JavaScript'],
  minStars: 5,
  
  // Schedule settings
  checkIntervalHours: 6, // Check every 6 hours
  maxNewProgramsPerRun: 50,
  
  // Data files
  dataDir: './data',
  programsFile: './data/github-solana-programs.json',
  logFile: './data/discovery-log.json',
};

interface Program {
  fullName: string;
  owner: string;
  name: string;
  url: string;
  description: string;
  stars: number;
  language: string;
  updated: string;
  topics: string[];
  category: string;
  subCategory?: string;
  defaultBranch?: string;
  discoveredAt: string;
}

interface DiscoveryLog {
  lastRun: string;
  totalPrograms: number;
  newProgramsThisRun: number;
  queriesUsed: string[];
  errors: string[];
}

async function loadExistingPrograms(): Promise<Program[]> {
  try {
    const data = await fs.readFile(CONFIG.programsFile, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.repos || [];
  } catch {
    return [];
  }
}

async function savePrograms(programs: Program[]) {
  await fs.mkdir(CONFIG.dataDir, { recursive: true });
  await fs.writeFile(
    CONFIG.programsFile,
    JSON.stringify({ repos: programs }, null, 2)
  );
}

async function saveLog(log: DiscoveryLog) {
  await fs.writeFile(CONFIG.logFile, JSON.stringify(log, null, 2));
}

// Search GitHub for Solana programs
async function searchGitHub(query: string, page: number = 1): Promise<Program[]> {
  return new Promise((resolve, reject) => {
    const args = [
      'api',
      '-X', 'GET',
      'search/repositories',
      '-F', `q=${query}`,
      '-F', `sort=updated`,
      '-F', `order=desc`,
      '-F', `per_page=100`,
      '-F', `page=${page}`,
      '--jq', '.items[] | {
        fullName: .full_name,
        owner: .owner.login,
        name: .name,
        url: .html_url,
        description: .description,
        stars: .stargazers_count,
        language: .language,
        updated: .updated_at,
        topics: .topics,
        defaultBranch: .default_branch
      }'
    ];
    
    const gh = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let errors = '';
    
    gh.stdout.on('data', (data) => { output += data; });
    gh.stderr.on('data', (data) => { errors += data; });
    
    gh.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`gh command failed: ${errors}`));
        return;
      }
      
      try {
        // Parse NDJSON (one JSON object per line)
        const lines = output.trim().split('\n').filter(Boolean);
        const programs: Program[] = lines.map(line => {
          const item = JSON.parse(line);
          return {
            ...item,
            category: categorizeProgram(item),
            subCategory: subCategorizeProgram(item),
            discoveredAt: new Date().toISOString(),
          };
        });
        resolve(programs);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Categorize program based on topics/description
function categorizeProgram(item: any): string {
  const text = `${item.name} ${item.description || ''} ${item.topics?.join(' ') || ''}`.toLowerCase();
  
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

function subCategorizeProgram(item: any): string {
  const text = `${item.name} ${item.description || ''} ${item.topics?.join(' ') || ''}`.toLowerCase();
  
  // DEX subcategories
  if (text.includes('raydium')) return 'Raydium';
  if (text.includes('orca')) return 'Orca';
  if (text.includes('jupiter')) return 'Jupiter';
  if (text.includes('amm')) return 'AMM';
  if (text.includes('orderbook')) return 'Orderbook';
  
  // NFT subcategories
  if (text.includes('marketplace')) return 'Marketplace';
  if (text.includes('mint')) return 'Minting';
  if (text.includes('metaplex')) return 'Metaplex';
  
  // Trading subcategories
  if (text.includes('sniper')) return 'Sniper';
  if (text.includes('bot')) return 'Trading Bot';
  if (text.includes('arbitrage')) return 'Arbitrage';
  
  // Infrastructure subcategories
  if (text.includes('anchor')) return 'Anchor';
  if (text.includes('sdk')) return 'SDK';
  if (text.includes('client')) return 'Client';
  
  return categorizeProgram(item);
}

// Filter out existing programs and low-quality ones
function filterNewPrograms(
  found: Program[],
  existing: Program[],
  existingSet: Set<string>
): Program[] {
  return found.filter(p => {
    // Skip if already exists
    if (existingSet.has(p.fullName)) return false;
    
    // Skip if too few stars
    if (p.stars < CONFIG.minStars) return false;
    
    // Skip if not relevant language
    if (!CONFIG.languages.includes(p.language)) return false;
    
    // Skip forks (usually)
    if (p.name.endsWith('-fork') || p.name.includes('fork-')) return false;
    
    return true;
  });
}

// Main discovery loop
async function runDiscovery() {
  console.log('🔍 Starting Solana program discovery...\n');
  
  const existingPrograms = await loadExistingPrograms();
  const existingSet = new Set(existingPrograms.map(p => p.fullName));
  
  console.log(`📊 Existing programs: ${existingPrograms.length}`);
  
  const log: DiscoveryLog = {
    lastRun: new Date().toISOString(),
    totalPrograms: existingPrograms.length,
    newProgramsThisRun: 0,
    queriesUsed: [],
    errors: [],
  };
  
  let allNewPrograms: Program[] = [];
  
  // Rotate through queries
  const shuffledQueries = [...CONFIG.queries].sort(() => Math.random() - 0.5);
  
  for (const query of shuffledQueries.slice(0, 3)) { // Use 3 random queries per run
    console.log(`\n🔎 Searching: ${query}`);
    log.queriesUsed.push(query);
    
    try {
      const found = await searchGitHub(query);
      const newPrograms = filterNewPrograms(found, existingPrograms, existingSet);
      
      console.log(`  Found: ${found.length}, New: ${newPrograms.length}`);
      
      allNewPrograms.push(...newPrograms);
      
      // Add to existing set to avoid duplicates within this run
      newPrograms.forEach(p => existingSet.add(p.fullName));
      
      // Stop if we hit the limit
      if (allNewPrograms.length >= CONFIG.maxNewProgramsPerRun) {
        console.log(`\n✅ Reached max new programs limit (${CONFIG.maxNewProgramsPerRun})`);
        break;
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (error) {
      const errorMsg = `Query "${query}" failed: ${error}`;
      console.error(`  ❌ ${errorMsg}`);
      log.errors.push(errorMsg);
    }
  }
  
  // Limit and save
  const programsToAdd = allNewPrograms.slice(0, CONFIG.maxNewProgramsPerRun);
  
  if (programsToAdd.length > 0) {
    const updated = [...existingPrograms, ...programsToAdd];
    await savePrograms(updated);
    
    log.totalPrograms = updated.length;
    log.newProgramsThisRun = programsToAdd.length;
    
    console.log(`\n💾 Saved ${programsToAdd.length} new programs`);
    console.log(`📈 Total: ${existingPrograms.length} → ${updated.length}`);
    
    // Show some examples
    console.log(`\n🆕 New programs discovered:`);
    programsToAdd.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.fullName} (${p.stars}⭐)`);
    });
    if (programsToAdd.length > 5) {
      console.log(`  ... and ${programsToAdd.length - 5} more`);
    }
  } else {
    console.log(`\n😴 No new programs found this run`);
  }
  
  await saveLog(log);
  console.log(`\n✨ Discovery complete!`);
  
  return log;
}

// Schedule next run
function scheduleNextRun() {
  const nextRun = new Date(Date.now() + CONFIG.checkIntervalHours * 60 * 60 * 1000);
  console.log(`\n⏰ Next run scheduled for: ${nextRun.toLocaleString()}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDiscovery()
    .then(() => {
      scheduleNextRun();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Discovery failed:', error);
      process.exit(1);
    });
}

export { runDiscovery, searchGitHub };
