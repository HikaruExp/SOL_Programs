'use client';

import { Search, Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export function Header({ onSearch, searchValue = '' }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(localSearch);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-white/90 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-14 sm:h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 font-bold text-lg sm:text-xl min-h-[44px]">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shrink-0 overflow-hidden relative">
            <Image 
              src="/logo/nano-banana.svg" 
              alt="SOL Programs" 
              fill
              className="object-cover"
            />
          </div>
          <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent hidden sm:inline">
            SOL Programs
          </span>
          <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent sm:hidden">
            SOL
          </span>
        </Link>

        {onSearch && (
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search programs..."
                className="w-full pl-10 bg-slate-50 border-slate-200 rounded-full focus-visible:ring-blue-500 h-10"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
          </form>
        )}

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/">
            <Button variant="ghost" className="text-sm font-medium rounded-full px-3 lg:px-4 min-h-[44px]">
              Home
            </Button>
          </Link>
          <Link href="/programs">
            <Button variant="ghost" className="text-sm font-medium rounded-full px-3 lg:px-4 min-h-[44px]">
              Browse
            </Button>
          </Link>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-full min-h-[44px] min-w-[44px]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-white absolute top-full left-0 right-0 shadow-lg">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {onSearch && (
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search programs..."
                    className="w-full pl-10 bg-slate-50 rounded-full h-11"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                </div>
              </form>
            )}
            <nav className="flex flex-col gap-1">
              <Link
                href="/"
                className="mobile-menu-item text-sm font-medium py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors min-h-[48px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/programs"
                className="mobile-menu-item text-sm font-medium py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors min-h-[48px] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Browse
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
