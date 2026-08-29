function render(rawItems, pageUrl, pageTitle) {
  const items = [];
  const seen = new Set();
  for (const m of rawItems) {
    const key = m.ext + (m.quality || '');
    if (!seen.has(key)) { seen.add(key); items.push(m); }
  }

  const list = document.getElementById('list');
  const count = document.getElementById('count');
  count.textContent = items.length;

  if (!items.length) {
    list.innerHTML = '<div class="empty">No media detected. Play a video to capture streams.</div>';
    return;
  }

  list.innerHTML = items.map((m, i) => {
    const label = [m.quality || m.type, m.size ? fmtSize(m.size) : ''].filter(Boolean).join(' · ') || 'Stream';
    return `
      <div class="item">
        <span class="fmt">${m.ext || 'mp4'}</span>
        <div class="details">
          <div class="quality">${label}</div>
          <div class="meta">${truncate(m.url)}</div>
        </div>
        <button class="dl-btn" data-i="${i}" title="Send to Swift">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>`;
  }).join('');

  list.innerHTML += `
      <div class="item page-btn">
        <span class="fmt" style="background:rgba(220,38,38,0.1);color:#ef4444;border-color:rgba(220,38,38,0.2);">PAGE</span>
        <div class="details">
          <div class="quality">Download this page</div>
          <div class="meta">${truncate(pageUrl)}</div>
        </div>
        <button class="dl-btn" id="dl-page" title="Send page to Swift">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>`;

  const handleDownload = (btn, url) => {
    chrome.runtime.sendMessage({
      action: 'sendToSwift',
      url: url,
      title: pageTitle || 'Video',
      referer: pageUrl
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
  };

  list.querySelectorAll('.dl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id === 'dl-page') {
        handleDownload(btn, pageUrl);
      } else {
        const m = items[+btn.dataset.i];
        handleDownload(btn, m.url);
      }
    });
  });
}

function fmtSize(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024 | 0) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

function truncate(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const p = u.pathname.length > 40 ? u.pathname.slice(0, 40) + '...' : u.pathname;
    return u.hostname + p;
  } catch {
    return url.length > 60 ? url.slice(0, 60) + '...' : url;
  }
}

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs[0];
  chrome.runtime.sendMessage({ action: 'getMedia', tabId: tab.id }, (items) => {
    render(items || [], tab.url, tab.title);
  });
});

document.getElementById('clear').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.runtime.sendMessage({ action: 'clearMedia', tabId: tabs[0].id }, () => render([], tabs[0].url, tabs[0].title));
  });
});
