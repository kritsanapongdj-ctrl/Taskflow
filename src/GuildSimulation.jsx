import React, { useState, useEffect, useRef } from 'react';
import { Home, Sparkles, List, X, ShieldAlert, Clock } from 'lucide-react';

const BGM_URL = '/bgm.mp3';

// --- CSS Animations ภายในตัว ---
const AgentStyles = () => (
  <style>{`
    @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes walk { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-6px) rotate(5deg); } 50% { transform: translateY(0) rotate(0deg); } 75% { transform: translateY(-6px) rotate(-5deg); } }
    @keyframes cast { 0% { transform: rotateX(70deg) rotateZ(0deg) scale(1); opacity: 0.6; } 50% { transform: rotateX(70deg) rotateZ(180deg) scale(1.2); opacity: 1; } 100% { transform: rotateX(70deg) rotateZ(360deg) scale(1); opacity: 0.6; } }
    @keyframes write { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-15deg) translateX(-2px); } }
    
    .act-idle { animation: bob 2s infinite ease-in-out; }
    .act-float { animation: float 3s infinite ease-in-out; }
    .act-walk { animation: walk 0.5s infinite linear; }
    .act-cast { animation: float 2s infinite ease-in-out; }
    .eff-magic { animation: cast 4s infinite linear; transform-origin: center; }
    .eff-pen { animation: write 0.3s infinite ease-in-out; transform-origin: bottom left; }
  `}</style>
);

// --- Base Agent Component ---
const AgentSprite = ({ type, x, y, action, flip, msg, title }) => {
  const isWalking = action === 'walking';
  const isWorking = action === 'working';
  
  let colorPrimary = '#1e3a8a', colorSecondary = '#64748b', eyeColor = '#38bdf8';
  let baseAnim = 'act-idle';
  
  if (type === 'scout') { colorPrimary = '#0f172a'; colorSecondary = '#475569'; eyeColor = '#38bdf8'; baseAnim = isWalking ? 'act-walk' : 'act-idle'; }
  if (type === 'wizard') { colorPrimary = '#4c1d95'; colorSecondary = '#c084fc'; eyeColor = '#d8b4fe'; baseAnim = isWalking ? 'act-walk' : (isWorking ? 'act-cast' : 'act-float'); }
  if (type === 'watcher') { colorPrimary = '#450a0a'; colorSecondary = '#1c1917'; eyeColor = '#f87171'; baseAnim = isWalking ? 'act-walk' : 'act-idle'; }
  if (type === 'evaluator') { colorPrimary = '#14532d'; colorSecondary = '#fde047'; eyeColor = '#fef08a'; baseAnim = isWalking ? 'act-walk' : 'act-idle'; }

  return (
    <div className="absolute transition-all ease-linear flex flex-col items-center z-20" style={{ left: `${x}%`, top: `${y}%`, transitionDuration: isWalking ? '2000ms' : '500ms' }}>
      
      <div className={`${isWorking && type === 'watcher' ? 'bg-red-900 border-red-500 animate-pulse' : 'bg-black/80 border-gray-600'} text-white text-[10px] px-2 py-1 rounded-md border mb-2 whitespace-nowrap shadow-lg absolute -top-12`}>
        {msg}
      </div>
      
      <div className="bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded border border-gray-600 mb-1 z-10">{title}</div>
      
      <div className="relative w-24 h-24 flex items-end justify-center">
        
        {isWorking && type !== 'scout' && type !== 'evaluator' && (
           <svg className="absolute bottom-0 w-24 h-24 eff-magic" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="40" fill="none" stroke={eyeColor} strokeWidth="2" strokeDasharray="4 4" />
             <polygon points="50,10 90,90 10,90" fill="none" stroke={eyeColor} strokeWidth="1" opacity="0.5" />
             <polygon points="50,90 10,10 90,10" fill="none" stroke={eyeColor} strokeWidth="1" opacity="0.5" />
           </svg>
        )}

        <svg className={`w-16 h-16 origin-bottom ${baseAnim}`} style={{ transform: flip ? 'scaleX(-1)' : 'scaleX(1)' }} viewBox="0 0 100 100">
          <ellipse cx="50" cy="95" rx="25" ry="5" fill="rgba(0,0,0,0.3)" />
          
          <path d="M 30 40 L 70 40 L 85 95 L 15 95 Z" fill={colorPrimary} />
          
          {type === 'wizard' && <path d="M 10 95 L 90 95 L 50 40 Z" fill={colorSecondary} opacity="0.3" />}
          {type === 'scout' && <path d="M 20 45 L 40 60 L 80 45 L 50 30 Z" fill={colorSecondary} />}
          {type === 'watcher' && <path d="M 15 95 L 30 50 L 50 95 L 70 50 L 85 95 Z" fill={colorSecondary} opacity="0.5" />}
          {type === 'evaluator' && <path d="M 45 40 L 55 40 L 55 95 L 45 95 Z" fill={colorSecondary} />}
          
          <circle cx="50" cy="35" r="20" fill={colorPrimary} stroke={colorSecondary} strokeWidth="2" />
          <circle cx="50" cy="35" r="14" fill="#000" />
          
          <circle cx="44" cy="33" r="3" fill={eyeColor} className={isWorking ? 'animate-ping' : ''} />
          <circle cx="58" cy="33" r="3" fill={eyeColor} className={isWorking ? 'animate-ping' : ''} />
          
          {type === 'wizard' && isWorking && <circle cx="80" cy="20" r="8" fill={eyeColor} style={{animation: 'float 1s infinite'}} />}
          {type === 'scout' && <path d="M 10 35 L 30 35 L 20 60 Z" fill={colorSecondary} className="animate-pulse" />}
          {type === 'watcher' && isWorking && <circle cx="50" cy="50" r="6" fill={eyeColor} className="animate-pulse" />}
          {type === 'evaluator' && isWorking && <rect x="75" y="40" width="4" height="20" fill="#fff" className="eff-pen" />}
        </svg>
      </div>
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
  const isCrisis  = !done && diffDays > 5;
  const isOverdue = !done && diffDays > 2 && diffDays <= 5;

  let bg = source === 'taskflow' ? 'bg-blue-50/90 border-blue-400' : 'bg-emerald-50/90 border-emerald-400';
  let icon = source === 'taskflow' ? <List className="w-4 h-4 text-blue-500" /> : <Sparkles className="w-4 h-4 text-emerald-600" />;
  if (isCrisis)  { bg = 'bg-red-100/90 border-red-600 animate-pulse'; icon = <ShieldAlert className="w-4 h-4 text-red-600" />; }
  else if (isOverdue) { bg = 'bg-amber-100/90 border-amber-500'; icon = <Clock className="w-4 h-4 text-amber-600" />; }

  return (
    <div onClick={() => onClick(task)} className={`${bg} border-2 rounded-md p-2 shadow-sm hover:shadow-md cursor-pointer transition-transform hover:scale-105`}>
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
  const isJobStatus = !!(task.house_no || task.customer_name);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#f4e4bc] text-[#5c4033] w-full max-w-lg rounded-md border-4 border-[#8b5a2b] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#8b5a2b] text-amber-100 px-4 py-3 font-bold flex justify-between items-center border-b-2 border-[#5c4033]">
          <span className="flex items-center gap-2">{isJobStatus ? '📋 งานจาก LH Jobstatus' : '📝 งานจาก TaskFlow'}</span>
          <button onClick={onClose} className="bg-[#8b5a2b] hover:bg-[#5c4033] text-amber-100 px-5 py-1.5 rounded font-bold">ปิด</button>
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

export default function GuildSimulation({ tasks, sets, setTab }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const [a1, setA1] = useState({ x: 10, y: 55, action: 'idle', flip: false, msg: 'สแตนด์บาย' });
  const [a2, setA2] = useState({ x: 30, y: 40, action: 'idle', flip: false, msg: 'สแตนด์บาย' });
  const [a3, setA3] = useState({ x: 50, y: 65, action: 'idle', flip: false, msg: 'สแตนด์บาย' });
  const [a4, setA4] = useState({ x: 20, y: 80, action: 'idle', flip: false, msg: 'สแตนด์บาย' });

  // Agent 1: Scout
  useEffect(() => {
    const loop = setInterval(() => {
      setA1(p => ({ ...p, action: 'walking', x: -5, flip: true, msg: 'ออกไปดึงข้อมูลภายนอก...' }));
      setTimeout(() => {
        setA1(p => ({ ...p, action: 'working', msg: 'กำลัง Scrap ข้อมูลใหม่...' }));
        setTimeout(() => {
          setA1(p => ({ ...p, action: 'walking', x: 15, flip: false, msg: 'ได้ข้อมูลใหม่กลับมา!' }));
          setTimeout(() => setA1(p => ({ ...p, action: 'idle', msg: 'พร้อมลุย' })), 2000);
        }, 1500);
      }, 2000);
    }, 12000);
    return () => clearInterval(loop);
  }, []);

  // Agent 2: Wizard Dispatcher
  useEffect(() => {
    const loop = setInterval(() => {
      setA2(p => ({ ...p, action: 'working', msg: 'วิเคราะห์เควสต์ใหม่...' }));
      setTimeout(() => {
        setA2(p => ({ ...p, action: 'walking', x: 55, y: 40, flip: false, msg: 'นำเควสต์ไปติดบอร์ด' }));
        setTimeout(() => {
          setA2(p => ({ ...p, action: 'working', msg: 'อัปเดตกระดานเควสต์' }));
          setTimeout(() => {
            setA2(p => ({ ...p, action: 'walking', x: 30, flip: true, msg: 'เดินกลับโต๊ะ' }));
            setTimeout(() => setA2(p => ({ ...p, action: 'idle', msg: 'นั่งสมาธิ', flip: false })), 2000);
          }, 2000);
        }, 2000);
      }, 3000);
    }, 15000);
    return () => clearInterval(loop);
  }, []);

  // Agent 3: Assassin Watcher
  useEffect(() => {
    const waypoints = [ {x: 45, y: 70}, {x: 65, y: 75}, {x: 40, y: 50} ];
    const loop = setInterval(() => {
      if (Math.random() > 0.6) {
        setA3(p => ({ ...p, action: 'working', msg: 'ตรวจพบงานล่าช้า!! 🚨' }));
        setTimeout(() => {
          const wp = waypoints[Math.floor(Math.random() * waypoints.length)];
          setA3(p => ({ ...p, action: 'walking', x: wp.x, y: wp.y, flip: wp.x < p.x, msg: 'ออกตรวจตรา' }));
          setTimeout(() => setA3(p => ({ ...p, action: 'idle', msg: 'เฝ้าระวังความเงียบ' })), 2000);
        }, 3000);
      } else {
        const wp = waypoints[Math.floor(Math.random() * waypoints.length)];
        setA3(p => ({ ...p, action: 'walking', x: wp.x, y: wp.y, flip: wp.x < p.x, msg: 'ออกตรวจตรา' }));
        setTimeout(() => setA3(p => ({ ...p, action: 'idle', msg: 'เฝ้าระวังความเงียบ' })), 2000);
      }
    }, 8000);
    return () => clearInterval(loop);
  }, []);

  // Agent 4: Professor Evaluator
  useEffect(() => {
    const loop = setInterval(() => {
      setA4(p => ({ ...p, action: 'working', msg: 'เขียนรายงานสถิติ...' }));
      setTimeout(() => {
        setA4(p => ({ ...p, action: 'walking', x: 35, y: 70, flip: false, msg: 'จัดเก็บรายงานให้หัวหน้า' }));
        setTimeout(() => {
          setA4(p => ({ ...p, action: 'idle', msg: 'จัดเก็บสำเร็จ' }));
          setTimeout(() => {
            setA4(p => ({ ...p, action: 'walking', x: 20, y: 80, flip: true, msg: 'เดินกลับโต๊ะ' }));
            setTimeout(() => setA4(p => ({ ...p, action: 'idle', flip: false, msg: 'คำนวณข้อมูลต่อ' })), 2000);
          }, 1500);
        }, 2000);
      }, 4000);
    }, 18000);
    return () => clearInterval(loop);
  }, []);

  const isJobStatusTask = (t) => !!(t.house_no || t.customer_name || t.reported_date);
  const allJobStatusTasks = tasks.filter(t => isJobStatusTask(t));
  const allTaskFlowTasks = tasks.filter(t => !isJobStatusTask(t));
  const today = new Date().toISOString().split('T')[0];
  const todayTaskFlow = allTaskFlowTasks.filter(t => t.startDate === today || t.endDate === today);

  return (
    <div className="fixed inset-0 bg-stone-900 text-stone-100 flex flex-col font-sans overflow-hidden z-[9999]">
      <AgentStyles />
      <audio ref={audioRef} loop src={BGM_URL} />
      <div className="h-14 bg-stone-800/95 border-b border-stone-600 flex items-center justify-between px-4 shadow-lg z-30 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setTab('dashboard')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded shadow font-bold transition-colors">
            <Home className="w-4 h-4" /> กลับหน้าสรุปงาน
          </button>
          <div className="h-6 w-px bg-stone-600" />
          <h1 className="font-black text-xl tracking-wider text-amber-500 drop-shadow-md uppercase flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> LH Guild Simulator
          </h1>
        </div>
        <button onClick={() => { if(isPlaying) { audioRef.current.pause(); setIsPlaying(false); } else { audioRef.current.play().catch(()=>{}); setIsPlaying(true); } }} className="p-2 hover:bg-stone-700 rounded-full transition-colors">
          {isPlaying ? <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" /> : <Sparkles className="w-5 h-5 text-stone-500" />}
        </button>
      </div>

      <div className="flex-1 relative bg-[url('/tavern-bg.jpg')] bg-cover bg-center overflow-hidden">
        <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />
        <AgentSprite type="scout" title="🕵️ Agent 1 (Scout)" {...a1} />
        <AgentSprite type="wizard" title="🧠 Agent 2 (Dispatcher)" {...a2} />
        <AgentSprite type="watcher" title="⏱️ Agent 3 (Watcher)" {...a3} />
        <AgentSprite type="evaluator" title="📊 Agent 4 (Evaluator)" {...a4} />

        <div className="absolute right-4 top-4 bottom-4 w-[340px] bg-stone-900/90 rounded-lg border-4 border-[#5c4033] shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-30 backdrop-blur-sm">
          <div className="bg-amber-800/90 text-amber-100 text-center py-2.5 font-black border-b-2 border-amber-900 text-base tracking-widest uppercase">📋 Quest Board</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            <div className="bg-black/40 rounded p-2 mb-4 border border-white/10">
              <h3 className="text-[10px] font-bold text-emerald-400 mb-2 uppercase tracking-wider">New Scraped Quests (LH Jobstatus)</h3>
              <div className="space-y-2">
                {allJobStatusTasks.slice(0, 5).map(t => <QuestCard key={t.job_id || t.id} task={t} source="jobstatus" onClick={setSelectedTask} />)}
                {allJobStatusTasks.length === 0 && <p className="text-center text-xs text-gray-500 py-2">ไม่มีงานใหม่</p>}
              </div>
            </div>
            <div className="bg-black/40 rounded p-2 border border-white/10">
              <h3 className="text-[10px] font-bold text-blue-400 mb-2 uppercase tracking-wider">Active Internal Quests (TaskFlow)</h3>
              <div className="space-y-2">
                {todayTaskFlow.slice(0, 10).map(t => <QuestCard key={t.id} task={t} source="taskflow" onClick={setSelectedTask} />)}
                {todayTaskFlow.length === 0 && <p className="text-center text-xs text-gray-500 py-2">ไม่มีงานดำเนินการวันนี้</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-stone-900 border-t border-stone-700 p-2 flex justify-between text-xs font-bold text-stone-400 z-30 relative shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
        <div className="flex gap-6">
          <span className="flex items-center gap-1 text-emerald-400"><List className="w-3 h-3" /> กิจกรรมบอทกำลังรัน...</span>
        </div>
        <div className="flex gap-6">
          <span>รวมทั้งหมด: <span className="text-white">{tasks.length}</span> เควสต์</span>
        </div>
      </div>

      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}
