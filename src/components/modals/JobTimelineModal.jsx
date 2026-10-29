import React from 'react';
import {
  Check,
  Clock,
  AlertTriangle,
  User,
  FileText,
  Calendar,
  CheckCircle2,
  Activity,
  AlertCircle
} from 'lucide-react';
import { getTaskOverdueInfo } from '../../utils/overdueHelper';
import { getBangkokDateStr } from '../../utils/dateUtils.js';
import ResponsiveDrawer from '../ui/ResponsiveDrawer.jsx';

// Helper แปลงวันเวลาเป็นรูปแบบภาษาไทย
const formatDateTimeThai = (isoString) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return (
    d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' น.'
  );
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

// คำนวณระยะเวลาห่างระหว่าง 2 จุดเวลา (SLA Step Gap Duration)
const getDurationBetween = (t1, t2) => {
  if (!t1 || !t2) return null;
  const d1 = new Date(t1).getTime();
  const d2 = new Date(t2).getTime();
  if (isNaN(d1) || isNaN(d2) || d2 <= d1) return null;
  const diffMinutes = Math.floor((d2 - d1) / (1000 * 60));
  if (diffMinutes < 1) return 'ไม่ถึง 1 นาที';
  if (diffMinutes < 60) return `${diffMinutes} นาที`;
  const diffHours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;
  if (diffHours < 24) {
    return remMinutes > 0 ? `${diffHours} ชม. ${remMinutes} น.` : `${diffHours} ชม.`;
  }
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  return remHours > 0 ? `${diffDays} วัน ${remHours} ชม.` : `${diffDays} วัน`;
};

export default function JobTimelineModal({ isOpen, task, onClose }) {
  if (!isOpen || !task) return null;

  const today = getBangkokDateStr();
  const overdueInfo = getTaskOverdueInfo(task, today);

  // รวบรวมหรือสังเคราะห์ Timeline Events (รองรับทั้งงานใหม่และงานเก่า)
  const getDisplayTimeline = () => {
    let events = [];
    if (Array.isArray(task.timeline) && task.timeline.length > 0) {
      events = [...task.timeline].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else {
      // Fallback: สังเคราะห์เหตุการณ์สำหรับงานเดิมในระบบที่ยังไม่มีฟิลด์ timeline
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
          note: task.previousStartDate
            ? `วันที่เริ่มเดิม: ${formatDateThai(task.previousStartDate)} ➔ เริ่มใหม่: ${formatDateThai(task.startDate)}`
            : '',
          actor: 'วิศวกรโครงการ'
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
            note: 'อะไหล่มาถึงหน้างานแล้ว และเข้าปฏิบัติงานต่อจนสำเร็จ',
            actor: 'ทีมซ่อมบำรุง'
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
          note: task.previousEndDate
            ? `กำหนดเดิม: ${formatDateThai(task.previousEndDate)} ➔ ขอเลื่อนเป็น: ${formatDateThai(task.endDate)}`
            : '',
          actor: 'ผู้ควบคุมงาน'
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
          note: task.overdueReason ? `สาเหตุที่จบงานช้า: ${task.overdueReason}` : 'ปฏิบัติงานเสร็จสิ้นตามเกณฑ์มาตรฐาน',
          reason: task.overdueReason || '',
          actor: task.recordedBy || 'โฟร์แมนโครงการ'
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
          note: `เลขที่ใบงาน: ${task.workOrderNo}`,
          actor: 'เจ้าหน้าที่ธุรการ/แอดมิน'
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
          reason: task.cancelReason || 'ไม่ระบุเหตุผล',
          actor: 'ผู้มีอำนาจอนุมัติ'
        });
      }
    }

    // ตกแต่งเหตุการณ์กรณีเป็นงานที่ปิดช้า หรือค้างเกินกำหนด
    if (overdueInfo.isCompletedLate) {
      const compEv = events.find((e) => e.action === 'COMPLETED' || e.action === 'COMPLETED_PENDING_WO');
      if (compEv) {
        compEv.title = `⏱️ ปิดจบงาน (ล่าช้ากว่ากำหนด ${overdueInfo.daysLate} วัน)`;
        compEv.action = 'COMPLETED_LATE';
        if (task.overdueReason && !compEv.reason) compEv.reason = task.overdueReason;
        if (!compEv.note || compEv.note.includes('เสร็จสิ้นตามมาตรฐาน')) {
          compEv.note = `กำหนดส่งเดิม: ${formatDateThai(task.endDate)} ➔ ปิดงานจริง: ${formatDateThai(task.completedDate)} (ช้ากว่ากำหนด ${overdueInfo.daysLate} วัน)`;
        }
      }
    }

    if (overdueInfo.isActiveOverdue) {
      events.push({
        id: 'ev-active-overdue',
        timestamp: `${today}T17:30:00+07:00`,
        action: 'CURRENT_OVERDUE',
        title: `⚠️ สถานะปัจจุบัน: ค้างเกินกำหนดส่งมอบ (${overdueInfo.daysLate > 0 ? overdueInfo.daysLate + ' วัน' : 'เลยเวลา 17:30 น.'})`,
        status: 'เกินกำหนด',
        note: `ภารกิจยังไม่เสร็จสิ้น และเลยกำหนดส่งมอบที่วางไว้เมื่อ ${formatDateThai(task.endDate)}`,
        reason: task.overdueReason || '',
        actor: 'ระบบตรวจสอบ SLA อัตโนมัติ'
      });
    }

    return events;
  };

  const timelineEvents = getDisplayTimeline();

  const hasHoldHistory =
    timelineEvents.some((e) => e.action === 'ISSUE_HOLD' || e.status === 'ติดปัญหา/รออะไหล่') ||
    !!task.issueReason;

  const getActionTheme = (action) => {
    switch (action) {
      case 'CREATED':
        return {
          dotBg: 'bg-blue-600',
          pingBg: 'bg-blue-400',
          badgeText: 'text-blue-700 bg-blue-50 border-blue-200',
          cardBorder: 'border-l-4 border-l-blue-500 border-slate-200 bg-blue-50/30'
        };
      case 'ISSUE_HOLD':
        return {
          dotBg: 'bg-amber-600',
          pingBg: 'bg-amber-400',
          badgeText: 'text-amber-800 bg-amber-50 border-amber-200',
          cardBorder: 'border-l-4 border-l-amber-500 border-slate-200 bg-amber-50/30'
        };
      case 'RESUMED':
        return {
          dotBg: 'bg-sky-600',
          pingBg: 'bg-sky-400',
          badgeText: 'text-sky-700 bg-sky-50 border-sky-200',
          cardBorder: 'border-l-4 border-l-sky-500 border-slate-200 bg-sky-50/30'
        };
      case 'POSTPONE_START':
      case 'POSTPONE_END':
        return {
          dotBg: 'bg-indigo-600',
          pingBg: 'bg-indigo-400',
          badgeText: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          cardBorder: 'border-l-4 border-l-indigo-500 border-slate-200 bg-indigo-50/30'
        };
      case 'COMPLETED_PENDING_WO':
        return {
          dotBg: 'bg-purple-600',
          pingBg: 'bg-purple-400',
          badgeText: 'text-purple-700 bg-purple-50 border-purple-200',
          cardBorder: 'border-l-4 border-l-purple-500 border-slate-200 bg-purple-50/30'
        };
      case 'COMPLETED_LATE':
        return {
          dotBg: 'bg-amber-600',
          pingBg: 'bg-amber-400',
          badgeText: 'text-amber-800 bg-amber-50 border-amber-300',
          cardBorder: 'border-l-4 border-l-amber-500 border-slate-200 bg-amber-50/40'
        };
      case 'CURRENT_OVERDUE':
        return {
          dotBg: 'bg-rose-600',
          pingBg: 'bg-rose-400',
          badgeText: 'text-rose-800 bg-rose-50 border-rose-300',
          cardBorder: 'border-l-4 border-l-rose-500 border-slate-200 bg-rose-50/50'
        };
      case 'COMPLETED':
      case 'WO_ATTACHED':
        return {
          dotBg: 'bg-emerald-600',
          pingBg: 'bg-emerald-400',
          badgeText: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          cardBorder: 'border-l-4 border-l-emerald-500 border-slate-200 bg-emerald-50/30'
        };
      case 'CANCELLED':
        return {
          dotBg: 'bg-rose-600',
          pingBg: 'bg-rose-400',
          badgeText: 'text-rose-700 bg-rose-50 border-rose-200',
          cardBorder: 'border-l-4 border-l-rose-500 border-slate-200 bg-rose-50/30'
        };
      default:
        return {
          dotBg: 'bg-slate-500',
          pingBg: 'bg-slate-400',
          badgeText: 'text-slate-700 bg-slate-50 border-slate-200',
          cardBorder: 'border-l-4 border-l-slate-400 border-slate-200 bg-slate-50/30'
        };
    }
  };

  // 4-Stage Lifecycle Stepper calculation
  const isDone = task.status?.startsWith('จบงาน');
  const isStarted = !!task.startDate;
  const isHandling = task.status === 'กำลังดำเนินการ' || task.status === 'อยู่ระหว่างดำเนินการ' || hasHoldHistory;
  const stages = [
    { label: 'แจ้งงาน', done: true, active: false },
    { label: 'เริ่มงาน', done: isStarted, active: !isDone && isStarted && !isHandling },
    {
      label: 'ดำเนินการ',
      done: isDone,
      active: !isDone && isHandling,
      alert: overdueInfo.isActiveOverdue
    },
    { label: 'ปิดงาน', done: isDone, active: isDone }
  ];

  const modalTitle = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-[#003C71]/10 text-[#003C71] flex items-center justify-center shrink-0">
        <Activity size={18} />
      </div>
      <div>
        <div className="font-serif tracking-[0.16em] text-[10px] text-[#A8996E] uppercase font-semibold">
          LIVE AUDIT TIMELINE
        </div>
        <h3 className="font-bold text-base text-[#003C71] leading-tight flex items-center gap-2">
          <span>ประวัติกิจกรรมงาน</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border font-semibold">
            {timelineEvents.length} เหตุการณ์
          </span>
        </h3>
      </div>
    </div>
  );

  return (
    <ResponsiveDrawer isOpen={true} onClose={onClose} title={modalTitle} maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Task Info & Project Banner */}
        <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 text-xs space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="bg-[#0f2e4a]/10 text-[#0f2e4a] font-mono px-2 py-0.5 rounded font-bold text-[10px] mr-1.5">
                {task.id}
              </span>
              <span className="font-bold text-slate-800 text-sm leading-snug">{task.details}</span>
            </div>
            <span className="font-bold text-[#bca374] shrink-0 text-[11px] bg-[#bca374]/10 border border-[#bca374]/30 px-2 py-0.5 rounded-lg">
              {task.project}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500 text-[11px] pt-1.5 border-t border-slate-200/60 font-sans">
            <span className="inline-flex items-center gap-1">
              <User size={12} className="text-slate-400" /> ผู้แจ้ง:{' '}
              <strong className="text-slate-700">{task.requester || '-'}</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" /> เริ่ม:{' '}
              <strong className="text-slate-700">{formatDateThai(task.startDate)}</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} className="text-slate-400" /> กำหนดจบ:{' '}
              <strong className="text-slate-700">{formatDateThai(task.endDate)}</strong>
            </span>
            {task.workOrderNo && (
              <span className="inline-flex items-center gap-1">
                <FileText size={12} className="text-blue-500" /> WO:{' '}
                <strong className="text-blue-700 font-mono">{task.workOrderNo}</strong>
              </span>
            )}
          </div>

          {/* แถบสรุป 4 มิติวงจรชีวิตงาน (4-Stage Lifecycle Stepper) */}
          <div className="pt-2.5 pb-1 border-t border-slate-200/60 mt-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-tech">
                <span className="w-1.5 h-1.5 rounded-full bg-[#003C71]" />
                แถบสรุป 4 มิติวงจรชีวิตงาน (4-Stage Lifecycle)
              </span>
              <span className="text-[10px] font-bold text-[#003C71] bg-[#003C71]/10 px-2 py-0.5 rounded-full font-mono">
                {isDone ? 'ปิดงานสมบูรณ์' : overdueInfo.isActiveOverdue ? 'เกินกำหนด SLA' : isHandling ? 'กำลังปฏิบัติงาน' : 'รับเรื่องแล้ว'}
              </span>
            </div>

            <div className="relative flex items-center justify-between px-3 sm:px-6 py-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              {/* Connecting progress track background */}
              <div className="absolute left-7 right-7 top-5 h-1 bg-slate-100 -z-0" />
              {/* Connecting active fill */}
              <div
                className="absolute left-7 top-5 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 -z-0 transition-all duration-500"
                style={{
                  width: isDone ? 'calc(100% - 56px)' : isHandling ? 'calc(66% - 38px)' : isStarted ? 'calc(33% - 19px)' : '0%'
                }}
              />

              {stages.map((stage, sIdx) => {
                return (
                  <div key={stage.label} className="relative z-10 flex flex-col items-center">
                    {/* Circle Node */}
                    <div
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                        stage.alert
                          ? 'bg-rose-500 text-white ring-4 ring-rose-100 animate-pulse'
                          : stage.done
                          ? 'bg-emerald-500 text-white ring-3 ring-emerald-100'
                          : stage.active
                          ? 'bg-[#003C71] text-white ring-4 ring-sky-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {/* Pulse beacon for active stage */}
                      {stage.active && !stage.done && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                      )}
                      {stage.done ? (
                        <Check size={14} className="stroke-[3]" />
                      ) : (
                        <span>{sIdx + 1}</span>
                      )}
                    </div>

                    {/* Stage Label */}
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold mt-1.5 transition-colors whitespace-nowrap ${
                        stage.alert
                          ? 'text-rose-600'
                          : stage.done
                          ? 'text-emerald-700'
                          : stage.active
                          ? 'text-[#003C71]'
                          : 'text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </span>

                    {/* Stage Sub-label */}
                    <span className="text-[8.5px] font-medium text-slate-400 hidden sm:block">
                      {sIdx === 0 ? 'รับเรื่อง' : sIdx === 1 ? 'กำหนดเริ่ม' : sIdx === 2 ? 'ลงมือซ่อม' : 'ส่งมอบ'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overdue / SLA Alert Banner */}
          {overdueInfo.isOverdue && (
            <div
              className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs mt-2 ${
                overdueInfo.type === 'ACTIVE_OVERDUE'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : overdueInfo.type === 'COMPLETED_LATE'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-purple-50 border-purple-200 text-purple-900'
              }`}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {overdueInfo.type === 'ACTIVE_OVERDUE'
                      ? `งานค้างเกินกำหนดส่งมอบ (${overdueInfo.daysLate > 0 ? overdueInfo.daysLate + ' วัน' : 'เลยกำหนด'})`
                      : overdueInfo.type === 'COMPLETED_LATE'
                      ? `งานนี้ปิดล่าช้ากว่ากำหนด ${overdueInfo.daysLate} วัน`
                      : 'ออกใบงานล่าช้ากว่ากำหนด (>3 วัน)'}
                  </span>
                  <span className="text-[9.5px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/80 border border-current font-bold">
                    SLA Alert
                  </span>
                </div>
                <div className="text-[11px] opacity-90">{overdueInfo.fullDetail}</div>
                {task.overdueReason && (
                  <div className="text-[11px] font-medium text-slate-700 bg-white/80 p-1.5 rounded mt-1 border border-black/5">
                    <strong>สาเหตุที่ช้า:</strong> {task.overdueReason}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Pulse Activity Monitor Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/25 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600" />
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 font-tech">
                LIVE PULSE STATUS BEACON
              </div>
              <div className="text-xs font-semibold text-slate-800">
                สถานะปัจจุบัน: <strong className="text-[#003C71] font-bold">{task.status || 'กำลังดำเนินการ'}</strong>
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
            {timelineEvents.length} เหตุการณ์
          </span>
        </div>

        {/* Living Timeline Events Stream */}
        <div className="p-2 sm:p-3 overflow-y-auto flex-1">
          {timelineEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Clock size={28} className="mx-auto mb-2 opacity-30" />
              <span>ยังไม่มีประวัติการดำเนินงาน</span>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {timelineEvents.map((item, idx) => {
                const theme = getActionTheme(item.action);
                const isLatest = idx === timelineEvents.length - 1;
                const prevEvent = idx > 0 ? timelineEvents[idx - 1] : null;
                const stepGap = prevEvent ? getDurationBetween(prevEvent.timestamp, item.timestamp) : null;

                return (
                  <div key={item.id || idx} className="relative group">
                    {/* SLA Step Gap Pill on the rail */}
                    {stepGap && (
                      <div className="relative -ml-4 my-2.5 flex items-center">
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200/90 px-2 py-0.5 rounded-full font-mono shadow-2xs">
                          <Clock size={9} className="text-slate-400" />
                          <span>ผ่านไป {stepGap}</span>
                        </span>
                      </div>
                    )}

                    {/* Timeline Node with Live Pulse Beacon */}
                    <div className="absolute -left-6 top-1 flex items-center justify-center">
                      {isLatest ? (
                        <div className="relative flex items-center justify-center w-7 h-7">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              isDone ? 'bg-emerald-400' : overdueInfo.isActiveOverdue ? 'bg-rose-400' : 'bg-sky-400'
                            }`}
                          />
                          <span
                            className={`relative inline-flex items-center justify-center rounded-full h-7 w-7 text-white font-bold text-[11px] shadow-sm ring-4 ring-white ${
                              isDone ? 'bg-emerald-600' : overdueInfo.isActiveOverdue ? 'bg-rose-600' : 'bg-[#003C71]'
                            }`}
                          >
                            {isDone ? (
                              <Check size={14} className="text-white stroke-[3]" />
                            ) : overdueInfo.isActiveOverdue ? (
                              '!'
                            ) : (
                              idx + 1
                            )}
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-slate-100 ${theme.dotBg}`}
                        >
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* 21st.dev Activity Card */}
                    <div
                      className={`p-3.5 rounded-2xl border shadow-2xs space-y-2 transition-all hover:shadow-sm ${theme.cardBorder}`}
                    >
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {isLatest && !isDone && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              สถานะล่าสุด
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono font-medium whitespace-nowrap bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                          {formatDateTimeThai(item.timestamp)}
                        </span>
                      </div>

                      {/* Actor Badge (Who executed this event) */}
                      {(item.actor || item.recordedBy) && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-600 bg-white/90 border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                            <User size={11} className="text-slate-400" />
                            <span>{item.actor || item.recordedBy}</span>
                          </span>
                        </div>
                      )}

                      {/* Reason / Details Box */}
                      {item.reason && (
                        <div className="bg-white p-2.5 rounded-xl border border-rose-200/80 text-xs text-slate-800 shadow-2xs">
                          <span className="font-bold text-rose-600 flex items-center gap-1 text-[11px] mb-1">
                            <AlertTriangle size={12} />
                            <span>เหตุผล / รายละเอียด:</span>
                          </span>
                          <span className="whitespace-pre-wrap leading-relaxed">{item.reason}</span>
                        </div>
                      )}

                      {/* Note or Extra Context */}
                      {item.note && !item.reason && (
                        <div className="text-[11.5px] text-slate-600 bg-white/70 p-2 rounded-xl border border-slate-200/60 leading-relaxed">
                          {item.note}
                        </div>
                      )}

                      {/* Hold Duration */}
                      {item.durationInHold && (
                        <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border border-amber-200">
                          <Clock size={12} className="text-amber-700" />
                          <span>พักรองานเป็นเวลา: {item.durationInHold}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary Bar */}
        <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {overdueInfo.isOverdue ? (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-bold ${
                  overdueInfo.type === 'ACTIVE_OVERDUE'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                <span>{overdueInfo.type === 'ACTIVE_OVERDUE' ? '🔴' : '🟠'}</span>
                <span>{overdueInfo.label}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-200 text-[11px] font-bold">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>ปิดงานตรงเวลา (ในเกณฑ์ SLA)</span>
              </span>
            )}
            {hasHoldHistory && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1 rounded-xl border border-amber-200 text-[11px] font-bold">
                <AlertTriangle size={13} className="text-amber-600" />
                <span>มีประวัติรออะไหล่/ติดปัญหา</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-[#003C71] hover:bg-[#002D56] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
