// ============================================================
// Scheduler.gs — Time-driven triggers + Snapshot
// ============================================================

// รันโดย trigger รอบเช้า (SET ~10:00 น. / US ตรวจหลังตี 3)
function morningRoutine() {
  try {
    logOK('morningRoutine', 'Start morning routine');

    const priceResult = updatePrices('open');
    logOK('morningRoutine', `Prices: ${JSON.stringify(priceResult)}`);

    const aiRun = String(getConfig('ai_run') || 'open');
    let analysisResult = null;
    if (aiRun === 'open') {
      analysisResult = runDailyAnalysis();
      logOK('morningRoutine', `AI analysis: ${JSON.stringify(analysisResult).slice(0, 200)}`);
    }

    pushLineMorning(analysisResult);
    logOK('morningRoutine', 'Morning routine complete');
  } catch (e) {
    logError('morningRoutine', e.message + '\n' + e.stack);
  }
}

// รันโดย trigger รอบเย็น (SET ~16:30 น. / US ตรวจตีเช้า)
function eveningRoutine() {
  try {
    logOK('eveningRoutine', 'Start evening routine');

    const priceResult = updatePrices('close');
    logOK('eveningRoutine', `Prices: ${JSON.stringify(priceResult)}`);

    const snapshot = takeSnapshot(
      priceResult.set_index  || 0,
      priceResult.sp500      || 0
    );

    const aiRun = String(getConfig('ai_run') || 'open');
    if (aiRun === 'close') {
      const analysisResult = runDailyAnalysis();
      logOK('eveningRoutine', `AI analysis: ${JSON.stringify(analysisResult).slice(0, 200)}`);
    }

    pushLineEvening(snapshot);
    logOK('eveningRoutine', 'Evening routine complete');
  } catch (e) {
    logError('eveningRoutine', e.message + '\n' + e.stack);
  }
}

// ── Snapshot ──────────────────────────────────────────────────

function takeSnapshot(setIndex, sp500Index) {
  const fxRate   = getFxRate();
  const holdings = _getHoldingsRaw();
  const cash     = _getCash();
  const startBal = Number(getConfig('starting_balance') || 1000000);

  let totalInvested = 0;
  holdings.forEach(h => {
    totalInvested += h.market === 'US'
      ? h.market_value * fxRate
      : h.market_value;
  });

  const totalValue = totalInvested + cash;
  const totalPL    = totalValue - startBal;
  const totalPLPct = startBal > 0 ? (totalPL / startBal) * 100 : 0;

  const sheet   = getSheet('daily_snapshot');
  const today   = todayStr();
  const rows    = sheet.getDataRange().getValues();
  const newRow  = [
    today,
    Math.round(totalValue  * 100) / 100,
    Math.round(cash        * 100) / 100,
    Math.round(totalInvested * 100) / 100,
    Math.round(totalPL     * 100) / 100,
    Math.round(totalPLPct  * 100) / 100,
    setIndex,
    sp500Index,
  ];

  // Upsert: check if today's snapshot already exists
  for (let i = 1; i < rows.length; i++) {
    const d = Utilities.formatDate(new Date(rows[i][0]), 'Asia/Bangkok', 'yyyy-MM-dd');
    if (d === today) {
      sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
      logOK('takeSnapshot', `Updated snapshot for ${today}`);
      return { date: today, total_value: totalValue, cash, invested: totalInvested, total_pl: totalPL, total_pl_pct: totalPLPct, set_index: setIndex, sp500_index: sp500Index };
    }
  }
  sheet.appendRow(newRow);
  logOK('takeSnapshot', `New snapshot for ${today}: ${totalValue}`);
  return { date: today, total_value: totalValue, cash, invested: totalInvested, total_pl: totalPL, total_pl_pct: totalPLPct, set_index: setIndex, sp500_index: sp500Index };
}

// ── Trigger Setup ─────────────────────────────────────────────

function setupTriggers() {
  // Remove existing triggers first to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // SET market: เปิด 10:00, ปิด 16:30 (Asia/Bangkok)
  // Apps Script trigger ใช้ UTC timezone แต่เราตั้ง project เป็น Asia/Bangkok
  // → 10:00 BKK = 03:00 UTC | 16:30 BKK = 09:30 UTC

  // Morning: trigger ที่ 10:00 น. เวลาไทย (ปรับตาม project timezone)
  ScriptApp.newTrigger('morningRoutine')
    .timeBased()
    .atHour(10)
    .nearMinute(0)
    .everyDays(1)
    .create();

  // Evening: trigger ที่ 16:30 น. เวลาไทย
  ScriptApp.newTrigger('eveningRoutine')
    .timeBased()
    .atHour(16)
    .nearMinute(30)
    .everyDays(1)
    .create();

  logOK('setupTriggers', 'Triggers set: morning=10:00, evening=16:30 (Bangkok time)');
  return {
    ok: true,
    message: 'ตั้ง trigger สำเร็จ: เช้า 10:00 น. / เย็น 16:30 น. (เวลาไทย)',
    note: 'ตรวจสอบ Project Settings > Time zone ตั้งเป็น (GMT+07:00) Bangkok ด้วย'
  };
}
