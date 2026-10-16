import React, { useState } from 'react';
import SimplePieChart from '../components/charts/SimplePieChart';
import { getTaskOverdueInfo } from '../utils/overdueHelper';

const REQUESTER_PALETTE = {
  'SVC': '#00F0FF',
  'ICSC': '#B89246',
  'จนท./ผจก.LH': '#FFEA00',
  'ผู้ควบคุมงาน': '#38BDF8',
  'CEM': '#E5C989',
};
const FALLBACK_COLORS = ['#B89246', '#00F0FF', '#FFEA00', '#E5C989', '#38BDF8', '#8C6C29'];

// 10-Segment Retro Pixel Progress Meter
function PixelProgressMeter({ done = 0, active = 0, overdue = 0, totalCount = 1 }) {
  const safeTotal = Math.max(totalCount, 1);
  const doneBlocks = Math.min(10, Math.round((done / safeTotal) * 10));
  const overdueBlocks = Math.min(10 - doneBlocks, Math.round((overdue / safeTotal) * 10));
  const activeBlocks = Math.min(10 - doneBlocks - overdueBlocks, Math.round((active / safeTotal) * 10));

  return (
    <div className="flex gap-1.5 w-full">
      {Array.from({ length: 10 }).map((_, i) => {
        let blockStyle = 'bg-[#060E21] border border-[#B89246]/40';
        if (i < doneBlocks) {
          blockStyle = 'bg-[#00F0FF] border-[#00F0FF] shadow-[0_0_6px_#00F0FF]';
        } else if (i < doneBlocks + activeBlocks) {
          blockStyle = 'bg-[#B89246] border-[#B89246] shadow-[0_0_5px_#B89246]';
        } else if (i < doneBlocks + activeBlocks + overdueBlocks) {
          blockStyle = 'bg-[#FFEA00] border-[#FFEA00] shadow-[0_0_6px_#FFEA00]';
        }
        return (
          <div key={i} className={`h-3 flex-1 rounded-none ${blockStyle} transition-all duration-300`} />
        );
      })}
    </div>
  );
}

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
      color: '#00F0FF'
    },
    {
      name: 'ดำเนินการ',
      value: arr.filter(
        (t) => !t.status?.startsWith('จบงาน') && !getTaskOverdueInfo(t, tS, sets).isOverdue
      ).length,
      color: '#B89246'
    },
    {
      name: 'ล่าช้า/เกินกำหนด',
      value: arr.filter(
        (t) => getTaskOverdueInfo(t, tS, sets).isOverdue
      ).length,
      color: '#FFEA00'
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
      {/* 80s Terminal Header Bar */}
      <div 
        style={{ backgroundColor: '#0B1B3D' }} 
        className="border-2 border-[#B89246] p-4 sm:p-5 shadow-[4px_4px_0px_#B89246] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] inline-block shrink-0" />
            <span className="font-serif font-bold text-sm sm:text-base tracking-widest text-[#B89246] uppercase">
              LAND &amp; HOUSES
            </span>
            <span className="text-[#00F0FF] font-tech text-xs">/ /</span>
            <h2 className="text-lg sm:text-2xl font-bold font-display text-white tracking-wide">
              ภาพรวมผลการดำเนินงาน
            </h2>
            <span className="text-xs font-tech font-bold text-[#00F0FF] bg-[#102A43] px-2.5 py-1 border border-[#00F0FF]/40 shadow-[2px_2px_0px_#060E21] shrink-0">
              [ PERIOD: {gFilt.month} ]
            </span>
          </div>
          <p className="text-xs font-tech text-slate-300 tracking-wider flex items-center gap-1.5 pl-5">
            <span className="text-[#B89246] font-bold">SYS_TELEMETRY:</span>
            <span>CENTRALIZED EXECUTIVE COMMAND &amp; CONTROL CONSOLE</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto bg-[#060E21] border border-[#00F0FF] px-3.5 py-2 shadow-[3px_3px_0px_#00F0FF] shrink-0">
          <span className="w-2 h-2 bg-[#00F0FF] shadow-[0_0_6px_#00F0FF] animate-ping" />
          <span className="text-xs font-tech font-bold text-[#00F0FF] tracking-widest uppercase">
            REAL-TIME TELEMETRY ONLINE
          </span>
        </div>
      </div>

      {/* Asymmetric Bento Terminal Windows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* HERO CARD (Span 7) - Today's Operational Targets */}
        <div 
          style={{ backgroundColor: '#0B1B3D' }} 
          className="lg:col-span-7 cyber-grid-dark cyber-scanlines text-white border-2 border-[#B89246] shadow-[5px_5px_0px_#B89246] relative flex flex-col justify-between group overflow-hidden"
        >
          {/* Terminal Window Titlebar */}
          <div className="terminal-titlebar px-3.5 py-2 flex items-center justify-between text-[#B89246] border-b border-[#B89246] bg-[#060E21]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00F0FF] shadow-[0_0_4px_#00F0FF]" />
              <span className="font-bold tracking-wider">[ 01 // TODAY_TARGETS.LOG ]</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-300 font-mono">
              <span className="px-1.5 py-0.2 border border-[#B89246]/40 bg-[#0B1B3D]">[ _ ]</span>
              <span className="px-1.5 py-0.2 border border-[#B89246]/40 bg-[#0B1B3D]">[ □ ]</span>
              <span className="px-1.5 py-0.2 border border-rose-500/50 bg-[#0B1B3D] text-rose-400">[ X ]</span>
            </div>
          </div>

          <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
            {/* Top Telemetry Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#B89246]/30">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00F0FF] shadow-[0_0_6px_#00F0FF] animate-pulse inline-block shrink-0" />
                <span className="text-xs sm:text-sm font-tech font-bold uppercase tracking-wider text-[#00F0FF]">
                  เป้าหมายส่งมอบวันนี้ (TODAY'S OPERATIONS)
                </span>
              </div>
              <span className="text-xs font-tech font-bold text-[#FFEA00] bg-[#102A43] px-3 py-1 border border-[#FFEA00]/60 shadow-[2px_2px_0px_#060E21] shrink-0">
                DATE: {gFilt.date || tS}
              </span>
            </div>

            {/* Main Metric with Oversized Monospace Numeral */}
            <div className="my-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="font-tech text-6xl sm:text-7xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                    {dy.length}
                  </span>
                  <span className="text-sm sm:text-base font-tech font-bold text-[#B89246] tracking-widest uppercase">
                    TASKS_QUEUED
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-tech mt-1.5 tracking-wide">
                  จำนวนภารกิจที่ต้องปฏิบัติการและส่งมอบในรอบผลัดงานวันนี้
                </p>
              </div>

              <div className="p-3.5 bg-[#102A43] text-[#B89246] border-2 border-[#B89246] shadow-[4px_4px_0px_#060E21] shrink-0">
                <Icon name="calendar" size={32} color="#B89246" />
              </div>
            </div>

            {/* 10-Segment Pixelated Progress Tracker */}
            <div className="mt-5 pt-4 border-t border-[#B89246]/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-tech">
                <span className="text-slate-200 font-semibold uppercase tracking-wider">
                  ความคืบหน้าการส่งมอบ (PIXEL_RATE)
                </span>
                <span className="font-bold text-[#00F0FF] bg-[#102A43] px-2.5 py-1 border border-[#00F0FF]/40 shadow-[2px_2px_0px_#060E21]">
                  {todayRate}% COMPLETED
                </span>
              </div>

              {/* Segmented Pixel Bar */}
              <PixelProgressMeter
                done={todayDone}
                active={todayActive}
                overdue={todayOverdue}
                totalCount={dy.length}
              />

              {/* Status Legend with high-contrast text */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-tech">
                <span className="flex items-center gap-1.5 bg-[#102A43] px-2.5 py-1 border border-[#00F0FF]/30 text-white">
                  <span className="w-2.5 h-2.5 bg-[#00F0FF] shadow-[0_0_4px_#00F0FF]" />
                  <span>เสร็จสิ้น: <strong className="text-[#00F0FF] font-bold">{todayDone}</strong></span>
                </span>
                <span className="flex items-center gap-1.5 bg-[#102A43] px-2.5 py-1 border border-[#B89246]/40 text-white">
                  <span className="w-2.5 h-2.5 bg-[#B89246]" />
                  <span>กำลังทำ: <strong className="text-[#E5C989] font-bold">{todayActive}</strong></span>
                </span>
                {todayOverdue > 0 && (
                  <span className="flex items-center gap-1.5 bg-[#1a1400] px-2.5 py-1 border border-[#FFEA00] text-[#FFEA00] font-bold shadow-[2px_2px_0px_#FFEA00]">
                    <span className="w-2.5 h-2.5 bg-[#FFEA00] shadow-[0_0_6px_#FFEA00] animate-pulse" />
                    <span>เกินกำหนด: <strong>{todayOverdue}</strong></span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SUPPORT STACK (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Card 1: พันธกิจประจำเดือน (Monthly Commitments) */}
          <div 
            style={{ backgroundColor: '#102A43' }} 
            className="cyber-grid-dark text-white border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] flex flex-col justify-between flex-1"
          >
            <div className="terminal-titlebar px-3.5 py-2 flex items-center justify-between text-[#B89246] border-b border-[#B89246] bg-[#060E21]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#B89246]" />
                <span className="font-bold tracking-wider">[ 02 // MONTHLY_COMMITMENTS.SYS ]</span>
              </div>
              <span className="text-[10px] text-[#00F0FF] font-mono font-bold">STATUS: ACTIVE</span>
            </div>

            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-tech font-bold uppercase tracking-widest text-[#B89246]">
                    พันธกิจประจำเดือน (MONTHLY SCOPE)
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-tech text-5xl font-black text-white tracking-tight">
                      {mt.length}
                    </span>
                    <span className="text-xs font-tech text-[#00F0FF] uppercase font-bold tracking-wider">
                      TOTAL_TASKS
                    </span>
                  </div>
                  <p className="text-xs font-tech text-slate-200 mt-1.5">
                    รอบเดือน <span className="font-bold text-[#FFEA00]">{gFilt.month}</span> (ปิดสำเร็จ <strong className="text-[#00F0FF]">{monthDone}</strong> รายการ)
                  </p>
                </div>
                <div className="p-3 bg-[#0B1B3D] text-[#B89246] border border-[#B89246] shadow-[3px_3px_0px_#060E21]">
                  <Icon name="listTodo" size={24} color="#B89246" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#B89246]/30 flex items-center justify-between text-xs font-tech">
                <span className="text-slate-200 font-semibold">อัตราปิดงานประจำเดือน</span>
                <span className="font-bold text-[#00F0FF] bg-[#0B1B3D] px-2.5 py-1 border border-[#00F0FF]/40 shadow-[2px_2px_0px_#060E21]">
                  {monthRate}% SUCCESS
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: จุดวิกฤตที่ต้องสนับสนุน (Priority Escalation) */}
          <div
            onClick={() => onOpenOverdueModal && onOpenOverdueModal(ov)}
            style={{ backgroundColor: ov.length > 0 ? '#060E21' : '#102A43' }}
            className={`border-2 transition-all duration-150 cursor-pointer flex flex-col justify-between flex-1 ${
              ov.length > 0
                ? 'border-[#FFEA00] shadow-[5px_5px_0px_#FFEA00] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px]'
                : 'border-[#00F0FF] shadow-[4px_4px_0px_#0B1B3D] hover:shadow-[4px_4px_0px_#00F0FF]'
            }`}
          >
            <div className={`terminal-titlebar px-3.5 py-2 flex items-center justify-between border-b ${
              ov.length > 0 ? 'bg-[#1a1400] text-[#FFEA00] border-[#FFEA00]' : 'bg-[#060E21] text-[#00F0FF] border-[#00F0FF]'
            }`}>
              <div className="flex items-center gap-2 font-mono">
                <span className={`w-2 h-2 ${ov.length > 0 ? 'bg-[#FFEA00] animate-ping' : 'bg-[#00F0FF]'}`} />
                <span className="font-bold tracking-wider">[ 03 // SLA_RISK_PROTOCOL ]</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 border ${
                ov.length > 0 ? 'bg-[#FFEA00] text-black border-[#FFEA00] font-bold' : 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/40 font-bold'
              }`}>
                {ov.length > 0 ? 'ALERT: CRITICAL' : 'ALL_NORMAL'}
              </span>
            </div>

            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-tech font-bold uppercase tracking-wider text-slate-200">
                      งานเกินกำหนด / SLA ล่าช้า
                    </span>
                    {ov.length > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-tech font-black bg-[#FFEA00] text-black border border-[#FFEA00] uppercase shadow-[2px_2px_0px_#060E21]">
                        ESCALATION
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span
                      className={`font-tech text-5xl font-black tracking-tight ${
                        ov.length > 0 ? 'text-[#FFEA00] drop-shadow-[0_0_12px_rgba(255,234,0,0.5)]' : 'text-slate-100'
                      }`}
                    >
                      {ov.length}
                    </span>
                    <span className="text-xs font-tech text-slate-300 uppercase font-bold tracking-wider">
                      TASKS_EXCEEDED
                    </span>
                  </div>
                  <p className="text-xs font-tech text-slate-200 mt-1.5">
                    {ov.length > 0
                      ? `ค้างส่งมอบ ${activeOvdCount} | ปิดงานช้า ${completedLateCount}`
                      : 'ทุกรายการอยู่ในกรอบเวลา SLA ปกติ'}
                  </p>
                </div>
                <div
                  className={`p-3 border shrink-0 ${
                    ov.length > 0 
                      ? 'bg-[#FFEA00]/15 border-[#FFEA00] text-[#FFEA00] shadow-[3px_3px_0px_#FFEA00]' 
                      : 'bg-[#0B1B3D] border-[#00F0FF]/40 text-[#00F0FF]'
                  }`}
                >
                  <Icon name="alertTriangle" size={24} color={ov.length > 0 ? '#FFEA00' : '#00F0FF'} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-tech">
                {ov.length > 0 ? (
                  <span className="text-[#FFEA00] font-bold flex items-center gap-1.5">
                    <span>▶ คลิกตรวจสอบรายการวิกฤต</span>
                    <span className="bg-[#FFEA00]/20 px-1 py-0.2 border border-[#FFEA00]/50">[AUDIT_LOG]</span>
                  </span>
                ) : (
                  <span className="text-[#00F0FF] font-medium flex items-center gap-1">
                    <span>✓ ตรวจสอบแล้ว: สถานะ SLA ปกติ</span>
                  </span>
                )}
                <span className="text-[10px] text-slate-300 font-tech">SLA_MONITOR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section Header with View Selector */}
      <div 
        style={{ backgroundColor: '#0B1B3D' }} 
        className="border-2 border-[#B89246] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0px_#B89246]"
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-[#B89246] shadow-[0_0_6px_#B89246]" />
          <h3 className="text-base font-bold font-serif text-[#B89246] tracking-wider uppercase">
            [ 04 // OPERATIONAL_ANALYTICS.EXE ]
          </h3>
        </div>
        <div className="inline-flex bg-[#060E21] p-1 border border-[#B89246] text-xs font-tech text-slate-300 self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setChartTab('all')}
            className={`px-3 py-1.5 transition-all cursor-pointer font-bold border ${
              chartTab === 'all'
                ? 'bg-[#B89246] text-[#0B1B3D] border-[#00F0FF] shadow-[2px_2px_0px_#00F0FF]'
                : 'border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            [ SHOW ALL ]
          </button>
          <button
            type="button"
            onClick={() => setChartTab('status')}
            className={`px-3 py-1.5 transition-all cursor-pointer font-bold border ${
              chartTab === 'status'
                ? 'bg-[#B89246] text-[#0B1B3D] border-[#00F0FF] shadow-[2px_2px_0px_#00F0FF]'
                : 'border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            [ STATUS ]
          </button>
          <button
            type="button"
            onClick={() => setChartTab('requester')}
            className={`px-3 py-1.5 transition-all cursor-pointer font-bold border ${
              chartTab === 'requester'
                ? 'bg-[#B89246] text-[#0B1B3D] border-[#00F0FF] shadow-[2px_2px_0px_#00F0FF]'
                : 'border-transparent hover:text-white hover:bg-white/10'
            }`}
          >
            [ REQUESTERS ]
          </button>
        </div>
      </div>

      {/* 1. Status Charts */}
      {(chartTab === 'all' || chartTab === 'status') && (
        <div className="space-y-3">
          {chartTab === 'all' && (
            <div className="flex items-center gap-2 text-xs font-bold text-[#B89246] font-tech uppercase tracking-wider pl-1">
              <span className="w-2 h-2 bg-[#00F0FF] shadow-[0_0_4px_#00F0FF]"></span>
              <span>[ SECTION 4.1 // TASK_STATUS_BREAKDOWN ]</span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1 */}
            <div 
              style={{ backgroundColor: '#102A43' }} 
              className="border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] text-white"
            >
              <div className="terminal-titlebar px-3.5 py-2 flex items-center justify-between text-[#B89246] border-b border-[#B89246] bg-[#060E21]">
                <span className="font-bold tracking-wide">[ CHART // TODAY_TASKS_STATUS ]</span>
                <span className="text-[10px] text-[#00F0FF] font-mono font-bold">STATUS: VISUALIZED</span>
              </div>
              <div className="p-6">
                <SimplePieChart data={getChartData(dy)} title="สถานะงานวันนี้ (Today's Tasks)" />
              </div>
            </div>

            {/* Chart 2 */}
            <div 
              style={{ backgroundColor: '#102A43' }} 
              className="border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] text-white"
            >
              <div className="terminal-titlebar px-3.5 py-2 flex items-center justify-between text-[#B89246] border-b border-[#B89246] bg-[#060E21]">
                <span className="font-bold tracking-wide">[ CHART // MONTHLY_TASKS_STATUS ]</span>
                <span className="text-[10px] text-[#00F0FF] font-mono font-bold">PERIOD: {gFilt.month}</span>
              </div>
              <div className="p-6">
                <SimplePieChart data={getChartData(mt)} title="สถานะงานประจำเดือน (Monthly Status)" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Requester Charts */}
      {(chartTab === 'all' || chartTab === 'requester') && (
        <div className="space-y-3">
          {chartTab === 'all' && (
            <div className="flex items-center gap-2 text-xs font-bold text-[#B89246] pt-2 font-tech uppercase tracking-wider pl-1">
              <span className="w-2 h-2 bg-[#FFEA00] shadow-[0_0_4px_#FFEA00]"></span>
              <span>[ SECTION 4.2 // REQUESTER_DISTRIBUTION ]</span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Today's Requester Distribution */}
            <div 
              style={{ backgroundColor: '#102A43' }} 
              className="border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] text-white flex flex-col justify-between"
            >
              <div className="terminal-titlebar px-3.5 py-2 flex items-center justify-between text-[#B89246] border-b border-[#B89246] bg-[#060E21]">
                <span className="font-bold tracking-wide">[ CHART // TODAY_REQUESTERS ]</span>
                <span className="text-[10px] text-[#FFEA00] font-mono font-bold">FEED: LIVE</span>
              </div>
              <div className="p-6 flex-1">
                <SimplePieChart 
                  data={getRequesterChartData(dy)} 
                  title="สัดส่วนผู้แจ้งงานวันนี้ (Today's Requesters)" 
                />
              </div>
              <div className="mx-6 mb-5 p-3 bg-[#060E21] border border-[#B89246] flex items-center justify-between text-xs font-tech">
                <span className="text-slate-300">ผู้แจ้งงานสูงสุดวันนี้:</span>
                {getRequesterChartData(dy).length > 0 && dy.length > 0 ? (
                  <span className="font-bold text-[#00F0FF] bg-[#102A43] px-2 py-0.5 border border-[#00F0FF]/40">
                    ★ {getRequesterChartData(dy)[0].name} ({getRequesterChartData(dy)[0].value} งาน / {((getRequesterChartData(dy)[0].value / dy.length) * 100).toFixed(1)}%)
                  </span>
                ) : (
                  <span className="text-slate-400">- ไม่มีข้อมูลงานวันนี้ -</span>
                )}
              </div>
            </div>

            {/* Monthly Requester Distribution */}
            <div 
              style={{ backgroundColor: '#102A43' }} 
              className="border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] text-white flex flex-col justify-between"
            >
              <div className="terminal-titlebar px-3.5 py-2 flex items-center justify-between text-[#B89246] border-b border-[#B89246] bg-[#060E21]">
                <span className="font-bold tracking-wide">[ CHART // MONTHLY_REQUESTERS ]</span>
                <span className="text-[10px] text-[#B89246] font-mono font-bold">SCOPE: {gFilt.month}</span>
              </div>
              <div className="p-6 flex-1">
                <SimplePieChart 
                  data={getRequesterChartData(mt)} 
                  title={`สัดส่วนผู้แจ้งงานประจำเดือน (${gFilt.month})`} 
                />
              </div>
              <div className="mx-6 mb-5 p-3 bg-[#060E21] border border-[#B89246] flex items-center justify-between text-xs font-tech">
                <span className="text-slate-300">ผู้แจ้งงานสูงสุดประจำเดือน:</span>
                {getRequesterChartData(mt).length > 0 && mt.length > 0 ? (
                  <span className="font-bold text-[#FFEA00] bg-[#102A43] px-2 py-0.5 border border-[#FFEA00]/40">
                    ★ {getRequesterChartData(mt)[0].name} ({getRequesterChartData(mt)[0].value} งาน / {((getRequesterChartData(mt)[0].value / mt.length) * 100).toFixed(1)}%)
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
