// ============================================================
// dashboard.js — Dashboard page logic
// ============================================================

let portfolioChart = null;

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

async function loadDashboard() {
  document.getElementById('main-content').innerHTML = `
    <div class="loading-overlay">
      <div class="big-spinner"></div>
      <p>กำลังโหลดข้อมูลพอร์ต...</p>
    </div>`;

  try {
    const data = await API.get('getDashboard');
    if (!data.ok) throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');
    renderDashboard(data);
  } catch (e) {
    document.getElementById('main-content').innerHTML = `
      <div class="alert alert-error">
        ❌ ${e.message}<br>
        <small>ตรวจสอบ SCRIPT_URL และ TOKEN ใน js/config.js</small>
      </div>`;
  }
}

function renderDashboard(data) {
  const { portfolio, holdings, news, ai_analysis, snapshot_history, last_updated } = data;

  document.getElementById('main-content').innerHTML = `
    <!-- Portfolio summary stats -->
    <div class="stat-grid" id="stats-grid"></div>

    <!-- Chart + Holdings -->
    <div class="grid-3" style="margin-bottom:1rem">
      <div class="card">
        <div class="section-title">
          📈 มูลค่าพอร์ตย้อนหลัง
          <span style="font-size:.78rem;font-weight:400;color:var(--text2)">${last_updated}</span>
        </div>
        <div class="chart-wrap">
          <canvas id="portfolioChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="section-title">🔭 AI วิเคราะห์ตลาด
          <button class="btn btn-outline btn-sm" onclick="triggerAnalysis(this)">🤖 วิเคราะห์ใหม่</button>
        </div>
        <div id="market-outlook"></div>
      </div>
    </div>

    <!-- Holdings table -->
    <div class="card" style="margin-bottom:1rem">
      <div class="section-title">💼 หุ้นในพอร์ต (${holdings.length} ตัว)</div>
      <div class="table-wrap" id="holdings-table"></div>
    </div>

    <!-- AI stock analysis + News -->
    <div class="grid-2">
      <div class="card">
        <div class="section-title">🤖 AI วิเคราะห์รายหุ้น
          <small style="color:var(--text2);font-weight:400">${ai_analysis?.date || 'ยังไม่มีข้อมูล'}</small>
        </div>
        <div id="ai-cards"></div>
      </div>
      <div class="card">
        <div class="section-title">📰 ข่าวล่าสุด</div>
        <div id="news-list"></div>
      </div>
    </div>
  `;

  renderStats(portfolio);
  renderChart(snapshot_history, portfolio);
  renderHoldings(holdings, portfolio.usd_thb_rate);
  renderMarketOutlook(ai_analysis);
  renderAiCards(ai_analysis);
  renderNews(news);
}

function renderStats(p) {
  const stats = [
    { label: 'มูลค่ารวม', value: fmtTHB(p.total_value), sub: `เริ่มต้น ${fmtTHB(p.starting_balance)}`, cls: '' },
    { label: 'กำไร / ขาดทุนรวม', value: fmtPL(p.total_pl), sub: fmtPct(p.total_pl_pct), cls: plClass(p.total_pl) },
    { label: 'เงินสดคงเหลือ', value: fmtTHB(p.cash), sub: `${((p.cash/p.total_value)*100).toFixed(1)}% ของพอร์ต`, cls: '' },
    { label: 'มูลค่าหุ้น', value: fmtTHB(p.invested), sub: `USD/THB = ${p.usd_thb_rate}`, cls: '' },
  ];

  document.getElementById('stats-grid').innerHTML = stats.map(s => `
    <div class="card stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-val ${s.cls}">${s.value}</div>
      <div class="stat-change ${s.cls}">${s.sub}</div>
    </div>
  `).join('');
}

function renderChart(history, portfolio) {
  const ctx = document.getElementById('portfolioChart');
  if (!ctx) return;

  // If no history yet, show placeholder with current value
  const labels = history.length
    ? history.map(h => fmtDate(h.date))
    : [fmtDate(new Date())];
  const values = history.length
    ? history.map(h => Number(h.total_value))
    : [portfolio.total_value];
  const startBal = portfolio.starting_balance;

  if (portfolioChart) portfolioChart.destroy();

  portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'มูลค่าพอร์ต (THB)',
          data: values,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,.08)',
          fill: true,
          tension: .4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: 'ทุนเริ่มต้น',
          data: labels.map(() => startBal),
          borderColor: '#94a3b8',
          borderDash: [6, 3],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: true, position: 'bottom' } },
      scales: {
        y: {
          ticks: {
            callback: v => '฿' + (v/1000).toFixed(0) + 'K',
          },
        },
      },
    },
  });
}

function renderHoldings(holdings, fxRate) {
  if (!holdings.length) {
    document.getElementById('holdings-table').innerHTML = `
      <div class="empty-state">
        <div class="icon">📊</div>
        <p>ยังไม่มีหุ้นในพอร์ต — ไปที่หน้า Trade เพื่อเริ่มซื้อ</p>
      </div>`;
    return;
  }

  const rows = holdings.map(h => {
    const isUS = h.market === 'US';
    const priceStr = isUS ? fmtUSD(h.current_price) : fmtTHB(h.current_price);
    const costStr  = isUS ? fmtUSD(h.avg_cost)      : fmtTHB(h.avg_cost);
    const mvTHB    = isUS ? h.market_value * fxRate  : h.market_value;
    const plTHB    = isUS ? h.unrealized_pl * fxRate : h.unrealized_pl;

    return `
      <tr>
        <td><strong>${h.symbol}</strong>
          <span class="market-tag market-${h.market}">${h.market}</span>
        </td>
        <td>${fmtNum(h.qty, 0)}</td>
        <td>${costStr}</td>
        <td>${priceStr}
          <br><small class="${plClass(h.day_change_pct)}">${fmtPct(h.day_change_pct)} วันนี้</small>
        </td>
        <td>${fmtTHB(mvTHB)}</td>
        <td class="${plClass(plTHB)}">
          ${fmtPL(plTHB)}<br>
          <small>${fmtPct(h.unrealized_pct)}</small>
        </td>
      </tr>`;
  }).join('');

  document.getElementById('holdings-table').innerHTML = `
    <table>
      <thead><tr>
        <th>หุ้น</th><th>จำนวน</th><th>ต้นทุน/หุ้น</th>
        <th>ราคาล่าสุด</th><th>มูลค่า (THB)</th><th>กำไร/ขาดทุน</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderMarketOutlook(ai) {
  const el = document.getElementById('market-outlook');
  if (!ai || !ai.market) {
    el.innerHTML = `<div class="empty-state" style="padding:1.5rem">
      <div class="icon">🔭</div>
      <p>ยังไม่มีบทวิเคราะห์ตลาด<br><small>กด "วิเคราะห์ใหม่" หรือรอ trigger รอบเช้า</small></p>
    </div>`;
    return;
  }

  let market = {};
  try { market = JSON.parse(ai.market.raw_json || '{}'); } catch (_) {}

  const outlookColor = {
    Bullish: 'badge-green', Bearish: 'badge-red', Sideways: 'badge-yellow'
  }[market.market_outlook] || 'badge-gray';

  const topNews = (market.top_news || []).slice(0, 3);
  const impacts = (market.watchlist_impact || []).slice(0, 4);

  el.innerHTML = `
    <div style="margin-bottom:.75rem">
      <span class="badge ${outlookColor}">${market.market_outlook || 'N/A'}</span>
      <p style="font-size:.85rem;color:var(--text2);margin-top:.4rem">${market.outlook_reason || ''}</p>
    </div>
    ${topNews.length ? `
      <div class="card-title" style="margin-top:.75rem">ข่าวเด่นวันนี้</div>
      ${topNews.map(n => `
        <div style="font-size:.82rem;margin-bottom:.4rem">
          <strong>${n.title || ''}</strong><br>
          <span style="color:var(--text2)">${n.summary || ''}</span>
        </div>`).join('')}` : ''}
    ${impacts.length ? `
      <div class="card-title" style="margin-top:.75rem">ผลต่อ Watchlist</div>
      ${impacts.map(i => `
        <div style="font-size:.82rem;margin-bottom:.3rem">
          <strong>${i.symbol}</strong>: ${i.impact}
        </div>`).join('')}` : ''}
  `;
}

function renderAiCards(ai) {
  const el = document.getElementById('ai-cards');
  if (!ai || !ai.stocks || !ai.stocks.length) {
    el.innerHTML = `<div class="empty-state" style="padding:1.5rem">
      <div class="icon">🤖</div>
      <p>ยังไม่มีบทวิเคราะห์รายหุ้น</p>
    </div>`;
    return;
  }

  const cards = ai.stocks.map(s => {
    const sentimentBadge = s.sentiment?.includes('บวกมาก') ? 'badge-green'
      : s.sentiment?.includes('บวก') ? 'badge-green'
      : s.sentiment?.includes('ลบ')  ? 'badge-red' : 'badge-yellow';
    const recBadge = s.recommendation === 'ซื้อเพิ่ม' ? 'badge-green'
      : s.recommendation === 'ขายทำกำไร' ? 'badge-red' : 'badge-yellow';

    let drivers = [];
    try { drivers = JSON.parse(s.key_drivers || '[]'); } catch (_) {}

    return `
      <div class="ai-card">
        <div class="ai-card-header">
          <span class="ai-card-symbol">${s.symbol}</span>
          <span class="ai-card-score">score: ${s.score}/10</span>
        </div>
        <div>
          <span class="badge ${sentimentBadge}">${s.sentiment}</span>
          <span class="badge ${recBadge}" style="margin-left:.4rem">${s.recommendation}</span>
        </div>
        <p style="font-size:.82rem;color:var(--text2);margin-top:.4rem">${s.reason || ''}</p>
        ${drivers.length ? `<ul class="ai-drivers">${drivers.slice(0,3).map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
      </div>`;
  }).join('');

  el.innerHTML = `<div class="ai-cards">${cards}</div>`;
}

function renderNews(news) {
  const el = document.getElementById('news-list');
  if (!news || !news.length) {
    el.innerHTML = `<div class="empty-state" style="padding:1.5rem">
      <div class="icon">📰</div>
      <p>ยังไม่มีข่าว — ไปที่หน้า Team Input เพื่อเพิ่มข่าว</p>
    </div>`;
    return;
  }

  const items = news.slice(0, 10).map(n => `
    <div class="news-item">
      <div class="news-item-title">${n.title || '(ไม่มีหัวข้อ)'}</div>
      <div class="news-item-meta">
        <span class="badge badge-gray">${n.symbol || 'MARKET'}</span>
        <span style="margin-left:.4rem">${fmtDate(n.date)}</span>
        <span style="margin-left:.4rem;color:var(--text2)">${n.source === 'ai' ? '🤖 AI' : '👤 ทีม'}</span>
      </div>
      ${n.content ? `<div class="news-item-content">${n.content.slice(0, 120)}${n.content.length > 120 ? '...' : ''}</div>` : ''}
      ${n.url ? `<a href="${n.url}" target="_blank" style="font-size:.78rem;color:var(--primary)">อ่านต่อ →</a>` : ''}
    </div>`).join('');

  el.innerHTML = `<div class="news-list">${items}</div>`;
}

async function triggerAnalysis(btn) {
  if (!confirm('ต้องการให้ AI วิเคราะห์หุ้นใหม่เดี๋ยวนี้ใช่ไหม? (จะนับ 1 ครั้งจาก quota ประจำวัน)')) return;
  setLoading(btn, true, 'กำลังวิเคราะห์...');

  try {
    const res = await API.post({ action: 'triggerAnalysis' });
    if (res.ok) {
      showToast(`✅ วิเคราะห์เสร็จ: ${res.stocks?.length || 0} หุ้น`, 'success');
      setTimeout(loadDashboard, 1500);
    } else {
      showToast('❌ ' + (res.error || 'ไม่สำเร็จ'), 'error');
    }
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}
