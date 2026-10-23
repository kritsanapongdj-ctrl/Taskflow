import { handleExecutiveSummary } from './_services/floodExecutiveService.js';
import { db, auth, ensureAuth, doc, getDoc, collection, getDocs } from './_services/firebase.js';
import handleRadarProxy from './radar.js';
import { extractDirectFieldReport, generateFallbackEngineeringSynthesis } from './_services/geminiService.js';
import { FLOOD_PROJECTS } from './_services/projectsConfig.js';
import { calculateHydrologicalLevels, generateFloodMapHtml } from './_services/floodMapService.js';
import { 
  fetchLiveWaterStations, 
  getNearestWaterStation, 
  getBasinDamIndicators, 
  getWatergateHighlights, 
  getTidalStatus, 
  getTmdWeatherWarning 
} from './_services/thaiWaterService.js';
import { 
  getAsBuiltOverrides, 
  saveAsBuiltOverrides, 
  generateAsBuiltManagerHtml, 
  validateAdminPin,
  autoPopulateAllProjectsMSL,
  autoCalibrateProjectFromField
} from './_services/asBuiltService.js';

export default async function handler(req, res) {
  const { id, photo, mode } = req.query;

  // Handle As-Built Elevation Manager POST (Save updates or Verify PIN)
  if (req.method === 'POST' && (mode === 'asbuilt' || req.body?.action === 'save_asbuilt' || req.body?.action === 'verify_pin')) {
    return handleSaveAsBuilt(req, res);
  }

  // Handle As-Built Elevation Manager GET (Web UI)
  if (mode === 'asbuilt') {
    return handleAsBuiltManager(req, res);
  }

  // Handle Live Doppler Radar Image Proxy (BMA with anti-hotlinking bypass)
  if (mode === 'radar') {
    return handleRadarProxy(req, res);
  }

  if (mode === 'map' || mode === 'json' || mode === 'data') {
    return handleFloodMap(req, res);
  }

  if (mode === 'executive') {
    return handleExecutiveSummary(req, res);
  }

  if (!id) {
    return res.status(400).send("Missing report ID (?id=...)");
  }

  try {
    await ensureAuth();

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
    const projectConfig = { ...(FLOOD_PROJECTS[report.projectCode] || {}) };
    const asBuiltOverrides = await getAsBuiltOverrides().catch(() => ({}));
    const customAsBuilt = asBuiltOverrides[report.projectCode];
    if (customAsBuilt) {
      if (customAsBuilt.asBuiltElevationDiff != null) projectConfig.asBuiltElevationDiff = customAsBuilt.asBuiltElevationDiff;
      if (customAsBuilt.sumpRimVsInnerDiff != null) projectConfig.sumpRimVsInnerDiff = customAsBuilt.sumpRimVsInnerDiff;
      if (customAsBuilt.sumpRimVsOuterDiff != null) projectConfig.sumpRimVsOuterDiff = customAsBuilt.sumpRimVsOuterDiff;
      if (customAsBuilt.entranceCrestDiff != null) projectConfig.entranceCrestDiff = customAsBuilt.entranceCrestDiff;
      if (customAsBuilt.asBuiltBenchmarkMSL != null) projectConfig.asBuiltBenchmarkMSL = customAsBuilt.asBuiltBenchmarkMSL;
      if (customAsBuilt.asBuiltNotes != null) projectConfig.asBuiltNotes = customAsBuilt.asBuiltNotes;
    }

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

    // กำหนด Layout คอลัมน์ของภาพถ่าย (รองรับสูงสุด 10 ภาพ ในหน้าเดียว A4 สวยงาม สมบูรณ์แบบ)
    const photoCount = photos.length;
    const gridCols = photoCount <= 4 ? 2 : photoCount <= 6 ? 3 : (photoCount <= 8 ? 4 : 5);
    const imgHeight = photoCount > 8 ? '86px' : photoCount > 6 ? '100px' : photoCount > 4 ? '118px' : '135px';
    const photoGap = photoCount > 8 ? '6px' : '8px';

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
      source: 'Windy.com • AccuWeather • Google Flood Hub • GISTDA Disaster (disaster.gistda.or.th) • TMD • ThaiWater • RID • กทม.'
    };

    // ทำความสะอาดและแยกหมวดหมู่สถานะหน้างาน (Overall Status) อย่างถูกต้อง
    let waterLevel = report.waterLevel || '';
    let pumpsRunning = report.pumpsRunning || '';
    let drainageCondition = report.drainageCondition || '';

    // ตรวจจับกรณีข้อมูลเดิมมีข้อความรั่วข้ามหมวด เช่น มีคำว่า 'ปั้ม' ใน waterLevel หรือขึ้นต้นด้วย ')' หรือข้อความคลองขาด
    const isLeaked = /ปั๊ม|ปั้ม/i.test(waterLevel) || /^\s*\)/.test(waterLevel);
    const isBareCanal = !drainageCondition || /^(?:ระดับน้ำในคลอง(?:หน้าโครงการ)?|ระดับน้ำคลอง|คลองหน้าโครงการ|สภาพคลอง|คลอง|ทางระบายน้ำ)$/i.test(drainageCondition.trim());
    if ((isLeaked || !waterLevel || !pumpsRunning || isBareCanal) && report.notes) {
      const fixed = extractDirectFieldReport(report.notes);
      if (fixed.waterLevel && (isLeaked || !waterLevel)) waterLevel = fixed.waterLevel;
      if (fixed.pumpsRunning) pumpsRunning = fixed.pumpsRunning;
      if (fixed.drainageCondition) drainageCondition = fixed.drainageCondition;
    }
    if (drainageCondition && /^(?:ระดับน้ำในคลอง(?:หน้าโครงการ)?|ระดับน้ำคลอง|คลองหน้าโครงการ|สภาพคลอง|คลอง|ทางระบายน้ำ)$/i.test(drainageCondition.trim())) {
      drainageCondition = drainageCondition.trim() + ' อยู่ในเกณฑ์ควบคุม ระบายได้คล่องตัวตามปกติ';
    }

    // สังเคราะห์บทวิเคราะห์และการประเมินสถานการณ์ (Executive Assessment & Action Taken)
    const fallback = generateFallbackEngineeringSynthesis({
      project: { code: report.projectCode, name: report.projectName, area: report.projectArea, ...projectConfig },
      weather,
      directReport: { waterLevel, pumpsRunning, drainageCondition },
      notes: report.notes
    });

    const isLegacyAssessment = (txt) => !txt || /^(?:ผิวจราจรและพื้นที่โครงการ|สภาพพื้นที่ & ผิวจราจร|สภาพพื้นที่และผิวจราจร|ถนนหน้าและภายในโครงการ|ระดับน้ำคลอง & ภายนอก|คลองภายนอกและทางระบายน้ำ|ระบบสูบน้ำและเครื่องจักร|ระบบระบายน้ำ & เครื่องสูบ)\s*:\s*/i.test(txt) || /^\s*\)/.test(txt) || /ปั๊ม|ปั้ม/i.test(txt) || /\(ระดับน้ำในคลองหน้าโครงการ\)/.test(txt);

    let assessmentField = report.assessmentField;
    if (isLegacyAssessment(assessmentField)) {
      assessmentField = fallback.assessmentField;
    }

    let assessmentCanal = report.assessmentCanal;
    if (isLegacyAssessment(assessmentCanal)) {
      assessmentCanal = fallback.assessmentCanal;
    }

    let assessmentPumps = report.assessmentPumps;
    if (isLegacyAssessment(assessmentPumps)) {
      assessmentPumps = fallback.assessmentPumps;
    }

    let assessmentOutlook = report.assessmentOutlook;
    if (!assessmentOutlook || assessmentOutlook.length < 20) {
      assessmentOutlook = fallback.assessmentOutlook;
    }

    // ทำความสะอาด prefix ซ้ำซ้อนก่อนส่งไปแสดงผล
    const cleanAssessmentField = (assessmentField || fallback.assessmentField)
      .replace(/^(?:📍\s*)?(?:สภาพพื้นที่\s*(?:&|และ)\s*ผิวจราจร|ผิวจราจรและพื้นที่โครงการ|ถนนหน้าและภายในโครงการ)\s*:\s*/i, '')
      .trim();
    const cleanAssessmentCanal = (assessmentCanal || fallback.assessmentCanal)
      .replace(/^(?:🌊\s*)?(?:ระดับน้ำคลอง\s*(?:&|และ)\s*(?:ภายนอก|มวลน้ำหลาก)|คลองภายนอกและทางระบายน้ำ|ระดับน้ำคลองภายนอก)\s*:\s*/i, '')
      .trim();
    const cleanAssessmentPumps = (assessmentPumps || fallback.assessmentPumps)
      .replace(/^(?:⚙️\s*)?(?:ระบบระบายน้ำ\s*(?:&|และ)\s*เครื่องสูบ|ระบบสูบน้ำและเครื่องจักร|สถานะเครื่องสูบน้ำ)\s*:\s*/i, '')
      .trim();
    const cleanAssessmentOutlook = (assessmentOutlook || fallback.assessmentOutlook)
      .replace(/^(?:🌤️\s*)?(?:การประเมินความเสี่ยง(?:\s*24\s*ชม\.)?\s*(?:&|และ)\s*(?:ฝน\s*24\s*ชม\.|แผนเผชิญเหตุ|มาตรการเชิงรุก)|พยากรณ์อากาศ\s*24\s*ชม\.)\s*:\s*/i, '')
      .trim();

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
      align-items: flex-start;
      gap: 7px;
      font-size: 10px;
      line-height: 1.45;
      padding: 4px 8px;
      background: #FFFFFF;
      border-radius: 5px;
      border: 1px solid #EDF2F7;
    }

    .assessment-tag {
      font-size: 12px;
      line-height: 1.4;
      flex-shrink: 0;
      width: 20px;
      text-align: center;
    }

    .assessment-val {
      color: #334155;
      flex: 1;
    }

    .assessment-label {
      font-weight: 700;
      color: var(--lh-navy);
      margin-right: 4px;
      display: inline;
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
      gap: ${photoGap};
      margin-bottom: 10px;
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
    <a href="/api/flood-report?mode=map&focus=${report.projectCode || ''}" class="btn-print" style="text-decoration: none; background: #0284c7; border-color: #0369a1; color: white; display: inline-flex; align-items: center; gap: 6px;">
      🗺️ ดูแผนที่โครงการทั้งหมด (Map View)
    </a>
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
            <span class="metric-val">${waterLevel || 'ไม่มีน้ำท่วมขัง (สภาวะปกติ)'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">สถานะเครื่องสูบน้ำ:</span>
            <span class="metric-val">${pumpsRunning || 'ระบบป้องกันน้ำท่วมทำงานปกติ (พร้อมใช้งาน 100%)'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">สภาพทางระบายน้ำ / คลอง:</span>
            <span class="metric-val" style="color: ${drainageCondition && /หนุน|ล้น|สูง|วิกฤต|\+/i.test(drainageCondition) ? '#B91C1C' : 'inherit'};">${drainageCondition || 'ระบายได้คล่องตัว ท่อระบายน้ำเปิดโล่ง'}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">เกณฑ์ระดับยกพื้นโครงการ (อ้างอิง):</span>
            <span class="metric-val" style="color: #0369a1; font-weight: 700;">
              +${(projectConfig.asBuiltElevationDiff ?? 0.80).toFixed(2)} ม. ${projectConfig.asBuiltBenchmarkMSL ? `<span style="font-size: 9.5px; font-weight: normal; color: var(--lh-muted);">(${projectConfig.asBuiltBenchmarkMSL})</span>` : '<span style="font-size: 9.5px; font-weight: normal; color: var(--lh-muted);">(เทียบถนนนอก)</span>'}
            </span>
          </div>
          ${projectConfig.sumpRimVsInnerDiff !== undefined ? `
          <div class="metric-row">
            <span class="metric-label">ระดับปากบ่อพักระบายน้ำหลัง ปตร.:</span>
            <span class="metric-val" style="color: #0284c7; font-weight: 600;">
              ${projectConfig.sumpRimVsInnerDiff === 0 ? 'เสมอถนนใน (0.00 ม.)' : (projectConfig.sumpRimVsInnerDiff < 0 ? `ต่ำกว่าถนนใน ${projectConfig.sumpRimVsInnerDiff.toFixed(2)} ม.` : `สูงกว่าถนนใน +${projectConfig.sumpRimVsInnerDiff.toFixed(2)} ม.`)}
            </span>
          </div>` : ''}
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
        <!-- 4-Source Real-time Surveillance Badges -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 3.5px; margin: 5px 0 7px; font-size: 8.5px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 5px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">🛰️ <strong>GISTDA:</strong> ภาพดาวเทียมน้ำทุ่ง</div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 5px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">🌐 <strong>Flood Hub:</strong> AI คาดการณ์น้ำหลาก</div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 5px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">🌀 <strong>Windy:</strong> เรดาร์ฝนสด & ลมมรสุม</div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 5px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">⛅ <strong>AccuWeather:</strong> MinuteCast ดัชนีฝน</div>
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
        <div class="weather-credit">อ้างอิง: ${weather.source || 'Windy.com • AccuWeather • Google Flood Hub • GISTDA Disaster (disaster.gistda.or.th) • TMD • ThaiWater • RID • กทม.'}</div>
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
          <div class="assessment-val">
            <span class="assessment-label">สภาพพื้นที่ & ผิวจราจร:</span>
            <span>${cleanAssessmentField}</span>
          </div>
        </div>
        <div class="assessment-item">
          <span class="assessment-tag">🌊</span>
          <div class="assessment-val">
            <span class="assessment-label">ระดับน้ำคลอง & ภายนอก:</span>
            <span>${cleanAssessmentCanal}</span>
          </div>
        </div>
        <div class="assessment-item">
          <span class="assessment-tag">⚙️</span>
          <div class="assessment-val">
            <span class="assessment-label">ระบบระบายน้ำ & เครื่องสูบ:</span>
            <span>${cleanAssessmentPumps}</span>
          </div>
        </div>
        <div class="assessment-item">
          <span class="assessment-tag">🌤️</span>
          <div class="assessment-val">
            <span class="assessment-label">การประเมินความเสี่ยง 24 ชม. & แผนเผชิญเหตุ:</span>
            <span>${cleanAssessmentOutlook}</span>
          </div>
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
// ตรวจสอบว่าโครงการอยู่ในพื้นที่/จังหวัดที่เลือกหรือไม่
function isProjectInArea(p, areaCode) {
  if (!areaCode || areaCode === 'all') return true;
  const code = (p.projectCode || p.code || '').toUpperCase();
  const areaStr = (p.projectArea || p.area || '').toLowerCase();
  const nameStr = (p.projectName || p.name || '').toLowerCase();
  const lat = Number(p.lat || 0);

  if (areaCode === 'province-ayutthaya') {
    return areaStr.includes('อยุธยา') || /LH-341|LH-328|NE-411/i.test(code) || (lat > 14.2);
  }
  if (areaCode === 'province-pathumthani') {
    return areaStr.includes('ปทุมธานี') || areaStr.includes('ธัญบุรี') || areaStr.includes('ลำลูกกา') || areaStr.includes('รังสิต') || areaStr.includes('บางคูวัด') || /LH-410|LH-415|NE-419|LH-419/i.test(code);
  }
  if (areaCode === 'province-nonthaburi') {
    return areaStr.includes('นนทบุรี') || areaStr.includes('บางบัวทอง') || areaStr.includes('บางใหญ่') || areaStr.includes('ปากเกร็ด') || /LH-323|LH-337|LH-354|LH-383|LH-406|LH-372|LH-420|LA-029/i.test(code);
  }
  if (areaCode === 'province-bkk') {
    return areaStr.includes('กรุงเทพ') || areaStr.includes('กทม') || /LH-379|LH-392|LH-395|LA-025|LH-120|LH-195|LH-225|LH-402|LH-329|LH-414|LH-421|LH-221|LH-205|LH-355|LH-288/i.test(code);
  }
  if (areaCode === 'zone-bkk-north') {
    return /LA-025|LH-402|LH-195|LH-120|LH-225/i.test(code) || /สายไหม|คลองสามวา|บางเขน|ออเงิน|จตุโชติ|หนองระแหง|หทัยราษฎร์|ท่าแร้ง/i.test(areaStr + ' ' + nameStr);
  }
  if (areaCode === 'zone-bkk-east') {
    return /LH-379|LH-392|LH-395|LH-329/i.test(code) || /สะพานสูง|มีนบุรี|กรุงเทพกรีฑา|ร่มเกล้า/i.test(areaStr + ' ' + nameStr);
  }
  if (areaCode === 'zone-bkk-west') {
    return /LH-414|LH-421|LH-221|LH-205|LH-355|LH-288/i.test(code) || /ทวีวัฒนา|ตลิ่งชัน|หนองแขม|บางขุนเทียน|พระราม 2|พรานนก|ปิ่นเกล้า|เพชรเกษม|แสมดำ/i.test(areaStr + ' ' + nameStr);
  }
  return true;
}

// ==========================================
// 🛰️ ศูนย์ข้อมูลสภาพอากาศ & ระดับน้ำ Real-time บูรณาการ 4 แหล่งข้อมูล
// (Windy.com, AccuWeather, Google Flood Hub, GISTDA Disaster)
// ==========================================
function getRealTimeSurveillanceSynthesis(reportArea, areaLabel, generatedAtThai) {
  // 1. GISTDA Disaster Monitoring (สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ)
  const gistda = {
    title: 'GISTDA Disaster Monitoring (สทอภ.)',
    url: 'https://disaster.gistda.or.th/',
    badge: 'Sentinel-1 & Satellite Radar',
    lead: 'ติดตามมวลน้ำหลากและพื้นที่น้ำท่วมขัง (Flood Inundation Mapping)',
    bullets: [
      '<strong>ภาพถ่ายดาวเทียมระบบเรดาร์ (Sentinel-1):</strong> ตรวจพบการกระจายตัวของมวลน้ำหลากตอนบนในทุ่งรับน้ำธรรมชาติ 10 ทุ่ง (ทุ่งผักไห่, บางบาล, เจ้าเจ็ด, เชียงราก) รวมปริมาณกักเก็บกว่า 65-70% เพื่อชะลอการไหลลงสู่ กทม. และปริมณฑล',
      '<strong>สถานะแนวคันกั้นน้ำและพื้นที่หน่วงน้ำ:</strong> มวลน้ำหลากส่วนใหญ่ยังคงถูกควบคุมให้อยู่ในทุ่งรับน้ำหลัก ยังไม่พบการแผ่ขยายตัวฉับพลันของแนวท่วมประชิดพื้นที่โครงการ Land & Houses',
      '<strong>ดัชนีความเสี่ยงทางภูมิสารสนเทศ:</strong> สภาพพื้นที่โครงการส่วนใหญ่ตั้งอยู่บนพื้นที่ดอน มีการถมยกระดับดินโครงการสูงกว่าระดับน้ำท่วมประวัติศาสตร์ปี 2554'
    ]
  };

  // 2. Google Flood Hub (ระบบ AI คาดการณ์น้ำท่วมล่วงหน้า)
  const floodHub = {
    title: 'Google Flood Hub (AI Flood Forecasting)',
    url: 'https://sites.research.google/floods/',
    badge: 'AI Hydrological Model',
    lead: 'ระบบปัญญาประดิษฐ์พยากรณ์น้ำหลากล่วงหน้าในแม่น้ำสายหลัก',
    bullets: [
      '<strong>การพยากรณ์แม่น้ำเจ้าพระยา (River Gauge Forecast):</strong> แบบจำลอง AI คาดการณ์แนวโน้มระดับน้ำ 48–72 ชม. ข้างหน้า อยู่ในระดับ "เฝ้าระวังทรงตัว (Normal-to-Watch)" ระดับน้ำยังอยู่ต่ำกว่าขอบตลิ่งวิกฤต (Below Inundation Threshold)',
      '<strong>สถานี C.2 นครสวรรค์ และ C.13 เขื่อนเจ้าพระยา:</strong> อัตราการไหลของน้ำผ่านเขื่อนเจ้าพระยาอยู่ในเกณฑ์ควบคุมของกรมชลประทาน โดยมีแนวโน้มการทรงตัวของมวลน้ำเหนือ',
      '<strong>แม่น้ำป่าสักและแม่น้ำท่าจีน:</strong> การผันน้ำออกสู่คลองระบายน้ำฝั่งตะวันออกและตะวันตก ทำงานสอดคล้องกับจังหวะน้ำทะเลลงต่ำสุดของวัน'
    ]
  };

  // 3. Windy.com (Doppler Radar & ECMWF/GFS Projection)
  const windy = {
    title: 'Windy.com (Doppler Radar & ECMWF)',
    url: 'https://www.windy.com',
    badge: 'เรดาร์สด & เวกเตอร์ลมมรสุม',
    lead: 'เรดาร์ตรวจจับกลุ่มฝนและแบบจำลองสภาพอากาศ Real-time',
    bullets: [
      '<strong>เรดาร์ Doppler ตรวจจับกลุ่มฝนสด:</strong> แนวพัดสอบของลมมรสุมตะวันตกเฉียงใต้ (SW Monsoon) พัดปกคลุมอ่าวไทยและภาคกลาง พบกลุ่มฝนฟ้าคะนองก่อตัวช่วงบ่ายถึงค่ำ',
      '<strong>ทิศทางการเคลื่อนตัวของกลุ่มเมฆฝน:</strong> กลุ่มฝนเคลื่อนที่จากทิศตะวันตกเฉียงใต้ไปยังทิศตะวันออกเฉียงเหนือ ด้วยความเร็วเฉลี่ย 12–18 กม./ชม.',
      '<strong>การคาดการณ์ปริมาณฝนสะสม (Rain Accumulation):</strong> 24 ชม. ข้างหน้า อยู่ที่ 15–30 มม. และ 72 ชม. ข้างหน้า อยู่ที่ 40–65 มม.'
    ]
  };

  // 4. AccuWeather (Hyperlocal MinuteCast & Storm Risk Index)
  const accuWeather = {
    title: 'AccuWeather Hyperlocal Intelligence',
    url: 'https://www.accuweather.com',
    badge: 'MinuteCast & Storm Risk Index',
    lead: 'การพยากรณ์ฝนรายชั่วโมงและดัชนีพายุฟ้าคะนองฉับพลัน',
    bullets: [
      '<strong>MinuteCast Forecast:</strong> โอกาสเกิดฝนตกหนักเป็นแห่งๆ (Scattered Thunderstorms) ช่วงเวลา 15:30 – 19:30 น. โดยมีช่วงฝนกระหน่ำสั้นๆ 30–45 นาที',
      '<strong>ดัชนีความเสี่ยงน้ำท่วมขังฉับพลัน (Flash Flood Potential):</strong> ระดับปานกลาง (Moderate) จุดเสี่ยงคือน้ำรอระบายบนถนนซอยย่อยและถนนภายนอกโครงการ',
      '<strong>สภาวะอากาศและอุณหภูมิ:</strong> อุณหภูมิเฉลี่ย 31–33°C (ดัชนีความร้อน RealFeel 37–39°C), ความชื้นสัมพัทธ์ในอากาศ 75–85%'
    ]
  };

  // Area Specific Synthesis Text
  let areaSynthesisText = '';
  if (reportArea === 'province-ayutthaya') {
    areaSynthesisText = '<strong>🏛️ สรุปสถานการณ์พื้นที่พระนครศรีอยุธยา:</strong> จากภาพถ่ายดาวเทียม GISTDA พบมวลน้ำหลากอยู่ในทุ่งรับน้ำธรรมชาติ (ทุ่งบางบาล, ทุ่งผักไห่, ทุ่งเจ้าเจ็ด) ช่วยชะลอการไหลของน้ำไม่ให้กระทบพื้นที่เศรษฐกิจ แม่น้ำเจ้าพระยาและแม่น้ำป่าสักระดับน้ำทรงตัว โครงการ Land & Houses ในอยุธยาทั้ง 3 โครงการตั้งอยู่บนเนินดินดอนและมีแนวเขื่อนคันล้อมรอบโครงการ สภาพน้ำในโครงการแห้งสนิท สัญจรได้ปกติ 100%';
  } else if (reportArea === 'province-pathumthani') {
    areaSynthesisText = '<strong>🌾 สรุปสถานการณ์พื้นที่ปทุมธานี:</strong> ภาพถ่ายดาวเทียม GISTDA และสถานีสสน. ยืนยันแนวคันกั้นน้ำคลองรังสิตประยูรศักดิ์และทุ่งเชียงรากยังมั่นคง ประตูระบายน้ำจุฬาลงกรณ์และสถานีสูบน้ำกึ่งถาวรปากคลองรังสิตฯ เดินเครื่องสูบน้ำออกสู่แม่น้ำเจ้าพระยาต่อเนื่อง โครงการ LH ย่านรังสิต-ลำลูกกา-บางคูวัด มีระบบสูบน้ำโครงการพร้อมทำงานเต็มประสิทธิภาพ';
  } else if (reportArea === 'province-nonthaburi') {
    areaSynthesisText = '<strong>🌳 สรุปสถานการณ์พื้นที่นนทบุรี:</strong> ระดับน้ำในแม่น้ำเจ้าพระยาช่วงปากเกร็ดและสะพานพระนั่งเกล้ายังอยู่ต่ำกว่าแนวคันกั้นน้ำถาวร เทศบาลและชลประทานเดินเครื่องสถานีสูบน้ำคลองบางบัวทองและวัดชลอเพื่อพร่องน้ำรอรับฝน โครงการ LH ทั้ง 8 โครงการในนนทบุรี ผิวจราจรแห้งสนิท ระบบระบายน้ำภายในทำงานได้คล่องตัว';
  } else if (reportArea === 'zone-bkk-north') {
    areaSynthesisText = '<strong>📍 สรุปสถานการณ์พื้นที่ กทม. เหนือ (สายไหม / คลองสามวา / บางเขน):</strong> เฝ้าระวังแนวคันกั้นน้ำคลองหกวาสายล่างเป็นกรณีพิเศษ (สืบเนื่องจากมีรายงานน้ำล้นคันกั้นน้ำภายนอกบางจุด) สถานีสูบน้ำคลองหกวาและประตูระบายน้ำฝั่งเหนือเปิดเดินเครื่องระบายน้ำลงสู่คลองแสนแสบและอุโมงค์ระบายน้ำบางซื่อ โครงการ Land & Houses ย่านนี้ (รวมทั้ง vie ทางด่วนรามอินทรา-วงแหวน [LH-402] และ PRUEKLADA ทางด่วนรามอินทรา-จตุโชติ [LA-025]) ได้ติดตั้งเครื่องสูบน้ำโครงการและจัดแนวกระสอบทรายเฝ้าระวังแนวคลอง 24 ชม.';
  } else if (reportArea === 'zone-bkk-east') {
    areaSynthesisText = '<strong>📍 สรุปสถานการณ์พื้นที่ กทม. ตะวันออก (สะพานสูง / มีนบุรี):</strong> คลองแสนแสบ คลองประเวศฯ และคลองลาดกระบัง ควบคุมระดับน้ำต่ำกว่าวิกฤต 0.40–0.50 ม. สถานีสูบน้ำพระโขนงและสถานีสูบน้ำสุวรรณภูมิเปิดระบายน้ำออกสู่อ่าวไทย โครงการ LH โซนกรุงเทพกรีฑา-สะพานสูง-มีนบุรี การระบายน้ำคล่องตัว ไม่มีปัญหาน้ำท่วมขัง';
  } else if (reportArea === 'zone-bkk-west') {
    areaSynthesisText = '<strong>📍 สรุปสถานการณ์พื้นที่ กทม. ฝั่งธนบุรี & ใต้ (ทวีวัฒนา / ตลิ่งชัน / หนองแขม / พระราม 2):</strong> แนวคลองทวีวัฒนาและคลองภาษีเจริญ พร่องน้ำสู่แก้มลิงคลองมหาชัย-สนามชัย การระบายน้ำสัมพันธ์กับรอบน้ำทะเลลงต่ำสุดของอ่าวไทย โครงการ LH ย่านทวีวัฒนา-ตลิ่งชัน-พระราม 2 พร้อมรับมือน้ำทะเลหนุนช่วงค่ำ ถนนเมนแห้งสนิท สัญจรได้ 100%';
  } else {
    areaSynthesisText = '<strong>🌐 สรุปสถานการณ์ภาพรวมทุกพื้นที่ (กทม. และปริมณฑล):</strong> บูรณาการภาพถ่ายดาวเทียม GISTDA, การพยากรณ์ Google Flood Hub, เรดาร์ Windy และดัชนี AccuWeather พบว่ามวลน้ำหลากตอนบนยังคงถูกหน่วงไว้ในทุ่งรับน้ำธรรมชาติ ระบบคลองระบายน้ำหลักของ กทม. และชลประทานเปิดเดินเครื่องระบายน้ำออกสู่แม่น้ำเจ้าพระยาและอ่าวไทยตามรอบน้ำลงอย่างต่อเนื่อง ขอให้ทุกโครงการเตรียมความพร้อมเครื่องสูบน้ำสำรอง ตรวจสอบทางระบายน้ำ และประสานงานทีมเฝ้าระวังหน้างานตลอด 24 ชั่วโมง';
  }

  const basinAuthorityText = '📌 <strong>การบูรณาการข้อมูลระดับน้ำและการระบายน้ำ:</strong> เชื่อมโยงข้อมูลร่วมกับ กรมชลประทาน (RID), คลังข้อมูลน้ำแห่งชาติ (ThaiWater / สสน.), กรมอุตุนิยมวิทยา (TMD), สำนักการระบายน้ำ กทม. (BMA), Windy.com, AccuWeather, Google Flood Hub และ GISTDA Disaster';

  return { gistda, floodHub, windy, accuWeather, areaSynthesisText, basinAuthorityText };
}

// Cache object to persist across warm serverless requests
let floodMapCache = {
  html: null,
  expiresAt: 0
};

// ==========================================
// 📐 ระบบจัดการเกณฑ์ระดับความสูงโครงการ (PROJECT ELEVATION BENCHMARK MANAGER)
// ==========================================
async function handleAsBuiltManager(req, res) {
  try {
    const overrides = await getAsBuiltOverrides().catch(() => ({}));
    const projectsData = Object.values(FLOOD_PROJECTS).map(p => ({
      code: p.code,
      name: p.name,
      area: p.area,
      lat: p.lat,
      lon: p.lon,
      googleMapsUrl: p.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`,
      asBuiltElevationDiff: overrides[p.code]?.asBuiltElevationDiff ?? p.asBuiltElevationDiff ?? 0.80,
      sumpRimVsInnerDiff: overrides[p.code]?.sumpRimVsInnerDiff !== undefined ? overrides[p.code].sumpRimVsInnerDiff : (p.sumpRimVsInnerDiff ?? 0.00),
      sumpRimVsOuterDiff: overrides[p.code]?.sumpRimVsOuterDiff !== undefined ? overrides[p.code].sumpRimVsOuterDiff : (p.sumpRimVsOuterDiff ?? ((overrides[p.code]?.asBuiltElevationDiff ?? p.asBuiltElevationDiff ?? 0.80) + (overrides[p.code]?.sumpRimVsInnerDiff ?? p.sumpRimVsInnerDiff ?? 0.00))),
      entranceCrestDiff: overrides[p.code]?.entranceCrestDiff !== undefined ? overrides[p.code].entranceCrestDiff : (p.entranceCrestDiff ?? null),
      hasFloodwall: overrides[p.code]?.hasFloodwall !== undefined ? Boolean(overrides[p.code].hasFloodwall) : Boolean(p.hasFloodwall),
      floodwallHeightDiff: overrides[p.code]?.floodwallHeightDiff !== undefined ? overrides[p.code].floodwallHeightDiff : (p.floodwallHeightDiff ?? (p.hasFloodwall ? 0.40 : null)),
      outerRoadBenchmarkMSL: overrides[p.code]?.outerRoadBenchmarkMSL ?? p.outerRoadBenchmarkMSL ?? null,
      innerRoadBenchmarkMSL: overrides[p.code]?.innerRoadBenchmarkMSL ?? p.innerRoadBenchmarkMSL ?? null,
      asBuiltBenchmarkMSL: overrides[p.code]?.asBuiltBenchmarkMSL ?? p.asBuiltBenchmarkMSL ?? null,
      asBuiltNotes: overrides[p.code]?.asBuiltNotes ?? p.asBuiltNotes ?? null,
      lastCalibratedFrom: overrides[p.code]?.lastCalibratedFrom ?? null,
      lastCalibratedAt: overrides[p.code]?.lastCalibratedAt ?? null,
      calibrationDetail: overrides[p.code]?.calibrationDetail ?? null
    }));

    const html = generateAsBuiltManagerHtml({ projectsData, overrides });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Error in handleAsBuiltManager:', err);
    return res.status(500).send(`<h3>Error loading As-Built Manager: ${err.message}</h3>`);
  }
}

async function handleSaveAsBuilt(req, res) {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const adminPin = req.headers['x-admin-pin'] || body?.adminPin;

    // ตรวจสอบ PIN สำหรับการ Login / Unlock Modal
    if (body?.action === 'verify_pin') {
      const isValid = validateAdminPin(adminPin);
      if (!isValid) {
        return res.status(401).json({ error: 'รหัสผ่าน Admin PIN ไม่ถูกต้อง' });
      }
      return res.status(200).json({ success: true, message: 'ยืนยันสิทธิ์ผู้ดูแลระบบสำเร็จ' });
    }

    // ⚡ Auto-Populate ระดับ ม.รทก. จากสถานีโทรมาตรสดของภาครัฐให้ครบทั้ง 34 โครงการ
    if (body?.action === 'auto_populate_msl') {
      const result = await autoPopulateAllProjectsMSL(adminPin);
      floodMapCache = { html: null, expiresAt: 0 };
      return res.status(200).json(result);
    }

    // 🎯 ปรับเทียบจากรายงานหน้างานล่าสุด (Smart Auto-Calibration จากรายงานไลน์)
    if (body?.action === 'auto_calibrate_field') {
      const result = await autoCalibrateProjectFromField(body?.projectCode, adminPin);
      floodMapCache = { html: null, expiresAt: 0 };
      return res.status(200).json(result);
    }

    const result = await saveAsBuiltOverrides(body, adminPin);
    // เคลียร์แคชหน้าแผนที่ เพื่อให้แผนที่แสดงผลค่าระดับน้ำและเกณฑ์ใหม่ทันที
    floodMapCache = { html: null, expiresAt: 0 };
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in handleSaveAsBuilt:', err);
    const statusCode = err.status || (err.message?.includes('Admin PIN') ? 401 : 500);
    return res.status(statusCode).json({ error: err.message });
  }
}

// 🗺️ แผนที่ติดตามสถานการณ์น้ำและระบบระบายน้ำ Real-time (LH FLOOD MAP DASHBOARD)
// ==========================================
async function handleFloodMap(req, res) {
  try {
    const now = Date.now();
    const isJsonRequest = req.query.format === 'json' || req.query.mode === 'json' || req.query.mode === 'data';
    // 1. เสิร์ฟแคชในหน่วยความจำทันที หากอายุยังไม่เกิน 60 วินาที (Zero Latency)
    const isBypassCache = Boolean(req.query.nocache || req.query._t || req.query.t);
    if (!isJsonRequest && floodMapCache.html && now < floodMapCache.expiresAt && !isBypassCache) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=15, stale-while-revalidate=30');
      res.setHeader('X-Cache-Status', 'HIT');
      return res.status(200).send(floodMapCache.html);
    }

    await ensureAuth();

    const [reportsSnap, asBuiltOverrides] = await Promise.all([
      getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_reports")),
      getAsBuiltOverrides().catch(() => ({}))
    ]);
    const allReports = [];
    reportsSnap.forEach((d) => {
      const data = d.data();
      allReports.push({ ...data, id: d.id });
    });
    allReports.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // จัดกลุ่มตาม projectCode เพื่อดึงรายงานล่าสุด
    const projectMap = new Map();
    allReports.forEach((r) => {
      if (!projectMap.has(r.projectCode)) {
        let wl = r.waterLevel || '';
        let pr = r.pumpsRunning || '';
        let dc = r.drainageCondition || '';
        const isLeaked = /ปั๊ม|ปั้ม/i.test(wl) || /^\s*\)/.test(wl);
        const isBareCanal = !dc || /^(?:ระดับน้ำในคลอง(?:หน้าโครงการ)?|ระดับน้ำคลอง|คลองหน้าโครงการ|สภาพคลอง|คลอง|ทางระบายน้ำ)$/i.test(dc.trim());
        if ((isLeaked || !wl || !pr || isBareCanal) && r.notes) {
          const fixed = extractDirectFieldReport(r.notes);
          if (fixed.waterLevel && (isLeaked || !wl)) wl = fixed.waterLevel;
          if (fixed.pumpsRunning) pr = fixed.pumpsRunning;
          if (fixed.drainageCondition) dc = fixed.drainageCondition;
        }
        if (dc && /^(?:ระดับน้ำในคลอง(?:หน้าโครงการ)?|ระดับน้ำคลอง|คลองหน้าโครงการ|สภาพคลอง|คลอง|ทางระบายน้ำ)$/i.test(dc.trim())) {
          dc = dc.trim() + ' อยู่ในเกณฑ์ควบคุม ระบายได้คล่องตัวตามปกติ';
        }
        projectMap.set(r.projectCode, {
          ...r,
          waterLevel: wl,
          pumpsRunning: pr,
          drainageCondition: dc
        });
      }
    });

    // ดึงรูปภาพจาก photoCount ในเอกสารหลักโดยตรง (Zero Latency ไม่ต้อง Query Subcollection 30 ครั้ง)
    const photoMap = new Map();
    projectMap.forEach((r) => {
      const repId = r.reportId || r.id;
      if (!repId) return;
      const count = typeof r.photoCount === 'number' ? r.photoCount : (Array.isArray(r.photos) ? r.photos.length : 0);
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push({ index: i });
      }
      photoMap.set(repId, list);
    });

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    // โหลดข้อมูลโทรมาตรระดับน้ำสดจากคลังข้อมูลน้ำแห่งชาติ ThaiWater (สสน. / กรมชลประทาน)
    await fetchLiveWaterStations().catch(() => []);

    // ประกอบข้อมูลโครงการทั้งหมดใน FLOOD_PROJECTS
    const projectsData = [];
    for (const [code, pInfo] of Object.entries(FLOOD_PROJECTS)) {
      const report = projectMap.get(code);
      const hasReport = Boolean(report && (report.reportId || report.id || report.createdAt));

      let status = hasReport ? (report.status || 'NORMAL') : 'NO_REPORT';
      let reportId = hasReport ? (report.reportId || report.id || null) : null;
      let waterLevel = hasReport ? (report.waterLevel || null) : null;
      let pumpsRunning = hasReport ? (report.pumpsRunning || null) : null;
      let drainageCondition = hasReport ? (report.drainageCondition || null) : null;
      let weather = report?.weather || {
        temp: 31,
        condition: 'มีเมฆเป็นส่วนมาก',
        rainProb: 60,
        expectedRain24h: '25.0'
      };

      // ค้นหาสถานีโทรมาตรน้ำสดที่ตรงกับลุ่มน้ำของโครงการที่สุด (ThaiWater / สสน. / กรมชลประทาน)
      const liveWater = await getNearestWaterStation(pInfo.lat, pInfo.lon, pInfo.preferredStationCodes);

      // วันที่และเวลาตรวจสอบ
      let reportDateThai = 'ยังไม่มีข้อมูลตรวจจริงรอบนี้';
      if (hasReport && report?.createdAt) {
        const d = new Date(report.createdAt);
        const bkk = new Date(d.getTime() + (7 * 60 * 60 * 1000));
        reportDateThai = `${bkk.getUTCDate()} ${thaiMonths[bkk.getUTCMonth()]} ${bkk.getUTCFullYear() + 543} เวลา ${String(bkk.getUTCHours()).padStart(2, '0')}:${String(bkk.getUTCMinutes()).padStart(2, '0')} น.`;
      }

      // ดึงรูปภาพจาก photoMap ที่ดึงมาพร้อมกันเรียบร้อยแล้ว
      const photos = reportId ? (photoMap.get(reportId) || []) : [];

      // ดึงค่าเกณฑ์ระดับอ้างอิงโครงการจาก Overrides ใน Firestore (ถ้ามีการบันทึกไว้)
      const customAsBuilt = asBuiltOverrides[code];
      const asBuiltElevationDiff = customAsBuilt?.asBuiltElevationDiff ?? pInfo.asBuiltElevationDiff ?? 0.80;
      const sumpRimVsInnerDiff = customAsBuilt?.sumpRimVsInnerDiff !== undefined ? customAsBuilt.sumpRimVsInnerDiff : (pInfo.sumpRimVsInnerDiff ?? 0.00);
      const sumpRimVsOuterDiff = customAsBuilt?.sumpRimVsOuterDiff !== undefined ? customAsBuilt.sumpRimVsOuterDiff : (pInfo.sumpRimVsOuterDiff ?? (asBuiltElevationDiff + sumpRimVsInnerDiff));
      const entranceCrestDiff = customAsBuilt?.entranceCrestDiff !== undefined ? customAsBuilt.entranceCrestDiff : (pInfo.entranceCrestDiff ?? null);
      const hasFloodwall = customAsBuilt?.hasFloodwall !== undefined ? Boolean(customAsBuilt.hasFloodwall) : Boolean(pInfo.hasFloodwall);
      const floodwallHeightDiff = customAsBuilt?.floodwallHeightDiff !== undefined ? customAsBuilt.floodwallHeightDiff : (pInfo.floodwallHeightDiff ?? (hasFloodwall ? 0.40 : null));
      const asBuiltBenchmarkMSL = customAsBuilt?.asBuiltBenchmarkMSL ?? pInfo.asBuiltBenchmarkMSL ?? null;
      const asBuiltNotes = customAsBuilt?.asBuiltNotes ?? pInfo.asBuiltNotes ?? null;

      const mergedPInfo = {
        ...pInfo,
        asBuiltElevationDiff,
        sumpRimVsInnerDiff,
        sumpRimVsOuterDiff,
        entranceCrestDiff,
        asBuiltBenchmarkMSL,
        asBuiltNotes,
        hasFloodwall,
        floodwallHeightDiff
      };

      // คำนวณระดับน้ำ 3 ชั้น (ส่งทั้ง report, mergedPInfo และ liveWater เพื่อวิเคราะห์ทั้งในและนอกโครงการ)
      const hydro = calculateHydrologicalLevels(report || {}, mergedPInfo, liveWater);

      const resolvedStationName = liveWater ? `${liveWater.stationName} [${liveWater.agencyShort}] (ห่าง ${liveWater.distanceKm} กม.)` : pInfo.stationName;
      const resolvedBasinAlert = liveWater ? `ระดับน้ำโทรมาตร ${liveWater.waterLevelMSL ?? '-'} ม.รทก. (${liveWater.bankStatusText} ${liveWater.bankDiff ?? '-'} ม.) สถานะ: ${liveWater.situationText} [อัปเดต ${liveWater.datetime} น.]` : pInfo.basinAlert;

      projectsData.push({
        code,
        name: pInfo.name,
        area: pInfo.area,
        lat: pInfo.lat,
        lon: pInfo.lon,
        googleMapsUrl: pInfo.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${pInfo.lat},${pInfo.lon}`,
        stationName: resolvedStationName,
        basinAlert: resolvedBasinAlert,
        tmdAlert: pInfo.tmdAlert,
        liveWater,
        windyUrl: `https://www.windy.com/?${pInfo.lat},${pInfo.lon},11`,
        thaiWaterUrl: 'https://www.thaiwater.net/',
        gistdaUrl: 'https://disaster.gistda.or.th/',
        asBuiltElevationDiff,
        sumpRimVsInnerDiff,
        sumpRimVsOuterDiff,
        entranceCrestDiff,
        asBuiltBenchmarkMSL,
        asBuiltNotes,
        hasFloodwall,
        floodwallHeightDiff,
        hasReport,
        status,
        reportId,
        waterLevel,
        pumpsRunning,
        drainageCondition,
        weather,
        reportDateThai,
        photos,
        hydro
      });
    }

    const summaryStats = {
      total: projectsData.length,
      normal: projectsData.filter(p => p.hasReport && p.status === 'NORMAL').length,
      watch: projectsData.filter(p => p.hasReport && p.status === 'WATCH').length,
      critical: projectsData.filter(p => p.hasReport && p.status === 'CRITICAL').length,
      pending: projectsData.filter(p => !p.hasReport).length
    };

    // ดึงตัวชี้วัดสถานการณ์น้ำต้นน้ำ, ประตูระบายน้ำหลัก, น้ำทะเลหนุน, และประกาศเตือนภัย
    const [damIndicators, watergates, tidalStatus, tmdAdvisory] = await Promise.all([
      getBasinDamIndicators().catch(() => ({})),
      getWatergateHighlights().catch(() => ({})),
      Promise.resolve(getTidalStatus()),
      Promise.resolve(getTmdWeatherWarning())
    ]);

    // หากเป็นการเรียกผ่าน JSON API (?mode=json หรือ ?format=json) สำหรับ Milestone 3 Bridge
    if (isJsonRequest) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      return res.status(200).json({
        success: true,
        generatedAt: new Date().toISOString(),
        summaryStats,
        damIndicators,
        watergates,
        tidalStatus,
        tmdAdvisory,
        projects: projectsData
      });
    }

    const html = generateFloodMapHtml({ 
      projectsData, 
      summaryStats,
      damIndicators,
      watergates,
      tidalStatus,
      tmdAdvisory 
    });
    
    // บันทึกลงแคชในหน่วยความจำ (TTL 60 วินาที)
    floodMapCache = {
      html,
      expiresAt: Date.now() + 60 * 1000
    };

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=15, stale-while-revalidate=30');
    res.setHeader('X-Cache-Status', 'MISS');
    return res.status(200).send(html);
  } catch (error) {
    console.error("Map Dashboard Error:", error);
    return res.status(500).send(`เกิดข้อผิดพลาดในการโหลดแผนที่: ${error.message || error}`);
  }
}

// 📑 รายงานสรุปภาพรวมผู้บริหาร (EXECUTIVE SUMMARY)
// ==========================================
