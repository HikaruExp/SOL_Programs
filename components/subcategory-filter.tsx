'use client';

import { Badge } from '@/components/ui/badge';

interface SubcategoryFilterProps {
  subcategories: string[];
  selected: string;
  onSelect: (subcategory: string) => void;
}

export function SubcategoryFilter({ subcategories, selected, onSelect }: SubcategoryFilterProps) {
  if (subcategories.length === 0) return null;

  return (
    <div className="mt-4 px-2 sm:px-0 animate-fade-in">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground mr-2">Subcategory:</span>
        <Badge
          variant={selected === 'all' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={() => onSelect('all')}
        >
          All
        </Badge>
        {subcategories.map((sub) => (
          <Badge
            key={sub}
            variant={selected === sub ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => onSelect(sub)}
          >
            {sub}
          </Badge>
        ))}
      </div>
    </div>
  );
}
