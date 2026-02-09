import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Github, Code2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { ProgramCard } from '@/components/program-card';
import { CategoryCards } from '@/components/category-cards';
import { getFeaturedPrograms, getCategoryCounts } from '@/lib/data';
import { getProgramsData } from '@/lib/data-server';

export const revalidate = 60;

// Banana icon component
function BananaIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 0 5-3" />
      <path d="M5.15 12.85c-1-3 1.5-6 4.5-6.5" />
      <circle cx="12" cy="11" r="1" fill="currentColor" />
      <circle cx="15" cy="13" r="0.5" fill="currentColor" />
    </svg>
  );
}

export default async function Home() {
  const data = await getProgramsData();
  const featuredPrograms = getFeaturedPrograms(data.repos);
  const categoryCounts = getCategoryCounts(data.repos);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 opacity-70" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 to-cyan-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="container relative py-16 sm:py-20 md:py-32 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6 md:space-y-8 animate-fade-in-up px-2 sm:px-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium shadow-sm">
              <BananaIcon className="h-4 w-4 text-purple-500" />
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                {data.totalRepos.toLocaleString()}+ Solana Programs
              </span>
            </div>
            
            {/* Main heading */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                SOL Programs
              </span>
              <br />
              <span className="text-foreground">Directory</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The most comprehensive directory of Solana programs. 
              Browse DEXs, NFT protocols, lending platforms, and more.
            </p>
            
            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/programs">
                <Button size="lg" className="gap-2 btn-shine rounded-full px-8">
                  Explore Programs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2 rounded-full px-8">
                  <Github className="h-4 w-4" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-8 max-w-2xl mx-auto mt-12 sm:mt-20 pt-8 sm:pt-12 border-t border-border/50 px-2 sm:px-0">
            <div className="text-center animate-fade-in-up stagger-1" style={{ opacity: 0, animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Code2 className="h-5 w-5 text-violet-500" />
                <span className="text-3xl md:text-4xl font-bold">{data.totalRepos.toLocaleString()}</span>
              </div>
              <div className="text-sm text-muted-foreground">Programs</div>
            </div>
            <div className="text-center animate-fade-in-up stagger-2" style={{ opacity: 0, animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Layers className="h-5 w-5 text-purple-500" />
                <span className="text-3xl md:text-4xl font-bold">8</span>
              </div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
            <div className="text-center animate-fade-in-up stagger-3" style={{ opacity: 0, animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <BananaIcon className="h-5 w-5 text-indigo-500" />
                <span className="text-3xl md:text-4xl font-bold">
                  {Math.max(...data.repos.map(p => p.stars)).toLocaleString()}+
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Top Stars</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-24 border-t border-border/50 bg-gradient-to-b from-transparent to-slate-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-16 animate-fade-in-up px-2 sm:px-0">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Browse by Category</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Explore programs organized by their primary use case and functionality
            </p>
          </div>
          <CategoryCards counts={categoryCounts} />
        </div>
      </section>

      {/* Featured Programs Section */}
      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-4 px-2 sm:px-0">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Programs</h2>
              <p className="text-muted-foreground text-lg">
                Top starred Solana programs from the ecosystem
              </p>
            </div>
            <Link href="/programs">
              <Button variant="outline" className="gap-2 rounded-full">
                View All Programs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {featuredPrograms.map((program, index) => (
              <div key={program.fullName} className={`animate-fade-in-up stagger-${(index % 6) + 1}`} style={{ opacity: 0, animationFillMode: 'forwards' }}>
                <ProgramCard program={program} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 md:py-12 bg-slate-50/50 mt-auto w-full">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl shrink-0 overflow-hidden relative">
                <Image 
                  src="/logo/nano-banana.svg" 
                  alt="SOL Programs" 
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-semibold text-base md:text-lg bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">SOL Programs</span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground text-center md:text-right">
              Data sourced from GitHub • Updated {new Date(data.scrapedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
