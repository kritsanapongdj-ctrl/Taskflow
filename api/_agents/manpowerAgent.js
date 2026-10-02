import { db, collection, getDocs, doc, setDoc } from '../_services/firebase.js';
import { replyToLine } from '../_services/lineService.js';
import { askGemini } from '../_services/geminiService.js';

// ตรวจสอบว่าข้อความเป็นรายงานคนงานประจำวันหรือไม่ (Heuristic Detection)
function isManpowerReportText(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();

  // เงื่อนไข: มีคำเกี่ยวกับคนงาน / กำลังพล / การมาทำงาน
  const hasManpowerTerms = /(?:จำนวนคน|คนงาน|แรงงาน|ยอดคน|ช่าง|ผู้รับเหมา|ผรม\.|มาทำงาน|ขาด\s*\d+|เข้างาน|ยอดกำลังพล)/i.test(t);
  
  // มีหน่วยนับ เช่น "5 คน", "คน ครบ", "คน ขาด"
  const hasCountUnits = /\d+\s*คน|คน\s*ครบ|คน\s*ขาด/i.test(t);

  // มีชื่อโครงการหรือ Codename ทั่วไป เช่น PRC, VERW, N93, LH, LA, โครงการ
  const hasProjectIndicators = /(?:โครงการ|ไซต์|PRC|VERW|N93|LH|LA|NE|ไซท์)/i.test(t);

  return (hasManpowerTerms && (hasCountUnits || hasProjectIndicators)) || (hasCountUnits && hasProjectIndicators);
}

// แยกข้อมูลรายงานคนงานแบบ Regex Fallback
function parseManpowerRegex(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const records = [];
  let contractor = 'ไม่ระบุผู้รับเหมา';

  // พยายามจับชื่อบริษัท/ผู้รับเหมา บรรทัดแรกๆ
  for (const line of lines.slice(0, 3)) {
    const compMatch = line.match(/(?:บริษัท|หจก\.|ผู้รับเหมา|ผรม\.)\s*([^\s\n\r]+)/i);
    if (compMatch) {
      contractor = compMatch[0].trim();
      break;
    }
  }

  // วนลูปอ่านแต่ละบรรทัดเพื่อจับโครงการและจำนวนคน
  for (const line of lines) {
    // เช่น: "โครงการ 1 จำนวนคน 5 คน ครบ" หรือ "PRC จำนวน 5 คน มา 4 ขาด 1"
    const projMatch = line.match(/(?:โครงการ\s*[\w\d]+|[A-Z]{2,4}[-\d\w]*|LH-?\d+|LA-?\d+|NE-?\d+)/i);
    const countMatch = line.match(/(\d+)\s*คน/);

    if (projMatch || countMatch) {
      const proj = projMatch ? projMatch[0].trim() : 'ไม่ระบุโครงการ';
      const actualMatch = line.match(/มา(?:ทำงาน)?\s*(\d+)/) || line.match(/(\d+)\s*คน\s*ครบ/);
      const missingMatch = line.match(/ขาด\s*(\d+)/);

      records.push({
        project: proj,
        contractor,
        rawLine: line,
        headcountText: countMatch ? countMatch[0] : '-',
        actual: actualMatch ? parseInt(actualMatch[1] || actualMatch[0], 10) : null,
        missing: missingMatch ? parseInt(missingMatch[1], 10) : 0,
        status: /ครบ/.test(line) ? 'ครบ' : /ขาด/.test(line) ? 'ขาด' : 'ปกติ'
      });
    }
  }

  return { contractor, records };
}

export const ManpowerAgent = {
  name: 'ManpowerAgent',
  description: 'ผู้ช่วยสอดแนมและกวาดข้อมูลยอดคนงานประจำวันของแต่ละโครงการและผู้รับเหมาอย่างเงียบๆ (Zero LINE Quota) เพื่อนำไปกระทบยอดเบิกเงินรายเดือน',

  // ตรวจจับข้อความสอดแนมในกลุ่ม
  isManpowerSurveillance(event) {
    if (event.type !== 'message' || event.message?.type !== 'text') return false;
    const isGroup = event.source?.type === 'group' || event.source?.type === 'room';
    const text = event.message.text || '';
    return isGroup && isManpowerReportText(text);
  },

  // ดักจับและบันทึกข้อมูลลง Firestore อย่างเงียบกริบ (ห้าม Reply เพื่อไม่เปลืองโควต้า)
  async recordSilentLog(event) {
    try {
      const rawText = event.message.text || '';
      const groupId = event.source?.groupId || event.source?.roomId || 'unknown_group';
      const senderId = event.source?.userId || 'unknown_sender';

      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const monthStr = `${yyyy}-${mm}`;

      // ลองใช้ Gemini สกัดข้อมูลให้ออกมาเป็น JSON โครงสร้างมาตรฐาน หากมี Key
      let parsedData = null;
      const prompt = `ทำหน้าที่เป็น Data Extraction AI สกัดข้อมูลรายงานคนงานประจำวันจากข้อความ LINE:
ข้อความ:
"${rawText}"

ตอบกลับเป็น JSON เท่านั้น:
{
  "contractor": "ชื่อบริษัทหรือผู้รับเหมา (ถ้ามี)",
  "records": [
    {
      "projectCode": "Codename หรือชื่อโครงการ เช่น PRC, VERW, N93, LH-410, โครงการ 1",
      "targetHeadcount": 0,
      "actualHeadcount": 0,
      "missingHeadcount": 0,
      "status": "ครบ / ขาด / ปกติ",
      "remarks": "รายละเอียดงานหรือสาเหตุที่ขาด"
    }
  ]
}`;

      try {
        const aiJson = await askGemini(prompt);
        if (aiJson) {
          const match = aiJson.match(/\{[\s\S]*\}/);
          if (match) parsedData = JSON.parse(match[0]);
        }
      } catch (aiErr) {
        // Fallback to regex
      }

      if (!parsedData || !parsedData.records || parsedData.records.length === 0) {
        parsedData = parseManpowerRegex(rawText);
      }

      const logId = `MP-${todayStr}-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
      const logRef = doc(db, "artifacts", "default-app-id", "public", "data", "manpower_daily_logs", logId);

      await setDoc(logRef, {
        logId,
        date: todayStr,
        month: monthStr,
        groupId,
        senderId,
        rawText,
        contractor: parsedData.contractor || 'ไม่ระบุ',
        records: parsedData.records || [],
        createdAt: Date.now()
      });

      console.log(`[ManpowerAgent] Silently captured manpower report: ${logId} (${(parsedData.records || []).length} projects)`);
      return true;
    } catch (err) {
      console.error("[ManpowerAgent] Error recording silent log:", err);
      return false;
    }
  },

  // คำสั่งสำหรับ Admin ตรวจสอบยอดคนงาน (ในแชทส่วนตัว)
  canHandleCommand(cleanText, upperClean) {
    return upperClean === 'คนงาน' || upperClean === 'แรงงาน' || upperClean.startsWith('คนงาน ') || upperClean.startsWith('แรงงาน ');
  },

  async handleCommand({ event, cleanText, upperClean, replyToken, isGroup }) {
    if (isGroup) {
      await replyToLine(replyToken, "🔒 เพื่อความปลอดภัยของข้อมูล กรุณาเรียกดูรายงานยอดคนงานในแชทส่วนตัวกับบอทเท่านั้นครับ");
      return true;
    }

    try {
      const snap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "manpower_daily_logs"));
      let logs = [];
      snap.forEach(d => logs.push(d.data()));

      logs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const currentMonth = `${yyyy}-${mm}`;

      const currentMonthLogs = logs.filter(l => l.month === currentMonth || l.date?.startsWith(currentMonth));

      let msg = `👷 ระบบสอดแนม & จัดเก็บยอดคนงานประจำวัน (Manpower Agent)\n`;
      msg += `─────────────────────────\n`;
      msg += `📊 ภาพรวมเดือนนี้ (${currentMonth}):\n`;
      msg += `• รายงานที่แอบดึงสำเร็จ: ${currentMonthLogs.length} ฉบับ\n`;
      msg += `• รายงานทั้งหมดในระบบ: ${logs.length} ฉบับ\n`;
      msg += `• โควต้า LINE ที่ใช้: 0 ข้อความ (โหมดสอดแนมเงียบ ฟรี 100%)\n`;
      msg += `─────────────────────────\n`;

      if (logs.length === 0) {
        msg += `💡 ขณะนี้ยังไม่มีประวัติการส่งรายงานคนงานในกลุ่มที่บอทเข้าร่วม\nเมื่อมีคนพิมพ์รายงานในกลุ่ม บอทจะเริ่มกวาดข้อมูลอัตโนมัติทันทีครับ`;
      } else {
        msg += `📑 ตัวอย่าง 3 รายการล่าสุดที่บอทดักจับได้:\n`;
        logs.slice(0, 3).forEach((l, idx) => {
          msg += `\n${idx + 1}. [${l.date}] ผู้รับเหมา: ${l.contractor}\n`;
          (l.records || []).slice(0, 3).forEach(r => {
            const proj = r.projectCode || r.project || 'โครงการ';
            const act = r.actualHeadcount ?? r.actual ?? '-';
            const st = r.status || '-';
            msg += `   • ${proj}: ${act} คน (${st})\n`;
          });
        });
        msg += `\n💡 สิ้นเดือนสามารถนำข้อมูลชุดนี้ไปกระทบยอดใบเบิกเงินของผู้รับเหมาได้ทันทีครับ!`;
      }

      await replyToLine(replyToken, msg);
      return true;
    } catch (err) {
      console.error("[ManpowerAgent] handleCommand error:", err);
      await replyToLine(replyToken, "❌ เกิดข้อผิดพลาดในการดึงข้อมูลคนงาน กรุณาลองใหม่อีกครั้งครับ");
      return true;
    }
  }
};
