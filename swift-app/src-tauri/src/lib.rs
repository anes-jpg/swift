use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoFormat {
    format_id: String,
    ext: String,
    resolution: String,
    fps: f64,
    filesize: Option<u64>,
    vcodec: String,
    acodec: String,
    quality: f64,
    url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoInfo {
    url: String,
    title: String,
    thumbnail: String,
    duration: f64,
    uploader: String,
    upload_date: String,
    formats: Vec<VideoFormat>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadState {
    id: String,
    status: String,
    progress: f64,
    speed: String,
    eta: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadTaskInfo {
    pub id: String,
    pub url: String,
    pub format_id: String,
    pub download_dir: Option<String>,
    pub proxy: Option<String>,
}

pub struct AppState {
    downloads: Mutex<HashMap<String, DownloadState>>,
    processes: Mutex<HashMap<String, u32>>,
    tasks: Mutex<HashMap<String, DownloadTaskInfo>>,
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistEntry {
    url: String,
    title: String,
    thumbnail: String,
    duration: f64,
    index: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistInfo {
    title: String,
    uploader: String,
    count: u32,
    entries: Vec<PlaylistEntry>,
}

pub fn find_command(name: &str) -> Option<String> {
    let mut cmd = Command::new(if cfg!(windows) { "where" } else { "which" });
    cmd.arg(name);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let found = cmd
        .stdout(Stdio::piped())
        .output()
        .ok()
        .and_then(|o| if o.status.success() { Some(o) } else { None });

    if let Some(output) = found {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let path = line.trim();
            if !path.to_lowercase().contains("wrappers") && std::path::Path::new(path).exists() {
                return Some(path.to_string());
            }
        }
    }

    if cfg!(windows) {
        let home = std::env::var("USERPROFILE").unwrap_or_default();
        let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".into());

        let known_paths: Vec<String> = match name {
            "ffmpeg" => {
                let mut paths = Vec::new();
                if let Ok(entries) = std::fs::read_dir("C:\\ffmpeg") {
                    for entry in entries.flatten() {
                        let bin = entry.path().join("bin").join("ffmpeg.exe");
                        if bin.exists() {
                            paths.push(bin.to_string_lossy().to_string());
                        }
                    }
                }
                let winget_pkgs = format!("{}\\Microsoft\\WinGet\\Packages", local);
                if let Ok(entries) = std::fs::read_dir(&winget_pkgs) {
                    for entry in entries.flatten() {
                        let p = entry.path();
                        if p.file_name().map_or(false, |n| n.to_string_lossy().to_lowercase().contains("ffmpeg")) {
                            if let Ok(sub) = std::fs::read_dir(&p) {
                                for sub_entry in sub.flatten() {
                                    let bin = sub_entry.path().join("bin").join("ffmpeg.exe");
                                    if bin.exists() {
                                        paths.push(bin.to_string_lossy().to_string());
                                    }
                                }
                            }
                        }
                    }
                }
                paths.push(format!("{}\\Microsoft\\WinGet\\Links\\ffmpeg.exe", local));
                paths.push(format!("{}\\scoop\\shims\\ffmpeg.exe", home));
                paths.push(format!("{}\\ffmpeg\\bin\\ffmpeg.exe", program_files));
                paths
            }
            "yt-dlp" => {
                let mut paths = Vec::new();
                if let Ok(entries) = std::fs::read_dir(format!("{}\\AppData\\Local\\Programs\\Python", home)) {
                    for entry in entries.flatten() {
                        if !entry.path().join("python.exe").exists() {
                            continue;
                        }
                        let exe = entry.path().join("Scripts").join("yt-dlp.exe");
                        if exe.exists() {
                            paths.push(exe.to_string_lossy().to_string());
                        }
                    }
                }
                if let Ok(entries) = std::fs::read_dir(format!("{}\\AppData\\Roaming\\Python", home)) {
                    for entry in entries.flatten() {
                        let exe = entry.path().join("Scripts").join("yt-dlp.exe");
                        if exe.exists() {
                            paths.push(exe.to_string_lossy().to_string());
                        }
                    }
                }
                paths.push(format!("{}\\Microsoft\\WinGet\\Links\\yt-dlp.exe", local));
                paths.push(format!("{}\\scoop\\shims\\yt-dlp.exe", home));
                paths.push(format!("{}\\Programs\\yt-dlp\\yt-dlp.exe", local));
                paths
            }
            _ => vec![],
        };

        for path in known_paths {
            if std::path::Path::new(&path).exists() {
                return Some(path);
            }
        }
    }

    None
}

fn has_command(name: &str) -> bool {
    find_command(name).is_some()
}

fn create_command(program: &str) -> Command {
    let actual_program = find_command(program).unwrap_or_else(|| program.to_string());
    let mut cmd = Command::new(actual_program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    cmd
}

fn enhanced_path() -> String {
    let mut path = std::env::var("PATH").unwrap_or_default();
    let home = std::env::var("USERPROFILE").unwrap_or_default();
    let local = std::env::var("LOCALAPPDATA").unwrap_or_default();

    let mut extras = vec![
        format!("{}\\AppData\\Local\\Programs\\Python\\Python312", home),
        format!("{}\\AppData\\Local\\Programs\\Python\\Python312\\Scripts", home),
        format!("{}\\AppData\\Local\\Programs\\Python\\Python311", home),
        format!("{}\\AppData\\Local\\Programs\\Python\\Python311\\Scripts", home),
        format!("{}\\AppData\\Local\\Programs\\Python\\Python313", home),
        format!("{}\\AppData\\Local\\Programs\\Python\\Python313\\Scripts", home),
        format!("{}\\Microsoft\\WinGet\\Links", local),
        format!("{}\\scoop\\shims", home),
        "C:\\ffmpeg\\ffmpeg-8.1.1-essentials_build\\bin".to_string(),
    ];

    if let Some(ffmpeg_bin) = find_command("ffmpeg") {
        if let Some(parent) = std::path::Path::new(&ffmpeg_bin).parent() {
            extras.push(parent.to_string_lossy().to_string());
        }
    }

    if let Some(ytdlp_bin) = find_command("yt-dlp") {
        if let Some(parent) = std::path::Path::new(&ytdlp_bin).parent() {
            extras.push(parent.to_string_lossy().to_string());
        }
    }

    for dir in extras {
        if !path.contains(&dir) {
            path = format!("{};{}", dir, path);
        }
    }

    path
}

const BROWSER_UA: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) \
     Chrome/131.0.0.0 Safari/537.36";

const SWIFT_TOKEN: &str = "swift-local-a7f3e9c2";

const COOKIE_BROWSERS: &[&str] = &["chrome", "edge", "firefox", "brave"];

pub fn build_ytdlp_args(
    url: &str,
    referer: &str,
    format_selector: &str,
    output_template: &str,
    ffmpeg_available: bool,
    cookie_browser: Option<&str>,
    proxy: Option<&str>,
    ffmpeg_location: Option<&str>,
) -> Vec<String> {
    let is_audio = format_selector == "audio only"
        || format_selector.contains("audio")
        || format_selector.starts_with("ba")
        || format_selector == "bestaudio";

    let mut args = vec![
        "--no-playlist".into(),
        "--no-warnings".into(),
        "--no-check-certificates".into(),
        "--socket-timeout".into(),
        "15".into(),
        "--extractor-retries".into(),
        "3".into(),
        "--newline".into(),
        "--windows-filenames".into(),
        "--trim-filenames".into(),
        "160".into(),
        "--user-agent".into(),
        BROWSER_UA.into(),
        "--referer".into(),
        referer.into(),
    ];

    if is_audio {
        args.push("-f".into());
        args.push(if format_selector == "audio only" {
            "bestaudio/best".into()
        } else {
            format_selector.into()
        });

        if ffmpeg_available {
            args.push("-x".into());
            args.push("--audio-format".into());
            args.push("mp3".into());
            args.push("--audio-quality".into());
            args.push("0".into());
        }
    } else {
        args.push("-f".into());
        args.push(format_selector.into());

        if ffmpeg_available {
            args.push("--merge-output-format".into());
            args.push("mp4".into());
        }
    }

    if ffmpeg_available {
        if let Some(loc) = ffmpeg_location {
            args.push("--ffmpeg-location".into());
            args.push(loc.into());
        }
    }

    if let Some(p) = proxy {
        let trimmed = p.trim();
        if !trimmed.is_empty() {
            args.push("--proxy".into());
            args.push(trimmed.into());
        }
    }

    if let Some(browser) = cookie_browser {
        args.push("--cookies-from-browser".into());
        args.push(browser.into());
    }

    args.push("-o".into());
    args.push(output_template.into());

    args.push(url.into());
    args
}

fn ytdlp_download_args(
    url: &str,
    referer: &str,
    format_selector: &str,
    output_template: &str,
    ffmpeg_available: bool,
    cookie_browser: Option<&str>,
    proxy: Option<&str>,
    app: &tauri::AppHandle,
) -> Vec<String> {
    let ffmpeg_loc = if ffmpeg_available {
        app.path().app_local_data_dir().ok().map(|d| d.join("wrappers").to_string_lossy().to_string())
    } else {
        None
    };

    build_ytdlp_args(
        url,
        referer,
        format_selector,
        output_template,
        ffmpeg_available,
        cookie_browser,
        proxy,
        ffmpeg_loc.as_deref(),
    )
}

pub fn parse_progress_from_line(line: &str) -> Option<(f64, String, String)> {
    let line = line.trim();
    if line.contains("[download]") && line.contains('%') {
        let after = line.split("[download]").nth(1)?.trim();
        let percent = after.split('%').next()?.trim().parse::<f64>().ok()?;
        let speed = after
            .find("at ")
            .map(|i| after[i + 3..].split(" ETA").next().unwrap_or("N/A").trim().to_string())
            .unwrap_or_else(|| "N/A".into());
        let eta = after
            .find("ETA ")
            .map(|i| after[i + 4..].trim().to_string())
            .unwrap_or_else(|| "--:--".into());
        Some((percent, speed, eta))
    } else {
        None
    }
}

pub fn parse_destination_from_line(line: &str) -> Option<String> {
    let trimmed = line.trim();
    if let Some(pos) = trimmed.find("[download] Destination: ") {
        Some(trimmed[pos + 24..].trim().to_string())
    } else if let Some(pos) = trimmed.find("[Merger] Merging formats into \"") {
        if let Some(end) = trimmed[pos + 31..].find('"') {
            Some(trimmed[pos + 31..pos + 31 + end].trim().to_string())
        } else {
            None
        }
    } else if let Some(pos) = trimmed.find("[ExtractAudio] Destination: ") {
        Some(trimmed[pos + 28..].trim().to_string())
    } else if trimmed.contains("has already been downloaded") {
        if let Some(pos) = trimmed.find("[download] ") {
            let rest = &trimmed[pos + 11..];
            if let Some(end) = rest.find(" has already been downloaded") {
                Some(rest[..end].trim().to_string())
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    }
}

fn emit_progress_line(app: &tauri::AppHandle, id: &str, line: &str) {
    let line = line.trim();
    if line.is_empty() {
        return;
    }

    if let Some((percent, speed, eta)) = parse_progress_from_line(line) {
        let reported = percent.min(99.0);
        let _ = app.emit(
            "download-progress",
            serde_json::json!({
                "id": id, "status": "downloading",
                "progress": reported, "speed": speed, "eta": eta,
            }),
        );
    } else if line.contains("[Merger]") || line.contains("[ffmpeg]") || line.contains("[ExtractAudio]") {
        let _ = app.emit(
            "download-progress",
            serde_json::json!({
                "id": id, "status": "downloading",
                "progress": 99.0, "speed": "merging", "eta": "0s",
            }),
        );
    }
}

fn detect_cookie_browsers() -> Vec<String> {
    let mut found = Vec::new();

    if cfg!(windows) {
        let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let roaming = std::env::var("APPDATA").unwrap_or_default();

        let candidates: &[(&str, String)] = &[
            ("chrome", format!("{}\\Google\\Chrome\\User Data\\Default\\Network\\Cookies", local)),
            ("edge", format!("{}\\Microsoft\\Edge\\User Data\\Default\\Network\\Cookies", local)),
            ("brave", format!("{}\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Network\\Cookies", local)),
        ];

        for (name, path) in candidates {
            if COOKIE_BROWSERS.contains(name) && std::path::Path::new(path).exists() {
                found.push((*name).to_string());
            }
        }

        let ff_profiles = format!("{}\\Mozilla\\Firefox\\Profiles", roaming);
        if let Ok(entries) = std::fs::read_dir(&ff_profiles) {
            for entry in entries.flatten() {
                if entry.path().join("cookies.sqlite").exists() {
                    found.push("firefox".to_string());
                    break;
                }
            }
        }
    } else {
        found.push("chrome".to_string());
    }

    found
}

fn run_download_with_fallback(
    app: &tauri::AppHandle,
    id: &str,
    url: &str,
    referer: &str,
    format_selector: &str,
    output_template: &str,
    proxy: Option<&str>,
    state: &State<'_, AppState>,
) -> (bool, Option<String>) {
    let ffmpeg_available = has_command("ffmpeg");

    let mut candidates = vec![None];
    candidates.extend(detect_cookie_browsers().into_iter().map(Some));

    for candidate in &candidates {
        let args = ytdlp_download_args(
            url,
            referer,
            format_selector,
            output_template,
            ffmpeg_available,
            candidate.as_deref(),
            proxy,
            app,
        );

        let child = create_command("yt-dlp")
            .args(&args)
            .env("PATH", enhanced_path())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();

        let mut child = match child {
            Ok(c) => c,
            Err(_) => return (false, None),
        };

        let pid = child.id();
        {
            let mut procs = state.processes.lock().unwrap_or_else(|e| e.into_inner());
            procs.insert(id.to_string(), pid);
        }

        let mut captured_path: Option<String> = None;

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                emit_progress_line(app, id, &line);
                if let Some(dest) = parse_destination_from_line(&line) {
                    captured_path = Some(dest);
                }
            }
        }

        let status = child.wait();

        {
            let mut procs = state.processes.lock().unwrap_or_else(|e| e.into_inner());
            procs.remove(id);
        }

        if matches!(status, Ok(s) if s.success()) {
            if captured_path.is_none() && !output_template.contains('%') {
                if std::path::Path::new(output_template).exists() {
                    captured_path = Some(output_template.to_string());
                }
            }
            return (true, captured_path);
        }
    }

    (false, None)
}

fn spawn_ytdlp_self_update() {
    std::thread::spawn(|| {
        if !has_command("yt-dlp") {
            return;
        }
        let updated = create_command("yt-dlp")
            .arg("-U")
            .env("PATH", enhanced_path())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false);

        if !updated {
            let _ = create_command("pip")
                .args(["install", "--upgrade", "yt-dlp"])
                .env("PATH", enhanced_path())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status();
        }
    });
}

#[tauri::command]
fn check_dependencies(app: tauri::AppHandle) -> serde_json::Value {
    let ytdlp = has_command("yt-dlp");
    let ffmpeg = has_command("ffmpeg");

    if !ytdlp || !ffmpeg {
        let _ = app.emit("setup-status", serde_json::json!({
            "ytdlp": ytdlp,
            "ffmpeg": ffmpeg,
            "installing": true
        }));

        if !ytdlp {
            let _ = app.emit("setup-log", "Installing yt-dlp...");
            let result = create_command("pip")
                .args(["install", "--upgrade", "yt-dlp"])
                .env("PATH", enhanced_path())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output();

            match result {
                Ok(o) if o.status.success() => {
                    let _ = app.emit("setup-log", "yt-dlp installed successfully");
                }
                Ok(o) => {
                    let stderr = String::from_utf8_lossy(&o.stderr);
                    let _ = app.emit("setup-log", format!("yt-dlp install warning: {}", stderr));
                }
                Err(e) => {
                    let _ = app.emit("setup-log", format!("Failed to install yt-dlp: {}. Install manually: pip install yt-dlp", e));
                }
            }
        }

        if !ffmpeg {
            let _ = app.emit("setup-log", "Installing ffmpeg via winget...");
            let result = create_command("winget")
                .args(["install", "--id", "Gyan.FFmpeg", "--accept-package-agreements", "--accept-source-agreements"])
                .env("PATH", enhanced_path())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output();

            match result {
                Ok(o) if o.status.success() => {
                    let _ = app.emit("setup-log", "ffmpeg installed successfully. Restart may be required.");
                }
                Ok(o) => {
                    let stderr = String::from_utf8_lossy(&o.stderr);
                    let _ = app.emit("setup-log", format!("ffmpeg install note: {}", stderr));
                }
                Err(e) => {
                    let _ = app.emit("setup-log", format!("Failed to install ffmpeg: {}. Install manually from https://ffmpeg.org", e));
                }
            }
        }

        let _ = app.emit("setup-status", serde_json::json!({
            "ytdlp": has_command("yt-dlp"),
            "ffmpeg": has_command("ffmpeg"),
            "installing": false
        }));
    }

    serde_json::json!({
        "ytdlp": has_command("yt-dlp"),
        "ffmpeg": has_command("ffmpeg")
    })
}

#[tauri::command]
fn fetch_video_info(url: String) -> Result<VideoInfo, String> {
    let output = create_command("yt-dlp")
        .args([
            "--dump-json",
            "--no-playlist",
            "--no-warnings",
            "--no-check-certificates",
            "--socket-timeout",
            "15",
            "--extractor-retries",
            "3",
            &url,
        ])
        .env("PATH", enhanced_path())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                "yt-dlp not found. Restart the app to auto-install, or run: pip install yt-dlp".to_string()
            } else {
                format!("Failed to run yt-dlp: {}", e)
            }
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr));
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);

    let raw: serde_json::Value =
        serde_json::from_str(&stdout_str).map_err(|e| format!("JSON parse error: {}", e))?;

    let title = raw["title"].as_str().unwrap_or("Unknown").to_string();
    let thumbnail = raw["thumbnail"].as_str().unwrap_or("").to_string();
    let duration = raw["duration"].as_f64().unwrap_or(0.0);
    let uploader = raw["uploader"].as_str().unwrap_or("Unknown").to_string();
    let upload_date = raw["upload_date"].as_str().unwrap_or("").to_string();

    let formats: Vec<VideoFormat> = raw["formats"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|f| {
            let format_id = f["format_id"].as_str()?.to_string();
            let ext = f["ext"].as_str().unwrap_or("mp4").to_string();
            let resolution = f["resolution"].as_str().unwrap_or("audio only").to_string();
            let fps = f["fps"].as_f64().unwrap_or(0.0);
            let filesize = f["filesize"].as_u64().or_else(|| f["filesize_approx"].as_u64());
            let vcodec = f["vcodec"].as_str().unwrap_or("none").to_string();
            let acodec = f["acodec"].as_str().unwrap_or("none").to_string();
            let quality = f["quality"].as_f64().unwrap_or(0.0);
            let format_url = f["url"].as_str().unwrap_or("").to_string();

            Some(VideoFormat {
                format_id,
                ext,
                resolution,
                fps,
                filesize,
                vcodec,
                acodec,
                quality,
                url: format_url,
            })
        })
        .collect();

    Ok(VideoInfo {
        url,
        title,
        thumbnail,
        duration,
        uploader,
        upload_date,
        formats,
    })
}

#[tauri::command]
fn fetch_playlist_info(url: String) -> Result<PlaylistInfo, String> {
    let output = create_command("yt-dlp")
        .args([
            "--flat-playlist",
            "--dump-json",
            "--no-warnings",
            "--no-check-certificates",
            "--socket-timeout",
            "15",
            &url,
        ])
        .env("PATH", enhanced_path())
        .output()
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr));
    }

    let mut entries = Vec::new();
    let mut playlist_title = "Playlist".to_string();
    let mut playlist_uploader = "Unknown".to_string();

    for (i, line) in String::from_utf8_lossy(&output.stdout).lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(raw) = serde_json::from_str::<serde_json::Value>(line) {
            if i == 0 {
                playlist_title = raw["playlist_title"]
                    .as_str()
                    .or_else(|| raw["title"].as_str())
                    .unwrap_or("Playlist")
                    .to_string();
                playlist_uploader = raw["playlist_uploader"]
                    .as_str()
                    .or_else(|| raw["uploader"].as_str())
                    .unwrap_or("Unknown")
                    .to_string();
            }

            let entry_url = raw["url"]
                .as_str()
                .or_else(|| raw["webpage_url"].as_str())
                .unwrap_or("")
                .to_string();

            let entry_title = raw["title"].as_str().unwrap_or("Unknown").to_string();
            let entry_thumbnail = raw["thumbnail"]
                .as_str()
                .or_else(|| raw["thumbnails"].as_array().and_then(|t| t.last()).and_then(|t| t["url"].as_str()))
                .unwrap_or("")
                .to_string();
            let entry_duration = raw["duration"].as_f64().unwrap_or(0.0);

            entries.push(PlaylistEntry {
                url: entry_url,
                title: entry_title,
                thumbnail: entry_thumbnail,
                duration: entry_duration,
                index: i as u32 + 1,
            });
        }
    }

    if entries.is_empty() {
        return Err("No videos found in playlist".to_string());
    }

    let count = entries.len() as u32;

    Ok(PlaylistInfo {
        title: playlist_title,
        uploader: playlist_uploader,
        count,
        entries,
    })
}

#[tauri::command]
fn start_download(
    id: String,
    url: String,
    format_id: String,
    download_dir: Option<String>,
    proxy: Option<String>,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    {
        let mut downloads = state.downloads.lock().unwrap_or_else(|e| e.into_inner());
        downloads.insert(
            id.clone(),
            DownloadState {
                id: id.clone(),
                status: "downloading".into(),
                progress: 0.0,
                speed: "0 B/s".into(),
                eta: "--:--".into(),
            },
        );
    }
    {
        let mut tasks = state.tasks.lock().unwrap_or_else(|e| e.into_inner());
        tasks.insert(
            id.clone(),
            DownloadTaskInfo {
                id: id.clone(),
                url: url.clone(),
                format_id: format_id.clone(),
                download_dir: download_dir.clone(),
                proxy: proxy.clone(),
            },
        );
    }

    let _ = app.emit(
        "download-progress",
        serde_json::json!({
            "id": id,
            "status": "downloading",
            "progress": 0.0,
        }),
    );

    let target_dir = download_dir
        .filter(|d| !d.trim().is_empty() && std::path::Path::new(d).exists())
        .unwrap_or_else(|| {
            dirs::download_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .to_string_lossy()
                .to_string()
        });

    let output_template = format!("{}/%(title)s.%(ext)s", target_dir);

    let id_clone = id.clone();
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let ffmpeg_available = has_command("ffmpeg");

        let format_str = if format_id == "audio only" || format_id.starts_with("ba") {
            format_id.clone()
        } else if ffmpeg_available {
            format!("{}+bestaudio/{}/best", format_id, format_id)
        } else {
            format!("{}/best", format_id)
        };

        let referer = url.clone();
        let state_in_thread = app_handle.state::<AppState>();
        let (ok, out_path) = run_download_with_fallback(
            &app_handle,
            &id_clone,
            &url,
            &referer,
            &format_str,
            &output_template,
            proxy.as_deref(),
            &state_in_thread,
        );

        let _ = app_handle.emit(
            "download-progress",
            serde_json::json!({
                "id": id_clone,
                "status": if ok { "completed" } else { "failed" },
                "progress": if ok { 100.0 } else { 0.0 },
                "output_path": out_path,
            }),
        );
    });

    Ok(())
}

fn perform_quick_download(
    url: String,
    title: String,
    referer: Option<String>,
    download_dir: Option<String>,
    proxy: Option<String>,
    app: &tauri::AppHandle,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let state = app.state::<AppState>();

    {
        let mut downloads = state.downloads.lock().unwrap_or_else(|e| e.into_inner());
        downloads.insert(
            id.clone(),
            DownloadState {
                id: id.clone(),
                status: "downloading".into(),
                progress: 0.0,
                speed: "0 B/s".into(),
                eta: "--:--".into(),
            },
        );
    }
    {
        let mut tasks = state.tasks.lock().unwrap_or_else(|e| e.into_inner());
        tasks.insert(
            id.clone(),
            DownloadTaskInfo {
                id: id.clone(),
                url: url.clone(),
                format_id: "best".into(),
                download_dir: download_dir.clone(),
                proxy: proxy.clone(),
            },
        );
    }

    let _ = app.emit("quick-download-started", serde_json::json!({
        "id": id,
        "url": url,
        "title": title,
    }));

    let _ = app.emit("download-progress", serde_json::json!({
        "id": id,
        "status": "downloading",
        "progress": 0.0,
        "speed": "0 B/s",
        "eta": "--:--",
    }));

    let target_dir = download_dir
        .filter(|d| !d.trim().is_empty() && std::path::Path::new(d).exists())
        .unwrap_or_else(|| {
            dirs::download_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .to_string_lossy()
                .to_string()
        });

    let safe_title = sanitize_filename(&title);
    let output_template = if safe_title.is_empty() {
        format!("{}/%(title)s.%(ext)s", target_dir)
    } else {
        format!("{}/{}.%(ext)s", target_dir, safe_title)
    };
    let id_clone = id.clone();
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let referer_url = referer.unwrap_or_else(|| url.clone());
        let ffmpeg_available = has_command("ffmpeg");
        
        let format_str = if ffmpeg_available {
            "bv*+ba/b".to_string()
        } else {
            "best[ext=mp4]/best".to_string()
        };

        let state_in_thread = app_handle.state::<AppState>();
        let (ok, out_path) = run_download_with_fallback(
            &app_handle,
            &id_clone,
            &url,
            &referer_url,
            &format_str,
            &output_template,
            proxy.as_deref(),
            &state_in_thread,
        );

        let _ = app_handle.emit("download-progress", serde_json::json!({
            "id": id_clone,
            "status": if ok { "completed" } else { "failed" },
            "progress": if ok { 100.0 } else { 0.0 },
            "speed": "0 B/s",
            "eta": if ok { "00:00" } else { "--:--" },
            "output_path": out_path,
        }));
    });

    Ok(id)
}

#[tauri::command]
fn quick_download(
    url: String,
    title: String,
    referer: Option<String>,
    download_dir: Option<String>,
    proxy: Option<String>,
    _state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    perform_quick_download(url, title, referer, download_dir, proxy, &app)
}

#[tauri::command]
fn pause_download(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut downloads = state.downloads.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(dl) = downloads.get_mut(&id) {
        dl.status = "paused".into();
    }
    Ok(())
}

#[tauri::command]
fn resume_download(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut downloads = state.downloads.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(dl) = downloads.get_mut(&id) {
        dl.status = "downloading".into();
    }
    Ok(())
}

#[tauri::command]
fn cancel_download(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let pid = {
        let mut procs = state.processes.lock().unwrap_or_else(|e| e.into_inner());
        procs.remove(&id)
    };

    if let Some(pid) = pid {
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let mut cmd = Command::new("taskkill");
            cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
            cmd.creation_flags(0x08000000);
            let _ = cmd.output();
        }
        #[cfg(not(windows))]
        {
            let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();
        }
    }

    let mut downloads = state.downloads.lock().unwrap_or_else(|e| e.into_inner());
    downloads.remove(&id);
    let mut tasks = state.tasks.lock().unwrap_or_else(|e| e.into_inner());
    tasks.remove(&id);
    Ok(())
}

#[tauri::command]
fn retry_download(
    id: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let task = {
        let tasks = state.tasks.lock().unwrap_or_else(|e| e.into_inner());
        tasks.get(&id).cloned()
    };

    if let Some(t) = task {
        start_download(
            t.id,
            t.url,
            t.format_id,
            t.download_dir,
            t.proxy,
            state,
            app,
        )
    } else {
        Err("Download task info not found for retry".to_string())
    }
}

#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    if !std::path::Path::new(&path).exists() {
        return Err(format!("File not found: {}", path));
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", "start", "", &path]);
        cmd.creation_flags(0x08000000);
        cmd.spawn().map_err(|e| format!("Failed to open file: {}", e))?;
    }
    #[cfg(not(windows))]
    {
        let program = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
        Command::new(program)
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = Command::new("explorer");
        cmd.args(["/select,", &path]);
        cmd.creation_flags(0x08000000);
        cmd.spawn().map_err(|e| format!("Failed to show in folder: {}", e))?;
    }
    #[cfg(not(windows))]
    {
        let parent = std::path::Path::new(&path)
            .parent()
            .unwrap_or_else(|| std::path::Path::new("."));
        let program = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
        Command::new(program)
            .arg(parent)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.exists() {
        std::fs::remove_file(p).map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app.dialog().file().blocking_pick_folder();
    Ok(path.map(|p| p.to_string()))
}

fn install_chrome_extension() {
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
    if local_app_data.is_empty() { return; }

    let ext_dir = std::path::PathBuf::from(&local_app_data).join("Swift").join("Extension");
    let _ = std::fs::create_dir_all(&ext_dir);

    let files: Vec<(&str, &[u8])> = vec![
        ("manifest.json", include_bytes!("../../chrome-extension/manifest.json")),
        ("background.js", include_bytes!("../../chrome-extension/background.js")),
        ("content.js", include_bytes!("../../chrome-extension/content.js")),
        ("content.css", include_bytes!("../../chrome-extension/content.css")),
        ("popup.html", include_bytes!("../../chrome-extension/popup.html")),
        ("popup.js", include_bytes!("../../chrome-extension/popup.js")),
        ("swift.png", include_bytes!("../../chrome-extension/swift.png")),
    ];

    for (name, data) in &files {
        let _ = std::fs::write(ext_dir.join(name), data);
    }

}

#[tauri::command]
fn get_extension_dir() -> Result<String, String> {
    let local_app_data = std::env::var("LOCALAPPDATA").map_err(|e| e.to_string())?;
    let ext_dir = std::path::PathBuf::from(&local_app_data).join("Swift").join("Extension");
    install_chrome_extension();
    Ok(ext_dir.to_string_lossy().to_string())
}

fn handle_http_client(mut stream: std::net::TcpStream, app: tauri::AppHandle) {
    let _ = stream.set_read_timeout(Some(std::time::Duration::from_secs(5)));

    let mut request = String::new();
    let mut buf = [0u8; 1024];
    let mut content_length = 0;
    let mut headers_parsed = false;

    loop {
        let n = match stream.read(&mut buf) {
            Ok(n) if n > 0 => n,
            _ => break,
        };
        request.push_str(&String::from_utf8_lossy(&buf[..n]));

        if !headers_parsed {
            if let Some(pos) = request.find("\r\n\r\n") {
                headers_parsed = true;
                let headers = &request[..pos];
                for line in headers.lines() {
                    let line_lower = line.to_lowercase();
                    if line_lower.starts_with("content-length:") {
                        if let Ok(len) = line_lower[15..].trim().parse::<usize>() {
                            content_length = len;
                        }
                    }
                }
            }
        }

        if headers_parsed {
            let body_start = request.find("\r\n\r\n").unwrap() + 4;
            if request.len() - body_start >= content_length {
                break;
            }
        }
    }

    if request.is_empty() {
        return;
    }

    let first_line = request.lines().next().unwrap_or("");

    if first_line.starts_with("OPTIONS") {
        let response = "HTTP/1.1 204 No Content\r\n\
            Access-Control-Allow-Origin: *\r\n\
            Access-Control-Allow-Methods: POST, OPTIONS\r\n\
            Access-Control-Allow-Headers: Content-Type\r\n\
            Access-Control-Allow-Private-Network: true\r\n\
            Connection: close\r\n\r\n";
        let _ = stream.write_all(response.as_bytes());
        return;
    }

    if first_line.starts_with("POST") {
        let body_start = request.find("\r\n\r\n").map(|i| i + 4).unwrap_or(0);
        let body = &request[body_start..];

        if let Ok(json) = serde_json::from_str::<serde_json::Value>(body.trim()) {
            if json["token"].as_str() != Some(SWIFT_TOKEN) {
                let response = "HTTP/1.1 403 Forbidden\r\n\
                    Access-Control-Allow-Origin: *\r\n\
                    Connection: close\r\n\r\n";
                let _ = stream.write_all(response.as_bytes());
                return;
            }

            let url = json["url"].as_str().unwrap_or("");
            if !url.is_empty() {
                let title = json["title"].as_str().unwrap_or("Video").to_string();
                let referer = json["referer"].as_str().map(|s| s.to_string());

                let download_id = perform_quick_download(
                    url.to_string(),
                    title,
                    referer,
                    None,
                    None,
                    &app,
                ).unwrap_or_else(|_| "".to_string());

                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }

                let response = format!(
                    "HTTP/1.1 200 OK\r\n\
                    Access-Control-Allow-Origin: *\r\n\
                    Access-Control-Allow-Private-Network: true\r\n\
                    Content-Type: application/json\r\n\
                    Connection: close\r\n\r\n\
                    {{\"ok\":true,\"id\":\"{}\"}}",
                    download_id
                );
                let _ = stream.write_all(response.as_bytes());
                return;
            }
        }
    }

    let response = "HTTP/1.1 400 Bad Request\r\n\
        Access-Control-Allow-Origin: *\r\n\
        Connection: close\r\n\r\n";
    let _ = stream.write_all(response.as_bytes());
}

fn start_local_server(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let listener = match TcpListener::bind("127.0.0.1:17865") {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Failed to start local server: {}", e);
                return;
            }
        };

        for stream in listener.incoming() {
            let stream = match stream {
                Ok(s) => s,
                Err(_) => continue,
            };

            let app_handle = app.clone();
            std::thread::spawn(move || {
                handle_http_client(stream, app_handle);
            });
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let exe_path = std::env::current_exe().unwrap_or_default();
    let exe_name = exe_path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
    if exe_name == "ffmpeg.exe" || exe_name == "ffprobe.exe" {
        if let Some(real_exe) = find_command(&exe_name) {
            let args: Vec<String> = std::env::args().skip(1).collect();
            let mut cmd = Command::new(real_exe);
            cmd.args(&args);
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x08000000);
            }
            if let Ok(mut child) = cmd.spawn() {
                let status = child.wait().expect("failed to wait");
                std::process::exit(status.code().unwrap_or(1));
            }
        }
        std::process::exit(1);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            downloads: Mutex::new(HashMap::new()),
            processes: Mutex::new(HashMap::new()),
            tasks: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            fetch_video_info,
            fetch_playlist_info,
            start_download,
            quick_download,
            pause_download,
            resume_download,
            cancel_download,
            retry_download,
            open_file,
            show_in_folder,
            delete_file,
            pick_directory,
            check_dependencies,
            get_extension_dir,
        ])
        .setup(|app| {
            install_chrome_extension();
            start_local_server(app.handle().clone());
            spawn_ytdlp_self_update();

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_command_ytdlp() {
        let ytdlp = find_command("yt-dlp");
        assert!(ytdlp.is_some(), "yt-dlp should be discoverable in PATH or enhanced paths");
    }

    #[test]
    fn test_find_command_ffmpeg() {
        let ffmpeg = find_command("ffmpeg");
        assert!(ffmpeg.is_some(), "ffmpeg should be discoverable in PATH or WinGet packages");
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("valid_name"), "valid_name");
        assert_eq!(sanitize_filename("invalid:name*with?bad/chars"), "invalid_name_with_bad_chars");
        assert_eq!(sanitize_filename("hello <world> | test"), "hello _world_ _ test");
    }

    #[test]
    fn test_build_ytdlp_args_video_mode() {
        let args = build_ytdlp_args(
            "https://example.com/video",
            "https://example.com/video",
            "137+140",
            "C:/Downloads/%(title)s.%(ext)s",
            true, // ffmpeg available
            None,
            None,
            None,
        );

        assert!(args.contains(&"-f".to_string()));
        assert!(args.contains(&"137+140".to_string()));
        assert!(args.contains(&"--merge-output-format".to_string()));
        assert!(args.contains(&"mp4".to_string()));
        assert!(args.contains(&"--windows-filenames".to_string()));
        assert!(args.contains(&"--trim-filenames".to_string()));
        assert!(args.contains(&"160".to_string()));
        assert!(!args.contains(&"-x".to_string()), "Video mode should not contain audio extract -x");
    }

    #[test]
    fn test_build_ytdlp_args_audio_mode() {
        let args = build_ytdlp_args(
            "https://example.com/audio",
            "https://example.com/audio",
            "audio only",
            "C:/Downloads/%(title)s.%(ext)s",
            true, // ffmpeg available
            None,
            Some("socks5://127.0.0.1:1080"),
            Some("C:/wrappers"),
        );

        assert!(args.contains(&"-x".to_string()), "Audio mode must have -x");
        assert!(args.contains(&"--audio-format".to_string()));
        assert!(args.contains(&"mp3".to_string()));
        assert!(args.contains(&"--audio-quality".to_string()));
        assert!(args.contains(&"0".to_string()));
        assert!(!args.contains(&"--merge-output-format".to_string()), "Audio mode must not merge to mp4");
        assert!(args.contains(&"--proxy".to_string()));
        assert!(args.contains(&"socks5://127.0.0.1:1080".to_string()));
        assert!(args.contains(&"--ffmpeg-location".to_string()));
        assert!(args.contains(&"C:/wrappers".to_string()));
    }

    #[test]
    fn test_parse_progress_from_line() {
        let sample = "[download]  45.2% of ~  24.50MiB at   5.12MiB/s ETA 00:03";
        let parsed = parse_progress_from_line(sample);
        assert!(parsed.is_some());
        let (percent, speed, eta) = parsed.unwrap();
        assert!((percent - 45.2).abs() < 0.01);
        assert_eq!(speed, "5.12MiB/s");
        assert_eq!(eta, "00:03");

        let sample_done = "[download] 100% of 10.00MiB at 8.00MiB/s ETA 00:00";
        let (percent_done, _, _) = parse_progress_from_line(sample_done).unwrap();
        assert!((percent_done - 100.0).abs() < 0.01);

        assert!(parse_progress_from_line("Random logger line").is_none());
    }

    #[test]
    fn test_parse_destination_from_line() {
        let dest_line = "[download] Destination: C:\\Users\\test\\Downloads\\video.mp4";
        assert_eq!(
            parse_destination_from_line(dest_line),
            Some("C:\\Users\\test\\Downloads\\video.mp4".to_string())
        );

        let merger_line = "[Merger] Merging formats into \"C:\\Users\\test\\Downloads\\merged.mp4\"";
        assert_eq!(
            parse_destination_from_line(merger_line),
            Some("C:\\Users\\test\\Downloads\\merged.mp4".to_string())
        );

        let extract_line = "[ExtractAudio] Destination: C:\\Users\\test\\Downloads\\audio.mp3";
        assert_eq!(
            parse_destination_from_line(extract_line),
            Some("C:\\Users\\test\\Downloads\\audio.mp3".to_string())
        );

        let already_line = "[download] C:\\Users\\test\\Downloads\\existing.mp4 has already been downloaded";
        assert_eq!(
            parse_destination_from_line(already_line),
            Some("C:\\Users\\test\\Downloads\\existing.mp4".to_string())
        );

        assert_eq!(parse_destination_from_line("[download]  23.0% of 10MiB"), None);
    }

    #[test]
    fn test_process_tree_termination() {
        // Spawn a real sleeping child process and kill it via taskkill
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let mut cmd = Command::new("powershell");
            cmd.args(["-Command", "Start-Sleep -Seconds 30"]);
            cmd.creation_flags(0x08000000);
            if let Ok(child) = cmd.spawn() {
                let pid = child.id();
                let mut kill_cmd = Command::new("taskkill");
                kill_cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
                kill_cmd.creation_flags(0x08000000);
                let kill_res = kill_cmd.output();
                assert!(kill_res.is_ok(), "taskkill should succeed");
            }
        }
    }
}
