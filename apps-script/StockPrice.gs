// ============================================================
// StockPrice.gs — ดึงราคาหุ้นจาก Yahoo Finance (SET + US)
// session = 'open' | 'close'
// ============================================================

function updatePrices(session) {
  session = session || 'close';
  const fxRate = getFxRate();

  // Collect unique symbols from holdings + watchlist
  const symbols = _collectSymbols();
  if (symbols.length === 0) {
    logOK('updatePrices', 'No symbols to update');
    return { ok: true, message: 'ไม่มีหุ้นที่ต้องอัปเดต' };
  }

  const prices = {};
  symbols.forEach(({ symbol, market }) => {
    try {
      const data = fetchYahooPrice(symbol, market);
      if (data) prices[symbol] = data;
    } catch (e) {
      logError('updatePrices', `${symbol}: ${e.message}`);
    }
  });

  // Update holdings sheet with latest prices
  _applyPricesToHoldings(prices, session, fxRate);

  // Also update SET benchmark
  let setIndex = 0;
  let sp500    = 0;
  try { setIndex = fetchYahooPrice('^SETI', 'INDEX')?.price || 0; } catch (_) {}
  try { sp500    = fetchYahooPrice('^GSPC', 'INDEX')?.price || 0; } catch (_) {}

  setConfig('last_price_update',
    Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'));

  logOK('updatePrices', `Updated ${Object.keys(prices).length}/${symbols.length} symbols`);
  return {
    ok: true,
    updated: Object.keys(prices).length,
    total: symbols.length,
    set_index: setIndex,
    sp500,
    session,
  };
}

// ── Yahoo Finance ─────────────────────────────────────────────

function fetchYahooPrice(symbol, market) {
  const yahooSymbol = market === 'SET' ? symbol + '.BK' : symbol;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
    muteHttpExceptions: true,
  };

  const res = UrlFetchApp.fetch(url, options);
  if (res.getResponseCode() !== 200) {
    throw new Error(`HTTP ${res.getResponseCode()} for ${yahooSymbol}`);
  }

  const json = JSON.parse(res.getContentText());
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${yahooSymbol}`);

  const meta       = result.meta;
  const price      = meta.regularMarketPrice || meta.previousClose || 0;
  const prevClose  = meta.regularMarketPreviousClose || meta.previousClose || price;
  const openPrice  = meta.regularMarketOpen || prevClose;
  const currency   = meta.currency || (market === 'SET' ? 'THB' : 'USD');
  const dayChangePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

  return {
    symbol,
    market,
    price:          Math.round(price * 10000) / 10000,
    prev_close:     Math.round(prevClose * 10000) / 10000,
    open_price:     Math.round(openPrice * 10000) / 10000,
    day_change_pct: Math.round(dayChangePct * 100) / 100,
    currency,
  };
}

// ── Apply prices to holdings sheet ───────────────────────────

function _applyPricesToHoldings(prices, session, fxRate) {
  const sheet = getSheet('holdings');
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const symbol = String(rows[i][0]);
    if (!symbol) continue;
    const data = prices[symbol];
    if (!data) continue;

    const qty      = Number(rows[i][2]);
    const avgCost  = Number(rows[i][3]);
    const price    = data.price;
    const openPrice = session === 'open' ? price : (Number(rows[i][5]) || data.open_price);
    const mv       = qty * price;
    const pl       = (price - avgCost) * qty;
    const plPct    = avgCost > 0 ? (pl / (avgCost * qty)) * 100 : 0;

    sheet.getRange(i + 1, 4, 1, 7).setValues([[
      avgCost,
      price,
      session === 'open' ? price : openPrice,
      Math.round(mv * 100) / 100,
      Math.round(pl * 100) / 100,
      Math.round(plPct * 100) / 100,
      Math.round(data.day_change_pct * 100) / 100,
    ]]);
  }
}

// ── Collect symbols from holdings + watchlist ─────────────────

function _collectSymbols() {
  const seen    = {};
  const result  = [];

  const holdings = _getHoldingsRaw();
  holdings.forEach(h => {
    if (!seen[h.symbol]) {
      seen[h.symbol] = true;
      result.push({ symbol: h.symbol, market: h.market });
    }
  });

  const watchlistData = getWatchlist().watchlist || [];
  watchlistData.forEach(w => {
    if (!seen[w.symbol]) {
      seen[w.symbol] = true;
      result.push({ symbol: w.symbol, market: w.market });
    }
  });

  return result;
}
