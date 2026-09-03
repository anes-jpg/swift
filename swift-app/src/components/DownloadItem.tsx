import type { DownloadItem as DownloadItemType } from "../types";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  item: DownloadItemType;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

const statusIcons: Record<string, string> = {
  queued: "⏳",
  fetching: "🔍",
  downloading: "⬇️",
  converting: "🔄",
  completed: "✅",
  failed: "❌",
  paused: "⏸️",
};

export default function DownloadItemCard({
  item,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: Props) {
  const isActive = item.status === "downloading" || item.status === "converting";

  return (
    <div className={`download-item glass-panel ${item.status}`}>
      <img src={item.thumbnail} alt="" className="dl-thumb" />

      <div className="dl-info">
        <div className="dl-title">{item.title}</div>
        <div className="dl-meta">
          <span className="dl-status">
            {statusIcons[item.status]} {item.status}
          </span>
          {item.status === "downloading" && (
            <>
              <span className="dl-speed">{item.speed}</span>
              <span className="dl-eta">ETA {item.eta}</span>
            </>
          )}
          <span className="dl-size">
            {formatBytes(Math.round(item.filesize * item.progress / 100))} / {formatBytes(item.filesize)}
          </span>
        </div>

        <div className="dl-progress-track">
          <div
            className={`dl-progress-bar ${isActive ? "animated" : ""}`}
            style={{ width: `${item.progress}%` }}
          />
          <span className="dl-progress-text">{item.progress.toFixed(1)}%</span>
        </div>
      </div>

      <div className="dl-actions">
        {item.status === "downloading" && (
          <button className="dl-btn" onClick={onPause} title="Pause">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        )}
        {item.status === "paused" && (
          <button className="dl-btn" onClick={onResume} title="Resume">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
        {item.status === "completed" && (
          <>
            <button
              className="dl-btn success-btn"
              onClick={() => {
                if (item.output_path) {
                  invoke("open_file", { path: item.output_path });
                }
              }}
              title="Play Video/Audio"
              disabled={!item.output_path}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              className="dl-btn"
              onClick={() => {
                if (item.output_path) {
                  invoke("show_in_folder", { path: item.output_path });
                }
              }}
              title="Show in Folder"
              disabled={!item.output_path}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </>
        )}
        {item.status === "failed" && (
          <button className="dl-btn" onClick={onRetry} title="Retry">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        )}
        <button
          className="dl-btn danger"
          onClick={onCancel}
          title={item.status === "completed" ? "Dismiss" : "Cancel"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
