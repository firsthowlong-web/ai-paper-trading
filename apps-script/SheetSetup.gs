// ============================================================
// SheetSetup.gs — รันครั้งเดียวเพื่อสร้าง sheet ทั้งหมด
// เรียกผ่าน API: action=setupSheets หรือรันโดยตรงใน editor
// ============================================================

function setupSheets() {
  const ss = getSpreadsheet();

  const schemas = {
    transactions:    ['txn_id','date','symbol','market','action','qty','price','fee','realized_pl','note'],
    holdings:        ['symbol','market','qty','avg_cost','current_price','open_price','market_value','unrealized_pl','unrealized_pct','day_change_pct'],
    cash:            ['starting_balance','current_balance'],
    watchlist:       ['symbol','name','market','added_date'],
    news:            ['news_id','date','source','symbol','title','content','url'],
    ai_analysis:     ['date','symbol','sentiment','score','key_drivers','recommendation','reason','risks','raw_json'],
    daily_snapshot:  ['date','total_value','cash','invested','total_pl','total_pl_pct','set_index','sp500_index'],
    config:          ['key','value'],
    logs:            ['timestamp','function','status','message']
  };

  const HDR_BG    = '#1e293b';
  const HDR_COLOR = '#ffffff';

  for (const [name, headers] of Object.entries(schemas)) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    else        sheet.clearContents();

    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers])
         .setFontWeight('bold')
         .setBackground(HDR_BG)
         .setFontColor(HDR_COLOR);
    sheet.setFrozenRows(1);
  }

  // Config defaults
  const configSheet = ss.getSheetByName('config');
  const defaults = [
    ['starting_balance',    1000000],
    ['base_currency',       'THB'],
    ['ai_provider',         'gemini'],
    ['ai_run',              'open'],          // open | close
    ['max_ai_calls_per_day', 5],
    ['ai_calls_today',      0],
    ['ai_calls_date',       ''],
    ['commission_rate',     0.0017],          // 0.17%
    ['commission_min_thb',  20],
    ['commission_min_usd',  0.50],
    ['usd_thb_rate',        35],
    ['last_fx_update',      ''],
    ['last_price_update',   ''],
    ['last_analysis_date',  ''],
  ];
  defaults.forEach(row => configSheet.appendRow(row));

  // Starting cash
  ss.getSheetByName('cash').appendRow([1000000, 1000000]);

  logOK('setupSheets', 'Setup complete — 9 sheets created');
  return { ok: true, message: 'Setup สำเร็จ! ดู sheet logs สำหรับรายละเอียด' };
}
