import { ProgramsData, Program } from '@/types';
import rawData from '@/data/github-solana-programs.json';

// Simple synchronous data access
export function getProgramsData(): ProgramsData {
  const repos = (rawData as { repos: Program[] }).repos;
  return {
    repos,
    totalRepos: repos.length,
    scrapedAt: new Date().toISOString(),
    keywordsSearched: []
  };
}

// Simple search function
export function searchPrograms(query: string): Program[] {
  const data = getProgramsData();
  const lowerQuery = query.toLowerCase();
  
  return data.repos.filter(p => 
    p.name?.toLowerCase().includes(lowerQuery) ||
    p.description?.toLowerCase().includes(lowerQuery) ||
    p.topics?.some(t => t?.toLowerCase().includes(lowerQuery))
  );
}
