// ============================================================
// watchlist.js — Watchlist management page
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadWatchlist();
  initSymbolLookup();
});

function initSymbolLookup() {
  const symbolInput  = document.getElementById('add-symbol');
  const marketSelect = document.getElementById('add-market');
  const nameInput    = document.getElementById('add-name');
  const suggestBox   = document.getElementById('symbol-suggestions');

  let activeIndex = -1;   // ตำแหน่งที่ไฮไลต์ด้วยคีย์บอร์ด
  let current     = [];   // รายการที่กำลังแสดง

  // ── เติมชื่อบริษัท: knowledge ก่อน, ถ้าไม่เจอ fallback Yahoo ──
  async function autoFillName() {
    const symbol = symbolInput.value.trim().toUpperCase();
    const market = marketSelect.value;
    if (!symbol) return;
    symbolInput.value = symbol;
    if (nameInput.value.trim()) return;

    const known = findStockInKnowledge(symbol, market);
    if (known) { nameInput.value = known.name; return; }

    nameInput.placeholder = 'กำลังค้นหา...';
    try {
      const res = await API.get('lookupStock', { symbol, market });
      if (res.ok && res.name && res.name !== symbol) nameInput.value = res.name;
    } catch (_) {}
    nameInput.placeholder = 'เช่น ธนาคารกสิกรไทย';
  }

  // ── render กล่อง suggestion ──
  function renderSuggestions(list) {
    current = list;
    activeIndex = -1;
    if (!list.length) { suggestBox.hidden = true; suggestBox.innerHTML = ''; return; }
    suggestBox.innerHTML = list.map((s, i) => `
      <div class="autocomplete-item" data-index="${i}">
        <span class="autocomplete-sym">${s.symbol}</span>
        <span class="market-tag market-${s.market}">${s.market}</span>
        <span class="autocomplete-name">${s.name}</span>
      </div>`).join('');
    suggestBox.hidden = false;
  }

  function showMatches() {
    // ค้นทุกตลาด เพื่อให้พิมพ์ ticker US (เช่น NVDA) ขึ้นได้แม้ตลาดยังเลือก SET อยู่
    // จัดให้หุ้นในตลาดที่เลือกอยู่ขึ้นก่อน
    const m = marketSelect.value;
    const all = searchStocksKnowledge(symbolInput.value, null);
    all.sort((a, b) => (a.market === m ? -1 : 1) - (b.market === m ? -1 : 1));
    renderSuggestions(all.slice(0, 12));
  }

  function pick(stock) {
    symbolInput.value = stock.symbol;
    marketSelect.value = stock.market;
    nameInput.value = stock.name;
    suggestBox.hidden = true;
  }

  function highlight(idx) {
    const items = suggestBox.querySelectorAll('.autocomplete-item');
    items.forEach((el, i) => el.classList.toggle('active', i === idx));
    if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
  }

  // ── events ──
  symbolInput.addEventListener('input', () => { nameInput.value = ''; showMatches(); });
  symbolInput.addEventListener('focus', showMatches);

  symbolInput.addEventListener('keydown', (e) => {
    if (suggestBox.hidden) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault(); activeIndex = Math.min(activeIndex + 1, current.length - 1); highlight(activeIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); highlight(activeIndex);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && current[activeIndex]) { e.preventDefault(); pick(current[activeIndex]); }
    } else if (e.key === 'Escape') {
      suggestBox.hidden = true;
    }
  });

  suggestBox.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (!item) return;
    e.preventDefault();
    pick(current[Number(item.dataset.index)]);
  });

  // change = ออกจากช่อง → เติมชื่อให้ (กรณีพิมพ์เองไม่ได้เลือกจากลิสต์)
  symbolInput.addEventListener('change', autoFillName);

  // ปิดกล่องเมื่อคลิกที่อื่น
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#symbol-autocomplete')) suggestBox.hidden = true;
  });

  marketSelect.addEventListener('change', () => {
    nameInput.value = '';
    autoFillName();
  });
}

async function loadWatchlist() {
  const el = document.getElementById('watchlist-content');
  el.innerHTML = `<div class="loading-overlay"><div class="big-spinner"></div><p>กำลังโหลด...</p></div>`;

  try {
    const res = await API.get('getWatchlist');
    if (!res.ok) throw new Error(res.error);
    renderWatchlist(res.watchlist || []);
  } catch (e) {
    el.innerHTML = `<div class="alert alert-error">❌ ${e.message}</div>`;
  }
}

function renderWatchlist(list) {
  const el = document.getElementById('watchlist-content');

  if (!list.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">👀</div>
        <p>ยังไม่มีหุ้นใน Watchlist<br>เพิ่มหุ้นที่สนใจด้านล่าง</p>
      </div>`;
    return;
  }

  const rows = list.map(w => `
    <tr>
      <td>
        <strong>${w.symbol}</strong>
        <span class="market-tag market-${w.market}" style="margin-left:.4rem">${w.market}</span>
      </td>
      <td>${w.name || w.symbol}</td>
      <td>${fmtDate(w.added_date)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="removeSymbol('${w.symbol}', this)">
          🗑 ลบ
        </button>
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Symbol</th><th>ชื่อหุ้น</th><th>วันที่เพิ่ม</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function addSymbol(btn) {
  const symbol = document.getElementById('add-symbol').value.trim().toUpperCase();
  const name   = document.getElementById('add-name').value.trim();
  const market = document.getElementById('add-market').value;

  if (!symbol) return showToast('กรุณาระบุ Symbol', 'error');

  setLoading(btn, true, 'กำลังเพิ่ม...');
  clearResult('add-result');

  try {
    const res = await API.post({ action: 'addWatchlist', symbol, name: name || symbol, market });
    if (res.ok) {
      showToast(`✅ เพิ่ม ${symbol} สำเร็จ`, 'success');
      document.getElementById('add-symbol').value = '';
      document.getElementById('add-name').value   = '';
      await loadWatchlist();
    } else {
      document.getElementById('add-result').innerHTML = `<div class="alert alert-error">❌ ${res.error}</div>`;
    }
  } catch (e) {
    document.getElementById('add-result').innerHTML = `<div class="alert alert-error">❌ ${e.message}</div>`;
  } finally {
    setLoading(btn, false);
  }
}

async function removeSymbol(symbol, btn) {
  if (!confirm(`ลบ ${symbol} ออกจาก Watchlist?`)) return;
  setLoading(btn, true, 'ลบ...');

  try {
    const res = await API.post({ action: 'removeWatchlist', symbol });
    if (res.ok) {
      showToast(`ลบ ${symbol} แล้ว`, 'info');
      await loadWatchlist();
    } else {
      showToast('❌ ' + res.error, 'error');
    }
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

function clearResult(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '';
}
