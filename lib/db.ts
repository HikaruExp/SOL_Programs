import { ProgramsData, Program } from '@/types';
import rawData from '@/data/github-solana-programs.json';

// Re-export for backward compatibility
export function getProgramsData(): ProgramsData {
  return rawData as ProgramsData;
}

export function searchProgramsVector(query: string, limit = 10): Program[] {
  const data = getProgramsData();
  const lowerQuery = query.toLowerCase();
  
  return data.repos
    .filter(p => 
      p.name?.toLowerCase().includes(lowerQuery) ||
      p.description?.toLowerCase().includes(lowerQuery) ||
      p.topics?.some(t => t?.toLowerCase().includes(lowerQuery))
    )
    .slice(0, limit);
}
