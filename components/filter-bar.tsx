'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Category, CATEGORIES } from '@/types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  category: Category;
  onCategoryChange: (category: Category) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  sortBy: 'stars' | 'updated' | 'name';
  onSortChange: (sort: 'stars' | 'updated' | 'name') => void;
  languages: string[];
  resultCount: number;
}

const categoryColors: Record<Category, string> = {
  'All': 'bg-white hover:bg-slate-50 border-slate-200',
  'DEX': 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700',
  'NFT': 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700',
  'Lending': 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700',
  'Staking': 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700',
  'DeFi': 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700',
  'Governance': 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700',
  'Trading': 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700',
  'Infrastructure': 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700',
};

export function FilterBar({
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  language,
  onLanguageChange,
  sortBy,
  onSortChange,
  languages,
  resultCount,
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  const clearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  return (
    <div className="space-y-3 sm:space-y-4 animate-fade-in-up stagger-1" style={{ opacity: 0, animationFillMode: 'forwards' }}>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search programs..."
              className="w-full pl-10 pr-10 bg-white border-slate-200 rounded-full focus-visible:ring-blue-500 h-11 sm:h-10"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as 'stars' | 'updated' | 'name')}>
            <SelectTrigger className="w-[130px] sm:w-[150px] bg-white border-slate-200 rounded-full h-11 sm:h-10">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stars">Most Stars</SelectItem>
              <SelectItem value="updated">Recently Updated</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full border-slate-200 h-11 w-11 sm:h-10 sm:w-10 min-h-[44px] min-w-[44px]">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[300px] sm:w-[350px]">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category} onValueChange={(v) => onCategoryChange(v as Category)}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <Select value={language} onValueChange={onLanguageChange}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="All languages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All languages</SelectItem>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full rounded-full min-h-[44px]"
                    onClick={() => {
                      onCategoryChange('All');
                      onLanguageChange('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant="outline"
              size="sm"
              onClick={() => onCategoryChange(cat)}
              className={`rounded-full transition-all duration-200 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] ${
                category === cat
                  ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                  : categoryColors[cat]
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground shrink-0">
          {resultCount.toLocaleString()} result{resultCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
