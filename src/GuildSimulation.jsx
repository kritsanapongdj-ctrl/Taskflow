import React, { useState, useEffect, useRef } from 'react';
import { Home, Sparkles, List, X, ShieldAlert, Clock, Filter, Activity, Users, Crosshair, ChevronRight, BookOpen, Book, Target, Shield, Sword, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';


const BGM_URL = '/bgm.mp3';

import { AgentPixelArt } from './AgentPixelArt';
import ClassEmblem from './ClassEmblem';
import archetypesData from './data/archetypes.json';

const AgentWrapper = ({ type, x, y, action, flip, msg, title }) => {
  const isWalking = action === 'walking';
  const isWorking = action === 'working';
  
  const currentFps = isWalking ? 6 : (isWorking ? 4 : 2);

  return (
    <div 
      className="absolute transition-all ease-linear flex flex-col items-center z-20" 
      style={{ left: `${x}%`, top: `${y}%`, transitionDuration: isWalking ? '2000ms' : '500ms' }}
    >
      <div className={`${isWorking && type === 'watcher' ? 'bg-red-900 border-red-500 animate-pulse' : 'bg-black/80 border-gray-600'} text-white text-[10px] px-2 py-1 rounded-md border mb-2 whitespace-nowrap shadow-lg absolute -top-12 z-30`}>
        {msg}
      </div>
      
      <div className="bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded border border-gray-600 mb-1 z-30">
        {title}
      </div>
      
      <AgentPixelArt type={type} flip={flip} fps={currentFps} scale={4} showGlow={true} />
    </div>
  );
};

const QuestCard = ({ task, source, onClick }) => {
  const parseDate = (dStr) => {
    if (!dStr) return Date.now();
    try { const [dp] = dStr.split(' '); const [d, m, y] = dp.split('/'); return new Date(+y + 2500 - 543, +m - 1, +d).getTime(); } catch { return Date.now(); }
  };
  const diffDays = (Date.now() - parseDate(task.reported_date)) / 86400000;
  const done = task.status === 'จบงาน' || task.status === 'จบงาน(รอใบงาน)';
  const isCrisis  = source === 'jobstatus' && !done && diffDays > 5;
  const isOverdue = source === 'jobstatus' && !done && diffDays > 2 && diffDays <= 5;

  let bg = source === 'taskflow' ? 'bg-blue-50/90 border-blue-400 hover:bg-blue-100' : 'bg-emerald-50/90 border-emerald-400 hover:bg-emerald-100';
  let icon = source === 'taskflow' ? <List className="w-4 h-4 text-blue-500" /> : <Sparkles className="w-4 h-4 text-emerald-600" />;
  if (isCrisis)  { bg = 'bg-red-100/90 border-red-600 animate-pulse hover:bg-red-200'; icon = <ShieldAlert className="w-4 h-4 text-red-600" />; }
  else if (isOverdue) { bg = 'bg-amber-100/90 border-amber-500 hover:bg-amber-200'; icon = <Clock className="w-4 h-4 text-amber-600" />; }

  return (
    <div onClick={() => onClick(task)} className={`${bg} border-2 rounded-md p-2 shadow-sm cursor-pointer transition-transform hover:scale-[1.02] active:scale-95`}>
      <div className="flex items-center gap-1 font-bold text-gray-900 border-b border-black/10 pb-1 mb-1 text-xs">
        {icon}
        <span className="truncate">{task.project || task.details?.slice(0,20) || 'ไม่ระบุ'}</span>
      </div>
      <p className="text-gray-700 text-[11px] line-clamp-2">{task.details}</p>
    </div>
  );
};

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

const RadarChart = ({ stats, size = 180 }) => {
  const center = size / 2;
  const radius = (size / 2) - 25;
  const getPoint = (val, angle) => {
    const r = (val / 10) * radius;
    const a = (angle - 90) * (Math.PI / 180);
    return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
  };
  const statKeys = ['STR', 'AGI', 'INT', 'DEX', 'CON', 'SEN'];
  const angles = [0, 60, 120, 180, 240, 300];
  const polyPoints = statKeys.map((k, i) => getPoint(stats[k] || 0, angles[i])).join(' ');
  return (
    <svg width={size} height={size} className="overflow-visible mx-auto">
      {[10, 8, 6, 4, 2].map(l => (
        <polygon key={l} points={angles.map(a => getPoint(l, a)).join(' ')} fill={l===10?"rgba(255,255,255,0.05)":"none"} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      ))}
      {angles.map((a, i) => {
         const p = getPoint(10, a);
         return (
           <g key={i}>
             <line x1={center} y1={center} x2={p.split(',')[0]} y2={p.split(',')[1]} stroke="rgba(255,255,255,0.15)" />
             <text x={getPoint(13.5, a).split(',')[0]} y={getPoint(13.5, a).split(',')[1]} textAnchor="middle" alignmentBaseline="middle" fontSize="10" fontWeight="bold" fill="#a8a29e">
               {statKeys[i]}
             </text>
           </g>
         )
      })}
      <polygon points={polyPoints} fill="rgba(251, 191, 36, 0.4)" stroke="#f59e0b" strokeWidth="2" />
      {statKeys.map((k, i) => (
        <circle key={k} cx={getPoint(stats[k]||0, angles[i]).split(',')[0]} cy={getPoint(stats[k]||0, angles[i]).split(',')[1]} r="3" fill="#fef3c7" />
      ))}
    </svg>
  );
};

export default function GuildSimulation({ tasks, sets, setTab, db }) {
  const [isPlaying, setIsPlaying] = useState(false);
    const [showRoster, setShowRoster] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [showManual, setShowManual] = useState(false);
    const rosterList = sets?.staffStats || [];
    
    const getStaffProfile = (staffObj) => {
       const key = staffObj.archetypeKey || 'agi_str'; // Fallback
       let archetype = archetypesData.find(a => a.key === key);
       if (!archetype) archetype = archetypesData[0];
       
       const stats = {
         STR: staffObj.str || 0,
         AGI: staffObj.agi || 0,
         INT: staffObj.int || 0,
         DEX: staffObj.dex || 0,
         CON: staffObj.con || 0,
         SEN: staffObj.sen || 0,
       };
       return { archetype, stats };
    };
  const audioRef = useRef(null);
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showQuestBoard, setShowQuestBoard] = useState(false);
  const [showBotActivity, setShowBotActivity] = useState(false);
  
  const [jobStatusTasks, setJobStatusTasks] = useState([]);
  const [filterProj, setFilterProj] = useState('');

  const [a1, setA1] = useState({ x: 10, y: 55, action: 'idle', flip: false, msg: 'สแตนด์บาย' });
  const [a2, setA2] = useState({ x: 30, y: 40, action: 'idle', flip: false, msg: 'สแตนด์บาย' });
  const [a3, setA3] = useState({ x: 50, y: 65, action: 'idle', flip: false, msg: 'สแตนด์บาย' });
  const [a4, setA4] = useState({ x: 20, y: 80, action: 'idle', flip: false, msg: 'สแตนด์บาย' });

  // 1. ดึงข้อมูลจากฐานข้อมูล lh_scraper โดยตรง
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "database"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const arr = Object.values(data).sort((a, b) => b.reported_timestamp - a.reported_timestamp);
        setJobStatusTasks(arr);
        
        // Agent 1: Scout - React to new incoming tasks
        const hasNew = arr.some(t => t.notified_new);
        if (hasNew) {
          setA1(p => ({ ...p, action: 'walking', x: 15, flip: false, msg: 'พบข้อมูลใหม่!' }));
          setTimeout(() => setA1(p => ({ ...p, action: 'working', msg: 'กำลังเรียบเรียงเควสต์...' })), 2000);
          setTimeout(() => setA1(p => ({ ...p, action: 'idle', msg: 'สแตนด์บาย' })), 5000);
        }
      }
    });
    return () => unsub();
  }, [db]);

  // Agent 2: Wizard Dispatcher - Less frequent, more idle
  useEffect(() => {
    const loop = setInterval(() => {
      if (Math.random() > 0.7) {
        setA2(p => ({ ...p, action: 'walking', x: 55, y: 40, flip: false, msg: 'ตรวจบอร์ดเควสต์' }));
        setTimeout(() => {
          setA2(p => ({ ...p, action: 'working', msg: 'จัดระเบียบเควสต์' }));
          setTimeout(() => {
            setA2(p => ({ ...p, action: 'walking', x: 30, flip: true, msg: 'เดินกลับโต๊ะ' }));
            setTimeout(() => setA2(p => ({ ...p, action: 'idle', msg: 'สแตนด์บาย', flip: false })), 2000);
          }, 3000);
        }, 2000);
      }
    }, 25000); // 25 seconds
    return () => clearInterval(loop);
  }, []);

  // Agent 3: Assassin Watcher - Patrols occasionally
  useEffect(() => {
    const waypoints = [ {x: 45, y: 70}, {x: 65, y: 75}, {x: 40, y: 50} ];
    const loop = setInterval(() => {
      const wp = waypoints[Math.floor(Math.random() * waypoints.length)];
      setA3(p => ({ ...p, action: 'walking', x: wp.x, y: wp.y, flip: wp.x < p.x, msg: 'เดินลาดตระเวน' }));
      setTimeout(() => setA3(p => ({ ...p, action: 'idle', msg: 'เฝ้าระวัง' })), 2000);
    }, 20000);
    return () => clearInterval(loop);
  }, []);

  // Agent 4: Professor Evaluator
  useEffect(() => {
    const loop = setInterval(() => {
      if (Math.random() > 0.6) {
        setA4(p => ({ ...p, action: 'working', msg: 'กำลังประมวลผลสถิติ' }));
        setTimeout(() => setA4(p => ({ ...p, action: 'idle', msg: 'สแตนด์บาย' })), 4000);
      }
    }, 30000);
    return () => clearInterval(loop);
  }, []);

  // การจัดการข้อมูล Dashboard ด้านล่าง
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
  const [filterStaff, setFilterStaff] = useState('');

  const checkStaffMatch = (taskProj, staffNameFilter) => {
    if(!staffNameFilter || staffNameFilter === 'ทั้งหมด') return true;
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
    .sort((a, b) => {
      const dA = new Date(a.endDate).getTime() || 0;
      const dB = new Date(b.endDate).getTime() || 0;
      return dA - dB;
    });
    
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

  return (
    <div className="fixed inset-0 bg-stone-900 text-stone-100 flex flex-col font-sans overflow-hidden z-[9999]">
      <audio ref={audioRef} loop src={BGM_URL} />
      <div className="h-14 bg-stone-800/95 border-b border-stone-600 flex items-center justify-between px-4 shadow-lg z-30 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setTab('dashboard')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded shadow font-bold transition-colors text-sm">
            <Home className="w-4 h-4" /> กลับหน้าหลัก
          </button>
          <div className="h-6 w-px bg-stone-600" />
          <h1 className="font-black text-lg md:text-xl tracking-wider text-amber-500 drop-shadow-md uppercase flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> LH Guild Simulator
          </h1>
        </div>
        <button onClick={() => { if(isPlaying) { audioRef.current.pause(); setIsPlaying(false); } else { audioRef.current.play().catch(()=>{}); setIsPlaying(true); } }} className="p-2 hover:bg-stone-700 rounded-full transition-colors">
          {isPlaying ? <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" /> : <Sparkles className="w-5 h-5 text-stone-500" />}
        </button>
      </div>

      <div className="flex-1 relative bg-[url('/tavern-bg.jpg')] bg-cover bg-center overflow-hidden">
        <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />
        <AgentWrapper type="scout" title="🕵️ Agent 1 (Scout)" {...a1} />
        <AgentWrapper type="wizard" title="🧠 Agent 2 (Dispatcher)" {...a2} />
        <AgentWrapper type="watcher" title="⏱️ Agent 3 (Watcher)" {...a3} />
        <AgentWrapper type="evaluator" title="📊 Agent 4 (Evaluator)" {...a4} />

        {/* จุดกดซ่อนบอร์ดในฉากหลัง (ย้ายไปทับกระดานไม้ฝั่งซ้าย) */}
        <div 
          onClick={() => setShowQuestBoard(true)}
          className="absolute z-20 cursor-pointer hover:bg-white/20 transition-colors border-2 border-transparent hover:border-amber-400/50 flex items-center justify-center group rounded-lg"
          style={{ left: '4%', top: '22%', width: '20%', height: '38%' }}
        >
          <div className="bg-black/90 text-amber-400 text-xs font-bold px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-amber-600 pointer-events-none shadow-xl whitespace-nowrap">
            🔍 เปิดกระดานเควสต์
          </div>
        </div>
      </div>
      
      {/* Dashboard & สรุปงาน ด้านล่าง */}
      <div className="bg-stone-900 border-t border-stone-700 p-2 md:p-3 flex flex-col md:flex-row justify-between items-center gap-3 text-xs font-bold text-stone-400 z-30 relative shadow-[0_-5px_15px_rgba(0,0,0,0.5)] shrink-0">
        
        {/* กิจกรรมบอท */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => setShowBotActivity(true)} 
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-emerald-400 px-3 py-1.5 rounded transition-colors w-full md:w-auto justify-center"
          >
            <Activity className="w-4 h-4" /> กิจกรรมบอทกำลังรัน...
          </button>
        </div>

        {/* ตัวกรองโครงการ */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-stone-500" />
          <select 
            value={filterProj} 
            onChange={(e) => setFilterProj(e.target.value)}
            className="bg-stone-800 border border-stone-600 text-stone-200 rounded px-2 py-1.5 w-full md:w-48 outline-none"
          >
            <option value="">ทุกโครงการ</option>
            {projectsList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          
          <select 
            value={filterStaff} 
            onChange={(e) => setFilterStaff(e.target.value)}
            className="bg-stone-800 border border-stone-600 text-stone-200 rounded px-2 py-1.5 w-full md:w-32 outline-none"
          >
            <option value="">ทุกเจ้าหน้าที่</option>
            {staffList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* สรุปสถิติตามจริง */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 bg-stone-800 px-4 py-1.5 rounded border border-stone-700">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> ดำเนินการ: <span className="text-white ml-1">{stats.pending}</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> ล่าช้า: <span className="text-white ml-1">{stats.overdue}</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> เสร็จสิ้น: <span className="text-white ml-1">{stats.completed}</span></div>
          <div className="ml-2 pl-3 border-l border-stone-600">รวมทั้งหมด: <span className="text-white ml-1">{filteredTaskFlow.length}</span></div>
        </div>
      </div>

      {/* Modal Quest Board ใหญ่อลังการ */}
      {showQuestBoard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[99999] backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200" onClick={() => setShowQuestBoard(false)}>
          <div className="bg-[#f4e4bc] w-full max-w-5xl h-[85vh] rounded-lg border-4 border-[#8b5a2b] shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-[#8b5a2b] text-amber-100 px-6 py-3 font-black flex justify-between items-center border-b-4 border-[#5c4033] tracking-widest text-lg">
              <span className="flex items-center gap-2">📋 GUILD QUEST BOARD</span>
              <button onClick={() => setShowQuestBoard(false)} className="bg-red-800 hover:bg-red-700 text-amber-100 px-4 py-1.5 rounded shadow-inner border border-red-900 transition-colors">ปิดกระดาน</button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#e8d5a7] p-2 gap-2">
              {/* คอลัมน์ซ้าย: งานจากเว็บ (บอทดึงมา) */}
              <div className="flex-1 bg-stone-900/90 rounded-md border border-stone-700 p-3 flex flex-col shadow-inner">
                <h3 className="text-xs font-black text-emerald-400 mb-3 uppercase tracking-wider text-center bg-emerald-900/40 py-1.5 rounded">📡 New Scraped Quests (LH Jobstatus)</h3>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                  {filteredJobStatusTasks.slice(0, 15).map(t => <QuestCard key={t.job_id} task={t} source="jobstatus" onClick={setSelectedTask} />)}
                  {filteredJobStatusTasks.length === 0 && <p className="text-center text-sm text-stone-500 py-10">ไม่มีงานจากระบบภายนอก (หรือโดนกรองออก)</p>}
                </div>
              </div>
              
              {/* คอลัมน์ขวา: งานภายใน (TaskFlow) */}
              <div className="flex-1 bg-stone-900/90 rounded-md border border-stone-700 p-3 flex flex-col shadow-inner">
                <h3 className="text-xs font-black text-blue-400 mb-3 uppercase tracking-wider text-center bg-blue-900/40 py-1.5 rounded">⚔️ Active Internal Quests (TaskFlow)</h3>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                  {activeTaskFlow.slice(0, 15).map(t => <QuestCard key={t.id} task={t} source="taskflow" onClick={setSelectedTask} />)}
                  {activeTaskFlow.length === 0 && <p className="text-center text-sm text-stone-500 py-10">ไม่มีงานภายในที่กำลังดำเนินการ</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ดูกิจกรรมบอท */}
      {showBotActivity && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] backdrop-blur-sm p-4" onClick={() => setShowBotActivity(false)}>
          <div className="bg-stone-900 text-stone-200 w-full max-w-md rounded-lg border border-stone-600 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <div className="bg-stone-800 px-4 py-3 font-bold border-b border-stone-700 flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-2"><Activity className="w-5 h-5"/> กิจกรรมบอทแบบเรียลไทม์</span>
              <button onClick={() => setShowBotActivity(false)}><X className="w-5 h-5 text-stone-400 hover:text-white"/></button>
            </div>
            <div className="p-4 space-y-3 font-mono text-xs">
              <div className="bg-black/50 p-3 rounded border border-stone-700">
                <div className="text-blue-400 font-bold mb-1">🕵️ Agent 1 (Scout)</div>
                <div className="text-stone-300">สถานะ: {a1.msg}</div>
              </div>
              <div className="bg-black/50 p-3 rounded border border-stone-700">
                <div className="text-purple-400 font-bold mb-1">🧠 Agent 2 (Dispatcher)</div>
                <div className="text-stone-300">สถานะ: {a2.msg}</div>
              </div>
              <div className="bg-black/50 p-3 rounded border border-stone-700">
                <div className="text-red-400 font-bold mb-1">⏱️ Agent 3 (Watcher)</div>
                <div className="text-stone-300">สถานะ: {a3.msg}</div>
              </div>
              <div className="bg-black/50 p-3 rounded border border-stone-700">
                <div className="text-amber-400 font-bold mb-1">📊 Agent 4 (Evaluator)</div>
                <div className="text-stone-300">สถานะ: {a4.msg}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* MMORPG Action Bar (Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-stone-900 border-t-4 border-amber-700/80 p-2 flex justify-center gap-2 md:gap-4 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <button onClick={() => setShowQuestBoard(true)} className="flex flex-col items-center justify-center bg-stone-800 hover:bg-stone-700 border-2 border-stone-600 rounded-lg p-2 min-w-[100px] transition-transform hover:-translate-y-1 group">
          <Target size={24} className="text-red-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-stone-200">Quest Board</span>
        </button>
        <button onClick={() => setShowRoster(true)} className="flex flex-col items-center justify-center bg-stone-800 hover:bg-stone-700 border-2 border-stone-600 rounded-lg p-2 min-w-[100px] transition-transform hover:-translate-y-1 group">
          <Users size={24} className="text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-stone-200">Guild Roster</span>
        </button>
        <button onClick={() => setShowManual(true)} className="flex flex-col items-center justify-center bg-stone-800 hover:bg-stone-700 border-2 border-stone-600 rounded-lg p-2 min-w-[100px] transition-transform hover:-translate-y-1 group">
          <BookOpen size={24} className="text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-stone-200">Adventurer's Tome</span>
        </button>
      </div>

      {/* Roster Modal */}
      {showRoster && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100000] p-4" onClick={() => setShowRoster(false)}>
          <div className="bg-stone-900 w-full max-w-6xl h-[85vh] rounded-lg border-4 border-[#8b5a2b] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-[#8b5a2b] text-amber-100 px-6 py-3 font-black flex justify-between items-center border-b-4 border-[#5c4033] tracking-widest text-xl shadow-lg">
              <span className="flex items-center gap-2"><Users /> ทำเนียบกิลด์ (Guild Roster)</span>
              <button onClick={() => setShowRoster(false)} className="text-amber-200 hover:text-white transition-colors"><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar pb-24">
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
                <div className="col-span-full text-center text-stone-500 py-10 bg-stone-900/50 rounded-xl border border-stone-800">ไม่พบข้อมูลพนักงาน กรุณาอัปโหลดไฟล์ Excel ก่อน</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff Profile Modal (Inside Roster) */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100001] p-4" onClick={() => setSelectedStaff(null)}>
          <div className="bg-stone-900 w-full max-w-4xl rounded-xl border-2 border-amber-600/50 flex flex-col md:flex-row overflow-hidden shadow-[0_0_50px_rgba(217,119,6,0.3)] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {(() => {
              const { archetype: arch } = getStaffProfile(selectedStaff);
              const radarData = [
                { subject: 'STR', A: selectedStaff.str, fullMark: 10 },
                { subject: 'AGI', A: selectedStaff.agi, fullMark: 10 },
                { subject: 'INT', A: selectedStaff.int, fullMark: 10 },
                { subject: 'DEX', A: selectedStaff.dex, fullMark: 10 },
                { subject: 'CON', A: selectedStaff.con, fullMark: 10 },
                { subject: 'SEN', A: selectedStaff.sen, fullMark: 10 },
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
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">STR</div><div className="text-xl font-black text-red-400 drop-shadow">{selectedStaff.str.toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">AGI</div><div className="text-xl font-black text-blue-400 drop-shadow">{selectedStaff.agi.toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">INT</div><div className="text-xl font-black text-purple-400 drop-shadow">{selectedStaff.int.toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">DEX</div><div className="text-xl font-black text-yellow-400 drop-shadow">{selectedStaff.dex.toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">CON</div><div className="text-xl font-black text-orange-400 drop-shadow">{selectedStaff.con.toFixed(1)}</div></div>
                      <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 text-center shadow-inner"><div className="text-xs text-stone-400">SEN</div><div className="text-xl font-black text-pink-400 drop-shadow">{selectedStaff.sen.toFixed(1)}</div></div>
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

      {/* Manual Modal (Adventurer's Tome) */}
      {showManual && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100000] p-4" onClick={() => setShowManual(false)}>
          <div className="bg-stone-900 w-full max-w-6xl h-[90vh] rounded-xl border-[6px] border-double border-amber-700 shadow-[0_0_80px_rgba(180,83,9,0.4)] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            {/* Left Page (List) */}
            <div className="md:w-1/3 bg-stone-950 border-r border-amber-900/50 flex flex-col shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)]">
              <div className="bg-stone-900 px-4 py-4 border-b border-amber-900 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
                <h2 className="text-xl font-black text-amber-500 tracking-widest uppercase drop-shadow-md flex items-center gap-2"><Book /> Adventurer's Tome</h2>
                <button onClick={() => setShowManual(false)} className="text-stone-500 hover:text-white md:hidden"><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 pb-20">
                {archetypesData.map(arch => (
                  <div key={arch.key} onClick={() => {
                     const rightPane = document.getElementById('manual-content-area');
                     const targetEl = document.getElementById('arch-' + arch.key);
                     if (rightPane && targetEl) rightPane.scrollTo({top: targetEl.offsetTop - 40, behavior: 'smooth'});
                  }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-800 cursor-pointer border border-transparent hover:border-amber-900/50 group transition-all">
                    <div className="w-12 h-12 rounded-full bg-stone-900 flex items-center justify-center shrink-0 border border-stone-700 group-hover:border-amber-600 transition-colors shadow-inner">
                      <ClassEmblem archetypeKey={arch.key} size={28} />
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
            <div className="md:w-2/3 bg-stone-900 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              <button onClick={() => setShowManual(false)} className="absolute top-4 right-4 text-stone-500 hover:text-white hidden md:block z-10 transition-transform hover:scale-110 bg-stone-800 rounded-full p-2 border border-stone-700"><X /></button>
              
              <div id="manual-content-area" className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar scroll-smooth pb-32">
                <div className="text-center mb-12 relative">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-900/50 to-transparent"></div>
                  <h1 className="text-4xl font-black text-amber-500 mb-2 uppercase tracking-[0.2em] relative inline-block bg-stone-900 px-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">คัมภีร์ 35 สายอาชีพ</h1>
                  <p className="text-stone-400 text-sm mt-4 max-w-lg mx-auto relative z-10 bg-stone-900 px-4">รวบรวมข้อมูลสายอาชีพทั้งหมดในสมาคมนักผจญภัย เพื่อเป็นแนวทางในการประเมินศักยภาพและดึงจุดเด่นของบุคลากรออกมาใช้ให้เกิดประสิทธิภาพสูงสุด</p>
                </div>
                
                <div className="space-y-16">
                  {archetypesData.map(arch => (
                    <div id={'arch-' + arch.key} key={arch.key} className="bg-stone-950/80 rounded-2xl border border-stone-800 p-8 flex flex-col md:flex-row gap-8 hover:border-amber-700/50 transition-colors relative shadow-xl backdrop-blur-sm group">
                      <div className="shrink-0 flex flex-col items-center justify-start relative">
                        <div className="w-28 h-28 bg-stone-900 rounded-full border-4 border-stone-700 flex items-center justify-center mb-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] group-hover:border-amber-600 transition-colors relative z-10">
                          <ClassEmblem archetypeKey={arch.key} size={64} />
                        </div>
                        <div className="px-3 py-1.5 bg-stone-800 rounded-md text-xs font-mono font-bold text-stone-400 border border-stone-700 shadow-md whitespace-nowrap">{arch.key.toUpperCase().replace(/_/g, ' + ')}</div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-3xl font-black text-stone-100 mb-1 drop-shadow-md">{arch.name} <span className="text-stone-500 text-lg font-normal tracking-wide">({arch.thai})</span></h3>
                        <div className="text-amber-500 font-bold mb-5 text-lg inline-block border-b border-amber-900/50 pb-1">{arch.identity}</div>
                        <p className="text-stone-300 text-base leading-relaxed mb-6 bg-stone-900/50 p-4 rounded-lg border border-stone-800/50">{arch.desc}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/30 shadow-inner hover:bg-emerald-900/20 transition-colors">
                            <h4 className="text-sm font-bold text-emerald-500 mb-2 uppercase tracking-wider flex items-center gap-2"><Shield size={16}/> จุดแข็ง</h4>
                            <p className="text-stone-300 text-sm">{arch.strengths}</p>
                          </div>
                          <div className="bg-red-950/20 p-4 rounded-xl border border-red-900/30 shadow-inner hover:bg-red-900/20 transition-colors">
                            <h4 className="text-sm font-bold text-red-500 mb-2 uppercase tracking-wider flex items-center gap-2"><Sword size={16}/> จุดอ่อน</h4>
                            <p className="text-stone-300 text-sm">{arch.weaknesses}</p>
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

      {/* Task Modal (รายละเอียดงานเดี่ยวๆ) */}
      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}
