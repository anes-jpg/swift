import { getCurrentWindow } from "@tauri-apps/api/window";
import SwiftLogo from "./SwiftLogo";

const appWindow = getCurrentWindow();

export default function Titlebar() {
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
          onClick={() => appWindow.minimize()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="5.5" width="8" height="1" fill="currentColor" rx="0.5" />
          </svg>
        </button>
        <button
          className="titlebar-btn maximize"
          onClick={() => appWindow.toggleMaximize()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.2" rx="1" />
          </svg>
        </button>
        <button
          className="titlebar-btn close"
          onClick={() => appWindow.close()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
