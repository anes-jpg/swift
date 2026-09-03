import type { DownloadItem, VideoInfo, VideoFormat, AppSettings, HistoryItem } from "../types";

type Listener = () => void;

const listeners = new Set<Listener>();

const DEFAULT_SETTINGS: AppSettings = {
  downloadDir: "",
  proxy: "",
  maxConcurrent: 3,
  noLogMode: false,
  defaultFormat: "best_video",
  glassOpacity: 0.12,
  theme: "midnight",
  gradientPreset: "midnight",
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem("swift_settings");
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem("swift_settings", JSON.stringify(s));
  } catch {}
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem("swift_history");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function saveHistory(h: HistoryItem[]) {
  try {
    localStorage.setItem("swift_history", JSON.stringify(h));
  } catch {}
}

export function applyThemeAndGlass(s: AppSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Pure Black & Red Theme
  root.style.setProperty("--bg-primary", "#050505");
  root.style.setProperty("--accent", "#dc2626");
  root.style.setProperty("--accent-glow", "rgba(220, 38, 38, 0.45)");
  root.style.setProperty("--accent-hover", "#ef4444");

  const opacity = s.glassOpacity ?? 0.12;
  root.style.setProperty("--bg-glass", `rgba(255, 255, 255, ${opacity})`);
  root.style.setProperty(
    "--bg-glass-hover",
    `rgba(255, 255, 255, ${Math.min(0.4, opacity + 0.04)})`
  );
  root.style.setProperty(
    "--bg-glass-active",
    `rgba(255, 255, 255, ${Math.min(0.5, opacity + 0.08)})`
  );
  root.style.setProperty(
    "--border-glass",
    `rgba(255, 255, 255, ${Math.min(0.25, opacity * 0.7)})`
  );
}

let downloads: DownloadItem[] = [];
let settings: AppSettings = loadSettings();
let history: HistoryItem[] = loadHistory();

// Initialize styles immediately
applyThemeAndGlass(settings);

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDownloads(): DownloadItem[] {
  return downloads;
}

export function getHistory(): HistoryItem[] {
  return history;
}

export function getSettings(): AppSettings {
  return settings;
}

export function updateSettings(newSettings: Partial<AppSettings>) {
  settings = { ...settings, ...newSettings };
  saveSettings(settings);
  applyThemeAndGlass(settings);
  emitChange();
}

export function addDownload(video: VideoInfo, format: VideoFormat): string {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const newItem: DownloadItem = {
    id,
    title: video.title,
    thumbnail: video.thumbnail,
    url: video.url,
    format: `${format.resolution} (${format.ext})`,
    progress: 0,
    status: "queued",
    speed: "0 B/s",
    eta: "--:--",
    filesize: format.filesize || 0,
  };

  downloads = [newItem, ...downloads];
  emitChange();
  return id;
}

export function updateDownload(id: string, updates: Partial<DownloadItem>) {
  let itemCompleted: DownloadItem | null = null;
  let found = false;

  downloads = downloads.map((item) => {
    if (item.id === id) {
      found = true;
      const updated = { ...item, ...updates };
      if (updates.status === "completed" && item.status !== "completed") {
        itemCompleted = updated;
      }
      return updated;
    }
    return item;
  });

  if (!found) {
    const newItem: DownloadItem = {
      id,
      title: updates.title || "Video Download",
      thumbnail: updates.thumbnail || "",
      url: updates.url || "",
      format: updates.format || "MP4 (Best)",
      progress: updates.progress ?? 0,
      status: updates.status || "downloading",
      speed: updates.speed || "0 B/s",
      eta: updates.eta || "--:--",
      filesize: updates.filesize || 0,
      output_path: updates.output_path || "",
    };
    downloads = [newItem, ...downloads];
  }

  if (itemCompleted && !settings.noLogMode) {
    const item = itemCompleted as DownloadItem;
    const historyItem: HistoryItem = {
      id: item.id,
      url: item.url,
      title: item.title,
      thumbnail: item.thumbnail,
      resolution: item.format,
      ext: item.format.includes("mp3") || item.format.includes("audio") ? "mp3" : "mp4",
      filesize: item.filesize,
      output_path: item.output_path || "",
      completed_at: Date.now(),
    };
    history = [historyItem, ...history.filter((h) => h.id !== item.id)];
    saveHistory(history);
  }

  emitChange();
}

export function removeDownload(id: string) {
  downloads = downloads.filter((item) => item.id !== id);
  emitChange();
}

export function clearCompleted() {
  downloads = downloads.filter((item) => item.status !== "completed");
  emitChange();
}

export function removeFromHistory(id: string) {
  history = history.filter((item) => item.id !== id);
  saveHistory(history);
  emitChange();
}

export function clearHistory() {
  history = [];
  saveHistory(history);
  emitChange();
}
