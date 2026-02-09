'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Program, getCategoryFromProgram } from '@/types';
import { formatStars } from '@/lib/data';

interface ProgramCardProps {
  program: Program;
}

const categoryStyles: Record<string, string> = {
  'DEX': 'bg-blue-50 text-blue-700 border-blue-200',
  'NFT': 'bg-purple-50 text-purple-700 border-purple-200',
  'Lending': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Staking': 'bg-amber-50 text-amber-700 border-amber-200',
  'DeFi': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Governance': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Trading': 'bg-rose-50 text-rose-700 border-rose-200',
  'Infrastructure': 'bg-gray-50 text-gray-700 border-gray-200',
};

function toUrlId(fullName: string): string {
  return fullName.replace(/\//g, '--');
}

export function ProgramCard({ program }: ProgramCardProps) {
  const category = getCategoryFromProgram(program);

  return (
    <Link href={`/program/${toUrlId(program.fullName)}`} className="block">
      <Card className="h-full card-hover cursor-pointer border border-border/50 bg-white min-h-[140px]">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base sm:text-lg font-semibold line-clamp-1 group-hover:text-blue-600 transition-colors">
              {program.name}
            </CardTitle>
            <Badge variant="outline" className={`shrink-0 text-xs ${categoryStyles[category] || categoryStyles['Infrastructure']}`}>
              {category}
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            {program.owner}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {program.description || 'No description available'}
          </p>

          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 fill-amber-500" />
              <span className="font-medium text-sm">{formatStars(program.stars)}</span>
            </div>
            {program.language && (
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100">
                {program.language}
              </Badge>
            )}
          </div>

          {program.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {program.topics.slice(0, 3).map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs font-normal bg-slate-50">
                  {topic}
                </Badge>
              ))}
              {program.topics.length > 3 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{program.topics.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
