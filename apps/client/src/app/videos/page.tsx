'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Video, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoGrid } from '@/components/videos/video-grid';
import { UploadDialog } from '@/components/videos/upload-dialog';
import { getVideos, deleteVideo } from '@/lib/api';
import type { Video as VideoType, VideoUploadResponse } from '@/types';
import { toast } from 'sonner';

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const loadVideos = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    }

    try {
      const response = await getVideos(1, 50);
      setVideos(response.videos);
    } catch (error) {
      console.error('Failed to load videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const hasProcessing = videos.some(
    (v) => !['completed', 'failed'].includes(v.status)
  );

  useEffect(() => {
    if (!hasProcessing) return;

    const interval = setInterval(() => loadVideos(), 3000);
    return () => clearInterval(interval);
  }, [hasProcessing, loadVideos]);

  const handleVideoUploaded = useCallback(
    (uploadResponse: VideoUploadResponse) => {
      const optimisticVideo: VideoType = {
        id: uploadResponse.id,
        filename: uploadResponse.filename,
        original_path: '',
        thumbnail_path: null,
        file_size: null,
        duration: null,
        width: null,
        height: null,
        status: uploadResponse.status,
        error_message: null,
        frame_count: 0,
        keyframe_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processed_at: null
      };

      setVideos((prev) => {
        const exists = prev.some((v) => v.id === uploadResponse.id);
        if (exists) return prev;
        return [optimisticVideo, ...prev];
      });

      toast.success(`"${uploadResponse.filename}" uploaded`, {
        description: 'Processing will begin shortly...'
      });
    },
    []
  );

  const handleUploadComplete = useCallback(() => {
    loadVideos();
  }, [loadVideos]);

  const handleDelete = async (id: string) => {
    const video = videos.find((v) => v.id === id);

    setVideos((prev) => prev.filter((v) => v.id !== id));

    try {
      await deleteVideo(id);
      toast.success(`"${video?.filename}" deleted`);
    } catch (error) {
      console.error('Failed to delete video:', error);
      toast.error('Failed to delete video');
      loadVideos();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Single dialog instance - always mounted */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onVideoUploaded={handleVideoUploaded}
        onComplete={handleUploadComplete}
      />

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

          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Video
          </Button>
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
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Video
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-muted-foreground text-sm">
              {videos.length} video{videos.length !== 1 && 's'}
              {hasProcessing && (
                <span className="text-primary ml-2">
                  ·{' '}
                  {
                    videos.filter(
                      (v) => !['completed', 'failed'].includes(v.status)
                    ).length
                  }{' '}
                  processing
                </span>
              )}
            </p>
          </div>
          <VideoGrid videos={videos} onDelete={handleDelete} />
        </>
      )}
    </div>
  );
}
