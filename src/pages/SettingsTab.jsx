import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, deleteDoc } from 'firebase/firestore';

export default function SettingsTab({
  setUnlk,
  setSetUnlk,
  pwd,
  setPwd,
  tasks = [],
  informs = [],
  sets = {},
  setSets,
  saveD,
  rCfg,
  setRConfig,
  sInp,
  setSInp,
  upS,
  dlS,
  clearSList,
  getProjName,
  getProjArea,
  emForm = { name: '', email: '', selectedProjs: [] },
  setEmForm,
  toggleEmailProj,
  addEmailMappingV2,
  rmEmailProj,
  testEmailSystem,
  forceScanRealTasks,
  installTrigger,
  runMigration,
  downloadCSV,
  handleClearData,
  getTStr,
  Icon,
  db,
  getColRef,
  getDocRef
}) {
  const [activeTab, setActiveTab] = useState('projects');
  const [projSearch, setProjSearch] = useState('');

  // --- Bot Reports State & Handlers ---
  const [floodReports, setFloodReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportFilter, setReportFilter] = useState({ project: 'ทั้งหมด', status: 'ทั้งหมด', area: 'ทั้งหมด', search: '' });
  const [isDeleting, setIsDeleting] = useState(null);
  const [selectedReportForDelete, setSelectedReportForDelete] = useState(null);
  const [draftCount, setDraftCount] = useState(0);

  // --- Executive Summary State & Handlers ---
  const getTodayStr = () => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDaysAgoStr = (daysAgo) => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [execDateRange, setExecDateRange] = useState({
    start: getDaysAgoStr(2),
    end: getTodayStr()
  });
  const [execScope, setExecScope] = useState('focus'); // 'focus' | 'all' | 'critical'
  const [execArea, setExecArea] = useState('all'); // 'all' | 'province-ayutthaya' | 'province-pathumthani' | 'province-nonthaburi' | 'province-bkk' | 'zone-bkk-north' | 'zone-bkk-east' | 'zone-bkk-west'
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // ตรวจสอบว่ารายงานหรือโครงการอยู่ในพื้นที่/จังหวัดที่เลือกหรือไม่
  const isProjectInArea = (p, areaCode) => {
    if (!areaCode || areaCode === 'all' || areaCode === 'ทั้งหมด') return true;
    const code = (p.projectCode || p.code || '').toUpperCase();
    const areaStr = (p.projectArea || p.area || '').toLowerCase();
    const nameStr = (p.projectName || p.name || '').toLowerCase();
    const lat = Number(p.lat || 0);

    if (areaCode === 'province-ayutthaya') {
      return areaStr.includes('อยุธยา') || /LH-341|LH-328|NE-411/i.test(code) || (lat > 14.2);
    }
    if (areaCode === 'province-pathumthani') {
      return areaStr.includes('ปทุมธานี') || areaStr.includes('ธัญบุรี') || areaStr.includes('ลำลูกกา') || areaStr.includes('รังสิต') || areaStr.includes('บางคูวัด') || /LH-410|LH-415|NE-419|LH-419/i.test(code);
    }
    if (areaCode === 'province-nonthaburi') {
      return areaStr.includes('นนทบุรี') || areaStr.includes('บางบัวทอง') || areaStr.includes('บางใหญ่') || areaStr.includes('ปากเกร็ด') || /LH-323|LH-337|LH-354|LH-383|LH-406|LH-372|LH-420|LA-029/i.test(code);
    }
    if (areaCode === 'province-bkk') {
      return areaStr.includes('กรุงเทพ') || areaStr.includes('กทม') || /LH-379|LH-392|LH-395|LA-025|LH-120|LH-195|LH-225|LH-402|LH-329|LH-414|LH-421|LH-221|LH-205|LH-355|LH-288/i.test(code);
    }
    if (areaCode === 'zone-bkk-north') {
      return /LA-025|LH-402|LH-195|LH-120|LH-225/i.test(code) || /สายไหม|คลองสามวา|บางเขน|ออเงิน|จตุโชติ|หนองระแหง|หทัยราษฎร์|ท่าแร้ง/i.test(areaStr + ' ' + nameStr);
    }
    if (areaCode === 'zone-bkk-east') {
      return /LH-379|LH-392|LH-395|LH-329/i.test(code) || /สะพานสูง|มีนบุรี|กรุงเทพกรีฑา|ร่มเกล้า/i.test(areaStr + ' ' + nameStr);
    }
    if (areaCode === 'zone-bkk-west') {
      return /LH-414|LH-421|LH-221|LH-205|LH-355|LH-288/i.test(code) || /ทวีวัฒนา|ตลิ่งชัน|หนองแขม|บางขุนเทียน|พระราม 2|พรานนก|ปิ่นเกล้า|เพชรเกษม|แสมดำ/i.test(areaStr + ' ' + nameStr);
    }
    return true;
  };

  const fetchReports = async () => {
    if (!getColRef) return;
    setLoadingReports(true);
    try {
      const snap = await getDocs(getColRef('flood_reports'));
      const list = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), id: d.id });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setFloodReports(list);

      const draftSnap = await getDocs(getColRef('flood_drafts'));
      setDraftCount(draftSnap.size);
    } catch (err) {
      console.error('Fetch flood reports error:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (setUnlk) {
      fetchReports();
    }
  }, [setUnlk, activeTab]);

  const confirmDeleteReport = async () => {
    if (!selectedReportForDelete) return;
    const rId = selectedReportForDelete.reportId || selectedReportForDelete.id;
    setIsDeleting(rId);
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      // 1. Delete all photos in subcollection
      const photosCol = collection(db, 'artifacts', appId, 'public', 'data', 'flood_reports', rId, 'photos');
      const photosSnap = await getDocs(photosCol);
      const delPromises = [];
      photosSnap.forEach((p) => {
        delPromises.push(deleteDoc(p.ref));
      });
      await Promise.all(delPromises);

      // 2. Delete main document
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'flood_reports', rId);
      await deleteDoc(docRef);

      // 3. Update state
      setFloodReports((prev) => prev.filter((r) => (r.reportId || r.id) !== rId));
      setSelectedReportForDelete(null);
    } catch (err) {
      console.error('Delete report error:', err);
      alert('❌ เกิดข้อผิดพลาดในการลบเอกสาร: ' + (err.message || err));
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClearDrafts = async () => {
    if (!window.confirm('⚠️ ต้องการล้างรอบรายงานที่ค้างอยู่ (Draft Sessions) ทั้งหมดใช่หรือไม่?\n\nฟังก์ชันนี้ใช้สำหรับเคลียร์คิวกรณีแอดมินส่งรูปผิดหรือส่งไม่ครบ')) return;
    try {
      const draftsCol = getColRef('flood_drafts');
      const draftsSnap = await getDocs(draftsCol);
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      for (const d of draftsSnap.docs) {
        const dPhotosCol = collection(db, 'artifacts', appId, 'public', 'data', 'flood_drafts', d.id, 'photos');
        const dPhotosSnap = await getDocs(dPhotosCol);
        for (const dp of dPhotosSnap.docs) {
          await deleteDoc(dp.ref);
        }
        await deleteDoc(d.ref);
      }
      setDraftCount(0);
      alert('✅ ล้างเซสชันรายงานค้างเรียบร้อยแล้ว');
    } catch (e) {
      alert('❌ เกิดข้อผิดพลาด: ' + e.message);
    }
  };

  const handleOpenExecutivePdf = () => {
    const url = `/api/flood-report?mode=executive&start=${execDateRange.start}&end=${execDateRange.end}&scope=${execScope}&area=${execArea}`;
    window.open(url, '_blank');
  };

  const handleExportExecutiveExcel = async () => {
    setIsExportingExcel(true);
    try {
      const XLSX = await import('xlsx');
      const startTs = new Date(`${execDateRange.start}T00:00:00+07:00`).getTime();
      const endTs = new Date(`${execDateRange.end}T23:59:59+07:00`).getTime();

      const matchingReports = floodReports.filter((r) => {
        const ts = r.createdAt || Date.now();
        if (ts < startTs || ts > endTs) return false;
        if (!isProjectInArea(r, execArea)) return false;
        if (execScope === 'focus') {
          return r.status === 'WATCH' || r.status === 'CRITICAL';
        }
        if (execScope === 'critical') {
          return r.status === 'CRITICAL';
        }
        return true; // 'all'
      });

      if (matchingReports.length === 0) {
        alert('⚠️ ไม่พบข้อมูลรายงานที่ตรงกับช่วงวันที่ ขอบเขตสถานะ หรือพื้นที่ที่เลือก');
        return;
      }

      const rows = matchingReports.map((r, idx) => ({
        'ลำดับ': idx + 1,
        'รหัสเอกสาร': r.reportId || r.id,
        'วันที่สำรวจ': r.surveyDateThai || '-',
        'เวลา (น.)': r.surveyTimeThai || '-',
        'รหัสโครงการ': r.projectCode || '-',
        'ชื่อโครงการ': r.projectName || '-',
        'พื้นที่/โซน': r.projectArea || '-',
        'สถานะความเสี่ยง': r.status === 'CRITICAL' ? '🔴 วิกฤติ (CRITICAL)' : r.status === 'WATCH' ? '🟡 เฝ้าระวัง (WATCH)' : '🟢 ปกติ (NORMAL)',
        'ระดับน้ำผิวถนน': r.waterLevel || '-',
        'สภาพคลองและทางระบาย': r.drainageCondition || '-',
        'สถานะเครื่องสูบน้ำ': r.pumpsRunning || '-',
        'บทวิเคราะห์และการประเมิน': r.executiveSummary || r.notes || '-',
        'สถานีตรวจวัดน้ำอ้างอิง': r.waterStation || '-',
        'จำนวนภาพถ่าย': r.photoCount || 0
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Executive_Summary');

      const colWidths = Object.keys(rows[0] || {}).map((k) => ({
        wch: Math.max(k.length * 2, 16)
      }));
      worksheet['!cols'] = colWidths;

      const areaSuffix = execArea !== 'all' ? `_${execArea}` : '';
      XLSX.writeFile(workbook, `LH_Flood_Executive_Summary_${execDateRange.start}_to_${execDateRange.end}${areaSuffix}.xlsx`);
    } catch (err) {
      console.error('Export Excel error:', err);
      alert('❌ เกิดข้อผิดพลาดในการส่งออก Excel: ' + (err.message || err));
    } finally {
      setIsExportingExcel(false);
    }
  };

  const normalReportsCount = floodReports.filter((r) => r.status === 'NORMAL').length;
  const watchReportsCount = floodReports.filter((r) => r.status === 'WATCH').length;
  const criticalReportsCount = floodReports.filter((r) => r.status === 'CRITICAL').length;
  const totalReportPhotos = floodReports.reduce((sum, r) => sum + (r.photoCount || 0), 0);

  const filteredFloodReports = floodReports.filter((r) => {
    if (reportFilter.area && reportFilter.area !== 'ทั้งหมด') {
      if (!isProjectInArea(r, reportFilter.area)) return false;
    }
    if (reportFilter.project !== 'ทั้งหมด') {
      const pCode = r.projectCode || '';
      const pName = r.projectName || '';
      if (!pCode.includes(reportFilter.project) && !pName.includes(reportFilter.project)) return false;
    }
    if (reportFilter.status !== 'ทั้งหมด') {
      if (r.status !== reportFilter.status) return false;
    }
    if (reportFilter.search) {
      const q = reportFilter.search.toLowerCase().trim();
      const matchId = (r.reportId || '').toLowerCase().includes(q);
      const matchProj = (r.projectName || '').toLowerCase().includes(q) || (r.projectCode || '').toLowerCase().includes(q);
      const matchSum = (r.executiveSummary || r.notes || '').toLowerCase().includes(q);
      if (!matchId && !matchProj && !matchSum) return false;
    }
    return true;
  });

  if (!setUnlk) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center max-w-sm mx-auto mt-12 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-[#0f2e4a]/10 text-[#0f2e4a] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#0f2e4a]/20">
          <Icon name="lock" size={26} color="#0f2e4a" />
        </div>
        <h2 className="text-xl font-bold mb-1 text-[#0f2e4a]">เข้าสู่ระบบแอดมิน</h2>
        <p className="text-xs text-gray-500 mb-5">กรุณาระบุรหัสผ่านเพื่อเข้าถึงการตั้งค่าระบบ</p>
        <input
          type="password"
          placeholder="••••"
          className="border-2 border-gray-200 focus:border-[#bca374] p-3 rounded-xl w-full mb-4 text-center tracking-widest text-xl font-bold outline-none transition"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && pwd === '1312' && setSetUnlk(true)}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            if (pwd === '1312') setSetUnlk(true);
            else alert('รหัสผ่านไม่ถูกต้อง');
          }}
          className="bg-[#0f2e4a] hover:bg-[#1a3f63] text-white px-5 py-3 rounded-xl w-full font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-95 text-sm"
        >
          ยืนยันรหัสผ่าน
        </button>
      </div>
    );
  }

  const totalRows = tasks.length + informs.length;
  const healthPct = Math.min((totalRows / 3000) * 100, 100);
  const healthColor =
    totalRows < 1500 ? 'bg-emerald-500' : totalRows < 2500 ? 'bg-amber-500' : 'bg-rose-500';

  const groupedProjects = (sets.projects || []).reduce((acc, curr) => {
    const p = getProjName(curr);
    const a = getProjArea(curr);
    if (!acc[a]) acc[a] = [];
    acc[a].push({ fullStr: curr, name: p });
    return acc;
  }, {});

  const groupedSlas = (sets.slas || []).reduce((acc, curr) => {
    const cat = getProjName(curr);
    const days = getProjArea(curr);
    if (!acc[days]) acc[days] = [];
    acc[days].push({ fullStr: curr, name: cat });
    return acc;
  }, {});

  // Cascading filters for PDF export in Datacenter Tab
  const rStaffEntries = (sets.emails || []).filter(
    (e) => (e.split('|')[2] || e.split('|')[0].split('@')[0]) === rCfg.staffName
  );
  const rStaffProjs = rStaffEntries.flatMap((e) =>
    (e.split('|')[1] || '').split(',').map((p) => p.trim())
  ).filter(Boolean);
  const rStaffHasAll = rStaffProjs.includes('ทั้งหมด');

  const rStaffFilteredProjects =
    rCfg.staffName === 'ทั้งหมด' || rStaffHasAll
      ? sets.projects || []
      : (sets.projects || []).filter((p) => rStaffProjs.includes(getProjName(p)));

  const rAvailableAreas =
    rCfg.staffName === 'ทั้งหมด' || rStaffHasAll
      ? sets.areas || []
      : Array.from(new Set(rStaffFilteredProjects.map((p) => getProjArea(p)).filter(Boolean)));

  const rAvailableProjects = rStaffFilteredProjects.filter(
    (p) => rCfg.area === 'ทั้งหมด' || getProjArea(p) === rCfg.area
  );

  const handleEditEmail = (item) => {
    const parts = item.split('|');
    const email = parts[0] || '';
    const projs = parts[1] ? parts[1].split(',') : [];
    const name = parts[2] || '';
    if (setEmForm) {
      setEmForm({ name, email, selectedProjs: projs });
    }
  };

  // Nav categories config
  const navTabs = [
    {
      id: 'projects',
      label: 'ข้อมูลโครงการ & พื้นที่',
      sub: 'Projects & Master Data',
      icon: 'building',
      badge: (sets.projects || []).length
    },
    {
      id: 'sla',
      label: 'เกณฑ์เวลา & SLA',
      sub: 'Service Level & Thresholds',
      icon: 'clock',
      badge: (sets.slas || []).length
    },
    {
      id: 'emails',
      label: 'สิทธิ์รับอีเมลแจ้งเตือน',
      sub: 'Recipients & Notifications',
      icon: 'mail',
      badge: (sets.emails || []).length
    },
    {
      id: 'datacenter',
      label: 'รายงาน & ศูนย์ข้อมูล',
      sub: 'Reports & Data Center',
      icon: 'database',
      badge: null
    },
    {
      id: 'bot_reports',
      label: 'คลังเอกสาร & จัดการบอท',
      sub: 'Bot Reports & Data Management',
      icon: 'fileText',
      badge: floodReports.length > 0 ? floodReports.length : null
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* LH Prestige Corporate Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-8 border-l-[#0f2e4a]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#bca374] bg-[#bca374]/15 px-2.5 py-0.5 rounded-full">
              Land & Houses Public Company Limited
            </span>
            <span className="text-[11px] text-gray-400 font-medium">ฝ่ายบริการหลังการขาย</span>
          </div>
          <h2 className="text-2xl font-black text-[#0f2e4a] tracking-tight flex items-center gap-2">
            <Icon name="settings" size={24} className="text-[#bca374]" />
            ระบบตั้งค่าคอนฟิกกลาง (System Configuration)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            ศูนย์กลางบริหารข้อมูลโครงการ กรอบเวลา SLA สิทธิ์การแจ้งเตือนอีเมล และการสำรองข้อมูล
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSetUnlk(false)}
          className="self-start md:self-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <Icon name="lock" size={14} /> ออกจากแอดมิน
        </button>
      </div>

      {/* Segmented Sub-Navigation (LH 3S Clean Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/60 shadow-inner">
        {navTabs.map((tabItem) => {
          const isActive = activeTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setActiveTab(tabItem.id)}
              className={`p-3 rounded-xl text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                isActive
                  ? 'bg-white text-[#0f2e4a] shadow-md border-b-2 border-b-[#bca374] font-bold'
                  : 'text-gray-600 hover:bg-white/60 hover:text-[#0f2e4a]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon
                  name={tabItem.icon}
                  size={18}
                  className={isActive ? 'text-[#bca374]' : 'text-gray-400'}
                />
                {tabItem.badge !== null && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      isActive ? 'bg-[#0f2e4a] text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {tabItem.badge}
                  </span>
                )}
              </div>
              <div className="text-xs font-bold truncate">{tabItem.label}</div>
              <div className="text-[10px] text-gray-400 truncate">{tabItem.sub}</div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ข้อมูลโครงการ & พื้นที่ (Projects & Master Data) */}
      {/* ========================================================================= */}
      {activeTab === 'projects' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base text-[#0f2e4a] flex items-center gap-2">
                  <Icon name="building" size={20} className="text-[#bca374]" />
                  จัดกลุ่มโครงการตามพื้นที่ (Projects by Area)
                </h3>
                <p className="text-xs text-gray-400">
                  รายชื่อโครงการทั้งหมดที่เปิดดูแล พร้อมพื้นที่ประจำการ
                </p>
              </div>
              <button
                type="button"
                onClick={() => clearSList('projects')}
                className="text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg flex items-center self-start sm:self-auto font-bold transition"
              >
                <Icon name="trash" size={14} className="mr-1" /> ลบโครงการทั้งหมด
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 hide-scrollbar">
              {Object.keys(groupedProjects).map((area) => (
                <div
                  key={area}
                  className="border border-gray-200/80 rounded-xl overflow-hidden shadow-xs bg-slate-50/50 flex flex-col"
                >
                  <div className="bg-[#0f2e4a] text-white px-3.5 py-2.5 text-xs font-bold flex justify-between items-center">
                    <span>📍 {area || 'ไม่ได้ระบุพื้นที่'}</span>
                    <span className="bg-[#bca374] text-[#0f2e4a] px-2 py-0.5 rounded text-[10px] font-black">
                      {groupedProjects[area].length} โครงการ
                    </span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-1.5 bg-white flex-1 content-start">
                    {groupedProjects[area].map((p) => (
                      <span
                        key={p.fullStr}
                        className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs flex items-center transition"
                      >
                        {p.name}
                        <button
                          type="button"
                          onClick={() => dlS('projects', p.fullStr)}
                          className="ml-1.5 text-gray-400 hover:text-rose-600 cursor-pointer"
                          title="ลบโครงการนี้"
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* เพิ่มโครงการใหม่ */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="ชื่อโครงการใหม่ (เช่น มัณฑนา บางนา)..."
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex-1 min-w-0 bg-gray-50 focus:bg-white focus:border-[#bca374] outline-none transition"
                value={sInp.projects || ''}
                onChange={(e) => setSInp({ ...sInp, projects: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sInp.projects && sInp.projArea) {
                    upS('projects', `${sInp.projects}|${sInp.projArea}`);
                  }
                }}
              />
              <select
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full sm:w-40 bg-gray-50 focus:bg-white focus:border-[#bca374] outline-none transition font-medium"
                value={sInp.projArea || ''}
                onChange={(e) => setSInp({ ...sInp, projArea: e.target.value })}
              >
                <option value="">เลือกพื้นที่...</option>
                {(sets.areas || []).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  sInp.projects &&
                  sInp.projArea &&
                  upS('projects', `${sInp.projects}|${sInp.projArea}`)
                }
                className="bg-[#0f2e4a] hover:bg-[#1a3f63] text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow font-bold text-xs flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="plus" size={16} className="mr-1.5" /> เพิ่มโครงการ
              </button>
            </div>
          </div>

          {/* ข้อมูลพื้นฐาน 3 หมวด (พื้นที่, ประเภทงาน, บริเวณ) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { k: 'areas', l: 'พื้นที่ (Areas)', icon: 'mapPin' },
              { k: 'jobTypes', l: 'ประเภทงาน (Job Types)', icon: 'wrench' },
              { k: 'locations', l: 'บริเวณ (Locations)', icon: 'navigation' }
            ].map((x) => (
              <div
                key={x.k}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[340px]"
              >
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                  <h3 className="font-bold text-xs text-[#0f2e4a] flex items-center gap-1.5">
                    <Icon name={x.icon} size={15} className="text-[#bca374]" />
                    {x.l}
                  </h3>
                  <button
                    type="button"
                    onClick={() => clearSList(x.k)}
                    className="text-[10px] text-rose-500 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded font-semibold"
                  >
                    ลบทั้งหมด
                  </button>
                </div>
                <ul className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs hide-scrollbar">
                  {(sets[x.k] || []).map((item) => (
                    <li
                      key={item}
                      className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 px-3 py-1.5 border border-gray-200/70 rounded-lg shadow-2xs transition"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => dlS(x.k, item)}
                        className="text-gray-400 hover:text-rose-600 p-0.5"
                      >
                        <Icon name="x" size={13} />
                      </button>
                    </li>
                  ))}
                  {(!sets[x.k] || sets[x.k].length === 0) && (
                    <li className="text-center text-gray-400 py-6 text-xs">ไม่มีข้อมูล</li>
                  )}
                </ul>
                <div className="mt-3 flex gap-1.5 pt-3 border-t border-gray-100">
                  <input
                    type="text"
                    placeholder={`เพิ่ม${x.l.split(' ')[0]}...`}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs flex-1 min-w-0 bg-gray-50 focus:bg-white outline-none"
                    value={sInp[x.k] || ''}
                    onChange={(e) => setSInp({ ...sInp, [x.k]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && upS(x.k, sInp[x.k])}
                  />
                  <button
                    type="button"
                    onClick={() => upS(x.k, sInp[x.k])}
                    className="bg-[#0f2e4a] text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-[#1a3f63] cursor-pointer"
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* คลาสและตำแหน่งงาน */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-sm text-[#0f2e4a] mb-3 flex items-center gap-2">
              <Icon name="users" size={18} className="text-[#bca374]" />
              คลาสและตำแหน่งงานในสายปฏิบัติการ (Staff Classes & Roles)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {(sets.staffClasses || []).map((c) => (
                <div
                  key={c.id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex justify-between items-center"
                >
                  <span className="font-bold text-xs text-[#0f2e4a]">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      let ns = (sets.staffClasses || []).filter((x) => x.id !== c.id);
                      const newSets = { ...sets, staffClasses: ns };
                      setSets(newSets);
                      saveD('settings', newSets);
                    }}
                    className="text-gray-400 hover:text-rose-600 p-1"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="ชื่อตำแหน่งงานใหม่ (เช่น Supervisor, Lead Engineer)..."
                className="border border-gray-200 rounded-xl px-3 py-2 text-xs flex-1 bg-gray-50 focus:bg-white outline-none"
                value={sInp.className || ''}
                onChange={(e) => setSInp({ ...sInp, className: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (!sInp.className) return alert('ใส่ชื่อตำแหน่ง');
                    let ns = [...(sets.staffClasses || [])];
                    ns.push({ id: Date.now().toString(), name: sInp.className });
                    const newSets = { ...sets, staffClasses: ns };
                    setSets(newSets);
                    saveD('settings', newSets);
                    setSInp({ ...sInp, className: '' });
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (!sInp.className) return alert('ใส่ชื่อตำแหน่ง');
                  let ns = [...(sets.staffClasses || [])];
                  ns.push({ id: Date.now().toString(), name: sInp.className });
                  const newSets = { ...sets, staffClasses: ns };
                  setSets(newSets);
                  saveD('settings', newSets);
                  setSInp({ ...sInp, className: '' });
                }}
                className="bg-[#bca374] hover:bg-[#a38a5b] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                เพิ่มคลาส
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: เกณฑ์เวลา & SLA (SLA & Cutoff Times) */}
      {/* ========================================================================= */}
      {activeTab === 'sla' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SLA Categories list */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-base text-[#0f2e4a] flex items-center gap-2">
                    <Icon name="clock" size={20} className="text-[#bca374]" />
                    หมวดงาน ➔ กรอบเวลาส่งมอบ (SLA Categories)
                  </h3>
                  <p className="text-xs text-gray-400">
                    กำหนดจำนวนวัน SLA สำหรับแต่ละหมวดงาน เพื่อใช้ตรวจจับการเกินกำหนดอัตโนมัติ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => clearSList('slas')}
                  className="text-xs text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg flex items-center font-bold transition"
                >
                  <Icon name="trash" size={14} className="mr-1" /> ลบทั้งหมด
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[450px] pr-2 hide-scrollbar space-y-3.5">
                {Object.keys(groupedSlas)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((days) => (
                    <div
                      key={days}
                      className="border border-amber-200/80 rounded-xl overflow-hidden shadow-xs bg-amber-50/20"
                    >
                      <div className="bg-amber-100/90 text-amber-900 px-3.5 py-2 text-xs font-bold flex justify-between items-center border-b border-amber-200">
                        <span>⏳ กำหนด SLA {days} วัน</span>
                        <span className="bg-white text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-amber-200">
                          {groupedSlas[days].length} หมวดงาน
                        </span>
                      </div>
                      <div className="p-3 flex flex-wrap gap-2 bg-white">
                        {groupedSlas[days].map((item) => (
                          <span
                            key={item.fullStr}
                            className="bg-amber-50/60 border border-amber-200 text-amber-900 px-2.5 py-1.5 rounded-lg text-xs flex items-center shadow-2xs font-medium"
                          >
                            {item.name}
                            <button
                              type="button"
                              onClick={() => dlS('slas', item.fullStr)}
                              className="ml-2 text-amber-400 hover:text-rose-600 cursor-pointer"
                              title="ลบหมวดงานนี้"
                            >
                              <Icon name="x" size={13} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-5 flex gap-2 pt-4 border-t border-gray-100">
                <input
                  type="text"
                  placeholder="ชื่อหมวดงาน SLA (เช่น งานซ่อมสุขภัณฑ์)..."
                  className="border border-gray-200 rounded-xl px-3.5 py-2 text-sm flex-1 min-w-0 bg-gray-50 focus:bg-white outline-none"
                  value={sInp.slas || ''}
                  onChange={(e) => setSInp({ ...sInp, slas: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="วัน"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-24 bg-gray-50 focus:bg-white text-center font-bold outline-none"
                  value={sInp.slaDays || ''}
                  onChange={(e) => setSInp({ ...sInp, slaDays: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() =>
                    sInp.slas &&
                    sInp.slaDays &&
                    upS('slas', `${sInp.slas}|${sInp.slaDays}`)
                  }
                  className="bg-[#bca374] hover:bg-[#a38a5b] text-white px-5 rounded-xl font-bold text-xs shadow transition cursor-pointer"
                >
                  <Icon name="plus" size={16} className="inline mr-1" /> เพิ่ม SLA
                </button>
              </div>
            </div>

            {/* Cutoff policies */}
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-[#0f2e4a] border-b pb-2 flex items-center gap-2">
                  <Icon name="sliders" size={18} className="text-[#bca374]" />
                  นโยบายการตัดรอบ (Cutoff Policies)
                </h3>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    ⏰ เวลาตัดเกณฑ์ Overdue ประจำวัน
                  </label>
                  <p className="text-[11px] text-gray-400 mb-2">
                    หากเลยเวลานี้ในวันที่กำหนดจบงาน งานจะถูกปรับเป็น "เกินกำหนด" อัตโนมัติ
                  </p>
                  <input
                    type="time"
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#bca374] w-full font-bold text-[#0f2e4a]"
                    value={sets.overdueTime || '17:30'}
                    onChange={(e) => upS('overdueTime', e.target.value, false)}
                  />
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    📄 ขีดจำกัดออกใบงานช้า (ชั่วโมง)
                  </label>
                  <p className="text-[11px] text-gray-400 mb-2">
                    ระยะเวลาสูงสุดที่อนุญาตให้จบงานค้างโดยยังไม่ได้แนบเลขใบงาน (WO)
                  </p>
                  <input
                    type="number"
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-full outline-none bg-gray-50 focus:bg-white focus:border-[#bca374] font-bold text-[#0f2e4a]"
                    value={sets.lateWorkOrderHours || 24}
                    onChange={(e) => upS('lateWorkOrderHours', e.target.value, false)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: รายชื่อ & สิทธิ์รับอีเมล (Emails & Notifications) - Requirement 3 */}
      {/* ========================================================================= */}
      {activeTab === 'emails' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form to Add / Edit Email Mapping (Restored & Enhanced) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <h3 className="font-bold text-base text-[#0f2e4a] flex items-center gap-2">
                    <Icon name="mailPlus" size={20} className="text-[#bca374]" />
                    เพิ่ม/แก้ไขสิทธิ์รับอีเมล
                  </h3>
                  {emForm.email && (
                    <button
                      type="button"
                      onClick={() => setEmForm({ name: '', email: '', selectedProjs: [] })}
                      className="text-[11px] text-gray-500 hover:text-gray-700 underline font-semibold"
                    >
                      ล้างฟอร์ม
                    </button>
                  )}
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      ชื่อ-นามสกุล เจ้าหน้าที่
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น สมชาย ใจดี หรือชื่อเล่น..."
                      className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs w-full bg-gray-50 focus:bg-white focus:border-[#bca374] outline-none transition"
                      value={emForm.name || ''}
                      onChange={(e) => setEmForm({ ...emForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      อีเมลผู้รับแจ้งเตือน (@lh.co.th) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="username@lh.co.th"
                      className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs w-full bg-gray-50 focus:bg-white focus:border-[#bca374] outline-none transition"
                      value={emForm.email || ''}
                      onChange={(e) => setEmForm({ ...emForm, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="font-bold text-gray-700">
                        เลือกโครงการที่รับผิดชอบ <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400 font-semibold">
                        เลือกแล้ว {emForm.selectedProjs.includes('ทั้งหมด') ? 'ทุกโครงการ' : `${emForm.selectedProjs.length} โครงการ`}
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded-xl bg-gray-50 p-2.5 max-h-56 overflow-y-auto space-y-1.5 hide-scrollbar">
                      {/* Toggle All */}
                      <label className="flex items-center text-xs p-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer transition font-bold text-amber-900 border border-amber-200/60">
                        <input
                          type="checkbox"
                          className="mr-2 rounded text-[#bca374] focus:ring-0"
                          checked={emForm.selectedProjs.includes('ทั้งหมด')}
                          onChange={() => toggleEmailProj('ทั้งหมด')}
                        />
                        <span>🌟 ทั้งหมด (รับแจ้งเตือนทุกโครงการในระบบ)</span>
                      </label>

                      {/* Search box inside project picker */}
                      <input
                        type="text"
                        placeholder="พิมพ์ค้นหาโครงการ..."
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] outline-none"
                        value={projSearch}
                        onChange={(e) => setProjSearch(e.target.value)}
                      />

                      {/* Individual projects */}
                      {(sets.projects || [])
                        .filter((p) =>
                          getProjName(p).toLowerCase().includes(projSearch.toLowerCase())
                        )
                        .map((p) => {
                          const pName = getProjName(p);
                          const isChecked =
                            emForm.selectedProjs.includes(pName) ||
                            emForm.selectedProjs.includes('ทั้งหมด');
                          return (
                            <label
                              key={pName}
                              className={`flex items-center text-[11px] px-2 py-1 rounded-md cursor-pointer transition ${
                                isChecked
                                  ? 'bg-blue-50 text-[#0f2e4a] font-semibold'
                                  : 'text-gray-600 hover:bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mr-2 rounded text-[#0f2e4a] focus:ring-0"
                                checked={isChecked}
                                onChange={() => toggleEmailProj(pName)}
                              />
                              <span className="truncate">{pName}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={addEmailMappingV2}
                  className="w-full bg-[#0f2e4a] hover:bg-[#1a3f63] text-white py-3 rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Icon name="check" size={16} /> บันทึกสิทธิ์รับอีเมล
                </button>
              </div>
            </div>

            {/* List of current email recipients */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-base text-[#0f2e4a] flex items-center gap-2">
                    <Icon name="users" size={20} className="text-[#bca374]" />
                    รายชื่อผู้รับอีเมลปัจจุบัน (Active Recipients)
                  </h3>
                  <p className="text-xs text-gray-400">
                    เจ้าหน้าที่และโครงการที่จะได้รับอีเมลแจ้งเตือนเมื่อเกิดเหตุการณ์
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => clearSList('emails')}
                  className="text-xs text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg flex items-center font-bold transition"
                >
                  <Icon name="trash" size={14} className="mr-1" /> ลบทั้งหมด
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 hide-scrollbar space-y-3">
                {(sets.emails || []).map((item) => {
                  const parts = item.split('|');
                  const em = parts[0];
                  const projs = parts[1] ? parts[1].split(',') : ['ทั้งหมด'];
                  const name = parts[2] || '';
                  const hasAll = projs.includes('ทั้งหมด');

                  return (
                    <div
                      key={item}
                      className="bg-gray-50 hover:bg-slate-50 border border-gray-200/80 rounded-xl p-3.5 shadow-xs flex justify-between items-start transition"
                    >
                      <div className="space-y-1.5 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-[#0f2e4a]">
                            {name || em.split('@')[0]}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">({em})</span>
                        </div>
                        <div className="text-[11px] text-gray-600 flex flex-wrap gap-1 items-center">
                          <span className="font-bold text-gray-400 mr-1">โครงการที่ดูแล:</span>
                          {hasAll ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-md text-[10px]">
                              🌟 ทุกโครงการในระบบ
                            </span>
                          ) : (
                            projs.map((p) => (
                              <span
                                key={p}
                                className="bg-white text-gray-700 border border-gray-200 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 shadow-2xs"
                              >
                                {p}
                                <button
                                  type="button"
                                  onClick={() => rmEmailProj(item, p)}
                                  className="text-gray-400 hover:text-rose-600"
                                  title={`ลบโครงการ ${p}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditEmail(item)}
                          className="text-[#0f2e4a] hover:bg-gray-200/80 p-1.5 rounded-lg transition"
                          title="แก้ไขสิทธิ์"
                        >
                          <Icon name="pencil" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => dlS('emails', item)}
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                          title="ลบผู้รับนี้"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(!sets.emails || sets.emails.length === 0) && (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    ยังไม่มีรายชื่อผู้รับอีเมล กรุณาเพิ่มที่ฟอร์มด้านซ้าย
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email Testing Tools */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon name="send" size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0f2e4a]">ทดสอบระบบส่งอีเมลแจ้งเตือน (Testing Suite)</h4>
                <p className="text-xs text-gray-400">ตรวจสอบการเชื่อมต่อ Brevo API, GAS Webhook และทดสอบยิงอีเมล</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={testEmailSystem}
                className="flex-1 md:flex-initial bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition shadow-xs"
              >
                ทดสอบ Ping API
              </button>
              <button
                type="button"
                onClick={forceScanRealTasks}
                className="flex-1 md:flex-initial bg-purple-50 text-purple-700 border border-purple-200 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-purple-100 transition shadow-xs"
              >
                สแกนงานล่าช้าจริง
              </button>
              <button
                type="button"
                onClick={installTrigger}
                className="flex-1 md:flex-initial bg-amber-50 text-amber-700 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-amber-100 transition shadow-xs"
              >
                ติดตั้ง Bot แจ้งเตือน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: รายงาน & ศูนย์ข้อมูล (Reports & Data Center) */}
      {/* ========================================================================= */}
      {activeTab === 'datacenter' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* PDF Report Export with Cascading Filters */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-t-4 border-t-[#bca374]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-bold text-base text-[#0f2e4a] flex items-center gap-2">
                  <Icon name="fileText" size={20} className="text-[#0f2e4a]" />
                  ส่งออกรายงานสรุปสำหรับผู้บริหาร (Executive PDF Report)
                </h3>
                <p className="text-xs text-gray-400">
                  พิมพ์รายงานสรุปผลการดำเนินงาน หรือดาวน์โหลดเป็นไฟล์ PDF พร้อมแผนภูมิและสัดส่วนผู้แจ้ง
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-[#0f2e4a] hover:bg-[#1a3f63] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center self-start sm:self-auto transition cursor-pointer"
              >
                <Icon name="download" size={15} className="mr-2 text-[#bca374]" /> พิมพ์รายงาน PDF
              </button>
            </div>

            {/* Filter Bar for PDF Export */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-gray-50/80 p-4 rounded-xl border border-gray-200/60">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">หัวข้อ</label>
                <select
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-bold text-[#0f2e4a] bg-white w-full outline-none"
                  value={rCfg.topic || 'task'}
                  onChange={(e) => setRConfig({ ...rCfg, topic: e.target.value })}
                >
                  <option value="task">ใบงาน (Tasks)</option>
                  <option value="inform">แจ้งเปิดงาน (Inform-Job)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">รูปแบบรอบ</label>
                <select
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white w-full outline-none"
                  value={rCfg.type}
                  onChange={(e) => setRConfig({ ...rCfg, type: e.target.value })}
                >
                  <option value="month">รายเดือน</option>
                  <option value="year">รายปี</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  {rCfg.type === 'month' ? 'เลือกเดือน' : 'เลือกปี'}
                </label>
                {rCfg.type === 'month' ? (
                  <input
                    type="month"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white w-full outline-none"
                    value={rCfg.val}
                    onChange={(e) => setRConfig({ ...rCfg, val: e.target.value })}
                  />
                ) : (
                  <input
                    type="number"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white w-full outline-none"
                    value={rCfg.val.substring(0, 4)}
                    onChange={(e) => setRConfig({ ...rCfg, val: `${e.target.value}-01` })}
                  />
                )}
              </div>

              {/* เจ้าหน้าที่ */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">เจ้าหน้าที่</label>
                <select
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white w-full outline-none"
                  value={rCfg.staffName}
                  onChange={(e) => setRConfig({ ...rCfg, staffName: e.target.value, project: 'ทั้งหมด' })}
                >
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  {Array.from(
                    new Set(
                      (sets.emails || []).map(
                        (e) => e.split('|')[2] || e.split('|')[0].split('@')[0]
                      )
                    )
                  )
                    .filter(Boolean)
                    .map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </select>
              </div>

              {/* พื้นที่ (Cascaded) */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">พื้นที่</label>
                <select
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white w-full outline-none"
                  value={rCfg.area}
                  onChange={(e) => setRConfig({ ...rCfg, area: e.target.value, project: 'ทั้งหมด' })}
                >
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  {rAvailableAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {/* โครงการ (Cascaded) */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">โครงการ</label>
                <select
                  className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white w-full outline-none truncate"
                  value={rCfg.project}
                  onChange={(e) => setRConfig({ ...rCfg, project: e.target.value })}
                >
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  {rAvailableProjects.map((p) => (
                    <option key={p} value={getProjName(p)}>
                      {getProjName(p)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Database Health & Backup Operations */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-t-4 border-t-[#0f2e4a]">
            <h3 className="font-bold text-base text-[#0f2e4a] mb-4 flex items-center gap-2">
              <Icon name="database" size={20} className="text-[#0f2e4a]" />
              ศูนย์จัดการฐานข้อมูล (Data Center & Disaster Recovery)
            </h3>

            {/* Health Meter */}
            <div className="mb-6 bg-gray-50/80 p-4 rounded-xl border border-gray-200/60 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full">
                <div className="flex justify-between text-xs font-bold mb-2 text-gray-700">
                  <span>ปริมาณข้อมูลรวมใน Firebase Firestore</span>
                  <span>{totalRows} / 3,000 รายการ</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${healthColor} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${healthPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  ระบบจะรักษาประสิทธิภาพการทำงานสูงสุดเมื่อปริมาณข้อมูลยังอยู่ต่ำกว่า 2,500 รายการ
                </span>
              </div>
              <button
                type="button"
                onClick={runMigration}
                className="w-full md:w-auto bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2.5 rounded-xl text-xs font-bold flex justify-center items-center hover:bg-purple-100 transition shadow-xs cursor-pointer"
              >
                <Icon name="refreshCw" size={15} className="mr-2" /> ดึงข้อมูล Sheet เข้า Firebase
              </button>
            </div>

            {/* Backup & Maintenance Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => downloadCSV(tasks, `Tasks_Backup_${getTStr()}.csv`)}
                className="flex-1 min-w-[200px] bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-bold flex justify-center items-center hover:bg-blue-100 transition shadow-xs cursor-pointer"
              >
                <Icon name="download" size={15} className="mr-2" /> สำรองข้อมูลงานทั้งหมด (CSV)
              </button>
              <button
                type="button"
                onClick={() => downloadCSV(informs, `InformJobs_Backup_${getTStr()}.csv`)}
                className="flex-1 min-w-[200px] bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-bold flex justify-center items-center hover:bg-blue-100 transition shadow-xs cursor-pointer"
              >
                <Icon name="download" size={15} className="mr-2" /> สำรองแจ้งเปิดงาน (CSV)
              </button>
              <button
                type="button"
                onClick={handleClearData}
                className="flex-none bg-rose-50 text-rose-600 border border-rose-200 px-5 py-2.5 rounded-xl text-xs font-bold flex justify-center items-center hover:bg-rose-100 transition shadow-xs cursor-pointer"
              >
                <Icon name="trash" size={15} className="mr-2" /> ล้างข้อมูลระบบ (Reset)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: คลังเอกสาร & จัดการบอท (Bot Reports & Data Management) */}
      {/* ========================================================================= */}
      {activeTab === 'bot_reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-t-4 border-t-[#0f2e4a]">
            {/* Header Title & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-6">
              <div>
                <h3 className="font-bold text-lg text-[#0f2e4a] flex items-center gap-2">
                  <Icon name="fileText" size={22} className="text-[#bca374]" />
                  คลังเอกสารรายงาน & จัดการข้อมูลบอท (Bot Reports Archive)
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  ศูนย์รวมเอกสาร PDF และผลการวิเคราะห์หน้างานที่สร้างจาก LINE Bot ทุกโครงการ พร้อมฟังก์ชันดาวน์โหลด และลบเอกสารหลัง Export
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={fetchReports}
                  disabled={loadingReports}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Icon name="refreshCw" size={14} className={loadingReports ? 'animate-spin' : ''} />
                  รีเฟรชข้อมูล
                </button>
                {draftCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDrafts}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="trash" size={14} />
                    ล้างรอบค้าง ({draftCount})
                  </button>
                )}
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-[#0f2e4a]/5 p-3.5 rounded-xl border border-[#0f2e4a]/10">
                <div className="text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                  <Icon name="fileText" size={13} className="text-[#0f2e4a]" /> เอกสารทั้งหมด
                </div>
                <div className="text-xl font-black text-[#0f2e4a]">
                  {floodReports.length} <span className="text-xs font-normal text-gray-500">ฉบับ</span>
                </div>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-700 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> สภาวะปกติ
                </div>
                <div className="text-xl font-black text-emerald-800">
                  {normalReportsCount} <span className="text-xs font-normal text-emerald-600">ฉบับ</span>
                </div>
              </div>

              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100">
                <div className="text-[11px] font-bold text-amber-700 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> เฝ้าระวัง
                </div>
                <div className="text-xl font-black text-amber-800">
                  {watchReportsCount} <span className="text-xs font-normal text-amber-600">ฉบับ</span>
                </div>
              </div>

              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-100">
                <div className="text-[11px] font-bold text-rose-700 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> วิกฤติ / เร่งด่วน
                </div>
                <div className="text-xl font-black text-rose-800">
                  {criticalReportsCount} <span className="text-xs font-normal text-rose-600">ฉบับ</span>
                </div>
              </div>

              <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-100 col-span-2 md:col-span-1">
                <div className="text-[11px] font-bold text-sky-700 mb-1 flex items-center gap-1">
                  <Icon name="image" size={13} className="text-sky-600" /> ภาพถ่ายสะสม
                </div>
                <div className="text-xl font-black text-sky-800">
                  {totalReportPhotos} <span className="text-xs font-normal text-sky-600">ภาพ</span>
                </div>
              </div>
            </div>

            {/* Executive Summary Card (สรุปภาพรวมผู้บริหาร) */}
            <div className="bg-gradient-to-br from-[#0f2e4a] via-[#143c61] to-[#0a2034] text-white p-5 rounded-2xl border border-[#bca374]/30 shadow-lg mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#bca374] text-[#0f2e4a] text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                      Executive Briefing
                    </span>
                    <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                      <Icon name="fileText" size={18} className="text-[#bca374]" />
                      ระบบออกรายงานสรุปภาพรวมผู้บริหาร (Flood & Drainage Management)
                    </h3>
                  </div>
                  <p className="text-xs text-gray-300">
                    รวบรวมและวิเคราะห์สถานการณ์น้ำท่วมทุกโครงการตามช่วงวันที่และระดับความเสี่ยง เพื่อนำเสนอผู้บริหารระดับสูง
                  </p>
                </div>

                {/* Scope & Area selection */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/10 text-xs">
                    <span className="text-gray-300 pl-2 font-medium">📍 พื้นที่/โซน:</span>
                    <select
                      value={execArea}
                      onChange={(e) => setExecArea(e.target.value)}
                      className="bg-[#0f2e4a] border border-white/20 text-white text-xs rounded-lg px-2.5 py-1.5 font-bold outline-none cursor-pointer"
                    >
                      <option value="all">🌐 ทุกพื้นที่ (ทุกจังหวัด - 30 โครงการ)</option>
                      <option value="province-ayutthaya">🏛️ พระนครศรีอยุธยา (3 โครงการ)</option>
                      <option value="province-pathumthani">🌾 ปทุมธานี (4 โครงการ)</option>
                      <option value="province-nonthaburi">🌳 นนทบุรี (8 โครงการ)</option>
                      <option value="province-bkk">🏙️ กรุงเทพมหานคร (ทุกเขต - 15 โครงการ)</option>
                      <option value="zone-bkk-north">📍 กทม. เหนือ (สายไหม/คลองสามวา/บางเขน - 5 โครงการ)</option>
                      <option value="zone-bkk-east">📍 กทม. ตะวันออก (สะพานสูง/มีนบุรี - 4 โครงการ)</option>
                      <option value="zone-bkk-west">📍 กทม. ฝั่งธนบุรี & ใต้ (ทวีวัฒนา/ตลิ่งชัน/พระราม 2 - 6 โครงการ)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/10 text-xs">
                    <span className="text-gray-300 pl-2 font-medium">ขอบเขต:</span>
                    <select
                      value={execScope}
                      onChange={(e) => setExecScope(e.target.value)}
                      className="bg-[#0f2e4a] border border-white/20 text-white text-xs rounded-lg px-2.5 py-1.5 font-bold outline-none cursor-pointer"
                    >
                      <option value="focus">🟡 เฝ้าระวัง & 🔴 วิกฤต (แนะนำผู้บริหาร)</option>
                      <option value="all">ทุกระดับ (รวมสภาวะปกติ 🟢)</option>
                      <option value="critical">🔴 เฉพาะวิกฤต (Critical Only)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Date pickers & Action Buttons */}
              <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-300">
                    <Icon name="calendar" size={14} className="text-[#bca374]" />
                    <span>ตั้งแต่วันที่:</span>
                    <input
                      type="date"
                      value={execDateRange.start}
                      onChange={(e) => setExecDateRange({ ...execDateRange, start: e.target.value })}
                      className="bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-gray-900 border border-white/20 rounded-lg px-2.5 py-1 text-xs outline-none transition font-medium cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-300">
                    <span>ถึงวันที่:</span>
                    <input
                      type="date"
                      value={execDateRange.end}
                      onChange={(e) => setExecDateRange({ ...execDateRange, end: e.target.value })}
                      className="bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-gray-900 border border-white/20 rounded-lg px-2.5 py-1 text-xs outline-none transition font-medium cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Export Executive PDF Button */}
                  <button
                    type="button"
                    onClick={handleOpenExecutivePdf}
                    className="bg-[#bca374] hover:bg-[#a68f63] text-[#0f2e4a] px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <Icon name="externalLink" size={15} />
                    สร้างรายงานสรุปผู้บริหาร (Executive PDF)
                  </button>

                  {/* Export Excel Button */}
                  <button
                    type="button"
                    onClick={handleExportExecutiveExcel}
                    disabled={isExportingExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    <Icon name="download" size={14} />
                    {isExportingExcel ? 'กำลังส่งออก...' : 'ส่งออก Excel (.xlsx)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/60 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                  <Icon name="filter" size={14} className="text-[#bca374]" /> กรอง:
                </div>
                {/* Area Filter */}
                <select
                  value={reportFilter.area || 'ทั้งหมด'}
                  onChange={(e) => setReportFilter({ ...reportFilter, area: e.target.value })}
                  className="bg-white border border-gray-200 text-xs rounded-lg px-2.5 py-1.5 font-semibold text-gray-700 outline-none cursor-pointer"
                >
                  <option value="ทั้งหมด">🌐 ทุกพื้นที่</option>
                  <option value="province-ayutthaya">🏛️ พระนครศรีอยุธยา</option>
                  <option value="province-pathumthani">🌾 ปทุมธานี</option>
                  <option value="province-nonthaburi">🌳 นนทบุรี</option>
                  <option value="province-bkk">🏙️ กรุงเทพมหานคร (ทุกเขต)</option>
                  <option value="zone-bkk-north">📍 กทม. เหนือ</option>
                  <option value="zone-bkk-east">📍 กทม. ตะวันออก</option>
                  <option value="zone-bkk-west">📍 กทม. ฝั่งธนบุรี & ใต้</option>
                </select>

                {/* Project Filter */}
                <select
                  value={reportFilter.project}
                  onChange={(e) => setReportFilter({ ...reportFilter, project: e.target.value })}
                  className="bg-white border border-gray-200 text-xs rounded-lg px-2.5 py-1.5 font-semibold text-gray-700 outline-none cursor-pointer"
                >
                  <option value="ทั้งหมด">ทุกโครงการ ({floodReports.length})</option>
                  {Array.from(new Set(floodReports.map((r) => r.projectCode).filter(Boolean))).map((code) => (
                    <option key={code} value={code}>
                      [{code}] {floodReports.find((r) => r.projectCode === code)?.projectName || ''}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={reportFilter.status}
                  onChange={(e) => setReportFilter({ ...reportFilter, status: e.target.value })}
                  className="bg-white border border-gray-200 text-xs rounded-lg px-2.5 py-1.5 font-semibold text-gray-700 outline-none cursor-pointer"
                >
                  <option value="ทั้งหมด">ทุกสถานะ</option>
                  <option value="NORMAL">🟢 สภาวะปกติ (Normal)</option>
                  <option value="WATCH">🟡 เฝ้าระวัง (Watch)</option>
                  <option value="CRITICAL">🔴 วิกฤติ (Critical)</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-72">
                <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหารหัสเอกสาร, โครงการ, ข้อความ..."
                  value={reportFilter.search}
                  onChange={(e) => setReportFilter({ ...reportFilter, search: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#bca374] transition"
                />
              </div>
            </div>

            {/* Reports List */}
            {loadingReports ? (
              <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center">
                <Icon name="refreshCw" size={32} className="animate-spin text-[#bca374] mb-3" />
                <p className="text-sm font-semibold text-gray-600">กำลังโหลดรายการเอกสารรายงาน...</p>
              </div>
            ) : filteredFloodReports.length === 0 ? (
              <div className="py-16 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <Icon name="fileText" size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-600">ไม่พบเอกสารรายงานในระบบ</p>
                <p className="text-xs text-gray-400 mt-1">
                  เมื่อแอดมินส่งคำสั่งรายงานน้ำท่วม (!น้ำท่วม [รหัส]) และส่งรูปภาพใน LINE บอทจะสร้างเอกสารและนำมาแสดงที่นี่โดยอัตโนมัติ
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFloodReports.map((report) => {
                  const isCritical = report.status === 'CRITICAL';
                  const isWatch = report.status === 'WATCH';
                  const statusBadge = isCritical
                    ? { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: '🔴 วิกฤติ / เร่งด่วน' }
                    : isWatch
                    ? { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: '🟡 เฝ้าระวัง' }
                    : { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: '🟢 สภาวะปกติ' };

                  const pdfUrl = `/api/flood-report?id=${report.reportId || report.id}`;

                  return (
                    <div
                      key={report.reportId || report.id}
                      className="bg-white border border-gray-200/80 rounded-2xl p-4 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Info */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#0f2e4a] bg-[#0f2e4a]/10 px-2.5 py-0.5 rounded-lg border border-[#0f2e4a]/15">
                            {report.reportId || report.id}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.bg}`}>
                            {statusBadge.text}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            🕒 {report.surveyDateThai || '-'} เวลา {report.surveyTimeThai || '-'} น.
                          </span>
                        </div>

                        <div className="text-sm font-bold text-[#0f2e4a]">
                          [{report.projectCode || '-'}] {report.projectName || 'ไม่ระบุชื่อโครงการ'}
                          <span className="text-xs font-normal text-gray-500 ml-2">({report.projectArea || '-'})</span>
                        </div>

                        {/* Summary / Notes snippet */}
                        <div className="text-xs text-gray-600 line-clamp-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                          {report.executiveSummary || report.notes || 'ตรวจเช็คสถานะการระบายน้ำประจำวัน'}
                        </div>

                        {/* Quick tags */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 pt-0.5">
                          <span>📸 {report.photoCount || 0} ภาพ</span>
                          {report.pumpsRunning && (
                            <span className="text-gray-600 font-medium">⚙️ {report.pumpsRunning}</span>
                          )}
                          {report.drainageCondition && (
                            <span className="text-gray-600 font-medium">🌊 {report.drainageCondition}</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                        {/* Open / Print PDF button */}
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#0f2e4a] hover:bg-[#163a63] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <Icon name="externalLink" size={14} />
                          เปิดดู PDF
                        </a>

                        {/* Red Trash Delete button */}
                        <button
                          type="button"
                          onClick={() => setSelectedReportForDelete(report)}
                          disabled={isDeleting === (report.reportId || report.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/80 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        >
                          <Icon name="trash" size={14} />
                          {isDeleting === (report.reportId || report.id) ? 'กำลังลบ...' : 'ลบเอกสาร'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {selectedReportForDelete && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <Icon name="trash" size={24} />
                </div>
                <h3 className="text-base font-bold text-gray-900 text-center mb-1">
                  ยืนยันการลบเอกสารรายงานถาวร?
                </h3>
                <p className="text-xs text-gray-500 text-center mb-4">
                  การกระทำนี้จะลบไฟล์และรูปภาพทั้งหมดออกจาก Cloud โดยไม่สามารถกู้คืนได้
                </p>

                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1.5 mb-5 text-gray-700 font-medium">
                  <div><strong>รหัสเอกสาร:</strong> <span className="font-mono">{selectedReportForDelete.reportId || selectedReportForDelete.id}</span></div>
                  <div><strong>โครงการ:</strong> [{selectedReportForDelete.projectCode}] {selectedReportForDelete.projectName}</div>
                  <div><strong>วันที่สำรวจ:</strong> {selectedReportForDelete.surveyDateThai} ({selectedReportForDelete.surveyTimeThai} น.)</div>
                  <div><strong>จำนวนภาพถ่าย:</strong> {selectedReportForDelete.photoCount || 0} ภาพ (จะถูกลบทั้งหมด)</div>
                </div>

                <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl mb-5 text-[11px] text-amber-800">
                  💡 <strong>คำแนะนำ:</strong> หากต้องการเก็บเอกสารไว้ กรุณากดปุ่ม <strong>"เปิดดู PDF"</strong> เพื่อดาวน์โหลดเก็บไว้ในเครื่องก่อนกดยืนยันลบครับ
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedReportForDelete(null)}
                    disabled={isDeleting !== null}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    ยกเลิก (Cancel)
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteReport}
                    disabled={isDeleting !== null}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Icon name="trash" size={14} />
                    {isDeleting ? 'กำลังลบข้อมูล...' : 'ยืนยันลบเอกสาร'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
