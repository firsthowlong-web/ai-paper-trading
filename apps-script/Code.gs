// ============================================================
// Code.gs — Main Router + Shared Helpers
// Deploy as: Execute as Me | Access: Anyone
//
// Script Properties ที่ต้องตั้งก่อน deploy:
//   SHEET_ID       — Google Spreadsheet ID
//   API_TOKEN      — Shared secret token (ตั้งเองได้)
//   GEMINI_API_KEY — Google AI Studio API key
//   LINE_TOKEN     — LINE Messaging API Channel Access Token
//   LINE_PUSH_TO   — userId หรือ groupId ที่จะ push (ถ้าจะใช้ push แทน broadcast)
// ============================================================

function doGet(e)  { return route(e, {}); }

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (_) {}
  return route(e, body);
}

function route(e, body) {
  try {
    const p = Object.assign({}, e.parameter || {}, body);

    if (!validateToken(p.token)) {
      return respond({ ok: false, error: 'Unauthorized' });
    }

    switch (p.action) {
      case 'getDashboard':    return respond(getDashboard());
      case 'getHoldings':     return respond(getHoldings());
      case 'getWatchlist':    return respond(getWatchlist());
      case 'buy':             return respond(buyStock(p));
      case 'sell':            return respond(sellStock(p));
      case 'addWatchlist':    return respond(addToWatchlist(p));
      case 'removeWatchlist': return respond(removeFromWatchlist(p.symbol));
      case 'addNews':         return respond(addNews(p));
      case 'triggerAnalysis': return respond(runDailyAnalysis());
      case 'setupSheets':     return respond(setupSheets());
      case 'setupTriggers':   return respond(setupTriggers());
      default:                return respond({ ok: false, error: 'Unknown action: ' + p.action });
    }
  } catch (err) {
    logError('route', err.message + '\n' + err.stack);
    return respond({ ok: false, error: err.message });
  }
}

function validateToken(token) {
  const stored = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  return stored && token === stored;
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Shared helpers ──────────────────────────────────────────

function getProp(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function getSheetId() { return getProp('SHEET_ID'); }

function getSpreadsheet() {
  return SpreadsheetApp.openById(getSheetId());
}

function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

function getConfig(key) {
  const data = getSheet('config').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) return data[i][1];
  }
  return null;
}

function setConfig(key, value) {
  const sheet = getSheet('config');
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function logToSheet(fn, status, message) {
  try {
    getSheet('logs').appendRow([new Date(), fn, status, String(message).slice(0, 800)]);
  } catch (_) {}
}

function logOK(fn, msg)    { logToSheet(fn, 'OK',    msg); }
function logError(fn, msg) { logToSheet(fn, 'ERROR', msg); }

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function todayStr() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
}

function getFxRate() {
  const lastDate = getConfig('last_fx_update') || '';
  const cached   = Number(getConfig('usd_thb_rate') || 35);
  if (lastDate === todayStr()) return cached;

  try {
    const res = UrlFetchApp.fetch('https://open.er-api.com/v6/latest/USD',
      { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const json = JSON.parse(res.getContentText());
      const rate = (json.rates && json.rates.THB) ? json.rates.THB : cached;
      setConfig('usd_thb_rate', rate);
      setConfig('last_fx_update', todayStr());
      return rate;
    }
  } catch (e) {
    logError('getFxRate', e.message);
  }
  return cached;
}
