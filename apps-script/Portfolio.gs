// ============================================================
// Portfolio.gs — Business Logic (buy/sell/holdings/dashboard)
// ============================================================

// ── Dashboard ───────────────────────────────────────────────

function getDashboard() {
  const fxRate    = getFxRate();
  const holdings  = _getHoldingsRaw();
  const cash      = _getCash();
  const startBal  = Number(getConfig('starting_balance') || 1000000);

  // Calculate portfolio totals in THB
  let totalInvested = 0;
  holdings.forEach(h => {
    const mv = h.market === 'US'
      ? h.market_value * fxRate
      : h.market_value;
    totalInvested += mv;
  });

  const totalValue  = totalInvested + cash;
  const totalPL     = totalValue - startBal;
  const totalPLPct  = startBal > 0 ? (totalPL / startBal) * 100 : 0;

  // Recent news (last 7 days)
  const news = _getRecentNews(7);

  // Latest AI analysis
  const aiAnalysis = _getLatestAiAnalysis();

  // Snapshot history (last 30 entries for chart)
  const snapHistory = _getSnapshotHistory(30);

  return {
    ok: true,
    portfolio: {
      total_value:   Math.round(totalValue * 100) / 100,
      cash:          Math.round(cash * 100) / 100,
      invested:      Math.round(totalInvested * 100) / 100,
      total_pl:      Math.round(totalPL * 100) / 100,
      total_pl_pct:  Math.round(totalPLPct * 100) / 100,
      starting_balance: startBal,
      usd_thb_rate:  fxRate,
    },
    holdings,
    news,
    ai_analysis:    aiAnalysis,
    snapshot_history: snapHistory,
    last_updated:   getConfig('last_price_update') || 'ยังไม่อัปเดต',
  };
}

function getHoldings() {
  const fxRate   = getFxRate();
  const holdings = _getHoldingsRaw();
  const cash     = _getCash();
  return { ok: true, holdings, cash, usd_thb_rate: fxRate };
}

function getWatchlist() {
  const sheet  = getSheet('watchlist');
  if (!sheet) return { ok: true, watchlist: [] };
  const rows   = sheet.getDataRange().getValues();
  const watchlist = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    watchlist.push({
      symbol: rows[i][0],
      name:   rows[i][1],
      market: rows[i][2],
      added_date: rows[i][3],
    });
  }
  return { ok: true, watchlist };
}

// ── Buy Stock ───────────────────────────────────────────────

function buyStock(p) {
  const symbol = String(p.symbol || '').toUpperCase().trim();
  const qty    = Number(p.qty);
  const price  = Number(p.price);
  const note   = p.note || '';

  if (!symbol)    return { ok: false, error: 'กรุณาระบุ symbol' };
  if (qty <= 0)   return { ok: false, error: 'จำนวนต้องมากกว่า 0' };
  if (price <= 0) return { ok: false, error: 'ราคาต้องมากกว่า 0' };

  const market = _getMarket(symbol);
  const fee    = _calcFee(qty, price, market);
  const totalCost = qty * price + fee;
  const cash   = _getCash();

  if (totalCost > cash) {
    return {
      ok: false,
      error: `เงินไม่พอ — ต้องการ ${_fmt(totalCost)} แต่มี ${_fmt(cash)}`,
    };
  }

  // Record transaction
  const txnId = generateId('BUY');
  getSheet('transactions').appendRow([
    txnId, new Date(), symbol, market, 'BUY', qty, price, fee, 0, note
  ]);

  // Update holdings
  _updateHoldingsBuy(symbol, market, qty, price);

  // Deduct cash
  _setCash(cash - totalCost);

  logOK('buyStock', `BUY ${qty} ${symbol} @ ${price} fee=${fee}`);
  return {
    ok: true,
    message: `ซื้อ ${symbol} ${qty} หุ้น @ ${_fmt(price)} สำเร็จ`,
    fee,
    total_cost: totalCost,
    cash_after: _getCash(),
  };
}

// ── Sell Stock ──────────────────────────────────────────────

function sellStock(p) {
  const symbol = String(p.symbol || '').toUpperCase().trim();
  const qty    = Number(p.qty);
  const price  = Number(p.price);
  const note   = p.note || '';

  if (!symbol)    return { ok: false, error: 'กรุณาระบุ symbol' };
  if (qty <= 0)   return { ok: false, error: 'จำนวนต้องมากกว่า 0' };
  if (price <= 0) return { ok: false, error: 'ราคาต้องมากกว่า 0' };

  const holding = _findHolding(symbol);
  if (!holding) return { ok: false, error: `ไม่พบ ${symbol} ในพอร์ต` };
  if (qty > holding.qty) {
    return {
      ok: false,
      error: `ขายได้สูงสุด ${holding.qty} หุ้น (มีอยู่เท่านั้น)`,
    };
  }

  const market      = holding.market;
  const fee         = _calcFee(qty, price, market);
  const proceeds    = qty * price - fee;
  const realizedPL  = (price - holding.avg_cost) * qty - fee;

  // Record transaction
  const txnId = generateId('SELL');
  getSheet('transactions').appendRow([
    txnId, new Date(), symbol, market, 'SELL', qty, price, fee,
    Math.round(realizedPL * 100) / 100, note
  ]);

  // Update holdings
  _updateHoldingsSell(symbol, qty);

  // Add cash
  _setCash(_getCash() + proceeds);

  logOK('sellStock', `SELL ${qty} ${symbol} @ ${price} pl=${realizedPL.toFixed(2)}`);
  return {
    ok: true,
    message: `ขาย ${symbol} ${qty} หุ้น @ ${_fmt(price)} สำเร็จ`,
    fee,
    proceeds,
    realized_pl: Math.round(realizedPL * 100) / 100,
    cash_after: _getCash(),
  };
}

// ── Watchlist ────────────────────────────────────────────────

function addToWatchlist(p) {
  const symbol = String(p.symbol || '').toUpperCase().trim();
  const name   = p.name   || symbol;
  const market = String(p.market || 'SET').toUpperCase();

  if (!symbol) return { ok: false, error: 'กรุณาระบุ symbol' };
  if (!['SET','US'].includes(market)) return { ok: false, error: 'market ต้องเป็น SET หรือ US' };

  // Check duplicate
  const existing = getWatchlist().watchlist;
  if (existing.find(w => w.symbol === symbol)) {
    return { ok: false, error: `${symbol} อยู่ใน watchlist แล้ว` };
  }

  getSheet('watchlist').appendRow([symbol, name, market, todayStr()]);
  return { ok: true, message: `เพิ่ม ${symbol} (${market}) สำเร็จ` };
}

function removeFromWatchlist(symbol) {
  if (!symbol) return { ok: false, error: 'กรุณาระบุ symbol' };
  symbol = String(symbol).toUpperCase().trim();

  const sheet = getSheet('watchlist');
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === symbol) {
      sheet.deleteRow(i + 1);
      return { ok: true, message: `ลบ ${symbol} ออกจาก watchlist แล้ว` };
    }
  }
  return { ok: false, error: `ไม่พบ ${symbol} ใน watchlist` };
}

// ── News ─────────────────────────────────────────────────────

function addNews(p) {
  const title   = p.title   || '';
  const content = p.content || '';
  const url     = p.url     || '';
  const symbol  = String(p.symbol || 'MARKET').toUpperCase().trim();
  const source  = p.source  || 'team';

  if (!title && !content) return { ok: false, error: 'กรุณากรอก title หรือ content' };

  const newsId = generateId('NEWS');
  getSheet('news').appendRow([
    newsId, new Date(), source, symbol, title, content, url
  ]);
  return { ok: true, message: 'บันทึกข่าวสำเร็จ', news_id: newsId };
}

// ── Internal helpers ──────────────────────────────────────────

function _getHoldingsRaw() {
  const sheet = getSheet('holdings');
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    result.push({
      symbol:         rows[i][0],
      market:         rows[i][1],
      qty:            Number(rows[i][2]),
      avg_cost:       Number(rows[i][3]),
      current_price:  Number(rows[i][4]),
      open_price:     Number(rows[i][5]),
      market_value:   Number(rows[i][6]),
      unrealized_pl:  Number(rows[i][7]),
      unrealized_pct: Number(rows[i][8]),
      day_change_pct: Number(rows[i][9]),
      _row: i + 1,
    });
  }
  return result;
}

function _findHolding(symbol) {
  return _getHoldingsRaw().find(h => h.symbol === symbol) || null;
}

function _updateHoldingsBuy(symbol, market, qty, price) {
  const sheet  = getSheet('holdings');
  const rows   = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === symbol) {
      const oldQty    = Number(rows[i][2]);
      const oldCost   = Number(rows[i][3]);
      const newQty    = oldQty + qty;
      const newCost   = (oldQty * oldCost + qty * price) / newQty;
      const curPrice  = Number(rows[i][4]) || price;
      const mv        = newQty * curPrice;
      const pl        = (curPrice - newCost) * newQty;
      const plPct     = newCost > 0 ? (pl / (newCost * newQty)) * 100 : 0;
      sheet.getRange(i + 1, 3, 1, 8).setValues([[
        newQty,
        Math.round(newCost * 100) / 100,
        curPrice,
        rows[i][5],
        Math.round(mv * 100) / 100,
        Math.round(pl * 100) / 100,
        Math.round(plPct * 100) / 100,
        rows[i][9],
      ]]);
      return;
    }
  }
  // New holding
  sheet.appendRow([symbol, market, qty, price, price, price,
    qty * price, 0, 0, 0]);
}

function _updateHoldingsSell(symbol, qtySold) {
  const sheet = getSheet('holdings');
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === symbol) {
      const newQty  = Number(rows[i][2]) - qtySold;
      if (newQty <= 0) {
        sheet.deleteRow(i + 1);
        return;
      }
      const avgCost  = Number(rows[i][3]);
      const curPrice = Number(rows[i][4]);
      const mv       = newQty * curPrice;
      const pl       = (curPrice - avgCost) * newQty;
      const plPct    = avgCost > 0 ? (pl / (avgCost * newQty)) * 100 : 0;
      sheet.getRange(i + 1, 3, 1, 8).setValues([[
        newQty, avgCost, curPrice, rows[i][5],
        Math.round(mv * 100) / 100,
        Math.round(pl * 100) / 100,
        Math.round(plPct * 100) / 100,
        rows[i][9],
      ]]);
      return;
    }
  }
}

function _getCash() {
  const data = getSheet('cash').getDataRange().getValues();
  return data.length > 1 ? Number(data[1][1]) : 0;
}

function _setCash(amount) {
  getSheet('cash').getRange(2, 2).setValue(Math.round(amount * 100) / 100);
}

function _getMarket(symbol) {
  const wl = getWatchlist().watchlist;
  const found = wl.find(w => w.symbol === symbol);
  if (found) return found.market;
  const h = _findHolding(symbol);
  if (h) return h.market;
  return 'SET'; // default
}

function _calcFee(qty, price, market) {
  const rate = Number(getConfig('commission_rate') || 0.0017);
  const raw  = qty * price * rate;
  if (market === 'US') {
    const minFee = Number(getConfig('commission_min_usd') || 0.5);
    return Math.max(raw, minFee);
  }
  const minFee = Number(getConfig('commission_min_thb') || 20);
  return Math.max(raw, minFee);
}

function _getRecentNews(days) {
  const sheet  = getSheet('news');
  if (!sheet) return [];
  const rows   = sheet.getDataRange().getValues();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const dt = new Date(rows[i][1]);
    if (dt >= cutoff) {
      result.push({
        news_id: rows[i][0],
        date:    rows[i][1],
        source:  rows[i][2],
        symbol:  rows[i][3],
        title:   rows[i][4],
        content: rows[i][5],
        url:     rows[i][6],
      });
    }
  }
  return result.reverse().slice(0, 30);
}

function _getLatestAiAnalysis() {
  const sheet = getSheet('ai_analysis');
  if (!sheet) return null;
  const rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return null;

  const today = todayStr();
  const byDate = {};
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const date = Utilities.formatDate(new Date(rows[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');
    if (!byDate[date]) byDate[date] = { date, stocks: [], market: null };

    if (rows[i][1] === 'MARKET') {
      try { byDate[date].market = JSON.parse(rows[i][8]); } catch (_) {}
    } else {
      byDate[date].stocks.push({
        symbol:        rows[i][1],
        sentiment:     rows[i][2],
        score:         rows[i][3],
        key_drivers:   _parseArr(rows[i][4]),
        recommendation: rows[i][5],
        reason:        rows[i][6],
        risks:         _parseArr(rows[i][7]),
      });
    }
  }

  const dates = Object.keys(byDate).sort().reverse();
  return dates.length ? byDate[dates[0]] : null;
}

function _getSnapshotHistory(limit) {
  const sheet = getSheet('daily_snapshot');
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    result.push({
      date:          rows[i][0],
      total_value:   rows[i][1],
      cash:          rows[i][2],
      invested:      rows[i][3],
      total_pl:      rows[i][4],
      total_pl_pct:  rows[i][5],
      set_index:     rows[i][6],
      sp500_index:   rows[i][7],
    });
  }
  return result.slice(-limit);
}

function _parseArr(val) {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch (_) { return [String(val)]; }
}

function _fmt(n) {
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
