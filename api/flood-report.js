import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyB6KvZWr8b2dXHxysIqXwk-SsdiuVNYv94",
  authDomain: "taskflow-plus-3fce7.firebaseapp.com",
  projectId: "taskflow-plus-3fce7"
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // Already initialized
}

const db = getFirestore(app);
const auth = getAuth(app);

export default async function handler(req, res) {
  const { id, photo } = req.query;

  if (!id) {
    return res.status(400).send("Missing report ID (?id=...)");
  }

  try {
    await signInAnonymously(auth);

    const reportRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_reports", id);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>ไม่พบเอกสารรายงาน</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>❌ ไม่พบรายงานรหัส ${id} ในระบบ</h2>
          <p>เอกสารอาจหมดอายุหรือรหัสอ้างอิงไม่ถูกต้อง</p>
        </body>
        </html>
      `);
    }

    const report = reportSnap.data();

    // 1. ถ้าเป็นการขอไฟล์รูปภาพดิบสำหรับ LINE Hero Image
    if (photo !== undefined) {
      const photoIndex = String(photo || '0');
      const photoRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_reports", id, "photos", photoIndex);
      const photoSnap = await getDoc(photoRef);

      if (photoSnap.exists() && photoSnap.data().dataUrl) {
        const dataUrl = photoSnap.data().dataUrl;
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
          return res.status(200).send(buffer);
        }
      }
      return res.status(404).send("Photo not found");
    }

    // 2. ดึงภาพถ่ายทั้งหมดจาก Subcollection
    const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_reports", id, "photos"));
    const photos = [];
    photosSnap.forEach(docSnap => {
      photos.push(docSnap.data());
    });
    // เรียงตามลำดับ index
    photos.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    // สถานะและ Badge สไตล์ Land & Houses
    const isCritical = report.status === 'CRITICAL';
    const isWatch = report.status === 'WATCH';
    const statusConfig = isCritical
      ? {
          label: 'วิกฤติ / เร่งด่วน (Emergency)',
          sub: 'ระดับน้ำท่วมขังสูง หรือคลองระบายน้ำภายนอกหนุนสูง',
          badgeBg: '#fef2f2',
          badgeBorder: '#ef4444',
          badgeText: '#b91c1c',
          dotColor: '#ef4444'
        }
      : isWatch
      ? {
          label: 'เฝ้าระวัง (Watch & Alert)',
          sub: 'มีน้ำขังผิวจราจร 5-10 ซม. เร่งเดินเครื่องสูบระบาย',
          badgeBg: '#fefce8',
          badgeBorder: '#eab308',
          badgeText: '#854d0e',
          dotColor: '#eab308'
        }
      : {
          label: 'สภาวะปกติ (Normal Condition)',
          sub: 'ระบายน้ำได้คล่องตัว ผิวจราจรแห้ง ไม่มีน้ำท่วมขัง',
          badgeBg: '#ecfdf5',
          badgeBorder: '#10b981',
          badgeText: '#065f46',
          dotColor: '#10b981'
        };

    const weather = report.weather || {
      temp: 31,
      feelsLike: 35,
      humidity: 78,
      windSpeed: 10,
      condition: 'มีเมฆเป็นส่วนมาก',
      icon: '⛅',
      rainProb: 65,
      expectedRain24h: '12.0',
      source: 'The Weather Channel / กรมอุตุนิยมวิทยา'
    };

    // Render HTML เต็มรูปแบบ A4 Executive Corporate PDF
    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>รายงานสถานการณ์น้ำท่วมและการระบายน้ำ [${report.projectCode || ''}] - Land & Houses</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --lh-navy: #0C2340;
      --lh-navy-light: #163A63;
      --lh-gold: #C5A880;
      --lh-gold-dark: #A3845B;
      --lh-gray-bg: #F8FAFC;
      --lh-border: #E2E8F0;
      --lh-text: #1E293B;
      --lh-muted: #64748B;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Prompt', 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #E2E8F0;
      color: var(--lh-text);
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Floating Print Button */
    .print-bar {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      gap: 10px;
    }

    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #0C2340 0%, #163A63 100%);
      color: #FFFFFF;
      border: 1px solid #C5A880;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(12, 35, 64, 0.35);
      transition: all 0.2s ease;
    }

    .btn-print:hover {
      background: #C5A880;
      color: #0C2340;
      transform: translateY(-2px);
    }

    /* A4 Document Container */
    .page-container {
      width: 210mm;
      min-height: 297mm;
      margin: 24px auto;
      background: #FFFFFF;
      box-shadow: 0 10px 25px rgba(0,0,0,0.12);
      padding: 12mm 14mm;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* Header Section */
    .header {
      border-bottom: 2px solid var(--lh-navy);
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .brand-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .lh-emblem {
      width: 44px;
      height: 44px;
      background: var(--lh-navy);
      border: 2px solid var(--lh-gold);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 18px;
      letter-spacing: 1px;
    }

    .company-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--lh-navy);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .report-title {
      font-size: 17px;
      font-weight: 700;
      color: #0F172A;
      margin-top: 2px;
    }

    .report-subtitle {
      font-size: 11px;
      color: var(--lh-muted);
      letter-spacing: 0.3px;
    }

    .doc-meta {
      text-align: right;
      font-size: 11px;
      color: var(--lh-muted);
      line-height: 1.5;
    }

    .doc-ref {
      font-weight: 700;
      color: var(--lh-navy);
      font-size: 12px;
      background: #F1F5F9;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 2px;
    }

    /* Project Banner */
    .project-banner {
      background: linear-gradient(135deg, #0C2340 0%, #163A63 100%);
      color: #FFFFFF;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid var(--lh-gold);
    }

    .project-code-badge {
      background: var(--lh-gold);
      color: #0C2340;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 12px;
      margin-right: 8px;
    }

    .project-name {
      font-size: 15px;
      font-weight: 600;
    }

    .project-location {
      font-size: 11px;
      color: #CBD5E1;
      margin-top: 2px;
    }

    .survey-time {
      text-align: right;
      font-size: 12px;
      color: #E2E8F0;
    }

    /* Two-Column Top Cards (Status & Weather) */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }

    .card {
      border: 1px solid var(--lh-border);
      border-radius: 8px;
      background: #FFFFFF;
      padding: 12px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--lh-navy);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--lh-border);
      padding-bottom: 6px;
      margin-bottom: 8px;
    }

    /* Status Card Specifics */
    .status-badge-box {
      background: ${statusConfig.badgeBg};
      border: 1.5px solid ${statusConfig.badgeBorder};
      color: ${statusConfig.badgeText};
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${statusConfig.dotColor};
      box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
      flex-shrink: 0;
    }

    .status-badge-title {
      font-size: 13px;
      font-weight: 700;
    }

    .status-badge-desc {
      font-size: 10px;
      opacity: 0.85;
    }

    .metric-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      border-bottom: 1px dashed #F1F5F9;
    }

    .metric-label {
      color: var(--lh-muted);
    }

    .metric-val {
      font-weight: 600;
      color: var(--lh-text);
    }

    /* Weather Card Specifics */
    .weather-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      background: #F8FAFC;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #EDF2F7;
    }

    .weather-temp {
      font-size: 22px;
      font-weight: 700;
      color: var(--lh-navy);
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .weather-condition {
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }

    .weather-credit {
      font-size: 9px;
      color: var(--lh-muted);
      text-align: right;
      margin-top: 6px;
      font-style: italic;
    }

    /* Executive Assessment Box */
    .assessment-box {
      border: 1px solid var(--lh-border);
      border-radius: 8px;
      background: #F8FAFC;
      padding: 10px 14px;
      margin-bottom: 14px;
      border-left: 3px solid var(--lh-navy);
    }

    .assessment-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--lh-navy);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .assessment-text {
      font-size: 11.5px;
      color: #334155;
      line-height: 1.5;
    }

    /* Photo Grid (5-6 Photos) */
    .photo-section-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--lh-navy);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .photo-card {
      border: 1px solid var(--lh-border);
      border-radius: 6px;
      overflow: hidden;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .photo-img-box {
      width: 100%;
      height: 118px;
      background: #E2E8F0;
      overflow: hidden;
      position: relative;
    }

    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .photo-caption {
      padding: 6px 8px;
      font-size: 10px;
      color: #334155;
      font-weight: 500;
      background: #FFFFFF;
      border-top: 1px solid #F1F5F9;
      line-height: 1.35;
      min-height: 34px;
    }

    /* Footer Section (Corporate Document - NO REPORTER NAME) */
    .footer {
      margin-top: auto;
      border-top: 1px solid var(--lh-border);
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9.5px;
      color: var(--lh-muted);
    }

    .footer-col {
      line-height: 1.5;
    }

    .footer-col-right {
      text-align: right;
    }

    .corporate-seal {
      font-weight: 700;
      color: var(--lh-navy);
      font-size: 10px;
    }

    /* Print Media Rules */
    @media print {
      body {
        background: #FFFFFF;
        margin: 0;
        padding: 0;
      }
      .print-bar {
        display: none !important;
      }
      .page-container {
        width: 100% !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      @page {
        size: A4 portrait;
        margin: 10mm 10mm 10mm 10mm;
      }
      .photo-card {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Action Button -->
  <div class="print-bar">
    <button class="btn-print" onclick="window.print()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
        <path d="M6 14h12v8H6z"/>
      </svg>
      📥 บันทึกเป็น PDF / สั่งพิมพ์
    </button>
  </div>

  <div class="page-container">
    <!-- Header -->
    <div class="header">
      <div class="brand-title">
        <div class="lh-emblem">LH</div>
        <div>
          <div class="company-name">Land and Houses Public Company Limited</div>
          <div class="report-title">รายงานสถานการณ์การระบายน้ำและการเฝ้าระวังน้ำท่วมขัง</div>
          <div class="report-subtitle">DRAINAGE & FLOOD MONITORING EXECUTIVE REPORT</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-ref">${report.reportId || id}</div>
        <div>วันที่สำรวจ: <strong>${report.surveyDateThai || '-'}</strong></div>
        <div>เวลาสำรวจ: <strong>${report.surveyTimeThai || '-'} น.</strong></div>
      </div>
    </div>

    <!-- Project Banner -->
    <div class="project-banner">
      <div>
        <div style="display: flex; align-items: center;">
          <span class="project-code-badge">${report.projectCode || '-'}</span>
          <span class="project-name">${report.projectName || 'โครงการ แลนด์ แอนด์ เฮ้าส์'}</span>
        </div>
        <div class="project-location">📍 พื้นที่: ${report.projectArea || 'กรุงเทพฯ และปริมณฑล'}</div>
      </div>
      <div class="survey-time">
        <div style="font-weight: 600; color: #FFFFFF;">ระบบบริหารความปลอดภัยหน้างาน</div>
        <div style="font-size: 11px; color: var(--lh-gold);">LH Infrastructure & Safety Standard</div>
      </div>
    </div>

    <!-- Top Grid: Status & Weather -->
    <div class="grid-2">
      <!-- Status Card -->
      <div class="card">
        <div class="card-header">
          <span>⚡</span>
          <span>1. การประเมินสถานะภาพรวม (Overall Status)</span>
        </div>
        <div class="status-badge-box">
          <div class="status-dot"></div>
          <div>
            <div class="status-badge-title">${statusConfig.label}</div>
            <div class="status-badge-desc">${statusConfig.sub}</div>
          </div>
        </div>
        <div class="metric-list">
          <div class="metric-row">
            <span class="metric-label">ระดับน้ำท่วมขังผิวถนน:</span>
            <span class="metric-val">${report.waterLevel || '0 - 5 ซม. (สภาวะปกติ)'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">สถานะเครื่องสูบน้ำ:</span>
            <span class="metric-val">${report.pumpsRunning || 'พร้อมใช้งาน 100% (เดินเครื่องตามรอบ)'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">สภาพทางระบายน้ำ / คลอง:</span>
            <span class="metric-val">${report.drainageCondition || 'ระบายได้คล่องตัว ตะแกรงเปิดโล่ง'}</span>
          </div>
        </div>
      </div>

      <!-- Weather Card (The Weather Channel) -->
      <div class="card">
        <div class="card-header">
          <span>🌤️</span>
          <span>2. สภาพอากาศประจำพื้นที่ (Local Weather)</span>
        </div>
        <div class="weather-main">
          <div>
            <div class="weather-temp">
              <span>${weather.temp}°C</span>
              <span style="font-size: 11px; font-weight: normal; color: var(--lh-muted);">(รู้สึกจริง ${weather.feelsLike}°C)</span>
            </div>
            <div class="weather-condition">${weather.icon} ${weather.condition}</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <div>โอกาสเกิดฝน 24 ชม.: <strong style="color: #0284C7;">${weather.rainProb}%</strong></div>
            <div>ปริมาณฝนคาดการณ์: <strong>${weather.expectedRain24h} มม.</strong></div>
          </div>
        </div>
        <div class="metric-list">
          <div class="metric-row">
            <span class="metric-label">ความชื้นสัมพัทธ์:</span>
            <span class="metric-val">${weather.humidity}%</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">ความเร็วลม:</span>
            <span class="metric-val">${weather.windSpeed} กม./ชม.</span>
          </div>
        </div>
        <div class="weather-credit">อ้างอิงข้อมูล: ${weather.source || 'The Weather Channel / กรมอุตุนิยมวิทยา'}</div>
      </div>
    </div>

    <!-- Executive Assessment -->
    <div class="assessment-box">
      <div class="assessment-title">
        <span>📋</span>
        <span>3. บทวิเคราะห์และการประเมินสถานการณ์ (Executive Assessment & Action Taken)</span>
      </div>
      <div class="assessment-text">
        ${report.executiveSummary || report.notes || 'จากการตรวจสอบหน้างาน สภาพการระบายน้ำของโครงการสามารถรองรับปริมาณน้ำฝนได้อย่างมีประสิทธิภาพ แนวท่อระบายน้ำหลักและสถานีสูบน้ำทำงานเป็นปกติ ทีมงานเตรียมพร้อมเฝ้าระวังต่อเนื่องตามมาตรฐานความปลอดภัย'}
      </div>
    </div>

    <!-- Photo Section -->
    <div class="photo-section-title">
      <span>📸 4. ภาพถ่ายสำรวจหน้างาน (Photographic Evidence: ${photos.length} ภาพ)</span>
      <span style="font-size: 10px; font-weight: normal; color: var(--lh-muted);">บันทึกเวลาจริงตามมาตรฐานตรวจสอบคุณภาพ</span>
    </div>

    <div class="photo-grid">
      ${photos.map((p, idx) => `
        <div class="photo-card">
          <div class="photo-img-box">
            <img class="photo-img" src="${p.dataUrl || `/api/flood-report?id=${id}&photo=${idx}`}" alt="Photo ${idx + 1}" loading="lazy" />
          </div>
          <div class="photo-caption">
            <strong>ภาพที่ ${idx + 1}:</strong> ${p.caption || 'ภาพถ่ายสภาพหน้างานโครงการ'}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Footer (Corporate Signature - NO REPORTER NAME) -->
    <div class="footer">
      <div class="footer-col">
        <div class="corporate-seal">ฝ่ายบริการหลังการส่งมอบและบำรุงรักษาสาธารณูปโภค</div>
        <div>บริษัท แลนด์ แอนด์ เฮ้าส์ จำกัด (มหาชน) | LAND AND HOUSES PUBLIC COMPANY LIMITED</div>
        <div>เอกสารรายงานผลการสำรวจภายในองค์กร ห้ามเผยแพร่ภายนอกโดยไม่ได้รับอนุญาต</div>
      </div>
      <div class="footer-col footer-col-right">
        <div>รหัสอ้างอิงความปลอดภัย: <strong>LH-FL-SEC-${id.slice(-6).toUpperCase()}</strong></div>
        <div>ระบบออกเอกสารอัตโนมัติ: <strong>LH TaskFlow Core v2.4</strong></div>
        <div>พิมพ์ / จัดทำข้อมูล ณ วันที่: ${report.generatedAtThai || '-'}</div>
      </div>
    </div>
  </div>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return res.status(200).send(html);

  } catch (error) {
    console.error("Flood Report Error:", error);
    return res.status(500).send(`Internal Server Error: ${error.message}`);
  }
}
