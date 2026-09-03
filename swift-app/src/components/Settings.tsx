import { useState, useSyncExternalStore } from "react";
import {
  getSettings,
  subscribe,
  updateSettings,
  clearHistory,
  getHistory,
} from "../store/downloadStore";
import { invoke } from "@tauri-apps/api/core";

export default function Settings() {
  const settings = useSyncExternalStore(subscribe, getSettings);
  const history = useSyncExternalStore(subscribe, getHistory);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const pickDir = async () => {
    if (!isTauri) return;
    try {
      const dir = await invoke<string>("pick_directory");
      if (dir) updateSettings({ downloadDir: dir });
    } catch {}
  };

  const openDownloadDir = async () => {
    if (!isTauri) return;
    try {
      if (settings.downloadDir) {
        await invoke("open_file", { path: settings.downloadDir });
      } else {
        await pickDir();
      }
    } catch {}
  };

  return (
    <div className="workspace-container preferences-view">
      <div className="workspace-header">
        <h2>Preferences</h2>
        <span className="workspace-header-sub">Configure engine, storage, and privacy</span>
      </div>

      <div className="preferences-grid">
        {/* Section 1: General & Storage */}
        <section className="pref-section">
          <div className="pref-section-title">General & Storage</div>

          <div className="pref-row">
            <div className="pref-label-col">
              <span className="pref-label">Download Location</span>
              <span className="pref-desc">Folder where new media files will be saved</span>
            </div>
            <div className="pref-control-col">
              <div className="pref-input-group">
                <input
                  type="text"
                  value={settings.downloadDir || ""}
                  placeholder="Default System Downloads"
                  readOnly
                  className="pref-text-input"
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={pickDir}>
                  Browse
                </button>
                {settings.downloadDir && (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={openDownloadDir}
                      title="Open in Explorer"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => updateSettings({ downloadDir: "" })}
                      title="Reset to default system Downloads folder"
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pref-row">
            <div className="pref-label-col">
              <span className="pref-label">Default Format</span>
              <span className="pref-desc">Preferred stream to select automatically</span>
            </div>
            <div className="pref-control-col">
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${
                    settings.defaultFormat === "best_video" ? "active" : ""
                  }`}
                  onClick={() => updateSettings({ defaultFormat: "best_video" })}
                >
                  Best Video (MP4)
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${
                    settings.defaultFormat === "best_audio" ? "active" : ""
                  }`}
                  onClick={() => updateSettings({ defaultFormat: "best_audio" })}
                >
                  Best Audio (MP3)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Engine & Network */}
        <section className="pref-section">
          <div className="pref-section-title">Engine & Network</div>

          <div className="pref-row">
            <div className="pref-label-col">
              <span className="pref-label">Max Concurrent Transfers</span>
              <span className="pref-desc">Maximum parallel active download threads</span>
            </div>
            <div className="pref-control-col">
              <div className="slider-control-group">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={settings.maxConcurrent}
                  onChange={(e) =>
                    updateSettings({ maxConcurrent: Number(e.target.value) })
                  }
                  className="pref-slider"
                />
                <span className="pref-slider-value">{settings.maxConcurrent} slots</span>
              </div>
            </div>
          </div>

          <div className="pref-row">
            <div className="pref-label-col">
              <span className="pref-label">Proxy Tunnel</span>
              <span className="pref-desc">Optional proxy URL (e.g. socks5://127.0.0.1:1080)</span>
            </div>
            <div className="pref-control-col">
              <input
                type="text"
                value={settings.proxy}
                onChange={(e) => updateSettings({ proxy: e.target.value })}
                placeholder="Direct connection (none)"
                className="pref-text-input wide"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Privacy & Data */}
        <section className="pref-section">
          <div className="pref-section-title">Privacy & Data</div>

          <div className="pref-row">
            <div className="pref-label-col">
              <span className="pref-label">Private Mode</span>
              <span className="pref-desc">Do not record completed downloads to local history</span>
            </div>
            <div className="pref-control-col">
              <label className="native-toggle">
                <input
                  type="checkbox"
                  checked={settings.noLogMode}
                  onChange={(e) => updateSettings({ noLogMode: e.target.checked })}
                />
                <span className="native-toggle-slider" />
              </label>
            </div>
          </div>

          <div className="pref-row">
            <div className="pref-label-col">
              <span className="pref-label">Library Records</span>
              <span className="pref-desc">Locally cached history items: {history.length}</span>
            </div>
            <div className="pref-control-col">
              {showClearConfirm ? (
                <div className="pref-confirm-group">
                  <span className="confirm-text">Clear all history records?</span>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => {
                      clearHistory();
                      setShowClearConfirm(false);
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={history.length === 0}
                >
                  Clear History
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Browser Integration (IDM-Style) */}
        <section className="pref-section">
          <div className="pref-section-title">Browser Integration (IDM-Style)</div>

          <div className="pref-row">
            <div className="pref-label-col">
              <span className="pref-label">Chrome & Edge Extension</span>
              <span className="pref-desc">
                Sniffs video streams in real-time and overlays a 1-click floating "Download" badge
              </span>
            </div>
            <div className="pref-control-col">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  if (!isTauri) return;
                  try {
                    const dir = await invoke<string>("get_extension_dir");
                    if (dir) invoke("open_file", { path: dir });
                  } catch {}
                }}
              >
                Reveal Extension Folder
              </button>
            </div>
          </div>

          <div className="pref-row">
            <div className="pref-label-col">
              <span className="pref-label">Local IPC Server</span>
              <span className="pref-desc">
                Instant stream capture listener on 127.0.0.1:17865
              </span>
            </div>
            <div className="pref-control-col">
              <span className="engine-badge ready" style={{ display: "inline-flex", fontSize: "11px" }}>
                <span className="engine-dot" />
                Listening (Ready)
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
