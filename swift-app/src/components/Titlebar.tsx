import SwiftLogo from "./SwiftLogo";

export default function Titlebar() {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const handleMinimize = async () => {
    if (!isTauri) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      getCurrentWindow().minimize();
    } catch {}
  };

  const handleToggleMaximize = async () => {
    if (!isTauri) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      getCurrentWindow().toggleMaximize();
    } catch {}
  };

  const handleClose = async () => {
    if (!isTauri) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      getCurrentWindow().close();
    } catch {}
  };

  return (
    <div data-tauri-drag-region className="titlebar">
      <div className="titlebar-left" data-tauri-drag-region>
        <div className="titlebar-logo">
          <SwiftLogo width={20} height={20} />
        </div>
        <span className="titlebar-title" data-tauri-drag-region>Swift</span>
      </div>

      <div className="titlebar-controls">
        <button
          className="titlebar-btn minimize"
          onClick={handleMinimize}
          title="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="5.5" width="8" height="1" fill="currentColor" rx="0.5" />
          </svg>
        </button>
        <button
          className="titlebar-btn maximize"
          onClick={handleToggleMaximize}
          title="Maximize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.2" rx="1" />
          </svg>
        </button>
        <button
          className="titlebar-btn close"
          onClick={handleClose}
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
