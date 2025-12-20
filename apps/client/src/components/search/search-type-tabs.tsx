'use client';

import { Eye, AudioLines, Layers } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SearchType } from '@/types';

interface SearchTypeTabsProps {
  value: SearchType;
  onChange: (value: SearchType) => void;
}

const searchTypes = [
  {
    value: 'hybrid' as const,
    label: 'All',
    icon: Layers,
    description: 'Visual + Speech'
  },
  {
    value: 'visual' as const,
    label: 'Visual',
    icon: Eye,
    description: 'Scene content'
  },
  {
    value: 'speech' as const,
    label: 'Speech',
    icon: AudioLines,
    description: 'What was said'
  }
];

export function SearchTypeTabs({ value, onChange }: SearchTypeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as SearchType)}>
      <TabsList className="h-auto gap-2 bg-transparent p-0">
        {searchTypes.map((type) => (
          <TabsTrigger
            key={type.value}
            value={type.value}
            className="bg-card/50 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex items-center gap-2 rounded-xl border border-transparent px-4 py-2.5"
          >
            <type.icon className="h-4 w-4" />
            <span className="font-medium">{type.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
