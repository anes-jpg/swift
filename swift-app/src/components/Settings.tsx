import { useSyncExternalStore } from "react";
import { getSettings, subscribe, updateSettings } from "../store/downloadStore";
import { invoke } from "@tauri-apps/api/core";

export default function Settings() {
  const settings = useSyncExternalStore(subscribe, getSettings);

  const pickDir = async () => {
    try {
      const dir = await invoke<string>("pick_directory");
      if (dir) updateSettings({ downloadDir: dir });
    } catch {}
  };

  return (
    <div className="settings-panel glass-panel">
      <h2>Settings</h2>

      <div className="setting-group">
        <label>Download Location</label>
        <div className="setting-row">
          <input
            type="text"
            value={settings.downloadDir}
            placeholder="Default"
            readOnly
            className="setting-input"
          />
          <button className="btn btn-ghost" onClick={pickDir}>
            Browse
          </button>
        </div>
      </div>

      <div className="setting-group">
        <label>Max Concurrent Downloads</label>
        <input
          type="range"
          min={1}
          max={8}
          value={settings.maxConcurrent}
          onChange={(e) =>
            updateSettings({ maxConcurrent: Number(e.target.value) })
          }
          className="setting-slider"
        />
        <span className="setting-value">{settings.maxConcurrent}</span>
      </div>

      <div className="setting-group">
        <label>Glass Opacity</label>
        <input
          type="range"
          min={5}
          max={40}
          value={Math.round(settings.glassOpacity * 100)}
          onChange={(e) =>
            updateSettings({ glassOpacity: Number(e.target.value) / 100 })
          }
          className="setting-slider"
        />
        <span className="setting-value">{Math.round(settings.glassOpacity * 100)}%</span>
      </div>

      <div className="setting-group">
        <label>Proxy</label>
        <input
          type="text"
          value={settings.proxy}
          onChange={(e) => updateSettings({ proxy: e.target.value })}
          placeholder="socks5://host:port"
          className="setting-input"
        />
      </div>

      <div className="setting-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={settings.noLogMode}
            onChange={(e) => updateSettings({ noLogMode: e.target.checked })}
          />
          <span className="toggle-switch" />
          Privacy Mode (no logs)
        </label>
      </div>
    </div>
  );
}
