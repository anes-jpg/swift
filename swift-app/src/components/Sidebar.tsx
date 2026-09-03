import { useState, useEffect, useSyncExternalStore } from "react";
import {
  getDownloads,
  getHistory,
  getSettings,
  subscribe,
} from "../store/downloadStore";
import { invoke } from "@tauri-apps/api/core";
import SwiftLogo from "./SwiftLogo";

interface Props {
  activeTab: "downloads" | "library" | "settings";
  onTabChange: (tab: "downloads" | "library" | "settings") => void;
}

export default function Sidebar({ activeTab, onTabChange }: Props) {
  const downloads = useSyncExternalStore(subscribe, getDownloads);
  const history = useSyncExternalStore(subscribe, getHistory);
  const settings = useSyncExternalStore(subscribe, getSettings);

  const [engineReady, setEngineReady] = useState(true);
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const activeCount = downloads.filter(
    (d) => d.status === "downloading" || d.status === "converting"
  ).length;

  useEffect(() => {
    if (!isTauri) return;
    invoke<{ ytdlp: boolean; ffmpeg: boolean }>("check_dependencies")
      .then((res) => {
        setEngineReady(res.ytdlp && res.ffmpeg);
      })
      .catch(() => setEngineReady(true));
  }, [isTauri]);

  const openFolder = async () => {
    if (!isTauri) return;
    try {
      if (settings.downloadDir) {
        await invoke("open_file", { path: settings.downloadDir });
      } else {
        const dir = await invoke<string>("pick_directory");
        if (dir) {
          await invoke("open_file", { path: dir });
        }
      }
    } catch {}
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand" data-tauri-drag-region>
        <div className="sidebar-logo">
          <SwiftLogo width={22} height={22} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-app-name">Swift</span>
          <span className="sidebar-app-version">v1.2</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-group">
          <span className="sidebar-section-header">Workspace</span>
          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === "downloads" ? "active" : ""}`}
            onClick={() => onTabChange("downloads")}
          >
            <svg
              className="sidebar-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="sidebar-nav-label">Downloads</span>
            {activeCount > 0 && (
              <span className="sidebar-badge active-pulse">{activeCount}</span>
            )}
            {activeCount === 0 && downloads.length > 0 && (
              <span className="sidebar-badge">{downloads.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === "library" ? "active" : ""}`}
            onClick={() => onTabChange("library")}
          >
            <svg
              className="sidebar-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span className="sidebar-nav-label">Library</span>
            {history.length > 0 && (
              <span className="sidebar-badge">{history.length}</span>
            )}
          </button>
        </div>

        <div className="sidebar-nav-group">
          <span className="sidebar-section-header">System</span>
          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => onTabChange("settings")}
          >
            <svg
              className="sidebar-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="sidebar-nav-label">Preferences</span>
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-engine-status">
          <span className={`engine-dot ${engineReady ? "ready" : "offline"}`} />
          <div className="engine-info">
            <span className="engine-name">Engine: yt-dlp + ffmpeg</span>
            <span className="engine-state">{engineReady ? "Ready" : "Degraded"}</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-folder-shortcut"
          onClick={openFolder}
          title={settings.downloadDir || "Open Default Downloads"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="folder-text">
            {settings.downloadDir ? settings.downloadDir.split("\\").pop() || "Downloads" : "Downloads"}
          </span>
        </button>
      </div>
    </aside>
  );
}
