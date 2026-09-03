const SWIFT_SERVER = 'http://127.0.0.1:17865';
// Shared secret required by the Swift desktop app's local server. Must match
// SWIFT_TOKEN in src-tauri/src/lib.rs. Stops arbitrary sites from driving downloads.
const SWIFT_TOKEN = 'swift-local-a7f3e9c2';
const mediaUrls = new Map();

const M3U8_PATTERN = /\.m3u8(\?|$)/i;
const MPD_PATTERN = /\.mpd(\?|$)/i;
const TS_PATTERN = /\.ts(\?|$)/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mkv|avi|mov|flv|m4v)(\?|$)/i;
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i;
const VIDEO_HOSTS = [
  'tiktokcdn.com', 'twimg.com', 'spotify.com',
  'fbcdn.net', 'cdninstagram.com', 'sndcdn.com', 'ttvnw.net',
  'jtvnw.net', 'cloudfront.net', 'amazonaws.com', 'akamaized.net',
  'cloudflare.com', 'stackpathcdn.com', 'fastly.net'
];

function isMediaRequest(url) {
  if (!url || url.length > 2000 || url.startsWith('data:') || url.startsWith('blob:')) return false;
  if (url.includes('googlevideo.com/videoplayback')) return false;
  if (M3U8_PATTERN.test(url)) return true;
  if (MPD_PATTERN.test(url)) return true;
  if (VIDEO_EXTENSIONS.test(url)) return true;
  if (AUDIO_EXTENSIONS.test(url)) return true;
  const l = url.toLowerCase();
  return VIDEO_HOSTS.some(h => l.includes(h)) &&
    (l.includes('video') || l.includes('media') || l.includes('stream') || l.includes('playback'));
}

function formatSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function getExt(url) {
  if (M3U8_PATTERN.test(url)) return 'm3u8';
  if (MPD_PATTERN.test(url)) return 'mpd';
  if (TS_PATTERN.test(url)) return 'ts';
  const m = url.match(/\.(\w{2,5})(?:\?|$)/);
  return m ? m[1].toLowerCase() : 'mp4';
}

function getType(url) {
  if (AUDIO_EXTENSIONS.test(url)) return 'audio';
  return 'video';
}

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId < 0) return;

    const contentTypeHeader = details.responseHeaders?.find(h => h.name.toLowerCase() === 'content-type');
    const contentType = contentTypeHeader ? contentTypeHeader.value.toLowerCase() : '';
    const isMediaContent = contentType.startsWith('video/') ||
      contentType.startsWith('audio/') ||
      contentType === 'application/vnd.apple.mpegurl' ||
      contentType === 'application/dash+xml';

    if (!isMediaContent && !isMediaRequest(details.url)) return;

    if (!mediaUrls.has(details.tabId)) {
      mediaUrls.set(details.tabId, []);
    }

    const existing = mediaUrls.get(details.tabId);
    if (existing.some(m => m.url === details.url)) return;

    const contentLengthHeader = details.responseHeaders?.find(h => h.name.toLowerCase() === 'content-length');
    const size = contentLengthHeader ? parseInt(contentLengthHeader.value) : null;

    const ext = getExt(details.url);
    const type = contentType.startsWith('audio/') ? 'audio' : getType(details.url);

    if (TS_PATTERN.test(details.url)) return;

    existing.push({
      url: details.url,
      type,
      ext,
      size,
      sizeFormatted: formatSize(size),
      timestamp: Date.now()
    });

    if (existing.length > 30) existing.splice(0, existing.length - 30);

    chrome.tabs.sendMessage(details.tabId, {
      action: 'mediaDetected',
      media: { url: details.url, type, ext, size, sizeFormatted: formatSize(size) }
    }).catch(() => {});
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

chrome.tabs.onRemoved.addListener((tabId) => {
  mediaUrls.delete(tabId);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getMedia') {
    const tabId = sender.tab?.id ?? msg.tabId;
    sendResponse(mediaUrls.get(tabId) || []);
    return true;
  }
  if (msg.action === 'clearMedia') {
    const tabId = sender.tab?.id;
    if (tabId) mediaUrls.delete(tabId);
    sendResponse({ ok: true });
    return true;
  }
  if (msg.action === 'sendToSwift') {
    console.log('[Swift Extension] Sending to Swift server:', msg.url);
    fetch(SWIFT_SERVER + '/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: SWIFT_TOKEN,
        url: msg.url,
        title: msg.title || 'Video',
        referer: msg.referer || (sender.tab ? sender.tab.url : '')
      })
    })
    .then(r => r.json())
    .then(data => {
      console.log('[Swift Extension] Swift response:', data);
      sendResponse({ ok: true, data });
    })
    .catch(err => {
      console.error('[Swift Extension] Swift connection error:', err);
      sendResponse({ ok: false, error: 'Swift not running' });
    });
    return true;
  }
});
