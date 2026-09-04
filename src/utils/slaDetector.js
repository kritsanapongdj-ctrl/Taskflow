// src/utils/slaDetector.js
// ระบบตรวจจับคีย์เวิร์ดหมวด SLA อัจฉริยะ (Smart SLA Keyword Engine)

export const SLA_RULES = [
  {
    category: 'ท่อสปริงเกอร์แตก',
    defaultDays: 5,
    positivePatterns: [
      /ท่อ.*สปริงเกอร์|สปริงเกอร์.*ท่อ/i,
      /ท่อ.*สปิงเกอร์|สปิงเกอร์.*ท่อ/i,
      /ท่อ.*pe.*สปริงเกอร์|ท่อ.*ระบบรดน้ำ/i,
      /ท่อเมนสปริงเกอร์|ท่อแยกสปริงเกอร์/i,
      /ขุดซ่อมท่อสปริงเกอร์|ซ่อมท่อสปริงเกอร์/i
    ],
    negativePatterns: [
      /ปั๊ม/i,
      /ปั้ม/i,
      /มอเตอร์/i,
      /ตู้ไฟ/i,
      /ตู้คอนโทรล/i
    ],
    matchedLabel: 'ท่อสปริงเกอร์'
  },
  {
    category: 'หัวสปริงเกอร์แตก',
    defaultDays: 3,
    positivePatterns: [
      /หัว.*สปริงเกอร์.*(แตก|หัก|ชำรุด|เปลี่ยน|หลุด|หาย)/i,
      /หัว.*สปิงเกอร์.*(แตก|หัก|ชำรุด|เปลี่ยน|หลุด|หาย)/i,
      /เปลี่ยน.*หัว.*สปริงเกอร์/i,
      /เปลี่ยน.*หัว.*สปิงเกอร์/i,
      /หัวมินิสปริงเกอร์.*(แตก|หัก|ชำรุด|เปลี่ยน)/i
    ],
    negativePatterns: [
      /ปั๊ม/i,
      /ปั้ม/i,
      /ปรับหัว/i,
      /ยกหัว/i,
      /ตั้งหัว/i,
      /ท่อ/i
    ],
    matchedLabel: 'หัวสปริงเกอร์แตก/ชำรุด'
  },
  {
    category: 'ปรับหัวสปริงเกอร์',
    defaultDays: 3,
    positivePatterns: [
      /ปรับ.*หัว.*สปริงเกอร์|ยก.*หัว.*สปริงเกอร์|ตั้ง.*หัว.*สปริงเกอร์/i,
      /ปรับ.*หัว.*สปิงเกอร์|ยก.*หัว.*สปิงเกอร์|ตั้ง.*หัว.*สปิงเกอร์/i,
      /ปรับทิศทาง.*สปริงเกอร์|หัวสปริงเกอร์จมดิน/i
    ],
    negativePatterns: [
      /ปั๊ม/i,
      /ปั้ม/i,
      /ท่อ/i
    ],
    matchedLabel: 'ปรับ/ยกหัวสปริงเกอร์'
  },
  {
    // Semantic Grouping: สุขภัณฑ์ป้อมหน้า ครอบคลุมงานห้องน้ำป้อม รปภ. ทั้งหมด
    category: 'สุขภัณฑ์ป้อมหน้าชำรุด (กรณีซ่อมได้)',
    altCategory: 'สุขภัณฑ์ป้อมหน้าชำรุด (กรณีเปลี่ยนอุปกรณ์ใหม่)',
    defaultDays: 7,
    positivePatterns: [
      /ป้อม.*(สุขภัณฑ์|ห้องน้ำ|โถส้วม|ชักโครก|อ่างล้างมือ|อ่างล้างหน้า|สายฉีด|สายชำระ|ก๊อกน้ำ|ท่อน้ำทิ้ง|ลูกลอย)/i,
      /(สุขภัณฑ์|ห้องน้ำ|โถส้วม|ชักโครก|อ่างล้างมือ|อ่างล้างหน้า|สายฉีด|สายชำระ|ก๊อกน้ำ|ท่อน้ำทิ้ง|ลูกลอย).*ป้อม/i,
      /ห้องน้ำ.*รปภ\.|สุขภัณฑ์.*รปภ\.|ชักโครก.*รปภ\./i
    ],
    negativePatterns: [
      /สโมสร/i,
      /คลับเฮ้าส์/i,
      /สระว่ายน้ำ/i
    ],
    matchedLabel: 'สุขภัณฑ์/ห้องน้ำป้อมหน้า'
  },
  {
    category: 'ฝ้าเพดานป้อมมีน้ำรั่วซึม',
    defaultDays: 7,
    positivePatterns: [
      /ป้อม.*(ฝ้า|เพดาน).*(รั่ว|ซึม|น้ำ|หยด)/i,
      /(ฝ้า|เพดาน).*ป้อม.*(รั่ว|ซึม|น้ำ|หยด)/i,
      /(ฝ้า|เพดาน).*รปภ\..*(รั่ว|ซึม|น้ำ|หยด)/i
    ],
    negativePatterns: [
      /สโมสร/i,
      /ฟิตเนส/i
    ],
    matchedLabel: 'ฝ้าเพดานป้อมมีน้ำรั่วซึม'
  },
  {
    category: 'อุปกรณ์ไฟฟ้าป้อมหน้าชำรุด (กรณีซ่อมได้)',
    altCategory: 'อุปกรณ์ไฟฟ้าป้อมหน้าชำรุด (กรณีเปลี่ยนอุปกรณ์ใหม่)',
    defaultDays: 7,
    positivePatterns: [
      /ป้อม.*(สวิตช์|สวิทช์|ปลั๊ก|เบรกเกอร์|ไฟเพดาน|พัดลม|พัดลมดูดอากาศ).*(เสีย|ดับ|ชำรุด|ไม่ติด|ไม่ทำงาน)/i,
      /(สวิตช์|สวิทช์|ปลั๊ก|เบรกเกอร์|ไฟเพดาน|พัดลม|พัดลมดูดอากาศ).*ป้อม.*(เสีย|ดับ|ชำรุด|ไม่ติด|ไม่ทำงาน)/i
    ],
    negativePatterns: [
      /สโมสร/i,
      /ในสวน/i
    ],
    matchedLabel: 'อุปกรณ์ไฟฟ้าป้อมหน้าชำรุด'
  },
  {
    category: 'ไฟแสงจันทร์/ไฟริมรั้วโครงการ/ไฟป้อม/ไฟป้าย',
    defaultDays: 3,
    positivePatterns: [
      /ไฟแสงจันทร์/i,
      /ไฟริมรั้ว|ไฟแนวรั้ว|ไฟรั้วโครงการ/i,
      /ไฟป้ายโครงการ|ไฟป้าย/i,
      /ไฟป้อม|ไฟหน้าป้อม/i,
      /โคมไฟถนน.*ดับ|หลอดไฟถนน.*ดับ|ไฟทางเดินหลัก.*ดับ/i
    ],
    negativePatterns: [
      /ในสวน/i,
      /สวนส่วนกลาง/i,
      /สโมสร/i,
      /ฟิตเนส/i
    ],
    matchedLabel: 'ไฟแสงจันทร์/ไฟริมรั้ว/ไฟป้อม/ไฟป้าย'
  },
  {
    category: 'ไฟในสวน',
    defaultDays: 5,
    positivePatterns: [
      /ไฟ.*ในสวน|ไฟในสวนส่วนกลาง/i,
      /โคมไฟเสาเตี้ย.*สวน|ไฟเสาเตี้ย.*สวน/i,
      /ไฟส่องต้นไม้/i,
      /สปอร์ตไลท์สวน|ไฟสนาม/i
    ],
    negativePatterns: [
      /สโมสร/i,
      /ป้อม/i
    ],
    matchedLabel: 'ไฟในสวน'
  },
  {
    category: 'ฝาบ่อ(บิ่น,แตก)อันตราย (ยกเว้นหล่อฝาใหม่)',
    defaultDays: 5,
    positivePatterns: [
      /ฝาบ่อ.*(แตก|บิ่น|หัก|ทรุด|อันตราย)/i,
      /ฝาพัก.*(แตก|บิ่น|หัก|อันตราย)/i,
      /ฝาท่อ.*(แตก|บิ่น|หัก|อันตราย)/i,
      /ฝาแมนโฮล.*(แตก|บิ่น|หัก)/i
    ],
    negativePatterns: [
      /หล่อฝาใหม่/i,
      /สั่งทำฝาใหม่/i,
      /มีเสียง/i,
      /เสียงดัง/i
    ],
    matchedLabel: 'ฝาบ่อ(บิ่น,แตก)อันตราย'
  },
  {
    category: 'ฝาบ่อมีเสียงดัง',
    defaultDays: 14,
    positivePatterns: [
      /ฝาบ่อ.*(มีเสียง|เสียงดัง|กระดก)/i,
      /ฝาท่อ.*(มีเสียง|เสียงดัง|กระดก)/i
    ],
    negativePatterns: [
      /แตก/i,
      /หัก/i,
      /ตะแกรงเหล็ก/i
    ],
    matchedLabel: 'ฝาบ่อมีเสียงดัง'
  },
  {
    category: 'ตะแกรงเหล็กฝาบ่อเป็นสนิม,เสียงดัง',
    defaultDays: 14,
    positivePatterns: [
      /ตะแกรงเหล็ก.*(ฝาบ่อ|ฝาท่อ|รางระบายน้ำ)/i,
      /ตะแกรง.*(สนิม|เสียงดัง)/i
    ],
    negativePatterns: [],
    matchedLabel: 'ตะแกรงเหล็กฝาบ่อ'
  },
  {
    category: 'ทางเท้าในสวน',
    defaultDays: 14,
    positivePatterns: [
      /ทางเท้า.*ในสวน|ทางเดิน.*ในสวน/i,
      /แผ่นทางเดิน.*สวน|บล็อกทางเดิน.*สวน/i
    ],
    negativePatterns: [],
    matchedLabel: 'ทางเท้าในสวน'
  },
  {
    category: 'ทางเท้า',
    defaultDays: 14,
    positivePatterns: [
      /ทางเท้า.*(ทรุด|แตกร้าว|แตก|ชำรุด|ยกปรับ|ปรับระดับ)/i,
      /ฟุตบาท.*(ทรุด|แตกร้าว|แตก|ชำรุด)/i,
      /บล็อกทางเท้า|กระเบื้องทางเท้า/i,
      /คันหินทางเท้า/i
    ],
    negativePatterns: [
      /ในสวน/i,
      /สวนส่วนกลาง/i
    ],
    matchedLabel: 'ทางเท้า'
  },
  {
    category: 'รางวีหน้าบ้าน',
    defaultDays: 14,
    positivePatterns: [
      /รางวี|ราง v|รางระบายน้ำหน้าบ้าน/i
    ],
    negativePatterns: [],
    matchedLabel: 'รางวีหน้าบ้าน'
  },
  {
    category: 'เครื่องกรองน้ำชำรุด (กรณีซ่อมได้)',
    defaultDays: 7,
    positivePatterns: [
      /เครื่องกรองน้ำ|ไส้กรองน้ำ|ตู้ทำน้ำเย็น/i
    ],
    negativePatterns: [],
    matchedLabel: 'เครื่องกรองน้ำ'
  },
  {
    category: 'ปรับระดับดินทรุดบริเวณไม้คันกระดกป้อมหน้า',
    defaultDays: 7,
    positivePatterns: [
      /(ไม้คันกระดก|ไม้กระดก|ไม้กั้นรถ|ไม้กั้น).*(ป้อม|ดินทรุด|ปรับระดับ)/i,
      /(ดินทรุด|ปรับระดับ).*(ไม้คันกระดก|ไม้กระดก|ไม้กั้นรถ|ไม้กั้น)/i
    ],
    negativePatterns: [],
    matchedLabel: 'ไม้คันกระดกป้อมหน้า'
  },
  {
    category: 'ป้อมมีน้ำรั่วซึม เกิดจากวงกบประตู-หน้าต่าง (กรณีซ่อมได้)',
    defaultDays: 7,
    positivePatterns: [
      /ป้อม.*(วงกบ|ขอบหน้าต่าง|ขอบประตู).*(รั่ว|ซึม|น้ำเข้า)/i,
      /(วงกบ|ขอบหน้าต่าง|ขอบประตู).*ป้อม.*(รั่ว|ซึม|น้ำเข้า)/i
    ],
    negativePatterns: [],
    matchedLabel: 'วงกบประตู-หน้าต่างป้อมรั่วซึม'
  }
];

/**
 * ฟังก์ชันตรวจจับหมวด SLA จากข้อความรายละเอียดงาน
 * @param {string} detailsText ข้อความรายละเอียดงาน (details)
 * @param {Array<string>} availableSlas รายการ SLA จากฐานข้อมูล (เช่น ['ท่อสปริงเกอร์แตก|5', ...])
 * @returns {Object} ผลลัพธ์การตรวจจับ
 */
export function detectSlaCategory(detailsText, availableSlas = []) {
  if (!detailsText || typeof detailsText !== 'string') {
    return { hasMatch: false, detectedCategory: null, slaDays: null, matchedKeyword: null, reason: '' };
  }

  const cleanText = detailsText.trim();
  if (!cleanText) {
    return { hasMatch: false, detectedCategory: null, slaDays: null, matchedKeyword: null, reason: '' };
  }

  // สร้าง Map ของ SLA วันจากฐานข้อมูล
  const slaDbMap = {};
  if (Array.isArray(availableSlas)) {
    availableSlas.forEach(s => {
      if (typeof s === 'string') {
        const parts = s.split('|');
        const name = parts[0]?.trim();
        const days = parseInt(parts[1] || '0', 10);
        if (name) slaDbMap[name] = days;
      }
    });
  }

  for (const rule of SLA_RULES) {
    // 1. ตรวจสอบว่าตรงกับ Positive Patterns ใดๆ หรือไม่
    const isPos = rule.positivePatterns.some(pattern => pattern.test(cleanText));
    if (!isPos) continue;

    // 2. ตรวจสอบว่าติด Negative Patterns (คำยกเว้น) หรือไม่
    const isNeg = rule.negativePatterns.some(pattern => pattern.test(cleanText));
    if (isNeg) continue;

    // 3. หาชื่อหมวดจริงในฐานข้อมูล
    let targetCat = rule.category;
    let days = slaDbMap[targetCat] || rule.defaultDays;

    // กรณีมีหมวดสำรอง (เช่น กรณีเปลี่ยนอุปกรณ์ใหม่)
    if (!slaDbMap[targetCat] && rule.altCategory && slaDbMap[rule.altCategory]) {
      targetCat = rule.altCategory;
      days = slaDbMap[rule.altCategory];
    } else if (!slaDbMap[targetCat]) {
      // ค้นหาหมวดในฐานข้อมูลที่ชื่อใกล้เคียง
      const dbMatch = Object.keys(slaDbMap).find(k => k.includes(rule.category) || rule.category.includes(k));
      if (dbMatch) {
        targetCat = dbMatch;
        days = slaDbMap[dbMatch];
      }
    }

    return {
      hasMatch: true,
      detectedCategory: targetCat,
      slaDays: days,
      matchedKeyword: rule.matchedLabel,
      reason: `ตรวจพบคีย์เวิร์ด "${rule.matchedLabel}" ซึ่งเข้าข่ายหมวด SLA: "${targetCat}" (${days} วัน)`
    };
  }

  return { hasMatch: false, detectedCategory: null, slaDays: null, matchedKeyword: null, reason: '' };
}

/**
 * ตรวจสอบว่าผู้ใช้เลือกหมวด SLA ไม่ตรงกับที่ระบบตรวจพบหรือไม่
 * @param {Object} detected ผลจาก detectSlaCategory
 * @param {string} userSelectedCategory หมวดที่ผู้ใช้เลือก (taskForm.slaCategory)
 * @returns {boolean} true หากมี mismatch
 */
export function isSlaMismatch(detected, userSelectedCategory) {
  if (!detected || !detected.hasMatch || !detected.detectedCategory) return false;
  
  const userCat = (userSelectedCategory || '').trim();
  // ถ้าผู้ใช้เลือก "งานทั่วไป (ไม่มี SLA)" หรือไม่ระบุ -> ถือว่า Mismatch ทันที
  if (!userCat || userCat === 'งานทั่วไป (ไม่มี SLA)') return true;

  // ตรวจสอบว่าชื่อหมวดที่เลือกตรงกันหรือไม่ (ตัดคำกรณี/วงเล็บ)
  const normDet = detected.detectedCategory.replace(/\s+/g, '').toLowerCase();
  const normUser = userCat.replace(/\s+/g, '').toLowerCase();

  if (normDet === normUser) return false;
  if (normDet.includes(normUser) || normUser.includes(normDet)) return false;

  // ตรวจสอบกรณีสุขภัณฑ์ป้อมหน้า (ทั้งกรณีซ่อมได้และเปลี่ยนอุปกรณ์ใหม่)
  if (normDet.includes('สุขภัณฑ์') && normUser.includes('สุขภัณฑ์')) return false;

  return true;
}
