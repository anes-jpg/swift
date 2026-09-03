import { getCurrentWindow } from "@tauri-apps/api/window";

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

  return (
    <header className="ona-topbar" data-tauri-drag-region>
      {/* Top Left: Ona-style rounded brand pill */}
      <div className="topbar-left" data-tauri-drag-region>
        <div className="brand-pill" data-tauri-drag-region>
          <span className="brand-dot" />
          <span className="brand-text">swift.</span>
        </div>
      </div>

      {/* Top Center: Floating glass nav island */}
      <div className="topbar-center" data-tauri-drag-region>
        <nav className="nav-island">
          {/* Downloads / Queue */}
          <button
            type="button"
            className={`nav-island-btn ${currentTab === "downloads" ? "active" : ""}`}
            onClick={() => onSelectTab("downloads")}
            title="Queue & Command Center (Ctrl+1)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M12 3v12m0 0l4-4m-4 4l-4-4" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            <span className="nav-island-label">Queue</span>
            {activeCount > 0 && <span className="nav-island-badge">{activeCount}</span>}
          </button>

          {/* Library / Media */}
          <button
            type="button"
            className={`nav-island-btn ${currentTab === "library" ? "active" : ""}`}
            onClick={() => onSelectTab("library")}
            title="Media Library (Ctrl+2)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="nav-island-label">Library</span>
          </button>

          <div className="nav-island-divider" />

          {/* Preferences */}
          <button
            type="button"
            className={`nav-island-btn ${currentTab === "settings" ? "active" : ""}`}
            onClick={() => onSelectTab("settings")}
            title="Preferences (Ctrl+3)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="nav-island-label">Settings</span>
          </button>
        </nav>
      </div>

      {/* Top Right: Windows Native Controls */}
      <div className="topbar-right">
        {isTauri && (
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
        )}
      </div>
    </header>
  );
}
