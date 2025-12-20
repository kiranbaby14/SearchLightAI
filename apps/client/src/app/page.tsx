'use client';

import { useState, useCallback } from 'react';
import { Loader2, Video, Sparkles } from 'lucide-react';
import { SearchBar } from '@/components/search/search-bar';
import { SearchTypeTabs } from '@/components/search/search-type-tabs';
import { SearchResults } from '@/components/search/search-results';
import { searchVideos } from '@/lib/api';
import type { SearchType, SearchResult } from '@/types';

export default function SearchPage() {
  const [searchType, setSearchType] = useState<SearchType>('hybrid');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  const handleSearch = useCallback(
    async (query: string) => {
      setIsSearching(true);
      setCurrentQuery(query);

      try {
        const response = await searchVideos({
          query,
          search_type: searchType,
          limit: 20,
          threshold: 0.01
        });
        setResults(response.results);
        setHasSearched(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchType]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <div className="border-primary/20 bg-primary/5 text-primary mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          AI-Powered Video Search
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Find any moment in
          <br />
          <span className="from-primary to-primary/60 bg-gradient-to-r bg-clip-text text-transparent">
            your videos
          </span>
        </h1>

        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
          Search by describing what you see or what was said. Our AI understands
          both visual content and speech to find exactly what you need.
        </p>
      </div>

      {/* Search Section */}
      <div className="mb-8 space-y-6">
        <SearchBar onSearch={handleSearch} isLoading={isSearching} />

        <div className="flex justify-center">
          <SearchTypeTabs value={searchType} onChange={setSearchType} />
        </div>
      </div>

      {/* Results Section */}
      <div className="mt-12">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="text-primary mb-4 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Searching your videos...</p>
          </div>
        ) : hasSearched ? (
          <SearchResults results={results} query={currentQuery} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-6 rounded-full p-6">
              <Video className="text-muted-foreground h-12 w-12" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Start searching</h3>
            <p className="text-muted-foreground max-w-md">
              Type a description of what you&apos;re looking for above. You can
              search for visual content, spoken words, or both.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
