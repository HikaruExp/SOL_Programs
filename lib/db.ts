import { ProgramsData, Program } from '@/types';

// Direct import for build-time data access
import rawData from '@/data/github-solana-programs.json';

export async function getProgramsData(): Promise<ProgramsData> {
  // Always use JSON data at build time - most reliable
  return rawData as ProgramsData;
}

export async function searchProgramsVector(query: string, limit = 10): Promise<Program[]> {
  // Client-side search fallback
  const data = await getProgramsData();
  const lowerQuery = query.toLowerCase();
  
  return data.repos
    .filter(p => 
      p.name?.toLowerCase().includes(lowerQuery) ||
      p.description?.toLowerCase().includes(lowerQuery) ||
      p.topics?.some(t => t?.toLowerCase().includes(lowerQuery))
    )
    .slice(0, limit);
}
