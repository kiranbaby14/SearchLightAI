'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Clock,
  Film,
  AudioLines,
  Calendar,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/videos/video-player';
import { ProcessingBadge } from '@/components/videos/processing-badge';
import {
  formatDuration,
  formatFileSize,
  formatRelativeTime,
  formatTimestamp
} from '@/lib/utils';
import { getVideo, getVideoTranscript } from '@/lib/api';
import type { Video, TranscriptSegment } from '@/types';

export default function VideoDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const videoId = params.id as string;
  const startTime = parseFloat(searchParams.get('t') || '0');

  const [video, setVideo] = useState<Video | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [videoData, transcriptData] = await Promise.all([
          getVideo(videoId),
          getVideoTranscript(videoId).catch(() => ({ segments: [] }))
        ]);

        setVideo(videoData);
        setTranscript(transcriptData.segments);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold">Video not found</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/videos">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isReady = video.status === 'completed';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <Link
        href="/videos"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Video Player */}
          {isReady ? (
            <VideoPlayer
              src={`http://localhost:8000/videos/${video.original_path}`}
              initialTime={startTime}
            />
          ) : (
            <div className="bg-muted flex aspect-video items-center justify-center rounded-xl">
              <div className="text-center">
                <ProcessingBadge status={video.status} className="mb-3" />
                <p className="text-muted-foreground text-sm">
                  Video is being processed...
                </p>
              </div>
            </div>
          )}

          {/* Video Info */}
          <div className="mt-6">
            <h1 className="text-2xl font-bold">{video.filename}</h1>

            <div className="text-muted-foreground mt-4 flex flex-wrap gap-4 text-sm">
              {video.duration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(video.duration)}
                </div>
              )}
              {video.file_size && (
                <div className="flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4" />
                  {formatFileSize(video.file_size)}
                </div>
              )}
              {video.width && video.height && (
                <div className="flex items-center gap-1.5">
                  <Film className="h-4 w-4" />
                  {video.width}×{video.height}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Added {formatRelativeTime(video.created_at)}
              </div>
            </div>

            {isReady && (
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {video.keyframe_count} keyframes indexed
                </span>
                <span className="text-muted-foreground">
                  {transcript.length} transcript segments
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Transcript Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card/50 sticky top-24 rounded-xl border p-4">
            <div className="mb-4 flex items-center gap-2">
              <AudioLines className="text-primary h-5 w-5" />
              <h2 className="font-semibold">Transcript</h2>
            </div>

            {transcript.length > 0 ? (
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
                {transcript.map((segment, index) => (
                  <button
                    key={index}
                    className="hover:bg-muted w-full rounded-lg p-3 text-left transition-colors"
                    onClick={() => {
                      const video = document.querySelector('video');
                      if (video) {
                        video.currentTime = segment.start_time;
                        video.play();
                      }
                    }}
                  >
                    <div className="text-primary mb-1 text-xs font-medium">
                      {formatTimestamp(segment.start_time)}
                    </div>
                    <p className="text-foreground text-sm">{segment.text}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {isReady
                  ? 'No transcript available'
                  : 'Transcript will appear after processing'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
