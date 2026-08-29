# Swift – Ultra‑Modern Video Downloader (AI Prompt)

## 🎯 Goal & Scope
Build a **cross‑platform desktop video downloader** named **Swift** that can download from **every major streaming site** (YouTube, Vimeo, Dailymotion, Twitch, Facebook, Instagram, Twitter/X, TikTok, …) in all common formats/resolutions.

The app must feature:
- **Liquid‑glass, Apple‑style UI**
- **Animated gradient background** (react‑ Three‑Fiber‑style 3‑D feel)
- **Liquid‑metal logo effect**
- **Optional 3‑D scenes** (React‑Three‑Fiber)
- **Chrome‑extension “IDM‑like” injector** that adds a one‑click download button to any visited site

---

## 🛠️ Technical Stack (pick whichever you prefer)

| Layer | Suggested Packages |
|-------|--------------------|
| **Frontend** | `react@18`, `vite`, `typescript` |
| **UI Library** | `liquid-glass-js` (or Tailwind‑based glass‑morphism) |
| **Background Shader** | `ShaderGradient` React component |
| **Liquid‑Metal Logo** | `liquid-logo` (canvas‑based) |
| **3‑D** | `@react-three/fiber`, `@react-three/drei` (optional) |
| **Desktop Packaging** | **Tauri** (Rust + Webview) – fallback to **Electron** |
| **Backend / API** | Rust `reqwest` + `serde` (YouTube/Data API), `ffmpeg.wasm` for on‑the‑fly conversion |
| **Chrome Extension** | Manifest 3, content‑script that injects a “Download with Swift” button |
| **State Mgmt** | Pinia or Redux Toolkit (optional) |
| **Styling** | CSS variables, `@font‑source‑code‑pro` |
| **Packaging** | `tauri.conf.json`, `package.json` scripts (`dev`, `build`, `tauri:dev`, `tauri:build`) |
| **Database** | SQLite (via `better‑sqlilte3` in Rust, exposed as Tauri command) |

---

## ✅ Core Features

1. **Universal URL Detection** – regex + URL parser for video‑hosting domains.
2. **Quality & Format Picker** – list all streams (1080p, 720p, 480p, 4K, audio‑only) with thumbnails.
3. **Batch Queue** – drag‑&‑drop, reorder, pause/resume, delete.
4. **Progress UI** – smooth bar, speed indicator, ETA.
5. **Integrated Media Converter** – MP4, WEBM, MP3, MKV using `ffmpeg.wasm` (resolution, bitrate, fps).
6. **Smart Filename Sugggestor** – uses title, author, upload date; custom patterns.
7. **Library & History** – local SQLite DB for metadata.
8. **Settings & Themes** – toggle glass opacity, gradient presets, download location, proxy.
9. **Privacy Mode** – optional “no‑log” mode.
10. **Chrome Extension Injector** – floating button that pre‑fetches video info and pushes it into the desktop app (via local tunnel or ngrok).

---

## 🎨 UI/UX Details

- **Apple‑style Glass Morphism** – frosted panels (`backdrop-filter: blur(20px)`), translucent borders, rounded corners (12‑16 px).
- **Animated Gradient Background** – full‑screen `<ShaderGradient />` that reacts to mouse X/Y.
- **Liquid‑Metal Logo** – `<LiquidLogo />` canvas element in header/toolbar; glossy, tilting effect.
- **3‑D Scene** – `<Canvas>` with `<Box>`/`<Mesh>` representing the Swift logo (toggle on/off).
- **Responsive Desktop Layout** – 1240 px min, fluid CSS grid.
- **Accessibility** – semantic HTML, ARIA labels, high‑contrast toggle.

---

## 📁 Suggested Code Structure (Tauri + React)