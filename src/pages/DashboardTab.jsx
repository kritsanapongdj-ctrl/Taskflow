import React, { useState } from 'react';
import SimplePieChart from '../components/charts/SimplePieChart';
import { getTaskOverdueInfo } from '../utils/overdueHelper';

const REQUESTER_PALETTE = {
  'SVC': '#0B1B3D',
  'ICSC': '#B89246',
  'จนท./ผจก.LH': '#00F0FF',
  'ผู้ควบคุมงาน': '#FFEA00',
  'CEM': '#E5C989',
};
const FALLBACK_COLORS = ['#B89246', '#00F0FF', '#FFEA00', '#102A43', '#8C6C29', '#38BDF8'];

// 10-Segment Retro Pixel Progress Meter
function PixelProgressMeter({ done = 0, active = 0, overdue = 0, totalCount = 1 }) {
  const safeTotal = Math.max(totalCount, 1);
  const doneBlocks = Math.min(10, Math.round((done / safeTotal) * 10));
  const overdueBlocks = Math.min(10 - doneBlocks, Math.round((overdue / safeTotal) * 10));
  const activeBlocks = Math.min(10 - doneBlocks - overdueBlocks, Math.round((active / safeTotal) * 10));

  return (
    <div className="flex gap-1.5 w-full">
      {Array.from({ length: 10 }).map((_, i) => {
        let blockStyle = 'bg-[#102A43] border border-[#B89246]/40';
        if (i < doneBlocks) {
          blockStyle = 'bg-[#00F0FF] border-[#00F0FF] shadow-[0_0_6px_#00F0FF]';
        } else if (i < doneBlocks + activeBlocks) {
          blockStyle = 'bg-[#B89246] border-[#B89246] shadow-[0_0_5px_#B89246]';
        } else if (i < doneBlocks + activeBlocks + overdueBlocks) {
          blockStyle = 'bg-[#FFEA00] border-[#FFEA00] shadow-[0_0_6px_#FFEA00]';
        }
        return (
          <div key={i} className={`h-2.5 flex-1 rounded-none ${blockStyle} transition-all duration-300`} />
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
      <div className="bg-[#0B1B3D] border-2 border-[#B89246] p-4 shadow-[4px_4px_0px_#B89246] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] inline-block" />
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#B89246] tracking-wider flex items-center gap-2">
              LAND & HOUSES // ภาพรวมผลการดำเนินงาน
              <span className="text-xs font-tech font-normal text-[#00F0FF] bg-[#102A43] px-2 py-0.5 border border-[#00F0FF]/40">
                [ PERIOD: {gFilt.month} ]
              </span>
            </h2>
          </div>
          <p className="text-xs font-tech text-slate-300 mt-1 ml-4.5 tracking-wide">
            SYS_TELEMETRY: CENTRALIZED EXECUTIVE COMMAND &amp; CONTROL CONSOLE
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-[#060E21] border border-[#00F0FF] px-3 py-1.5 shadow-[2px_2px_0px_#00F0FF]">
          <span className="w-2 h-2 bg-[#00F0FF] animate-ping" />
          <span className="text-xs font-tech font-bold text-[#00F0FF] tracking-widest">
            REAL-TIME TELEMETRY ONLINE
          </span>
        </div>
      </div>

      {/* Asymmetric Bento Terminal Windows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* HERO CARD (Span 7) - Today's Operational Targets */}
        <div className="lg:col-span-7 bg-[#0B1B3D] cyber-grid-dark cyber-scanlines text-white border-2 border-[#B89246] shadow-[5px_5px_0px_#B89246] relative flex flex-col justify-between group overflow-hidden">
          {/* Terminal Window Titlebar */}
          <div className="terminal-titlebar px-3 py-1.5 flex items-center justify-between text-[#B89246] border-b border-[#B89246]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00F0FF]" />
              <span>[ 01 // TODAY_TARGETS.LOG ]</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <span className="px-1 border border-[#B89246]/40">[ _ ]</span>
              <span className="px-1 border border-[#B89246]/40">[ □ ]</span>
              <span className="px-1 border border-[#B89246]/40 text-rose-400">[ X ]</span>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            {/* Top Telemetry Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00F0FF] shadow-[0_0_6px_#00F0FF] animate-pulse inline-block" />
                <span className="text-xs font-tech font-bold uppercase tracking-widest text-[#00F0FF]">
                  เป้าหมายส่งมอบวันนี้ (TODAY'S OPERATIONS)
                </span>
              </div>
              <span className="text-xs font-tech font-bold text-[#FFEA00] bg-[#102A43] px-2.5 py-0.5 border border-[#FFEA00]/60 shadow-[2px_2px_0px_#0B1B3D]">
                DATE: {gFilt.date || tS}
              </span>
            </div>

            {/* Main Metric with Oversized Monospace Numeral */}
            <div className="mt-5 flex items-baseline justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-tech text-6xl sm:text-7xl font-black text-white tracking-tight drop-shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                    {dy.length}
                  </span>
                  <span className="text-sm font-tech font-bold text-[#B89246] uppercase tracking-widest">
                    TASKS_QUEUED
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 font-tech mt-1 tracking-wide">
                  จำนวนภารกิจที่ต้องปฏิบัติการและส่งมอบในรอบผลัดงานวันนี้
                </p>
              </div>

              <div className="p-3 bg-[#102A43] text-[#B89246] border border-[#B89246] shadow-[3px_3px_0px_#B89246] shrink-0">
                <Icon name="calendar" size={32} color="#B89246" />
              </div>
            </div>

            {/* 10-Segment Pixelated Progress Tracker */}
            <div className="mt-6 pt-5 border-t border-[#B89246]/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-tech">
                <span className="text-slate-300 uppercase tracking-wider">ความคืบหน้าการส่งมอบ (PIXEL_RATE)</span>
                <span className="font-bold text-[#00F0FF] bg-[#102A43] px-2 py-0.5 border border-[#00F0FF]/40 shadow-[2px_2px_0px_#0B1B3D]">
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

              {/* Micro Status Legend */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] font-tech text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#00F0FF] shadow-[0_0_4px_#00F0FF]" />
                  <span>เสร็จสิ้น: <strong className="text-white">{todayDone}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#B89246]" />
                  <span>กำลังทำ: <strong className="text-white">{todayActive}</strong></span>
                </span>
                {todayOverdue > 0 && (
                  <span className="flex items-center gap-1.5 text-[#FFEA00] font-bold">
                    <span className="w-2 h-2 bg-[#FFEA00] shadow-[0_0_6px_#FFEA00] animate-pulse" />
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
          <div className="bg-[#102A43] cyber-grid-dark text-white border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] flex flex-col justify-between flex-1">
            <div className="terminal-titlebar px-3 py-1.5 flex items-center justify-between text-[#B89246] border-b border-[#B89246]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#B89246]" />
                <span>[ 02 // MONTHLY_COMMITMENTS.SYS ]</span>
              </div>
              <span className="text-[10px] text-[#00F0FF] font-mono">STATUS: ACTIVE</span>
            </div>

            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-tech font-bold uppercase tracking-widest text-[#B89246]">
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
                  <p className="text-xs font-tech text-slate-300 mt-1">
                    รอบเดือน <span className="font-bold text-[#FFEA00]">{gFilt.month}</span> (ปิดสำเร็จ {monthDone} รายการ)
                  </p>
                </div>
                <div className="p-3 bg-[#0B1B3D] text-[#B89246] border border-[#B89246] shadow-[3px_3px_0px_#B89246]">
                  <Icon name="listTodo" size={24} color="#B89246" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#B89246]/40 flex items-center justify-between text-xs font-tech">
                <span className="text-slate-300">อัตราปิดงานประจำเดือน</span>
                <span className="font-bold text-[#00F0FF] bg-[#0B1B3D] px-2 py-0.5 border border-[#00F0FF]/40">
                  {monthRate}% SUCCESS
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: จุดวิกฤตที่ต้องสนับสนุน (Priority Escalation) */}
          <div
            onClick={() => onOpenOverdueModal && onOpenOverdueModal(ov)}
            className={`border-2 transition-all duration-150 cursor-pointer flex flex-col justify-between flex-1 ${
              ov.length > 0
                ? 'bg-[#060E21] border-[#FFEA00] shadow-[5px_5px_0px_#FFEA00] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px]'
                : 'bg-[#102A43] border-[#00F0FF] shadow-[4px_4px_0px_#0B1B3D] hover:shadow-[4px_4px_0px_#00F0FF]'
            }`}
          >
            <div className={`terminal-titlebar px-3 py-1.5 flex items-center justify-between border-b ${
              ov.length > 0 ? 'bg-[#1a1400] text-[#FFEA00] border-[#FFEA00]' : 'bg-[#0B1B3D] text-[#00F0FF] border-[#00F0FF]'
            }`}>
              <div className="flex items-center gap-2 font-mono">
                <span className={`w-2 h-2 ${ov.length > 0 ? 'bg-[#FFEA00] animate-ping' : 'bg-[#00F0FF]'}`} />
                <span>[ 03 // SLA_RISK_PROTOCOL ]</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 border ${
                ov.length > 0 ? 'bg-[#FFEA00] text-black border-[#FFEA00] font-bold' : 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/40'
              }`}>
                {ov.length > 0 ? 'ALERT: CRITICAL' : 'ALL_NORMAL'}
              </span>
            </div>

            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-tech font-bold uppercase tracking-wider text-slate-300">
                      งานเกินกำหนด / SLA ล่าช้า
                    </span>
                    {ov.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-tech font-black bg-[#FFEA00] text-black border border-[#FFEA00] uppercase">
                        [ ESCALATION ]
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span
                      className={`font-tech text-5xl font-black tracking-tight ${
                        ov.length > 0 ? 'text-[#FFEA00] drop-shadow-[0_0_10px_rgba(255,234,0,0.4)]' : 'text-slate-200'
                      }`}
                    >
                      {ov.length}
                    </span>
                    <span className="text-xs font-tech text-slate-400 uppercase font-bold">
                      TASKS_EXCEEDED
                    </span>
                  </div>
                  <p className="text-xs font-tech text-slate-300 mt-1">
                    {ov.length > 0
                      ? `ค้างส่งมอบ ${activeOvdCount} | ปิดงานช้า ${completedLateCount}`
                      : 'ทุกรายการอยู่ในกรอบเวลา SLA ปกติ'}
                  </p>
                </div>
                <div
                  className={`p-3 border shrink-0 ${
                    ov.length > 0 
                      ? 'bg-[#FFEA00]/10 border-[#FFEA00] text-[#FFEA00] shadow-[3px_3px_0px_#FFEA00]' 
                      : 'bg-[#102A43] border-slate-600 text-slate-400'
                  }`}
                >
                  <Icon name="alertTriangle" size={24} color={ov.length > 0 ? '#FFEA00' : '#00F0FF'} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-tech">
                {ov.length > 0 ? (
                  <span className="text-[#FFEA00] font-bold flex items-center gap-1.5">
                    <span>▶ คลิกตรวจสอบรายการวิกฤต</span>
                    <span>[AUDIT_LOG]</span>
                  </span>
                ) : (
                  <span className="text-[#00F0FF] font-medium flex items-center gap-1">
                    <span>✓ ตรวจสอบแล้ว: สถานะ SLA ปกติ</span>
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-tech">SLA_MONITOR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section Header with View Selector */}
      <div className="bg-[#0B1B3D] border-2 border-[#B89246] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0px_#0B1B3D]">
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
            <div className="flex items-center gap-2 text-xs font-bold text-[#B89246] font-tech uppercase tracking-wider">
              <span className="w-2 h-2 bg-[#00F0FF] shadow-[0_0_4px_#00F0FF]"></span>
              [ SECTION 4.1 // TASK_STATUS_BREAKDOWN ]
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1 */}
            <div className="bg-[#102A43] border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] text-white">
              <div className="terminal-titlebar px-3 py-1.5 flex items-center justify-between text-[#B89246] border-b border-[#B89246]">
                <span>[ CHART // TODAY_TASKS_STATUS ]</span>
                <span className="text-[10px] text-[#00F0FF] font-mono">STATUS: VISUALIZED</span>
              </div>
              <div className="p-6">
                <SimplePieChart data={getChartData(dy)} title="สถานะงานวันนี้ (Today's Tasks)" />
              </div>
            </div>

            {/* Chart 2 */}
            <div className="bg-[#102A43] border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] text-white">
              <div className="terminal-titlebar px-3 py-1.5 flex items-center justify-between text-[#B89246] border-b border-[#B89246]">
                <span>[ CHART // MONTHLY_TASKS_STATUS ]</span>
                <span className="text-[10px] text-[#00F0FF] font-mono">PERIOD: {gFilt.month}</span>
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
            <div className="flex items-center gap-2 text-xs font-bold text-[#B89246] pt-2 font-tech uppercase tracking-wider">
              <span className="w-2 h-2 bg-[#FFEA00] shadow-[0_0_4px_#FFEA00]"></span>
              [ SECTION 4.2 // REQUESTER_DISTRIBUTION ]
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Today's Requester Distribution */}
            <div className="bg-[#102A43] border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] text-white flex flex-col justify-between">
              <div className="terminal-titlebar px-3 py-1.5 flex items-center justify-between text-[#B89246] border-b border-[#B89246]">
                <span>[ CHART // TODAY_REQUESTERS ]</span>
                <span className="text-[10px] text-[#FFEA00] font-mono">FEED: LIVE</span>
              </div>
              <div className="p-6 flex-1">
                <SimplePieChart 
                  data={getRequesterChartData(dy)} 
                  title="สัดส่วนผู้แจ้งงานวันนี้ (Today's Requesters)" 
                />
              </div>
              <div className="mx-6 mb-5 p-2.5 bg-[#0B1B3D] border border-[#B89246] flex items-center justify-between text-xs font-tech">
                <span className="text-slate-400">ผู้แจ้งงานสูงสุดวันนี้:</span>
                {getRequesterChartData(dy).length > 0 && dy.length > 0 ? (
                  <span className="font-bold text-[#00F0FF]">
                    ★ {getRequesterChartData(dy)[0].name} ({getRequesterChartData(dy)[0].value} งาน / {((getRequesterChartData(dy)[0].value / dy.length) * 100).toFixed(1)}%)
                  </span>
                ) : (
                  <span className="text-slate-500">- ไม่มีข้อมูลงานวันนี้ -</span>
                )}
              </div>
            </div>

            {/* Monthly Requester Distribution */}
            <div className="bg-[#102A43] border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] text-white flex flex-col justify-between">
              <div className="terminal-titlebar px-3 py-1.5 flex items-center justify-between text-[#B89246] border-b border-[#B89246]">
                <span>[ CHART // MONTHLY_REQUESTERS ]</span>
                <span className="text-[10px] text-[#B89246] font-mono">SCOPE: {gFilt.month}</span>
              </div>
              <div className="p-6 flex-1">
                <SimplePieChart 
                  data={getRequesterChartData(mt)} 
                  title={`สัดส่วนผู้แจ้งงานประจำเดือน (${gFilt.month})`} 
                />
              </div>
              <div className="mx-6 mb-5 p-2.5 bg-[#0B1B3D] border border-[#B89246] flex items-center justify-between text-xs font-tech">
                <span className="text-slate-400">ผู้แจ้งงานสูงสุดประจำเดือน:</span>
                {getRequesterChartData(mt).length > 0 && mt.length > 0 ? (
                  <span className="font-bold text-[#FFEA00]">
                    ★ {getRequesterChartData(mt)[0].name} ({getRequesterChartData(mt)[0].value} งาน / {((getRequesterChartData(mt)[0].value / mt.length) * 100).toFixed(1)}%)
                  </span>
                ) : (
                  <span className="text-slate-500">- ไม่มีข้อมูลงานเดือนนี้ -</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
