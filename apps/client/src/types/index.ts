export type VideoStatus =
  | 'pending'
  | 'processing'
  | 'extracting_frames'
  | 'extracting_audio'
  | 'transcribing'
  | 'embedding'
  | 'completed'
  | 'failed';

export interface Video {
  id: string;
  filename: string;
  original_path: string;
  thumbnail_path: string | null;
  file_size: number | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  status: VideoStatus;
  error_message: string | null;
  frame_count: number;
  keyframe_count: number;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface VideoListResponse {
  videos: Video[];
  total: number;
  page: number;
  page_size: number;
}

export interface VideoUploadResponse {
  id: string;
  filename: string;
  status: VideoStatus;
  message: string;
}

export type SearchType = 'visual' | 'speech' | 'hybrid';

export interface SearchQuery {
  query: string;
  search_type: SearchType;
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  video_id: string;
  video_filename: string;
  timestamp: number;
  end_timestamp: number | null;
  score: number;
  result_type: 'visual' | 'speech';
  transcript_text: string | null;
  frame_path: string | null;
}

export interface SearchResponse {
  query: string;
  search_type: SearchType;
  results: SearchResult[];
  total_results: number;
}

export interface TranscriptSegment {
  text: string;
  start_time: number;
  end_time: number;
}

export interface TranscriptResponse {
  video_id: string;
  segments: TranscriptSegment[];
}
