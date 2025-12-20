'use client';

import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoStatus } from '@/types';

interface ProcessingBadgeProps {
  status: VideoStatus;
  className?: string;
}

const statusConfig: Record<
  VideoStatus,
  { label: string; icon: typeof Loader2; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: Loader2,
    className: 'bg-yellow-500/10 text-yellow-500'
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-blue-500/10 text-blue-500'
  },
  extracting_frames: {
    label: 'Extracting Frames',
    icon: Loader2,
    className: 'bg-blue-500/10 text-blue-500'
  },
  extracting_audio: {
    label: 'Extracting Audio',
    icon: Loader2,
    className: 'bg-blue-500/10 text-blue-500'
  },
  transcribing: {
    label: 'Transcribing',
    icon: Loader2,
    className: 'bg-purple-500/10 text-purple-500'
  },
  embedding: {
    label: 'Creating Embeddings',
    icon: Loader2,
    className: 'bg-indigo-500/10 text-indigo-500'
  },
  completed: {
    label: 'Ready',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-500'
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-500'
  }
};

export function ProcessingBadge({ status, className }: ProcessingBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isLoading = !['completed', 'failed'].includes(status);

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium',
        config.className,
        className
      )}
    >
      <Icon className={cn('h-4 w-4', isLoading && 'animate-spin')} />
      {config.label}
    </div>
  );
}
