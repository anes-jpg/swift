import { useSyncExternalStore } from "react";
import {
  getDownloads,
  getHistory,
  getSettings,
  subscribe,
  updateSettings,
} from "../store/downloadStore";
import { invoke } from "@tauri-apps/api/core";

interface SidebarProps {
  currentTab: "downloads" | "library" | "settings";
  onSelectTab: (tab: "downloads" | "library" | "settings") => void;
  onFilterChange?: (query: string) => void;
}

export default function Sidebar({
  currentTab,
  onSelectTab,
}: SidebarProps) {
  const downloads = useSyncExternalStore(subscribe, getDownloads);
  const history = useSyncExternalStore(subscribe, getHistory);
  const settings = useSyncExternalStore(subscribe, getSettings);

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const activeDownloads = downloads.filter(
    (d) => d.status === "downloading" || d.status === "fetching" || d.status === "queued"
  );

  const openDownloadDir = async () => {
    if (!isTauri) return;
    try {
      if (settings.downloadDir) {
        await invoke("open_file", { path: settings.downloadDir });
      } else {
        const dir = await invoke<string>("pick_directory");
        if (dir) updateSettings({ downloadDir: dir });
      }
    } catch {}
  };

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#dc2626" />
          </svg>
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-app-name">Swift</span>
          <span className="sidebar-app-version">v1.2.0</span>
        </div>
      </div>

      {/* Primary Navigation Items */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-group">
          <div className="sidebar-section-header">WORKSPACE</div>

          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === "downloads" ? "active" : ""}`}
            onClick={() => onSelectTab("downloads")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="sidebar-icon">
              <path d="M12 3v12m0 0l4-4m-4 4l-4-4" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            <span className="sidebar-nav-label">Downloads</span>
            {activeDownloads.length > 0 && (
              <span className="sidebar-badge active-pulse">{activeDownloads.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === "library" ? "active" : ""}`}
            onClick={() => onSelectTab("library")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="sidebar-icon">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="sidebar-nav-label">Media Library</span>
            {history.length > 0 && (
              <span className="sidebar-badge">{history.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${currentTab === "settings" ? "active" : ""}`}
            onClick={() => onSelectTab("settings")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="sidebar-icon">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="sidebar-nav-label">Preferences</span>
          </button>
        </div>
      </nav>

      {/* Storage & Engine Status Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-engine-status">
          <span className="engine-dot ready" />
          <div className="engine-info">
            <span className="engine-name">yt-dlp + ffmpeg</span>
            <span className="engine-state">Engine Ready</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-folder-shortcut"
          onClick={openDownloadDir}
          title={settings.downloadDir || "Default System Downloads"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H9L7 3H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="folder-text">Open Downloads</span>
        </button>
      </div>
    </aside>
  );
}
