import { db, doc, getDoc, setDoc, ensureAuth } from './firebase.js';
import { FLOOD_PROJECTS } from './projectsConfig.js';

const SETTINGS_DOC_PATH = ['artifacts', 'default-app-id', 'public', 'data', 'flood_settings', 'as_built_elevations'];

/**
 * ตรวจสอบความถูกต้องของ Admin PIN
 */
export function validateAdminPin(pin) {
  const serverPin = (process.env.ADMIN_PIN || 'lh2026').trim();
  return typeof pin === 'string' && pin.trim().toLowerCase() === serverPin.toLowerCase();
}

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
 * บันทึกค่า As-Built Overrides ลงใน Firestore โดยต้องผ่านการตรวจสอบ Admin PIN
 */
export async function saveAsBuiltOverrides(updates, adminPin) {
  if (!validateAdminPin(adminPin)) {
    const err = new Error('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง (Invalid Admin PIN)');
    err.status = 401;
    throw err;
  }

  try {
    await ensureAuth();
    const ref = doc(db, ...SETTINGS_DOC_PATH);
    
    const nowIso = new Date().toISOString();
    const payload = {};

    if (updates.projectCode) {
      const code = updates.projectCode;
      const diff = parseFloat(updates.asBuiltElevationDiff);
      const crestDiff = updates.entranceCrestDiff !== undefined && updates.entranceCrestDiff !== '' && updates.entranceCrestDiff !== null ? parseFloat(updates.entranceCrestDiff) : null;
      payload[code] = {
        asBuiltElevationDiff: !isNaN(diff) ? diff : 0.80,
        entranceCrestDiff: (crestDiff !== null && !isNaN(crestDiff)) ? crestDiff : null,
        asBuiltBenchmarkMSL: (updates.asBuiltBenchmarkMSL || '').trim() || null,
        asBuiltNotes: (updates.asBuiltNotes || '').trim() || null,
        updatedAt: nowIso
      };
    } else if (typeof updates === 'object') {
      for (const [code, val] of Object.entries(updates)) {
        if (typeof val === 'object' && val !== null && code !== 'action' && code !== 'adminPin') {
          const diff = parseFloat(val.asBuiltElevationDiff);
          const crestDiff = val.entranceCrestDiff !== undefined && val.entranceCrestDiff !== '' && val.entranceCrestDiff !== null ? parseFloat(val.entranceCrestDiff) : null;
          payload[code] = {
            asBuiltElevationDiff: !isNaN(diff) ? diff : 0.80,
            entranceCrestDiff: (crestDiff !== null && !isNaN(crestDiff)) ? crestDiff : null,
            asBuiltBenchmarkMSL: (val.asBuiltBenchmarkMSL || '').trim() || null,
            asBuiltNotes: (val.asBuiltNotes || '').trim() || null,
            updatedAt: nowIso
          };
        }
      }
    }

    if (Object.keys(payload).length > 0) {
      await setDoc(ref, payload, { merge: true });
    }
    return { success: true, count: Object.keys(payload).length, updatedAt: nowIso };
  } catch (err) {
    console.error('Error saving as_built_elevations to Firestore:', err);
    throw err;
  }
}

/**
 * สร้างหน้าเว็บ UI จัดการระดับความสูงตามแบบก่อสร้างจริง As-Built Elevation Manager พร้อมระบบล็อกรหัสผ่าน Admin
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
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <span>🔒</span><span>Admin Secured</span>
            </span>
          </div>
          <p class="text-[11px] text-slate-400">ระบบจัดการระดับความสูงถนนโครงการเทียบถนนภายนอกตามแบบก่อสร้างจริง (30 โครงการ)</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button onclick="lockManager()" id="btn-lock-auth" class="hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 transition-colors shadow-sm" title="ล็อกระบบและออกจากสิทธิ์ Admin">
          <span>🔒 ล็อกระบบ</span>
        </button>
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

  <!-- 🔒 Admin PIN Gate Modal -->
  <div id="auth-modal" class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
    <div class="glass-card max-w-sm w-full p-6 sm:p-8 rounded-3xl border border-slate-700/80 shadow-2xl space-y-4 text-center">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner">
        🔒
      </div>
      <div class="space-y-1.5">
        <h2 class="text-base font-bold text-white tracking-tight">ยืนยันสิทธิ์ผู้ดูแลระบบ (Admin)</h2>
        <p class="text-xs text-slate-400 leading-relaxed">กรุณากรอกรหัสผ่าน Admin PIN เพื่อเข้าสู่ระบบจัดการและแก้ไขระดับความสูงตามแบบก่อสร้างจริง</p>
      </div>
      <form onsubmit="handleAuthSubmit(event)" class="space-y-3 pt-2">
        <div class="relative">
          <input type="password" id="admin-pin-input" placeholder="กรอกรหัส Admin PIN" autocomplete="current-password" autofocus class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-center text-sm font-mono text-white placeholder-slate-500 tracking-widest focus:outline-none focus:border-lh-gold shadow-inner">
        </div>
        <div id="auth-error-msg" class="text-[11px] text-rose-400 hidden font-medium"></div>
        <button type="submit" id="btn-auth-submit" class="w-full py-2.5 px-4 rounded-xl bg-lh-gold hover:bg-lh-goldHover text-slate-950 font-bold text-xs shadow-lg transition-all">
          <span>ปลดล็อกเข้าสู่ระบบ</span>
        </button>
      </form>
      <div class="pt-3 border-t border-slate-800/80">
        <a href="/api/flood-report?mode=map" class="text-xs text-slate-400 hover:text-white transition-colors">
          ← กลับไปหน้าแผนที่น้ำท่วม (Flood Map)
        </a>
      </div>
    </div>
  </div>

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
      checkAuth();

      // Merge initial overrides
      currentProjects.forEach(p => {
        if (customOverrides[p.code]) {
          const ov = customOverrides[p.code];
          if (ov.asBuiltElevationDiff != null) p.asBuiltElevationDiff = ov.asBuiltElevationDiff;
          if (ov.entranceCrestDiff != null) p.entranceCrestDiff = ov.entranceCrestDiff;
          if (ov.asBuiltBenchmarkMSL != null) p.asBuiltBenchmarkMSL = ov.asBuiltBenchmarkMSL;
          if (ov.asBuiltNotes != null) p.asBuiltNotes = ov.asBuiltNotes;
        }
      });
      updateStats();
      renderProjects();
    });

    function checkAuth() {
      const storedPin = sessionStorage.getItem('lh_admin_pin');
      const authModal = document.getElementById('auth-modal');
      const btnLock = document.getElementById('btn-lock-auth');

      if (storedPin) {
        authModal.classList.add('hidden');
        btnLock.classList.remove('hidden');
      } else {
        authModal.classList.remove('hidden');
        btnLock.classList.add('hidden');
        setTimeout(() => {
          document.getElementById('admin-pin-input')?.focus();
        }, 100);
      }
    }

    async function handleAuthSubmit(e) {
      e.preventDefault();
      const pinInput = document.getElementById('admin-pin-input');
      const errorDiv = document.getElementById('auth-error-msg');
      const btn = document.getElementById('btn-auth-submit');
      const pin = (pinInput.value || '').trim();

      if (!pin) {
        errorDiv.innerText = 'กรุณากรอกรหัสผ่าน Admin PIN';
        errorDiv.classList.remove('hidden');
        return;
      }

      btn.innerText = '⏳ กำลังตรวจสอบ...';
      btn.disabled = true;
      errorDiv.classList.add('hidden');

      try {
        const res = await fetch('/api/flood-report?mode=asbuilt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': pin
          },
          body: JSON.stringify({ action: 'verify_pin', adminPin: pin })
        });

        if (res.ok) {
          sessionStorage.setItem('lh_admin_pin', pin);
          document.getElementById('auth-modal').classList.add('hidden');
          document.getElementById('btn-lock-auth').classList.remove('hidden');
          showToast('ยืนยันสิทธิ์ผู้ดูแลระบบเรียบร้อย');
        } else {
          const data = await res.json().catch(() => ({}));
          errorDiv.innerText = data.error || 'รหัสผ่าน Admin PIN ไม่ถูกต้อง';
          errorDiv.classList.remove('hidden');
          pinInput.select();
        }
      } catch (err) {
        errorDiv.innerText = 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ';
        errorDiv.classList.remove('hidden');
      } finally {
        btn.innerText = 'ปลดล็อกเข้าสู่ระบบ';
        btn.disabled = false;
      }
    }

    function lockManager() {
      sessionStorage.removeItem('lh_admin_pin');
      const pinInput = document.getElementById('admin-pin-input');
      if (pinInput) pinInput.value = '';
      document.getElementById('auth-modal').classList.remove('hidden');
      document.getElementById('btn-lock-auth').classList.add('hidden');
      showToast('ล็อกระบบเรียบร้อยแล้ว');
    }

    function getAdminPin() {
      return sessionStorage.getItem('lh_admin_pin') || '';
    }

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
        const crestVal = p.entranceCrestDiff != null ? p.entranceCrestDiff.toFixed(2) : '';
        const mslVal = p.asBuiltBenchmarkMSL || '';
        const notesVal = p.asBuiltNotes || '';

        card.innerHTML = \`
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            <!-- Left: Project Info -->
            <div class="lg:w-1/4 space-y-1">
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

            <!-- Middle: Elevation Inputs (4 Columns) -->
            <div class="lg:w-8/12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              
              <!-- Field 1: As-Built Road Elevation Difference -->
              <div class="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/90 space-y-1">
                <label class="text-[10px] text-slate-400 font-semibold block flex items-center justify-between">
                  <span>ระดับถนนใน (ม.)</span>
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
                  <button onclick="setElevationPreset('\${p.code}', 0.20)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+0.20</button>
                  <button onclick="setElevationPreset('\${p.code}', 0.70)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+0.70</button>
                  <button onclick="setElevationPreset('\${p.code}', 0.80)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+0.80</button>
                  <button onclick="setElevationPreset('\${p.code}', 1.00)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+1.00</button>
                </div>
              </div>

              <!-- Field 2: Entrance Crest Level (Optional Hump at Guardhouse) -->
              <div class="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/90 space-y-1">
                <label class="text-[10px] text-slate-400 font-semibold block flex items-center justify-between">
                  <span>สันเนินทางเข้า (ม.)</span>
                  <span class="text-[9px] text-amber-400 font-normal">ถ้ามี (เว้นว่างได้)</span>
                </label>
                <div class="flex items-center gap-1">
                  <span class="text-slate-500 font-mono font-bold text-xs">+</span>
                  <input type="number" step="0.05" min="0.00" max="5.00" 
                    id="input-crest-\${p.code}" 
                    value="\${crestVal}" 
                    placeholder="ไม่มีเนิน"
                    oninput="handleFieldChange('\${p.code}', 'entranceCrestDiff', this.value)"
                    class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-lh-gold">
                  <span class="text-slate-400 text-xs">ม.</span>
                </div>
                <!-- Presets for Hump -->
                <div class="flex items-center gap-1 pt-1">
                  <button onclick="setCrestPreset('\${p.code}', 0.50)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+0.50</button>
                  <button onclick="setCrestPreset('\${p.code}', 0.80)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 font-mono">+0.80</button>
                  <button onclick="setCrestPreset('\${p.code}', null)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-400">ล้าง</button>
                </div>
              </div>

              <!-- Field 3: MSL Benchmark -->
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
                <span class="text-[9px] text-slate-500 block truncate">เทียบระดับน้ำทะเล</span>
              </div>

              <!-- Field 4: Notes / Drawing No. -->
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

    function setCrestPreset(code, val) {
      const input = document.getElementById('input-crest-' + code);
      if (input) {
        input.value = (val !== null && val !== undefined) ? val.toFixed(2) : '';
        handleFieldChange(code, 'entranceCrestDiff', (val !== null && val !== undefined) ? val : '');
      }
    }

    function handleFieldChange(code, field, rawValue) {
      const p = currentProjects.find(item => item.code === code);
      if (!p) return;

      if (field === 'asBuiltElevationDiff') {
        const num = parseFloat(rawValue);
        p[field] = !isNaN(num) ? num : 0.80;
      } else if (field === 'entranceCrestDiff') {
        const num = parseFloat(rawValue);
        p[field] = (!isNaN(num) && rawValue !== '' && rawValue !== null) ? num : null;
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
      const pin = getAdminPin();
      if (!pin) {
        checkAuth();
        return;
      }

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
          entranceCrestDiff: p.entranceCrestDiff,
          asBuiltBenchmarkMSL: p.asBuiltBenchmarkMSL,
          asBuiltNotes: p.asBuiltNotes,
          adminPin: pin
        };

        const res = await fetch('/api/flood-report?mode=asbuilt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': pin
          },
          body: JSON.stringify(payload)
        });

        if (res.status === 401) {
          lockManager();
          alert('สิทธิ์การเป็น Admin หมดอายุ หรือรหัสผ่านไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
          return;
        }

        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        // Update local overrides
        customOverrides[code] = {
          asBuiltElevationDiff: p.asBuiltElevationDiff,
          entranceCrestDiff: p.entranceCrestDiff,
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
      const pin = getAdminPin();
      if (!pin) {
        checkAuth();
        return;
      }

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
              entranceCrestDiff: p.entranceCrestDiff,
              asBuiltBenchmarkMSL: p.asBuiltBenchmarkMSL,
              asBuiltNotes: p.asBuiltNotes
            };
          }
        });

        const res = await fetch('/api/flood-report?mode=asbuilt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': pin
          },
          body: JSON.stringify({ ...batchUpdates, adminPin: pin })
        });

        if (res.status === 401) {
          lockManager();
          alert('สิทธิ์การเป็น Admin หมดอายุ หรือรหัสผ่านไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
          return;
        }

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
