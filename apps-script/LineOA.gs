// ============================================================
// LineOA.gs — ส่งสรุปประจำวันเข้า LINE OA
// ============================================================

function pushLineMorning(analysisResult) {
  const fxRate  = getFxRate();
  const { portfolio, holdings } = getDashboard();

  let msg = `📊 สรุปพอร์ตเช้า — ${todayStr()}\n\n`;
  msg += `💰 มูลค่ารวม: ${_fmtTHB(portfolio.total_value)}\n`;
  msg += `💵 เงินสด: ${_fmtTHB(portfolio.cash)}\n`;
  msg += `📈 กำไร/ขาดทุนรวม: ${_fmtPL(portfolio.total_pl)} (${_fmtPct(portfolio.total_pl_pct)})\n`;
  msg += `💱 USD/THB: ${fxRate}\n\n`;

  if (analysisResult?.market) {
    try {
      const m = JSON.parse(analysisResult.market.raw_json || '{}');
      msg += `🔭 มุมมองตลาด: ${m.market_outlook || 'N/A'}\n`;
      msg += `${m.outlook_reason || ''}\n\n`;
    } catch (_) {}
  }

  if (analysisResult?.stocks?.length) {
    msg += `🔍 AI วิเคราะห์หุ้น:\n`;
    analysisResult.stocks.slice(0, 5).forEach(s => {
      const emoji = s.sentiment?.includes('บวก') ? '🟢'
                  : s.sentiment?.includes('ลบ')  ? '🔴' : '🟡';
      msg += `${emoji} ${s.symbol}: ${s.sentiment} (${s.score}/10) — ${s.recommendation}\n`;
    });
    msg += '\n';
  }

  msg += `━━━━━━━━━━━━━━━\n⚠️ เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำลงทุน`;

  _sendLine(msg);
}

function pushLineEvening(snapshot) {
  let msg = `🌙 สรุปพอร์ตปิดตลาด — ${todayStr()}\n\n`;
  msg += `💰 มูลค่ารวม: ${_fmtTHB(snapshot.total_value)}\n`;
  msg += `💵 เงินสด: ${_fmtTHB(snapshot.cash)}\n`;
  msg += `📊 ลงทุน: ${_fmtTHB(snapshot.invested)}\n`;
  msg += `📈 กำไร/ขาดทุนรวม: ${_fmtPL(snapshot.total_pl)} (${_fmtPct(snapshot.total_pl_pct)})\n`;

  if (snapshot.set_index) msg += `📉 SET Index: ${snapshot.set_index.toLocaleString('th-TH')}\n`;
  if (snapshot.sp500_index) msg += `🇺🇸 S&P500: ${snapshot.sp500_index.toLocaleString('en-US')}\n`;

  msg += `\n━━━━━━━━━━━━━━━\n⚠️ เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำลงทุน`;

  _sendLine(msg);
}

function _sendLine(message) {
  const token    = getProp('LINE_TOKEN');
  if (!token) { logError('_sendLine', 'LINE_TOKEN not set'); return; }

  const pushTo   = getProp('LINE_PUSH_TO'); // userId, groupId, or roomId

  const endpoint = pushTo
    ? 'https://api.line.me/v2/bot/message/push'
    : 'https://api.line.me/v2/bot/message/broadcast';

  const body = pushTo
    ? { to: pushTo, messages: [{ type: 'text', text: message }] }
    : { messages: [{ type: 'text', text: message }] };

  try {
    const res = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    if (code === 200) {
      logOK('_sendLine', 'LINE push sent');
    } else {
      logError('_sendLine', `HTTP ${code}: ${res.getContentText().slice(0, 300)}`);
    }
  } catch (e) {
    logError('_sendLine', e.message);
  }
}

function _fmtTHB(n) {
  return '฿' + Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _fmtPL(n) {
  const sign = n >= 0 ? '+' : '';
  return sign + '฿' + Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _fmtPct(n) {
  const sign = n >= 0 ? '+' : '';
  return sign + Number(n).toFixed(2) + '%';
}
