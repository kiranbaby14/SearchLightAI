'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  File,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn, formatFileSize } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface UploadDialogProps {
  onVideoUploaded?: (response: VideoUploadResponse) => void;
  onComplete?: () => void;
  children: React.ReactNode;
}

interface VideoUploadResponse {
  id: string;
  filename: string;
  status: string;
  message: string;
}

type FileStatus = 'pending' | 'uploading' | 'done' | 'error' | 'cancelled';

interface FileUploadState {
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  abortController?: AbortController;
}

export function UploadDialog({
  onVideoUploaded,
  onComplete,
  children
}: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileStates, setFileStates] = useState<Map<string, FileUploadState>>(
    new Map()
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileKey = (file: File, index: number) =>
    `${file.name}-${file.size}-${index}`;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('video/')
    );

    if (droppedFiles.length === 0) {
      setError('Please drop video files only');
      return;
    }

    setFileStates((prev) => {
      const newMap = new Map(prev);
      droppedFiles.forEach((file, i) => {
        const key = getFileKey(file, prev.size + i);
        if (!newMap.has(key)) {
          newMap.set(key, { file, status: 'pending', progress: 0 });
        }
      });
      return newMap;
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];

    setFileStates((prev) => {
      const newMap = new Map(prev);
      selectedFiles.forEach((file, i) => {
        const key = getFileKey(file, prev.size + i);
        if (!newMap.has(key)) {
          newMap.set(key, { file, status: 'pending', progress: 0 });
        }
      });
      return newMap;
    });

    e.target.value = '';
  };

  const removeFile = (key: string) => {
    setFileStates((prev) => {
      const newMap = new Map(prev);
      const state = newMap.get(key);
      if (state?.abortController) {
        state.abortController.abort();
      }
      newMap.delete(key);
      return newMap;
    });
  };

  const cancelUpload = (key: string) => {
    setFileStates((prev) => {
      const newMap = new Map(prev);
      const state = newMap.get(key);
      if (state?.abortController) {
        state.abortController.abort();
      }
      if (state) {
        newMap.set(key, { ...state, status: 'cancelled', progress: 0 });
      }
      return newMap;
    });
  };

  const uploadSingleFile = async (
    key: string,
    fileState: FileUploadState
  ): Promise<boolean> => {
    const abortController = new AbortController();

    setFileStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, {
        ...fileState,
        status: 'uploading',
        progress: 0,
        abortController
      });
      return newMap;
    });

    try {
      const formData = new FormData();
      formData.append('file', fileState.file);

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<VideoUploadResponse>(
        (resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setFileStates((prev) => {
                const newMap = new Map(prev);
                const current = newMap.get(key);
                if (current && current.status === 'uploading') {
                  newMap.set(key, { ...current, progress });
                }
                return newMap;
              });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(
                  xhr.responseText
                ) as VideoUploadResponse;
                resolve(response);
              } catch {
                reject(new Error('Invalid response from server'));
              }
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener('error', () =>
            reject(new Error('Network error'))
          );
          xhr.addEventListener('abort', () =>
            reject(new Error('Upload cancelled'))
          );

          abortController.signal.addEventListener('abort', () => xhr.abort());

          xhr.open('POST', `${API_BASE}/videos/upload`);
          xhr.send(formData);
        }
      );

      const response = await uploadPromise;

      setFileStates((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(key);
        if (current) {
          newMap.set(key, { ...current, status: 'done', progress: 100 });
        }
        return newMap;
      });

      onVideoUploaded?.(response);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      const isCancelled = errorMessage === 'Upload cancelled';

      setFileStates((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(key);
        if (current) {
          newMap.set(key, {
            ...current,
            status: isCancelled ? 'cancelled' : 'error',
            progress: 0,
            error: isCancelled ? undefined : errorMessage
          });
        }
        return newMap;
      });
      return false;
    }
  };

  const handleUpload = async () => {
    const pendingFiles = Array.from(fileStates.entries()).filter(
      ([_, state]) => state.status === 'pending' || state.status === 'cancelled'
    );

    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    for (const [key, state] of pendingFiles) {
      const currentState = fileStates.get(key);
      if (!currentState || currentState.status === 'cancelled') continue;

      await uploadSingleFile(key, state);
    }

    setIsUploading(false);

    const allDone = Array.from(fileStates.values()).every(
      (s) => s.status === 'done' || s.status === 'cancelled'
    );

    if (
      allDone &&
      Array.from(fileStates.values()).some((s) => s.status === 'done')
    ) {
      onComplete?.();

      setTimeout(() => {
        setOpen(false);
        setFileStates(new Map());
      }, 1000);
    }
  };

  const clearAllFiles = () => {
    fileStates.forEach((state) => {
      if (state.abortController) {
        state.abortController.abort();
      }
    });
    setFileStates(new Map());
    setError(null);
  };

  const retryFile = (key: string) => {
    setFileStates((prev) => {
      const newMap = new Map(prev);
      const state = newMap.get(key);
      if (state) {
        newMap.set(key, {
          ...state,
          status: 'pending',
          progress: 0,
          error: undefined
        });
      }
      return newMap;
    });
  };

  const fileEntries = Array.from(fileStates.entries());
  const totalSize = fileEntries.reduce((acc, [_, s]) => acc + s.file.size, 0);
  const completedCount = fileEntries.filter(
    ([_, s]) => s.status === 'done'
  ).length;
  const errorCount = fileEntries.filter(
    ([_, s]) => s.status === 'error'
  ).length;
  const pendingCount = fileEntries.filter(
    ([_, s]) => s.status === 'pending' || s.status === 'cancelled'
  ).length;
  const uploadingFile = fileEntries.find(([_, s]) => s.status === 'uploading');

  const canClose = !uploadingFile;
  const hasFiles = fileEntries.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && uploadingFile) {
          if (!confirm('Upload in progress. Close anyway?')) return;
          uploadingFile[1].abortController?.abort();
        }
        setOpen(o);
        if (!o) {
          clearAllFiles();
          setIsUploading(false);
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg" showCloseButton={canClose}>
        <DialogHeader>
          <DialogTitle>Upload Videos</DialogTitle>
          {hasFiles && (
            <DialogDescription>
              {completedCount > 0 && `${completedCount} uploaded`}
              {completedCount > 0 &&
                (pendingCount > 0 || errorCount > 0) &&
                ' · '}
              {pendingCount > 0 && `${pendingCount} pending`}
              {errorCount > 0 && ` · ${errorCount} failed`}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-4 min-w-0">
          {/* Drop Zone */}
          {!isUploading && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Upload
                className={cn(
                  'mb-3 h-8 w-8',
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <p className="mb-1 text-sm font-medium">
                Drag and drop videos here
              </p>
              <p className="text-muted-foreground text-xs">
                or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Overall Progress Bar when uploading */}
          {isUploading && uploadingFile && (
            <div className="bg-muted/30 mb-4 rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">
                  Uploading {completedCount + 1} of {fileEntries.length}
                </span>
                <span className="text-muted-foreground">
                  {uploadingFile[1].progress}%
                </span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadingFile[1].progress}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-2 truncate text-xs">
                {uploadingFile[1].file.name}
              </p>
            </div>
          )}

          {/* File List */}
          {hasFiles && (
            <div className={cn('min-w-0 space-y-2', !isUploading && 'mt-4')}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {fileEntries.length} file{fileEntries.length !== 1 && 's'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {formatFileSize(totalSize)}
                  </span>
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFiles}
                      className="h-7 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-64 min-w-0 space-y-2 overflow-y-auto pr-1">
                {fileEntries.map(([key, state]) => (
                  <FileUploadItem
                    key={key}
                    fileKey={key}
                    state={state}
                    onRemove={() => removeFile(key)}
                    onCancel={() => cancelUpload(key)}
                    onRetry={() => retryFile(key)}
                    disabled={isUploading && state.status !== 'uploading'}
                  />
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

          <div className="mt-4 flex gap-2">
            {isUploading ? (
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  uploadingFile?.[1].abortController?.abort();
                  setIsUploading(false);
                }}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Stop Uploading
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={pendingCount === 0}
              >
                <Upload className="mr-2 h-4 w-4" />
                {pendingCount > 0
                  ? `Upload ${pendingCount} Video${pendingCount !== 1 ? 's' : ''}`
                  : completedCount > 0
                    ? 'All Done!'
                    : 'Add Videos First'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FileUploadItemProps {
  fileKey: string;
  state: FileUploadState;
  onRemove: () => void;
  onCancel: () => void;
  onRetry: () => void;
  disabled: boolean;
}

function FileUploadItem({
  state,
  onRemove,
  onCancel,
  onRetry,
  disabled
}: FileUploadItemProps) {
  const { file, status, progress, error } = state;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border p-3 transition-colors',
        status === 'done' && 'border-green-500/30 bg-green-500/5',
        status === 'error' && 'border-red-500/30 bg-red-500/5',
        status === 'uploading' && 'border-primary/30 bg-primary/5',
        (status === 'pending' || status === 'cancelled') && 'bg-muted/50'
      )}
    >
      {status === 'uploading' && (
        <div
          className="bg-primary/10 absolute inset-0 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            status === 'done' && 'bg-green-500/20 text-green-500',
            status === 'error' && 'bg-red-500/20 text-red-500',
            status === 'uploading' && 'bg-primary/20 text-primary',
            (status === 'pending' || status === 'cancelled') &&
              'bg-muted text-muted-foreground'
          )}
        >
          {status === 'done' && <CheckCircle2 className="h-5 w-5" />}
          {status === 'error' && <AlertCircle className="h-5 w-5" />}
          {status === 'uploading' && (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
          {(status === 'pending' || status === 'cancelled') && (
            <File className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={file.name}>
            {file.name}
          </p>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span>{formatFileSize(file.size)}</span>
            {status === 'uploading' && <span>· {progress}%</span>}
            {status === 'done' && (
              <span className="text-green-500">· Uploaded</span>
            )}
            {status === 'error' && (
              <span className="text-red-500">· {error || 'Failed'}</span>
            )}
            {status === 'cancelled' && <span>· Cancelled</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {status === 'error' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-8 px-2 text-xs"
            >
              Retry
            </Button>
          )}
          {status === 'uploading' ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCancel}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          ) : (
            status !== 'done' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
