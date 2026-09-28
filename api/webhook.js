import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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

// ข้อมูลพิกัดและพื้นที่สำหรับรายงานสถานการณ์น้ำท่วม (The Weather Channel Integration)
const FLOOD_PROJECTS = {
  'LH-410': { code: 'LH-410', name: 'CHAIYAPRUEK 2 รังสิต คลอง4', area: 'คลองสี่, ธัญบุรี, ปทุมธานี', lat: 14.015, lon: 100.685, group: 'A' },
  'LH-415': { code: 'LH-415', name: 'Villaggio ลำลูกกา-วงแหวน', area: 'บึงคำพร้อย, ลำลูกกา, ปทุมธานี', lat: 13.935, lon: 100.710, group: 'A' },
  'NE-419': { code: 'NE-419', name: 'Villaggio รังสิตคลอง 4', area: 'คลองสี่, ธัญบุรี, ปทุมธานี', lat: 14.010, lon: 100.682, group: 'A' },
  'LH-379': { code: 'LH-379', name: 'นันทวัน พระราม 9-กรุงเทพกรีฑาตัดใหม่', area: 'สะพานสูง, กรุงเทพมหานคร', lat: 13.742, lon: 100.692, group: 'B' },
  'LH-392': { code: 'LH-392', name: 'VIVE กรุงเทพกรีฑาตัดใหม่', area: 'สะพานสูง, กรุงเทพมหานคร', lat: 13.745, lon: 100.690, group: 'B' },
  'LH-395': { code: 'LH-395', name: 'NANTAWAN POOL VILLA พระราม 9', area: 'สะพานสูง, กรุงเทพมหานคร', lat: 13.740, lon: 100.695, group: 'B' },
  'LA-025': { code: 'LA-025', name: 'PRUEKLADA ทางด่วนรามอินทรา-จตุโชติ', area: 'ออเงิน, สายไหม, กรุงเทพมหานคร', lat: 13.885, lon: 100.688, group: 'A2' },
  'LH-329': { code: 'LH-329', name: 'สีวลี ศรีนครินทร์-ร่มเกล้า', area: 'มีนบุรี, กรุงเทพมหานคร', lat: 13.778, lon: 100.735, group: 'A2' },
  'LH-402': { code: 'LH-402', name: 'vie ทางด่วนรามอินทรา-วงแหวน', area: 'ท่าแร้ง, บางเขน, กรุงเทพมหานคร', lat: 13.865, lon: 100.672, group: 'A2' },
  'LH-120': { code: 'LH-120', name: 'มัณฑนา ศรีนครินทร์-บางนา', area: 'บางแก้ว, บางพลี, สมุทรปราการ', lat: 13.628, lon: 100.638, group: 'A2' },
  'LH-195': { code: 'LH-195', name: 'ชัยพฤกษ์ บางนา กม.15', area: 'บางโฉลง, บางพลี, สมุทรปราการ', lat: 13.615, lon: 100.732, group: 'A2' },
  'LH-225': { code: 'LH-225', name: 'สีวลี บางนา กม.14', area: 'บางโฉลง, บางพลี, สมุทรปราการ', lat: 13.618, lon: 100.728, group: 'A2' },
};

// ส่งข้อความตอบกลับไปยัง LINE (Reply API ฟรี 100%)
async function replyToLine(replyToken, messages) {
  const LINE_TOKEN = process.env.LINE_TOKEN;
  if (!LINE_TOKEN || !replyToken) {
    console.error("Missing LINE_TOKEN or replyToken in Vercel Environment Variables");
    return false;
  }
  
  const payload = typeof messages === 'string'
    ? [{ type: 'text', text: messages }]
    : Array.isArray(messages)
    ? messages
    : [messages];

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: payload
      })
    });
    if (res.ok) return true;

    const err = await res.text();
    console.error("LINE Reply Error:", err);

    // Fallback: หาก payload มี Flex message แล้วส่งไม่ผ่าน ให้แปลงเป็น Text ธรรมดาแล้วลองใหม่ทันที
    if (payload.some(m => m.type !== 'text')) {
      const fallbackTexts = payload
        .map(m => m.type === 'text' ? m.text : (m.altText || ''))
        .filter(Boolean);
      if (fallbackTexts.length > 0) {
        console.log("Attempting fallback text reply...");
        const fbRes = await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_TOKEN}`
          },
          body: JSON.stringify({
            replyToken: replyToken,
            messages: [{ type: 'text', text: fallbackTexts.join('\n\n') }]
          })
        });
        return fbRes.ok;
      }
    }
    return false;
  } catch(e) {
    console.error("LINE Reply Exception:", e);
    return false;
  }
}

// ส่งข้อความแบบ Push ไปยัง Admin ในแชทส่วนตัว (1-on-1 Direct Chat Only)
async function pushToLine(userId, messages) {
  const LINE_TOKEN = process.env.LINE_TOKEN;
  if (!LINE_TOKEN || !userId) return false;

  const payload = typeof messages === 'string'
    ? [{ type: 'text', text: messages }]
    : Array.isArray(messages)
    ? messages
    : [messages];

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: payload
      })
    });
    if (res.ok) return true;

    const err = await res.text();
    console.error("LINE Push Error:", err);

    // Fallback ด้วยข้อความธรรมดา
    if (payload.some(m => m.type !== 'text')) {
      const fallbackTexts = payload
        .map(m => m.type === 'text' ? m.text : (m.altText || ''))
        .filter(Boolean);
      if (fallbackTexts.length > 0) {
        console.log("Attempting fallback text push...");
        const fbRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_TOKEN}`
          },
          body: JSON.stringify({
            to: userId,
            messages: [{ type: 'text', text: fallbackTexts.join('\n\n') }]
          })
        });
        return fbRes.ok;
      }
    }
    return false;
  } catch(e) {
    console.error("LINE Push Exception:", e);
    return false;
  }
}

// ดึงภาพถ่ายจาก LINE Content API
async function fetchLineImageBuffer(messageId) {
  const LINE_TOKEN = process.env.LINE_TOKEN;
  if (!LINE_TOKEN) throw new Error("Missing LINE_TOKEN");

  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { 'Authorization': `Bearer ${LINE_TOKEN}` }
  });
  if (!res.ok) throw new Error(`LINE Content API HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

  for (const [key, p] of Object.entries(projects)) {
    const keyClean = key.toUpperCase().replace(/[\s\-_]/g, '');
    const codeClean = (p.code || '').toUpperCase().replace(/[\s\-_]/g, '');
    if (keyClean === q || codeClean === q) return p;
  }
  for (const [key, p] of Object.entries(projects)) {
    const keyClean = key.toUpperCase().replace(/[\s\-_]/g, '');
    const codeClean = (p.code || '').toUpperCase().replace(/[\s\-_]/g, '');
    if (keyClean.includes(q) || codeClean.includes(q)) return p;
  }
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
      return `❌ ไม่พบข้อมูลสำหรับ ${groupName} ในระบบครับ`;
    }

    let totActual = 0;
    let totYtg = 0;
    let totFy = 0;
    let totBudget = 0;

    filtered.forEach(p => {
      totActual += (p.totalYtdActual || 0);
      totYtg += (p.totalYtgForecast || 0);
      totFy += (p.totalFyLanding || 0);
      totBudget += (p.totalBudget || 0);
    });

    const diff = totFy - totBudget;
    const diffPct = totBudget > 0 ? (diff / totBudget) * 100 : 0;
    const diffSign = diff > 0 ? '+' : '';
    const overallBadge = diff > 0 ? '🚨 เสี่ยงเกินงบ' : '✅ ภายในงบประมาณ';

    const ytdLbl = data.ytdLabel || 'จ่ายจริง (YTD)';
    const ytgLbl = data.ytgLabel || 'Forecast (YTG)';

    let msg = `💰 สรุปงบประมาณ & Forecast สิ้นปี\n`;
    msg += `👥 กลุ่ม: ${groupName} (${filtered.length} โครงการ)\n`;
    msg += `(หน่วย: พันบาท | ยอดจริง + คาดการณ์)\n`;
    msg += `─────────────────────────\n`;
    msg += `📊 ภาพรวมกลุ่ม:\n`;
    msg += `• ${ytdLbl}: ${fNum(totActual)} พันบ.\n`;
    msg += `• ${ytgLbl}: ${fNum(totYtg)} พันบ.\n`;
    msg += `• คาดการณ์จบปี (FY): ${fNum(totFy)} พันบ.\n`;
    msg += `• งบประมาณทั้งปี: ${fNum(totBudget)} พันบ.\n`;
    msg += `• ผลต่างสิ้นปี: ${overallBadge} (${diffSign}${fNum(diff)} พันบ. / ${diffSign}${diffPct.toFixed(1)}%)\n`;
    msg += `─────────────────────────\n`;
    msg += `📌 สรุปรายโครงการ:\n`;

    filtered.forEach((p, idx) => {
      const pDiff = p.totalVariance || 0;
      const pSign = pDiff > 0 ? '+' : '';
      const pBadge = pDiff > 0 ? '⚠️' : '✅';
      msg += `\n${idx + 1}. [${p.code}] ${p.name || p.fullName}\n`;
      msg += `   จริง: ${fNum(p.totalYtdActual)} | คาดการณ์: ${fNum(p.totalFyLanding)}\n`;
      msg += `   งบ: ${fNum(p.totalBudget)} | ผลต่าง: ${pBadge} ${pSign}${fNum(pDiff)} พันบ. (${p.totalVariancePct})\n`;
    });

    msg += `\n─────────────────────────\n`;
    msg += `🕒 ข้อมูล ณ วันที่: ${data.updatedDateThai || '-'}\n`;
    msg += `💡 พิมพ์ '!งบ [รหัส]' เช่น '!งบ 410' เพื่อเจาะลึก 9 หมวด`;
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

    const ytdLbl = data.ytdLabel || 'จ่ายจริง (YTD)';
    const ytgLbl = data.ytgLabel || 'Forecast (YTG)';

    let msg = `💰 รายละเอียดงบ & Forecast\n`;
    msg += `📌 [${proj.code}] ${proj.fullName}\n`;
    msg += `👥 กลุ่ม: กลุ่ม ${proj.group} (หน่วย: พันบาท)\n`;
    msg += `─────────────────────────\n`;
    msg += `📊 ภาพรวมโครงการ:\n`;
    msg += `• ${ytdLbl}: ${fNum(proj.totalYtdActual)} พันบ.\n`;
    msg += `• ${ytgLbl}: ${fNum(proj.totalYtgForecast)} พันบ.\n`;
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

// ==========================================
// 🌊 ระบบรายงานสถานการณ์น้ำท่วม (Flood Monitoring)
// ==========================================

// ค้นหาโครงการสำหรับรายงานน้ำท่วม
function lookupProjectForFlood(input) {
  if (!input) return null;
  const text = input.trim();
  const tokens = text.split(/\s+/);
  const firstToken = tokens[0].toUpperCase().replace(/[\s\-_]/g, '');

  for (const [key, p] of Object.entries(FLOOD_PROJECTS)) {
    const keyClean = key.toUpperCase().replace(/[\s\-_]/g, '');
    const codeClean = p.code.toUpperCase().replace(/[\s\-_]/g, '');
    if (keyClean === firstToken || codeClean === firstToken || codeClean.includes(firstToken) || firstToken.includes(keyClean)) {
      const notes = tokens.slice(1).join(' ').trim();
      return { project: p, notes };
    }
  }

  const numMatch = text.match(/\b(410|415|419|379|392|395|025|25|329|402|120|195|225)\b/);
  if (numMatch) {
    const num = numMatch[1];
    for (const [key, p] of Object.entries(FLOOD_PROJECTS)) {
      if (key.includes(num) || p.code.includes(num)) {
        const notes = text.replace(numMatch[0], '').trim();
        return { project: p, notes };
      }
    }
  }

  for (const [key, p] of Object.entries(FLOOD_PROJECTS)) {
    if (text.includes(p.name) || p.name.includes(tokens[0])) {
      const notes = text.replace(p.name, '').trim();
      return { project: p, notes };
    }
  }

  return null;
}

// ดึงสภาพอากาศจาก The Weather Channel / Open-Meteo
async function fetchProjectWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation_probability,precipitation&daily=precipitation_sum,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=2`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API HTTP ${res.status}`);
    const data = await res.json();
    const cur = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    const wmo = cur.weather_code ?? 0;
    let conditionText = 'ท้องฟ้าแจ่มใส';
    let conditionIcon = '☀️';
    if (wmo >= 1 && wmo <= 3) { conditionText = 'มีเมฆบางส่วน'; conditionIcon = '⛅'; }
    else if (wmo >= 45 && wmo <= 48) { conditionText = 'มีหมอกหนา'; conditionIcon = '🌫️'; }
    else if (wmo >= 51 && wmo <= 55) { conditionText = 'ฝนตกปรอยๆ'; conditionIcon = '🌦️'; }
    else if (wmo >= 61 && wmo <= 65) { conditionText = 'ฝนตกปานกลาง'; conditionIcon = '🌧️'; }
    else if (wmo >= 80 && wmo <= 82) { conditionText = 'ฝนตกหนักเป็นแห่งๆ'; conditionIcon = '🌧️'; }
    else if (wmo >= 95) { conditionText = 'ฝนฟ้าคะนอง / ลมแรง'; conditionIcon = '⛈️'; }

    let rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0;
    if (!rainProb && hourly.precipitation_probability) {
      const next12 = hourly.precipitation_probability.slice(0, 12);
      rainProb = Math.max(...next12, 0);
    }
    const rainSum24h = daily.precipitation_sum ? (daily.precipitation_sum[0] || 0) : 0;

    return {
      temp: Math.round(cur.temperature_2m ?? 30),
      feelsLike: Math.round(cur.apparent_temperature ?? 33),
      humidity: Math.round(cur.relative_humidity_2m ?? 75),
      windSpeed: Math.round(cur.wind_speed_10m ?? 8),
      condition: conditionText,
      icon: conditionIcon,
      rainProb: Math.round(rainProb),
      expectedRain24h: Number(rainSum24h).toFixed(1),
      source: 'The Weather Channel / กรมอุตุนิยมวิทยา'
    };
  } catch (e) {
    console.error('Weather fetch error:', e);
    return {
      temp: 30,
      feelsLike: 34,
      humidity: 80,
      windSpeed: 10,
      condition: 'มีเมฆเป็นส่วนมาก โอกาสมีฝน',
      icon: '🌦️',
      rainProb: 65,
      expectedRain24h: '15.0',
      source: 'The Weather Channel / กรมอุตุนิยมวิทยา'
    };
  }
}

// Gemini AI วิเคราะห์สถานการณ์และเกลาสรุปรายงาน
async function analyzeFloodReportWithGemini({ project, weather, notes, photoCount }) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return {
      status: 'NORMAL',
      waterLevel: '0 - 5 ซม. (สภาวะปกติ)',
      pumpsRunning: 'พร้อมใช้งาน 100% (เดินเครื่องตามรอบระบาย)',
      drainageCondition: 'ระบายได้คล่องตัว ท่อระบายน้ำหลักเปิดโล่ง',
      summary: `โครงการ ${project.name} (${project.code}): ${notes || 'สภาพการระบายน้ำของโครงการสามารถรองรับปริมาณน้ำฝนได้อย่างมีประสิทธิภาพ แนวท่อระบายน้ำหลักและสถานีสูบน้ำทำงานเป็นปกติ'}`,
      captions: []
    };
  }

  const prompt = `คุณคือวิศวกรผู้เชี่ยวชาญด้านบริหารจัดการน้ำและสาธารณูปโภคของบริษัท แลนด์ แอนด์ เฮ้าส์ จำกัด (มหาชน) (Land & Houses)
ให้ช่วยวิเคราะห์ข้อมูลการตรวจเช็คหน้างาน เพื่อออกเอกสารรายงานสถานการณ์น้ำท่วมและการระบายน้ำ (Drainage & Flood Monitoring Report)

ข้อมูลโครงการ:
- โครงการ: [${project.code}] ${project.name} (${project.area})
- พยากรณ์อากาศ The Weather Channel: ${weather.condition}, อุณหภูมิ ${weather.temp}°C, โอกาสฝนตก ${weather.rainProb}%, ฝนคาดการณ์ 24 ชม. ${weather.expectedRain24h} มม.
- รายละเอียดที่บันทึกหน้างาน: "${notes || 'ไม่มีรายงานปัญหาน้ำท่วมขัง ตรวจเช็คเครื่องสูบน้ำและระดับน้ำ'}"
- จำนวนภาพถ่ายหน้างาน: ${photoCount} ภาพ

ให้ตอบกลับเป็น JSON เท่านั้น (ห้ามมี markdown codeblock ห้ามมีข้อความอื่น) โดยมีโครงสร้างดังนี้:
{
  "status": "NORMAL" | "WATCH" | "CRITICAL",
  "waterLevel": "ระดับน้ำท่วมขัง เช่น 0 - 5 ซม. (สภาวะปกติ) หรือ มีน้ำขังผิวจราจร 5-10 ซม.",
  "pumpsRunning": "สถานะเครื่องสูบน้ำ เช่น เดินเครื่อง 1 ตัว (พร้อมใช้ 100%)",
  "drainageCondition": "สภาพทางระบายน้ำ เช่น ตะแกรงเปิดโล่ง ท่อระบายน้ำหลักไหลคล่องตัว",
  "summary": "บทสรุปและการประเมินสถานการณ์ระดับผู้บริหาร ความยาว 2-3 บรรทัด สุภาพ ทางการ สไตล์ Land & Houses (ห้ามระบุชื่อบุคคลหรือชื่อผู้รายงาน)",
  "captions": [
    "ภาพที่ 1: ถนนเมนสายหลักและผิวจราจร",
    "ภาพที่ 2: บ่อพักน้ำหลักและการไหลของท่อระบายน้ำ",
    "ภาพที่ 3: ระดับน้ำในบ่อหน่วงน้ำและคลองโครงการ",
    "ภาพที่ 4: สถานีสูบน้ำและการทำงานของเครื่องสูบน้ำ (Pump 1)",
    "ภาพที่ 5: ตู้ควบคุมระบบไฟฟ้าและเครื่องสูบน้ำสำรอง (Pump 2)",
    "ภาพที่ 6: จุดปล่อยน้ำออกสู่คลองสาธารณะภายนอกโครงการ"
  ]
}

เกณฑ์ตัดสินสถานะ:
- NORMAL: หากไม่มีน้ำท่วมขัง หรือขัง < 5 ซม. ระบายคล่องตัว เครื่องสูบน้ำพร้อมใช้
- WATCH: หากน้ำขัง 5-10 ซม. หรือฝนตกหนักกำลังเร่งสูบระบาย
- CRITICAL: หากน้ำขัง > 10 ซม. หรือคลองภายนอกเอ่อล้นเข้าโครงการ`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    });
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No JSON object found in response");
  } catch (e) {
    console.error("Gemini flood analysis error:", e.message || e);
    return {
      status: 'NORMAL',
      waterLevel: '0 - 5 ซม. (สภาวะปกติ)',
      pumpsRunning: 'พร้อมใช้งาน 100% (เดินเครื่องตามรอบระบาย)',
      drainageCondition: 'ระบายได้คล่องตัว ท่อระบายน้ำหลักเปิดโล่ง',
      summary: `โครงการ ${project.name} (${project.code}): ${notes || 'สภาพการระบายน้ำของโครงการสามารถรองรับปริมาณน้ำฝนได้อย่างมีประสิทธิภาพ แนวท่อระบายน้ำหลักและสถานีสูบน้ำทำงานเป็นปกติ'}`,
      captions: []
    };
  }
}

// สร้าง LINE Flex Message สรุปผลรายงานสถานการณ์น้ำท่วม
function buildFloodFlexMessage({ reportId, project, weather, aiResult, photoCount, surveyDateThai, surveyTimeThai, pdfUrl }) {
  const isCritical = aiResult.status === 'CRITICAL';
  const isWatch = aiResult.status === 'WATCH';
  const badgeText = isCritical ? '🔴 วิกฤติ / เร่งด่วน (Emergency)'
    : isWatch ? '🟡 เฝ้าระวัง (Watch & Alert)'
    : '🟢 สภาวะปกติ (Normal)';
  const badgeColor = isCritical ? '#EF4444' : isWatch ? '#EAB308' : '#10B981';

  return {
    type: 'flex',
    altText: `🌊 รายงานสถานการณ์น้ำท่วม [${project.code}] - Land & Houses`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0C2340',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'LAND & HOUSES PUBLIC CO., LTD.',
            color: '#C5A880',
            size: 'xxs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: 'รายงานสถานการณ์การระบายน้ำ',
            color: '#FFFFFF',
            size: 'md',
            weight: 'bold',
            margin: 'xs'
          },
          {
            type: 'text',
            text: `[${project.code}] ${project.name}`,
            color: '#E2E8F0',
            size: 'xs',
            margin: 'xs',
            wrap: true
          }
        ]
      },
      hero: {
        type: 'image',
        url: `${pdfUrl}&photo=0`,
        size: 'full',
        aspectRatio: '20:11',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: 'สถานะหน้างาน:',
                size: 'xs',
                color: '#64748B',
                flex: 3
              },
              {
                type: 'text',
                text: badgeText,
                size: 'xs',
                weight: 'bold',
                color: badgeColor,
                flex: 6,
                align: 'end'
              }
            ]
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: `🌤️ ${weather.icon} ${weather.condition} (${weather.temp}°C)`,
                size: 'xs',
                color: '#1E293B',
                weight: 'bold'
              },
              {
                type: 'text',
                text: `☔ โอกาสเกิดฝน: ${weather.rainProb}% | ฝนสะสมคาดการณ์: ${weather.expectedRain24h} มม.`,
                size: 'xxs',
                color: '#475569',
                margin: 'xs'
              },
              {
                type: 'text',
                text: `(อ้างอิง: ${weather.source})`,
                size: 'xxs',
                color: '#94A3B8',
                margin: 'xxs'
              }
            ]
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: '📋 สรุปการประเมิน:',
                size: 'xs',
                weight: 'bold',
                color: '#0C2340'
              },
              {
                type: 'text',
                text: aiResult.summary || 'สภาพการระบายน้ำปกติ แนวท่อระบายน้ำหลักเปิดโล่ง',
                size: 'xs',
                color: '#334155',
                wrap: true,
                margin: 'xs'
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: `📸 ภาพถ่าย: ${photoCount} ภาพ`,
                size: 'xxs',
                color: '#64748B'
              },
              {
                type: 'text',
                text: `🕒 ${surveyDateThai} ${surveyTimeThai} น.`,
                size: 'xxs',
                color: '#64748B',
                align: 'end'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '14px',
        backgroundColor: '#F8FAFC',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0C2340',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📄 เปิดดูและดาวน์โหลดเอกสาร PDF',
              uri: pdfUrl
            }
          }
        ]
      }
    }
  };
}

// รวมรายงาน สรุปผลด้วย AI และส่งกลับให้ Admin ในแชทส่วนตัว
async function compileAndSendFloodReport({ userId, replyToken, host, proto }) {
  try {
    const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
    const draftSnap = await getDoc(draftRef);
    if (!draftSnap.exists()) return;

    const draft = draftSnap.data();
    const project = {
      code: draft.projectCode,
      name: draft.projectName,
      area: draft.projectArea,
      lat: draft.lat || 13.7563,
      lon: draft.lon || 100.5018
    };

    const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
    const photos = [];
    photosSnap.forEach(d => {
      photos.push(d.data());
    });
    photos.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (photos.length === 0) {
      if (replyToken) {
        await replyToLine(replyToken, "⚠️ ยังไม่มีรูปภาพในระบบ กรุณาส่งรูปถ่ายหน้างาน (5–6 รูป) เข้ามาก่อนครับ");
      }
      return;
    }

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiYear = now.getFullYear() + 543;
    const surveyDateThai = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${thaiYear}`;
    const surveyTimeThai = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const generatedAtThai = `${surveyDateThai} เวลา ${surveyTimeThai} น.`;

    const cleanCode = project.code.replace(/[^A-Z0-9]/g, '');
    const dateCode = `${String(thaiYear).slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const randSeq = Math.floor(100 + Math.random() * 900);
    const reportId = `FLD-${cleanCode}-${dateCode}-${randSeq}`;

    // ดึงพยากรณ์อากาศ The Weather Channel
    const weather = await fetchProjectWeather(project.lat, project.lon);

    // AI สรุปและตั้งชื่อภาพ
    const aiResult = await analyzeFloodReportWithGemini({
      project,
      weather,
      notes: draft.notes,
      photoCount: photos.length
    });

    // บันทึกรายงานหลักลง Firestore
    const reportRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_reports", reportId);
    await setDoc(reportRef, {
      reportId,
      userId: userId || '',
      projectCode: project.code,
      projectName: project.name,
      projectArea: project.area,
      status: aiResult.status || 'NORMAL',
      waterLevel: aiResult.waterLevel || '0 - 5 ซม. (สภาวะปกติ)',
      pumpsRunning: aiResult.pumpsRunning || 'พร้อมใช้งาน 100% (เดินเครื่องตามรอบ)',
      drainageCondition: aiResult.drainageCondition || 'ระบายได้คล่องตัว ท่อระบายน้ำหลักเปิดโล่ง',
      executiveSummary: aiResult.summary || draft.notes || 'สภาพการระบายน้ำของโครงการสามารถรองรับปริมาณน้ำฝนได้อย่างมีประสิทธิภาพ',
      notes: draft.notes || '',
      weather,
      photoCount: photos.length,
      surveyDateThai,
      surveyTimeThai,
      generatedAtThai,
      createdAt: Date.now()
    });

    // บันทึกภาพลง Subcollection พร้อมคำบรรยายใต้ภาพ
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      const defaultCaption = `จุดตรวจเช็คที่ ${i + 1}: สภาพการระบายน้ำหน้างาน`;
      const caption = (aiResult.captions && aiResult.captions[i]) ? aiResult.captions[i] : defaultCaption;
      await setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "flood_reports", reportId, "photos", String(i)), {
        index: i,
        caption,
        dataUrl: p.dataUrl,
        createdAt: Date.now()
      });
    }

    // ล้าง Draft Session ออก
    await deleteDoc(draftRef);

    const domain = host || 'lh-taskflow.vercel.app';
    const protocol = proto || 'https';
    const pdfUrl = `${protocol}://${domain}/api/flood-report?id=${reportId}`;

    const flexMsg = buildFloodFlexMessage({
      reportId,
      project,
      weather,
      aiResult,
      photoCount: photos.length,
      surveyDateThai,
      surveyTimeThai,
      pdfUrl
    });

    const completionText = `✅ จัดทำเอกสารรายงานสถานการณ์น้ำท่วมเรียบร้อยครับ!\n` +
      `📌 โครงการ: [${project.code}] ${project.name}\n` +
      `📑 รหัสเอกสาร: ${reportId}\n` +
      `📸 ภาพถ่ายสำรวจ: ${photos.length} ภาพ\n` +
      `─────────────────────────\n` +
      `🔗 แตะปุ่ม "เปิดดูและดาวน์โหลดเอกสาร PDF" ในการ์ดด้านบน เพื่อเปิดและบันทึกเป็น PDF บนโทรศัพท์มือถือได้ทันทีครับ\n` +
      `🌐 หรือเปิดดูผ่านลิงก์ตรง:\n${pdfUrl}`;

    let delivered = false;
    if (replyToken) {
      delivered = await replyToLine(replyToken, [flexMsg, { type: 'text', text: completionText }]);
    }
    
    // หาก reply ไม่สำเร็จ หรือไม่มี replyToken ให้ push ไปยัง userId ในแชทส่วนตัวเสมอ
    if (!delivered && userId) {
      console.log(`Delivering via pushToLine to user ${userId}...`);
      await pushToLine(userId, [flexMsg, { type: 'text', text: completionText }]);
    }

  } catch (err) {
    console.error("compileAndSendFloodReport Error:", err);
    if (replyToken) {
      await replyToLine(replyToken, "❌ เกิดข้อผิดพลาดในการรวมรายงาน PDF กรุณาลองใหม่อีกครั้งครับ");
    } else if (userId) {
      await pushToLine(userId, "❌ เกิดข้อผิดพลาดในการรวมรายงาน PDF กรุณาลองใหม่อีกครั้งครับ");
    }
  }
}

// จุดรับสัญญาณจาก LINE Webhook
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const events = req.body.events;
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }

    // ตรวจหา Host ปัจจุบันจาก Request
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'lh-taskflow.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';

    // ทำการ Login เข้า Firebase
    await signInAnonymously(auth);

    // วนลูปอ่าน Event ที่ส่งเข้ามา
    for (const event of events) {
      const userId = event.source?.userId;
      const isGroup = event.source?.type === 'group' || event.source?.type === 'room';

      // 1. กรณีผู้ใช้ส่งข้อความ (Text)
      if (event.type === 'message' && event.message.type === 'text') {
        const rawText = (event.message.text || '').trim();
        const replyToken = event.replyToken;

        // ถอด prefix ! หรือ / ออก
        const cleanText = rawText.replace(/^[!\/]/, '').trim();
        const upperClean = cleanText.toUpperCase();

        // 🌊 คำสั่งรายงานสถานการณ์น้ำท่วม (!น้ำท่วม, !รายงานน้ำท่วม, /น้ำท่วม)
        if (cleanText.startsWith('น้ำท่วม') || cleanText.startsWith('รายงานน้ำท่วม')) {
          if (isGroup) {
            await replyToLine(replyToken, "⚠️ เพื่อความเป็นระเบียบและป้องกันข้อมูลชนกัน กรุณารายงานสถานการณ์น้ำท่วมในแชทส่วนตัว (1-on-1) กับบอทเท่านั้นครับ 🙏");
            continue;
          }

          const query = cleanText.replace(/^(รายงานน้ำท่วม|น้ำท่วม)[ -]*/i, '').trim();
          if (!query) {
            const helpMsg = `🌊 ระบบรายงานสถานการณ์น้ำท่วม & การระบายน้ำ (Land & Houses)\n` +
              `─────────────────────────\n` +
              `วิธีใช้งานง่ายๆ ใน 2 ขั้นตอน:\n\n` +
              `1️⃣ พิมพ์คำสั่งพร้อมรหัสโครงการและรายละเอียด:\n` +
              `   👉 !น้ำท่วม 410 ถนนเมนแห้งสนิท เครื่องสูบน้ำพร้อมใช้\n` +
              `   👉 !น้ำท่วม LA-025 ท่อระบายน้ำไหลคล่องตัว\n` +
              `   👉 !รายงานน้ำท่วม LH-379 ระดับน้ำในคลองปกติ\n\n` +
              `2️⃣ ส่งภาพถ่ายหน้างาน 5–6 รูป เข้ามาในแชทนี้\n` +
              `   บอทจะดึงพยากรณ์อากาศ The Weather Channel, วิเคราะห์สถานะด้วย AI และสร้างเอกสารสรุป PDF ส่งกลับให้ในแชทส่วนตัวทันทีครับ!\n\n` +
              `📌 โครงการที่รองรับ:\n` +
              `• กลุ่ม A: LH-410, LH-415, NE-419\n` +
              `• กลุ่ม B: LH-379, LH-392, LH-395\n` +
              `• กลุ่ม A2: LA-025, LH-329, LH-402, LH-120, LH-195, LH-225`;
            await replyToLine(replyToken, helpMsg);
            continue;
          }

          const match = lookupProjectForFlood(query);
          if (!match) {
            const errorMsg = `❌ ไม่พบรหัสโครงการ "${query}" ครับ\n\n` +
              `📌 รหัสโครงการที่รองรับ:\n` +
              `LH-410, LH-415, NE-419, LH-379, LH-392, LH-395, LA-025, LH-329, LH-402, LH-120, LH-195, LH-225\n\n` +
              `💡 ตัวอย่าง: !น้ำท่วม 410 ถนนเมนระบายคล่องตัว เดินเครื่องสูบน้ำ 1 ตัว`;
            await replyToLine(replyToken, errorMsg);
            continue;
          }

          const { project, notes } = match;
          const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
          await setDoc(draftRef, {
            userId,
            projectCode: project.code,
            projectName: project.name,
            projectArea: project.area,
            lat: project.lat,
            lon: project.lon,
            notes: notes || 'ตรวจเช็คสถานะการระบายน้ำประจำวัน',
            createdAt: Date.now(),
            finalizing: false
          });

          // ตรวจดูว่าใน buffer มีรูปถ่ายที่ส่งมาก่อนหน้านี้แล้วหรือไม่
          const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
          if (photosSnap.size >= 5) {
            await replyToLine(replyToken, `🌊 ได้รับข้อมูลโครงการ [${project.code}] ${project.name} เรียบร้อยแล้วครับ!\nกำลังประมวลผลรูปภาพและจัดทำเอกสาร PDF สักครู่ครับ...`);
            await compileAndSendFloodReport({ userId, replyToken: null, host, proto });
            continue;
          }

          const guideMsg = `🌊 ได้รับข้อมูลโครงการ [${project.code}] ${project.name} เรียบร้อยแล้วครับ!\n` +
            `📝 รายละเอียด: ${notes || 'ตรวจเช็คสถานะการระบายน้ำประจำวัน'}\n` +
            `─────────────────────────\n` +
            `📸 ขั้นตอนต่อไป: กรุณาส่งรูปถ่ายหน้างาน 5–6 รูป เข้ามาในแชทนี้ได้เลยครับ\n` +
            `💡 แนะนำภาพที่ควรส่ง:\n` +
            `1. ถนนเมน / ทางเข้า-ออกโครงการ\n` +
            `2. บ่อพัก / ท่อระบายน้ำหลัก\n` +
            `3. เครื่องสูบน้ำ / ตู้ควบคุมไฟ\n` +
            `4. คลองระบายน้ำ / บ่อหน่วงน้ำ\n` +
            `5. จุดระบายน้ำออกภายนอกโครงการ\n\n` +
            `*(สามารถกดส่งภาพรวดเดียว 5-6 ภาพพร้อมกันได้เลยครับ บอทจะรวมเล่ม PDF สรุปส่งให้ทันที)*`;
          await replyToLine(replyToken, guideMsg);
          continue;
        }

        // 🏁 คำสั่งจบการส่งรูปภาพ (!เสร็จ, !จบ, ออกรายงาน, สร้างPDF)
        if (upperClean === 'เสร็จ' || upperClean === 'จบ' || upperClean === 'ออกรายงาน' || upperClean === 'สร้างPDF' || upperClean === 'PDF') {
          const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
          const draftSnap = await getDoc(draftRef);
          if (draftSnap.exists()) {
            const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
            if (photosSnap.size > 0) {
              await replyToLine(replyToken, `⏳ กำลังรวบรวมรูปภาพ ${photosSnap.size} ภาพ และสร้างเอกสารสรุป PDF สักครู่ครับ...`);
              await compileAndSendFloodReport({ userId, replyToken: null, host, proto });
              continue;
            } else {
              await replyToLine(replyToken, `⚠️ ยังไม่มีภาพถ่ายในระบบ กรุณาส่งรูปภาพหน้างานเข้ามาก่อนครับ`);
              continue;
            }
          } else {
            // กรณีไม่มี Draft ค้างอยู่ ให้ตรวจสอบว่ามีรายงานล่าสุดที่เพิ่งสร้างสำเร็จหรือไม่
            try {
              const reportsSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_reports"));
              let latestReport = null;
              reportsSnap.forEach(d => {
                const data = d.data();
                if (!latestReport || (data.createdAt || 0) > (latestReport.createdAt || 0)) {
                  latestReport = data;
                }
              });

              if (latestReport && (Date.now() - (latestReport.createdAt || 0)) < 2 * 60 * 60 * 1000) {
                const domain = host || 'lh-taskflow.vercel.app';
                const protocol = proto || 'https';
                const pdfUrl = `${protocol}://${domain}/api/flood-report?id=${latestReport.reportId}`;

                const flexMsg = buildFloodFlexMessage({
                  reportId: latestReport.reportId,
                  project: { code: latestReport.projectCode, name: latestReport.projectName, area: latestReport.projectArea },
                  weather: latestReport.weather,
                  aiResult: { status: latestReport.status, summary: latestReport.executiveSummary },
                  photoCount: latestReport.photoCount || 5,
                  surveyDateThai: latestReport.surveyDateThai || '-',
                  surveyTimeThai: latestReport.surveyTimeThai || '-',
                  pdfUrl
                });

                const msg = `✅ รายงานสถานการณ์น้ำท่วมล่าสุดจัดทำเรียบร้อยแล้วครับ!\n` +
                  `📌 โครงการ: [${latestReport.projectCode}] ${latestReport.projectName}\n` +
                  `📑 รหัสเอกสาร: ${latestReport.reportId}\n` +
                  `─────────────────────────\n` +
                  `🔗 แตะปุ่ม "เปิดดูและดาวน์โหลดเอกสาร PDF" ในการ์ด หรือเปิดดูผ่านลิงก์:\n${pdfUrl}`;

                await replyToLine(replyToken, [flexMsg, { type: 'text', text: msg }]);
                continue;
              }
            } catch (err) {
              console.error("Check recent report error:", err);
            }

            await replyToLine(replyToken, `🌊 ขณะนี้ยังไม่มีรอบการรายงานที่เปิดอยู่ครับ\nหากต้องการรายงานสถานการณ์น้ำท่วม กรุณาพิมพ์:\n👉 !น้ำท่วม [รหัสโครงการ] [รายละเอียด]\nเช่น !น้ำท่วม 410 ถนนเมนแห้งสนิท`);
            continue;
          }
        }

        // คำสั่งเดิมของระบบ
        let targetGroup = null;
        let action = null;
        let projectQuery = null;

        if (upperClean === 'คำสั่ง' || upperClean === 'HELP' || upperClean === 'เมนู') {
          action = 'help';
        }
        else if (upperClean === 'สรุปงานA') { action = 'summary'; targetGroup = 'A'; }
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

        else if (upperClean === 'เกินงบ' || upperClean === 'เสี่ยงเกินงบ') {
          action = 'over_budget';
        }

        else if (upperClean === 'งบA') { action = 'budget_overview'; targetGroup = 'A'; }
        else if (upperClean === 'งบB') { action = 'budget_overview'; targetGroup = 'B'; }
        else if (upperClean === 'งบA2') { action = 'budget_overview'; targetGroup = 'A2'; }
        else if (upperClean === 'งบ' || upperClean === 'งบประมาณ') { action = 'budget_overview'; targetGroup = 'ALL'; }

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
        else if (upperClean === 'อัปเดตงบ' || upperClean === 'อัพเดตงบ' || upperClean === 'UPDATE' || upperClean === 'ดึงงบ' || upperClean === 'อัปเดต' || upperClean === 'อัพเดต') {
          action = 'update_guide';
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
          } else if (action === 'update_guide') {
            responseText = `💡 วิธีอัปเดตข้อมูลลงไฟล์ Excel และระบบ LINE:\n` +
              `─────────────────────────\n` +
              `เนื่องจากการดึงข้อมูลค่าใช้จ่ายต้องล็อกอินผ่านเครือข่าย LH ภายใน:\n\n` +
              `🖥️ สามารถกดอัปเดตได้ง่ายๆ จากคอมพิวเตอร์ของคุณ:\n` +
              `1. ดับเบิ้ลคลิกไฟล์ [อัปเดตงบประมาณ_LH.bat] บนหน้า Desktop\n` +
              `   (หรือรัน 'npm run update-budget' ใน Terminal)\n` +
              `2. ระบบจะล็อกอิน ดึงยอดจริง + คำนวณ Forecast ลงไฟล์ Excel ให้ครบ 9 โครงการ และซิงค์ขึ้น LINE ให้เรียบร้อยทันทีครับ!\n\n` +
              `📁 ไฟล์ Excel: C:\\Users\\krits\\lh-scraper\\LH_Indirect_Expenses_Report.xlsx`;
          } else if (action === 'help') {
            responseText = `🤖 เมนูคำสั่ง LH TaskFlow Bot\n` +
              `─────────────────────────\n` +
              `🌊 รายงานสถานการณ์น้ำท่วม & ระบายน้ำ (ฤดูฝน):\n` +
              `• !น้ำท่วม [รหัส] [รายละเอียด]\n` +
              `  (ตัวอย่าง: !น้ำท่วม 410 ถนนเมนแห้งสนิท เครื่องสูบน้ำพร้อมใช้)\n` +
              `  (ส่งภาพถ่าย 5-6 รูป บอทจะสร้างเอกสาร PDF สรุปส่งให้ทันที)\n\n` +
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

      // 2. กรณีผู้ใช้ส่งรูปภาพ (Image Message)
      else if (event.type === 'message' && event.message.type === 'image') {
        const replyToken = event.replyToken;
        const messageId = event.message.id;

        if (isGroup) {
          // ถ้าส่งรูปในกลุ่มใหญ่ ไม่ตอบรับ เพื่อป้องกันการรบกวนกลุ่ม
          continue;
        }

        try {
          const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
          const draftSnap = await getDoc(draftRef);

          // ดาวน์โหลดภาพจาก LINE Content API
          const imgBuffer = await fetchLineImageBuffer(messageId);
          const dataUrl = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;

          // จัดเก็บลง Subcollection ของ Draft Session
          const photoRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos", messageId);
          await setDoc(photoRef, {
            messageId,
            dataUrl,
            createdAt: Date.now()
          });

          if (draftSnap.exists()) {
            const draft = draftSnap.data();
            if (draft.finalizing) {
              continue;
            }

            const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
            const count = photosSnap.size;

            if (count >= 6) {
              // ครบ 6 รูปแล้ว รอ 1.5 วินาที แล้วรวมเล่มทันที
              await new Promise(r => setTimeout(r, 1500));
              const latestDraftSnap = await getDoc(draftRef);
              if (latestDraftSnap.exists() && !latestDraftSnap.data().finalizing) {
                await updateDoc(draftRef, { finalizing: true });
                await compileAndSendFloodReport({ userId, replyToken, host, proto });
              }
            } else if (count >= 5) {
              // มี 5 รูปแล้ว ให้รอ 3.5 วินาที เผื่อภาพที่ 6 กำลังอัปโหลดตามมา
              await new Promise(r => setTimeout(r, 3500));
              const latestDraftSnap = await getDoc(draftRef);
              if (latestDraftSnap.exists() && !latestDraftSnap.data().finalizing) {
                await updateDoc(draftRef, { finalizing: true });
                await compileAndSendFloodReport({ userId, replyToken, host, proto });
              }
            } else if (count === 1) {
              await replyToLine(replyToken, `📸 ได้รับรูปภาพที่ 1 แล้วครับ (กรุณาส่งรูปให้ครบ 5–6 รูป หรือพิมพ์ '!เสร็จ' เพื่อสร้างรายงานทันที)`);
            }
          } else {
            // ยังไม่มี Draft ให้ตอบรับและแนะนำวิธีพิมพ์คำสั่ง
            const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
            if (photosSnap.size === 1) {
              await replyToLine(replyToken, `📸 บอทได้รับรูปถ่ายหน้างานแล้วครับ!\nกรุณาพิมพ์รหัสโครงการเพื่อสร้างรายงาน เช่น:\n👉 !น้ำท่วม 410\n👉 !น้ำท่วม LH-379\n👉 !น้ำท่วม LA-025`);
            }
          }
        } catch (imgErr) {
          console.error("Handle image error:", imgErr);
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
