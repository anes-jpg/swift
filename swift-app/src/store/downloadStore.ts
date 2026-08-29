import type { DownloadItem, VideoInfo, VideoFormat, AppSettings } from "../types";

type Listener = () => void;

const listeners = new Set<Listener>();

let downloads: DownloadItem[] = [];
let settings: AppSettings = {
  downloadDir: "",
  theme: "midnight",
  glassOpacity: 0.15,
  gradientPreset: "aurora",
  proxy: "",
  maxConcurrent: 3,
  noLogMode: false,
};

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function getDownloads() {
  return downloads;
}

export function getSettings() {
  return settings;
}

export function addDownload(info: VideoInfo, format: VideoFormat) {
  const item: DownloadItem = {
    id: crypto.randomUUID(),
    url: info.url,
    title: info.title,
    thumbnail: info.thumbnail,
    format,
    status: "queued",
    progress: 0,
    speed: "0 B/s",
    eta: "--:--",
    filesize: format.filesize ?? 0,
    downloaded: 0,
    output_path: "",
  };
  downloads = [...downloads, item];
  notify();
  return item.id;
}

export function updateDownload(id: string, updates: Partial<DownloadItem>) {
  const existing = downloads.find((d) => d.id === id);
  if (existing) {
    downloads = downloads.map((d) => (d.id === id ? { ...d, ...updates } : d));
  } else {
    const newItem: DownloadItem = {
      id,
      url: updates.url || "",
      title: updates.title || "Downloading...",
      thumbnail: updates.thumbnail || "",
      format: updates.format || { format_id: "best", ext: "mp4", resolution: "best", fps: 0, filesize: null, vcodec: "", acodec: "", quality: 0, url: "" },
      status: updates.status || "queued",
      progress: updates.progress || 0,
      speed: updates.speed || "0 B/s",
      eta: updates.eta || "--:--",
      filesize: updates.filesize || 0,
      downloaded: updates.downloaded || 0,
      output_path: updates.output_path || "",
    };
    downloads = [...downloads, newItem];
  }
  notify();
}

export function removeDownload(id: string) {
  downloads = downloads.filter((d) => d.id !== id);
  notify();
}

export function clearCompleted() {
  downloads = downloads.filter((d) => d.status !== "completed");
  notify();
}

export function updateSettings(updates: Partial<AppSettings>) {
  settings = { ...settings, ...updates };
  notify();
}
