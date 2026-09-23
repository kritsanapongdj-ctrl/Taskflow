import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyB6KvZWr8b2dXHxysIqXwk-SsdiuVNYv94",
  authDomain: "taskflow-plus-3fce7.firebaseapp.com",
  projectId: "taskflow-plus-3fce7"
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // Ignore error if already initialized in Vercel cache
}

const db = getFirestore(app);
const auth = getAuth(app);

const GROUP_A = ['LH-410', 'LH-415', 'NE-419'];
const GROUP_B = ['LH-379', 'LH-392', 'LH-395'];
const GROUP_A2 = ['LA-025', 'LH-329', 'LH-402', 'LH-120', 'LH-195', 'LH-225'];
const ALL_PROJECTS = [...GROUP_A, ...GROUP_B, ...GROUP_A2];

// ส่งข้อความตอบกลับไปยัง LINE (Reply API ฟรี 100%)
async function replyToLine(replyToken, text) {
  const LINE_TOKEN = process.env.LINE_TOKEN;
  if (!LINE_TOKEN) {
    console.error("Missing LINE_TOKEN in Vercel Environment Variables");
    return;
  }
  
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: 'text', text: text }]
      })
    });
  } catch(e) {
    console.error("LINE Reply Error:", e);
  }
}

// ถาม Gemini AI
async function askGemini(prompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return null;
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error("Gemini Error:", err);
    return null;
  }
}

const getEmoji = (text) => {
  if (!text) return '🛠️';
  if (/น้ำ|ก๊อก|ท่อ|รั่ว|ซึม|ปั๊ม/.test(text)) return '💧';
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

const fDateThai = (ds) => {
  if (!ds) return '-';
  const d = new Date(ds);
  return isNaN(d.getTime()) ? String(ds) : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const fNum = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

// 1. ฟังก์ชันสำหรับคำสั่ง !สรุปงาน (ดึงเฉพาะงานวันนี้ - ไม่สนสถานะ)
async function handleSummary(projectList, groupName) {
  const snap = await getDocs(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'Tasks'));
  let allTasks = [];
  snap.forEach(doc => allTasks.push(doc.data()));
  
  const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'}));
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  
  // กรองเฉพาะงานของ "วันนี้" จริงๆ (ไม่สนสถานะ: แสดงทั้งจบงาน, รอใบงาน, กำลังทำ, รออะไหล่, รอดำเนินการ)
  const todaysTasks = allTasks.filter(t => {
    // ไม่เอางานที่ถูกยกเลิก
    if (t.status === 'ยกเลิก') return false;

    // กรองเฉพาะโครงการในกลุ่มเป้าหมาย
    if (!projectList.some(p => (t.project || '').includes(p))) return false;

    // 1. งานที่ยังไม่จบ: มีกำหนดทำวันนี้ หรือ ค้างส่ง Overdue มาถึงวันนี้
    const isUnfinishedToday = !t.status?.startsWith('จบงาน') && (
      (todayStr >= t.startDate && todayStr <= t.endDate) ||
      (t.endDate < todayStr)
    );

    // 2. งานที่ปิดจบในวันนี้
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
ภาพรวม: ทั้งหมด ${todaysTasks.length} งาน (จบงานแล้ว: ${doneCount}, จบงานรอใบงาน: ${waitWoCount}, กำลังดำเนินการ: ${inProgCount}, ติดปัญหา/รออะไหล่: ${blockedCount}${postponedStartCount > 0 ? `, เลื่อนวันเริ่ม: ${postponedStartCount}` : ''}${postponedCount > 0 ? `, เลื่อนวันจบ: ${postponedCount}` : ''}, รอดำเนินการ: ${pendingCount})
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
  
  // Fallback (ถ้า AI พัง หรือยังไม่ได้ใส่ Key)
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

// 2. ฟังก์ชันสำหรับคำสั่งใหม่ !รอใบงาน (กวาดงานที่ค้าง จบงาน(รอใบงาน) คั่นด้วยเดือน -> โครงการ)
async function handlePendingWorkOrders(projectList, groupName) {
  const snap = await getDocs(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'Tasks'));
  let allTasks = [];
  snap.forEach(doc => allTasks.push(doc.data()));

  const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'}));
  const nowMs = now.getTime();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const monthNamesThai = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  // กรองเฉพาะงานที่จบงาน(รอใบงาน) และยังไม่ได้ส่งเบิก
  const pendingTasks = allTasks.filter(t => {
    if (t.status === 'ยกเลิก') return false;
    if (!projectList.some(p => (t.project || '').includes(p))) return false;
    const isWaitWO = t.status === 'จบงาน(รอใบงาน)' || (t.status || '').includes('รอใบงาน');
    return isWaitWO && t.billingStatus !== 'ส่งเบิกแล้ว';
  });

  if (pendingTasks.length === 0) {
    return `🎉 ยอดเยี่ยมมาก! ไม่มีงานค้างสถานะ "จบงาน(รอใบงาน)" สำหรับกลุ่ม ${groupName} ครับ`;
  }

  // จัดกลุ่ม: เดือน (Month: YYYY-MM) -> โครงการ (Project)
  const byMonth = {};
  pendingTasks.forEach(t => {
    const d = t.completedDate || t.startDate || todayStr;
    const m = d.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = {};
    const p = t.project || 'ไม่ระบุ';
    if (!byMonth[m][p]) byMonth[m][p] = [];
    byMonth[m][p].push(t);
  });

  const sortedMonths = Object.keys(byMonth).sort(); // เรียงตามเดือนอดีตไปปัจจุบัน

  let msg = `📑 รายการงานค้าง "จบงาน (รอใบงาน)"\n`;
  msg += `👥 กลุ่ม: ${groupName} (ค้างทั้งหมด ${pendingTasks.length} รายการ)\n`;
  msg += `─────────────────────────\n`;

  for (const mKey of sortedMonths) {
    const [y, m] = mKey.split('-');
    const mName = monthNamesThai[parseInt(m, 10) - 1] || mKey;
    const yThai = parseInt(y, 10) + 543;

    let monthTotal = 0;
    for (const p in byMonth[mKey]) monthTotal += byMonth[mKey][p].length;

    msg += `\n📅 เดือน ${mName} ${yThai} (ค้าง ${monthTotal} งาน)\n`;

    for (const proj in byMonth[mKey]) {
      const list = byMonth[mKey][proj];
      msg += `\n📌 ${proj} (${list.length} งาน):\n`;
      list.forEach((t, idx) => {
        const cDate = t.completedDate || t.startDate;
        let daysWaiting = 0;
        if (cDate) {
          daysWaiting = Math.floor((nowMs - new Date(cDate).getTime()) / (1000 * 60 * 60 * 24));
          daysWaiting = Math.max(daysWaiting, 0);
        }
        const countdown = getWorkOrderCountdownText(t, todayStr);
        msg += `${idx + 1}. ${t.details?.replace(/\n/g, ' ') || 'ไม่ระบุ'}\n   🗓️ ปิดงาน: ${fDateThai(cDate)} (⏳ รอมา ${daysWaiting} วัน | ${countdown.replace(/[()]/g, '')})\n   [ID: ${t.id}]\n`;
      });
    }
    msg += `─────────────────────────\n`;
  }

  msg += `\n💡 ข้อมูล ณ วันที่ ${fDateThai(todayStr)}\nโปรดประสานงานขอเลขที่ใบงาน (WO) เพื่อนำมาบันทึกในระบบและส่งเบิกจ่ายครับ`;
  return msg;
}

// 3. ฟังก์ชันสำหรับคำสั่ง !เช็คงาน (เช็คจากบอทสอดแนมแจ้งซ่อมส่วนกลาง)
async function handleCheck(projectList, groupName) {
  const docSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "database"));
  if (!docSnap.exists()) return "❌ ไม่พบฐานข้อมูลงานจากบอทสอดแนมครับ";
  
  const database = docSnap.data();
  const jobs = Object.values(database).filter(j => projectList.some(p => j.project?.includes(p)));
  
  const nowMs = new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"});
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

// Helper ค้นหาโครงการจากรหัสหรือชื่อโครงการ
function findProject(projects, query) {
  if (!query) return null;
  const q = query.trim().toUpperCase().replace(/[\s\-_]/g, '');

  // 1. ตรงกับรหัสโครงการเป๊ะๆ
  for (const [key, p] of Object.entries(projects)) {
    const keyClean = key.toUpperCase().replace(/[\s\-_]/g, '');
    const codeClean = (p.code || '').toUpperCase().replace(/[\s\-_]/g, '');
    if (keyClean === q || codeClean === q) return p;
  }
  // 2. ค้นหาบางส่วนของรหัส (เช่น 410 -> LH-410)
  for (const [key, p] of Object.entries(projects)) {
    const keyClean = key.toUpperCase().replace(/[\s\-_]/g, '');
    const codeClean = (p.code || '').toUpperCase().replace(/[\s\-_]/g, '');
    if (keyClean.includes(q) || codeClean.includes(q)) return p;
  }
  // 3. ค้นหาจากชื่อโครงการ
  for (const [key, p] of Object.entries(projects)) {
    const nameClean = (p.fullName || '').toUpperCase();
    if (nameClean.includes(query.trim().toUpperCase())) return p;
  }
  return null;
}

// 4. ฟังก์ชันสำหรับคำสั่ง !งบ, !งบA, !งบB, !งบA2 (สรุปภาพรวมงบประมาณ & คาดการณ์สิ้นปี)
async function handleBudgetOverview(targetGroup) {
  try {
    const docSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"));
    if (!docSnap.exists()) {
      return "❌ ยังไม่พบข้อมูลงบประมาณในระบบ\nกรุณารันบอทอัปเดตงบประมาณจากระบบ LH Portal ก่อนครับ";
    }

    const data = docSnap.data();
    const projects = data.projects || {};
    const groupName = targetGroup === 'ALL' ? 'ทั้งหมดทุกโครงการ' : `กลุ่ม ${targetGroup}`;

    const filtered = Object.values(projects).filter(p => {
      if (targetGroup === 'ALL') return true;
      return p.group === targetGroup;
    });

    if (filtered.length === 0) {
      return `❌ ไม่พบข้อมูลงบประมาณสำหรับ ${groupName} ครับ`;
    }

    let totalActual = 0;
    let totalForecast = 0;
    let totalLanding = 0;
    let totalBgt = 0;

    let msg = `📊 สรุปงบประมาณ & คาดการณ์ (Forecast)\n`;
    msg += `👥 ทีม: ${groupName} (หน่วย: พันบาท)\n`;
    msg += `─────────────────────────\n`;

    filtered.forEach(p => {
      totalActual += p.totalYtdActual || 0;
      totalForecast += p.totalYtgForecast || 0;
      totalLanding += p.totalFyLanding || 0;
      totalBgt += p.totalBudget || 0;
      const diff = p.totalVariance || 0;
      const diffSign = diff > 0 ? '+' : '';

      msg += `\n📌 [${p.code}] ${p.fullName}\n`;
      msg += `   • จ่ายจริง 8 ด.: ${fNum(p.totalYtdActual)} พันบ.\n`;
      msg += `   • Forecast 4 ด.: ${fNum(p.totalYtgForecast)} พันบ.\n`;
      msg += `   • สิ้นปี (FY): ${fNum(p.totalFyLanding)} / งบ: ${fNum(p.totalBudget)}\n`;
      msg += `   • สถานะ: ${p.overallStatus} (${diffSign}${fNum(diff)} พันบ. / ${p.totalVariancePct})\n`;
    });

    const netDiff = parseFloat((totalLanding - totalBgt).toFixed(2));
    const netStatus = netDiff > 0 ? '🚨 เสี่ยงเกินงบ' : '✅ ในงบ';
    const netSign = netDiff > 0 ? '+' : '';
    const netPct = totalBgt > 0 ? ((netDiff / totalBgt) * 100).toFixed(1) + '%' : '0%';

    msg += `─────────────────────────\n`;
    msg += `📈 รวมทั้งสิ้น (${groupName}):\n`;
    msg += `• จ่ายจริง 8 เดือน: ${fNum(totalActual)} พันบ.\n`;
    msg += `• คาดการณ์จบปี: ${fNum(totalLanding)} พันบ.\n`;
    msg += `• งบประมาณทั้งปี: ${fNum(totalBgt)} พันบ.\n`;
    msg += `• ผลต่างสุทธิ: ${netStatus} (${netSign}${fNum(netDiff)} พันบ. / ${netPct})\n`;
    msg += `─────────────────────────\n`;
    msg += `🕒 ข้อมูล ณ วันที่: ${data.updatedDateThai || '-'}\n`;
    msg += `💡 พิมพ์ '!งบ [รหัส]' เพื่อดู 9 หมวดบัญชี (เช่น !งบ 410, !งบ LA-025)`;

    return msg;
  } catch (err) {
    console.error("handleBudgetOverview Error:", err);
    return "❌ เกิดข้อผิดพลาดในการดึงข้อมูลงบประมาณ กรุณาลองใหม่อีกครั้งครับ";
  }
}

// 5. ฟังก์ชันสำหรับคำสั่ง !งบ [รหัส] (เจาะลึก 9 หมวดบัญชี + ใบสำคัญจ่าย PV)
async function handleProjectBudget(projectQuery) {
  try {
    const docSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"));
    if (!docSnap.exists()) {
      return "❌ ยังไม่พบข้อมูลในระบบ กรุณารันบอทอัปเดตงบประมาณก่อนครับ";
    }

    const data = docSnap.data();
    const projects = data.projects || {};
    const proj = findProject(projects, projectQuery);

    if (!proj) {
      const avail = Object.keys(projects).join(', ');
      return `❌ ไม่พบรหัสโครงการ "${projectQuery}" ครับ\n📌 โครงการที่มีข้อมูล: ${avail}\n💡 ตัวอย่างการพิมพ์: !งบ 410, !งบ LA-025, !งบ 379`;
    }

    const pDiff = proj.totalVariance || 0;
    const pSign = pDiff > 0 ? '+' : '';

    let msg = `💰 รายละเอียดงบ & Forecast\n`;
    msg += `📌 [${proj.code}] ${proj.fullName}\n`;
    msg += `👥 กลุ่ม: กลุ่ม ${proj.group} (หน่วย: พันบาท)\n`;
    msg += `─────────────────────────\n`;
    msg += `📊 ภาพรวมโครงการ:\n`;
    msg += `• จ่ายจริง 8 เดือน: ${fNum(proj.totalYtdActual)} พันบ.\n`;
    msg += `• คาดการณ์ 4 เดือน: ${fNum(proj.totalYtgForecast)} พันบ.\n`;
    msg += `• คาดการณ์จบปี (FY): ${fNum(proj.totalFyLanding)} พันบ.\n`;
    msg += `• งบประมาณทั้งปี: ${fNum(proj.totalBudget)} พันบ.\n`;
    msg += `• ผลต่างสุทธิ: ${proj.overallStatus} (${pSign}${fNum(pDiff)} พันบ. / ${proj.totalVariancePct})\n`;
    msg += `─────────────────────────\n`;
    msg += `📑 แยกราย 9 หมวดบัญชี:\n`;

    (proj.expenses || []).forEach((e, idx) => {
      const diffS = e.variance > 0 ? '+' : '';
      const badge = e.variance > 0 ? '🚨' : '✅';
      msg += `\n${idx + 1}. ${e.title}\n`;
      msg += `   จริง: ${fNum(e.ytdActual)} | สิ้นปี: ${fNum(e.fyLanding)}\n`;
      msg += `   งบ: ${fNum(e.fullYearBudget)} | ผลต่าง: ${badge} ${diffS}${fNum(e.variance)} พันบ. (${e.variancePct})\n`;
    });

    if (proj.vouchers && proj.vouchers.length > 0) {
      msg += `─────────────────────────\n`;
      msg += `🧾 ใบสำคัญจ่าย PV ล่าสุด (${proj.vouchers.length} รายการ):\n`;
      proj.vouchers.slice(0, 3).forEach((v) => {
        msg += `• ${v.date} [${v.pvNo}] ${v.amount} บ.\n   ${v.vendor} (${v.workDesc})\n`;
      });
    }

    msg += `─────────────────────────\n`;
    msg += `🕒 ข้อมูล ณ วันที่: ${data.updatedDateThai || '-'}`;
    return msg;
  } catch (err) {
    console.error("handleProjectBudget Error:", err);
    return "❌ เกิดข้อผิดพลาดในการดึงข้อมูลโครงการ กรุณาลองใหม่อีกครั้งครับ";
  }
}

// 6. ฟังก์ชันสำหรับคำสั่ง !เกินงบ (แจ้งเตือนเฉพาะโครงการและหมวดที่เสี่ยงเกินงบ)
async function handleOverBudget() {
  try {
    const docSnap = await getDoc(doc(db, "artifacts", "default-app-id", "public", "data", "lh_scraper", "budget_forecast"));
    if (!docSnap.exists()) {
      return "❌ ยังไม่พบข้อมูลในระบบ กรุณารันบอทอัปเดตงบประมาณก่อนครับ";
    }

    const data = docSnap.data();
    const projects = data.projects || {};

    let overCount = 0;
    let msg = `🚨 รายการที่มีความเสี่ยง "เกินงบประมาณ"\n`;
    msg += `(คาดการณ์จบปีสิ้นสุดเกินงบประมาณ | หน่วย: พันบาท)\n`;
    msg += `─────────────────────────\n`;

    for (const [code, p] of Object.entries(projects)) {
      const overExpenses = (p.expenses || []).filter(e => e.variance > 0);
      if (p.totalVariance > 0 || overExpenses.length > 0) {
        overCount++;
        const pDiff = p.totalVariance || 0;
        const pSign = pDiff > 0 ? '+' : '';
        msg += `\n📌 [${p.code}] ${p.fullName} (กลุ่ม ${p.group})\n`;
        msg += `   ภาพรวม: ${p.overallStatus} (${pSign}${fNum(pDiff)} พันบ. / ${p.totalVariancePct})\n`;
        if (overExpenses.length > 0) {
          msg += `   หมวดที่เกินงบ:\n`;
          overExpenses.forEach(e => {
            msg += `   ⚠️ ${e.title}: เกิน +${fNum(e.variance)} พันบ. (${e.variancePct})\n`;
          });
        }
      }
    }

    if (overCount === 0) {
      return `🎉 ยอดเยี่ยมมาก! ทุกโครงการคาดการณ์ค่าใช้จ่ายสิ้นปีอยู่ในกรอบงบประมาณทั้งหมด (ไม่มีรายการเกินงบ)`;
    }

    msg += `─────────────────────────\n`;
    msg += `📊 พบโครงการที่ต้องเฝ้าระวัง: ${overCount} โครงการ\n`;
    msg += `🕒 ข้อมูล ณ วันที่: ${data.updatedDateThai || '-'}\n`;
    msg += `💡 พิมพ์ '!งบ [รหัส]' เพื่อดูรายละเอียดรายโครงการ`;

    return msg;
  } catch (err) {
    console.error("handleOverBudget Error:", err);
    return "❌ เกิดข้อผิดพลาดในการดึงข้อมูลรายการเกินงบ กรุณาลองใหม่อีกครั้งครับ";
  }
}

// จุดรับสัญญาณจาก LINE Webhook
export default async function handler(req, res) {
  // บังคับให้รับเฉพาะ POST Request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const events = req.body.events;
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }

    // ทำการ Login เข้า Firebase
    await signInAnonymously(auth);

    // วนลูปอ่านข้อความที่ผู้ใช้พิมพ์เข้ามา
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const rawText = (event.message.text || '').trim();
        const replyToken = event.replyToken;

        // ถอด prefix ! หรือ / ออกเพื่อให้รองรับทั้ง 2 แบบ หรือพิมพ์ข้อความตรงๆ
        const cleanText = rawText.replace(/^[!\/]/, '').trim();
        const upperClean = cleanText.toUpperCase();

        let targetGroup = null;
        let action = null;
        let projectQuery = null;

        // เมนูช่วยเหลือ
        if (upperClean === 'คำสั่ง' || upperClean === 'HELP' || upperClean === 'เมนู') {
          action = 'help';
        }
        // 1. คำสั่ง !สรุปงาน (งานประจำวัน - เฉพาะวันนี้ ไม่สนสถานะ)
        else if (upperClean === 'สรุปงานA') { action = 'summary'; targetGroup = 'A'; }
        else if (upperClean === 'สรุปงานB') { action = 'summary'; targetGroup = 'B'; }
        else if (upperClean === 'สรุปงานA2') { action = 'summary'; targetGroup = 'A2'; }
        else if (upperClean === 'สรุปงาน') { action = 'summary'; targetGroup = 'ALL'; }

        // 2. คำสั่งใหม่ !รอใบงาน (งานค้างสถานะจบงานรอใบงาน - คั่นด้วยเดือนและโครงการ)
        else if (upperClean === 'รอใบงานA') { action = 'pending_wo'; targetGroup = 'A'; }
        else if (upperClean === 'รอใบงานB') { action = 'pending_wo'; targetGroup = 'B'; }
        else if (upperClean === 'รอใบงานA2') { action = 'pending_wo'; targetGroup = 'A2'; }
        else if (upperClean === 'รอใบงาน') { action = 'pending_wo'; targetGroup = 'ALL'; }

        // 3. คำสั่ง !เช็คงาน (ดึงงานแจ้งซ่อมสาธารณูปโภคจากบอทสอดแนม)
        else if (upperClean === 'เช็คงานA') { action = 'check'; targetGroup = 'A'; }
        else if (upperClean === 'เช็คงานB') { action = 'check'; targetGroup = 'B'; }
        else if (upperClean === 'เช็คงานA2') { action = 'check'; targetGroup = 'A2'; }
        else if (upperClean === 'เช็คงาน') { action = 'check'; targetGroup = 'ALL'; }

        // 4. คำสั่งแจ้งเตือนเกินงบ
        else if (upperClean === 'เกินงบ' || upperClean === 'เสี่ยงเกินงบ') {
          action = 'over_budget';
        }

        // 5. คำสั่งงบประมาณภาพรวม
        else if (upperClean === 'งบA') { action = 'budget_overview'; targetGroup = 'A'; }
        else if (upperClean === 'งบB') { action = 'budget_overview'; targetGroup = 'B'; }
        else if (upperClean === 'งบA2') { action = 'budget_overview'; targetGroup = 'A2'; }
        else if (upperClean === 'งบ' || upperClean === 'งบประมาณ') { action = 'budget_overview'; targetGroup = 'ALL'; }

        // 6. คำสั่งงบประมาณเจาะลึกรายโครงการ (เช่น !งบ 410, !งบ LA-025, /งบ LH-379, !งบ410)
        else if (upperClean.startsWith('งบ ') || upperClean.startsWith('งบ-') || upperClean.startsWith('งบประมาณ ')) {
          action = 'project_budget';
          projectQuery = cleanText.replace(/^(งบประมาณ|งบ)[ -]*/i, '').trim();
        } else if (/^งบ([A-Z0-9\-]+)$/i.test(cleanText)) {
          const param = cleanText.match(/^งบ([A-Z0-9\-]+)$/i)[1].toUpperCase();
          if (param === 'A') { action = 'budget_overview'; targetGroup = 'A'; }
          else if (param === 'B') { action = 'budget_overview'; targetGroup = 'B'; }
          else if (param === 'A2') { action = 'budget_overview'; targetGroup = 'A2'; }
          else {
            action = 'project_budget';
            projectQuery = param;
          }
        }

        if (action) {
          let responseText = '';
          const projectList = targetGroup === 'A' ? GROUP_A 
            : targetGroup === 'B' ? GROUP_B 
            : targetGroup === 'A2' ? GROUP_A2 
            : ALL_PROJECTS;
          const groupName = targetGroup === 'ALL' ? 'ทั้งหมดทุกโครงการ' : targetGroup;

          if (action === 'summary') {
            responseText = await handleSummary(projectList, groupName);
          } else if (action === 'pending_wo') {
            responseText = await handlePendingWorkOrders(projectList, groupName);
          } else if (action === 'check') {
            responseText = await handleCheck(projectList, groupName);
          } else if (action === 'budget_overview') {
            responseText = await handleBudgetOverview(targetGroup);
          } else if (action === 'project_budget') {
            responseText = await handleProjectBudget(projectQuery);
          } else if (action === 'over_budget') {
            responseText = await handleOverBudget();
          } else if (action === 'help') {
            responseText = `🤖 เมนูคำสั่ง LH TaskFlow Bot\n` +
              `─────────────────────────\n` +
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

          if (responseText) {
            await replyToLine(replyToken, responseText);
          }
        }
      }
    }

    // ตอบ 200 OK ให้ LINE ทันที
    return res.status(200).send('OK');
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
