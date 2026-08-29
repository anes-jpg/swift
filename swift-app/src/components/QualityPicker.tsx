import { useState } from "react";
import type { VideoInfo, VideoFormat } from "../types";

interface Props {
  videoInfo: VideoInfo;
  onSelect: (format: VideoFormat) => void;
  onClose: () => void;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QualityPicker({ videoInfo, onSelect, onClose }: Props) {
  const [selected, setSelected] = useState<string>("");

  const videoFormats = videoInfo.formats.filter(
    (f) => f.resolution !== "audio only" && f.vcodec !== "none"
  );
  const audioFormats = videoInfo.formats.filter(
    (f) => f.resolution === "audio only" || f.vcodec === "none"
  );

  const handleSelect = () => {
    const format = videoInfo.formats.find((f) => f.format_id === selected);
    if (format) onSelect(format);
  };

  return (
    <div className="quality-picker-overlay" onClick={onClose}>
      <div className="quality-picker glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="quality-header">
          <img src={videoInfo.thumbnail} alt="" className="quality-thumb" />
          <div className="quality-info">
            <h3>{videoInfo.title}</h3>
            <p>
              {videoInfo.uploader} · {formatDuration(videoInfo.duration)}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="quality-sections">
          {videoFormats.length > 0 && (
            <div className="quality-section">
              <h4>Video</h4>
              {videoFormats.map((f) => (
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
                  <span className="quality-res">{f.resolution}</span>
                  <span className="quality-ext">{f.ext.toUpperCase()}</span>
                  <span className="quality-fps">{f.fps}fps</span>
                  <span className="quality-size">{formatSize(f.filesize)}</span>
                </label>
              ))}
            </div>
          )}

          {audioFormats.length > 0 && (
            <div className="quality-section">
              <h4>Audio Only</h4>
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
                  <span className="quality-res">Audio</span>
                  <span className="quality-ext">{f.ext.toUpperCase()}</span>
                  <span className="quality-fps">{f.acodec}</span>
                  <span className="quality-size">{formatSize(f.filesize)}</span>
                </label>
              ))}
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
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
