'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { ProgramCard } from '@/components/program-card';
import { FilterBar } from '@/components/filter-bar';
import { SubcategoryFilter } from '@/components/subcategory-filter';
import { Program, Category } from '@/types';
import {
  searchPrograms,
  filterPrograms,
  sortPrograms,
} from '@/lib/data';

interface ProgramsClientProps {
  programs: Program[];
  languages: string[];
}

// Get all unique subcategories from programs
function getSubcategories(programs: Program[], category?: string): string[] {
  const filtered = category && category !== 'All' 
    ? programs.filter(p => p.category === category || getCategoryFromProgram(p) === category)
    : programs;
  
  const subcats = new Set<string>();
  filtered.forEach(p => {
    if (p.subCategory) subcats.add(p.subCategory);
  });
  return Array.from(subcats).sort();
}

function getCategoryFromProgram(program: Program): string {
  return program.category || 'Infrastructure';
}

export function ProgramsClient({ programs, languages }: ProgramsClientProps) {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [subcategory, setSubcategory] = useState<string>('all');
  const [language, setLanguage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'stars' | 'updated' | 'name'>('stars');
  const [mounted, setMounted] = useState(false);

  // Handle initial category from URL
  useEffect(() => {
    const catFromUrl = searchParams.get('category') as Category;
    if (catFromUrl && catFromUrl !== 'All') {
      setCategory(catFromUrl);
    }
    setMounted(true);
  }, [searchParams]);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategory('all');
  }, [category]);

  const availableSubcategories = useMemo(() => {
    return getSubcategories(programs, category === 'All' ? undefined : category);
  }, [programs, category]);

  const filteredPrograms = useMemo(() => {
    let result = programs;

    // Apply search
    if (searchQuery) {
      result = searchPrograms(result, searchQuery);
    }

    // Apply filters
    result = filterPrograms(result, {
      category: category === 'All' ? undefined : category,
      language: language === 'all' ? undefined : language,
    });

    // Apply subcategory filter
    if (subcategory !== 'all') {
      result = result.filter(p => p.subCategory === subcategory);
    }

    // Apply sorting
    result = sortPrograms(result, sortBy);

    return result;
  }, [programs, searchQuery, category, subcategory, language, sortBy]);

  if (!mounted) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 flex-1">
          <div className="animate-pulse space-y-8 px-2 sm:px-0">
            <div className="h-8 w-64 bg-slate-200 rounded" />
            <div className="h-4 w-96 bg-slate-200 rounded" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header
        searchValue={searchQuery}
        onSearch={(query) => {
          setSearchQuery(query);
        }}
      />

      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-white to-cyan-50/20 -z-10 pointer-events-none" />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12 flex-1">
        <div className="mb-6 md:mb-8 animate-fade-in-up px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-3">Browse Programs</h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Discover Solana programs across DeFi, NFTs, and more
          </p>
        </div>

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          category={category}
          onCategoryChange={setCategory}
          language={language}
          onLanguageChange={setLanguage}
          sortBy={sortBy}
          onSortChange={setSortBy}
          languages={languages}
          resultCount={filteredPrograms.length}
        />

        {/* Subcategory Filter */}
        {availableSubcategories.length > 0 && (
          <SubcategoryFilter
            subcategories={availableSubcategories}
            selected={subcategory}
            onSelect={setSubcategory}
          />
        )}

        <div className="mt-8">
          {filteredPrograms.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-lg text-muted-foreground mb-2">No programs found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredPrograms.map((program, index) => (
                <div 
                  key={program.fullName} 
                  className={`animate-fade-in-up stagger-${(index % 6) + 1}`}
                  style={{ opacity: 0, animationFillMode: 'forwards' }}
                >
                  <ProgramCard program={program} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 md:py-12 mt-auto bg-slate-50/50 w-full">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm text-muted-foreground">
            Showing {filteredPrograms.length.toLocaleString()} of {programs.length.toLocaleString()} programs
          </p>
        </div>
      </footer>
    </div>
  );
}
