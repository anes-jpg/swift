import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  onVideoFetched: (info: any) => void;
  onPlaylistFetched: (info: any) => void;
}

function isPlaylistUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("playlist?list=") ||
    lower.includes("&list=") ||
    lower.includes("/playlist/") ||
    lower.includes("mix=")
  );
}

export default function UrlInput({ onVideoFetched, onPlaylistFetched }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!url.trim()) return;

      setLoading(true);
      setError("");

      const trimmedUrl = url.trim();

      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout — yt-dlp took too long. Check your internet or try again.")), 30000)
        );

        if (isPlaylistUrl(trimmedUrl)) {
          const info = await Promise.race([invoke("fetch_playlist_info", { url: trimmedUrl }), timeout]);
          onPlaylistFetched(info);
        } else {
          const info = await Promise.race([invoke("fetch_video_info", { url: trimmedUrl }), timeout]);
          onVideoFetched(info);
        }
        setUrl("");
      } catch (err: any) {
        setError(err?.toString() ?? "Failed to fetch video");
      } finally {
        setLoading(false);
      }
    },
    [url, onVideoFetched, onPlaylistFetched]
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text");
      if (text && /https?:\/\//.test(text)) {
        setTimeout(() => handleSubmit(), 100);
      }
    },
    [handleSubmit]
  );

  return (
    <div className={`url-input-wrapper ${focused ? "focused" : ""}`}>
      <form onSubmit={handleSubmit} className="url-form">
        <div className="url-input-glow" />
        <div className="url-input-container">
          <svg className="url-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={onPaste}
            placeholder="Paste any video or playlist URL — YouTube, TikTok, Twitter, Vimeo..."
            className="url-input"
            disabled={loading}
          />
          <button
            type="submit"
            className={`url-submit ${loading ? "loading" : ""}`}
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </form>
      {error && <div className="url-error">{error}</div>}
    </div>
  );
}
