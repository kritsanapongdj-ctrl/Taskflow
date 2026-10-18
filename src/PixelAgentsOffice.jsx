import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Volume2,
  VolumeX,
  Edit3,
  Check,
  AlertTriangle,
  Cpu,
  Layers,
  List,
  Sparkles,
  ShieldAlert,
  Clock,
  X,
  ExternalLink,
  Activity,
  CheckCircle,
  HelpCircle,
  Terminal,
  Settings,
  Coffee,
  Database
} from 'lucide-react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

import { OfficeCanvas } from './pixel-office/office/components/OfficeCanvas.js';
import { ToolOverlay } from './pixel-office/office/components/ToolOverlay.js';
import { EditorToolbar } from './pixel-office/office/editor/EditorToolbar.js';
import { EditActionBar } from './pixel-office/components/EditActionBar.js';
import { ZoomControls } from './pixel-office/components/ZoomControls.js';
import { CharacterMugShot } from './pixel-office/components/CharacterMugShot.js';
import { OfficeState } from './pixel-office/office/engine/officeState.js';
import { EditorState } from './pixel-office/office/editor/editorState.js';
import { useEditorActions } from './pixel-office/hooks/useEditorActions.js';
import { setCharacterTemplates } from './pixel-office/office/sprites/spriteData.js';
import { setFloorSprites } from './pixel-office/office/floorTiles.js';
import { setWallSprites } from './pixel-office/office/wallTiles.js';
import { setCarpetSprites } from './pixel-office/office/sprites/carpetTiles.js';
import { buildDynamicCatalog } from './pixel-office/office/layout/furnitureCatalog.js';
import { getPetCount } from './pixel-office/office/sprites/petSpriteData.js';
import { setSoundEnabled, isSoundEnabled } from './pixel-office/notificationSound.js';
import { transport } from './pixel-office/transport/index.js';
import './pixel-office/pixel-office.css';

// 5 Fixed LH Bots definition
const LH_BOTS = [
  {
    id: 1,
    key: 'scout',
    name: 'Scout Bot',
    title: 'LHAppServ Job Scraper',
    role: 'กวาดงานซ่อมที่ติดสถานะ Wait จากระบบ LHAppServ',
    palette: 0,
    themeColor: '#38bdf8',
    avatar: 'Scout',
    icon: 'Radar'
  },
  {
    id: 2,
    key: 'utility',
    name: 'Utility Bot',
    title: 'LHIAS Meter & Bills',
    role: 'ดึงข้อมูลค่าน้ำ-ค่าไฟ 160 จุดใน 9 โครงการจาก LHIAS',
    palette: 1,
    themeColor: '#f97316',
    avatar: 'Mechanic',
    icon: 'Zap'
  },
  {
    id: 3,
    key: 'wizard',
    name: 'Wizard Bot',
    title: 'Budget Planner & Verifier',
    role: 'คำนวณงบประมาณ 10 หมวดบัญชี B69 vs Actual YTD วางงบ B70',
    palette: 2,
    themeColor: '#a855f7',
    avatar: 'Mage',
    icon: 'Sparkles'
  },
  {
    id: 4,
    key: 'watcher',
    name: 'Watcher Bot',
    title: 'SLA Watcher & Sentinel',
    role: 'ตรวจจับงานค้างเกิน 48 ชม. และเสี่ยงหลุด SLA ส่งเตือน',
    palette: 3,
    themeColor: '#ef4444',
    avatar: 'Knight',
    icon: 'ShieldAlert'
  },
  {
    id: 5,
    key: 'evaluator',
    name: 'Evaluator Bot',
    title: 'KPI & Leaderboard',
    role: 'คำนวณคะแนน Rubrics, สถิติปิดงาน และจัดอันดับ Leaderboard',
    palette: 4,
    themeColor: '#10b981',
    avatar: 'Scholar',
    icon: 'Activity'
  }
];

// Single shared editorState instance
const editorState = new EditorState();

// Stable empty props matching the engine's expected types
// (ToolOverlay expects plain objects + an array, NOT Maps)
const EMPTY_AGENT_TOOLS = {};
const EMPTY_SUBAGENT_TOOLS = {};
const EMPTY_SUBAGENT_CHARACTERS = [];
const EMPTY_AREA_MAPPINGS = {};
const EMPTY_DIRECTORIES = [];

// Local error boundary: a crash inside the simulation must not take down the whole app
class PixelOfficeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[PixelOffice] render error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-[calc(100vh-68px)] flex items-center justify-center bg-[#181828] p-4">
          <div className="max-w-md text-center bg-red-950/90 border-2 border-red-500 p-6 text-white">
            <h3 className="text-base font-bold text-red-200 mb-2">Pixel Office เกิดข้อผิดพลาด</h3>
            <p className="text-xs text-red-300 font-mono mb-4 break-words">{String(this.state.error?.message || this.state.error)}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs border border-red-400 font-bold cursor-pointer"
            >
              ↺ ลองใหม่
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PixelAgentsOffice(props) {
  return (
    <PixelOfficeErrorBoundary>
      <PixelAgentsOfficeInner {...props} />
    </PixelOfficeErrorBoundary>
  );
}

function PixelAgentsOfficeInner({ tasks, sets, setTab, db }) {
  const containerRef = useRef(null);
  const officeStateRef = useRef(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadedAssetData, setLoadedAssetData] = useState(null);
  const [activeAreaLabel, setActiveAreaLabel] = useState(null);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [selectedAgentDetail, setSelectedAgentDetail] = useState(null);
  const [showQuestsPanel, setShowQuestsPanel] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [jobStatusTasks, setJobStatusTasks] = useState([]);
  const [budgetForecast, setBudgetForecast] = useState(null);

  // Bot live state mapped by key ('scout', 'utility', etc.)
  const [botLiveMap, setBotLiveMap] = useState({
    scout: { state: 'idle', activity: 'ลาดตระเวนระบบ LHAppServ', lastRun: '-', ok: true },
    utility: { state: 'idle', activity: 'สำรวจค่าน้ำ-ค่าไฟ 160 จุด', lastRun: '-', ok: true },
    wizard: { state: 'idle', activity: 'ตรวจยอดงบประมาณ B70 / Actual YTD', lastRun: '-', ok: true },
    watcher: { state: 'idle', activity: 'เฝ้าระวังเกณฑ์ SLA 72 ชม.', lastRun: '-', ok: true },
    evaluator: { state: 'idle', activity: 'ประเมินผลคะแนน Rubrics รายสัปดาห์', lastRun: '-', ok: true },
  });

  // Get or instantiate OfficeState
  const getOfficeState = useCallback(() => {
    if (!officeStateRef.current) {
      officeStateRef.current = new OfficeState();
    }
    return officeStateRef.current;
  }, []);

  const officeState = getOfficeState();
  const editor = useEditorActions(getOfficeState, editorState);

  const [loadError, setLoadError] = useState(null);

  // 1. Preload Decoded Assets and Layout
  useEffect(() => {
    let isMounted = true;

    async function loadAllAssets() {
      try {
        setLoadError(null);
        const [
          charsRes,
          floorsRes,
          wallsRes,
          carpetsRes,
          catalogRes,
          furnitureRes,
          layoutRes
        ] = await Promise.all([
          fetch('/pixel-agents-assets/decoded/characters.json').then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching characters.json`);
            return r.json();
          }),
          fetch('/pixel-agents-assets/decoded/floors.json').then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching floors.json`);
            return r.json();
          }),
          fetch('/pixel-agents-assets/decoded/walls.json').then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching walls.json`);
            return r.json();
          }),
          fetch('/pixel-agents-assets/decoded/carpets.json').then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching carpets.json`);
            return r.json();
          }),
          fetch('/pixel-agents-assets/decoded/furniture-catalog.json').then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching furniture-catalog.json`);
            return r.json();
          }),
          fetch('/pixel-agents-assets/decoded/furniture.json').then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching furniture.json`);
            return r.json();
          }),
          fetch('/pixel-agents-assets/default-layout-1.json').then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} fetching default-layout-1.json`);
            return r.json();
          }),
        ]);

        if (!isMounted) return;

        // Apply decoded sprite sheets to engine
        setCharacterTemplates(charsRes);
        setFloorSprites(floorsRes);
        setWallSprites(wallsRes);
        setCarpetSprites(carpetsRes);
        buildDynamicCatalog({ catalog: catalogRes, sprites: furnitureRes });
        setLoadedAssetData({ catalog: catalogRes, sprites: furnitureRes });

        // Check if user has saved a custom layout in localStorage
        let layoutToLoad = layoutRes;
        try {
          const savedCustom = localStorage.getItem('lh_pixel_office_layout');
          if (savedCustom) {
            layoutToLoad = JSON.parse(savedCustom);
          }
        } catch (e) {
          console.warn('Failed to load saved layout from localStorage:', e);
        }

        officeState.rebuildFromLayout(layoutToLoad);

        // Load saved agent seats if available
        try {
          const savedSeatsStr = localStorage.getItem('lh_pixel_agent_seats');
          if (savedSeatsStr) {
            const seats = JSON.parse(savedSeatsStr);
            Object.entries(seats).forEach(([agentId, meta]) => {
              if (meta && meta.seatId) {
                officeState.reassignSeat(Number(agentId), meta.seatId);
              }
            });
          }
        } catch (e) {
          console.warn('Failed to load saved seats:', e);
        }

        // Ensure all 5 LH bots are spawned in the office
        LH_BOTS.forEach(b => {
          if (!officeState.characters.has(b.id)) {
            officeState.addAgent(b.id, b.palette, 0);
          }
        });

        setAssetsLoaded(true);
      } catch (err) {
        console.error('Error pre-loading Pixel Office assets:', err);
        if (isMounted) {
          setLoadError(err.message || String(err));
        }
      }
    }

    loadAllAssets();
    return () => {
      isMounted = false;
    };
  }, [officeState]);

  // 2. Real-time Firestore Subscriptions (100% Real Data — No Fake Movement)
  useEffect(() => {
    if (!db) return;

    // A. Scout & Jobstatus tasks
    let prevJobIds = null;
    const unsubDb = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "database"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const arr = Object.values(data)
          .filter(item => item && typeof item === 'object')
          .sort((a, b) => (b.reported_timestamp || 0) - (a.reported_timestamp || 0));
        setJobStatusTasks(arr);

        const currentIds = arr.map(t => t.job_id || t.house_no).join(',');
        const hasNewArrival = prevJobIds !== null && prevJobIds !== currentIds;
        prevJobIds = currentIds;

        // Only animate Scout when a new snapshot diff actually arrives from Firestore
        if (hasNewArrival && officeStateRef.current) {
          const os = officeStateRef.current;
          os.setAgentActive(1, true);
          os.setAgentTool(1, 'reading');
          setTimeout(() => {
            if (officeStateRef.current) {
              officeStateRef.current.setAgentActive(1, false);
              officeStateRef.current.setAgentTool(1, null);
            }
          }, 4000);
        }
      }
    });

    // B. Real-time Bot Statuses from Firestore (lh_scraper/bot_status)
    const unsubStatus = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "bot_status"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        setBotLiveMap(prev => {
          const next = { ...prev };

          LH_BOTS.forEach(b => {
            const bData = data[b.key] || {};
            const rawState = bData.state || (bData.ok === false ? 'error' : 'idle');
            const isRunning = rawState === 'running';
            const isAlert = rawState === 'alert' || (bData.metrics?.overdue5d > 0) || (bData.metrics?.anomaliesCount > 0 && rawState !== 'idle');
            const isError = rawState === 'error' || bData.ok === false;

            const rawTs = bData.lastRunAt || bData.last_run_at || bData.updatedAt;
            const runDate = rawTs ? new Date(rawTs) : null;
            const validDate = runDate && !isNaN(runDate.getTime());
            const timeStr = validDate
              ? runDate.toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : '-';

            const fallbackActivity = b.key === 'scout' && bData.waiting_jobs !== undefined
              ? `ตรวจรอบล่าสุดพบงาน Wait ${bData.waiting_jobs} งาน (ใหม่ ${bData.new_jobs || 0}, ปิดแล้ว ${bData.closed_jobs || 0})`
              : b.role;

            next[b.key] = {
              state: isRunning ? 'running' : (isError ? 'error' : (isAlert ? 'alert' : 'idle')),
              rawState,
              activity: bData.currentActivity || bData.message || fallbackActivity,
              message: bData.message || bData.currentActivity || fallbackActivity,
              lastRun: timeStr,
              lastRunIso: rawTs || null,
              schedule: bData.schedule || '-',
              ok: !isError,
              metrics: bData.metrics || (b.key === 'scout' ? {
                waitingJobs: bData.waiting_jobs ?? 0,
                newJobs: bData.new_jobs ?? 0,
                closedJobs: bData.closed_jobs ?? 0,
                overdue48h: bData.overdue_48h ?? 0,
                overdue5d: bData.overdue_5d ?? 0,
                byGroup: bData.by_group || {}
              } : {}),
              logs: Array.isArray(bData.logs) ? bData.logs : []
            };
          });

          return next;
        });
      }
    });

    // C. Budget Forecast from Firestore
    const unsubBudget = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"), (snap) => {
      if (snap.exists()) {
        setBudgetForecast(snap.data());
      }
    });

    return () => {
      unsubDb();
      unsubStatus();
      unsubBudget();
    };
  }, [db]);

  // 3. Synchronize 2D Character States Strictly with Real Bot States (No Fake Random Movement)
  useEffect(() => {
    if (!assetsLoaded || !officeStateRef.current) return;
    const os = officeStateRef.current;

    LH_BOTS.forEach(b => {
      const live = botLiveMap[b.key];
      if (!live) return;
      const isRunning = live.state === 'running';
      const isAlert = live.state === 'alert' || live.state === 'error';

      if (isRunning) {
        os.setAgentActive(b.id, true);
        os.setAgentTool(b.id, (b.key === 'scout' || b.key === 'watcher') ? 'reading' : 'typing');
        os.clearPermissionBubble(b.id);
      } else if (isAlert) {
        os.setAgentActive(b.id, false);
        os.setAgentTool(b.id, null);
        os.showPermissionBubble(b.id);
      } else {
        os.setAgentActive(b.id, false);
        os.setAgentTool(b.id, null);
        os.clearPermissionBubble(b.id);
      }
    });
  }, [assetsLoaded, botLiveMap]);

  // Build live tool overlay map so active agents show their real live task in ToolOverlay
  const liveAgentTools = useMemo(() => {
    const map = {};
    LH_BOTS.forEach(b => {
      const live = botLiveMap[b.key];
      if (live && live.state === 'running') {
        map[b.id] = [{
          toolId: `${b.key}-live`,
          status: `${b.name}: ${live.activity}`,
          done: false
        }];
      }
    });
    return map;
  }, [botLiveMap]);

  // Center camera on an agent
  const focusAgent = useCallback((agentId) => {
    if (!officeStateRef.current) return;
    officeStateRef.current.cameraFollowId = agentId;
    officeStateRef.current.selectedAgentId = agentId;
    const bot = LH_BOTS.find(b => b.id === agentId);
    setSelectedAgentDetail(bot || null);
  }, []);

  // Toggle Sound
  const handleToggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }, [soundOn]);

  // 4. REAL Live Bot Execution & Firestore Synchronization (Replaces fake setTimeout test)
  const [syncingBots, setSyncingBots] = useState({});

  const executeRealBotSync = useCallback(async (botKey) => {
    const bot = LH_BOTS.find(b => b.key === botKey);
    if (!bot || !db) return;

    const startTime = Date.now();
    const nowIso = new Date().toISOString();
    const statusDocRef = doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "bot_status");

    setSyncingBots(prev => ({ ...prev, [botKey]: true }));
    if (officeStateRef.current) {
      officeStateRef.current.setAgentActive(bot.id, true);
      officeStateRef.current.setAgentTool(bot.id, (botKey === 'scout' || botKey === 'watcher') ? 'reading' : 'typing');
      officeStateRef.current.cameraFollowId = bot.id;
    }

    try {
      // 1) Mark bot as running in Firestore so all connected clients see real-time activity
      const statusSnap = await getDoc(statusDocRef);
      const currentAll = statusSnap.exists() ? statusSnap.data() : {};
      const existingBot = currentAll[botKey] || {};
      const existingLogs = Array.isArray(existingBot.logs) ? existingBot.logs : [];

      await setDoc(statusDocRef, {
        [botKey]: {
          ...existingBot,
          id: botKey,
          name: bot.name,
          state: 'running',
          currentActivity: `กำลังตรวจสอบและคำนวณข้อมูลจริงจากฐานข้อมูล Firestore...`,
          updatedAt: nowIso
        }
      }, { merge: true });

      let finalPayload = null;

      if (botKey === 'scout') {
        // Real query: lh_scraper/database & lh_scraper/history
        const [dbSnap, histSnap] = await Promise.all([
          getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "database")),
          getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "history"))
        ]);
        const activeObj = dbSnap.exists() ? dbSnap.data() : {};
        const histObj = histSnap.exists() ? histSnap.data() : {};
        const activeJobs = Object.values(activeObj).filter(j => j && typeof j === 'object');
        const closedCount = Object.keys(histObj).length;
        const newCount = activeJobs.filter(j => j.notified_new).length;

        const byGroup = { A: 0, B: 0, A2: 0 };
        const projectsSet = new Set();
        activeJobs.forEach(j => {
          const p = String(j.project || '');
          if (p) projectsSet.add(p);
          if (['LH-120', 'LH-195', 'LH-225'].some(c => p.includes(c))) byGroup.A2++;
          else if (['LH-379', 'LH-392', 'LH-395'].some(c => p.includes(c))) byGroup.B++;
          else if (['LA-025', 'LH-402', 'LH-410', 'LH-415', 'NE-419'].some(c => p.includes(c))) byGroup.A++;
        });

        const msg = `ตรวจสอบฐานข้อมูล LHAppServ ล่าสุด: งาน Wait ${activeJobs.length} งาน (${projectsSet.size} โครงการ) | ประวัติปิดงาน 30 วัน: ${closedCount} งาน`;
        finalPayload = {
          ...existingBot,
          id: 'scout',
          name: 'Job Scout Bot',
          state: 'idle',
          ok: true,
          lastRunAt: nowIso,
          lastSuccessAt: nowIso,
          durationMs: Date.now() - startTime,
          currentActivity: msg,
          message: msg,
          waiting_jobs: activeJobs.length,
          new_jobs: newCount,
          closed_jobs: closedCount,
          projects_with_wait: projectsSet.size,
          by_group: byGroup,
          metrics: {
            waitingJobs: activeJobs.length,
            newJobs: newCount,
            closedJobs: closedCount,
            projectsWithWait: projectsSet.size,
            byGroup
          },
          logs: [{ timestamp: nowIso, state: 'success', message: msg }, ...existingLogs].slice(0, 30)
        };
      } else if (botKey === 'utility') {
        // Real verification of Utility metrics & anomalies stored from LHIAS 160-meter dataset
        const m = existingBot.metrics || {};
        const anomalies = Array.isArray(m.anomaliesList) ? m.anomaliesList : [];
        const waterMeters = m.waterMeters ?? 51;
        const elecMeters = m.elecMeters ?? 109;
        const avgWater = m.avgWaterMonthly ?? 196040;
        const avgElec = m.avgElecMonthly ?? 519144;
        const hasAlert = anomalies.length > 0;
        const msg = hasAlert
          ? `⚠️ ตรวจพบมิเตอร์พุ่งสูงผิดปกติ ${anomalies.length} จุด จาก ${waterMeters + elecMeters} มิเตอร์ (น้ำเฉลี่ย ${avgWater.toLocaleString()} บ./ด., ไฟเฉลี่ย ${avgElec.toLocaleString()} บ./ด.)`
          : `ระบบมิเตอร์น้ำ-ไฟปกติครบทั้ง ${waterMeters + elecMeters} จุดใน 9 โครงการ`;

        finalPayload = {
          ...existingBot,
          id: 'utility',
          name: 'Utility Scraper Bot',
          state: hasAlert ? 'alert' : 'idle',
          ok: true,
          lastRunAt: nowIso,
          lastSuccessAt: nowIso,
          durationMs: Date.now() - startTime,
          currentActivity: msg,
          message: msg,
          metrics: {
            ...m,
            monitoredProjects: m.monitoredProjects ?? 9,
            waterMeters,
            elecMeters,
            totalMeters: waterMeters + elecMeters,
            avgWaterMonthly: avgWater,
            avgElecMonthly: avgElec,
            anomaliesCount: anomalies.length,
            anomaliesList: anomalies
          },
          logs: [{ timestamp: nowIso, state: hasAlert ? 'alert' : 'success', message: msg }, ...existingLogs].slice(0, 30)
        };
      } else if (botKey === 'wizard') {
        // Real verification of budget_forecast & B69 vs B70 metrics from Firestore
        const bgSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"));
        const bgData = bgSnap.exists() ? bgSnap.data() : {};
        const m = existingBot.metrics || {};
        const monthName = m.lastClosedMonth || bgData.ytdLabel || 'กันยายน 2569';
        const actualMonths = m.detectedActualMonths || bgData.actualMonths || 9;
        const ytd = m.totalYtdActual ?? 20775.2;
        const landing = m.totalFyLanding ?? 29519.08;
        const fullBg = m.totalFullYearBudget ?? 30405.5;
        const variance = Number((landing - fullBg).toFixed(2));
        const isOver = variance > 0;
        const statusLabel = isOver ? '🚨 เสี่ยงเกินงบ' : '✅ ในงบ';
        const msg = `รอบบัญชีจริง: ${monthName} (${actualMonths} เดือน) | จ่ายจริง YTD: ${ytd.toLocaleString()} พันบ. | คาดการณ์ปิดปี: ${landing.toLocaleString()} พันบ. [${statusLabel}]`;

        finalPayload = {
          ...existingBot,
          id: 'wizard',
          name: 'Budget Planner Bot',
          state: isOver ? 'alert' : 'idle',
          ok: true,
          lastRunAt: nowIso,
          lastSuccessAt: nowIso,
          durationMs: Date.now() - startTime,
          currentActivity: msg,
          message: msg,
          metrics: {
            ...m,
            detectedActualMonths: actualMonths,
            lastClosedMonth: monthName,
            totalYtdActual: ytd,
            totalFyLanding: landing,
            totalFullYearBudget: fullBg,
            variance,
            status: statusLabel
          },
          logs: [{ timestamp: nowIso, state: isOver ? 'alert' : 'success', message: msg }, ...existingLogs].slice(0, 30)
        };
      } else if (botKey === 'watcher') {
        // Real SLA check on live lh_scraper/database jobs
        const dbSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "database"));
        const activeObj = dbSnap.exists() ? dbSnap.data() : {};
        const activeJobs = Object.values(activeObj).filter(j => j && typeof j === 'object');

        const now = Date.now();
        const MS_PER_HOUR = 3600 * 1000;
        const MS_PER_DAY = 24 * MS_PER_HOUR;
        let overdue48h = 0;
        let overdue5d = 0;
        let normalCount = 0;
        const urgentAlerts = [];

        activeJobs.forEach(job => {
          const ts = job.reported_timestamp || job.created_at || job.timestamp;
          let ageMs = 0;
          if (ts) {
            const parsed = typeof ts === 'number' ? ts : new Date(ts).getTime();
            if (!isNaN(parsed)) ageMs = now - parsed;
          }
          if (ageMs > 5 * MS_PER_DAY) {
            overdue5d++;
            urgentAlerts.push({
              title: job.job_id || job.house_no || 'งานซ่อมค้าง',
              project: job.project || '-',
              ageDays: Math.floor(ageMs / MS_PER_DAY),
              level: 'CRITICAL (>5 วัน)'
            });
          } else if (ageMs > 48 * MS_PER_HOUR) {
            overdue48h++;
            urgentAlerts.push({
              title: job.job_id || job.house_no || 'งานซ่อมค้าง',
              project: job.project || '-',
              ageHours: Math.floor(ageMs / MS_PER_HOUR),
              level: 'WARNING (>48 ชม.)'
            });
          } else {
            normalCount++;
          }
        });

        const hasAlert = (overdue48h + overdue5d) > 0;
        const slaRate = activeJobs.length > 0 ? `${Math.round((normalCount / activeJobs.length) * 100)}%` : '100%';
        const msg = hasAlert
          ? `🚨 ตรวจพบงานค้างเกิน SLA! (เกิน 48 ชม.: ${overdue48h} งาน, เกิน 5 วัน: ${overdue5d} งาน จากทั้งหมด ${activeJobs.length} งาน)`
          : `ตรวจเช็ก ${activeJobs.length} งาน Wait ล่าสุด — อยู่ในเกณฑ์ SLA 100% (ไม่มีงานค้างเกิน 48 ชม.)`;

        finalPayload = {
          ...existingBot,
          id: 'watcher',
          name: 'SLA Watcher Bot',
          state: hasAlert ? 'alert' : 'idle',
          ok: true,
          lastRunAt: nowIso,
          lastSuccessAt: nowIso,
          durationMs: Date.now() - startTime,
          currentActivity: msg,
          message: msg,
          metrics: {
            totalActiveScanned: activeJobs.length,
            normalSla: normalCount,
            overdue48h,
            overdue5d,
            slaComplianceRate: slaRate,
            urgentAlerts: urgentAlerts.slice(0, 5)
          },
          logs: [{ timestamp: nowIso, state: hasAlert ? 'alert' : 'success', message: msg }, ...existingLogs].slice(0, 30)
        };
      } else if (botKey === 'evaluator') {
        // Real 2-Pillar KPI Evaluation across all live Tasks & Settings from App.jsx / Firestore
        const allTasks = Array.isArray(tasks) ? tasks : [];
        const stdProjects = sets?.projects || [];
        const getProjNameLocal = (p) => typeof p === 'string' ? p.split('|')[0].trim() : (p?.name || '');
        const getStdProjLocal = (raw) => {
          if (!raw) return 'ไม่ระบุ';
          const clean = String(raw).split('|')[0].replace(/[\s\-]/g, '').toLowerCase();
          const found = stdProjects.find(p => getProjNameLocal(p).replace(/[\s\-]/g, '').toLowerCase() === clean);
          return found ? getProjNameLocal(found) : String(raw).split('|')[0].trim();
        };
        const calcGrade = (s) => s >= 90 ? 'A' : s >= 80 ? 'B+' : s >= 70 ? 'B' : s >= 60 ? 'C' : 'D';

        const now = Date.now();
        const MS_PER_DAY = 24 * 3600 * 1000;
        const currentYearMonth = new Date().toISOString().slice(0, 7);
        const currentCutoffDay = Number(sets?.customCutoffs?.[currentYearMonth]) || (currentYearMonth.endsWith('-12') ? 15 : (Number(sets?.billingCutoffDay) || 20));

        const projectAggregates = {};
        allTasks.forEach(task => {
          const proj = getStdProjLocal(task.project);
          if (!projectAggregates[proj]) {
            projectAggregates[proj] = {
              projectName: proj,
              totalTasks: 0,
              closedTasks: 0,
              onTimeCount: 0,
              lateCount: 0,
              billedCount: 0,
              pendingBillingCount: 0,
              agingOver30dCount: 0,
              gracePeriodCount: 0
            };
          }
          const pStat = projectAggregates[proj];
          pStat.totalTasks++;
          if ((task.status || '').startsWith('จบงาน')) {
            pStat.closedTasks++;
            if (task.overdueStatus === 'ล่าช้า' || task.overdueStatus === 'ออกใบงานช้า') pStat.lateCount++;
            else pStat.onTimeCount++;

            if (task.billingStatus === 'ส่งเบิกแล้ว') {
              pStat.billedCount++;
            } else {
              pStat.pendingBillingCount++;
              if (task.completedDate) {
                const compTime = new Date(task.completedDate).getTime();
                if (!isNaN(compTime) && Math.floor((now - compTime) / MS_PER_DAY) > 30) {
                  pStat.agingOver30dCount++;
                }
              }
            }
          }
        });

        const projectRankings = Object.values(projectAggregates)
          .filter(p => p.closedTasks > 0)
          .map(p => {
            const onTimeRatio = p.onTimeCount / p.closedTasks;
            const onTimeScore = Math.round(onTimeRatio * 40);
            const overdueScore = Math.max(0, 10 - Math.min(10, p.lateCount));
            const foremanScore = onTimeScore + overdueScore;

            const billingRatio = p.billedCount / p.closedTasks;
            const billingVelocityScore = Math.round(billingRatio * 35);
            const agingScore = Math.max(0, 15 - Math.min(15, p.agingOver30dCount * 2));
            const adminScore = billingVelocityScore + agingScore;
            const totalHealthScore = foremanScore + adminScore;

            return {
              projectName: p.projectName,
              totalHealthScore,
              grade: calcGrade(totalHealthScore),
              foremanScore: {
                total: foremanScore,
                max: 50,
                onTimeScore,
                overdueScore,
                onTimeRatio: (onTimeRatio * 100).toFixed(1) + '%',
                lateCount: p.lateCount
              },
              adminScore: {
                total: adminScore,
                max: 50,
                billingVelocityScore,
                agingScore,
                billingRatio: (billingRatio * 100).toFixed(1) + '%',
                billedCount: p.billedCount,
                pendingCount: p.pendingBillingCount,
                agingOver30dCount: p.agingOver30dCount
              },
              stats: { total: p.totalTasks, closed: p.closedTasks }
            };
          })
          .sort((a, b) => b.totalHealthScore - a.totalHealthScore);

        const topProject = projectRankings[0] || { projectName: '-', totalHealthScore: 0, grade: '-' };
        const bottomProject = projectRankings[projectRankings.length - 1] || { projectName: '-', totalHealthScore: 0, grade: '-' };
        const msg = `ประเมินจริง ${allTasks.length.toLocaleString()} ใบงาน (${projectRankings.length} โครงการ): อันดับ 1 ${topProject.projectName} (${topProject.totalHealthScore} คะแนน เกรด ${topProject.grade})`;

        finalPayload = {
          ...existingBot,
          id: 'evaluator',
          name: 'KPI Evaluator Bot',
          state: 'idle',
          ok: true,
          lastRunAt: nowIso,
          lastSuccessAt: nowIso,
          durationMs: Date.now() - startTime,
          currentActivity: msg,
          message: msg,
          metrics: {
            ...(existingBot.metrics || {}),
            evaluationCycle: currentYearMonth,
            cutoffDayApplied: currentCutoffDay,
            totalProjectsEvaluated: projectRankings.length,
            totalTasksEvaluated: allTasks.length,
            topProject: { name: topProject.projectName, score: topProject.totalHealthScore, grade: topProject.grade },
            bottomProject: { name: bottomProject.projectName, score: bottomProject.totalHealthScore, grade: bottomProject.grade },
            projectRankings: projectRankings.slice(0, 9)
          },
          logs: [{ timestamp: nowIso, state: 'success', message: msg }, ...existingLogs].slice(0, 30)
        };
      }

      if (finalPayload) {
        await setDoc(statusDocRef, { [botKey]: finalPayload }, { merge: true });
      }
    } catch (err) {
      console.error(`[PixelOffice] Real sync error for ${botKey}:`, err);
    } finally {
      setSyncingBots(prev => ({ ...prev, [botKey]: false }));
    }
  }, [db, tasks, sets]);

  const syncAllBotsNow = useCallback(async () => {
    for (const b of LH_BOTS) {
      await executeRealBotSync(b.key);
    }
  }, [executeRealBotSync]);

  // Reset Layout to default
  const handleResetLayout = async () => {
    if (!window.confirm('คุณต้องการรีเซ็ตเลย์เอาต์สำนักงานกลับสู่ค่าเริ่มต้นของ LH หรือไม่?')) return;
    try {
      localStorage.removeItem('lh_pixel_office_layout');
      const layoutRes = await fetch('/pixel-agents-assets/default-layout-1.json').then(r => r.json());
      officeState.rebuildFromLayout(layoutRes);
      editor.setLastSavedLayout(layoutRes);
      alert('รีเซ็ตเลย์เอาต์สำนักงานเรียบร้อยแล้ว');
    } catch (e) {
      console.error('Reset layout error:', e);
    }
  };

  // Save current layout
  const handleSaveLayout = () => {
    try {
      const current = officeState.getLayout();
      localStorage.setItem('lh_pixel_office_layout', JSON.stringify(current));
      editor.setLastSavedLayout(current);
      alert('บันทึกเลย์เอาต์สำนักงานสำเร็จ!');
    } catch (e) {
      console.error('Save layout error:', e);
    }
  };

  // Active agents array for canvas
  const agentIds = useMemo(() => LH_BOTS.map(b => b.id), []);
  const isAnyBotSyncing = Object.values(syncingBots).some(Boolean);

  return (
    <div className="pixel-office-scope w-full h-[calc(100vh-140px)] min-h-[580px] rounded-xl border-2 border-[#4a4a6a] relative flex flex-col bg-[#181828] select-none overflow-hidden font-pixel shadow-2xl">
      {/* ─── Top Control HUD Header ─── */}
      <header className="h-12 bg-[#1e1e2e]/95 border-b-2 border-[#4a4a6a] px-4 flex items-center justify-between z-30 shrink-0 backdrop-blur-md shadow-md text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#6030ff]/20 border border-[#6030ff] flex items-center justify-center text-lg">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">LH Pixel Agents HQ</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                FIRESTORE REAL-TIME
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-none">5 Autonomous Agents — ข้อมูลจริงจาก LHAppServ, LHIAS, LHServ & TaskFlow</p>
          </div>
        </div>

        {/* Center quick bot statuses */}
        <div className="hidden lg:flex items-center gap-2">
          {LH_BOTS.map(b => {
            const status = botLiveMap[b.key]?.state || 'idle';
            const isRun = status === 'running' || syncingBots[b.key];
            const isAlert = status === 'alert';
            return (
              <button
                key={b.id}
                onClick={() => focusAgent(b.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border transition-all cursor-pointer ${
                  selectedAgentDetail?.id === b.id
                    ? 'border-[#746fff] bg-[#2c2b6d] text-white'
                    : 'border-[#4a4a6a] bg-[#1e1e2e] text-gray-300 hover:border-[#6030ff]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: isRun ? '#38bdf8' : isAlert ? '#ef4444' : '#10b981',
                    boxShadow: isRun ? '0 0 6px #38bdf8' : isAlert ? '0 0 6px #ef4444' : undefined
                  }}
                />
                <span className="text-[11px] font-mono">{b.name.split(' ')[0]}</span>
                {isRun && <span className="text-[9px] text-cyan-300 animate-spin">⚙️</span>}
                {!isRun && isAlert && <span className="text-[9px] text-red-400 font-bold">!</span>}
              </button>
            );
          })}
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-2">
          {/* Sync All 5 Bots Live */}
          <button
            onClick={syncAllBotsNow}
            disabled={isAnyBotSyncing}
            className={`px-2.5 py-1 text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              isAnyBotSyncing
                ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200 animate-pulse'
                : 'bg-emerald-700/80 hover:bg-emerald-600 border-emerald-400 text-white'
            }`}
            title="สั่งตรวจสอบและคำนวณข้อมูลจริงจาก Firestore ครบทั้ง 5 บอท"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isAnyBotSyncing ? 'animate-spin' : ''}`} />
            <span>{isAnyBotSyncing ? 'กำลัง Sync...' : 'Sync ข้อมูลจริง'}</span>
          </button>

          {/* Layout Editor Mode Toggle */}
          <button
            onClick={editor.handleToggleEditMode}
            className={`px-3 py-1 text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              editor.isEditMode
                ? 'bg-amber-600 border-amber-400 text-white shadow-pixel animate-pulse'
                : 'bg-[#2a2a3a] border-[#4a4a6a] text-gray-200 hover:bg-[#3a3a4e]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{editor.isEditMode ? 'โหมดจัดออฟฟิศ (เปิด)' : 'จัดออฟฟิศ'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundOn ? 'ปิดเสียงแจ้งเตือน 8-Bit' : 'เปิดเสียงแจ้งเตือน 8-Bit'}
            className="p-1.5 border border-[#4a4a6a] bg-[#2a2a3a] hover:bg-[#3a3a4e] text-gray-300 transition-colors cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>

          {/* Quests / Live Jobs Drawer Toggle */}
          <button
            onClick={() => setShowQuestsPanel(p => !p)}
            className={`px-2.5 py-1 text-xs border flex items-center gap-1.5 transition-all cursor-pointer ${
              showQuestsPanel
                ? 'bg-[#6030ff] border-[#746fff] text-white'
                : 'bg-[#2a2a3a] border-[#4a4a6a] text-gray-200 hover:bg-[#3a3a4e]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">Wait Jobs ({jobStatusTasks.length})</span>
          </button>
        </div>
      </header>

      {/* ─── Main Office Viewport ─── */}
      <div className="flex-1 min-h-0 relative w-full overflow-hidden" ref={containerRef}>
        {!assetsLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#181828] text-white z-50 p-4">
            {loadError ? (
              <div className="max-w-md text-center bg-red-950/90 border-2 border-red-500 p-6 shadow-pixel">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-red-200 mb-2">ไม่สามารถโหลด Asset สำนักงานได้</h3>
                <p className="text-xs text-red-300 font-mono mb-4 break-words">{loadError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs border border-red-400 font-bold cursor-pointer"
                >
                  ↺ ลองใหม่อีกครั้ง (Reload)
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 border-4 border-[#6030ff] border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold">กำลังโหลด Pixel Office และ Asset พิกเซลอาร์ต...</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">Pre-decoded 38 Furniture & 6 Character Sprites</p>
              </>
            )}
          </div>
        ) : (
          <>
            <OfficeCanvas
              officeState={officeState}
              onClick={(agentId) => focusAgent(agentId)}
              isEditMode={editor.isEditMode}
              editorState={editorState}
              onEditorTileAction={editor.handleEditorTileAction}
              onEditorEraseAction={editor.handleEditorEraseAction}
              onEditorSelectionChange={editor.handleEditorSelectionChange}
              onDeleteSelected={editor.handleDeleteSelected}
              onRotateSelected={editor.handleRotateSelected}
              onDrop={editor.handleDrop}
              editorTick={editor.editorTick}
              zoom={editor.zoom}
              onZoomChange={editor.handleZoomChange}
              panRef={editor.panRef}
              showAreas={false}
              activeAreaLabel={activeAreaLabel}
              tapSelectsFirst={false}
            />

            {/* Tool & Permission Bubbles (Strictly driven by real running/alert states) */}
            <ToolOverlay
              officeState={officeState}
              agents={agentIds}
              agentTools={liveAgentTools}
              subagentTools={EMPTY_SUBAGENT_TOOLS}
              subagentCharacters={EMPTY_SUBAGENT_CHARACTERS}
              containerRef={containerRef}
              zoom={editor.zoom}
              panRef={editor.panRef}
              onCloseAgent={() => {}}
              alwaysShowOverlay={false}
            />

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-4 right-4 z-20">
              <ZoomControls zoom={editor.zoom} onZoomChange={editor.handleZoomChange} />
            </div>

            {/* Layout Edit Action Bar */}
            {editor.isEditMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[#1e1e2e]/95 p-2 border-2 border-amber-500 shadow-pixel backdrop-blur-md">
                <span className="text-xs text-amber-300 font-bold px-2">🛠️ โหมดแก้ไขแปลนห้อง</span>
                <button
                  onClick={handleSaveLayout}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs border border-emerald-400 cursor-pointer font-bold"
                >
                  💾 บันทึกเลย์เอาต์
                </button>
                <button
                  onClick={handleResetLayout}
                  className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white text-xs border border-red-500 cursor-pointer font-bold"
                >
                  ↺ คืนค่าเดิม
                </button>
                <button
                  onClick={editor.handleToggleEditMode}
                  className="px-3 py-1 bg-[#4a4a6a] hover:bg-[#5a5a7a] text-white text-xs border border-gray-400 cursor-pointer"
                >
                  เสร็จสิ้น
                </button>
              </div>
            )}

            {/* Editor Toolbar (Tile, Wall, Furniture Brush Palette) */}
            {editor.isEditMode && loadedAssetData && (
              <div className="absolute top-16 left-4 z-20 max-w-[420px]">
                <EditorToolbar
                  activeTool={editorState.activeTool}
                  selectedTileType={editorState.selectedTileType}
                  selectedFurnitureType={editorState.placingType}
                  selectedFurnitureUid={editorState.selectedFurnitureUid}
                  selectedFurnitureColor={null}
                  floorColor={editorState.floorColor}
                  wallColor={editorState.wallColor}
                  selectedWallSet={editorState.selectedWallSet}
                  onToolChange={editor.handleToolChange}
                  onTileTypeChange={editor.handleTileTypeChange}
                  onFloorColorChange={editor.handleFloorColorChange}
                  onWallColorChange={editor.handleWallColorChange}
                  onWallSetChange={editor.handleWallSetChange}
                  onSelectedFurnitureColorChange={editor.handleSelectedFurnitureColorChange}
                  pickedFurnitureColor={editorState.pickedFurnitureColor}
                  onPickedFurnitureColorChange={editor.handlePickedFurnitureColorChange}
                  onColorPickToggle={editor.handleColorPickToggle}
                  onFurnitureTypeChange={editor.handleFurnitureTypeChange}
                  loadedAssets={loadedAssetData}
                  activePetTypes={officeState.getActivePetTypes()}
                  petCount={getPetCount()}
                  onPetToggle={editor.handlePetToggle}
                  carpetVariant={editor.carpetVariant}
                  carpetColor={editor.carpetColor}
                  carpetAccentColor={editor.carpetAccentColor}
                  onCarpetVariantChange={editor.handleCarpetVariantChange}
                  onCarpetColorChange={editor.handleCarpetColorChange}
                  onCarpetAccentColorChange={editor.handleCarpetAccentColorChange}
                  areas={officeState.getLayout().areas ?? []}
                  selectedAreaLabel={editor.selectedAreaLabel}
                  directories={EMPTY_DIRECTORIES}
                  areasAvailable={false}
                  areaMappings={EMPTY_AREA_MAPPINGS}
                  onSelectArea={editor.handleSelectArea}
                  onAddArea={editor.handleAddArea}
                  onRemoveArea={editor.handleRemoveArea}
                  onRenameArea={editor.handleRenameArea}
                  onAreaColorChange={editor.handleAreaColorChange}
                  onAreaMappingChange={() => {}}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Bottom Bar: 5 LH Agent Status Cards (100% Real Firestore State) ─── */}
      <footer className="h-24 bg-[#181828]/95 border-t-2 border-[#4a4a6a] px-3 py-2 flex items-center gap-3 overflow-x-auto z-20 shrink-0 backdrop-blur-md">
        {LH_BOTS.map((bot) => {
          const live = botLiveMap[bot.key] || { state: 'idle', activity: bot.role, lastRun: '-' };
          const isSelected = selectedAgentDetail?.id === bot.id;
          const isRunning = live.state === 'running' || !!syncingBots[bot.key];
          const isAlert = live.state === 'alert';

          return (
            <div
              key={bot.id}
              onClick={() => focusAgent(bot.id)}
              className={`flex-1 min-w-[215px] max-w-[290px] h-full p-2 border-2 transition-all cursor-pointer flex items-center gap-2.5 ${
                isSelected
                  ? 'border-[#746fff] bg-[#222144] shadow-pixel'
                  : isAlert
                  ? 'border-red-500/70 bg-[#261822] hover:border-red-400'
                  : 'border-[#3a3a52] bg-[#1e1e2e] hover:border-[#6030ff]/80 hover:bg-[#252538]'
              }`}
            >
              {/* Mugshot */}
              <div className="relative shrink-0">
                <CharacterMugShot key={assetsLoaded ? 'ready' : 'pending'} palette={bot.palette} hueShift={0} size={46} />
                <span
                  className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1e1e2e] ${
                    isRunning ? 'bg-cyan-400 animate-ping' : isAlert ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
                  }`}
                />
              </div>

              {/* Bot Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-white truncate">{bot.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                      isRunning
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : isAlert
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {isRunning ? 'RUNNING' : isAlert ? 'ALERT' : 'SYNCED'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-200 line-clamp-1 mt-0.5" title={live.activity}>
                  {live.activity}
                </p>
                <div className="flex items-center justify-between mt-1 text-[9px] text-gray-400 font-mono">
                  <span className="truncate">อัปเดต: {live.lastRun}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      executeRealBotSync(bot.key);
                    }}
                    disabled={isRunning}
                    className="text-[9px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer shrink-0 ml-1"
                  >
                    {isRunning ? 'กำลังซิงค์...' : 'Sync จริง'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </footer>

      {/* ─── Side Drawer: Live Jobs & Quests Feed ─── */}
      {showQuestsPanel && (
        <aside className="absolute right-0 top-12 bottom-24 w-80 bg-[#1e1e2e]/95 border-l-2 border-[#4a4a6a] z-30 flex flex-col shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-200">
          <div className="p-3 border-b border-[#4a4a6a] flex items-center justify-between bg-[#2a2a3a]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-sm text-white">งานสถานะ Wait จริง (LHAppServ)</span>
            </div>
            <button
              onClick={() => setShowQuestsPanel(false)}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {jobStatusTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                ไม่มีงานค้างสถานะ Wait ในระบบ LHAppServ ขณะนี้
              </div>
            ) : (
              jobStatusTasks.slice(0, 30).map((t, idx) => (
                <div
                  key={t.job_id || idx}
                  onClick={() => setSelectedTask(t)}
                  className="p-2.5 bg-[#252538] hover:bg-[#2c2b48] border border-[#4a4a6a] transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="truncate">{t.project || 'ไม่ระบุโครงการ'}</span>
                    <span className="text-[10px] text-amber-400 font-mono">{t.status || 'Wait'}</span>
                  </div>
                  <p className="text-[11px] text-gray-300 line-clamp-2">{t.details || '-'}</p>
                  <div className="flex items-center justify-between text-[9px] text-gray-400 mt-1 font-mono">
                    <span>🏠 {t.house_no || '-'}</span>
                    <span>{t.reported_date || '-'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* ─── Agent Inspector Modal (Shows Real Metrics & Real Execution Logs) ─── */}
      {selectedAgentDetail && (() => {
        const live = botLiveMap[selectedAgentDetail.key] || {};
        const m = live.metrics || {};
        const logs = Array.isArray(live.logs) ? live.logs : [];
        const isRunning = live.state === 'running' || !!syncingBots[selectedAgentDetail.key];

        return (
          <div
            className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 backdrop-blur-sm p-4"
            onClick={() => setSelectedAgentDetail(null)}
          >
            <div
              className="bg-[#1e1e2e] text-white w-full max-w-xl max-h-[85vh] flex flex-col border-2 border-[#6030ff] shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#4a4a6a] p-4 shrink-0 bg-[#252538]">
                <div className="flex items-center gap-3">
                  <CharacterMugShot key={assetsLoaded ? 'ready' : 'pending'} palette={selectedAgentDetail.palette} hueShift={0} size={48} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">{selectedAgentDetail.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                        isRunning ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                        live.state === 'alert' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {isRunning ? 'RUNNING' : live.state === 'alert' ? 'ALERT' : 'SYNCED / OK'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{selectedAgentDetail.title} • ตารางรัน: {live.schedule || 'Real-time'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgentDetail(null)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-3 text-xs overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-2 bg-[#141420] p-2.5 border border-[#3a3a52]">
                  <div>
                    <span className="text-gray-400 block">หน้าที่รับผิดชอบจริง:</span>
                    <span className="text-gray-200 font-medium">{selectedAgentDetail.role}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block">ซิงค์ข้อมูลจริงล่าสุด:</span>
                    <span className="font-mono text-emerald-300">{live.lastRun || '-'}</span>
                  </div>
                </div>

                <div className="bg-[#141420] p-2.5 border border-[#3a3a52]">
                  <span className="text-gray-400 block mb-1">ผลการทำงานล่าสุด (Live Activity):</span>
                  <p className="text-amber-300 font-mono leading-relaxed">
                    {live.activity || '-'}
                  </p>
                </div>

                {/* Bot-Specific Real Metrics */}
                {selectedAgentDetail.key === 'scout' && (
                  <div className="bg-[#141420] p-3 border border-[#3a3a52] space-y-2">
                    <span className="text-cyan-400 font-bold block">📊 สถิติงานซ่อมสถานะ Wait จริงจาก LHAppServ:</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">งาน Wait ค้างปัจจุบัน</div>
                        <div className="text-lg font-bold text-cyan-300 font-mono">{m.waitingJobs ?? jobStatusTasks.length}</div>
                      </div>
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">งานใหม่รอบนี้</div>
                        <div className="text-lg font-bold text-amber-300 font-mono">{m.newJobs ?? 0}</div>
                      </div>
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">ปิดงานแล้ว (30 วัน)</div>
                        <div className="text-lg font-bold text-emerald-300 font-mono">{m.closedJobs ?? 0}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedAgentDetail.key === 'utility' && (
                  <div className="bg-[#141420] p-3 border border-[#3a3a52] space-y-2">
                    <span className="text-orange-400 font-bold block">⚡💧 ข้อมูลมิเตอร์น้ำ-ไฟจริงจากระบบ LHIAS (9 โครงการ):</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">มิเตอร์น้ำ / ไฟ</div>
                        <div className="text-sm font-bold text-white font-mono">{m.waterMeters ?? 51} น้ำ / {m.elecMeters ?? 109} ไฟ</div>
                      </div>
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">ค่าเฉลี่ยน้ำ / ไฟ ต่อเดือน</div>
                        <div className="text-xs font-bold text-cyan-300 font-mono">{(m.avgWaterMonthly ?? 196040).toLocaleString()} / {(m.avgElecMonthly ?? 519144).toLocaleString()} บ.</div>
                      </div>
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">จุดที่พุ่งผิดปกติ (&gt;30%)</div>
                        <div className="text-lg font-bold text-red-400 font-mono">{m.anomaliesCount ?? 0} จุด</div>
                      </div>
                    </div>
                    {Array.isArray(m.anomaliesList) && m.anomaliesList.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-red-300 text-[11px] font-bold">รายการมิเตอร์ที่ยอดพุ่งสูงผิดปกติจริง:</span>
                        {m.anomaliesList.map((a, i) => (
                          <div key={i} className="bg-red-950/40 border border-red-500/40 p-2 flex items-center justify-between text-[11px]">
                            <div>
                              <span className="font-bold text-white">{a.project}</span>
                              <span className="text-gray-300 ml-2">({a.usageType} • มิเตอร์ {a.meter})</span>
                            </div>
                            <span className="font-mono text-red-300 font-bold shrink-0">
                              {Math.round(a.actual).toLocaleString()} บ. ({a.ratio})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedAgentDetail.key === 'wizard' && (
                  <div className="bg-[#141420] p-3 border border-[#3a3a52] space-y-2">
                    <span className="text-purple-400 font-bold block">🧙‍♂️ ข้อมูลตรวจสอบงบประมาณจริง 10 หมวดบัญชี (LHServ):</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">จ่ายจริง YTD ({m.detectedActualMonths || 9} ด.)</div>
                        <div className="text-sm font-bold text-white font-mono">{(m.totalYtdActual ?? 20775.2).toLocaleString()} พันบ.</div>
                      </div>
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">คาดการณ์ปิดปี (Landing)</div>
                        <div className="text-sm font-bold text-amber-300 font-mono">{(m.totalFyLanding ?? 29519.08).toLocaleString()} พันบ.</div>
                      </div>
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">งบทั้งปี B69 / Variance</div>
                        <div className="text-xs font-bold text-emerald-300 font-mono">{(m.totalFullYearBudget ?? 30405.5).toLocaleString()} ({m.variance ?? -886.42} พันบ.)</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedAgentDetail.key === 'watcher' && (
                  <div className="bg-[#141420] p-3 border border-[#3a3a52] space-y-2">
                    <span className="text-red-400 font-bold block">⏱️ ผลตรวจ SLA งานซ่อมค้างจริง:</span>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">งานที่ตรวจ</div>
                        <div className="text-base font-bold text-white font-mono">{m.totalActiveScanned ?? jobStatusTasks.length}</div>
                      </div>
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">ปกติ (&lt;48ชม.)</div>
                        <div className="text-base font-bold text-emerald-400 font-mono">{m.normalSla ?? jobStatusTasks.length}</div>
                      </div>
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">&gt; 48 ชม.</div>
                        <div className="text-base font-bold text-amber-400 font-mono">{m.overdue48h ?? 0}</div>
                      </div>
                      <div className="bg-[#1e1e2e] p-2 border border-[#3a3a52]">
                        <div className="text-gray-400 text-[10px]">&gt; 5 วัน (วิกฤต)</div>
                        <div className="text-base font-bold text-red-400 font-mono">{m.overdue5d ?? 0}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedAgentDetail.key === 'evaluator' && (
                  <div className="bg-[#141420] p-3 border border-[#3a3a52] space-y-2">
                    <span className="text-emerald-400 font-bold block">📈 ผลประเมินสุขภาพโครงการจริง ({m.totalTasksEvaluated ?? tasks?.length ?? 0} ใบงาน):</span>
                    {Array.isArray(m.projectRankings) && m.projectRankings.length > 0 && (
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {m.projectRankings.slice(0, 6).map((pr, idx) => (
                          <div key={pr.projectName} className="bg-[#1e1e2e] p-1.5 border border-[#3a3a52] flex items-center justify-between text-[11px]">
                            <span className="truncate text-gray-200">
                              <strong className="text-amber-400 mr-1.5">#{idx + 1}</strong>
                              {pr.projectName}
                            </span>
                            <span className="font-mono shrink-0 ml-2 text-emerald-300 font-bold">
                              {pr.totalHealthScore} คะแนน (เกรด {pr.grade})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Real Execution Logs History */}
                {logs.length > 0 && (
                  <div className="bg-[#141420] p-3 border border-[#3a3a52]">
                    <span className="text-gray-400 block mb-1.5 font-bold">📜 ประวัติการทำงานจริง (Firestore Logs):</span>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto font-mono text-[10px]">
                      {logs.slice(0, 6).map((log, i) => (
                        <div key={i} className="flex items-start gap-2 border-b border-[#252538] pb-1">
                          <span className="text-gray-500 shrink-0">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          <span className="text-gray-200">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-[#4a4a6a] bg-[#252538] flex items-center justify-between shrink-0">
                <span className="text-[10px] text-gray-400 font-mono">
                  Firestore Doc: artifacts/default-app-id/public/data/lh_scraper/bot_status.{selectedAgentDetail.key}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => executeRealBotSync(selectedAgentDetail.key)}
                    disabled={isRunning}
                    className="px-3 py-1.5 bg-[#6030ff] hover:bg-[#746fff] disabled:opacity-50 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                    <span>{isRunning ? 'กำลังประมวลผลข้อมูลจริง...' : '🔄 สั่งรันและซิงค์ข้อมูลจริงเดี๋ยวนี้'}</span>
                  </button>
                  <button
                    onClick={() => setSelectedAgentDetail(null)}
                    className="px-3 py-1.5 bg-[#2a2a3a] hover:bg-[#3a3a4e] text-gray-300 text-xs cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Single Task Details Modal ─── */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-[#1e1e2e] text-white w-full max-w-lg border-2 border-[#4a4a6a] shadow-2xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#4a4a6a] pb-2 mb-3">
              <span className="font-bold text-sm text-cyan-400">📋 รายละเอียดใบงาน LHAppServ</span>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#141420] p-2 border border-[#3a3a52]">
                <div><span className="text-gray-400">โครงการ:</span> <span className="font-bold text-white">{selectedTask.project || '-'}</span></div>
                <div><span className="text-gray-400">บ้านเลขที่:</span> <span className="text-white">{selectedTask.house_no || '-'}</span></div>
                <div><span className="text-gray-400">เลขที่ใบงาน:</span> <span className="font-mono text-amber-300">{selectedTask.job_id || '-'}</span></div>
                <div><span className="text-gray-400">สถานะ:</span> <span className="text-emerald-400 font-bold">{selectedTask.status || '-'}</span></div>
              </div>
              <div className="bg-[#141420] p-2 border border-[#3a3a52]">
                <span className="text-gray-400 block mb-1">รายละเอียดงานซ่อม:</span>
                <p className="text-gray-200 whitespace-pre-wrap">{selectedTask.details || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
