'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Category, CATEGORIES } from '@/types';
import { 
  Layers, 
  Image as ImageIcon, 
  Landmark, 
  Coins, 
  TrendingUp,
  Scale,
  BarChart3,
  Wrench
} from 'lucide-react';

interface CategoryCardsProps {
  counts: Record<string, number>;
}

const categoryIcons: Record<Category, typeof Layers> = {
  'All': Layers,
  'DEX': Scale,
  'NFT': ImageIcon,
  'Lending': Landmark,
  'Staking': Coins,
  'DeFi': TrendingUp,
  'Governance': BarChart3,
  'Trading': BarChart3,
  'Infrastructure': Wrench,
};

const categoryGradients: Record<Category, string> = {
  'All': 'from-slate-500 to-slate-600',
  'DEX': 'from-blue-500 to-cyan-500',
  'NFT': 'from-purple-500 to-pink-500',
  'Lending': 'from-emerald-500 to-teal-500',
  'Staking': 'from-amber-500 to-orange-500',
  'DeFi': 'from-cyan-500 to-blue-500',
  'Governance': 'from-indigo-500 to-violet-500',
  'Trading': 'from-rose-500 to-red-500',
  'Infrastructure': 'from-gray-500 to-slate-500',
};

export function CategoryCards({ counts }: CategoryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {CATEGORIES.filter(c => c !== 'All').map((category) => {
        const Icon = categoryIcons[category];
        return (
          <Link key={category} href={`/programs?category=${category}`} className="block">
            <Card className="group card-hover cursor-pointer overflow-hidden border border-border/50 bg-white h-full">
              <CardContent className="p-4 sm:p-6">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${categoryGradients[category]} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-0.5 sm:mb-1">{category}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {counts[category] || 0} programs
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
