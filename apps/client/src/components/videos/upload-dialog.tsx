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
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type.startsWith('video/')) {
      setFile(droppedFile);
    } else {
      setError('Please drop a video file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      await uploadVideo(file);
      setOpen(false);
      setFile(null);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
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

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Video</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="path">File Path</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Upload
                  className={cn(
                    'mb-4 h-10 w-10',
                    isDragging ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <p className="mb-2 text-sm font-medium">
                  Drag and drop your video here
                </p>
                <p className="text-muted-foreground mb-4 text-xs">
                  or click to browse
                </p>
                <label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
              </div>
            ) : (
              <div className="bg-muted/50 flex items-center gap-3 rounded-xl border p-4">
                <File className="text-primary h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

            <Button
              className="mt-4 w-full"
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Video
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
