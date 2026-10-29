import React, { useState } from 'react';
import SimplePieChart from '../components/charts/SimplePieChart';
import Sparkline from '../components/charts/Sparkline';
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
  THEME: _THEME,
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

  // 7-Day Trend Telemetry for SLA Sparklines
  const sparkline7Days = (() => {
    if (!tS) return [];
    const days = [];
    const [y, m, d] = tS.split('-').map(Number);
    const base = new Date(y, m - 1, d, 12, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const cur = new Date(base);
      cur.setDate(base.getDate() - i);
      const cy = cur.getFullYear();
      const cm = String(cur.getMonth() + 1).padStart(2, '0');
      const cd = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${cy}-${cm}-${cd}`;
      const shortLabel = `${cur.getDate()} ${cur.toLocaleDateString('th-TH', { month: 'short' })}`;

      // 1. Completed tasks on this day
      const completedCount = aT.filter((t) => {
        if (!t.status?.startsWith('จบงาน')) return false;
        return t.completedDate === dateStr || (!t.completedDate && t.endDate === dateStr);
      }).length;

      // 2. Active / Scheduled work load spanning this day
      const activeCount = aT.filter((t) => {
        const s = t.startDate || t.receivedDate || t.endDate;
        const e = t.endDate || t.startDate;
        if (!s || !e) return false;
        return dateStr >= s && dateStr <= e;
      }).length;

      // 3. Overdue tasks on this day
      const overdueCount = aT.filter((t) => {
        if (t.status === 'ยกเลิก') return false;
        if (t.status?.startsWith('จบงาน') && t.completedDate && t.completedDate < dateStr) return false;
        const targetEnd = t.endDate;
        if (targetEnd && targetEnd < dateStr) return true;
        if (dateStr === tS && chkOvdTimeAware(t, tS)) return true;
        return false;
      }).length;

      // 4. SLA Health on this day
      const totalDayTasks = Math.max(activeCount, completedCount);
      const slaRate = totalDayTasks > 0
        ? Math.max(0, Math.round(((totalDayTasks - overdueCount) / totalDayTasks) * 100))
        : 100;

      days.push({
        dateStr,
        shortLabel,
        completedCount,
        activeCount,
        overdueCount,
        slaRate
      });
    }
    return days;
  })();

  const total7DayCompleted = sparkline7Days.reduce((sum, d) => sum + d.completedCount, 0);

  const avg7DaySla = sparkline7Days.length > 0
    ? Math.round(sparkline7Days.reduce((acc, d) => acc + d.slaRate, 0) / sparkline7Days.length)
    : 100;

  const slaStatusConfig = (() => {
    if (slaIntegrity >= 90) {
      return {
        label: 'HEALTHY · เสถียรภาพสูง',
        badgeClass: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        dotClass: 'bg-emerald-500',
        sparkColor: '#10B981',
        desc: 'การส่งมอบและกรอบเวลาอยู่ในเกณฑ์ดีเยี่ยม'
      };
    }
    if (slaIntegrity >= 75) {
      return {
        label: 'AT RISK · พึงเฝ้าระวัง',
        badgeClass: 'text-amber-800 bg-amber-50 border-amber-200',
        dotClass: 'bg-amber-500',
        sparkColor: '#B08731',
        desc: 'มีงานสุ่มเสี่ยงเกินกำหนด ควรติดตามเร่งรัด'
      };
    }
    return {
      label: 'CRITICAL · จุดวิกฤต',
      badgeClass: 'text-rose-800 bg-rose-50 border-rose-200',
      dotClass: 'bg-rose-500',
      sparkColor: '#7A1C28',
      desc: 'อัตรางานล่าช้าสูง จำเป็นต้องเข้าบริหารจัดการทันที'
    };
  })();

  const topProjects = (() => {
    const counts = {};
    aT.forEach((t) => {
      const proj = getStdProj(t.project) || 'ไม่ระบุโครงการ';
      counts[proj] = (counts[proj] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  })();

  const topRequestersMonth = getRequesterChartData(mt).slice(0, 3);

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

      {/* 2. 21st.dev Bento Grid KPI Cards & SLA Sparklines Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Cell 1: Hero Card — SLA Integrity & Telemetry (Col-span 12 on mobile, Col-span 7 on lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-[#A8996E]/30 shadow-xs relative overflow-hidden flex flex-col justify-between group hover:border-[#A8996E]/60 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#A8996E] via-[#003C71] to-[#A8996E]" />

          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#A8996E] inline-block rounded-xs" />
                <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#003C71] uppercase">
                  SLA INTEGRITY &amp; OPERATIONAL HEALTH
                </span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${slaStatusConfig.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${slaStatusConfig.dotClass}`} />
                {slaStatusConfig.label}
              </span>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl sm:text-6xl font-normal text-[#003C71] tracking-tight">
                    {slaIntegrity}%
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-500">
                    ดัชนีเสถียรภาพ SLA
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  {slaStatusConfig.desc} ({ov.length === 0 ? 'ส่งมอบตรงเวลา 100%' : `งานล่าช้าสะสม ${ov.length} รายการ`})
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-[#A8996E]/10 border border-[#A8996E]/20 px-3 py-1.5 rounded-xl">
                <span className="text-[10.5px] font-semibold text-[#003C71]">เฉลี่ย 7 วัน:</span>
                <span className="font-serif font-bold text-sm text-[#003C71]">{avg7DaySla}%</span>
              </div>
            </div>
          </div>

          {/* Interactive 7-Day SLA Trend Sparkline */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: slaStatusConfig.sparkColor }} />
                แนวโน้มการรักษา SLA ย้อนหลัง 7 วัน (7-Day Compliance Velocity)
              </span>
              <span className="text-[11px] font-serif text-slate-400">Bangkok Timezone</span>
            </div>
            <Sparkline
              data={sparkline7Days.map((d) => ({ value: d.slaRate, label: d.shortLabel }))}
              color={slaStatusConfig.sparkColor}
              unit="%"
              height={44}
              className="w-full"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
              <span>{sparkline7Days[0]?.shortLabel || ''}</span>
              <span className="text-slate-500 font-medium font-sans">
                {ov.length === 0 ? '✨ ส่งมอบงานตรงเวลา 100%' : `⚠️ ตรวจพบงานเกินกำหนด ${ov.length} รายการ`}
              </span>
              <span>{sparkline7Days[sparkline7Days.length - 1]?.shortLabel || ''}</span>
            </div>
          </div>
        </div>

        {/* Cell 2: Today's Dispatch (Col-span 12 on mobile, Col-span 5 on lg) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between group hover:border-[#003C71]/50 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#003C71]" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#003C71] inline-block rounded-xs" />
                <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#003C71] uppercase">
                  TODAY'S OPERATIONS · ภารกิจวันนี้
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {gFilt.date || tS}
              </span>
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl sm:text-6xl font-normal text-[#003C71] tracking-tight">
                    {dy.length}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-500">
                    รายการ
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  อัตราความสำเร็จวันนี้ {todayRate}%
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#003C71]/5 text-[#003C71] border border-[#003C71]/10 shrink-0">
                <Icon name="calendar" size={24} />
              </div>
            </div>
          </div>

          {/* Segmented Status Gauge + Sparkline */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="space-y-1.5">
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

              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  เสร็จ {todayDone}
                </span>
                <span className="inline-flex items-center gap-1 text-[#003C71] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003C71]" />
                  กำลังทำ {todayActive}
                </span>
                {todayOverdue > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    เกินกำหนด {todayOverdue}
                  </span>
                )}
              </div>
            </div>

            {/* Daily Active Tasks Sparkline */}
            <div>
              <div className="text-[10.5px] text-slate-400 font-medium flex items-center justify-between mb-1">
                <span>ปริมาณภารกิจรายวัน 7 วันล่าสุด</span>
                <span className="text-[#003C71] font-semibold">{dy.length} งานวันนี้</span>
              </div>
              <Sparkline
                data={sparkline7Days.map((d) => ({ value: d.activeCount, label: d.shortLabel }))}
                color="#003C71"
                unit="งาน"
                height={32}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Cell 3: Monthly Strategic Dispatch (Col-span 12 md:col-span-1 lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs relative overflow-hidden flex flex-col justify-between group hover:border-[#10B981]/50 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#10B981]" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#10B981] inline-block rounded-xs" />
                <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#003C71] uppercase">
                  MONTHLY DISPATCH · พันธกิจสะสมประจำเดือน
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
                รอบเดือน {gFilt.month}
              </span>
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl sm:text-6xl font-normal text-[#003C71] tracking-tight">
                    {mt.length}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-500">
                    รายการ
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ปิดงานสำเร็จแล้ว {monthDone} รายการ (คิดเป็น {monthRate}%)
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                <Icon name="listTodo" size={24} />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">สัดส่วนปิดงานประจำเดือน</span>
                <span className="font-serif font-bold text-sm text-[#003C71]">{monthRate}% สำเร็จ</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${monthRate}%` }}
                />
              </div>
            </div>

            {/* Daily Closed Velocity Sparkline */}
            <div>
              <div className="text-[10.5px] text-slate-400 font-medium flex items-center justify-between mb-1">
                <span>ความเร็วการปิดงาน 7 วันล่าสุด (Closed Velocity)</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.2 rounded-full">
                  7 วัน: {total7DayCompleted} งาน
                </span>
              </div>
              <Sparkline
                data={sparkline7Days.map((d) => ({ value: d.completedCount, label: d.shortLabel }))}
                color="#10B981"
                unit="งาน"
                height={36}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Cell 4: SLA Surveillance & Overdue Escalation (Col-span 12 md:col-span-1 lg:col-span-6) */}
        <div
          onClick={() => onOpenOverdueModal && onOpenOverdueModal(ov)}
          className={`lg:col-span-6 rounded-2xl p-6 sm:p-7 border shadow-xs relative overflow-hidden flex flex-col justify-between group cursor-pointer transition-all duration-300 ${
            ov.length > 0
              ? 'bg-gradient-to-br from-white via-rose-50/20 to-rose-50/40 border-rose-200 hover:border-rose-400 hover:shadow-md'
              : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div
            className={`absolute top-0 left-0 right-0 h-1 ${
              ov.length > 0 ? 'bg-[#7A1C28]' : 'bg-emerald-500'
            }`}
          />

          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-3.5 inline-block rounded-xs ${
                    ov.length > 0 ? 'bg-[#7A1C28]' : 'bg-emerald-500'
                  }`}
                />
                <span
                  className={`font-serif tracking-[0.16em] text-[10.5px] font-semibold uppercase ${
                    ov.length > 0 ? 'text-[#7A1C28]' : 'text-[#003C71]'
                  }`}
                >
                  SLA SURVEILLANCE · งานเกินกำหนด/ปิดช้า
                </span>
              </div>
              {ov.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold text-[#7A1C28] bg-rose-100 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  SLA ALERT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  ✓ OPTIMAL SLA
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
                  <span className="text-xs sm:text-sm font-medium text-slate-500">
                    รายการ
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {ov.length > 0
                    ? `ค้างส่งมอบ ${activeOvdCount} รายการ | ปิดช้ากว่ากำหนด ${completedLateCount} รายการ`
                    : 'ทุกรายการอยู่ในกรอบเวลามาตรฐาน ไม่มีงานค้างวิกฤต'}
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

          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            {/* Overdue Incidents Trend Sparkline */}
            <div>
              <div className="text-[10.5px] text-slate-400 font-medium flex items-center justify-between mb-1">
                <span>แนวโน้มงานเกินกำหนด 7 วันล่าสุด (Incident Trend)</span>
                <span className={`font-semibold ${ov.length > 0 ? 'text-[#7A1C28]' : 'text-emerald-700'}`}>
                  {ov.length > 0 ? `พบ ${ov.length} จุดวิกฤต` : 'ไร้งานตกค้าง'}
                </span>
              </div>
              <Sparkline
                data={sparkline7Days.map((d) => ({ value: d.overdueCount, label: d.shortLabel }))}
                color={ov.length > 0 ? '#7A1C28' : '#10B981'}
                unit="งาน"
                height={36}
                className="w-full"
              />
            </div>

            {/* Interactive Action Prompt */}
            <div className="flex items-center justify-between text-xs pt-1">
              {ov.length > 0 ? (
                <span className="text-[#7A1C28] font-bold flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>เปิดห้องกำกับดูแลและเร่งรัดงาน ({ov.length} รายการ)</span>
                  <span className="text-base leading-none">➔</span>
                </span>
              ) : (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <span>✓ ทุกรายการปฏิบัติการตรงเวลา</span>
                </span>
              )}
              <span className="text-[10px] font-serif text-slate-400 tracking-wider uppercase">
                SLA MONITOR
              </span>
            </div>
          </div>
        </div>

        {/* Cell 5: Active Footprint & Zone Coverage (Col-span 12 md:col-span-6 lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[#003C71] inline-block rounded-xs" />
                <span className="font-serif tracking-[0.14em] text-[10px] font-semibold text-slate-500 uppercase">
                  PORTFOLIO FOOTPRINT · ขอบเขตโครงการ
                </span>
              </div>
              <span className="text-[10.5px] font-bold text-[#003C71] bg-blue-50 px-2 py-0.5 rounded-md">
                ACTIVE PROJECTS
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl sm:text-4xl font-normal text-[#003C71] tracking-tight">
                  {activeProjectsCount}
                </span>
                <span className="text-xs text-slate-500">โครงการที่มีภารกิจ</span>
              </div>
              <span className="text-xs text-slate-400">
                รวม {aT.length} รายการ ({gFilt.area === 'ทั้งหมด' ? 'ทุกโซน' : `โซน ${gFilt.area}`})
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] text-slate-400 font-medium">โครงการหลัก:</span>
            {topProjects.length > 0 ? (
              topProjects.map(([proj, count], idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 text-[11px]"
                >
                  <span className="font-semibold text-[#003C71]">{proj}</span>
                  <span className="text-slate-400 text-[10px]">({count})</span>
                </span>
              ))
            ) : (
              <span className="text-slate-400 text-[11px]">- ไม่มีภารกิจในตัวกรองนี้ -</span>
            )}
          </div>
        </div>

        {/* Cell 6: Top Requester Telemetry (Col-span 12 md:col-span-6 lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[#A8996E] inline-block rounded-xs" />
                <span className="font-serif tracking-[0.14em] text-[10px] font-semibold text-slate-500 uppercase">
                  STAKEHOLDER TELEMETRY · ผู้แจ้งงานหลัก
                </span>
              </div>
              <span className="text-[10.5px] font-bold text-[#A8996E] bg-[#A8996E]/10 px-2 py-0.5 rounded-md">
                REQUESTERS
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl sm:text-4xl font-normal text-[#003C71] tracking-tight">
                  {topRequestersMonth[0]?.name || 'ไม่ระบุ'}
                </span>
                {topRequestersMonth[0] && (
                  <span className="text-xs text-slate-500">
                    ({topRequestersMonth[0].value} งาน / {mt.length > 0 ? Math.round((topRequestersMonth[0].value / mt.length) * 100) : 0}%)
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">สัดส่วนแจ้งงานสะสม</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] text-slate-400 font-medium">ลำดับผู้แจ้ง:</span>
            {topRequestersMonth.length > 0 ? (
              topRequestersMonth.map((req, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 text-[11px]"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: req.color }}
                  />
                  <span className="font-medium">{req.name}</span>
                  <span className="text-slate-400 text-[10px]">({req.value})</span>
                </span>
              ))
            ) : (
              <span className="text-slate-400 text-[11px]">- ไม่มีข้อมูลผู้แจ้ง -</span>
            )}
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
