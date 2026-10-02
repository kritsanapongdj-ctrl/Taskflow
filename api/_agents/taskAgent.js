import { db, collection, getDocs, doc, getDoc } from '../_services/firebase.js';
import { GROUP_A, GROUP_B, GROUP_A2, ALL_PROJECTS } from '../_services/projectsConfig.js';
import { replyToLine } from '../_services/lineService.js';
import { askGemini } from '../_services/geminiService.js';

// Helper Formatters
const fDateThai = (ds) => {
  if (!ds) return '-';
  const d = new Date(ds);
  return isNaN(d.getTime()) ? String(ds) : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getEmoji = (text) => {
  if (!text) return '🛠️';
  if (/น้ำ|ก๊อก|ท่อ|รั่ว|ซึม|ปั๊ม|ปั้ม/.test(text)) return '💧';
  if (/ไฟ|หลอด|เบรกเกอร์|สวิตช์/.test(text)) return '⚡';
  if (/เหม็น|กลิ่น/.test(text)) return '🤢';
  if (/สี|ทาสี/.test(text)) return '🎨';
  if (/แอร์|ปรับอากาศ/.test(text)) return '❄️';
  if (/กระเบื้อง|พื้น/.test(text)) return '🧱';
  if (/ประตู|หน้าต่าง/.test(text)) return '🚪';
  if (/สวน|หญ้า|ต้นไม้|กิ่ง|ค้ำยัน/.test(text)) return '🌳';
  return '🛠️';
};

const getStatusBadge = (status) => {
  if (status === 'จบงาน') return '✅ จบงาน';
  if (status === 'จบงาน(รอใบงาน)') return '📋 จบงาน(รอใบงาน)';
  if (status === 'ติดปัญหา/รออะไหล่' || status === 'รออะไหล่/ติดปัญหา') return '⚠️ รออะไหล่/ติดปัญหา';
  if (status === 'เลื่อนวันเริ่ม') return '📅 เลื่อนวันเริ่ม';
  if (status === 'เลื่อนวันจบ' || status === 'เลื่อนงาน') return '📅 เลื่อนวันจบ';
  if (status === 'รอดำเนินการ') return '⏳ รอดำเนินการ';
  return '⚙️ กำลังดำเนินการ';
};

// ฟังก์ชันคำนวณระยะเวลาคงเหลือสำหรับออกใบงาน (SLA ภายใน 3 วันหลังจบงาน)
const getWorkOrderCountdownText = (t, todayStr) => {
  const cDateStr = t.completedDate || t.endDate || todayStr;
  try {
    const dCompleted = new Date(cDateStr.slice(0, 10) + 'T00:00:00+07:00');
    const dToday = new Date(todayStr.slice(0, 10) + 'T00:00:00+07:00');
    if (isNaN(dCompleted.getTime()) || isNaN(dToday.getTime())) {
      return '(⏳ SLA 3 วัน)';
    }
    const diffMs = dToday.getTime() - dCompleted.getTime();
    const daysPassed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const SLA = 3;
    const daysLeft = SLA - daysPassed;

    if (daysLeft > 1) {
      return `(⏳ เหลือเวลาอีก ${daysLeft} วัน)`;
    } else if (daysLeft === 1) {
      return `(⏳ เหลือเวลาอีก 1 วัน)`;
    } else if (daysLeft === 0) {
      return `(⚠️ วันนี้วันสุดท้าย!)`;
    } else {
      const overdueDays = Math.abs(daysLeft);
      return `(🚨 เกินกำหนดมา ${overdueDays} วัน!)`;
    }
  } catch (e) {
    return '(⏳ SLA 3 วัน)';
  }
};

// 1. คำสั่ง !สรุปงาน (ดึงเฉพาะงานวันนี้ - แสดงสถานะจริงครบทุกงาน)
async function handleSummary(projectList, groupName) {
  const snap = await getDocs(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'Tasks'));
  let allTasks = [];
  snap.forEach(doc => allTasks.push(doc.data()));
  
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  
  const todaysTasks = allTasks.filter(t => {
    if (t.status === 'ยกเลิก') return false;
    if (!projectList.some(p => (t.project || '').includes(p))) return false;

    const isUnfinishedToday = !t.status?.startsWith('จบงาน') && (
      (todayStr >= t.startDate && todayStr <= t.endDate) ||
      (t.endDate < todayStr)
    );

    const isFinishedToday = t.status?.startsWith('จบงาน') && (
      t.completedDate === todayStr ||
      (!t.completedDate && t.endDate === todayStr)
    );

    return isUnfinishedToday || isFinishedToday;
  });
  
  if (todaysTasks.length === 0) {
    return `ไม่มีภารกิจสำหรับวันนี้ในกลุ่ม ${groupName} ครับ! 🎉 (ข้อมูล ณ วันที่ ${fDateThai(todayStr)})`;
  }

  const doneCount = todaysTasks.filter(t => t.status === 'จบงาน').length;
  const waitWoCount = todaysTasks.filter(t => t.status === 'จบงาน(รอใบงาน)').length;
  const inProgCount = todaysTasks.filter(t => t.status === 'กำลังดำเนินการ' || t.status === 'อยู่ระหว่างดำเนินการ').length;
  const blockedCount = todaysTasks.filter(t => t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา').length;
  const postponedStartCount = todaysTasks.filter(t => t.status === 'เลื่อนวันเริ่ม').length;
  const postponedCount = todaysTasks.filter(t => t.status === 'เลื่อนวันจบ' || t.status === 'เลื่อนงาน').length;
  const pendingCount = todaysTasks.filter(t => t.status === 'รอดำเนินการ').length;
  
  const prompt = `ทำหน้าที่เป็นผู้ช่วยสรุปงานประจำวัน (Daily Tasks Report)
ข้อมูล:
ทีม: กลุ่ม ${groupName} ประจำวันที่ ${fDateThai(todayStr)}
ภาพรวม: ทั้งหมด ${todaysTasks.length} งาน (จบงานแล้ว: ${doneCount}, จบงานรอใบงาน: ${waitWoCount}, กำกำลังดำเนินการ: ${inProgCount}, ติดปัญหา/รออะไหล่: ${blockedCount}${postponedStartCount > 0 ? `, เลื่อนวันเริ่ม: ${postponedStartCount}` : ''}${postponedCount > 0 ? `, เลื่อนวันจบ: ${postponedCount}` : ''}, รอดำเนินการ: ${pendingCount})
รายการงานวันนี้:
${todaysTasks.map((t, i) => {
  const isWaitWo = (t.status === 'จบงาน(รอใบงาน)' || (t.status || '').includes('รอใบงาน')) && !t.workOrderNo;
  const woCountdown = isWaitWo ? ` ${getWorkOrderCountdownText(t, todayStr)}` : '';
  return `${i+1}. โครงการ: ${t.project}, งาน: ${t.details || t.task_name || 'ไม่ระบุ'}, สถานะ: ${t.status || 'อยู่ระหว่างดำเนินการ'}${woCountdown}${t.workOrderNo ? ' (WO: ' + t.workOrderNo + ')' : ''}${t.issueReason ? ' [สาเหตุ: ' + t.issueReason + ']' : ''}${t.startPostponeReason ? ' [เลื่อนเริ่ม: ' + t.startPostponeReason + ']' : ''}${t.postponeReason ? ' [เลื่อนจบ: ' + t.postponeReason + ']' : ''}`;
}).join('\n')}

ข้อกำหนด:
1. สรุปรายงานประจำวันของวันนี้ โดยแสดงสถานะจริงของทุกงาน (ทั้งที่จบแล้ว, รอใบงาน, กำลังทำ, หรือติดปัญหา) ไม่ต้องตัดงานที่จบแล้วออก
2. สำหรับงานที่สถานะเป็น "จบงาน(รอใบงาน)" ที่ยังไม่มีเลข WO ให้คงข้อความแจ้งเตือนระยะเวลาออกใบงานที่ระบุไว้ด้วยเสมอ เช่น (⏳ เหลือเวลาอีก X วัน), (⚠️ วันนี้วันสุดท้าย!), หรือ (🚨 เกินกำหนดมา X วัน!)
3. สรุปแยกตามโครงการอย่างชัดเจน
4. ใช้ Emoji ประกอบให้น่าอ่าน เช่น ✅ จบงาน, 📋 จบงาน(รอใบงาน), ⚙️ กำลังดำเนินการ, ⚠️ รออะไหล่, 📅 เลื่อนวันเริ่ม, 📅 เลื่อนวันจบ, ⏳ รอดำเนินการ
5. กระชับ ชัดเจน ไม่ต้องเกริ่นนำหรือลงท้ายยาวเกินไป
6. ลงท้ายด้วยประโยคให้กำลังใจทีมงานสั้นๆ`;

  const geminiResponse = await askGemini(prompt);
  if (geminiResponse && !geminiResponse.includes('Error')) {
    return geminiResponse;
  }
  
  let fallbackMsg = `📋 สรุปงานประจำวัน กลุ่ม ${groupName}\n`;
  fallbackMsg += `📅 ประจำวันที่: ${fDateThai(todayStr)}\n`;
  fallbackMsg += `📊 ภาพรวม: ${todaysTasks.length} งาน (✅ จบ ${doneCount} | 📋 รอใบงาน ${waitWoCount} | ⚙️ กำลังทำ ${inProgCount} | ⚠️ รออะไหล่ ${blockedCount}${postponedStartCount > 0 ? ` | 📅 เลื่อนเริ่ม ${postponedStartCount}` : ''}${postponedCount > 0 ? ` | 📅 เลื่อนจบ ${postponedCount}` : ''} | ⏳ รอดำเนินการ ${pendingCount})\n`;
  fallbackMsg += `─────────────────────────\n`;

  const byProject = {};
  todaysTasks.forEach(t => {
    const proj = t.project || 'ไม่ระบุ';
    if (!byProject[proj]) byProject[proj] = [];
    byProject[proj].push(t);
  });
  
  for (const proj in byProject) {
    fallbackMsg += `\n📌 ${proj} (${byProject[proj].length} งาน)\n`;
    byProject[proj].forEach((t, idx) => {
      const icon = getEmoji(t.details || t.task_name);
      const st = getStatusBadge(t.status || 'อยู่ระหว่างดำเนินการ');
      const isWaitWo = (t.status === 'จบงาน(รอใบงาน)' || (t.status || '').includes('รอใบงาน')) && !t.workOrderNo;
      const woCountdown = isWaitWo ? ` ${getWorkOrderCountdownText(t, todayStr)}` : '';
      const woTag = t.workOrderNo ? ` [WO: ${t.workOrderNo}]` : '';
      fallbackMsg += `${idx + 1}. ${t.details?.replace(/\n/g, ' ') || 'ไม่ระบุ'} ${icon}\n   สถานะ: ${st}${woCountdown}${woTag}\n`;
    });
  }

  fallbackMsg += `\n─────────────────────────\n💪 เป็นกำลังใจให้ทีมงานทุกคนครับ!`;
  return fallbackMsg;
}

// 2. คำสั่ง !รอใบงาน (กวาดงานค้างสถานะ จบงาน(รอใบงาน) คั่นด้วยเดือน -> โครงการ)
async function handlePendingWorkOrders(projectList, groupName) {
  const snap = await getDocs(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'Tasks'));
  let allTasks = [];
  snap.forEach(doc => allTasks.push(doc.data()));

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const monthNamesThai = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  const pendingTasks = allTasks.filter(t => {
    if (t.status === 'ยกเลิก') return false;
    if (!projectList.some(p => (t.project || '').includes(p))) return false;
    const isWaitWo = t.status === 'จบงาน(รอใบงาน)' || (t.status || '').includes('รอใบงาน');
    return isWaitWo && !t.workOrderNo;
  });

  if (pendingTasks.length === 0) {
    return `🎉 ยอดเยี่ยมมาก! ไม่มีงานค้างสถานะ "จบงาน(รอใบงาน)" ในกลุ่ม ${groupName} เลยครับ! (ข้อมูล ณ วันที่ ${fDateThai(todayStr)})`;
  }

  const grouped = {};
  pendingTasks.forEach(t => {
    const rawDate = t.completedDate || t.endDate || t.startDate || todayStr;
    const d = new Date(rawDate.slice(0, 10) + 'T00:00:00+07:00');
    const monthKey = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : `${yyyy}-${mm}`;
    const projectKey = t.project || 'ไม่ระบุโครงการ';

    if (!grouped[monthKey]) grouped[monthKey] = {};
    if (!grouped[monthKey][projectKey]) grouped[monthKey][projectKey] = [];
    grouped[monthKey][projectKey].push(t);
  });

  let msg = `📑 รายการงานค้าง "จบงาน(รอใบงาน)"\n`;
  msg += `กลุ่ม: ${groupName} (ค้างทั้งหมด: ${pendingTasks.length} งาน)\n`;
  msg += `─────────────────────────\n`;

  const sortedMonths = Object.keys(grouped).sort();

  for (const mKey of sortedMonths) {
    const [y, m] = mKey.split('-');
    const mIndex = parseInt(m, 10) - 1;
    const thaiYear = parseInt(y, 10) + 543;
    const monthLabel = `${monthNamesThai[mIndex]} ${thaiYear}`;

    let monthTotal = 0;
    Object.values(grouped[mKey]).forEach(list => monthTotal += list.length);

    msg += `\n📅 เดือน ${monthLabel} (รวม ${monthTotal} งาน)\n`;
    msg += `═════════════════════════\n`;

    const projectsInMonth = grouped[mKey];
    for (const proj in projectsInMonth) {
      const tasks = projectsInMonth[proj];
      msg += `📌 ${proj} (${tasks.length} งาน)\n`;

      tasks.forEach((t, idx) => {
        const cDate = t.completedDate || t.endDate || '-';
        const formattedCDate = fDateThai(cDate);
        const countdown = getWorkOrderCountdownText(t, todayStr);
        const taskName = (t.details || t.task_name || 'งานสาธารณูปโภค').replace(/\n/g, ' ');

        msg += `   ${idx + 1}. ${taskName}\n`;
        msg += `      วันที่จบ: ${formattedCDate} ${countdown}\n`;
        if (t.technician || t.assignee) {
          msg += `      ช่าง: ${t.technician || t.assignee}\n`;
        }
      });
    }
    msg += `─────────────────────────\n`;
  }

  msg += `\n💡 ข้อมูล ณ วันที่ ${fDateThai(todayStr)}\nโปรดประสานงานขอเลขที่ใบงาน (WO) เพื่อนำมาบันทึกในระบบและส่งเบิกจ่ายครับ`;
  return msg;
}

// 3. คำสั่ง !เช็คงาน (เช็คจากฐานข้อมูลบอทสอดแนมแจ้งซ่อมส่วนกลาง)
async function handleCheck(projectList, groupName) {
  const docSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "database"));
  if (!docSnap.exists()) return "❌ ไม่พบฐานข้อมูลงานจากบอทสอดแนมครับ";
  
  const database = docSnap.data();
  const jobs = Object.values(database).filter(j => projectList.some(p => j.project?.includes(p)));
  
  const nowMs = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
  const nowTime = new Date(nowMs).getTime();
  
  let overdue5d = [];
  let overdue48h = [];
  let normalJobs = [];
  
  jobs.forEach(j => {
    const hoursPassed = (nowTime - j.reported_timestamp) / (1000 * 60 * 60);
    if (hoursPassed >= 120) overdue5d.push(j);
    else if (hoursPassed >= 48) overdue48h.push(j);
    else normalJobs.push(j);
  });
  
  if (jobs.length === 0) {
     return `🎉 ยอดเยี่ยมมาก! ไม่มีงานค้างในระบบ Dashboard สำหรับกลุ่ม ${groupName} เลยครับ!`;
  }

  let msg = `📢 อัปเดตงานสาธารณูปโภค (กลุ่ม ${groupName})\n`;
  const formatJob = (j) => `\n📌 ${j.project}\n🏠 บ้านเลขที่: ${j.house_no || '-'}\n👤 ผู้แจ้ง: ${j.customer_name || '-'}\n📞 เบอร์โทร: ${j.phone || '-'}\n📝 รายละเอียด: ${j.details || '-'}\n(รหัส: ${j.job_id})\n`;
  
  if (normalJobs.length > 0) {
     msg += `\n🆕 งานรอดำเนินการ:\n` + normalJobs.map(formatJob).join('');
  }
  if (overdue48h.length > 0) {
     msg += `\n⚠️ งานค้างเกิน 48 ชม:\n` + overdue48h.map(formatJob).join('');
  }
  if (overdue5d.length > 0) {
     msg += `\n🚨 งานล่าช้าเกิน 5 วัน:\n` + overdue5d.map(formatJob).join('');
  }
  
  return msg;
}

// 4. คำสั่งเมนูช่วยเหลือ
function getHelpMessage() {
  return `🤖 เมนูคำสั่ง LH TaskFlow Bot\n` +
    `─────────────────────────\n` +
    `🌊 รายงานสถานการณ์น้ำท่วม & ระบายน้ำ (ฤดูฝน):\n` +
    `• !น้ำท่วม [รหัส] [รายละเอียด]\n` +
    `  (ตัวอย่าง: !น้ำท่วม 410 ถนนเมนแห้งสนิท เครื่องสูบน้ำพร้อมใช้)\n` +
    `  (ส่งภาพถ่าย 5-10 รูป บอทจะสร้างเอกสาร PDF สรุปส่งให้ทันที)\n\n` +
    `📋 สรุปงานประจำวัน (งานวันนี้):\n` +
    `• !สรุปงาน (ดูภาพรวมทุกโครงการ)\n` +
    `• !สรุปงานA, !สรุปงานB, !สรุปงานA2\n\n` +
    `📑 ติดตามงานค้างใบงาน (ค้าง WO):\n` +
    `• !รอใบงาน (ดูทั้งหมดแยกตามเดือน)\n` +
    `• !รอใบงานA, !รอใบงานB, !รอใบงานA2\n\n` +
    `🔍 เช็คงานแจ้งซ่อมส่วนกลาง (บอทสอดแนม):\n` +
    `• !เช็คงาน (ดูภาพรวม)\n` +
    `• !เช็คงานA, !เช็คงานB, !เช็คงานA2\n\n` +
    `💰 งบประมาณ & คาดการณ์สิ้นปี (Forecast):\n` +
    `• !งบ (สรุปงบภาพรวมทุกกลุ่ม)\n` +
    `• !งบA, !งบB, !งบA2 (สรุปงบแยกกลุ่ม)\n` +
    `• !งบ [รหัส] (เจาะลึก 9 หมวด + PV เช่น !งบ 410, !งบ LA-025)\n` +
    `• !เกินงบ (ดูรายการที่เสี่ยงเกินงบสิ้นปี)\n\n` +
    `*(พิมพ์นำหน้าด้วย ! หรือ / หรือพิมพ์คำสั่งตรงๆ ได้เลยครับ)*`;
}

export const TaskAgent = {
  name: 'TaskAgent',
  description: 'จัดการสรุปงานประจำวัน งานค้างใบงาน WO และแจ้งเตือนงานซ่อมส่วนกลาง',

  canHandle(cleanText, upperClean) {
    if (upperClean === 'คำสั่ง' || upperClean === 'HELP' || upperClean === 'เมนู') return true;
    if (upperClean.startsWith('สรุปงาน')) return true;
    if (upperClean.startsWith('รอใบงาน')) return true;
    if (upperClean.startsWith('เช็คงาน')) return true;
    return false;
  },

  async handle({ event, cleanText, upperClean, replyToken }) {
    let targetGroup = 'ALL';
    let action = null;

    if (upperClean === 'คำสั่ง' || upperClean === 'HELP' || upperClean === 'เมนู') {
      action = 'help';
    } else if (upperClean === 'สรุปงานA') { action = 'summary'; targetGroup = 'A'; }
    else if (upperClean === 'สรุปงานB') { action = 'summary'; targetGroup = 'B'; }
    else if (upperClean === 'สรุปงานA2') { action = 'summary'; targetGroup = 'A2'; }
    else if (upperClean === 'สรุปงาน') { action = 'summary'; targetGroup = 'ALL'; }

    else if (upperClean === 'รอใบงานA') { action = 'pending_wo'; targetGroup = 'A'; }
    else if (upperClean === 'รอใบงานB') { action = 'pending_wo'; targetGroup = 'B'; }
    else if (upperClean === 'รอใบงานA2') { action = 'pending_wo'; targetGroup = 'A2'; }
    else if (upperClean === 'รอใบงาน') { action = 'pending_wo'; targetGroup = 'ALL'; }

    else if (upperClean === 'เช็คงานA') { action = 'check'; targetGroup = 'A'; }
    else if (upperClean === 'เช็คงานB') { action = 'check'; targetGroup = 'B'; }
    else if (upperClean === 'เช็คงานA2') { action = 'check'; targetGroup = 'A2'; }
    else if (upperClean === 'เช็คงาน') { action = 'check'; targetGroup = 'ALL'; }

    if (!action) return false;

    const projectList = targetGroup === 'A' ? GROUP_A 
      : targetGroup === 'B' ? GROUP_B 
      : targetGroup === 'A2' ? GROUP_A2 
      : ALL_PROJECTS;
    const groupName = targetGroup === 'ALL' ? 'ทั้งหมดทุกโครงการ' : targetGroup;

    let responseText = '';
    if (action === 'summary') {
      responseText = await handleSummary(projectList, groupName);
    } else if (action === 'pending_wo') {
      responseText = await handlePendingWorkOrders(projectList, groupName);
    } else if (action === 'check') {
      responseText = await handleCheck(projectList, groupName);
    } else if (action === 'help') {
      responseText = getHelpMessage();
    }

    if (responseText && replyToken) {
      await replyToLine(replyToken, responseText);
      return true;
    }
    return false;
  }
};
