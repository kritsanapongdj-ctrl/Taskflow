import React, { useState, useEffect } from 'react';
import { getTaskOverdueInfo } from '../utils/overdueHelper';

export default function DailyTasksTab({
  tasks = [],
  gFilt,
  getTStr,
  getStdProj,
  checkStaffMatch,
  chkOvdTimeAware,
  fDate,
  openTaskModal,
  initSt,
  deleteTask,
  onOpenTimeline,
  highlightTaskId = null,
  setHighlightTaskId,
  sets = {},
  Icon,
  isSupervisor = false
}) {
  const [onlyOverdueFilter, setOnlyOverdueFilter] = useState(false);
  const tD = gFilt.date;
  const today = getTStr ? getTStr() : new Date().toISOString().split('T')[0];

  // Auto-scroll และ Highlight เมื่อมี highlightTaskId ถูกส่งเข้ามาจาก Overdue Modal
  useEffect(() => {
    if (!highlightTaskId) return;

    const timer = setTimeout(() => {
      const el =
        document.getElementById(`task-card-${highlightTaskId}`) ||
        document.getElementById(`task-row-${highlightTaskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    const clearTimer = setTimeout(() => {
      if (setHighlightTaskId) setHighlightTaskId(null);
    }, 4500);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearTimer);
    };
  }, [highlightTaskId, setHighlightTaskId]);

  const vT = tasks.filter(
    (t) =>
      t.status !== 'ยกเลิก' &&
      (gFilt.area === 'ทั้งหมด' || t.area === gFilt.area) &&
      (gFilt.project === 'ทั้งหมด' || getStdProj(t.project) === gFilt.project) &&
      checkStaffMatch(t.project, gFilt.staffName) &&
      (!gFilt.requester || gFilt.requester === 'ทั้งหมด' || t.requester === gFilt.requester) &&
      (t.id === highlightTaskId ||
        (tD >= t.startDate && tD <= t.endDate) ||
        (!t.status?.startsWith('จบงาน') && chkOvdTimeAware && chkOvdTimeAware(t, tD) && tD === today))
  );

  // คำนวณข้อมูล Overdue ของแต่ละงานในรายการ
  const tasksWithOverdue = vT.map((t) => ({
    ...t,
    overdueInfo: getTaskOverdueInfo(t, today, sets)
  }));

  const overdueCount = tasksWithOverdue.filter((t) => t.overdueInfo.isOverdue).length;

  const displayTasks = onlyOverdueFilter
    ? tasksWithOverdue.filter((t) => t.overdueInfo.isOverdue)
    : tasksWithOverdue;

  const handleEdit = (t) => {
    const pwd = prompt('กรุณาใส่รหัสผ่านเพื่อแก้ไขข้อมูล:');
    if (pwd !== '131236') return alert('รหัสผ่านไม่ถูกต้อง!');
    openTaskModal(t);
  };

  const getStatusBadge = (status) => {
    if (status?.startsWith('จบงาน')) {
      if (status === 'จบงาน(รอใบงาน)') {
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-bold bg-[#102A43] text-[#FFEA00] border border-[#FFEA00]/80 inline-flex items-center gap-1.5 shrink-0 font-tech shadow-[1px_1px_0px_#FFEA00]">
            <span className="w-1.5 h-1.5 bg-[#FFEA00]"></span>
            จบงาน (รอใบงาน)
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 text-[10.5px] font-bold bg-[#060E21] text-[#00F0FF] border border-[#00F0FF]/80 inline-flex items-center gap-1.5 shrink-0 font-tech shadow-[1px_1px_0px_#00F0FF]">
          <span className="w-1.5 h-1.5 bg-[#00F0FF]"></span>
          จบงาน
        </span>
      );
    }
    if (status === 'กำลังดำเนินการ' || status === 'อยู่ระหว่างดำเนินการ') {
      return (
        <span className="px-2 py-0.5 text-[10.5px] font-bold bg-[#102A43] text-[#00F0FF] border border-[#00F0FF] inline-flex items-center gap-1.5 shrink-0 font-tech shadow-[2px_2px_0px_#00F0FF]">
          <span className="w-1.5 h-1.5 bg-[#00F0FF] animate-pulse"></span>
          กำลังดำเนินการ
        </span>
      );
    }
    if (status === 'ติดปัญหา/รออะไหล่' || status === 'รออะไหล่/ติดปัญหา') {
      return (
        <span className="px-2 py-0.5 text-[10.5px] font-bold bg-[#2A0812] text-[#FF6B6B] border border-[#FF6B6B] inline-flex items-center gap-1.5 shrink-0 font-tech shadow-[2px_2px_0px_#FF6B6B]">
          <span className="w-1.5 h-1.5 bg-[#FF6B6B] animate-pulse"></span>
          ติดปัญหา/รออะไหล่
        </span>
      );
    }
    if (status === 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)') {
      return (
        <span className="px-2 py-0.5 text-[10.5px] font-bold bg-rose-950 text-white border-2 border-rose-500 inline-flex items-center gap-1.5 shrink-0 animate-pulse font-tech shadow-[2px_2px_0px_#f43f5e]" title="ถูกผู้ดูแลลงโทษตัดคะแนนวินัยและ SLA">
          <span className="w-1.5 h-1.5 bg-rose-500"></span>
          🚨 ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)
        </span>
      );
    }
    if (status === 'เลื่อนวันเริ่ม') {
      return (
        <span className="px-2 py-0.5 text-[10.5px] font-bold bg-[#0B1B3D] text-[#70A5FF] border border-[#70A5FF]/70 inline-flex items-center gap-1.5 shrink-0 font-tech shadow-[1px_1px_0px_#70A5FF]">
          <span className="w-1.5 h-1.5 bg-[#70A5FF]"></span>
          เลื่อนวันเริ่ม
        </span>
      );
    }
    if (status === 'เลื่อนวันจบ' || status === 'เลื่อนงาน') {
      return (
        <span className="px-2 py-0.5 text-[10.5px] font-bold bg-[#1E1238] text-[#C084FC] border border-[#C084FC]/70 inline-flex items-center gap-1.5 shrink-0 font-tech shadow-[1px_1px_0px_#C084FC]">
          <span className="w-1.5 h-1.5 bg-[#C084FC]"></span>
          เลื่อนวันจบ
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10.5px] font-bold bg-[#0B1B3D] text-slate-300 border border-slate-600 inline-flex items-center gap-1.5 shrink-0 font-tech">
        <span className="w-1.5 h-1.5 bg-slate-400"></span>
        {status || 'รอดำเนินการ'}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in">
      {/* Top Header & Quick Overdue Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#0B1B3D] border-2 border-[#B89246] shadow-[3px_3px_0px_#B89246]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-5 bg-[#B89246] inline-block shadow-[0_0_8px_#B89246]" />
            <h2 className="text-sm sm:text-base font-serif font-bold text-[#B89246] tracking-wider uppercase">
              DAILY OPERATIONS // งานประจำวัน
            </h2>
          </div>
          <span className="text-[11px] bg-[#102A43] text-[#00F0FF] font-tech font-bold px-2 py-0.5 border border-[#00F0FF]/40">
            [ {displayTasks.length} TASKS ]
          </span>

          {/* Quick Overdue Filter Button */}
          {overdueCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyOverdueFilter(!onlyOverdueFilter)}
              className={`px-2.5 py-1 text-xs font-bold font-tech transition-all flex items-center gap-1.5 cursor-pointer border ${
                onlyOverdueFilter
                  ? 'bg-rose-900 text-white border-rose-400 shadow-[2px_2px_0px_#f43f5e]'
                  : 'bg-[#102A43] text-[#FF6B6B] border-rose-500/60 hover:bg-rose-950/60 hover:shadow-[2px_2px_0px_#FF6B6B] active:translate-x-0.5 active:translate-y-0.5'
              }`}
              title="กรองแสดงเฉพาะงานที่เกินกำหนดหรือปิดงานช้า"
            >
              <Icon name="alertTriangle" size={13} className="text-[#FF6B6B]" />
              <span>OVERDUE // เกินกำหนด</span>
              <span
                className={`px-1 py-0.2 text-[10px] font-bold border ${
                  onlyOverdueFilter ? 'bg-white/20 text-white border-white/40' : 'bg-rose-950 text-rose-300 border-rose-500/40'
                }`}
              >
                {overdueCount}
              </span>
            </button>
          )}

          {onlyOverdueFilter && (
            <button
              type="button"
              onClick={() => setOnlyOverdueFilter(false)}
              className="text-xs text-[#00F0FF] hover:underline font-tech font-bold cursor-pointer"
            >
              [ SHOW ALL ]
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => openTaskModal()}
          className="bg-[#B89246] text-[#0B1B3D] px-4 py-2 text-xs font-serif font-bold flex items-center justify-center border-2 border-[#00F0FF] shadow-[3px_3px_0px_#00F0FF] hover:bg-[#d4ac5d] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer self-start sm:self-auto transition-all"
        >
          <Icon name="plus" size={14} className="mr-1.5 text-[#0B1B3D] stroke-[3]" /> + เพิ่มงานใหม่ (NEW_TASK)
        </button>
      </div>

      {/* 1. Mobile View: Responsive Task Cards (width < 768px) */}
      <div className="block md:hidden space-y-3.5 pb-24">
        {displayTasks.map((t) => {
          const info = t.overdueInfo;
          const isHighlighted = highlightTaskId === t.id;
          const currentSelectVal =
            t.status === 'อยู่ระหว่างดำเนินการ'
              ? 'กำลังดำเนินการ'
              : t.status === 'เลื่อนวันเริ่ม'
              ? 'เลื่อนวันเริ่ม'
              : t.status === 'เลื่อนงาน' || t.status === 'เลื่อนวันจบ'
              ? 'เลื่อนวันจบ'
              : t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา'
              ? 'รออะไหล่/ติดปัญหา'
              : t.status;

          return (
            <div
              key={t.id}
              id={`task-card-${t.id}`}
              className={`bg-white p-4 space-y-3 transition-all duration-200 border-2 relative ${
                isHighlighted
                  ? 'border-[#00F0FF] bg-cyan-50/40 shadow-[4px_4px_0px_#00F0FF] animate-pulse'
                  : info.isOverdue
                  ? 'border-rose-500 bg-white shadow-[3px_3px_0px_#e11d48]'
                  : 'border-[#0B1B3D] shadow-[3px_3px_0px_#0B1B3D] hover:shadow-[4px_4px_0px_#B89246] hover:border-[#B89246]'
              }`}
            >
              {/* Project & Status Header */}
              <div className="flex items-start justify-between gap-2 border-b-2 border-[#0B1B3D]/15 pb-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[#B89246] text-xs">■</span>
                    <h3 className="font-serif font-bold text-[#0B1B3D] text-base leading-snug break-words tracking-tight">
                      {getStdProj(t.project)}
                    </h3>
                    {info.isOverdue && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-tech font-bold border border-rose-500 bg-rose-50 text-rose-800 shadow-[1px_1px_0px_#f43f5e]">
                        {info.shortBadge}
                      </span>
                    )}
                  </div>
                  {t.area && (
                    <span className="inline-block text-[11px] text-[#B89246] font-tech font-bold mt-0.5">
                      📍 LOC: {t.area}
                    </span>
                  )}
                </div>
                <div>{getStatusBadge(t.status)}</div>
              </div>

              {/* Task Details */}
              <div>
                <div className="text-sm font-medium text-slate-900 leading-relaxed break-words font-sans">
                  {t.details}
                </div>
                <div className="text-[11px] text-slate-500 mt-2 flex flex-wrap gap-1.5 items-center font-tech">
                  <span className="bg-[#0B1B3D] text-[#00F0FF] px-1.5 py-0.5 font-bold border border-[#00F0FF]/30">
                    ID: {t.id}
                  </span>
                  {t.requester && (
                    <span className="text-slate-700 font-sans px-1 border border-slate-300 bg-slate-50">
                      ผู้แจ้ง: {t.requester}
                    </span>
                  )}
                  {t.workOrderNo && (
                    <span className="bg-[#102A43] text-[#FFEA00] font-bold px-1.5 py-0.5 border border-[#FFEA00]/50 shadow-[1px_1px_0px_#FFEA00]">
                      WO: {t.workOrderNo}
                    </span>
                  )}
                  {onOpenTimeline && (
                    <button
                      type="button"
                      onClick={() => onOpenTimeline(t)}
                      className="bg-[#F0F4F8] hover:bg-[#0B1B3D] hover:text-[#00F0FF] text-[#0B1B3D] px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 border border-[#0B1B3D]/30 active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer shadow-[1px_1px_0px_#0B1B3D]"
                      title="ดูประวัติไทม์ไลน์ของงานนี้"
                    >
                      <Icon name="clock" size={11} className="text-[#B89246]" />
                      <span>ไทม์ไลน์</span>
                    </button>
                  )}
                </div>

                {/* Sub-reason banners */}
                {info.reason && (
                  <div className="mt-2 text-xs text-amber-950 bg-amber-50 px-2.5 py-1.5 border-l-4 border-l-amber-500 border border-amber-300 flex items-start gap-1.5">
                    <span className="font-bold shrink-0 font-tech">💬 สาเหตุที่ช้า:</span>
                    <span className="break-words font-medium">{info.reason}</span>
                  </div>
                )}
                {t.startPostponeReason && t.status === 'เลื่อนวันเริ่ม' && (
                  <div className="mt-2 text-xs text-blue-950 bg-blue-50 px-2.5 py-1.5 border-l-4 border-l-blue-500 border border-blue-300 flex items-start gap-1.5">
                    <span className="font-bold shrink-0 font-tech">📅 เหตุผลเลื่อนวันเริ่ม:</span>
                    <span className="break-words font-medium">{t.startPostponeReason}</span>
                  </div>
                )}
                {t.issueReason && (t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา') && (
                  <div className="space-y-1.5 mt-2">
                    <div className="text-xs text-rose-950 bg-rose-50 px-2.5 py-1.5 border-l-4 border-l-rose-500 border border-rose-300 flex items-start gap-1.5">
                      <span className="font-bold shrink-0 font-tech">⚠️ สาเหตุติดปัญหา:</span>
                      <span className="break-words font-medium">{t.issueReason}</span>
                    </div>
                    {(() => {
                      const repTime = t.issueReportedAt || t.startDate;
                      if (!repTime) return null;
                      const waitDays = Math.floor((Date.now() - new Date(repTime).getTime()) / (1000 * 3600 * 24));
                      if (waitDays <= 45) return null;
                      return (
                        <div className="p-2 bg-rose-950 border-2 border-rose-500 text-white text-[11px] font-bold flex items-center justify-between gap-1.5 animate-pulse shadow-[2px_2px_0px_#f43f5e] font-tech">
                          <div className="flex items-center gap-1.5">
                            <span>🚨</span>
                            <span>รออะไหล่เกินเพดาน 45 วัน ({waitDays} วัน)</span>
                          </div>
                          {isSupervisor && (
                            <button
                              type="button"
                              onClick={() => initSt(t.id, 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)')}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white border border-white text-[10px] font-bold cursor-pointer active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                            >
                              ลงโทษตัดคะแนน
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {t.issueReason && t.status !== 'ติดปัญหา/รออะไหล่' && t.status !== 'รออะไหล่/ติดปัญหา' && (
                  <div className="mt-2 text-xs text-amber-950 bg-amber-50/90 px-2.5 py-1.5 border-l-4 border-l-amber-500 border border-amber-300 flex items-start justify-between gap-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold shrink-0 font-tech">⚠️ ประวัติรออะไหล่:</span>
                      <span className="break-words font-medium">{t.issueReason}</span>
                    </div>
                    {onOpenTimeline && (
                      <button
                        type="button"
                        onClick={() => onOpenTimeline(t)}
                        className="text-[10px] font-bold font-tech text-amber-800 underline shrink-0 hover:text-amber-950 cursor-pointer"
                      >
                        [ ไทม์ไลน์ ]
                      </button>
                    )}
                  </div>
                )}
                {t.postponeReason && (t.status === 'เลื่อนวันจบ' || t.status === 'เลื่อนงาน') && (
                  <div className="mt-2 text-xs text-purple-950 bg-purple-50 px-2.5 py-1.5 border-l-4 border-l-purple-500 border border-purple-300 flex items-start gap-1.5">
                    <span className="font-bold shrink-0 font-tech">📅 เหตุผลเลื่อน:</span>
                    <span className="break-words font-medium">{t.postponeReason}</span>
                  </div>
                )}
              </div>

              {/* Duration & Overdue Status */}
              <div className="bg-[#F0F4F8] p-2.5 flex items-center justify-between text-xs text-slate-700 border border-[#0B1B3D]/20 font-tech">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Icon name="calendar" size={14} className="text-[#B89246] shrink-0" />
                  <span>
                    START: <strong className="text-slate-900 whitespace-nowrap">{fDate(t.startDate)}</strong>
                  </span>
                  <span className="text-slate-400">➔</span>
                  <span>
                    END:{' '}
                    <strong
                      className={`whitespace-nowrap ${
                        info.type === 'ACTIVE_OVERDUE'
                          ? 'text-rose-600 font-bold'
                          : info.type === 'COMPLETED_LATE'
                          ? 'text-amber-700 font-bold'
                          : 'text-slate-900'
                      }`}
                    >
                      {fDate(t.endDate)}
                    </strong>
                  </span>
                  {t.completedDate && (
                    <span className="text-[11px] text-emerald-800 font-bold whitespace-nowrap border-l border-slate-300 pl-1.5 ml-1">
                      (CLOSED: <strong>{fDate(t.completedDate)}</strong>)
                    </span>
                  )}
                </div>
                {info.isOverdue && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold border border-rose-500 bg-rose-100 text-rose-800 shrink-0 font-tech shadow-[1px_1px_0px_#f43f5e]">
                    {info.label}
                  </span>
                )}
              </div>

              {/* Mobile Bottom Action Bar (Thumb-friendly >= 44px) */}
              <div className="flex items-center gap-2 pt-2 border-t-2 border-[#0B1B3D]/15">
                <div className="flex-1">
                  <select
                    value={currentSelectVal}
                    onChange={(e) => initSt(t.id, e.target.value)}
                    className="w-full h-11 px-3 border-2 border-[#0B1B3D] text-xs font-bold text-[#0B1B3D] bg-white focus:border-[#B89246] focus:bg-amber-50/20 outline-none shadow-[2px_2px_0px_#0B1B3D] transition-all cursor-pointer font-sans"
                  >
                    <option value="รอดำเนินการ">⏳ รอดำเนินการ</option>
                    <option value="กำลังดำเนินการ">⚙️ กำลังดำเนินการ</option>
                    <option value="รออะไหล่/ติดปัญหา">⚠️ รออะไหล่/ติดปัญหา</option>
                    {(isSupervisor || t.status === 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)') && (
                      <option value="ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)">🚨 ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)</option>
                    )}
                    <option value="เลื่อนวันเริ่ม">📅 เลื่อนวันเริ่ม</option>
                    <option value="เลื่อนวันจบ">📅 เลื่อนวันจบ</option>
                    <option value="จบงาน">✅ จบงาน</option>
                    {t.status === 'จบงาน(รอใบงาน)' && (
                      <option value="จบงาน(รอใบงาน)">📋 จบงาน (รอใบงาน)</option>
                    )}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleEdit(t)}
                  className="w-11 h-11 border-2 border-[#0B1B3D] flex items-center justify-center text-[#0B1B3D] bg-[#F0F4F8] hover:bg-[#B89246] hover:text-white transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_#0B1B3D]"
                  title="แก้ไขงาน"
                >
                  <Icon name="edit2" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteTask(t)}
                  className="w-11 h-11 border-2 border-rose-600 flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_#e11d48]"
                  title="ลบงาน"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Desktop Table View (width >= 768px) */}
      <div className="hidden md:block bg-white border-2 border-[#0B1B3D] shadow-[4px_4px_0px_#0B1B3D] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#0B1B3D] text-white border-b-2 border-[#B89246]">
                <th className="py-3 px-4 w-[36%] min-w-[240px] font-tech text-xs font-bold tracking-wider text-[#B89246] uppercase border-r border-[#102A43]">
                  [ 01 // DETAILS // รายละเอียด ]
                </th>
                <th className="py-3 px-4 w-[20%] min-w-[140px] font-tech text-xs font-bold tracking-wider text-[#B89246] uppercase border-r border-[#102A43]">
                  [ 02 // PROJECT // โครงการ ]
                </th>
                <th className="py-3 px-4 w-[18%] min-w-[160px] font-tech text-xs font-bold tracking-wider text-[#B89246] uppercase border-r border-[#102A43] whitespace-nowrap">
                  [ 03 // SCHEDULE // ระยะเวลา ]
                </th>
                <th className="py-3 px-4 w-[13%] min-w-[120px] font-tech text-xs font-bold tracking-wider text-[#B89246] uppercase border-r border-[#102A43]">
                  [ 04 // STATUS // สถานะ ]
                </th>
                <th className="py-3 px-4 w-[13%] min-w-[130px] font-tech text-xs font-bold tracking-wider text-[#B89246] uppercase text-center">
                  [ 05 // ACTION // จัดการ ]
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0B1B3D]/10">
              {displayTasks.map((t) => {
                const info = t.overdueInfo;
                const isHighlighted = highlightTaskId === t.id;
                const currentSelectVal =
                  t.status === 'อยู่ระหว่างดำเนินการ'
                    ? 'กำลังดำเนินการ'
                    : t.status === 'เลื่อนวันเริ่ม'
                    ? 'เลื่อนวันเริ่ม'
                    : t.status === 'เลื่อนงาน' || t.status === 'เลื่อนวันจบ'
                    ? 'เลื่อนวันจบ'
                    : t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา'
                    ? 'รออะไหล่/ติดปัญหา'
                    : t.status;

                return (
                  <tr
                    key={t.id}
                    id={`task-row-${t.id}`}
                    className={`border-b border-[#0B1B3D]/10 transition-colors ${
                      isHighlighted
                        ? 'border-l-4 border-l-[#00F0FF] bg-[#00F0FF]/10 font-semibold'
                        : info.isOverdue
                        ? 'border-l-4 border-l-rose-600 bg-rose-50/40 hover:bg-rose-50/70'
                        : 'hover:bg-amber-50/20'
                    }`}
                  >
                    <td className="p-3.5 align-top">
                      <div className="font-medium text-slate-900 flex items-center gap-2 leading-relaxed">
                        <span>{t.details}</span>
                        {info.isOverdue && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-tech border border-rose-500 bg-rose-100 text-rose-800 font-bold shadow-[1px_1px_0px_#f43f5e]">
                            {info.shortBadge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1.5 items-center font-tech">
                        <span className="bg-[#0B1B3D] text-[#00F0FF] px-1.5 py-0.2 font-bold border border-[#00F0FF]/30">
                          ID: {t.id}
                        </span>
                        {t.requester && (
                          <span className="text-slate-700 font-sans px-1 border border-slate-300 bg-slate-50">
                            ผู้แจ้ง: {t.requester}
                          </span>
                        )}
                        {t.workOrderNo && (
                          <span className="bg-[#102A43] text-[#FFEA00] font-bold px-1.5 py-0.2 border border-[#FFEA00]/50 shadow-[1px_1px_0px_#FFEA00]">
                            WO:{t.workOrderNo}
                          </span>
                        )}
                        {onOpenTimeline && (
                          <button
                            type="button"
                            onClick={() => onOpenTimeline(t)}
                            className="bg-[#F0F4F8] hover:bg-[#0B1B3D] hover:text-[#00F0FF] text-[#0B1B3D] px-1.5 py-0.2 font-bold inline-flex items-center gap-1 border border-[#0B1B3D]/30 active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer shadow-[1px_1px_0px_#0B1B3D]"
                            title="ดูประวัติไทม์ไลน์"
                          >
                            <Icon name="clock" size={10} className="text-[#B89246]" />
                            <span>ไทม์ไลน์</span>
                          </button>
                        )}
                      </div>
                      {info.reason && (
                        <div className="mt-1 text-xs text-amber-950 bg-amber-50 px-2 py-0.5 border-l-2 border-l-amber-500 border border-amber-300 inline-flex items-center gap-1 max-w-full">
                          <span className="font-bold shrink-0 font-tech">💬 ช้า:</span>
                          <span className="truncate">{info.reason}</span>
                        </div>
                      )}
                      {t.startPostponeReason && t.status === 'เลื่อนวันเริ่ม' && (
                        <div className="mt-1 text-xs text-blue-950 bg-blue-50 px-2 py-0.5 border-l-2 border-l-blue-500 border border-blue-300 inline-flex items-center gap-1 max-w-full">
                          <span className="font-bold shrink-0 font-tech">📅 เลื่อนเริ่ม:</span>
                          <span className="truncate">{t.startPostponeReason}</span>
                        </div>
                      )}
                      {t.issueReason && (t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา') && (
                        <div className="space-y-1 mt-1">
                          <div className="text-xs text-rose-950 bg-rose-50 px-2 py-0.5 border-l-2 border-l-rose-500 border border-rose-300 inline-flex items-center gap-1 max-w-full">
                            <span className="font-bold shrink-0 font-tech">⚠️ ติดปัญหา:</span>
                            <span className="truncate">{t.issueReason}</span>
                          </div>
                          {(() => {
                            const repTime = t.issueReportedAt || t.startDate;
                            if (!repTime) return null;
                            const waitDays = Math.floor((Date.now() - new Date(repTime).getTime()) / (1000 * 3600 * 24));
                            if (waitDays <= 45) return null;
                            return (
                              <div className="p-1.5 bg-rose-950 border border-rose-500 text-white text-[10.5px] font-bold flex items-center justify-between gap-2 animate-pulse shadow-[2px_2px_0px_#f43f5e] font-tech">
                                <div className="flex items-center gap-1">
                                  <span>🚨</span>
                                  <span>รออะไหล่เกิน 45 วัน ({waitDays} วัน)</span>
                                </div>
                                {isSupervisor && (
                                  <button
                                    type="button"
                                    onClick={() => initSt(t.id, 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)')}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white border border-white text-[9.5px] font-bold cursor-pointer active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                                  >
                                    ลงโทษตัดคะแนน
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      {t.issueReason && t.status !== 'ติดปัญหา/รออะไหล่' && t.status !== 'รออะไหล่/ติดปัญหา' && (
                        <div className="mt-1 text-xs text-amber-950 bg-amber-50/90 px-2 py-0.5 border-l-2 border-l-amber-500 border border-amber-300 inline-flex items-center gap-1 max-w-full">
                          <span className="font-bold shrink-0 font-tech">⚠️ ประวัติรออะไหล่:</span>
                          <span className="truncate">{t.issueReason}</span>
                        </div>
                      )}
                      {t.postponeReason && (t.status === 'เลื่อนวันจบ' || t.status === 'เลื่อนงาน') && (
                        <div className="mt-1 text-xs text-purple-950 bg-purple-50 px-2 py-0.5 border-l-2 border-l-purple-500 border border-purple-300 inline-flex items-center gap-1 max-w-full">
                          <span className="font-bold shrink-0 font-tech">📅 เลื่อนจบ:</span>
                          <span className="truncate">{t.postponeReason}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 align-top">
                      <div className="font-serif font-bold text-[#0B1B3D] text-sm">
                        {getStdProj(t.project)}
                      </div>
                      <div className="text-xs text-[#B89246] font-tech font-bold mt-0.5">
                        📍 {t.area}
                      </div>
                    </td>
                    <td className="p-3.5 text-xs text-slate-700 whitespace-nowrap align-top font-tech">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px] shrink-0">START:</span>
                        <span className="font-bold text-slate-900 whitespace-nowrap">{fDate(t.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-slate-500 text-[11px] shrink-0">END:</span>
                        <span
                          className={`whitespace-nowrap font-bold ${
                            info.type === 'ACTIVE_OVERDUE'
                              ? 'text-rose-600'
                              : info.type === 'COMPLETED_LATE'
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {fDate(t.endDate)}
                        </span>
                      </div>
                      {t.completedDate && (
                        <div className="text-[11px] text-emerald-800 font-bold pt-1.5 flex items-center gap-1 border-t border-slate-200 mt-1 whitespace-nowrap">
                          <span className="text-slate-500 text-[10px] shrink-0">CLOSED:</span>
                          <span className="whitespace-nowrap">{fDate(t.completedDate)}</span>
                          {info.isCompletedLate && (
                            <span className="text-amber-900 font-bold text-[10px] bg-amber-100 px-1 py-0.2 border border-amber-300 shrink-0">
                              +{info.daysLate}D
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 align-top">
                      <div>{getStatusBadge(t.status)}</div>
                      {info.isOverdue && (
                        <div className="mt-1.5">
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-tech font-bold border border-rose-500 bg-rose-100 text-rose-800 shadow-[1px_1px_0px_#f43f5e]">
                            {info.label}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-center align-top">
                      <div className="flex justify-center items-center gap-1.5">
                        <select
                          value={currentSelectVal}
                          onChange={(e) => initSt(t.id, e.target.value)}
                          className="border-2 border-[#0B1B3D] text-xs p-1.5 outline-none bg-white hover:bg-[#F0F4F8] font-bold text-[#0B1B3D] focus:border-[#B89246] transition-all cursor-pointer shadow-[2px_2px_0px_#0B1B3D]"
                        >
                          <option value="รอดำเนินการ">รอดำเนินการ</option>
                          <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                          <option value="รออะไหล่/ติดปัญหา">รออะไหล่/ติดปัญหา</option>
                          {(isSupervisor || t.status === 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)') && (
                            <option value="ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)">🚨 ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)</option>
                          )}
                          <option value="เลื่อนวันเริ่ม">เลื่อนวันเริ่ม</option>
                          <option value="เลื่อนวันจบ">เลื่อนวันจบ</option>
                          <option value="จบงาน">จบงาน</option>
                          {t.status === 'จบงาน(รอใบงาน)' && (
                            <option value="จบงาน(รอใบงาน)">จบงาน (รอใบงาน)</option>
                          )}
                        </select>
                        {onOpenTimeline && (
                          <button
                            type="button"
                            onClick={() => onOpenTimeline(t)}
                            className="p-1.5 border border-[#0B1B3D] text-[#0B1B3D] bg-[#F0F4F8] hover:bg-[#0B1B3D] hover:text-[#00F0FF] transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_#0B1B3D]"
                            title="ดูประวัติไทม์ไลน์งาน"
                          >
                            <Icon name="clock" size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEdit(t)}
                          className="p-1.5 border border-[#0B1B3D] text-[#0B1B3D] bg-[#F0F4F8] hover:bg-[#B89246] hover:text-white transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_#0B1B3D]"
                          title="แก้ไขงาน"
                        >
                          <Icon name="edit2" size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(t)}
                          className="p-1.5 border border-rose-600 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shadow-[2px_2px_0px_#e11d48]"
                          title="ลบงาน"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayTasks.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500 font-tech font-bold text-xs bg-slate-50">
                    {onlyOverdueFilter ? '[ NO_OVERDUE_TASKS_TODAY // ไม่มีงานที่เกินกำหนดหรือปิดช้าในวันนี้ ]' : '[ NO_TASKS_TODAY // ไม่มีงานในวันนี้ ]'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
