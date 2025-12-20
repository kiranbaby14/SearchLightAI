'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Video, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoGrid } from '@/components/videos/video-grid';
import { UploadDialog } from '@/components/videos/upload-dialog';
import { getVideos, deleteVideo } from '@/lib/api';
import type { Video as VideoType } from '@/types';

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadVideos = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    }

    try {
      const response = await getVideos(1, 50);
      setVideos(response.videos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Poll for updates when there are processing videos
  useEffect(() => {
    const hasProcessing = videos.some(
      (v) => !['completed', 'failed'].includes(v.status)
    );

    if (!hasProcessing) return;

    const interval = setInterval(() => loadVideos(), 5000);
    return () => clearInterval(interval);
  }, [videos, loadVideos]);

  const handleDelete = async (id: string) => {
    try {
      await deleteVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Video Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage and browse your indexed videos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadVideos(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </Button>

          <UploadDialog onSuccess={() => loadVideos()}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Video
            </Button>
          </UploadDialog>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="text-primary mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading videos...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24">
          <div className="bg-muted mb-6 rounded-full p-6">
            <Video className="text-muted-foreground h-12 w-12" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">No videos yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md text-center">
            Add your first video to start searching. We&apos;ll automatically
            extract and index all the visual and audio content.
          </p>
          <UploadDialog onSuccess={() => loadVideos()}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Video
            </Button>
          </UploadDialog>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-muted-foreground text-sm">
              {videos.length} video{videos.length !== 1 && 's'}
            </p>
          </div>
          <VideoGrid videos={videos} onDelete={handleDelete} />
        </>
      )}
    </div>
  );
}
