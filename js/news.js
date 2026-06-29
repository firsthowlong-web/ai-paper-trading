// ============================================================
// news.js — Team news input page
// ============================================================

document.addEventListener('DOMContentLoaded', loadRecentNews);

async function loadRecentNews() {
  const el = document.getElementById('recent-news');
  el.innerHTML = `<div class="loading-overlay"><div class="big-spinner"></div><p>กำลังโหลด...</p></div>`;

  try {
    const res = await API.get('getDashboard');
    if (!res.ok) throw new Error(res.error);
    renderRecentNews(res.news || []);

    // Populate symbol dropdown from watchlist
    const wl = await API.get('getWatchlist');
    if (wl.ok && wl.watchlist) populateSymbols(wl.watchlist);
  } catch (e) {
    el.innerHTML = `<div class="alert alert-error">❌ ${e.message}</div>`;
  }
}

function populateSymbols(watchlist) {
  const sel = document.getElementById('news-symbol');
  const extra = watchlist
    .map(w => `<option value="${w.symbol}">${w.symbol} (${w.market}) — ${w.name || ''}</option>`)
    .join('');
  sel.innerHTML = `<option value="MARKET">ตลาดโดยรวม (MARKET)</option>${extra}`;
}

function renderRecentNews(news) {
  const el = document.getElementById('recent-news');
  if (!news.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">📰</div><p>ยังไม่มีข่าว</p></div>`;
    return;
  }

  const items = news.slice(0, 15).map(n => `
    <div class="news-item">
      <div class="news-item-title">${n.title || '(ไม่มีหัวข้อ)'}</div>
      <div class="news-item-meta">
        <span class="badge ${n.source === 'ai' ? 'badge-blue' : 'badge-gray'}">
          ${n.source === 'ai' ? '🤖 AI' : '👤 ทีม'}
        </span>
        <span class="badge badge-gray" style="margin-left:.3rem">${n.symbol || 'MARKET'}</span>
        <span style="margin-left:.5rem;color:var(--text2)">${fmtDate(n.date)}</span>
      </div>
      ${n.content ? `<div class="news-item-content">${n.content}</div>` : ''}
      ${n.url ? `<a href="${n.url}" target="_blank" style="font-size:.78rem;color:var(--primary)">🔗 อ่านต่อ</a>` : ''}
    </div>`).join('');

  el.innerHTML = `<div class="news-list">${items}</div>`;
}

async function submitNews(btn) {
  const symbol  = document.getElementById('news-symbol').value;
  const title   = document.getElementById('news-title').value.trim();
  const content = document.getElementById('news-content').value.trim();
  const url     = document.getElementById('news-url').value.trim();

  if (!title && !content) return showToast('กรุณากรอกหัวข้อหรือเนื้อหาข่าว', 'error');

  setLoading(btn, true, 'กำลังบันทึก...');
  clearResult('news-result');

  try {
    const res = await API.post({
      action: 'addNews', symbol, title, content, url, source: 'team'
    });

    if (res.ok) {
      showToast('✅ บันทึกข่าวสำเร็จ', 'success');
      document.getElementById('news-title').value   = '';
      document.getElementById('news-content').value = '';
      document.getElementById('news-url').value     = '';
      await loadRecentNews();
    } else {
      document.getElementById('news-result').innerHTML =
        `<div class="alert alert-error">❌ ${res.error}</div>`;
    }
  } catch (e) {
    document.getElementById('news-result').innerHTML =
      `<div class="alert alert-error">❌ ${e.message}</div>`;
  } finally {
    setLoading(btn, false);
  }
}

function clearResult(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '';
}
