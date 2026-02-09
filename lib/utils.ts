import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Program, Category, getCategoryFromProgram, CATEGORIES } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFeaturedPrograms(programs: Program[]): Program[] {
  return [...programs]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 6);
}

export function getProgramsByCategory(programs: Program[], category: Category): Program[] {
  if (category === 'All') return programs;
  return programs.filter(p => getCategoryFromProgram(p) === category);
}

export function searchPrograms(programs: Program[], query: string): Program[] {
  const lowerQuery = query.toLowerCase();
  return programs.filter(p => 
    p.name?.toLowerCase().includes(lowerQuery) ||
    p.description?.toLowerCase().includes(lowerQuery) ||
    p.topics?.some(t => t?.toLowerCase().includes(lowerQuery)) ||
    false
  );
}

export function filterPrograms(
  programs: Program[],
  filters: {
    category?: Category;
    language?: string;
    minStars?: number;
    maxStars?: number;
  }
): Program[] {
  return programs.filter(p => {
    if (filters.category && filters.category !== 'All') {
      if (getCategoryFromProgram(p) !== filters.category) return false;
    }
    if (filters.language && p.language !== filters.language) return false;
    if (filters.minStars !== undefined && p.stars < filters.minStars) return false;
    if (filters.maxStars !== undefined && p.stars > filters.maxStars) return false;
    return true;
  });
}

export function sortPrograms(
  programs: Program[],
  sortBy: 'stars' | 'updated' | 'name'
): Program[] {
  const sorted = [...programs];
  
  switch (sortBy) {
    case 'stars':
      return sorted.sort((a, b) => b.stars - a.stars);
    case 'updated':
      return sorted.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

export function getAllLanguages(programs: Program[]): string[] {
  const languages = new Set(programs.map(p => p.language).filter(Boolean));
  return Array.from(languages).sort();
}

export function getCategoryCounts(programs: Program[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  CATEGORIES.forEach((cat) => {
    counts[cat] = cat === 'All' ? programs.length : 0;
  });
  
  programs.forEach(p => {
    const cat = getCategoryFromProgram(p);
    counts[cat] = (counts[cat] || 0) + 1;
  });
  
  return counts;
}

export function formatStars(stars: number): string {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return stars.toString();
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
