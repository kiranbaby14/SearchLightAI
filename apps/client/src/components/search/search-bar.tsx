'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  isLoading,
  placeholder
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        onSearch(query.trim());
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={cn(
          'group bg-card/50 relative flex items-center rounded-2xl border transition-all duration-300',
          isFocused
            ? 'border-primary/50 shadow-primary/5 ring-primary/10 shadow-lg ring-4'
            : 'border-border hover:border-border/80 hover:bg-card/80'
        )}
      >
        <div className="pointer-events-none absolute left-4 flex items-center">
          {isLoading ? (
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          ) : (
            <Search
              className={cn(
                'h-5 w-5 transition-colors',
                isFocused ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || "Describe what you're looking for..."}
          className="placeholder:text-muted-foreground/60 h-14 w-full bg-transparent pr-4 pl-12 text-base outline-none"
        />

        {query && (
          <div className="absolute right-4 flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3" />
              AI Search
            </div>
          </div>
        )}
      </div>

      <p className="text-muted-foreground mt-3 text-center text-sm">
        Search by visual content{' '}
        <span className="text-muted-foreground/60">
          &quot;person near red car&quot;
        </span>{' '}
        or speech{' '}
        <span className="text-muted-foreground/60">
          &quot;when I mentioned budget&quot;
        </span>
      </p>
    </form>
  );
}
