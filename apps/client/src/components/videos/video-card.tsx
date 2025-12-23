'use client';

import Link from 'next/link';
import { Play, Clock, MoreVertical, Trash2, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ProcessingBadge } from './processing-badge';
import {
  formatDuration,
  formatFileSize,
  formatRelativeTime
} from '@/lib/utils';
import type { Video } from '@/types';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const STATIC_BASE = API_BASE.replace('/api', '');

interface VideoCardProps {
  video: Video;
  onDelete?: (id: string) => void;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const isProcessing = !['completed', 'failed'].includes(video.status);
  const hasFailed = video.status === 'failed';

  // Build thumbnail URL from thumbnail_path
  const thumbnailUrl = video.thumbnail_path
    ? `${STATIC_BASE}/${video.thumbnail_path.replace(/\\/g, '/')}`
    : null;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border transition-all',
        'animate-in fade-in-0 slide-in-from-bottom-4 duration-500',
        isProcessing &&
          !hasFailed &&
          'border-primary/30 shadow-primary/5 shadow-lg',
        hasFailed && 'border-destructive/30',
        !isProcessing &&
          !hasFailed &&
          'border-border/50 bg-card/50 hover:border-border hover:bg-card hover:shadow-lg'
      )}
    >
      {/* Processing pulse effect */}
      {isProcessing && !hasFailed && (
        <div className="from-primary/5 via-primary/10 to-primary/5 absolute inset-0 animate-pulse bg-gradient-to-r" />
      )}

      <Link href={`/videos/${video.id}`} className="relative block">
        <div className="bg-muted relative aspect-video w-full overflow-hidden">
          {/* Thumbnail or placeholder */}
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={video.filename}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileVideo
                className={cn(
                  'h-12 w-12',
                  isProcessing ? 'text-primary/50' : 'text-muted-foreground/50'
                )}
              />
            </div>
          )}

          {/* Play button overlay on hover (only for completed videos) */}
          {video.status === 'completed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                <Play className="h-8 w-8 text-white" fill="white" />
              </div>
            </div>
          )}

          {/* Duration badge */}
          {video.duration && (
            <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
              <Clock className="h-3 w-3" />
              {formatDuration(video.duration)}
            </div>
          )}

          {/* Processing/Failed overlay */}
          {(isProcessing || hasFailed) && (
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                hasFailed ? 'bg-black/60' : 'bg-black/40 backdrop-blur-[2px]'
              )}
            >
              <ProcessingBadge status={video.status} />
            </div>
          )}
        </div>
      </Link>

      <div className="relative p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{video.filename}</h3>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              {video.file_size ? (
                <span>{formatFileSize(video.file_size)}</span>
              ) : isProcessing ? (
                <span className="text-primary">Just added</span>
              ) : null}
              {video.file_size && <span>•</span>}
              <span>{formatRelativeTime(video.created_at)}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(video.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {video.status === 'completed' && (
          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
            <span>{video.keyframe_count} keyframes</span>
            {video.width && video.height && (
              <>
                <span>•</span>
                <span>
                  {video.width}×{video.height}
                </span>
              </>
            )}
          </div>
        )}

        {/* Processing steps indicator */}
        {isProcessing && !hasFailed && (
          <div className="mt-3">
            <ProcessingSteps status={video.status} />
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessingSteps({ status }: { status: string }) {
  const steps = [
    { key: 'pending', label: 'Queued' },
    { key: 'extracting_frames', label: 'Frames' },
    { key: 'extracting_audio', label: 'Audio' },
    { key: 'transcribing', label: 'Transcribe' },
    { key: 'embedding', label: 'Indexing' }
  ];

  const currentIndex = steps.findIndex(
    (s) => s.key === status || (status === 'processing' && s.key === 'pending')
  );

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                isComplete && 'bg-primary',
                isCurrent && 'bg-primary animate-pulse',
                !isComplete && !isCurrent && 'bg-muted'
              )}
              style={{ width: '100%', minWidth: 24 }}
              title={step.label}
            />
          </div>
        );
      })}
    </div>
  );
}
