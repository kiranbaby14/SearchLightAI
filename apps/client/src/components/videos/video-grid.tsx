'use client';

import { VideoCard } from './video-card';
import type { Video } from '@/types';

interface VideoGridProps {
  videos: Video[];
  onDelete?: (id: string) => void;
}

export function VideoGrid({ videos, onDelete }: VideoGridProps) {
  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} onDelete={onDelete} />
      ))}
    </div>
  );
}
