import { useState, useEffect } from "react";
import type { VideoInfo, VideoFormat } from "../types";
import { getSettings } from "../store/downloadStore";

interface Props {
  videoInfo: VideoInfo;
  onSelect: (format: VideoFormat) => void;
  onClose: () => void;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "Approx. size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QualityPicker({ videoInfo, onSelect, onClose }: Props) {
  const settings = getSettings();

  const videoFormats = videoInfo.formats.filter(
    (f) => f.resolution !== "audio only" && f.vcodec !== "none"
  );
  const audioFormats = videoInfo.formats.filter(
    (f) => f.resolution === "audio only" || f.vcodec === "none"
  );

  const defaultSelection = (): string => {
    if (settings.defaultFormat === "best_audio" && audioFormats.length > 0) {
      return audioFormats[0].format_id;
    }
    if (videoFormats.length > 0) {
      return videoFormats[0].format_id;
    }
    if (audioFormats.length > 0) {
      return audioFormats[0].format_id;
    }
    return videoInfo.formats[0]?.format_id || "";
  };

  const [selected, setSelected] = useState<string>(defaultSelection());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && selected) {
        const format = videoInfo.formats.find((f) => f.format_id === selected);
        if (format) onSelect(format);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, videoInfo, onSelect, onClose]);

  const handleSelect = () => {
    const format = videoInfo.formats.find((f) => f.format_id === selected);
    if (format) onSelect(format);
  };

  return (
    <div className="quality-picker-overlay" onClick={onClose}>
      <div className="quality-picker glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="quality-header">
          {videoInfo.thumbnail ? (
            <img src={videoInfo.thumbnail} alt="" className="quality-thumb" />
          ) : (
            <div className="quality-thumb-placeholder" />
          )}
          <div className="quality-info">
            <h3>{videoInfo.title}</h3>
            <p>
              {videoInfo.uploader} · {formatDuration(videoInfo.duration)}
            </p>
          </div>
          <button className="close-btn" onClick={onClose} title="Close (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="quality-sections">
          {videoFormats.length > 0 && (
            <div className="quality-section">
              <h4>Video Streams</h4>
              <div className="quality-options-list">
                {videoFormats.map((f) => {
                  const isHighRes =
                    f.resolution.includes("2160") ||
                    f.resolution.includes("1440") ||
                    f.resolution.includes("1080");
                  return (
                    <label
                      key={f.format_id}
                      className={`quality-option ${selected === f.format_id ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={f.format_id}
                        checked={selected === f.format_id}
                        onChange={() => setSelected(f.format_id)}
                      />
                      <div className="quality-res-group">
                        <span className="quality-res">{f.resolution}</span>
                        {isHighRes && <span className="quality-tag hd">HD</span>}
                      </div>
                      <span className="quality-ext">{f.ext.toUpperCase()}</span>
                      <span className="quality-fps">{f.fps > 0 ? `${f.fps}fps` : ""}</span>
                      <span className="quality-size">{formatSize(f.filesize)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {audioFormats.length > 0 && (
            <div className="quality-section">
              <h4>Audio Extraction</h4>
              <div className="quality-options-list">
                {audioFormats.map((f) => (
                  <label
                    key={f.format_id}
                    className={`quality-option ${selected === f.format_id ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={f.format_id}
                      checked={selected === f.format_id}
                      onChange={() => setSelected(f.format_id)}
                    />
                    <div className="quality-res-group">
                      <span className="quality-res">Audio Only</span>
                      <span className="quality-tag audio">HQ</span>
                    </div>
                    <span className="quality-ext">{f.ext.toUpperCase()} / MP3</span>
                    <span className="quality-fps">{f.acodec !== "none" ? f.acodec : ""}</span>
                    <span className="quality-size">{formatSize(f.filesize)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="quality-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSelect}
            disabled={!selected}
          >
            Start Download
          </button>
        </div>
      </div>
    </div>
  );
}
