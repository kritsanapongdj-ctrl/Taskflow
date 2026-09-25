import React, { useState } from 'react';

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
  Icon
}) {
  const [activeTab, setActiveTab] = useState('projects');
  const [projSearch, setProjSearch] = useState('');

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/60 shadow-inner">
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
    </div>
  );
}
