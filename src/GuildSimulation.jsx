import React, { useState, useEffect, useRef } from 'react';
import { Home, Volume2, VolumeX, AlertTriangle, Clock, Map, ShieldAlert, Sparkles, List, X } from 'lucide-react';

const BGM_URL = "/bgm.mp3";

// --- Character Sprite (Staff) ---
const CharacterSprite = ({ staff, staffClasses }) => {
  const staffClassObj = (staffClasses || []).find(c => c && c.id === staff.classId);
  const className = (staffClassObj && staffClassObj.className) ? staffClassObj.className : 'No Class';
  const fileBase = className.replace(/\s+/g, '-');
  
  const [imgSrc, setImgSrc] = useState(`/sprites/${fileBase}.gif`);
  const [showEmoji, setShowEmoji] = useState(false);

  // Waypoints สำหรับหลบโต๊ะ (ทางเดิน)
  const waypoints = [
    {x: 12, y: 40}, {x: 38, y: 45}, {x: 38, y: 70}, {x: 65, y: 80}, {x: 15, y: 85}, {x: 50, y: 35}
  ];
  const [pos, setPos] = useState(waypoints[Math.floor(Math.random() * waypoints.length)]);
  const [facingLeft, setFacingLeft] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        setPos(p => {
          const wp = waypoints[Math.floor(Math.random() * waypoints.length)];
          setFacingLeft(wp.x < p.x);
          return wp;
        });
      }
    }, 4000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute transition-all duration-[4000ms] ease-linear cursor-pointer group flex flex-col items-center select-none"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: Math.floor(pos.y) }}
    >
      <div className="bg-black/80 text-white text-[10px] px-2 py-0.5 rounded border border-amber-700/60 mb-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center pointer-events-none absolute -top-8">
        <span className="font-bold text-amber-300">{staff.name}</span>
        <span className="text-gray-300 text-[9px]">[{className}]</span>
      </div>
      <div className="relative w-20 h-28 flex items-end justify-center">
        {showEmoji ? (
          <span className="text-4xl">🧍</span>
        ) : (
          <img
            src={imgSrc}
            alt={className}
            onError={(e) => { e.target.src = `/sprites/${fileBase}.png`; e.target.onerror = () => setShowEmoji(true); }}
            className="h-full w-full object-contain drop-shadow-md"
            style={{ transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)', imageRendering: 'pixelated' }}
          />
        )}
      </div>
      <div className="w-12 h-1.5 bg-black/40 rounded-[100%] blur-[2px]" />
    </div>
  );
};

// --- Quest Card ---
const QuestCard = ({ task, source, onClick }) => {
  const parseDate = (dStr) => {
    if (!dStr) return Date.now();
    try {
      const [dp] = dStr.split(' ');
      const [d, m, y] = dp.split('/');
      return new Date(+y + 2500 - 543, +m - 1, +d).getTime();
    } catch { return Date.now(); }
  };
  const diffDays = (Date.now() - parseDate(task.reported_date)) / 86400000;
  const done = task.status === 'จบงาน' || task.status === 'จบงาน(รอใบงาน)';
  const isCrisis  = !done && diffDays > 5;
  const isOverdue = !done && diffDays > 2 && diffDays <= 5;

  let bg   = source === 'taskflow' ? 'bg-blue-50/90 border-blue-400' : 'bg-emerald-50/90 border-emerald-400';
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

// --- Task Detail Modal ---
const TaskModal = ({ task, onClose }) => {
  if (!task) return null;
  const isJobStatus = !!(task.house_no || task.customer_name);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#f4e4bc] text-[#5c4033] w-full max-w-lg rounded-md border-4 border-[#8b5a2b] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#8b5a2b] text-amber-100 px-4 py-3 font-bold flex justify-between items-center border-b-2 border-[#5c4033]">
          <span className="flex items-center gap-2">
            {isJobStatus ? '📋 งานจาก LH Jobstatus' : '📝 งานจาก TaskFlow'}
          </span>
          <button onClick={onClose} className="w-8 h-8 bg-black/20 rounded-full hover:bg-black/40 flex items-center justify-center"><X className="w-4 h-4"/></button>
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
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <strong className="text-red-800 flex items-center gap-1 mb-1"><AlertTriangle className="w-4 h-4"/>รายละเอียด:</strong>
            <p className="text-gray-800 ml-5 leading-relaxed">{task.details}</p>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#8b5a2b]/30">
            <span className="text-xs text-gray-500">ID: {task.job_id || task.id || '-'}</span>
            <button onClick={onClose} className="bg-[#8b5a2b] hover:bg-[#5c4033] text-amber-100 px-5 py-1.5 rounded font-bold">ปิด</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Stat Pill (clickable) ---
const StatPill = ({ label, value, color, tasks, onShowList }) => (
  <button
    onClick={() => tasks && tasks.length > 0 && onShowList(tasks, label)}
    className={`flex items-center gap-2 px-4 py-1 rounded shadow-inner border ${color} ${tasks && tasks.length > 0 ? 'cursor-pointer hover:brightness-110' : 'cursor-default'} transition-all`}
  >
    <span className="text-xs font-bold opacity-80">{label}</span>
    <span className="text-white text-lg font-black">{value}</span>
  </button>
);

// --- List Modal ---
const ListModal = ({ title, tasks, onSelect, onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] backdrop-blur-sm p-4" onClick={onClose}>
    <div className="bg-stone-900 text-white w-full max-w-lg rounded-xl border-2 border-amber-600 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between bg-amber-700 px-4 py-3">
        <span className="font-black text-amber-100">{title} ({tasks.length} รายการ)</span>
        <button onClick={onClose} className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center hover:bg-black/40"><X className="w-4 h-4"/></button>
      </div>
      <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
        {tasks.map((t, i) => (
          <div key={i} onClick={() => { onSelect(t); onClose(); }} className="bg-stone-800 hover:bg-stone-700 rounded-lg p-3 cursor-pointer border border-stone-700 hover:border-amber-500 transition-all">
            <div className="font-bold text-amber-300 text-sm truncate">{t.project || t.details?.slice(0,30)}</div>
            <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.details}</div>
            {(t.reported_date || t.startDate) && <div className="text-[10px] text-gray-500 mt-1">📅 {t.reported_date || t.startDate}</div>}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ===== Main Component =====
export default function GuildSimulation({ tasks, sets, setTab }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [listModal, setListModal] = useState(null);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setIsPlaying(true); }
  };

  const parseDate = (dStr) => {
    if (!dStr) return Date.now();
    try {
      const [dp] = dStr.split(' ');
      const [d, m, y] = dp.split('/');
      return new Date(+y + 2500 - 543, +m - 1, +d).getTime();
    } catch { return Date.now(); }
  };

  // --- Agent State Machines ---
  const [a1, setA1] = useState({ x: 60, y: 32, state: 'รอเวลารอบดึงข้อมูล...', flip: false }); // หน้าเตาผิง
  const [a2, setA2] = useState({ x: 30, y: 22, state: 'รอประเมินงานใหม่' }); // หลังเคาน์เตอร์บาร์
  const [a3, setA3] = useState({ x: 38, y: 45, state: 'ลาดตระเวนดูงานค้าง', flip: false }); // ทางเดินกลาง
  const [a4, setA4] = useState({ x: 50, y: 48, state: 'เก็บข้อมูลเพื่อสรุป 17:00' }); // โต๊ะด้านขวา

  // Agent 1 & 2 Process Loop
  useEffect(() => {
    let step = 0;
    const processLoop = setInterval(() => {
      step = (step + 1) % 6;
      if (step === 1) {
        setA1({ x: 60, y: 32, state: 'ดึงงานจาก LH Jobstatus', flip: false });
      } else if (step === 2) {
        setA1({ x: 60, y: 32, state: 'คัดกรองข้อมูล...', flip: false });
      } else if (step === 3) {
        // เดินมาที่หน้าเคาน์เตอร์บาร์ (หลบโต๊ะ)
        setA1({ x: 42, y: 35, state: 'ส่งงานให้ Dispatcher', flip: true }); 
      } else if (step === 4) {
        setA2(prev => ({ ...prev, state: 'วิเคราะห์ความด่วน (Severity)' }));
      } else if (step === 5) {
        setA2(prev => ({ ...prev, state: 'แจ้งเตือนทีมช่างผ่าน LINE!' }));
        setA1({ x: 60, y: 32, state: 'เดินกลับไปเฝ้าบอร์ด', flip: false }); 
      } else if (step === 0) {
        setA2(prev => ({ ...prev, state: 'รอประเมินงานใหม่' }));
        setA1({ x: 60, y: 32, state: 'แสตนด์บายรอรอบต่อไป', flip: false });
      }
    }, 4000);
    return () => clearInterval(processLoop);
  }, []);

  // Agent 3 Process Loop (Waypoint Patrol)
  useEffect(() => {
    const waypoints = [
      {x: 40, y: 45}, {x: 38, y: 75}, {x: 15, y: 40}, {x: 55, y: 80}, {x: 25, y: 85}
    ];
    const patrolLoop = setInterval(() => {
      setA3(prev => {
        const wp = waypoints[Math.floor(Math.random() * waypoints.length)];
        const isChecking = Math.random() > 0.5;
        return { 
          x: wp.x, y: wp.y, 
          state: isChecking ? 'จี้ตามงานที่ค้างเกิน 48ชม.!' : 'ลาดตระเวนดูงานค้าง',
          flip: wp.x < prev.x
        };
      });
    }, 6000);
    return () => clearInterval(patrolLoop);
  }, []);

  // ===== Data Processing =====
  const isJobStatusTask = (t) => !!(t.house_no || t.customer_name || t.reported_date);
  const allJobStatusTasks    = tasks.filter(t => isJobStatusTask(t));
  const allTaskFlowTasks     = tasks.filter(t => !isJobStatusTask(t));

  // TaskFlow stats
  const today = new Date().toISOString().split('T')[0];
  const todayTaskFlow = allTaskFlowTasks.filter(t => t.startDate === today || t.endDate === today);
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthTaskFlow = allTaskFlowTasks.filter(t => (t.startDate || '').startsWith(thisMonth));
  const pendingTaskFlow = allTaskFlowTasks.filter(t => t.status !== 'จบงาน' && t.status !== 'จบงาน(รอใบงาน)');

  // JobStatus stats
  const activeJobStatus = allJobStatusTasks.filter(t => t.status !== 'จบงาน' && t.status !== 'จบงาน(รอใบงาน)');
  const overdueJobStatus = activeJobStatus.filter(t => (Date.now() - parseDate(t.reported_date)) > 2 * 86400000);
  const crisisJobStatus  = activeJobStatus.filter(t => (Date.now() - parseDate(t.reported_date)) > 5 * 86400000);

  // Quest Board
  const boardTasks = [
    ...crisisJobStatus.map(t => ({ ...t, _source: 'jobstatus' })),
    ...overdueJobStatus.filter(t => !crisisJobStatus.includes(t)).map(t => ({ ...t, _source: 'jobstatus' })),
    ...activeJobStatus.filter(t => !overdueJobStatus.includes(t)).map(t => ({ ...t, _source: 'jobstatus' })),
    ...pendingTaskFlow.map(t => ({ ...t, _source: 'taskflow' })),
  ].slice(0, 60);

  return (
    <div className="fixed inset-0 bg-stone-900 text-stone-100 flex flex-col font-sans overflow-hidden z-[9999]">
      <audio ref={audioRef} loop src={BGM_URL} />

      {/* Header */}
      <div className="h-14 bg-stone-800/95 border-b border-stone-600 flex items-center justify-between px-4 shadow-lg z-20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setTab('dashboard')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded shadow font-bold transition-colors">
            <Home className="w-4 h-4" /> กลับหน้าสรุปงาน
          </button>
          <div className="h-6 w-px bg-stone-600" />
          <h1 className="text-xl font-black text-amber-500 tracking-wider flex items-center gap-2">
            <Map className="w-5 h-5" /> LH Guild Hall
          </h1>
        </div>
        <button onClick={toggleMusic} className="flex items-center gap-2 bg-stone-700 hover:bg-stone-600 border border-stone-500 px-3 py-1.5 rounded-full text-xs font-bold transition-colors">
          {isPlaying ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          <span>{isPlaying ? 'BGM: ON' : 'BGM: OFF'}</span>
        </button>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative bg-[url('/tavern-bg.jpg')] bg-cover bg-center overflow-hidden">
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        {/* === AGENT 1 (The Filter) === */}
        <div className="absolute transition-all duration-[3000ms] ease-in-out flex flex-col items-center z-30"
             style={{ left: `${a1.x}%`, top: `${a1.y}%` }}>
          <div className="bg-blue-900/90 text-blue-100 text-[10px] px-2 py-1 rounded-md border border-blue-400 mb-2 whitespace-nowrap shadow-lg flex items-center gap-1 absolute -top-10">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"/>
            {a1.state}
          </div>
          <div className="bg-black/80 text-blue-300 text-[9px] px-1.5 py-0.5 rounded border border-blue-900 mb-1">🛡️ Agent 1</div>
          <div className="w-32 h-40 flex items-end justify-center">
            <img src="/sprites/agent1.gif" alt="A1" onError={e=>e.target.src='/sprites/agent1.png'} className="h-full object-contain drop-shadow-lg scale-125 origin-bottom" style={{ transform: a1.flip ? 'scaleX(-1) scale(1.25)' : 'scaleX(1) scale(1.25)', imageRendering: 'pixelated' }} />
          </div>
          <div className="w-20 h-2 bg-black/40 rounded-[100%] blur-[2px] mt-2" />
        </div>

        {/* === AGENT 2 (The Dispatcher) === */}
        <div className="absolute transition-all duration-500 ease-in-out flex flex-col items-center z-10"
             style={{ left: `${a2.x}%`, top: `${a2.y}%` }}>
          <div className="bg-purple-900/90 text-purple-100 text-[10px] px-2 py-1 rounded-md border border-purple-400 mb-2 whitespace-nowrap shadow-lg flex items-center gap-1 absolute -top-10">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"/>
            {a2.state}
          </div>
          <div className="bg-black/80 text-purple-300 text-[9px] px-1.5 py-0.5 rounded border border-purple-900 mb-1">🧠 Agent 2</div>
          <div className="w-32 h-40 flex items-end justify-center">
            <img src="/sprites/agent2.gif" alt="A2" onError={e=>e.target.src='/sprites/agent2.png'} className="h-full object-contain drop-shadow-lg scale-125 origin-bottom" style={{ imageRendering: 'pixelated' }} />
          </div>
          <div className="w-20 h-2 bg-black/40 rounded-[100%] blur-[2px] mt-2" />
        </div>

        {/* === AGENT 3 (The Watcher) === */}
        <div className="absolute transition-all duration-[4000ms] ease-linear flex flex-col items-center z-20"
             style={{ left: `${a3.x}%`, top: `${a3.y}%` }}>
          <div className="bg-red-900/90 text-red-100 text-[10px] px-2 py-1 rounded-md border border-red-400 mb-2 whitespace-nowrap shadow-lg flex items-center gap-1 absolute -top-10">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"/>
            {a3.state}
          </div>
          <div className="bg-black/80 text-red-300 text-[9px] px-1.5 py-0.5 rounded border border-red-900 mb-1">⏱️ Agent 3</div>
          <div className="w-32 h-40 flex items-end justify-center">
            <img src="/sprites/agent3.gif" alt="A3" onError={e=>e.target.src='/sprites/agent3.png'} className="h-full object-contain drop-shadow-lg scale-125 origin-bottom" style={{ transform: a3.flip ? 'scaleX(-1) scale(1.25)' : 'scaleX(1) scale(1.25)', imageRendering: 'pixelated' }} />
          </div>
          <div className="w-20 h-2 bg-black/40 rounded-[100%] blur-[2px] mt-2" />
        </div>

        {/* === AGENT 4 (The Evaluator) === */}
        <div className="absolute transition-all duration-500 ease-in-out flex flex-col items-center z-10"
             style={{ left: `${a4.x}%`, top: `${a4.y}%` }}>
          <div className="bg-green-900/90 text-green-100 text-[10px] px-2 py-1 rounded-md border border-green-400 mb-2 whitespace-nowrap shadow-lg flex items-center gap-1 absolute -top-10">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
            {a4.state}
          </div>
          <div className="bg-black/80 text-green-300 text-[9px] px-1.5 py-0.5 rounded border border-green-900 mb-1">📊 Agent 4</div>
          <div className="w-32 h-40 flex items-end justify-center">
            <img src="/sprites/agent4.gif" alt="A4" onError={e=>e.target.src='/sprites/agent4.png'} className="h-full object-contain drop-shadow-lg scale-125 origin-bottom" style={{ imageRendering: 'pixelated' }} />
          </div>
          <div className="w-20 h-2 bg-black/40 rounded-[100%] blur-[2px] mt-2" />
        </div>

        {/* Quest Board */}
        <div className="absolute right-4 top-4 bottom-4 w-[340px] bg-stone-900/90 rounded-lg border-4 border-[#5c4033] shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-20 backdrop-blur-sm">
          <div className="bg-amber-800/90 text-amber-100 text-center py-2.5 font-black border-b-2 border-amber-900 text-base tracking-widest uppercase">
            📋 Quest Board
          </div>
          <div className="flex gap-2 px-3 py-1.5 bg-stone-800/80 border-b border-stone-700 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>LH Jobstatus</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>TaskFlow</span>
            <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-red-400"/>วิกฤต</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400"/>เกิน 48 ชม.</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {boardTasks.length === 0
              ? <div className="text-center text-amber-200/40 mt-12 font-bold">ไม่มีเควสค้าง! ✨</div>
              : boardTasks.map((t, i) => (
                  <QuestCard key={i} task={t} source={t._source} onClick={setSelectedTask} />
                ))
            }
          </div>
        </div>

        {/* Staff Sprites */}
        {sets?.staffStats?.map((staff, idx) => (
          <CharacterSprite key={idx} staff={staff} staffClasses={sets?.staffClasses} />
        ))}
      </div>

      {/* Footer — แบ่ง 2 กลุ่มชัดเจน */}
      <div className="shrink-0 bg-stone-900 border-t-2 border-stone-700 flex flex-wrap items-center justify-center gap-2 px-4 py-2 z-10">
        <div className="flex items-center gap-1 mr-2">
          <span className="text-[10px] text-blue-300 font-bold border border-blue-700 px-1.5 py-0.5 rounded">📝 TaskFlow</span>
        </div>
        <StatPill label="งานวันนี้"   value={todayTaskFlow.length}   color="bg-blue-900/50 border-blue-700 text-blue-200"    tasks={todayTaskFlow}  onShowList={(t,l)=>setListModal({title:l,tasks:t})} />
        <StatPill label="งานเดือนนี้"  value={monthTaskFlow.length}  color="bg-indigo-900/50 border-indigo-700 text-indigo-200" tasks={monthTaskFlow}  onShowList={(t,l)=>setListModal({title:l,tasks:t})} />
        <StatPill label="รอดำเนินการ" value={pendingTaskFlow.length} color="bg-amber-900/40 border-amber-700 text-amber-200"   tasks={pendingTaskFlow} onShowList={(t,l)=>setListModal({title:l,tasks:t})} />

        <div className="w-px h-8 bg-stone-600 mx-2" />

        <div className="flex items-center gap-1 mr-2">
          <span className="text-[10px] text-emerald-300 font-bold border border-emerald-700 px-1.5 py-0.5 rounded">📋 LH Jobstatus</span>
        </div>
        <StatPill label="⚠️ ค้างเกิน 48ชม." value={overdueJobStatus.length - crisisJobStatus.length} color="bg-orange-900/40 border-orange-700 text-orange-200"
          tasks={overdueJobStatus.filter(t => !crisisJobStatus.includes(t))} onShowList={(t,l)=>setListModal({title:l,tasks:t})} />
        <StatPill label="🚨 วิกฤต" value={crisisJobStatus.length} color={`bg-red-900/60 border-red-600 text-red-200 ${crisisJobStatus.length > 0 ? 'animate-pulse' : ''}`}
          tasks={crisisJobStatus} onShowList={(t,l)=>setListModal({title:l,tasks:t})} />
      </div>

      {/* Modals */}
      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
      {listModal && (
        <ListModal
          title={listModal.title}
          tasks={listModal.tasks}
          onSelect={t => { setSelectedTask(t); setListModal(null); }}
          onClose={() => setListModal(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #92400e; border-radius: 4px; }
      `}} />
    </div>
  );
}
