// ============================================================
// trade.js — Trade page (buy / sell)
// ============================================================

let currentTab = 'buy';
let cashBalance = 0;
let holdingsData = [];
let watchlistData = [];
let fxRate = 35;

document.addEventListener('DOMContentLoaded', async () => {
  await loadTradeData();
  setupFormListeners();
});

async function loadTradeData() {
  try {
    const [hRes, wRes] = await Promise.all([
      API.get('getHoldings'),
      API.get('getWatchlist'),
    ]);
    if (hRes.ok) {
      cashBalance  = hRes.cash;
      holdingsData = hRes.holdings || [];
      fxRate       = hRes.usd_thb_rate || 35;
    }
    if (wRes.ok) watchlistData = wRes.watchlist || [];

    renderCashBar();
    renderHoldingsSummary();
    populateSymbolOptions();
  } catch (e) {
    showToast('❌ โหลดข้อมูลไม่สำเร็จ: ' + e.message, 'error');
  }
}

function renderCashBar() {
  document.getElementById('cash-display').textContent = fmtTHB(cashBalance);
}

function renderHoldingsSummary() {
  const el = document.getElementById('current-holdings');
  if (!holdingsData.length) {
    el.innerHTML = '<p style="color:var(--text2);font-size:.88rem">ยังไม่มีหุ้นในพอร์ต</p>';
    return;
  }
  const rows = holdingsData.map(h => `
    <tr>
      <td><strong>${h.symbol}</strong> <span class="market-tag market-${h.market}">${h.market}</span></td>
      <td>${fmtNum(h.qty, 0)}</td>
      <td>${h.market === 'US' ? fmtUSD(h.avg_cost) : fmtTHB(h.avg_cost)}</td>
      <td>${h.market === 'US' ? fmtUSD(h.current_price) : fmtTHB(h.current_price)}</td>
      <td class="${plClass(h.unrealized_pl)}">
        ${fmtPct(h.unrealized_pct)}
      </td>
      <td>
        <button class="btn btn-danger btn-sm"
          onclick="prefillSell('${h.symbol}', ${h.qty}, ${h.current_price})">
          ขาย
        </button>
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>หุ้น</th><th>จำนวน</th><th>ต้นทุน/หุ้น</th>
          <th>ราคาล่าสุด</th><th>% P/L</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function populateSymbolOptions() {
  const allSymbols = [
    ...watchlistData.map(w => ({ symbol: w.symbol, name: w.name, market: w.market })),
    ...holdingsData
      .filter(h => !watchlistData.find(w => w.symbol === h.symbol))
      .map(h => ({ symbol: h.symbol, name: h.symbol, market: h.market })),
  ];

  ['buy-symbol', 'sell-symbol'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- เลือกหุ้น --</option>' +
      allSymbols.map(s => `<option value="${s.symbol}" data-market="${s.market}">
        ${s.symbol} (${s.market}) ${s.name !== s.symbol ? '- ' + s.name : ''}
      </option>`).join('');
  });

  const sellSel = document.getElementById('sell-symbol');
  if (sellSel) {
    sellSel.innerHTML = '<option value="">-- เลือกหุ้น --</option>' +
      holdingsData.map(h => `<option value="${h.symbol}" data-market="${h.market}" data-qty="${h.qty}" data-price="${h.current_price}">
        ${h.symbol} (${h.market}) — ถือ ${fmtNum(h.qty, 0)} หุ้น
      </option>`).join('');
  }
}

function setupFormListeners() {
  // Buy form: price/qty change → update estimate
  ['buy-qty', 'buy-price'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateBuyEstimate);
  });
  document.getElementById('buy-symbol')?.addEventListener('change', function () {
    const opt = this.options[this.selectedIndex];
    const market = opt?.dataset?.market || 'SET';
    document.getElementById('buy-market').textContent = market;
    updateBuyEstimate();
  });

  // Sell form
  document.getElementById('sell-symbol')?.addEventListener('change', function () {
    const opt = this.options[this.selectedIndex];
    if (opt && opt.dataset.qty) {
      document.getElementById('sell-max-qty').textContent = fmtNum(opt.dataset.qty, 0);
      document.getElementById('sell-price').value = opt.dataset.price || '';
      updateSellEstimate();
    }
  });
  ['sell-qty', 'sell-price'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateSellEstimate);
  });
}

function updateBuyEstimate() {
  const qty   = Number(document.getElementById('buy-qty')?.value || 0);
  const price = Number(document.getElementById('buy-price')?.value || 0);
  const fee   = Math.max(qty * price * 0.0017, 20);
  const total = qty * price + fee;

  document.getElementById('buy-estimate').textContent =
    qty > 0 && price > 0
      ? `ค่าหุ้น ${fmtTHB(qty * price)} + ค่าธรรมเนียม ~${fmtTHB(fee)} = รวม ${fmtTHB(total)}`
      : '';
  document.getElementById('buy-estimate').className =
    total > cashBalance ? 'form-hint' + ' negative' : 'form-hint';
}

function updateSellEstimate() {
  const qty   = Number(document.getElementById('sell-qty')?.value || 0);
  const price = Number(document.getElementById('sell-price')?.value || 0);
  const fee   = Math.max(qty * price * 0.0017, 20);
  const net   = qty * price - fee;

  document.getElementById('sell-estimate').textContent =
    qty > 0 && price > 0
      ? `ได้รับ ${fmtTHB(qty * price)} − ค่าธรรมเนียม ~${fmtTHB(fee)} = ${fmtTHB(net)}`
      : '';
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('buy-form').style.display  = tab === 'buy'  ? '' : 'none';
  document.getElementById('sell-form').style.display = tab === 'sell' ? '' : 'none';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
}

function prefillSell(symbol, qty, price) {
  switchTab('sell');
  const sel = document.getElementById('sell-symbol');
  if (sel) {
    sel.value = symbol;
    document.getElementById('sell-max-qty').textContent = fmtNum(qty, 0);
    document.getElementById('sell-price').value = price;
    updateSellEstimate();
  }
  document.querySelector('#sell-form')?.scrollIntoView({ behavior: 'smooth' });
}

async function submitBuy(btn) {
  const symbol = document.getElementById('buy-symbol').value;
  const qty    = Number(document.getElementById('buy-qty').value);
  const price  = Number(document.getElementById('buy-price').value);
  const note   = document.getElementById('buy-note')?.value || '';

  if (!symbol) return showToast('กรุณาเลือกหุ้น', 'error');
  if (!qty || qty <= 0) return showToast('กรุณาระบุจำนวน', 'error');
  if (!price || price <= 0) return showToast('กรุณาระบุราคา', 'error');

  setLoading(btn, true, 'กำลังซื้อ...');
  clearResult('buy-result');

  try {
    const res = await API.post({ action: 'buy', symbol, qty, price, note });
    if (res.ok) {
      cashBalance = res.cash_after;
      renderCashBar();
      showResult('buy-result', `✅ ${res.message}<br>เงินสดคงเหลือ: ${fmtTHB(res.cash_after)}`, 'success');
      document.getElementById('buy-qty').value   = '';
      document.getElementById('buy-price').value = '';
      updateBuyEstimate();
      await loadTradeData();
    } else {
      showResult('buy-result', '❌ ' + res.error, 'error');
    }
  } catch (e) {
    showResult('buy-result', '❌ ' + e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function submitSell(btn) {
  const symbol = document.getElementById('sell-symbol').value;
  const qty    = Number(document.getElementById('sell-qty').value);
  const price  = Number(document.getElementById('sell-price').value);
  const note   = document.getElementById('sell-note')?.value || '';

  if (!symbol) return showToast('กรุณาเลือกหุ้น', 'error');
  if (!qty || qty <= 0) return showToast('กรุณาระบุจำนวน', 'error');
  if (!price || price <= 0) return showToast('กรุณาระบุราคา', 'error');

  setLoading(btn, true, 'กำลังขาย...');
  clearResult('sell-result');

  try {
    const res = await API.post({ action: 'sell', symbol, qty, price, note });
    if (res.ok) {
      cashBalance = res.cash_after;
      renderCashBar();
      showResult('sell-result',
        `✅ ${res.message}<br>กำไร/ขาดทุนจริง: <strong class="${plClass(res.realized_pl)}">${fmtPL(res.realized_pl)}</strong><br>เงินสดคงเหลือ: ${fmtTHB(res.cash_after)}`,
        'success');
      document.getElementById('sell-qty').value   = '';
      document.getElementById('sell-price').value = '';
      updateSellEstimate();
      await loadTradeData();
    } else {
      showResult('sell-result', '❌ ' + res.error, 'error');
    }
  } catch (e) {
    showResult('sell-result', '❌ ' + e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

function showResult(id, html, type) {
  const el = document.getElementById(id);
  if (el) { el.innerHTML = html; el.className = `alert alert-${type}`; el.style.display = ''; }
}
function clearResult(id) {
  const el = document.getElementById(id);
  if (el) { el.innerHTML = ''; el.style.display = 'none'; }
}
