import { db, doc, getDoc, setDoc, ensureAuth } from './firebase.js';
import { FLOOD_PROJECTS } from './projectsConfig.js';

const SETTINGS_DOC_PATH = ['artifacts', 'default-app-id', 'public', 'data', 'flood_settings', 'as_built_elevations'];

/**
 * ดึงค่า As-Built Overrides ทั้งหมดจาก Firestore
 */
export async function getAsBuiltOverrides() {
  try {
    await ensureAuth();
    const ref = doc(db, ...SETTINGS_DOC_PATH);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() || {};
    }
    return {};
  } catch (err) {
    console.warn('Failed to load as_built_elevations from Firestore:', err.message);
    return {};
  }
}

/**
 * บันทึกค่า As-Built Overrides ลงใน Firestore
 */
export async function saveAsBuiltOverrides(updates) {
  try {
    await ensureAuth();
    const ref = doc(db, ...SETTINGS_DOC_PATH);
    
    // updates can be single project { projectCode, asBuiltElevationDiff, asBuiltBenchmarkMSL, asBuiltNotes }
    // or batch { [code]: { ... } }
    const nowIso = new Date().toISOString();
    const payload = {};

    if (updates.projectCode) {
      const code = updates.projectCode;
      const diff = parseFloat(updates.asBuiltElevationDiff);
      payload[code] = {
        asBuiltElevationDiff: !isNaN(diff) ? diff : 0.80,
        asBuiltBenchmarkMSL: (updates.asBuiltBenchmarkMSL || '').trim() || null,
        asBuiltNotes: (updates.asBuiltNotes || '').trim() || null,
        updatedAt: nowIso
      };
    } else if (typeof updates === 'object') {
      for (const [code, val] of Object.entries(updates)) {
        if (typeof val === 'object' && val !== null) {
          const diff = parseFloat(val.asBuiltElevationDiff);
          payload[code] = {
            asBuiltElevationDiff: !isNaN(diff) ? diff : 0.80,
            asBuiltBenchmarkMSL: (val.asBuiltBenchmarkMSL || '').trim() || null,
            asBuiltNotes: (val.asBuiltNotes || '').trim() || null,
            updatedAt: nowIso
          };
        }
      }
    }

    await setDoc(ref, payload, { merge: true });
    return { success: true, count: Object.keys(payload).length, updatedAt: nowIso };
  } catch (err) {
    console.error('Error saving as_built_elevations to Firestore:', err);
    throw err;
  }
}

/**
 * สร้างหน้าเว็บ UI จัดการระดับความสูงตามแบบก่อสร้างจริง As-Built Elevation Manager
 */
export function generateAsBuiltManagerHtml({ projectsData = [], overrides = {} }) {
  const projectsJson = JSON.stringify(projectsData);
  const overridesJson = JSON.stringify(overrides);

  return `<!DOCTYPE html>
<html lang="th" class="h-full bg-slate-950">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ระบบจัดการระดับความสูงแบบก่อสร้างจริง (As-Built Elevation Manager) | Land & Houses</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Prompt', 'Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            lh: {
              navy: '#0A2540',
              gold: '#C5A880',
              goldHover: '#B59669',
              dark: '#061626'
            }
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Prompt', sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
    .glass-card {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
  </style>
</head>
<body class="min-h-full bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-lh-gold selection:text-slate-950">

  <!-- Top Navigation Bar -->
  <header class="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-lh-navy to-slate-900 flex items-center justify-center border border-lh-gold/40 shadow-inner shrink-0">
          <span class="text-lh-gold font-black text-lg tracking-wider">LH</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base sm:text-lg font-bold text-white tracking-tight">As-Built Elevation Manager</h1>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">วิศวกรรมสุขาภิบาล</span>
          </div>
          <p class="text-[11px] text-slate-400">ระบบจัดการระดับความสูงถนนโครงการเทียบถนนภายนอกตามแบบก่อสร้างจริง (30 โครงการ)</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <a href="/api/flood-report?mode=map" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm" title="กลับไปหน้าแผนที่สถานการณ์น้ำ">
          <span>🗺️ แผนที่น้ำท่วม</span>
        </a>
        <button onclick="saveAllChanges()" id="btn-save-all" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-lh-gold hover:bg-lh-goldHover text-slate-950 shadow-md transition-all">
          <span>💾 บันทึกทั้งหมด (<span id="unsaved-count">0</span>)</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content Area -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

    <!-- Overview Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-md">
        <div class="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 text-lg">
          🏗️
        </div>
        <div>
          <span class="text-xs text-slate-400 block font-medium">โครงการทั้งหมด</span>
          <span class="text-xl font-bold text-white font-mono" id="stat-total">30</span>
          <span class="text-[10px] text-slate-500 block">กรุงเทพฯ และปริมณฑล</span>
        </div>
      </div>

      <div class="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-md">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg">
          📐
        </div>
        <div>
          <span class="text-xs text-slate-400 block font-medium">มีแบบ As-Built เฉพาะโครงการ</span>
          <span class="text-xl font-bold text-emerald-400 font-mono" id="stat-custom">0</span>
          <span class="text-[10px] text-slate-500 block">ระบุค่าต่างระดับเฉพาะ</span>
        </div>
      </div>

      <div class="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-md">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg">
          ⚙️
        </div>
        <div>
          <span class="text-xs text-slate-400 block font-medium">ใช้เกณฑ์มาตรฐาน LH (+0.80 ม.)</span>
          <span class="text-xl font-bold text-amber-400 font-mono" id="stat-standard">30</span>
          <span class="text-[10px] text-slate-500 block">รออัปเดตแบบ As-Built</span>
        </div>
      </div>
    </div>

    <!-- Search & Zone Filters -->
    <div class="glass-card p-3 rounded-2xl border border-slate-800 space-y-3">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <!-- Search -->
        <div class="relative flex-1">
          <input type="text" id="search-input" oninput="applyFilters()" placeholder="ค้นหาชื่อโครงการ, รหัส เช่น LH-410, ชัยพฤกษ์, ลำลูกกา..." class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lh-gold transition-colors">
          <svg class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        <!-- Quick Help Tip -->
        <div class="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
          <span class="text-lh-gold">💡</span>
          <span>กรอกตัวเลขหน่วย <strong>เมตร</strong> (เช่น <code class="text-sky-300">0.85</code> = +85 ซม. สูงกว่าถนนนอก)</span>
        </div>
      </div>

      <!-- Zone Pills -->
      <div class="flex flex-wrap items-center gap-1.5 text-xs" id="zone-pills">
        <button onclick="setZoneFilter('all')" class="zone-pill active px-3 py-1 rounded-lg font-semibold bg-lh-gold text-slate-950 transition-colors" data-zone="all">ทั้งหมด (30)</button>
        <button onclick="setZoneFilter('rangsit')" class="zone-pill px-3 py-1 rounded-lg font-medium bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors" data-zone="rangsit">รังสิต / ปทุมธานี</button>
        <button onclick="setZoneFilter('bangna')" class="zone-pill px-3 py-1 rounded-lg font-medium bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors" data-zone="bangna">บางนา / สมุทรปราการ</button>
        <button onclick="setZoneFilter('nonthaburi')" class="zone-pill px-3 py-1 rounded-lg font-medium bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors" data-zone="nonthaburi">นนทบุรี / บางใหญ่ / ราชพฤกษ์</button>
        <button onclick="setZoneFilter('ayutthaya')" class="zone-pill px-3 py-1 rounded-lg font-medium bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors" data-zone="ayutthaya">อยุธยา</button>
        <button onclick="setZoneFilter('east')" class="zone-pill px-3 py-1 rounded-lg font-medium bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors" data-zone="east">รามอินทรา / กรุงเทพฯ ตะวันออก</button>
      </div>
    </div>

    <!-- Projects Table / Grid Container -->
    <div class="space-y-3" id="projects-container">
      <!-- Rendered dynamically via JS -->
    </div>

  </main>

  <!-- Toast Notification -->
  <div id="toast" class="fixed bottom-5 right-5 z-50 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none flex items-center gap-2 px-4 py-3 rounded-2xl glass-card text-xs font-semibold shadow-2xl border border-emerald-500/40 text-emerald-300">
    <span class="text-base">✅</span>
    <span id="toast-msg">บันทึกข้อมูลเรียบร้อยแล้ว</span>
  </div>

  <script>
    const INITIAL_PROJECTS = ${projectsJson};
    const INITIAL_OVERRIDES = ${overridesJson};

    // State
    let currentProjects = [...INITIAL_PROJECTS];
    let customOverrides = { ...INITIAL_OVERRIDES };
    let dirtyProjects = new Set();
    let currentZone = 'all';
    let searchQuery = '';

    // Init
    document.addEventListener('DOMContentLoaded', () => {
      // Merge initial overrides
      currentProjects.forEach(p => {
        if (customOverrides[p.code]) {
          const ov = customOverrides[p.code];
          if (ov.asBuiltElevationDiff != null) p.asBuiltElevationDiff = ov.asBuiltElevationDiff;
          if (ov.asBuiltBenchmarkMSL != null) p.asBuiltBenchmarkMSL = ov.asBuiltBenchmarkMSL;
          if (ov.asBuiltNotes != null) p.asBuiltNotes = ov.asBuiltNotes;
        }
      });
      updateStats();
      renderProjects();
    });

    function updateStats() {
      const total = currentProjects.length;
      let customCount = 0;
      currentProjects.forEach(p => {
        if (customOverrides[p.code] || (p.asBuiltElevationDiff !== 0.80 && p.asBuiltElevationDiff != null)) {
          customCount++;
        }
      });
      document.getElementById('stat-total').innerText = total;
      document.getElementById('stat-custom').innerText = customCount;
      document.getElementById('stat-standard').innerText = total - customCount;
      document.getElementById('unsaved-count').innerText = dirtyProjects.size;
    }

    function setZoneFilter(zone) {
      currentZone = zone;
      document.querySelectorAll('.zone-pill').forEach(btn => {
        if (btn.dataset.zone === zone) {
          btn.className = 'zone-pill active px-3 py-1 rounded-lg font-semibold bg-lh-gold text-slate-950 transition-colors';
        } else {
          btn.className = 'zone-pill px-3 py-1 rounded-lg font-medium bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors';
        }
      });
      renderProjects();
    }

    function applyFilters() {
      searchQuery = document.getElementById('search-input').value.trim().toLowerCase();
      renderProjects();
    }

    function renderProjects() {
      const container = document.getElementById('projects-container');
      container.innerHTML = '';

      const filtered = currentProjects.filter(p => {
        // Zone Match
        if (currentZone === 'rangsit' && !p.area?.includes('ปทุม') && !p.name?.includes('รังสิต') && !p.name?.includes('ลำลูกกา')) return false;
        if (currentZone === 'bangna' && !p.area?.includes('สมุทรปราการ') && !p.area?.includes('บางเสาธง') && !p.area?.includes('บางนา')) return false;
        if (currentZone === 'nonthaburi' && !p.area?.includes('นนทบุรี') && !p.area?.includes('บางใหญ่') && !p.name?.includes('ราชพฤกษ์')) return false;
        if (currentZone === 'ayutthaya' && !p.area?.includes('อยุธยา')) return false;
        if (currentZone === 'east' && !p.area?.includes('คลองสามวา') && !p.name?.includes('รามอินทรา') && !p.name?.includes('สุวินทวงศ์')) return false;

        // Search Match
        if (searchQuery) {
          const matchCode = p.code?.toLowerCase().includes(searchQuery);
          const matchName = p.name?.toLowerCase().includes(searchQuery);
          const matchArea = p.area?.toLowerCase().includes(searchQuery);
          if (!matchCode && !matchName && !matchArea) return false;
        }

        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div class="glass-card p-8 rounded-2xl text-center text-slate-400 text-sm">ไม่พบโครงการที่ตรงกับเงื่อนไขการค้นหา</div>';
        return;
      }

      filtered.forEach(p => {
        const isDirty = dirtyProjects.has(p.code);
        const card = document.createElement('div');
        card.id = 'project-card-' + p.code;
        card.className = 'glass-card p-4 rounded-2xl border ' + (isDirty ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800') + ' transition-all shadow-md';

        const elevVal = p.asBuiltElevationDiff != null ? p.asBuiltElevationDiff.toFixed(2) : '0.80';
        const mslVal = p.asBuiltBenchmarkMSL || '';
        const notesVal = p.asBuiltNotes || '';

        card.innerHTML = \`
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            <!-- Left: Project Info -->
            <div class="lg:w-1/3 space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 text-sky-400 border border-slate-700/80">\${p.code}</span>
                <h3 class="text-sm font-bold text-white tracking-tight truncate">\${p.name}</h3>
              </div>
              <p class="text-[11px] text-slate-400 flex items-center gap-1">
                <span>📍</span>
                <span class="truncate">\${p.area || '-'}</span>
              </p>
              <div class="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                <span>พิกัด: \${p.lat.toFixed(4)}, \${p.lon.toFixed(4)}</span>
                <a href="\${p.googleMapsUrl}" target="_blank" class="text-sky-400 hover:underline">Google Maps ↗</a>
              </div>
            </div>

            <!-- Middle: Elevation Inputs -->
            <div class="lg:w-1/2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              
              <!-- Field 1: As-Built Elevation Difference -->
              <div class="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/90 space-y-1">
                <label class="text-[10px] text-slate-400 font-semibold block flex items-center justify-between">
                  <span>ระดับยกพื้นถนน (ม.)</span>
                  <span class="text-[9px] text-sky-400">เทียบถนนนอก</span>
                </label>
                <div class="flex items-center gap-1">
                  <span class="text-slate-500 font-mono font-bold text-xs">+</span>
                  <input type="number" step="0.05" min="0.00" max="5.00" 
                    id="input-elev-\${p.code}" 
                    value="\${elevVal}" 
                    oninput="handleFieldChange('\${p.code}', 'asBuiltElevationDiff', this.value)"
                    class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-lh-gold">
                  <span class="text-slate-400 text-xs">ม.</span>
                </div>
                <!-- Presets -->
                <div class="flex items-center gap-1 pt-1">
                  <button onclick="setElevationPreset('\${p.code}', 0.70)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+0.70</button>
                  <button onclick="setElevationPreset('\${p.code}', 0.80)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+0.80</button>
                  <button onclick="setElevationPreset('\${p.code}', 0.90)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+0.90</button>
                  <button onclick="setElevationPreset('\${p.code}', 1.00)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+1.00</button>
                </div>
              </div>

              <!-- Field 2: MSL Benchmark -->
              <div class="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/90 space-y-1">
                <label class="text-[10px] text-slate-400 font-semibold block flex items-center justify-between">
                  <span>ระดับอ้างอิง รทก.</span>
                  <span class="text-[9px] text-slate-500">ม.รทก. (ถ้ามี)</span>
                </label>
                <input type="text" 
                  id="input-msl-\${p.code}" 
                  value="\${mslVal}" 
                  placeholder="เช่น +1.90 ม.รทก."
                  oninput="handleFieldChange('\${p.code}', 'asBuiltBenchmarkMSL', this.value)"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-lh-gold">
                <span class="text-[9px] text-slate-500 block">ระดับน้ำทะเลปานกลาง</span>
              </div>

              <!-- Field 3: Notes / Drawing No. -->
              <div class="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/90 space-y-1">
                <label class="text-[10px] text-slate-400 font-semibold block">
                  <span>หมายเหตุแบบ As-Built</span>
                </label>
                <input type="text" 
                  id="input-notes-\${p.code}" 
                  value="\${notesVal}" 
                  placeholder="เช่น แบบแผ่นที่ C-04"
                  oninput="handleFieldChange('\${p.code}', 'asBuiltNotes', this.value)"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-lh-gold">
                <span class="text-[9px] text-slate-500 block truncate">เลขอ้างอิงแบบวิศวกรรม</span>
              </div>

            </div>

            <!-- Right: Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <button onclick="saveProjectRow('\${p.code}')" id="btn-save-\${p.code}" class="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold \${isDirty ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'} transition-all shadow-sm">
                <span>\${isDirty ? '💾 บันทึก' : '✓ เรียบร้อย'}</span>
              </button>
              <a href="/api/flood-report?mode=map&focus=\${p.code}" target="_blank" class="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors" title="ดูภาพจำลองบนแผนที่">
                🗺️
              </a>
            </div>

          </div>
        \`;

        container.appendChild(card);
      });
    }

    function setElevationPreset(code, val) {
      const input = document.getElementById('input-elev-' + code);
      if (input) {
        input.value = val.toFixed(2);
        handleFieldChange(code, 'asBuiltElevationDiff', val);
      }
    }

    function handleFieldChange(code, field, rawValue) {
      const p = currentProjects.find(item => item.code === code);
      if (!p) return;

      if (field === 'asBuiltElevationDiff') {
        const num = parseFloat(rawValue);
        p[field] = !isNaN(num) ? num : 0.80;
      } else {
        p[field] = rawValue;
      }

      dirtyProjects.add(code);
      updateStats();

      // Highlight row card
      const card = document.getElementById('project-card-' + code);
      if (card) {
        card.className = 'glass-card p-4 rounded-2xl border border-amber-500/50 bg-amber-950/10 transition-all shadow-md';
      }
      const btn = document.getElementById('btn-save-' + code);
      if (btn) {
        btn.className = 'flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 transition-all shadow-sm';
        btn.innerHTML = '<span>💾 บันทึก</span>';
      }
    }

    async function saveProjectRow(code) {
      const p = currentProjects.find(item => item.code === code);
      if (!p) return;

      const btn = document.getElementById('btn-save-' + code);
      if (btn) {
        btn.innerText = '⏳ บันทึก...';
        btn.disabled = true;
      }

      try {
        const payload = {
          projectCode: code,
          asBuiltElevationDiff: p.asBuiltElevationDiff,
          asBuiltBenchmarkMSL: p.asBuiltBenchmarkMSL,
          asBuiltNotes: p.asBuiltNotes
        };

        const res = await fetch('/api/flood-report?mode=asbuilt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        // Update local overrides
        customOverrides[code] = {
          asBuiltElevationDiff: p.asBuiltElevationDiff,
          asBuiltBenchmarkMSL: p.asBuiltBenchmarkMSL,
          asBuiltNotes: p.asBuiltNotes,
          updatedAt: data.updatedAt || new Date().toISOString()
        };

        dirtyProjects.delete(code);
        updateStats();

        // Reset row card appearance
        const card = document.getElementById('project-card-' + code);
        if (card) {
          card.className = 'glass-card p-4 rounded-2xl border border-slate-800 transition-all shadow-md';
        }
        if (btn) {
          btn.className = 'flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all';
          btn.innerText = '✓ บันทึกสำเร็จ';
          btn.disabled = false;
          setTimeout(() => {
            if (!dirtyProjects.has(code)) {
              btn.className = 'flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all';
              btn.innerText = '✓ เรียบร้อย';
            }
          }, 2000);
        }

        showToast('บันทึกค่า As-Built โครงการ ' + code + ' เรียบร้อย');
      } catch (err) {
        console.error('Save error:', err);
        alert('บันทึกไม่สำเร็จ: ' + err.message);
        if (btn) {
          btn.innerText = '💾 บันทึก';
          btn.disabled = false;
        }
      }
    }

    async function saveAllChanges() {
      if (dirtyProjects.size === 0) {
        showToast('ไม่มีข้อมูลที่มีการเปลี่ยนแปลง');
        return;
      }

      const btn = document.getElementById('btn-save-all');
      btn.innerText = '⏳ กำลังบันทึกทั้งหมด...';
      btn.disabled = true;

      try {
        const batchUpdates = {};
        dirtyProjects.forEach(code => {
          const p = currentProjects.find(item => item.code === code);
          if (p) {
            batchUpdates[code] = {
              asBuiltElevationDiff: p.asBuiltElevationDiff,
              asBuiltBenchmarkMSL: p.asBuiltBenchmarkMSL,
              asBuiltNotes: p.asBuiltNotes
            };
          }
        });

        const res = await fetch('/api/flood-report?mode=asbuilt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchUpdates)
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        // Update local overrides
        for (const code in batchUpdates) {
          customOverrides[code] = {
            ...batchUpdates[code],
            updatedAt: data.updatedAt || new Date().toISOString()
          };
        }

        dirtyProjects.clear();
        updateStats();
        renderProjects();
        showToast('บันทึกข้อมูล As-Built ทั้งหมดเรียบร้อยแล้ว');
      } catch (err) {
        console.error('Batch save error:', err);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
      } finally {
        btn.innerText = '💾 บันทึกทั้งหมด (' + dirtyProjects.size + ')';
        btn.disabled = false;
      }
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      document.getElementById('toast-msg').innerText = msg;
      toast.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
      }, 3000);
    }
  </script>
</body>
</html>`;
}
