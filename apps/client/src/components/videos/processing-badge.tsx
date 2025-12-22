'use client';

import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Film,
  AudioLines,
  Brain,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoStatus } from '@/types';

interface ProcessingBadgeProps {
  status: VideoStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  VideoStatus,
  {
    label: string;
    icon: typeof Loader2;
    className: string;
    description?: string;
  }
> = {
  pending: {
    label: 'Queued',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    description: 'Waiting to process...'
  },
  processing: {
    label: 'Starting',
    icon: Loader2,
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: 'Initializing...'
  },
  extracting_frames: {
    label: 'Extracting Frames',
    icon: Film,
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: 'Detecting scenes...'
  },
  extracting_audio: {
    label: 'Extracting Audio',
    icon: AudioLines,
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    description: 'Preparing audio...'
  },
  transcribing: {
    label: 'Transcribing',
    icon: AudioLines,
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    description: 'Converting speech to text...'
  },
  embedding: {
    label: 'Indexing',
    icon: Brain,
    className: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    description: 'Creating AI embeddings...'
  },
  completed: {
    label: 'Ready',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-500 border-green-500/20'
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-500 border-red-500/20'
  }
};

export function ProcessingBadge({
  status,
  className,
  showIcon = true
}: ProcessingBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isLoading = !['completed', 'failed'].includes(status);

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border px-4 py-3 text-center backdrop-blur-sm',
        config.className,
        className
      )}
    >
      <div className="flex items-center gap-2">
        {showIcon && (
          <Icon
            className={cn(
              'h-4 w-4',
              isLoading && status !== 'pending' && 'animate-spin'
            )}
          />
        )}
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      {isLoading && config.description && (
        <span className="text-xs opacity-80">{config.description}</span>
      )}
    </div>
  );
}

// Compact version for inline use
export function ProcessingBadgeCompact({
  status,
  className
}: ProcessingBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isLoading = !['completed', 'failed'].includes(status);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
        config.className,
        className
      )}
    >
      <Icon
        className={cn(
          'h-3 w-3',
          isLoading && status !== 'pending' && 'animate-spin'
        )}
      />
      {config.label}
    </div>
  );
}
