import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface Deps {
  ytdlp: boolean;
  ffmpeg: boolean;
}

export default function SetupBanner() {
  const [deps, setDeps] = useState<Deps | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) {
      setDeps({ ytdlp: true, ffmpeg: true });
      setDismissed(true);
      return;
    }

    const unlistenStatus = listen<{ ytdlp: boolean; ffmpeg: boolean; installing: boolean }>(
      "setup-status",
      (e) => {
        setDeps({ ytdlp: e.payload.ytdlp, ffmpeg: e.payload.ffmpeg });
        setInstalling(e.payload.installing);
      }
    );

    const unlistenLog = listen<string>("setup-log", (e) => {
      setLogs((prev) => [...prev, e.payload]);
    });

    invoke<Deps>("check_dependencies").then((result) => {
      setDeps(result);
      if (result.ytdlp && result.ffmpeg) {
        setDismissed(true);
      }
    });

    return () => {
      unlistenStatus.then((fn) => fn());
      unlistenLog.then((fn) => fn());
    };
  }, []);

  if (dismissed || (deps?.ytdlp && deps?.ffmpeg)) {
    if (deps?.ytdlp && deps?.ffmpeg && !dismissed) {
      setTimeout(() => setDismissed(true), 2000);
    }
    if (dismissed) return null;
  }

  if (!deps) return null;

  const allGood = deps.ytdlp && deps.ffmpeg;

  return (
    <div className={`setup-banner ${allGood ? "success" : "warning"}`}>
      {installing && (
        <div className="setup-installing">
          <div className="spinner" />
          <span>Installing dependencies...</span>
        </div>
      )}

      {!installing && !allGood && (
        <div className="setup-missing">
          <span>
            Missing: {!deps.ytdlp && "yt-dlp"} {!deps.ytdlp && !deps.ffmpeg && " + "} {!deps.ffmpeg && "ffmpeg"}
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              setInstalling(true);
              setLogs([]);
              await invoke("check_dependencies");
              setInstalling(false);
            }}
          >
            Install Now
          </button>
        </div>
      )}

      {!installing && allGood && (
        <div className="setup-ready">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>All dependencies ready</span>
        </div>
      )}

      {logs.length > 0 && (
        <div className="setup-logs">
          {logs.map((log, i) => (
            <div key={i} className="setup-log-line">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
