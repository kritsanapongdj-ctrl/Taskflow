import { MasterOrchestrator } from './_agents/orchestrator.js';

/**
 * LINE Webhook Serverless Endpoint (Unified Multi-Agent Front-Door)
 * รองรับการทำงานของ Multi-Agent Architecture:
 * - FloodAgent: ตรวจจับน้ำท่วม พยากรณ์อากาศ 7 สำนัก ภาพถ่ายสำรวจ 10 ภาพ และสร้าง PDF
 * - BudgetAgent: ติดตามงบประมาณ 9 หมวด และ Forecast ค่าใช้จ่ายสิ้นปี
 * - TaskAgent: สรุปงานประจำวัน ค้างใบงาน WO และงานแจ้งซ่อม
 * - ManpowerAgent: สอดแนมยอดคนงานประจำวันแบบเงียบ (Zero LINE Quota)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const events = req.body?.events;
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }

    // ตรวจหา Host ปัจจุบันจาก Request Headers
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'lh-taskflow.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';

    // ส่งต่อ Events ทั้งหมดให้ Master Orchestrator จัดการแบบขนาน
    await MasterOrchestrator.route(events, { host, proto });

    return res.status(200).send('OK');
  } catch (error) {
    console.error("[Webhook Handler Error]:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
