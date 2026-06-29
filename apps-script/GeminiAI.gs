// ============================================================
// GeminiAI.gs — AI วิเคราะห์หุ้น + สรุปตลาดด้วย Gemini
// ============================================================

const GEMINI_MODEL = 'gemini-1.5-flash';

function runDailyAnalysis() {
  // Rate limiting: max calls per day
  const maxCalls  = Number(getConfig('max_ai_calls_per_day') || 5);
  const callsDate = String(getConfig('ai_calls_date') || '');
  let   callsToday = callsDate === todayStr() ? Number(getConfig('ai_calls_today') || 0) : 0;

  if (callsToday >= maxCalls) {
    logOK('runDailyAnalysis', `Daily limit reached (${maxCalls})`);
    return { ok: false, error: `เรียก AI ครบ ${maxCalls} ครั้งแล้ววันนี้` };
  }

  const watchlistData = getWatchlist().watchlist || [];
  const holdings      = _getHoldingsRaw();
  const allSymbols    = _mergeSymbols(watchlistData, holdings);
  const prices        = _getPricesMap();
  const fxRate        = getFxRate();
  const todayNews     = _getTodayNews();

  const sheet = getSheet('ai_analysis');

  // Prompt A — analyze each stock
  const stockResults = [];
  for (const { symbol, market } of allSymbols) {
    if (callsToday >= maxCalls) break;
    try {
      const priceData = prices[symbol] || {};
      const relatedNews = todayNews
        .filter(n => n.symbol === symbol || n.symbol === 'MARKET')
        .slice(0, 5);
      const analysis = _analyzeStock(symbol, market, priceData, relatedNews, fxRate);
      if (analysis) {
        // Upsert: check if row for today+symbol exists
        _upsertAnalysis(sheet, todayStr(), symbol, analysis);
        stockResults.push({ symbol, ...analysis });
        callsToday++;
      }
    } catch (e) {
      logError('runDailyAnalysis', `Stock ${symbol}: ${e.message}`);
    }
    Utilities.sleep(500); // gentle rate limiting
  }

  // Prompt B — market summary
  let marketSummary = null;
  if (callsToday < maxCalls && todayNews.length > 0) {
    try {
      marketSummary = _summarizeMarket(todayNews, allSymbols.map(s => s.symbol));
      if (marketSummary) {
        _upsertAnalysis(sheet, todayStr(), 'MARKET', marketSummary);
        callsToday++;
      }
    } catch (e) {
      logError('runDailyAnalysis', `Market summary: ${e.message}`);
    }
  }

  // Update call count
  setConfig('ai_calls_today', callsToday);
  setConfig('ai_calls_date', todayStr());
  setConfig('last_analysis_date', todayStr());

  logOK('runDailyAnalysis', `Done: ${stockResults.length} stocks, market=${!!marketSummary}`);
  return { ok: true, stocks: stockResults, market: marketSummary, calls_used: callsToday };
}

// ── Prompt A: Stock analysis ──────────────────────────────────

function _analyzeStock(symbol, market, priceData, news, fxRate) {
  const price    = priceData.price || 'N/A';
  const dayChg   = priceData.day_change_pct != null ? priceData.day_change_pct + '%' : 'N/A';
  const currency = market === 'US' ? 'USD' : 'THB';
  const priceThb = market === 'US' && priceData.price
    ? `(~${Math.round(priceData.price * fxRate)} THB)`
    : '';

  const newsBlock = news.length
    ? news.map(n => `- [${n.symbol}] ${n.title}: ${n.content || ''}`).join('\n')
    : 'ไม่มีข่าววันนี้';

  const prompt = `คุณเป็น AI วิเคราะห์หุ้นมืออาชีพ วิเคราะห์หุ้น ${symbol} (ตลาด${market === 'SET' ? 'ไทย SET' : 'สหรัฐฯ'}) ต่อไปนี้

ราคาล่าสุด: ${price} ${currency} ${priceThb}
เปลี่ยนแปลงวันนี้: ${dayChg}

ข่าวที่เกี่ยวข้องวันนี้:
${newsBlock}

ตอบกลับเป็น JSON เท่านั้น ห้ามมี markdown หรือข้อความอื่น ตามรูปแบบนี้:
{
  "sentiment": "เชิงบวกมาก|เชิงบวก|ทรงตัว|เชิงลบ",
  "score": 0,
  "key_drivers": ["..."],
  "recommendation": "ซื้อเพิ่ม|ถือรอ|ขายทำกำไร",
  "reason": "...",
  "risks": ["..."]
}

score คือ 0-10 (10 = ดีที่สุด)`;

  const raw = _callGemini(prompt);
  if (!raw) return null;

  try {
    const result = JSON.parse(raw);
    // Write to sheet
    return {
      sentiment:      result.sentiment   || 'ทรงตัว',
      score:          result.score       || 5,
      key_drivers:    JSON.stringify(result.key_drivers  || []),
      recommendation: result.recommendation || 'ถือรอ',
      reason:         result.reason      || '',
      risks:          JSON.stringify(result.risks || []),
      raw_json:       raw,
    };
  } catch (e) {
    logError('_analyzeStock', `JSON parse failed for ${symbol}: ${e.message}`);
    return null;
  }
}

// ── Prompt B: Market summary ──────────────────────────────────

function _summarizeMarket(news, symbolList) {
  const newsBlock = news.slice(0, 20)
    .map(n => `- [${n.symbol}] ${n.title}: ${n.content || ''}`)
    .join('\n');

  const prompt = `คุณเป็น AI สรุปข่าวตลาดหุ้นประจำวัน สรุปข่าวต่อไปนี้และวิเคราะห์ผลกระทบต่อ watchlist

ข่าวทั้งหมดวันนี้:
${newsBlock}

หุ้นใน watchlist: ${symbolList.join(', ')}

ตอบกลับเป็น JSON เท่านั้น ห้ามมี markdown หรือข้อความอื่น:
{
  "top_news": [{"title": "...", "summary": "...", "sector": "..."}],
  "watchlist_impact": [{"symbol": "...", "impact": "..."}],
  "market_outlook": "Bullish|Bearish|Sideways",
  "outlook_reason": "..."
}`;

  const raw = _callGemini(prompt);
  if (!raw) return null;

  try {
    const result = JSON.parse(raw);
    return {
      sentiment:      result.market_outlook || 'Sideways',
      score:          0,
      key_drivers:    JSON.stringify(result.top_news || []),
      recommendation: result.market_outlook || 'Sideways',
      reason:         result.outlook_reason || '',
      risks:          JSON.stringify(result.watchlist_impact || []),
      raw_json:       raw,
    };
  } catch (e) {
    logError('_summarizeMarket', `JSON parse: ${e.message}`);
    return null;
  }
}

// ── Gemini API call ───────────────────────────────────────────

function _callGemini(prompt) {
  const apiKey = getProp('GEMINI_API_KEY');
  if (!apiKey) { logError('_callGemini', 'GEMINI_API_KEY not set'); return null; }

  const url  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  let raw = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: body,
        muteHttpExceptions: true,
      });

      if (res.getResponseCode() === 200) {
        const json = JSON.parse(res.getContentText());
        raw = json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        if (raw) break;
      } else {
        logError('_callGemini', `HTTP ${res.getResponseCode()}: ${res.getContentText().slice(0, 200)}`);
      }
    } catch (e) {
      logError('_callGemini', `Attempt ${attempt}: ${e.message}`);
    }
    if (attempt < 2) Utilities.sleep(2000);
  }
  return raw;
}

// ── Upsert analysis row ───────────────────────────────────────

function _upsertAnalysis(sheet, date, symbol, data) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowDate = Utilities.formatDate(new Date(rows[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');
    if (rowDate === date && String(rows[i][1]) === symbol) {
      sheet.getRange(i + 1, 1, 1, 9).setValues([[
        date, symbol, data.sentiment, data.score, data.key_drivers,
        data.recommendation, data.reason, data.risks, data.raw_json
      ]]);
      return;
    }
  }
  sheet.appendRow([
    date, symbol, data.sentiment, data.score, data.key_drivers,
    data.recommendation, data.reason, data.risks, data.raw_json
  ]);
}

// ── Helpers ────────────────────────────────────────────────────

function _mergeSymbols(watchlist, holdings) {
  const seen = {};
  const result = [];
  [...watchlist, ...holdings].forEach(item => {
    if (item.symbol && !seen[item.symbol]) {
      seen[item.symbol] = true;
      result.push({ symbol: item.symbol, market: item.market });
    }
  });
  return result;
}

function _getPricesMap() {
  const holdings = _getHoldingsRaw();
  const map = {};
  holdings.forEach(h => {
    map[h.symbol] = {
      price:          h.current_price,
      open_price:     h.open_price,
      day_change_pct: h.day_change_pct,
    };
  });
  return map;
}

function _getTodayNews() {
  const sheet = getSheet('news');
  if (!sheet) return [];
  const rows  = sheet.getDataRange().getValues();
  const today = todayStr();
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    const d = Utilities.formatDate(new Date(rows[i][1]), 'Asia/Bangkok', 'yyyy-MM-dd');
    if (d === today) {
      result.push({
        symbol:  rows[i][3],
        title:   rows[i][4],
        content: rows[i][5],
      });
    }
  }
  return result;
}
