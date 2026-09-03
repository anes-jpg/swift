export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize: number | null;
  vcodec: string;
  acodec: string;
  fps: number;
  tbr: number | null;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  url: string;
  formats: VideoFormat[];
}

export interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnail: string;
  index?: number;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  uploader: string;
  entries: PlaylistEntry[];
  total_count: number;
  count?: number;
}

export interface DownloadItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  format: string;
  progress: number;
  status: DownloadStatus;
  speed: string;
  eta: string;
  filesize: number;
  error?: string;
  output_path?: string;
}

export type DownloadStatus =
  | "queued"
  | "fetching"
  | "downloading"
  | "converting"
  | "completed"
  | "failed"
  | "paused";

export interface AppSettings {
  downloadDir: string;
  proxy: string;
  maxConcurrent: number;
  noLogMode: boolean;
  defaultFormat: "best_video" | "best_audio";
  glassOpacity?: number;
  theme?: string;
  gradientPreset?: string;
}

export interface GradientPreset {
  name: string;
  label: string;
  colors: string[];
  speed: number;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  resolution: string;
  ext: string;
  duration?: number;
  filesize?: number;
  output_path: string;
  completed_at: number;
}
