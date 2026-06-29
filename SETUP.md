# AI Paper Trading — คู่มือติดตั้ง

## ขั้นตอนที่ 1 — สร้าง Google Spreadsheet

1. ไปที่ [sheets.google.com](https://sheets.google.com) → สร้าง Spreadsheet ใหม่
2. ตั้งชื่อตามชอบ เช่น `AI Paper Trading DB`
3. **Copy Spreadsheet ID** จาก URL:
   `https://docs.google.com/spreadsheets/d/**THIS_IS_THE_ID**/edit`

---

## ขั้นตอนที่ 2 — สร้าง Apps Script Project

1. ใน Spreadsheet → เมนู **Extensions → Apps Script**
2. ลบโค้ดเริ่มต้นออก
3. สร้าง file ใหม่ (ปุ่ม + ด้านซ้าย) แล้ว **copy-paste** โค้ดจากโฟลเดอร์ `apps-script/` ทีละไฟล์:
   - `Code.gs`
   - `SheetSetup.gs`
   - `Portfolio.gs`
   - `StockPrice.gs`
   - `GeminiAI.gs`
   - `LineOA.gs`
   - `Scheduler.gs`

4. ตั้ง **Project Settings → Time zone → (GMT+07:00) Bangkok**

---

## ขั้นตอนที่ 3 — ตั้ง Script Properties (เก็บ API keys)

ใน Apps Script → Project Settings → **Script Properties** → Add property:

| Property | ค่า |
|---|---|
| `SHEET_ID` | Spreadsheet ID จากขั้นตอนที่ 1 |
| `API_TOKEN` | รหัสลับที่ตั้งเอง เช่น `mySecretToken2024!` |
| `GEMINI_API_KEY` | API key จาก [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `LINE_TOKEN` | LINE Messaging API Channel Access Token |
| `LINE_PUSH_TO` | userId/groupId ของ LINE (ถ้าต้องการ push แทน broadcast) |

---

## ขั้นตอนที่ 4 — Run Setup

1. ใน Apps Script editor → เลือก function **`setupSheets`** → กด Run ▶
2. อนุญาต permissions (OAuth)
3. ตรวจสอบใน Spreadsheet ว่ามี 9 sheets: `transactions`, `holdings`, `cash`, `watchlist`, `news`, `ai_analysis`, `daily_snapshot`, `config`, `logs`

---

## ขั้นตอนที่ 5 — Deploy Web App

1. Apps Script → **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. คลิก Deploy → **Copy Web App URL**

---

## ขั้นตอนที่ 6 — ตั้งค่า Frontend

แก้ไขไฟล์ `js/config.js`:

```javascript
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  TOKEN: 'mySecretToken2024!',  // ต้องตรงกับ API_TOKEN ใน Script Properties
};
```

---

## ขั้นตอนที่ 7 — ตั้ง Triggers

1. กลับไป Apps Script → เลือก function **`setupTriggers`** → กด Run ▶
2. ระบบจะตั้ง trigger อัตโนมัติ 2 รอบ:
   - **10:00 น.** (เปิดตลาด): อัปเดตราคา + AI วิเคราะห์ + push LINE
   - **16:30 น.** (ปิดตลาด): อัปเดตราคาปิด + บันทึก snapshot + push LINE

---

## ขั้นตอนที่ 8 — Push ขึ้น GitHub Pages

```bash
# ใน terminal (root ของ paper-trading/)
git init
git add .
git commit -m "Initial paper trading app"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

จากนั้น GitHub → Settings → Pages → Source: `main` branch → Save

URL เว็บ: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## เพิ่มหุ้นและเริ่มใช้งาน

1. เปิดเว็บ → หน้า **Watchlist** → เพิ่มหุ้นที่สนใจ (SET: `KBANK`, US: `AAPL`)
2. หน้า **Team Input** → กรอกข่าวประจำวัน
3. หน้า **Trade** → ทดลองซื้อหุ้น (เงินเริ่มต้น ฿1,000,000)
4. หน้า **Dashboard** → ดูพอร์ตรวมและบทวิเคราะห์ AI

---

## ค่า config ที่ปรับได้ (sheet `config`)

| key | default | คำอธิบาย |
|---|---|---|
| `starting_balance` | 1,000,000 | เงินเริ่มต้น (THB) |
| `commission_rate` | 0.0017 | ค่าธรรมเนียม 0.17% |
| `commission_min_thb` | 20 | ค่า commission ขั้นต่ำ SET |
| `commission_min_usd` | 0.50 | ค่า commission ขั้นต่ำ US |
| `max_ai_calls_per_day` | 5 | จำกัด AI calls/วัน |
| `ai_run` | open | รอบที่ AI รัน (open/close) |

---

## Troubleshooting

**เว็บโหลดไม่ขึ้น / CORS error**
- ตรวจ `SCRIPT_URL` ใน `config.js` ว่าตรงกับ deployment URL
- ตรวจว่า Deploy เป็น "Anyone" ไม่ใช่ "Only myself"

**Token error / Unauthorized**
- ตรวจ `TOKEN` ใน `config.js` ตรงกับ `API_TOKEN` ใน Script Properties ไหม

**ราคาหุ้นไม่อัปเดต**
- ดู sheet `logs` — Yahoo Finance อาจ rate limit ชั่วคราว รอและลองใหม่
- หุ้นไทยใช้ suffix `.BK` อัตโนมัติ (ระบบจัดการเอง)

**AI ไม่วิเคราะห์**
- ตรวจ `GEMINI_API_KEY` ใน Script Properties
- ตรวจ `ai_calls_today` ใน config sheet ว่าไม่เกิน `max_ai_calls_per_day`
- ดู sheet `logs` หาข้อผิดพลาด

**LINE ไม่ได้รับข้อความ**
- ตรวจ `LINE_TOKEN` และ `LINE_PUSH_TO` ใน Script Properties
- ถ้าไม่มี `LINE_PUSH_TO` จะใช้ broadcast (ส่งให้ทุก follower)
