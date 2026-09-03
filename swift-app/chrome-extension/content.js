(() => {
  if (window.__swift) return;
  window.__swift = true;

  const isYouTube = window.location.hostname.includes('youtube.com') || window.location.hostname.includes('youtu.be');

  let fab = null;
  let dropdown = null;
  let currentVideo = null;
  let media = [];
  let hideTimer = null;
  let idleTimer = null;
  let isDismissed = false;
  let isHovered = false;

  function isMedia(url) {
    if (!url || url.length > 2000 || url.startsWith('data:') || url.startsWith('blob:')) return false;
    return /\.(mp4|webm|mkv|mov|flv|m4v|m3u8|mpd|mp3|m4a|aac|wav|ogg|flac)(\?|$)/i.test(url) ||
      (/twimg|tiktokcdn|fbcdn|cdninstagram|sndcdn|ttvnw|jtvnw|akamaized|cloudflare|cloudfront|fastly/i.test(url) &&
       /video|media|stream|playback|\.m3u8|\.mpd/i.test(url));
  }

  function getExt(url) {
    if (/\.m3u8(\?|$)/i.test(url)) return 'm3u8';
    if (/\.mpd(\?|$)/i.test(url)) return 'mpd';
    if (/\.ts(\?|$)/i.test(url)) return 'ts';
    const m = url.match(/\.(\w{2,5})(?:\?|$)/);
    return m ? m[1].toLowerCase() : 'mp4';
  }

  function guessQuality(url) {
    const l = url.toLowerCase();
    if (l.includes('2160') || l.includes('4k')) return '2160p';
    if (l.includes('1440')) return '1440p';
    if (l.includes('1080')) return '1080p';
    if (l.includes('720')) return '720p';
    if (l.includes('480')) return '480p';
    if (l.includes('360')) return '360p';
    return '';
  }

  function fmtSize(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024 | 0) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }

  function addMedia(item) {
    if (item.ext === 'ts') return;
    if (media.some(m => m.url === item.url)) return;
    media.push(item);
  }

  function showFAB() {
    if (isDismissed || !fab || !currentVideo) return;
    fab.classList.add('swift-visible');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!isHovered && (!dropdown || !dropdown.classList.contains('swift-show'))) {
        fab.classList.remove('swift-visible');
      }
    }, 3200);
  }

  function hideFABImmediate() {
    if (!isHovered && (!dropdown || !dropdown.classList.contains('swift-show'))) {
      fab?.classList.remove('swift-visible');
    }
  }

  function createFAB() {
    if (fab) return;
    fab = document.createElement('div');
    fab.id = 'swift-fab';
    fab.innerHTML = `
      <div class="swift-fab-content" title="Download this video with Swift">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" class="swift-bolt">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ef4444" />
        </svg>
        <span class="swift-fab-text">Download Video</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="swift-chevron">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <button type="button" class="swift-fab-close" title="Dismiss for this session">×</button>
    `;

    fab.querySelector('.swift-fab-content').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleDropdown();
    });

    fab.querySelector('.swift-fab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      isDismissed = true;
      fab.classList.remove('swift-visible', 'swift-has-media');
      if (dropdown) dropdown.classList.remove('swift-show');
    });

    fab.addEventListener('mouseenter', () => {
      isHovered = true;
      clearTimeout(hideTimer);
      clearTimeout(idleTimer);
    });

    fab.addEventListener('mouseleave', () => {
      isHovered = false;
      showFAB();
      startHideDropdown();
    });

    document.documentElement.appendChild(fab);

    // Continuous smooth position tracking strictly on the active video
    const track = () => {
      if (fab && currentVideo && !isDismissed) {
        const rect = currentVideo.getBoundingClientRect();
        if (rect.width > 120 && rect.height > 80 && rect.bottom > 0 && rect.top < window.innerHeight) {
          const top = Math.max(8, rect.top + 10);
          const left = Math.max(8, rect.right - fab.offsetWidth - 12);
          fab.style.top = top + 'px';
          fab.style.left = left + 'px';
        }
      }

      if (dropdown && dropdown.classList.contains('swift-show') && fab) {
        const rect = fab.getBoundingClientRect();
        let dTop = rect.bottom + 6;
        let dLeft = rect.right - dropdown.offsetWidth;
        
        if (dTop + dropdown.offsetHeight > window.innerHeight) {
          dTop = Math.max(6, rect.top - dropdown.offsetHeight - 6);
        }
        if (dLeft < 8) {
          dLeft = 8;
        }
        
        dropdown.style.top = dTop + 'px';
        dropdown.style.left = dLeft + 'px';
      }
      requestAnimationFrame(track);
    };
    requestAnimationFrame(track);
  }

  function startHideDropdown() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (dropdown && !dropdown.matches(':hover') && (!fab || !fab.matches(':hover'))) {
        dropdown.classList.remove('swift-show');
        hideFABImmediate();
      }
    }, 400);
  }

  function scanVideoSources(videoEl) {
    const urls = [];
    if (videoEl.src && isMedia(videoEl.src)) urls.push(videoEl.src);
    if (videoEl.currentSrc && isMedia(videoEl.currentSrc)) urls.push(videoEl.currentSrc);
    videoEl.querySelectorAll('source').forEach(s => {
      if (s.src && isMedia(s.src)) urls.push(s.src);
    });
    for (const url of urls) {
      const ext = getExt(url);
      if (ext === 'ts') continue;
      addMedia({ url, type: 'video', ext, quality: guessQuality(url), size: null });
    }
  }

  function getVideoMedia() {
    const items = [];
    if (isYouTube) {
      items.push({
        url: window.location.href,
        type: 'video',
        ext: 'mp4',
        quality: '1080p / Best Stream',
        size: null,
      });
      items.push({
        url: window.location.href,
        type: 'audio',
        ext: 'mp3',
        quality: 'Audio Only (MP3)',
        size: null,
      });
      return items;
    }

    if (!currentVideo) return media;
    const urls = new Set();
    if (currentVideo.src && isMedia(currentVideo.src)) urls.add(currentVideo.src);
    if (currentVideo.currentSrc && isMedia(currentVideo.currentSrc)) urls.add(currentVideo.currentSrc);
    for (const url of urls) {
      const ext = getExt(url);
      if (ext === 'ts') continue;
      if (!items.some(m => m.url === url)) {
        items.push({ url, type: 'video', ext, quality: guessQuality(url), size: null });
      }
    }
    for (const m of media) {
      if (!items.some(i => i.url === m.url)) items.push(m);
    }
    return items;
  }

  function sendToSwift(btn, streamUrl) {
    const urlToSend = streamUrl || window.location.href;
    const payload = {
      action: 'sendToSwift',
      url: urlToSend,
      title: document.title || 'Video',
      referer: window.location.href
    };

    const markSuccess = () => {
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.title = 'Sent to Swift!';
      setTimeout(() => {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        btn.title = 'Download with Swift';
      }, 2000);
    };

    const markFailure = (err) => {
      console.warn('[Swift Extension] Download request failed:', err);
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';
      btn.title = 'Swift not responding - make sure Swift is open';
      setTimeout(() => {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        btn.title = 'Download with Swift';
      }, 2500);
    };

    try {
      chrome.runtime.sendMessage(payload, (res) => {
        if (chrome.runtime.lastError || !res || !res.ok) {
          fetch('http://127.0.0.1:17865/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: 'swift-local-a7f3e9c2',
              url: payload.url,
              title: payload.title,
              referer: payload.referer
            })
          })
          .then(r => r.json())
          .then(data => {
            if (data && data.ok) markSuccess();
            else markFailure('Server returned not ok');
          })
          .catch(markFailure);
        } else {
          markSuccess();
        }
      });
    } catch (e) {
      fetch('http://127.0.0.1:17865/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'swift-local-a7f3e9c2',
          url: payload.url,
          title: payload.title,
          referer: payload.referer
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data && data.ok) markSuccess();
        else markFailure('Server returned not ok');
      })
      .catch(markFailure);
    }
  }

  function toggleDropdown() {
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'swift-dropdown';
      dropdown.addEventListener('mouseenter', () => {
        isHovered = true;
        clearTimeout(hideTimer);
        clearTimeout(idleTimer);
      });
      dropdown.addEventListener('mouseleave', () => {
        isHovered = false;
        startHideDropdown();
      });
      document.body.appendChild(dropdown);
    }

    if (dropdown.classList.contains('swift-show')) {
      dropdown.classList.remove('swift-show');
      return;
    }

    const items = getVideoMedia();
    const unique = [];
    const seen = new Set();
    for (const m of items) {
      const key = m.url + m.ext + (m.quality || '');
      if (!seen.has(key)) { seen.add(key); unique.push(m); }
    }

    if (unique.length === 0) {
      dropdown.innerHTML = '<div class="swift-dd-empty">No direct streams detected</div>';
    } else {
      dropdown.innerHTML = `
        <div class="swift-dd-header">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ef4444" /></svg>
          <span>${unique.length} stream${unique.length !== 1 ? 's' : ''} detected</span>
        </div>
        <div class="swift-dd-body">
          ${unique.map((m, i) => `
            <div class="swift-dd-item" data-i="${i}">
              <span class="swift-dd-format">${m.ext.toUpperCase()}</span>
              <div class="swift-dd-details">
                <div class="swift-dd-quality">${m.quality || (m.ext === 'm3u8' ? 'HLS Adaptive Stream' : (m.ext === 'mpd' ? 'DASH Adaptive Stream' : 'Direct Video'))}</div>
                <div class="swift-dd-meta">${m.size ? fmtSize(m.size) : (m.ext === 'm3u8' || m.ext === 'mpd' ? 'Multi-Bitrate Stream' : 'Media')}</div>
              </div>
              <button class="swift-dd-download" data-i="${i}" title="Send to Swift">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            </div>
          `).join('')}
          <div class="swift-dd-item swift-dd-page" data-i="page">
            <span class="swift-dd-format" style="background:rgba(220,38,38,0.15);color:#ef4444;">PAGE</span>
            <div class="swift-dd-details">
              <div class="swift-dd-quality">Download Full Page URL</div>
              <div class="swift-dd-meta">${window.location.hostname}</div>
            </div>
            <button class="swift-dd-download" data-i="page" title="Send page to Swift">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>
        </div>
      `;

      dropdown.querySelectorAll('.swift-dd-item').forEach(row => {
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          const btn = row.querySelector('.swift-dd-download') || row;
          const idx = row.dataset.i;
          if (idx === 'page') {
            sendToSwift(btn, null);
          } else {
            const item = unique[+idx];
            sendToSwift(btn, item ? item.url : null);
          }
        });
      });
    }

    dropdown.classList.add('swift-show');
  }

  // Hook mouse events on video to show panel on hover and fade when idle
  function attachVideoListeners(videoEl) {
    if (videoEl.__swift_listeners) return;
    videoEl.__swift_listeners = true;

    const onHover = () => {
      showFAB();
    };

    videoEl.addEventListener('mousemove', onHover, { passive: true });
    videoEl.addEventListener('mouseenter', onHover, { passive: true });
    if (videoEl.parentElement) {
      videoEl.parentElement.addEventListener('mousemove', onHover, { passive: true });
      videoEl.parentElement.addEventListener('mouseenter', onHover, { passive: true });
    }
  }

  document.addEventListener('mousemove', (e) => {
    if (isDismissed || !fab || !currentVideo) return;
    const rect = currentVideo.getBoundingClientRect();
    if (
      e.clientX >= rect.left - 15 &&
      e.clientX <= rect.right + 15 &&
      e.clientY >= rect.top - 15 &&
      e.clientY <= rect.bottom + 15
    ) {
      showFAB();
    }
  }, { passive: true });

  // Scan only for substantial playing videos in this frame
  setInterval(() => {
    if (isDismissed) return;

    const videos = Array.from(document.querySelectorAll('video'));
    let best = null;
    let maxArea = 0;

    for (const v of videos) {
      // Must be a visible player of substantial size (not a 1x1 tracking pixel)
      const rect = v.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (rect.width >= 160 && rect.height >= 90 && area > maxArea) {
        maxArea = area;
        best = v;
      }
    }

    if (best) {
      currentVideo = best;
      attachVideoListeners(best);
      scanVideoSources(best);

      if (!fab) {
        createFAB();
      }
      fab.classList.add('swift-has-media');
    } else {
      // NO video in this frame: NEVER show the FAB here!
      // This eliminates duplicate FABs in parent wrapper frames!
      if (fab) {
        fab.classList.remove('swift-has-media', 'swift-visible');
        if (dropdown) dropdown.classList.remove('swift-show');
      }
    }
  }, 1000);

  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target) && !fab?.contains(e.target)) {
      dropdown.classList.remove('swift-show');
      hideFABImmediate();
    }
  });

  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if ((e.initiatorType === 'xmlhttprequest' || e.initiatorType === 'fetch' || e.initiatorType === 'media') && isMedia(e.name)) {
          const ext = getExt(e.name);
          if (ext === 'ts') continue;
          addMedia({ url: e.name, type: 'video', ext, quality: guessQuality(e.name), size: e.transferSize || null });
        }
      }
    });
    po.observe({ entryTypes: ['resource'] });
  } catch {}

  const origFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && (/\.m3u8/i.test(url) || /\.mpd/i.test(url))) {
      const ext = getExt(url);
      addMedia({ url, type: 'video', ext, quality: guessQuality(url), size: null });
    }
    return origFetch.apply(this, args);
  };

  const origXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (typeof url === 'string' && (/\.m3u8/i.test(url) || /\.mpd/i.test(url))) {
      const ext = getExt(url);
      addMedia({ url, type: 'video', ext, quality: guessQuality(url), size: null });
    }
    return origXHROpen.apply(this, [method, url, ...rest]);
  };

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'mediaDetected' && msg.media) {
      if (msg.media.ext !== 'ts') addMedia(msg.media);
    }
  });

  chrome.runtime.sendMessage({ action: 'getMedia' }, res => {
    if (Array.isArray(res)) res.forEach(m => { if (m.ext !== 'ts') addMedia(m); });
  });
})();
