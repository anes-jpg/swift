import { useSyncExternalStore } from "react";
import {
  getDownloads,
  subscribe,
  removeDownload,
  clearCompleted,
} from "../store/downloadStore";
import { invoke } from "@tauri-apps/api/core";
import DownloadItemCard from "./DownloadItem";

export default function DownloadQueue() {
  const downloads = useSyncExternalStore(subscribe, getDownloads);

  if (downloads.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth={2} opacity={0.3} />
            <path
              d="M40 24v20m0 0l-6-6m6 6l6-6M28 52h24"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3>No downloads yet</h3>
        <p>Paste a video URL above to get started</p>
      </div>
    );
  }

  const hasCompleted = downloads.some((d) => d.status === "completed");

  return (
    <div className="download-queue">
      <div className="queue-header">
        <h2>
          Downloads
          <span className="queue-count">{downloads.length}</span>
        </h2>
        {hasCompleted && (
          <button className="btn btn-ghost btn-sm" onClick={clearCompleted}>
            Clear completed
          </button>
        )}
      </div>

      <div className="queue-list">
        {downloads.map((item) => (
          <DownloadItemCard
            key={item.id}
            item={item}
            onPause={() => invoke("pause_download", { id: item.id })}
            onResume={() => invoke("resume_download", { id: item.id })}
            onCancel={() => {
              invoke("cancel_download", { id: item.id });
              removeDownload(item.id);
            }}
            onRetry={() => invoke("retry_download", { id: item.id })}
          />
        ))}
      </div>
    </div>
  );
}
