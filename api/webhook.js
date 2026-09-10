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

// ฟังก์ชันสำหรับคำสั่ง !สรุปงาน (สรุปจาก Tasks)
async function handleSummary(projectList, groupName) {
  const snap = await getDocs(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'Tasks'));
  let allTasks = [];
  snap.forEach(doc => allTasks.push(doc.data()));
  
  const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Bangkok'}));
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  
  // กรองเฉพาะงานที่อยู่ระหว่างดำเนินการ และ จบงาน(รอใบงาน) เท่านั้น (ตัด "จบงาน" ทุกรูปแบบ และ "ยกเลิก" ออก 100%)
  const todaysTasks = allTasks.filter(t => {
    const status = (t.status || '').trim();

    // 1. ตัดงานที่ยกเลิก และงานที่จบงานแล้วออก 100%
    if (status === 'ยกเลิก' || status === 'จบงาน' || (status.startsWith('จบงาน') && !status.includes('รอใบงาน'))) {
      return false;
    }

    // 2. งานจบงาน(รอใบงาน) - แสดงเฉพาะที่ยังไม่ได้ส่งเบิก
    if (status === 'จบงาน(รอใบงาน)' || (status.includes('จบงาน') && status.includes('รอใบงาน'))) {
      if (t.billingStatus === 'ส่งเบิกแล้ว') return false;
      return true;
    }

    // 3. งานกำลังดำเนินการ / อยู่ระหว่างดำเนินการ / รอดำเนินการ / ติดปัญหา/รออะไหล่
    if (
      status === 'อยู่ระหว่างดำเนินการ' ||
      status === 'กำลังดำเนินการ' ||
      status === 'รอดำเนินการ' ||
      status === 'ติดปัญหา/รออะไหล่' ||
      status.includes('ดำเนินการ') ||
      status.includes('รออะไหล่')
    ) {
      return true;
    }

    // สถานะอื่นๆ ทั้งหมด ปฏิเสธทั้งหมด
    return false;
  });
  
  const groupTasks = todaysTasks.filter(t => projectList.some(p => t.project?.includes(p)));
  
  if (groupTasks.length === 0) {
    return `ไม่มีภารกิจค้างอยู่ในระบบสำหรับกลุ่ม ${groupName} ครับ! 🎉 วันนี้ชิลๆ ได้เลย ☕`;
  }
  
  const prompt = `ทำหน้าที่เป็นผู้ช่วยสรุปงานประจำวัน (Daily Report)
ข้อมูล:
ทีม: กลุ่ม ${groupName}
รายการงานวันนี้:
${groupTasks.map((t, i) => `${i+1}. โครงการ: ${t.project}, ปัญหา: ${t.details || t.task_name || 'ไม่ระบุ'}, สถานะ: ${t.status || 'อยู่ระหว่างดำเนินการ'}`).join('\n')}

ข้อกำหนด:
1. ห้ามแสดงงานที่ขึ้นสถานะ "จบงาน" เด็ดขาด (แสดงเฉพาะ "รอดำเนินการ", "กำลังดำเนินการ", "ติดปัญหา/รออะไหล่", และ "จบงาน(รอใบงาน)")
2. สรุปแยกตามโครงการ แจ้งสถานะงานให้ชัดเจน
3. ใช้ Emoji ประกอบให้น่าอ่าน และจัดย่อหน้าให้ดูสะอาดตา
4. ไม่ต้องเกริ่นนำหรือลงท้ายยาวเกินไป ให้เน้นข้อมูลจริง
5. ลงท้ายด้วยประโยคให้กำลังใจทีมงาน`;

  const geminiResponse = await askGemini(prompt);
  if (geminiResponse && !geminiResponse.includes('Error')) {
    return geminiResponse;
  }
  
  // Fallback (ถ้า AI พัง หรือยังไม่ได้ใส่ Key)
  let fallbackMsg = `🤖 [โหมดสำรอง] สรุปงานกลุ่ม ${groupName}:\n`;
  
  const getEmoji = (text) => {
    if (!text) return '🛠️';
    if (/น้ำ|ก๊อก|ท่อ|รั่ว|ซึม|ปั๊ม/.test(text)) return '💧';
    if (/ไฟ|หลอด|เบรกเกอร์|สวิตช์/.test(text)) return '⚡';
    if (/เหม็น|กลิ่น/.test(text)) return '🤢';
    if (/สี|ทาสี/.test(text)) return '🎨';
    if (/แอร์|ปรับอากาศ/.test(text)) return '❄️';
    if (/กระเบื้อง|พื้น/.test(text)) return '🧱';
    if (/ประตู|หน้าต่าง/.test(text)) return '🚪';
    if (/สวน|หญ้า|ต้นไม้/.test(text)) return '🌳';
    return '🛠️';
  };

  const byProject = {};
  groupTasks.forEach(t => {
    const proj = t.project || 'ไม่ระบุ';
    if (!byProject[proj]) byProject[proj] = [];
    byProject[proj].push(t);
  });
  
  for (const proj in byProject) {
    fallbackMsg += `\n📌 ${proj}\n`;
    byProject[proj].forEach((t, idx) => {
      const emoji = getEmoji(t.details || t.task_name);
      let status = t.status || 'อยู่ระหว่างดำเนินการ';
      let stEmoji = status.includes('รอใบงาน')
        ? '🟠'
        : status === 'ติดปัญหา/รออะไหล่'
        ? '🔴'
        : status === 'รอดำเนินการ'
        ? '⚪'
        : '🟡';

      fallbackMsg += `${idx + 1}. ${t.details || t.task_name || 'ไม่ระบุปัญหา'} ${emoji} (สถานะ: ${stEmoji} ${status})\n`;
    });
  }
  return fallbackMsg;
}

// ฟังก์ชันสำหรับคำสั่ง !เช็คงาน (เช็คจากบอทสอดแนม)
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

    // ทำการ Login เข้า Firebase (สำคัญมาก ห้ามลืม)
    await signInAnonymously(auth);

    // วนลูปอ่านข้อความที่ผู้ใช้พิมพ์เข้ามา
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim();
        const replyToken = event.replyToken;
        
        let targetGroup = null;
        let action = null;
        
        // กรองคำสั่ง
        if (text === '!สรุปงานA') { action = 'summary'; targetGroup = 'A'; }
        else if (text === '!สรุปงานB') { action = 'summary'; targetGroup = 'B'; }
        else if (text === '!สรุปงานA2') { action = 'summary'; targetGroup = 'A2'; }
        else if (text === '!เช็คงานA') { action = 'check'; targetGroup = 'A'; }
        else if (text === '!เช็คงานB') { action = 'check'; targetGroup = 'B'; }
        else if (text === '!เช็คงานA2') { action = 'check'; targetGroup = 'A2'; }
        
        if (action) {
          let responseText = '';
          const projectList = targetGroup === 'A' ? GROUP_A : (targetGroup === 'B' ? GROUP_B : GROUP_A2);
          const groupName = targetGroup;
          
          if (action === 'summary') {
            responseText = await handleSummary(projectList, groupName);
          } else if (action === 'check') {
            responseText = await handleCheck(projectList, groupName);
          }
          
          if (responseText) {
             await replyToLine(replyToken, responseText);
          }
        }
      }
    }
    
    // ต้องตอบ 200 OK กลับไปให้ LINE เสมอ ไม่ให้มันแจ้งเตือน Error
    return res.status(200).send('OK');
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
