import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import Cropper from 'react-easy-crop';
import * as XLSX from 'xlsx';
import GuildSimulation from './GuildSimulation.jsx';
import ClassEmblem from './ClassEmblem.jsx';

// ⚠️ นำลิงก์ Web App (GAS) เดิมมาใส่ เพื่อให้ระบบยังคงสั่งส่งอีเมลได้
const API_URL = "https://script.google.com/macros/s/AKfycbxrAOQLMQ3l3PcB800hUeMly_oi-jL4s8ZjlWncuCx9seMqSHMeZb0D9CxjyKpOZuaEmw/exec";

// ⚠️ นำ Firebase Config ของคุณมาวางทับที่นี่
const customFirebaseConfig = {
  apiKey: "AIzaSyB6KvZWr8b2dXHxysIqXwk-SsdiuVNYv94",
  authDomain: "taskflow-plus-3fce7.firebaseapp.com",
  projectId: "taskflow-plus-3fce7",
  storageBucket: "taskflow-plus-3fce7.firebasestorage.app",
  messagingSenderId: "829369182338",
  appId: "1:829369182338:web:5c6c326a6dcb1a7a6e2c9b"
};

// --- การตั้งค่า Firebase ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : customFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const getColRef = (colName) => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return collection(db, 'artifacts', appId, 'public', 'data', colName);
};
const getDocRef = (colName, docId) => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return doc(db, 'artifacts', appId, 'public', 'data', colName, String(docId));
};

// --- สไตล์และฟอนต์ (Global Styles) ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
    * { font-family: 'Prompt', sans-serif; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .animate-in { animation: fadeIn 0.2s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    @media print {
      body { background-color: white !important; -webkit-print-color-adjust: exact; }
      #app-main { display: none !important; }
      #print-area { display: block !important; padding: 20px; }
      @page { margin: 10mm; size: A4 portrait; }
      .print-break { page-break-inside: avoid; }
    }
  `}</style>
);

// --- ฟังก์ชันช่วยเหลือต่างๆ ---
const REQ_TYPES = ['SVC', 'ICSC', 'จนท./ผจก.LH', 'ผู้ควบคุมงาน', 'CEM'];
const THEME = { primary: '#0f2e4a', secondary: '#bca374', danger: '#dc3545', success: '#28a745' };
const POTENTIAL_IDENTITY_MAP = {"agi_str":"The Blitzkrieg (การรุกคืบฉับพลัน)","dex_str":"The Perfection (มาตรฐานไร้ที่ติ)","int_str":"The Adaptation (การพลิกแพลงปรับตัว)","con_str":"The Endurance (ความทนทานต่อแรงกดดัน)","sen_str":"The Commander (ผู้นำการบริหารงาน)","agi_dex":"The Flawless (ผลงานเนียบไร้รอยขีดข่วน)","agi_int":"The Opportunist (นักบริหารช่องว่างวิกฤต)","agi_con":"The Survivor (ผู้หยัดยืนทุกสภาวะ)","agi_sen":"The Link (ศูนย์กลางเครือข่ายประสานงาน)","dex_int":"The Designer (นักออกแบบระบบงาน)","con_dex":"The Guardian (ผู้พิทักษ์มาตรฐาน)","dex_sen":"The Hunter (นักติดตามและล็อกเป้าหมาย)","con_int":"The Root (ฐานรากอันแข็งแกร่ง)","int_sen":"The Tactician (นักกลยุทธ์)","con_sen":"The Unbreakable (ความมั่นคงที่ไม่สั่นคลอน)","agi_con_dex":"The Watcher (ผู้เฝ้าระวังความราบรื่น)","agi_con_int":"The Nonstop (แรงขับเคลื่อนอย่างต่อเนื่อง)","agi_con_sen":"The Vanguard (กองหน้าผู้เตรียมพร้อม)","agi_con_str":"The Berserk (ความมุ่งมั่นทะลวงอุปสรรค)","agi_dex_int":"The Independent (อิสระในแนวคิด)","agi_dex_sen":"The Mirage (การจัดการอย่างแนบเนียน)","agi_dex_str":"The Quickdraw (การจัดการเด็ดขาดในพริบตา)","agi_int_sen":"The Espionage (นักเจาะลึกข้อมูล)","agi_int_str":"The Catalyst (ปัจจัยเร่งความสำเร็จ)","agi_sen_str":"The Kinetic (พลังขับเคลื่อนทีม)","con_dex_int":"The Origin (จุดเริ่มต้นของระบบงาน)","con_dex_sen":"The Gatekeeper (ผู้คัดกรองและเฝ้าประตูมาตรฐาน)","con_dex_str":"The Xtreme (ขีดสุดแห่งความทุ่มเท)","con_int_sen":"The Pillar (ฐานค้ำจุนทีมงาน)","con_int_str":"The Antithesis (การพลิกวิกฤตสถานการณ์)","con_sen_str":"The Yieldless (ผู้นำที่ไม่ยอมจำนนต่ออุปสรรค)","dex_int_sen":"The Visionary (ผู้หยั่งรู้แนวโน้ม)","dex_int_str":"The Masterpiece (ความเชี่ยวชาญระดับชิ้นเอก)","dex_sen_str":"The X-Axis (จุดตัดแห่งความแม่นยำ)","int_sen_str":"The Almighty (ผู้ควบคุมทิศทางเบ็ดเสร็จ)"};
const getArchetypeIdentity = (statsObj) => {
      if (!statsObj) return '-';
      const tieBreakers = { str: 0.06, agi: 0.05, dex: 0.04, int: 0.03, con: 0.02, sen: 0.01 };
      const rawStats = Object.keys(tieBreakers).map(k => Number(statsObj[k])||0);
      const maxStat = Math.max(...rawStats);
      const minStat = Math.min(...rawStats);
      
      if (maxStat <= 5) {
         if (maxStat === 5 && minStat === 5) return 'The Standard (ผลงานตามมาตรฐาน)';
         if (maxStat === 4 && minStat === 4) return 'The Maintainer (ผู้ประคองงาน)';
         if (maxStat <= 3 && minStat === maxStat) return 'Needs Attention (ผู้ต้องได้รับการดูแล)';
         if (minStat >= 4) return 'Undeveloped Potential (ศักยภาพที่ยังไม่ถูกพัฒนา)';
         if (maxStat <= 3) return 'The Beginner (ผู้เริ่มต้น)';
         const has4 = rawStats.some(v => v >= 4);
         const has3 = rawStats.some(v => v <= 3);
         if (has4 && has3) return 'Emerging Talent (พรสวรรค์ที่เพิ่งฉายแวว)';
         return 'Uncalibrated (ยังไม่ผ่านการสอบเทียบ)';
      }

      const validStats = Object.keys(tieBreakers).map(k => ({ key: k, val: Number(statsObj[k])||0, adj: (Number(statsObj[k])||0) + tieBreakers[k] })).filter(s => s.val >= 5).sort((a,b) => b.adj - a.adj);
      if (validStats.length < 2) return 'Novice (ระดับเริ่มต้น)';
      if (validStats.length === 6 && validStats[0].val === validStats[5].val) return 'All-Rounder (สายสมดุล)';
      const useTop3 = validStats.length >= 3 && validStats[2].val >= 6;
      const topKeys = validStats.slice(0, useTop3 ? 3 : 2).map(s => s.key).sort();
      const POTENTIAL_IDENTITY_MAP = {"agi_str":"The Blitzkrieg (การรุกคืบฉับพลัน)","dex_str":"The Perfection (มาตรฐานไร้ที่ติ)","int_str":"The Adaptation (การพลิกแพลงปรับตัว)","con_str":"The Endurance (ความทนทานต่อแรงกดดัน)","sen_str":"The Commander (ผู้นำการบริหารงาน)","agi_dex":"The Flawless (ผลงานเนียบไร้รอยขีดข่วน)","agi_int":"The Opportunist (นักบริหารช่องว่างวิกฤต)","agi_con":"The Survivor (ผู้หยัดยืนทุกสภาวะ)","agi_sen":"The Link (ศูนย์กลางเครือข่ายประสานงาน)","dex_int":"The Designer (นักออกแบบระบบงาน)","con_dex":"The Guardian (ผู้พิทักษ์มาตรฐาน)","dex_sen":"The Hunter (นักติดตามและล็อกเป้าหมาย)","con_int":"The Root (ฐานรากอันแข็งแกร่ง)","int_sen":"The Tactician (นักกลยุทธ์)","con_sen":"The Unbreakable (ความมั่นคงที่ไม่สั่นคลอน)","agi_con_dex":"The Watcher (ผู้เฝ้าระวังความราบรื่น)","agi_con_int":"The Nonstop (แรงขับเคลื่อนอย่างต่อเนื่อง)","agi_con_sen":"The Vanguard (กองหน้าผู้เตรียมพร้อม)","agi_con_str":"The Berserk (ความมุ่งมั่นทะลวงอุปสรรค)","agi_dex_int":"The Independent (อิสระในแนวคิด)","agi_dex_sen":"The Mirage (การจัดการอย่างแนบเนียน)","agi_dex_str":"The Quickdraw (การจัดการเด็ดขาดในพริบตา)","agi_int_sen":"The Espionage (นักเจาะลึกข้อมูล)","agi_int_str":"The Catalyst (ปัจจัยเร่งความสำเร็จ)","agi_sen_str":"The Kinetic (พลังขับเคลื่อนทีม)","con_dex_int":"The Origin (จุดเริ่มต้นของระบบงาน)","con_dex_sen":"The Gatekeeper (ผู้คัดกรองและเฝ้าประตูมาตรฐาน)","con_dex_str":"The Xtreme (ขีดสุดแห่งความทุ่มเท)","con_int_sen":"The Pillar (ฐานค้ำจุนทีมงาน)","con_int_str":"The Antithesis (การพลิกวิกฤตสถานการณ์)","con_sen_str":"The Yieldless (ผู้นำที่ไม่ยอมจำนนต่ออุปสรรค)","dex_int_sen":"The Visionary (ผู้หยั่งรู้แนวโน้ม)","dex_int_str":"The Masterpiece (ความเชี่ยวชาญระดับชิ้นเอก)","dex_sen_str":"The X-Axis (จุดตัดแห่งความแม่นยำ)","int_sen_str":"The Almighty (ผู้ควบคุมทิศทางเบ็ดเสร็จ)"};
      return POTENTIAL_IDENTITY_MAP[topKeys.join('_')] || '-';
  };

const Icon = ({ name, size = 24, color = "currentColor", className = "" }) => {
  const iconName = Object.keys(LucideIcons).find(k => k.toLowerCase() === name.toLowerCase().replace(/[-_]/g, ''));
  const Comp = LucideIcons[iconName] || LucideIcons.CircleCheck;
  return <Comp size={size} color={color} className={className} />;
};

const RadarChart = ({ baseStats = [], userStats = [] }) => {
  const max = 10, size = 200, center = 100, radius = 80;
  const getPoint = (val, index) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (val / max) * radius;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  };
  const labels = ['STR', 'AGI', 'DEX', 'INT', 'CON', 'SEN'];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[250px] mx-auto overflow-visible">
      {[2, 4, 6, 8, 10].map(level => <polygon key={level} points={labels.map((_, i) => getPoint(level, i)).join(' ')} fill="none" stroke="#e5e7eb" strokeWidth="1" />)}
      {labels.map((_, i) => <line key={i} x1={center} y1={center} x2={getPoint(10, i).split(',')[0]} y2={getPoint(10, i).split(',')[1]} stroke="#e5e7eb" strokeWidth="1" />)}
      {labels.map((l, i) => { const [x, y] = getPoint(11.5, i).split(','); return <text key={i} x={x} y={y} fontSize="11" fontWeight="bold" fill="#4b5563" textAnchor="middle" dominantBaseline="middle">{l}</text>; })}
      {userStats.length === 6 && <polygon points={userStats.map((v, i) => getPoint(v, i)).join(' ')} fill="rgba(15, 46, 74, 0.4)" stroke="#0f2e4a" strokeWidth="2" />}
      {userStats.map((v, i) => { const [x, y] = getPoint(v, i).split(','); return <circle key={i} cx={x} cy={y} r="3" fill="#0f2e4a" />; })}
    </svg>
  );
};

const getCleanVal = (r, keys) => {
  for (let k in r) {
    const cln = String(k).replace(/[\s\(\)\[\]\-]/g, '').toLowerCase();
    for (let key of keys) if (cln === String(key).replace(/[\s\(\)\[\]\-]/g, '').toLowerCase() && r[k] !== undefined && r[k] !== '') return r[k]; 
  }
  return null;
};

const getTStr = () => new Date().toISOString().split('T')[0];
const getMStr = () => getTStr().slice(0, 7);
const fDate = (ds) => { if (!ds) return ''; const d = new Date(ds); return isNaN(d.getTime()) ? String(ds) : d.toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' }); };
const pYMD = (v) => { if(!v) return ''; const d = new Date(v); return isNaN(d.getTime()) ? String(v).trim().substring(0,10) : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const parseTimeForInput = (timeStr) => { if (!timeStr) return "17:30"; const m = String(timeStr).match(/^(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : "17:30"; };
const downloadCSV = (data, filename) => { if(!data || !data.length) return alert('ไม่มีข้อมูล'); const keys = Array.from(new Set(data.flatMap(Object.keys))); const csv = [ keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k]||'').replace(/"/g, '""')}"`).join(',')) ].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); };

const SimplePieChart = ({ data, title }) => {
  let cP = 0; const t = data.reduce((s, i) => s + i.value, 0); const getC = (p) => [Math.cos(2*Math.PI*p), Math.sin(2*Math.PI*p)];
  return (
    <div className="flex flex-col items-center w-full">
      <h3 className="text-sm font-bold mb-4 text-[#0f2e4a]">{title}</h3>
      {t === 0 ? <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center text-xs text-gray-400">ไม่มีข้อมูล</div> : 
      <svg viewBox="-1 -1 2 2" className="w-32 h-32 -rotate-90">
        {data.map((s, i) => { 
          if(s.value===0) return null; const [sX, sY] = getC(cP); cP += s.value/t; const [eX, eY] = getC(cP); 
          if(s.value===t) return <circle key={i} cx="0" cy="0" r="1" fill={s.color} />; 
          return <path key={i} d={`M ${sX} ${sY} A 1 1 0 ${s.value/t>0.5?1:0} 1 ${eX} ${eY} L 0 0`} fill={s.color}><title>{s.name}: {s.value}</title></path>; 
        })}
        <circle cx="0" cy="0" r="0.6" fill="white" />
      </svg>}
      <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">{data.map((item, i)=><div key={i} className="flex items-center"><span className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: item.color}}></span>{item.name} ({item.value})</div>)}</div>
    </div>
  );
};


export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  const [tasks, setTasks] = useState([]);
  const [informs, setInforms] = useState([]);
  const [sets, setSets] = useState({ areas: [], projects: [], jobTypes: [], locations: [], emails: [], slas: [], overdueTime: '17:30', lateWorkOrderHours: 24, staffClasses: [], staffStats: [] });
  
  const [gFilt, setGilt] = useState({ area: 'ทั้งหมด', project: 'ทั้งหมด', month: getMStr(), status: 'ทั้งหมด', date: getTStr(), staffName: 'ทั้งหมด' });
  const [setUnlk, setSetUnlk] = useState(false);
  const [teamUnlk, setTeamUnlk] = useState(false);
  const [pwd, setPwd] = useState('');
  const [sInp, setSInp] = useState({ jobTypes: '', locations: '', areas: '', projects: '', projArea: '', slas: '', slaDays: '', classId: '', className: '', cStr: 5, cAgi: 5, cDex: 5, cInt: 5, cCon: 5, cSen: 5 });
  
  const [teamForm, setTeamForm] = useState({ id: '', name: '', classId: '', image: '', str: 5, agi: 5, dex: 5, int: 5, con: 5, sen: 5, cx: null, tech: null, sla: null, crisis: null, resource: null, innovation: null });
  const [selTeam, setSelTeam] = useState(null);
  const [cropModal, setCropModal] = useState({ isOpen: false, imageSrc: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null });

  const [emForm, setEmForm] = useState({ name: '', email: '', selectedProjs: [] });

  const [iTab, setITab] = useState('form');
  const [iMod, setIMod] = useState({ isOpen: false, type: '', id: null, val: '' });
  const [infView, setInfView] = useState(null); 
  const [tMod, setTMod] = useState(false);
  const [eTask, setETask] = useState(null);
  const [sRsn, setSReason] = useState('');
  const [showStartReason, setShowStartReason] = useState(false);
  const [sList, setSList] = useState({ tasks: [], informs: [] });
  const [rCfg, setRConfig] = useState({ topic: 'task', type: 'month', val: getMStr(), area: 'ทั้งหมด', project: 'ทั้งหมด', staffName: 'ทั้งหมด' });
  const [sDate, setSDate] = useState({ from: getMStr() + '-01', to: getMStr() + '-28' });
  const [sMod, setSMod] = useState({ isOpen: false, taskId: null, type: '', reason: '', workOrderNo: '', noWO: false, forceWO: false, isOverdue: false, overdueReason: '', postponeDate: getTStr() });
  const [cPop, setCPop] = useState({ isOpen: false, date: null, tasks: [] });
  const [bMod, setBMod] = useState({ isOpen: false, group: null, type: '' });
  const [oPop, setOPop] = useState({isOpen: false, tasks: []});
  const [teamEditMode, setTeamEditMode] = useState(false);

  const [taskForm, setTaskForm] = useState({ receivedDate: getTStr(), details: '', requester: '', slaCategory: '', staffName: '', project: '', area: '', startDate: getTStr(), endDate: getTStr() });
  const [informForm, setInformForm] = useState({ date: getTStr(), requesterName: '', phone: '', staffName: '', project: '', area: '', jobType: '', location: '', details: '' });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Auth Error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const unsubTasks = onSnapshot(getColRef('Tasks'), (snap) => {
      const arr = []; snap.forEach(d => arr.push(d.data())); setTasks(arr);
    }, console.error);

    const unsubInfs = onSnapshot(getColRef('InformJobs'), (snap) => {
      const arr = []; snap.forEach(d => arr.push(d.data())); setInforms(arr);
    }, console.error);

    const unsubSets = onSnapshot(getDocRef('Settings', 'main'), (doc) => {
      if (doc.exists()) {
          const d = doc.data();
          setSets({
              areas: d.areas || [],
              projects: d.projects || [],
              jobTypes: d.jobTypes || [],
              locations: d.locations || [],
              emails: d.emails || [],
              slas: d.slas || [],
              overdueTime: d.overdueTime || '17:30',
              lateWorkOrderHours: d.lateWorkOrderHours || 24,
              staffClasses: d.staffClasses || [],
              staffStats: d.staffStats || [],
              statConfigs: d.statConfigs || {}
          });
      }
      setLoading(false);
    }, console.error);

    return () => { unsubTasks(); unsubInfs(); unsubSets(); };
  }, [user]);

  useEffect(() => {
    if (!user || tasks.length === 0) return;
    const today = getTStr();
    let updates = [];

    tasks.forEach(t => {
      let currentStatus = t.overdueStatus || 'ปกติ';
      let needsUpdate = false;

      if (t.status === 'จบงาน(รอใบงาน)' && t.completedDate) {
         const diffTime = new Date(today).getTime() - new Date(t.completedDate).getTime();
         const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
         if (diffDays > 3 && currentStatus !== 'ออกใบงานช้า') {
             currentStatus = 'ออกใบงานช้า';
             needsUpdate = true;
         }
      } 
      else if (!t.status?.startsWith('จบงาน') && t.status !== 'ยกเลิก') {
         if (chkOvdTimeAware(t, today) && currentStatus !== 'เกินกำหนด' && currentStatus !== 'ออกใบงานช้า') {
             currentStatus = 'เกินกำหนด';
             needsUpdate = true;
         }
      }

      // 🛠️ One-time Retroactive Fix: 
      // If a task is completed but was wrongly flagged as "เกินกำหนด" because of the old logic
      if (t.status?.startsWith('จบงาน') && currentStatus === 'เกินกำหนด') {
          if ((t.completedDate || '') <= t.endDate) {
              currentStatus = 'ปกติ';
              needsUpdate = true;
          }
      }

      // Sync lateWorkOrder flag for existing "ออกใบงานช้า" tasks
      if (currentStatus === 'ออกใบงานช้า' && !t.lateWorkOrder) {
          t.lateWorkOrder = true;
          needsUpdate = true;
      }

      // Support legacy 'จบงาน' without WO -> migrate to 'จบงาน(รอใบงาน)'
      if (t.status === 'จบงาน' && !t.workOrderNo && t.completedDate) {
          t.status = 'จบงาน(รอใบงาน)';
          needsUpdate = true;
      }

      if (needsUpdate) {
          let updatedTask = { ...t, overdueStatus: currentStatus };
          if (currentStatus === 'ออกใบงานช้า') updatedTask.lateWorkOrder = true;
          updates.push(updatedTask);
      }
    });

    if (updates.length > 0) {
      updates.forEach(u => saveD('task', u));
    }
  }, [tasks, user]);

  const saveD = async (t, d) => {
    if (!user) return;
    try {
      if (t === 'task') await setDoc(getDocRef('Tasks', d.id), d);
      else if (t === 'informJob') await setDoc(getDocRef('InformJobs', d.id), d);
      else if (t === 'settings') await setDoc(getDocRef('Settings', 'main'), d);
      
      fetch(API_URL, { 
        method: "POST", mode: "no-cors", 
        headers: { "Content-Type": "text/plain;charset=utf-8" }, 
        body: JSON.stringify({ type: t, data: d }) 
      }).catch(()=>{});

    } catch (e) { console.error("Error saving data:", e); }
  };

  const getProjName = (str) => str ? String(str).split('|')[0] : '';
  const getProjArea = (str) => str ? String(str).split('|')[1] || '' : '';
  const getTargetEms = (projName) => (sets.emails || []).filter(e => {
      const p = e.split('|'); if(p.length < 2) return true;
      const pjList = p[1].split(','); 
      const cleanPjList = pjList.map(name => name.split('|')[0].trim());
      return cleanPjList.includes('ทั้งหมด') || cleanPjList.includes(projName.split('|')[0].trim());
  }).map(e => e.split('|')[0]);

  const getStdProj = (raw) => {
    if(!raw) return "ไม่ระบุ";
    const clean = String(raw).split('|')[0].replace(/[\s\-]/g, '').toLowerCase();
    const found = (sets.projects || []).find(p => getProjName(p).replace(/[\s\-]/g, '').toLowerCase() === clean);
    return found ? getProjName(found) : String(raw).split('|')[0].trim();
  };

  const checkStaffMatch = (taskProj, staffNameFilter) => {
    if (staffNameFilter === 'ทั้งหมด') return true;
    const stdProj = getStdProj(taskProj);
    const staffEntries = (sets.emails||[]).filter(e => (e.split('|')[2] || e.split('|')[0].split('@')[0]) === staffNameFilter);
    if (staffEntries.length === 0) return false;
    for (const e of staffEntries) {
      const projs = (e.split('|')[1] || '').split(',');
      if (projs.includes('ทั้งหมด') || projs.includes(stdProj)) return true;
    }
    return false;
  };

  const runMigration = async () => {
    const confirmCode = prompt('⚠️ พิมพ์ "MIGRATE" เพื่อดูดข้อมูลจาก Google Sheets เข้าสู่ Firebase');
    if (confirmCode !== 'MIGRATE') return;
    
    setLoading(true);
    try {
        const ts = Date.now(); 
        const [tR, iR, sR] = await Promise.all([ fetch(`${API_URL}?sheet=Tasks&t=${ts}`), fetch(`${API_URL}?sheet=InformJobs&t=${ts}`), fetch(`${API_URL}?sheet=Settings&t=${ts}`) ]);
        const [tD, iD, sD] = await Promise.all([tR.json(), iR.json(), sR.json()]);
        
        const promises = [];

        if(Array.isArray(tD) && !tD.error) {
            tD.forEach(r => {
                const t = { 
                  id: getCleanVal(r,['id','รหัสงาน']), details: getCleanVal(r,['details','รายละเอียดงาน','รายละเอียด']), 
                  requester: getCleanVal(r,['requester','ผู้แจ้ง']), project: getCleanVal(r,['project','โครงการ']), 
                  area: getCleanVal(r,['area','พื้นที่']), receivedDate: pYMD(getCleanVal(r,['receiveddate','วันที่รับเรื่อง'])), 
                  slaCategory: getCleanVal(r,['slacategory','หมวดsla','sla'])||'', startDate: pYMD(getCleanVal(r,['startDate','เริ่มงาน'])), 
                  endDate: pYMD(getCleanVal(r,['endDate','กำหนดเสร็จ'])), status: getCleanVal(r,['status','สถานะ'])||'อยู่ระหว่างดำเนินการ', 
                  completedDate: pYMD(getCleanVal(r,['completedDate','วันที่จบงานจริง'])), cancelReason: getCleanVal(r,['cancelReason','เหตุผลยกเลิก']), 
                  overdueStatus: getCleanVal(r,['overduestatus','สถานะความล่าช้า'])||'ปกติ', workOrderNo: getCleanVal(r,['workorderno','เลขที่ใบงาน','เลขใบงาน','ใบงาน'])||'', 
                  billingStatus: getCleanVal(r,['billingstatus','สถานะเบิก'])||'รอส่งเบิก', billingMonth: extM(getCleanVal(r,['billingmonth','เดือนที่เบิก'])) 
                };
                if(t.id) promises.push(setDoc(getDocRef('Tasks', t.id), t));
            });
        }

        if(Array.isArray(iD) && !iD.error) {
            iD.forEach(r => {
                const t = { 
                    id: getCleanVal(r,['id','รหัสอ้างอิง']), date: pYMD(getCleanVal(r,['date','วันที่'])), 
                    requesterName: getCleanVal(r,['requesterName','ผู้แจ้ง']), phone: getCleanVal(r,['phone','เบอร์ติดต่อ']), 
                    project: String(getCleanVal(r,['project','โครงการ'])||'').trim(), jobType: getCleanVal(r,['jobType','ประเภทงาน']), 
                    location: getCleanVal(r,['location','สถานที่','บริเวณ']), details: getCleanVal(r,['details','รายละเอียดปัญหา','รายละเอียด','รายละเอียดงาน','ปัญหา'])||'-', 
                    status: getCleanVal(r,['status','สถานะ'])||'รอดำเนินการ', informNo: getCleanVal(r,['informno','เลขinform','เลขที่ใบงาน'])||'', 
                    cancelReason: getCleanVal(r,['cancelReason','เหตุผลยกเลิก']), area: String(getCleanVal(r,['area','พื้นที่'])||'').trim()
                };
                if(t.id) promises.push(setDoc(getDocRef('InformJobs', t.id), t));
            });
        }

        if(Array.isArray(sD) && !sD.error) {
            const s = { areas:[], projects:[], jobTypes:[], locations:[], emails:[], slas:[], overdueTime:'17:30', lateWorkOrderHours:24 };
            sD.forEach((r,i) => { 
                if(i===0){ s.overdueTime=parseTimeForInput(r.overdueTime); s.lateWorkOrderHours=r.lateWorkOrderHours||24; } 
                if(r.areas)s.areas.push(String(r.areas).trim()); if(r.projects)s.projects.push(String(r.projects).trim());
                if(r.jobTypes)s.jobTypes.push(String(r.jobTypes).trim()); if(r.locations)s.locations.push(String(r.locations).trim()); 
                if(r.emails)s.emails.push(String(r.emails).trim()); if(r.slas)s.slas.push(String(r.slas).trim());
            });
            promises.push(setDoc(getDocRef('Settings', 'main'), s));
        }

        await Promise.all(promises);
        alert('🎉 โอนย้ายข้อมูลจาก Google Sheet เข้า Firebase สำเร็จแล้ว!');
    } catch(e) {
        alert('เกิดข้อผิดพลาดในการดูดข้อมูล: ' + e.message);
    }
    setLoading(false);
  };

  const chkOvdTimeAware = (t, rD = getTStr()) => { 
    if (!t.endDate || t.status === 'ยกเลิก') return false; 
    if (t.status?.startsWith('จบงาน')) return (t.completedDate || '') > t.endDate; 
    if (rD > t.endDate) return true;
    if (rD === t.endDate) {
      const now = new Date(), cH = now.getHours(), cM = now.getMinutes();
      const tP = (sets.overdueTime || "17:30").split(":");
      const tH = parseInt(tP[0] || 17), tM = parseInt(tP[1] || 30);
      if (cH > tH || (cH === tH && cM >= tM)) return true;
    }
    return false; 
  };

  const isTaskOvd = (t, checkDate = getTStr()) => {
    if (t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า') return true;
    if (!t.status?.startsWith('จบงาน') && t.status !== 'ยกเลิก') return chkOvdTimeAware(t, checkDate);
    return false;
  };

  const handleClearData = async () => {
    const confirmCode = prompt('⚠️ พิมพ์รหัส "1312" เพื่อยืนยันการล้างข้อมูลทั้งหมดใน Firebase:');
    if (confirmCode !== '1312') return;
    setLoading(true);
    try {
        const tasksSnap = await getDocs(getColRef('Tasks'));
        const infSnap = await getDocs(getColRef('InformJobs'));
        const promises = [];
        tasksSnap.forEach(d => promises.push(deleteDoc(d.ref)));
        infSnap.forEach(d => promises.push(deleteDoc(d.ref)));
        await Promise.all(promises);
        
        fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: 'clearData', data: {} }) }).catch(()=>{});
        alert('ล้างข้อมูลสำเร็จ!'); 
    } catch(e) { alert(e.message); } 
    finally { setLoading(false); }
  };

  const testEmailSystem = () => { window.open(`${API_URL}?action=testEmail`, '_blank'); };
  const forceScanRealTasks = () => { if(!window.confirm('ระบบจะสั่งให้หลังบ้านกวาดตรวจงานที่เกินกำหนดทั้งหมดและยิงอีเมลแจ้งเตือน "ของจริง" ทันที ยืนยันหรือไม่?')) return; fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: 'forceCheckAlerts', data: {} }) }).catch(()=>{}); alert('ส่งคำสั่งตรวจสอบไปยังระบบเรียบร้อยแล้ว โปรดรอประมาณ 10-30 วินาที และเปิดหน้า Google Sheets แถบ "SystemLogs" เพื่อดูผลการสแกนครับ'); };
  const installTrigger = async () => { setLoading(true); try { await fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: 'setupTrigger', data: {} }) }); alert('ติดตั้งระบบแจ้งเตือนอัตโนมัติเรียบร้อย'); } catch(e) {} finally { setLoading(false); } };

  const openTaskModal = (task = null) => {
    try {
      setETask(task);
      setSReason('');
      setShowStartReason(false);
      if (task) {
          setTaskForm({ receivedDate: task.receivedDate, details: task.details, requester: task.requester, slaCategory: task.slaCategory || '', project: getStdProj(task.project), area: task.area, startDate: task.startDate, endDate: task.endDate });
      } else {
          setTaskForm({ receivedDate: getTStr(), details: '', requester: '', slaCategory: '', project: '', area: '', startDate: getTStr(), endDate: getTStr() });
      }
      setTMod(true);
    } catch(err) {
      alert("Error in openTaskModal: " + err.message);
    }
  };

  const subT = (e) => {
    e.preventDefault(); 
    if (!taskForm.slaCategory) return alert('กรุณาระบุหมวด SLA หรือเลือก "งานทั่วไป (ไม่มี SLA)"');
    let det = taskForm.details, ePl = null;
    const proj = taskForm.project;
    
    if(eTask && eTask.startDate !== taskForm.startDate) {
      if(!sRsn) return alert('โปรดระบุเหตุผลที่เปลี่ยนวันเริ่มงาน');
      det += `\n[เปลี่ยนวันเริ่ม: ${sRsn}]`; ePl = { action: 'ขอเปลี่ยนวันเริ่มงาน', reason: sRsn, emails: getTargetEms(proj), project: proj, details: det };
    }
    
    const slaCat = taskForm.slaCategory;
    if (slaCat) {
      const slaLimitObj = (sets.slas || []).find(s => getProjName(s) === slaCat);
      if (slaLimitObj) {
        const limitDays = parseInt(getProjArea(slaLimitObj));
        const diffDays = Math.ceil((new Date(taskForm.endDate) - new Date(taskForm.startDate)) / (1000 * 60 * 60 * 24));
        if (diffDays > limitDays) {
           if(!window.confirm(`⚠️ ระยะเวลาทำงาน ${diffDays} วัน เกินกว่า SLA ของหมวดงานนี้ (${limitDays} วัน)\nระบบจะบันทึกงานตามปกติ แต่จะส่งอีเมลแจ้งผู้ดูแลโครงการทันที! ยืนยันหรือไม่?`)) return; 
           if(!ePl) ePl = { action: 'บันทึกงานเกินเวลา SLA', reason: `ผู้แจ้งตั้งเวลาทำงาน ${diffDays} วัน (เกิน SLA ที่ตั้งไว้ ${limitDays} วัน)`, emails: getTargetEms(proj), project: proj, details: det };
        }
      }
    }
    
    const tD = { 
      id: eTask?eTask.id:`JOB-${Date.now().toString().slice(-4)}`, details: det, requester: taskForm.requester, project: proj, area: taskForm.area, 
      receivedDate: taskForm.receivedDate, slaCategory: slaCat,
      startDate: taskForm.startDate, endDate: taskForm.endDate, status: eTask?eTask.status:'อยู่ระหว่างดำเนินการ', completedDate: eTask?eTask.completedDate:null, 
      cancelReason: eTask?eTask.cancelReason:null, workOrderNo: eTask?eTask.workOrderNo:'', billingStatus: eTask?eTask.billingStatus:'รอส่งเบิก', billingMonth: eTask?eTask.billingMonth:'' 
    };
    
    tD.overdueStatus = (eTask && (eTask.overdueStatus === 'เกินกำหนด' || eTask.overdueStatus === 'ออกใบงานช้า')) ? eTask.overdueStatus : 'ปกติ'; 
    if(ePl) tD.emailAlert = ePl; saveD('task', tD); setTMod(false); setETask(null); setSReason(''); setShowStartReason(false);
  };

  const initSt = (id, val) => {
    const t = tasks.find(x => x.id === id);
    if(val === 'จบงาน') {
        const isOvd = t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า' || chkOvdTimeAware(t, getTStr());
        setSMod({ isOpen: true, taskId: id, type: 'complete', reason: '', workOrderNo: '', noWO: false, forceWO: t.status === 'จบงาน(รอใบงาน)', isOverdue: isOvd, overdueReason: t.overdueReason||'', postponeDate: t.endDate });
    } else if (val === 'เลื่อนงาน') {
        setSMod({ isOpen: true, taskId: id, type: 'postpone', reason: '', workOrderNo: '', noWO: false, forceWO: false, isOverdue: false, overdueReason: '', postponeDate: t.endDate });
    } else {
        setSMod({ isOpen: true, taskId: id, type: 'cancel', reason: '', workOrderNo: '', noWO: false, forceWO: false, isOverdue: false, overdueReason: '', postponeDate: t.endDate });
    }
  };

  const cfSt = () => {
    if (sMod.type === 'complete') {
      if (sMod.isOverdue && !sMod.overdueReason.trim()) return alert('กรุณาระบุสาเหตุที่จบงานช้ากว่ากำหนด');
      let cleanWo = '';
      if (!sMod.noWO) {
        const woRegex = /^[A-Za-z]{2}-\d{3}-\d{7}$/;
        cleanWo = sMod.workOrderNo.trim().toUpperCase();
        if (!woRegex.test(cleanWo)) return alert('รูปแบบเลขที่ใบงานไม่ถูกต้อง!\nต้องเป็น: อักษร 2 ตัว - เลข 3 ตัว - เลข 7 ตัว\nตัวอย่าง: LH-123-1234567');
      }
      sMod.workOrderNo = cleanWo;
    }
    
    const t = tasks.find(x => x.id === sMod.taskId);
    if (t) {
        let nT = { ...t };
        if(sMod.type === 'cancel') { nT.status = 'ยกเลิก'; nT.cancelReason = sMod.reason; nT.emailAlert = { action: 'ยกเลิกงาน', reason: sMod.reason, emails: getTargetEms(t.project), project: t.project, details: t.details }; }
        else if(sMod.type === 'postpone') { 
            nT.status = 'อยู่ระหว่างดำเนินการ'; 
            nT.endDate = sMod.postponeDate; 
            nT.emailAlert = { action: 'ขอเลื่อนวันจบงาน', reason: sMod.reason, emails: getTargetEms(t.project), project: t.project, details: `[เดิมจบ: ${fDate(t.endDate)} -> เลื่อนเป็น: ${fDate(sMod.postponeDate)}] ${t.details}` }; 
        }
        else if(sMod.type === 'complete') { 
            if (sMod.noWO) {
                nT.status = 'จบงาน(รอใบงาน)';
                nT.completedDate = getTStr();
                if (sMod.isOverdue) nT.overdueReason = sMod.overdueReason;
                if (t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า' || chkOvdTimeAware(nT, getTStr()) || nT.completedDate > nT.endDate) { 
                    nT.overdueStatus = t.overdueStatus === 'ออกใบงานช้า' ? 'ออกใบงานช้า' : 'เกินกำหนด'; 
                    if (chkOvdTimeAware(nT, getTStr()) || nT.completedDate > nT.endDate) {
                        nT.emailAlert = { action: 'ปิดงานล่าช้ากว่ากำหนด', reason: `ปิดงานเวลา ${new Date().toLocaleTimeString('th-TH')} น. (เลยเวลาตัดเกณฑ์ของวันจบงาน)`, emails: getTargetEms(nT.project), project: nT.project, details: t.details }; 
                    }
                }
            } else {
                nT.status = 'จบงาน'; 
                nT.workOrderNo = sMod.workOrderNo; 
                
                if (t.status === 'จบงาน(รอใบงาน)') {
                    const cDate = new Date(t.completedDate).getTime();
                    const nDate = new Date(getTStr()).getTime();
                    const daysDiff = (nDate - cDate) / (1000 * 3600 * 24);
                    if (daysDiff > 3) {
                        nT.lateWorkOrder = true;
                    }
                } else {
                    nT.completedDate = getTStr();
                    if (sMod.isOverdue) nT.overdueReason = sMod.overdueReason;
                    
                    if (t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า' || chkOvdTimeAware(nT, getTStr()) || nT.completedDate > nT.endDate) { 
                        nT.overdueStatus = t.overdueStatus === 'ออกใบงานช้า' ? 'ออกใบงานช้า' : 'เกินกำหนด'; 
                        if (chkOvdTimeAware(nT, getTStr()) || nT.completedDate > nT.endDate) {
                            nT.emailAlert = { action: 'ปิดงานล่าช้ากว่ากำหนด', reason: `ปิดงานเวลา ${new Date().toLocaleTimeString('th-TH')} น. (เลยเวลาตัดเกณฑ์ของวันจบงาน)`, emails: getTargetEms(nT.project), project: nT.project, details: t.details }; 
                        }
                    }
                }
            }
        }
        saveD('task', nT);
    }
    setSMod({ isOpen: false, taskId: null, type: '', reason: '', workOrderNo: '', noWO: false, forceWO: false, isOverdue: false, overdueReason: '' });
  };

  const upS = (k, v, arr=true) => { setSets(prev => { let nS = {...prev}; if(arr) { const val = (v || '').trim(); if(!val || (nS[k]||[]).includes(val)) return prev; nS[k] = [...(nS[k]||[]), val]; setSInp(p => ({...p, [k]:'', projArea:'', slaDays:''})); } else { nS[k] = v; } saveD('settings', nS); return nS; }); };
  const dlS = (k, v) => { setSets(prev => { let nS = {...prev, [k]: (prev[k]||[]).filter(x => x !== v)}; saveD('settings', nS); return nS; }); };
  const clearSList = (k) => { if(window.confirm('⚠️ ยืนยันการลบข้อมูล "ทั้งหมด" ในหมวดหมู่นี้ใช่หรือไม่?')) { setSets(prev => { let nS = {...prev, [k]: []}; saveD('settings', nS); return nS; }); } };
  

  const toggleEmailProj = (projName) => {
     setEmForm(p => {
         const current = p.selectedProjs;
         if (current.includes(projName)) return { ...p, selectedProjs: current.filter(x => x !== projName) };
         if (projName === 'ทั้งหมด') return { ...p, selectedProjs: ['ทั้งหมด'] };
         const updated = current.filter(x => x !== 'ทั้งหมด');
         if (updated.length >= 15) { alert('เลือกได้สูงสุด 15 โครงการครับ'); return p; }
         return { ...p, selectedProjs: [...updated, projName] };
     });
  };

  useEffect(() => {
    if (!sets || !sets.emails || sets.emails.length === 0) return;
    const mapping = {
        "kritsanapong@lh.co.th": "กฤษณพงศ์ ดลจิตต์",
        "sataporn@lh.co.th": "สถาพร บุญนำมา",
        "karn@lh.co.th": "กานต์ เจริญพร",
        "luck@lh.co.th": "ลักษณ์ นัดณรงค์",
        "podjanad@lh.co.th": "พจนาฏ ฝาระมี",
        "boonyarit.s@lh.co.th": "บุญญฤทธิ์ แซ่ลิ้ม"
    };
    let changed = false;
    const newEmails = sets.emails.map(entry => {
        const parts = entry.split('|');
        const email = parts[0].trim().toLowerCase();
        let name = parts[2] || '';
        
        if (mapping[email] && (!name || name === email.split('@')[0])) {
            name = mapping[email];
            changed = true;
        }
        return `${parts[0]}|${parts[1]||''}|${name}`;
    });
    if (changed) {
        saveD('settings', { ...sets, emails: newEmails });
    }
  }, [sets.emails]);

  const addEmailMappingV2 = () => {
    const em = emForm.email.trim().toLowerCase();
    if (!em || !em.includes('@')) return alert('กรุณากรอกอีเมลให้ถูกต้อง');
    if (emForm.selectedProjs.length === 0) return alert('กรุณาเลือกโครงการอย่างน้อย 1 โครงการ');
    
    let nEms = [...(sets.emails||[])];
    const idx = nEms.findIndex(x => x.toLowerCase().startsWith(em + '|'));
    
    let existingProjs = [];
    if (idx > -1) {
       const oldParts = nEms[idx].split('|');
       existingProjs = oldParts[1] ? oldParts[1].split(',') : [];
    }

    const allProjs = Array.from(new Set([...existingProjs, ...emForm.selectedProjs]));
    const projsStr = allProjs.join(',');
    
    let staffName = emForm.name.trim();
    if (!staffName && idx > -1) {
        staffName = nEms[idx].split('|')[2] || '';
    }
    if (!staffName) staffName = em.split('@')[0];
    
    const fullStr = `${em}|${projsStr}|${staffName}`;

    if (idx > -1) { nEms[idx] = fullStr; } 
    else { nEms.push(fullStr); }
    
    setSets({...sets, emails: nEms}); saveD('settings', {...sets, emails: nEms}); 
    setEmForm({ name: '', email: '', selectedProjs: [] });
  };

  const rmEmailProj = (emStr, pRm) => { const parts = emStr.split('|'), em = parts[0], name = parts[2] || ''; let projs = parts[1].split(',').filter(x => x !== pRm); let nEms = (sets.emails||[]).filter(x => x !== emStr); if (projs.length > 0) nEms.push(`${em}|${projs.join(',')}${name ? '|'+name : ''}`); saveD('settings', {...sets, emails: nEms}); };
  
  const subInf = (e) => { 
      e.preventDefault(); 
      if (!informForm.requesterName) return alert('กรุณาระบุชื่อผู้แจ้ง');
      const fd = { ...informForm, id: `REQ-${Date.now().toString().slice(-4)}`, status: 'รอดำเนินการ', informNo: '', cancelReason: '' }; 
      saveD('informJob', fd); 
      alert('ส่งเรื่องเรียบร้อย'); 
      setInformForm({ date: getTStr(), requesterName: '', phone: '', staffName: '', project: '', area: '', jobType: '', location: '', details: '' }); 
      setITab('manage'); 
  };
  const cfInf = () => { const j = informs.find(x => x.id === iMod.id); if(j) { let n = {...j}; if(iMod.type === 'open'){ n.status = 'เปิด Inform Job แล้ว'; n.informNo = iMod.val; }else{ n.status = 'ยกเลิก'; n.cancelReason = iMod.val; } saveD('informJob', n); } setIMod({ isOpen: false, type: '', id: null, val: '' }); };
  const moveGroup = (groupId, st) => { tasks.forEach(t => { const k = (t.workOrderNo||'').trim() ? `WO_${t.workOrderNo.trim()}` : `ID_${t.id}`; if (k === groupId && t.billingStatus !== st) { const nT = { ...t, billingStatus: st, billingMonth: st === 'ส่งเบิกแล้ว' ? getMStr() : '' }; saveD('task', nT); } }); };
  
  const groupTasks = (tList) => { const grp = {}; const woRegex = /^[A-Za-z]{2}-\d{3}-\d{7}$/; tList.forEach(t => { const no = (t.workOrderNo||'').trim(); const isWO = woRegex.test(no); const k = isWO ? `WO_${no}` : `ID_${t.id}`; if (!grp[k]) grp[k] = { id: k, isWO: isWO, woNo: no, project: t.project, tasks: [] }; grp[k].tasks.push(t); }); return Object.values(grp); };

  const GFBar = () => {
    if(tab === 'settings') return null;
    return (
      <div className="bg-white border-b px-4 md:px-6 py-3 flex flex-wrap gap-3 items-center text-sm shadow-sm z-10 sticky top-14">
        <span className="font-bold text-gray-500 mr-2"><Icon name="filter" size={16} className="inline mr-1"/> ตัวกรอง:</span>
        {tab !== 'daily' ? <input type="month" value={gFilt.month} onChange={e=>setGilt({...gFilt, month: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50" /> : <input type="date" value={gFilt.date} onChange={e=>setGilt({...gFilt, date: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50" />}
        <select value={gFilt.staffName} onChange={e=>setGilt({...gFilt, staffName: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50"><option value="ทั้งหมด">ทุกเจ้าหน้าที่</option>{Array.from(new Set((sets.emails||[]).map(e => e.split('|')[2] || e.split('|')[0].split('@')[0]))).filter(Boolean).map(n=><option key={n}>{n}</option>)}</select>
        <select value={gFilt.area} onChange={e=>setGilt({...gFilt, area: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50"><option value="ทั้งหมด">ทุกพื้นที่</option>{(sets.areas||[]).map(a=><option key={a}>{a}</option>)}</select>
        <select value={gFilt.project} onChange={e=>setGilt({...gFilt, project: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50"><option value="ทั้งหมด">ทุกโครงการ</option>{(sets.projects||[]).map(p=><option key={p}>{getProjName(p)}</option>)}</select>
        {tab === 'inform' && iTab === 'manage' && <select value={gFilt.status} onChange={e=>setGilt({...gFilt, status: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50"><option value="ทั้งหมด">ทุกสถานะ</option><option value="รอดำเนินการ">รอดำเนินการ</option><option value="เปิด Inform Job แล้ว">เปิดงานแล้ว</option></select>}
      </div>
    );
  };

  const rDash = () => {
    const tS = getTStr(); const aT = tasks.filter(t => t.status !== 'ยกเลิก' && (gFilt.area==='ทั้งหมด'||t.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(t.project)===gFilt.project) && checkStaffMatch(t.project, gFilt.staffName));
    const dy = aT.filter(t => (tS >= t.startDate && tS <= t.endDate) || (!t.status?.startsWith('จบงาน') && chkOvdTimeAware(t, tS)));
    const mt = aT.filter(t => t.startDate && t.startDate.startsWith(gFilt.month));
    const ov = mt.filter(t => t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า' || chkOvdTimeAware(t, tS));
    
    const getChartData = (arr) => [
      {name:'จบงาน(ในกำหนด)', value: arr.filter(t=>t.status?.startsWith('จบงาน') && !(t.overdueStatus==='เกินกำหนด'||t.overdueStatus==='ออกใบงานช้า') && !chkOvdTimeAware(t, getTStr())).length, color:THEME.success},
      {name:'ดำเนินการ', value: arr.filter(t=>!t.status?.startsWith('จบงาน') && !(t.overdueStatus==='เกินกำหนด'||t.overdueStatus==='ออกใบงานช้า') && !chkOvdTimeAware(t, getTStr())).length, color:THEME.secondary},
      {name:'ล่าช้า/เกินกำหนด', value: arr.filter(t=>t.overdueStatus==='เกินกำหนด'||t.overdueStatus==='ออกใบงานช้า'||chkOvdTimeAware(t, getTStr())).length, color:THEME.danger}
    ];

    return (
      <div className="space-y-6 animate-in">
        <h2 className="text-xl font-bold text-[#0f2e4a] flex items-center"><Icon name="layoutDashboard" size={20} className="mr-2"/> ภาพรวม (เดือน {gFilt.month})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[{l:'ปริมาณงานรวม', v:mt.length, i:'listTodo', c:THEME.primary}, {l:'งานวันนี้', v:dy.length, i:'calendar', c:THEME.secondary}, {l:'งานล่าช้า/เกินกำหนด', v:ov.length, i:'alertTriangle', c:THEME.danger, clk:true}].map((x,i) => (<div key={i} onClick={()=>x.clk && setOPop({isOpen:true, tasks:ov})} className={`bg-white p-6 rounded-xl shadow-sm border-l-[6px] flex justify-between items-center ${x.clk?'cursor-pointer hover:shadow-md border-red-500':'border-[#0f2e4a]'}`}><div><div className="text-xs text-gray-500 font-bold mb-1">{x.l} {x.clk && <span className="text-[9px] text-red-500 bg-red-50 px-1 rounded">(คลิกดู)</span>}</div><div className="text-3xl font-black">{x.v}</div></div><div className="p-3 bg-gray-50 rounded-full"><Icon name={x.i} size={24} color={x.c}/></div></div>))}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="bg-white p-6 rounded-xl shadow-sm border"><SimplePieChart data={getChartData(dy)} title="สถานะงานวันนี้"/></div><div className="bg-white p-6 rounded-xl shadow-sm border"><SimplePieChart data={getChartData(mt)} title="สถานะเดือนนี้"/></div></div>
      </div>
    );
  };

  const rDail = () => {
    const tD = gFilt.date; const vT = tasks.filter(t => t.status !== 'ยกเลิก' && (gFilt.area==='ทั้งหมด'||t.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(t.project)===gFilt.project) && checkStaffMatch(t.project, gFilt.staffName) && ((tD >= t.startDate && tD <= t.endDate) || (!t.status?.startsWith('จบงาน') && chkOvdTimeAware(t, tD) && tD === getTStr())));
    return (
      <div className="space-y-4 animate-in">
        <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-[#0f2e4a]">งานประจำวัน</h2><button type="button" onClick={()=>openTaskModal()} className="bg-[#0f2e4a] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-md"><Icon name="plus" size={16} className="mr-2"/> เพิ่มงาน</button></div>
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 border-b text-xs uppercase text-gray-500"><tr><th className="p-4">รายละเอียด</th><th className="p-4">โครงการ</th><th className="p-4">ระยะเวลา</th><th className="p-4">สถานะ</th><th className="p-4 text-center">จัดการ</th></tr></thead><tbody>{vT.map(t => { const od = chkOvdTimeAware(t, getTStr()); return (<tr key={t.id} className="border-b hover:bg-gray-50"><td className="p-4"><div className="font-medium">{t.details}</div><div className="text-[10px] text-gray-400 mt-1 flex gap-1 items-center"><span>{t.id} | {t.requester}</span>{t.workOrderNo && <span className="bg-blue-50 text-blue-600 px-1 rounded">WO:{t.workOrderNo}</span>}{t.overdueStatus==='เกินกำหนด' && <span className="text-red-500 px-1 border border-red-200 rounded">{t.overdueStatus}</span>}</div></td><td className="p-4 font-bold text-[#bca374]">{getStdProj(t.project)}<div className="text-xs text-gray-400 font-normal">{t.area}</div></td><td className="p-4 text-xs text-gray-600">เริ่ม: {fDate(t.startDate)}<br/><span className={od&&!t.status?.startsWith('จบงาน')?'text-red-500 font-bold':''}>จบ: {fDate(t.endDate)}</span></td><td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${t.status?.startsWith('จบงาน')?'bg-emerald-50 text-emerald-700 border-emerald-200':t.status==='จบงาน(รอใบงาน)'?'bg-yellow-50 text-yellow-700 border-yellow-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>{t.status}</span></td><td className="p-4 text-center"><div className="flex justify-center gap-1"><select value={t.status} onChange={e=>initSt(t.id, e.target.value)} className="border rounded text-xs p-1 outline-none"><option value="อยู่ระหว่างดำเนินการ">ดำเนินการ</option><option value="เลื่อนงาน">เลื่อนงาน</option><option value="จบงาน">จบงาน</option></select><button type="button" onClick={()=>{const pwd = prompt('กรุณาใส่รหัสผ่านเพื่อแก้ไขข้อมูล:');if(pwd !== '131236') return alert('รหัสผ่านไม่ถูกต้อง!');openTaskModal(t);}} className="text-gray-400 hover:text-[#0f2e4a] p-1 bg-gray-100 rounded hover:bg-gray-200" title="แก้ไขงาน"><Icon name="edit2" size={14}/></button><button type="button" onClick={async ()=>{const pwd = prompt('กรุณาใส่รหัสผ่านเพื่อลบข้อมูล:');if(pwd !== '131236') return alert('รหัสผ่านไม่ถูกต้อง!');if(confirm('ต้องการลบงานนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถกู้คืนได้')) { try { await deleteDoc(getDocRef('Tasks', t.id)); } catch(e) { alert('ลบข้อมูลไม่สำเร็จ: ' + e.message); } }}} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded hover:bg-red-100" title="ลบงาน"><Icon name="trash" size={14}/></button></div></td></tr>); })} {vT.length===0 && <tr><td colSpan="5" className="text-center py-10 text-gray-400">ไม่มีงาน</td></tr>}</tbody></table></div>
      </div>
    );
  };

  const rMont = () => {
    const tS = getTStr(); 
    if(!gFilt.month) return null;
    const sM = new Date(gFilt.month + '-01'); const y = sM.getFullYear(); const m = sM.getMonth(); const dM = new Date(y, m+1, 0).getDate(); const fD = new Date(y, m, 1).getDay(); const ds = Array(fD).fill(null).concat(Array.from({length: dM}, (_, i) => new Date(y, m, i+1)));
    return (
      <div className="bg-white rounded-xl shadow-sm border p-4 animate-in">
         <h2 className="text-xl font-bold text-[#0f2e4a] mb-4 flex items-center"><Icon name="calendar" size={20} className="mr-2 text-[#bca374]"/> ปฏิทินเดือน {gFilt.month}</h2>
        <div className="grid grid-cols-7 gap-px bg-gray-200 border rounded-lg overflow-hidden">{['อา','จ','อ','พ','พฤ','ศ','ส'].map(d=><div key={d} className="bg-gray-50 py-2 text-center text-xs font-bold text-gray-500">{d}</div>)}{ds.map((d,i) => { if(!d) return <div key={`e-${i}`} className="bg-white/50 min-h-[80px]"></div>; const dS = pYMD(d); const iT = dS === tS; const dTs = tasks.filter(t => t.status!=='ยกเลิก' && (gFilt.area==='ทั้งหมด'||t.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(t.project)===gFilt.project) && checkStaffMatch(t.project, gFilt.staffName) && dS>=(t.startDate||'') && dS<=(t.status?.startsWith('จบงาน')?(t.completedDate||t.endDate):((t.endDate||'') > tS ? t.endDate : tS))); return (<div key={dS} onClick={()=>dTs.length>0 && setCPop({isOpen:true, date:dS, tasks:dTs})} className={`bg-white min-h-[80px] p-1 border-t cursor-pointer hover:bg-slate-50 ${iT?'bg-blue-50/30 ring-1 ring-inset ring-blue-300':''}`}><div className={`text-right text-[10px] mb-1 ${iT?'font-black text-blue-600':'text-gray-400'}`}>{d.getDate()}</div><div className="space-y-0.5">{dTs.slice(0,3).map(t=><div key={t.id} className={`text-[8px] px-1 rounded truncate font-bold ${t.status?.startsWith('จบงาน')?'bg-green-100 text-green-700':'bg-blue-100 text-blue-800'}`}>{getStdProj(t.project)}</div>)}{dTs.length>3 && <div className="text-[8px] text-center text-gray-400 font-bold">+ {dTs.length-3}</div>}</div></div>); })}</div>
      </div>
    );
  };

  const rInf = () => {
    const ft = informs.filter(j => j.status!=='ยกเลิก' && j.date?.startsWith(gFilt.month) && (gFilt.area==='ทั้งหมด'||j.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(j.project)===gFilt.project) && (gFilt.status==='ทั้งหมด'||j.status===gFilt.status) && checkStaffMatch(j.project, gFilt.staffName));
    return (
      <div className="space-y-4 animate-in">
        <div className="bg-white p-4 rounded-xl shadow-sm border flex gap-2"><button type="button" onClick={()=>setITab('form')} className={`flex-1 py-2 text-xs font-bold rounded ${iTab==='form'?'bg-[#0f2e4a] text-white shadow':'bg-gray-100 text-gray-500'}`}>แจ้งเปิดงานใหม่</button><button type="button" onClick={()=>setITab('manage')} className={`flex-1 py-2 text-xs font-bold rounded ${iTab==='manage'?'bg-[#0f2e4a] text-white shadow':'bg-gray-100 text-gray-500'}`}>จัดการสถานะ</button></div>
        {iTab === 'form' ? (
          <form onSubmit={subInf} className="bg-white p-6 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-4 border-t-4 border-t-[#bca374]">
            <div><label className="text-xs font-bold mb-1 block">วันที่</label><input type="date" value={informForm.date} onChange={e=>setInformForm({...informForm, date: e.target.value})} required className="border rounded-xl px-3 py-2 w-full text-sm outline-none" /></div>
            <div>
              <label className="text-xs font-bold mb-1 block">ผู้แจ้ง / เบอร์</label>
              <div className="flex gap-2">
                <input value={informForm.requesterName} onChange={e=>setInformForm({...informForm, requesterName: e.target.value})} required placeholder="ชื่อ" className="border rounded-xl px-3 py-2 w-1/2 text-sm outline-none" />
                <input value={informForm.phone} onChange={e=>setInformForm({...informForm, phone: e.target.value})} required placeholder="เบอร์โทร" className="border rounded-xl px-3 py-2 w-1/2 text-sm outline-none" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold mb-1 block">เจ้าหน้าที่ดูแลโครงการ (ตัวกรอง)</label>
              <select value={informForm.staffName} onChange={e=>setInformForm({...informForm, staffName: e.target.value, project: '', area: ''})} className="border rounded-xl px-3 py-2 w-full text-sm outline-none bg-blue-50">
                <option value="">ทุกเจ้าหน้าที่ (ไม่กรอง)</option>
                {Array.from(new Set((sets.emails||[]).map(e => e.split('|')[2] || e.split('|')[0].split('@')[0]))).filter(Boolean).map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-bold mb-1 block">โครงการ (ออโต้พื้นที่)</label>
              <select value={informForm.project} required onChange={(e) => { const pData = (sets.projects||[]).find(p=>getProjName(p) === e.target.value); setInformForm({...informForm, project: e.target.value, area: getProjArea(pData)}); }} className="border rounded-xl px-3 py-2 w-full text-sm outline-none"><option value="">เลือก...</option>{(sets.projects||[]).filter(p => !informForm.staffName || checkStaffMatch(getProjName(p), informForm.staffName)).map(p=><option key={p} value={getProjName(p)}>{getProjName(p)}</option>)}</select>
            </div>
            <div><label className="text-xs font-bold mb-1 block">พื้นที่</label><input type="text" value={informForm.area} readOnly className="border rounded-xl px-3 py-2 w-full text-sm outline-none bg-gray-100 text-gray-500" /></div>
            <div><label className="text-xs font-bold mb-1 block">ประเภทงาน</label><select value={informForm.jobType} onChange={e=>setInformForm({...informForm, jobType: e.target.value})} required className="border rounded-xl px-3 py-2 w-full text-sm outline-none"><option value="">เลือก...</option>{(sets.jobTypes||[]).map(a=><option key={a}>{a}</option>)}</select></div>
            <div><label className="text-xs font-bold mb-1 block">บริเวณ</label><select value={informForm.location} onChange={e=>setInformForm({...informForm, location: e.target.value})} required className="border rounded-xl px-3 py-2 w-full text-sm outline-none"><option value="">เลือก...</option>{(sets.locations||[]).map(a=><option key={a}>{a}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-bold mb-1 block">รายละเอียดปัญหา</label><textarea value={informForm.details} onChange={e=>setInformForm({...informForm, details: e.target.value})} required rows="3" className="border rounded-xl px-3 py-2 w-full text-sm outline-none resize-none"></textarea></div>
            <div className="md:col-span-2 text-center mt-2"><button type="submit" className="bg-[#bca374] hover:bg-[#a38a5b] text-white px-10 py-2 rounded-lg text-sm font-bold shadow-md">ส่งแจ้งงาน</button></div>
          </form>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 border-b"><tr><th className="p-3 w-28">วันที่/ID</th><th className="p-3">ข้อมูลเบื้องต้น</th><th className="p-3 w-32">สถานะ</th><th className="p-3 w-28">จัดการ</th></tr></thead>
                <tbody>
                  {ft.map(j => (
                    <tr key={j.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-bold">{fDate(j.date)}<div className="text-[9px] text-gray-400 mt-1">{j.id}</div></td>
                      <td className="p-3">
                        <div className="font-bold text-[#0f2e4a] text-sm">{getStdProj(j.project)} <span className="font-normal text-xs text-gray-500">({j.area})</span></div>
                        <div className="text-gray-500 mt-1">{j.requesterName} {j.phone && `| เบอร์: ${j.phone}`}</div>
                        <div className="flex gap-1 mt-1.5 mb-1">
                           {j.jobType && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium border">{j.jobType}</span>}
                           {j.location && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium border">{j.location}</span>}
                        </div>
                        <div className="italic text-gray-600 mt-1 text-[11px] bg-gray-50 p-1.5 rounded border border-gray-200">
                           {String(j.details || '-').length > 90 ? String(j.details || '-').substring(0, 90) + '...' : String(j.details || '-')}
                        </div>
                        <button type="button" onClick={()=>setInfView(j)} className="mt-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded flex items-center text-[10px] font-bold shadow-sm"><Icon name="search" size={12} className="mr-1"/> อ่านรายละเอียดเต็ม</button>
                      </td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${j.status==='เปิด Inform Job แล้ว'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{j.status}</span>{j.informNo&&<div className="text-[9px] text-green-600 mt-1 font-bold">No: {j.informNo}</div>}</td>
                      <td className="p-3"><select value={j.status} onChange={e=>{if(e.target.value==='เปิด Inform Job แล้ว')setIMod({isOpen:true,type:'open',id:j.id,val:''});else if(e.target.value==='ยกเลิก')setIMod({isOpen:true,type:'cancel',id:j.id,val:''});else{saveD('informJob',{...j,status:e.target.value})}}} className="border rounded p-1 outline-none text-xs"><option value="รอดำเนินการ">รอดำเนินการ</option><option value="เปิด Inform Job แล้ว">เปิดงาน</option><option value="ยกเลิก">ยกเลิก</option></select></td>
                    </tr>
                  ))} 
                  {ft.length===0 && <tr><td colSpan="4" className="text-center py-10 text-gray-400">ไม่มีข้อมูลแจ้งเปิดงาน</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const rKanb = () => {
    const cT = tasks.filter(t => t.status?.startsWith('จบงาน') && (gFilt.area==='ทั้งหมด'||t.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(t.project)===gFilt.project) && checkStaffMatch(t.project, gFilt.staffName));
    const ubGrp = groupTasks(cT.filter(t => t.billingStatus !== 'ส่งเบิกแล้ว')); 
    const biGrp = groupTasks(cT.filter(t => t.billingStatus === 'ส่งเบิกแล้ว' && (t.billingMonth === gFilt.month || (gFilt.month === '2026-06' && (!t.billingMonth || t.billingMonth < '2026-07')))));
    
    return (
      <div className="space-y-4 animate-in">
         <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-[#0f2e4a]">ส่งเบิก (เดือน {gFilt.month})</h2></div>
         <div className="flex flex-col md:flex-row gap-4 h-[70vh]">
            <div className="flex-1 bg-gray-100 rounded-xl p-3 flex flex-col border">
              <h3 className="font-bold text-gray-700 mb-3 border-b-2 border-gray-300 pb-2 flex justify-between"><span>รอส่งเบิก / ค้างเบิก</span><span className="bg-gray-200 px-2 rounded-full text-xs">{ubGrp.length} กลุ่ม</span></h3>
              <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar">
                {ubGrp.map(g => (
                  <div key={g.id} onClick={()=>setBMod({isOpen: true, group: g, type: 'รอส่งเบิก'})} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all relative">
                    <div className="flex justify-between items-start mb-2"><span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">{g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0].id}`}</span></div>
                    <div className="font-bold text-[#0f2e4a] text-sm mb-1">{getStdProj(g.project)} <span className="text-xs text-gray-500 font-normal">({g.tasks.length} งาน)</span></div>
                    <div className="space-y-1.5 mt-2">{g.tasks.map((t, i) => (<div key={t.id} className="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 line-clamp-1"><span className="text-gray-400 font-bold mr-1">#{i+1}</span>{t.details}</div>))}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 bg-green-50 rounded-xl p-3 flex flex-col border border-green-100">
              <h3 className="font-bold text-green-700 mb-3 border-b-2 border-green-200 pb-2 flex justify-between"><span>ส่งเบิกแล้ว (รอบ {gFilt.month})</span><span className="bg-green-200 px-2 rounded-full text-xs">{biGrp.length} กลุ่ม</span></h3>
              <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar">
                {biGrp.map(g => (
                  <div key={g.id} onClick={()=>setBMod({isOpen: true, group: g, type: 'ส่งเบิกแล้ว'})} className="bg-white p-3 rounded-lg shadow-sm border border-green-200 cursor-pointer hover:border-green-400 hover:shadow-md transition-all relative">
                    <div className="flex justify-between items-start mb-2"><span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded text-[10px]">{g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0].id}`}</span></div>
                    <div className="font-bold text-green-800 text-sm mb-1">{getStdProj(g.project)} <span className="text-xs text-green-600/70 font-normal">({g.tasks.length} งาน)</span></div>
                    <div className="space-y-1.5 mt-2 opacity-70">{g.tasks.map((t, i) => (<div key={t.id} className="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 line-clamp-1"><span className="text-gray-400 font-bold mr-1">#{i+1}</span>{t.details}</div>))}</div>
                  </div>
                ))}
              </div>
            </div>
         </div>
      </div>

    )
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropModal({ isOpen: true, imageSrc: ev.target.result, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCropModal(prev => ({ ...prev, croppedAreaPixels }));
  };

  const saveCroppedImage = () => {
    if(!cropModal.imageSrc || !cropModal.croppedAreaPixels) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 500;
      canvas.width = MAX_SIZE;
      canvas.height = MAX_SIZE;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cropModal.croppedAreaPixels.x, cropModal.croppedAreaPixels.y, cropModal.croppedAreaPixels.width, cropModal.croppedAreaPixels.height, 0, 0, MAX_SIZE, MAX_SIZE);
      setTeamForm({...teamForm, image: canvas.toDataURL('image/webp', 0.85)});
      setCropModal({ isOpen: false, imageSrc: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null });
    };
    img.src = cropModal.imageSrc;
  };

  const saveTeam = () => {
    if(!teamForm.name) return alert('กรุณาระบุชื่อพนักงาน');
    let ns = [...(sets.staffStats||[])];
    if(teamForm.id) {
      const idx = ns.findIndex(x => x.id === teamForm.id);
      if(idx > -1) ns[idx] = {...teamForm};
    } else { ns.push({...teamForm, id: Date.now().toString()}); }
    const newSets = {...sets, staffStats: ns};
    setSets(newSets);
    saveD('settings', newSets);
    setSelTeam({...teamForm});
    setTeamEditMode(false);
  };

  const rTeam = () => {
    if (!teamUnlk) return (<div className="bg-white p-8 rounded-xl shadow border text-center max-w-sm mx-auto mt-10"><h2 className="text-lg font-bold mb-4 text-[#0f2e4a]">เข้าสู่ระบบทีมงาน</h2><input type="password" placeholder="รหัสผ่าน" className="border p-3 rounded-lg w-full mb-4 text-center tracking-widest text-lg outline-none focus:ring-2 focus:ring-[#bca374]" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&pwd==='1312'&&setTeamUnlk(true)} /><button type="button" onClick={()=>pwd==='1312'&&setTeamUnlk(true)} className="bg-[#bca374] hover:bg-[#a38a5b] text-white px-4 py-2 rounded-lg w-full font-bold transition">ยืนยัน</button></div>);

    const sList = sets.staffStats || [];
    const classMap = (sets.staffClasses||[]).reduce((a,c)=>{a[c.id]=c; return a;},{});
    
    const handleExcelUpload = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames.includes('ประเมินผลทีม') ? 'ประเมินผลทีม' : workbook.SheetNames[1] || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let ns = [...(sets.staffStats||[])];
          let addedCount = 0;
          for(let i=2; i<rows.length; i++) {
            const row = rows[i];
            if(!row || !row[0] || row[0].toString().trim() === '') continue;
            
            const name = row[0].toString().trim();
            const avg = (arr) => {
               const valid = arr.filter(v => typeof v === 'number');
               if(valid.length === 0) return 5;
               const sum = valid.reduce((a,b)=>a+b,0);
               const rawAvg = sum/valid.length;
               const r1 = Math.round(rawAvg * 10) / 10;
               return Math.round(r1);
            };
            const str = avg([row[10], row[11], row[12]]);
            const agi = avg([row[13], row[14], row[15]]);
            const dex = avg([row[16], row[17], row[18]]);
            const int = avg([row[19], row[20], row[21], row[22]]);
            const con = avg([row[23], row[24], row[25]]);
            const sen = avg([row[26], row[27], row[28]]);
            
            const tieBreakers = { str: 0.06, agi: 0.05, dex: 0.04, int: 0.03, con: 0.02, sen: 0.01 };
            const stats = { str, agi, dex, int, con, sen };
            const validStats = Object.keys(stats).filter(k => stats[k] >= 5).map(k => ({ key: k, val: stats[k], adj: stats[k] + tieBreakers[k] }));
            
            let archetypeKey = 'novice';
            if (validStats.length >= 2) {
               validStats.sort((a,b) => b.adj - a.adj); // Sort descending by adjusted score
               const useTop3 = validStats.length >= 3 && validStats[2].val >= 6;
               const topKeys = validStats.slice(0, useTop3 ? 3 : 2).map(s => s.key).sort();
               archetypeKey = topKeys.join('_');
            }

            const potentialIdentity = getArchetypeIdentity(stats);
            
            const existingIdx = ns.findIndex(x => x.name === name);
            const newObj = {
              name: name, str, agi, dex, int, con, sen, archetypeKey, potentialIdentity
            };
            if(existingIdx > -1) {
              ns[existingIdx] = {...ns[existingIdx], ...newObj};
            } else {
              ns.push({ id: Date.now().toString() + i, classId: '', image: '', ...newObj });
            }
            addedCount++;
          }
          const newSets = {...sets, staffStats: ns};
          setSets(newSets);
          saveD('settings', newSets);
          alert(`นำเข้าข้อมูลพนักงานสำเร็จจำนวน ${addedCount} รายการ!`);
        } catch (err) {
          console.error(err);
          alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบว่าเลือกไฟล์ที่ถูกต้อง');
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = null;
    };
    
    const renderCinematicView = () => {
      const u = teamForm;
      if (!u.id) return null;
      const role = classMap[u.classId];

      const statsObj = { str: Number(u.str)||0, agi: Number(u.agi)||0, dex: Number(u.dex)||0, int: Number(u.int)||0, con: Number(u.con)||0, sen: Number(u.sen)||0 };
      const sortedStats = Object.entries(statsObj).sort((a,b) => b[1] - a[1]);
      
      const archetypeMapTop2 = {
        'agi_str': 'Striker (สายจู่โจมความเร็วสูง)', 'dex_str': 'Blademaster (สายปฏิบัติการเฉียบขาด)', 'int_str': 'Battlemage (สายผสานแผนและการลงมือทำ)', 'con_str': 'Juggernaut (สายลุยงานหนักทรหด)', 'sen_str': 'Warlord (สายผู้นำบุกเบิก)',
        'agi_dex': 'Phantom Operative (สายปฏิบัติการไร้ร่องรอย)', 'agi_int': 'Tactical Runner (สายรุกฉับไวด้วยกลยุทธ์)', 'agi_con': 'Resilient Scout (สายสำรวจและแก้ปัญหาด่วน)', 'agi_sen': 'Pathfinder (สายประสานงานรวดเร็ว)', 'dex_int': 'System Artisan (สายสร้างสรรค์ระบบสุดเนี้ยบ)',
        'con_dex': 'Iron Sentinel (สายคุมมาตรฐานสุดแกร่ง)', 'dex_sen': 'Sniper (สายจับเป้าหมายแม่นยำ)', 'con_int': 'Fortress Architect (สายออกแบบโครงสร้างมั่นคง)', 'int_sen': 'Supreme Tactician (สายเจรจาและวางกลยุทธ์)', 'con_sen': 'Unbreakable Commander (สายผู้บัญชาการรับแรงกดดัน)'
      };

      const archetypeMapTop3 = {
        'agi_con_dex': 'Swift Guardian (สายปกป้องความราบรื่นของงาน)', 'agi_con_int': 'Blitz Strategist (สายปฏิบัติการเชิงรุกฉับไว)', 'agi_con_sen': 'Vanguard Tracker (สายสำรวจและประเมินสถานการณ์)', 'agi_con_str': 'Frontline Berserker (สายลุยงานหนักทะลุทะลวง)', 'agi_dex_int': 'Digital Ronin (สายจัดระบบงานเนี้ยบและไว)', 'agi_dex_sen': 'Mirage Walker (สายจัดการปัญหาไร้ร่องรอย)',
        'agi_dex_str': 'Swift Duelist (สายปฏิบัติการเฉียบขาดว่องไว)', 'agi_int_sen': 'Spymaster (สายเจาะลึกข้อมูลและเจรจา)', 'agi_int_str': 'Arcane Vanguard (สายผสานกลยุทธ์และการลงมือทำ)', 'agi_sen_str': 'Vanguard Warlord (สายผู้นำบุกเบิกโปรเจกต์)', 'con_dex_int': 'Foundation Maestro (สายวางรากฐานและแก้ปัญหาระบบ)', 'con_dex_sen': 'Titan Warden (สายคุมมาตรฐานงานสุดแกร่ง)',
        'con_dex_str': 'Juggernaut Craftsman (สายช่างฝีมือทรหด)', 'con_int_sen': 'Grand Pillar (สายเสาหลักบริหารความเสี่ยง)', 'con_int_str': 'Citadel Builder (สายออกแบบโครงสร้างงานมั่นคง)', 'con_sen_str': 'Indomitable Chief (สายผู้นำทีมสุดแกร่ง)', 'dex_int_sen': 'Visionary Consultant (สายที่ปรึกษาและคาดการณ์แม่นยำ)', 'dex_int_str': 'Grandmaster (สายปรมาจารย์คุมคุณภาพงาน)',
        'dex_sen_str': 'Sharpshooter General (สายจัดการเป้าหมายเฉียบคม)', 'int_sen_str': 'Mastermind Overseer (สายบริหารจัดการเชิงกลยุทธ์)'
      };

      const validStats = sortedStats.filter(s => s[1] >= 5);
      const minStat = sortedStats[5][1];
      const maxStat = sortedStats[0][1];
      
      let prefix = '';
      if (maxStat >= 10) prefix = 'Master ';
      else if (maxStat >= 9) prefix = 'Elite ';
      else if (maxStat >= 8) prefix = 'Expert ';
      else if (maxStat >= 7) prefix = 'Veteran ';
      else if (maxStat >= 6) prefix = 'Adept ';

      const getDesc = (k) => {
         const defaults = { str: 'พลังดันงาน', agi: 'ความไว', dex: 'คุณภาพ', int: 'วิเคราะห์', con: 'ทนทาน', sen: 'ไหวพริบ' };
         return defaults[k];
      };

      let mainStyleRaw = ''; let styleDesc = ''; let useTop3 = false;
      if (maxStat <= 5) {
         if (maxStat === 5 && minStat === 5) {
            mainStyleRaw = 'Standard Achiever (ผู้บรรลุมาตรฐาน)'; styleDesc = 'ปฏิบัติงานได้ตามมาตรฐานอย่างครบถ้วนในทุกมิติ เป็นฟันเฟืองที่พึ่งพาได้ ควรกล้ารับความท้าทายใหม่ๆ เพื่อยกระดับสู่ผู้เชี่ยวชาญ';
         } else if (maxStat === 4 && minStat === 4) {
            mainStyleRaw = 'The Maintainer (ผู้ประคองงาน)'; styleDesc = 'ประคองการทำงานภาพรวมได้ แต่มีช่องโหว่ในรายละเอียด ควรเน้นความรอบคอบและเรียนรู้จากพี่เลี้ยงเพื่อยกระดับผลงาน';
         } else if (maxStat <= 3 && minStat === maxStat) {
            mainStyleRaw = 'Needs Attention (ผู้ต้องได้รับการดูแล)'; styleDesc = 'ผลการปฏิบัติงานต่ำกว่าเกณฑ์ในทุกมิติ หัวหน้างานควรเร่งประเมินสาเหตุและวางแผนปรับพื้นฐานใหม่ (Re-train) อย่างเร่งด่วน';
         } else if (minStat >= 4) {
            mainStyleRaw = 'Generalist (ผู้เรียนรู้รอบด้าน)'; styleDesc = 'มีพื้นฐานที่สม่ำเสมอและปรับตัวได้ทุกบทบาท ควรผลักดันให้หา "ความถนัดเฉพาะทาง" 1-2 ด้าน เพื่อทะลุกำแพงสู่ระดับที่สูงขึ้น';
         } else if (maxStat <= 3) {
            mainStyleRaw = 'Apprentice (ผู้ฝึกหัด)'; styleDesc = 'อยู่ในช่วงเริ่มต้นหรือยังไม่คุ้นเคยกับกระบวนการ ต้องการการสอนงานอย่างใกล้ชิด (OJT) และกำหนดเป้าหมายที่ชัดเจน';
         } else if (sortedStats.filter(s => s[1] >= 4).length > 0 && sortedStats.filter(s => s[1] <= 3).length > 0) {
            const bestKey = sortedStats[0][0]; const secondBestKey = sortedStats[1][0];
            let topName = archetypeMapTop2[[bestKey, secondBestKey].sort().join('_')] || 'Specialist (สายเฉพาะทาง)';
            mainStyleRaw = `Rookie ${topName.split(' ')[0]} (ดาวรุ่งสาย${getDesc(bestKey)})`; styleDesc = `เริ่มฉายแววในด้าน${getDesc(bestKey)} แต่ทักษะอื่นยังไม่เสถียร ควรส่งเสริมจุดแข็งและใช้พี่เลี้ยงประคองจุดอ่อน`;
         } else {
            mainStyleRaw = 'Uncalibrated (ศักยภาพที่รอการเจียระไน)'; styleDesc = 'ศักยภาพแฝงมีแต่ผลงานยังขาดความสม่ำเสมอ หัวหน้าควรช่วยจัดลำดับความสำคัญและแก้จุดอ่อนทีละจุดเพื่อให้ผลงานนิ่งขึ้น';
         }
      } else {
         if (validStats.length >= 3 && (validStats.length === 3 || validStats[2][1] > validStats[3][1])) useTop3 = true;
         if (useTop3) {
            const topKeys = [validStats[0][0], validStats[1][0], validStats[2][0]];
            mainStyleRaw = (archetypeMapTop3[topKeys.sort().join('_')] || 'Hybrid (สายผสมผสาน)');
            styleDesc = `โดดเด่นอย่างมากด้าน ${getDesc(topKeys[0])}, ${getDesc(topKeys[1])} และ ${getDesc(topKeys[2])}`;
         } else {
            const topKeys = [validStats[0][0], validStats[1][0]];
            mainStyleRaw = (archetypeMapTop2[topKeys.sort().join('_')] || 'Specialist (สายเฉพาะทาง)');
            styleDesc = `ความเชี่ยวชาญพิเศษด้าน ${getDesc(topKeys[0])} ผสานกับ ${getDesc(topKeys[1])}`;
         }
         if (minStat <= 4) {
            const weakReasons = { str: 'งานที่ต้องลุยและใช้พลังขับเคลื่อนสูง', agi: 'งานด่วนที่ต้องการผลลัพธ์รวดเร็ว', dex: 'งานที่ต้องการความละเอียดและคุณภาพสูง', int: 'งานวางแผนและวิเคราะห์เชิงลึก', con: 'งานที่เต็มไปด้วยความกดดันและยืดเยื้อ', sen: 'งานที่ต้องเจรจาประสานงานหรือใช้ไหวพริบ' };
            const weakNames = sortedStats.filter(s => s[1] <= 4).map(s => weakReasons[s[0]]).filter(Boolean);
            if (weakNames.length > 0) styleDesc += ` แต่ทั้งนี้ พนักงานยังไม่เหมาะที่จะมอบหมายให้ทำ${weakNames.join(' รวมถึง ')} เนื่องจากสเตตัสในด้านดังกล่าวยังอยู่ในระดับต่ำ`;
         }
      }

      const archetypeDescMap = {
        'agi_str': 'มีความรวดเร็วในการลงมือทำและพลังผลักดันงานขั้นสูง เหมาะสำหรับการลุยงานด่วนที่ต้องการผลลัพธ์รวดเร็ว',
        'dex_str': 'เน้นคุณภาพผลงานที่ยอดเยี่ยมควบคู่กับพลังดันงานให้สำเร็จตามเป้าหมาย มั่นใจได้ในความสมบูรณ์แบบ',
        'int_str': 'โดดเด่นด้านการวิเคราะห์แผนงานและการลงมือปฏิบัติจริง สามารถพลิกแพลงกลยุทธ์ให้เกิดผลลัพธ์ได้อย่างแม่นยำ',
        'con_str': 'มีความทรหดอดทนสูงและพลังทะลวงงานที่ยากลำบาก เหมาะสำหรับโปรเจกต์ที่ต้องใช้ความพยายามและระยะเวลายาวนาน',
        'sen_str': 'เป็นผู้นำที่มีไหวพริบยอดเยี่ยมและพลังขับเคลื่อนสูง สามารถบุกเบิกโปรเจกต์ใหม่และนำทีมก้าวข้ามอุปสรรคได้',
        'agi_dex': 'ปฏิบัติงานด้วยความรวดเร็วและคงคุณภาพระดับสูง แก้ไขปัญหาได้อย่างแนบเนียนและไร้ร่องรอย',
        'agi_int': 'ผสานความรวดเร็วเข้ากับการวิเคราะห์ที่เฉียบคม สามารถปรับกลยุทธ์ตามสถานการณ์และรุกคืบได้อย่างรวดเร็ว',
        'agi_con': 'มีความคล่องตัวสูงและอดทนต่อสภาวะกดดัน เหมาะกับการสำรวจปัญหาและจัดการสถานการณ์ฉุกเฉิน',
        'agi_sen': 'ประสานงานได้อย่างรวดเร็วและมีไหวพริบในการหาทางออก สามารถเชื่อมโยงทีมงานและแก้ไขปัญหาเฉพาะหน้าได้ดี',
        'dex_int': 'เชี่ยวชาญการออกแบบและสร้างสรรค์ระบบงานอย่างประณีต อาศัยการวิเคราะห์เชิงลึกเพื่อคุณภาพงานที่ไร้ที่ติ',
        'con_dex': 'คอยรักษามาตรฐานและคุณภาพของงานอย่างเคร่งครัด มีความอดทนสูงในการควบคุมให้ทุกอย่างเป็นไปตามระเบียบ',
        'dex_sen': 'จับเป้าหมายและปัญหาได้อย่างแม่นยำ อาศัยไหวพริบและคุณภาพเพื่อจัดการงานได้อย่างเด็ดขาดในครั้งเดียว',
        'con_int': 'โดดเด่นด้านการวิเคราะห์โครงสร้างและมีความอดทนสูง สามารถวางรากฐานโปรเจกต์ระยะยาวได้อย่างมั่นคง',
        'int_sen': 'เป็นเลิศด้านการวิเคราะห์และเจรจา มีไหวพริบในการวางแผนเชิงกลยุทธ์เพื่อหาทางเลือกที่ดีที่สุด',
        'con_sen': 'ผู้บัญชาการที่รับแรงกดดันได้อย่างดีเยี่ยม มีไหวพริบในการตัดสินใจแม้ในสถานการณ์ที่ยากลำบาก',
        'agi_con_dex': 'คอยปกป้องความราบรื่นของงานด้วยความรวดเร็ว อดทน และคงคุณภาพงานไม่ให้ตกหล่น',
        'agi_con_int': 'นักยุทธศาสตร์ที่สามารถรุกคืบด้วยความเร็วสูง มีความทนทานต่ออุปสรรคและวิเคราะห์สถานการณ์ได้เฉียบขาด',
        'agi_con_sen': 'นักสำรวจแนวหน้าที่เปี่ยมด้วยความเร็ว ความอดทน และไหวพริบในการประเมินสถานการณ์ล่วงหน้า',
        'agi_con_str': 'ทะลวงอุปสรรคเบื้องหน้าด้วยความเร็ว พลังที่ล้นเหลือ และความทรหด เหมาะกับงานด่วนที่หนักหน่วง',
        'agi_dex_int': 'ปฏิบัติการอย่างอิสระด้วยความรวดเร็ว วิเคราะห์ระบบได้ลึกซึ้ง และส่งมอบผลงานคุณภาพสูง',
        'agi_dex_sen': 'จัดการปัญหาเฉพาะหน้าด้วยความรวดเร็ว ไหวพริบ และความประณีต จนปัญหาหายไปอย่างไร้ร่องรอย',
        'agi_dex_str': 'ลงมือทำอย่างรวดเร็วและเด็ดขาด เน้นผลลัพธ์ที่มีคุณภาพสูงและการจัดการปัญหาที่ฉับไว',
        'agi_int_sen': 'ผู้เชี่ยวชาญการเข้าถึงข้อมูลด้วยความรวดเร็ว มีการวิเคราะห์เชิงลึกและไหวพริบในการเจรจาต่อรอง',
        'agi_int_str': 'ผสานการวิเคราะห์กลยุทธ์เข้ากับการลงมือทำอย่างรวดเร็ว สามารถผลักดันโปรเจกต์ให้สำเร็จได้อย่างเหนือชั้น',
        'agi_sen_str': 'ผู้นำแนวหน้าที่มีไหวพริบแพรวพราว รวดเร็ว และมีพลังผลักดันทีมงานให้มุ่งสู่เป้าหมาย',
        'con_dex_int': 'ผู้เชี่ยวชาญการวางรากฐานระบบ อาศัยการวิเคราะห์ ความประณีต และความอดทนเพื่อสร้างผลงานที่ยั่งยืน',
        'con_dex_sen': 'ผู้พิทักษ์มาตรฐานงานที่แข็งแกร่ง มีไหวพริบในการจับผิดพลาด และความอดทนในการรักษาคุณภาพ',
        'con_dex_str': 'ช่างฝีมือทรหดที่สามารถส่งมอบงานคุณภาพสูงและผลักดันงานหนักได้อย่างต่อเนื่อง',
        'con_int_sen': 'เสาหลักของทีมที่ใช้การวิเคราะห์และไหวพริบในการประเมินความเสี่ยง พร้อมความอดทนค้ำจุนโปรเจกต์',
        'con_int_str': 'สถาปนิกผู้สร้างโครงสร้างงานที่แข็งแกร่ง ผสานวิสัยทัศน์ พลังดันงาน และความทรหดเข้าด้วยกัน',
        'con_sen_str': 'ผู้นำทีมที่ไม่มีวันยอมแพ้ รับแรงกดดันได้ดีเยี่ยม มีไหวพริบและพลังในการขับเคลื่อนงานไปข้างหน้า',
        'dex_int_sen': 'ที่ปรึกษาผู้มีวิสัยทัศน์ วิเคราะห์คาดการณ์แม่นยำ อาศัยไหวพริบและคุณภาพเพื่อชี้นำทิศทาง',
        'dex_int_str': 'ปรมาจารย์ผู้คุมคุณภาพงาน อาศัยการวิเคราะห์เชิงลึกและพลังผลักดันเพื่อสร้างผลงานชิ้นเอก',
        'dex_sen_str': 'ขุนพลผู้จัดการเป้าหมายได้อย่างเฉียบคม รวดเร็ว แม่นยำ และเต็มไปด้วยพลังในการลงมือทำ',
        'int_sen_str': 'ผู้บงการเชิงกลยุทธ์ที่สามารถวิเคราะห์ ตัดสินใจด้วยไหวพริบ และผลักดันแผนงานให้เกิดขึ้นจริง'
      };
      const potentialIdentityMap = {"agi_str":"The Blitzkrieg (การรุกคืบฉับพลัน)","dex_str":"The Perfection (มาตรฐานไร้ที่ติ)","int_str":"The Adaptation (การพลิกแพลงปรับตัว)","con_str":"The Endurance (ความทนทานต่อแรงกดดัน)","sen_str":"The Commander (ผู้นำการบริหารงาน)","agi_dex":"The Flawless (ผลงานเนียบไร้รอยขีดข่วน)","agi_int":"The Opportunist (นักบริหารช่องว่างวิกฤต)","agi_con":"The Survivor (ผู้หยัดยืนทุกสภาวะ)","agi_sen":"The Link (ศูนย์กลางเครือข่ายประสานงาน)","dex_int":"The Designer (นักออกแบบระบบงาน)","con_dex":"The Guardian (ผู้พิทักษ์มาตรฐาน)","dex_sen":"The Hunter (นักติดตามและล็อกเป้าหมาย)","con_int":"The Root (ฐานรากอันแข็งแกร่ง)","int_sen":"The Tactician (นักกลยุทธ์)","con_sen":"The Unbreakable (ความมั่นคงที่ไม่สั่นคลอน)","agi_con_dex":"The Watcher (ผู้เฝ้าระวังความราบรื่น)","agi_con_int":"The Nonstop (แรงขับเคลื่อนอย่างต่อเนื่อง)","agi_con_sen":"The Vanguard (กองหน้าผู้เตรียมพร้อม)","agi_con_str":"The Berserk (ความมุ่งมั่นทะลวงอุปสรรค)","agi_dex_int":"The Independent (อิสระในแนวคิด)","agi_dex_sen":"The Mirage (การจัดการอย่างแนบเนียน)","agi_dex_str":"The Quickdraw (การจัดการเด็ดขาดในพริบตา)","agi_int_sen":"The Espionage (นักเจาะลึกข้อมูล)","agi_int_str":"The Catalyst (ปัจจัยเร่งความสำเร็จ)","agi_sen_str":"The Kinetic (พลังขับเคลื่อนทีม)","con_dex_int":"The Origin (จุดเริ่มต้นของระบบงาน)","con_dex_sen":"The Gatekeeper (ผู้คัดกรองและเฝ้าประตูมาตรฐาน)","con_dex_str":"The Xtreme (ขีดสุดแห่งความทุ่มเท)","con_int_sen":"The Pillar (ฐานค้ำจุนทีมงาน)","con_int_str":"The Antithesis (การพลิกวิกฤตสถานการณ์)","con_sen_str":"The Yieldless (ผู้นำที่ไม่ยอมจำนนต่ออุปสรรค)","dex_int_sen":"The Visionary (ผู้หยั่งรู้แนวโน้ม)","dex_int_str":"The Masterpiece (ความเชี่ยวชาญระดับชิ้นเอก)","dex_sen_str":"The X-Axis (จุดตัดแห่งความแม่นยำ)","int_sen_str":"The Almighty (ผู้ควบคุมทิศทางเบ็ดเสร็จ)"};

      let archetypeKey = 'novice';
      let identityText = '-';
      let bottomDescText = styleDesc;

      if (maxStat <= 5) {
         if (sortedStats.filter(s => s[1] >= 4).length > 0 && sortedStats.filter(s => s[1] <= 3).length > 0) {
            archetypeKey = [sortedStats[0][0], sortedStats[1][0]].sort().join('_');
         }
      } else {
         if (validStats.length >= 2) {
            if (validStats.length === 6 && validStats[0][1] === validStats[5][1]) {
               archetypeKey = 'all_rounder';
            } else {
               archetypeKey = validStats.slice(0, useTop3 ? 3 : 2).map(s=>s[0]).sort().join('_');
            }
         }
         bottomDescText = validStats.length >= 2 ? archetypeDescMap[archetypeKey] || 'ทำงานได้โดดเด่นและมีเอกลักษณ์เฉพาะตัว' : styleDesc;
      }

      identityText = getArchetypeIdentity(statsObj);

      const nameMatch = mainStyleRaw.match(/^(.+?)\s*\((.+?)\)$/);
      const enTitle = nameMatch ? nameMatch[1].trim() : mainStyleRaw.trim();
      const thTitle = nameMatch ? nameMatch[2].trim() : '';

      const flavorMap = {
        'Master': 'ระดับปรมาจารย์',
        'Elite': 'ระดับผู้เชี่ยวชาญสูงสุด',
        'Expert': 'ระดับผู้เชี่ยวชาญ',
        'Veteran': 'ระดับชำนาญการ',
        'Adept': 'ระดับผู้มีความสามารถ',
        'Trainee': 'ระดับผู้ฝึกฝน'
      };
      const prefixText = prefix.trim();
      const flavorText = flavorMap[prefixText] || '';

      const outers = [
        { k: 'cx', n: 'Customer Exp.', val: Math.round((statsObj.con + statsObj.sen)/2) },
        { k: 'tech', n: 'Tech. Expertise', val: Math.round((statsObj.int + statsObj.dex)/2) },
        { k: 'sla', n: 'Ops & SLA', val: Math.round((statsObj.agi + statsObj.dex)/2) },
        { k: 'crisis', n: 'Crisis Resolv.', val: Math.round((statsObj.str + statsObj.con)/2) },
        { k: 'resource', n: 'Resource Ctrl.', val: Math.round((statsObj.str + statsObj.sen)/2) },
        { k: 'innovation', n: 'Innovation', val: Math.round((statsObj.int + statsObj.sen)/2) }
      ].map(o => ({...o, finalVal: (u[o.k] !== null && u[o.k] !== undefined) ? u[o.k] : o.val}));

      return (
        <div key={u.id} className="animate-fade-in-up flex-1 w-full bg-[#08080c] relative overflow-y-auto custom-scrollbar flex flex-col md:flex-row shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] rounded-xl h-full min-h-[450px]">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#08080c] to-[#08080c] pointer-events-none"></div>
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#bca374] rounded-full blur-[150px] opacity-10 pointer-events-none mix-blend-screen translate-x-1/3 -translate-y-1/4"></div>

           <div className="w-full md:w-[55%] p-5 lg:p-8 z-10 flex flex-col border-r border-white/10 relative h-auto">
              <div className="absolute top-4 right-4 z-20">
                <button type="button" onClick={() => setTeamEditMode(true)} className="bg-white/10 hover:bg-white/20 text-white/50 hover:text-white p-2 rounded-full backdrop-blur-sm transition">
                  <Icon name="settings" size={18} />
                </button>
              </div>

              <div className="animate-in fade-in slide-in-from-left-8 duration-700 mt-auto mb-auto py-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-5 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] group">
                    <div className="absolute inset-0 bg-white/10 blur-xl rounded-full mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                    <ClassEmblem archetypeKey={archetypeKey} size="100%" className="text-white transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="flex flex-col">
                    <h5 className="text-[#bca374] text-[10px] sm:text-xs lg:text-sm font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-md flex flex-wrap items-center gap-2">
                       <span>{role?.name || 'ไม่ระบุสายอาชีพ'}</span>
                       {prefixText && <span className="bg-[#bca374]/20 text-[#e6d0a7] px-2 py-0.5 rounded text-[9px] border border-[#bca374]/30">{prefixText}</span>}
                    </h5>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-lg" style={{textShadow: '0 4px 20px rgba(188,163,116,0.3)'}}>
                       {enTitle}
                    </h1>
                  </div>
                </div>
                <div className="mb-4 lg:mb-5 border-l-4 border-[#bca374] pl-3">
                  <p className="text-[11px] sm:text-xs lg:text-sm text-slate-300 font-light italic mb-1 lg:mb-2">
                     "{styleDesc}"
                  </p>
                  <p className="text-[10px] sm:text-[11px] lg:text-xs text-[#bca374] leading-relaxed font-bold mb-1">
                     อัตลักษณ์ศักยภาพ: <span className="text-[#e6d0a7]">{identityText}</span>
                  </p>
                  <p className="text-[10px] sm:text-[11px] lg:text-xs text-slate-400 leading-relaxed font-bold mb-0.5">
                     สไตล์: <span className="text-[#e6d0a7]">{thTitle}</span> {flavorText && <span className="text-[9px] text-slate-500 font-normal ml-1">({flavorText})</span>}
                  </p>
                  <p className="text-[9px] sm:text-[10px] lg:text-[11px] text-slate-300 leading-relaxed drop-shadow-md">
                     {bottomDescText}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 2xl:grid-cols-3 gap-x-4 lg:gap-x-6 gap-y-2 lg:gap-y-3 mb-4 lg:mb-5">
                   {[
                     { l: 'STR', val: statsObj.str, c: 'from-rose-600 to-rose-400' },
                     { l: 'AGI', val: statsObj.agi, c: 'from-emerald-600 to-emerald-400' },
                     { l: 'DEX', val: statsObj.dex, c: 'from-amber-600 to-amber-400' },
                     { l: 'INT', val: statsObj.int, c: 'from-blue-600 to-blue-400' },
                     { l: 'CON', val: statsObj.con, c: 'from-orange-600 to-orange-400' },
                     { l: 'SEN', val: statsObj.sen, c: 'from-purple-600 to-purple-400' }
                   ].map(s => (
                     <div key={s.l} className="flex flex-col">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-slate-400 tracking-wider">{s.l}</span>
                           <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-white">{s.val}</span>
                        </div>
                        <div className="w-full h-1 lg:h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                           <div className={`h-full bg-gradient-to-r ${s.c} rounded-full`} style={{width: `${(s.val/10)*100}%`, boxShadow: '0 0 10px currentColor'}}></div>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="flex flex-wrap gap-1.5 lg:gap-2">
                   {outers.map(o => (
                      <div key={o.k} className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 lg:px-2 lg:py-1.5 flex flex-col backdrop-blur-md">
                         <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-wider">{o.n}</span>
                         <span className="text-white font-bold text-[10px] sm:text-xs">{o.finalVal} <span className="text-slate-500 text-[8px] sm:text-[9px] font-normal">/10</span></span>
                      </div>
                   ))}
                </div>
              </div>
           </div>

           <div className="w-full md:w-[45%] min-h-[300px] h-full flex items-start justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen pointer-events-none"></div>
              
              <div className="relative z-10 w-full h-full flex items-center justify-center p-4 lg:p-8 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 fill-mode-both">
                {u.image ? (
                   <img src={u.image} className="max-w-[85%] max-h-[90%] object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] transform scale-105" style={{maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'}} alt="Character" />
                ) : (
                   <div className="w-64 h-64 bg-slate-800/50 rounded-full flex items-center justify-center border border-white/5 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                     <Icon name="user" size={64} className="text-slate-600" />
                   </div>
                )}
              </div>
              
              <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#08080c] to-transparent pointer-events-none z-20"></div>
              
              <div className="absolute bottom-10 -right-10 text-[150px] font-black text-white/5 whitespace-nowrap pointer-events-none z-0 transform -rotate-12 select-none tracking-tighter mix-blend-overlay">
                 {u.name.split(' ')[0]}
              </div>
           </div>
        </div>
      );
    };

    const renderAnalysis = () => {
      const u = teamForm;
      if (!u.id && !selTeam?.isNew) return null;
      const role = classMap[u.classId];
      
      const sc = sets.statConfigs || {};
      const defMeta = {
        str: { 
          key: 'str', name: 'STR (Strength)', group: 'The Heavy Lifters', desc: 'Execution & Impact', 
          rubric: {
            basic: 'ลังเล ต้องรอคำสั่งจากหัวหน้าเสมอ',
            intermediate: 'ตัดสินใจเองได้เฉพาะงาน Routine / ปิดเคสยากได้ตามมาตรฐานบริษัท',
            advanced: 'กล้าตัดสินใจในเคสพิพาทที่ซับซ้อน / มีความสม่ำเสมอในการเจรจารักษาสัมพันธ์ลูกค้า',
            mastery: 'อนุมัติงบพิเศษหรือมาตรการเยียวยาเพื่อจบวิกฤตได้ทันที / ปิดเคสระดับวิกฤตได้สำเร็จ'
          }
        },
        agi: { 
          key: 'agi', name: 'AGI (Agility)', group: 'The Precision Engine', desc: 'Speed & Adaptability', 
          rubric: {
            basic: 'ตอบกลับล่าช้ากว่า SLA / รับมือล่าช้าหรือไม่รู้ขั้นตอนปฏิบัติ',
            intermediate: 'ตอบกลับตามมาตรฐานเวลา / ตอบสนองเหตุการณ์ตามขั้นตอน',
            advanced: 'ตอบกลับเร็วกว่าค่าเฉลี่ย / ระงับเหตุและประสานงานแก้วิกฤตได้เร็ว',
            mastery: 'ตอบกลับทันทีและเตรียมทางออกล่วงหน้า / คาดการณ์ความเสี่ยงและเข้าถึงหน้างานก่อนเกิดเหตุบานปลาย'
          }
        },
        dex: { 
          key: 'dex', name: 'DEX (Dexterity)', group: 'The Precision Engine', desc: 'Precision & Quality', 
          rubric: {
            basic: 'พบข้อผิดพลาดบ่อย / มองไม่เห็นจุด Defect พื้นฐาน',
            intermediate: 'ข้อมูลถูกต้องตามมาตรฐาน / ตรวจพบ Defect ทั่วไปตาม Check-list',
            advanced: 'ข้อมูลแม่นยำสูง / ตรวจพบจุดบกพร่องที่ซ่อนเร้นเชิงเทคนิค',
            mastery: 'ข้อมูลและตัวเลขสมบูรณ์ 100% ไร้ที่ติ / ชี้จุดผิดพลาดที่ส่งผลต่ออายุการใช้งานได้อย่างเป๊ะ'
          }
        },
        int: { 
          key: 'int', name: 'INT (Intelligence)', group: 'The Mastermind', desc: 'Strategy & Knowledge', 
          rubric: {
            basic: 'แก้ปัญหาเฉพาะหน้าแบบขอไปที / ทำงานเชิงรับ (Reactive) ตลอดเวลา',
            intermediate: 'วิเคราะห์สาเหตุพื้นฐานได้ถูกต้อง / เข้าใจความเชื่อมโยงของแต่ละแผนก',
            advanced: 'วิเคราะห์ปัญหาเชิงระบบที่ซับซ้อนได้ / เสนอแผนงานเชิงรุกเพื่อลดอุบัติการณ์',
            mastery: 'ออกแบบโมเดลเพื่อแก้ปัญหาถาวร (Permanent Fix) / สร้างระบบ Monitoring แจ้งเตือนล่วงหน้า'
          }
        },
        con: { 
          key: 'con', name: 'CON (Constitution)', group: 'The Heavy Lifters', desc: 'Resilience & Mental Toughness', 
          rubric: {
            basic: 'สติแตกหรือแสดงอาการไม่พอใจลูกค้า / ประสิทธิภาพลดลงเมื่อกดดัน',
            intermediate: 'คุมอารมณ์ได้ตามมารยาทวิชาชีพ / ทำงานได้ต่อเนื่องแม้งานมีปริมาณมาก',
            advanced: 'ใจเย็นและเจรจาไกล่เกลี่ยลูกค้าได้นุ่มนวล / มาตรฐานงานไม่ตกแม้เผชิญวิกฤตรอบด้าน',
            mastery: 'เปลี่ยนลูกค้าที่โกรธจัดให้กลับมาเป็น Brand Advocate ได้ / เป็นที่พึ่งที่หนักแน่นในภาวะวิกฤต'
          }
        },
        sen: { 
          key: 'sen', name: 'SEN (Sense)', group: 'The Mastermind', desc: 'Innovation & Automation', 
          rubric: {
            basic: 'รอการจัดสรรคิวงานจากหัวหน้า / ใช้เครื่องมือพื้นฐานได้ไม่คล่องตัว',
            intermediate: 'จัดคิวงานตนเองได้ตามลำดับสำคัญ / ใช้ CRM/Excel ติดตามงานสม่ำเสมอ',
            advanced: 'จัดสรรคิวงานและกำลังคนในทีมได้อย่างสมดุล / สร้าง Dashboard ส่วนตัวเพื่อวิเคราะห์งาน',
            mastery: 'บริหาร Resource ภาพรวมเพื่อ Productivity สูงสุด / ผสาน AI/Automation เข้ากับงาน'
          }
        }
      };

      const statMeta = ['str','agi','dex','int','con','sen'].map(k => ({
        ...defMeta[k]
      }));

      const getStatLevelText = (val) => {
          const v = Number(val);
          if (v >= 9) return 'ระดับเชี่ยวชาญ/วิกฤต (Mastery)';
          if (v >= 7) return 'ระดับสูง (Advanced)';
          if (v === 6) return 'ระดับมาตรฐาน (Standard)';
          if (v >= 4) return 'ระดับปานกลาง (Intermediate)';
          return 'ระดับพื้นฐาน (Basic)';
      };

      const getRubricText = (stat, val) => {
          const v = Number(val);
          if (v >= 9) return stat.rubric.mastery;
          if (v >= 7) return stat.rubric.advanced;
          if (v >= 4) return stat.rubric.intermediate;
          return stat.rubric.basic;
      };

      let strengths = [];
      let gaps = [];
      
      let workStyleScores = { precision: 0, lifting: 0, mastermind: 0 };

      statMeta.forEach(s => {
        const uVal = Number(u[s.key]) || 5;
        
        // Calculate style scores by measuring absolute sums
        if (s.key === 'agi' || s.key === 'dex') workStyleScores.precision += uVal;
        if (s.key === 'str' || s.key === 'con') workStyleScores.lifting += uVal;
        if (s.key === 'int' || s.key === 'sen') workStyleScores.mastermind += uVal;

        if (uVal >= 8) strengths.push({...s, uVal});
        else if (uVal <= 4) gaps.push({...s, uVal});
      });

      strengths.sort((a,b) => b.uVal - a.uVal);
      gaps.sort((a,b) => a.uVal - b.uVal);

      let mainStyle = '';
      let styleDesc = '';

      const statsObj = { str: Number(u.str)||0, agi: Number(u.agi)||0, dex: Number(u.dex)||0, int: Number(u.int)||0, con: Number(u.con)||0, sen: Number(u.sen)||0 };
      const sortedStats = Object.entries(statsObj).sort((a,b) => b[1] - a[1]);
      
      const archetypeMapTop2 = {
        'agi_str': 'Striker (สายจู่โจมความเร็วสูง)',
        'dex_str': 'Blademaster (สายปฏิบัติการเฉียบขาด)',
        'int_str': 'Battlemage (สายผสานแผนและการลงมือทำ)',
        'con_str': 'Juggernaut (สายลุยงานหนักทรหด)',
        'sen_str': 'Warlord (สายผู้นำบุกเบิก)',
        'agi_dex': 'Phantom Operative (สายปฏิบัติการไร้ร่องรอย)',
        'agi_int': 'Tactical Runner (สายรุกฉับไวด้วยกลยุทธ์)',
        'agi_con': 'Resilient Scout (สายสำรวจและแก้ปัญหาด่วน)',
        'agi_sen': 'Pathfinder (สายประสานงานรวดเร็ว)',
        'dex_int': 'System Artisan (สายสร้างสรรค์ระบบสุดเนี้ยบ)',
        'con_dex': 'Iron Sentinel (สายคุมมาตรฐานสุดแกร่ง)',
        'dex_sen': 'Sniper (สายจับเป้าหมายแม่นยำ)',
        'con_int': 'Fortress Architect (สายออกแบบโครงสร้างมั่นคง)',
        'int_sen': 'Supreme Tactician (สายเจรจาและวางกลยุทธ์)',
        'con_sen': 'Unbreakable Commander (สายผู้บัญชาการรับแรงกดดัน)'
      };

      const archetypeMapTop3 = {
        'agi_con_dex': 'Swift Guardian (สายปกป้องความราบรื่นของงาน)',
        'agi_con_int': 'Blitz Strategist (สายปฏิบัติการเชิงรุกฉับไว)',
        'agi_con_sen': 'Vanguard Tracker (สายสำรวจและประเมินสถานการณ์)',
        'agi_con_str': 'Frontline Berserker (สายลุยงานหนักทะลุทะลวง)',
        'agi_dex_int': 'Digital Ronin (สายจัดระบบงานเนี้ยบและไว)',
        'agi_dex_sen': 'Mirage Walker (สายจัดการปัญหาไร้ร่องรอย)',
        'agi_dex_str': 'Swift Duelist (สายปฏิบัติการเฉียบขาดว่องไว)',
        'agi_int_sen': 'Spymaster (สายเจาะลึกข้อมูลและเจรจา)',
        'agi_int_str': 'Arcane Vanguard (สายผสานกลยุทธ์และการลงมือทำ)',
        'agi_sen_str': 'Vanguard Warlord (สายผู้นำบุกเบิกโปรเจกต์)',
        'con_dex_int': 'Foundation Maestro (สายวางรากฐานและแก้ปัญหาระบบ)',
        'con_dex_sen': 'Titan Warden (สายคุมมาตรฐานงานสุดแกร่ง)',
        'con_dex_str': 'Juggernaut Craftsman (สายช่างฝีมือทรหด)',
        'con_int_sen': 'Grand Pillar (สายเสาหลักบริหารความเสี่ยง)',
        'con_int_str': 'Citadel Builder (สายออกแบบโครงสร้างงานมั่นคง)',
        'con_sen_str': 'Indomitable Chief (สายผู้นำทีมสุดแกร่ง)',
        'dex_int_sen': 'Visionary Consultant (สายที่ปรึกษาและคาดการณ์แม่นยำ)',
        'dex_int_str': 'Grandmaster (สายปรมาจารย์คุมคุณภาพงาน)',
        'dex_sen_str': 'Sharpshooter General (สายจัดการเป้าหมายเฉียบคม)',
        'int_sen_str': 'Mastermind Overseer (สายบริหารจัดการเชิงกลยุทธ์)'
      };

      const validStats = sortedStats.filter(s => s[1] >= 5);
      const minStat = sortedStats[5][1];
      const maxStat = sortedStats[0][1];
      
      let prefix = '';
      if (maxStat >= 9) prefix = 'Elite ';
      else if (maxStat >= 7) prefix = 'Veteran ';
      else if (maxStat >= 6) prefix = 'Adept ';

      const getDesc = (k) => {
         const conf = sets.statConfigs && sets.statConfigs[k];
         if (conf && conf.desc) return conf.desc.trim();
         const defaults = {
             str: 'พลังในการผลักดันงานหนัก', agi: 'ความรวดเร็วและคล่องตัว', dex: 'ความแม่นยำและคุณภาพงาน',
             int: 'การวิเคราะห์และวางระบบ', con: 'ความทนทานต่อความกดดัน', sen: 'ไหวพริบและการจัดการอารมณ์'
         };
         return defaults[k];
      };

      if (maxStat <= 5) {
         if (maxStat === 5 && minStat === 5) {
            mainStyle = 'Standard Achiever (ผู้บรรลุมาตรฐาน)'; styleDesc = 'ปฏิบัติงานได้ตามมาตรฐานอย่างครบถ้วนในทุกมิติ เป็นฟันเฟืองที่พึ่งพาได้ ควรกล้ารับความท้าทายใหม่ๆ เพื่อยกระดับสู่ผู้เชี่ยวชาญ';
         } else if (maxStat === 4 && minStat === 4) {
            mainStyle = 'The Maintainer (ผู้ประคองงาน)'; styleDesc = 'ประคองการทำงานภาพรวมได้ แต่มีช่องโหว่ในรายละเอียด ควรเน้นความรอบคอบและเรียนรู้จากพี่เลี้ยงเพื่อยกระดับผลงาน';
         } else if (maxStat <= 3 && minStat === maxStat) {
            mainStyle = 'Needs Attention (ผู้ต้องได้รับการดูแล)'; styleDesc = 'ผลการปฏิบัติงานต่ำกว่าเกณฑ์ในทุกมิติ หัวหน้างานควรเร่งประเมินสาเหตุและวางแผนปรับพื้นฐานใหม่ (Re-train) อย่างเร่งด่วน';
         } else if (minStat >= 4) {
            mainStyle = 'Generalist (ผู้เรียนรู้รอบด้าน)'; styleDesc = 'มีพื้นฐานที่สม่ำเสมอและปรับตัวได้ทุกบทบาท ควรผลักดันให้หา "ความถนัดเฉพาะทาง" 1-2 ด้าน เพื่อทะลุกำแพงสู่ระดับที่สูงขึ้น';
         } else if (maxStat <= 3) {
            mainStyle = 'Apprentice (ผู้ฝึกหัด)'; styleDesc = 'อยู่ในช่วงเริ่มต้นหรือยังไม่คุ้นเคยกับกระบวนการ ต้องการการสอนงานอย่างใกล้ชิด (OJT) และกำหนดเป้าหมายที่ชัดเจน';
         } else if (sortedStats.filter(s => s[1] >= 4).length > 0 && sortedStats.filter(s => s[1] <= 3).length > 0) {
            const bestKey = sortedStats[0][0]; const secondBestKey = sortedStats[1][0];
            let topName = archetypeMapTop2[[bestKey, secondBestKey].sort().join('_')] || 'Specialist (สายเฉพาะทาง)';
            mainStyle = `Rookie ${topName.split(' ')[0]} (ดาวรุ่งสาย${getDesc(bestKey).split(' ')[0]})`; styleDesc = `เริ่มฉายแววในด้าน${getDesc(bestKey)} แต่ทักษะอื่นยังไม่เสถียร ควรส่งเสริมจุดแข็งและใช้พี่เลี้ยงประคองจุดอ่อน`;
         } else {
            mainStyle = 'Uncalibrated (ศักยภาพที่รอการเจียระไน)'; styleDesc = 'ศักยภาพแฝงมีแต่ผลงานยังขาดความสม่ำเสมอ หัวหน้าควรช่วยจัดลำดับความสำคัญและแก้จุดอ่อนทีละจุดเพื่อให้ผลงานนิ่งขึ้น';
         }
      } else {
         let useTop3 = false;
         if (validStats.length >= 3) {
            if (validStats.length === 3 || validStats[2][1] > validStats[3][1]) {
               useTop3 = true;
            }
         }

         if (useTop3) {
            const topKeys = [validStats[0][0], validStats[1][0], validStats[2][0]];
            const pairKey = [...topKeys].sort().join('_');
            mainStyle = prefix + (archetypeMapTop3[pairKey] || 'Hybrid (สายผสมแบบพิเศษ)');
            styleDesc = `โดดเด่นด้าน${getDesc(topKeys[0])} ผสานเข้ากับ${getDesc(topKeys[1])} และเสริมด้วย${getDesc(topKeys[2])}`;
         } else {
            const topKeys = [validStats[0][0], validStats[1][0]];
            const pairKey = [...topKeys].sort().join('_');
            mainStyle = prefix + (archetypeMapTop2[pairKey] || 'Specialist (สายเฉพาะทาง)');
            styleDesc = `โดดเด่นด้าน${getDesc(topKeys[0])} และผสานเข้ากับ${getDesc(topKeys[1])} ได้อย่างยอดเยี่ยม`;
         }
         if (minStat <= 4) {
            const weakReasons = { str: 'งานที่ต้องลุยและใช้พลังขับเคลื่อนสูง', agi: 'งานด่วนที่ต้องการผลลัพธ์รวดเร็ว', dex: 'งานที่ต้องการความละเอียดและคุณภาพสูง', int: 'งานวางแผนและวิเคราะห์เชิงลึก', con: 'งานที่เต็มไปด้วยความกดดันและยืดเยื้อ', sen: 'งานที่ต้องเจรจาประสานงานหรือใช้ไหวพริบ' };
            const weakNames = sortedStats.filter(s => s[1] <= 4).map(s => weakReasons[s[0]]).filter(Boolean);
            if (weakNames.length > 0) styleDesc += ` แต่ทั้งนี้ พนักงานยังไม่เหมาะที่จะมอบหมายให้ทำ${weakNames.join(' รวมถึง ')} เนื่องจากสเตตัสในด้านดังกล่าวยังอยู่ในระดับต่ำ`;
         }
      }

      return (
        <div className="mt-6 pt-4 w-full text-left relative z-10 font-sans">
          <h4 className="font-bold text-[#0f2e4a] text-sm flex items-center mb-3">
            <Icon name="user" size={16} className="mr-2 text-[#bca374]" /> วิเคราะห์ศักยภาพ (Talent Discovery)
          </h4>
          
          <div className="mb-4 text-[12px] p-3 rounded bg-[#f8fafc] text-slate-700 border border-slate-200 shadow-sm relative z-10">
             <strong className="block mb-1 text-[#0f2e4a] font-bold">▶ แนวโน้มการทำงาน (Work Style Tendency):</strong>
             <span className="font-bold text-[#0f2e4a] text-sm block ml-3 mb-1">{mainStyle}</span>
             <span className="block text-slate-600 leading-relaxed ml-3">{styleDesc}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-2 relative z-10">
            <div className="bg-emerald-50/70 p-3 rounded border border-emerald-200 relative overflow-hidden">
              <strong className="text-emerald-800 text-[13px] flex items-center mb-2"><Icon name="trendingUp" size={14} className="mr-1.5 text-emerald-600"/> จุดเด่น (Strengths)</strong>
              {strengths.length > 0 ? (
                <ul className="text-[12px] text-slate-700 space-y-1.5 relative z-10 pl-2 border-l-2 border-emerald-300 ml-1">
                  {strengths.map(s => (
                    <li key={s.key} className="py-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium">{s.name}</span>
                        <span className="font-bold text-emerald-700">
                          {s.uVal} <span className="text-slate-400 font-normal ml-1 text-[10px]">({getStatLevelText(s.uVal)})</span>
                        </span>
                      </div>
                      <div className="text-slate-600 leading-snug">▶ {getRubricText(s, s.uVal)}</div>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-[11px] text-slate-500 relative z-10 ml-2">ไม่มีสเตตัสระดับสูง</div>}
            </div>

            <div className="bg-orange-50/70 p-3 rounded border border-orange-200 relative overflow-hidden mt-1">
              <strong className="text-orange-800 text-[13px] flex items-center mb-2"><Icon name="alertCircle" size={14} className="mr-1.5 text-orange-600"/> สิ่งที่ควรพัฒนา (Gaps)</strong>
              {gaps.length > 0 ? (
                <ul className="space-y-3 relative z-10 pl-2 border-l-2 border-orange-300 ml-1">
                  {gaps.map(s => {
                    const baseTarget = role?.baseStats?.[s.key] ? Number(role.baseStats[s.key]) : null;
                    const isBelowTarget = baseTarget && s.uVal < baseTarget;
                    return (
                    <li key={s.key} className="text-slate-700 text-[12px] pb-2 border-b border-orange-100 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1">
                        <strong className="text-[#0f2e4a]">{s.name}</strong>
                        <span className="font-bold text-orange-600">
                           {s.uVal} <span className="text-slate-400 font-normal ml-1 text-[10px]">({getStatLevelText(s.uVal)})</span>
                        </span>
                      </div>
                      <div className="text-orange-700 leading-snug mb-1">
                        ▶ {getRubricText(s, s.uVal)}
                      </div>
                      {isBelowTarget && (
                        <div className="text-[10px] text-rose-600 font-medium bg-rose-50 p-1 rounded inline-block mt-0.5">
                           * เป้าหมายของตำแหน่ง {role.name} คือระดับ {baseTarget}
                        </div>
                      )}
                    </li>
                  )})}
                </ul>
              ) : <div className="text-[11px] text-slate-500 relative z-10 ml-2">ไม่พบความเสี่ยงที่น่ากังวล</div>}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 relative z-10">
             <h4 className="font-bold text-[#0f2e4a] text-[13px] flex items-center mb-1">
                <Icon name="layers" size={14} className="mr-2 text-indigo-500" />
                6 แกนสมรรถนะผลงาน (The Outer Layer)
             </h4>
             <p className="text-[10px] text-slate-500 mb-3 leading-snug">
                * ระบบวิเคราะห์ค่าจากศักยภาพตั้งต้น (HOW) หัวหน้างานสามารถสไลด์ปรับเพิ่ม/ลดคะแนนเพื่อสะท้อนผลลัพธ์หน้างานจริง (WHAT)
             </p>
             <div className="grid grid-cols-2 gap-3">
                {[
                  { k: 'cx', n: 'Customer Exp.', d: 'ความพึงพอใจลูกค้า' },
                  { k: 'tech', n: 'Tech. Expertise', d: 'ทักษะเชิงลึก' },
                  { k: 'sla', n: 'Ops & SLA', d: 'เวลาและความเป๊ะ' },
                  { k: 'crisis', n: 'Crisis Resolv.', d: 'แก้ปัญหาวิกฤต' },
                  { k: 'resource', n: 'Resource Ctrl.', d: 'บริหารทรัพยากร' },
                  { k: 'innovation', n: 'Innovation', d: 'สร้างระบบใหม่' }
                ].map(out => {
                   const autoVal = Math.round(
                      out.k === 'cx' ? (statsObj.con + statsObj.sen)/2 :
                      out.k === 'tech' ? (statsObj.int + statsObj.dex)/2 :
                      out.k === 'sla' ? (statsObj.agi + statsObj.dex)/2 :
                      out.k === 'crisis' ? (statsObj.str + statsObj.con)/2 :
                      out.k === 'resource' ? (statsObj.str + statsObj.sen)/2 :
                      (statsObj.int + statsObj.sen)/2
                   );
                   const actualVal = (u[out.k] !== null && u[out.k] !== undefined) ? u[out.k] : autoVal;
                   const isOverride = u[out.k] !== null && u[out.k] !== undefined && u[out.k] !== autoVal;
                   const gap = actualVal - autoVal;
                   
                   return (
                     <div key={out.k} className={`bg-white p-2.5 rounded-lg border ${isOverride ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200'} shadow-sm flex flex-col justify-between`}>
                        <div className="flex justify-between items-start mb-1">
                           <div>
                              <strong className="text-[11px] text-indigo-900 block">{out.n}</strong>
                              <span className="text-[9px] text-slate-400">{out.d}</span>
                           </div>
                           <span className={`font-bold text-[12px] ${isOverride ? 'text-indigo-600' : 'text-slate-500'}`}>
                             {actualVal}<span className="text-[9px] text-slate-400">/10</span>
                           </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                           <input type="range" min="1" max="10" step="1" 
                              className="w-[70%] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                              value={actualVal} 
                              onChange={e => setTeamForm({...teamForm, [out.k]: Number(e.target.value)})} 
                           />
                           {isOverride && (
                             <button type="button" className="text-[9px] text-slate-400 hover:text-indigo-500 underline ml-1" onClick={() => setTeamForm({...teamForm, [out.k]: null})}>คืนค่า</button>
                           )}
                        </div>
                        {gap <= -2 && (
                           <div className="mt-2 text-[10px] text-rose-700 bg-rose-50 p-1.5 rounded font-medium leading-tight border border-rose-100">
                              ⚠️ ศักยภาพ {autoVal} แต่ผลงาน {actualVal} (Low Result) → ขาดประสบการณ์หน้างาน ควรทำ OJT ด่วน
                           </div>
                        )}
                        {gap >= 2 && (
                           <div className="mt-2 text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded font-medium leading-tight border border-emerald-100">
                              ⭐ ผลงาน {actualVal} แซงศักยภาพ {autoVal} → ค้นพบ Best Practice ควรแชร์ต่อในทีม
                           </div>
                        )}
                     </div>
                   );
                })}
             </div>
          </div>
        </div>
      );
    };

    return (
      <div className="flex flex-col md:flex-row gap-6 animate-in h-auto md:h-full pb-10">
        <div className="w-full md:w-72 bg-white border rounded-xl shadow-sm flex flex-col min-h-[300px] max-h-[350px] md:max-h-none md:h-full shrink-0">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
            <h3 className="font-bold text-[#0f2e4a]">รายชื่อทีมงาน</h3>
            <div className="flex gap-2">
               <label className="bg-indigo-600 text-white text-[11px] px-2 py-1 rounded hover:bg-indigo-700 cursor-pointer flex items-center transition shadow-sm">
                 <Icon name="upload" size={12} className="mr-1" /> Excel
                 <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
               </label>
               <button type="button" onClick={()=>{setSelTeam({isNew: true}); setTeamForm({id:'', name:'', classId:'', image:'', str:5, agi:5, dex:5, int:5, con:5, sen:5});}} className="bg-[#bca374] text-white text-[11px] px-2 py-1 rounded hover:bg-[#a38a5b] transition shadow-sm">+ เพิ่ม</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
            {sList.map(s => (
              <div key={s.id} onClick={()=>{setSelTeam(s); setTeamForm({...s});}} className={`flex items-center p-2 rounded-lg cursor-pointer transition ${selTeam?.id===s.id ? 'bg-[#0f2e4a] text-white' : 'hover:bg-blue-50 text-gray-700'}`}>
                {s.image ? <img src={s.image} className="w-8 h-8 rounded-full object-cover mr-3 border border-white/50" /> : <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-xs font-bold ${selTeam?.id===s.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{s.name.substring(0,2)}</div>}
                <div className="truncate flex-1">
                  <div className="font-bold text-sm truncate">{s.name}</div>
                  <div className={`text-[10px] ${selTeam?.id===s.id ? 'text-blue-200' : 'text-gray-400'}`}>{classMap[s.classId]?.name || 'ไม่ระบุคลาส'}</div>
                  <div className={`text-[9px] ${selTeam?.id===s.id ? 'text-[#e6d0a7]' : 'text-[#bca374]'} font-bold truncate mt-0.5`}>{s.potentialIdentity || getArchetypeIdentity(s)}</div>
                </div>
              </div>
            ))}
            {sList.length === 0 && <div className="text-center text-xs text-gray-400 p-4">ยังไม่มีรายชื่อทีมงาน<br/>กด "+ เพิ่ม" เพื่อสร้างใหม่</div>}
          </div>
        </div>

        <div className="flex-1 bg-white border rounded-xl shadow-sm flex flex-col h-auto md:h-full overflow-hidden">
          {(!selTeam && !teamForm.name && !teamForm.id) ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
               <Icon name="users" size={64} className="mb-4 opacity-50" />
               <p className="font-bold">เลือกทีมงานจากเมนูด้านซ้าย</p>
               <p className="text-xs mt-1">หรือกด "+ เพิ่ม" เพื่อสร้างโปรไฟล์ใหม่</p>
             </div>
          ) : ( (!teamEditMode && teamForm.id && !selTeam?.isNew) ? renderCinematicView() : (
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
               <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
                 <div className="w-full lg:w-1/2 flex flex-col items-center bg-white/90 p-4 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-transparent via-[#bca374] to-transparent opacity-30"></div>
                    <div className="relative group mb-6 mt-2">
                      <div className="w-32 h-32 rounded-full border-[3px] border-[#bca374] shadow-[0_0_20px_rgba(188,163,116,0.3)] overflow-hidden bg-[#0f2e4a] flex items-center justify-center relative z-10">
                        {teamForm.image ? <img src={teamForm.image} className="w-full h-full object-cover" /> : <Icon name="camera" size={32} className="text-[#bca374]/50"/>}
                      </div>
                      <div className="absolute -inset-2 border-2 border-dashed border-[#bca374]/30 rounded-full animate-[spin_20s_linear_infinite] pointer-events-none"></div>
                      <label className="absolute bottom-0 right-0 bg-gradient-to-tr from-[#bca374] to-[#e6d0a7] text-[#0f2e4a] p-2.5 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform z-20 border border-white/50">
                        <Icon name="upload" size={16} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                    
                    <div className="w-full space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">ชื่อ - นามสกุล</label>
                        <input type="text" className="w-full border rounded-lg px-4 py-2 text-sm font-bold text-[#0f2e4a] focus:ring-2 focus:ring-[#bca374] outline-none" placeholder="ชื่อพนักงาน..." value={teamForm.name} onChange={e=>setTeamForm({...teamForm, name:e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">คลาส (สายอาชีพ)</label>
                        <select className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#bca374] outline-none" value={teamForm.classId} onChange={e=>setTeamForm({...teamForm, classId:e.target.value})}>
                          <option value="">-- ไม่ระบุ --</option>
                          {(sets.staffClasses||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-3 gap-y-3 pt-4 border-t border-slate-100 mt-2">
                        {[{k:'str',l:'STR',f:'Strength',c:'text-rose-600',bg:'bg-rose-50',b:'border-rose-200'},{k:'agi',l:'AGI',f:'Agility',c:'text-emerald-600',bg:'bg-emerald-50',b:'border-emerald-200'},{k:'dex',l:'DEX',f:'Dexterity',c:'text-amber-600',bg:'bg-amber-50',b:'border-amber-200'},{k:'int',l:'INT',f:'Intelligence',c:'text-blue-600',bg:'bg-blue-50',b:'border-blue-200'},{k:'con',l:'CON',f:'Constitution',c:'text-orange-600',bg:'bg-orange-50',b:'border-orange-200'},{k:'sen',l:'SEN',f:'Sense',c:'text-purple-600',bg:'bg-purple-50',b:'border-purple-200'}].map(s=>(
                          <div key={s.k} className={`flex items-center justify-between ${s.bg} p-2 rounded-lg border ${s.b} shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-transform hover:scale-[1.02]`}>
                            <div className="flex flex-col">
                              <label className={`text-[12px] font-black ${s.c} leading-none`}>{s.l}</label>
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{s.f}</label>
                            </div>
                            <input type="number" min="1" max="10" className={`w-10 text-center text-[14px] font-black border-b-2 border-transparent focus:${s.b} bg-transparent outline-none ${s.c}`} value={teamForm[s.k]} onChange={e=>setTeamForm({...teamForm, [s.k]: Number(e.target.value)||1})} />
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button type="button" onClick={saveTeam} className="flex-1 bg-[#0f2e4a] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-[#1a3f63] flex justify-center items-center"><Icon name="save" size={16} className="mr-2"/> บันทึกข้อมูล</button>
                        {teamForm.id && !selTeam?.isNew && <button type="button" onClick={()=>{setTeamEditMode(false); setTeamForm({...selTeam});}} className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>}
                        {teamForm.id && <button type="button" onClick={()=>{if(confirm('ลบพนักงานคนนี้?')){ let ns=(sets.staffStats||[]).filter(x=>x.id!==teamForm.id); const newSets = {...sets, staffStats: ns}; setSets(newSets); saveD('settings', newSets); setSelTeam(null); setTeamForm({id:'', name:'', classId:'', image:'', str:5, agi:5, dex:5, int:5, con:5, sen:5}); }}} className="bg-red-50 text-red-500 p-2.5 rounded-lg border border-red-200 hover:bg-red-100"><Icon name="trash" size={16}/></button>}
                      </div>
                    </div>
                 </div>

                 <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl border-2 border-slate-100 relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#0f2e4a] to-transparent opacity-20"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-100/50 via-transparent to-transparent pointer-events-none"></div>
                    <div className="w-full mt-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
                       <h4 className="font-bold text-[#0f2e4a] mb-6 text-center tracking-wider flex items-center justify-center text-sm"><Icon name="swords" size={18} className="mr-2 text-[#bca374]"/> PERFORMANCE MAP</h4>
                       <div className="w-full max-w-[280px] aspect-square">
                         <RadarChart 
                            userStats={[teamForm.str, teamForm.agi, teamForm.dex, teamForm.int, teamForm.con, teamForm.sen]}
                         />
                       </div>
                       <div className="flex flex-wrap justify-center gap-4 mt-6 text-[11px] font-bold text-slate-500">
                          <div className="flex items-center"><div className="w-3 h-3 bg-[#0f2e4a] mr-2 rounded-sm opacity-60"></div> ระดับสเตตัสพนักงาน</div>
                       </div>
                       <div className="w-full mt-6 border-t border-slate-100"></div>
                       {renderAnalysis()}
                    </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const rSet = () => {
    if (!setUnlk) return (<div className="bg-white p-8 rounded-xl shadow border text-center max-w-sm mx-auto mt-10"><h2 className="text-lg font-bold mb-4">เข้าสู่ระบบแอดมิน</h2><input type="password" placeholder="รหัสผ่าน" className="border p-3 rounded-lg w-full mb-4 text-center tracking-widest text-lg outline-none" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&pwd==='1312'&&setSetUnlk(true)} /><button type="button" onClick={()=>pwd==='1312'&&setSetUnlk(true)} className="bg-[#0f2e4a] text-white px-4 py-2 rounded-lg w-full font-bold">ยืนยัน</button></div>);
    const totalRows = tasks.length + informs.length; 
    const healthPct = Math.min((totalRows / 3000) * 100, 100);
    const healthColor = totalRows < 1500 ? 'bg-green-500' : (totalRows < 2500 ? 'bg-amber-500' : 'bg-red-500');
    
    const groupedProjects = (sets.projects||[]).reduce((acc, curr) => {
        const p = getProjName(curr), a = getProjArea(curr);
        if (!acc[a]) acc[a] = [];
        acc[a].push({ fullStr: curr, name: p });
        return acc;
    }, {});

    const groupedSlas = (sets.slas||[]).reduce((acc, curr) => {
        const cat = getProjName(curr), days = getProjArea(curr);
        if (!acc[days]) acc[days] = [];
        acc[days].push({ fullStr: curr, name: cat });
        return acc;
    }, {});

    return (
      <div className="space-y-6 animate-in pb-10">
        <div className="bg-white p-6 rounded-xl border shadow-sm border-t-4 border-[#bca374]">
          <h3 className="font-bold text-lg mb-4 flex items-center"><Icon name="fileText" size={20} className="mr-2 text-[#0f2e4a]"/> ส่งออกรายงานสรุป (PDF)</h3>
          <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg border">
            <div><label className="text-xs font-bold block mb-1">หัวข้อรายงาน</label><select className="border rounded px-3 py-2 text-sm font-bold text-[#0f2e4a]" value={rCfg.topic || 'task'} onChange={e=>setRConfig({...rCfg, topic:e.target.value})}><option value="task">ใบงาน (Task)</option><option value="inform">แจ้งเปิดงาน (Inform-Job)</option></select></div>
            <div><label className="text-xs font-bold block mb-1">รูปแบบ</label><select className="border rounded px-3 py-2 text-sm" value={rCfg.type} onChange={e=>setRConfig({...rCfg, type:e.target.value})}><option value="month">รายเดือน</option><option value="year">รายปี</option></select></div>
            <div><label className="text-xs font-bold block mb-1">{rCfg.type==='month'?'เดือน':'ปี'}</label>{rCfg.type==='month'?<input type="month" className="border rounded px-3 py-2 text-sm" value={rCfg.val} onChange={e=>setRConfig({...rCfg, val:e.target.value})} />:<input type="number" className="border rounded px-3 py-2 text-sm w-24" value={rCfg.val.substring(0,4)} onChange={e=>setRConfig({...rCfg, val:`${e.target.value}-01`})} />}</div>
            <div><label className="text-xs font-bold block mb-1">พื้นที่</label><select className="border rounded px-3 py-2 text-sm" value={rCfg.area} onChange={e=>setRConfig({...rCfg, area:e.target.value})}><option value="ทั้งหมด">ทั้งหมด</option>{(sets.areas||[]).map(a=><option key={a}>{a}</option>)}</select></div>
            <div><label className="text-xs font-bold block mb-1">โครงการ</label><select className="border rounded px-3 py-2 text-sm" value={rCfg.project} onChange={e=>setRConfig({...rCfg, project:e.target.value})}><option value="ทั้งหมด">ทั้งหมด</option>{(sets.projects||[]).map(p=><option key={p}>{getProjName(p)}</option>)}</select></div>
            <div><label className="text-xs font-bold block mb-1">เจ้าหน้าที่</label><select className="border rounded px-3 py-2 text-sm" value={rCfg.staffName} onChange={e=>setRConfig({...rCfg, staffName:e.target.value})}><option value="ทั้งหมด">ทั้งหมด</option>{Array.from(new Set((sets.emails||[]).map(e => e.split('|')[2] || e.split('|')[0].split('@')[0]))).filter(Boolean).map(n=><option key={n}>{n}</option>)}</select></div>
            <button type="button" onClick={()=>window.print()} className="bg-[#0f2e4a] text-white px-6 py-2 rounded-lg text-sm font-bold shadow flex items-center ml-auto hover:bg-[#1a3f63]"><Icon name="download" size={16} className="mr-2"/> พิมพ์ PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#0f2e4a]">จัดกลุ่มโครงการตามพื้นที่</h3>
              <button type="button" onClick={()=>clearSList('projects')} className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded flex items-center"><Icon name="trash" size={14} className="mr-1"/>ลบทั้งหมด</button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 hide-scrollbar space-y-3 border border-gray-100 p-3 rounded">
              {Object.keys(groupedProjects).map(area => (
                <div key={area} className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-[#0f2e4a] border-b">{area || 'ไม่ได้ระบุพื้นที่'}</div>
                  <div className="p-3 flex flex-wrap gap-2 bg-white">
                    {groupedProjects[area].map(p => (
                      <span key={p.fullStr} className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-1.5 rounded text-xs flex items-center shadow-sm">
                        {p.name}
                        <button type="button" onClick={()=>dlS('projects', p.fullStr)} className="ml-1.5 text-red-400 hover:text-red-600"><Icon name="x" size={10}/></button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2 pt-4 border-t">
              <input type="text" placeholder="ชื่อโครงการ..." className="border rounded px-3 py-2 text-sm flex-1 min-w-0 bg-gray-50 focus:bg-white transition-colors" value={sInp.projects} onChange={e=>setSInp({...sInp,projects:e.target.value})} />
              <select className="border rounded px-3 py-2 text-sm w-28 bg-gray-50 focus:bg-white transition-colors" value={sInp.projArea} onChange={e=>setSInp({...sInp,projArea:e.target.value})}>
                <option value="">เลือกพื้นที่</option>
                {(sets.areas||[]).map(a=><option key={a}>{a}</option>)}
              </select>
              <button type="button" onClick={()=>sInp.projects&&sInp.projArea&&upS('projects',`${sInp.projects}|${sInp.projArea}`)} className="bg-[#0f2e4a] text-white px-4 rounded shadow hover:bg-[#1a3f63] transition-colors"><Icon name="plus" size={16}/></button>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm text-[#0f2e4a]">หมวดงาน ➡️ กรอบเวลา (SLA)</h3><button type="button" onClick={()=>clearSList('slas')} className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded flex items-center"><Icon name="trash" size={14} className="mr-1"/>ลบทั้งหมด</button></div>
            <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 hide-scrollbar space-y-3 border border-gray-100 p-3 rounded">
              {Object.keys(groupedSlas).sort((a,b)=>Number(a)-Number(b)).map(days => (
                <div key={days} className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 border-b flex justify-between items-center">
                    <span>⏳ {days} วัน</span>
                    <span className="bg-white text-amber-700 px-2 py-0.5 rounded text-[10px] shadow-sm">{groupedSlas[days].length} รายการ</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2 bg-white">
                    {groupedSlas[days].map(item => (
                      <span key={item.fullStr} className="bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1.5 rounded text-xs flex items-center shadow-sm font-medium">
                        {item.name}
                        <button type="button" onClick={()=>dlS('slas', item.fullStr)} className="ml-1.5 text-red-400 hover:text-red-600"><Icon name="x" size={12}/></button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2 pt-4 border-t">
              <input type="text" placeholder="หมวดงาน SLA..." className="border rounded px-3 py-2 text-sm flex-1 min-w-0 bg-gray-50" value={sInp.slas} onChange={e=>setSInp({...sInp,slas:e.target.value})} />
              <input type="number" placeholder="วัน" className="border rounded px-3 py-2 text-sm w-20 bg-gray-50" value={sInp.slaDays} onChange={e=>setSInp({...sInp,slaDays:e.target.value})} />
              <button type="button" onClick={()=>sInp.slas&&sInp.slaDays&&upS('slas',`${sInp.slas}|${sInp.slaDays}`)} className="bg-[#bca374] text-white px-4 rounded shadow hover:bg-[#a38a5b]"><Icon name="plus" size={16}/></button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col lg:flex-row gap-8">
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r pb-6 lg:pb-0 lg:pr-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-[#0f2e4a] flex items-center"><Icon name="mail" size={18} className="mr-2 text-blue-500"/> รายชื่อและสิทธิ์การรับอีเมล</h3>
              <button type="button" onClick={()=>clearSList('emails')} className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded flex items-center"><Icon name="trash" size={14} className="mr-1"/>ลบทั้งหมด</button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[450px] pr-2 hide-scrollbar space-y-3">
              {(sets.emails||[]).map(item => {
                const parts = item.split('|'), em = parts[0], projs = parts[1] ? parts[1].split(',') : ['ทั้งหมด'], name = parts[2] || '';
                return (
                  <div key={item} className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-blue-50/50 px-4 py-2.5 flex justify-between items-center border-b border-blue-100">
                      <span className="font-bold text-[#0f2e4a] text-sm">{em} {name && <span className="text-gray-500 font-normal">({name})</span>}</span>
                      <button type="button" onClick={()=>dlS('emails', item)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Icon name="trash" size={14}/></button>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2 bg-white">
                      {projs.map(p => (
                        <span key={p} className={`px-2.5 py-1.5 rounded text-xs flex items-center font-medium border ${p==='ทั้งหมด'?'bg-amber-50 text-amber-700 border-amber-200':'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'}`}>
                          {p}
                          {p!=='ทั้งหมด' && <button type="button" onClick={()=>rmEmailProj(item, p)} className="ml-1.5 text-blue-400 hover:text-blue-600"><Icon name="x" size={12}/></button>}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <h3 className="font-bold text-sm text-[#0f2e4a] mb-4">เพิ่ม / แก้ไข สิทธิ์อีเมล</h3>
            <div className="bg-gray-50 p-4 rounded-xl border flex-1 flex flex-col">
              <label className="text-xs font-bold text-gray-700 mb-1">ชื่อเจ้าหน้าที่ (Staff Name)</label>
              <input type="text" placeholder="ตัวอย่าง: สมชาย" className="border rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors mb-3 shadow-sm" value={emForm.name} onChange={e=>setEmForm({...emForm, name:e.target.value})} />
              
              <label className="text-xs font-bold text-gray-700 mb-1">อีเมลผู้รับ</label>
              <input type="email" placeholder="ตัวอย่าง: admin@lh.co.th" className="border rounded-lg px-4 py-2.5 text-sm w-full bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors mb-4 shadow-sm" value={emForm.email} onChange={e=>setEmForm({...emForm, email:e.target.value})} />
              
              <label className="text-xs font-bold text-gray-700 mb-1">เลือกโครงการที่ต้องการให้แจ้งเตือน</label>
              <div className="border rounded-lg bg-white p-3 max-h-[300px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 hide-scrollbar shadow-inner mb-4 flex-1">
                 <label className="flex items-center text-xs cursor-pointer hover:bg-gray-50 p-2.5 rounded-lg transition border border-amber-200 bg-amber-50 col-span-1 sm:col-span-2 shadow-sm">
                    <input type="checkbox" className="mr-3 accent-[#bca374] w-4 h-4" checked={emForm.selectedProjs.includes('ทั้งหมด')} onChange={() => toggleEmailProj('ทั้งหมด')} /> <span className="font-bold text-amber-800">เลือกทุกโครงการ (รับแจ้งเตือนทั้งหมด)</span>
                 </label>
                 {(sets.projects||[]).map(p => {
                    const pName = getProjName(p);
                    return (<label key={pName} className="flex items-center text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition border border-gray-100 shadow-sm"><input type="checkbox" className="mr-2 accent-[#0f2e4a] w-3.5 h-3.5" checked={emForm.selectedProjs.includes(pName)} onChange={() => toggleEmailProj(pName)} /> <span className="truncate" title={pName}>{pName}</span></label>);
                 })}
              </div>
              <button type="button" onClick={addEmailMappingV2} className="bg-[#0f2e4a] text-white px-4 py-3 rounded-lg shadow-md hover:bg-[#1a3f63] text-sm font-bold w-full transition-colors mt-auto flex justify-center items-center"><Icon name="save" size={16} className="mr-2" /> บันทึกสิทธิ์รับอีเมล</button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-[#0f2e4a] flex items-center"><Icon name="users" size={20} className="mr-2 text-[#bca374]"/> ตั้งค่าคลาสและฐานสเตตัสทีมงาน (RPG Classes)</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex-1 overflow-y-auto max-h-[450px] pr-2 hide-scrollbar space-y-3 border p-3 rounded bg-gray-50">
              {(sets.staffClasses||[]).map(c => (
                <div key={c.id} className="bg-white border rounded-lg p-3 shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-bold text-[#0f2e4a]">{c.name}</div>
                  </div>
                  <button type="button" onClick={()=>{let ns=(sets.staffClasses||[]).filter(x=>x.id!==c.id); const newSets = {...sets, staffClasses: ns}; setSets(newSets); saveD('settings', newSets);}} className="text-red-400 hover:text-red-600 p-2"><Icon name="trash" size={16}/></button>
                </div>
              ))}
              {(!sets.staffClasses || sets.staffClasses.length === 0) && <div className="text-center text-gray-400 py-4 text-xs">ยังไม่มีคลาสอาชีพ</div>}
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border flex-1 flex flex-col">
              <label className="text-xs font-bold text-gray-700 mb-1">ชื่อคลาส (Role Name)</label>
              <input type="text" placeholder="เช่น Supervisor, Foreman" className="border rounded-lg px-4 py-2 text-sm w-full mb-3" value={sInp.className} onChange={e=>setSInp({...sInp, className:e.target.value})} onKeyDown={e=>{if(e.key==='Enter') {if(!sInp.className) return alert('ใส่ชื่อคลาส'); let ns=[...(sets.staffClasses||[])]; ns.push({id: Date.now().toString(), name: sInp.className}); const newSets = {...sets, staffClasses: ns}; setSets(newSets); saveD('settings', newSets); setSInp({...sInp, className:''});}}} />
              <button type="button" onClick={()=>{ if(!sInp.className) return alert('ใส่ชื่อคลาส'); let ns=[...(sets.staffClasses||[])]; ns.push({id: Date.now().toString(), name: sInp.className}); const newSets = {...sets, staffClasses: ns}; setSets(newSets); saveD('settings', newSets); setSInp({...sInp, className:''}); }} className="bg-[#bca374] text-white px-4 py-2.5 rounded-lg shadow-md hover:bg-[#a38a5b] text-sm w-full font-bold mt-auto transition"><Icon name="plus" size={16} className="inline mr-2"/> เพิ่มคลาส</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{k:'areas',l:'พื้นที่'},{k:'jobTypes',l:'ประเภทงาน'},{k:'locations',l:'บริเวณ'}].map(x => (
            <div key={x.k} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm text-[#0f2e4a]">{x.l}</h3><button type="button" onClick={()=>clearSList(x.k)} className="text-xs text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded flex items-center"><Icon name="trash" size={14} className="mr-1"/>ลบทั้งหมด</button></div>
              <ul className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-2 text-xs hide-scrollbar border border-gray-100 p-3 rounded">
                {(sets[x.k]||[]).map(item=><li key={item} className="flex justify-between items-center bg-gray-50 px-3 py-2 border rounded-lg shadow-sm"><span>{item}</span><button type="button" onClick={()=>dlS(x.k,item)} className="text-red-400 hover:text-red-600"><Icon name="trash" size={14}/></button></li>)}
              </ul>
              <div className="mt-4 flex gap-2 pt-4 border-t">
                <input type="text" placeholder="เพิ่มข้อมูลใหม่..." className="border rounded px-3 py-2 text-sm flex-1 min-w-0 bg-gray-50" value={sInp[x.k]||''} onChange={e=>setSInp({...sInp,[x.k]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&upS(x.k,sInp[x.k])}/>
                <button type="button" onClick={()=>upS(x.k,sInp[x.k])} className="bg-[#0f2e4a] text-white px-4 rounded shadow hover:bg-[#1a3f63]"><Icon name="plus" size={16}/></button>
              </div>
            </div>
          ))}
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-center items-center text-center space-y-3">
            <Icon name="mail" size={32} className="text-blue-500 mb-2"/>
            <div className="font-bold text-sm">ทดสอบระบบอีเมล</div>
            <div className="text-xs text-gray-500">ทดสอบการส่งอีเมลไปยังผู้ดูแลโครงการทั้งหมดเพื่อความมั่นใจ</div>
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-4">
              <button type="button" onClick={testEmailSystem} className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-[11px] font-bold shadow hover:bg-blue-100">ทดสอบการเชื่อมต่อ (Ping)</button>
              <button type="button" onClick={forceScanRealTasks} className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-lg text-[11px] font-bold shadow hover:bg-purple-100">สแกนงานล่าช้า (ของจริง)</button>
              <button type="button" onClick={installTrigger} className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg text-[11px] font-bold shadow hover:bg-amber-100">ติดตั้งบอทแจ้งเตือนอัตโนมัติ</button>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
            <div><h3 className="font-bold text-sm mb-2 flex items-center"><Icon name="clock" size={16} className="mr-2 text-amber-500"/> เวลาตัดเกณฑ์ Overdue</h3><input type="time" className="border rounded-lg px-4 py-2 text-sm outline-none bg-gray-50 w-full" value={sets.overdueTime} onChange={e=>upS('overdueTime',e.target.value,false)} /></div>
            <div><h3 className="font-bold text-sm mb-2 flex items-center"><Icon name="fileText" size={16} className="mr-2 text-red-500"/> ขีดจำกัดออกใบงานช้า (ชม.)</h3><input type="number" className="border rounded-lg px-4 py-2 text-sm w-full outline-none bg-gray-50" value={sets.lateWorkOrderHours} onChange={e=>upS('lateWorkOrderHours',e.target.value,false)} /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm border-t-4 border-[#0f2e4a]">
          <h3 className="font-bold text-lg mb-4 flex items-center"><Icon name="database" size={20} className="mr-2 text-[#0f2e4a]"/> ศูนย์จัดการข้อมูล (Data Center)</h3>
          <div className="mb-5 bg-gray-50 p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full">
              <div className="flex justify-between text-xs font-bold mb-2 text-gray-700"><span>ปริมาณข้อมูลรวมระบบ</span><span>{totalRows} รายการ</span></div>
              <div className="w-full bg-gray-200 rounded-full h-3"><div className={`${healthColor} h-3 rounded-full transition-all duration-500`} style={{width: `${healthPct}%`}}></div></div>
            </div>
            <button type="button" onClick={runMigration} className="w-full md:w-auto bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-purple-100 transition shadow-sm"><Icon name="database" size={16} className="mr-2"/> ดึงข้อมูล Sheet เข้า Firebase</button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={()=>downloadCSV(tasks, `Tasks_Backup_${getTStr()}.csv`)} className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-blue-100 transition shadow-sm"><Icon name="download" size={16} className="mr-2"/> สำรองข้อมูลงาน (CSV)</button>
            <button type="button" onClick={()=>downloadCSV(informs, `InformJobs_Backup_${getTStr()}.csv`)} className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-blue-100 transition shadow-sm"><Icon name="download" size={16} className="mr-2"/> สำรองแจ้งเปิดงาน (CSV)</button>
            <button type="button" onClick={handleClearData} className="flex-none bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-red-100 transition shadow-sm"><Icon name="trash" size={16} className="mr-2"/> ล้างข้อมูล Firebase (Reset)</button>
          </div>
        </div>
      </div>
    );
  };

  const PReport = () => {
    const isY = rCfg.type === 'year'; const fS = isY ? rCfg.val.substring(0,4) : rCfg.val; const tS = getTStr();
    const pMap = {};
    (sets.projects||[]).forEach(p => { const name = getProjName(p); pMap[name.replace(/[\s\-]/g, '').toUpperCase()] = name; });
    const getStdName = (raw) => { const clean = String(raw || 'ไม่ระบุ').trim(); const norm = clean.replace(/[\s\-]/g, '').toUpperCase(); if (pMap[norm]) return pMap[norm]; pMap[norm] = clean; return clean; };

    if (rCfg.topic === 'inform') {
      const allPeriodInforms = informs.filter(j => {
        if(!j.date || !String(j.date||'').startsWith(fS)) return false;
        if(rCfg.area !== 'ทั้งหมด' && String(j.area||'').trim() !== rCfg.area) return false;
        const stdP = getStdName(j.project);
        if(rCfg.project !== 'ทั้งหมด' && stdP !== rCfg.project) return false;
        if(rCfg.staffName !== 'ทั้งหมด' && !checkStaffMatch(j.project, rCfg.staffName)) return false;
        return true;
      });

      const rI = allPeriodInforms.filter(j => j.status !== 'ยกเลิก');
      const rOp = rI.filter(j => j.status === 'เปิด Inform Job แล้ว');
      const rPd = rI.filter(j => j.status === 'รอดำเนินการ');

      const pStI = {}; 
      rI.forEach(j => { 
        const pName = getStdName(j.project);
        if(!pStI[pName]) pStI[pName] = { t:0, op:0, pd:0 }; 
        pStI[pName].t++; 
        if(j.status === 'เปิด Inform Job แล้ว') pStI[pName].op++; 
        else pStI[pName].pd++; 
      });

      return (
        <div id="print-area" className="hidden p-8 font-sans bg-white">
          <div className="text-center border-b-2 border-[#0f2e4a] pb-4 mb-6"><h1 className="text-2xl font-bold text-[#0f2e4a] uppercase">สรุปรายงานแจ้งเปิดงาน (Inform-Job)</h1><p className="text-sm text-gray-600 mt-2 font-bold">รอบ: {isY ? `ปี ${fS}` : `เดือน ${fS}`} | พื้นที่: {rCfg.area} | โครงการ: {rCfg.project}</p></div>
          <div className="flex gap-4 mb-8 print-break"><div className="flex-1 bg-gray-50 border p-4 rounded-lg text-center"><p className="text-xs text-gray-500 font-bold">แจ้งเปิดงานทั้งหมด</p><h2 className="text-2xl font-black">{rI.length}</h2></div><div className="flex-1 bg-green-50 border p-4 rounded-lg text-center"><p className="text-xs text-green-700 font-bold">เปิด Inform Job แล้ว</p><h2 className="text-2xl font-black text-green-700">{rOp.length}</h2></div><div className="flex-1 bg-yellow-50 border p-4 rounded-lg text-center"><p className="text-xs text-yellow-700 font-bold">รอดำเนินการ</p><h2 className="text-2xl font-black text-yellow-700">{rPd.length}</h2></div></div>
          
          <div className="mb-8 print-break"><h3 className="font-bold text-[#0f2e4a] mb-4 text-sm border-b pb-2">สัดส่วนแยกตามโครงการ</h3><div className="space-y-3">{Object.keys(pStI).map(p => { const s = pStI[p]; return (<div key={p} className="flex items-center text-xs"><div className="w-1/4 font-bold truncate pr-2">{p}</div><div className="w-2/4 bg-gray-200 h-5 rounded overflow-hidden flex">{s.t>0&&<div style={{width:`${(s.op/s.t)*100}%`}} className="bg-green-500 h-full"></div>}{s.t>0&&<div style={{width:`${(s.pd/s.t)*100}%`}} className="bg-yellow-400 h-full"></div>}</div><div className="w-1/4 pl-3 text-[10px] text-gray-500">รวม {s.t} (เปิด:{s.op}, รอ:{s.pd})</div></div>); })}</div><div className="flex gap-4 text-[10px] justify-center mt-4 font-bold"><div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-sm mr-1"></span>เปิด Inform Job แล้ว</div><div className="flex items-center"><span className="w-3 h-3 bg-yellow-400 rounded-sm mr-1"></span>รอดำเนินการ</div></div></div>

          <div className="print-break"><h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">รายการแจ้งเปิดงาน (Inform-Job)</h3><table className="w-full text-[11px] text-left border-collapse border"><thead><tr className="bg-gray-100"><th className="border p-2 w-[20%]">วันที่แจ้ง / เลขที่อ้างอิง</th><th className="border p-2">รายละเอียด / บริเวณ</th><th className="border p-2 w-[25%]">โครงการ / ผู้แจ้ง</th><th className="border p-2 w-[15%]">สถานะ</th></tr></thead><tbody>{rI.map(j=>(<tr key={j.id}><td className="border p-2 font-bold text-blue-700">{fDate(j.date)}<br/><span className="text-gray-600 font-normal">{j.informNo || j.id}</span></td><td className="border p-2"><div className="font-bold text-gray-800">{j.jobType}</div>{j.details}<br/><span className="text-gray-500 text-[10px]">บริเวณ: {j.location}</span></td><td className="border p-2">{getStdName(j.project)}<br/><span className="text-gray-500 text-[10px]">{j.requesterName}</span></td><td className={`border p-2 font-bold ${j.status==='เปิด Inform Job แล้ว'?'text-green-600':'text-yellow-600'}`}>{j.status}</td></tr>))}</tbody></table></div>
        </div>
      );
    }

    const allPeriodTasks = tasks.filter(t => {
      if(!t.startDate || !String(t.startDate||'').startsWith(fS)) return false;
      if(rCfg.area !== 'ทั้งหมด' && String(t.area||'').trim() !== rCfg.area) return false;
      const stdP = getStdName(t.project);
      if(rCfg.project !== 'ทั้งหมด' && stdP !== rCfg.project) return false;
      if(rCfg.staffName !== 'ทั้งหมด' && !checkStaffMatch(t.project, rCfg.staffName)) return false;
      return true;
    });

    const rT = allPeriodTasks.filter(t => t.status !== 'ยกเลิก');

    const rOd = rT.filter(t => t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า' || chkOvdTimeAware(t, tS));
    const rLateWo = rT.filter(t => t.lateWorkOrder === true);
    const rC = rT.filter(t => t.status?.startsWith('จบงาน') && !rOd.includes(t)); 
    const rO = rT.filter(t => !t.status?.startsWith('จบงาน') && !rOd.includes(t));
    
    const pSt = {}; 
    rT.forEach(t => { 
      const pName = getStdName(t.project);
      if(!pSt[pName]) pSt[pName] = { t:0, d:0, o:0, od:0 }; 
      pSt[pName].t++; 
      if(rOd.includes(t)) pSt[pName].od++; 
      else if(t.status?.startsWith('จบงาน')) pSt[pName].d++; 
      else pSt[pName].o++; 
    });
    
    const allC = tasks.filter(t => {
      if (!t.status?.startsWith('จบงาน')) return false;
      if (rCfg.area !== 'ทั้งหมด' && String(t.area||'').trim() !== rCfg.area) return false;
      if (rCfg.project !== 'ทั้งหมด' && getStdName(t.project) !== rCfg.project) return false;
      if (rCfg.staffName !== 'ทั้งหมด' && !checkStaffMatch(t.project, rCfg.staffName)) return false;
      return true;
    });

    const unbilledTasks = allC.filter(t => t.billingStatus !== 'ส่งเบิกแล้ว'); const ub = unbilledTasks.length; const b = allC.filter(t => t.billingStatus === 'ส่งเบิกแล้ว').length;
    const ubBreakdown = {}; unbilledTasks.forEach(t => { let m = "ไม่ระบุเดือน"; if (t.completedDate) m = String(t.completedDate||'').substring(0,7); else if (t.endDate) m = String(t.endDate||'').substring(0,7); if (!ubBreakdown[m]) ubBreakdown[m] = 0; ubBreakdown[m]++; });
    const sortedUbMonths = Object.keys(ubBreakdown).sort();

    return (
      <div id="print-area" className="hidden p-8 font-sans bg-white">
        <div className="text-center border-b-2 border-[#0f2e4a] pb-4 mb-6"><h1 className="text-2xl font-bold text-[#0f2e4a] uppercase">รายงานผลการดำเนินงาน LH Task-Flow</h1><p className="text-sm text-gray-600 mt-2 font-bold">รอบ: {isY ? `ปี ${fS}` : `เดือน ${fS}`} | พื้นที่: {rCfg.area} | โครงการ: {rCfg.project}</p></div>
        <div className="flex gap-4 mb-8 print-break"><div className="flex-1 bg-gray-50 border p-4 rounded-lg text-center"><p className="text-xs text-gray-500 font-bold">ปริมาณงานที่ได้รับ</p><h2 className="text-2xl font-black">{rT.length}</h2></div><div className="flex-1 bg-green-50 border p-4 rounded-lg text-center"><p className="text-xs text-green-700 font-bold">จบงาน(ในกำหนด)</p><h2 className="text-2xl font-black text-green-700">{rC.length}</h2></div><div className="flex-1 bg-yellow-50 border p-4 rounded-lg text-center"><p className="text-xs text-yellow-700 font-bold">ดำเนินการ</p><h2 className="text-2xl font-black text-yellow-700">{rO.length}</h2></div><div className="flex-1 bg-red-50 border p-4 rounded-lg text-center"><p className="text-xs text-red-700 font-bold">ล่าช้า/เกินกำหนด</p><h2 className="text-2xl font-black text-red-700">{rOd.length}</h2></div></div>
        <div className="mb-8 p-4 border rounded-lg bg-gray-50 print-break"><h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">สรุปส่งเบิก (เฉพาะงานที่จบแล้ว)</h3><div className="flex justify-between px-4 text-sm mb-2"><div><span className="font-bold text-green-600">ส่งเบิกแล้วทั้งหมดในระบบ:</span> {b} รายการ</div><div><span className="font-bold text-red-600">ค้างเบิก (สะสมทั้งหมด):</span> {ub} รายการ</div></div>{ub > 0 && (<div className="px-4 text-[11px] mt-3 border-t pt-3 text-gray-600 flex flex-wrap gap-2 items-center"><span className="font-bold text-gray-800">แจกแจงรายการค้างเบิกตามรอบเดือน:</span>{sortedUbMonths.map(m => (<span key={m} className="bg-white border border-gray-300 px-2 py-0.5 rounded shadow-sm text-red-600 font-bold">{m} : {ubBreakdown[m]} รายการ</span>))}</div>)}</div>
        <div className="mb-8 print-break"><h3 className="font-bold text-[#0f2e4a] mb-4 text-sm border-b pb-2">สถานะงานแยกตามโครงการ</h3><div className="space-y-3">{Object.keys(pSt).map(p => { const s = pSt[p]; return (<div key={p} className="flex items-center text-xs"><div className="w-1/4 font-bold truncate pr-2">{p}</div><div className="w-2/4 bg-gray-200 h-5 rounded overflow-hidden flex">{s.t>0&&<div style={{width:`${(s.d/s.t)*100}%`}} className="bg-green-500 h-full"></div>}{s.t>0&&<div style={{width:`${(s.o/s.t)*100}%`}} className="bg-yellow-400 h-full"></div>}{s.t>0&&<div style={{width:`${(s.od/s.t)*100}%`}} className="bg-red-500 h-full"></div>}</div><div className="w-1/4 pl-3 text-[10px] text-gray-500">รวม {s.t} (จบ:{s.d}, ทำ:{s.o}, ช้า:{s.od})</div></div>); })}</div><div className="flex gap-4 text-[10px] justify-center mt-4 font-bold"><div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-sm mr-1"></span>จบงาน(ในกำหนด)</div><div className="flex items-center"><span className="w-3 h-3 bg-yellow-400 rounded-sm mr-1"></span>กำลังดำเนินการ</div><div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-sm mr-1"></span>ล่าช้า/เกินกำหนด</div></div></div>
        <div className="print-break"><h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">งานล่าช้า/เกินกำหนด (รวมงานที่จบช้ากว่ากำหนด)</h3><table className="w-full text-[11px] text-left border-collapse border"><thead><tr className="bg-gray-100"><th className="border p-2">รหัสงาน</th><th className="border p-2">รายละเอียด</th><th className="border p-2">สถานะ</th><th className="border p-2">กำหนดเสร็จ</th></tr></thead><tbody>{rOd.map(t=>(<tr key={t.id}><td className="border p-2 font-bold text-blue-700">{t.workOrderNo || t.id}<br/><span className="text-gray-600 font-normal">{getStdName(t.project)}</span></td><td className="border p-2">{t.details}{t.overdueReason && <div className="mt-1 p-1 bg-red-50 text-red-600 border border-red-200 rounded"><strong>สาเหตุที่ช้า:</strong> {t.overdueReason}</div>}</td><td className="border p-2 text-red-600">{t.status}<br/><span className="text-[9px]">({t.overdueStatus || 'เกินกำหนด'})</span></td><td className="border p-2 text-red-600 font-bold">{fDate(t.endDate) || '-'}</td></tr>))}</tbody></table></div>
        {rLateWo.length > 0 && (
            <div className="print-break mt-6"><h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">งานที่ออกใบงานช้า (เลยกำหนด 3 วัน)</h3><table className="w-full text-[11px] text-left border-collapse border"><thead><tr className="bg-gray-100"><th className="border p-2">รหัสงาน / เลขที่ใบงาน</th><th className="border p-2">รายละเอียด</th><th className="border p-2">สถานะ</th><th className="border p-2">วันที่จบงาน/วันที่ออกใบงาน</th></tr></thead><tbody>{rLateWo.map(t=>(<tr key={t.id}><td className="border p-2 font-bold text-amber-700">{t.workOrderNo || t.id}<br/><span className="text-gray-600 font-normal">{getStdName(t.project)}</span></td><td className="border p-2">{t.details}</td><td className="border p-2 text-amber-700">{t.status}</td><td className="border p-2 text-amber-700 font-bold">จบ: {fDate(t.completedDate) || '-'}<br/><span className="text-red-500 font-normal">ออกใบงานล่าช้ากว่ากำหนด</span></td></tr>))}</tbody></table></div>
        )}
        {(() => {
          const rNoSla = rT.filter(t => t.slaCategory === 'งานทั่วไป (ไม่มี SLA)' || !t.slaCategory);
          if(rNoSla.length > 0) return (
            <div className="print-break mt-6"><h3 className="font-bold text-gray-500 mb-2 text-sm border-b pb-2">งานทั่วไป (ไม่มี SLA) <span className="font-normal text-xs text-red-500 ml-2">- สำหรับสุ่มตรวจสอบการลงงานหลีกเลี่ยง SLA</span></h3><table className="w-full text-[11px] text-left border-collapse border"><thead><tr className="bg-gray-100"><th className="border p-2">รหัสงาน</th><th className="border p-2">รายละเอียด</th><th className="border p-2">สถานะ</th><th className="border p-2">ผู้แจ้ง / โครงการ</th></tr></thead><tbody>{rNoSla.map(t=>(<tr key={t.id}><td className="border p-2 font-bold text-gray-600">{t.workOrderNo || t.id}</td><td className="border p-2">{t.details}</td><td className="border p-2 text-gray-500">{t.status}</td><td className="border p-2 text-gray-700">{t.requester}<br/><span className="text-gray-500 text-[10px]">{getStdName(t.project)}</span></td></tr>))}</tbody></table></div>
          );
          return null;
        })()}
      </div>
    );
  };

  return (
    <React.Fragment>
      <GlobalStyles />
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[99999] flex flex-col justify-center items-center text-[#0f2e4a]">
          <Icon name="loader2" size={40} className="animate-spin mb-4 text-[#bca374]" />
          <h2 className="text-lg font-bold">กำลังประมวลผล...</h2>
        </div>
      )}
      <div className="w-full min-h-screen">
        <div id="app-main" className="flex h-screen overflow-hidden text-slate-800 print:hidden">
          <aside className="w-64 bg-[#0f2e4a] text-white hidden md:flex flex-col shadow-xl z-20">
            <div className="p-6 border-b border-white/10"><div className="text-xl font-bold text-[#bca374]">LH <span className="font-light text-white">TaskFlow</span></div></div>
            <nav className="p-4 space-y-1 flex-1">
              {[{i:'dashboard',l:'แดชบอร์ด', icon:'layoutDashboard'},{i:'simulation',l:'กิลด์ (Simulation)', icon:'swords'},{i:'daily',l:'งานรายวัน', icon:'listTodo'},{i:'monthly',l:'ปฏิทิน', icon:'calendar'},{i:'kanban',l:'ส่งเบิก', icon:'fileText'},{i:'inform',l:'แจ้งเปิดงาน', icon:'bell'},{i:'team',l:'สถานะทีม', icon:'users'},{i:'settings',l:'ตั้งค่า', icon:'settings'}].map(x=>(
                <button type="button" key={x.i} onClick={()=>{setTab(x.i);if(x.i!=='settings')setSetUnlk(false);}} className={`w-full text-left flex items-center px-4 py-3 rounded-lg text-xs font-bold transition-colors ${tab===x.i?'bg-[#bca374]':'hover:bg-white/10'}`}><Icon name={x.icon} size={16} className="mr-2"/>{x.l}</button>
              ))}
            </nav>
          </aside>
          <main className="flex-1 flex flex-col min-w-0 bg-[#f4f6f8] relative">
            <header className="bg-white h-14 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm"><div className="font-bold text-[#0f2e4a] text-sm md:text-base">WORK CENTER</div><button type="button" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }} className="p-1.5 bg-gray-100 rounded text-gray-500 hover:text-[#0f2e4a]">{loading?<Icon name="loader2" size={16} className="animate-spin"/>:<Icon name="database" size={16}/>}</button></header>
            <GFBar />
            <div className="flex-1 overflow-auto p-4 md:p-6 relative">
              {tab==='dashboard'&&rDash()} 
              {tab==='simulation'&&<GuildSimulation tasks={tasks} sets={sets} setTab={setTab} />} 
              {tab==='daily'&&rDail()} 
              {tab==='monthly'&&rMont()} 
              {tab==='kanban'&&rKanb()} 
              {tab==='inform'&&rInf()} 
              {tab==='team'&&rTeam()} 
              {tab==='settings'&&rSet()}
            </div>
          </main>
          <nav className="md:hidden fixed bottom-0 w-full bg-white border-t flex justify-around p-2 z-[999]">
            {[{i:'dashboard',l:'ภาพรวม', icon:'layoutDashboard'},{i:'simulation',l:'กิลด์', icon:'swords'},{i:'daily',l:'รายวัน', icon:'listTodo'},{i:'monthly',l:'ปฏิทิน', icon:'calendar'},{i:'kanban',l:'ส่งเบิก', icon:'fileText'},{i:'inform',l:'แจ้งงาน', icon:'bell'},{i:'team',l:'ทีม', icon:'users'},{i:'settings',l:'ตั้งค่า', icon:'settings'}].map(x=>(
              <button type="button" key={x.i} onClick={()=>{setTab(x.i);if(x.i!=='settings')setSetUnlk(false);}} className={`flex flex-col items-center p-2 w-14 ${tab===x.i?'text-[#bca374] -translate-y-1':'text-gray-400'} transition-transform`}><Icon name={x.icon} size={20} className={tab===x.i?'fill-current/20':''} /><div className="text-[9px] font-bold mt-1 truncate w-full text-center">{x.l}</div></button>
            ))}
          </nav>

          {oPop.isOpen && <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" onClick={()=>setOPop({isOpen:false,tasks:[]})}><div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}><div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-red-600 flex items-center"><Icon name="alertTriangle" size={18} className="mr-2"/> งานล่าช้า/เกินกำหนด (ประจำเดือน {gFilt.month})</h3><button type="button" onClick={()=>setOPop({isOpen:false,tasks:[]})}><Icon name="x" size={18}/></button></div><div className="overflow-auto space-y-2 flex-1">{oPop.tasks.map(t=>(<div key={t.id} className="p-3 border border-red-100 bg-red-50/50 rounded-lg flex justify-between items-center"><div><div className="font-bold text-sm text-[#0f2e4a]">{t.project}</div><div className="text-xs text-gray-600">{t.details}</div><div className="text-[10px] text-red-500 mt-1 font-bold">ID: {t.id} | จบ: {fDate(t.endDate)} | สถานะ: {t.status}</div></div><button type="button" onClick={()=>{setOPop({isOpen:false,tasks:[]}); setGilt({...gFilt, date: t.endDate}); setTab('daily');}} className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded text-[10px] font-bold shadow-sm">จัดการ</button></div>))}</div></div></div>}
          
          {cPop.isOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" onClick={()=>setCPop({isOpen:false, date:null, tasks:[]})}>
              <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col animate-in" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="font-bold text-[#0f2e4a] flex items-center"><Icon name="calendar" size={18} className="mr-2 text-[#bca374]"/> งานประจำวันที่ {fDate(cPop.date)}</h3>
                  <button type="button" onClick={()=>setCPop({isOpen:false, date:null, tasks:[]})} className="text-gray-400 hover:text-gray-700"><Icon name="x" size={18}/></button>
                </div>
                <div className="overflow-auto space-y-2 flex-1 pr-1 hide-scrollbar">
                  {cPop.tasks.map(t => {
                    const isOvd = t.overdueStatus==='เกินกำหนด'||chkOvdTimeAware(t,getTStr());
                    return (
                    <div key={t.id} className="p-3 border border-blue-100 bg-blue-50/30 rounded-lg flex justify-between items-center hover:bg-blue-50 transition-colors">
                      <div>
                        <div className="font-bold text-sm text-[#0f2e4a]">{t.project}</div>
                        <div className="text-xs text-gray-600 line-clamp-1">{t.details}</div>
                        <div className="text-[10px] mt-1 font-bold">
                          <span className="text-gray-400">ID: {t.id}</span>
                          <span className="mx-1 text-gray-300">|</span>
                          <span className={t.status==='จบงาน'?'text-green-600':isOvd?'text-red-600':'text-amber-600'}>
                            สถานะ: {t.status} {(isOvd && t.status!=='จบงาน') ? '(เกินกำหนด)' : ''}
                          </span>
                        </div>
                      </div>
                      <button type="button" onClick={()=>{
                        setCPop({isOpen:false, date:null, tasks:[]});
                        setGilt({...gFilt, date: cPop.date});
                        setTab('daily');
                      }} className="bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded text-[10px] font-bold shadow-sm hover:bg-blue-100 whitespace-nowrap ml-2">
                        จัดการงาน
                      </button>
                    </div>
                  )})}
                </div>
              </div>
            </div>
          )}

          {bMod.isOpen && bMod.group && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] animate-in">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className={`p-4 flex justify-between text-white ${bMod.type==='ส่งเบิกแล้ว' ? 'bg-green-700' : 'bg-[#0f2e4a]'}`}>
                  <h3 className="font-bold flex items-center">
                    <Icon name="fileText" size={18} className="mr-2"/>
                    {bMod.group.isWO && bMod.group.woNo ? `รายละเอียดใบงาน: ${bMod.group.woNo}` : `รายละเอียด JOB: ${bMod.group.tasks[0].id}`}
                  </h3>
                  <button type="button" onClick={()=>setBMod({isOpen:false,group:null,type:''})}><Icon name="x" size={18}/></button>
                </div>
                
                <div className="p-5 overflow-y-auto flex-1 bg-gray-50/50">
                  <div className="mb-4">
                    <div className="text-sm text-gray-500 font-bold mb-1">โครงการ</div>
                    <div className="text-lg font-black text-[#0f2e4a]">{getStdProj(bMod.group.project)}</div>
                  </div>
                  
                  <div className="space-y-4">
                    {bMod.group.tasks.map((t, i) => {
                      const isCompleteOnTime = !t.overdueStatus || t.overdueStatus === 'ในกำหนด';
                      const isOpenedLate = t.lateWorkOrder || t.overdueStatus === 'ออกใบงานช้า';
                      return (
                        <div key={t.id} className="bg-white border rounded-lg p-4 shadow-sm relative">
                          <div className="absolute top-0 right-0 bg-gray-100 text-gray-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">#{i+1}</div>
                          
                          <div className="text-xs text-gray-400 mb-1">ID: {t.id}</div>
                          <div className="text-sm font-medium text-gray-800 mb-3">{t.details}</div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t pt-3 mt-3">
                            <div>
                              <div className="text-gray-500 mb-0.5">วันที่บันทึก</div>
                              <div className="font-bold">{fDate(t.receivedDate)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-0.5">กำหนดเสร็จ</div>
                              <div className="font-bold">{fDate(t.endDate)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-0.5">สถานะใบงาน</div>
                              <div className={`font-bold ${isOpenedLate ? 'text-red-600' : 'text-green-600'}`}>
                                {isOpenedLate ? 'ออกล่าช้า' : 'ปกติ'}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-0.5">สถานะจบงาน</div>
                              <div className={`font-bold flex items-center ${isCompleteOnTime ? 'text-green-600' : 'text-red-600'}`}>
                                {isCompleteOnTime ? <Icon name="checkCircle" size={14} className="mr-1"/> : <Icon name="alertCircle" size={14} className="mr-1"/>}
                                {isCompleteOnTime ? 'ในกำหนด' : 'ล่าช้า'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="p-4 bg-gray-100 border-t flex justify-end gap-3">
                  <button type="button" onClick={()=>setBMod({isOpen:false,group:null,type:''})} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50">ปิดหน้าต่าง</button>
                  {bMod.type === 'รอส่งเบิก' ? (
                    <button type="button" onClick={()=>{moveGroup(bMod.group.id, 'ส่งเบิกแล้ว'); setBMod({isOpen:false,group:null,type:''});}} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-md flex items-center hover:bg-green-700">
                      <Icon name="check" size={16} className="mr-2"/> ยืนยันการส่งเบิก (เดือน {gFilt.month})
                    </button>
                  ) : (
                    <button type="button" onClick={()=>{moveGroup(bMod.group.id, 'รอส่งเบิก'); setBMod({isOpen:false,group:null,type:''});}} className="px-6 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm font-bold shadow-sm flex items-center hover:bg-red-200">
                      <Icon name="rotateCcw" size={16} className="mr-2"/> ยกเลิกการส่งเบิก
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {tMod && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-[#0f2e4a] p-4 flex justify-between text-white">
                  <h3 className="font-bold">{eTask?'แก้ไข':'เพิ่ม'}งานประจำวัน</h3>
                  <button type="button" onClick={()=>{setTMod(false);setSReason('');setShowStartReason(false);}}><Icon name="x" size={18}/></button>
                </div>
                <form onSubmit={subT} className="p-5 space-y-3 max-h-[70vh] overflow-auto">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">วันที่รับเรื่อง (ห้ามแก้ไขย้อนหลัง)</label>
                    <input type="date" required value={taskForm.receivedDate} onChange={e=>setTaskForm({...taskForm, receivedDate: e.target.value})} disabled={!!eTask} className="w-full border rounded p-2 text-sm bg-gray-50" />
                  </div>
                  <textarea required value={taskForm.details} onChange={e=>setTaskForm({...taskForm, details: e.target.value})} rows="2" placeholder="รายละเอียดงาน..." className="w-full border rounded p-2 text-sm outline-none"></textarea>
                  
                  <div className="flex gap-2">
                    <select required value={taskForm.requester} onChange={e=>setTaskForm({...taskForm, requester: e.target.value})} className="w-1/2 border rounded p-2 text-sm">
                        <option value="">ผู้แจ้ง...</option>{REQ_TYPES.map(r=><option key={r}>{r}</option>)}
                    </select>
                    <select value={taskForm.slaCategory} onChange={e=>setTaskForm({...taskForm, slaCategory: e.target.value})} className="w-1/2 border rounded p-2 text-sm">
                        <option value="">--- กรุณาเลือกหมวด SLA ---</option>
                        <option value="งานทั่วไป (ไม่มี SLA)">งานทั่วไป (ไม่มี SLA)</option>
                        {(sets.slas||[]).map(s=><option key={s} value={getProjName(s)}>{getProjName(s)} ({getProjArea(s)} วัน)</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 mb-1 block">เจ้าหน้าที่ดูแลโครงการ (ตัวกรองโครงการ)</label>
                    <select value={taskForm.staffName} onChange={e=>setTaskForm({...taskForm, staffName: e.target.value, project: '', area: ''})} className="w-full border rounded p-2 text-sm bg-blue-50">
                        <option value="">ทุกเจ้าหน้าที่ (ไม่กรอง)</option>
                        {Array.from(new Set((sets.emails||[]).map(e => e.split('|')[2] || e.split('|')[0].split('@')[0]))).filter(Boolean).map(n=><option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <select required value={taskForm.project} onChange={(e)=>{ const p = (sets.projects||[]).find(x=>getProjName(x)===e.target.value); setTaskForm({...taskForm, project: e.target.value, area: getProjArea(p)}); }} className="w-2/3 border rounded p-2 text-sm">
                        <option value="">โครงการ (เลือกเพื่อดึงพื้นที่)...</option>
                        {(sets.projects||[]).filter(p => !taskForm.staffName || checkStaffMatch(getProjName(p), taskForm.staffName)).map(p=><option key={p} value={getProjName(p)}>{getProjName(p)}</option>)}
                    </select>
                    <input type="text" readOnly value={taskForm.area} placeholder="พื้นที่..." className="w-1/3 border rounded p-2 text-sm bg-gray-100" />
                  </div>

                  <div className="flex gap-2">
                    <div className="w-1/2">
                        <label className="text-[10px] font-bold">เริ่มงาน</label>
                        <input type="date" required value={taskForm.startDate} onChange={(e)=>{ setTaskForm({...taskForm, startDate: e.target.value}); if(eTask) setShowStartReason(e.target.value !== eTask.startDate); }} className="w-full border rounded p-2 text-sm" />
                    </div>
                    <div className="w-1/2">
                        <label className="text-[10px] font-bold">กำหนดเสร็จ</label>
                        <input type="date" required value={taskForm.endDate} onChange={e=>setTaskForm({...taskForm, endDate: e.target.value})} className="w-full border rounded p-2 text-sm" />
                    </div>
                  </div>
                  
                  {showStartReason && (
                    <div className="mt-2 animate-in"><label className="text-[10px] font-bold text-red-500">เหตุผลที่เลื่อนวันเริ่ม (บังคับ) *</label><textarea required value={sRsn} onChange={e=>setSReason(e.target.value)} rows="2" className="w-full border border-red-300 rounded p-2 text-sm outline-none bg-red-50"></textarea></div>
                  )}
                  <div className="text-right mt-4 flex gap-2">
                    <button type="button" onClick={()=>{setTMod(false);setSReason('');setShowStartReason(false);}} className="bg-gray-200 px-4 py-2 rounded text-sm font-bold flex-1">ยกเลิก</button>
                    <button type="submit" disabled={showStartReason && !sRsn.trim()} className="bg-[#0f2e4a] text-white px-4 py-2 rounded text-sm font-bold flex-1 disabled:opacity-50">บันทึก</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {sMod.isOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                <h3 className={`font-bold text-lg mb-3 ${sMod.type==='cancel'?'text-red-500':sMod.type==='postpone'?'text-amber-500':'text-green-500'}`}>
                  {sMod.type==='cancel'?'ยกเลิกงาน':sMod.type==='postpone'?'เลื่อนวันจบงาน':'ยืนยันจบงาน'}
                </h3>
                <div className="space-y-3">
                  {sMod.type==='cancel' && (
                    <div>
                      <label className="text-xs font-bold text-red-500">เหตุผลบังคับ *</label>
                      <textarea rows="2" className="w-full border rounded p-2 text-sm resize-none bg-red-50" value={sMod.reason} onChange={e=>setSMod({...sMod,reason:e.target.value})}></textarea>
                    </div>
                  )}
                  {sMod.type==='postpone' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-amber-600">วันที่ขอเลื่อนไป *</label>
                        <input type="date" className="w-full border rounded p-2 text-sm bg-amber-50" value={sMod.postponeDate} onChange={e=>setSMod({...sMod,postponeDate:e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-amber-600">เหตุผลที่ขอเลื่อน *</label>
                        <textarea rows="2" className="w-full border rounded p-2 text-sm resize-none bg-amber-50" placeholder="ระบุเหตุผล..." value={sMod.reason} onChange={e=>setSMod({...sMod,reason:e.target.value})}></textarea>
                      </div>
                    </div>
                  )}
                  {sMod.type==='complete' && (
                    <div className="space-y-3">
                      {sMod.isOverdue && (
                        <div>
                          <label className="text-xs font-bold text-red-500">สาเหตุที่จบงานช้ากว่ากำหนด (บังคับ) *</label>
                          <textarea rows="2" className="w-full border rounded p-2 text-sm resize-none bg-red-50" placeholder="ระบุเหตุผลที่งานล่าช้า..." value={sMod.overdueReason} onChange={e=>setSMod({...sMod,overdueReason:e.target.value})}></textarea>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold text-green-700">เลขที่ใบงาน (บังคับ: อักษร 2 ตัว-เลข 3 ตัว-เลข 7 ตัว) *</label>
                        <input type="text" placeholder="ตัวอย่าง: LH-123-1234567" disabled={sMod.noWO} className={`w-full border rounded p-2 text-sm uppercase ${sMod.noWO ? 'bg-gray-100 border-gray-300 text-gray-400' : 'bg-green-50 border-green-300'}`} value={sMod.workOrderNo} onChange={e=>setSMod({...sMod,workOrderNo:e.target.value.toUpperCase()})} />
                        
                        {!sMod.forceWO && (
                          <label className="flex items-start mt-3 text-xs text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer">
                            <input type="checkbox" checked={sMod.noWO} onChange={e => setSMod({...sMod, noWO: e.target.checked, workOrderNo: ''})} className="mt-0.5 mr-2 accent-[#0f2e4a]" />
                            <span>ขอจบงานโดยยังไม่ใส่เลขที่ใบงาน<br/><span className="text-red-500 font-bold text-[10px]">(ต้องกลับมาใส่ภายใน 3 วัน ไม่เช่นนั้นระบบจะประทับตรา "ออกใบงานช้า")</span></span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={()=>setSMod({...sMod, isOpen:false, noWO:false, forceWO:false, isOverdue:false, overdueReason:'', postponeDate: getTStr()})} className="flex-1 bg-gray-100 p-2 text-xs font-bold rounded">ปิด</button>
                  <button type="button" onClick={cfSt} disabled={((sMod.type==='cancel'||sMod.type==='postpone')&&!sMod.reason.trim()) || (sMod.type==='complete' && !sMod.noWO && !sMod.workOrderNo.trim()) || (sMod.type==='complete' && sMod.isOverdue && !sMod.overdueReason.trim())} className="flex-1 bg-[#0f2e4a] text-white p-2 text-xs font-bold rounded disabled:opacity-50 shadow-sm active:scale-95 transition-all">ยืนยัน</button>
                </div>
              </div>
            </div>
          )}
          
          {infView && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" onClick={()=>setInfView(null)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in" onClick={e=>e.stopPropagation()}>
                <div className="bg-[#0f2e4a] p-4 flex justify-between text-white">
                  <h3 className="font-bold flex items-center"><Icon name="search" size={16} className="mr-2"/> รายละเอียดรับแจ้ง</h3>
                  <button type="button" onClick={()=>setInfView(null)}><Icon name="x" size={18}/></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs border-b pb-3">
                    <div><span className="text-gray-400 font-bold">วันที่แจ้ง</span><br/><span className="font-bold text-gray-800">{fDate(infView.date)}</span></div>
                    <div><span className="text-gray-400 font-bold">รหัสอ้างอิง</span><br/><span className="font-bold text-gray-800">{infView.id}</span></div>
                    <div><span className="text-gray-400 font-bold">ผู้แจ้ง</span><br/><span className="font-bold text-gray-800">{infView.requesterName}</span></div>
                    <div><span className="text-gray-400 font-bold">เบอร์ติดต่อ</span><br/><span className="font-bold text-gray-800">{infView.phone||'-'}</span></div>
                    <div><span className="text-gray-400 font-bold">โครงการ</span><br/><span className="font-bold text-[#bca374]">{infView.project}</span></div>
                    <div><span className="text-gray-400 font-bold">พื้นที่</span><br/><span className="font-bold text-gray-800">{infView.area}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                    <div><span className="text-gray-400 font-bold">ประเภทงาน</span><br/><span className="font-bold text-[#0f2e4a]">{infView.jobType||'-'}</span></div>
                    <div><span className="text-gray-400 font-bold">บริเวณ</span><br/><span className="font-bold text-[#0f2e4a]">{infView.location||'-'}</span></div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border text-sm shadow-inner">
                    <span className="text-gray-500 font-bold text-xs mb-1 block">รายละเอียด:</span>
                    <div className="whitespace-pre-wrap text-gray-700">{infView.details || '-'}</div>
                  </div>
                  <div className="text-right pt-2">
                    <button type="button" onClick={()=>setInfView(null)} className="bg-gray-200 px-6 py-2 rounded-lg text-sm font-bold w-full hover:bg-gray-300 transition">ปิดหน้าต่าง</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {iMod.isOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm">
                <h3 className={`font-bold mb-3 ${iMod.type==='cancel'?'text-red-500':'text-green-500'}`}>
                  {iMod.type==='cancel'?'ยกเลิกแจ้งงาน':'เปิดงาน'}
                </h3>
                {iMod.type==='open' ? (
                  <input placeholder="เลข Inform..." className="w-full border rounded p-2 text-sm uppercase" value={iMod.val} onChange={e=>setIMod({...iMod,val:e.target.value})}/>
                ) : (
                  <textarea placeholder="เหตุผล..." className="w-full border rounded p-2 text-sm resize-none" value={iMod.val} onChange={e=>setIMod({...iMod,val:e.target.value})}></textarea>
                )}
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={()=>setIMod({...iMod,isOpen:false})} className="flex-1 bg-gray-100 p-2 text-xs rounded font-bold">ปิด</button>
                  <button type="button" onClick={cfInf} disabled={!iMod.val.trim()} className="flex-1 bg-[#0f2e4a] text-white p-2 text-xs rounded font-bold disabled:opacity-50">ยืนยัน</button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* เพิ่มโค้ดบรรทัดนี้ เพื่อวาง Report ซ่อนไว้สำหรับให้ดึงไปพิมพ์ PDF */}
        {PReport()}
        
        {cropModal.isOpen && (
          <div className="fixed inset-0 bg-black/90 z-[100000] flex flex-col">
            <div className="flex justify-between items-center p-4 bg-[#0f2e4a] text-white shadow-md z-10">
              <h3 className="font-bold">ครอบตัดรูปโปรไฟล์</h3>
              <button type="button" onClick={() => setCropModal({ ...cropModal, isOpen: false })} className="p-2 hover:bg-white/10 rounded-lg"><Icon name="x" size={24} /></button>
            </div>
            <div className="flex-1 relative bg-black">
              <Cropper
                image={cropModal.imageSrc}
                crop={cropModal.crop}
                zoom={cropModal.zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={(crop) => setCropModal(prev => ({ ...prev, crop }))}
                onCropComplete={onCropComplete}
                onZoomChange={(zoom) => setCropModal(prev => ({ ...prev, zoom }))}
              />
            </div>
            <div className="p-6 bg-white flex flex-col gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.2)] z-10">
              <div className="flex items-center gap-4">
                <Icon name="zoomOut" size={20} className="text-gray-400" />
                <input type="range" min={1} max={3} step={0.1} value={cropModal.zoom} onChange={(e) => setCropModal(prev => ({ ...prev, zoom: Number(e.target.value) }))} className="flex-1 accent-[#0f2e4a]" />
                <Icon name="zoomIn" size={20} className="text-gray-400" />
              </div>
              <button type="button" onClick={saveCroppedImage} className="w-full bg-[#0f2e4a] text-white py-3 rounded-xl font-bold text-lg hover:bg-[#1a3f63] shadow-lg transition-transform active:scale-95">ยืนยันรูปโปรไฟล์</button>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
