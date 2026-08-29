# Swift

A cross-platform desktop video downloader with a premium liquid-glass UI, capable of downloading from every major streaming site.

Built with [Tauri](https://tauri.app) (Rust + WebView2) and React.

## Features

- **Universal Video Download** — YouTube, Vimeo, Dailymotion, Twitch, Instagram, TikTok, X, and more
- **Quality Picker** — choose from 4K, 1080p, 720p, 480p, audio-only
- **Batch Queue** — drag-and-drop, reorder, pause/resume, delete
- **Integrated Converter** — MP4, WEBM, MP3, MKV via ffmpeg.wasm
- **Liquid Glass UI** — Apple-style glass-morphism design with animated gradient backgrounds
- **Chrome Extension** — one-click download button injected into any video site

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Tauri (Rust) |
| Frontend | React 18, TypeScript |
| 3D Effects | React Three Fiber (optional) |
| Media Processing | ffmpeg.wasm |
| State Management | Zustand |

## Status

🚧 In development — planning and prototyping phase.

## Development

```bash
npm install
npm run dev          # Vite dev server
npm run tauri dev    # Full desktop app
```
