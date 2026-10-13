import React, { useState } from 'react';
import SimplePieChart from '../components/charts/SimplePieChart';
import { getTaskOverdueInfo } from '../utils/overdueHelper';

const REQUESTER_PALETTE = {
  'SVC': '#0f2e4a',
  'ICSC': '#bca374',
  'จนท./ผจก.LH': '#10b981',
  'ผู้ควบคุมงาน': '#3b82f6',
  'CEM': '#8b5cf6',
};
const FALLBACK_COLORS = ['#f59e0b', '#ec4899', '#06b6d4', '#64748b', '#84cc16', '#14b8a6'];

export default function DashboardTab({
  tasks = [],
  gFilt,
  THEME,
  getTStr,
  getStdProj,
  checkStaffMatch,
  chkOvdTimeAware,
  onOpenOverdueModal,
  sets = {},
  Icon
}) {
  const tS = getTStr();
  const aT = tasks.filter(
    (t) =>
      t.status !== 'ยกเลิก' &&
      (gFilt.area === 'ทั้งหมด' || t.area === gFilt.area) &&
      (gFilt.project === 'ทั้งหมด' || getStdProj(t.project) === gFilt.project) &&
      checkStaffMatch(t.project, gFilt.staffName) &&
      (!gFilt.requester || gFilt.requester === 'ทั้งหมด' || t.requester === gFilt.requester)
  );

  const dy = aT.filter(
    (t) =>
      (tS >= t.startDate && tS <= t.endDate) ||
      (!t.status?.startsWith('จบงาน') && chkOvdTimeAware(t, tS))
  );

  const [fYear, fMonth] = (gFilt.month || tS.slice(0, 7)).split('-').map(Number);
  const mStart = `${gFilt.month}-01`;
  const lastDay = new Date(fYear, fMonth, 0).getDate();
  const mEnd = `${gFilt.month}-${String(lastDay).padStart(2, '0')}`;

  const mt = aT.filter((t) => {
    if (t.startDate && t.startDate.startsWith(gFilt.month)) return true;
    if (t.endDate && t.endDate.startsWith(gFilt.month)) return true;
    const s = t.startDate || t.endDate;
    const e = t.endDate || t.startDate;
    if (!s || !e) return false;
    return s <= mEnd && e >= mStart;
  });

  const isOverdue = (t) => {
    const info = getTaskOverdueInfo(t, tS, sets);
    return info.isOverdue;
  };

  const isCurrentMonth = tS.startsWith(gFilt.month);
  const ovMap = new Map();
  mt.filter(isOverdue).forEach((t) => ovMap.set(t.id, t));
  if (isCurrentMonth) {
    dy.filter(isOverdue).forEach((t) => ovMap.set(t.id, t));
  }
  const ov = Array.from(ovMap.values());

  const activeOvdCount = ov.filter((t) => !t.status?.startsWith('จบงาน')).length;
  const completedLateCount = ov.filter((t) => t.status?.startsWith('จบงาน')).length;

  const getChartData = (arr) => [
    {
      name: 'จบงาน(ในกำหนด)',
      value: arr.filter(
        (t) => t.status?.startsWith('จบงาน') && !getTaskOverdueInfo(t, tS, sets).isOverdue
      ).length,
      color: THEME.success
    },
    {
      name: 'ดำเนินการ',
      value: arr.filter(
        (t) => !t.status?.startsWith('จบงาน') && !getTaskOverdueInfo(t, tS, sets).isOverdue
      ).length,
      color: THEME.secondary
    },
    {
      name: 'ล่าช้า/เกินกำหนด',
      value: arr.filter(
        (t) => getTaskOverdueInfo(t, tS, sets).isOverdue
      ).length,
      color: THEME.danger
    }
  ];

  const [chartTab, setChartTab] = useState('all');

  const getRequesterChartData = (arr) => {
    const counts = {};
    arr.forEach((t) => {
      const req = (t.requester || 'ไม่ระบุผู้แจ้ง').trim();
      counts[req] = (counts[req] || 0) + 1;
    });

    const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sortedEntries.map(([name, value], idx) => ({
      name,
      value,
      color: REQUESTER_PALETTE[name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
    }));
  };

  const todayDone = dy.filter((t) => t.status?.startsWith('จบงาน')).length;
  const todayActive = dy.filter(
    (t) => !t.status?.startsWith('จบงาน') && !getTaskOverdueInfo(t, tS, sets).isOverdue
  ).length;
  const todayOverdue = dy.filter((t) => getTaskOverdueInfo(t, tS, sets).isOverdue).length;
  const todayRate = dy.length > 0 ? Math.round((todayDone / dy.length) * 100) : 0;

  const monthDone = mt.filter((t) => t.status?.startsWith('จบงาน')).length;
  const monthRate = mt.length > 0 ? Math.round((monthDone / mt.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header with Live Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#0f2e4a] rounded-sm inline-block shadow-xs" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f2e4a] font-display tracking-tight flex items-center gap-2">
              ภาพรวมผลการดำเนินงาน
              <span className="text-sm font-normal text-slate-500 font-body">
                (เดือน {gFilt.month})
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-4.5">
            ระบบวิเคราะห์ตัวชี้วัดและภารกิจการปฏิบัติงานแบบรวมศูนย์ Land & Houses
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-tech font-semibold text-slate-600 uppercase tracking-wider">
            LIVE TELEMETRY
          </span>
        </div>
      </div>

      {/* Asymmetric Hero & Support Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* HERO CARD (Span 7 / ~60%) - Today's Operational Targets */}
        <div className="lg:col-span-7 bg-[#0f2e4a] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-[#bca374]/30 blueprint-grid-dark drafting-corner relative flex flex-col justify-between group overflow-hidden">
          {/* Subtle architectural background glow */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-[#bca374]/10 blur-2xl pointer-events-none" />

          <div>
            {/* Top Telemetry Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="text-[11px] font-display font-bold uppercase tracking-widest text-[#bca374]">
                  ภารกิจส่งมอบวันนี้ (TODAY'S TARGETS)
                </span>
              </div>
              <span className="text-xs font-tech font-semibold text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                {gFilt.date || tS}
              </span>
            </div>

            {/* Main Metric with Oversized Numeral */}
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-numeric text-6xl sm:text-7xl font-black text-white tracking-tight drop-shadow-sm group-hover:scale-105 origin-left transition-transform duration-300">
                    {dy.length}
                  </span>
                  <span className="text-sm font-display font-medium text-slate-300 uppercase tracking-wider">
                    รายการ
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300/90 font-medium mt-1">
                  เป้าหมายงานที่ต้องปฏิบัติการและส่งมอบในรอบวัน
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 text-[#bca374] border border-[#bca374]/30 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shrink-0">
                <Icon name="calendar" size={32} color="#bca374" />
              </div>
            </div>
          </div>

          {/* Bottom Operational Progress Ribbon */}
          <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-tech">
              <span className="text-slate-300">ความคืบหน้าการส่งมอบ</span>
              <span className="font-bold text-[#bca374]">{todayRate}% สำเร็จ</span>
            </div>

            {/* Multi-segment progress bar */}
            <div className="h-2 w-full bg-white/15 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-400 transition-all duration-500"
                style={{ width: `${dy.length > 0 ? (todayDone / dy.length) * 100 : 0}%` }}
                title={`เสร็จสิ้น: ${todayDone}`}
              />
              <div
                className="bg-[#bca374] transition-all duration-500"
                style={{ width: `${dy.length > 0 ? (todayActive / dy.length) * 100 : 0}%` }}
                title={`กำลังดำเนินการ: ${todayActive}`}
              />
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${dy.length > 0 ? (todayOverdue / dy.length) * 100 : 0}%` }}
                title={`เกินกำหนด: ${todayOverdue}`}
              />
            </div>

            {/* Micro status legend */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-tech text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                เสร็จสิ้น {todayDone}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#bca374]" />
                กำลังทำ {todayActive}
              </span>
              {todayOverdue > 0 && (
                <span className="flex items-center gap-1.5 text-rose-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  เกินกำหนด {todayOverdue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SUPPORT STACK (Span 5 / ~40%) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Card 1: พันธกิจประจำเดือน */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-[#0f2e4a]/40 transition-all duration-300 flex flex-col justify-between group flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-500">
                  พันธกิจประจำเดือน (Monthly Commitments)
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-numeric text-4xl sm:text-5xl font-black text-[#0f2e4a] tracking-tight group-hover:scale-105 origin-left transition-transform duration-300">
                    {mt.length}
                  </span>
                  <span className="text-xs font-display text-slate-400 uppercase font-semibold">รายการ</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  รอบเดือน <span className="font-tech font-bold text-slate-700">{gFilt.month}</span> (ปิดแล้ว {monthDone} รายการ)
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#0f2e4a]/10 text-[#0f2e4a] shadow-inner group-hover:scale-110 transition-transform">
                <Icon name="listTodo" size={24} color="#0f2e4a" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-tech">สัดส่วนปิดงาน</span>
              <span className="font-tech font-bold text-[#0f2e4a]">{monthRate}% สำเร็จ</span>
            </div>
          </div>

          {/* Card 2: จุดวิกฤตที่ต้องสนับสนุน (Priority Escalation) */}
          <div
            onClick={() => onOpenOverdueModal && onOpenOverdueModal(ov)}
            className={`rounded-3xl p-5 sm:p-6 shadow-sm border transition-all duration-300 cursor-pointer group flex flex-col justify-between flex-1 ${
              ov.length > 0
                ? 'bg-gradient-to-br from-rose-50/70 via-white to-white border-rose-200 hover:border-rose-400 hover:shadow-lg hover:-translate-y-0.5'
                : 'bg-white border-slate-200/80 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-600">
                    งานเกินกำหนด / ปิดช้า
                  </span>
                  {ov.length > 0 && (
                    <span className="stamp-badge">
                      URGENT SLA
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span
                    className={`font-numeric text-4xl sm:text-5xl font-black tracking-tight group-hover:scale-105 origin-left transition-transform duration-300 ${
                      ov.length > 0 ? 'text-rose-600' : 'text-slate-800'
                    }`}
                  >
                    {ov.length}
                  </span>
                  <span className="text-xs font-display text-slate-400 uppercase font-semibold">รายการ</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {ov.length > 0
                    ? `ค้างส่งมอบ ${activeOvdCount} | ปิดงานช้า ${completedLateCount}`
                    : 'ทุกรายการอยู่ในกรอบเวลา SLA'}
                </p>
              </div>
              <div
                className={`p-3 rounded-2xl shadow-inner group-hover:scale-110 transition-transform ${
                  ov.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon name="alertTriangle" size={24} color={ov.length > 0 ? '#e11d48' : '#64748b'} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs">
              {ov.length > 0 ? (
                <span className="text-rose-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>คลิกตรวจสอบรายการวิกฤต</span>
                  <span>➔</span>
                </span>
              ) : (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <span>✓ ระบบปกติ ไม่มีงานค้าง</span>
                </span>
              )}
              <span className="text-[10px] text-slate-400 font-tech">SLA Tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section Header with View Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-6 bg-[#0f2e4a] rounded-sm shadow-xs" />
          <h3 className="text-base font-bold text-[#0f2e4a] font-display tracking-tight">
            การวิเคราะห์มิติการปฏิบัติงาน (Operational Analytics)
          </h3>
        </div>
        <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 self-start sm:self-auto border border-slate-200/60 shadow-inner font-display">
          <button
            type="button"
            onClick={() => setChartTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer snap-spring ${
              chartTab === 'all'
                ? 'bg-[#0f2e4a] text-white shadow-xs'
                : 'hover:text-[#0f2e4a] hover:bg-white/60'
            }`}
          >
            แสดงทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setChartTab('status')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer snap-spring ${
              chartTab === 'status'
                ? 'bg-[#0f2e4a] text-white shadow-xs'
                : 'hover:text-[#0f2e4a] hover:bg-white/60'
            }`}
          >
            สถานะงาน
          </button>
          <button
            type="button"
            onClick={() => setChartTab('requester')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer snap-spring ${
              chartTab === 'requester'
                ? 'bg-[#0f2e4a] text-white shadow-xs'
                : 'hover:text-[#0f2e4a] hover:bg-white/60'
            }`}
          >
            สัดส่วนผู้แจ้ง
          </button>
        </div>
      </div>

      {/* 1. Status Charts */}
      {(chartTab === 'all' || chartTab === 'status') && (
        <div className="space-y-3">
          {chartTab === 'all' && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 font-display">
              <span className="w-2 h-2 rounded-full bg-[#0f2e4a]"></span>
              สถิติสถานะการปฏิบัติงาน (Task Status)
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow duration-300 drafting-corner">
              <SimplePieChart data={getChartData(dy)} title="สถานะงานวันนี้ (Today's Tasks)" />
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow duration-300 drafting-corner">
              <SimplePieChart data={getChartData(mt)} title="สถานะงานประจำเดือน (Monthly Status)" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Requester Charts */}
      {(chartTab === 'all' || chartTab === 'requester') && (
        <div className="space-y-3">
          {chartTab === 'all' && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 pt-2 font-display">
              <span className="w-2 h-2 rounded-full bg-[#bca374]"></span>
              สถิติสัดส่วนผู้แจ้งงาน (Requester Breakdown)
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Today's Requester Distribution */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow duration-300 flex flex-col justify-between drafting-corner">
              <SimplePieChart 
                data={getRequesterChartData(dy)} 
                title="สัดส่วนผู้แจ้งงานวันนี้ (Today's Requesters)" 
              />
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-tech">
                <span className="text-slate-400 font-medium">ผู้แจ้งงานสูงสุดวันนี้:</span>
                {getRequesterChartData(dy).length > 0 && dy.length > 0 ? (
                  <span className="font-bold text-[#0f2e4a] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    🥇 {getRequesterChartData(dy)[0].name} ({getRequesterChartData(dy)[0].value} งาน / {((getRequesterChartData(dy)[0].value / dy.length) * 100).toFixed(1)}%)
                  </span>
                ) : (
                  <span className="text-slate-400">- ไม่มีข้อมูลงานวันนี้ -</span>
                )}
              </div>
            </div>

            {/* Monthly Requester Distribution */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow duration-300 flex flex-col justify-between drafting-corner">
              <SimplePieChart 
                data={getRequesterChartData(mt)} 
                title={`สัดส่วนผู้แจ้งงานประจำเดือน (${gFilt.month})`} 
              />
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-tech">
                <span className="text-slate-400 font-medium">ผู้แจ้งงานสูงสุดประจำเดือน:</span>
                {getRequesterChartData(mt).length > 0 && mt.length > 0 ? (
                  <span className="font-bold text-[#0f2e4a] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                    🥇 {getRequesterChartData(mt)[0].name} ({getRequesterChartData(mt)[0].value} งาน / {((getRequesterChartData(mt)[0].value / mt.length) * 100).toFixed(1)}%)
                  </span>
                ) : (
                  <span className="text-slate-400">- ไม่มีข้อมูลงานเดือนนี้ -</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
