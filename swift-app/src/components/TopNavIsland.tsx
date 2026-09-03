import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { getSettings } from "../store/downloadStore";

interface TopNavIslandProps {
  currentTab: "downloads" | "library" | "settings";
  onSelectTab: (tab: "downloads" | "library" | "settings") => void;
  activeCount: number;
}

export default function TopNavIsland({
  currentTab,
  onSelectTab,
  activeCount,
}: TopNavIslandProps) {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const handleMinimize = () => {
    if (isTauri) getCurrentWindow().minimize();
  };

  const handleMaximize = () => {
    if (isTauri) getCurrentWindow().toggleMaximize();
  };

  const handleClose = () => {
    if (isTauri) getCurrentWindow().close();
  };

  const handleOpenFolder = async () => {
    if (!isTauri) return;
    const settings = getSettings();
    try {
      if (settings.downloadDir) {
        await invoke("open_file", { path: settings.downloadDir });
      } else {
        const dir = await invoke<string>("pick_directory");
        if (dir) invoke("open_file", { path: dir });
      }
    } catch {}
  };

  const handleFocusCommand = () => {
    onSelectTab("downloads");
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(".command-input");
      if (input) input.focus();
    }, 50);
  };

  return (
    <header className="ona-topbar" data-tauri-drag-region>
      {/* Far Left: Framed brand badge matching Ona's "[ona.]" */}
      <div className="topbar-left" data-tauri-drag-region>
        <div className="ona-brand-badge" data-tauri-drag-region>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" className="brand-bolt">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ef4444" />
          </svg>
          <span className="brand-name">swift.</span>
        </div>
      </div>

      {/* Absolute Centered: Exact Ona-style floating icon dock */}
      <div className="topbar-center" data-tauri-drag-region>
        <nav className="ona-icon-dock">
          {/* 1. Layers icon: Downloads / Queue */}
          <button
            type="button"
            className={`dock-icon-btn ${currentTab === "downloads" ? "active" : ""}`}
            onClick={() => onSelectTab("downloads")}
            title="Downloads Queue (Ctrl+1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="dock-svg">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            {activeCount > 0 && <span className="dock-dot" />}
          </button>

          {/* 2. Chat/Activity icon */}
          <button
            type="button"
            className="dock-icon-btn"
            onClick={() => onSelectTab("downloads")}
            title="Activity Feed"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="dock-svg">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
          </button>

          {/* Divider 1 */}
          <div className="dock-divider" />

          {/* 3. Command ⌘ icon */}
          <button
            type="button"
            className="dock-icon-btn"
            onClick={handleFocusCommand}
            title="Ingest URL (Ctrl+L)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="dock-svg">
              <path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z" />
            </svg>
          </button>

          {/* 4. Terminal >_ icon */}
          <button
            type="button"
            className="dock-icon-btn"
            onClick={() => onSelectTab("downloads")}
            title="yt-dlp Engine Console"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="dock-svg">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </button>

          {/* 5. Download ⤓ icon */}
          <button
            type="button"
            className="dock-icon-btn"
            onClick={handleOpenFolder}
            title="Open Downloads Folder"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="dock-svg">
              <path d="M12 3v12m0 0l4-4m-4 4l-4-4" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </button>

          {/* Divider 2 */}
          <div className="dock-divider" />

          {/* 6. Settings ⚙ icon */}
          <button
            type="button"
            className={`dock-icon-btn ${currentTab === "settings" ? "active" : ""}`}
            onClick={() => onSelectTab("settings")}
            title="Preferences (Ctrl+3)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="dock-svg">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>

          {/* 7. Media Library 👤 / Library icon */}
          <button
            type="button"
            className={`dock-icon-btn ${currentTab === "library" ? "active" : ""}`}
            onClick={() => onSelectTab("library")}
            title="Media Library (Ctrl+2)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="dock-svg">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </nav>
      </div>

      {/* Far Right: Native Window Controls */}
      <div className="topbar-right">
        <div className="window-controls">
          <button
            type="button"
            className="window-btn minimize"
            onClick={handleMinimize}
            title="Minimize"
          >
            <svg viewBox="0 0 12 12" width="10" height="10">
              <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button
            type="button"
            className="window-btn maximize"
            onClick={handleMaximize}
            title="Maximize"
          >
            <svg viewBox="0 0 12 12" width="10" height="10">
              <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button
            type="button"
            className="window-btn close"
            onClick={handleClose}
            title="Close"
          >
            <svg viewBox="0 0 12 12" width="10" height="10">
              <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
              <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
