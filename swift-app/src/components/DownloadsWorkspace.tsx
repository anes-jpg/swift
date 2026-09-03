import { useState, useRef, useCallback, useSyncExternalStore } from "react";
import {
  getSettings,
  updateSettings,
  getDownloads,
  getHistory,
  subscribe,
  removeDownload,
  clearCompleted,
} from "../store/downloadStore";
import { invoke } from "@tauri-apps/api/core";
import DownloadItemCard from "./DownloadItem";
import type { VideoInfo, PlaylistInfo } from "../types";

interface Props {
  onVideoFetched: (info: VideoInfo) => void;
  onPlaylistFetched: (info: PlaylistInfo) => void;
  onNavigateTab: (tab: "downloads" | "library" | "settings") => void;
}

function isPlaylistUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("playlist?list=") ||
    lower.includes("&list=") ||
    lower.includes("/playlist/") ||
    lower.includes("mix=")
  );
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export default function DownloadsWorkspace({
  onVideoFetched,
  onPlaylistFetched,
  onNavigateTab,
}: Props) {
  const settings = useSyncExternalStore(subscribe, getSettings);
  const downloads = useSyncExternalStore(subscribe, getDownloads);
  const history = useSyncExternalStore(subscribe, getHistory);

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pasted, setPasted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const handleSubmit = useCallback(
    async (overrideUrl?: string) => {
      const targetUrl = (overrideUrl || url).trim();
      if (!targetUrl) return;

      setLoading(true);
      setError("");

      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error("Request timed out. Please check network or URL.")
              ),
            30000
          )
        );

        if (isPlaylistUrl(targetUrl)) {
          const info = await Promise.race([
            invoke<PlaylistInfo>("fetch_playlist_info", { url: targetUrl }),
            timeout,
          ]);
          onPlaylistFetched(info);
        } else {
          const info = await Promise.race([
            invoke<VideoInfo>("fetch_video_info", { url: targetUrl }),
            timeout,
          ]);
          onVideoFetched(info);
        }
        setUrl("");
      } catch (err: any) {
        setError(err?.toString() ?? "Failed to fetch stream");
      } finally {
        setLoading(false);
      }
    },
    [url, onVideoFetched, onPlaylistFetched]
  );

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && /https?:\/\//.test(text.trim())) {
        const cleaned = text.trim();
        setUrl(cleaned);
        setPasted(true);
        setTimeout(() => setPasted(false), 1200);
        handleSubmit(cleaned);
      } else {
        setError("Clipboard does not contain a valid URL");
        setTimeout(() => setError(""), 3000);
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  const openFolder = async () => {
    if (!isTauri) return;
    try {
      if (settings.downloadDir) {
        await invoke("open_file", { path: settings.downloadDir });
      } else {
        const dir = await invoke<string>("pick_directory");
        if (dir) {
          updateSettings({ downloadDir: dir });
          await invoke("open_file", { path: dir });
        }
      }
    } catch {}
  };

  const activeDownloads = downloads.filter(
    (d) => d.status === "downloading" || d.status === "converting"
  );
  const completedDownloads = downloads.filter((d) => d.status === "completed");
  const recentItems = history.slice(0, 3);

  return (
    <div className="workspace-container">
      {/* ── Native Command Bar Ingestion ── */}
      <section className="command-bar-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="command-bar-form"
        >
          <div className="command-input-wrapper">
            <svg
              className="command-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste or type URL (YouTube, Twitter/X, TikTok, Instagram, Vimeo)..."
              className="command-input"
              disabled={loading}
              autoFocus
            />

            <button
              type="button"
              className={`command-btn-paste ${pasted ? "pasted" : ""}`}
              onClick={handlePaste}
              title="Paste from Clipboard"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              <span>{pasted ? "Pasted" : "Paste"}</span>
            </button>

            {/* Format toggle inline */}
            <div className="command-format-toggle">
              <button
                type="button"
                className={`format-toggle-btn ${
                  settings.defaultFormat === "best_video" ? "selected" : ""
                }`}
                onClick={() => updateSettings({ defaultFormat: "best_video" })}
                title="Download Best Video (MP4)"
              >
                MP4
              </button>
              <button
                type="button"
                className={`format-toggle-btn ${
                  settings.defaultFormat === "best_audio" ? "selected" : ""
                }`}
                onClick={() => updateSettings({ defaultFormat: "best_audio" })}
                title="Extract Audio (MP3)"
              >
                MP3
              </button>
            </div>

            <button
              type="submit"
              className="command-submit-btn"
              disabled={loading || !url.trim()}
            >
              {loading ? (
                <div className="command-spinner" />
              ) : (
                <>
                  <span>Download</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        {error && <div className="command-error-row">{error}</div>}
      </section>

      {/* ── Native Telemetry Bar ── */}
      <div className="desktop-status-strip">
        <div className="status-strip-item">
          <span className="status-label">Active Transfers:</span>
          <span className="status-value">
            {activeDownloads.length > 0 ? (
              <span className="active-tag">{activeDownloads.length} active</span>
            ) : (
              "Idle"
            )}
          </span>
        </div>

        <div className="status-strip-item">
          <span className="status-label">Concurrency:</span>
          <span className="status-value">{settings.maxConcurrent} slots</span>
        </div>

        <div className="status-strip-item folder-item" onClick={openFolder} title="Click to open download folder">
          <span className="status-label">Destination:</span>
          <span className="status-value folder-val">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            {settings.downloadDir ? settings.downloadDir : "System Downloads"}
          </span>
        </div>
      </div>

      {/* ── Active Downloads Queue ── */}
      <section className="desktop-queue-section">
        <div className="section-header-row">
          <div className="section-header-left">
            <h3>Queue</h3>
            <span className="section-count">{downloads.length}</span>
          </div>

          {completedDownloads.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearCompleted}
            >
              Clear Completed ({completedDownloads.length})
            </button>
          )}
        </div>

        {downloads.length === 0 ? (
          <div className="desktop-empty-state">
            <div className="empty-symbol">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h4>No active downloads</h4>
            <p>Paste any URL above or press Ctrl+V to start downloading</p>
          </div>
        ) : (
          <div className="desktop-queue-list">
            {downloads.map((item) => (
              <DownloadItemCard
                key={item.id}
                item={item}
                onPause={() => {
                  if (isTauri) invoke("pause_download", { id: item.id });
                }}
                onResume={() => {
                  if (isTauri) invoke("resume_download", { id: item.id });
                }}
                onCancel={() => {
                  if (isTauri) invoke("cancel_download", { id: item.id });
                  removeDownload(item.id);
                }}
                onRetry={() => {
                  if (isTauri) invoke("retry_download", { id: item.id });
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Media Shelf ── */}
      {recentItems.length > 0 && (
        <section className="desktop-recent-shelf">
          <div className="section-header-row">
            <div className="section-header-left">
              <h3>Recently Completed</h3>
              <span className="section-count">{history.length}</span>
            </div>
            <button
              type="button"
              className="shelf-all-btn"
              onClick={() => onNavigateTab("library")}
            >
              Open Library →
            </button>
          </div>

          <div className="desktop-recent-grid">
            {recentItems.map((item) => (
              <div key={item.id} className="desktop-recent-card">
                <div
                  className="recent-card-thumb-wrap"
                  onClick={() => {
                    if (item.output_path && isTauri) {
                      invoke("open_file", { path: item.output_path });
                    }
                  }}
                  title="Click to play"
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="recent-card-thumb" />
                  ) : (
                    <div className="recent-thumb-fallback">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="recent-card-play-overlay">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                <div className="recent-card-details">
                  <span className="recent-card-title" title={item.title}>
                    {item.title}
                  </span>
                  <div className="recent-card-meta">
                    <span className="recent-tag ext">{item.ext.toUpperCase()}</span>
                    <span className="recent-tag size">{formatBytes(item.filesize)}</span>
                    {item.resolution && (
                      <span className="recent-tag res">{item.resolution}</span>
                    )}
                  </div>
                </div>

                <div className="recent-card-actions">
                  <button
                    type="button"
                    className="recent-action-icon"
                    onClick={() => {
                      if (item.output_path && isTauri) {
                        invoke("open_file", { path: item.output_path });
                      }
                    }}
                    title="Play Media"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="recent-action-icon"
                    onClick={() => {
                      if (item.output_path && isTauri) {
                        invoke("show_in_folder", { path: item.output_path });
                      }
                    }}
                    title="Show in Explorer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
