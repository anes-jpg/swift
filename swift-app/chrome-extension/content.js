(() => {
  if (window.__swift) return;
  if (window.location.hostname.includes('youtube.com') || window.location.hostname.includes('youtu.be')) {
    return;
  }
  window.__swift = true;

  let fab = null;
  let dropdown = null;
  let currentVideo = null;
  let media = [];
  let hideTimer = null;

  function isMedia(url) {
    if (!url || url.length > 2000 || url.startsWith('data:') || url.startsWith('blob:')) return false;
    return /\.(mp4|webm|mkv|mov|flv|m4v|m3u8|mp3|m4a|aac|wav|ogg|flac)(\?|$)/i.test(url) ||
      (/twimg|tiktokcdn|fbcdn|cdninstagram|sndcdn|ttvnw|jtvnw|akamaized|cloudflare|cloudfront|fastly/i.test(url) &&
       /video|media|stream|playback|\.m3u8/i.test(url));
  }

  function getExt(url) {
    if (/\.m3u8(\?|$)/i.test(url)) return 'm3u8';
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

  function createFAB() {
    if (fab) return;
    fab = document.createElement('div');
    fab.id = 'swift-fab';
    fab.innerHTML = `
      <img src="${chrome.runtime.getURL('swift.png')}" width="16" height="16" style="border-radius:3px;">
      <span style="font-weight: 500;">Download</span>
    `;
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleDropdown();
    });
    fab.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    fab.addEventListener('mouseleave', startHide);
    document.documentElement.appendChild(fab);

    const track = () => {
      if (fab.classList.contains('swift-has-media')) {
        if (currentVideo && currentVideo.offsetWidth > 50 && currentVideo.offsetHeight > 50) {
          const rect = currentVideo.getBoundingClientRect();
          fab.style.top = (rect.top + 12) + 'px';
          fab.style.left = (rect.right - fab.offsetWidth - 12) + 'px';
        } else {
          fab.style.top = (window.innerHeight - fab.offsetHeight - 24) + 'px';
          fab.style.left = (window.innerWidth - fab.offsetWidth - 24) + 'px';
        }
      }
      if (dropdown && dropdown.classList.contains('swift-show') && fab) {
        const rect = fab.getBoundingClientRect();
        let dTop = rect.bottom + 4;
        let dLeft = rect.right - dropdown.offsetWidth;
        
        if (dTop + dropdown.offsetHeight > window.innerHeight) {
          dTop = rect.top - dropdown.offsetHeight - 4;
        }
        if (dLeft < 0) {
          dLeft = 4;
        }
        
        dropdown.style.top = dTop + 'px';
        dropdown.style.left = dLeft + 'px';
      }
      requestAnimationFrame(track);
    };
    requestAnimationFrame(track);
  }

  function positionNearVideo(video) {
    // Handled by requestAnimationFrame loop
  }

  function showFAB(video) {
    if (!fab) createFAB();
    currentVideo = video;
    scanVideoSources(video);
    positionNearVideo(video);
    fab.classList.add('swift-has-media');
  }

  function hideFAB() {
    if (fab) fab.classList.remove('swift-has-media');
    if (dropdown) dropdown.classList.remove('swift-show');
    currentVideo = null;
  }

  function startHide() {
    hideTimer = setTimeout(hideFAB, 800);
  }

  function scanVideoSources(video) {
    if (!video) return;
    const urls = new Set();
    if (video.src && isMedia(video.src)) urls.add(video.src);
    if (video.currentSrc && isMedia(video.currentSrc)) urls.add(video.currentSrc);
    video.querySelectorAll('source').forEach(s => {
      if (s.src && isMedia(s.src)) urls.add(s.src);
    });
    for (const url of urls) {
      const ext = getExt(url);
      if (ext === 'ts') continue;
      addMedia({ url, type: 'video', ext, quality: guessQuality(url), size: null });
    }
  }

  function getVideoMedia() {
    if (!currentVideo) return media;
    const urls = new Set();
    const items = [];
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
    chrome.runtime.sendMessage({
      action: 'sendToSwift',
      url: urlToSend,
      title: document.title || 'Video',
      referer: window.location.href
    }, (res) => {
      if (res && res.ok) {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        }, 1500);
      } else {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';
        btn.title = 'Start Swift app first';
        setTimeout(() => {
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
          btn.title = 'Download';
        }, 2500);
      }
    });
  }

  function toggleDropdown() {
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'swift-dropdown';
      dropdown.addEventListener('mouseenter', () => clearTimeout(hideTimer));
      dropdown.addEventListener('mouseleave', startHide);
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
      const key = m.ext + (m.quality || '');
      if (!seen.has(key)) { seen.add(key); unique.push(m); }
    }

    if (unique.length === 0) {
      dropdown.innerHTML = '<div class="swift-dd-empty">No streams detected</div>';
    } else {
      dropdown.innerHTML = `
        <div class="swift-dd-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${unique.length} stream${unique.length !== 1 ? 's' : ''}
        </div>
        <div class="swift-dd-body">
          ${unique.map((m, i) => `
            <div class="swift-dd-item" data-i="${i}">
              <span class="swift-dd-format">${m.ext}</span>
              <div class="swift-dd-details">
                <div class="swift-dd-quality">${m.quality || (m.ext === 'm3u8' ? 'HLS Stream' : 'Video')}</div>
                <div class="swift-dd-meta">${m.size ? fmtSize(m.size) : m.ext.toUpperCase()}</div>
              </div>
              <button class="swift-dd-download" data-i="${i}" title="Send to Swift">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            </div>
          `).join('')}
          <div class="swift-dd-item swift-dd-page" data-i="page">
            <span class="swift-dd-format" style="background:rgba(220,38,38,0.1);color:#ef4444;">PAGE</span>
            <div class="swift-dd-details">
              <div class="swift-dd-quality">Download this page</div>
              <div class="swift-dd-meta">${window.location.hostname}</div>
            </div>
            <button class="swift-dd-download" data-i="page" title="Send page to Swift">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>
        </div>
      `;

      dropdown.querySelectorAll('.swift-dd-download').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = btn.dataset.i;
          if (idx === 'page') {
            sendToSwift(btn, null);
          } else {
            const item = unique[+idx];
            sendToSwift(btn, item ? item.url : null);
          }
        });
      });
    }

    if (fab) {
      // Position is updated by the requestAnimationFrame loop in createFAB
    }
    dropdown.classList.add('swift-show');
  }

  setInterval(() => {
    const mediaElements = Array.from(document.querySelectorAll('video, audio'));
    let best = null;
    let maxArea = 0;
    for (const el of mediaElements) {
      const area = el.offsetWidth * el.offsetHeight;
      if (area > maxArea) { maxArea = area; best = el; }
    }
    
    if (!best && mediaElements.length > 0) best = mediaElements[0];
    
    if (best || media.length > 0) {
      if (!fab) createFAB();
      currentVideo = best;
      if (best) scanVideoSources(best);
      fab.classList.add('swift-has-media');
    }
  }, 1500);

  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target) && !fab?.contains(e.target)) {
      dropdown.classList.remove('swift-show');
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
    if (url && /\.m3u8/i.test(url)) {
      addMedia({ url, type: 'video', ext: 'm3u8', quality: guessQuality(url), size: null });
    }
    return origFetch.apply(this, args);
  };

  const origXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (typeof url === 'string' && /\.m3u8/i.test(url)) {
      addMedia({ url, type: 'video', ext: 'm3u8', quality: guessQuality(url), size: null });
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
