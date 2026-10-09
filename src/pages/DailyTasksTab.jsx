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
  Icon
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
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            จบงาน (รอใบงาน)
          </span>
        );
      }
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          จบงาน
        </span>
      );
    }
    if (status === 'กำลังดำเนินการ' || status === 'อยู่ระหว่างดำเนินการ') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
          กำลังดำเนินการ
        </span>
      );
    }
    if (status === 'ติดปัญหา/รออะไหล่' || status === 'รออะไหล่/ติดปัญหา') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          ติดปัญหา/รออะไหล่
        </span>
      );
    }
    if (status === 'เลื่อนวันเริ่ม') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          เลื่อนวันเริ่ม
        </span>
      );
    }
    if (status === 'เลื่อนวันจบ' || status === 'เลื่อนงาน') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          เลื่อนวันจบ
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        {status || 'รอดำเนินการ'}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in">
      {/* Top Header & Quick Overdue Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-[#0f2e4a]">งานประจำวัน</h2>
          <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
            {displayTasks.length} งาน
          </span>

          {/* Quick Overdue Filter Pill */}
          {overdueCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyOverdueFilter(!onlyOverdueFilter)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                onlyOverdueFilter
                  ? 'bg-rose-600 text-white ring-2 ring-rose-300'
                  : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
              }`}
              title="กรองแสดงเฉพาะงานที่เกินกำหนดหรือปิดงานช้า"
            >
              <Icon name="alertTriangle" size={13} />
              <span>เฉพาะงานเกินกำหนด/ปิดช้า</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  onlyOverdueFilter ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
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
              className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
            >
              แสดงทั้งหมด
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => openTaskModal()}
          className="bg-[#0f2e4a] text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center shadow-md hover:bg-[#1a3f63] active:scale-95 transition cursor-pointer self-start sm:self-auto"
        >
          <Icon name="plus" size={16} className="mr-1.5" /> เพิ่มงาน
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
              className={`bg-white rounded-2xl shadow-sm border p-4 space-y-3 transition-all duration-300 ${
                isHighlighted
                  ? 'ring-4 ring-[#bca374] bg-[#bca374]/10 border-[#bca374] shadow-lg animate-pulse'
                  : info.isOverdue
                  ? `${info.borderClass} ${info.bgHighlightClass} border-slate-200/90`
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Project & Status Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-[#bca374] text-base leading-snug break-words">
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
                {getStatusBadge(t.status)}
              </div>

              {/* Task Details */}
              <div>
                <div className="text-sm font-semibold text-slate-800 leading-relaxed break-words">
                  {t.details}
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px]">
                    {t.id}
                  </span>
                  {t.requester && (
                    <span className="text-slate-500">
                      ผู้แจ้ง: {t.requester}
                    </span>
                  )}
                  {t.workOrderNo && (
                    <span className="bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded text-[10px] border border-blue-200">
                      WO: {t.workOrderNo}
                    </span>
                  )}
                  {onOpenTimeline && (
                    <button
                      type="button"
                      onClick={() => onOpenTimeline(t)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="ดูประวัติไทม์ไลน์ของงานนี้"
                    >
                      <Icon name="clock" size={11} className="text-[#0f2e4a]" />
                      <span>ไทม์ไลน์</span>
                    </button>
                  )}
                </div>

                {/* Sub-reason banners */}
                {info.reason && (
                  <div className="mt-2 text-xs text-amber-900 bg-amber-100/70 px-2.5 py-1.5 rounded-lg border border-amber-200/80 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">💬 สาเหตุที่ช้า:</span>
                    <span className="break-words font-medium">{info.reason}</span>
                  </div>
                )}
                {t.startPostponeReason && t.status === 'เลื่อนวันเริ่ม' && (
                  <div className="mt-2 text-xs text-sky-700 bg-sky-50/90 px-2.5 py-1.5 rounded-lg border border-sky-200 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">📅 เหตุผลเลื่อนวันเริ่ม:</span>
                    <span className="break-words font-medium">{t.startPostponeReason}</span>
                  </div>
                )}
                {t.issueReason && (t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา') && (
                  <div className="mt-2 text-xs text-rose-700 bg-rose-50/90 px-2.5 py-1.5 rounded-lg border border-rose-200 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">⚠️ สาเหตุติดปัญหา:</span>
                    <span className="break-words font-medium">{t.issueReason}</span>
                  </div>
                )}
                {t.issueReason && t.status !== 'ติดปัญหา/รออะไหล่' && t.status !== 'รออะไหล่/ติดปัญหา' && (
                  <div className="mt-2 text-xs text-amber-800 bg-amber-50/90 px-2.5 py-1.5 rounded-lg border border-amber-200 flex items-start justify-between gap-1.5">
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
                  <div className="mt-2 text-xs text-indigo-700 bg-indigo-50/90 px-2.5 py-1.5 rounded-lg border border-indigo-200 flex items-start gap-1.5">
                    <span className="font-bold shrink-0">📅 เหตุผลเลื่อน:</span>
                    <span className="break-words font-medium">{t.postponeReason}</span>
                  </div>
                )}
              </div>

              {/* Duration & Overdue Status */}
              <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-600 border border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Icon name="calendar" size={14} className="text-slate-400 shrink-0" />
                  <span>
                    เริ่ม: <strong className="text-slate-700">{fDate(t.startDate)}</strong>
                  </span>
                  <span>—</span>
                  <span>
                    จบ:{' '}
                    <strong
                      className={
                        info.type === 'ACTIVE_OVERDUE'
                          ? 'text-rose-600 font-bold'
                          : info.type === 'COMPLETED_LATE'
                          ? 'text-amber-700 font-bold'
                          : 'text-slate-700'
                      }
                    >
                      {fDate(t.endDate)}
                    </strong>
                  </span>
                  {t.completedDate && (
                    <span className="text-[11px] text-emerald-700">
                      (ปิดจริง: <strong>{fDate(t.completedDate)}</strong>)
                    </span>
                  )}
                </div>
                {info.isOverdue && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${info.badgeClass}`}>
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
                    className="w-full h-11 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white focus:border-[#0f2e4a] focus:ring-1 focus:ring-[#0f2e4a] outline-none shadow-2xs"
                  >
                    <option value="รอดำเนินการ">⏳ รอดำเนินการ</option>
                    <option value="กำลังดำเนินการ">⚙️ กำลังดำเนินการ</option>
                    <option value="รออะไหล่/ติดปัญหา">⚠️ รออะไหล่/ติดปัญหา</option>
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
                  className="w-11 h-11 border border-slate-300 rounded-xl flex items-center justify-center text-slate-600 bg-white hover:bg-slate-50 transition active:scale-95"
                  title="แก้ไขงาน"
                >
                  <Icon name="edit2" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteTask(t)}
                  className="w-11 h-11 border border-rose-200 rounded-xl flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 transition active:scale-95"
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
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0f2e4a] text-white text-xs font-semibold">
              <th className="p-4">รายละเอียด</th>
              <th className="p-4">โครงการ</th>
              <th className="p-4">ระยะเวลา</th>
              <th className="p-4">สถานะ & SLA</th>
              <th className="p-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
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
                  <td className="p-4">
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      <span>{t.details}</span>
                      {info.isOverdue && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] border font-bold ${info.badgeClass}`}>
                          {info.shortBadge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1.5 items-center">
                      <span>
                        {t.id} | {t.requester}
                      </span>
                      {t.workOrderNo && (
                        <span className="bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                          WO:{t.workOrderNo}
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
                      <div className="mt-1.5 text-xs text-rose-700 bg-rose-50/90 px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1 max-w-full">
                        <span className="font-bold shrink-0">⚠️ สาเหตุติดปัญหา:</span>
                        <span className="truncate">{t.issueReason}</span>
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
                  <td className="p-4 font-bold text-[#bca374]">
                    {getStdProj(t.project)}
                    <div className="text-xs text-gray-400 font-normal">{t.area}</div>
                  </td>
                  <td className="p-4 text-xs text-gray-600">
                    <div>เริ่ม: {fDate(t.startDate)}</div>
                    <div>
                      จบ:{' '}
                      <span
                        className={
                          info.type === 'ACTIVE_OVERDUE'
                            ? 'text-rose-600 font-bold'
                            : info.type === 'COMPLETED_LATE'
                            ? 'text-amber-700 font-bold'
                            : ''
                        }
                      >
                        {fDate(t.endDate)}
                      </span>
                    </div>
                    {t.completedDate && (
                      <div className="text-[11px] text-emerald-700 font-medium pt-0.5">
                        ปิดจริง: {fDate(t.completedDate)}
                        {info.isCompletedLate && (
                          <span className="text-amber-800 font-bold ml-1">
                            (ช้า {info.daysLate} วัน)
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div>{getStatusBadge(t.status)}</div>
                    {info.isOverdue && (
                      <div className="mt-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${info.badgeClass}`}>
                          {info.label}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <select
                        value={currentSelectVal}
                        onChange={(e) => initSt(t.id, e.target.value)}
                        className="border rounded text-xs p-1.5 outline-none bg-gray-50 hover:bg-white font-medium focus:border-[#0f2e4a]"
                      >
                        <option value="รอดำเนินการ">รอดำเนินการ</option>
                        <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                        <option value="รออะไหล่/ติดปัญหา">รออะไหล่/ติดปัญหา</option>
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
                          className="text-slate-500 hover:text-[#0f2e4a] p-1.5 bg-gray-100 rounded hover:bg-gray-200 transition cursor-pointer"
                          title="ดูประวัติไทม์ไลน์งาน"
                        >
                          <Icon name="clock" size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEdit(t)}
                        className="text-gray-500 hover:text-[#0f2e4a] p-1.5 bg-gray-100 rounded hover:bg-gray-200 transition"
                        title="แก้ไขงาน"
                      >
                        <Icon name="edit2" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(t)}
                        className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded hover:bg-red-100 transition"
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
                <td colSpan="5" className="text-center py-10 text-gray-400 text-xs">
                  {onlyOverdueFilter ? 'ไม่มีงานที่เกินกำหนดหรือปิดช้าในวันนี้' : 'ไม่มีงานในวันนี้'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
