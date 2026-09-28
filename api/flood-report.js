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
  const { id, photo, mode } = req.query;

  if (mode === 'executive') {
    return handleExecutiveSummary(req, res);
  }

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

    // 2. ดึงภาพถ่ายทั้งหมดจาก Subcollection (รองรับสูงสุด 10 ภาพ)
    const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_reports", id, "photos"));
    const photos = [];
    photosSnap.forEach(docSnap => {
      photos.push(docSnap.data());
    });
    photos.sort((a, b) => (Number(a.index ?? 0)) - (Number(b.index ?? 0)));

    // กำหนด Layout คอลัมน์ของภาพถ่าย
    const photoCount = photos.length;
    const gridCols = photoCount <= 4 ? 2 : photoCount <= 6 ? 3 : 4;
    const imgHeight = photoCount > 6 ? '102px' : photoCount > 4 ? '118px' : '135px';

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
          sub: 'ระดับน้ำคลองหนุนสูง หรือมีน้ำขังผิวจราจร เร่งเดินเครื่องสูบระบาย',
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
      temp: 29,
      feelsLike: 33,
      humidity: 80,
      windSpeed: 14,
      condition: 'ฝนฟ้าคะนอง / ลมแรง',
      icon: '⛈️',
      rainProb: 85,
      expectedRain24h: '38.4',
      stationName: 'สถานีตรวจวัดคลองสายหลัก (สสน. / กรมชลประทาน)',
      basinAlert: 'ระดับน้ำในคลองเฝ้าระวัง สูบระบายต่อเนื่อง',
      tmdAlert: 'ร่องมรสุมกำลังปานกลางพาดผ่านภาคกลาง',
      source: 'The Weather Channel / กรมอุตุนิยมวิทยา (TMD) / คลังข้อมูลน้ำแห่งชาติ (สสน.) / กรมชลประทาน'
    };

    // แยกประเด็นบทวิเคราะห์ให้อ่านง่าย (Structured Assessment Rows)
    const assessmentField = report.assessmentField || (report.waterLevel ? `ถนนหน้าและภายในโครงการ: ${report.waterLevel}` : 'ถนนสายหลักและภายในโครงการไม่มีน้ำท่วมขัง การสัญจรเข้า-ออกเป็นปกติ');
    const assessmentCanal = report.assessmentCanal || (report.drainageCondition ? `ระดับน้ำคลองภายนอก: ${report.drainageCondition}` : 'ระดับน้ำในคลองระบายน้ำอยู่ในเกณฑ์ควบคุม');
    const assessmentPumps = report.assessmentPumps || (report.pumpsRunning ? `ระบบระบายน้ำและเครื่องสูบ: ${report.pumpsRunning}` : 'ระบบป้องกันน้ำท่วมและเครื่องสูบน้ำทำงานปกติ');
    const assessmentOutlook = report.assessmentOutlook || `พยากรณ์อากาศ 24 ชม.: มีโอกาสเกิดฝนฟ้าคะนอง ${weather.rainProb}% ปริมาณฝนคาดการณ์ ${weather.expectedRain24h} มม. ให้ทีมงานเฝ้าระวังระดับน้ำคลองต่อเนื่องตลอด 24 ชั่วโมง`;

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
      margin: 20px auto;
      background: #FFFFFF;
      box-shadow: 0 10px 25px rgba(0,0,0,0.12);
      padding: 11mm 13mm;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* Header Section */
    .header {
      border-bottom: 2px solid var(--lh-navy);
      padding-bottom: 10px;
      margin-bottom: 12px;
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
      font-size: 14.5px;
      font-weight: 700;
      color: var(--lh-navy);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .report-title {
      font-size: 16.5px;
      font-weight: 700;
      color: #0F172A;
      margin-top: 1px;
    }

    .report-subtitle {
      font-size: 10.5px;
      color: var(--lh-muted);
      letter-spacing: 0.3px;
    }

    .doc-meta {
      text-align: right;
      font-size: 10.5px;
      color: var(--lh-muted);
      line-height: 1.5;
    }

    .doc-ref {
      font-weight: 700;
      color: var(--lh-navy);
      font-size: 11.5px;
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
      padding: 9px 14px;
      border-radius: 8px;
      margin-bottom: 12px;
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
      font-size: 14.5px;
      font-weight: 600;
    }

    .project-location {
      font-size: 10.5px;
      color: #CBD5E1;
      margin-top: 2px;
    }

    .survey-time {
      text-align: right;
      font-size: 11px;
      color: #E2E8F0;
    }

    /* Two-Column Top Cards (Status & Weather) */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      border: 1px solid var(--lh-border);
      border-radius: 8px;
      background: #FFFFFF;
      padding: 10px 12px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--lh-navy);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--lh-border);
      padding-bottom: 5px;
      margin-bottom: 7px;
    }

    /* Status Card Specifics */
    .status-badge-box {
      background: ${statusConfig.badgeBg};
      border: 1.5px solid ${statusConfig.badgeBorder};
      color: ${statusConfig.badgeText};
      border-radius: 6px;
      padding: 6px 9px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 7px;
    }

    .status-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: ${statusConfig.dotColor};
      box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
      flex-shrink: 0;
    }

    .status-badge-title {
      font-size: 12.5px;
      font-weight: 700;
    }

    .status-badge-desc {
      font-size: 9.5px;
      opacity: 0.9;
    }

    .metric-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 10.5px;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      border-bottom: 1px dashed #F1F5F9;
      gap: 6px;
    }

    .metric-label {
      color: var(--lh-muted);
      white-space: nowrap;
    }

    .metric-val {
      font-weight: 600;
      color: var(--lh-text);
      text-align: right;
    }

    /* Weather Card Specifics */
    .weather-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      background: #F8FAFC;
      padding: 5px 9px;
      border-radius: 6px;
      border: 1px solid #EDF2F7;
    }

    .weather-temp {
      font-size: 20px;
      font-weight: 700;
      color: var(--lh-navy);
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .weather-condition {
      font-size: 10.5px;
      font-weight: 600;
      color: #334155;
    }

    .weather-credit {
      font-size: 8.5px;
      color: var(--lh-muted);
      text-align: right;
      margin-top: 5px;
      font-style: italic;
    }

    /* Executive Assessment Box (Point 4: Clean Structured Rows) */
    .assessment-box {
      border: 1px solid var(--lh-border);
      border-radius: 8px;
      background: #F8FAFC;
      padding: 10px 12px;
      margin-bottom: 12px;
      border-left: 4px solid var(--lh-navy);
    }

    .assessment-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--lh-navy);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .assessment-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .assessment-item {
      display: flex;
      gap: 8px;
      font-size: 10.5px;
      line-height: 1.45;
      padding: 4px 8px;
      background: #FFFFFF;
      border-radius: 5px;
      border: 1px solid #EDF2F7;
    }

    .assessment-tag {
      font-weight: 700;
      color: var(--lh-navy);
      white-space: nowrap;
      min-width: 145px;
    }

    .assessment-val {
      color: #334155;
    }

    /* Photo Grid (Point 6: Clean Layout, No Captions, Up to 10 Photos) */
    .photo-section-title {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--lh-navy);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(${gridCols}, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .photo-card {
      border: 1px solid var(--lh-border);
      border-radius: 6px;
      overflow: hidden;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      position: relative;
    }

    .photo-img-box {
      width: 100%;
      height: ${imgHeight};
      background: #E2E8F0;
      overflow: hidden;
      position: relative;
    }

    .photo-badge {
      position: absolute;
      top: 5px;
      left: 5px;
      background: rgba(12, 35, 64, 0.82);
      color: #FFFFFF;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
      z-index: 2;
      border: 1px solid rgba(197, 168, 128, 0.4);
      backdrop-filter: blur(2px);
    }

    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Footer Section (Corporate Document - NO REPORTER NAME) */
    .footer {
      margin-top: auto;
      border-top: 1px solid var(--lh-border);
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9px;
      color: var(--lh-muted);
    }

    .footer-col {
      line-height: 1.45;
    }

    .footer-col-right {
      text-align: right;
    }

    .corporate-seal {
      font-weight: 700;
      color: var(--lh-navy);
      font-size: 9.5px;
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
        margin: 8mm 8mm 8mm 8mm;
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
        <div style="font-size: 10.5px; color: var(--lh-gold);">LH Infrastructure & Safety Standard</div>
      </div>
    </div>

    <!-- Top Grid: Status & Weather / Thai Water Sources -->
    <div class="grid-2">
      <!-- Status Card (Points 2 & 3: Directly reflects user's LINE notes) -->
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
            <span class="metric-val">${report.waterLevel || 'ไม่มีน้ำท่วมขัง (สภาวะปกติ)'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">สถานะเครื่องสูบน้ำ:</span>
            <span class="metric-val">${report.pumpsRunning || 'ระบบป้องกันน้ำท่วมทำงานปกติ'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">สภาพทางระบายน้ำ / คลอง:</span>
            <span class="metric-val" style="color: ${report.drainageCondition && report.drainageCondition.includes('+') ? '#B91C1C' : 'inherit'};">${report.drainageCondition || 'ระบายได้คล่องตัว ท่อระบายน้ำเปิดโล่ง'}</span>
          </div>
        </div>
      </div>

      <!-- Weather & Real-time Thai Water Data Card (Point 1: Thai sources) -->
      <div class="card">
        <div class="card-header">
          <span>🌤️</span>
          <span>2. สภาพอากาศ & แหล่งข้อมูลระดับน้ำ Real-time</span>
        </div>
        <div class="weather-main">
          <div>
            <div class="weather-temp">
              <span>${weather.temp}°C</span>
              <span style="font-size: 10px; font-weight: normal; color: var(--lh-muted);">(รู้สึกจริง ${weather.feelsLike}°C)</span>
            </div>
            <div class="weather-condition">${weather.icon} ${weather.condition}</div>
          </div>
          <div style="text-align: right; font-size: 10.5px;">
            <div>โอกาสเกิดฝน 24 ชม.: <strong style="color: #0284C7;">${weather.rainProb}%</strong></div>
            <div>ปริมาณฝนคาดการณ์: <strong>${weather.expectedRain24h} มม.</strong></div>
          </div>
        </div>
        <div class="metric-list">
          <div class="metric-row">
            <span class="metric-label">สถานีตรวจวัดระดับน้ำ:</span>
            <span class="metric-val" style="font-size: 9.5px;">${report.waterStation || weather.stationName || 'สถานีคลองรังสิตฯ (ปตร.จุฬาลงกรณ์ / สสน.)'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">สถานการณ์น้ำท่า / คลอง:</span>
            <span class="metric-val" style="color: #0284C7; font-size: 10px;">${report.basinAlert || weather.basinAlert || 'เฝ้าระวังระดับน้ำคลองสายหลัก สูบระบายต่อเนื่อง'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">ประกาศเตือนสภาพอากาศ (TMD):</span>
            <span class="metric-val" style="font-size: 9.5px;">${report.tmdAlert || weather.tmdAlert || 'ร่องมรสุมพาดผ่านภาคกลาง เฝ้าระวังฝนตกหนัก'}</span>
          </div>
        </div>
        <div class="weather-credit">อ้างอิง: ${weather.source || 'The Weather Channel / กรมอุตุนิยมวิทยา (TMD) / คลังข้อมูลน้ำแห่งชาติ (สสน.) / กรมชลประทาน'}</div>
      </div>
    </div>

    <!-- Executive Assessment (Point 4: Clean Structured Rows) -->
    <div class="assessment-box">
      <div class="assessment-title">
        <span>📋</span>
        <span>3. บทวิเคราะห์และการประเมินสถานการณ์ (Executive Assessment & Action Taken)</span>
      </div>
      <div class="assessment-list">
        <div class="assessment-item">
          <span class="assessment-tag">📍</span>
          <span class="assessment-val">${assessmentField}</span>
        </div>
        <div class="assessment-item">
          <span class="assessment-tag">🌊</span>
          <span class="assessment-val">${assessmentCanal}</span>
        </div>
        <div class="assessment-item">
          <span class="assessment-tag">⚙️</span>
          <span class="assessment-val">${assessmentPumps}</span>
        </div>
        <div class="assessment-item">
          <span class="assessment-tag">🌤️</span>
          <span class="assessment-val">${assessmentOutlook}</span>
        </div>
      </div>
    </div>

    <!-- Photo Section (Up to 10 Photos) -->
    <div class="photo-section-title">
      <span>📸 4. ภาพถ่ายสำรวจหน้างาน (Photographic Evidence: ${photoCount} ภาพ)</span>
    </div>

    <div class="photo-grid">
      ${photos.map((p, idx) => `
        <div class="photo-card">
          <div class="photo-img-box">
            <span class="photo-badge">ภาพที่ ${idx + 1}</span>
            <img class="photo-img" src="${p.dataUrl || `/api/flood-report?id=${id}&photo=${idx}`}" alt="Photo ${idx + 1}" loading="lazy" />
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Footer (Corporate Signature - NO REPORTER NAME) -->
    <div class="footer">
      <div class="footer-col">
        <div class="corporate-seal">ส่วนงานสาธารณูปโภค ฝ่ายบริการและลูกค้าสัมพันธ์</div>
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

// ==========================================
// 📑 รายงานสรุปภาพรวมผู้บริหาร (EXECUTIVE SUMMARY)
// ==========================================
async function handleExecutiveSummary(req, res) {
  const { start, end, scope } = req.query;

  try {
    await signInAnonymously(auth);

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const nowBangkok = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));

    const formatYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const todayStr = formatYMD(nowBangkok);
    const twoDaysAgo = new Date(nowBangkok);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = formatYMD(twoDaysAgo);

    const startDateStr = start || twoDaysAgoStr;
    const endDateStr = end || todayStr;

    const startTs = new Date(`${startDateStr}T00:00:00+07:00`).getTime();
    const endTs = new Date(`${endDateStr}T23:59:59+07:00`).getTime();
    const reportScope = scope || 'focus'; // 'focus' | 'all' | 'critical'

    const formatThaiDate = (ymd) => {
      if (!ymd) return '-';
      const parts = ymd.split('-').map(Number);
      if (parts.length < 3) return ymd;
      const [y, m, d] = parts;
      const thYear = y + 543;
      return `${d} ${thaiMonths[m - 1]} ${thYear}`;
    };

    const startThai = formatThaiDate(startDateStr);
    const endThai = formatThaiDate(endDateStr);
    const dateRangeLabel = startDateStr === endDateStr ? startThai : `${startThai} – ${endThai}`;
    const dateCode = `${startDateStr.replace(/-/g, '').slice(2)}-${endDateStr.replace(/-/g, '').slice(2)}`;
    const execReportId = `EX-FLD-${dateCode}`;

    const genDay = nowBangkok.getDate();
    const genMonth = thaiMonths[nowBangkok.getMonth()];
    const genYear = nowBangkok.getFullYear() + 543;
    const genHour = String(nowBangkok.getHours()).padStart(2, '0');
    const genMin = String(nowBangkok.getMinutes()).padStart(2, '0');
    const generatedAtThai = `${genDay} ${genMonth} ${genYear} เวลา ${genHour}:${genMin} น.`;

    // 1. ดึงรายงานทั้งหมดจาก Firestore
    const reportsSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_reports"));
    const allReports = [];
    reportsSnap.forEach((d) => {
      const data = d.data();
      const ts = data.createdAt || 0;
      if (ts >= startTs && ts <= endTs) {
        allReports.push({ ...data, id: d.id });
      }
    });

    allReports.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 2. จัดกลุ่มหารายงานล่าสุดของแต่ละโครงการ
    const projectMap = new Map();
    allReports.forEach((r) => {
      if (!projectMap.has(r.projectCode)) {
        projectMap.set(r.projectCode, r);
      }
    });
    const distinctProjects = Array.from(projectMap.values());

    const totalMonitored = distinctProjects.length;
    const normalCount = distinctProjects.filter((p) => p.status === 'NORMAL').length;
    const watchCount = distinctProjects.filter((p) => p.status === 'WATCH').length;
    const criticalCount = distinctProjects.filter((p) => p.status === 'CRITICAL').length;

    // 3. กรองตามขอบเขต (Scope)
    let displayProjects = distinctProjects;
    if (reportScope === 'focus') {
      displayProjects = distinctProjects.filter((p) => p.status === 'WATCH' || p.status === 'CRITICAL');
    } else if (reportScope === 'critical') {
      displayProjects = distinctProjects.filter((p) => p.status === 'CRITICAL');
    }

    // 4. ดึงภาพถ่ายไฮไลท์ 2 ภาพ สำหรับโครงการที่มีสถานะเฝ้าระวังหรือวิกฤต (Focus Areas)
    const focusProjects = distinctProjects.filter((p) => p.status === 'WATCH' || p.status === 'CRITICAL');
    for (const p of focusProjects) {
      try {
        const pCol = collection(db, "artifacts", "default-app-id", "public", "data", "flood_reports", p.reportId || p.id, "photos");
        const pSnap = await getDocs(pCol);
        const photos = [];
        pSnap.forEach((docSnap) => photos.push(docSnap.data()));
        photos.sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));
        p.highlightPhotos = photos.slice(0, 2);
      } catch (e) {
        p.highlightPhotos = [];
      }
    }

    // สรุปข้อมูลลุ่มน้ำและสภาพอากาศ
    const uniqueBasinAlerts = Array.from(new Set(distinctProjects.map((p) => p.basinAlert).filter(Boolean)));
    const basinBrief = uniqueBasinAlerts.length > 0
      ? uniqueBasinAlerts.slice(0, 3).join(' • ')
      : 'ระดับน้ำคลองสายหลัก (คลองรังสิตฯ, คลองหกวา, คลองแสนแสบ, คลองประเวศฯ, คลองสำโรง) ควบคุมการระบายต่อเนื่อง ประตูระบายน้ำและสถานีสูบน้ำหลักเปิดเดินเครื่องระบายสู่แม่น้ำเจ้าพระยาและอ่าวไทย';

    const uniqueTmdAlerts = Array.from(new Set(distinctProjects.map((p) => p.tmdAlert).filter(Boolean)));
    const tmdBrief = uniqueTmdAlerts.length > 0
      ? uniqueTmdAlerts.slice(0, 2).join(' • ')
      : 'ร่องมรสุมกำลังปานกลางพาดผ่านพื้นที่กรุงเทพฯ และปริมณฑล โอกาสฝนตก 60–70% เฝ้าระวังฝนตกสะสมช่วงบ่ายถึงค่ำ';

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Summary: รายงานสรุปภาพรวมสถานการณ์น้ำท่วมและการระบายน้ำ [${dateRangeLabel}]</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --lh-navy: #0c2340;
      --lh-blue-light: #f0f7ff;
      --lh-gold: #bca374;
      --lh-gold-dark: #917849;
      --lh-bg: #f8fafc;
      --lh-card: #ffffff;
      --lh-border: #e2e8f0;
      --lh-text: #1e293b;
      --lh-muted: #64748b;
      --lh-green: #10b981;
      --lh-yellow: #eab308;
      --lh-red: #ef4444;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Prompt', sans-serif;
      background-color: var(--lh-bg);
      color: var(--lh-text);
      line-height: 1.45;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }

    /* Floating Action Bar (Hidden on print) */
    .action-bar {
      position: sticky;
      top: 12px;
      z-index: 100;
      max-width: 1060px;
      margin: 0 auto 20px;
      background: rgba(12, 35, 64, 0.95);
      backdrop-filter: blur(8px);
      padding: 12px 20px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
    }
    .action-bar-title {
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-print {
      background: var(--lh-gold);
      color: var(--lh-navy);
      border: none;
      padding: 8px 18px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-print:hover {
      background: #cfb98d;
      transform: translateY(-1px);
    }

    /* Main Container */
    .sheet {
      max-width: 1060px;
      margin: 0 auto;
      background: var(--lh-card);
      border-radius: 20px;
      padding: 36px 40px;
      border: 1px solid var(--lh-border);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 20px;
      border-bottom: 2px solid #0c2340;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: var(--lh-navy);
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 600;
      color: var(--lh-gold-dark);
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header-info {
      text-align: right;
    }
    .doc-badge {
      display: inline-block;
      font-family: monospace;
      font-size: 12px;
      font-weight: 800;
      color: var(--lh-navy);
      background: #e6f0fa;
      border: 1px solid #bfdbfe;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .doc-date {
      font-size: 11px;
      color: var(--lh-muted);
      margin-top: 4px;
    }

    /* Document Title Banner */
    .title-banner {
      background: linear-gradient(135deg, #0c2340 0%, #173860 100%);
      color: white;
      padding: 18px 24px;
      border-radius: 14px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .banner-main h1 {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .banner-main p {
      font-size: 12px;
      color: #cbd5e1;
      margin-top: 2px;
    }
    .banner-period {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      color: #fef08a;
    }

    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid var(--lh-border);
      background: #f8fafc;
    }
    .kpi-card.normal { background: #f0fdf4; border-color: #bbf7d0; }
    .kpi-card.watch { background: #fefce8; border-color: #fef08a; }
    .kpi-card.critical { background: #fef2f2; border-color: #fecaca; }
    .kpi-label { font-size: 11px; font-weight: 700; color: var(--lh-muted); margin-bottom: 4px; }
    .kpi-card.normal .kpi-label { color: #166534; }
    .kpi-card.watch .kpi-label { color: #854d0e; }
    .kpi-card.critical .kpi-label { color: #991b1b; }
    .kpi-val { font-size: 24px; font-weight: 900; line-height: 1; }
    .kpi-card.normal .kpi-val { color: #15803d; }
    .kpi-card.watch .kpi-val { color: #a16207; }
    .kpi-card.critical .kpi-val { color: #b91c1c; }

    /* Macro Weather & River Basin Brief */
    .macro-box {
      background: #f0f7ff;
      border: 1px solid #bfdbfe;
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 28px;
    }
    .macro-title {
      font-size: 12px;
      font-weight: 800;
      color: #0369a1;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .macro-content {
      font-size: 12px;
      color: #1e3a8a;
      line-height: 1.5;
    }
    .macro-source {
      font-size: 10px;
      color: #64748b;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
    }

    /* Section Headings */
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--lh-navy);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-sub {
      font-size: 11px;
      color: var(--lh-muted);
    }

    /* Status Matrix Table */
    .matrix-wrap {
      overflow-x: auto;
      margin-bottom: 32px;
      border: 1px solid var(--lh-border);
      border-radius: 12px;
    }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      text-align: left;
    }
    .matrix-table th {
      background: #0c2340;
      color: white;
      padding: 10px 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .matrix-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .matrix-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .matrix-table tr:hover td {
      background: #f1f5f9;
    }

    /* Badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2.5px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .status-normal { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .status-watch { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
    .status-critical { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    /* Focus Areas Deep Dive */
    .focus-card {
      background: #ffffff;
      border: 1.5px solid #fef08a;
      border-left: 5px solid #eab308;
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 18px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .focus-card.critical {
      border-color: #fecaca;
      border-left-color: #ef4444;
    }
    .focus-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .focus-project-name {
      font-size: 14px;
      font-weight: 800;
      color: var(--lh-navy);
    }
    .focus-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 16px;
    }
    .focus-left {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 11.5px;
    }
    .focus-box {
      background: #f8fafc;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .focus-box-title {
      font-weight: 700;
      color: var(--lh-navy);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .mitigation-list {
      list-style-type: decimal;
      padding-left: 18px;
      margin-top: 4px;
      color: #334155;
      line-height: 1.5;
    }
    .mitigation-list li { margin-bottom: 3px; }

    /* Highlight Photos */
    .focus-right {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .focus-photo-box {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      background: #e2e8f0;
      height: 120px;
    }
    .focus-photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .focus-photo-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      background: rgba(12, 35, 64, 0.85);
      color: white;
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 5px;
      backdrop-filter: blur(4px);
    }

    /* Operational Disclaimer */
    .disclaimer-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 14px 18px;
      margin-top: 24px;
      margin-bottom: 24px;
      font-size: 11px;
      color: #92400e;
      line-height: 1.5;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .disclaimer-title {
      font-weight: 800;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* Footer */
    .footer {
      border-top: 1.5px solid #0c2340;
      padding-top: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      color: var(--lh-muted);
    }
    .footer-left strong { color: var(--lh-navy); }

    /* Print Optimizations */
    @media print {
      body { background: white; padding: 0; font-size: 10pt; }
      .action-bar { display: none; }
      .sheet { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .focus-card, .matrix-wrap, .macro-box, .disclaimer-box { page-break-inside: avoid; break-inside: avoid; }
      .focus-photo-box { height: 105px; }
      @page { size: A4 portrait; margin: 12mm; }
    }

    @media (max-width: 768px) {
      body { padding: 12px; }
      .sheet { padding: 20px; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .focus-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- Floating Action Bar -->
  <div class="action-bar">
    <div class="action-bar-title">
      <span>📑 สรุปภาพรวมผู้บริหาร Land & Houses</span>
      <span style="opacity: 0.7; font-weight: normal;">(${dateRangeLabel})</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button type="button" class="btn-print" onclick="window.print()">
        🖨️ พิมพ์หรือบันทึกเป็น PDF (Print)
      </button>
    </div>
  </div>

  <div class="sheet">
    <!-- Corporate Header -->
    <div class="header">
      <div>
        <div class="brand-title">LAND & HOUSES</div>
        <div class="brand-sub">Urban Flood & Drainage Management System</div>
      </div>
      <div class="header-info">
        <div class="doc-badge">${execReportId}</div>
        <div class="doc-date">จัดทำข้อมูล ณ: ${generatedAtThai}</div>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="title-banner">
      <div class="banner-main">
        <h1>รายงานสรุปภาพรวมสถานการณ์น้ำท่วมและการระบายน้ำ (EXECUTIVE SUMMARY)</h1>
        <p>สรุปผลการสำรวจและประเมินประสิทธิภาพการระบายน้ำโครงการ Land & Houses ตามเกณฑ์การบริหารจัดการความเสี่ยง</p>
      </div>
      <div class="banner-period">
        ช่วงวันที่สำรวจ: ${dateRangeLabel}
      </div>
    </div>

    <!-- 1. Executive KPI Overview -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">🏢 โครงการที่สำรวจทั้งหมด</div>
        <div class="kpi-val" style="color: var(--lh-navy);">${totalMonitored} <span style="font-size: 13px; font-weight: 500;">โครงการ</span></div>
      </div>
      <div class="kpi-card normal">
        <div class="kpi-label">🟢 สภาวะปกติ (NORMAL)</div>
        <div class="kpi-val">${normalCount} <span style="font-size: 13px; font-weight: 500;">โครงการ</span></div>
      </div>
      <div class="kpi-card watch">
        <div class="kpi-label">🟡 เฝ้าระวัง (WATCH)</div>
        <div class="kpi-val">${watchCount} <span style="font-size: 13px; font-weight: 500;">โครงการ</span></div>
      </div>
      <div class="kpi-card critical">
        <div class="kpi-label">🔴 วิกฤติ / เร่งด่วน (CRITICAL)</div>
        <div class="kpi-val">${criticalCount} <span style="font-size: 13px; font-weight: 500;">โครงการ</span></div>
      </div>
    </div>

    <!-- Macro Weather & Basin Status Box -->
    <div class="macro-box">
      <div class="macro-title">🌤️ การคาดการณ์ฝนและสถานการณ์ลุ่มน้ำหลัก (Macro Weather & River Basin Brief)</div>
      <div class="macro-content">
        <div style="margin-bottom: 6px;"><strong>🌧️ สภาพอากาศและแนวโน้มมรสุม:</strong> ${tmdBrief}</div>
        <div><strong>🌊 สถานการณ์ลุ่มน้ำเจ้าพระยาตอนล่าง & คลองสายหลัก:</strong> ${basinBrief}</div>
      </div>
      <div class="macro-source">
        📌 <strong>แหล่งข้อมูลอ้างอิง:</strong> กรมอุตุนิยมวิทยา (TMD), คลังข้อมูลน้ำแห่งชาติ (ThaiWater / สสน.), กรมชลประทาน (RID), สำนักการระบายน้ำ กทม. และ The Weather Channel
      </div>
    </div>

    <!-- 2. Status Matrix Table -->
    <div class="section-head">
      <div class="section-title">📋 2. ตารางสรุปสถานะทุกโครงการในหน้าเดียว (Status Matrix)</div>
      <div class="section-sub">ข้อมูลล่าสุดตามช่วงวันที่สำรวจ ${dateRangeLabel} (${displayProjects.length} โครงการ)</div>
    </div>

    <div class="matrix-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">ลำดับ</th>
            <th style="width: 80px;">รหัส</th>
            <th>ชื่อโครงการ</th>
            <th>โซน / ทำเล</th>
            <th style="text-align: center;">สถานะความเสี่ยง</th>
            <th>ผิวจราจรถนนเมน</th>
            <th>สภาพคลองและทางระบาย</th>
            <th>ระบบสูบน้ำ</th>
            <th style="white-space: nowrap;">วันที่-เวลาสำรวจ</th>
          </tr>
        </thead>
        <tbody>
          ${displayProjects.length === 0 ? `
            <tr>
              <td colspan="9" style="text-align: center; padding: 24px; color: var(--lh-muted);">
                ไม่พบโครงการที่ตรงกับเงื่อนไขในขอบเขตที่เลือก
              </td>
            </tr>
          ` : displayProjects.map((p, idx) => {
            const isCrit = p.status === 'CRITICAL';
            const isWtc = p.status === 'WATCH';
            const badge = isCrit
              ? '<span class="status-badge status-critical">🔴 วิกฤติ</span>'
              : isWtc
              ? '<span class="status-badge status-watch">🟡 เฝ้าระวัง</span>'
              : '<span class="status-badge status-normal">🟢 ปกติ</span>';
            return `
              <tr>
                <td style="text-align: center; font-weight: 700; color: var(--lh-muted);">${idx + 1}</td>
                <td style="font-weight: 800; font-family: monospace; color: var(--lh-navy);">${p.projectCode || '-'}</td>
                <td style="font-weight: 700; color: var(--lh-navy);">${p.projectName || '-'}</td>
                <td style="color: var(--lh-muted);">${p.projectArea || '-'}</td>
                <td style="text-align: center;">${badge}</td>
                <td>${p.waterLevel || 'แห้งสนิท'}</td>
                <td>${p.drainageCondition || 'ระบายได้คล่องตัว'}</td>
                <td>${p.pumpsRunning || 'พร้อมใช้งาน'}</td>
                <td style="white-space: nowrap; color: var(--lh-muted); font-size: 10px;">${p.surveyDateThai || '-'} (${p.surveyTimeThai || '-'} น.)</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- 3. Focus Areas: Deep Dive for Yellow & Red -->
    <div class="section-head">
      <div class="section-title">🚨 3. เจาะลึกเฉพาะโครงการที่ต้องจับตา (Focus Areas: สถานะเหลือง & แดง)</div>
      <div class="section-sub">แนวทางปฏิบัติการเชิงรุกตามมาตรฐาน ปภ. และสากล (FEMA Standards)</div>
    </div>

    ${focusProjects.length === 0 ? `
      <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 14px; padding: 20px; text-align: center; color: #166534; font-size: 12.5px; font-weight: 700; margin-bottom: 24px;">
        ✅ ทุกโครงการอยู่ในสภาวะปกติ (100% Normal Condition) ระบบระบายน้ำและสถานีสูบน้ำทำงานปกติ ไม่มีจุดเฝ้าระวังพิเศษ
      </div>
    ` : focusProjects.map((p) => {
      const isCrit = p.status === 'CRITICAL';
      const badge = isCrit
        ? '<span class="status-badge status-critical">🔴 วิกฤติ / เร่งด่วน</span>'
        : '<span class="status-badge status-watch">🟡 เฝ้าระวังพิเศษ</span>';

      const photo1 = p.highlightPhotos?.[0]?.dataUrl;
      const photo2 = p.highlightPhotos?.[1]?.dataUrl;

      return `
        <div class="focus-card ${isCrit ? 'critical' : ''}">
          <div class="focus-head">
            <div class="focus-project-name">
              [${p.projectCode || '-'}] ${p.projectName || '-'}
              <span style="font-size: 11px; font-weight: normal; color: var(--lh-muted); margin-left: 6px;">(${p.projectArea || '-'})</span>
            </div>
            <div>${badge}</div>
          </div>

          <div class="focus-grid">
            <div class="focus-left">
              <div class="focus-box">
                <div class="focus-box-title">⚠️ ปัจจัยความเสี่ยงและการประเมินหน้างาน:</div>
                <div style="color: #334155; line-height: 1.5;">
                  <div>• <strong>สภาพผิวจราจร:</strong> ${p.assessmentField || p.waterLevel || 'ไม่มีน้ำท่วมขัง'}</div>
                  <div>• <strong>ระดับน้ำคลองภายนอก:</strong> ${p.assessmentCanal || p.drainageCondition || 'เฝ้าระวังระดับน้ำ'}</div>
                  <div>• <strong>สถานะเครื่องสูบน้ำ:</strong> ${p.assessmentPumps || p.pumpsRunning || 'ทำงานปกติ'}</div>
                  <div>• <strong>บทวิเคราะห์:</strong> ${p.executiveSummary || p.notes || '-'}</div>
                </div>
              </div>

              <div class="focus-box" style="background: #fefce8; border-color: #fef08a;">
                <div class="focus-box-title" style="color: #854d0e;">🛡️ แผนรับมือมาตรฐานตามหลัก ปภ. และสากล (FEMA Standards):</div>
                <ol class="mitigation-list">
                  <li><strong>ป้องกันน้ำย้อนกลับ (Backflow Prevention):</strong> ตรวจสอบการปิดวาล์วกันน้ำย้อนและฝาปิดท่อระบายน้ำเพื่อป้องกันน้ำจากคลองภายนอกเอ่อล้นเข้าท่อระบายน้ำโครงการ</li>
                  <li><strong>เสริมแนวป้องกันกายภาพ:</strong> วางแนวกระสอบทรายตามแนวสันตลิ่งและจุดเชื่อมต่อถนนสาธารณะที่ระดับความสูงต่ำกว่าเกณฑ์ควบคุม</li>
                  <li><strong>บริหารเครื่องสูบน้ำ (Duty Cycling):</strong> เดินเครื่องสูบน้ำแบบสลับเครื่องเพื่อป้องกันมอเตอร์ร้อนจัด พร้อมส่งเจ้าหน้าที่ตรวจเคลียร์เศษขยะหน้าตะแกรงดักทุก 2–3 ชม.</li>
                  <li><strong>ประสานงานหน่วยงานภายนอก:</strong> ติดตามรอบการระบายน้ำของประตูระบายน้ำชลประทานและเทศบาลท้องถิ่นอย่างใกล้ชิด</li>
                </ol>
              </div>
            </div>

            <div class="focus-right">
              ${photo1 ? `
                <div class="focus-photo-box">
                  <span class="focus-photo-badge">📸 ภาพที่ 1: สภาพคลอง/ทางระบายน้ำ</span>
                  <img class="focus-photo-img" src="${photo1}" alt="Risk Area 1" loading="lazy" />
                </div>
              ` : `
                <div class="focus-photo-box" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">
                  ไม่มีภาพถ่ายจุดเสี่ยง
                </div>
              `}

              ${photo2 ? `
                <div class="focus-photo-box">
                  <span class="focus-photo-badge">📸 ภาพที่ 2: ผิวจราจร/เครื่องสูบน้ำ</span>
                  <img class="focus-photo-img" src="${photo2}" alt="Risk Area 2" loading="lazy" />
                </div>
              ` : `
                <div class="focus-photo-box" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;">
                  ไม่มีภาพถ่ายเสริม
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('')}

    <!-- 4. Operational Disclaimer -->
    <div class="disclaimer-box">
      <div class="disclaimer-title">⚠️ หมายเหตุเชิงปฏิบัติการ (Operational Disclaimer):</div>
      <div>
        ข้อเสนอแนะและมาตรการข้างต้นประมวลผลตามเกณฑ์มาตรฐานการจัดการอุทกภัยในเขตเมือง (กรมป้องกันและบรรเทาสาธารณภัย และมาตรฐานสากล FEMA) เพื่อเป็นกรอบแนวทางสำหรับฝ่ายบริหาร ทั้งนี้ การปฏิบัติการจริงหน้างานจำเป็นต้องได้รับการตรวจสอบ ประเมินระดับความลาดชัน สภาพภูมิประเทศ และศักยภาพระบบระบายน้ำเฉพาะจุดของแต่ละโครงการ โดยให้อยู่ในดุลยพินิจและการควบคุมของวิศวกรและผู้จัดการโครงการประจำพื้นที่
      </div>
    </div>

    <!-- Corporate Footer -->
    <div class="footer">
      <div class="footer-left">
        <div><strong>ส่วนงานสาธารณูปโภค ฝ่ายบริการและลูกค้าสัมพันธ์</strong> | บริษัท แลนด์ แอนด์ เฮ้าส์ จำกัด (มหาชน)</div>
        <div>LAND AND HOUSES PUBLIC COMPANY LIMITED | เอกสารสรุปผลภายในองค์กรเพื่อการบริหารจัดการ</div>
      </div>
      <div style="text-align: right;">
        <div>รหัสเอกสารผู้บริหาร: <strong>${execReportId}</strong></div>
        <div>ระบบรายงานอัตโนมัติ: <strong>LH TaskFlow Executive v2.4</strong></div>
      </div>
    </div>
  </div>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=120');
    return res.status(200).send(html);

  } catch (err) {
    console.error("Executive Summary Error:", err);
    return res.status(500).send(`Executive Summary Generation Error: ${err.message}`);
  }
}

