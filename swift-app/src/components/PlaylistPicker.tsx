import { useState } from "react";
import type { PlaylistInfo, PlaylistEntry } from "../types";

interface Props {
  playlist: PlaylistInfo;
  onDownloadAll: (entries: PlaylistEntry[]) => void;
  onDownloadSingle: (entry: PlaylistEntry) => void;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlaylistPicker({ playlist, onDownloadAll, onDownloadSingle, onClose }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set(playlist.entries.map((_, i) => i)));

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === playlist.entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(playlist.entries.map((_, i) => i)));
    }
  };

  const totalDuration = playlist.entries.reduce((sum, e) => sum + e.duration, 0);
  const selectedEntries = playlist.entries.filter((_, i) => selected.has(i));

  return (
    <div className="quality-picker-overlay" onClick={onClose}>
      <div className="quality-picker glass-panel playlist-picker" onClick={(e) => e.stopPropagation()}>
        <div className="quality-header">
          <div className="playlist-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="32" height="32">
              <path d="M4 6h16M4 10h16M4 14h10M4 18h6" strokeLinecap="round" />
              <path d="M18 14v8l6-4z" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="quality-info">
            <h3>{playlist.title}</h3>
            <p>
              {playlist.uploader} · {playlist.count} videos · {formatDuration(totalDuration)} total
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="playlist-toolbar">
          <button className="btn btn-ghost btn-sm" onClick={toggleAll}>
            {selected.size === playlist.entries.length ? "Deselect All" : "Select All"}
          </button>
          <span className="playlist-selected-count">
            {selected.size} of {playlist.count} selected
          </span>
        </div>

        <div className="quality-sections playlist-entries">
          {playlist.entries.map((entry, i) => (
            <label
              key={i}
              className={`quality-option playlist-entry ${selected.has(i) ? "selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggle(i)}
              />
              <span className="playlist-index">{entry.index}</span>
              {entry.thumbnail && (
                <img src={entry.thumbnail} alt="" className="playlist-thumb" />
              )}
              <span className="playlist-entry-title">{entry.title}</span>
              <span className="playlist-entry-duration">{formatDuration(entry.duration)}</span>
              <button
                className="btn btn-ghost btn-sm playlist-play-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDownloadSingle(entry);
                }}
                title="Download this video"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path d="M10 3a1 1 0 0 1 1 1v6.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 10.586V4a1 1 0 0 1 1-1z" />
                  <path d="M3 15a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z" />
                </svg>
              </button>
            </label>
          ))}
        </div>

        <div className="quality-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onDownloadAll(selectedEntries)}
            disabled={selected.size === 0}
          >
            Download {selected.size} {selected.size === 1 ? "Video" : "Videos"}
          </button>
        </div>
      </div>
    </div>
  );
}
