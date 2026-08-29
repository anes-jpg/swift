# Swift — Video Downloader

A cross-platform desktop video downloader with a modern glass-morphism UI, built with Tauri + React.

## Features

- **Universal URL Support** — Paste any video URL from YouTube, TikTok, Twitter, Vimeo, and more
- **Playlist Support** — Download entire playlists with one click
- **Quality Picker** — Choose from all available formats and resolutions
- **Batch Downloads** — Queue multiple videos with progress tracking
- **Chrome Extension** — IDM-style floating button that detects videos on any page
- **Auto Dependencies** — Automatically installs yt-dlp and ffmpeg if missing
- **MP4 Merge** — Combines video + audio streams into a single MP4 file

## Requirements

- Windows 10/11
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — auto-installed on first launch
- [ffmpeg](https://ffmpeg.org) — auto-installed via winget on first launch

## Installation

Download the latest `.exe` installer from Releases and run it.

## Development

```bash
cd swift-app
npm install
npm run tauri:dev
```

## Chrome Extension

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `chrome-extension` folder

Hover over any video to see the download button. Click to send the URL to the Swift desktop app.

## Building

```bash
npm run tauri:build
```

The NSIS installer will be in `src-tauri/target/release/bundle/nsis/`.

## Known Issues

- **DRM-protected sites (Netflix, Disney+, etc.)** — Videos protected by Widevine/PlayReady DRM cannot be downloaded. This is by design; Swift does not circumvent DRM.
- **Protected HLS streams** — Token-authenticated HLS streams are now downloaded through yt-dlp with the page's Referer, User-Agent, and browser cookies (Chrome/Edge/Firefox/Brave, tried in turn). If a stream's token expires mid-download it may still fail — retry from the page while the video is playing.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Rust, Tauri 2
- **Download Engine:** yt-dlp, ffmpeg
- **Extension:** Chrome Manifest V3

## License

MIT
