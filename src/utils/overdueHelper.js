// src/utils/overdueHelper.js
// ระบบวิเคราะห์และจำแนกสถานะงานล่าช้า/เกินกำหนดแบบรวมศูนย์ (Centralized Overdue & SLA Helper)

/**
 * คำนวณข้อมูลสถานะความล่าช้า/เกินกำหนดของงาน (Active Overdue, Completed Late, Late WO)
 * @param {Object} task - ข้อมูลงาน
 * @param {string} today - วันที่ปัจจุบันในรูปแบบ 'YYYY-MM-DD'
 * @param {Object} sets - การตั้งค่าระบบ เช่น { overdueTime: '17:30' }
 * @returns {Object} ข้อมูลสถานะความล่าช้า
 */
export function getTaskOverdueInfo(task, today, sets = {}) {
  if (!task || !task.endDate || task.status === 'ยกเลิก') {
    return {
      isOverdue: false,
      isCompletedLate: false,
      isActiveOverdue: false,
      isLateWO: false,
      type: 'NONE',
      daysLate: 0,
      label: '',
      shortBadge: '',
      reason: '',
      badgeClass: '',
      borderClass: '',
      bgHighlightClass: '',
      dotClass: ''
    };
  }

  const currentDate = today || new Date().toISOString().split('T')[0];
  const isCompleted = task.status?.startsWith('จบงาน');

  // 1. กรณี: งานจบแล้ว (Completed) แต่จบช้ากว่ากำหนด หรือออกใบงานช้า
  if (isCompleted) {
    const isCompletedLate = (task.completedDate && task.completedDate > task.endDate) || task.overdueStatus === 'เกินกำหนด';
    const isLateWO = task.overdueStatus === 'ออกใบงานช้า' || task.lateWorkOrder === true;

    if (isCompletedLate) {
      let daysLate = 0;
      if (task.completedDate && task.endDate) {
        const diff = Math.floor((new Date(task.completedDate).getTime() - new Date(task.endDate).getTime()) / 86400000);
        daysLate = Math.max(diff, 1);
      } else {
        daysLate = 1;
      }

      return {
        isOverdue: true,
        isCompletedLate: true,
        isActiveOverdue: false,
        isLateWO: isLateWO,
        type: 'COMPLETED_LATE',
        daysLate,
        label: `ปิดงานช้ากว่ากำหนด ${daysLate} วัน`,
        fullDetail: `กำหนดส่ง: ${task.endDate} | ปิดจริง: ${task.completedDate || '-'} (ช้า ${daysLate} วัน)`,
        shortBadge: `⏱️ ปิดช้า ${daysLate} วัน`,
        reason: task.overdueReason || '',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
        borderClass: 'border-l-[5px] border-l-amber-500',
        bgHighlightClass: 'bg-amber-50/30',
        dotClass: 'bg-amber-500'
      };
    }

    if (isLateWO) {
      let daysLate = 0;
      if (task.completedDate) {
        const diff = Math.floor((new Date(currentDate).getTime() - new Date(task.completedDate).getTime()) / 86400000);
        daysLate = diff > 3 ? diff - 3 : 0;
      }

      return {
        isOverdue: true,
        isCompletedLate: false,
        isActiveOverdue: false,
        isLateWO: true,
        type: 'LATE_WO',
        daysLate,
        label: 'ออกใบงานช้ากว่ากำหนด (>3 วัน)',
        fullDetail: `จบหน้างานตั้งแต่ ${task.completedDate || task.endDate} (รอใบงานเกิน 3 วัน)`,
        shortBadge: '🧾 ออกใบงานช้า',
        reason: task.overdueReason || '',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-300 font-bold',
        borderClass: 'border-l-[5px] border-l-purple-500',
        bgHighlightClass: 'bg-purple-50/20',
        dotClass: 'bg-purple-500'
      };
    }

    return {
      isOverdue: false,
      isCompletedLate: false,
      isActiveOverdue: false,
      isLateWO: false,
      type: 'NONE',
      daysLate: 0,
      label: '',
      shortBadge: '',
      reason: '',
      badgeClass: '',
      borderClass: '',
      bgHighlightClass: '',
      dotClass: ''
    };
  }

  // 2. กรณี: งานยังไม่จบ และค้างเกินกำหนด (Active Overdue)
  let isCurrentlyOverdue = false;
  let daysLate = 0;

  if (currentDate > task.endDate) {
    isCurrentlyOverdue = true;
    daysLate = Math.max(Math.floor((new Date(currentDate).getTime() - new Date(task.endDate).getTime()) / 86400000), 1);
  } else if (currentDate === task.endDate) {
    const now = new Date();
    const cH = now.getHours();
    const cM = now.getMinutes();
    const tP = (sets?.overdueTime || '17:30').split(':');
    const tH = parseInt(tP[0] || 17, 10);
    const tM = parseInt(tP[1] || 30, 10);
    if (cH > tH || (cH === tH && cM >= tM)) {
      isCurrentlyOverdue = true;
      daysLate = 0; // เลยเวลาตัดเกณฑ์ในวันเดียวกัน
    }
  }

  if (isCurrentlyOverdue || task.overdueStatus === 'เกินกำหนด') {
    return {
      isOverdue: true,
      isCompletedLate: false,
      isActiveOverdue: true,
      isLateWO: false,
      type: 'ACTIVE_OVERDUE',
      daysLate,
      label: daysLate > 0 ? `ค้างเกินกำหนด ${daysLate} วัน` : 'เกินกำหนด (เลยเวลาตัดเกณฑ์)',
      fullDetail: daysLate > 0 ? `กำหนดส่งมอบ: ${task.endDate} (เกินมาแล้ว ${daysLate} วัน)` : `กำหนดส่งมอบวันนี้ (เลยเวลาตัดเกณฑ์ 17:30 น.)`,
      shortBadge: daysLate > 0 ? `⚠️ เกิน ${daysLate} วัน` : '⚠️ เกินกำหนด',
      reason: task.overdueReason || '',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
      borderClass: 'border-l-[5px] border-l-rose-500',
      bgHighlightClass: 'bg-rose-50/40',
      dotClass: 'bg-rose-500'
    };
  }

  if (task.overdueStatus === 'ออกใบงานช้า') {
    return {
      isOverdue: true,
      isCompletedLate: false,
      isActiveOverdue: false,
      isLateWO: true,
      type: 'LATE_WO',
      daysLate: 0,
      label: 'ออกใบงานช้า',
      fullDetail: 'ออกใบงานล่าช้ากว่าเกณฑ์',
      shortBadge: '🧾 ออกใบงานช้า',
      reason: task.overdueReason || '',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-300 font-bold',
      borderClass: 'border-l-[5px] border-l-purple-500',
      bgHighlightClass: 'bg-purple-50/20',
      dotClass: 'bg-purple-500'
    };
  }

  return {
    isOverdue: false,
    isCompletedLate: false,
    isActiveOverdue: false,
    isLateWO: false,
    type: 'NONE',
    daysLate: 0,
    label: '',
    shortBadge: '',
    reason: '',
    badgeClass: '',
    borderClass: '',
    bgHighlightClass: '',
    dotClass: ''
  };
}
