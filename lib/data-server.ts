import 'server-only';
import { ProgramsData } from '@/types';

let cachedData: ProgramsData | null = null;

export async function getProgramsData(): Promise<ProgramsData> {
  if (cachedData) return cachedData;
  
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Try multiple paths to find the data file
  const possiblePaths = [
    path.join(process.cwd(), '..', 'data', 'github-solana-programs.json'),
    path.join(process.cwd(), 'data', 'github-solana-programs.json'),
    path.join(process.cwd(), '..', '..', 'data', 'github-solana-programs.json'),
  ];
  
  let lastError: Error | null = null;
  
  for (const dataPath of possiblePaths) {
    try {
      const rawData = await fs.readFile(dataPath, 'utf-8');
      cachedData = JSON.parse(rawData) as ProgramsData;
      return cachedData;
    } catch (error) {
      lastError = error as Error;
      // Continue to try next path
    }
  }
  
  // If we reach here, all paths failed
  console.error('Could not load data from any path:', possiblePaths);
  throw new Error(`Failed to load programs data: ${lastError?.message}`);
}
