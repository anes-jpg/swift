import { useState, useCallback, useEffect } from "react";
import GradientBackground from "./components/GradientBackground";
import Titlebar from "./components/Titlebar";
import Header from "./components/Header";
import UrlInput from "./components/UrlInput";
import QualityPicker from "./components/QualityPicker";
import PlaylistPicker from "./components/PlaylistPicker";
import DownloadQueue from "./components/DownloadQueue";
import Settings from "./components/Settings";
import SetupBanner from "./components/SetupBanner";
import { addDownload, updateDownload } from "./store/downloadStore";
import type { VideoInfo, VideoFormat, PlaylistInfo, PlaylistEntry } from "./types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

interface DownloadProgressEvent {
  id: string;
  status: string;
  progress: number;
  speed?: string;
  eta?: string;
  downloaded?: number;
}

export default function App() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [activeTab, setActiveTab] = useState<"downloads" | "library" | "settings">("downloads");

  useEffect(() => {
    const unlistenProgress = listen<DownloadProgressEvent>("download-progress", (event) => {
      const { id, status, progress, speed, eta, downloaded } = event.payload;
      updateDownload(id, {
        status: status as any,
        progress,
        ...(speed && { speed }),
        ...(eta && { eta }),
        ...(downloaded !== undefined && { downloaded }),
      });
    });

    const unlistenExtension = listen<{ url: string; title: string; referer: string }>("extension-quick-download", async (event) => {
      const { url, title, referer } = event.payload;
      try {
        const info = await invoke("fetch_video_info", { url });
        setVideoInfo(info as VideoInfo);
      } catch (err) {
        console.error("Extension fetch failed, falling back to quick download:", err);
        try {
          await invoke("quick_download", { url, title, referer });
        } catch (fallbackErr) {
          console.error("Extension fallback download failed:", fallbackErr);
        }
      }
    });

    const unlistenQuickStarted = listen<{ id: string; url: string; title: string }>("quick-download-started", (event) => {
      const { id, url, title } = event.payload;
      updateDownload(id, {
        title,
        url,
        status: "downloading",
        progress: 0,
      } as any);
    });

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenExtension.then((fn) => fn());
      unlistenQuickStarted.then((fn) => fn());
    };
  }, []);

  const handleVideoFetched = useCallback((info: VideoInfo) => {
    setVideoInfo(info);
  }, []);

  const handlePlaylistFetched = useCallback((info: PlaylistInfo) => {
    setPlaylistInfo(info);
  }, []);

  const startVideoDownload = useCallback(
    async (video: VideoInfo, format: VideoFormat) => {
      const id = addDownload(video, format);
      try {
        await invoke("start_download", {
          id,
          url: video.url,
          formatId: format.format_id,
        });
        updateDownload(id, { status: "downloading" });
      } catch (err) {
        updateDownload(id, { status: "failed" });
        console.error("Download failed:", err);
      }
    },
    []
  );

  const handleFormatSelect = useCallback(
    async (format: VideoFormat) => {
      if (!videoInfo) return;
      setVideoInfo(null);
      await startVideoDownload(videoInfo, format);
    },
    [videoInfo, startVideoDownload]
  );

  const handlePlaylistDownloadAll = useCallback(
    async (entries: PlaylistEntry[]) => {
      setPlaylistInfo(null);
      for (const entry of entries) {
        try {
          const info = await invoke<VideoInfo>("fetch_video_info", { url: entry.url });
          const bestFormat = info.formats.find(
            (f) => f.resolution !== "audio only" && f.vcodec !== "none"
          ) ?? info.formats[info.formats.length - 1];
          if (bestFormat) {
            await startVideoDownload(info, bestFormat);
          }
        } catch (err) {
          console.error(`Failed to fetch ${entry.title}:`, err);
        }
      }
    },
    [startVideoDownload]
  );

  const handlePlaylistDownloadSingle = useCallback(
    async (entry: PlaylistEntry) => {
      setPlaylistInfo(null);
      try {
        const info = await invoke<VideoInfo>("fetch_video_info", { url: entry.url });
        setVideoInfo(info);
      } catch (err) {
        console.error(`Failed to fetch ${entry.title}:`, err);
      }
    },
    []
  );

  return (
    <div className="swift-app">
      <GradientBackground />

      <div className="app-content">
        <Titlebar />
        <Header activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="app-main">
          <SetupBanner />
          <UrlInput
            onVideoFetched={handleVideoFetched}
            onPlaylistFetched={handlePlaylistFetched}
          />

          {activeTab === "downloads" && <DownloadQueue />}
          {activeTab === "settings" && <Settings />}
          {activeTab === "library" && (
            <div className="empty-state">
              <h3>Library</h3>
              <p>Coming soon — your download history will appear here</p>
            </div>
          )}
        </main>
      </div>

      {videoInfo && (
        <QualityPicker
          videoInfo={videoInfo}
          onSelect={handleFormatSelect}
          onClose={() => setVideoInfo(null)}
        />
      )}

      {playlistInfo && (
        <PlaylistPicker
          playlist={playlistInfo}
          onDownloadAll={handlePlaylistDownloadAll}
          onDownloadSingle={handlePlaylistDownloadSingle}
          onClose={() => setPlaylistInfo(null)}
        />
      )}
    </div>
  );
}
