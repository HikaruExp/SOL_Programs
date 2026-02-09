import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  Star,
  ExternalLink,
  Calendar,
  Code2,
  Tag,
  ArrowLeft,
  Eye,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/header';
import { ProgramCard } from '@/components/program-card';
import { formatStars, formatDate } from '@/lib/data';
import { getProgramsData } from '@/lib/data-server';
import { getCategoryFromProgram } from '@/types';

// Helper to convert fullName to URL-safe id
function toUrlId(fullName: string): string {
  return fullName.replace(/\//g, '--');
}

// Helper to convert URL id back to fullName
function fromUrlId(id: string): string {
  return id.replace(/--/g, '/');
}

// Generate static params for popular programs at build time
export function generateStaticParams() {
  const data = getProgramsData();
  // Pre-build top 100 programs by stars
  const topPrograms = data.repos
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 100);
  
  return topPrograms.map((program) => ({
    id: toUrlId(program.fullName),
  }));
}

// Generate metadata for each program
export function generateMetadata({ params }: { params: { id: string } }) {
  const fullName = fromUrlId(params.id);
  const data = getProgramsData();
  const program = data.repos.find(p => p.fullName === fullName);
  
  if (!program) {
    return { title: 'Program Not Found' };
  }
  
  return {
    title: `${program.name} | Solana Programs Directory`,
    description: program.description || `View ${program.name} on Solana Programs Directory`,
  };
}

export default function ProgramPage({ params }: { params: { id: string } }) {
  const fullName = fromUrlId(params.id);
  const data = getProgramsData();
  
  // Find program - try exact match first
  let program = data.repos.find(p => p.fullName === fullName);
  
  // Try case-insensitive match
  if (!program) {
    program = data.repos.find(p => 
      p.fullName.toLowerCase() === fullName.toLowerCase()
    );
  }
  
  // Try owner/name matching
  if (!program) {
    const [owner, name] = fullName.split('/');
    if (owner && name) {
      program = data.repos.find(p => 
        p.owner.toLowerCase() === owner.toLowerCase() && 
        p.name.toLowerCase() === name.toLowerCase()
      );
    }
  }

  if (!program) {
    notFound();
  }

  const category = getCategoryFromProgram(program);
  
  // Find related programs
  const relatedPrograms = data.repos
    .filter(p => 
      p.fullName !== program.fullName && 
      getCategoryFromProgram(p) === category
    )
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 3);

  const categoryStyles: Record<string, string> = {
    'DEX': 'bg-violet-50 text-violet-700 border-violet-200',
    'NFT': 'bg-purple-50 text-purple-700 border-purple-200',
    'Lending': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Staking': 'bg-amber-50 text-amber-700 border-amber-200',
    'DeFi': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Governance': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    'Trading': 'bg-rose-50 text-rose-700 border-rose-200',
    'Infrastructure': 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12 flex-1">
        <Link href="/programs" className="inline-block px-2 sm:px-0">
          <Button variant="ghost" className="mb-4 sm:mb-6 gap-2 pl-0 hover:pl-2 transition-all rounded-full text-sm sm:text-base min-h-[44px]">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Programs</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 px-2 sm:px-0">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start gap-3 sm:gap-4 mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20 overflow-hidden relative">
                  <Image 
                    src="/logo/nano-banana.svg" 
                    alt="SOL Programs" 
                    fill
                    className="object-cover p-2 sm:p-3"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 truncate">{program.name}</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">{program.owner}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                <Badge variant="outline" className={`${categoryStyles[category] || categoryStyles['Infrastructure']} text-xs sm:text-sm`}>
                  {category}
                </Badge>
                {program.subCategory && program.subCategory !== category && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs sm:text-sm">
                    {program.subCategory}
                  </Badge>
                )}
                {program.language && (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs sm:text-sm">
                    {program.language}
                  </Badge>
                )}
              </div>

              <p className="text-base sm:text-lg leading-relaxed text-foreground/90">
                {program.description || 'No description available for this program.'}
              </p>
            </div>

            <Separator className="bg-border/50" />

            {program.topics.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-violet-500" />
                  Topics
                </h2>
                <div className="flex flex-wrap gap-2">
                  {program.topics.map((topic) => (
                    <Badge key={topic} variant="outline" className="bg-slate-50 font-normal">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a 
                href={`https://github.com/${program.owner}/${program.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" className="w-full gap-2 rounded-xl" size="lg">
                  <Eye className="h-4 w-4" />
                  View on GitHub
                </Button>
              </a>
              <a 
                href={`https://github.com/${program.owner}/${program.name}/archive/refs/heads/main.zip`}
                className="w-full"
              >
                <Button variant="outline" className="w-full gap-2 rounded-xl" size="lg">
                  <Download className="h-4 w-4" />
                  Download ZIP
                </Button>
              </a>
            </div>

            <Separator className="bg-border/50" />

            <a 
              href={program.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full gap-2 btn-shine rounded-xl" size="lg">
                <ExternalLink className="h-4 w-4" />
                View on GitHub
              </Button>
            </a>
          </div>

          <div className="space-y-6">
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Repository Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="h-4 w-4 text-amber-500" />
                    Stars
                  </div>
                  <span className="font-semibold">{formatStars(program.stars)}</span>
                </div>
                
                {program.language && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Code2 className="h-4 w-4 text-blue-500" />
                      Language
                    </div>
                    <span className="font-semibold">{program.language}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    Last Updated
                  </div>
                  <span className="font-semibold">{formatDate(program.updated)}</span>
                </div>
              </CardContent>
            </Card>

            {relatedPrograms.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Related Programs</h3>
                <div className="space-y-4">
                  {relatedPrograms.map((related) => (
                    <ProgramCard key={related.fullName} program={related} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 py-8 md:py-12 mt-auto bg-slate-50/50 w-full">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm text-muted-foreground">
            Data sourced from GitHub
          </p>
        </div>
      </footer>
    </div>
  );
}
