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
const GROUP_A2 = ['LH-120', 'LH-195', 'LH-225', 'LA-025', 'LH-402'];
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
  if (status === 'ติดปัญหา/รออะไหล่') return '⚠️ ติดปัญหา/รออะไหล่';
  if (status === 'รอดำเนินการ') return '⏳ รอดำเนินการ';
  return '⚙️ กำลังดำเนินการ';
};

const fDateThai = (ds) => {
  if (!ds) return '-';
  const d = new Date(ds);
  return isNaN(d.getTime()) ? String(ds) : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
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
  const blockedCount = todaysTasks.filter(t => t.status === 'ติดปัญหา/รออะไหล่').length;
  const pendingCount = todaysTasks.filter(t => t.status === 'รอดำเนินการ').length;
  
  const prompt = `ทำหน้าที่เป็นผู้ช่วยสรุปงานประจำวัน (Daily Tasks Report)
ข้อมูล:
ทีม: กลุ่ม ${groupName} ประจำวันที่ ${fDateThai(todayStr)}
ภาพรวม: ทั้งหมด ${todaysTasks.length} งาน (จบงานแล้ว: ${doneCount}, จบงานรอใบงาน: ${waitWoCount}, กำลังดำเนินการ: ${inProgCount}, ติดปัญหา/รออะไหล่: ${blockedCount}, รอดำเนินการ: ${pendingCount})
รายการงานวันนี้:
${todaysTasks.map((t, i) => `${i+1}. โครงการ: ${t.project}, งาน: ${t.details || t.task_name || 'ไม่ระบุ'}, สถานะ: ${t.status || 'อยู่ระหว่างดำเนินการ'}${t.workOrderNo ? ' (WO: ' + t.workOrderNo + ')' : ''}`).join('\n')}

ข้อกำหนด:
1. สรุปรายงานประจำวันของวันนี้ โดยแสดงสถานะจริงของทุกงาน (ทั้งที่จบแล้ว, รอใบงาน, กำลังทำ, หรือติดปัญหา) ไม่ต้องตัดงานที่จบแล้วออก
2. สรุปแยกตามโครงการอย่างชัดเจน
3. ใช้ Emoji ประกอบให้น่าอ่าน เช่น ✅ จบงาน, 📋 จบงาน(รอใบงาน), ⚙️ กำลังดำเนินการ, ⚠️ รออะไหล่, ⏳ รอดำเนินการ
4. กระชับ ชัดเจน ไม่ต้องเกริ่นนำหรือลงท้ายยาวเกินไป
5. ลงท้ายด้วยประโยคให้กำลังใจทีมงานสั้นๆ`;

  const geminiResponse = await askGemini(prompt);
  if (geminiResponse && !geminiResponse.includes('Error')) {
    return geminiResponse;
  }
  
  // Fallback (ถ้า AI พัง หรือยังไม่ได้ใส่ Key)
  let fallbackMsg = `📋 สรุปงานประจำวัน กลุ่ม ${groupName}\n`;
  fallbackMsg += `📅 ประจำวันที่: ${fDateThai(todayStr)}\n`;
  fallbackMsg += `📊 ภาพรวม: ${todaysTasks.length} งาน (✅ จบ ${doneCount} | 📋 รอใบงาน ${waitWoCount} | ⚙️ กำลังทำ ${inProgCount} | ⚠️ รออะไหล่ ${blockedCount} | ⏳ รอดำเนินการ ${pendingCount})\n`;
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
      const woTag = t.workOrderNo ? ` [WO: ${t.workOrderNo}]` : '';
      fallbackMsg += `${idx + 1}. ${t.details?.replace(/\n/g, ' ') || 'ไม่ระบุ'} ${icon}\n   สถานะ: ${st}${woTag}\n`;
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
        const warning = daysWaiting > 3 ? ' ⚠️ เกิน 3 วัน' : '';
        msg += `${idx + 1}. ${t.details?.replace(/\n/g, ' ') || 'ไม่ระบุ'}\n   🗓️ ปิดงาน: ${fDateThai(cDate)} (⏳ รอมา ${daysWaiting} วัน${warning})\n   [ID: ${t.id}]\n`;
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
        const text = rawText.toUpperCase();
        const replyToken = event.replyToken;
        
        let targetGroup = null;
        let action = null;
        
        // 1. คำสั่ง !สรุปงาน (งานประจำวัน - เฉพาะวันนี้ ไม่สนสถานะ)
        if (text === '!สรุปงานA') { action = 'summary'; targetGroup = 'A'; }
        else if (text === '!สรุปงานB') { action = 'summary'; targetGroup = 'B'; }
        else if (text === '!สรุปงานA2') { action = 'summary'; targetGroup = 'A2'; }
        else if (text === '!สรุปงาน') { action = 'summary'; targetGroup = 'ALL'; }
        
        // 2. คำสั่งใหม่ !รอใบงาน (งานค้างสถานะจบงานรอใบงาน - คั่นด้วยเดือนและโครงการ)
        else if (text === '!รอใบงานA') { action = 'pending_wo'; targetGroup = 'A'; }
        else if (text === '!รอใบงานB') { action = 'pending_wo'; targetGroup = 'B'; }
        else if (text === '!รอใบงานA2') { action = 'pending_wo'; targetGroup = 'A2'; }
        else if (text === '!รอใบงาน') { action = 'pending_wo'; targetGroup = 'ALL'; }
        
        // 3. คำสั่ง !เช็คงาน (ดึงงานแจ้งซ่อมสาธารณูปโภคจากบอทสอดแนม)
        else if (text === '!เช็คงานA') { action = 'check'; targetGroup = 'A'; }
        else if (text === '!เช็คงานB') { action = 'check'; targetGroup = 'B'; }
        else if (text === '!เช็คงานA2') { action = 'check'; targetGroup = 'A2'; }
        else if (text === '!เช็คงาน') { action = 'check'; targetGroup = 'ALL'; }

        // 4. คำสั่งช่วยเหลือ !คำสั่ง หรือ !HELP
        else if (text === '!คำสั่ง' || text === '!HELP' || text === 'HELP' || text === 'คำสั่ง') {
          action = 'help';
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
          } else if (action === 'help') {
            responseText = `🤖 ยินดีต้อนรับสู่ LH TaskFlow Bot!\n` +
              `รายการคำสั่งที่สามารถใช้งานได้:\n\n` +
              `📋 สรุปงานประจำวัน (เฉพาะงานวันนี้):\n` +
              `• !สรุปงานA (กลุ่ม A: LH-410, LH-415, NE-419)\n` +
              `• !สรุปงานB (กลุ่ม B: LH-379, LH-392, LH-395)\n` +
              `• !สรุปงานA2 (กลุ่ม A2: LH-120, LH-195, LH-225, LA-025, LH-402)\n` +
              `• !สรุปงาน (ดูทุกกลุ่มรวมกัน)\n\n` +
              `📑 ติดตามงานค้างใบงาน (แยกตามเดือนและโครงการ):\n` +
              `• !รอใบงานA\n` +
              `• !รอใบงานB\n` +
              `• !รอใบงานA2\n` +
              `• !รอใบงาน (ดูทุกกลุ่มรวมกัน)\n\n` +
              `🔍 เช็คงานแจ้งซ่อมสาธารณูปโภค (จากบอทสอดแนม):\n` +
              `• !เช็คงานA, !เช็คงานB, !เช็คงานA2`;
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
