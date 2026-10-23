import React, { useState } from 'react';
import { getTaskOverdueInfo } from '../../utils/overdueHelper';
import { getBangkokDateStr } from '../../utils/dateUtils.js';

export default function OverdueTasksModal({
  isOpen,
  onClose,
  tasks = [],
  currentMonth,
  onManageTask,
  onOpenTimeline,
  fDate,
  getTStr = () => getBangkokDateStr(),
  sets = {},
  Icon
}) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ACTIVE_OVERDUE' | 'COMPLETED_LATE' | 'LATE_WO'
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const today = getTStr();

  // ประมวลผลข้อมูลสถานะความล่าช้าของแต่ละงาน
  const enrichedTasks = tasks.map((t) => ({
    ...t,
    overdueInfo: getTaskOverdueInfo(t, today, sets)
  }));

  const activeOverdueCount = enrichedTasks.filter((t) => t.overdueInfo.type === 'ACTIVE_OVERDUE').length;
  const completedLateCount = enrichedTasks.filter((t) => t.overdueInfo.type === 'COMPLETED_LATE').length;
  const lateWoCount = enrichedTasks.filter((t) => t.overdueInfo.type === 'LATE_WO').length;

  const filteredTasks = enrichedTasks.filter((t) => {
    // 1. กรองตามประเภทความล่าช้า
    if (filterType === 'ACTIVE_OVERDUE' && t.overdueInfo.type !== 'ACTIVE_OVERDUE') return false;
    if (filterType === 'COMPLETED_LATE' && t.overdueInfo.type !== 'COMPLETED_LATE') return false;
    if (filterType === 'LATE_WO' && t.overdueInfo.type !== 'LATE_WO') return false;

    // 2. ค้นหา
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchProj = (t.project || '').toLowerCase().includes(q);
      const matchId = (t.id || '').toLowerCase().includes(q);
      const matchDet = (t.details || '').toLowerCase().includes(q);
      const matchReq = (t.requester || '').toLowerCase().includes(q);
      if (!matchProj && !matchId && !matchDet && !matchReq) return false;
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-[9999] backdrop-blur-xs animate-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0f2e4a] blueprint-grid-dark p-4 text-white flex justify-between items-center shrink-0 border-b-2 border-[#bca374]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <Icon name="alertTriangle" size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight font-display tracking-tight text-white flex items-center gap-2">
                  งานล่าช้า/เกินกำหนด SLA
                </h3>
                <span className="stamp-badge text-[10px] text-[#bca374] border-[#bca374]">
                  SLA AUDIT
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-tech mt-0.5">
                ประจำเดือน {currentMonth} | รวม {tasks.length} ภารกิจ (ค้าง {activeOverdueCount} | ปิดช้า {completedLateCount})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer snap-spring"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Filter Pills & Quick Search Bar */}
        <div className="bg-slate-50 p-3 border-b border-slate-200/80 space-y-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-display">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer snap-spring ${
                filterType === 'ALL'
                  ? 'bg-[#0f2e4a] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ACTIVE_OVERDUE')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 snap-spring ${
                filterType === 'ACTIVE_OVERDUE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              <span>🔴 ค้างเกินกำหนด</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-tech">
                {activeOverdueCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('COMPLETED_LATE')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 snap-spring ${
                filterType === 'COMPLETED_LATE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span>🟠 ปิดงานช้า</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-tech">
                {completedLateCount}
              </span>
            </button>
            {lateWoCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('LATE_WO')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 snap-spring ${
                  filterType === 'LATE_WO'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                <span>🟡 รอใบงานช้า</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-tech">
                  {lateWoCount}
                </span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามรหัสงาน, ชื่อโครงการ, ผู้แจ้ง..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0f2e4a] focus:ring-1 focus:ring-[#0f2e4a]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="overflow-y-auto p-3 sm:p-4 space-y-2.5 flex-1 divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs space-y-1">
              <span className="text-2xl block">🎉</span>
              <p className="font-medium">ไม่พบงานในกลุ่มนี้</p>
            </div>
          ) : (
            filteredTasks.map((t) => {
              const info = t.overdueInfo;
              const isDone = t.status?.startsWith('จบงาน');

              return (
                <div
                  key={t.id}
                  className={`pt-2.5 first:pt-0 p-3.5 rounded-2xl border transition-all tactile-card ${
                    info.type === 'ACTIVE_OVERDUE'
                      ? 'border-rose-200 bg-rose-50/40 hover:border-rose-400'
                      : info.type === 'COMPLETED_LATE'
                      ? 'border-amber-200 bg-amber-50/30 hover:border-amber-400'
                      : 'border-purple-200 bg-purple-50/30 hover:border-purple-400'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Project Header & Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#0f2e4a]">
                          {t.project}
                        </span>
                        {t.area && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-normal">
                            📍 {t.area}
                          </span>
                        )}
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                          {t.id}
                        </span>
                        {t.requester && (
                          <span className="text-[10px] text-slate-500">
                            (ผู้แจ้ง: {t.requester})
                          </span>
                        )}
                      </div>

                      {/* Job Details */}
                      <div className="text-xs text-slate-700 leading-relaxed font-medium">
                        {t.details}
                      </div>

                      {/* Overdue Alert Reason Box */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDone ? 'bg-emerald-500' : 'bg-sky-500'
                            }`}
                          ></span>
                          สถานะ: {t.status}
                        </span>

                        {/* Overdue/Late Type Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border ${info.badgeClass}`}
                        >
                          <span>{info.shortBadge}</span>
                        </span>

                        {/* Date details */}
                        <span className="text-[10px] text-slate-500 font-medium">
                          {info.type === 'COMPLETED_LATE' ? (
                            <>
                              กำหนดจบ: <strong className="text-slate-700">{fDate(t.endDate)}</strong> | จบจริง: <strong className="text-amber-800">{fDate(t.completedDate)}</strong>
                            </>
                          ) : (
                            <>
                              กำหนดส่งมอบ: <strong className="text-slate-700">{fDate(t.endDate)}</strong>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Reason if available */}
                      {info.reason && (
                        <div className="text-[10px] text-amber-900 bg-amber-100/70 px-2 py-1 rounded border border-amber-200/80 inline-flex items-center gap-1 max-w-full">
                          <span className="font-bold shrink-0">💬 สาเหตุที่ล่าช้า:</span>
                          <span className="truncate">{info.reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 font-display">
                      {onOpenTimeline && (
                        <button
                          type="button"
                          onClick={() => onOpenTimeline(t)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer snap-spring"
                          title="ดูประวัติไทม์ไลน์บันทึกงานนี้"
                        >
                          <Icon name="clock" size={12} className="text-[#0f2e4a]" />
                          <span>ไทม์ไลน์</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onManageTask(t)}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-2xs transition cursor-pointer snap-spring ${
                          info.type === 'ACTIVE_OVERDUE'
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-[#0f2e4a] hover:bg-[#1a3f63] text-white'
                        }`}
                        title="เปิดดูและระบุตำแหน่งงานนี้ในหน้ารายการประจำวัน"
                      >
                        <Icon name="externalLink" size={12} />
                        <span>จัดการในรายการ</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-3 border-t text-xs flex justify-between items-center text-slate-500 shrink-0">
          <div className="text-[11px]">
            💡 คลิก <strong className="text-[#0f2e4a]">"จัดการในรายการ"</strong> เพื่อกระโดดไปไฮไลท์การ์ดงานในหน้ารายการประจำวันทันที
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold font-display rounded-xl text-xs transition cursor-pointer snap-spring"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
