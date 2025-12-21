'use client';

import { useState, useCallback } from 'react';
import { Upload, File, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatFileSize } from '@/lib/utils';
import { uploadVideo, addVideoByPath } from '@/lib/api';

interface UploadDialogProps {
  onSuccess?: () => void;
  children: React.ReactNode;
}

export function UploadDialog({ onSuccess, children }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [filePath, setFilePath] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, 'pending' | 'uploading' | 'done' | 'error'>
  >({});
  const [error, setError] = useState<string | null>(null);

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

    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
    // Reset input so same files can be selected again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);

    // Initialize progress
    const initialProgress: Record<
      string,
      'pending' | 'uploading' | 'done' | 'error'
    > = {};
    files.forEach((f) => {
      initialProgress[f.name] = 'pending';
    });
    setUploadProgress(initialProgress);

    let hasError = false;

    for (const file of files) {
      setUploadProgress((prev) => ({ ...prev, [file.name]: 'uploading' }));

      try {
        await uploadVideo(file);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 'done' }));
      } catch (err) {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 'error' }));
        hasError = true;
      }
    }

    if (!hasError) {
      setOpen(false);
      setFiles([]);
      setUploadProgress({});
      onSuccess?.();
    } else {
      setError('Some files failed to upload');
      setIsUploading(false);
    }
  };

  const handleAddByPath = async () => {
    if (!filePath.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      await addVideoByPath(filePath.trim());
      setOpen(false);
      setFilePath('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add video');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setError(null);
    setUploadProgress({});
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setFiles([]);
          setError(null);
          setUploadProgress({});
          setIsUploading(false);
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Videos</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="mt-4 min-w-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="path">File Path</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4 min-w-0">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
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
              <p className="text-muted-foreground mb-3 text-xs">
                or click to browse (multiple allowed)
              </p>
              <label>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="mt-4 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {files.length} file{files.length !== 1 && 's'} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {formatFileSize(totalSize)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFiles}
                      disabled={isUploading}
                      className="h-7 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                </div>

                <div className="max-h-48 min-w-0 space-y-2 overflow-y-auto pr-1">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="bg-muted/50 flex min-w-0 items-center gap-3 rounded-lg border p-3"
                    >
                      <File className="text-primary h-8 w-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-medium"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatFileSize(file.size)}
                        </p>
                      </div>

                      {/* Status indicator */}
                      {uploadProgress[file.name] && (
                        <div className="shrink-0">
                          {uploadProgress[file.name] === 'uploading' && (
                            <Loader2 className="text-primary h-4 w-4 animate-spin" />
                          )}
                          {uploadProgress[file.name] === 'done' && (
                            <span className="text-xs text-green-500">✓</span>
                          )}
                          {uploadProgress[file.name] === 'error' && (
                            <span className="text-xs text-red-500">✗</span>
                          )}
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

            <Button
              className="mt-4 w-full"
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload{' '}
                  {files.length > 0
                    ? `${files.length} Video${files.length !== 1 ? 's' : ''}`
                    : 'Videos'}
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="path" className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Video File Path
                </label>
                <Input
                  placeholder="/path/to/your/video.mp4"
                  value={filePath}
                  onChange={(e) => {
                    setFilePath(e.target.value);
                    setError(null);
                  }}
                />
                <p className="text-muted-foreground mt-2 text-xs">
                  Enter the full path to a video file on the server
                </p>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <Button
                className="w-full"
                onClick={handleAddByPath}
                disabled={!filePath.trim() || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Video'
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
