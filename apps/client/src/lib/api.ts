import type {
  Video,
  VideoListResponse,
  VideoUploadResponse,
  SearchQuery,
  SearchResponse,
  TranscriptResponse
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      error.detail || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

// Videos
export async function getVideos(
  page = 1,
  pageSize = 20
): Promise<VideoListResponse> {
  return fetchApi(`/videos?page=${page}&page_size=${pageSize}`);
}

export async function getVideo(id: string): Promise<Video> {
  return fetchApi(`/videos/${id}`);
}

export async function addVideoByPath(
  filePath: string
): Promise<VideoUploadResponse> {
  return fetchApi('/videos', {
    method: 'POST',
    body: JSON.stringify({ file_path: filePath })
  });
}

export async function uploadVideo(file: File): Promise<VideoUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/videos/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.detail || 'Upload failed');
  }

  return response.json();
}

export async function deleteVideo(id: string): Promise<void> {
  await fetchApi(`/videos/${id}`, { method: 'DELETE' });
}

// Search
export async function searchVideos(
  query: SearchQuery
): Promise<SearchResponse> {
  return fetchApi('/search', {
    method: 'POST',
    body: JSON.stringify(query)
  });
}

// Transcripts
export async function getVideoTranscript(
  videoId: string
): Promise<TranscriptResponse> {
  return fetchApi(`/search/video/${videoId}/transcript`);
}

// Frame URL helper
export function getFrameUrl(framePath: string): string {
  // Assuming frames are served statically or via an endpoint
  return `${API_BASE.replace('/api', '')}/frames/${framePath}`;
}
