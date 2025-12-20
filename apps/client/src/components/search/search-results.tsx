'use client';

import Link from 'next/link';
import { Play, Clock, AudioLines, Eye, FileVideo } from 'lucide-react';
import { cn, formatTimestamp } from '@/lib/utils';
import type { SearchResult } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const STATIC_BASE = API_BASE.replace('/api', '');

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted mb-4 rounded-full p-4">
          <FileVideo className="text-muted-foreground h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium">No results found</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Try adjusting your search or upload more videos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Found{' '}
          <span className="text-foreground font-medium">{results.length}</span>{' '}
          results for{' '}
          <span className="text-foreground font-medium">
            &quot;{query}&quot;
          </span>
        </p>
      </div>

      <div className="grid gap-3">
        {results.map((result, index) => (
          <SearchResultCard
            key={`${result.video_id}-${result.timestamp}-${index}`}
            result={result}
          />
        ))}
      </div>
    </div>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const isVisual = result.result_type === 'visual';

  // Build frame URL - frame_path is like "frames/video-id/frame_0000_0.00.jpg"
  const frameUrl = result.frame_path
    ? `${STATIC_BASE}/${result.frame_path.replace(/\\/g, '/')}`
    : null;

  return (
    <Link
      href={`/videos/${result.video_id}?t=${result.timestamp}`}
      className="group border-border/50 bg-card/50 hover:border-border hover:bg-card flex gap-4 rounded-xl border p-4 transition-all hover:shadow-lg"
    >
      <div className="bg-muted relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        {frameUrl ? (
          <>
            <img
              src={frameUrl}
              alt="Frame preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="h-8 w-8 text-white" fill="white" />
            </div>
          </>
        ) : (
          <FileVideo className="text-muted-foreground h-8 w-8" />
        )}

        <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
          <Clock className="h-3 w-3" />
          {formatTimestamp(result.timestamp)}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                isVisual
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-purple-500/10 text-purple-500'
              )}
            >
              {isVisual ? (
                <Eye className="h-3 w-3" />
              ) : (
                <AudioLines className="h-3 w-3" />
              )}
              {isVisual ? 'Visual' : 'Speech'}
            </span>
            <span className="text-muted-foreground text-xs">
              {Math.round(result.score * 100)}% match
            </span>
          </div>

          <h4 className="truncate font-medium">{result.video_filename}</h4>

          {result.transcript_text && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              &quot;{result.transcript_text}&quot;
            </p>
          )}
        </div>

        <div className="text-muted-foreground mt-2 text-xs">
          Jump to {formatTimestamp(result.timestamp)}
          {result.end_timestamp &&
            ` - ${formatTimestamp(result.end_timestamp)}`}
        </div>
      </div>
    </Link>
  );
}
