import { ProgramsData, Program } from '@/types';
import { getProgramsData as getFromDB, getProgramsDataFromJSON } from './db';

// Primary: Try DB first, fallback to JSON
export async function getProgramsData(): Promise<ProgramsData> {
  return getFromDB();
}

// Sync version for build time (uses JSON)
export function getProgramsDataSync(): ProgramsData {
  return getProgramsDataFromJSON();
}

// Simple search function (uses sync version for now)
export function searchPrograms(query: string): Program[] {
  const data = getProgramsDataSync();
  const lowerQuery = query.toLowerCase();
  
  return data.repos.filter(p => 
    p.name?.toLowerCase().includes(lowerQuery) ||
    p.description?.toLowerCase().includes(lowerQuery) ||
    p.topics?.some(t => t?.toLowerCase().includes(lowerQuery))
  );
}
