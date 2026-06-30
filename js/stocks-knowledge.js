// ============================================================
// stocks-knowledge.js — รายชื่อหุ้น (knowledge) สำหรับ dropdown/autocomplete
// ใช้เป็นตัวเลือกหลักตอนเพิ่มหุ้น ถ้าพิมพ์หุ้นที่ไม่อยู่ในลิสต์
// ระบบจะ fallback ไปดึงชื่อสดจาก Yahoo Finance (lookupStock) ให้อัตโนมัติ
// ============================================================

const STOCKS_KNOWLEDGE = [
  // ── SET (หุ้นไทย) ──────────────────────────────────────────
  { symbol: 'KBANK',  market: 'SET', name: 'ธนาคารกสิกรไทย' },
  { symbol: 'SCB',    market: 'SET', name: 'เอสซีบี เอกซ์' },
  { symbol: 'BBL',    market: 'SET', name: 'ธนาคารกรุงเทพ' },
  { symbol: 'KTB',    market: 'SET', name: 'ธนาคารกรุงไทย' },
  { symbol: 'TTB',    market: 'SET', name: 'ทีเอ็มบีธนชาต' },
  { symbol: 'KKP',    market: 'SET', name: 'เกียรตินาคินภัทร' },
  { symbol: 'TISCO',  market: 'SET', name: 'ทิสโก้ไฟแนนเชียลกรุ๊ป' },
  { symbol: 'MTC',    market: 'SET', name: 'เมืองไทย แคปปิตอล' },
  { symbol: 'SAWAD',  market: 'SET', name: 'ศรีสวัสดิ์ คอร์ปอเรชั่น' },
  { symbol: 'TIDLOR', market: 'SET', name: 'เงินติดล้อ' },
  { symbol: 'PTT',    market: 'SET', name: 'ปตท.' },
  { symbol: 'PTTEP',  market: 'SET', name: 'ปตท.สำรวจและผลิตปิโตรเลียม' },
  { symbol: 'PTTGC',  market: 'SET', name: 'พีทีที โกลบอล เคมิคอล' },
  { symbol: 'TOP',    market: 'SET', name: 'ไทยออยล์' },
  { symbol: 'IRPC',   market: 'SET', name: 'ไออาร์พีซี' },
  { symbol: 'BCP',    market: 'SET', name: 'บางจาก คอร์ปอเรชั่น' },
  { symbol: 'OR',     market: 'SET', name: 'ปตท. น้ำมันและการค้าปลีก' },
  { symbol: 'GULF',   market: 'SET', name: 'กัลฟ์ เอ็นเนอร์จี ดีเวลลอปเมนท์' },
  { symbol: 'GPSC',   market: 'SET', name: 'โกลบอล เพาเวอร์ ซินเนอร์ยี่' },
  { symbol: 'EGCO',   market: 'SET', name: 'ผลิตไฟฟ้า' },
  { symbol: 'RATCH',  market: 'SET', name: 'ราช กรุ๊ป' },
  { symbol: 'BGRIM',  market: 'SET', name: 'บี.กริม เพาเวอร์' },
  { symbol: 'GUNKUL', market: 'SET', name: 'กันกุลเอ็นจิเนียริ่ง' },
  { symbol: 'AOT',    market: 'SET', name: 'ท่าอากาศยานไทย' },
  { symbol: 'BEM',    market: 'SET', name: 'ทางด่วนและรถไฟฟ้ากรุงเทพ' },
  { symbol: 'BTS',    market: 'SET', name: 'บีทีเอส กรุ๊ป โฮลดิ้งส์' },
  { symbol: 'CPALL',  market: 'SET', name: 'ซีพี ออลล์' },
  { symbol: 'CPAXT',  market: 'SET', name: 'ซีพี แอ็กซ์ตร้า' },
  { symbol: 'CPN',    market: 'SET', name: 'เซ็นทรัลพัฒนา' },
  { symbol: 'CRC',    market: 'SET', name: 'เซ็นทรัล รีเทล คอร์ปอเรชั่น' },
  { symbol: 'HMPRO',  market: 'SET', name: 'โฮม โปรดักส์ เซ็นเตอร์' },
  { symbol: 'BJC',    market: 'SET', name: 'เบอร์ลี่ ยุคเกอร์' },
  { symbol: 'TRUE',   market: 'SET', name: 'ทรู คอร์ปอเรชั่น' },
  { symbol: 'ADVANC', market: 'SET', name: 'แอดวานซ์ อินโฟร์ เซอร์วิส' },
  { symbol: 'INTUCH', market: 'SET', name: 'อินทัช โฮลดิ้งส์' },
  { symbol: 'DELTA',  market: 'SET', name: 'เดลต้า อีเลคโทรนิคส์ (ประเทศไทย)' },
  { symbol: 'KCE',    market: 'SET', name: 'เคซีอี อีเลคโทรนิคส์' },
  { symbol: 'HANA',   market: 'SET', name: 'ฮานา ไมโครอิเล็คโทรนิคส' },
  { symbol: 'SCC',    market: 'SET', name: 'ปูนซิเมนต์ไทย' },
  { symbol: 'SCGP',   market: 'SET', name: 'เอสซีจี แพคเกจจิ้ง' },
  { symbol: 'CPF',    market: 'SET', name: 'เจริญโภคภัณฑ์อาหาร' },
  { symbol: 'TU',     market: 'SET', name: 'ไทยยูเนี่ยน กรุ๊ป' },
  { symbol: 'MINT',   market: 'SET', name: 'ไมเนอร์ อินเตอร์เนชั่นแนล' },
  { symbol: 'CENTEL', market: 'SET', name: 'โรงแรมเซ็นทรัลพลาซา' },
  { symbol: 'ERW',    market: 'SET', name: 'ดิ เอราวัณ กรุ๊ป' },
  { symbol: 'BDMS',   market: 'SET', name: 'กรุงเทพดุสิตเวชการ' },
  { symbol: 'BH',     market: 'SET', name: 'โรงพยาบาลบำรุงราษฎร์' },
  { symbol: 'BCH',    market: 'SET', name: 'บางกอก เชน ฮอสปิทอล' },
  { symbol: 'CHG',    market: 'SET', name: 'โรงพยาบาลจุฬารัตน์' },
  { symbol: 'WHA',    market: 'SET', name: 'ดับบลิวเอชเอ คอร์ปอเรชั่น' },
  { symbol: 'AMATA',  market: 'SET', name: 'อมตะ คอร์ปอเรชัน' },
  { symbol: 'LH',     market: 'SET', name: 'แลนด์ แอนด์ เฮ้าส์' },
  { symbol: 'AP',     market: 'SET', name: 'เอพี (ไทยแลนด์)' },
  { symbol: 'SPALI',  market: 'SET', name: 'ศุภาลัย' },

  // ── US (หุ้นอเมริกา) ──────────────────────────────────────
  { symbol: 'AAPL',  market: 'US', name: 'Apple Inc.' },
  { symbol: 'MSFT',  market: 'US', name: 'Microsoft Corporation' },
  { symbol: 'NVDA',  market: 'US', name: 'NVIDIA Corporation' },
  { symbol: 'AMZN',  market: 'US', name: 'Amazon.com, Inc.' },
  { symbol: 'GOOGL', market: 'US', name: 'Alphabet Inc. (Google)' },
  { symbol: 'META',  market: 'US', name: 'Meta Platforms, Inc.' },
  { symbol: 'TSLA',  market: 'US', name: 'Tesla, Inc.' },
  { symbol: 'AVGO',  market: 'US', name: 'Broadcom Inc.' },
  { symbol: 'AMD',   market: 'US', name: 'Advanced Micro Devices, Inc.' },
  { symbol: 'NFLX',  market: 'US', name: 'Netflix, Inc.' },
  { symbol: 'INTC',  market: 'US', name: 'Intel Corporation' },
  { symbol: 'QCOM',  market: 'US', name: 'Qualcomm Incorporated' },
  { symbol: 'ORCL',  market: 'US', name: 'Oracle Corporation' },
  { symbol: 'CRM',   market: 'US', name: 'Salesforce, Inc.' },
  { symbol: 'ADBE',  market: 'US', name: 'Adobe Inc.' },
  { symbol: 'CSCO',  market: 'US', name: 'Cisco Systems, Inc.' },
  { symbol: 'IBM',   market: 'US', name: 'International Business Machines' },
  { symbol: 'TXN',   market: 'US', name: 'Texas Instruments Incorporated' },
  { symbol: 'MU',    market: 'US', name: 'Micron Technology, Inc.' },
  { symbol: 'PLTR',  market: 'US', name: 'Palantir Technologies Inc.' },
  { symbol: 'JPM',   market: 'US', name: 'JPMorgan Chase & Co.' },
  { symbol: 'BAC',   market: 'US', name: 'Bank of America Corporation' },
  { symbol: 'WFC',   market: 'US', name: 'Wells Fargo & Company' },
  { symbol: 'GS',    market: 'US', name: 'The Goldman Sachs Group, Inc.' },
  { symbol: 'MS',    market: 'US', name: 'Morgan Stanley' },
  { symbol: 'V',     market: 'US', name: 'Visa Inc.' },
  { symbol: 'MA',    market: 'US', name: 'Mastercard Incorporated' },
  { symbol: 'PYPL',  market: 'US', name: 'PayPal Holdings, Inc.' },
  { symbol: 'BRK-B', market: 'US', name: 'Berkshire Hathaway Inc.' },
  { symbol: 'JNJ',   market: 'US', name: 'Johnson & Johnson' },
  { symbol: 'UNH',   market: 'US', name: 'UnitedHealth Group Incorporated' },
  { symbol: 'PFE',   market: 'US', name: 'Pfizer Inc.' },
  { symbol: 'MRK',   market: 'US', name: 'Merck & Co., Inc.' },
  { symbol: 'ABBV',  market: 'US', name: 'AbbVie Inc.' },
  { symbol: 'LLY',   market: 'US', name: 'Eli Lilly and Company' },
  { symbol: 'KO',    market: 'US', name: 'The Coca-Cola Company' },
  { symbol: 'PEP',   market: 'US', name: 'PepsiCo, Inc.' },
  { symbol: 'WMT',   market: 'US', name: 'Walmart Inc.' },
  { symbol: 'COST',  market: 'US', name: 'Costco Wholesale Corporation' },
  { symbol: 'MCD',   market: 'US', name: "McDonald's Corporation" },
  { symbol: 'NKE',   market: 'US', name: 'NIKE, Inc.' },
  { symbol: 'SBUX',  market: 'US', name: 'Starbucks Corporation' },
  { symbol: 'DIS',   market: 'US', name: 'The Walt Disney Company' },
  { symbol: 'XOM',   market: 'US', name: 'Exxon Mobil Corporation' },
  { symbol: 'CVX',   market: 'US', name: 'Chevron Corporation' },
  { symbol: 'BA',    market: 'US', name: 'The Boeing Company' },
  { symbol: 'CAT',   market: 'US', name: 'Caterpillar Inc.' },
  { symbol: 'GE',    market: 'US', name: 'GE Aerospace' },
  { symbol: 'F',     market: 'US', name: 'Ford Motor Company' },
  { symbol: 'GM',    market: 'US', name: 'General Motors Company' },
  { symbol: 'T',     market: 'US', name: 'AT&T Inc.' },
  { symbol: 'VZ',    market: 'US', name: 'Verizon Communications Inc.' },
];

// ค้นหาในลิสต์ knowledge: คืนรายการที่ตรงกับ query (symbol หรือ ชื่อ)
// filterMarket = 'SET' | 'US' | null (ไม่กรอง)
function searchStocksKnowledge(query, filterMarket) {
  const q = String(query || '').trim().toUpperCase();
  let list = STOCKS_KNOWLEDGE;
  if (filterMarket) list = list.filter(s => s.market === filterMarket);
  if (!q) return list.slice(0, 50);
  return list.filter(s =>
    s.symbol.toUpperCase().includes(q) ||
    s.name.toUpperCase().includes(q)
  );
}

// หาหุ้นแบบ exact ตาม symbol (+market ถ้าระบุ)
function findStockInKnowledge(symbol, market) {
  const sym = String(symbol || '').trim().toUpperCase();
  return STOCKS_KNOWLEDGE.find(s =>
    s.symbol.toUpperCase() === sym && (!market || s.market === market)
  ) || null;
}
