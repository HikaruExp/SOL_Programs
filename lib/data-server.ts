import { ProgramsData } from '@/types';
import data from '@/data/github-solana-programs.json';

let cachedData: ProgramsData | null = null;

export async function getProgramsData(): Promise<ProgramsData> {
  if (cachedData) return cachedData;
  
  // Direct import for static export - gets bundled at build time
  cachedData = data as ProgramsData;
  return cachedData;
}
