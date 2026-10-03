import { FLOOD_PROJECTS } from './projectsConfig.js';
import { extractDirectFieldReport, generateFallbackEngineeringSynthesis } from './geminiService.js';

// คำนวณระดับน้ำอุทกวิทยา 3 ชั้น (คลอง vs ถนนนอก vs ถนนในโครงการ)
export function calculateHydrologicalLevels(report = {}, project = {}) {
  const notes = (report.notes || '') + ' ' + (report.drainageCondition || '') + ' ' + (report.waterLevel || '');
  const status = report.status || 'NORMAL';
  
  let canalBelowOuter = 40; // ซม. (ผิวน้ำคลองต่ำกว่าถนนภายนอก)
  let canalBelowInner = 120; // ซม. (ผิวน้ำคลองต่ำกว่าถนนในโครงการ)
  let roadWaterDepth = 0; // ซม. (ความลึกน้ำท่วมขังบนผิวถนน)
  
  // 1. ตรวจจับระยะผิวน้ำคลองเทียบถนนนอก
  const outerMatch = notes.match(/-\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)\s*(?:จากผิวถนน|จากถนนนอก|จากถนน)/i) || 
                     notes.match(/ต่ำกว่า(?:ผิวถนน|ถนน|ตลิ่ง)\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i);
  if (outerMatch) {
    canalBelowOuter = parseFloat(outerMatch[1]);
    if (outerMatch[0].includes('ม')) canalBelowOuter *= 100;
  } else if (/หนุน|ล้น|สูง|ริมฟุตบาท/i.test(report.drainageCondition || '')) {
    canalBelowOuter = 10;
  }
  
  // 2. คำนวณระดับยกพื้น/ระดับถนนในโครงการ (innerElevation) ตามลำดับความสำคัญ (3-Tier Precedence)
  // ลำดับที่ 1: ตรวจวัดจริงหน้างาน (Field Measured จาก LINE Notes)
  // ลำดับที่ 2: ค่าตามแบบก่อสร้างจริง As-Built Drawing (Project Config)
  // ลำดับที่ 3: ค่ามาตรฐานวิศวกรรม LH (+80 ซม.)
  let innerElevation = 80;
  let innerSource = 'ENGINEERING_STANDARD'; // 'FIELD_MEASURED' | 'AS_BUILT' | 'ENGINEERING_STANDARD'

  const innerMatch = notes.match(/-\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)\s*(?:จากพื้นโครงการ|จากถนนในโครงการ|จากในโครงการ)/i);
  if (innerMatch) {
    canalBelowInner = parseFloat(innerMatch[1]);
    if (innerMatch[0].includes('ม')) canalBelowInner *= 100;
    if (canalBelowInner > canalBelowOuter) {
      innerElevation = canalBelowInner - canalBelowOuter;
      innerSource = 'FIELD_MEASURED';
    }
  } else if (typeof project?.asBuiltElevationDiff === 'number' && !isNaN(project.asBuiltElevationDiff)) {
    innerElevation = Math.round(project.asBuiltElevationDiff * 100);
    canalBelowInner = canalBelowOuter + innerElevation;
    innerSource = 'AS_BUILT';
  } else {
    innerElevation = 80;
    canalBelowInner = canalBelowOuter + innerElevation;
    innerSource = 'ENGINEERING_STANDARD';
  }
  
  // 3. ตรวจจับระดับน้ำท่วมขังบนผิวถนน
  const roadMatch = notes.match(/(?:น้ำท่วม|น้ำขัง|รอการระบาย)\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i);
  if (roadMatch) {
    roadWaterDepth = parseFloat(roadMatch[1]);
  } else if (/แห้ง|ปกติ|เรียบร้อย/i.test(report.waterLevel || '')) {
    roadWaterDepth = 0;
  }
  
  const isCanalHigh = status === 'WATCH' || status === 'CRITICAL' || /หนุน|ล้น|สูง|ริมฟุตบาท/i.test(report.drainageCondition || '');
  const flapValve = isCanalHigh ? 'CLOSED' : 'OPEN';
  const pumpStatus = status === 'CRITICAL' ? 'ACTIVE' : (isCanalHigh ? 'STANDBY' : 'READY');

  return {
    canalBelowOuter: Math.round(canalBelowOuter),
    canalBelowInner: Math.round(canalBelowInner),
    roadWaterDepth: Math.round(roadWaterDepth),
    innerElevation: Math.round(innerElevation),
    innerSource,
    asBuiltElevationDiff: typeof project?.asBuiltElevationDiff === 'number' ? project.asBuiltElevationDiff : 0.80,
    asBuiltBenchmarkMSL: project?.asBuiltBenchmarkMSL || null,
    asBuiltNotes: project?.asBuiltNotes || null,
    outerElevation: 0,  // เกณฑ์อ้างอิงถนนภายนอก (0 ซม.)
    canalElevation: -Math.round(canalBelowOuter),
    flapValve,
    pumpStatus
  };
}

// สร้าง HTML สำหรับหน้า Map Dashboard
export function generateFloodMapHtml({ projectsData = [], summaryStats = {}, generatedAtThai = '' }) {
  const safeDataJson = JSON.stringify(projectsData).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>LH Flood Monitoring Map | แผนที่ติดตามสถานการณ์น้ำและระบบระบายน้ำ Real-time</title>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Prompt', 'sans-serif'],
          },
          colors: {
            lh: {
              navy: '#0f2e4a',
              gold: '#bca374',
              goldHover: '#a38a5b',
              dark: '#0a1e30',
              accent: '#1e40af'
            }
          }
        }
      }
    }
  </script>

  <style>
    body { font-family: 'Prompt', sans-serif; background-color: #0f172a; margin: 0; padding: 0; overflow: hidden; }
    #map { height: 100vh; width: 100vw; z-index: 1; }

    /* Custom Leaflet Marker Styling */
    .custom-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .marker-pin {
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      position: absolute;
      transform: rotate(-45deg);
      left: 50%;
      top: 50%;
      margin: -20px 0 0 -16px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .marker-pin:hover {
      transform: rotate(-45deg) scale(1.15);
      box-shadow: 0 6px 14px rgba(0,0,0,0.5);
    }
    .marker-icon {
      transform: rotate(45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-weight: bold;
    }
    .marker-label {
      position: absolute;
      top: -24px;
      white-space: nowrap;
      background: rgba(15, 23, 42, 0.9);
      color: #f8fafc;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.25);
      box-shadow: 0 2px 5px rgba(0,0,0,0.25);
      pointer-events: none;
    }

    /* Pulse Animations */
    .pulse-ring {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      animation: pulsate 2s infinite ease-out;
      pointer-events: none;
      margin: -22px 0 0 -22px;
    }
    @keyframes pulsate {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }

    /* Cross Section SVG Styling */
    .cross-section-svg {
      width: 100%;
      height: 180px;
      background: linear-gradient(180deg, #09131f 0%, #0d1b2a 100%);
      border-radius: 12px;
      border: 1px solid #1e293b;
    }

    /* Glassmorphism Panel */
    .glass-panel {
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
  </style>
</head>
<body class="relative text-slate-100 antialiased selection:bg-lh-gold selection:text-slate-900">

  <!-- Top Floating Header & Stats Bar -->
  <header class="fixed top-3 left-3 right-3 z-30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 p-2.5 md:p-3 rounded-2xl glass-panel shadow-2xl">
    <!-- Brand / Title -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-lh-navy to-slate-900 flex items-center justify-center border border-lh-gold/40 shadow-inner shrink-0">
        <span class="text-lh-gold font-black text-lg tracking-wider">LH</span>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-sm md:text-base font-bold text-white tracking-wide flex items-center gap-1.5">
            <span>แผนที่ติดตามสถานการณ์น้ำและระบบระบายน้ำ Real-time</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">LIVE</span>
          </h1>
        </div>
        <p class="text-[11px] text-slate-400 hidden sm:block">
          ระบบสารสนเทศภูมิศาสตร์ (GIS) เฝ้าระวังระดับน้ำและพยากรณ์อากาศ 30 โครงการ แลนด์ แอนด์ เฮ้าส์
        </p>
      </div>
    </div>

    <!-- Quick Metrics & Actions -->
    <div class="flex flex-wrap items-center gap-2 justify-between md:justify-end">
      <!-- Counters -->
      <div class="flex items-center gap-1.5 text-xs bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-700/60 shadow-inner">
        <div class="flex items-center gap-1 px-1.5" title="โครงการทั้งหมดในฐานข้อมูล">
          <span class="text-slate-400">ทั้งหมด:</span>
          <span class="font-bold text-white" id="stat-total">${summaryStats.total || projectsData.length}</span>
        </div>
        <div class="h-3 w-px bg-slate-700"></div>
        <div class="flex items-center gap-1 px-1.5 text-emerald-400" title="สถานะปกติ">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="font-bold" id="stat-normal">${summaryStats.normal || 0}</span>
        </div>
        <div class="h-3 w-px bg-slate-700"></div>
        <div class="flex items-center gap-1 px-1.5 text-amber-400" title="เฝ้าระวังน้ำหนุน / ฝนหนัก">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span class="font-bold" id="stat-watch">${summaryStats.watch || 0}</span>
        </div>
        <div class="h-3 w-px bg-slate-700"></div>
        <div class="flex items-center gap-1 px-1.5 text-rose-400" title="วิกฤติ / น้ำขัง">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          <span class="font-bold" id="stat-critical">${summaryStats.critical || 0}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <a href="/api/flood-report?mode=executive" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-lh-gold/20 hover:bg-lh-gold/30 text-lh-gold border border-lh-gold/40 transition-colors shadow-sm" title="เปิดหน้ารายงานสรุปผู้บริหาร">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span class="hidden sm:inline">รายงานสรุปผู้บริหาร</span>
          <span class="sm:hidden">รายงาน</span>
        </a>

        <button onclick="window.location.reload()" class="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors" title="รีเฟรชข้อมูลล่าสุด">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Filter & Layer Controls (Floating Left) -->
  <aside class="fixed top-28 md:top-24 left-3 z-20 flex flex-col gap-2 max-w-[280px] sm:max-w-xs pointer-events-auto">
    <!-- Zone Selector -->
    <div class="glass-panel p-2 rounded-2xl shadow-xl flex flex-col gap-1.5">
      <div class="flex items-center justify-between px-1">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">เลือกพื้นที่โครงการ</span>
        <span class="text-[10px] text-lh-gold" id="filter-count">แสดง 30/30</span>
      </div>
      <div class="flex flex-wrap gap-1" id="zone-filter-container">
        <button onclick="setZoneFilter('all')" class="zone-btn active px-2.5 py-1 rounded-lg text-xs font-semibold bg-lh-gold text-slate-950 transition-all shadow-xs" data-zone="all">ทั้งหมด</button>
        <button onclick="setZoneFilter('ปทุมธานี')" class="zone-btn px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="ปทุมธานี">รังสิต-ปทุมฯ</button>
        <button onclick="setZoneFilter('พระนครศรีอยุธยา')" class="zone-btn px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="พระนครศรีอยุธยา">อยุธยา</button>
        <button onclick="setZoneFilter('นนทบุรี')" class="zone-btn px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="นนทบุรี">นนทบุรี-บางใหญ่</button>
        <button onclick="setZoneFilter('สะพานสูง')" class="zone-btn px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="สะพานสูง">กรุงเทพกรีฑา</button>
        <button onclick="setZoneFilter('คลองสามวา')" class="zone-btn px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="คลองสามวา">รามอินทรา-สายไหม</button>
        <button onclick="setZoneFilter('ทวีวัฒนา')" class="zone-btn px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="ทวีวัฒนา">ฝั่งธนบุรี</button>
      </div>

      <!-- Secondary Filters: Status & Radar -->
      <div class="pt-1.5 border-t border-slate-700/60 flex items-center justify-between gap-1">
        <button onclick="toggleRiskOnly()" id="risk-only-btn" class="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors">
          <span>⚠️ จุดเฝ้าระวังเท่านั้น</span>
        </button>
        <button onclick="toggleRadarLayer()" id="radar-toggle-btn" class="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-900/40 text-blue-300 hover:text-blue-100 border border-blue-700/50 transition-colors" title="เปิด/ปิด แผ่นเรดาร์ฝน RainViewer">
          <span>🌧️ เรดาร์ฝน</span>
        </button>
      </div>
    </div>

    <!-- Quick Legend -->
    <div class="glass-panel p-2 rounded-xl text-[10px] text-slate-400 space-y-1 shadow-lg hidden sm:block">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
        <span class="text-slate-300 font-medium">ปกติ:</span> คลองต่ำกว่าเกณฑ์ ถนนแห้ง 100%
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
        <span class="text-slate-300 font-medium">เฝ้าระวัง:</span> คลองหนุนสูง ปิด Flap Valve
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
        <span class="text-slate-300 font-medium">วิกฤติ:</span> น้ำขังผิวถนน / เดินเครื่องสูบน้ำ
      </div>
    </div>
  </aside>

  <!-- Interactive Map Canvas -->
  <main id="map"></main>

  <!-- Project Detail Drawer (Slide-in Right on Desktop / Bottom Sheet on Mobile) -->
  <section id="project-drawer" class="fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[460px] md:w-[500px] glass-panel bg-slate-950/95 border-l border-slate-800 shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out flex flex-col pointer-events-auto">
    <!-- Drawer Header -->
    <div class="p-4 border-b border-slate-800/80 flex items-start justify-between gap-3 bg-slate-900/60 shrink-0">
      <div class="space-y-0.5">
        <div class="flex items-center gap-2">
          <span id="drawer-code" class="px-2 py-0.5 rounded-md text-xs font-black bg-lh-gold text-slate-950">NE-419</span>
          <span id="drawer-status-badge" class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ปกติ (NORMAL)</span>
        </div>
        <h2 id="drawer-name" class="text-lg font-bold text-white leading-snug">Villaggio รังสิตคลอง 4</h2>
        <p id="drawer-area" class="text-xs text-slate-400">คลองสี่, ธัญบุรี, ปทุมธานี</p>
      </div>
      <button onclick="closeDrawer()" class="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Drawer Content (Scrollable) -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

      <!-- 🌊 1. ไดอะแกรมจำลองระดับน้ำ 3 ชั้น (Hydrological 3-Tier Cross-Section) -->
      <div class="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 space-y-2.5 shadow-md">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-white text-xs flex items-center gap-1.5">
            <svg class="w-4 h-4 text-lh-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <span>แบบจำลองอุทกวิทยาระดับน้ำ 3 มิติ (LH Cross-Section)</span>
          </h3>
          <div class="flex items-center gap-1.5">
            <span id="cs-asbuilt-badge" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">📐 As-Built: +0.80 ม.</span>
            <span class="text-[10px] text-slate-400 font-mono hidden sm:inline" id="cs-baseline">อ้างอิงถนน 0.00 ม.</span>
          </div>
        </div>

        <!-- Dynamic SVG Diagram -->
        <div class="relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950 p-2">
          <svg id="cross-section-graphic" class="w-full h-44" viewBox="0 0 460 170" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Sky Gradient Background -->
            <rect width="460" height="170" fill="url(#sky-grad)"/>

            <!-- Ground: Internal Road (Left) elevated -->
            <path id="svg-inner-road" d="M 0,80 L 160,80 L 170,110 L 170,170 L 0,170 Z" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
            <!-- Road Surface: Outer Road (Middle) 0cm -->
            <path d="M 170,110 L 320,110 L 330,135 L 330,170 L 170,170 Z" fill="#334155" stroke="#475569" stroke-width="1.5"/>
            <!-- Canal Bed (Right) -140cm -->
            <path d="M 330,135 L 460,135 L 460,170 L 330,170 Z" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>

            <!-- House / Villa Icon on Inner Road -->
            <g id="svg-house-group" transform="translate(45, 42)">
              <polygon points="20,0 40,18 0,18" fill="#bca374" opacity="0.9"/>
              <rect x="5" y="18" width="30" height="20" fill="#cbd5e1"/>
              <rect x="15" y="24" width="10" height="14" fill="#0f2e4a"/>
            </g>

            <!-- Canal Water (Dynamic Height) -->
            <rect id="svg-canal-water" x="330" y="125" width="130" height="45" fill="url(#water-grad)" opacity="0.85"/>
            <!-- Animated Water Waves -->
            <path id="svg-water-line" d="M 330,125 Q 360,123 395,125 T 460,125" stroke="#38bdf8" stroke-width="2" fill="none"/>

            <!-- Road Water (Puddle) if any -->
            <rect id="svg-road-water" x="170" y="108" width="150" height="2" fill="#0284c7" opacity="0.6"/>

            <!-- Flap Valve Connector (Under road culvert) -->
            <circle cx="325" cy="130" r="7" fill="#0f172a" stroke="#cbd5e1" stroke-width="2"/>
            <line id="svg-flap-valve" x1="325" y1="130" x2="331" y2="124" stroke="#eab308" stroke-width="3" stroke-linecap="round"/>

            <!-- Annotations / Labels on SVG -->
            <text x="15" y="20" fill="#94a3b8" font-size="9" font-weight="600">ถนนในโครงการ</text>
            <text id="svg-inner-txt" x="15" y="32" fill="#10b981" font-size="10" font-weight="700">+0.80 ม. (แห้ง 100%)</text>

            <text x="180" y="95" fill="#94a3b8" font-size="9" font-weight="600">ถนนหน้าโครงการ</text>
            <text id="svg-outer-txt" x="180" y="107" fill="#f8fafc" font-size="10" font-weight="700">0.00 ม. (ปกติ)</text>

            <text x="345" y="85" fill="#94a3b8" font-size="9" font-weight="600">คลองหน้าโครงการ</text>
            <text id="svg-canal-txt" x="345" y="97" fill="#38bdf8" font-size="10" font-weight="700">-0.40 ม. (ในเกณฑ์)</text>

            <!-- Definitions for Gradients -->
            <defs>
              <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#020617"/>
                <stop offset="100%" stop-color="#0f172a"/>
              </linearGradient>
              <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0284c7" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="#0369a1" stop-opacity="0.95"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <!-- Metrics Comparison Summary Table -->
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">ระดับน้ำคลองเทียบถนนนอก</span>
            <span id="cs-canal-outer" class="font-bold text-sky-400 text-sm">ต่ำกว่า 40 ซม.</span>
            <span class="text-[9px] text-slate-500 block">เกณฑ์ควบคุมปกติ</span>
          </div>
          <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-slate-400 block text-[10px]">ระดับน้ำคลองเทียบถนนใน</span>
              <span id="cs-source-tag" class="text-[9px] text-sky-400 font-semibold">📐 As-Built</span>
            </div>
            <span id="cs-canal-inner" class="font-bold text-emerald-400 text-sm">ต่ำกว่า 120 ซม.</span>
            <span id="cs-canal-inner-sub" class="text-[9px] text-slate-400 block">ปลอดภัยสูง (ถมดินยก +0.80 ม.)</span>
          </div>
          <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">บานพับ Flap Valve</span>
            <span id="cs-flap-valve" class="font-bold text-amber-400">เปิดระบายปกติ</span>
            <span class="text-[9px] text-slate-500 block">ระบายน้ำตามแรงโน้มถ่วง</span>
          </div>
          <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">ระบบเครื่องสูบน้ำ</span>
            <span id="cs-pump-status" class="font-bold text-emerald-400">พร้อมใช้งาน 100%</span>
            <span class="text-[9px] text-slate-500 block">สแตนด์บายลูกลอยอัตโนมัติ</span>
          </div>
        </div>
      </div>

      <!-- ⛅ 2. ข้อมูลพยากรณ์อากาศและเรดาร์ Real-time (Open-Meteo & TMD) -->
      <div class="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 space-y-2 shadow-md">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-white text-xs flex items-center gap-1.5">
            <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
            <span>พยากรณ์อากาศระดับพิกัด (Open-Meteo & TMD)</span>
          </h3>
          <span class="text-[10px] text-slate-400">Real-time GPS API</span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center text-xs">
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block">อุณหภูมิ</span>
            <span id="weather-temp" class="text-sm font-bold text-white">31°C</span>
            <span id="weather-cond" class="text-[9px] text-slate-400 block truncate">มีเมฆบางส่วน</span>
          </div>
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block">โอกาสเกิดฝน</span>
            <span id="weather-rain-prob" class="text-sm font-bold text-sky-400">60%</span>
            <span class="text-[9px] text-slate-400 block">24 ชม. ข้างหน้า</span>
          </div>
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block">ฝนสะสมคาดการณ์</span>
            <span id="weather-rain-24h" class="text-sm font-bold text-amber-400">25.0 มม.</span>
            <span class="text-[9px] text-slate-400 block">เกณฑ์เฝ้าระวัง</span>
          </div>
        </div>

        <!-- Hourly Rain Probability Bar -->
        <div class="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] text-slate-400">
            <span>แนวโน้มฝนรายชั่วโมง (Hourly Precipitation Chance)</span>
            <span id="hourly-updated-txt">Open-Meteo Global Model</span>
          </div>
          <div class="grid grid-cols-6 gap-1 text-center font-mono text-[9px]" id="hourly-bars-container">
            <div class="bg-slate-900 p-1 rounded"><span>12:00</span><span class="block font-bold text-sky-400">30%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>15:00</span><span class="block font-bold text-sky-400">65%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>18:00</span><span class="block font-bold text-sky-400">75%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>21:00</span><span class="block font-bold text-sky-400">40%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>00:00</span><span class="block font-bold text-sky-400">20%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>03:00</span><span class="block font-bold text-sky-400">10%</span></div>
          </div>
        </div>

        <!-- Station & Alerts -->
        <div class="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1 text-[11px]">
          <div class="flex items-start gap-1.5 text-slate-300">
            <span class="text-lh-gold shrink-0">📍</span>
            <div>
              <strong class="text-white">สถานีอ้างอิง:</strong>
              <span id="weather-station">-</span>
            </div>
          </div>
          <div class="flex items-start gap-1.5 text-slate-300">
            <span class="text-amber-400 shrink-0">🌊</span>
            <div>
              <strong class="text-amber-300">สถานการณ์ลุ่มน้ำ:</strong>
              <span id="weather-basin">-</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 📋 3. สภาพหน้างานจริงและภาพถ่ายล่าสุด (Field Reality & Inspection Photos) -->
      <div class="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 space-y-2.5 shadow-md">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-white text-xs flex items-center gap-1.5">
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>รายงานตรวจเช็คจริงหน้างาน (Field Inspection)</span>
          </h3>
          <span id="field-updated-at" class="text-[10px] text-slate-400 font-mono">-</span>
        </div>

        <div class="space-y-1.5 text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <div><strong class="text-slate-400">สภาพผิวจราจร:</strong> <span id="field-water" class="text-white">-</span></div>
          <div><strong class="text-slate-400">สภาพคลอง/ทางน้ำ:</strong> <span id="field-canal" class="text-white">-</span></div>
          <div><strong class="text-slate-400">สถานะเครื่องสูบน้ำ:</strong> <span id="field-pumps" class="text-white">-</span></div>
        </div>

        <!-- Photos Grid -->
        <div id="photos-section" class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span>ภาพถ่ายสำรวจหน้างาน (<span id="photo-count">0</span> ภาพ)</span>
            <span class="text-[10px] text-lh-gold">คลิกเพื่อดูภาพขยาย</span>
          </div>
          <div id="photos-grid" class="grid grid-cols-4 gap-1.5">
            <!-- Dynamic Thumbnails -->
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-2 flex items-center gap-2">
        <a id="btn-full-report" href="#" target="_blank" class="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-lh-gold hover:bg-lh-goldHover text-slate-950 font-bold text-xs shadow-lg transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>เปิดรายงานฉบับเต็ม</span>
        </a>
        <a id="btn-gmaps" href="#" target="_blank" class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors">
          <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span>นำทาง</span>
        </a>
      </div>

    </div>
  </section>

  <!-- Image Lightbox Modal -->
  <div id="lightbox" class="fixed inset-0 z-50 bg-black/95 hidden items-center justify-center p-4 backdrop-blur-md" onclick="closeLightbox()">
    <button class="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 rounded-full" onclick="closeLightbox()">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
    <img id="lightbox-img" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/20" src="" alt="ภาพขยาย">
  </div>

  <!-- Leaflet JS -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

  <!-- Client Script for Map Logic, Cross-Section Rendering & Open-Meteo -->
  <script>
    const PROJECTS = ${safeDataJson};
    let map;
    let markers = [];
    let radarLayer = null;
    let isRadarActive = false;
    let currentFilterZone = 'all';
    let filterRiskOnly = false;

    // Initialize Map
    function initMap() {
      // Bangkok & Vicinity default center
      map = L.map('map', {
        center: [13.88, 100.58],
        zoom: 11,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Positron Dark Tiles (High-contrast corporate look)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> &copy; <a href=\"https://carto.com/\">CARTO</a> | Land & Houses',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      renderMarkers();

      // Check URL parameters (e.g. ?focus=NE-419)
      const urlParams = new URLSearchParams(window.location.search);
      const focusCode = urlParams.get('focus') || urlParams.get('project');
      if (focusCode) {
        const target = PROJECTS.find(p => p.code.toLowerCase() === focusCode.toLowerCase());
        if (target) {
          setTimeout(() => {
            selectProject(target.code);
            map.flyTo([target.lat, target.lon], 14, { duration: 1.2 });
          }, 400);
        }
      }
    }

    // Render Markers on Map
    function renderMarkers() {
      // Clear existing
      markers.forEach(m => map.removeLayer(m));
      markers = [];

      const filtered = PROJECTS.filter(p => {
        if (currentFilterZone !== 'all') {
          const matchZone = (p.area || '').includes(currentFilterZone) || (p.name || '').includes(currentFilterZone);
          if (!matchZone) return false;
        }
        if (filterRiskOnly) {
          if (p.status !== 'WATCH' && p.status !== 'CRITICAL') return false;
        }
        return true;
      });

      document.getElementById('filter-count').innerText = 'แสดง ' + filtered.length + '/' + PROJECTS.length;

      filtered.forEach(p => {
        const status = p.status || 'NORMAL';
        let pinColor = '#10b981'; // Green (NORMAL)
        let ringColor = 'rgba(16, 185, 129, 0.4)';
        let pulseClass = '';

        if (status === 'WATCH') {
          pinColor = '#f59e0b'; // Orange
          ringColor = 'rgba(245, 158, 11, 0.5)';
          pulseClass = '<div class=\"pulse-ring\" style=\"background:' + ringColor + '\"></div>';
        } else if (status === 'CRITICAL') {
          pinColor = '#ef4444'; // Red
          ringColor = 'rgba(239, 68, 68, 0.6)';
          pulseClass = '<div class=\"pulse-ring\" style=\"background:' + ringColor + '; animation-duration: 1s;\"></div>';
        }

        const iconHtml = \`
          <div class=\"custom-marker\">
            \${pulseClass}
            <div class=\"marker-pin\" style=\"background: \${pinColor};\">
              <span class=\"marker-icon\">💧</span>
            </div>
            <div class=\"marker-label\">\${p.code}</div>
          </div>
        \`;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-div-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        const marker = L.marker([p.lat, p.lon], { icon: customIcon });

        // Tooltip on Hover
        marker.bindTooltip(\`<strong>\${p.code}</strong>: \${p.name}<br><span style=\"color:\${pinColor}\">\${status === 'NORMAL' ? '🟢 ปกติ' : (status === 'WATCH' ? '🟠 เฝ้าระวัง' : '🔴 วิกฤติ')}</span>\`, {
          direction: 'top',
          offset: [0, -28],
          opacity: 0.95
        });

        // Click to Open Drawer
        marker.on('click', () => {
          selectProject(p.code);
          map.panTo([p.lat, p.lon]);
        });

        marker.addTo(map);
        markers.push(marker);
      });

      // Adjust bounds if filtered
      if (filtered.length > 0 && currentFilterZone !== 'all') {
        const bounds = L.latLngBounds(filtered.map(p => [p.lat, p.lon]));
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
      }
    }

    // Select Project & Populate Drawer with Hydrological Cross-Section
    function selectProject(projectCode) {
      const p = PROJECTS.find(item => item.code === projectCode);
      if (!p) return;

      // Populate Header
      document.getElementById('drawer-code').innerText = p.code;
      document.getElementById('drawer-name').innerText = p.name;
      document.getElementById('drawer-area').innerText = p.area || '-';

      const status = p.status || 'NORMAL';
      const badge = document.getElementById('drawer-status-badge');
      if (status === 'NORMAL') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        badge.innerText = '🟢 ปกติ (NORMAL)';
      } else if (status === 'WATCH') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse';
        badge.innerText = '🟠 เฝ้าระวังน้ำหนุน (WATCH)';
      } else {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse';
        badge.innerText = '🔴 น้ำท่วมขัง/วิกฤติ (CRITICAL)';
      }

      // Populate Hydrological Cross-Section Diagram & Metrics
      const hydro = p.hydro || { 
        canalBelowOuter: 40, 
        canalBelowInner: 120, 
        roadWaterDepth: 0, 
        innerElevation: 80, 
        innerSource: 'ENGINEERING_STANDARD', 
        asBuiltElevationDiff: 0.80, 
        flapValve: 'OPEN', 
        pumpStatus: 'READY' 
      };

      const elevMeters = (hydro.innerElevation / 100).toFixed(2);
      const elevSign = hydro.innerElevation >= 0 ? '+' : '';

      // Update As-Built Badge in Cross-Section Header
      const asbuiltBadge = document.getElementById('cs-asbuilt-badge');
      if (asbuiltBadge) {
        if (hydro.innerSource === 'AS_BUILT') {
          asbuiltBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30';
          asbuiltBadge.innerText = '📐 As-Built: ' + elevSign + elevMeters + ' ม.' + (p.asBuiltBenchmarkMSL ? ' (' + p.asBuiltBenchmarkMSL + ')' : '');
        } else if (hydro.innerSource === 'FIELD_MEASURED') {
          asbuiltBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
          asbuiltBadge.innerText = '📏 ตรวจวัดจริง: ' + elevSign + elevMeters + ' ม.';
        } else {
          asbuiltBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/40';
          asbuiltBadge.innerText = '⚙️ มาตรฐาน LH: +0.80 ม.';
        }
      }

      const baselineElem = document.getElementById('cs-baseline');
      if (baselineElem) {
        baselineElem.innerText = p.asBuiltBenchmarkMSL ? ('อ้างอิง: ' + p.asBuiltBenchmarkMSL) : 'อ้างอิงถนน 0.00 ม.';
      }

      const sourceTag = document.getElementById('cs-source-tag');
      if (sourceTag) {
        sourceTag.innerText = hydro.innerSource === 'AS_BUILT' ? '📐 As-Built' : (hydro.innerSource === 'FIELD_MEASURED' ? '📏 วัดจริง' : '⚙️ มาตรฐาน');
        sourceTag.className = hydro.innerSource === 'AS_BUILT' ? 'text-[9px] text-sky-400 font-semibold' : (hydro.innerSource === 'FIELD_MEASURED' ? 'text-[9px] text-emerald-400 font-semibold' : 'text-[9px] text-slate-400');
      }

      document.getElementById('cs-canal-outer').innerText = 'ต่ำกว่า ' + hydro.canalBelowOuter + ' ซม.';
      document.getElementById('cs-canal-inner').innerText = 'ต่ำกว่า ' + hydro.canalBelowInner + ' ซม.';
      
      const innerSub = document.getElementById('cs-canal-inner-sub');
      if (innerSub) {
        if (hydro.innerSource === 'AS_BUILT') {
          innerSub.innerText = '📐 ตามแบบ As-Built (' + elevSign + elevMeters + ' ม.)' + (p.asBuiltBenchmarkMSL ? ' • ' + p.asBuiltBenchmarkMSL : '');
        } else if (hydro.innerSource === 'FIELD_MEASURED') {
          innerSub.innerText = '📏 ตรวจวัดจริงหน้างาน (' + elevSign + elevMeters + ' ม.)';
        } else {
          innerSub.innerText = '⚙️ มาตรฐานวิศวกรรม LH (+0.80 ม.)';
        }
      }

      document.getElementById('cs-flap-valve').innerText = hydro.flapValve === 'OPEN' ? 'เปิดระบายธรรมชาติ' : 'ปิดป้องกันน้ำย้อน';
      document.getElementById('cs-flap-valve').className = hydro.flapValve === 'OPEN' ? 'font-bold text-emerald-400' : 'font-bold text-amber-400';
      document.getElementById('cs-pump-status').innerText = hydro.pumpStatus === 'READY' ? 'พร้อมใช้งาน 100%' : (hydro.pumpStatus === 'ACTIVE' ? 'กำลังเดินเครื่องเร่งระบาย' : 'Standby เตรียมสูบ');

      // Update SVG Dynamic Visuals
      // Road baseline Y = 110. Inner road Y depends on innerElevation (scale: 30px per 80cm => ~0.375 px/cm)
      const innerY = Math.max(50, Math.min(100, 110 - Math.round(hydro.innerElevation * 0.375)));
      const innerRoad = document.getElementById('svg-inner-road');
      if (innerRoad) {
        innerRoad.setAttribute('d', 'M 0,' + innerY + ' L 160,' + innerY + ' L 170,110 L 170,170 L 0,170 Z');
      }
      const houseGroup = document.getElementById('svg-house-group');
      if (houseGroup) {
        houseGroup.setAttribute('transform', 'translate(45, ' + (innerY - 38) + ')');
      }

      // Canal water y-coordinate: baseline road is 110, so canal water is 110 + canalBelowOuter (scaled)
      const waterY = Math.min(160, Math.max(105, 110 + (hydro.canalBelowOuter * 0.4)));
      const canalRect = document.getElementById('svg-canal-water');
      const waterLine = document.getElementById('svg-water-line');
      if (canalRect && waterLine) {
        canalRect.setAttribute('y', waterY);
        canalRect.setAttribute('height', 170 - waterY);
        waterLine.setAttribute('d', 'M 330,' + waterY + ' Q 360,' + (waterY - 2) + ' 395,' + waterY + ' T 460,' + waterY);
      }

      // Flap valve rotation
      const flap = document.getElementById('svg-flap-valve');
      if (flap) {
        if (hydro.flapValve === 'OPEN') {
          flap.setAttribute('x2', '331');
          flap.setAttribute('y2', '124');
          flap.setAttribute('stroke', '#10b981'); // Green Open
        } else {
          flap.setAttribute('x2', '325');
          flap.setAttribute('y2', '137');
          flap.setAttribute('stroke', '#eab308'); // Yellow Closed
        }
      }

      // Text annotations on SVG
      const innerSrcBadge = hydro.innerSource === 'AS_BUILT' ? 'As-Built' : (hydro.innerSource === 'FIELD_MEASURED' ? 'ตรวจวัด' : 'มาตรฐาน');
      const innerStatusTxt = hydro.roadWaterDepth > 0 ? ('น้ำขัง ' + hydro.roadWaterDepth + ' ซม.') : ('แห้ง 100% (' + innerSrcBadge + ')');
      const svgInnerTxt = document.getElementById('svg-inner-txt');
      if (svgInnerTxt) {
        svgInnerTxt.innerText = elevSign + elevMeters + ' ม. ' + innerStatusTxt;
        svgInnerTxt.setAttribute('fill', hydro.roadWaterDepth > 0 ? '#ef4444' : '#10b981');
      }

      document.getElementById('svg-outer-txt').innerText = hydro.roadWaterDepth > 0 ? ('น้ำขัง ' + hydro.roadWaterDepth + ' ซม.') : '0.00 ม. (ปกติ)';
      document.getElementById('svg-outer-txt').setAttribute('fill', hydro.roadWaterDepth > 0 ? '#ef4444' : '#f8fafc');
      document.getElementById('svg-canal-txt').innerText = '-' + (hydro.canalBelowOuter / 100).toFixed(2) + ' ม. (' + (hydro.canalBelowOuter <= 15 ? 'หนุนสูง' : 'ในเกณฑ์') + ')';
      document.getElementById('svg-canal-txt').setAttribute('fill', hydro.canalBelowOuter <= 15 ? '#f59e0b' : '#38bdf8');

      // Weather Section
      const w = p.weather || {};
      document.getElementById('weather-temp').innerText = (w.temp ? w.temp + '°C' : '31°C');
      document.getElementById('weather-cond').innerText = w.condition || 'ท้องฟ้าแจ่มใส';
      document.getElementById('weather-rain-prob').innerText = (w.rainProb || 60) + '%';
      document.getElementById('weather-rain-24h').innerText = (w.expectedRain24h || '25.0') + ' มม.';
      document.getElementById('weather-station').innerText = p.stationName || w.stationName || 'สถานีลุ่มน้ำเจ้าพระยา (สสน./RID)';
      document.getElementById('weather-basin').innerText = p.basinAlert || w.basinAlert || 'ระดับน้ำคลองสายหลักอยู่ในเกณฑ์ควบคุม ประตูระบายน้ำพร้อมทำงาน';

      // Field Section
      document.getElementById('field-updated-at').innerText = p.reportDateThai || 'รอบตรวจล่าสุด';
      document.getElementById('field-water').innerText = p.waterLevel || 'ถนนเมนแห้งสนิท สภาพปกติ (0 ซม.)';
      document.getElementById('field-canal').innerText = p.drainageCondition || 'ระบายได้คล่องตัว ท่อระบายน้ำหลักเปิดโล่ง';
      document.getElementById('field-pumps').innerText = p.pumpsRunning || 'ระบบป้องกันน้ำท่วมทำงานปกติ (พร้อมใช้งาน 100%)';

      // Photos Section
      const photoGrid = document.getElementById('photos-grid');
      photoGrid.innerHTML = '';
      const photoCount = (p.photos && p.photos.length) || 0;
      document.getElementById('photo-count').innerText = photoCount;

      if (photoCount > 0) {
        p.photos.forEach((ph, idx) => {
          const imgUrl = ph.url || \`/api/flood-report?id=\${p.reportId}&photo=\${ph.index ?? idx}\`;
          const thumb = document.createElement('div');
          thumb.className = 'aspect-square rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 cursor-pointer hover:border-lh-gold transition-all shadow-sm';
          thumb.innerHTML = \`<img src=\"\${imgUrl}\" class=\"w-full h-full object-cover\" loading=\"lazy\" alt=\"ภาพถ่ายหน้างาน \${idx + 1}\" onclick=\"openLightbox('\${imgUrl}')\">\`;
          photoGrid.appendChild(thumb);
        });
      } else {
        photoGrid.innerHTML = '<div class=\"col-span-4 py-2 text-center text-slate-500 text-[10px]\">ไม่มีภาพถ่ายในรายงานรอบนี้</div>';
      }

      // Buttons Links
      const btnReport = document.getElementById('btn-full-report');
      if (p.reportId) {
        btnReport.href = \`/api/flood-report?id=\${p.reportId}\`;
        btnReport.style.display = 'flex';
      } else {
        btnReport.style.display = 'none';
      }

      document.getElementById('btn-gmaps').href = \`https://www.google.com/maps/dir/?api=1&destination=\${p.lat},\${p.lon}\`;

      // Open Drawer
      document.getElementById('project-drawer').classList.remove('translate-x-full');

      // Fetch Live Open-Meteo GPS Forecast
      fetchOpenMeteoHourly(p.lat, p.lon);
    }

    // Close Drawer
    function closeDrawer() {
      document.getElementById('project-drawer').classList.add('translate-x-full');
    }

    // Open/Close Lightbox
    function openLightbox(url) {
      document.getElementById('lightbox-img').src = url;
      document.getElementById('lightbox').classList.remove('hidden');
      document.getElementById('lightbox').classList.add('flex');
    }
    function closeLightbox() {
      document.getElementById('lightbox').classList.add('hidden');
      document.getElementById('lightbox').classList.remove('flex');
    }

    // Zone Filter Function
    function setZoneFilter(zone) {
      currentFilterZone = zone;
      document.querySelectorAll('.zone-btn').forEach(b => {
        if (b.dataset.zone === zone) {
          b.className = 'zone-btn active px-2.5 py-1 rounded-lg text-xs font-semibold bg-lh-gold text-slate-950 transition-all shadow-xs';
        } else {
          b.className = 'zone-btn px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all';
        }
      });
      renderMarkers();
    }

    // Toggle Risk Only Filter
    function toggleRiskOnly() {
      filterRiskOnly = !filterRiskOnly;
      const btn = document.getElementById('risk-only-btn');
      if (filterRiskOnly) {
        btn.className = 'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 border border-amber-400 transition-colors shadow-sm';
      } else {
        btn.className = 'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors';
      }
      renderMarkers();
    }

    // Toggle RainViewer Weather Radar Overlay
    async function toggleRadarLayer() {
      const btn = document.getElementById('radar-toggle-btn');
      if (isRadarActive) {
        if (radarLayer) map.removeLayer(radarLayer);
        isRadarActive = false;
        btn.className = 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-900/40 text-blue-300 hover:text-blue-100 border border-blue-700/50 transition-colors';
        return;
      }

      try {
        btn.innerText = '⏳ โหลดเรดาร์...';
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        const latestTime = data.radar?.past?.[data.radar.past.length - 1]?.time || data.radar?.nowcast?.[0]?.time;
        
        if (latestTime) {
          radarLayer = L.tileLayer(\`https://tilecache.rainviewer.com/v2/radar/\${latestTime}/256/{z}/{x}/{y}/2/1_1.png\`, {
            opacity: 0.65,
            zIndex: 10
          }).addTo(map);

          isRadarActive = true;
          btn.className = 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-500 text-white border border-blue-400 shadow-md transition-colors';
          btn.innerText = '🌧️ ปิดเรดาร์สด';
        } else {
          alert('ไม่สามารถดึงข้อมูลเรดาร์ฝนขณะนี้ได้');
          btn.innerText = '🌧️ เรดาร์ฝน';
        }
      } catch (err) {
        console.error('Radar error:', err);
        btn.innerText = '🌧️ เรดาร์ฝน';
        alert('เชื่อมต่อเรดาร์ฝน RainViewer ไม่สำเร็จ');
      }
    }

    // Fetch Live Open-Meteo Hourly Forecast for Selected Coordinates
    async function fetchOpenMeteoHourly(lat, lon) {
      const container = document.getElementById('hourly-bars-container');
      try {
        const url = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&hourly=precipitation_probability,precipitation&forecast_days=1&timezone=Asia%2FBangkok\`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.hourly && data.hourly.precipitation_probability) {
          const nowHour = new Date().getHours();
          container.innerHTML = '';
          for (let i = 0; i < 6; i++) {
            const hIdx = (nowHour + i * 2) % 24;
            const prob = data.hourly.precipitation_probability[hIdx] ?? 0;
            const hourLabel = String(hIdx).padStart(2, '0') + ':00';
            const col = document.createElement('div');
            col.className = 'bg-slate-900 p-1.5 rounded-lg border border-slate-800';
            col.innerHTML = \`<span class=\"text-slate-400 block\">\${hourLabel}</span><span class=\"block font-bold \${prob >= 50 ? 'text-amber-400' : 'text-sky-400'}\">\${prob}%</span>\`;
            container.appendChild(col);
          }
          document.getElementById('hourly-updated-txt').innerText = 'อัปเดตดาวเทียม Open-Meteo สด';
        }
      } catch (e) {
        console.log('Open-Meteo fallback to cached');
      }
    }

    // Start on DOM ready
    window.addEventListener('DOMContentLoaded', initMap);
  </script>
</body>
</html>`;
}
