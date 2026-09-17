import React from 'react';

// Helper แปลงวันเวลาเป็นรูปแบบภาษาไทย
const formatDateTimeThai = (isoString) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' น.';
};

const formatDateThai = (ds) => {
  if (!ds) return '-';
  const d = new Date(ds);
  if (isNaN(d.getTime())) return String(ds);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function JobTimelineModal({ isOpen, task, onClose, Icon }) {
  if (!isOpen || !task) return null;

  // รวบรวมหรือสังเคราะห์ Timeline Events (รองรับทั้งงานใหม่และงานเก่า)
  const getDisplayTimeline = () => {
    if (Array.isArray(task.timeline) && task.timeline.length > 0) {
      return [...task.timeline].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Fallback: สังเคราะห์เหตุการณ์สำหรับงานเดิมในระบบที่ยังไม่มีฟิลด์ timeline
    const events = [];

    // 1. เริ่มงาน / สร้างงาน
    if (task.startDate || task.receivedDate) {
      events.push({
        id: 'ev-create',
        timestamp: task.receivedDate ? `${task.receivedDate}T08:30:00+07:00` : `${task.startDate}T08:30:00+07:00`,
        action: 'CREATED',
        title: 'สร้างและเริ่มภารกิจ',
        status: 'อยู่ระหว่างดำเนินการ',
        note: `กำหนดเริ่ม: ${formatDateThai(task.startDate)} | กำหนดส่งมอบ: ${formatDateThai(task.endDate)}`,
        actor: task.requester || 'ผู้ประสานงาน'
      });
    }

    // 2. เคยเลื่อนวันเริ่ม
    if (task.startPostponeReason || task.previousStartDate) {
      events.push({
        id: 'ev-postpone-start',
        timestamp: task.startPostponedAt || `${task.startDate}T09:00:00+07:00`,
        action: 'POSTPONE_START',
        title: 'เลื่อนวันเริ่มงาน',
        status: 'เลื่อนวันเริ่ม',
        reason: task.startPostponeReason || 'เลื่อนตามข้อตกลงหน้างาน',
        note: task.previousStartDate ? `วันที่เริ่มเดิม: ${formatDateThai(task.previousStartDate)} ➔ เริ่มใหม่: ${formatDateThai(task.startDate)}` : ''
      });
    }

    // 3. เคยติดปัญหา/รออะไหล่
    if (task.issueReason) {
      events.push({
        id: 'ev-issue',
        timestamp: task.issueReportedAt || `${task.startDate}T11:00:00+07:00`,
        action: 'ISSUE_HOLD',
        title: '⚠️ ติดปัญหา / รออะไหล่',
        status: 'ติดปัญหา/รออะไหล่',
        reason: task.issueReason,
        actor: 'ช่างเทคนิคหน้างาน'
      });

      // ถ้างานนี้เปลี่ยนสถานะไปแล้ว แสดงว่าได้รับการแก้ไข/ดำเนินการต่อแล้ว
      if (task.status !== 'ติดปัญหา/รออะไหล่' && task.status !== 'รออะไหล่/ติดปัญหา') {
        events.push({
          id: 'ev-resumed',
          timestamp: task.completedDate ? `${task.completedDate}T09:00:00+07:00` : `${task.endDate}T09:00:00+07:00`,
          action: 'RESUMED',
          title: '⚙️ ได้รับอะไหล่ / ดำเนินการต่อ',
          status: 'อยู่ระหว่างดำเนินการ',
          note: 'อะไหล่มาถึงแล้ว และเข้าปฏิบัติงานต่อจนสำเร็จ'
        });
      }
    }

    // 4. เคยเลื่อนวันจบ
    if (task.postponeReason || task.previousEndDate) {
      events.push({
        id: 'ev-postpone-end',
        timestamp: task.postponedAt || `${task.endDate}T10:00:00+07:00`,
        action: 'POSTPONE_END',
        title: 'ขอเลื่อนวันจบงาน',
        status: 'เลื่อนวันจบ',
        reason: task.postponeReason,
        note: task.previousEndDate ? `กำหนดเดิม: ${formatDateThai(task.previousEndDate)} ➔ ขอเลื่อนเป็น: ${formatDateThai(task.endDate)}` : ''
      });
    }

    // 5. ปิดจบงาน
    if (task.status?.startsWith('จบงาน')) {
      const isWaitWo = task.status === 'จบงาน(รอใบงาน)' || !task.workOrderNo;
      events.push({
        id: 'ev-complete',
        timestamp: task.completedDate ? `${task.completedDate}T16:00:00+07:00` : `${task.endDate}T16:00:00+07:00`,
        action: isWaitWo ? 'COMPLETED_PENDING_WO' : 'COMPLETED',
        title: isWaitWo ? '📋 จบงานหน้างาน (รอใบงาน)' : '✅ ปิดจบงานสมบูรณ์',
        status: task.status,
        note: task.overdueReason ? `สาเหตุที่จบงานช้า: ${task.overdueReason}` : 'ปฏิบัติงานเสร็จสิ้นตามมาตรฐาน',
        reason: task.overdueReason || ''
      });
    }

    // 6. ออกใบงาน
    if (task.workOrderNo) {
      events.push({
        id: 'ev-wo',
        timestamp: task.completedDate ? `${task.completedDate}T17:00:00+07:00` : `${task.endDate}T17:00:00+07:00`,
        action: 'WO_ATTACHED',
        title: '🧾 บันทึกเลขที่ใบงาน (WO)',
        status: 'จบงาน',
        note: `เลขที่ใบงาน: ${task.workOrderNo}`
      });
    }

    // 7. ถ้ายกเลิก
    if (task.status === 'ยกเลิก') {
      events.push({
        id: 'ev-cancel',
        timestamp: task.completedDate ? `${task.completedDate}T12:00:00+07:00` : `${task.endDate}T12:00:00+07:00`,
        action: 'CANCELLED',
        title: '❌ ยกเลิกงาน',
        status: 'ยกเลิก',
        reason: task.cancelReason || 'ไม่ระบุเหตุผล'
      });
    }

    return events;
  };

  const timelineEvents = getDisplayTimeline();

  // คำนวณสรุปเวลารออะไหล่
  const hasHoldHistory = timelineEvents.some(
    (e) => e.action === 'ISSUE_HOLD' || e.status === 'ติดปัญหา/รออะไหล่'
  ) || !!task.issueReason;

  const getActionColor = (action, status) => {
    switch (action) {
      case 'CREATED':
        return { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'ISSUE_HOLD':
        return { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
      case 'RESUMED':
        return { dot: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' };
      case 'POSTPONE_START':
      case 'POSTPONE_END':
        return { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
      case 'COMPLETED_PENDING_WO':
        return { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' };
      case 'COMPLETED':
      case 'WO_ATTACHED':
        return { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
      case 'CANCELLED':
        return { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
      default:
        return { dot: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' };
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm animate-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0f2e4a] p-4 text-white flex justify-between items-center shrink-0 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <h3 className="font-bold text-base leading-tight">ไทม์ไลน์บันทึกประวัติงาน</h3>
              <p className="text-[11px] text-slate-300">Job Lifecycle & Activity Trail</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            {Icon ? <Icon name="x" size={18} /> : '✕'}
          </button>
        </div>

        {/* Task Info Bar */}
        <div className="bg-slate-50 p-3.5 border-b text-xs space-y-1.5 shrink-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="bg-[#0f2e4a]/10 text-[#0f2e4a] font-mono px-2 py-0.5 rounded font-bold text-[10px] mr-1.5">
                {task.id}
              </span>
              <span className="font-bold text-slate-800 text-sm">{task.details}</span>
            </div>
            <span className="font-bold text-[#bca374] shrink-0 text-[11px] bg-[#bca374]/10 px-2 py-0.5 rounded">
              {task.project}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
            <span>👤 ผู้แจ้ง: <strong className="text-slate-700">{task.requester || '-'}</strong></span>
            <span>📅 เริ่ม: <strong className="text-slate-700">{formatDateThai(task.startDate)}</strong></span>
            <span>🎯 กำหนดจบ: <strong className="text-slate-700">{formatDateThai(task.endDate)}</strong></span>
            {task.completedDate && (
              <span>✅ ปิดงานจริง: <strong className="text-emerald-700">{formatDateThai(task.completedDate)}</strong></span>
            )}
            {task.workOrderNo && (
              <span>🧾 WO: <strong className="text-blue-700">{task.workOrderNo}</strong></span>
            )}
          </div>
        </div>

        {/* Timeline Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {timelineEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              ยังไม่มีประวัติการดำเนินงาน
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timelineEvents.map((item, idx) => {
                const colors = getActionColor(item.action, item.status);
                return (
                  <div key={item.id || idx} className="relative group">
                    {/* Circle Node on Timeline */}
                    <div
                      className={`absolute -left-6 top-1 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] ${colors.dot} text-white font-bold ring-2 ring-slate-100`}
                    >
                      {idx + 1}
                    </div>

                    {/* Event Card */}
                    <div
                      className={`p-3 rounded-xl border ${colors.border} ${colors.bg} shadow-sm space-y-1.5 transition hover:shadow`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <span>{item.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap bg-white/80 px-2 py-0.5 rounded border border-slate-200/50">
                          {formatDateTimeThai(item.timestamp)}
                        </span>
                      </div>

                      {/* Reason or Problem details */}
                      {item.reason && (
                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-xs text-slate-700">
                          <span className="font-bold text-rose-600 block text-[11px] mb-0.5">
                            เหตุผล / รายละเอียด:
                          </span>
                          <span className="whitespace-pre-wrap">{item.reason}</span>
                        </div>
                      )}

                      {/* Note or extra context */}
                      {item.note && !item.reason && (
                        <div className="text-[11px] text-slate-600 whitespace-pre-wrap">
                          {item.note}
                        </div>
                      )}

                      {/* Duration in Hold / Waiting time */}
                      {item.durationInHold && (
                        <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                          <span>⏳ พักรองานเป็นเวลา: {item.durationInHold}</span>
                        </div>
                      )}

                      {/* Actor / Staff */}
                      {item.actor && (
                        <div className="text-[10px] text-slate-400 text-right pt-0.5">
                          บันทึกโดย: <span className="font-medium text-slate-600">{item.actor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50 p-3.5 border-t shrink-0 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            {hasHoldHistory ? (
              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-1 rounded-lg border border-rose-200 text-[11px] font-bold">
                ⚠️ งานนี้มีประวัติเคยรออะไหล่ / ติดปัญหา
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 text-[11px] font-medium">
                ✅ ปฏิบัติงานต่อเนื่อง ไม่มีประวัติติดปัญหา
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-[#0f2e4a] text-white rounded-xl text-xs font-bold shadow hover:bg-[#1a3f63] transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
