export interface VideoInfo {
  url: string;
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  upload_date: string;
  formats: VideoFormat[];
}

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  fps: number;
  filesize: number | null;
  vcodec: string;
  acodec: string;
  quality: number;
  url: string;
}

export interface PlaylistInfo {
  title: string;
  uploader: string;
  count: number;
  entries: PlaylistEntry[];
}

export interface PlaylistEntry {
  url: string;
  title: string;
  thumbnail: string;
  duration: number;
  index: number;
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  format: VideoFormat;
  status: DownloadStatus;
  progress: number;
  speed: string;
  eta: string;
  filesize: number;
  downloaded: number;
  output_path: string;
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
  theme: "dark" | "light" | "midnight";
  glassOpacity: number;
  gradientPreset: string;
  proxy: string;
  maxConcurrent: number;
  noLogMode: boolean;
}

export interface GradientPreset {
  name: string;
  colors: string[];
  speed: number;
}
