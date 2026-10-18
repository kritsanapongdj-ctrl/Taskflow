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
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

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

export default function PixelAgentsOffice({ tasks, sets, setTab, db }) {
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

  // 2. Real-time Firestore Subscriptions
  useEffect(() => {
    if (!db) return;

    // A. Scout & Jobstatus tasks
    const unsubDb = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "database"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const arr = Object.values(data).sort((a, b) => b.reported_timestamp - a.reported_timestamp);
        setJobStatusTasks(arr);

        const hasNew = arr.some(t => t.notified_new);
        if (hasNew && officeStateRef.current) {
          const os = officeStateRef.current;
          os.setAgentActive(1, true);
          os.setAgentTool(1, 'reading');
          setTimeout(() => {
            if (officeStateRef.current) {
              officeStateRef.current.setAgentActive(1, false);
              officeStateRef.current.setAgentTool(1, null);
            }
          }, 6000);
        }
      }
    });

    // B. Real-time Bot Statuses
    const unsubStatus = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "bot_status"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const os = officeStateRef.current;

        setBotLiveMap(prev => {
          const next = { ...prev };

          LH_BOTS.forEach(b => {
            const bData = data[b.key] || {};
            const isRunning = bData.state === 'running';
            const isAlert = bData.state === 'alert' || (bData.metrics?.overdueSlaCount > 0);
            const isError = bData.state === 'error' || bData.ok === false;

            const runDate = bData.lastRunAt || bData.last_run_at ? new Date(bData.lastRunAt || bData.last_run_at) : null;
            const timeStr = runDate && !isNaN(runDate.getTime())
              ? runDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
              : '-';

            next[b.key] = {
              state: isRunning ? 'running' : (isAlert ? 'alert' : (isError ? 'error' : 'idle')),
              activity: bData.currentActivity || bData.message || b.role,
              lastRun: timeStr,
              ok: !isError,
              metrics: bData.metrics || {}
            };

            // Animate 2D character in OfficeState
            if (os) {
              if (isRunning) {
                os.setAgentActive(b.id, true);
                os.setAgentTool(b.id, 'typing');
              } else if (isAlert) {
                os.setAgentActive(b.id, true);
                os.showPermissionBubble(b.id);
              } else {
                os.setAgentActive(b.id, false);
                os.setAgentTool(b.id, null);
              }
            }
          });

          return next;
        });
      }
    });

    // C. Budget Forecast
    const unsubBudget = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"), (snap) => {
      if (snap.exists()) {
        const bgData = snap.data();
        setBudgetForecast(bgData);
        const overBudgetCount = Object.values(bgData.projects || {}).filter(p => (p.totalVariance || 0) > 0).length;
        if (overBudgetCount > 0 && officeStateRef.current) {
          officeStateRef.current.showPermissionBubble(3); // Wizard alert
        }
      }
    });

    return () => {
      unsubDb();
      unsubStatus();
      unsubBudget();
    };
  }, [db]);

  // 3. Ambient Idle Simulation Dialogues / Activities
  useEffect(() => {
    const ambientPool = [
      { id: 1, key: 'scout', msg: 'กวาดงานซ่อม LHAppServ รอบใหม่...' },
      { id: 2, key: 'utility', msg: 'ตรวจสอบมิเตอร์ไฟฟ้า โครงการ VERW...' },
      { id: 3, key: 'wizard', msg: 'สอบทานรหัส 54108 เทียบ Actual YTD...' },
      { id: 4, key: 'watcher', msg: 'ตรวจนับงานค้างเกิน 48 ชม. ในระบบ...' },
      { id: 5, key: 'evaluator', msg: 'ประมวลผล Leaderboard ทีมช่าง 9 โครงการ...' }
    ];

    const timer = setInterval(() => {
      if (!officeStateRef.current) return;
      const pick = ambientPool[Math.floor(Math.random() * ambientPool.length)];
      const os = officeStateRef.current;
      const ch = os.characters.get(pick.id);
      if (ch && !ch.active) {
        os.setAgentTool(pick.id, Math.random() > 0.5 ? 'typing' : 'reading');
        setTimeout(() => {
          if (officeStateRef.current) {
            officeStateRef.current.setAgentTool(pick.id, null);
          }
        }, 5000);
      }
    }, 14000);

    return () => clearInterval(timer);
  }, []);

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

  // Trigger test bot execution locally / optimistic
  const triggerBotSimulation = (botKey) => {
    const bot = LH_BOTS.find(b => b.key === botKey);
    if (!bot || !officeStateRef.current) return;

    setBotLiveMap(prev => ({
      ...prev,
      [botKey]: {
        ...prev[botKey],
        state: 'running',
        activity: `[Manual Run] กำลังทำงานและบันทึกข้อมูลแบบเรียลไทม์...`
      }
    }));

    officeStateRef.current.setAgentActive(bot.id, true);
    officeStateRef.current.setAgentTool(bot.id, 'typing');
    officeStateRef.current.cameraFollowId = bot.id;

    setTimeout(() => {
      if (officeStateRef.current) {
        officeStateRef.current.setAgentTool(bot.id, null);
        officeStateRef.current.setAgentActive(bot.id, false);
      }
      setBotLiveMap(prev => ({
        ...prev,
        [botKey]: {
          ...prev[botKey],
          state: 'idle',
          activity: `ปฏิบัติงานสำเร็จ (Last checked: ${new Date().toLocaleTimeString('th-TH')})`,
          lastRun: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        }
      }));
    }, 4500);
  };

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

  return (
    <div className="pixel-office-scope w-full h-[calc(100vh-68px)] relative flex flex-col bg-[#181828] select-none overflow-hidden font-pixel">
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
                LIVE SYNC
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-none">Autonomous Multi-Agent Office Simulation</p>
          </div>
        </div>

        {/* Center quick bot statuses */}
        <div className="hidden md:flex items-center gap-2">
          {LH_BOTS.map(b => {
            const status = botLiveMap[b.key]?.state || 'idle';
            const isRun = status === 'running';
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
                    backgroundColor: isRun ? '#38bdf8' : isAlert ? '#ef4444' : b.themeColor,
                    boxShadow: isRun ? '0 0 6px #38bdf8' : undefined
                  }}
                />
                <span className="text-[11px] font-mono">{b.name.split(' ')[0]}</span>
                {isRun && <span className="text-[9px] text-cyan-300 animate-pulse">⚙️</span>}
              </button>
            );
          })}
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-2">
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
            <span className="font-mono">Jobs ({jobStatusTasks.length})</span>
          </button>
        </div>
      </header>

      {/* ─── Main Office Viewport ─── */}
      <div className="flex-1 relative w-full h-full overflow-hidden" ref={containerRef}>
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

            {/* Tool & Permission Bubbles */}
            <ToolOverlay
              officeState={officeState}
              agents={agentIds}
              agentTools={new Map()}
              subagentTools={new Map()}
              subagentCharacters={new Map()}
              containerRef={containerRef}
              zoom={editor.zoom}
              panRef={editor.panRef}
              onCloseAgent={() => {}}
              alwaysShowOverlay={true}
            />

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-28 right-4 z-20">
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
                  directories={[]}
                  areasAvailable={false}
                  areaMappings={new Map()}
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

      {/* ─── Bottom Bar: 5 LH Agent Status Cards ─── */}
      <footer className="h-24 bg-[#181828]/95 border-t-2 border-[#4a4a6a] px-3 py-2 flex items-center gap-3 overflow-x-auto z-20 shrink-0 backdrop-blur-md">
        {LH_BOTS.map((bot) => {
          const live = botLiveMap[bot.key] || { state: 'idle', activity: bot.role, lastRun: '-' };
          const isSelected = selectedAgentDetail?.id === bot.id;
          const isRunning = live.state === 'running';
          const isAlert = live.state === 'alert';

          return (
            <div
              key={bot.id}
              onClick={() => focusAgent(bot.id)}
              className={`flex-1 min-w-[210px] max-w-[280px] h-full p-2 border-2 transition-all cursor-pointer flex items-center gap-2.5 ${
                isSelected
                  ? 'border-[#746fff] bg-[#222144] shadow-pixel'
                  : 'border-[#3a3a52] bg-[#1e1e2e] hover:border-[#6030ff]/80 hover:bg-[#252538]'
              }`}
            >
              {/* Mugshot */}
              <div className="relative shrink-0">
                <CharacterMugShot palette={bot.palette} hueShift={0} size={48} />
                <span
                  className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1e1e2e] ${
                    isRunning ? 'bg-cyan-400 animate-ping' : isAlert ? 'bg-red-500 animate-bounce' : 'bg-emerald-400'
                  }`}
                />
              </div>

              {/* Bot Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-white truncate">{bot.name}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono uppercase ${
                      isRunning
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : isAlert
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {live.state}
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 line-clamp-1 mt-0.5" title={live.activity}>
                  {live.activity}
                </p>
                <div className="flex items-center justify-between mt-1 text-[9px] text-gray-400 font-mono">
                  <span>รอบ: {live.lastRun}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerBotSimulation(bot.key);
                    }}
                    className="text-[9px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Run Test
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
              <span className="font-bold text-sm text-white">Live Jobs Feed (LHAppServ)</span>
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
                ยังไม่มีข้อมูลงานที่ดึงมาจาก Scout Bot
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

      {/* ─── Agent Inspector Modal ─── */}
      {selectedAgentDetail && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4"
          onClick={() => setSelectedAgentDetail(null)}
        >
          <div
            className="bg-[#1e1e2e] text-white w-full max-w-md border-2 border-[#6030ff] shadow-2xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#4a4a6a] pb-2 mb-3">
              <div className="flex items-center gap-3">
                <CharacterMugShot palette={selectedAgentDetail.palette} hueShift={0} size={42} />
                <div>
                  <h3 className="font-bold text-base text-white">{selectedAgentDetail.name}</h3>
                  <p className="text-xs text-gray-400">{selectedAgentDetail.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentDetail(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#141420] p-2.5 border border-[#3a3a52]">
                <span className="text-gray-400 block mb-1">หน้าที่หลัก:</span>
                <p className="text-gray-200">{selectedAgentDetail.role}</p>
              </div>

              <div className="bg-[#141420] p-2.5 border border-[#3a3a52] flex items-center justify-between">
                <div>
                  <span className="text-gray-400 block">สถานะปัจจุบัน:</span>
                  <span className="font-bold text-cyan-400 uppercase">
                    {botLiveMap[selectedAgentDetail.key]?.state || 'idle'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 block">รอบทำงานล่าสุด:</span>
                  <span className="font-mono text-gray-200">
                    {botLiveMap[selectedAgentDetail.key]?.lastRun || '-'}
                  </span>
                </div>
              </div>

              <div className="bg-[#141420] p-2.5 border border-[#3a3a52]">
                <span className="text-gray-400 block mb-1">กิจกรรมขณะนี้:</span>
                <p className="text-amber-300 font-mono">
                  {botLiveMap[selectedAgentDetail.key]?.activity || '-'}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => triggerBotSimulation(selectedAgentDetail.key)}
                  className="px-3 py-1.5 bg-[#6030ff] hover:bg-[#746fff] text-white font-bold cursor-pointer"
                >
                  🚀 ทดสอบการทำงาน (Run Test)
                </button>
                <button
                  onClick={() => setSelectedAgentDetail(null)}
                  className="px-3 py-1.5 bg-[#2a2a3a] hover:bg-[#3a3a4e] text-gray-300 cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
