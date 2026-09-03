import { useState, useCallback, useEffect } from "react";
import GradientBackground from "./components/GradientBackground";
import Titlebar from "./components/Titlebar";
import Sidebar from "./components/Sidebar";
import DownloadsWorkspace from "./components/DownloadsWorkspace";
import QualityPicker from "./components/QualityPicker";
import PlaylistPicker from "./components/PlaylistPicker";
import Library from "./components/Library";
import Settings from "./components/Settings";
import SetupBanner from "./components/SetupBanner";
import { addDownload, updateDownload, getSettings } from "./store/downloadStore";
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
  output_path?: string;
}

export default function App() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [activeTab, setActiveTab] = useState<"downloads" | "library" | "settings">("downloads");

  // Global desktop keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault();
        setActiveTab("downloads");
      } else if ((e.ctrlKey || e.metaKey) && e.key === "2") {
        e.preventDefault();
        setActiveTab("library");
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "3" || e.key === ",")) {
        e.preventDefault();
        setActiveTab("settings");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    const unlistenProgress = listen<DownloadProgressEvent>("download-progress", (event) => {
      const { id, status, progress, speed, eta, downloaded, output_path } = event.payload;
      updateDownload(id, {
        status: status as any,
        progress,
        ...(speed && { speed }),
        ...(eta && { eta }),
        ...(downloaded !== undefined && { downloaded }),
        ...(output_path && { output_path }),
      });
    });

    const unlistenExtension = listen<{ url: string; title: string; referer: string }>("extension-quick-download", async (event) => {
      const { url, title, referer } = event.payload;
      const settings = getSettings();
      try {
        const info = await invoke("fetch_video_info", { url });
        setVideoInfo(info as VideoInfo);
      } catch (err) {
        console.error("Extension fetch failed, falling back to quick download:", err);
        try {
          await invoke("quick_download", {
            url,
            title,
            referer,
            downloadDir: settings.downloadDir || null,
            proxy: settings.proxy || null,
          });
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
      const settings = getSettings();
      try {
        await invoke("start_download", {
          id,
          url: video.url,
          formatId: format.format_id,
          downloadDir: settings.downloadDir || null,
          proxy: settings.proxy || null,
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
    <div className="swift-desktop-app">
      <GradientBackground />

      <div className="desktop-layout">
        <Titlebar />

        <div className="desktop-body">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

          <main className="desktop-workspace">
            <SetupBanner />

            {activeTab === "downloads" && (
              <DownloadsWorkspace
                onVideoFetched={handleVideoFetched}
                onPlaylistFetched={handlePlaylistFetched}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === "library" && <Library />}
            {activeTab === "settings" && <Settings />}
          </main>
        </div>
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
