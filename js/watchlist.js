// ============================================================
// watchlist.js — Watchlist management page
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadWatchlist();
  initSymbolLookup();
});

function initSymbolLookup() {
  const symbolInput = document.getElementById('add-symbol');
  const marketSelect = document.getElementById('add-market');

  async function autoFillName() {
    const symbol = symbolInput.value.trim().toUpperCase();
    const market = marketSelect.value;
    const nameInput = document.getElementById('add-name');
    if (!symbol) return;
    symbolInput.value = symbol;
    if (nameInput.value.trim()) return;

    nameInput.placeholder = 'กำลังค้นหา...';
    try {
      const res = await API.get('lookupStock', { symbol, market });
      if (res.ok && res.name && res.name !== symbol) {
        nameInput.value = res.name;
      }
    } catch (_) {}
    nameInput.placeholder = 'เช่น ธนาคารกสิกรไทย';
  }

  symbolInput.addEventListener('change', autoFillName);
  marketSelect.addEventListener('change', () => {
    document.getElementById('add-name').value = '';
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
