import { ensureAuth } from '../_services/firebase.js';
import { TaskAgent } from './taskAgent.js';
import { BudgetAgent } from './budgetAgent.js';
import { FloodAgent } from './floodAgent.js';
import { ManpowerAgent } from './manpowerAgent.js';

export const MasterOrchestrator = {
  name: 'MasterOrchestrator',
  description: 'ศูนย์กลางควบคุมและกระจายงานอัจฉริยะ (Central Router & Event Dispatcher) สำหรับ Multi-Agent System',

  async route(events, { host, proto }) {
    if (!events || events.length === 0) return;

    // 1. รับประกันการเชื่อมต่อ Firebase Auth แบบ Connection Pooling
    await ensureAuth();

    // 2. ตรวจสอบการสอดแนมแบบเงียบในกลุ่ม (Passive Surveillance) - ManpowerAgent
    for (const event of events) {
      if (ManpowerAgent.isManpowerSurveillance(event)) {
        // บันทึกข้อมูลเงียบๆ ไม่ตอบกลับในกลุ่มเพื่อประหยัดโควต้า LINE 100%
        await ManpowerAgent.recordSilentLog(event);
      }
    }

    // 3. จัดการข้อความตัวอักษร (Text Messages)
    for (const event of events) {
      if (event.type === 'message' && event.message?.type === 'text') {
        const rawText = (event.message.text || '').trim();
        const replyToken = event.replyToken;
        const userId = event.source?.userId;
        const isGroup = event.source?.type === 'group' || event.source?.type === 'room';

        // ทำความสะอาดข้อความ: ถอดเครื่องหมายคำพูดรอบนอก (' " ‘ ’ “ ” `) และ prefix (! หรือ /)
        const cleanText = (rawText || '')
          .replace(/^[\s'"`‘’“”]+|[\s'"`‘’“”]+$/g, '')
          .replace(/^[!\/]+/, '')
          .replace(/^[\s'"`‘’“”]+|[\s'"`‘’“”]+$/g, '')
          .trim();
        const upperClean = cleanText.toUpperCase();

        const context = {
          event,
          rawText,
          cleanText,
          upperClean,
          replyToken,
          userId,
          isGroup,
          host,
          proto
        };

        // Router ลำดับความสำคัญของแต่ละ Agent:
        // A. FloodAgent (รายงานน้ำท่วม, เสร็จ, ยกเลิก, ล้าง, PDF)
        if (FloodAgent.canHandleText(cleanText, upperClean)) {
          const handled = await FloodAgent.handleText(context);
          if (handled) continue;
        }

        // B. BudgetAgent (งบ, งบA/B/A2, เกินงบ, อัปเดตงบ)
        if (BudgetAgent.canHandle(cleanText, upperClean)) {
          const handled = await BudgetAgent.handle(context);
          if (handled) continue;
        }

        // C. TaskAgent (สรุปงาน, รอใบงาน, เช็คงาน, เมนูคำสั่ง)
        if (TaskAgent.canHandle(cleanText, upperClean)) {
          const handled = await TaskAgent.handle(context);
          if (handled) continue;
        }

        // D. ManpowerAgent (คำสั่ง !คนงาน หรือ !แรงงาน ในแชทส่วนตัว)
        if (ManpowerAgent.canHandleCommand(cleanText, upperClean)) {
          const handled = await ManpowerAgent.handleCommand(context);
          if (handled) continue;
        }
      }
    }

    // 4. จัดการรูปภาพสำรวจหน้างาน (Image Messages) - FloodAgent Batch Processor
    const imageEvents = events.filter(e => e.type === 'message' && e.message?.type === 'image');
    if (imageEvents.length > 0) {
      const userImageMap = new Map();
      for (const evt of imageEvents) {
        const uId = evt.source?.userId;
        const isGrp = evt.source?.type === 'group' || evt.source?.type === 'room';
        if (!uId || isGrp) continue;
        if (!userImageMap.has(uId)) userImageMap.set(uId, []);
        userImageMap.get(uId).push(evt);
      }

      for (const [userId, userEvents] of userImageMap.entries()) {
        await FloodAgent.handleImageBatch({
          userId,
          userEvents,
          host,
          proto
        });
      }
    }
  }
};
