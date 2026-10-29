import React, { useState, useEffect, useMemo } from 'react';
import SegmentedPills from '../components/ui/SegmentedPills.jsx';
import { getTaskOverdueInfo } from '../utils/overdueHelper';
import { getBangkokDateStr } from '../utils/dateUtils.js';
import { verifyAdminPin } from '../utils/security.js';

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
  const today = getTStr ? getTStr() : getBangkokDateStr();

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

  const [statusFilter, setStatusFilter] = useState('all');

  const counts = useMemo(() => {
    let inProgress = 0;
    let issue = 0;
    let overdue = 0;
    let done = 0;

    tasksWithOverdue.forEach((t) => {
      if (t.overdueInfo?.isOverdue) overdue++;
      if (t.status?.startsWith('จบงาน')) {
        done++;
      } else if (
        t.status === 'ติดปัญหา/รออะไหล่' ||
        t.status === 'รออะไหล่/ติดปัญหา' ||
        t.status === 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)'
      ) {
        issue++;
      } else {
        inProgress++;
      }
    });

    return {
      all: tasksWithOverdue.length,
      inProgress,
      issue,
      overdue,
      done
    };
  }, [tasksWithOverdue]);

  const displayTasks = useMemo(() => {
    return tasksWithOverdue.filter((t) => {
      if (statusFilter === 'overdue') return t.overdueInfo?.isOverdue;
      if (statusFilter === 'inProgress') {
        return (
          !t.status?.startsWith('จบงาน') &&
          t.status !== 'ติดปัญหา/รออะไหล่' &&
          t.status !== 'รออะไหล่/ติดปัญหา' &&
          t.status !== 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)'
        );
      }
      if (statusFilter === 'issue') {
        return (
          t.status === 'ติดปัญหา/รออะไหล่' ||
          t.status === 'รออะไหล่/ติดปัญหา' ||
          t.status === 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)'
        );
      }
      if (statusFilter === 'done') {
        return t.status?.startsWith('จบงาน');
      }
      return true;
    });
  }, [tasksWithOverdue, statusFilter]);

  const handleEdit = (t) => {
    const pwd = prompt('กรุณาใส่รหัสผ่านเพื่อแก้ไขข้อมูล:');
    if (!verifyAdminPin(pwd, 'task_action')) return alert('รหัสผ่านไม่ถูกต้อง!');
    openTaskModal(t);
  };

  const getStatusBadge = (status) => {
    if (status?.startsWith('จบงาน')) {
      if (status === 'จบงาน(รอใบงาน)') {
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            จบงาน (รอใบงาน)
          </span>
        );
      }
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          จบงาน
        </span>
      );
    }
    if (status === 'กำลังดำเนินการ' || status === 'อยู่ระหว่างดำเนินการ') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
          กำลังดำเนินการ
        </span>
      );
    }
    if (status === 'ติดปัญหา/รออะไหล่' || status === 'รออะไหล่/ติดปัญหา') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          ติดปัญหา/รออะไหล่
        </span>
      );
    }
    if (status === 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1 shrink-0 animate-pulse" title="ถูกผู้ดูแลลงโทษตัดคะแนนวินัยและ SLA">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          🚨 ผิดเงื่อนไขรออะไหล่
        </span>
      );
    }
    if (status === 'เลื่อนวันเริ่ม') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          เลื่อนวันเริ่ม
        </span>
      );
    }
    if (status === 'เลื่อนวันจบ' || status === 'เลื่อนงาน') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          เลื่อนวันจบ
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        {status || 'รอดำเนินการ'}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#A8996E]/25">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-3.5 bg-[#A8996E] inline-block rounded-xs" />
              <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#A8996E] uppercase">
                DAILY FIELD DISPATCH
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#003C71] tracking-tight flex items-baseline gap-2">
              <span>งานประจำวัน</span>
              <span className="font-serif text-sm font-normal text-[#A8996E]">
                ({gFilt.date || today})
              </span>
            </h1>
          </div>
          <span className="text-xs bg-slate-100 text-[#003C71] font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 self-center">
            {displayTasks.length} รายการ
          </span>
        </div>

        <button
          type="button"
          onClick={() => openTaskModal()}
          className="bg-[#7A1C28] hover:bg-[#65121E] text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Icon name="plus" size={15} className="mr-1.5 text-white" /> เพิ่มงานใหม่
        </button>
      </div>

      {/* 21st.dev Animated Sliding Segmented Filter Control */}
      <SegmentedPills
        items={[
          { id: 'all', label: 'ทั้งหมด', count: counts.all },
          { id: 'inProgress', label: 'กำลังทำ', count: counts.inProgress },
          { id: 'issue', label: 'รออะไหล่/ติดปัญหา', count: counts.issue },
          { id: 'overdue', label: 'เกินกำหนด/ปิดช้า', count: counts.overdue, alert: true },
          { id: 'done', label: 'จบงานแล้ว', count: counts.done }
        ]}
        activeId={statusFilter}
        onChange={(newId) => {
          setStatusFilter(newId);
          if (onlyOverdueFilter && newId !== 'overdue') setOnlyOverdueFilter(false);
        }}
        className="pt-0.5 pb-1"
      />

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
              className={`bg-white rounded-2xl p-5 space-y-3.5 transition-all duration-200 border ${
                isHighlighted
                  ? 'ring-2 ring-[#7A1C28] bg-rose-50/20 border-rose-300 shadow-md animate-pulse'
                  : info.isOverdue
                  ? `${info.borderClass} ${info.bgHighlightClass} border-slate-200 shadow-card`
                  : 'border-slate-200/90 hover:border-slate-300 shadow-card'
              }`}
            >
              {/* Project & Status Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-[#0F2E4A] text-base leading-snug break-words tracking-tight">
                      {getStdProj(t.project)}
                    </h3>
                    {info.isOverdue && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${info.badgeClass}`}>
                        {info.shortBadge}
                      </span>
                    )}
                  </div>
                  {t.area && (
                    <span className="inline-block text-[11px] text-slate-500 font-medium mt-0.5">
                      📍 {t.area}
                    </span>
                  )}
                </div>
                <div>{getStatusBadge(t.status)}</div>
              </div>

              {/* Task Details */}
              <div>
                <div className="text-sm font-semibold text-slate-800 leading-relaxed break-words">
                  {t.details}
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex flex-wrap gap-1.5 items-center font-tech">
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                    {t.id}
                  </span>
                  {t.requester && (
                    <span className="text-slate-500 font-sans">
                      ผู้แจ้ง: {t.requester}
                    </span>
                  )}
                  {t.workOrderNo && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-blue-200">
                      <span>WO: {t.workOrderNo}</span>
                      {t.costAmount && Number(t.costAmount) > 0 ? (
                        <span className="bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-semibold text-[9.5px]">
                          ฿{Number(t.costAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : null}
                    </span>
                  )}
                  {onOpenTimeline && (
                    <button
                      type="button"
                      onClick={() => onOpenTimeline(t)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer snap-spring font-sans"
                      title="ดูประวัติไทม์ไลน์ของงานนี้"
                    >
                      <Icon name="clock" size={11} className="text-[#0f2e4a]" />
                      <span>ไทม์ไลน์</span>
                    </button>
                  )}
                </div>

                {/* Sub-reason banners */}
                {info.reason && (
                  <div className="mt-2 text-xs text-amber-900 bg-amber-100/70 px-2.5 py-1.5 rounded-xl border border-amber-200/80 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">💬 สาเหตุที่ช้า:</span>
                    <span className="break-words font-medium">{info.reason}</span>
                  </div>
                )}
                {t.startPostponeReason && t.status === 'เลื่อนวันเริ่ม' && (
                  <div className="mt-2 text-xs text-sky-700 bg-sky-50/90 px-2.5 py-1.5 rounded-xl border border-sky-200 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">📅 เหตุผลเลื่อนวันเริ่ม:</span>
                    <span className="break-words font-medium">{t.startPostponeReason}</span>
                  </div>
                )}
                {t.issueReason && (t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา') && (
                  <div className="space-y-1.5 mt-2">
                    <div className="text-xs text-rose-700 bg-rose-50/90 px-2.5 py-1.5 rounded-xl border border-rose-200 flex items-start gap-1.5">
                      <span className="font-bold shrink-0">⚠️ สาเหตุติดปัญหา:</span>
                      <span className="break-words font-medium">{t.issueReason}</span>
                    </div>
                    {(() => {
                      const repTime = t.issueReportedAt || t.startDate;
                      if (!repTime) return null;
                      const waitDays = Math.floor((Date.now() - new Date(repTime).getTime()) / (1000 * 3600 * 24));
                      if (waitDays <= 45) return null;
                      return (
                        <div className="p-2 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-[11px] font-bold flex items-center justify-between gap-1.5 animate-pulse">
                          <div className="flex items-center gap-1.5">
                            <span>🚨</span>
                            <span>รออะไหล่เกินเพดาน 45 วัน ({waitDays} วัน)</span>
                          </div>
                          {isSupervisor && (
                            <button
                              type="button"
                              onClick={() => initSt(t.id, 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)')}
                              className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer snap-spring shrink-0"
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
                  <div className="mt-2 text-xs text-amber-800 bg-amber-50/90 px-2.5 py-1.5 rounded-xl border border-amber-200 flex items-start justify-between gap-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold shrink-0">⚠️ ประวัติรออะไหล่:</span>
                      <span className="break-words font-medium">{t.issueReason}</span>
                    </div>
                    {onOpenTimeline && (
                      <button
                        type="button"
                        onClick={() => onOpenTimeline(t)}
                        className="text-[10px] font-bold text-amber-700 underline shrink-0 hover:text-amber-900 cursor-pointer"
                      >
                        ไทม์ไลน์
                      </button>
                    )}
                  </div>
                )}
                {t.postponeReason && (t.status === 'เลื่อนวันจบ' || t.status === 'เลื่อนงาน') && (
                  <div className="mt-2 text-xs text-indigo-700 bg-indigo-50/90 px-2.5 py-1.5 rounded-xl border border-indigo-200 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">📅 เหตุผลเลื่อน:</span>
                    <span className="break-words font-medium">{t.postponeReason}</span>
                  </div>
                )}
              </div>

              {/* Duration & Overdue Status */}
              <div className="bg-slate-50/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between text-xs text-slate-600 border border-slate-200/60 font-tech">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Icon name="calendar" size={14} className="text-[#bca374] shrink-0" />
                  <span>
                    เริ่ม: <strong className="text-slate-800 whitespace-nowrap">{fDate(t.startDate)}</strong>
                  </span>
                  <span className="text-slate-300">—</span>
                  <span>
                    จบ:{' '}
                    <strong
                      className={`whitespace-nowrap ${
                        info.type === 'ACTIVE_OVERDUE'
                          ? 'text-rose-600 font-bold'
                          : info.type === 'COMPLETED_LATE'
                          ? 'text-amber-700 font-bold'
                          : 'text-slate-800'
                      }`}
                    >
                      {fDate(t.endDate)}
                    </strong>
                  </span>
                  {t.completedDate && (
                    <span className="text-[11px] text-emerald-700 font-medium whitespace-nowrap">
                      (ปิด: <strong>{fDate(t.completedDate)}</strong>)
                    </span>
                  )}
                </div>
                {info.isOverdue && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 font-sans ${info.badgeClass}`}>
                    {info.label}
                  </span>
                )}
              </div>

              {/* Mobile Bottom Action Bar (Thumb-friendly >= 44px) */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <div className="flex-1">
                  <select
                    value={currentSelectVal}
                    onChange={(e) => initSt(t.id, e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:border-[#0f2e4a] focus:ring-2 focus:ring-[#bca374]/20 outline-none shadow-2xs transition-all tactile-select"
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
                  className="w-11 h-11 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 bg-white hover:bg-slate-100 hover:text-[#0f2e4a] transition-all snap-spring cursor-pointer shadow-2xs"
                  title="แก้ไขงาน"
                >
                  <Icon name="edit2" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteTask(t)}
                  className="w-11 h-11 border border-rose-200 rounded-xl flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 transition-all snap-spring cursor-pointer shadow-2xs"
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
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[17%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[23%]" />
            </colgroup>
            <thead>
              <tr className="bg-[#003C71] text-white border-b border-[#A8996E]/30">
                <th className="py-2.5 px-2.5 text-xs font-semibold tracking-wider text-slate-100 uppercase">
                  รายละเอียด
                </th>
                <th className="py-2.5 px-2 text-xs font-semibold tracking-wider text-slate-100 uppercase">
                  โครงการ
                </th>
                <th className="py-2.5 px-2 text-xs font-semibold tracking-wider text-slate-100 uppercase">
                  ระยะเวลา
                </th>
                <th className="py-2.5 px-2 text-xs font-semibold tracking-wider text-slate-100 uppercase">
                  สถานะ & SLA
                </th>
                <th className="py-2.5 px-1 text-xs font-semibold tracking-wider text-slate-100 uppercase text-center">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                    className={`border-b transition-all duration-300 ${
                      isHighlighted
                        ? 'ring-2 ring-[#bca374] bg-[#bca374]/15 font-semibold'
                        : info.isOverdue
                        ? `${info.bgHighlightClass} hover:bg-amber-50/50`
                        : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-2.5 align-top">
                      <div className="font-medium text-slate-800 break-words leading-snug">
                        <span>{t.details}</span>
                        {info.isOverdue && (
                          <span className={`inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.2 rounded text-[10px] border font-bold align-middle shrink-0 ${info.badgeClass}`}>
                            {info.shortBadge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1.5 items-center">
                        <span>
                          {t.id} | {t.requester}
                        </span>
                        {t.workOrderNo && (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                            <span>WO:{t.workOrderNo}</span>
                            {t.costAmount && Number(t.costAmount) > 0 ? (
                              <span className="bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded text-[9.5px]">
                                ฿{Number(t.costAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : null}
                          </span>
                        )}
                        {onOpenTimeline && (
                          <button
                            type="button"
                            onClick={() => onOpenTimeline(t)}
                            className="text-slate-400 hover:text-[#0f2e4a] inline-flex items-center gap-0.5 font-bold cursor-pointer ml-1"
                            title="ดูประวัติไทม์ไลน์"
                          >
                            <Icon name="clock" size={10} />
                            <span>ไทม์ไลน์</span>
                          </button>
                        )}
                      </div>
                      {info.reason && (
                        <div className="mt-1 text-xs text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200/80 inline-flex items-center gap-1 max-w-full">
                          <span className="font-bold shrink-0">💬 สาเหตุที่ช้า:</span>
                          <span className="truncate">{info.reason}</span>
                        </div>
                      )}
                      {t.startPostponeReason && t.status === 'เลื่อนวันเริ่ม' && (
                        <div className="mt-1.5 text-xs text-sky-700 bg-sky-50/90 px-2 py-0.5 rounded border border-sky-200 inline-flex items-center gap-1 max-w-full">
                          <span className="font-bold shrink-0">📅 หมายเหตุเลื่อนวันเริ่ม:</span>
                          <span className="truncate">{t.startPostponeReason}</span>
                        </div>
                      )}
                      {t.issueReason && (t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา') && (
                        <div className="space-y-1 mt-1.5">
                          <div className="text-xs text-rose-700 bg-rose-50/90 px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1 max-w-full">
                            <span className="font-bold shrink-0">⚠️ สาเหตุติดปัญหา:</span>
                            <span className="truncate">{t.issueReason}</span>
                          </div>
                          {(() => {
                            const repTime = t.issueReportedAt || t.startDate;
                            if (!repTime) return null;
                            const waitDays = Math.floor((Date.now() - new Date(repTime).getTime()) / (1000 * 3600 * 24));
                            if (waitDays <= 45) return null;
                            return (
                              <div className="p-1.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-[10.5px] font-bold flex items-center justify-between gap-2 animate-pulse">
                                <div className="flex items-center gap-1">
                                  <span>🚨</span>
                                  <span>รออะไหล่เกิน 45 วัน ({waitDays} วัน)</span>
                                </div>
                                {isSupervisor && (
                                  <button
                                    type="button"
                                    onClick={() => initSt(t.id, 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)')}
                                    className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-[9.5px] font-bold shadow-xs cursor-pointer snap-spring shrink-0"
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
                        <div className="mt-1.5 text-xs text-amber-800 bg-amber-50/90 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1 max-w-full">
                          <span className="font-bold shrink-0">⚠️ ประวัติรออะไหล่:</span>
                          <span className="truncate">{t.issueReason}</span>
                        </div>
                      )}
                      {t.postponeReason && (t.status === 'เลื่อนวันจบ' || t.status === 'เลื่อนงาน') && (
                        <div className="mt-1.5 text-xs text-indigo-700 bg-indigo-50/90 px-2 py-0.5 rounded border border-indigo-200 inline-flex items-center gap-1 max-w-full">
                          <span className="font-bold shrink-0">📅 เหตุผลเลื่อน:</span>
                          <span className="truncate">{t.postponeReason}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-[#0F2E4A] align-top text-xs break-words">
                      <div>{getStdProj(t.project)}</div>
                      <div className="text-[11px] text-gray-400 font-normal mt-0.5">{t.area}</div>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-slate-600 align-top">
                      <div className="flex items-center gap-1 font-tech">
                        <span className="text-slate-400 font-sans text-[10px] shrink-0">เริ่ม:</span>
                        <span className="font-semibold text-slate-700 whitespace-nowrap text-[11px]">{fDate(t.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-1 font-tech mt-1">
                        <span className="text-slate-400 font-sans text-[10px] shrink-0">จบ:</span>
                        <span
                          className={`whitespace-nowrap font-semibold text-[11px] ${
                            info.type === 'ACTIVE_OVERDUE'
                              ? 'text-rose-600 font-bold'
                              : info.type === 'COMPLETED_LATE'
                              ? 'text-amber-700 font-bold'
                              : 'text-slate-700'
                          }`}
                        >
                          {fDate(t.endDate)}
                        </span>
                      </div>
                      {t.completedDate && (
                        <div className="text-[10px] text-emerald-700 font-medium pt-1 flex items-center gap-1 font-tech">
                          <span className="text-emerald-500 font-sans text-[9.5px] shrink-0">ปิดจริง:</span>
                          <span className="whitespace-nowrap font-semibold">{fDate(t.completedDate)}</span>
                          {info.isCompletedLate && (
                            <span className="text-amber-800 font-bold text-[9px] bg-amber-50 px-1 py-0.2 rounded border border-amber-200 shrink-0">
                              +{info.daysLate}ว
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <div>{getStatusBadge(t.status)}</div>
                        {info.isOverdue && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${info.badgeClass}`}>
                            {info.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-1 text-center align-top">
                      <div className="flex justify-center items-center gap-1">
                        <select
                          value={currentSelectVal}
                          onChange={(e) => initSt(t.id, e.target.value)}
                          className="w-[82px] sm:w-[92px] max-w-[95px] truncate border border-slate-200 rounded text-[10.5px] py-1 px-1 outline-none bg-slate-50 hover:bg-white font-medium focus:border-[#0f2e4a] focus:ring-1 focus:ring-[#bca374]/30 transition-all cursor-pointer shadow-2xs tactile-select"
                          title={currentSelectVal}
                        >
                          <option value="รอดำเนินการ">รอดำเนินการ</option>
                          <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                          <option value="รออะไหล่/ติดปัญหา">รออะไหล่/ติดปัญหา</option>
                          {(isSupervisor || t.status === 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)') && (
                            <option value="ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)">🚨 ผิดเงื่อนไขรออะไหล่</option>
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
                            className="text-slate-500 hover:text-[#0f2e4a] p-1 bg-slate-100 hover:bg-slate-200 rounded-md transition-all cursor-pointer snap-spring shadow-2xs shrink-0"
                            title="ดูประวัติไทม์ไลน์งาน"
                          >
                            <Icon name="clock" size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEdit(t)}
                          className="text-slate-500 hover:text-[#0f2e4a] p-1 bg-slate-100 hover:bg-slate-200 rounded-md transition-all cursor-pointer snap-spring shadow-2xs shrink-0"
                          title="แก้ไขงาน"
                        >
                          <Icon name="edit2" size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(t)}
                          className="text-rose-500 hover:text-rose-700 p-1 bg-rose-50 hover:bg-rose-100 rounded-md transition-all cursor-pointer snap-spring shadow-2xs shrink-0"
                          title="ลบงาน"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                </tr>
              );
            })}
            {displayTasks.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-400 text-xs">
                  {onlyOverdueFilter ? 'ไม่มีงานที่เกินกำหนดหรือปิดช้าในวันนี้' : 'ไม่มีงานในวันนี้'}
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
