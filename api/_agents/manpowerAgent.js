import { db, collection, getDocs, doc, setDoc, getDoc } from '../_services/firebase.js';
import { replyToLine } from '../_services/lineService.js';
import { askGemini } from '../_services/geminiService.js';

// ตรวจสอบว่าข้อความเป็นรายงานคนงานประจำวันหรือไม่ (Heuristic Detection)
function isManpowerReportText(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();

  // เงื่อนไข: มีคำเกี่ยวกับคนงาน / กำลังพล / การมาทำงาน / งานสวน
  const hasManpowerTerms = /(?:จำนวนคน|คนงาน|แรงงาน|พนักงาน|ยอดคน|ช่าง|ผู้รับเหมา|ผรม\.|มาทำงาน|ขาด\s*\d+|ขาด\s*-|เข้างาน|ยอดกำลังพล|จำนวนเต็ม|ชดเชย|เติมชดเชย)/i.test(t);
  
  // มีหน่วยนับ หรือคำบอกสถานะการมา
  const hasCountUnits = /\d+\s*คน|คน\s*ครบ|คน\s*ขาด|ขาด\s*-\s*คน|คน\s*ลา/i.test(t);

  // มีชื่อโครงการหรือ Codename หรือคำว่าโครงการ/บริษัท
  const hasProjectIndicators = /(?:โครงการ|ไซต์|บริษัท|บจก\.|หจก\.|บ\.|PRC|VERW|N93|VLW|NP1|MBR|LH|LA|NE|VA)/i.test(t);

  return (hasManpowerTerms && (hasCountUnits || hasProjectIndicators)) || (hasCountUnits && hasProjectIndicators);
}

// แปลงวันที่ไทย (27/10/69, 27-10-69, 27/10/2569) เป็น ISO YYYY-MM-DD
function parseThaiDate(text) {
  if (!text) return null;
  const m = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  let year = parseInt(m[3], 10);
  if (year > 2500) {
    year = year - 543;
  } else if (year >= 60 && year < 100) {
    year = (year + 2500) - 543;
  } else if (year < 100) {
    year = 2000 + year;
  }
  return `${year}-${month}-${day}`;
}

// แยกข้อมูลรายงานคนงานแบบ Fallback (Regex + Multi-column parser)
function parseManpowerRegex(text) {
  const reportDate = parseThaiDate(text);
  let contractor = 'ไม่ระบุผู้รับเหมา';

  // สกัดชื่อบริษัท/ผู้รับเหมา (รองรับชื่อยาวจนจบคำว่า จำกัด/กรุ๊ป หรือตัดตามบรรทัด)
  const compMatch = text.match(/(?:บริษัท|บจก\.|หจก\.|บ\.)\s*([^\n\r]+?)(?=\s+\d{1,2}[\/\-]|\s+จำนวน|\s+วันที่|\r?\n|$)/i);
  if (compMatch) {
    contractor = compMatch[0].trim();
  }

  // รองรับกรณี multi-column (space 3 ตัวขึ้นไปนำหน้าตัวเลขหัวข้อ เช่น "   2. โครงการ")
  let cleanLines = [];
  const rawLines = text.split(/\r?\n/);
  for (const line of rawLines) {
    const subParts = line.split(/\s{3,}(?=\d+[\.\)])/);
    for (const part of subParts) {
      if (part.trim()) cleanLines.push(part.trim());
    }
  }

  const records = [];
  let currentRecord = null;

  for (const line of cleanLines) {
    // หาจุดเริ่มต้นของโครงการ เช่น "1. โครงการ MBR", "1.VA", "โครงการ NU"
    const startMatch = line.match(/(?:^|\b)(?:\d+[\.\)]\s*)?(?:โครงการ\s*)?([A-Za-z][A-Za-z0-9_\s]{1,10}?)(?:\s*\.|\s+)(?:จำนวนเต็ม|จำนวนพนักงาน|จำนวน|ครบ)/i);
    
    if (startMatch) {
      if (currentRecord) records.push(currentRecord);

      let code = startMatch[1].trim().toUpperCase().replace(/^โครงการ\s*/i, '');
      
      const targetMatch = line.match(/(?:จำนวนเต็ม|จำนวนพนักงาน)\s*(\d+)\s*คน?/i);
      const actualMatch = line.match(/(?<!เกิน)มา\s*(\d+)\s*คน/i);
      const missingMatch = line.match(/ขาด\s*(\d+)\s*คน|ลา\s*(\d+)\s*คน/i);
      const isMissingDash = /ขาด\s*-\s*คน/i.test(line);
      const isComplete = /ครบ/i.test(line);

      const target = targetMatch ? parseInt(targetMatch[1], 10) : null;
      let actual = actualMatch ? parseInt(actualMatch[1], 10) : null;
      let missing = 0;

      if (missingMatch) {
        missing = parseInt(missingMatch[1] || missingMatch[2], 10);
      } else if (isMissingDash) {
        missing = 0;
      }

      if (actual === null) {
        if (isComplete || isMissingDash) {
          actual = target;
        } else if (missing > 0 && target !== null) {
          actual = Math.max(0, target - missing);
        }
      }

      let status = 'ปกติ';
      if (missing > 0) status = 'ขาด';
      else if (isComplete || isMissingDash || (target && actual >= target)) status = 'ครบ';

      const compNotes = [];
      const compInLine = line.match(/(?:ชดเชย[^\n\r]*|เติมชดเชย[^\n\r]*)/i);
      if (compInLine) compNotes.push(compInLine[0].trim());

      currentRecord = {
        projectCode: code,
        targetHeadcount: target,
        actualHeadcount: actual,
        missingHeadcount: missing,
        status,
        compensation: compNotes.join('; ')
      };
    } else if (currentRecord) {
      const isCompLine = /^(?:ชดเชย|เติมชดเชย)/i.test(line);

      if (!isCompLine) {
        const actM = line.match(/(?<!เกิน)มา\s*(\d+)\s*คน/i);
        if (actM) currentRecord.actualHeadcount = parseInt(actM[1], 10);
      }

      const misM = line.match(/ขาด\s*(\d+)\s*คน|ลา\s*(\d+)\s*คน/i);
      if (misM) {
        currentRecord.missingHeadcount = parseInt(misM[1] || misM[2], 10);
        currentRecord.status = 'ขาด';
      }

      if (/ครบ/i.test(line) && !currentRecord.missingHeadcount) {
        currentRecord.status = 'ครบ';
        if (currentRecord.actualHeadcount === null && currentRecord.targetHeadcount) {
          currentRecord.actualHeadcount = currentRecord.targetHeadcount;
        }
      }

      const compM = line.match(/(?:ชดเชย[^\n\r]*|เติมชดเชย[^\n\r]*)/i);
      if (compM) {
        const textComp = compM[0].trim().replace(/\.+$/, '');
        if (textComp && textComp !== 'เติมชดเชย') {
          currentRecord.compensation = currentRecord.compensation 
            ? `${currentRecord.compensation}; ${textComp}` 
            : textComp;
        }
      }
    }
  }

  if (currentRecord) records.push(currentRecord);

  return { contractor, reportDate, records };
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
      const prompt = `คุณคือ AI สกัดข้อมูลรายงานคนงานสวนประจำวัน (Landscape Manpower Data Extractor)
สกัดข้อมูลจากข้อความ LINE ด้านล่างให้อยู่ในรูปแบบ JSON อย่างเคร่งครัด

กฎการสกัดข้อมูล:
1. "contractor": ชื่อบริษัทหรือผู้รับเหมา เช่น "บ.เอ็นอาร์การ์เดน จำกัด", "บจก.เบญจพรรณ กรุ๊ป", "บริษัท นุ ออลล์ เซอร์วิส จำกัด", "บริษัท การ์เด้น อลิอันซ์ จำกัด" (ถ้าไม่พบ ให้ระบุ "ไม่ระบุ")
2. "reportDate": วันที่รายงานในรูปแบบ "YYYY-MM-DD" เช่น 27/10/69 หรือ 27/10/2569 ให้แปลงเป็น "2026-10-27" (พ.ศ. 2569 = ค.ศ. 2026) ถ้าไม่ระบุให้ใช้ "${todayStr}"
3. "records": รายการแต่ละโครงการ
   - "projectCode": รหัสโครงการตัวพิมพ์ใหญ่เสมอ (UPPERCASE) เช่น "VLW", "VERW", "N93", "VA", "NP1", "PRC", "MBR", "C13", "LH PARK" (ตัดคำว่า 'โครงการ' หรือลำดับตัวเลข 1. 2. ออก)
   - "targetHeadcount": จำนวนเต็มตามสัญญา (ตัวเลข) เช่น "จำนวนเต็ม 13 คน" หรือ "จำนวนพนักงาน 5 คน" -> 13 หรือ 5 (ถ้าไม่มีให้ใส่ null)
   - "actualHeadcount": จำนวนคนที่เข้าทำงานจริง (ตัวเลข)
     * ถ้าบอกว่า "ครบ" และไม่ระบุคนขาด -> เท่ากับ targetHeadcount
     * ถ้าบอกว่า "มา 6 คน" -> 6
     * ถ้าบอกว่า "ขาด 1 คน" และ target=5 -> 4
     * ถ้าบอกว่า "ขาด - คน" -> ถือว่าไม่ขาด เท่ากับ targetHeadcount
   - "missingHeadcount": จำนวนคนที่ขาด/ลา (ตัวเลข) ถ้าขาด 1 คน -> 1, ถ้าบอกว่า "ครบ" หรือ "ขาด - คน" -> 0
   - "status": "ครบ", "ขาด", หรือ "เกิน/ชดเชย"
   - "compensation": รายละเอียดการชดเชย เช่น "ชดเชยเกิน 1 คน", "เติมชดเชย01-11-69", "เติมชดเชย 1 คน", "เติมชดเชย2ลงงาน15คน" (ถ้าไม่มีให้ใส่ "")

ระวังพิเศษ:
- ข้อความอาจจัดเป็น 2 คอลัมน์ซ้ายขวาด้วยการเว้นวรรค (space) หรือแท็บ ให้ไล่อ่านและสกัดแยกออกมาให้ครบทุกโครงการ (เช่น 1. ถึง 11.)
- รหัสโครงการที่มีทั้งพิมพ์เล็กพิมพ์ใหญ่ ให้แปลงเป็นตัวพิมพ์ใหญ่ทั้งหมด (เช่น vv93 -> VV93, prc -> PRC)

ข้อความที่ต้องสกัด:
"""
${rawText}
"""

ตอบเฉพาะ JSON ดังนี้เท่านั้น:
{
  "contractor": "...",
  "reportDate": "YYYY-MM-DD",
  "records": [
    {
      "projectCode": "...",
      "targetHeadcount": 0,
      "actualHeadcount": 0,
      "missingHeadcount": 0,
      "status": "ครบ/ขาด/เกิน/ชดเชย",
      "compensation": "..."
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
        console.warn("[ManpowerAgent] Gemini parse failed, falling back to regex:", aiErr);
      }

      if (!parsedData || !parsedData.records || parsedData.records.length === 0) {
        parsedData = parseManpowerRegex(rawText);
      }

      const finalDate = parsedData.reportDate || todayStr;
      const contractorName = parsedData.contractor || 'ไม่ระบุผู้รับเหมา';

      // 4. บันทึกและซิงค์ Base Quota (จำนวนเต็ม) ของแต่ละโครงการ
      const processedRecords = [];
      for (const rec of (parsedData.records || [])) {
        const code = (rec.projectCode || rec.project || 'UNKNOWN').trim().toUpperCase().replace(/^โครงการ\s*/i, '');
        let target = rec.targetHeadcount ?? null;
        let actual = rec.actualHeadcount ?? null;
        let missing = rec.missingHeadcount ?? 0;
        let compensation = rec.compensation || rec.remarks || '';

        // ค้นหาหรือบันทึก Base Quota
        const cleanDocId = `${contractorName}_${code}`.replace(/[\/\s\\#?%]/g, '_');
        const quotaRef = doc(db, "artifacts", "default-app-id", "public", "data", "manpower_base_quotas", cleanDocId);

        if (target && target > 0) {
          // เก็บครั้งแรกหรืออัปเดตเมื่อมีค่าจำนวนเต็มเข้ามา
          try {
            await setDoc(quotaRef, {
              contractor: contractorName,
              projectCode: code,
              baseHeadcount: target,
              lastUpdated: Date.now()
            }, { merge: true });
          } catch (qErr) {
            console.warn("[ManpowerAgent] Failed to update base quota:", qErr);
          }
        } else {
          // ถ้าไม่มีจำนวนเต็มในรายงานรอบนี้ ลองดึงจาก Base Quota เดิมที่เคยบันทึกไว้
          try {
            const quotaSnap = await getDoc(quotaRef);
            if (quotaSnap.exists()) {
              target = quotaSnap.data().baseHeadcount || null;
            }
          } catch (qErr) {
            console.warn("[ManpowerAgent] Failed to fetch base quota:", qErr);
          }
        }

        // คำนวณ actual ถ้ายังไม่มีแต่มี target และ missing
        if (actual === null && target !== null) {
          actual = Math.max(0, target - missing);
        }

        processedRecords.push({
          projectCode: code,
          targetHeadcount: target,
          actualHeadcount: actual,
          missingHeadcount: missing,
          status: rec.status || (missing > 0 ? 'ขาด' : 'ครบ'),
          compensation
        });
      }

      const logId = `MP-${finalDate}-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
      const logRef = doc(db, "artifacts", "default-app-id", "public", "data", "manpower_daily_logs", logId);

      await setDoc(logRef, {
        logId,
        date: finalDate,
        month: monthStr,
        groupId,
        senderId,
        rawText,
        contractor: contractorName,
        records: processedRecords,
        createdAt: Date.now()
      });

      console.log(`[ManpowerAgent] Silently captured manpower report: ${logId} (${processedRecords.length} projects, contractor: ${contractorName})`);
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
          (l.records || []).slice(0, 5).forEach(r => {
            const proj = r.projectCode || 'โครงการ';
            const act = r.actualHeadcount ?? '-';
            const tgt = r.targetHeadcount ? `/${r.targetHeadcount}` : '';
            const st = r.status || '-';
            const comp = r.compensation ? ` (ชดเชย: ${r.compensation})` : '';
            msg += `   • ${proj}: ${act}${tgt} คน [${st}]${comp}\n`;
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
