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

interface VideoCardProps {
  video: Video;
  onDelete?: (id: string) => void;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const isProcessing = !['completed', 'failed'].includes(video.status);
  const hasFailed = video.status === 'failed';

  return (
    <div className="group border-border/50 bg-card/50 hover:border-border hover:bg-card relative overflow-hidden rounded-xl border transition-all hover:shadow-lg">
      <Link href={`/videos/${video.id}`}>
        <div className="bg-muted relative aspect-video w-full overflow-hidden">
          <div className="flex h-full items-center justify-center">
            <FileVideo className="text-muted-foreground/50 h-12 w-12" />
          </div>

          {video.status === 'completed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                <Play className="h-8 w-8 text-white" fill="white" />
              </div>
            </div>
          )}

          {video.duration && (
            <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
              <Clock className="h-3 w-3" />
              {formatDuration(video.duration)}
            </div>
          )}

          {(isProcessing || hasFailed) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <ProcessingBadge status={video.status} />
            </div>
          )}
        </div>
      </Link>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{video.filename}</h3>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              {video.file_size && (
                <span>{formatFileSize(video.file_size)}</span>
              )}
              <span>•</span>
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
      </div>
    </div>
  );
}
