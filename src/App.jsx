import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import Cropper from 'react-easy-crop';
import * as XLSX from 'xlsx';
import GuildSimulation from './GuildSimulation.jsx';
import ClassEmblem from './ClassEmblem.jsx';
import AssessmentModal from './AssessmentModal.jsx';
import archetypesData from './data/archetypes.json';
import RadarChart from './components/charts/RadarChart.jsx';
import SimplePieChart from './components/charts/SimplePieChart.jsx';
import DashboardTab from './pages/DashboardTab.jsx';
import DailyTasksTab from './pages/DailyTasksTab.jsx';
import MonthlyCalendarTab from './pages/MonthlyCalendarTab.jsx';
import KanbanBillingTab from './pages/KanbanBillingTab.jsx';
import InformJobTab from './pages/InformJobTab.jsx';
import TeamStatusTab from './pages/TeamStatusTab.jsx';
import SettingsTab from './pages/SettingsTab.jsx';
import OverdueTasksModal from './components/modals/OverdueTasksModal.jsx';
import CalendarTasksModal from './components/modals/CalendarTasksModal.jsx';
import BillingModal from './components/modals/BillingModal.jsx';
import PrintReport from './components/reports/PrintReport.jsx';

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
const POTENTIAL_IDENTITY_MAP = {};
archetypesData.forEach(a => {
   POTENTIAL_IDENTITY_MAP[a.key] = a.identity;
});
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
      const POTENTIAL_IDENTITY_MAP = {};
archetypesData.forEach(a => {
   POTENTIAL_IDENTITY_MAP[a.key] = a.identity;
});
      return POTENTIAL_IDENTITY_MAP[topKeys.join('_')] || '-';
  };

const Icon = ({ name, size = 24, color = "currentColor", className = "" }) => {
  const iconName = Object.keys(LucideIcons).find(k => k.toLowerCase() === name.toLowerCase().replace(/[-_]/g, ''));
  const Comp = LucideIcons[iconName] || LucideIcons.CircleCheck;
  return <Comp size={size} color={color} className={className} />;
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
  const [assessMode, setAssessMode] = useState(false);

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
            nT.emailAlert = { action: 'ขอเลื่อนวันจบงาน', reason: sMod.reason, emails: getTargetEms(t.project), project: t.project, details: `รายละเอียดงาน: ${t.details}\nวันที่เริ่มเดิม: ${fDate(t.startDate)}\nวันที่จบเดิม: ${fDate(t.endDate)}\nวันที่ขอเลื่อนไป: ${fDate(sMod.postponeDate)}` }; 
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


  const saveCroppedImage = () => {
    if (!cropModal.imageSrc || !cropModal.croppedAreaPixels) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 500;
      canvas.width = MAX_SIZE;
      canvas.height = MAX_SIZE;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cropModal.croppedAreaPixels.x, cropModal.croppedAreaPixels.y, cropModal.croppedAreaPixels.width, cropModal.croppedAreaPixels.height, 0, 0, MAX_SIZE, MAX_SIZE);
      setTeamForm({ ...teamForm, image: canvas.toDataURL('image/webp', 0.85) });
      setCropModal({ isOpen: false, imageSrc: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null });
    };
    img.src = cropModal.imageSrc;
  };

  const saveTeam = () => {
    if (!teamForm.name) return alert('กรุณาระบุชื่อพนักงาน');
    let ns = [...(sets.staffStats || [])];
    if (teamForm.id) {
      const idx = ns.findIndex(x => x.id === teamForm.id);
      if (idx > -1) ns[idx] = { ...teamForm };
    } else {
      ns.push({ ...teamForm, id: Date.now().toString() });
    }
    const newSets = { ...sets, staffStats: ns };
    setSets(newSets);
    saveD('settings', newSets);
    setSelTeam({ ...teamForm });
    setTeamEditMode(false);
  };

  const deleteTask = async (t) => {
    const pwd = prompt('กรุณาใส่รหัสผ่านเพื่อลบข้อมูล:');
    if (pwd !== '131236') return alert('รหัสผ่านไม่ถูกต้อง!');
    if (confirm('ต้องการลบงานนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถกู้คืนได้')) {
      try {
        fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ type: 'deleteTask', data: { id: t.id } })
        }).catch(() => {});
        await deleteDoc(getDocRef('Tasks', t.id));
      } catch (e) {
        alert('ลบข้อมูลไม่สำเร็จ: ' + e.message);
      }
    }
  };

  const deleteInform = async (j) => {
    if (confirm('ต้องการลบรายการนี้?')) {
      try {
        await deleteDoc(getDocRef('InformJobs', j.id));
      } catch (e) {
        alert('ลบข้อมูลไม่สำเร็จ: ' + e.message);
      }
    }
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
              {tab === 'dashboard' && (
                <DashboardTab
                  tasks={tasks}
                  gFilt={gFilt}
                  THEME={THEME}
                  getTStr={getTStr}
                  getStdProj={getStdProj}
                  checkStaffMatch={checkStaffMatch}
                  chkOvdTimeAware={chkOvdTimeAware}
                  onOpenOverdueModal={(ov) => setOPop({ isOpen: true, tasks: ov })}
                  Icon={Icon}
                />
              )}
              {tab === 'simulation' && (
                <GuildSimulation tasks={tasks} sets={sets} setTab={setTab} db={db} />
              )}
              {tab === 'daily' && (
                <DailyTasksTab
                  tasks={tasks}
                  gFilt={gFilt}
                  getTStr={getTStr}
                  getStdProj={getStdProj}
                  checkStaffMatch={checkStaffMatch}
                  chkOvdTimeAware={chkOvdTimeAware}
                  fDate={fDate}
                  openTaskModal={openTaskModal}
                  initSt={initSt}
                  deleteTask={deleteTask}
                  Icon={Icon}
                />
              )}
              {tab === 'monthly' && (
                <MonthlyCalendarTab
                  tasks={tasks}
                  gFilt={gFilt}
                  getTStr={getTStr}
                  getStdProj={getStdProj}
                  checkStaffMatch={checkStaffMatch}
                  pYMD={pYMD}
                  onOpenCalendarModal={(date, tasks) => setCPop({ isOpen: true, date, tasks })}
                  Icon={Icon}
                />
              )}
              {tab === 'kanban' && (
                <KanbanBillingTab
                  tasks={tasks}
                  gFilt={gFilt}
                  groupTasks={groupTasks}
                  getStdProj={getStdProj}
                  checkStaffMatch={checkStaffMatch}
                  onOpenBillingModal={(group, type) => setBMod({ isOpen: true, group, type })}
                  Icon={Icon}
                />
              )}
              {tab === 'inform' && (
                <InformJobTab
                  informs={informs}
                  iTab={iTab}
                  setITab={setITab}
                  informForm={informForm}
                  setInformForm={setInformForm}
                  subInf={subInf}
                  gFilt={gFilt}
                  sets={sets}
                  getProjName={getProjName}
                  getProjArea={getProjArea}
                  getStdProj={getStdProj}
                  checkStaffMatch={checkStaffMatch}
                  fDate={fDate}
                  openInfModal={(id, type) => setIMod({ isOpen: true, type, id, val: '' })}
                  setInfView={setInfView}
                  deleteInform={deleteInform}
                  Icon={Icon}
                />
              )}
              {tab === 'team' && (
                <TeamStatusTab
                  teamUnlk={teamUnlk}
                  setTeamUnlk={setTeamUnlk}
                  pwd={pwd}
                  setPwd={setPwd}
                  sets={sets}
                  setSets={setSets}
                  saveD={saveD}
                  teamForm={teamForm}
                  setTeamForm={setTeamForm}
                  selTeam={selTeam}
                  setSelTeam={setSelTeam}
                  teamEditMode={teamEditMode}
                  setTeamEditMode={setTeamEditMode}
                  setCropModal={setCropModal}
                  saveTeam={saveTeam}
                  Icon={Icon}
                />
              )}
              {tab === 'settings' && (
                <SettingsTab
                  setUnlk={setUnlk}
                  setSetUnlk={setSetUnlk}
                  pwd={pwd}
                  setPwd={setPwd}
                  tasks={tasks}
                  informs={informs}
                  sets={sets}
                  setSets={setSets}
                  saveD={saveD}
                  rCfg={rCfg}
                  setRConfig={setRConfig}
                  sInp={sInp}
                  setSInp={setSInp}
                  upS={upS}
                  dlS={dlS}
                  clearSList={clearSList}
                  getProjName={getProjName}
                  getProjArea={getProjArea}
                  testEmailSystem={testEmailSystem}
                  forceScanRealTasks={forceScanRealTasks}
                  installTrigger={installTrigger}
                  runMigration={runMigration}
                  downloadCSV={downloadCSV}
                  handleClearData={handleClearData}
                  getTStr={getTStr}
                  Icon={Icon}
                />
              )}
            </div>
          </main>
          <nav className="md:hidden fixed bottom-0 w-full bg-white border-t flex justify-around p-2 z-[999]">
            {[{i:'dashboard',l:'ภาพรวม', icon:'layoutDashboard'},{i:'simulation',l:'กิลด์', icon:'swords'},{i:'daily',l:'รายวัน', icon:'listTodo'},{i:'monthly',l:'ปฏิทิน', icon:'calendar'},{i:'kanban',l:'ส่งเบิก', icon:'fileText'},{i:'inform',l:'แจ้งงาน', icon:'bell'},{i:'team',l:'ทีม', icon:'users'},{i:'settings',l:'ตั้งค่า', icon:'settings'}].map(x=>(
              <button type="button" key={x.i} onClick={()=>{setTab(x.i);if(x.i!=='settings')setSetUnlk(false);}} className={`flex flex-col items-center p-2 w-14 ${tab===x.i?'text-[#bca374] -translate-y-1':'text-gray-400'} transition-transform`}><Icon name={x.icon} size={20} className={tab===x.i?'fill-current/20':''} /><div className="text-[9px] font-bold mt-1 truncate w-full text-center">{x.l}</div></button>
            ))}
          </nav>

          <OverdueTasksModal
            isOpen={oPop.isOpen}
            onClose={() => setOPop({ isOpen: false, tasks: [] })}
            tasks={oPop.tasks}
            currentMonth={gFilt.month}
            onManageTask={(t) => {
              setOPop({ isOpen: false, tasks: [] });
              setGilt({ ...gFilt, date: t.endDate });
              setTab('daily');
            }}
            fDate={fDate}
            Icon={Icon}
          />

          <CalendarTasksModal
            isOpen={cPop.isOpen}
            onClose={() => setCPop({ isOpen: false, date: null, tasks: [] })}
            date={cPop.date}
            tasks={cPop.tasks}
            onManageDate={(date) => {
              setCPop({ isOpen: false, date: null, tasks: [] });
              setGilt({ ...gFilt, date });
              setTab('daily');
            }}
            fDate={fDate}
            chkOvdTimeAware={chkOvdTimeAware}
            getTStr={getTStr}
            Icon={Icon}
          />

          <BillingModal
            isOpen={bMod.isOpen}
            onClose={() => setBMod({ isOpen: false, group: null, type: '' })}
            group={bMod.group}
            type={bMod.type}
            onMoveGroup={moveGroup}
            currentMonth={gFilt.month}
            getStdProj={getStdProj}
            fDate={fDate}
            Icon={Icon}
          />
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
        <PrintReport
          rCfg={rCfg}
          tasks={tasks}
          informs={informs}
          sets={sets}
          getTStr={getTStr}
          getProjName={getProjName}
          checkStaffMatch={checkStaffMatch}
          chkOvdTimeAware={chkOvdTimeAware}
          fDate={fDate}
        />
        
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



