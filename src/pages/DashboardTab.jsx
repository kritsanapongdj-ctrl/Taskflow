import React, { useState } from 'react';
import SimplePieChart from '../components/charts/SimplePieChart';
import { getTaskOverdueInfo } from '../utils/overdueHelper';

// Palette aligned with Land & Houses Corporate Identity
const REQUESTER_PALETTE = {
  'SVC': '#003C71',         // LH Royal Deep Blue
  'ICSC': '#7A1C28',        // LH Heritage Burgundy
  'จนท./ผจก.LH': '#A8996E', // LH Champagne Gold / Brass
  'ผู้ควบคุมงาน': '#253746', // LH Slate Navy
  'CEM': '#5F604B',         // LH Warm Botanical Olive
};
const FALLBACK_COLORS = ['#B08731', '#10B981', '#3A3A36', '#64748B', '#0284C7', '#E11D48'];

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
      color: '#10B981' // Clean Emerald
    },
    {
      name: 'กำลังดำเนินการ',
      value: arr.filter(
        (t) => !t.status?.startsWith('จบงาน') && !getTaskOverdueInfo(t, tS, sets).isOverdue
      ).length,
      color: '#003C71' // LH Royal Blue
    },
    {
      name: 'ล่าช้า/เกินกำหนด',
      value: arr.filter(
        (t) => getTaskOverdueInfo(t, tS, sets).isOverdue
      ).length,
      color: '#E11D48' // Alert Red
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

  // Strategic Executive Telemetry
  const totalRelevantTasks = mt.length > 0 ? mt.length : dy.length;
  const slaIntegrity = totalRelevantTasks > 0
    ? Math.max(0, Math.round(((totalRelevantTasks - ov.length) / totalRelevantTasks) * 100))
    : 100;
  const activeProjectsCount = new Set(aT.map((t) => getStdProj(t.project))).size;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Executive Briefing Header (LH Architectural Luxury) */}
      <div className="relative pb-5 border-b border-[#A8996E]/20 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-3.5 bg-[#A8996E] inline-block rounded-xs" />
            <span className="font-serif tracking-[0.2em] text-[10.5px] font-semibold text-[#A8996E] uppercase">
              LAND &amp; HOUSES · FIELD OPERATIONS &amp; SLA TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#003C71] tracking-tight flex items-baseline gap-2.5 flex-wrap">
            <span>ภาพรวมผลการดำเนินงานและดัชนีคุณภาพ</span>
            <span className="font-serif text-base sm:text-lg font-normal text-[#A8996E]">
              (รอบเดือน {gFilt.month})
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed font-sans max-w-2xl">
            ศูนย์วิเคราะห์ตัวชี้วัดความคืบหน้าภารกิจภาคสนามและกรอบเวลาส่งมอบ (SLA) ประจำโครงการ Land &amp; Houses
          </p>
        </div>

        {/* Live Operational Status Pills */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <div className="flex items-center gap-2 bg-white border border-[#A8996E]/30 px-3 py-1.5 rounded-full shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A8996E]" />
            <span className="text-[11px] font-medium text-slate-700">
              วันที่ {gFilt.date || tS}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-[#003C71]">
              ระบบเชื่อมต่อปกติ
            </span>
          </div>
        </div>
      </div>

      {/* 2. Strategic Executive Ribbon (4 High-Level Key Indicators) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#A8996E]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">ดัชนีการรักษา SLA</span>
            <span className="text-[10px] font-bold text-[#A8996E] bg-[#A8996E]/10 px-1.5 py-0.2 rounded">SLA</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-serif text-3xl sm:text-4xl font-normal text-[#003C71] tracking-tight">
              {slaIntegrity}%
            </span>
            <span className="text-[11px] text-slate-400">เสถียรภาพ</span>
          </div>
          <p className="text-[10.5px] text-slate-500 mt-1 truncate">
            {ov.length === 0 ? 'ส่งมอบตรงเวลา 100%' : `พบงานล่าช้า ${ov.length} รายการ`}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#003C71]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">โครงการที่มีภารกิจ</span>
            <span className="text-[10px] font-bold text-[#003C71] bg-blue-50 px-1.5 py-0.2 rounded">ACTIVE</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-serif text-3xl sm:text-4xl font-normal text-[#003C71] tracking-tight">
              {activeProjectsCount}
            </span>
            <span className="text-[11px] text-slate-400">โครงการ</span>
          </div>
          <p className="text-[10.5px] text-slate-500 mt-1 truncate">
            {gFilt.area === 'ทั้งหมด' ? 'ครอบคลุมทุกโซน' : `โซน ${gFilt.area}`}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#10B981]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">ปิดงานสะสมเดือนนี้</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">CLOSED</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-serif text-3xl sm:text-4xl font-normal text-[#003C71] tracking-tight">
              {monthDone}
            </span>
            <span className="text-[11px] text-slate-400">/ {mt.length} รายการ</span>
          </div>
          <p className="text-[10.5px] text-slate-500 mt-1 truncate">
            อัตราความสำเร็จ {monthRate}%
          </p>
        </div>

        <div className={`rounded-xl p-4 border shadow-2xs flex flex-col justify-between relative overflow-hidden ${
          ov.length > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200/90'
        }`}>
          <div className={`absolute top-0 left-0 right-0 h-0.5 ${ov.length > 0 ? 'bg-[#7A1C28]' : 'bg-emerald-500'}`} />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">เฝ้าระวังจุดวิกฤต</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
              ov.length > 0 ? 'text-[#7A1C28] bg-rose-100' : 'text-emerald-700 bg-emerald-50'
            }`}>
              {ov.length > 0 ? 'ALERT' : 'OPTIMAL'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`font-serif text-3xl sm:text-4xl font-normal tracking-tight ${
              ov.length > 0 ? 'text-[#7A1C28]' : 'text-[#003C71]'
            }`}>
              {ov.length}
            </span>
            <span className="text-[11px] text-slate-400">รายการ</span>
          </div>
          <p className="text-[10.5px] text-slate-500 mt-1 truncate">
            {ov.length > 0 ? `ค้างส่งมอบ ${activeOvdCount} รายการ` : 'การส่งมอบตรงตามมาตรฐาน'}
          </p>
        </div>
      </div>

      {/* 3. Tripartite Architectural Focus Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: ภารกิจส่งมอบวันนี้ (Today's Operations) */}
        <div className="lh-luxury-card p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#A8996E]" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#003C71] uppercase">
                TODAY'S OPERATIONS · ภารกิจวันนี้
              </span>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
                {gFilt.date || tS}
              </span>
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl sm:text-6xl font-normal text-[#003C71] tracking-tight">
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

              <div className="p-3.5 rounded-xl bg-[#003C71]/5 text-[#003C71] border border-[#003C71]/10 shrink-0">
                <Icon name="calendar" size={24} />
              </div>
            </div>
          </div>

          {/* Segmented Delivery Gauge */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">ความคืบหน้าการส่งมอบวันนี้</span>
              <span className="font-serif font-bold text-sm text-[#003C71]">{todayRate}% สำเร็จ</span>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${dy.length > 0 ? (todayDone / dy.length) * 100 : 0}%` }}
                title={`เสร็จสิ้น: ${todayDone}`}
              />
              <div
                className="bg-[#003C71] transition-all duration-500"
                style={{ width: `${dy.length > 0 ? (todayActive / dy.length) * 100 : 0}%` }}
                title={`กำลังดำเนินการ: ${todayActive}`}
              />
              <div
                className="bg-[#E11D48] transition-all duration-500"
                style={{ width: `${dy.length > 0 ? (todayOverdue / dy.length) * 100 : 0}%` }}
                title={`เกินกำหนด: ${todayOverdue}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                เสร็จ {todayDone}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-50 text-[#003C71] px-2 py-0.5 rounded border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#003C71]" />
                กำลังทำ {todayActive}
              </span>
              {todayOverdue > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  เกินกำหนด {todayOverdue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: พันธกิจประจำเดือน (Monthly Strategic Dispatch) */}
        <div className="lh-luxury-card p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#003C71]" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#003C71] uppercase">
                MONTHLY DISPATCH · พันธกิจประจำเดือน
              </span>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
                รอบเดือน {gFilt.month}
              </span>
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl sm:text-6xl font-normal text-[#003C71] tracking-tight">
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

              <div className="p-3.5 rounded-xl bg-slate-100 text-[#003C71] shrink-0 border border-slate-200/60">
                <Icon name="listTodo" size={24} />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">สัดส่วนปิดงานประจำเดือน</span>
              <span className="font-serif font-bold text-sm text-[#003C71]">{monthRate}% สำเร็จ</span>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="bg-[#003C71] h-full transition-all duration-500 rounded-full"
                style={{ width: `${monthRate}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>กำลังดำเนินการ: {mt.length - monthDone}</span>
              <span className="font-semibold text-slate-700">ปิดแล้ว: {monthDone}</span>
            </div>
          </div>
        </div>

        {/* Card 3: จุดวิกฤตที่ต้องเร่งรัด & SLA (SLA Escalation & Watchlist) */}
        <div
          onClick={() => onOpenOverdueModal && onOpenOverdueModal(ov)}
          className={`lh-luxury-card p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-300 ${
            ov.length > 0
              ? 'border-rose-300 hover:border-rose-400 hover:shadow-md bg-gradient-to-br from-white to-rose-50/30'
              : 'hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div
            className={`absolute top-0 left-0 right-0 h-1 ${
              ov.length > 0 ? 'bg-[#7A1C28]' : 'bg-emerald-600'
            }`}
          />

          <div>
            <div className="flex items-center justify-between gap-3">
              <span
                className={`font-serif tracking-[0.16em] text-[10.5px] font-semibold uppercase ${
                  ov.length > 0 ? 'text-[#7A1C28]' : 'text-slate-600'
                }`}
              >
                SLA SURVEILLANCE · งานเกินกำหนด/ปิดช้า
              </span>
              {ov.length > 0 ? (
                <span className="text-[10px] font-bold text-[#7A1C28] bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                  SLA ALERT
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  OPTIMAL SLA
                </span>
              )}
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-serif text-5xl sm:text-6xl font-normal tracking-tight ${
                      ov.length > 0 ? 'text-[#7A1C28]' : 'text-[#003C71]'
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
                    ? `ค้างส่งมอบ ${activeOvdCount} | ปิดช้า ${completedLateCount}`
                    : 'ทุกรายการอยู่ในกรอบเวลามาตรฐาน'}
                </p>
              </div>

              <div
                className={`p-3.5 rounded-xl shrink-0 border ${
                  ov.length > 0
                    ? 'bg-rose-50 text-[#7A1C28] border-rose-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
              >
                <Icon
                  name={ov.length > 0 ? 'alertTriangle' : 'checkCircle2'}
                  size={24}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            {ov.length > 0 ? (
              <span className="text-[#7A1C28] font-bold flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                <span>เปิดห้องกำกับดูแลและเร่งรัดงาน</span>
                <span className="text-base leading-none">➔</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <span>✓ ไม่มีงานตกค้างเกินกำหนด</span>
              </span>
            )}
            <span className="text-[10px] font-serif text-slate-400 tracking-wider uppercase">
              SLA MONITOR
            </span>
          </div>
        </div>
      </div>

      {/* 4. Operational Analytics Section (Land & Houses Luxury Cadence) */}
      <div className="pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-[#003C71] inline-block rounded-xs" />
              <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#A8996E] uppercase">
                ANALYTICS &amp; DISTRIBUTION
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#003C71] tracking-tight mt-0.5">
              การวิเคราะห์มิติการปฏิบัติงานภาคสนาม
            </h2>
          </div>

          {/* Luxury Segmented Pill Switcher */}
          <div className="inline-flex bg-white p-1 rounded-xl text-xs font-semibold text-slate-600 self-start sm:self-auto border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setChartTab('all')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartTab === 'all'
                  ? 'bg-[#003C71] text-white shadow-xs font-semibold'
                  : 'hover:text-[#003C71] hover:bg-slate-50'
              }`}
            >
              แสดงทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setChartTab('status')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartTab === 'status'
                  ? 'bg-[#003C71] text-white shadow-xs font-semibold'
                  : 'hover:text-[#003C71] hover:bg-slate-50'
              }`}
            >
              สถานะงาน
            </button>
            <button
              type="button"
              onClick={() => setChartTab('requester')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartTab === 'requester'
                  ? 'bg-[#003C71] text-white shadow-xs font-semibold'
                  : 'hover:text-[#003C71] hover:bg-slate-50'
              }`}
            >
              สัดส่วนผู้แจ้ง
            </button>
          </div>
        </div>

        {/* Analytics Charts Grid */}
        {(chartTab === 'all' || chartTab === 'status') && (
          <div className="space-y-4 my-6">
            {chartTab === 'all' && (
              <div className="font-serif text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#003C71]" />
                สถิติสถานะการปฏิบัติงาน (TASK STATUS BREAKDOWN)
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lh-luxury-card p-6 sm:p-7">
                <SimplePieChart data={getChartData(dy)} title="สถานะงานวันนี้ (Today's Tasks)" />
              </div>
              <div className="lh-luxury-card p-6 sm:p-7">
                <SimplePieChart data={getChartData(mt)} title="สถานะงานประจำเดือน (Monthly Status)" />
              </div>
            </div>
          </div>
        )}

        {(chartTab === 'all' || chartTab === 'requester') && (
          <div className="space-y-4 my-6">
            {chartTab === 'all' && (
              <div className="font-serif text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 pt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8996E]" />
                สถิติสัดส่วนผู้แจ้งงาน (REQUESTER BREAKDOWN)
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lh-luxury-card p-6 sm:p-7 flex flex-col justify-between">
                <SimplePieChart 
                  data={getRequesterChartData(dy)} 
                  title="สัดส่วนผู้แจ้งงานวันนี้ (Today's Requesters)" 
                />
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">ผู้แจ้งสูงสุดวันนี้:</span>
                  {getRequesterChartData(dy).length > 0 && dy.length > 0 ? (
                    <span className="font-semibold text-[#003C71] bg-blue-50/60 border border-blue-200/60 px-2.5 py-1 rounded-lg">
                      {getRequesterChartData(dy)[0].name} ({getRequesterChartData(dy)[0].value} งาน / {((getRequesterChartData(dy)[0].value / dy.length) * 100).toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="text-slate-400">- ไม่มีข้อมูลงานวันนี้ -</span>
                  )}
                </div>
              </div>

              <div className="lh-luxury-card p-6 sm:p-7 flex flex-col justify-between">
                <SimplePieChart 
                  data={getRequesterChartData(mt)} 
                  title={`สัดส่วนผู้แจ้งงานประจำเดือน (${gFilt.month})`} 
                />
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">ผู้แจ้งสูงสุดประจำเดือน:</span>
                  {getRequesterChartData(mt).length > 0 && mt.length > 0 ? (
                    <span className="font-semibold text-[#003C71] bg-blue-50/60 border border-blue-200/60 px-2.5 py-1 rounded-lg">
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
