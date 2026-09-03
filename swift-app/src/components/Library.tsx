import { useState, useMemo } from "react";
import { useSyncExternalStore } from "react";
import {
  getHistory,
  subscribe,
  removeFromHistory,
  clearHistory,
} from "../store/downloadStore";
import type { HistoryItem } from "../types";
import { invoke } from "@tauri-apps/api/core";

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Library() {
  const history = useSyncExternalStore(subscribe, getHistory);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "video" | "audio">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const totalBytes = useMemo(() => {
    return history.reduce((sum, item) => sum + (item.filesize || 0), 0);
  }, [history]);

  const { videoCount, audioCount } = useMemo(() => {
    let v = 0;
    let a = 0;
    for (const item of history) {
      const isAudio =
        item.resolution?.toLowerCase().includes("audio") ||
        item.ext?.toLowerCase() === "mp3" ||
        item.ext?.toLowerCase() === "m4a";
      if (isAudio) a++;
      else v++;
    }
    return { videoCount: v, audioCount: a };
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.output_path.toLowerCase().includes(search.toLowerCase());

      const isAudio =
        item.resolution?.toLowerCase().includes("audio") ||
        item.ext?.toLowerCase() === "mp3" ||
        item.ext?.toLowerCase() === "m4a";

      const matchesType =
        filter === "all" ||
        (filter === "audio" && isAudio) ||
        (filter === "video" && !isAudio);

      return matchesSearch && matchesType;
    });
  }, [history, search, filter]);

  const handleOpenFile = async (item: HistoryItem) => {
    if (!item.output_path || !isTauri) return;
    try {
      await invoke("open_file", { path: item.output_path });
    } catch {}
  };

  const handleShowInFolder = async (item: HistoryItem) => {
    if (!item.output_path || !isTauri) return;
    try {
      await invoke("show_in_folder", { path: item.output_path });
    } catch {}
  };

  const handleDelete = async (item: HistoryItem, deleteFileDisk: boolean) => {
    if (deleteFileDisk && item.output_path && isTauri) {
      try {
        await invoke("delete_file", { path: item.output_path });
      } catch {}
    }
    removeFromHistory(item.id);
    setDeleteConfirm(null);
  };

  return (
    <div className="workspace-container library-view">
      {/* ── Desktop Library Header & Toolbar ── */}
      <div className="workspace-header library-header-row">
        <div>
          <h2>Media Library</h2>
          <span className="workspace-header-sub">
            {history.length} items &bull; {formatBytes(totalBytes)} stored
          </span>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={clearHistory}
          >
            Clear History
          </button>
        )}
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="desktop-library-toolbar">
        <div className="library-search-wrap">
          <svg
            className="library-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search downloads by title or destination path..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="library-search-field"
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch("")}>
              &times;
            </button>
          )}
        </div>

        <div className="desktop-filter-chips">
          <button
            type="button"
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({history.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === "video" ? "active" : ""}`}
            onClick={() => setFilter("video")}
          >
            Videos ({videoCount})
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === "audio" ? "active" : ""}`}
            onClick={() => setFilter("audio")}
          >
            Audio ({audioCount})
          </button>
        </div>
      </div>

      {/* ── Media Items Grid ── */}
      {filteredHistory.length === 0 ? (
        <div className="desktop-empty-state">
          <div className="empty-symbol">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h4>{history.length === 0 ? "No media in library" : "No results match your search"}</h4>
          <p>
            {history.length === 0
              ? "Completed downloads will be automatically cataloged here"
              : "Try searching with a different keyword or resetting filters"}
          </p>
        </div>
      ) : (
        <div className="desktop-media-grid">
          {filteredHistory.map((item) => {
            const isDeleting = deleteConfirm === item.id;
            return (
              <div key={item.id} className="desktop-media-card">
                <div
                  className="media-thumb-box"
                  onClick={() => handleOpenFile(item)}
                  title="Click to play"
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="media-thumb-img" />
                  ) : (
                    <div className="media-thumb-fallback">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}

                  <div className="media-play-hover-chip">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>

                  <div className="media-badge-strip">
                    {item.resolution && (
                      <span className="media-tag res">{item.resolution}</span>
                    )}
                    <span className="media-tag ext">{item.ext.toUpperCase()}</span>
                  </div>
                </div>

                <div className="media-card-content">
                  <div className="media-card-title" title={item.title}>
                    {item.title}
                  </div>

                  <div className="media-card-sub">
                    <span>{formatBytes(item.filesize)}</span>
                    <span className="bullet">&bull;</span>
                    <span>{formatDate(item.completed_at)}</span>
                  </div>

                  <div className="media-card-footer">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm media-action-btn"
                      onClick={() => handleOpenFile(item)}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm media-action-btn"
                      onClick={() => handleShowInFolder(item)}
                      title="Reveal in Explorer"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      Folder
                    </button>

                    <button
                      type="button"
                      className="media-delete-btn"
                      onClick={() => setDeleteConfirm(isDeleting ? null : item.id)}
                      title="Delete record or file"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>

                  {isDeleting && (
                    <div className="media-delete-dialog">
                      <p>Delete media record?</p>
                      <div className="delete-dialog-buttons">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleDelete(item, false)}
                        >
                          Remove from List
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => handleDelete(item, true)}
                        >
                          Delete File
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
