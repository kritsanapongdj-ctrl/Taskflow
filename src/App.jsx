import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

const API_URL = "https://script.google.com/macros/s/AKfycbxrAOQLMQ3l3PcB800hUeMly_oi-jL4s8ZjlWncuCx9seMqSHMeZb0D9CxjyKpOZuaEmw/exec";

const customFirebaseConfig = {
  apiKey: "AIzaSyB6KvZWr8b2dXHxysIqXwk-SsdiuVNYv94",
  authDomain: "taskflow-plus-3fce7.firebaseapp.com",
  projectId: "taskflow-plus-3fce7",
  storageBucket: "taskflow-plus-3fce7.firebasestorage.app",
  messagingSenderId: "829369182338",
  appId: "1:829369182338:web:5c6c326a6dcb1a7a6e2c9b"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : customFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const getColRef = (colName) => typeof __app_id !== 'undefined' ? collection(db, 'artifacts', __app_id, 'public', 'data', colName) : collection(db, colName);
const getDocRef = (colName, docId) => typeof __app_id !== 'undefined' ? doc(db, 'artifacts', __app_id, 'public', 'data', colName, String(docId)) : doc(db, colName, String(docId));

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
    * { font-family: 'Prompt', sans-serif; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .animate-in { animation: fadeIn 0.2s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    @media print { body { background-color: white !important; -webkit-print-color-adjust: exact; } #app-main { display: none !important; } #print-area { display: block !important; padding: 20px; } @page { margin: 10mm; size: A4 portrait; } .print-break { page-break-inside: avoid; } }
  `}</style>
);

const REQ_TYPES = ['SVC', 'ICSC', 'จนท./ผจก.LH', 'ผู้ควบคุมงาน', 'CEM'];
const THEME = { primary: '#0f2e4a', secondary: '#bca374', danger: '#dc3545', success: '#28a745' };

const Icon = ({ name, size = 24, color = "currentColor", className = "" }) => {
  const iconName = Object.keys(LucideIcons).find(k => k.toLowerCase() === name.toLowerCase().replace(/[-_]/g, ''));
  const Comp = LucideIcons[iconName] || LucideIcons.CircleCheck;
  return <Comp size={size} color={color} className={className} />;
};

const getCleanVal = (r, keys) => { for(let k in r){ const cln = String(k).replace(/[\s\(\)\[\]\-]/g, '').toLowerCase(); for(let key of keys) if(cln === String(key).replace(/[\s\(\)\[\]\-]/g, '').toLowerCase() && r[k] !== undefined && r[k] !== '') return r[k]; } return null; };
const getTStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const getMStr = () => getTStr().slice(0, 7);
const fDate = (ds) => { if (!ds) return ''; const d = new Date(ds); return isNaN(d.getTime()) ? String(ds) : d.toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' }); };
const pYMD = (v) => { if(!v) return ''; const d = new Date(v); return isNaN(d.getTime()) ? String(v).trim().substring(0,10) : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const parseTimeForInput = (timeStr) => { if (!timeStr) return "17:30"; const m = String(timeStr).match(/^(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : "17:30"; };
const downloadCSV = (data, fn) => { if(!data || !data.length) return alert('ไม่มีข้อมูล'); const keys = Object.keys(data[0]); const csv = [ keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k]||'').replace(/"/g, '""')}"`).join(',')) ].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fn; link.click(); };

const SimplePieChart = ({ data, title }) => {
  let cP = 0; const t = data.reduce((s, i) => s + i.value, 0); const getC = (p) => [Math.cos(2*Math.PI*p), Math.sin(2*Math.PI*p)];
  return (<div className="flex flex-col items-center w-full"><h3 className="text-sm font-bold mb-4 text-[#0f2e4a]">{title}</h3>{t === 0 ? <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center text-xs text-gray-400">ไม่มีข้อมูล</div> : <svg viewBox="-1 -1 2 2" className="w-32 h-32 -rotate-90">{data.map((s, i) => { if(s.value===0) return null; const [sX, sY] = getC(cP); cP += s.value/t; const [eX, eY] = getC(cP); if(s.value===t) return <circle key={i} cx="0" cy="0" r="1" fill={s.color} />; return <path key={i} d={`M ${sX} ${sY} A 1 1 0 ${s.value/t>0.5?1:0} 1 ${eX} ${eY} L 0 0`} fill={s.color}><title>{s.name}: {s.value}</title></path>; })}<circle cx="0" cy="0" r="0.6" fill="white" /></svg>}<div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">{data.map((item, i)=><div key={i} className="flex items-center"><span className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: item.color}}></span>{item.name} ({item.value})</div>)}</div></div>);
};

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  const [tasks, setTasks] = useState([]);
  const [informs, setInforms] = useState([]);
  const [sets, setSets] = useState({ areas: [], projects: [], jobTypes: [], locations: [], emails: [], slas: [], overdueTime: '17:30', lateWorkOrderHours: 24 });
  
  const [gFilt, setGilt] = useState({ area: 'ทั้งหมด', project: 'ทั้งหมด', month: getMStr(), status: 'ทั้งหมด', date: getTStr() });
  const [setUnlk, setSetUnlk] = useState(false);
  const [pwd, setPwd] = useState('');
  const [sInp, setSInp] = useState({ jobTypes: '', locations: '', areas: '', projects: '', emails: '', projArea: '', emProj: 'ทั้งหมด', slas: '', slaDays: '' });
  const [iTab, setITab] = useState('form');
  const [iMod, setIMod] = useState({ isOpen: false, type: '', id: null, val: '' });
  const [infView, setInfView] = useState(null); 
  const [tMod, setTMod] = useState(false);
  const [eTask, setETask] = useState(null);
  const [sRsn, setSReason] = useState('');
  const [showStartReason, setShowStartReason] = useState(false);
  const [sMod, setSMod] = useState({ isOpen: false, taskId: null, type: '', reason: '', workOrderNo: '' });
  const [cPop, setCPop] = useState({ isOpen: false, date: null, tasks: [] });
  const [oPop, setOPop] = useState({ isOpen: false, type: 'daily' });
  const [rCfg, setRConfig] = useState({ type: 'month', val: getMStr(), area: 'ทั้งหมด', project: 'ทั้งหมด' });

  useEffect(() => {
    const initAuth = async () => { try { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); else await signInAnonymously(auth); } catch (e) {} };
    initAuth(); const unsubscribe = onAuthStateChanged(auth, setUser); return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return; setLoading(true);
    const unsubTasks = onSnapshot(getColRef('Tasks'), (snap) => { const arr = []; snap.forEach(d => arr.push(d.data())); setTasks(arr); }, () => setLoading(false));
    const unsubInfs = onSnapshot(getColRef('InformJobs'), (snap) => { const arr = []; snap.forEach(d => arr.push(d.data())); setInforms(arr); }, () => setLoading(false));
    const unsubSets = onSnapshot(getDocRef('Settings', 'main'), (doc) => { if (doc.exists()) setSets(doc.data()); setLoading(false); }, () => { setLoading(false); });
    return () => { unsubTasks(); unsubInfs(); unsubSets(); };
  }, [user]);

  const saveD = async (t, d) => {
    if (!user) return;
    try {
      if (t === 'task') await setDoc(getDocRef('Tasks', d.id), d); else if (t === 'informJob') await setDoc(getDocRef('InformJobs', d.id), d); else if (t === 'settings') await setDoc(getDocRef('Settings', 'main'), d);
      fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: t, data: d }) }).catch(()=>{});
    } catch (e) {}
  };

  const getProjName = (str) => str ? String(str).split('|')[0] : '';
  const getProjArea = (str) => str ? String(str).split('|')[1] || '' : '';
  const getTargetEms = (projName) => sets.emails.filter(e => { const p = e.split('|'); if(p.length < 2) return true; const pjList = p[1].split(','); return pjList.includes('ทั้งหมด') || pjList.includes(projName); }).map(e => e.split('|')[0]);

  const getStdProj = (raw) => {
    if(!raw) return "ไม่ระบุ";
    const clean = String(raw).replace(/[\s\-]/g, '').toLowerCase();
    const found = sets.projects.find(p => getProjName(p).replace(/[\s\-]/g, '').toLowerCase() === clean);
    return found ? getProjName(found) : String(raw).trim();
  };

  const chkOvdTimeAware = (t, rD = getTStr()) => { 
    if (!t.endDate || t.status === 'ยกเลิก') return false; 
    if (t.status === 'จบงาน') return t.completedDate > t.endDate; 
    if (rD > t.endDate) return true;
    if (rD === t.endDate) {
      const now = new Date(), cH = now.getHours(), cM = now.getMinutes();
      const tP = (sets.overdueTime || "17:30").split(":");
      const tH = parseInt(tP[0] || 17), tM = parseInt(tP[1] || 30);
      if (cH > tH || (cH === tH && cM >= tM)) return true;
    }
    return false; 
  };

  // 🛠️ ตราประทับถาวร
  const isTaskOvd = (t, checkDate = getTStr()) => {
    if (t.overdueStatus === 'เกินกำหนด') return true;
    if (t.status !== 'จบงาน' && t.status !== 'ยกเลิก') return chkOvdTimeAware(t, checkDate);
    return false;
  };

  const runMigration = async () => {
    const confirmCode = prompt('⚠️ พิมพ์ "MIGRATE" เพื่อดูดข้อมูลเข้า Firebase'); if (confirmCode !== 'MIGRATE') return;
    setLoading(true);
    try {
        const ts = Date.now(); const [tR, iR, sR] = await Promise.all([ fetch(`${API_URL}?sheet=Tasks&t=${ts}`), fetch(`${API_URL}?sheet=InformJobs&t=${ts}`), fetch(`${API_URL}?sheet=Settings&t=${ts}`) ]);
        const [tD, iD, sD] = await Promise.all([tR.json(), iR.json(), sR.json()]);
        const promises = [];
        if(Array.isArray(tD) && !tD.error) { tD.forEach(r => { const t = { id: getCleanVal(r,['id','รหัสงาน']), details: getCleanVal(r,['details','รายละเอียดงาน','รายละเอียด']), requester: getCleanVal(r,['requester','ผู้แจ้ง']), project: getCleanVal(r,['project','โครงการ']), area: getCleanVal(r,['area','พื้นที่']), receivedDate: pYMD(getCleanVal(r,['receiveddate','วันที่รับเรื่อง'])), slaCategory: getCleanVal(r,['slacategory','หมวดsla','sla'])||'', startDate: pYMD(getCleanVal(r,['startDate','เริ่มงาน'])), endDate: pYMD(getCleanVal(r,['endDate','กำหนดเสร็จ'])), status: getCleanVal(r,['status','สถานะ'])||'อยู่ระหว่างดำเนินการ', completedDate: pYMD(getCleanVal(r,['completedDate','วันที่จบงานจริง'])), cancelReason: getCleanVal(r,['cancelReason','เหตุผลยกเลิก']), overdueStatus: getCleanVal(r,['overduestatus','สถานะความล่าช้า'])||'ปกติ', workOrderNo: getCleanVal(r,['workorderno','เลขที่ใบงาน','เลขใบงาน','ใบงาน'])||'', billingStatus: getCleanVal(r,['billingstatus','สถานะเบิก'])||'รอส่งเบิก', billingMonth: getCleanVal(r,['billingmonth','เดือนที่เบิก'])||'' }; if(t.id) promises.push(setDoc(getDocRef('Tasks', t.id), t)); }); }
        if(Array.isArray(iD) && !iD.error) { iD.forEach(r => { const t = { id: getCleanVal(r,['id','รหัสอ้างอิง']), date: pYMD(getCleanVal(r,['date','วันที่'])), requesterName: getCleanVal(r,['requesterName','ผู้แจ้ง']), phone: getCleanVal(r,['phone','เบอร์ติดต่อ']), project: String(getCleanVal(r,['project','โครงการ'])||'').trim(), jobType: getCleanVal(r,['jobType','ประเภทงาน']), location: getCleanVal(r,['location','สถานที่','บริเวณ']), details: getCleanVal(r,['details','รายละเอียดปัญหา','รายละเอียด','รายละเอียดงาน','ปัญหา'])||'-', status: getCleanVal(r,['status','สถานะ'])||'รอดำเนินการ', informNo: getCleanVal(r,['informno','เลขinform','เลขที่ใบงาน'])||'', cancelReason: getCleanVal(r,['cancelReason','เหตุผลยกเลิก']), area: String(getCleanVal(r,['area','พื้นที่'])||'').trim() }; if(t.id) promises.push(setDoc(getDocRef('InformJobs', t.id), t)); }); }
        if(Array.isArray(sD) && !sD.error) { const s = { areas:[], projects:[], jobTypes:[], locations:[], emails:[], slas:[], overdueTime:'17:30', lateWorkOrderHours:24 }; sD.forEach((r,i) => { if(i===0){ s.overdueTime=parseTimeForInput(r.overdueTime); s.lateWorkOrderHours=r.lateWorkOrderHours||24; } if(r.areas)s.areas.push(String(r.areas).trim()); if(r.projects)s.projects.push(String(r.projects).trim()); if(r.jobTypes)s.jobTypes.push(String(r.jobTypes).trim()); if(r.locations)s.locations.push(String(r.locations).trim()); if(r.emails)s.emails.push(String(r.emails).trim()); if(r.slas)s.slas.push(String(r.slas).trim()); }); promises.push(setDoc(getDocRef('Settings', 'main'), s)); }
        await Promise.all(promises); alert('🎉 โอนย้ายข้อมูลสำเร็จ!');
    } catch(e) { alert(e.message); } setLoading(false);
  };

  const handleClearData = async () => { const confirmCode = prompt('⚠️ พิมพ์รหัส "1312" เพื่อยืนยันการล้างข้อมูลทั้งหมด:'); if (confirmCode !== '1312') return; setLoading(true); try { const tasksSnap = await getDocs(getColRef('Tasks')); const infSnap = await getDocs(getColRef('InformJobs')); const promises = []; tasksSnap.forEach(d => promises.push(deleteDoc(d.ref))); infSnap.forEach(d => promises.push(deleteDoc(d.ref))); await Promise.all(promises); fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: 'clearData', data: {} }) }).catch(()=>{}); alert('ล้างข้อมูลสำเร็จ!'); } catch(e) {} finally { setLoading(false); } };
  const testEmailSystem = () => { window.open(`${API_URL}?action=testEmail&emails=${encodeURIComponent(sets.emails.map(e=>e.split('|')[0]).join(','))}`, '_blank'); };
  const simulateOverdueEmail = () => { if (sets.projects.length === 0) return alert('กรุณาเพิ่มโครงการก่อนครับ'); const testProj = getProjName(sets.projects[0]); const fakeData = { id: `TEST-${Date.now().toString().slice(-4)}`, project: testProj, details: "จำลองส่งจากปุ่มทดสอบ (ไม่บันทึกงานจริง)", emailAlert: { action: "จำลองงานเกินกำหนดเวลา", reason: "ผู้ดูแลระบบทดสอบยิงอีเมลจำลอง", emails: getTargetEms(testProj) } }; fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: 'simulateAlertOnly', data: fakeData }) }).catch(()=>{}); alert(`จำลองการยิงอีเมลทดสอบเรียบร้อย`); };
  const installTrigger = async () => { setLoading(true); try { await fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: 'setupTrigger', data: {} }) }); alert('ติดตั้งระบบแจ้งเตือนอัตโนมัติ (ทุก 5 นาที) เรียบร้อย'); } catch(e) {} finally { setLoading(false); } };

  const subT = (e) => {
    e.preventDefault(); const fd = new FormData(e.target); let det = fd.get('details'), ePl = null;
    const proj = fd.get('project'); const sDate = fd.get('startDate'); const eDate = fd.get('endDate');
    if(eTask && eTask.startDate !== sDate) { if(!sRsn) return alert('ระบุเหตุผลเลื่อนเริ่มงาน'); det += `\n[เปลี่ยนวันเริ่ม: ${sRsn}]`; ePl = { action: 'ขอเปลี่ยนวันเริ่มงาน', reason: sRsn, emails: getTargetEms(proj), project: proj, details: det }; }
    
    const slaCat = fd.get('slaCategory');
    if (slaCat) {
      const slaLimitObj = sets.slas.find(s => getProjName(s) === slaCat);
      if (slaLimitObj) {
        const limitDays = parseInt(getProjArea(slaLimitObj)); const diffDays = Math.ceil((new Date(eDate) - new Date(sDate)) / (1000 * 60 * 60 * 24));
        if (diffDays > limitDays) {
           if(!window.confirm(`⚠️ ระยะเวลาทำงาน ${diffDays} วัน เกินกว่า SLA (${limitDays} วัน)\nระบบจะส่งเมล์ด่วนถึงผู้ดูแลโครงการ ยืนยันหรือไม่?`)) return; 
           if(!ePl) ePl = { action: 'บันทึกงานเกินเวลา SLA', reason: `ตั้งเวลา ${diffDays} วัน (เกิน SLA ${limitDays} วัน)`, emails: getTargetEms(proj), project: proj, details: det };
        }
      }
    }
    
    const tD = { id: eTask?eTask.id:`JOB-${Date.now().toString().slice(-4)}`, details: det, requester: fd.get('requester'), project: proj, area: fd.get('area'), receivedDate: eTask ? eTask.receivedDate : fd.get('receivedDate'), slaCategory: slaCat, startDate: sDate, endDate: eDate, status: eTask?eTask.status:'อยู่ระหว่างดำเนินการ', completedDate: eTask?eTask.completedDate:null, cancelReason: eTask?eTask.cancelReason:null, workOrderNo: eTask?eTask.workOrderNo:'', billingStatus: eTask?eTask.billingStatus:'รอส่งเบิก', billingMonth: eTask?eTask.billingMonth:'' };
    tD.overdueStatus = (eTask && eTask.overdueStatus === 'เกินกำหนด') ? 'เกินกำหนด' : 'ปกติ'; 
    if(ePl) tD.emailAlert = ePl; saveD('task', tD); setTMod(false); setETask(null); setSReason(''); setShowStartReason(false);
  };

  const initSt = (id, val) => {
    const t = tasks.find(x => x.id === id);
    if(val === 'จบงาน') setSMod({ isOpen: true, taskId: id, type: 'complete', reason: '', workOrderNo: t.workOrderNo || '' });
    else { const nT = { ...t, status: val, completedDate: null }; nT.overdueStatus = t.overdueStatus || 'ปกติ'; saveD('task', nT); }
  };

  const cfSt = () => {
    if (sMod.type === 'complete') { const cleanWo = sMod.workOrderNo.trim().toUpperCase(); if (!/^[A-Za-z]{2}-\d{3}-\d{7}$/.test(cleanWo)) return alert('ใบงานผิดรูปแบบ! (เช่น: LH-123-1234567)'); sMod.workOrderNo = cleanWo; }
    const t = tasks.find(x => x.id === sMod.taskId);
    if (t) {
        let nT = { ...t };
        if(sMod.type === 'cancel') { nT.status = 'ยกเลิก'; nT.cancelReason = sMod.reason; nT.emailAlert = { action: 'ยกเลิกงาน', reason: sMod.reason, emails: getTargetEms(t.project), project: t.project, details: t.details }; }
        else if(sMod.type === 'complete') { 
            nT.status = 'จบงาน'; nT.completedDate = getTStr(); nT.workOrderNo = sMod.workOrderNo; 
            if (t.overdueStatus === 'เกินกำหนด' || chkOvdTimeAware(nT, getTStr()) || nT.completedDate > nT.endDate) { 
                nT.overdueStatus = 'เกินกำหนด'; 
                if (chkOvdTimeAware(nT, getTStr()) || nT.completedDate > nT.endDate) {
                    nT.emailAlert = { action: 'ปิดงานล่าช้ากว่ากำหนด', reason: `ปิดงานเวลา ${new Date().toLocaleTimeString('th-TH')} น. (เลยเวลาตัดเกณฑ์ของวันจบงาน)`, emails: getTargetEms(nT.project), project: nT.project, details: t.details }; 
                }
            }
        }
        saveD('task', nT);
    }
    setSMod({ isOpen: false, taskId: null, type: '', reason: '', workOrderNo: '' });
  };

  const upS = (k, v, arr=true) => { setSets(prev => { let nS = {...prev}; if(arr) { const val = (v || '').trim(); if(!val || prev[k].includes(val)) return prev; nS[k] = [...prev[k], val]; setSInp(p => ({...p, [k]:'', projArea:'', slaDays:''})); } else { nS[k] = v; } saveD('settings', nS); return nS; }); };
  const dlS = (k, v) => { setSets(prev => { let nS = {...prev, [k]: prev[k].filter(x => x !== v)}; saveD('settings', nS); return nS; }); };
  const clearSList = (k) => { if(window.confirm('⚠️ ยืนยันการลบข้อมูล "ทั้งหมด" ในหมวดหมู่นี้ใช่หรือไม่?')) { setSets(prev => { let nS = {...prev, [k]: []}; saveD('settings', nS); return nS; }); } };
  const addEmailMapping = () => { const em = sInp.emails.trim(), pj = sInp.emProj || 'ทั้งหมด'; if (!em) return; let nEms = [...sets.emails]; const idx = nEms.findIndex(x => x.startsWith(em + '|')); if (idx > -1) { const parts = nEms[idx].split('|'); let projs = parts[1] ? parts[1].split(',') : []; if (pj === 'ทั้งหมด') { projs = ['ทั้งหมด']; } else { projs = projs.filter(x => x !== 'ทั้งหมด'); if (!projs.includes(pj)) { if (projs.length >= 15) return alert('1 อีเมลสามารถผูกโครงการได้สูงสุด 15 โครงการครับ'); projs.push(pj); } } nEms[idx] = `${em}|${projs.join(',')}`; } else { nEms.push(`${em}|${pj}`); } setSets({...sets, emails: nEms}); saveD('settings', {...sets, emails: nEms}); setSInp({...sInp, emails: '', emProj: 'ทั้งหมด'}); };
  const rmEmailProj = (emStr, pRm) => { const parts = emStr.split('|'), em = parts[0]; let projs = parts[1].split(',').filter(x => x !== pRm); let nEms = sets.emails.filter(x => x !== emStr); if (projs.length > 0) nEms.push(`${em}|${projs.join(',')}`); setSets({...sets, emails: nEms}); saveD('settings', {...sets, emails: nEms}); };
  const subInf = (e) => { e.preventDefault(); const form = e.target; const reqName = form.requesterName.value.trim(); if (!reqName) return alert('กรุณาระบุชื่อผู้แจ้ง'); const fd = { id: `REQ-${Date.now().toString().slice(-4)}`, date: form.date.value, requesterName: reqName, phone: form.phone.value.trim(), project: form.project.value, area: form.area.value, jobType: form.jobType.value, location: form.location.value, details: form.details.value.trim(), status: 'รอดำเนินการ', informNo: '', cancelReason: '' }; saveD('informJob', fd); alert('ส่งเรื่องเรียบร้อย'); form.reset(); setITab('manage'); };
  const cfInf = () => { const j = informs.find(x => x.id === iMod.id); if(j) { let n = {...j}; if(iMod.type === 'open'){ n.status = 'เปิด Inform Job แล้ว'; n.informNo = iMod.val; }else{ n.status = 'ยกเลิก'; n.cancelReason = iMod.val; } saveD('informJob', n); } setIMod({ isOpen: false, type: '', id: null, val: '' }); };
  const moveGroup = (groupId, st) => { tasks.forEach(t => { const k = (t.workOrderNo||'').trim() ? `WO_${t.workOrderNo.trim()}` : `ID_${t.id}`; if (k === groupId && t.billingStatus !== st) { const nT = { ...t, billingStatus: st, billingMonth: st === 'ส่งเบิกแล้ว' ? gFilt.month : '' }; saveD('task', nT); } }); };
  const groupTasks = (tList) => { const grp = {}; const woRegex = /^[A-Za-z]{2}-\d{3}-\d{7}$/; tList.forEach(t => { const no = (t.workOrderNo||'').trim(); const isWO = woRegex.test(no); const k = isWO ? `WO_${no}` : `ID_${t.id}`; if (!grp[k]) grp[k] = { id: k, isWO: isWO, woNo: no, project: t.project, tasks: [] }; grp[k].tasks.push(t); }); return Object.values(grp); };
  const oDS = (e, groupId) => { e.dataTransfer.setData('groupId', groupId); }; const oDp = (e, st) => { e.preventDefault(); const gId = e.dataTransfer.getData('groupId'); if(gId) moveGroup(gId, st); };

  const GFBar = () => {
    if(tab === 'settings') return null;
    return (
      <div className="bg-white border-b px-4 md:px-6 py-3 flex flex-wrap gap-3 items-center text-sm shadow-sm z-10 sticky top-14">
        <span className="font-bold text-gray-500 mr-2"><Icon name="filter" size={16} className="inline mr-1"/> ตัวกรอง:</span>
        {tab !== 'daily' ? <input type="month" value={gFilt.month} onChange={e=>setGilt({...gFilt, month: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50" /> : <input type="date" value={gFilt.date} onChange={e=>setGilt({...gFilt, date: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50" />}
        <select value={gFilt.area} onChange={e=>setGilt({...gFilt, area: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50"><option value="ทั้งหมด">ทุกพื้นที่</option>{sets.areas.map(a=><option key={a}>{a}</option>)}</select>
        <select value={gFilt.project} onChange={e=>setGilt({...gFilt, project: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50"><option value="ทั้งหมด">ทุกโครงการ</option>{sets.projects.map(p=><option key={p}>{getProjName(p)}</option>)}</select>
        {tab === 'inform' && iTab === 'manage' && <select value={gFilt.status} onChange={e=>setGilt({...gFilt, status: e.target.value})} className="border rounded px-3 py-1.5 outline-none bg-gray-50"><option value="ทั้งหมด">ทุกสถานะ</option><option value="รอดำเนินการ">รอดำเนินการ</option><option value="เปิด Inform Job แล้ว">เปิดงานแล้ว</option></select>}
      </div>
    );
  };

  const rDash = () => {
    const tS = getTStr(); const tD = gFilt.date; const tM = gFilt.month;
    const aT = tasks.filter(t => t.status !== 'ยกเลิก' && (gFilt.area==='ทั้งหมด'||t.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(t.project)===gFilt.project));
    
    const mt = aT.filter(t => t.startDate && t.startDate.startsWith(tM));
    const dy = aT.filter(t => (tD >= t.startDate && tD <= t.endDate) || (t.status !== 'จบงาน' && chkOvdTimeAware(t, tD) && tD === tS));
    
    const mtOv = mt.filter(t => isTaskOvd(t, tS) && t.status !== 'จบงาน');
    const dyOv = dy.filter(t => isTaskOvd(t, tD) && t.status !== 'จบงาน');

    const dyDone = dy.filter(t => t.status === 'จบงาน').length;
    const dyProg = dy.length - dyDone - dyOv.length;

    const mtDone = mt.filter(t => t.status === 'จบงาน').length;
    const mtProg = mt.length - mtDone - mtOv.length;

    return (
      <div className="space-y-6 animate-in">
        <h2 className="text-xl font-bold text-[#0f2e4a] flex items-center"><Icon name="layoutDashboard" size={20} className="mr-2"/> ภาพรวมผลการดำเนินงาน</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-[4px] border-[#0f2e4a]"><div className="text-xs text-gray-500 font-bold mb-1">งานเดือน {tM}</div><div className="text-2xl font-black">{mt.length}</div></div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-[4px] border-[#bca374]"><div className="text-xs text-gray-500 font-bold mb-1">งานวันที่ {fDate(tD)}</div><div className="text-2xl font-black">{dy.length}</div></div>
          <div onClick={()=>{ setGilt(p=>({...p, date: tS})); setOPop({isOpen:true, type:'daily'}); }} className="bg-red-50 p-4 rounded-xl shadow-sm border-l-[4px] border-red-500 cursor-pointer hover:shadow-md transition"><div className="text-xs text-red-600 font-bold mb-1 flex justify-between">ค้าง/ช้า (รายวัน) <span className="text-[9px] bg-red-200 px-1 rounded text-red-800">คลิกดู</span></div><div className="text-2xl font-black text-red-700">{dyOv.length}</div></div>
          <div onClick={()=>setOPop({isOpen:true, type:'monthly'})} className="bg-red-50 p-4 rounded-xl shadow-sm border-l-[4px] border-red-700 cursor-pointer hover:shadow-md transition"><div className="text-xs text-red-700 font-bold mb-1 flex justify-between">ค้าง/ช้า (รายเดือน) <span className="text-[9px] bg-red-200 px-1 rounded text-red-800">คลิกดู</span></div><div className="text-2xl font-black text-red-800">{mtOv.length}</div></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border"><SimplePieChart data={[{name:'จบงาน',value:dyDone,color:THEME.success},{name:'ดำเนินการ',value:Math.max(0, dyProg),color:THEME.secondary},{name:'เกินกำหนด',value:dyOv.length,color:THEME.danger}]} title={`สถานะงานรายวัน (${fDate(tD)})`}/></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border"><SimplePieChart data={[{name:'จบงาน',value:mtDone,color:THEME.success},{name:'ดำเนินการ',value:Math.max(0, mtProg),color:THEME.secondary},{name:'เกินกำหนด',value:mtOv.length,color:THEME.danger}]} title={`สถานะงานเดือนนี้ (${tM})`}/></div>
        </div>
      </div>
    );
  };

  const rDail = () => {
    const tD = gFilt.date; const vT = tasks.filter(t => t.status !== 'ยกเลิก' && (gFilt.area==='ทั้งหมด'||t.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(t.project)===gFilt.project) && ((tD >= t.startDate && tD <= t.endDate) || (t.status !== 'จบงาน' && chkOvdTimeAware(t, tD) && tD === getTStr())));
    return (
      <div className="space-y-4 animate-in">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#0f2e4a]">งานประจำวัน</h2>
          <button type="button" onClick={()=>{setETask(null);setTMod(true);}} className="bg-[#0f2e4a] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-md"><Icon name="plus" size={16} className="mr-2"/> เพิ่มงาน</button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm text-left"><thead className="bg-gray-50 border-b text-xs uppercase text-gray-500"><tr><th className="p-4">รายละเอียด</th><th className="p-4">โครงการ</th><th className="p-4">ระยะเวลา</th><th className="p-4">สถานะ</th><th className="p-4 text-center">จัดการ</th></tr></thead><tbody>
          {vT.map(t => { 
            const isOvd = isTaskOvd(t, tD); 
            return (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="p-4"><div className="font-medium">{t.details}</div><div className="text-[10px] text-gray-400 mt-1 flex gap-1 items-center"><span>{t.id} | {t.requester}</span>{t.workOrderNo && <span className="bg-blue-50 text-blue-600 px-1 rounded">WO:{t.workOrderNo}</span>}{isOvd && <span className="text-red-500 px-1 border border-red-200 rounded">เกินกำหนด</span>}</div></td>
                <td className="p-4 font-bold text-[#bca374]">{getStdProj(t.project)}<div className="text-xs text-gray-400 font-normal">{t.area}</div></td>
                <td className="p-4 text-xs text-gray-600">เริ่ม: {fDate(t.startDate)}<br/><span className={isOvd?'text-red-500 font-bold':''}>จบ: {fDate(t.endDate)}</span></td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${t.status==='จบงาน'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>{t.status}</span></td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-1">
                    <select value={t.status} onChange={e=>initSt(t.id, e.target.value)} className="border rounded text-xs p-1 outline-none"><option value="อยู่ระหว่างดำเนินการ">ดำเนินการ</option><option value="จบงาน">จบงาน</option></select>
                    <button type="button" onClick={()=>{
                        const pwd = prompt('กรุณาใส่รหัสผ่านเพื่อแก้ไขข้อมูล:');
                        if(pwd !== '131236') return alert('รหัสผ่านไม่ถูกต้อง!');
                        setETask(t);setTMod(true);
                    }} className="text-gray-400 hover:text-[#0f2e4a] p-1 bg-gray-100 rounded hover:bg-gray-200"><Icon name="edit2" size={14}/></button>
                  </div>
                </td>
              </tr>
            ); 
          })} 
          {vT.length===0 && <tr><td colSpan="5" className="text-center py-10 text-gray-400">ไม่มีงาน</td></tr>}</tbody></table></div>
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
        <div className="grid grid-cols-7 gap-px bg-gray-200 border rounded-lg overflow-hidden">{['อา','จ','อ','พ','พฤ','ศ','ส'].map(d=><div key={d} className="bg-gray-50 py-2 text-center text-xs font-bold text-gray-500">{d}</div>)}{ds.map((d,i) => { 
          if(!d) return <div key={`e-${i}`} className="bg-white/50 min-h-[80px]"></div>; 
          const dS = pYMD(d); const iT = dS === tS; 
          const dTs = tasks.filter(t => {
              if (t.status === 'ยกเลิก') return false;
              if (gFilt.area !== 'ทั้งหมด' && t.area !== gFilt.area) return false;
              if (gFilt.project !== 'ทั้งหมด' && getStdProj(t.project) !== gFilt.project) return false;
              if (!t.startDate) return false;
              const effEnd = t.status === 'จบงาน' ? (t.completedDate || t.endDate) : (t.endDate < tS ? tS : t.endDate);
              return dS >= t.startDate && dS <= effEnd;
          }); 
          
          return (
            <div key={dS} onClick={()=>dTs.length>0 && setCPop({isOpen:true, date:dS, tasks:dTs})} className={`bg-white min-h-[80px] p-1 border-t cursor-pointer hover:bg-slate-50 ${iT?'bg-blue-50/30 ring-1 ring-inset ring-blue-300':''}`}>
              <div className={`text-right text-[10px] mb-1 ${iT?'font-black text-blue-600':'text-gray-400'}`}>{d.getDate()}</div>
              <div className="space-y-0.5">
                {dTs.slice(0,4).map(t=>{
                  let cCls = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                  if (t.status === 'จบงาน') cCls = 'bg-green-100 text-green-700 border-green-200';
                  else if (isTaskOvd(t, tS)) cCls = 'bg-red-100 text-red-700 border-red-200';
                  return <div key={t.id} className={`text-[8px] px-1 py-0.5 rounded truncate font-bold border ${cCls}`} title={t.details}>{getStdProj(t.project)}</div>;
                })}
                {dTs.length>4 && <div className="text-[8px] text-center text-gray-500 font-bold bg-gray-100 rounded">+ {dTs.length-4}</div>}
              </div>
            </div>
          ); 
        })}</div>
        <div className="flex gap-4 text-[10px] justify-center mt-4 font-bold">
          <div className="flex items-center"><span className="w-3 h-3 bg-green-100 border border-green-200 rounded-sm mr-1"></span>จบงาน</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded-sm mr-1"></span>กำลังดำเนินการ</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm mr-1"></span>เกินกำหนด</div>
        </div>
      </div>
    );
  };

  const rInf = () => {
    const ft = informs.filter(j => j.status!=='ยกเลิก' && j.date?.startsWith(gFilt.month) && (gFilt.area==='ทั้งหมด'||j.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(j.project)===gFilt.project) && (gFilt.status==='ทั้งหมด'||j.status===gFilt.status));
    return (
      <div className="space-y-4 animate-in">
        <div className="bg-white p-4 rounded-xl shadow-sm border flex gap-2"><button type="button" onClick={()=>setITab('form')} className={`flex-1 py-2 text-xs font-bold rounded ${iTab==='form'?'bg-[#0f2e4a] text-white shadow':'bg-gray-100 text-gray-500'}`}>แจ้งเปิดงานใหม่</button><button type="button" onClick={()=>setITab('manage')} className={`flex-1 py-2 text-xs font-bold rounded ${iTab==='manage'?'bg-[#0f2e4a] text-white shadow':'bg-gray-100 text-gray-500'}`}>จัดการสถานะ</button></div>
        {iTab === 'form' ? (
          <form onSubmit={subInf} className="bg-white p-6 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-4 border-t-4 border-t-[#bca374]">
            <div><label className="text-xs font-bold mb-1 block">วันที่</label><input type="date" name="date" required defaultValue={getTStr()} className="border rounded-xl px-3 py-2 w-full text-sm outline-none" /></div>
            <div><label className="text-xs font-bold mb-1 block">ผู้แจ้ง / เบอร์</label><div className="flex gap-2"><input name="requesterName" required placeholder="ชื่อ" autoComplete="name" className="border rounded-xl px-3 py-2 w-1/2 text-sm outline-none" /><input name="phone" required placeholder="เบอร์โทร" autoComplete="tel" className="border rounded-xl px-3 py-2 w-1/2 text-sm outline-none" /></div></div>
            <div><label className="text-xs font-bold mb-1 block">โครงการ (ออโต้พื้นที่)</label>
              <select name="project" required onChange={(e) => { const pData = sets.projects.find(p=>getProjName(p) === e.target.value); if(pData) document.getElementById('inf_area').value = getProjArea(pData); }} className="border rounded-xl px-3 py-2 w-full text-sm outline-none"><option value="">เลือก...</option>{sets.projects.map(p=><option key={p} value={getProjName(p)}>{getProjName(p)}</option>)}</select>
            </div>
            <div><label className="text-xs font-bold mb-1 block">พื้นที่</label><input type="text" id="inf_area" name="area" readOnly className="border rounded-xl px-3 py-2 w-full text-sm outline-none bg-gray-100 text-gray-500" /></div>
            <div><label className="text-xs font-bold mb-1 block">ประเภทงาน</label><select name="jobType" required className="border rounded-xl px-3 py-2 w-full text-sm outline-none"><option value="">เลือก...</option>{sets.jobTypes.map(a=><option key={a}>{a}</option>)}</select></div>
            <div><label className="text-xs font-bold mb-1 block">บริเวณ</label><select name="location" required className="border rounded-xl px-3 py-2 w-full text-sm outline-none"><option value="">เลือก...</option>{sets.locations.map(a=><option key={a}>{a}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-bold mb-1 block">รายละเอียดปัญหา</label><textarea name="details" required rows="3" className="border rounded-xl px-3 py-2 w-full text-sm outline-none resize-none"></textarea></div>
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
    const cT = tasks.filter(t => t.status === 'จบงาน' && (gFilt.area==='ทั้งหมด'||t.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(t.project)===gFilt.project));
    const ubGrp = groupTasks(cT.filter(t => t.billingStatus !== 'ส่งเบิกแล้ว')); 
    const biGrp = groupTasks(cT.filter(t => t.billingStatus === 'ส่งเบิกแล้ว'));
    
    return (
      <div className="space-y-4 animate-in">
         <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-[#0f2e4a]">กระดานส่งเบิก (เดือน {gFilt.month})</h2></div>
         <div className="flex flex-col md:flex-row gap-4 h-[70vh]">
            <div className="flex-1 bg-gray-100 rounded-xl p-3 flex flex-col border" onDragOver={e=>e.preventDefault()} onDrop={e=>oDp(e, 'รอส่งเบิก')}>
              <h3 className="font-bold text-gray-700 mb-3 border-b-2 border-gray-300 pb-2 flex justify-between"><span>รอส่งเบิก / ค้างเบิก</span><span className="bg-gray-200 px-2 rounded-full text-xs">{ubGrp.length} กลุ่ม</span></h3>
              <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar">
                {ubGrp.map(g => (
                  <div key={g.id} draggable onDragStart={e=>oDS(e, g.id)} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-move hover:border-blue-400 relative">
                    <div className="flex justify-between items-start mb-2"><span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">{g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0].id}`}</span><button type="button" onClick={()=>moveGroup(g.id, 'ส่งเบิกแล้ว')} className="md:hidden bg-green-100 text-green-700 px-3 py-1 rounded text-[10px] font-bold shadow-sm active:bg-green-200">ส่งเบิก ➡️</button></div>
                    <div className="font-bold text-[#0f2e4a] text-sm mb-1">{getStdProj(g.project)} <span className="text-xs text-gray-500 font-normal">({g.tasks.length} งาน)</span></div>
                    <div className="space-y-1.5 mt-2">{g.tasks.map((t, i) => (<div key={t.id} className="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100"><span className="text-gray-400 font-bold mr-1">#{i+1}</span>{t.details}</div>))}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 bg-green-50 rounded-xl p-3 flex flex-col border border-green-100" onDragOver={e=>e.preventDefault()} onDrop={e=>oDp(e, 'ส่งเบิกแล้ว')}>
              <h3 className="font-bold text-green-700 mb-3 border-b-2 border-green-200 pb-2 flex justify-between"><span>ส่งเบิกแล้ว</span><span className="bg-green-200 px-2 rounded-full text-xs">{biGrp.length} กลุ่ม</span></h3>
              <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar">
                {biGrp.map(g => (
                  <div key={g.id} draggable onDragStart={e=>oDS(e, g.id)} className="bg-white p-3 rounded-lg shadow-sm border border-green-200 cursor-move hover:border-green-400 relative">
                    <div className="flex justify-between items-start mb-2"><span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded text-[10px]">{g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0].id}`}</span><button type="button" onClick={()=>moveGroup(g.id, 'รอส่งเบิก')} className="md:hidden bg-gray-100 text-gray-600 px-3 py-1 rounded text-[10px] font-bold shadow-sm active:bg-gray-200">⬅️ ยกเลิก</button></div>
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

  const rSet = () => {
    if (!setUnlk) return (<div className="bg-white p-8 rounded-xl shadow border text-center max-w-sm mx-auto mt-10"><h2 className="text-lg font-bold mb-4">เข้าสู่ระบบแอดมิน</h2><input type="password" placeholder="รหัสผ่าน" className="border p-3 rounded-lg w-full mb-4 text-center tracking-widest text-lg outline-none" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&pwd==='1312'&&setSetUnlk(true)} /><button type="button" onClick={()=>pwd==='1312'&&setSetUnlk(true)} className="bg-[#0f2e4a] text-white px-4 py-2 rounded-lg w-full font-bold">ยืนยัน</button></div>);
    const totalRows = tasks.length + informs.length; 
    const healthPct = Math.min((totalRows / 3000) * 100, 100);
    const healthColor = totalRows < 1500 ? 'bg-green-500' : (totalRows < 2500 ? 'bg-amber-500' : 'bg-red-500');
    const groupedProjects = sets.projects.reduce((acc, curr) => { const p = getProjName(curr), a = getProjArea(curr); if (!acc[a]) acc[a] = []; acc[a].push({ fullStr: curr, name: p }); return acc; }, {});

    return (
      <div className="space-y-6 animate-in pb-10">
        <div className="bg-white p-6 rounded-xl border shadow-sm border-t-4 border-[#bca374]">
          <h3 className="font-bold text-lg mb-4 flex items-center"><Icon name="fileText" size={20} className="mr-2 text-[#0f2e4a]"/> ส่งออกรายงานสรุป (PDF)</h3>
          <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg border">
            <div><label className="text-xs font-bold block mb-1">รูปแบบ</label><select className="border rounded px-3 py-2 text-sm" value={rCfg.type} onChange={e=>setRConfig({...rCfg, type:e.target.value})}><option value="month">รายเดือน</option><option value="year">รายปี</option></select></div>
            <div><label className="text-xs font-bold block mb-1">{rCfg.type==='month'?'เดือน':'ปี'}</label>{rCfg.type==='month'?<input type="month" className="border rounded px-3 py-2 text-sm" value={rCfg.val} onChange={e=>setRConfig({...rCfg, val:e.target.value})} />:<input type="number" className="border rounded px-3 py-2 text-sm w-24" value={rCfg.val.substring(0,4)} onChange={e=>setRConfig({...rCfg, val:`${e.target.value}-01`})} />}</div>
            <div><label className="text-xs font-bold block mb-1">พื้นที่</label><select className="border rounded px-3 py-2 text-sm" value={rCfg.area} onChange={e=>setRConfig({...rCfg, area:e.target.value})}><option value="ทั้งหมด">ทั้งหมด</option>{sets.areas.map(a=><option key={a}>{a}</option>)}</select></div>
            <div><label className="text-xs font-bold block mb-1">โครงการ</label><select className="border rounded px-3 py-2 text-sm" value={rCfg.project} onChange={e=>setRConfig({...rCfg, project:e.target.value})}><option value="ทั้งหมด">ทั้งหมด</option>{sets.projects.map(p=><option key={p}>{getProjName(p)}</option>)}</select></div>
            <button type="button" onClick={()=>window.print()} className="bg-[#0f2e4a] text-white px-6 py-2 rounded-lg text-sm font-bold shadow flex items-center ml-auto hover:bg-[#1a3f63]"><Icon name="download" size={16} className="mr-2"/> พิมพ์ PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col h-[350px]"><div className="flex justify-between items-center mb-3"><h3 className="font-bold text-xs text-[#0f2e4a]">จัดกลุ่มโครงการตามพื้นที่</h3><button type="button" onClick={()=>clearSList('projects')} className="text-[9px] text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded flex items-center"><Icon name="trash" size={10} className="mr-1"/>ลบทั้งหมด</button></div><div className="flex-1 overflow-y-auto pr-1 hide-scrollbar space-y-2">{Object.keys(groupedProjects).map(area => (<div key={area} className="border rounded-lg overflow-hidden shadow-sm"><div className="bg-gray-100 px-3 py-1.5 text-[10px] font-bold text-[#0f2e4a] border-b">{area || 'ไม่ได้ระบุพื้นที่'}</div><div className="p-2 flex flex-wrap gap-1.5 bg-white">{groupedProjects[area].map(p => (<span key={p.fullStr} className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-1 rounded text-[10px] flex items-center shadow-sm">{p.name}<button type="button" onClick={()=>dlS('projects', p.fullStr)} className="ml-1.5 text-red-400 hover:text-red-600"><Icon name="x" size={10}/></button></span>))}</div></div>))}</div><div className="mt-3 flex gap-1 pt-2 border-t"><input type="text" placeholder="ชื่อโครงการ..." className="border rounded px-2 py-1.5 text-xs flex-1 min-w-0 bg-gray-50 focus:bg-white transition-colors" value={sInp.projects} onChange={e=>setSInp({...sInp,projects:e.target.value})} /><select className="border rounded px-2 py-1.5 text-xs w-20 bg-gray-50 focus:bg-white transition-colors" value={sInp.projArea} onChange={e=>setSInp({...sInp,projArea:e.target.value})}><option value="">พท.</option>{sets.areas.map(a=><option key={a}>{a}</option>)}</select><button type="button" onClick={()=>sInp.projects&&sInp.projArea&&upS('projects',`${sInp.projects}|${sInp.projArea}`)} className="bg-[#0f2e4a] text-white px-3 rounded shadow hover:bg-[#1a3f63] transition-colors"><Icon name="plus" size={14}/></button></div></div>
          <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col h-[350px]"><div className="flex justify-between items-center mb-3"><h3 className="font-bold text-xs text-[#0f2e4a]">สิทธิ์การรับอีเมลของแต่ละบุคคล</h3><button type="button" onClick={()=>clearSList('emails')} className="text-[9px] text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded flex items-center"><Icon name="trash" size={10} className="mr-1"/>ลบทั้งหมด</button></div><div className="flex-1 overflow-y-auto pr-1 hide-scrollbar space-y-2">{sets.emails.map(item => { const parts = item.split('|'), em = parts[0], projs = parts[1] ? parts[1].split(',') : ['ทั้งหมด']; return (<div key={item} className="border rounded-lg overflow-hidden shadow-sm"><div className="bg-blue-50/50 px-3 py-1.5 flex justify-between items-center border-b border-blue-100"><span className="font-bold text-[#0f2e4a] text-xs flex items-center"><Icon name="mail" size={12} className="mr-1.5 text-blue-500"/>{em}</span><button type="button" onClick={()=>dlS('emails', item)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Icon name="trash" size={12}/></button></div><div className="p-2 flex flex-wrap gap-1.5 bg-white">{projs.map(p => (<span key={p} className={`px-2 py-1 rounded text-[9px] flex items-center font-medium border ${p==='ทั้งหมด'?'bg-amber-50 text-amber-700 border-amber-200':'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'}`}>{p}{p!=='ทั้งหมด' && <button type="button" onClick={()=>rmEmailProj(item, p)} className="ml-1 text-blue-400 hover:text-blue-600"><Icon name="x" size={10}/></button>}</span>))}</div></div>) })}</div><div className="mt-3 flex gap-1 pt-2 border-t"><input type="email" placeholder="ระบุอีเมล..." className="border rounded px-2 py-1.5 text-xs flex-1 min-w-0 bg-gray-50 focus:bg-white transition-colors" value={sInp.emails} onChange={e=>setSInp({...sInp,emails:e.target.value})} /><select className="border rounded px-2 py-1.5 text-xs w-20 bg-gray-50 focus:bg-white transition-colors" value={sInp.emProj} onChange={e=>setSInp({...sInp,emProj:e.target.value})}><option value="ทั้งหมด">ทั้งหมด</option>{sets.projects.map(p=><option key={p} value={getProjName(p)}>{getProjName(p)}</option>)}</select><button type="button" onClick={addEmailMapping} className="bg-[#0f2e4a] text-white px-3 rounded shadow hover:bg-[#1a3f63] transition-colors"><Icon name="plus" size={14}/></button></div></div>
          <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col h-[350px]"><div className="flex justify-between items-center mb-3"><h3 className="font-bold text-xs text-[#0f2e4a]">หมวดงาน ➡️ กรอบเวลา (SLA)</h3><button type="button" onClick={()=>clearSList('slas')} className="text-[9px] text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded flex items-center"><Icon name="trash" size={10} className="mr-1"/>ลบทั้งหมด</button></div><ul className="flex-1 overflow-y-auto space-y-1.5 mb-2 pr-1 text-[11px] hide-scrollbar">{sets.slas.map(item=><li key={item} className="flex justify-between items-center bg-amber-50 px-3 py-2 border border-amber-100 rounded-lg shadow-sm"><span>{getProjName(item)}</span><span className="font-bold text-red-500 bg-white px-2 py-0.5 rounded border">{getProjArea(item)} วัน <button type="button" onClick={()=>dlS('slas',item)} className="text-red-400 ml-2 inline-block"><Icon name="trash" size={12}/></button></span></li>)}</ul><div className="mt-3 flex gap-1 pt-2 border-t"><input type="text" placeholder="หมวดงาน SLA..." className="border rounded px-2 py-1.5 text-xs flex-1 min-w-0 bg-gray-50" value={sInp.slas} onChange={e=>setSInp({...sInp,slas:e.target.value})} /><input type="number" placeholder="วัน" className="border rounded px-2 py-1.5 text-xs w-16 bg-gray-50" value={sInp.slaDays} onChange={e=>setSInp({...sInp,slaDays:e.target.value})} /><button type="button" onClick={()=>sInp.slas&&sInp.slaDays&&upS('slas',`${sInp.slas}|${sInp.slaDays}`)} className="bg-[#bca374] text-white px-3 rounded shadow hover:bg-[#a38a5b]"><Icon name="plus" size={14}/></button></div></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[{k:'areas',l:'พื้นที่'},{k:'jobTypes',l:'ประเภทงาน'},{k:'locations',l:'บริเวณ'}].map(x => (<div key={x.k} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col h-[250px]"><div className="flex justify-between items-center mb-3"><h3 className="font-bold text-xs text-[#0f2e4a]">{x.l}</h3><button type="button" onClick={()=>clearSList(x.k)} className="text-[9px] text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded flex items-center"><Icon name="trash" size={10} className="mr-1"/>ลบทั้งหมด</button></div><ul className="flex-1 overflow-y-auto space-y-1.5 mb-2 pr-1 text-[11px] hide-scrollbar">{sets[x.k].map(item=><li key={item} className="flex justify-between items-center bg-gray-50 px-3 py-2 border rounded-lg shadow-sm"><span>{item}</span><button type="button" onClick={()=>dlS(x.k,item)} className="text-red-400 hover:text-red-600"><Icon name="trash" size={12}/></button></li>)}</ul><div className="mt-3 flex gap-1 pt-2 border-t"><input type="text" placeholder="เพิ่ม..." className="border rounded px-2 py-1.5 text-xs flex-1 min-w-0 bg-gray-50" value={sInp[x.k]||''} onChange={e=>setSInp({...sInp,[x.k]:e.target.value})} onKeyDown={e=>e.key==='Enter'&&upS(x.k,sInp[x.k])}/><button type="button" onClick={()=>upS(x.k,sInp[x.k])} className="bg-[#0f2e4a] text-white px-3 rounded shadow hover:bg-[#1a3f63]"><Icon name="plus" size={14}/></button></div></div>))}</div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-center items-center text-center space-y-3">
            <Icon name="mail" size={32} className="text-blue-500 mb-2"/>
            <div className="font-bold text-sm">ทดสอบระบบอีเมล</div>
            <div className="text-xs text-gray-500">ทดสอบการส่งอีเมลไปยังผู้ดูแลโครงการทั้งหมดเพื่อความมั่นใจ</div>
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-4">
              <button type="button" onClick={testEmailSystem} className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-[11px] font-bold shadow hover:bg-blue-100">ทดสอบการเชื่อมต่อ (Ping)</button>
              <button type="button" onClick={()=>{
                  if(!window.confirm('ระบบจะสั่งให้หลังบ้านกวาดตรวจงานที่เกินกำหนดทั้งหมดและยิงอีเมลแจ้งเตือน "ของจริง" ทันที ยืนยันหรือไม่?')) return;
                  fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: 'forceCheckAlerts', data: {} }) }).catch(()=>{});
                  alert('ส่งคำสั่งตรวจสอบไปยังระบบเรียบร้อยแล้ว โปรดรอประมาณ 10-30 วินาที และเช็คอีเมลครับ');
              }} className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-2 rounded-lg text-[11px] font-bold shadow hover:bg-purple-100">สแกนกวาดล้างงานล่าช้า (ของจริง)</button>
              <button type="button" onClick={installTrigger} className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg text-[11px] font-bold shadow hover:bg-amber-100">ติดตั้งบอทอัตโนมัติ</button>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
            <div><h3 className="font-bold text-sm mb-2 flex items-center"><Icon name="clock" size={16} className="mr-2 text-amber-500"/> เวลาตัดเกณฑ์ Overdue</h3><input type="time" className="border rounded-lg px-4 py-2 text-sm outline-none bg-gray-50 w-full" value={sets.overdueTime} onChange={e=>upS('overdueTime',e.target.value,false)} /></div>
            <div><h3 className="font-bold text-sm mb-2 flex items-center"><Icon name="fileText" size={16} className="mr-2 text-red-500"/> ขีดจำกัดออกใบงานช้า (ชม.)</h3><input type="number" className="border rounded-lg px-4 py-2 text-sm w-full outline-none bg-gray-50" value={sets.lateWorkOrderHours} onChange={e=>upS('lateWorkOrderHours',e.target.value,false)} /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm border-t-4 border-[#0f2e4a]">
          <h3 className="font-bold text-lg mb-4 flex items-center"><Icon name="database" size={20} className="mr-2 text-[#0f2e4a]"/> ศูนย์จัดการข้อมูล (Data Center)</h3>
          <div className="mb-5 bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between text-xs font-bold mb-2 text-gray-700"><span>ปริมาณการจัดเก็บข้อมูล (Storage Health)</span><span>{totalRows} / 3000 รายการ ({healthPct.toFixed(1)}%)</span></div>
            <div className="w-full bg-gray-200 rounded-full h-3"><div className={`${healthColor} h-3 rounded-full transition-all duration-500`} style={{width: `${healthPct}%`}}></div></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={()=>downloadCSV(tasks, `Tasks_Backup_${getTStr()}.csv`)} className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-blue-100 transition shadow-sm"><Icon name="download" size={16} className="mr-2"/> สำรองข้อมูลงาน (CSV)</button>
            <button type="button" onClick={()=>downloadCSV(informs, `InformJobs_Backup_${getTStr()}.csv`)} className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-blue-100 transition shadow-sm"><Icon name="download" size={16} className="mr-2"/> สำรองแจ้งเปิดงาน (CSV)</button>
            <button type="button" onClick={runMigration} className="flex-none bg-purple-50 text-purple-700 border border-purple-200 px-6 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-purple-100 transition shadow-sm"><Icon name="database" size={16} className="mr-2"/> ดึงข้อมูล Sheet เข้า Firebase</button>
            <button type="button" onClick={handleClearData} className="flex-none bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center hover:bg-red-100 transition shadow-sm"><Icon name="trash" size={16} className="mr-2"/> ล้างข้อมูลเก่า (Reset)</button>
          </div>
        </div>
      </div>
    );
  };

  const PReport = () => {
    const isY = rCfg.type === 'year'; const fS = isY ? rCfg.val.substring(0,4) : rCfg.val; const tS = getTStr();
    
    const allPeriodTasks = tasks.filter(t => {
      if(!t.startDate || !t.startDate.startsWith(fS)) return false;
      if(rCfg.area !== 'ทั้งหมด' && String(t.area||'').trim() !== rCfg.area) return false;
      const stdP = getStdProj(t.project);
      if(rCfg.project !== 'ทั้งหมด' && stdP !== rCfg.project) return false;
      return true;
    });

    const rT = allPeriodTasks.filter(t => t.status !== 'ยกเลิก');
    const rCancel = allPeriodTasks.filter(t => t.status === 'ยกเลิก');

    const rC = rT.filter(t => t.status === 'จบงาน'); 
    const rOd = rT.filter(t => isTaskOvd(t, tS));
    const rO = rT.filter(t => t.status !== 'จบงาน' && !isTaskOvd(t, tS));
    
    const pSt = {}; 
    rT.forEach(t => { 
      const pName = getStdProj(t.project);
      if(!pSt[pName]) pSt[pName] = { t:0, d:0, o:0, od:0 }; 
      pSt[pName].t++; 
      if(t.status==='จบงาน') pSt[pName].d++; 
      else if(isTaskOvd(t, tS)) pSt[pName].od++; 
      else pSt[pName].o++; 
    });

    const unbilledTasks = rC.filter(t => t.billingStatus !== 'ส่งเบิกแล้ว'); const ub = unbilledTasks.length; const b = rC.filter(t => t.billingStatus === 'ส่งเบิกแล้ว').length;
    const ubBreakdown = {}; unbilledTasks.forEach(t => { let m = "ไม่ระบุเดือน"; if (t.completedDate) m = t.completedDate.substring(0,7); else if (t.endDate) m = t.endDate.substring(0,7); if (!ubBreakdown[m]) ubBreakdown[m] = 0; ubBreakdown[m]++; });
    const sortedUbMonths = Object.keys(ubBreakdown).sort();

    return (
      <div id="print-area" className="hidden p-8 font-sans bg-white">
        <div className="text-center border-b-2 border-[#0f2e4a] pb-4 mb-6"><h1 className="text-2xl font-bold text-[#0f2e4a] uppercase">รายงานผลการดำเนินงาน LH Task-Flow</h1><p className="text-sm text-gray-600 mt-2 font-bold">รอบ: {isY ? `ปี ${fS}` : `เดือน ${fS}`} | พื้นที่: {rCfg.area} | โครงการ: {rCfg.project}</p></div>
        <div className="flex gap-4 mb-8 print-break"><div className="flex-1 bg-gray-50 border p-4 rounded-lg text-center"><p className="text-xs text-gray-500 font-bold">ปริมาณงานที่ได้รับ</p><h2 className="text-2xl font-black">{rT.length}</h2></div><div className="flex-1 bg-green-50 border p-4 rounded-lg text-center"><p className="text-xs text-green-700 font-bold">งานที่จบแล้ว</p><h2 className="text-2xl font-black text-green-700">{rC.length}</h2></div><div className="flex-1 bg-yellow-50 border p-4 rounded-lg text-center"><p className="text-xs text-yellow-700 font-bold">ดำเนินการ</p><h2 className="text-2xl font-black text-yellow-700">{rO.length}</h2></div><div className="flex-1 bg-red-50 border p-4 rounded-lg text-center"><p className="text-xs text-red-700 font-bold">เกินกำหนด</p><h2 className="text-2xl font-black text-red-700">{rOd.length}</h2></div></div>
        <div className="mb-8 p-4 border rounded-lg bg-gray-50 print-break"><h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">สรุปส่งเบิก (เฉพาะงานที่จบแล้ว)</h3><div className="flex justify-between px-4 text-sm mb-2"><div><span className="font-bold text-green-600">ส่งเบิกแล้วทั้งหมดในระบบ:</span> {b} รายการ</div><div><span className="font-bold text-red-600">ค้างเบิก (สะสมทั้งหมด):</span> {ub} รายการ</div></div>{ub > 0 && (<div className="px-4 text-[11px] mt-3 border-t pt-3 text-gray-600 flex flex-wrap gap-2 items-center"><span className="font-bold text-gray-800">แจกแจงรายการค้างเบิกตามรอบเดือน:</span>{sortedUbMonths.map(m => (<span key={m} className="bg-white border border-gray-300 px-2 py-0.5 rounded shadow-sm text-red-600 font-bold">{m} : {ubBreakdown[m]} รายการ</span>))}</div>)}</div>
        <div className="mb-8 print-break"><h3 className="font-bold text-[#0f2e4a] mb-4 text-sm border-b pb-2">สถานะงานแยกตามโครงการ</h3><div className="space-y-3">{Object.keys(pSt).map(p => { const s = pSt[p]; return (<div key={p} className="flex items-center text-xs"><div className="w-1/4 font-bold truncate pr-2" title={p}>{p}</div><div className="w-2/4 bg-gray-200 h-5 rounded overflow-hidden flex">{s.t>0&&<div style={{width:`${(s.d/s.t)*100}%`}} className="bg-green-500 h-full"></div>}{s.t>0&&<div style={{width:`${(s.o/s.t)*100}%`}} className="bg-yellow-400 h-full"></div>}{s.t>0&&<div style={{width:`${(s.od/s.t)*100}%`}} className="bg-red-500 h-full"></div>}</div><div className="w-1/4 pl-3 text-[10px] text-gray-500">รวม {s.t} (จบ:{s.d}, ทำ:{s.o}, ช้า:{s.od})</div></div>); })}</div><div className="flex gap-4 text-[10px] justify-center mt-4 font-bold"><div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-sm mr-1"></span>จบงาน</div><div className="flex items-center"><span className="w-3 h-3 bg-yellow-400 rounded-sm mr-1"></span>กำลังดำเนินการ</div><div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-sm mr-1"></span>เกินกำหนด</div></div></div>
        <div className="print-break"><h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">งานที่ถูกยกเลิก</h3><table className="w-full text-[11px] text-left border-collapse border"><thead><tr className="bg-gray-100"><th className="border p-2">รหัสงาน</th><th className="border p-2">รายละเอียด</th><th className="border p-2">สถานะ</th><th className="border p-2">เหตุผล</th></tr></thead><tbody>{rCancel.map(t=>(<tr key={t.id}><td className="border p-2 font-bold text-blue-700">{t.workOrderNo || t.id}<br/><span className="text-gray-600 font-normal">{getStdProj(t.project)}</span></td><td className="border p-2">{t.details}</td><td className="border p-2 text-gray-500">ยกเลิก</td><td className="border p-2 text-red-600 font-bold">{t.cancelReason}</td></tr>))} {rCancel.length === 0 && <tr><td colSpan="4" className="border p-4 text-center text-gray-400">ไม่มีงานที่ถูกยกเลิกในรอบนี้</td></tr>}</tbody></table></div>
      </div>
    );
  };

  return (
    <React.Fragment>
      <GlobalStyles />
      {loading && (<div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[99999] flex flex-col justify-center items-center text-[#0f2e4a]"><Icon name="loader2" size={40} className="animate-spin mb-4 text-[#bca374]" /><h2 className="text-lg font-bold">กำลังประมวลผล...</h2></div>)}
      <PReport />
      <div className="w-full min-h-screen">
        <div id="app-main" className="flex h-screen overflow-hidden text-slate-800 print:hidden">
          <aside className="w-64 bg-[#0f2e4a] text-white hidden md:flex flex-col shadow-xl z-20">
            <div className="p-6 border-b border-white/10"><div className="text-xl font-bold text-[#bca374]">LH <span className="font-light text-white">TaskFlow</span></div></div>
            <nav className="p-4 space-y-1 flex-1">
              {[{i:'dashboard',l:'แดชบอร์ด', icon:'layoutDashboard'},{i:'daily',l:'งานรายวัน', icon:'listTodo'},{i:'monthly',l:'ปฏิทิน', icon:'calendar'},{i:'kanban',l:'ส่งเบิก', icon:'fileText'},{i:'inform',l:'แจ้งเปิดงาน', icon:'bell'},{i:'settings',l:'ตั้งค่า', icon:'settings'}].map(x=>(
                <button type="button" key={x.i} onClick={()=>{setTab(x.i);if(x.i!=='settings')setSetUnlk(false);}} className={`w-full text-left flex items-center px-4 py-3 rounded-lg text-xs font-bold transition-colors ${tab===x.i?'bg-[#bca374]':'hover:bg-white/10'}`}><Icon name={x.icon} size={16} className="mr-2"/>{x.l}</button>
              ))}
            </nav>
          </aside>
          <main className="flex-1 flex flex-col min-w-0 bg-[#f4f6f8] relative">
            <header className="bg-white h-14 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm"><div className="font-bold text-[#0f2e4a] text-sm md:text-base">WORK CENTER</div></header>
            <GFBar />
            <div className="flex-1 overflow-auto p-4 md:p-6 relative">
              {tab==='dashboard'&&rDash()} 
              {tab==='daily'&&rDail()} 
              {tab==='monthly'&&rMont()} 
              {tab==='kanban'&&rKanb()} 
              {tab==='inform'&&rInf()} 
              {tab==='settings'&&rSet()}
            </div>
          </main>
          <nav className="md:hidden fixed bottom-0 w-full bg-white border-t flex justify-around p-2 z-[999]">
            {[{i:'dashboard',l:'ภาพรวม', icon:'layoutDashboard'},{i:'daily',l:'รายวัน', icon:'listTodo'},{i:'monthly',l:'ปฏิทิน', icon:'calendar'},{i:'kanban',l:'ส่งเบิก', icon:'fileText'},{i:'inform',l:'แจ้งงาน', icon:'bell'},{i:'settings',l:'ตั้งค่า', icon:'settings'}].map(x=>(
              <button type="button" key={x.i} onClick={()=>{setTab(x.i);if(x.i!=='settings')setSetUnlk(false);}} className={`flex flex-col items-center p-2 w-14 ${tab===x.i?'text-[#bca374] -translate-y-1':'text-gray-400'} transition-transform`}><Icon name={x.icon} size={20} className={tab===x.i?'fill-current/20':''} /><div className="text-[9px] font-bold mt-1 truncate w-full text-center">{x.l}</div></button>
            ))}
          </nav>

          {oPop.isOpen && <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" onClick={()=>setOPop({isOpen:false, type:'daily'})}><div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}><div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-red-600 flex items-center"><Icon name="alertTriangle" size={18} className="mr-2"/> งานเกินกำหนด ({oPop.type==='daily' ? 'รายวัน' : 'รายเดือน'})</h3><button type="button" onClick={()=>setOPop({isOpen:false, type:'daily'})}><Icon name="x" size={18}/></button></div><div className="overflow-auto space-y-2 flex-1">{tasks.filter(t => isTaskOvd(t, oPop.type==='daily' ? gFilt.date : getTStr()) && t.status !== 'จบงาน' && (gFilt.area==='ทั้งหมด'||t.area===gFilt.area) && (gFilt.project==='ทั้งหมด'||getStdProj(t.project)===gFilt.project) && (oPop.type==='daily' ? ((gFilt.date >= t.startDate && gFilt.date <= t.endDate) || gFilt.date===getTStr()) : t.startDate.startsWith(gFilt.month))).map(t=>(<div key={t.id} className="p-3 border border-red-100 bg-red-50/50 rounded-lg flex justify-between items-center"><div><div className="font-bold text-sm text-[#0f2e4a]">{getStdProj(t.project)}</div><div className="text-xs text-gray-600">{t.details}</div><div className="text-[10px] text-red-500 mt-1 font-bold">ID: {t.id} | จบ: {fDate(t.endDate)} | สถานะ: {t.status}</div></div><button type="button" onClick={()=>{setOPop({isOpen:false, type:'daily'}); setGilt({...gFilt, date: t.endDate}); setTab('daily');}} className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded text-[10px] font-bold shadow-sm">จัดการ</button></div>))}</div></div></div>}
          
          {cPop.isOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" onClick={()=>setCPop({isOpen:false, date:null, tasks:[]})}>
              <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col animate-in" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-[#0f2e4a] flex items-center"><Icon name="calendar" size={18} className="mr-2 text-[#bca374]"/> งานประจำวันที่ {fDate(cPop.date)}</h3><button type="button" onClick={()=>setCPop({isOpen:false, date:null, tasks:[]})} className="text-gray-400 hover:text-gray-700"><Icon name="x" size={18}/></button></div>
                <div className="overflow-auto space-y-2 flex-1 pr-1 hide-scrollbar">
                  {cPop.tasks.map(t => {
                    const isOvd = isTaskOvd(t, cPop.date);
                    return (
                    <div key={t.id} className="p-3 border border-blue-100 bg-blue-50/30 rounded-lg flex justify-between items-center hover:bg-blue-50 transition-colors">
                      <div><div className="font-bold text-sm text-[#0f2e4a]">{getStdProj(t.project)}</div><div className="text-xs text-gray-600 line-clamp-1">{t.details}</div><div className="text-[10px] mt-1 font-bold"><span className="text-gray-400">ID: {t.id}</span><span className="mx-1 text-gray-300">|</span><span className={t.status==='จบงาน'?'text-green-600':isOvd?'text-red-600':'text-amber-600'}>สถานะ: {t.status} {(isOvd && t.status!=='จบงาน') ? '(เกินกำหนด)' : ''}</span></div></div><button type="button" onClick={()=>{setCPop({isOpen:false, date:null, tasks:[]});setGilt({...gFilt, date: cPop.date});setTab('daily');}} className="bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded text-[10px] font-bold shadow-sm hover:bg-blue-100 whitespace-nowrap ml-2">จัดการงาน</button>
                    </div>
                  )})}
                </div>
              </div>
            </div>
          )}

          {tMod && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-[#0f2e4a] p-4 flex justify-between text-white"><h3 className="font-bold">{eTask?'แก้ไข':'เพิ่ม'}งานประจำวัน</h3><button type="button" onClick={()=>{setTMod(false);setSReason('');setShowStartReason(false);}}><Icon name="x" size={18}/></button></div>
                <form onSubmit={subT} className="p-5 space-y-3 max-h-[70vh] overflow-auto">
                  <div><label className="text-[10px] font-bold text-gray-500">วันที่รับเรื่อง (ห้ามแก้ไขย้อนหลัง)</label><input type="date" name="receivedDate" required defaultValue={eTask?eTask.receivedDate:getTStr()} disabled={!!eTask} className="w-full border rounded p-2 text-sm bg-gray-50" /></div>
                  <textarea name="details" required defaultValue={eTask?.details} rows="2" placeholder="รายละเอียดงาน..." className="w-full border rounded p-2 text-sm outline-none"></textarea>
                  <div className="flex gap-2"><select name="requester" required defaultValue={eTask?.requester} className="w-1/2 border rounded p-2 text-sm"><option value="">ผู้แจ้ง...</option>{REQ_TYPES.map(r=><option key={r}>{r}</option>)}</select><select name="slaCategory" defaultValue={eTask?.slaCategory} className="w-1/2 border rounded p-2 text-sm"><option value="">หมวด SLA (ถ้ามี)...</option>{sets.slas.map(s=><option key={s} value={getProjName(s)}>{getProjName(s)} ({getProjArea(s)} วัน)</option>)}</select></div>
                  <div className="flex gap-2"><select name="project" required defaultValue={eTask ? getStdProj(eTask.project) : ''} onChange={(e)=>{ const p = sets.projects.find(x=>getProjName(x)===e.target.value); if(p) document.getElementById('task_area').value = getProjArea(p); }} className="w-2/3 border rounded p-2 text-sm"><option value="">โครงการ (เลือกเพื่อดึงพื้นที่)...</option>{sets.projects.map(p=><option key={p} value={getProjName(p)}>{getProjName(p)}</option>)}</select><input type="text" id="task_area" name="area" required readOnly defaultValue={eTask?.area} placeholder="พื้นที่..." className="w-1/3 border rounded p-2 text-sm bg-gray-100" /></div>
                  <div className="flex gap-2"><div className="w-1/2"><label className="text-[10px] font-bold">เริ่มงาน</label><input type="date" name="startDate" required defaultValue={eTask?.startDate||getTStr()} onChange={(e)=>eTask && setShowStartReason(e.target.value !== eTask.startDate)} className="w-full border rounded p-2 text-sm" /></div><div className="w-1/2"><label className="text-[10px] font-bold">กำหนดเสร็จ</label><input type="date" name="endDate" required defaultValue={eTask?.endDate||getTStr()} className="w-full border rounded p-2 text-sm" /></div></div>
                  {showStartReason && (<div className="mt-2 animate-in"><label className="text-[10px] font-bold text-red-500">เหตุผลที่เลื่อนวันเริ่ม (บังคับ) *</label><textarea required value={sRsn} onChange={e=>setSReason(e.target.value)} rows="2" className="w-full border border-red-300 rounded p-2 text-sm outline-none bg-red-50"></textarea></div>)}
                  <div className="text-right mt-4 flex gap-2"><button type="button" onClick={()=>{setTMod(false);setSReason('');setShowStartReason(false);}} className="bg-gray-200 px-4 py-2 rounded text-sm font-bold flex-1">ยกเลิก</button><button type="submit" disabled={showStartReason && !sRsn.trim()} className="bg-[#0f2e4a] text-white px-4 py-2 rounded text-sm font-bold flex-1 disabled:opacity-50">บันทึก</button></div>
                </form>
              </div>
            </div>
          )}

          {sMod.isOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                <h3 className={`font-bold text-lg mb-3 ${sMod.type==='cancel'?'text-red-500':'text-green-500'}`}>{sMod.type==='cancel'?'ยกเลิกงาน':'ยืนยันจบงาน'}</h3>
                <div className="space-y-3">
                  {sMod.type==='cancel' && (<div><label className="text-xs font-bold text-red-500">เหตุผลบังคับ *</label><textarea rows="2" className="w-full border rounded p-2 text-sm resize-none bg-red-50" value={sMod.reason} onChange={e=>setSMod({...sMod,reason:e.target.value})}></textarea></div>)}
                  {sMod.type==='complete' && (<div><label className="text-xs font-bold text-green-700">เลขที่ใบงาน (บังคับ: อักษร 2 ตัว-เลข 3 ตัว-เลข 7 ตัว) *</label><input type="text" placeholder="ตัวอย่าง: LH-123-1234567" className="w-full border border-green-300 bg-green-50 rounded p-2 text-sm uppercase" value={sMod.workOrderNo} onChange={e=>setSMod({...sMod,workOrderNo:e.target.value.toUpperCase()})} /></div>)}
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={()=>setSMod({...sMod,isOpen:false})} className="flex-1 bg-gray-100 p-2 text-xs font-bold rounded">ปิด</button><button type="button" onClick={cfSt} disabled={(sMod.type==='cancel'&&!sMod.reason.trim())||(sMod.type==='complete'&&!sMod.workOrderNo.trim())} className="flex-1 bg-[#0f2e4a] text-white p-2 text-xs font-bold rounded disabled:opacity-50">ยืนยัน</button>
                </div>
              </div>
            </div>
          )}
          
          {infView && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" onClick={()=>setInfView(null)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in" onClick={e=>e.stopPropagation()}>
                <div className="bg-[#0f2e4a] p-4 flex justify-between text-white"><h3 className="font-bold flex items-center"><Icon name="search" size={16} className="mr-2"/> รายละเอียดรับแจ้ง</h3><button type="button" onClick={()=>setInfView(null)}><Icon name="x" size={18}/></button></div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs border-b pb-3"><div><span className="text-gray-400 font-bold">วันที่แจ้ง</span><br/><span className="font-bold text-gray-800">{fDate(infView.date)}</span></div><div><span className="text-gray-400 font-bold">รหัสอ้างอิง</span><br/><span className="font-bold text-gray-800">{infView.id}</span></div><div><span className="text-gray-400 font-bold">ผู้แจ้ง</span><br/><span className="font-bold text-gray-800">{infView.requesterName}</span></div><div><span className="text-gray-400 font-bold">เบอร์ติดต่อ</span><br/><span className="font-bold text-gray-800">{infView.phone||'-'}</span></div><div><span className="text-gray-400 font-bold">โครงการ</span><br/><span className="font-bold text-[#bca374]">{getStdProj(infView.project)}</span></div><div><span className="text-gray-400 font-bold">พื้นที่</span><br/><span className="font-bold text-gray-800">{infView.area}</span></div></div>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-2"><div><span className="text-gray-400 font-bold">ประเภทงาน</span><br/><span className="font-bold text-[#0f2e4a]">{infView.jobType||'-'}</span></div><div><span className="text-gray-400 font-bold">บริเวณ</span><br/><span className="font-bold text-[#0f2e4a]">{infView.location||'-'}</span></div></div>
                  <div className="bg-gray-50 p-3 rounded-lg border text-sm shadow-inner"><span className="text-gray-500 font-bold text-xs mb-1 block">รายละเอียด:</span><div className="whitespace-pre-wrap text-gray-700">{infView.details || '-'}</div></div>
                  <div className="text-right pt-2"><button type="button" onClick={()=>setInfView(null)} className="bg-gray-200 px-6 py-2 rounded-lg text-sm font-bold w-full hover:bg-gray-300 transition">ปิดหน้าต่าง</button></div>
                </div>
              </div>
            </div>
          )}
          
          {iMod.isOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm">
                <h3 className={`font-bold mb-3 ${iMod.type==='cancel'?'text-red-500':'text-green-500'}`}>{iMod.type==='cancel'?'ยกเลิกแจ้งงาน':'เปิดงาน'}</h3>
                {iMod.type==='open' ? (<input placeholder="เลข Inform..." className="w-full border rounded p-2 text-sm uppercase" value={iMod.val} onChange={e=>setIMod({...iMod,val:e.target.value})}/>) : (<textarea placeholder="เหตุผล..." className="w-full border rounded p-2 text-sm resize-none" value={iMod.val} onChange={e=>setIMod({...iMod,val:e.target.value})}></textarea>)}
                <div className="flex gap-2 mt-4"><button type="button" onClick={()=>setIMod({...iMod,isOpen:false})} className="flex-1 bg-gray-100 p-2 text-xs rounded font-bold">ปิด</button><button type="button" onClick={cfInf} disabled={!iMod.val.trim()} className="flex-1 bg-[#0f2e4a] text-white p-2 text-xs rounded font-bold disabled:opacity-50">ยืนยัน</button></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}