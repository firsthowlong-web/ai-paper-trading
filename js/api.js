// ============================================================
// api.js — Shared API utility (เรียกผ่านทุกหน้า)
// ============================================================

const API = {
  async get(action, extraParams = {}) {
    const params = new URLSearchParams({ action, token: CONFIG.TOKEN, ...extraParams });
    const res = await fetch(`${CONFIG.SCRIPT_URL}?${params}`, { redirect: 'follow' });
    return res.json();
  },

  async post(body) {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: CONFIG.TOKEN, ...body }),
      redirect: 'follow',
    });
    return res.json();
  },
};

// ── Formatting helpers ────────────────────────────────────────

function fmtTHB(n, decimals = 2) {
  return '฿' + Number(n || 0).toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtUSD(n, decimals = 2) {
  return '$' + Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtNum(n, decimals = 2) {
  return Number(n || 0).toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(n) {
  const v = Number(n || 0);
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

function fmtPL(n) {
  const v = Number(n || 0);
  return (v >= 0 ? '+฿' : '-฿') + Math.abs(v).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function plClass(n) {
  return Number(n) >= 0 ? 'positive' : 'negative';
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Toast notification ────────────────────────────────────────

function showToast(message, type = 'info') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Loading state ─────────────────────────────────────────────

function setLoading(el, isLoading, text = '') {
  if (!el) return;
  if (isLoading) {
    el.disabled = true;
    el.dataset.origText = el.textContent;
    el.innerHTML = '<span class="spinner"></span> ' + (text || 'กำลังโหลด...');
  } else {
    el.disabled = false;
    el.textContent = el.dataset.origText || text;
  }
}
