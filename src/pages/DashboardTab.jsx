import React, { useState } from 'react';
import SimplePieChart from '../components/charts/SimplePieChart';
import { getTaskOverdueInfo } from '../utils/overdueHelper';

const REQUESTER_PALETTE = {
  'SVC': '#0F2E4A',      // Secondary Navy
  'ICSC': '#7A1C28',     // Primary Burgundy
  'จนท./ผจก.LH': '#10B981',
  'ผู้ควบคุมงาน': '#2563EB',
  'CEM': '#7C3AED',
};
const FALLBACK_COLORS = ['#C5A869', '#F59E0B', '#06B6D4', '#64748B', '#84CC16', '#EC4899'];

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
      color: '#16A34A' // Clean Emerald
    },
    {
      name: 'กำลังดำเนินการ',
      value: arr.filter(
        (t) => !t.status?.startsWith('จบงาน') && !getTaskOverdueInfo(t, tS, sets).isOverdue
      ).length,
      color: '#0F2E4A' // Deep Navy
    },
    {
      name: 'ล่าช้า/เกินกำหนด',
      value: arr.filter(
        (t) => getTaskOverdueInfo(t, tS, sets).isOverdue
      ).length,
      color: '#DC2626' // Distinct Alert Red
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
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* 1. Header with Clean Corporate Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-6 bg-[#7A1C28] rounded-full inline-block" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F2E4A] tracking-tight flex items-center gap-2">
              ภาพรวมผลการดำเนินงาน
              <span className="text-sm font-normal text-slate-500">
                (รอบเดือน {gFilt.month})
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed pl-4.5">
            ระบบวิเคราะห์ตัวชี้วัดและติดตามภารกิจการปฏิบัติงานแบบรวมศูนย์ Land &amp; Houses
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto bg-white border border-slate-200/90 px-3.5 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700 tracking-wide">
            ระบบเชื่อมต่อปกติ
          </span>
        </div>
      </div>

      {/* 2. Symmetrical 3-Column Corporate Grid System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: ภารกิจส่งมอบวันนี้ (Today's Targets) */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between relative group">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#7A1C28] rounded-t-2xl" />
          
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wide uppercase text-[#7A1C28]">
                ภารกิจส่งมอบวันนี้ (TODAY)
              </span>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {gFilt.date || tS}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-bold text-[#0F2E4A] tracking-tight">
                    {dy.length}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    รายการ
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  เป้าหมายงานที่ต้องปฏิบัติการในรอบวัน
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 text-[#7A1C28] shrink-0">
                <Icon name="calendar" size={26} />
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">ความคืบหน้าการส่งมอบ</span>
              <span className="font-bold text-[#7A1C28]">{todayRate}% สำเร็จ</span>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${dy.length > 0 ? (todayDone / dy.length) * 100 : 0}%` }}
                title={`เสร็จสิ้น: ${todayDone}`}
              />
              <div
                className="bg-[#0F2E4A] transition-all duration-500"
                style={{ width: `${dy.length > 0 ? (todayActive / dy.length) * 100 : 0}%` }}
                title={`กำลังดำเนินการ: ${todayActive}`}
              />
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${dy.length > 0 ? (todayOverdue / dy.length) * 100 : 0}%` }}
                title={`เกินกำหนด: ${todayOverdue}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                เสร็จ {todayDone}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0F2E4A]" />
                กำลังทำ {todayActive}
              </span>
              {todayOverdue > 0 && (
                <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  เกินกำหนด {todayOverdue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: พันธกิจประจำเดือน (Monthly Commitments) */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between relative group">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0F2E4A] rounded-t-2xl" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wide uppercase text-[#0F2E4A]">
                พันธกิจประจำเดือน (MONTHLY)
              </span>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                รอบเดือน {gFilt.month}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-bold text-[#0F2E4A] tracking-tight">
                    {mt.length}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    รายการ
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ปิดงานสำเร็จแล้ว {monthDone} รายการ
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 text-[#0F2E4A] shrink-0">
                <Icon name="listTodo" size={26} />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">สัดส่วนปิดงานประจำเดือน</span>
              <span className="font-bold text-[#0F2E4A]">{monthRate}% สำเร็จ</span>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="bg-[#0F2E4A] h-full transition-all duration-500 rounded-full"
                style={{ width: `${monthRate}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>กำลังดำเนินงาน: {mt.length - monthDone}</span>
              <span>ปิดแล้ว: {monthDone}</span>
            </div>
          </div>
        </div>

        {/* Card 3: จุดวิกฤตที่ต้องสนับสนุน (Overdue & SLA Tracking) */}
        <div
          onClick={() => onOpenOverdueModal && onOpenOverdueModal(ov)}
          className={`rounded-2xl p-6 sm:p-7 border shadow-card transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
            ov.length > 0
              ? 'bg-white border-rose-200 hover:border-rose-300 hover:shadow-card-hover'
              : 'bg-white border-slate-200 hover:shadow-card-hover'
          }`}
        >
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${
              ov.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />

          <div>
            <div className="flex items-center justify-between gap-3">
              <span
                className={`text-xs font-semibold tracking-wide uppercase ${
                  ov.length > 0 ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                งานเกินกำหนด / ปิดช้า
              </span>
              {ov.length > 0 && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  SLA ALERT
                </span>
              )}
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-5xl sm:text-6xl font-bold tracking-tight ${
                      ov.length > 0 ? 'text-rose-600' : 'text-slate-800'
                    }`}
                  >
                    {ov.length}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    รายการ
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {ov.length > 0
                    ? `ค้างส่งมอบ ${activeOvdCount} | ปิดช้ากว่ากำหนด ${completedLateCount}`
                    : 'ทุกรายการอยู่ในกรอบเวลา SLA ปกติ'}
                </p>
              </div>

              <div
                className={`p-3 rounded-xl shrink-0 ${
                  ov.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <Icon
                  name={ov.length > 0 ? 'alertTriangle' : 'checkCircle2'}
                  size={26}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            {ov.length > 0 ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>คลิกเปิดดูรายการที่ต้องเร่งรัด</span>
                <span>➔</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <span>✓ ไม่มีงานตกค้าง</span>
              </span>
            )}
            <span className="text-xs text-slate-400">SLA Monitor</span>
          </div>
        </div>
      </div>

      {/* 3. Operational Analytics Header & Segment Filter */}
      <div className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#0F2E4A] rounded-full inline-block" />
            <h3 className="text-base font-bold text-[#0F2E4A] tracking-tight">
              การวิเคราะห์มิติการปฏิบัติงาน (Operational Analytics)
            </h3>
          </div>

          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setChartTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartTab === 'all'
                  ? 'bg-[#7A1C28] text-white shadow-xs'
                  : 'hover:text-[#0F2E4A] hover:bg-white/60'
              }`}
            >
              แสดงทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setChartTab('status')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartTab === 'status'
                  ? 'bg-[#7A1C28] text-white shadow-xs'
                  : 'hover:text-[#0F2E4A] hover:bg-white/60'
              }`}
            >
              สถานะงาน
            </button>
            <button
              type="button"
              onClick={() => setChartTab('requester')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartTab === 'requester'
                  ? 'bg-[#7A1C28] text-white shadow-xs'
                  : 'hover:text-[#0F2E4A] hover:bg-white/60'
              }`}
            >
              สัดส่วนผู้แจ้ง
            </button>
          </div>
        </div>

        {/* 4. Symmetrical Analytics Charts */}
        {(chartTab === 'all' || chartTab === 'status') && (
          <div className="space-y-4 mb-6">
            {chartTab === 'all' && (
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F2E4A]" />
                สถิติสถานะการปฏิบัติงาน (TASK STATUS BREAKDOWN)
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-card">
                <SimplePieChart data={getChartData(dy)} title="สถานะงานวันนี้ (Today's Tasks)" />
              </div>
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-card">
                <SimplePieChart data={getChartData(mt)} title="สถานะงานประจำเดือน (Monthly Status)" />
              </div>
            </div>
          </div>
        )}

        {(chartTab === 'all' || chartTab === 'requester') && (
          <div className="space-y-4">
            {chartTab === 'all' && (
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 pt-2">
                <span className="w-2 h-2 rounded-full bg-[#7A1C28]" />
                สถิติสัดส่วนผู้แจ้งงาน (REQUESTER BREAKDOWN)
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between">
                <SimplePieChart 
                  data={getRequesterChartData(dy)} 
                  title="สัดส่วนผู้แจ้งงานวันนี้ (Today's Requesters)" 
                />
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">ผู้แจ้งสูงสุดวันนี้:</span>
                  {getRequesterChartData(dy).length > 0 && dy.length > 0 ? (
                    <span className="font-bold text-[#0F2E4A] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      {getRequesterChartData(dy)[0].name} ({getRequesterChartData(dy)[0].value} งาน / {((getRequesterChartData(dy)[0].value / dy.length) * 100).toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="text-slate-400">- ไม่มีข้อมูลงานวันนี้ -</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between">
                <SimplePieChart 
                  data={getRequesterChartData(mt)} 
                  title={`สัดส่วนผู้แจ้งงานประจำเดือน (${gFilt.month})`} 
                />
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">ผู้แจ้งสูงสุดประจำเดือน:</span>
                  {getRequesterChartData(mt).length > 0 && mt.length > 0 ? (
                    <span className="font-bold text-[#0F2E4A] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      {getRequesterChartData(mt)[0].name} ({getRequesterChartData(mt)[0].value} งาน / {((getRequesterChartData(mt)[0].value / mt.length) * 100).toFixed(1)}%)
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
    </div>
  );
}
