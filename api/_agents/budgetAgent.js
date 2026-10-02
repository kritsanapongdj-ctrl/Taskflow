import { db, doc, getDoc } from '../_services/firebase.js';
import { replyToLine } from '../_services/lineService.js';

const fNum = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

// 1. คำสั่ง !งบ, !งบA, !งบB, !งบA2 (สรุปภาพรวมงบประมาณ & คาดการณ์สิ้นปี)
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

// 2. คำสั่ง !งบ [รหัส] (เจาะลึก 9 หมวดบัญชี + ใบสำคัญจ่าย PV)
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

// 3. คำสั่ง !เกินงบ (แจ้งเตือนเฉพาะโครงการและหมวดที่เสี่ยงเกินงบ)
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

// 4. คำแนะนำการอัปเดตงบ
function getUpdateGuide() {
  return `💡 วิธีอัปเดตข้อมูลลงไฟล์ Excel และระบบ LINE:\n` +
    `─────────────────────────\n` +
    `เนื่องจากการดึงข้อมูลค่าใช้จ่ายต้องล็อกอินผ่านเครือข่าย LH ภายใน:\n\n` +
    `🖥️ สามารถกดอัปเดตได้ง่ายๆ จากคอมพิวเตอร์ของคุณ:\n` +
    `1. ดับเบิ้ลคลิกไฟล์ [อัปเดตงบประมาณ_LH.bat] บนหน้า Desktop\n` +
    `   (หรือรัน 'npm run update-budget' ใน Terminal)\n` +
    `2. ระบบจะล็อกอิน ดึงยอดจริง + คำนวณ Forecast ลงไฟล์ Excel ให้ครบ 9 โครงการ และซิงค์ขึ้น LINE ให้เรียบร้อยทันทีครับ!\n\n` +
    `📁 ไฟล์ Excel: C:\\Users\\krits\\lh-scraper\\LH_Indirect_Expenses_Report.xlsx`;
}

export const BudgetAgent = {
  name: 'BudgetAgent',
  description: 'จัดการสรุปงบประมาณ 9 หมวดบัญชี ค่าใช้จ่ายจริง Forecast สิ้นปี และแจ้งเตือนรายการเสี่ยงเกินงบ',

  canHandle(cleanText, upperClean) {
    if (upperClean === 'เกินงบ' || upperClean === 'เสี่ยงเกินงบ') return true;
    if (upperClean === 'งบ' || upperClean === 'งบประมาณ' || upperClean === 'งบA' || upperClean === 'งบB' || upperClean === 'งบA2') return true;
    if (upperClean.startsWith('งบ ') || upperClean.startsWith('งบ-') || upperClean.startsWith('งบประมาณ ')) return true;
    if (/^งบ([A-Z0-9\-]+)$/i.test(cleanText)) return true;
    if (upperClean === 'อัปเดตงบ' || upperClean === 'อัพเดตงบ' || upperClean === 'UPDATE' || upperClean === 'ดึงงบ' || upperClean === 'อัปเดต' || upperClean === 'อัพเดต') return true;
    return false;
  },

  async handle({ event, cleanText, upperClean, replyToken }) {
    let action = null;
    let targetGroup = null;
    let projectQuery = null;

    if (upperClean === 'เกินงบ' || upperClean === 'เสี่ยงเกินงบ') {
      action = 'over_budget';
    } else if (upperClean === 'งบA') {
      action = 'budget_overview';
      targetGroup = 'A';
    } else if (upperClean === 'งบB') {
      action = 'budget_overview';
      targetGroup = 'B';
    } else if (upperClean === 'งบA2') {
      action = 'budget_overview';
      targetGroup = 'A2';
    } else if (upperClean === 'งบ' || upperClean === 'งบประมาณ') {
      action = 'budget_overview';
      targetGroup = 'ALL';
    } else if (upperClean.startsWith('งบ ') || upperClean.startsWith('งบ-') || upperClean.startsWith('งบประมาณ ')) {
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
    } else if (upperClean === 'อัปเดตงบ' || upperClean === 'อัพเดตงบ' || upperClean === 'UPDATE' || upperClean === 'ดึงงบ' || upperClean === 'อัปเดต' || upperClean === 'อัพเดต') {
      action = 'update_guide';
    }

    if (!action) return false;

    let responseText = '';
    if (action === 'budget_overview') {
      responseText = await handleBudgetOverview(targetGroup);
    } else if (action === 'project_budget') {
      responseText = await handleProjectBudget(projectQuery);
    } else if (action === 'over_budget') {
      responseText = await handleOverBudget();
    } else if (action === 'update_guide') {
      responseText = getUpdateGuide();
    }

    if (responseText && replyToken) {
      await replyToLine(replyToken, responseText);
      return true;
    }
    return false;
  }
};
