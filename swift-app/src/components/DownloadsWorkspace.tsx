import { useState, useSyncExternalStore } from "react";
import {
  getDownloads,
  getHistory,
  subscribe,
  addDownload,
  clearCompleted,
  updateDownload,
  getSettings,
  removeFromHistory,
} from "../store/downloadStore";
import DownloadItemCard from "./DownloadItem";
import type { VideoInfo, PlaylistInfo, VideoFormat } from "../types";
import { invoke } from "@tauri-apps/api/core";

interface DownloadsWorkspaceProps {
  onNavigateLibrary: () => void;
  searchFilter?: string;
  onVideoFetched?: (info: VideoInfo) => void;
  onPlaylistFetched?: (info: PlaylistInfo) => void;
}

export default function DownloadsWorkspace({
  onNavigateLibrary,
  searchFilter = "",
  onPlaylistFetched,
}: DownloadsWorkspaceProps) {
  const downloads = useSyncExternalStore(subscribe, getDownloads);
  const history = useSyncExternalStore(subscribe, getHistory);
  const settings = useSyncExternalStore(subscribe, getSettings);

  const [url, setUrl] = useState("");
  const [formatMode, setFormatMode] = useState<"video" | "audio">("video");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justPasted, setJustPasted] = useState(false);

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const activeDownloads = downloads.filter(
    (d) => d.status === "downloading" || d.status === "fetching" || d.status === "queued"
  );
  const completedDownloads = downloads.filter((d) => d.status === "completed");

  const filteredDownloads = downloads.filter((d) => {
    if (!searchFilter.trim()) return true;
    return (
      d.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.url.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  const recentHistory = history.slice(0, 6);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith("http")) {
        setUrl(text.trim());
        setJustPasted(true);
        setTimeout(() => setJustPasted(false), 1500);
      }
    } catch {}
  };

  const handleDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetUrl = url.trim();
    if (!targetUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      if (targetUrl.includes("playlist") || targetUrl.includes("&list=")) {
        const info = await invoke<PlaylistInfo>("fetch_playlist_info", { url: targetUrl });
        if (onPlaylistFetched) {
          onPlaylistFetched(info);
          setUrl("");
        }
      } else {
        const info = await invoke<VideoInfo>("fetch_video_info", { url: targetUrl });

        let chosenFormat: VideoFormat | undefined;
        if (formatMode === "audio") {
          chosenFormat = {
            format_id: "bestaudio",
            ext: "mp3",
            resolution: "Audio (320kbps)",
            filesize: null,
            vcodec: "none",
            acodec: "mp3",
            fps: 0,
            tbr: 320,
          };
        } else {
          chosenFormat = info.formats.find(
            (f) => f.format_id === "best" || f.vcodec !== "none"
          ) || {
            format_id: "best",
            ext: "mp4",
            resolution: "Best Available",
            filesize: null,
            vcodec: "auto",
            acodec: "auto",
            fps: 0,
            tbr: null,
          };
        }

        const downloadId = addDownload(info, chosenFormat);
        setUrl("");

        if (isTauri) {
          invoke("start_download", {
            id: downloadId,
            url: targetUrl,
            formatId: chosenFormat.format_id,
            downloadDir: settings.downloadDir || null,
            proxy: settings.proxy || null,
          }).catch((err: any) => {
            updateDownload(downloadId, {
              status: "failed",
              error: String(err),
            });
          });
        }
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelItem = (id: string) => {
    if (isTauri) {
      invoke("cancel_download", { id }).catch(() => {});
    }
    updateDownload(id, { status: "failed", error: "Cancelled by user" });
  };

  const handlePauseItem = (id: string) => {
    if (isTauri) {
      invoke("cancel_download", { id }).catch(() => {});
    }
    updateDownload(id, { status: "paused" });
  };

  const handleResumeItem = (item: any) => {
    updateDownload(item.id, { status: "downloading" });
    if (isTauri) {
      invoke("start_download", {
        id: item.id,
        url: item.url,
        formatId: item.format?.format_id || "best",
        downloadDir: settings.downloadDir || null,
        proxy: settings.proxy || null,
      }).catch((err: any) => {
        updateDownload(item.id, { status: "failed", error: String(err) });
      });
    }
  };

  const handlePlayMedia = (item: any) => {
    if (!isTauri || !item.output_path) return;
    invoke("open_file", { path: item.output_path }).catch(() => {});
  };

  const handleRevealMedia = (item: any) => {
    if (!isTauri || !item.output_path) return;
    invoke("show_item_in_folder", { path: item.output_path }).catch(() => {});
  };

  const openDownloadDir = async () => {
    if (!isTauri) return;
    try {
      if (settings.downloadDir) {
        await invoke("open_file", { path: settings.downloadDir });
      }
    } catch {}
  };

  return (
    <div className="workspace-container">
      {/* Native Command Bar Ingestion */}
      <section className="command-bar-card">
        <form className="command-bar-form" onSubmit={handleDownload}>
          <div className="command-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="command-icon">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>

            <input
              type="text"
              placeholder="Paste video or audio link (YouTube, TikTok, X, Twitch, Instagram...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="command-input"
              autoFocus
            />

            <button
              type="button"
              className={`command-btn-paste ${justPasted ? "pasted" : ""}`}
              onClick={handlePaste}
              title="Paste from clipboard (Ctrl+V)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" />
              </svg>
              <span>{justPasted ? "Pasted!" : "Paste"}</span>
            </button>

            <div className="command-format-toggle">
              <button
                type="button"
                className={`format-toggle-btn ${formatMode === "video" ? "selected" : ""}`}
                onClick={() => setFormatMode("video")}
              >
                MP4
              </button>
              <button
                type="button"
                className={`format-toggle-btn ${formatMode === "audio" ? "selected" : ""}`}
                onClick={() => setFormatMode("audio")}
              >
                MP3
              </button>
            </div>

            <button
              type="submit"
              className="command-submit-btn"
              disabled={!url.trim() || isLoading}
            >
              {isLoading ? (
                <span className="command-spinner" />
              ) : (
                <>
                  <span>Download</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        {error && <div className="command-error-row">{error}</div>}
      </section>

      {/* Desktop Status Strip */}
      <section className="desktop-status-strip">
        <div className="status-strip-item">
          <span className="status-label">Engine:</span>
          <span className="status-value active-tag">yt-dlp Ready</span>
        </div>

        <div className="status-strip-item">
          <span className="status-label">Active:</span>
          <span className="status-value">{activeDownloads.length}</span>
        </div>

        <div className="status-strip-item">
          <span className="status-label">Concurrency:</span>
          <span className="status-value">{settings.maxConcurrent} slots</span>
        </div>

        <div
          className="status-strip-item folder-item"
          onClick={openDownloadDir}
          title="Open Destination Folder"
        >
          <span className="status-label">Destination:</span>
          <span className="folder-val">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H9L7 3H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{settings.downloadDir || "Default Downloads"}</span>
          </span>
        </div>

        {completedDownloads.length > 0 && (
          <button
            type="button"
            className="btn-clear-completed"
            onClick={clearCompleted}
          >
            Clear Finished
          </button>
        )}
      </section>

      {/* Active Queue Section */}
      {filteredDownloads.length > 0 && (
        <section className="desktop-queue-section">
          <div className="section-header-row">
            <div className="section-header-left">
              <h3>Active Ingestion Queue</h3>
              <span className="section-count">{filteredDownloads.length}</span>
            </div>
          </div>

          <div className="queue-items-list">
            {filteredDownloads.map((item) => (
              <DownloadItemCard
                key={item.id}
                item={item}
                onPause={() => handlePauseItem(item.id)}
                onResume={() => handleResumeItem(item)}
                onCancel={() => handleCancelItem(item.id)}
                onRetry={() => handleResumeItem(item)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Downloads Shelf */}
      {recentHistory.length > 0 && (
        <section className="recent-shelf-section">
          <div className="section-header-row">
            <div className="section-header-left">
              <h3>Recent Downloads</h3>
              <span className="section-count">{recentHistory.length}</span>
            </div>
            <button
              type="button"
              className="shelf-view-all-btn"
              onClick={onNavigateLibrary}
            >
              View Library →
            </button>
          </div>

          <div className="recent-grid">
            {recentHistory.map((item) => (
              <div key={item.id} className="recent-card">
                <div className="recent-card-thumb-wrap">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="recent-card-thumb" />
                  ) : (
                    <div className="recent-card-thumb-fallback">
                      <span>{item.ext.toUpperCase()}</span>
                    </div>
                  )}
                  <span className="recent-card-ext-badge">{item.ext.toUpperCase()}</span>
                </div>

                <div className="recent-card-meta">
                  <h5 className="recent-card-title" title={item.title}>
                    {item.title}
                  </h5>
                  <div className="recent-card-sub">
                    <span>{item.resolution}</span>
                    {(item.filesize ?? 0) > 0 && (
                      <>
                        <span>•</span>
                        <span>{((item.filesize ?? 0) / 1048576).toFixed(1)} MB</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="recent-card-actions">
                  {item.output_path && (
                    <>
                      <button
                        type="button"
                        className="recent-action-icon-btn"
                        onClick={() => handlePlayMedia(item)}
                        title="Play"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="recent-action-icon-btn"
                        onClick={() => handleRevealMedia(item)}
                        title="Show in folder"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H9L7 3H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="recent-action-icon-btn delete"
                    onClick={() => removeFromHistory(item.id)}
                    title="Remove from history"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {downloads.length === 0 && recentHistory.length === 0 && (
        <section className="desktop-empty-state">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 3v12m0 0l4-4m-4 4l-4-4" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </div>
          <h4>No Active Downloads</h4>
          <p>Paste a video or playlist URL above to begin downloading.</p>
          <button type="button" className="empty-paste-btn" onClick={handlePaste}>
            Paste URL from Clipboard (Ctrl+V)
          </button>
        </section>
      )}
    </div>
  );
}
