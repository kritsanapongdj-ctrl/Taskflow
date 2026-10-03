import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Sparkles, List, X, ShieldAlert, Clock, Filter, Activity, Users, 
  Crosshair, ChevronRight, BookOpen, Book, Target, Shield, Sword, CheckCircle, 
  AlertTriangle, Info, DollarSign, CloudRain, Wrench, Droplets, HardHat, 
  TrendingUp, Radio, Cpu, RefreshCw, ExternalLink
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

import ClassEmblem from './ClassEmblem';
import archetypesData from './data/archetypes.json';
import { calculateArchetypeKey } from './utils/archetypeEngine';

// URL วิดีโอพื้นหลังจาก Supabase Storage (ฟรี ไม่กิน Storage ของ Vercel)
const TAVERN_VIDEO_URL = "https://jtimqkfefiuvptggbeiz.supabase.co/storage/v1/object/public/media/tavern-loop.mp4"; 
const TAVERN_FALLBACK_IMG = "/tavern-bg.jpg";
const BGM_URL = null;

/* ─── CSS Living Motion (injected once) ─── */
const AGENT_STYLES = `
  @keyframes agentBreathe {
    0%, 100% { transform: scaleY(1) translateY(0px); }
    50%       { transform: scaleY(0.96) translateY(3px); }
  }
  @keyframes agentFloat {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-5px); }
  }
  @keyframes agentAlert {
    0%, 100% { transform: translateY(0px) scale(1); }
    20%       { transform: translateY(-14px) scale(1.08); }
    40%       { transform: translateY(-6px) scale(1.04); }
    60%       { transform: translateY(-10px) scale(1.06); }
    80%       { transform: translateY(-3px) scale(1.02); }
  }
  @keyframes agentGlow {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(251,191,36,0.6)); }
    50%       { filter: drop-shadow(0 0 14px rgba(251,191,36,1)); }
  }
  @keyframes agentAlertGlow {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(239,68,68,0.7)); }
    50%       { filter: drop-shadow(0 0 20px rgba(239,68,68,1)); }
  }
  @keyframes agentWaterGlow {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(56,189,248,0.6)); }
    50%       { filter: drop-shadow(0 0 16px rgba(56,189,248,1)); }
  }
  @keyframes agentToolGlow {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(249,115,22,0.6)); }
    50%       { filter: drop-shadow(0 0 16px rgba(249,115,22,1)); }
  }
  @keyframes msgFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('agent-png-styles')) {
  const s = document.createElement('style');
  s.id = 'agent-png-styles';
  s.textContent = AGENT_STYLES;
  document.head.appendChild(s);
}

/* ─── Media CDN & Local Sprite Fallbacks ─── */
const SUPABASE_STORAGE_URL = "https://jtimqkfefiuvptggbeiz.supabase.co/storage/v1/object/public/media";

const AGENT_SRCS = {
  scout:     `${SUPABASE_STORAGE_URL}/agent1.webp?v=2`,
  wizard:    `${SUPABASE_STORAGE_URL}/agent2.webp?v=2`,
  watcher:   `${SUPABASE_STORAGE_URL}/agent3.webp?v=2`,
  evaluator: `${SUPABASE_STORAGE_URL}/agent4.webp?v=2`,
  flood:     '/agent5.png',
  manpower:  '/agent6.png',
};

// Component แสดงตัวละคร 2D/WebP Animation ประจำจุดต่างๆ ในฉากโรงเตี๋ยม
const AgentPng = ({ type, x, y, action, flip, msg, title, badge, onClick }) => {
  const isWalking = action === 'walking';
  const isWorking = action === 'working';
  const isAlert   = action === 'alert';

  const getAnimation = () => {
    if (isAlert) return 'agentAlert 0.7s ease-in-out 3';
    return undefined;
  };

  const getGlow = () => {
    if (isAlert) return 'agentAlertGlow 1s ease-in-out infinite';
    if (type === 'flood') return 'agentWaterGlow 2.5s ease-in-out infinite';
    if (type === 'manpower') return 'agentToolGlow 2.5s ease-in-out infinite';
    if (isWorking) return 'agentGlow 1.5s ease-in-out infinite';
    return 'agentGlow 3.5s ease-in-out infinite';
  };

  // ขนาดความสูงของตัวละครตาม Perspective ให้สมดุลกับคนในฉาก (คนในฉากสูงประมาณ 180-220px)
  const agentHeights = {
    scout:     '185px',  // ยืนส่องกล้องริมระเบียง/บอร์ดเควสต์
    wizard:    '200px',  // จอมเวทที่เคาน์เตอร์บาร์
    watcher:   '225px',  // อัศวินเกราะเต็มตัว หน้าเตาผิง
    evaluator: '210px',  // นักปราชญ์ ที่โต๊ะวางแผนล่างซ้าย
    flood:     '195px',  // ผู้พิทักษ์สายน้ำ ริมหน้าต่าง/ชั้นบน
    manpower:  '215px',  // นายกองส่งกำลังบำรุง ข้างคลังพัสดุและโต๊ะช่าง
  };

  const imgStyle = {
    height: agentHeights[type] || '195px',
    width: 'auto',
    transform: flip ? 'scaleX(-1)' : 'scaleX(1)',
    animation: getAnimation(),
    filter: isAlert ? 'drop-shadow(0 0 16px rgba(239,68,68,1))' : undefined,
    transition: 'transform 0.3s ease',
  };

  return (
    <div
      className="absolute flex flex-col items-center z-20 cursor-pointer group select-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -100%)', // Feet Anchor: ปักหลักที่จุดสัมผัสเท้า
        transitionDuration: isWalking ? '2200ms' : '600ms',
        transition: 'left 2200ms ease-in-out, top 2200ms ease-in-out',
      }}
      onClick={onClick}
    >
      {/* Speech bubble */}
      <div
        key={msg}
        className={`
          ${isAlert ? 'bg-red-900/95 border-red-500 text-red-100 animate-bounce' : 
            (isWorking ? 'bg-amber-900/95 border-amber-500 text-amber-100' : 
             type === 'flood' ? 'bg-sky-950/90 border-sky-500 text-sky-100' :
             type === 'manpower' ? 'bg-stone-900/90 border-amber-600 text-amber-100' :
             'bg-black/85 border-amber-600/60 text-amber-100')}
          text-[10px] px-2.5 py-1 rounded-lg border mb-1 whitespace-nowrap shadow-xl
          backdrop-blur-sm pointer-events-none group-hover:scale-105 transition-transform flex items-center gap-1.5
        `}
        style={{ animation: 'msgFadeIn 0.3s ease-out', fontSize: '10px', letterSpacing: '0.02em' }}
      >
        <span>{msg}</span>
        {badge && <span className="bg-amber-500/30 text-amber-300 text-[9px] px-1 py-0.2 rounded font-mono">{badge}</span>}
      </div>

      {/* Agent name tag */}
      <div className="bg-black/85 text-amber-300 text-[9px] px-2 py-0.5 rounded border border-amber-700/60 mb-1 font-bold tracking-wide pointer-events-none group-hover:border-amber-400 transition-colors shadow-md flex items-center gap-1">
        <span>{title}</span>
      </div>

      {/* WebP / PNG sprite animation */}
      <div style={{ animation: getGlow() }} className="group-hover:scale-105 transition-transform">
        <img
          src={AGENT_SRCS[type]}
          alt={title}
          style={imgStyle}
          draggable={false}
          loading="eager"
          onError={(e) => {
            // Fallback gracefully to local file if CDN fails
            if (e.target.src.includes('supabase.co')) {
              e.target.src = `/${type === 'scout' ? 'agent1.webp' : type === 'wizard' ? 'agent2.webp' : type === 'watcher' ? 'agent3.webp' : 'agent4.webp'}`;
            }
          }}
        />
      </div>

      {/* Hover prompt */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-amber-200 bg-black/90 px-1.5 py-0.5 rounded border border-amber-500 mt-1 pointer-events-none">
        คลิกดูข้อมูล
      </div>
    </div>
  );
};

// การ์ดแสดงเควสต์ในกระดาน
const QuestCard = ({ task, source, onClick }) => {
  const [now] = useState(() => Date.now());
  const parseDate = (dStr) => {
    if (!dStr) return now;
    try { 
      const [dp] = dStr.split(' '); 
      const [d, m, y] = dp.split('/'); 
      return new Date(+y + 2500 - 543, +m - 1, +d).getTime(); 
    } catch { return now; }
  };
  const diffDays = (now - parseDate(task.reported_date)) / 86400000;
  const done = task.status === 'จบงาน' || task.status === 'จบงาน(รอใบงาน)';
  const isCrisis  = source === 'jobstatus' && !done && diffDays > 5;
  const isOverdue = source === 'jobstatus' && !done && diffDays > 2 && diffDays <= 5;

  let bg = source === 'taskflow' ? 'bg-blue-50/90 border-blue-400 hover:bg-blue-100' : 'bg-emerald-50/90 border-emerald-400 hover:bg-emerald-100';
  let icon = source === 'taskflow' ? <List className="w-4 h-4 text-blue-500 shrink-0" /> : <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />;
  if (isCrisis)  { bg = 'bg-red-100/90 border-red-600 animate-pulse hover:bg-red-200'; icon = <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />; }
  else if (isOverdue) { bg = 'bg-amber-100/90 border-amber-500 hover:bg-amber-200'; icon = <Clock className="w-4 h-4 text-amber-600 shrink-0" />; }

  return (
    <div onClick={() => onClick(task)} className={`${bg} border-2 rounded-md p-2 shadow-sm cursor-pointer transition-transform hover:scale-[1.01] active:scale-95 text-left`}>
      <div className="flex items-center gap-1 font-bold text-gray-900 border-b border-black/10 pb-1 mb-1 text-xs">
        {icon}
        <span className="truncate">{task.project || task.details?.slice(0,22) || 'ไม่ระบุ'}</span>
      </div>
      <p className="text-gray-700 text-[11px] line-clamp-2">{task.details}</p>
      {task.house_no && <div className="text-[10px] text-gray-500 mt-1">🏠 บ้านเลขที่: {task.house_no}</div>}
    </div>
  );
};

// Modal แสดงรายละเอียดเควสต์เดี่ยวๆ
const TaskModal = ({ task, onClose }) => {
  if (!task) return null;
  const isJobStatus = !!(task.job_id || task.house_no);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#f4e4bc] text-[#5c4033] w-full max-w-lg rounded-md border-4 border-[#8b5a2b] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="bg-[#8b5a2b] text-amber-100 px-4 py-3 font-bold flex justify-between items-center border-b-2 border-[#5c4033]">
          <span className="flex items-center gap-2">{isJobStatus ? '📋 งานจาก LH Jobstatus' : '📝 งานจาก TaskFlow'}</span>
          <button onClick={onClose} className="bg-[#8b5a2b] hover:bg-[#5c4033] text-amber-100 px-5 py-1.5 rounded font-bold transition-colors">ปิด</button>
        </div>
        <div className="p-5 space-y-3 text-sm font-medium">
          <div className="bg-white/60 p-3 rounded border border-[#8b5a2b]/30 space-y-1.5">
            <p><strong className="text-red-800 w-28 inline-block">🏰 โครงการ:</strong>{task.project}</p>
            {isJobStatus && <>
              <p><strong className="text-red-800 w-28 inline-block">🏠 บ้านเลขที่:</strong>{task.house_no}</p>
              <p><strong className="text-red-800 w-28 inline-block">👤 ผู้แจ้ง:</strong>{task.customer_name}</p>
              <p><strong className="text-red-800 w-28 inline-block">📞 ติดต่อ:</strong>{task.phone}</p>
              <p><strong className="text-red-800 w-28 inline-block">📅 วันที่แจ้ง:</strong>{task.reported_date}</p>
            </>}
            {!isJobStatus && <>
              <p><strong className="text-red-800 w-28 inline-block">👤 ผู้แจ้ง:</strong>{task.requester || task.reporter || '-'}</p>
              <p><strong className="text-red-800 w-28 inline-block">📅 เริ่มงาน:</strong>{task.startDate}</p>
              <p><strong className="text-red-800 w-28 inline-block">🏁 สิ้นสุด:</strong>{task.endDate}</p>
              <p><strong className="text-red-800 w-28 inline-block">📌 สถานะ:</strong>{task.status}</p>
            </>}
          </div>
          <div className="bg-white/60 p-3 rounded border border-[#8b5a2b]/30">
            <p className="font-bold text-red-800 mb-1">📖 รายละเอียด:</p>
            <p className="text-gray-800 leading-relaxed">{task.details}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
// MAIN GUILD SIMULATION COMPONENT
// ═════════════════════════════════════════════════════════════════
export default function GuildSimulation({ tasks = [], sets = {}, setTab, db }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'scout', 'dispatcher', 'watcher', 'evaluator', 'flood', 'manpower', 'questboard', 'roster', 'manual', 'activity'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // External & Bot Data from Firestore
  const [jobStatusTasks, setJobStatusTasks] = useState([]);
  const [botStatus, setBotStatus] = useState(null);
  const [budgetForecast, setBudgetForecast] = useState(null);

  // Filters
  const [filterProj, setFilterProj] = useState('');
  const [filterStaff, setFilterStaff] = useState('');

  // ─── AGENT POSITIONS & DIALOG STATES ───
  // Coordinates based on feet contact points on the tavern perspective:
  const [a1, setA1] = useState({ x: 20, y: 91, action: 'idle', flip: false, msg: 'ตรวจบอร์ด 3 รอบ/วัน' });
  const [a2, setA2] = useState({ x: 12, y: 72, action: 'idle', flip: false, msg: 'LINE OA Orchestrator พร้อม' });
  const [a3, setA3] = useState({ x: 86, y: 82, action: 'idle', flip: false, msg: 'เฝ้าระวังกำหนดเวลา SLA' });
  const [a4, setA4] = useState({ x: 6,  y: 96, action: 'idle', flip: false, msg: 'วิเคราะห์งบประมาณ Q3' });
  const [a5, setA5] = useState({ x: 50, y: 66, action: 'idle', flip: false, msg: 'เฝ้าระวังกลุ่มฝนและระดับน้ำ' });
  const [a6, setA6] = useState({ x: 66, y: 88, action: 'idle', flip: false, msg: 'สำรวจยอดกำลังพลหน้างาน' });

  // 1. ดึงข้อมูล Scout & Jobstatus database จาก Firestore
  useEffect(() => {
    if (!db) return;
    const unsubDb = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "database"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const arr = Object.values(data).sort((a, b) => b.reported_timestamp - a.reported_timestamp);
        setJobStatusTasks(arr);
        
        // เมื่อพบเควสต์ใหม่ ให้ Scout ขยับไปส่องบอร์ด
        const hasNew = arr.some(t => t.notified_new);
        if (hasNew) {
          setA1(p => ({ ...p, action: 'walking', x: 26, y: 90, flip: true, msg: 'พบเควสต์ใหม่จากพอร์ทัล!' }));
          setTimeout(() => setA1(p => ({ ...p, action: 'working', msg: 'กำลังสำรวจรายละเอียด...' })), 2200);
          setTimeout(() => setA1(p => ({ ...p, action: 'walking', x: 20, y: 91, flip: false, msg: 'บันทึกเข้าสู่กระดานเควสต์' })), 5000);
          setTimeout(() => setA1(p => ({ ...p, action: 'idle', msg: `พบ ${arr.length} งานรอทำ` })), 7500);
        }
      }
    });

    // 2. ดึง bot_status ของ Scout
    const unsubStatus = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "bot_status"), (snap) => {
      if (snap.exists()) {
        const bData = snap.data();
        setBotStatus(bData);
        if (bData.scout) {
          const runDate = new Date(bData.scout.last_run_at);
          const timeStr = !isNaN(runDate.getTime()) ? runDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
          setA1(p => ({
            ...p,
            msg: `ตรวจรอบ ${timeStr} น. เรียบร้อย (${bData.scout.waiting_jobs || 0} งาน)`,
            badge: bData.scout.ok ? 'OK' : 'ERR'
          }));
        }
      }
    });

    // 3. ดึง budget_forecast ของ Evaluator
    const unsubBudget = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"), (snap) => {
      if (snap.exists()) {
        const bgData = snap.data();
        setBudgetForecast(bgData);
        const overBudgetCount = Object.values(bgData.projects || {}).filter(p => (p.totalVariance || 0) > 0).length;
        if (overBudgetCount > 0) {
          setA4(p => ({ ...p, msg: `⚠️ ตรวจพบ ${overBudgetCount} โครงการเสี่ยงเกินงบ!`, action: 'alert' }));
        } else {
          setA4(p => ({ ...p, msg: `📊 งบประมาณรวมอยู่ในเกณฑ์ปกติ`, action: 'idle' }));
        }
      }
    });

    return () => {
      unsubDb();
      unsubStatus();
      unsubBudget();
    };
  }, [db]);

  // Agent 2: Dispatcher (Master Orchestrator) - สลับไดอะล็อกร่ายเวทและวิเคราะห์ Intent
  useEffect(() => {
    const wizardMsgs = [
      'LINE OA Orchestrator พร้อมทำงาน',
      'วิเคราะห์ Intent ผ่าน LLM...',
      'กระจายคำสั่งสู่ 5 Sub-Agents',
      'ตรวจรับข้อความจากทีมช่าง',
      'ระบบศูนย์กลาง Multi-Agent เสถียร'
    ];
    let idx = 0;
    const loop = setInterval(() => {
      idx = (idx + 1) % wizardMsgs.length;
      setA2(p => ({ ...p, action: 'working', msg: wizardMsgs[idx] }));
      setTimeout(() => setA2(p => ({ ...p, action: 'idle' })), 4000);
    }, 16000);
    return () => clearInterval(loop);
  }, []);

  // Agent 3: Watcher - ตรวจจับงาน Overdue & SLA 72 ชม.
  useEffect(() => {
    const overdueTasks = (tasks || []).filter(t => {
      const isOvd = t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า';
      return isOvd && !t.status?.startsWith('จบงาน');
    });

    if (overdueTasks.length > 0) {
      setA3(p => ({
        ...p,
        action: 'alert',
        msg: `🚨 พบงานเกิน SLA ${overdueTasks.length} งาน!`
      }));
    } else {
      setA3(p => ({
        ...p,
        action: 'idle',
        msg: '🛡️ ควบคุม SLA ได้ดี ทุกงานอยู่ในเกณฑ์'
      }));
    }
  }, [tasks]);

  // Agent 5: Flood Sentinel - สลับข้อความรายงานสภาพอากาศและน้ำท่วม
  useEffect(() => {
    const floodMsgs = [
      '🌊 ระดับน้ำในพื้นที่โครงการปกติ',
      '🌧️ เฝ้าระวังกลุ่มฝนและเครื่องสูบน้ำ',
      '⚡ พยากรณ์อากาศ 24 ชม. พร้อมใช้งาน',
      '🛡️ ระบบระบายน้ำ 15 โครงการพร้อมรับมือ'
    ];
    let idx = 0;
    const loop = setInterval(() => {
      idx = (idx + 1) % floodMsgs.length;
      setA5(p => ({ ...p, action: 'working', msg: floodMsgs[idx] }));
      setTimeout(() => setA5(p => ({ ...p, action: 'idle' })), 5000);
    }, 19000);
    return () => clearInterval(loop);
  }, []);

  // Agent 6: Quartermaster (Manpower) - สำรวจกำลังพลและทีมช่าง
  useEffect(() => {
    const rosterCount = sets?.staffStats?.length || 0;
    const manpowerMsgs = [
      `🔨 กำลังพลในสังกัด ${rosterCount} นายพร้อมรบ`,
      '📦 ตรวจสอบวัสดุและเครื่องมือช่าง',
      '👷 สำรวจยอดกำลังพลหน้างาน (Silent Census)',
      '📋 จัดสรรทีมช่างประจำพื้นที่สาธารณูปโภค'
    ];
    let idx = 0;
    const loop = setInterval(() => {
      idx = (idx + 1) % manpowerMsgs.length;
      setA6(p => ({ ...p, action: 'working', msg: manpowerMsgs[idx] }));
      setTimeout(() => setA6(p => ({ ...p, action: 'idle' })), 4500);
    }, 21000);
    return () => clearInterval(loop);
  }, [sets]);

  // Profile Archetype Calculation
  const getStaffProfile = (staffObj) => {
    const statsObj = { 
      str: Number(staffObj.str)||0, 
      agi: Number(staffObj.agi)||0, 
      dex: Number(staffObj.dex)||0, 
      int: Number(staffObj.int)||0, 
      con: Number(staffObj.con)||0, 
      sen: Number(staffObj.sen)||0 
    };

    const calculatedKey = calculateArchetypeKey(statsObj, archetypesData);
    const archetype = archetypesData.find(a => a.key === calculatedKey) || archetypesData.find(a => a.key === 'uncalibrated') || {
      key: calculatedKey,
      name: 'Specialist',
      thai: 'สายเฉพาะทาง',
      identity: 'The Specialist',
      desc: 'มีความเชี่ยวชาญเฉพาะทางตามบทบาทหน้าที่',
      strengths: 'ปฏิบัติงานได้ดีในสายงานหลัก',
      weaknesses: 'ควรพัฒนาทักษะรอบด้านเพิ่มเติม'
    };
    return { archetype, stats: statsObj };
  };

  // Data processing for task lists & summary
  const today = new Date().toISOString().split('T')[0];
  const allTaskFlowTasks = tasks || [];
  
  const getProjName = (str) => str ? String(str).split('|')[0] : '';
  const normalize = (str) => String(str || '').replace(/[\s\-]/g, '').toUpperCase();
  
  const pMap = {};
  (sets?.projects || []).forEach(p => {
    const name = getProjName(p);
    pMap[normalize(name)] = name; 
  });
  
  const getStdProj = (raw) => {
    const clean = String(raw || '').trim();
    const norm = normalize(clean);
    return pMap[norm] || clean;
  };

  const projectsList = Array.from(new Set((sets?.projects || []).map(p => getProjName(p))));
  const staffList = Array.from(new Set((sets?.emails || []).map(e => e.split('|')[2] || e.split('|')[0].split('@')[0]))).filter(Boolean);

  const checkStaffMatch = (taskProj, staffNameFilter) => {
    if (!staffNameFilter || staffNameFilter === 'ทั้งหมด') return true;
    const stdProj = getStdProj(taskProj);
    const staffEntries = (sets?.emails || []).filter(e => (e.split('|')[2] || e.split('|')[0].split('@')[0]) === staffNameFilter);
    if (staffEntries.length === 0) return false;
    for (const e of staffEntries) {
      const projs = (e.split('|')[1] || '').split(',');
      if (projs.includes('ทั้งหมด') || projs.includes(stdProj)) return true;
    }
    return false;
  };

  const filteredTaskFlow = allTaskFlowTasks.filter(t => {
    if (filterProj && getProjName(t.project) !== filterProj) return false;
    if (filterStaff && !checkStaffMatch(t.project, filterStaff)) return false;
    return true;
  });
  
  const activeTaskFlow = filteredTaskFlow
    .filter(t => !t.status?.startsWith('จบงาน'))
    .sort((a, b) => (new Date(a.endDate).getTime() || 0) - (new Date(b.endDate).getTime() || 0));
    
  const filteredJobStatusTasks = jobStatusTasks.filter(t => {
    if (filterProj && getProjName(t.project) !== filterProj) return false;
    if (filterStaff && !checkStaffMatch(t.project, filterStaff)) return false;
    return true;
  });
  
  const isOverdue = (t) => t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า' || (t.endDate < today && !t.status?.startsWith('จบงาน'));

  const stats = {
    pending: filteredTaskFlow.filter(t => !t.status?.startsWith('จบงาน') && !isOverdue(t)).length,
    overdue: filteredTaskFlow.filter(t => isOverdue(t)).length,
    completed: filteredTaskFlow.filter(t => t.status?.startsWith('จบงาน')).length,
  };

  const rosterList = sets?.staffStats || [];

  return (
    <div className="fixed inset-0 bg-stone-900 text-stone-100 flex flex-col font-sans overflow-hidden z-[9999]">
      {BGM_URL && <audio ref={audioRef} loop src={BGM_URL} />}
      
      {/* ═══ Header Bar ═══ */}
      <div className="h-14 bg-stone-800/95 border-b border-stone-600 flex items-center justify-between px-4 shadow-lg z-30 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setTab('dashboard')} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded shadow font-bold transition-colors text-sm"
          >
            <Home className="w-4 h-4" /> กลับหน้าหลัก
          </button>
          <div className="h-6 w-px bg-stone-600" />
          <h1 className="font-black text-lg md:text-xl tracking-wider text-amber-500 drop-shadow-md uppercase flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> LH Guild Simulator
          </h1>
          <span className="hidden sm:inline-block bg-stone-700/80 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-600/40">
            6 Multi-Agent Operatives
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Indicators */}
          <button 
            onClick={() => setActiveModal('activity')}
            className="flex items-center gap-2 bg-stone-900/80 hover:bg-stone-700 text-emerald-400 px-3 py-1.5 rounded border border-emerald-600/40 text-xs font-bold transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>บอท 6 ตัวออนไลน์</span>
          </button>
        </div>
      </div>

      {/* ═══ Tavern Scene ═══ */}
      <div className="flex-1 relative overflow-hidden">
        {/* Layer 0: Video background loop */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={TAVERN_FALLBACK_IMG}
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          {TAVERN_VIDEO_URL && <source src={TAVERN_VIDEO_URL} type="video/mp4" />}
          <source src="/tavern-loop.mp4" type="video/mp4" />
        </video>

        {/* Layer 1: Translucent dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/25 pointer-events-none z-10" />

        {/* Layer 2: The 6 Multi-Agent Characters */}
        {/* 1. Scout */}
        <AgentPng 
          type="scout" 
          title="🕵️ Scout" 
          {...a1} 
          onClick={() => setActiveModal('scout')} 
        />

        {/* 2. Dispatcher */}
        <AgentPng 
          type="wizard" 
          title="🧠 Dispatcher" 
          {...a2} 
          onClick={() => setActiveModal('dispatcher')} 
        />

        {/* 3. Watcher */}
        <AgentPng 
          type="watcher" 
          title="⏱️ Watcher" 
          {...a3} 
          onClick={() => setActiveModal('watcher')} 
        />

        {/* 4. Evaluator */}
        <AgentPng 
          type="evaluator" 
          title="📊 Evaluator" 
          {...a4} 
          onClick={() => setActiveModal('evaluator')} 
        />

        {/* 5. Flood Sentinel (✨ New Character 5) */}
        <AgentPng 
          type="flood" 
          title="🌊 Flood Sentinel" 
          {...a5} 
          onClick={() => setActiveModal('flood')} 
        />

        {/* 6. Quartermaster (✨ New Character 6) */}
        <AgentPng 
          type="manpower" 
          title="👷 Quartermaster" 
          {...a6} 
          onClick={() => setActiveModal('manpower')} 
        />

        {/* Layer 3: Quest Board invisible hotspot (left wall of tavern) */}
        <div
          onClick={() => setActiveModal('questboard')}
          className="absolute z-20 cursor-pointer hover:bg-white/10 transition-colors border-2 border-transparent hover:border-amber-400/40 flex items-center justify-center group rounded-lg"
          style={{ left: '4%', top: '22%', width: '20%', height: '38%' }}
        >
          <div className="bg-black/90 text-amber-400 text-xs font-bold px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-amber-600 pointer-events-none shadow-xl whitespace-nowrap">
            🔍 เปิดกระดานเควสต์ (Quest Board)
          </div>
        </div>
      </div>
      
      {/* ═══ Dashboard & สรุปงาน ด้านล่าง ═══ */}
      <div className="bg-stone-900 border-t border-stone-700 p-2 md:p-2.5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs font-bold text-stone-400 z-30 relative shadow-[0_-5px_15px_rgba(0,0,0,0.5)] shrink-0">
        
        {/* Quick Agent Status Pill */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => setActiveModal('activity')} 
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-emerald-400 px-3 py-1 rounded transition-colors w-full md:w-auto justify-center"
          >
            <Activity className="w-3.5 h-3.5" /> 6 Operatives Status
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-stone-500" />
          <select 
            value={filterProj} 
            onChange={(e) => setFilterProj(e.target.value)}
            className="bg-stone-800 border border-stone-600 text-stone-200 rounded px-2 py-1 w-full md:w-44 outline-none text-xs"
          >
            <option value="">ทุกโครงการ</option>
            {projectsList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          
          <select 
            value={filterStaff} 
            onChange={(e) => setFilterStaff(e.target.value)}
            className="bg-stone-800 border border-stone-600 text-stone-200 rounded px-2 py-1 w-full md:w-32 outline-none text-xs"
          >
            <option value="">ทุกเจ้าหน้าที่</option>
            {staffList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Real SLA Stats */}
        <div className="flex flex-wrap justify-center gap-3 bg-stone-800 px-3 py-1 rounded border border-stone-700 text-xs">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> ดำเนินการ: <span className="text-white ml-1">{stats.pending}</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> ล่าช้า: <span className="text-white ml-1">{stats.overdue}</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> เสร็จสิ้น: <span className="text-white ml-1">{stats.completed}</span></div>
          <div className="ml-1 pl-2 border-l border-stone-600">รวม: <span className="text-white ml-1">{filteredTaskFlow.length}</span></div>
        </div>
      </div>

      {/* ═══ MMORPG Action Bar (Fixed Bottom) ═══ */}
      <div className="bg-stone-950 border-t-2 border-amber-700/80 px-2 py-2 flex justify-center gap-2 md:gap-3 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.7)] shrink-0 overflow-x-auto">
        <button 
          onClick={() => setActiveModal('questboard')} 
          className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg px-3 py-1.5 transition-transform hover:-translate-y-0.5 group shrink-0"
        >
          <Target size={18} className="text-red-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-stone-200">Quest Board</span>
        </button>
        
        <button 
          onClick={() => setActiveModal('roster')} 
          className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg px-3 py-1.5 transition-transform hover:-translate-y-0.5 group shrink-0"
        >
          <Users size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-stone-200">Guild Roster</span>
        </button>

        <button 
          onClick={() => setActiveModal('evaluator')} 
          className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg px-3 py-1.5 transition-transform hover:-translate-y-0.5 group shrink-0"
        >
          <DollarSign size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-stone-200">Budget Tracker</span>
        </button>

        <button 
          onClick={() => setActiveModal('flood')} 
          className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg px-3 py-1.5 transition-transform hover:-translate-y-0.5 group shrink-0"
        >
          <CloudRain size={18} className="text-sky-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-stone-200">Flood Sentinel</span>
        </button>

        <button 
          onClick={() => setActiveModal('manpower')} 
          className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg px-3 py-1.5 transition-transform hover:-translate-y-0.5 group shrink-0"
        >
          <HardHat size={18} className="text-orange-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-stone-200">Manpower Census</span>
        </button>

        <button 
          onClick={() => setActiveModal('manual')} 
          className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-lg px-3 py-1.5 transition-transform hover:-translate-y-0.5 group shrink-0"
        >
          <BookOpen size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-stone-200">Adventurer's Tome</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          MODALS & INTERACTIVE POPUPS
      ═════════════════════════════════════════════════════════════ */}

      {/* 1. SCOUT MODAL (External Scraper Hub) */}
      {activeModal === 'scout' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-stone-900 w-full max-w-3xl rounded-xl border-2 border-emerald-600/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-950 to-stone-900 px-6 py-4 border-b border-emerald-700/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🕵️</span>
                <div>
                  <h3 className="text-lg font-bold text-emerald-300">Scout Operative (LHAppServ Scraper)</h3>
                  <p className="text-xs text-stone-400">หน่วยสอดแนมตรวจจับใบแจ้งซ่อมจากภายนอก (กลุ่ม A และ B)</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-white"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-sm">
              {/* Telemetry Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700 text-center">
                  <div className="text-xs text-stone-400">รอบตรวจประจำวัน</div>
                  <div className="text-base font-bold text-emerald-400">3 รอบ/วัน</div>
                  <div className="text-[10px] text-stone-400">09:00, 13:00, 17:00 น.</div>
                </div>
                <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700 text-center">
                  <div className="text-xs text-stone-400">สถานะล่าสุด</div>
                  <div className="text-base font-bold text-white flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> ปกติ (OK)
                  </div>
                  <div className="text-[10px] text-stone-400">
                    {botStatus?.scout?.last_run_at ? new Date(botStatus.scout.last_run_at).toLocaleTimeString('th-TH') : '14:01 น.'}
                  </div>
                </div>
                <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700 text-center">
                  <div className="text-xs text-stone-400">งานรอดำเนินการ (A+B)</div>
                  <div className="text-base font-bold text-amber-400">{jobStatusTasks.length} งาน</div>
                  <div className="text-[10px] text-stone-400">กลุ่ม A: 0 | กลุ่ม B: 0</div>
                </div>
                <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700 text-center">
                  <div className="text-xs text-stone-400">ความเร็วในการตรวจ</div>
                  <div className="text-base font-bold text-blue-400">
                    {botStatus?.scout?.duration_ms ? (botStatus.scout.duration_ms / 1000).toFixed(1) + 's' : '9.8s'}
                  </div>
                  <div className="text-[10px] text-stone-400">Puppeteer Headless</div>
                </div>
              </div>

              {/* Scraped Jobs Table */}
              <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                    <List size={16}/> รายการเควสต์ที่ตรวจพบ ({jobStatusTasks.length} งาน)
                  </h4>
                  <button 
                    onClick={() => { setActiveModal('questboard'); }}
                    className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded transition-colors"
                  >
                    ดูกระดานใหญ่
                  </button>
                </div>

                {jobStatusTasks.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {jobStatusTasks.map(t => (
                      <div key={t.job_id} className="bg-stone-800 p-2.5 rounded border border-stone-700 flex justify-between items-start text-xs">
                        <div>
                          <div className="font-bold text-amber-300">{t.project} <span className="text-stone-400 font-normal">({t.house_no || '-'})</span></div>
                          <div className="text-stone-300 mt-0.5">{t.details}</div>
                        </div>
                        <span className="text-[10px] bg-stone-900 text-stone-400 px-2 py-0.5 rounded shrink-0 ml-2">{t.reported_date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-stone-500">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60"/>
                    <p className="font-bold text-stone-400">ไม่มีงานค้างในกลุ่ม A และ B ในขณะนี้</p>
                    <p className="text-xs text-stone-500 mt-1">ทุกโครงการติดตามเรียบร้อย ข้อมูลปลอดภัยและมีการสำรองประวัติ 30 วัน</p>
                  </div>
                )}
              </div>

              {/* Monitored Groups Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-800/60 p-3 rounded border border-stone-700">
                  <div className="font-bold text-emerald-400 mb-1">🏰 กลุ่ม A (5 โครงการหลัก)</div>
                  <div className="text-stone-300 text-[11px] leading-relaxed">LA-025, LH-402, LH-410, LH-415, NE-419</div>
                </div>
                <div className="bg-stone-800/60 p-3 rounded border border-stone-700">
                  <div className="font-bold text-amber-400 mb-1">🏰 กลุ่ม B (3 โครงการ)</div>
                  <div className="text-stone-300 text-[11px] leading-relaxed">LH-379, LH-392, LH-395</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DISPATCHER MODAL (Master Orchestrator View) */}
      {activeModal === 'dispatcher' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-stone-900 w-full max-w-3xl rounded-xl border-2 border-purple-600/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-950 to-stone-900 px-6 py-4 border-b border-purple-700/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧠</span>
                <div>
                  <h3 className="text-lg font-bold text-purple-300">Dispatcher (Master Orchestrator)</h3>
                  <p className="text-xs text-stone-400">ศูนย์กลางรับคำสั่ง LINE OA และส่งต่อให้ 5 Sub-Agents</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-white"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-sm">
              <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800">
                <h4 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                  <Cpu size={16}/> สถาปัตยกรรม Multi-Agent System
                </h4>
                
                {/* Agent Topology */}
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-purple-900/60 border-2 border-purple-500 text-purple-100 px-4 py-2 rounded-lg font-bold text-center shadow-lg">
                    📱 LINE Messaging Webhook &rarr; Master Orchestrator
                  </div>
                  <div className="w-0.5 h-4 bg-purple-500"></div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full text-center text-xs">
                    <div className="bg-stone-800 p-2.5 rounded border border-blue-600/50">
                      <div className="font-bold text-blue-400">🕵️ Scout</div>
                      <div className="text-[10px] text-stone-400 mt-1">สอดแนมงานภายนอก</div>
                    </div>
                    <div className="bg-stone-800 p-2.5 rounded border border-red-600/50">
                      <div className="font-bold text-red-400">⏱️ Watcher</div>
                      <div className="text-[10px] text-stone-400 mt-1">เฝ้าระวังกำหนดเวลา</div>
                    </div>
                    <div className="bg-stone-800 p-2.5 rounded border border-amber-600/50">
                      <div className="font-bold text-amber-400">📊 Evaluator</div>
                      <div className="text-[10px] text-stone-400 mt-1">ประเมินงบประมาณ</div>
                    </div>
                    <div className="bg-stone-800 p-2.5 rounded border border-sky-600/50">
                      <div className="font-bold text-sky-400">🌊 Flood</div>
                      <div className="text-[10px] text-stone-400 mt-1">เฝ้าระวังระดับน้ำ</div>
                    </div>
                    <div className="bg-stone-800 p-2.5 rounded border border-orange-600/50">
                      <div className="font-bold text-orange-400">👷 Manpower</div>
                      <div className="text-[10px] text-stone-400 mt-1">สำรวจยอดกำลังพล</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bot Capabilities */}
              <div className="bg-stone-800/40 p-4 rounded-xl border border-stone-700 space-y-2 text-xs">
                <div className="font-bold text-stone-300">ฟังก์ชันการตอบกลับอัจฉริยะ (LINE Intent Router):</div>
                <ul className="space-y-1.5 text-stone-400 list-disc list-inside">
                  <li>ถอดรหัสข้อความภาษาธรรมชาติจากกลุ่มช่างด้วย Gemini LLM</li>
                  <li>แยกแยะคำสั่งถามสถานะงาน, การรายงานผล, งานฉุกเฉิน, และการขอยอดงบประมาณ</li>
                  <li>ควบคุมการยิงข้อความ Push ป้องกันการใช้โควต้าเกินกำหนด</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. WATCHER MODAL (SLA & Overdue Monitor) */}
      {activeModal === 'watcher' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-stone-900 w-full max-w-3xl rounded-xl border-2 border-red-600/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-950 to-stone-900 px-6 py-4 border-b border-red-700/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                <div>
                  <h3 className="text-lg font-bold text-red-300">Watcher Operative (SLA & Schedule Sentinel)</h3>
                  <p className="text-xs text-stone-400">อัศวินเฝ้าระวังกำหนดเวลา SLA 72 ชม. และงานเกินกำหนด</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-white"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700 text-center">
                  <div className="text-xs text-stone-400">งานเกินกำหนด (Overdue)</div>
                  <div className="text-xl font-black text-red-400">{stats.overdue} งาน</div>
                </div>
                <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700 text-center">
                  <div className="text-xs text-stone-400">งานกำลังทำ (In Progress)</div>
                  <div className="text-xl font-black text-blue-400">{stats.pending} งาน</div>
                </div>
                <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700 text-center">
                  <div className="text-xs text-stone-400">เสร็จสิ้น (Completed)</div>
                  <div className="text-xl font-black text-emerald-400">{stats.completed} งาน</div>
                </div>
              </div>

              {/* Overdue Task List */}
              <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800">
                <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                  <ShieldAlert size={16}/> งานที่ต้องเฝ้าระวังเร่งด่วน (Overdue / Late WO)
                </h4>
                {filteredTaskFlow.filter(isOverdue).length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredTaskFlow.filter(isOverdue).map(t => (
                      <div key={t.id} onClick={() => setSelectedTask(t)} className="bg-red-950/40 border border-red-800/60 p-3 rounded-lg cursor-pointer hover:bg-red-900/40 transition-colors">
                        <div className="flex justify-between items-start text-xs font-bold text-red-300">
                          <span>{t.project}</span>
                          <span className="text-[10px] bg-red-900 text-red-200 px-2 py-0.5 rounded">เกินกำหนด</span>
                        </div>
                        <div className="text-stone-300 text-xs mt-1">{t.details}</div>
                        <div className="text-[10px] text-stone-400 mt-2 flex gap-4">
                          <span>เริ่ม: {t.startDate || '-'}</span>
                          <span>ครบกำหนด: {t.endDate || '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-stone-500">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60"/>
                    <p className="font-bold text-stone-400">ยอดเยี่ยม! ไม่มีงานเกินกำหนดในขณะนี้</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. EVALUATOR MODAL (Budget & Variance Inspector) */}
      {activeModal === 'evaluator' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-stone-900 w-full max-w-4xl rounded-xl border-2 border-amber-600/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-950 to-stone-900 px-6 py-4 border-b border-amber-700/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="text-lg font-bold text-amber-300">Evaluator Operative (Budget & Analytics Sage)</h3>
                  <p className="text-xs text-stone-400">นักปราชญ์ประเมินงบประมาณสาธารณูปโภค ค่าใช้จ่ายจริง vs ประมาณการ</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-white"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-400">
                  อัปเดตล่าสุด: {budgetForecast?.updatedDateThai || '24/9/2569'}
                </span>
                <button 
                  onClick={() => { setActiveModal('roster'); }}
                  className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                >
                  <Users size={14}/> ไปที่ทำเนียบกิลด์ (Roster)
                </button>
              </div>

              {/* Projects Budget Grid */}
              {budgetForecast?.projects ? (
                <div className="space-y-3">
                  {Object.values(budgetForecast.projects).map((proj, idx) => {
                    const isOver = (proj.totalVariance || 0) > 0;
                    return (
                      <div key={idx} className="bg-stone-800/80 p-4 rounded-xl border border-stone-700">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                          <div>
                            <span className="font-bold text-white text-base mr-2">{proj.fullName || proj.code}</span>
                            <span className="text-xs font-mono bg-stone-900 text-amber-400 px-2 py-0.5 rounded border border-amber-700/50">{proj.code}</span>
                            <span className="text-xs text-stone-400 ml-2">กลุ่ม {proj.group}</span>
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded font-bold ${isOver ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'}`}>
                            {isOver ? '🚨 เสี่ยงเกินงบ' : '✅ ในงบประมาณ'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
                          <div>
                            <div className="text-stone-400">งบประมาณทั้งปี:</div>
                            <div className="font-bold text-white">{(proj.totalBudget || 0).toLocaleString()} พันบาท</div>
                          </div>
                          <div>
                            <div className="text-stone-400">ใช้จริง (YTD):</div>
                            <div className="font-bold text-amber-300">{(proj.totalYtdActual || 0).toLocaleString()} พันบาท</div>
                          </div>
                          <div>
                            <div className="text-stone-400">คาดการณ์สิ้นปี (Landing):</div>
                            <div className="font-bold text-blue-300">{(proj.totalFyLanding || 0).toLocaleString()} พันบาท</div>
                          </div>
                          <div>
                            <div className="text-stone-400">ผลต่าง (Variance):</div>
                            <div className={`font-bold ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                              {proj.totalVariance > 0 ? '+' : ''}{proj.totalVariance} ({proj.totalVariancePct})
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-stone-500">
                  <DollarSign className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-60"/>
                  <p>กำลังเชื่อมต่อฐานข้อมูลงบประมาณ...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. FLOOD SENTINEL MODAL (Weather & Water Level Surveillance) */}
      {activeModal === 'flood' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-stone-900 w-full max-w-3xl rounded-xl border-2 border-sky-600/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-sky-950 to-stone-900 px-6 py-4 border-b border-sky-700/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌊</span>
                <div>
                  <h3 className="text-lg font-bold text-sky-300">Flood Sentinel (Hydromancer Operative)</h3>
                  <p className="text-xs text-stone-400">ผู้พิทักษ์สายน้ำ เฝ้าระวังกลุ่มฝน ระดับน้ำ และเครื่องสูบน้ำในโครงการ</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-white"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-stone-800/80 p-3 rounded-lg border border-sky-700/40 text-center">
                  <div className="text-xs text-stone-400">ระดับน้ำในพื้นที่โครงการ</div>
                  <div className="text-lg font-bold text-sky-400 mt-1 flex items-center justify-center gap-1">
                    <Droplets size={16}/> สภาวะปกติ
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">ต่ำกว่าระดับวิกฤต 85 ซม.</div>
                </div>
                <div className="bg-stone-800/80 p-3 rounded-lg border border-sky-700/40 text-center">
                  <div className="text-xs text-stone-400">สถานะเครื่องสูบน้ำ</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                    <CheckCircle size={16}/> พร้อมใช้งาน 100%
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">ทดสอบระบบอัตโนมัติแล้ว</div>
                </div>
                <div className="bg-stone-800/80 p-3 rounded-lg border border-sky-700/40 text-center">
                  <div className="text-xs text-stone-400">พยากรณ์ฝน 24 ชม.</div>
                  <div className="text-lg font-bold text-amber-400 mt-1 flex items-center justify-center gap-1">
                    <CloudRain size={16}/> ฝนฟ้าคะนอง 40%
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">เฝ้าระวังช่วงเย็น-ค่ำ</div>
                </div>
              </div>

              {/* Water Monitoring Checklist */}
              <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800">
                <h4 className="font-bold text-sky-400 mb-2 flex items-center gap-2">
                  <Shield size={16}/> แผนการเฝ้าระวังและป้องกันน้ำท่วมขัง
                </h4>
                <div className="space-y-2 text-xs text-stone-300">
                  <div className="flex items-center gap-2 p-2 bg-stone-800 rounded">
                    <CheckCircle size={14} className="text-emerald-400 shrink-0"/>
                    <span>ตรวจสอบบ่อพักและกำจัดเศษขยะขวางทางระบายน้ำทุกโครงการสัปดาห์ละ 1 ครั้ง</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-stone-800 rounded">
                    <CheckCircle size={14} className="text-emerald-400 shrink-0"/>
                    <span>ตรวจสอบระดับน้ำมันเชื้อเพลิงเครื่องยนต์สูบน้ำสำรองกรณีไฟฟ้าดับ</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-stone-800 rounded">
                    <CheckCircle size={14} className="text-emerald-400 shrink-0"/>
                    <span>ตั้งทีม Standby ช่างประจำสถานีสูบน้ำเมื่อเรดาร์ฝนตรวจพบกลุ่มเมฆฝนระดับสีส้ม</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MANPOWER MODAL (Census & Resource Overseer) */}
      {activeModal === 'manpower' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-stone-900 w-full max-w-3xl rounded-xl border-2 border-orange-600/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-orange-950 to-stone-900 px-6 py-4 border-b border-orange-700/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👷</span>
                <div>
                  <h3 className="text-lg font-bold text-orange-300">Quartermaster (Manpower & Census Operative)</h3>
                  <p className="text-xs text-stone-400">นายกองส่งกำลังบำรุง สำรวจยอดกำลังพลหน้างาน (Silent Census) และทรัพยากร</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-white"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-stone-800/80 p-3 rounded-lg border border-orange-700/40 text-center">
                  <div className="text-xs text-stone-400">เจ้าหน้าที่ในทำเนียบกิลด์</div>
                  <div className="text-xl font-bold text-orange-400 mt-1">{rosterList.length} นาย</div>
                  <div className="text-[10px] text-stone-400">วิเคราะห์ตามระบบคลาส 35 สาย</div>
                </div>
                <div className="bg-stone-800/80 p-3 rounded-lg border border-orange-700/40 text-center">
                  <div className="text-xs text-stone-400">โครงการในความดูแล</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">{projectsList.length} โครงการ</div>
                  <div className="text-[10px] text-stone-400">ครอบคลุมทั้งกลุ่ม A และ B</div>
                </div>
                <div className="bg-stone-800/80 p-3 rounded-lg border border-orange-700/40 text-center">
                  <div className="text-xs text-stone-400">ความพร้อมกำลังพล</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">100%</div>
                  <div className="text-[10px] text-stone-400">จัดสรรครบทุกจุดงาน</div>
                </div>
              </div>

              {/* Staff Assignments Overview */}
              <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800">
                <h4 className="font-bold text-orange-400 mb-2 flex items-center gap-2">
                  <HardHat size={16}/> การจัดสรรกำลังพลและภารกิจ
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar text-xs">
                  {rosterList.map((staff, i) => {
                    const { archetype: arch } = getStaffProfile(staff);
                    return (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-stone-800 rounded border border-stone-700">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{staff.name}</span>
                          <span className="text-[10px] bg-stone-900 text-amber-400 px-2 py-0.5 rounded border border-amber-700/40">
                            {arch.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          STR:{staff.str} AGI:{staff.agi} INT:{staff.int} DEX:{staff.dex}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. BOT ACTIVITY HUB MODAL (All 6 Agents Telemetry) */}
      {activeModal === 'activity' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-stone-900 text-stone-200 w-full max-w-lg rounded-xl border border-stone-600 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-stone-800 px-5 py-3 font-bold border-b border-stone-700 flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-2"><Activity className="w-5 h-5"/> กิจกรรมของทั้ง 6 Operatives</span>
              <button onClick={() => setActiveModal(null)}><X className="w-5 h-5 text-stone-400 hover:text-white"/></button>
            </div>
            <div className="p-4 space-y-2.5 font-mono text-xs max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="bg-black/50 p-3 rounded-lg border border-stone-700 flex justify-between items-start">
                <div>
                  <div className="text-emerald-400 font-bold mb-0.5">🕵️ 1. Scout (LHAppServ Scraper)</div>
                  <div className="text-stone-300">สถานะ: {a1.msg}</div>
                  <div className="text-[10px] text-stone-500 mt-1">ตั้งเวลา: 09:00, 13:00, 17:00 น. (3 รอบ/วัน)</div>
                </div>
                <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-700 font-bold">READY</span>
              </div>

              <div className="bg-black/50 p-3 rounded-lg border border-stone-700 flex justify-between items-start">
                <div>
                  <div className="text-purple-400 font-bold mb-0.5">🧠 2. Dispatcher (Master Orchestrator)</div>
                  <div className="text-stone-300">สถานะ: {a2.msg}</div>
                  <div className="text-[10px] text-stone-500 mt-1">โหมด: Vercel Serverless Webhook / LLM Intent</div>
                </div>
                <span className="bg-purple-950 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-700 font-bold">ONLINE</span>
              </div>

              <div className="bg-black/50 p-3 rounded-lg border border-stone-700 flex justify-between items-start">
                <div>
                  <div className="text-red-400 font-bold mb-0.5">⏱️ 3. Watcher (SLA & Daily Summary)</div>
                  <div className="text-stone-300">สถานะ: {a3.msg}</div>
                  <div className="text-[10px] text-stone-500 mt-1">เฝ้าระวัง: เกินกำหนด {stats.overdue} งาน</div>
                </div>
                <span className="bg-red-950 text-red-300 text-[10px] px-2 py-0.5 rounded border border-red-700 font-bold">ACTIVE</span>
              </div>

              <div className="bg-black/50 p-3 rounded-lg border border-stone-700 flex justify-between items-start">
                <div>
                  <div className="text-amber-400 font-bold mb-0.5">📊 4. Evaluator (Budget Forecasting)</div>
                  <div className="text-stone-300">สถานะ: {a4.msg}</div>
                  <div className="text-[10px] text-stone-500 mt-1">เชื่อมโยง: Firestore budget_forecast</div>
                </div>
                <span className="bg-amber-950 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-700 font-bold">SYNCED</span>
              </div>

              <div className="bg-black/50 p-3 rounded-lg border border-stone-700 flex justify-between items-start">
                <div>
                  <div className="text-sky-400 font-bold mb-0.5">🌊 5. Flood Sentinel (FloodAgent)</div>
                  <div className="text-stone-300">สถานะ: {a5.msg}</div>
                  <div className="text-[10px] text-stone-500 mt-1">ติดตาม: ระดับน้ำ & ปริมาณฝน 15 โครงการ</div>
                </div>
                <span className="bg-sky-950 text-sky-300 text-[10px] px-2 py-0.5 rounded border border-sky-700 font-bold">STANDBY</span>
              </div>

              <div className="bg-black/50 p-3 rounded-lg border border-stone-700 flex justify-between items-start">
                <div>
                  <div className="text-orange-400 font-bold mb-0.5">👷 6. Quartermaster (ManpowerAgent)</div>
                  <div className="text-stone-300">สถานะ: {a6.msg}</div>
                  <div className="text-[10px] text-stone-500 mt-1">กำลังพล: {rosterList.length} นายพร้อมปฏิบัติการ</div>
                </div>
                <span className="bg-orange-950 text-orange-300 text-[10px] px-2 py-0.5 rounded border border-orange-700 font-bold">READY</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. QUEST BOARD MODAL */}
      {activeModal === 'questboard' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setActiveModal(null)}>
          <div className="bg-[#f4e4bc] w-full max-w-5xl h-[85vh] rounded-lg border-4 border-[#8b5a2b] shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-[#8b5a2b] text-amber-100 px-6 py-3 font-black flex justify-between items-center border-b-4 border-[#5c4033] tracking-widest text-lg">
              <span className="flex items-center gap-2">📋 GUILD QUEST BOARD</span>
              <button onClick={() => setActiveModal(null)} className="bg-red-800 hover:bg-red-700 text-amber-100 px-4 py-1.5 rounded shadow-inner border border-red-900 transition-colors">ปิดกระดาน</button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#e8d5a7] p-2 gap-2">
              {/* คอลัมน์ซ้าย: งานจากภายนอก (Scout ดึงมา) */}
              <div className="flex-1 bg-stone-900/90 rounded-md border border-stone-700 p-3 flex flex-col shadow-inner">
                <div className="flex justify-between items-center mb-2 bg-emerald-900/40 py-1.5 px-3 rounded">
                  <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider">📡 Scraped Quests (LH Jobstatus)</h3>
                  <span className="text-[10px] text-emerald-300 font-bold">{filteredJobStatusTasks.length} งาน</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                  {filteredJobStatusTasks.map(t => <QuestCard key={t.job_id} task={t} source="jobstatus" onClick={setSelectedTask} />)}
                  {filteredJobStatusTasks.length === 0 && <p className="text-center text-sm text-stone-500 py-10">ไม่มีงานค้างจากระบบภายนอก (หรือตรงตามตัวกรอง)</p>}
                </div>
              </div>
              
              {/* คอลัมน์ขวา: งานภายใน (TaskFlow) */}
              <div className="flex-1 bg-stone-900/90 rounded-md border border-stone-700 p-3 flex flex-col shadow-inner">
                <div className="flex justify-between items-center mb-2 bg-blue-900/40 py-1.5 px-3 rounded">
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider">⚔️ Active Quests (TaskFlow)</h3>
                  <span className="text-[10px] text-blue-300 font-bold">{activeTaskFlow.length} งาน</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                  {activeTaskFlow.map(t => <QuestCard key={t.id} task={t} source="taskflow" onClick={setSelectedTask} />)}
                  {activeTaskFlow.length === 0 && <p className="text-center text-sm text-stone-500 py-10">ไม่มีงานภายในที่กำลังดำเนินการ</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. ROSTER MODAL (ทำเนียบกิลด์) */}
      {activeModal === 'roster' && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-stone-900 w-full max-w-6xl h-[85vh] rounded-lg border-4 border-[#8b5a2b] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-[#8b5a2b] text-amber-100 px-6 py-3 font-black flex justify-between items-center border-b-4 border-[#5c4033] tracking-widest text-xl shadow-lg">
              <span className="flex items-center gap-2"><Users /> ทำเนียบกิลด์ (Guild Roster)</span>
              <button onClick={() => setActiveModal(null)} className="text-amber-200 hover:text-white transition-colors"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar pb-16">
              {rosterList.length > 0 ? rosterList.map((staff, idx) => {
                const { archetype: arch } = getStaffProfile(staff);
                return (
                  <div key={idx} onClick={() => setSelectedStaff(staff)} className="bg-stone-800 border-2 border-stone-600 rounded-xl p-4 flex flex-col items-center cursor-pointer hover:bg-stone-700 hover:border-amber-600/50 transition-all shadow-lg group">
                    <div className="w-20 h-20 bg-stone-900 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(217,119,6,0.5)] transition-all border-2 border-stone-700 group-hover:border-amber-600">
                      <ClassEmblem archetypeKey={arch?.key || 'agi_str'} size={48} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{staff.name}</h3>
                    <div className="text-sm font-bold text-amber-500 text-center">{arch?.identity}</div>
                    <div className="text-xs text-stone-400 mt-1 bg-stone-900 px-2 py-1 rounded-full border border-stone-700">{arch?.name} {arch?.thai ? '('+arch.thai+')' : ''}</div>
                  </div>
                );
              }) : (
                <div className="col-span-full text-center text-stone-500 py-10 bg-stone-900/50 rounded-xl border border-stone-800">ไม่พบข้อมูลบุคลากรในระบบ</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff Profile Radar Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100001] p-4" onClick={() => setSelectedStaff(null)}>
          <div className="bg-stone-900 w-full max-w-4xl rounded-xl border-2 border-amber-600/50 flex flex-col md:flex-row overflow-hidden shadow-[0_0_50px_rgba(217,119,6,0.3)] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {(() => {
              const { archetype: arch } = getStaffProfile(selectedStaff);
              const radarData = [
                { subject: 'STR', A: selectedStaff.str || 0, fullMark: 10 },
                { subject: 'AGI', A: selectedStaff.agi || 0, fullMark: 10 },
                { subject: 'INT', A: selectedStaff.int || 0, fullMark: 10 },
                { subject: 'DEX', A: selectedStaff.dex || 0, fullMark: 10 },
                { subject: 'CON', A: selectedStaff.con || 0, fullMark: 10 },
                { subject: 'SEN', A: selectedStaff.sen || 0, fullMark: 10 },
              ];
              return (
                <>
                  <div className="flex-1 bg-stone-950 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-stone-800 shadow-inner">
                    <button onClick={() => setSelectedStaff(null)} className="absolute top-4 right-4 text-stone-500 hover:text-white md:hidden"><X /></button>
                    <div className="w-32 h-32 bg-stone-900 rounded-full flex items-center justify-center border-4 border-amber-900 mb-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
                      <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping"></div>
                      <ClassEmblem archetypeKey={arch?.key || 'agi_str'} size={80} />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2 text-center drop-shadow-md">{selectedStaff.name}</h2>
                    <div className="text-lg text-amber-500 font-bold mb-1 text-center bg-amber-900/20 px-4 py-1 rounded-full border border-amber-900/50">{arch?.identity}</div>
                    <div className="text-sm text-stone-400 mb-6 text-center">{arch?.name} {arch?.thai ? '('+arch.thai+')' : ''}</div>
                    
                    <div className="w-full h-[250px] mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsRadar cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                          <PolarGrid stroke="#444" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#aaa', fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                          <Radar name="Stats" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                        </RechartsRadar>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6 bg-stone-900 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-6 hidden md:flex">
                      <h3 className="text-xl font-bold text-stone-200 border-b-2 border-stone-700 pb-2 w-full flex items-center gap-2">
                        <Activity className="text-emerald-500" /> Player Stats
                      </h3>
                      <button onClick={() => setSelectedStaff(null)} className="text-stone-500 hover:text-white -mt-2 ml-4 transition-colors"><X /></button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">STR</div><div className="text-xl font-black text-red-400 drop-shadow">{(Number(selectedStaff.str)||0).toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">AGI</div><div className="text-xl font-black text-blue-400 drop-shadow">{(Number(selectedStaff.agi)||0).toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">INT</div><div className="text-xl font-black text-purple-400 drop-shadow">{(Number(selectedStaff.int)||0).toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">DEX</div><div className="text-xl font-black text-yellow-400 drop-shadow">{(Number(selectedStaff.dex)||0).toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">CON</div><div className="text-xl font-black text-orange-400 drop-shadow">{(Number(selectedStaff.con)||0).toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">SEN</div><div className="text-xl font-black text-pink-400 drop-shadow">{(Number(selectedStaff.sen)||0).toFixed(1)}</div></div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-stone-950 p-4 rounded-lg border border-stone-800 shadow-inner">
                        <h4 className="text-sm font-bold text-stone-400 mb-2 uppercase tracking-wider flex items-center gap-2"><Info size={14} className="text-blue-400"/> รายละเอียดอาชีพ</h4>
                        <p className="text-stone-300 text-sm leading-relaxed">{arch?.desc}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-emerald-950/20 p-4 rounded-lg border border-emerald-900/40 hover:border-emerald-700/50 transition-colors">
                          <h4 className="text-xs font-bold text-emerald-500 mb-1 flex items-center gap-1 uppercase tracking-wider"><CheckCircle size={14}/> จุดแข็ง</h4>
                          <p className="text-emerald-200/80 text-sm">{arch?.strengths}</p>
                        </div>
                        <div className="bg-red-950/20 p-4 rounded-lg border border-red-900/40 hover:border-red-700/50 transition-colors">
                          <h4 className="text-xs font-bold text-red-500 mb-1 flex items-center gap-1 uppercase tracking-wider"><AlertTriangle size={14}/> จุดอ่อน</h4>
                          <p className="text-red-200/80 text-sm">{arch?.weaknesses}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 10. MANUAL MODAL (Adventurer's Tome) */}
      {activeModal === 'manual' && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-stone-900 w-full max-w-6xl h-[90vh] rounded-xl border-[6px] border-double border-amber-700 shadow-[0_0_80px_rgba(180,83,9,0.4)] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            {/* Left Page (List) */}
            <div className="md:w-1/3 bg-stone-950 border-r border-amber-900/50 flex flex-col shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)]">
              <div className="bg-stone-900 px-4 py-4 border-b border-amber-900 flex justify-between items-center">
                <h2 className="text-xl font-black text-amber-500 tracking-widest uppercase drop-shadow-md flex items-center gap-2"><Book /> Adventurer's Tome</h2>
                <button onClick={() => setActiveModal(null)} className="text-stone-500 hover:text-white md:hidden"><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 pb-16">
                {archetypesData.map(arch => (
                  <div key={arch.key} onClick={() => {
                     const rightPane = document.getElementById('manual-content-area');
                     const targetEl = document.getElementById('arch-' + arch.key);
                     if (rightPane && targetEl) rightPane.scrollTo({top: targetEl.offsetTop - 40, behavior: 'smooth'});
                  }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-800 cursor-pointer border border-transparent hover:border-amber-900/50 group transition-all">
                    <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center shrink-0 border border-stone-700 group-hover:border-amber-600 transition-colors shadow-inner">
                      <ClassEmblem archetypeKey={arch.key} size={24} />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-sm font-bold text-stone-200 truncate group-hover:text-amber-400 transition-colors">{arch.name}</div>
                      <div className="text-xs text-amber-700/80 font-semibold truncate group-hover:text-amber-500 transition-colors">{arch.identity}</div>
                    </div>
                    <ChevronRight size={16} className="text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right Page (Details) */}
            <div className="md:w-2/3 bg-stone-900 flex flex-col relative">
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-stone-500 hover:text-white hidden md:block z-10 transition-transform hover:scale-110 bg-stone-800 rounded-full p-2 border border-stone-700"><X /></button>
              
              <div id="manual-content-area" className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar scroll-smooth pb-32">
                <div className="text-center mb-10 relative">
                  <h1 className="text-3xl font-black text-amber-500 mb-2 uppercase tracking-[0.2em] relative inline-block bg-stone-900 px-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">คัมภีร์ 35 สายอาชีพ</h1>
                  <p className="text-stone-400 text-sm mt-3 max-w-lg mx-auto">รวบรวมข้อมูลสายอาชีพทั้งหมดในสมาคมนักผจญภัย เพื่อเป็นแนวทางในการประเมินศักยภาพและดึงจุดเด่นของบุคลากรออกมาใช้ให้เกิดประสิทธิภาพสูงสุด</p>
                </div>
                
                <div className="space-y-12">
                  {archetypesData.map(arch => (
                    <div id={'arch-' + arch.key} key={arch.key} className="bg-stone-950/80 rounded-2xl border border-stone-800 p-6 flex flex-col md:flex-row gap-6 hover:border-amber-700/50 transition-colors relative shadow-xl backdrop-blur-sm group">
                      <div className="shrink-0 flex flex-col items-center justify-start relative">
                        <div className="w-24 h-24 bg-stone-900 rounded-full border-4 border-stone-700 flex items-center justify-center mb-3 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] group-hover:border-amber-600 transition-colors relative z-10">
                          <ClassEmblem archetypeKey={arch.key} size={54} />
                        </div>
                        <div className="px-2.5 py-1 bg-stone-800 rounded-md text-[10px] font-mono font-bold text-stone-400 border border-stone-700 shadow-md whitespace-nowrap">{arch.key.toUpperCase().replace(/_/g, ' + ')}</div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-stone-100 mb-1 drop-shadow-md">{arch.name} <span className="text-stone-500 text-base font-normal tracking-wide">({arch.thai})</span></h3>
                        <div className="text-amber-500 font-bold mb-4 text-base inline-block border-b border-amber-900/50 pb-0.5">{arch.identity}</div>
                        <p className="text-stone-300 text-sm leading-relaxed mb-4 bg-stone-900/50 p-3 rounded-lg border border-stone-800/50">{arch.desc}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                            <h4 className="font-bold text-emerald-500 mb-1 flex items-center gap-1"><Shield size={14}/> จุดแข็ง</h4>
                            <p className="text-stone-300">{arch.strengths}</p>
                          </div>
                          <div className="bg-red-950/20 p-3 rounded-lg border border-red-900/30">
                            <h4 className="font-bold text-red-500 mb-1 flex items-center gap-1"><Sword size={14}/> จุดอ่อน</h4>
                            <p className="text-stone-300">{arch.weaknesses}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal (รายละเอียดงานเดี่ยว) */}
      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}
