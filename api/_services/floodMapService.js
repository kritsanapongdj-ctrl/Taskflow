import { FLOOD_PROJECTS } from './projectsConfig.js';
import { extractDirectFieldReport, generateFallbackEngineeringSynthesis } from './geminiService.js';

// คำนวณระดับน้ำอุทกวิทยา 3 ชั้น (คลอง vs ถนนนอก/ซอยหน้าโครงการ vs ถนนในโครงการ As-Built)
export function calculateHydrologicalLevels(report = {}, project = {}, liveWater = null) {
  const hasFieldReport = Boolean(report && (report.reportId || report.id || report.createdAt));
  const rawNotes = ((report.notes || '') + ' \n ' + (report.drainageCondition || '') + ' \n ' + (report.waterLevel || '')).trim();
  const status = hasFieldReport ? (report.status || 'NORMAL') : 'NO_REPORT';

  let canalBelowOuter = 50; // ซม. (ผิวน้ำคลองต่ำกว่าถนนภายนอก: ค่าบวก = ต่ำกว่าตลิ่ง, ค่าลบ = ล้นตลิ่ง)
  let canalWaterElevation = -0.50; // เมตร เทียบระดับถนนหน้าโครงการ (0.00 ม.)
  let isCanalOverflow = false;
  let canalStatusText = 'ในเกณฑ์ปกติ';
  let canalSource = 'REGIONAL_BASELINE'; // 'LIVE_TELEMETRY' | 'FIELD_REPORT' | 'REGIONAL_BASELINE'
  let outerRoadWaterDepth = 0; // ซม. (ระดับน้ำท่วมขังบนถนนหน้าโครงการ/ซอยภายนอก)
  let innerRoadWaterDepth = 0; // ซม. (ระดับน้ำท่วมขังบนถนนภายในโครงการ)
  let outerRoadConditionText = '';

  // ข้อมูลเขื่อนคอนกรีต คสล. ริมคลองภายนอก (Floodwall Barrier) ถ้ามี
  const hasFloodwall = Boolean(
    project?.hasFloodwall || 
    (typeof project?.floodwallHeightDiff === 'number' && !isNaN(project.floodwallHeightDiff) && project.floodwallHeightDiff > 0)
  );
  const floodwallHeightDiff = hasFloodwall ? (Number(project.floodwallHeightDiff) || 0.40) : null;
  const floodwallElevation = hasFloodwall ? Math.round(floodwallHeightDiff * 100) : null;

  // 1. ตรวจสอบระดับน้ำจากโทรมาตรสด (ThaiWater / สสน. / กรมชลประทาน)
  if (liveWater && (liveWater.bankDiff != null || liveWater.isOverflow)) {
    const rawDiffM = Math.abs(liveWater.bankDiff != null ? Number(liveWater.bankDiff) : 0);
    const diffCm = Math.round(rawDiffM * 100);
    isCanalOverflow = Boolean(liveWater.isOverflow || (liveWater.bankStatusText || '').includes('ล้น'));
    
    if (isCanalOverflow) {
      canalWaterElevation = +(rawDiffM); // ผิวน้ำล้นสูงกว่าตลิ่ง เช่น +0.02ม. หรือ +0.46ม.
      canalBelowOuter = -diffCm; // ติดลบ แปลว่าสูงกว่าระดับถนน/ตลิ่ง
      canalStatusText = `ล้นตลิ่ง ${diffCm} ซม. ⚠️`;
    } else {
      canalWaterElevation = -(rawDiffM); // ผิวน้ำต่ำกว่าตลิ่ง เช่น -0.77ม. หรือ -1.19ม.
      canalBelowOuter = diffCm;
      canalStatusText = diffCm <= 20 ? `หนุนสูง (ต่ำกว่าตลิ่ง ${diffCm} ซม.)` : `ในเกณฑ์ (ต่ำกว่าตลิ่ง ${diffCm} ซม.)`;
    }
    canalSource = 'LIVE_TELEMETRY';
  }

  // 2. ถ้ามีรายงานตรวจจริงหน้างานระบุระดับคลอง ให้อ้างอิงตามหน้างาน (ลำดับความสำคัญสูงสุด)
  // คัดแยกข้อความเฉพาะที่เกี่ยวข้องกับคลอง/ตลิ่งภายนอก โดยตัดข้อความเกี่ยวกับ "บ่อบำบัด/ปากบ่อพักน้ำเสียภายใน" ออก เพื่อไม่ให้สับสน
  const canalSearchText = rawNotes
    .replace(/\([^)]*(?:บ่อบำบัด|ปากบ่อ|บ่อพัก|บ่อหน่วง|บ่อสูบ)[^)]*\)/gi, '')
    .replace(/(?:ถนนในโครงการ|ในโครงการ)[^\n\r]*(?:บ่อบำบัด|ปากบ่อ)[^\n\r]*/gi, '');

  const canalAboveMatch = canalSearchText.match(/(?:สูงกว่า|เสมอระดับ)(?:ระดับ)?\s*(?:ผิวถนน|ถนนหน้าโครงการ|ถนนนอก|ถนน|ตลิ่ง)[^\d\n\-+]*\+?(\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i) ||
                          canalSearchText.match(/\+\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)\s*(?:สูงกว่า|เสมอระดับผิวถนน|เสมอผิวถนน|เสมอถนน|เหนือถนน)/i) ||
                          canalSearchText.match(/(?:คลอง|ระดับน้ำในคลอง)[^0-9\n]*?\(\s*\+\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i) ||
                          canalSearchText.match(/(?:คลอง|ระดับน้ำในคลอง)[^0-9\n]*?\+\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i) ||
                          canalSearchText.match(/(?:คลอง|ระดับน้ำในคลอง)[^0-9\n]*?สูง(?:กว่า|ขึ้นมา)\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i);

  const canalBelowMatch = canalSearchText.match(/(?:ต่ำกว่า|ต่ำจาก|ลดลงจาก)(?:ระดับ)?\s*(?:ผิวถนน|ถนนหน้าโครงการ|ถนนนอก|ถนน|ตลิ่ง)[^\d\n\-+]*(\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i) ||
                          canalSearchText.match(/-\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)\s*(?:จากผิวถนน|จากถนนนอก|จากตลิ่ง|จากถนน)/i) ||
                          canalSearchText.match(/(?:คลอง|ระดับน้ำในคลอง|น้ำในคลอง)[^0-9\n\-]*?ต่ำกว่า(?:ผิวถนน|ถนน|ตลิ่ง)\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i) ||
                          canalSearchText.match(/ต่ำกว่า(?:ผิวถนน|ถนน|ตลิ่ง)\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i);

  const canalOverflowMatch = canalSearchText.match(/(?:คลอง|น้ำในคลอง|ตลิ่ง)[^.\n\r\-•;>>]*?(?:ล้นตลิ่ง|ล้นคัน|ท่วมสูงล้น|เอ่อล้น|ล้นท่วม)/i) ||
                             canalSearchText.match(/(?:ล้นตลิ่ง|ล้นคัน|ท่วมสูงล้น)/i) ||
                             /ท่วมอยู่ที่ระดับเดียวกับฟุตบาท|เสมอระดับฟุตบาท/i.test(report.drainageCondition || '');

  if (canalAboveMatch) {
    let parsedCm = parseFloat(canalAboveMatch[1]);
    const isMeter = /(?:\d+\s*(?:ม\.|เมตร|\.m|m)(?!\s*(?:ซม|cm)))/i.test(canalAboveMatch[0]);
    if (isMeter && !/(?:cm|ซม|เซน)/i.test(canalAboveMatch[0])) parsedCm *= 100;
    canalBelowOuter = -Math.round(parsedCm);
    canalWaterElevation = +(canalBelowOuter < 0 ? Math.abs(canalBelowOuter) / 100 : 0);
    isCanalOverflow = parsedCm > 0;
    const isFlush = /เสมอระดับ|เสมอผิวถนน|เสมอถนน/i.test(canalSearchText);
    if (hasFloodwall) {
      canalStatusText = isFlush 
        ? `หน้างานแจ้ง: น้ำคลองเสมอระดับถนน (+${Math.round(parsedCm)} ซม. มีเขื่อนคอนกรีตกั้น) ⚠️`
        : `หน้างานแจ้ง: น้ำคลองสูงกว่าถนน +${Math.round(parsedCm)} ซม. (มีเขื่อนคอนกรีตกั้น) ⚠️`;
    } else {
      canalStatusText = isFlush
        ? `หน้างานแจ้ง: น้ำคลองเสมอระดับถนน (+${Math.round(parsedCm)} ซม. เสี่ยงล้นตลิ่ง) ⚠️`
        : `หน้างานแจ้ง: น้ำคลองล้นตลิ่งสูงกว่าถนน +${Math.round(parsedCm)} ซม. ⚠️`;
    }
    canalSource = 'FIELD_REPORT';
  } else if (canalBelowMatch) {
    let parsedCm = parseFloat(canalBelowMatch[1]);
    const isMeter = /(?:\d+\s*(?:ม\.|เมตร|\.m|m)(?!\s*(?:ซม|cm)))/i.test(canalBelowMatch[0]);
    if (isMeter && !/(?:cm|ซม|เซน)/i.test(canalBelowMatch[0])) parsedCm *= 100;
    canalBelowOuter = Math.round(parsedCm);
    canalWaterElevation = -(canalBelowOuter / 100);
    isCanalOverflow = false;
    canalStatusText = `หน้างานตรวจวัด: ต่ำกว่าตลิ่ง/ถนน ${canalBelowOuter} ซม.`;
    canalSource = 'FIELD_REPORT';
  } else if (canalOverflowMatch) {
    const overflowNumMatch = canalSearchText.match(/(?:ล้นตลิ่ง|ล้นคัน|เอ่อล้น)[^0-9\n]*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i);
    const overflowCm = overflowNumMatch ? parseFloat(overflowNumMatch[1]) : (/ฟุตบาท|ทางเท้า/i.test(canalSearchText) ? 10 : 10);
    canalBelowOuter = -overflowCm;
    canalWaterElevation = +(overflowCm / 100);
    isCanalOverflow = true;
    canalStatusText = `หน้างานแจ้ง: น้ำคลองล้นตลิ่ง (+${overflowCm} ซม.${/ฟุตบาท/i.test(canalSearchText) ? ' เสมอระดับฟุตบาท' : ''}) ⚠️`;
    canalSource = 'FIELD_REPORT';
  } else if (/หนุน|สูง|ปริ่ม|ใกล้ตลิ่ง/i.test(report.drainageCondition || '')) {
    canalBelowOuter = 10;
    canalWaterElevation = -0.10;
    canalStatusText = 'หน้างานแจ้ง: น้ำคลองหนุนสูง (ต่ำกว่าตลิ่ง 10 ซม.)';
    canalSource = 'FIELD_REPORT';
  } else if (canalSource === 'REGIONAL_BASELINE') {
    // 3. ปรับระดับตามลุ่มน้ำจริงของแต่ละโครงการ (ไม่ให้ซ้ำ 40 ซม. เท่ากันทุกที่)
    const area = ((project?.area || '') + ' ' + (project?.name || '')).toLowerCase();
    if (area.includes('อยุธยา')) {
      canalBelowOuter = 75; canalWaterElevation = -0.75; canalStatusText = 'ลุ่มน้ำเจ้าพระยา (อยุธยา)';
    } else if (area.includes('ปทุม') || area.includes('รังสิต') || area.includes('ธัญบุรี')) {
      canalBelowOuter = 45; canalWaterElevation = -0.45; canalStatusText = 'ลุ่มน้ำคลองรังสิตฯ';
    } else if (area.includes('บางขุนเทียน') || area.includes('สมุทรปราการ') || area.includes('พระราม 2') || area.includes('สุขสวัสดิ์')) {
      canalBelowOuter = 65; canalWaterElevation = -0.65; canalStatusText = 'ลุ่มน้ำชายฝั่ง/มหาชัย';
    } else if (area.includes('นนทบุรี') || area.includes('บางใหญ่') || area.includes('ราชพฤกษ์')) {
      canalBelowOuter = 60; canalWaterElevation = -0.60; canalStatusText = 'ลุ่มน้ำคลองอ้อมนนท์';
    } else if (area.includes('ลาดกระบัง') || area.includes('ร่มเกล้า')) {
      canalBelowOuter = 35; canalWaterElevation = -0.35; canalStatusText = 'ลุ่มน้ำคลองประเวศ/ลำปลาทิว';
    } else {
      canalBelowOuter = 50; canalWaterElevation = -0.50; canalStatusText = 'ลุ่มน้ำหลัก';
    }
  }

  // 3. คำนวณระดับยกพื้น/ระดับถนนในโครงการ (innerElevation) ตามลำดับความสำคัญ (3-Tier Precedence)
  let innerElevation = 80;
  let innerSource = 'ENGINEERING_STANDARD'; // 'FIELD_MEASURED' | 'AS_BUILT' | 'ENGINEERING_STANDARD'

  const innerMatch = rawNotes.match(/-\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)\s*(?:จากพื้นโครงการ|จากถนนในโครงการ|จากในโครงการ)/i);
  if (innerMatch) {
    let parsedInner = parseFloat(innerMatch[1]);
    const isMeter = /(?:\d+\s*(?:ม\.|เมตร|\.m|m)(?!\s*(?:ซม|cm)))/i.test(innerMatch[0]);
    if (isMeter && !/(?:cm|ซม|เซน)/i.test(innerMatch[0])) parsedInner *= 100;
    if (parsedInner > canalBelowOuter) {
      innerElevation = parsedInner - canalBelowOuter;
      innerSource = 'FIELD_MEASURED';
    }
  } else if (typeof project?.asBuiltElevationDiff === 'number' && !isNaN(project.asBuiltElevationDiff)) {
    innerElevation = Math.round(project.asBuiltElevationDiff * 100);
    innerSource = 'AS_BUILT';
  } else {
    innerElevation = 80;
    innerSource = 'ENGINEERING_STANDARD';
  }

  // 3.1 สันเนินทางเข้า / ป้อม รปภ. (Entrance Crest Level) ถ้ามี
  const hasEntranceCrest = typeof project?.entranceCrestDiff === 'number' && !isNaN(project.entranceCrestDiff) && project.entranceCrestDiff > 0;
  const entranceCrestDiff = hasEntranceCrest ? Number(project.entranceCrestDiff) : null;
  const crestElevation = hasEntranceCrest ? Math.round(entranceCrestDiff * 100) : null;
  // เกณฑ์กั้นน้ำบ่าภายนอกเข้าโครงการ (Effective Inflow Barrier)
  const effectiveBarrier = hasEntranceCrest ? Math.max(innerElevation, crestElevation) : innerElevation;

  // ระยะผิวน้ำคลองเทียบถนนในโครงการ (innerElevation ลบด้วยระดับน้ำคลอง)
  const canalBelowInner = innerElevation - Math.round(canalWaterElevation * 100);

  // 4. วิเคราะห์ระดับน้ำบนถนนหน้าโครงการ / ซอยภายนอก / ถนนภาระจำยอม (Outer Road Water) จาก 2 แหล่ง
  // แยกข้อความเป็นส่วนๆ ตาม bullet dashes หรือบรรทัด เพื่อไม่ให้ regex วิ่งข้ามประโยค
  const segments = rawNotes
    .split(/(?:\r?\n|(?<=\S|\b)\s*(?:-(?!\d)|[*•]|\d+[\.\)]|>>)\s*)/)
    .map(s => s.trim())
    .filter(Boolean);

  let hasExplicitOuterDry = false;
  let hasExplicitOuterFlood = false;
  let detectedOuterDepth = 0;

  for (const seg of segments) {
    // ลบคำว่า "ปั๊มป้องกันน้ำท่วม" ออกจากเซกเมนต์เพื่อป้องกันคำว่า "น้ำท่วม" ไปหลอกการตรวจจับ
    const cleanedSeg = seg.replace(/(?:ปั๊ม|ปั้ม|เครื่องสูบ|ระบบ)\s*ป้องกันน้ำท่วม/gi, 'ปั๊มระบายน้ำ');

    // ตรวจสอบว่าเซกเมนต์นี้เกี่ยวข้องกับ ถนนหน้าโครงการ / ถนนนอก / ทางเข้า / ถนนภาระจำยอม / ผิวจราจร หรือไม่
    const isOuterRoadTarget = /(?:ถนนหน้าโครงการ|หน้าโครงการ|ถนนนอก|ถนนภายนอก|ถนนภาระจำยอม|ภาระจำยอม|ทางเข้า|ซอย|ผิวจราจรนอก)/i.test(cleanedSeg);
    const isGeneralRoadTarget = /(?:ผิวจราจร|ถนน|ผิวถนน)/i.test(cleanedSeg) && !/(?:ถนนในโครงการ|ในโครงการ)/i.test(cleanedSeg);

    // ตรวจสอบข้อความปฏิเสธ / แห้ง (Explicit Negation / Dryness)
    const isDrySeg = /(?:ไม่มีน้ำขัง|ไม่มีน้ำท่วม|ไม่พบน้ำท่วมขัง|ไม่พบน้ำขัง|ไม่ท่วม|แห้งสนิท|แห้ง 100%|แห้งปกติ|เรียบร้อยปกติ|สัญจรได้ปกติ|สัญจรได้คล่องตัว)/i.test(cleanedSeg);

    if ((isOuterRoadTarget || isGeneralRoadTarget) && isDrySeg) {
      hasExplicitOuterDry = true;
    }

    // ตรวจสอบการท่วมของถนนภายนอก (Positive Flood Detection)
    if (isOuterRoadTarget || /ถนนภาระจำยอม|ภาระจำยอม|หน้าโครงการ|ทางเข้า/i.test(cleanedSeg)) {
      // 1. ระบุตัวเลขความลึกน้ำชัดเจน เช่น "น้ำท่วมขัง 10 cm", "มีน้ำขัง 15 ซม."
      const numMatch = cleanedSeg.match(/(?:ท่วมขัง|น้ำท่วมขัง|มีน้ำขัง|น้ำท่วม|ท่วมสูง|รอการระบาย)[^0-9\n]*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i);
      if (numMatch && !isDrySeg) {
        hasExplicitOuterFlood = true;
        detectedOuterDepth = Math.max(detectedOuterDepth, parseFloat(numMatch[1]));
      }

      // 2. ระดับหมุดหมายกายภาพ (Physical Landmark Depths)
      if (!isDrySeg) {
        if (/ระดับเอว|เสมอเอว|ถึงเอว/i.test(cleanedSeg)) {
          hasExplicitOuterFlood = true;
          detectedOuterDepth = Math.max(detectedOuterDepth, 75);
        } else if (/ระดับเข่า|เสมอเข่า|ถึงเข่า/i.test(cleanedSeg)) {
          hasExplicitOuterFlood = true;
          detectedOuterDepth = Math.max(detectedOuterDepth, 35);
        } else if (/ครึ่งล้อ|เสมอขอบล้อ|ดุมล้อ/i.test(cleanedSeg)) {
          hasExplicitOuterFlood = true;
          detectedOuterDepth = Math.max(detectedOuterDepth, 30);
        } else if (/ระดับแข้ง|ครึ่งแข้ง|ถึงแข้ง/i.test(cleanedSeg)) {
          hasExplicitOuterFlood = true;
          detectedOuterDepth = Math.max(detectedOuterDepth, 20);
        } else if (/ท่วมมิดฟุตบาท|ล้นข้ามฟุตบาท|ท่วมเลยฟุตบาท|มิดทางเท้า/i.test(cleanedSeg)) {
          hasExplicitOuterFlood = true;
          detectedOuterDepth = Math.max(detectedOuterDepth, 15);
        } else if (/(?:ท่วม|น้ำท่วม|น้ำขัง|เอ่อ|ล้น|สูง)[^-\n•;>>]*?(?:ระดับฟุตบาท|เสมอระดับฟุตบาท|ระดับเดียวกับฟุตบาท|ถึงระดับฟุตบาท|ปริ่มฟุตบาท|เสมอทางเท้า|ระดับทางเท้า|เสมอขอบทาง)/i.test(cleanedSeg) ||
                   /(?:ระดับฟุตบาท|เสมอระดับฟุตบาท|ระดับเดียวกับฟุตบาท)[^-\n•;>>]*?(?:ท่วม|น้ำท่วม|น้ำขัง)/i.test(cleanedSeg)) {
          hasExplicitOuterFlood = true;
          detectedOuterDepth = Math.max(detectedOuterDepth, 10);
        } else if (/ระดับตาตุ่ม|เสมอตาตุ่ม|ถึงตาตุ่ม/i.test(cleanedSeg)) {
          hasExplicitOuterFlood = true;
          detectedOuterDepth = Math.max(detectedOuterDepth, 10);
        } else if (/(?:มีน้ำท่วมขัง|น้ำท่วมขัง|ท่วมขัง|น้ำท่วม|มีน้ำขัง)/i.test(cleanedSeg) && !isDrySeg) {
          hasExplicitOuterFlood = true;
          detectedOuterDepth = Math.max(detectedOuterDepth, 10);
        }
      }
    }
  }

  if (hasExplicitOuterFlood) {
    outerRoadWaterDepth = detectedOuterDepth || 10;
  } else if (hasExplicitOuterDry) {
    outerRoadWaterDepth = 0;
  } else if (/แห้ง|ปกติ|เรียบร้อย/i.test(report.waterLevel || '') && !/ท่วม|ขัง/i.test(report.waterLevel || '')) {
    outerRoadWaterDepth = 0;
  } else if (isCanalOverflow && canalWaterElevation > 0 && canalSource === 'FIELD_REPORT') {
    if (hasFloodwall) {
      // มีเขื่อนคอนกรีตกั้น: น้ำต้องสูงเกินสันเขื่อน คสล. จึงจะล้นท่วมถนน
      outerRoadWaterDepth = Math.max(0, Math.round((canalWaterElevation - (floodwallHeightDiff || 0.40)) * 100));
    } else {
      // ไม่มีเขื่อนคอนกรีตริมคลอง: น้ำคลองล้นตลิ่งท่วมผิวถนนทันที
      outerRoadWaterDepth = Math.round(canalWaterElevation * 100);
    }
  } else if (isCanalOverflow && canalWaterElevation > 0 && canalSource === 'LIVE_TELEMETRY' && !hasFieldReport) {
    if (hasFloodwall) {
      outerRoadWaterDepth = Math.max(0, Math.round((canalWaterElevation - (floodwallHeightDiff || 0.40)) * 100));
    } else {
      outerRoadWaterDepth = Math.round(canalWaterElevation * 100);
    }
  } else {
    outerRoadWaterDepth = 0;
  }

  if (outerRoadWaterDepth > 0) {
    const depthDetail = outerRoadWaterDepth >= 70 ? 'ระดับเอว' : (outerRoadWaterDepth >= 30 ? 'ระดับเข่า' : (outerRoadWaterDepth >= 10 ? 'ระดับฟุตบาท' : 'รอการระบาย'));
    outerRoadConditionText = `มีน้ำท่วมขัง ${outerRoadWaterDepth} ซม. (${depthDetail})`;
  } else if (isCanalOverflow) {
    const overflowCm = Math.round(Math.abs(canalWaterElevation) * 100);
    if (hasFloodwall) {
      outerRoadConditionText = `แห้งสนิท สัญจรได้คล่องตัว (น้ำคลอง +${overflowCm} ซม. มีเขื่อนคอนกรีตกั้น)`;
    } else {
      outerRoadConditionText = `คลองภายนอกล้นตลิ่ง ${overflowCm} ซม. เสี่ยงน้ำเอ่อเข้าถนนภายนอก (ไม่มีแนวเขื่อนกั้น)`;
    }
  } else if (hasFieldReport) {
    outerRoadConditionText = 'แห้งสนิท สัญจรได้คล่องตัว (0 ซม.)';
  } else {
    outerRoadConditionText = 'รอข้อมูลตรวจเช็คสภาพถนนหน้าโครงการ';
  }

  // 5. วิเคราะห์ระดับน้ำบนถนนในโครงการ (Inner Road Water)
  if (outerRoadWaterDepth > effectiveBarrier) {
    innerRoadWaterDepth = outerRoadWaterDepth - effectiveBarrier;
  } else {
    const innerFloodMatch = rawNotes.match(/(?:ในโครงการ|ถนนใน|ถนนเมนโครงการ)[^0-9\n]*(?:ท่วม|ขัง)\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i);
    if (innerFloodMatch) {
      innerRoadWaterDepth = parseFloat(innerFloodMatch[1]);
    } else {
      innerRoadWaterDepth = 0; // ในโครงการแห้งสนิท เพราะยกพื้น/มีเนิน รปภ. กั้นน้ำบ่า
    }
  }

  // ระยะความปลอดภัย (Safety Freeboard Margin)
  const safetyMargin = effectiveBarrier - outerRoadWaterDepth;

  const isCanalHigh = isCanalOverflow || canalWaterElevation >= -0.15 || status === 'WATCH' || status === 'CRITICAL' || /หนุน|ล้น|สูง|ริมฟุตบาท/i.test(report.drainageCondition || '');
  const flapValve = isCanalHigh ? 'CLOSED' : 'OPEN';
  const pumpStatus = (isCanalOverflow || outerRoadWaterDepth > 0 || status === 'CRITICAL') ? 'ACTIVE' : (isCanalHigh ? 'STANDBY' : 'READY');

  return {
    hasFieldReport,
    canalWaterElevation: Number(canalWaterElevation.toFixed(2)),
    canalBelowOuter: Math.round(canalBelowOuter),
    canalBelowInner: Math.round(canalBelowInner),
    canalStatusText,
    canalSource,
    isCanalOverflow,
    outerRoadWaterDepth: Math.round(outerRoadWaterDepth),
    innerRoadWaterDepth: Math.round(innerRoadWaterDepth),
    roadWaterDepth: Math.round(innerRoadWaterDepth), // ความลึกน้ำในโครงการ
    innerElevation: Math.round(innerElevation),
    hasEntranceCrest,
    entranceCrestDiff,
    crestElevation,
    effectiveBarrier: Math.round(effectiveBarrier),
    safetyMargin: Math.round(safetyMargin),
    outerRoadConditionText,
    innerSource,
    asBuiltElevationDiff: typeof project?.asBuiltElevationDiff === 'number' ? project.asBuiltElevationDiff : 0.80,
    asBuiltBenchmarkMSL: project?.asBuiltBenchmarkMSL || null,
    asBuiltNotes: project?.asBuiltNotes || null,
    hasFloodwall,
    floodwallHeightDiff,
    floodwallElevation,
    outerElevation: 0,  // เกณฑ์อ้างอิงถนนภายนอก (0 ซม.)
    canalElevation: Number(canalWaterElevation.toFixed(2)),
    flapValve,
    pumpStatus
  };
}

// สร้าง HTML สำหรับหน้า Map Dashboard
export function generateFloodMapHtml({ projectsData = [], summaryStats = {}, generatedAtThai = '' }) {
  const safeDataJson = JSON.stringify(projectsData).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>LH Flood Monitoring Map | แผนที่ติดตามสถานการณ์น้ำและระบบระบายน้ำ Real-time</title>
  
  <!-- High Performance CDN Connections -->
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <link rel="preconnect" href="https://server.arcgisonline.com" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Leaflet CSS & MarkerCluster CSS (Cloudflare CDN Edge in Bangkok) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.min.css"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.min.css"/>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Prompt', 'sans-serif'],
          },
          colors: {
            lh: {
              navy: '#0f2e4a',
              gold: '#bca374',
              goldHover: '#a38a5b',
              dark: '#0a1e30',
              accent: '#1e40af'
            }
          }
        }
      }
    }
  </script>

  <style>
    body { font-family: 'Prompt', sans-serif; background-color: #0f172a; margin: 0; padding: 0; overflow: hidden; }
    #map { height: 100vh; width: 100vw; z-index: 1; }

    /* Custom MarkerCluster Styling */
    .custom-cluster-icon {
      background: transparent !important;
      border: none !important;
    }
    .cluster-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      border: 2.5px solid #ffffff;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .cluster-badge:hover {
      transform: scale(1.15);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
    }

    /* Custom Leaflet Marker Styling */
    .custom-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .marker-pin {
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      position: absolute;
      transform: rotate(-45deg);
      left: 50%;
      top: 50%;
      margin: -20px 0 0 -16px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .marker-pin:hover {
      transform: rotate(-45deg) scale(1.15);
      box-shadow: 0 6px 14px rgba(0,0,0,0.5);
    }
    .marker-icon {
      transform: rotate(45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-weight: bold;
    }
    .marker-label {
      position: absolute;
      top: -24px;
      white-space: nowrap;
      background: rgba(15, 23, 42, 0.9);
      color: #f8fafc;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.25);
      box-shadow: 0 2px 5px rgba(0,0,0,0.25);
      pointer-events: none;
    }

    /* Pulse Animations */
    .pulse-ring {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      animation: pulsate 2s infinite ease-out;
      pointer-events: none;
      margin: -22px 0 0 -22px;
    }
    @keyframes pulsate {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }

    /* Cross Section SVG Styling */
    .cross-section-svg {
      width: 100%;
      height: 180px;
      background: linear-gradient(180deg, #09131f 0%, #0d1b2a 100%);
      border-radius: 12px;
      border: 1px solid #1e293b;
    }

    /* Glassmorphism Panel */
    .glass-panel {
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
  </style>
</head>
<body class="relative text-slate-100 antialiased selection:bg-lh-gold selection:text-slate-900">

  <!-- Top Floating Header & Stats Bar -->
  <header class="fixed top-3 left-3 right-3 z-30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 p-2.5 md:p-3 rounded-2xl glass-panel shadow-2xl">
    <!-- Brand / Title -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-lh-navy to-slate-900 flex items-center justify-center border border-lh-gold/40 shadow-inner shrink-0">
        <span class="text-lh-gold font-black text-lg tracking-wider">LH</span>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-sm md:text-base font-bold text-white tracking-wide flex items-center gap-1.5">
            <span>แผนที่ติดตามสถานการณ์น้ำและระบบระบายน้ำ Real-time</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">LIVE</span>
          </h1>
        </div>
        <p class="text-[11px] text-slate-400 hidden sm:block">
          ระบบสารสนเทศภูมิศาสตร์ (GIS) เฝ้าระวังระดับน้ำและพยากรณ์อากาศ 30 โครงการ แลนด์ แอนด์ เฮ้าส์
        </p>
      </div>
    </div>

    <!-- Quick Metrics & Actions -->
    <div class="flex flex-wrap items-center gap-2 justify-between md:justify-end">
      <!-- Counters -->
      <div class="flex items-center gap-1.5 text-xs bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-700/60 shadow-inner">
        <div class="flex items-center gap-1 px-1.5" title="โครงการทั้งหมดในฐานข้อมูล">
          <span class="text-slate-400">ทั้งหมด:</span>
          <span class="font-bold text-white" id="stat-total">${summaryStats.total || projectsData.length}</span>
        </div>
        <div class="h-3 w-px bg-slate-700"></div>
        <div class="flex items-center gap-1 px-1.5 text-emerald-400" title="สถานะปกติ">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="font-bold" id="stat-normal">${summaryStats.normal || 0}</span>
        </div>
        <div class="h-3 w-px bg-slate-700"></div>
        <div class="flex items-center gap-1 px-1.5 text-amber-400" title="เฝ้าระวังน้ำหนุน / ฝนหนัก">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span class="font-bold" id="stat-watch">${summaryStats.watch || 0}</span>
        </div>
        <div class="h-3 w-px bg-slate-700"></div>
        <div class="flex items-center gap-1 px-1.5 text-rose-400" title="วิกฤติ / น้ำขัง">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          <span class="font-bold" id="stat-critical">${summaryStats.critical || 0}</span>
        </div>
        <div class="h-3 w-px bg-slate-700"></div>
        <div class="flex items-center gap-1 px-1.5 text-slate-400" title="ยังไม่มีรายงานตรวจรอบนี้">
          <span class="w-2 h-2 rounded-full bg-slate-500"></span>
          <span class="font-bold" id="stat-pending">${summaryStats.pending || 0}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <a href="/api/flood-report?mode=asbuilt" class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/60 transition-colors shadow-sm" title="จัดการระดับความสูงตามแบบก่อสร้างจริง As-Built">
          <span>📐</span>
          <span class="hidden sm:inline">จัดการ As-Built</span>
          <span class="sm:hidden">As-Built</span>
        </a>

        <a href="/api/flood-report?mode=executive" class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-lh-gold/20 hover:bg-lh-gold/30 text-lh-gold border border-lh-gold/40 transition-colors shadow-sm" title="เปิดหน้ารายงานสรุปผู้บริหาร">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span class="hidden sm:inline">รายงานผู้บริหาร</span>
          <span class="sm:hidden">รายงาน</span>
        </a>

        <button onclick="window.location.reload()" class="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors" title="รีเฟรชข้อมูลล่าสุด">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Filter & Layer Controls (Floating Left) -->
  <aside class="fixed top-28 md:top-24 left-3 z-20 flex flex-col gap-2 max-w-[280px] sm:max-w-xs pointer-events-auto">
    <!-- Zone Selector -->
    <div class="glass-panel p-2 rounded-2xl shadow-xl flex flex-col gap-1.5">
      <div class="flex items-center justify-between px-1">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">เลือกพื้นที่โครงการ</span>
        <span class="text-[10px] text-lh-gold" id="filter-count">แสดง ${projectsData.length}/${projectsData.length}</span>
      </div>
      <div class="flex flex-wrap gap-1" id="zone-filter-container">
        <button onclick="setZoneFilter('all')" class="zone-btn active px-2 py-1 rounded-lg text-[11px] font-semibold bg-lh-gold text-slate-950 transition-all shadow-xs" data-zone="all">ทั้งหมด</button>
        <button onclick="setZoneFilter('rangsit')" class="zone-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="rangsit">รังสิต-ปทุมฯ</button>
        <button onclick="setZoneFilter('ayutthaya')" class="zone-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="ayutthaya">อยุธยา</button>
        <button onclick="setZoneFilter('nonthaburi')" class="zone-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="nonthaburi">นนทบุรี-บางใหญ่</button>
        <button onclick="setZoneFilter('krungthep_kreetha')" class="zone-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="krungthep_kreetha">กรุงเทพกรีฑา</button>
        <button onclick="setZoneFilter('ramindra')" class="zone-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="ramindra">รามอินทรา-สายไหม</button>
        <button onclick="setZoneFilter('romklao')" class="zone-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="romklao">ร่มเกล้า-ลาดกระบัง</button>
        <button onclick="setZoneFilter('thonburi')" class="zone-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="thonburi">ฝั่งธนบุรี</button>
        <button onclick="setZoneFilter('south_bangna')" class="zone-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all" data-zone="south_bangna">พระราม 2-บางนา</button>
      </div>

      <!-- Secondary Filters: Outer Flood Triage, Risk & Radar -->
      <div class="pt-1.5 border-t border-slate-700/60 grid grid-cols-3 gap-1">
        <button onclick="toggleOuterFloodOnly()" id="outer-flood-btn" class="flex items-center justify-center gap-0.5 px-1 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-amber-300 hover:text-white border border-slate-700 transition-all text-center" title="คัดกรองเฉพาะโครงการที่ถนนภายนอก/ซอยมีน้ำท่วมขัง">
          <span>🚨 ถนนนอก</span>
        </button>
        <button onclick="toggleRiskOnly()" id="risk-only-btn" class="flex items-center justify-center gap-0.5 px-1 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all text-center" title="คัดกรองเฉพาะจุดเฝ้าระวังและวิกฤติ">
          <span>⚠️ เฝ้าระวัง</span>
        </button>
        <button onclick="toggleRadarLayer()" id="radar-toggle-btn" class="flex items-center justify-center gap-0.5 px-1 py-1 rounded-lg text-[10px] font-semibold bg-blue-900/40 text-blue-300 hover:text-blue-100 border border-blue-700/50 transition-all text-center" title="เปิด/ปิด แผ่นเรดาร์ฝน RainViewer">
          <span>🌧️ เรดาร์สด</span>
        </button>
      </div>

      <!-- Basemap Switcher (Free, No API Key, No Watermark) -->
      <div class="pt-1.5 border-t border-slate-700/60 flex flex-col gap-1">
        <div class="flex items-center justify-between px-0.5">
          <span class="text-[10px] font-semibold text-slate-400">รูปแบบแผนที่ (Basemap)</span>
          <span class="text-[9px] text-emerald-400 font-mono">100% Free / ชัดเจน</span>
        </div>
        <div class="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/80">
          <button onclick="switchBaseMap('street')" id="btn-bm-street" class="flex-1 py-1 px-1 rounded text-[10px] font-bold bg-lh-gold text-slate-950 transition-all text-center shadow-xs">🏙️ แผนที่เร็วสูง (Esri)</button>
          <button onclick="switchBaseMap('osm')" id="btn-bm-osm" class="flex-1 py-1 px-1 rounded text-[10px] font-medium text-slate-300 hover:text-white transition-all text-center">🗺️ ถนน (OSM)</button>
          <button onclick="switchBaseMap('satellite')" id="btn-bm-satellite" class="flex-1 py-1 px-1 rounded text-[10px] font-medium text-slate-300 hover:text-white transition-all text-center">🛰️ ดาวเทียม</button>
        </div>
      </div>

      <!-- Clustering Toggle -->
      <div class="pt-1 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 px-0.5">
        <span>รวมกลุ่มหมุด (Clustering)</span>
        <button onclick="toggleClustering()" id="btn-cluster-toggle" class="px-2 py-0.5 rounded-md font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all">เปิด (กลุ่ม)</button>
      </div>
    </div>

    <!-- Quick Legend -->
    <div class="glass-panel p-2 rounded-xl text-[10px] text-slate-400 space-y-1 shadow-lg hidden sm:block">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
        <span class="text-slate-300 font-medium">ปกติ:</span> คลองต่ำกว่าเกณฑ์ ถนนแห้ง 100%
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
        <span class="text-slate-300 font-medium">เฝ้าระวัง:</span> คลองหนุนสูง ปิด Flap Valve
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
        <span class="text-slate-300 font-medium">วิกฤติ:</span> น้ำขังผิวถนน / เดินเครื่องสูบน้ำ
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0"></span>
        <span class="text-slate-300 font-medium">รอตรวจ:</span> ยังไม่มีการส่งรายงานรอบนี้
      </div>
    </div>
  </aside>

  <!-- Interactive Map Canvas -->
  <main id="map"></main>

  <!-- Project Detail Drawer (Slide-in Right on Desktop / Bottom Sheet on Mobile) -->
  <section id="project-drawer" class="fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[460px] md:w-[500px] glass-panel bg-slate-950/95 border-l border-slate-800 shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out flex flex-col pointer-events-auto">
    <!-- Drawer Header -->
    <div class="p-4 border-b border-slate-800/80 flex items-start justify-between gap-3 bg-slate-900/60 shrink-0">
      <div class="space-y-0.5">
        <div class="flex items-center gap-2">
          <span id="drawer-code" class="px-2 py-0.5 rounded-md text-xs font-black bg-lh-gold text-slate-950">NE-419</span>
          <span id="drawer-status-badge" class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ปกติ (NORMAL)</span>
        </div>
        <h2 id="drawer-name" class="text-lg font-bold text-white leading-snug">Villaggio รังสิตคลอง 4</h2>
        <p id="drawer-area" class="text-xs text-slate-400">คลองสี่, ธัญบุรี, ปทุมธานี</p>
      </div>
      <button onclick="closeDrawer()" class="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Drawer Content (Scrollable 4-Pillar Architecture) -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

      <!-- ========================================== -->
      <!-- 📋 หมวด 1: สถานะตรวจวัดจริงหน้างาน (Field Reality / Ground Truth) -->
      <!-- แหล่งข้อมูล: วิศวกรโครงการ Land & Houses & การตรวจเช็คจริง -->
      <!-- ========================================== -->
      <div class="bg-slate-900/90 rounded-2xl p-3.5 border border-emerald-900/50 space-y-2.5 shadow-md">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <h3 class="font-bold text-white text-xs flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>หมวด 1: สถานะตรวจวัดจริงหน้างาน</span>
            </h3>
            <p class="text-[9px] text-slate-400">แหล่งข้อมูล: วิศวกรประจำโครงการ LH (Ground Truth)</p>
          </div>
          <span id="field-updated-at" class="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">-</span>
        </div>

        <!-- Case 1: ยังไม่มีการส่งรายงานจากหน้างานรอบนี้ -->
        <div id="field-empty-box" class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-1 hidden">
          <div class="text-slate-400 font-semibold text-xs flex items-center justify-center gap-1.5">
            <span>⚪ ยังไม่มีการส่งรายงานตรวจเช็คหน้างานในรอบนี้</span>
          </div>
          <p class="text-[10px] text-slate-500 leading-relaxed">
            ยังไม่มีเจ้าหน้าที่โครงการส่งผลสำรวจจริง ข้อมูลที่แสดงประเมินจากโทรมาตรสถานีน้ำใกล้เคียงและแบบก่อสร้างจริง (As-Built)
          </p>
        </div>

        <!-- 2-Zone Ground Reality Grid -->
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <!-- Zone 1: ถนนหน้าโครงการ / ซอยทางเข้า -->
          <div class="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <div class="flex items-center justify-between text-[10px] font-semibold text-slate-400">
              <span>🚗 ถนนหน้าโครงการ / ซอย</span>
              <span class="text-[9px] text-slate-500 font-mono">ภายนอก</span>
            </div>
            <div id="dz-outer-depth" class="text-sm font-bold text-slate-200">แห้งสนิท (0 ซม.)</div>
            <div class="text-[9px] text-slate-400 leading-tight">
              <span class="text-slate-500 block">แหล่งข้อมูล:</span>
              <span id="dz-outer-source" class="text-sky-300">-</span>
            </div>
          </div>

          <!-- Zone 2: ภายในโครงการ (LH Ground Truth) -->
          <div class="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <div class="flex items-center justify-between text-[10px] font-semibold">
              <span class="text-slate-400">🏡 ภายในโครงการ</span>
              <span id="dz-inner-elev-tag" class="text-[9px] text-sky-400 font-mono">ยก +0.80 ม.</span>
            </div>
            <div id="dz-inner-depth" class="text-sm font-bold text-emerald-400">แห้ง 100% (น้ำไม่ท่วม)</div>
            <div class="text-[9px] text-slate-400 leading-tight">
              <span class="text-slate-500 block">ระยะปลอดภัย (Freeboard):</span>
              <span id="dz-safety-margin" class="font-bold text-emerald-400">+80 ซม. เหนือน้ำนอก</span>
            </div>
          </div>
        </div>

        <!-- Drainage Condition & Pumps -->
        <div id="field-data-box" class="space-y-1.5 text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <div class="flex items-center justify-between">
            <div><strong class="text-slate-400">สภาพผิวจราจร:</strong> <span id="field-water" class="text-white">-</span></div>
            <span id="dz-status-tag" class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">Two-Zone Analysis</span>
          </div>
          <div><strong class="text-slate-400">สภาพคลอง/ทางน้ำ:</strong> <span id="field-canal" class="text-white">-</span></div>
          <div><strong class="text-slate-400">สถานะเครื่องสูบน้ำ:</strong> <span id="field-pumps" class="text-white">-</span></div>
        </div>

        <!-- Photos Section -->
        <div id="photos-section" class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span>ภาพถ่ายสำรวจหน้างาน (<span id="photo-count">0</span> ภาพ)</span>
            <span class="text-[10px] text-lh-gold">คลิกเพื่อดูภาพขยาย</span>
          </div>
          <div id="photos-grid" class="grid grid-cols-4 gap-1.5">
            <!-- Dynamic Thumbnails -->
          </div>
        </div>

        <!-- Actionable Field Reporting Tool for Engineers -->
        <div class="pt-1 border-t border-slate-800/80 flex items-center gap-2">
          <a id="btn-line-report" href="https://line.me" target="_blank" class="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-[#06C755]/15 hover:bg-[#06C755]/25 border border-[#06C755]/40 text-[#06C755] font-semibold text-[11px] transition-all" title="แชร์สรุปสถานการณ์โครงการนี้เข้า LINE กลุ่มประจำพื้นที่">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.82 2 10.53c0 2.92 1.76 5.51 4.5 7.02-.2.74-.71 2.7-1.15 3.37-.1.14-.04.3.1.22.8-.46 3.6-2.4 4.55-3.05.65.1 1.32.16 2 .16 5.52 0 10-3.82 10-8.53S17.52 2 12 2z"/></svg>
            <span>แชร์สรุปสถานการณ์เข้า LINE กลุ่ม</span>
          </a>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 🌊 หมวด 2: โทรมาตรลุ่มน้ำ & คลองสายหลัก (Basin & Canal Telemetry) -->
      <!-- แหล่งข้อมูล: คลังข้อมูลน้ำแห่งชาติ สสน. / กรมชลประทาน (ThaiWater API) -->
      <!-- ========================================== -->
      <div class="bg-slate-900/90 rounded-2xl p-3.5 border border-blue-900/50 space-y-2.5 shadow-md">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <h3 class="font-bold text-white text-xs flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              <span>หมวด 2: โทรมาตรลุ่มน้ำ & คลองสายหลัก</span>
            </h3>
            <p class="text-[9px] text-slate-400">แหล่งข้อมูล: คลังข้อมูลน้ำแห่งชาติ สสน. / กรมชลประทาน (ThaiWater)</p>
          </div>
          <div class="flex items-center gap-1">
            <span id="cs-freshness-badge" class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 สด Realtime</span>
          </div>
        </div>

        <!-- Live Telemetry Station Card -->
        <div class="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/50 space-y-1.5 text-[10px]">
          <div class="flex items-center justify-between gap-1">
            <div class="flex items-center gap-1.5">
              <span id="cs-live-dot" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-slate-400">สถานีโทรมาตร:</span>
              <a id="cs-station-link" href="https://www.thaiwater.net/" target="_blank" class="font-bold text-sky-300 hover:underline flex items-center gap-0.5" title="เปิดข้อมูลสถานีสดบน ThaiWater">
                <span id="cs-station-name">-</span>
                <span class="text-[9px]">↗</span>
              </a>
            </div>
            <span id="cs-sensor-time" class="text-slate-400 font-mono text-[9px]">-</span>
          </div>
          <div class="grid grid-cols-2 gap-1.5 pt-0.5">
            <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
              <span class="text-slate-400 block text-[9px]">ระดับน้ำเซ็นเซอร์ (ม.รทก.)</span>
              <span id="cs-sensor-msl" class="font-mono text-white font-bold text-xs">- ม.รทก.</span>
            </div>
            <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
              <span class="text-slate-400 block text-[9px]">ระยะเทียบตลิ่ง / สภาพน้ำ</span>
              <span id="cs-sensor-diff" class="font-semibold text-sky-400 text-xs">-</span>
            </div>
          </div>
        </div>

        <!-- ⚡ Interactive What-If Simulation Toolbar -->
        <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="text-amber-400 font-bold text-[10px]">⚡ จำลองระดับน้ำ (Interactive What-If):</span>
              <span id="sim-status-label" class="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">โหมด: โทรมาตรสด</span>
            </div>
            <button type="button" onclick="resetCanalSimulation()" id="btn-sim-reset" class="text-[9px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors shadow-xs">
              🔄 คืนค่าสด
            </button>
          </div>

          <!-- Quick Scenario Buttons -->
          <div class="grid grid-cols-4 gap-1 text-[9px] font-semibold text-center">
            <button type="button" onclick="setCanalSimulation('live')" id="sim-btn-live" class="sim-btn py-1 px-1 rounded-lg bg-sky-600 text-white shadow-xs transition-all">
              📡 สด (Live)
            </button>
            <button type="button" onclick="setCanalSimulation('rain20')" id="sim-btn-rain20" class="sim-btn py-1 px-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all">
              🌧️ ฝน +20cm
            </button>
            <button type="button" onclick="setCanalSimulation('tide50')" id="sim-btn-tide50" class="sim-btn py-1 px-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all">
              🌊 น้ำหนุน +50cm
            </button>
            <button type="button" onclick="setCanalSimulation('flood80')" id="sim-btn-flood80" class="sim-btn py-1 px-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all">
              🚨 หลากท่วม +80cm
            </button>
          </div>

          <!-- Interactive Slider -->
          <div class="space-y-1 pt-0.5">
            <div class="flex items-center justify-between text-[9px] text-slate-400">
              <span>ปรับระดับน้ำคลองจำลอง (เทียบระดับถนน 0.00 ม.):</span>
              <span id="slider-val-txt" class="font-mono font-bold text-sky-400">-0.40 ม.</span>
            </div>
            <input type="range" id="canal-sim-slider" min="-180" max="120" step="5" value="-40" oninput="onCanalSliderChange(this.value)" class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400">
            <div class="flex justify-between text-[8px] text-slate-500 font-mono px-0.5">
              <span>-1.80 ม. (แห้งปกติ)</span>
              <span>-0.80 ม.</span>
              <span>0.00 ม. (เสมอถนน)</span>
              <span>+0.80 ม. (เสมอถนนใน)</span>
              <span>+1.20 ม. (ล้นท่วม)</span>
            </div>
          </div>
        </div>

        <!-- Dynamic SVG Diagram (Hydrological 3-Tier Cross-Section) -->
        <div class="relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950 p-2">
          <svg id="cross-section-graphic" class="w-full h-44" viewBox="0 0 460 170" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Sky Gradient Background -->
            <rect width="460" height="170" fill="url(#sky-grad)"/>

            <!-- Ground: Internal Road (Left) elevated -->
            <path id="svg-inner-road" d="M 0,80 L 160,80 L 170,110 L 170,170 L 0,170 Z" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
            <!-- Road Surface: Outer Road (Middle) 0cm -->
            <path d="M 170,110 L 320,110 L 330,135 L 330,170 L 170,170 Z" fill="#334155" stroke="#475569" stroke-width="1.5"/>
            <!-- Canal Bed (Right) -140cm -->
            <path d="M 330,135 L 460,135 L 460,170 L 330,170 Z" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>

            <!-- House / Villa Icon on Inner Road -->
            <g id="svg-house-group" transform="translate(45, 42)">
              <polygon points="20,0 40,18 0,18" fill="#bca374" opacity="0.9"/>
              <rect x="5" y="18" width="30" height="20" fill="#cbd5e1"/>
              <rect x="15" y="24" width="10" height="14" fill="#0f2e4a"/>
            </g>

            <!-- Guardhouse Crest Hump Group (Hidden by default, shown if project has entrance crest) -->
            <g id="svg-crest-group" style="display:none;" transform="translate(146, 60)">
              <rect x="0" y="0" width="18" height="13" fill="#0f2e4a" stroke="#cbd5e1" stroke-width="1" rx="2"/>
              <polygon points="9,-4 20,2 -2,2" fill="#eab308"/>
              <rect x="5" y="5" width="8" height="8" fill="#38bdf8" opacity="0.7"/>
              <text x="9" y="-6" fill="#f59e0b" font-size="7.5" font-weight="700" text-anchor="middle" id="svg-crest-txt">เนิน รปภ. +0.80ม.</text>
            </g>

            <!-- Canal Water (Dynamic Height) -->
            <rect id="svg-canal-water" x="330" y="125" width="130" height="45" fill="url(#water-grad)" opacity="0.85"/>
            <!-- Animated Water Waves -->
            <path id="svg-water-line" d="M 330,125 Q 360,123 395,125 T 460,125" stroke="#38bdf8" stroke-width="2" fill="none"/>

            <!-- Road Water (Puddle) if any -->
            <rect id="svg-road-water" x="170" y="108" width="150" height="2" fill="#0284c7" opacity="0.6"/>

            <!-- Flap Valve Connector (Under road culvert) -->
            <circle cx="325" cy="130" r="7" fill="#0f172a" stroke="#cbd5e1" stroke-width="2"/>
            <line id="svg-flap-valve" x1="325" y1="130" x2="331" y2="124" stroke="#eab308" stroke-width="3" stroke-linecap="round"/>

            <!-- Concrete Floodwall / เขื่อนคอนกรีต คสล. ริมคลอง -->
            <g id="svg-floodwall-group" style="display:none;">
              <rect x="322" y="124" width="8" height="11" fill="#475569" opacity="0.7"/>
              <rect id="svg-floodwall" x="323" y="96" width="7" height="28" fill="#64748b" stroke="#475569" stroke-width="1" rx="1"/>
              <rect id="svg-floodwall-cap" x="321" y="94" width="11" height="3" fill="#94a3b8" rx="0.5"/>
              <text id="svg-floodwall-txt" x="326" y="89" fill="#94a3b8" font-size="6.5" font-weight="700" text-anchor="middle">เขื่อนริมคลอง</text>
            </g>

            <!-- 3-Zone Engineering HUD Badges -->
            <rect x="8" y="6" width="144" height="32" rx="5" fill="#0f172a" fill-opacity="0.9" stroke="#334155" stroke-width="1"/>
            <text x="14" y="17" fill="#94a3b8" font-size="8" font-weight="600">🏠 ถนนในโครงการ (LH)</text>
            <text id="svg-inner-txt" x="14" y="30" fill="#10b981" font-size="9" font-weight="700">+0.80 ม. (แห้ง 100%)</text>

            <rect x="158" y="6" width="148" height="32" rx="5" fill="#0f172a" fill-opacity="0.9" stroke="#334155" stroke-width="1"/>
            <text x="164" y="17" fill="#94a3b8" font-size="8" font-weight="600">🛣️ ถนนหน้าโครงการ (0.00 ม.)</text>
            <text id="svg-outer-txt" x="164" y="30" fill="#f8fafc" font-size="9" font-weight="700">0.00 ม. (รอตรวจ)</text>

            <rect x="312" y="6" width="140" height="32" rx="5" fill="#0f172a" fill-opacity="0.9" stroke="#334155" stroke-width="1"/>
            <text x="318" y="17" fill="#94a3b8" font-size="8" font-weight="600">🌊 คลองระบายน้ำข้างเคียง</text>
            <text id="svg-canal-txt" x="318" y="30" fill="#38bdf8" font-size="9" font-weight="700">กำลังเชื่อมต่อ...</text>

            <!-- Definitions for Gradients -->
            <defs>
              <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#020617"/>
                <stop offset="100%" stop-color="#0f172a"/>
              </linearGradient>
              <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0284c7" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="#0369a1" stop-opacity="0.95"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <!-- Metrics Comparison Summary Table -->
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">ระดับน้ำคลองเทียบถนนนอก</span>
            <span id="cs-canal-outer" class="font-bold text-sky-400 text-sm">ต่ำกว่า 40 ซม.</span>
            <span id="cs-canal-outer-sub" class="text-[9px] text-slate-500 block">เกณฑ์ควบคุมปกติ</span>
          </div>
          <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-slate-400 block text-[10px]">ระดับน้ำคลองเทียบถนนใน</span>
              <span id="cs-source-tag" class="text-[9px] text-sky-400 font-semibold">📐 As-Built</span>
            </div>
            <span id="cs-canal-inner" class="font-bold text-emerald-400 text-sm">ต่ำกว่า 120 ซม.</span>
            <span id="cs-canal-inner-sub" class="text-[9px] text-slate-400 block">ปลอดภัยสูง (ถมดินยก +0.80 ม.)</span>
          </div>
          <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">บานพับ Flap Valve</span>
            <span id="cs-flap-valve" class="font-bold text-emerald-400">เปิดระบายธรรมชาติ</span>
            <span id="cs-flap-valve-sub" class="text-[9px] text-slate-500 block">ระบายน้ำตามแรงโน้มถ่วง</span>
          </div>
          <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span class="text-slate-400 block text-[10px]">ระบบเครื่องสูบน้ำ</span>
            <span id="cs-pump-status" class="font-bold text-emerald-400">พร้อมใช้งาน 100%</span>
            <span id="cs-pump-status-sub" class="text-[9px] text-slate-500 block">สแตนด์บายลูกลอยอัตโนมัติ</span>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- ⛅ หมวด 3: สภาพอากาศ ฝน และเรดาร์เตือนภัย (Weather & Early Warning) -->
      <!-- แหล่งข้อมูล: Open-Meteo GPS Global Satellite & TMD & RainViewer -->
      <!-- ========================================== -->
      <div class="bg-slate-900/90 rounded-2xl p-3.5 border border-sky-900/50 space-y-2.5 shadow-md">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <h3 class="font-bold text-white text-xs flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>หมวด 3: สภาพอากาศ ฝน และเรดาร์เตือนภัย</span>
            </h3>
            <p class="text-[9px] text-slate-400">แหล่งข้อมูล: Open-Meteo GPS Global Satellite & กรมอุตุนิยมวิทยา</p>
          </div>
          <span class="text-[10px] text-sky-400 font-mono bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-800/60">GPS Real-time</span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center text-xs">
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block">อุณหภูมิ</span>
            <span id="weather-temp" class="text-sm font-bold text-white">31°C</span>
            <span id="weather-cond" class="text-[9px] text-slate-400 block truncate">มีเมฆบางส่วน</span>
          </div>
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block">โอกาสเกิดฝน</span>
            <span id="weather-rain-prob" class="text-sm font-bold text-sky-400">60%</span>
            <span class="text-[9px] text-slate-400 block">24 ชม. ข้างหน้า</span>
          </div>
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block">ฝนสะสมคาดการณ์</span>
            <span id="weather-rain-24h" class="text-sm font-bold text-amber-400">25.0 มม.</span>
            <span class="text-[9px] text-slate-400 block">เกณฑ์เฝ้าระวัง</span>
          </div>
        </div>

        <!-- Hourly Rain Probability Bar -->
        <div class="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] text-slate-400">
            <span>แนวโน้มฝนรายชั่วโมง (Hourly Precipitation Chance)</span>
            <span id="hourly-updated-txt">Open-Meteo Global Model</span>
          </div>
          <div class="grid grid-cols-6 gap-1 text-center font-mono text-[9px]" id="hourly-bars-container">
            <div class="bg-slate-900 p-1 rounded"><span>12:00</span><span class="block font-bold text-sky-400">30%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>15:00</span><span class="block font-bold text-sky-400">65%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>18:00</span><span class="block font-bold text-sky-400">75%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>21:00</span><span class="block font-bold text-sky-400">40%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>00:00</span><span class="block font-bold text-sky-400">20%</span></div>
            <div class="bg-slate-900 p-1 rounded"><span>03:00</span><span class="block font-bold text-sky-400">10%</span></div>
          </div>
        </div>

        <!-- Station & Alerts -->
        <div class="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1 text-[11px]">
          <div class="flex items-start gap-1.5 text-slate-300">
            <span class="text-lh-gold shrink-0">📍</span>
            <div>
              <strong class="text-white">สถานีอ้างอิง:</strong>
              <span id="weather-station">-</span>
            </div>
          </div>
          <div class="flex items-start gap-1.5 text-slate-300">
            <span class="text-amber-400 shrink-0">🌊</span>
            <div>
              <strong class="text-amber-300">สถานการณ์ลุ่มน้ำ:</strong>
              <span id="weather-basin">-</span>
            </div>
          </div>
        </div>

        <!-- Radar Toggle Shortcut -->
        <button type="button" onclick="toggleRadarLayer()" class="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 text-blue-300 font-semibold text-[11px] transition-all">
          <span>🌧️ เปิด/ปิด แผ่นเรดาร์ฝนสด RainViewer บนแผนที่</span>
        </button>

        <!-- External Live Surveillance Links (Windy, GISTDA, Flood Hub) -->
        <div class="pt-1 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px]">
          <a id="link-windy" href="https://www.windy.com" target="_blank" class="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors" title="เปิดแผนที่ลมและเรดาร์สด Windy">
            <span>🌪️ Windy สด</span>
          </a>
          <a id="link-gistda" href="https://disaster.gistda.or.th/" target="_blank" class="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors" title="เปิดแผนที่ดาวเทียมน้ำท่วม GISTDA">
            <span>🛰️ GISTDA</span>
          </a>
          <a id="link-floodhub" href="https://sites.research.google/floods/" target="_blank" class="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors" title="เปิด Google Flood Hub">
            <span>🌐 Flood Hub</span>
          </a>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 📐 หมวด 4: ข้อมูลวิศวกรรม As-Built & แนวคันกั้นน้ำ (LH Engineering Resilience) -->
      <!-- แหล่งข้อมูล: แบบก่อสร้างจริง Land & Houses & การสำรวจหมุดระดับ -->
      <!-- ========================================== -->
      <div class="bg-slate-900/90 rounded-2xl p-3.5 border border-amber-900/50 space-y-2.5 shadow-md">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <h3 class="font-bold text-white text-xs flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-lh-gold"></span>
              <span>หมวด 4: ข้อมูลวิศวกรรม As-Built & แนวคันกั้นน้ำ</span>
            </h3>
            <p class="text-[9px] text-slate-400">แหล่งข้อมูล: แบบก่อสร้างจริง Land & Houses & การสำรวจหมุดระดับ</p>
          </div>
          <span id="cs-asbuilt-badge" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">📐 As-Built: +0.80 ม.</span>
        </div>

        <!-- Engineering Elevation Specs Grid -->
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800 space-y-0.5">
            <span class="text-slate-400 block text-[10px]">🏡 ถนนในโครงการ (As-Built)</span>
            <div id="spec-inner-elev" class="font-bold text-emerald-400 text-xs">+0.80 ม.</div>
            <span class="text-[9px] text-slate-500 block">ยกสูงเหนือถนนภายนอก</span>
          </div>
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800 space-y-0.5">
            <span class="text-slate-400 block text-[10px]">🛡️ สันเนินทางเข้า / ป้อม รปภ.</span>
            <div id="spec-crest-elev" class="font-bold text-amber-400 text-xs">ไม่มีสันเนิน</div>
            <span class="text-[9px] text-slate-500 block">แนวคันกั้นน้ำบ่าภายนอก</span>
          </div>
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800 space-y-0.5">
            <span class="text-slate-400 block text-[10px]">🧱 เขื่อน คสล. ริมคลอง</span>
            <div id="spec-floodwall" class="font-bold text-sky-400 text-xs">ไม่มีแนวเขื่อน</div>
            <span class="text-[9px] text-slate-500 block">กำแพงกันน้ำล้นคลอง</span>
          </div>
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800 space-y-0.5">
            <span class="text-slate-400 block text-[10px]">📏 ระยะปลอดภัย (Freeboard)</span>
            <div id="spec-freeboard" class="font-bold text-emerald-400 text-xs">+80 ซม.</div>
            <span class="text-[9px] text-slate-500 block">ความสูงเหนือผิวน้ำภายนอก</span>
          </div>
        </div>

        <!-- Benchmark Elevation Reference -->
        <div class="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[10px]">
          <span class="text-slate-400">หมุดอ้างอิงระดับ (Benchmark):</span>
          <span id="spec-benchmark-msl" class="font-mono text-white font-semibold">อ้างอิงถนน 0.00 ม.</span>
        </div>

        <!-- วิศวกรรมสังเคราะห์ (Engineering Synthesis Box) -->
        <div id="dz-synthesis-box" class="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-1 text-[11px]">
          <div class="flex items-center gap-1 font-bold text-[10px] text-lh-gold">
            <span>💡 บทสรุปวิศวกรรม (Engineering Synthesis):</span>
          </div>
          <p id="dz-synthesis-text" class="text-slate-300 text-[11px] leading-relaxed">
            -
          </p>
        </div>

        <!-- Shortcut to As-Built Elevation Manager -->
        <div class="pt-1">
          <a id="btn-asbuilt-mgr" href="/api/flood-report?mode=asbuilt" target="_blank" class="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 transition-all font-semibold text-xs shadow-xs" title="เปิดระบบบันทึกและปรับปรุงค่าระดับวิศวกรรม As-Built">
            <span>📐 เปิดระบบจัดการระดับวิศวกรรม As-Built Manager ↗</span>
          </a>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-2 flex items-center gap-2">
        <a id="btn-full-report" href="#" target="_blank" class="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-lh-gold hover:bg-lh-goldHover text-slate-950 font-bold text-xs shadow-lg transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>เปิดรายงานฉบับเต็ม</span>
        </a>
        <a id="btn-gmaps" href="#" target="_blank" class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors">
          <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span>นำทาง</span>
        </a>
      </div>

    </div>
  </section>

  <!-- Image Lightbox Modal -->
  <div id="lightbox" class="fixed inset-0 z-50 bg-black/95 hidden items-center justify-center p-4 backdrop-blur-md" onclick="closeLightbox()">
    <button class="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 rounded-full" onclick="closeLightbox()">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
    <img id="lightbox-img" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/20" src="" alt="ภาพขยาย">
  </div>

  <!-- Leaflet JS & MarkerCluster JS (High Speed Cloudflare Bangkok Edge) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.min.js"></script>

  <!-- Client Script for Map Logic, Cross-Section Rendering & Open-Meteo -->
  <script>
    const PROJECTS = ${safeDataJson};
    let map;
    let markers = [];
    let radarLayer = null;
    let isRadarActive = false;
    let currentFilterZone = 'all';
    let filterRiskOnly = false;
    let filterOuterFloodOnly = false;
    let useClustering = true;
    let clusterGroup = null;
    let currentBasemap = 'street';
    let currentSelectedProject = null;
    let baseCanalElevation = -0.40;
    let currentCanalElevation = -0.40;
    let isSimulationActive = false;
    let currentSimPreset = 'live';

    // High-performance Basemaps with Thai edge CDN caching
    const tileLayers = {
      street: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri | Land & Houses GIS Dashboard',
        maxZoom: 19,
        keepBuffer: 8,
        updateWhenIdle: false,
        updateWhenZooming: true,
        updateInterval: 100
      }),
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap | Land & Houses',
        maxZoom: 19,
        keepBuffer: 4,
        updateWhenIdle: true
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri, Maxar | Land & Houses',
        maxZoom: 19,
        keepBuffer: 6,
        updateWhenIdle: false,
        updateWhenZooming: true
      })
    };

    function switchBaseMap(type) {
      if (!tileLayers[type] || currentBasemap === type) return;
      map.removeLayer(tileLayers[currentBasemap]);
      tileLayers[type].addTo(map);
      currentBasemap = type;
      if (radarLayer && map.hasLayer(radarLayer)) {
        radarLayer.bringToFront();
      }

      const btns = {
        osm: document.getElementById('btn-bm-osm'),
        street: document.getElementById('btn-bm-street'),
        satellite: document.getElementById('btn-bm-satellite')
      };
      for (const key in btns) {
        const btn = btns[key];
        if (!btn) continue;
        if (key === type) {
          btn.className = 'flex-1 py-1 px-1 rounded text-[10px] font-bold bg-lh-gold text-slate-950 transition-all text-center shadow-xs';
        } else {
          btn.className = 'flex-1 py-1 px-1 rounded text-[10px] font-medium text-slate-300 hover:text-white transition-all text-center';
        }
      }
    }

    function initClusterGroup() {
      if (clusterGroup) {
        map.removeLayer(clusterGroup);
      }
      clusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 36,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 14,
        iconCreateFunction: function(cluster) {
          const childMarkers = cluster.getAllChildMarkers();
          let hasCritical = false;
          let hasWatch = false;

          childMarkers.forEach(function(m) {
            const st = m.projectStatus;
            if (st === 'CRITICAL') hasCritical = true;
            if (st === 'WATCH') hasWatch = true;
          });

          let bg = '#10b981'; // Green (NORMAL)
          let border = '#059669';
          if (hasCritical) {
            bg = '#ef4444'; // Red (CRITICAL)
            border = '#991b1b';
          } else if (hasWatch) {
            bg = '#f59e0b'; // Amber (WATCH)
            border = '#b45309';
          }

          return L.divIcon({
            html: '<div class="cluster-badge" style="background:' + bg + '; border-color:' + border + ';">' + cluster.getChildCount() + '</div>',
            className: 'custom-cluster-icon',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
          });
        }
      });
    }

    function toggleClustering() {
      useClustering = !useClustering;
      const btn = document.getElementById('btn-cluster-toggle');
      if (btn) {
        if (useClustering) {
          btn.className = 'px-2 py-0.5 rounded-md font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all';
          btn.innerText = 'เปิด (กลุ่ม)';
        } else {
          btn.className = 'px-2 py-0.5 rounded-md font-semibold bg-slate-700/60 text-slate-400 border border-slate-600/50 transition-all';
          btn.innerText = 'ปิด (แยกหมุด)';
        }
      }
      renderMarkers();
    }

    // Initialize Map
    function initMap() {
      map = L.map('map', {
        center: [13.88, 100.58],
        zoom: 11,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Default High-Performance Basemap: Esri World Street (Instant Bangkok CDN cache)
      tileLayers.street.addTo(map);

      renderMarkers();

      // Fit map bounds to show all 30 projects nicely
      if (PROJECTS.length > 0) {
        const allBounds = L.latLngBounds(PROJECTS.map(function(p) { return [p.lat, p.lon]; }));
        map.fitBounds(allBounds, { padding: [60, 60], maxZoom: 12 });
      }

      // Check URL parameters (e.g. ?focus=NE-419)
      const urlParams = new URLSearchParams(window.location.search);
      const focusCode = urlParams.get('focus') || urlParams.get('project');
      if (focusCode) {
        const target = PROJECTS.find(function(p) { return p.code.toLowerCase() === focusCode.toLowerCase(); });
        if (target) {
          setTimeout(function() {
            selectProject(target.code);
            map.flyTo([target.lat, target.lon], 15, { duration: 1.2 });
          }, 500);
        }
      }
    }

    // Render Markers on Map
    function renderMarkers() {
      if (clusterGroup) {
        clusterGroup.clearLayers();
        map.removeLayer(clusterGroup);
      }
      markers.forEach(function(m) { map.removeLayer(m); });
      markers = [];

      const filtered = PROJECTS.filter(function(p) {
        if (currentFilterZone !== 'all') {
          const area = (p.area || '');
          const name = (p.name || '');
          let matchZone = false;
          if (currentFilterZone === 'rangsit') matchZone = area.includes('ปทุม') || name.includes('รังสิต') || name.includes('ลำลูกกา');
          else if (currentFilterZone === 'ayutthaya') matchZone = area.includes('อยุธยา');
          else if (currentFilterZone === 'nonthaburi') matchZone = area.includes('นนทบุรี') || area.includes('บางใหญ่') || name.includes('ราชพฤกษ์') || name.includes('แจ้งวัฒนะ');
          else if (currentFilterZone === 'krungthep_kreetha') matchZone = area.includes('สะพานสูง') || name.includes('กรุงเทพกรีฑา');
          else if (currentFilterZone === 'ramindra') matchZone = area.includes('คลองสามวา') || area.includes('สายไหม') || area.includes('บางเขน') || name.includes('รามอินทรา') || name.includes('หทัยราษฎร์');
          else if (currentFilterZone === 'romklao') matchZone = area.includes('ลาดกระบัง') || area.includes('มีนบุรี') || name.includes('ร่มเกล้า') || name.includes('ศรีนครินทร์');
          else if (currentFilterZone === 'thonburi') matchZone = area.includes('ทวีวัฒนา') || area.includes('ตลิ่งชัน') || area.includes('หนองแขม') || name.includes('ปิ่นเกล้า') || name.includes('พรานนก') || name.includes('เพชรเกษม');
          else if (currentFilterZone === 'south_bangna') matchZone = area.includes('บางขุนเทียน') || area.includes('สมุทรปราการ') || area.includes('พระสมุทรเจดีย์') || area.includes('บางพลี') || name.includes('พระราม 2') || name.includes('บางนา') || name.includes('สุขสวัสดิ์') || name.includes('ประชาอุทิศ');
          else matchZone = area.includes(currentFilterZone) || name.includes(currentFilterZone);
          if (!matchZone) return false;
        }
        if (filterRiskOnly) {
          if (p.status !== 'WATCH' && p.status !== 'CRITICAL') return false;
        }
        if (filterOuterFloodOnly) {
          const outerDepth = (p.hydro && p.hydro.outerRoadWaterDepth) || Number(p.floodDepthOuter || 0);
          if (outerDepth <= 0) return false;
        }
        return true;
      });

      document.getElementById('filter-count').innerText = 'แสดง ' + filtered.length + '/' + PROJECTS.length;

      if (useClustering) {
        initClusterGroup();
      }

      const boundsList = [];

      filtered.forEach(function(p) {
        const hasReport = Boolean(p.hasReport);
        const status = hasReport ? (p.status || 'NORMAL') : 'NO_REPORT';
        let pinColor = '#10b981'; // Green (NORMAL)
        let ringColor = 'rgba(16, 185, 129, 0.4)';
        let pulseClass = '';
        let markerIcon = '💧';

        if (!hasReport || status === 'NO_REPORT') {
          pinColor = '#64748b'; // Slate / Grey
          ringColor = 'rgba(100, 116, 139, 0.3)';
          markerIcon = '⏱️';
        } else if (status === 'WATCH') {
          pinColor = '#f59e0b'; // Orange
          ringColor = 'rgba(245, 158, 11, 0.5)';
          pulseClass = '<div class="pulse-ring" style="background:' + ringColor + '"></div>';
        } else if (status === 'CRITICAL') {
          pinColor = '#ef4444'; // Red
          ringColor = 'rgba(239, 68, 68, 0.6)';
          pulseClass = '<div class="pulse-ring" style="background:' + ringColor + '; animation-duration: 1s;"></div>';
        }

        const iconHtml = '<div class="custom-marker">' +
          pulseClass +
          '<div class="marker-pin" style="background: ' + pinColor + ';">' +
            '<span class="marker-icon">' + markerIcon + '</span>' +
          '</div>' +
          '<div class="marker-label">' + p.code + '</div>' +
        '</div>';

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-div-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        const marker = L.marker([p.lat, p.lon], { icon: customIcon });
        marker.projectStatus = status;

        const statusLabel = (!hasReport || status === 'NO_REPORT')
          ? '⚪ รอตรวจหน้างาน (ยังไม่มีรายงาน)'
          : (status === 'NORMAL' ? '🟢 ปกติ' : (status === 'WATCH' ? '🟠 เฝ้าระวัง' : '🔴 วิกฤติ'));

        marker.bindTooltip('<strong>' + p.code + '</strong>: ' + p.name + '<br><span style="color:' + pinColor + '">' + statusLabel + '</span>', {
          direction: 'top',
          offset: [0, -28],
          opacity: 0.95
        });

        marker.on('click', function() {
          selectProject(p.code);
          map.panTo([p.lat, p.lon]);
        });

        if (useClustering) {
          clusterGroup.addLayer(marker);
        } else {
          marker.addTo(map);
        }
        markers.push(marker);
        boundsList.push([p.lat, p.lon]);
      });

      if (useClustering) {
        map.addLayer(clusterGroup);
      }

      if (boundsList.length > 0 && currentFilterZone !== 'all') {
        const bounds = L.latLngBounds(boundsList);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
      }
    }

    // Select Project & Populate Drawer with Hydrological Cross-Section
    function selectProject(projectCode) {
      const p = PROJECTS.find(item => item.code === projectCode);
      if (!p) return;

      // Populate Header
      document.getElementById('drawer-code').innerText = p.code;
      document.getElementById('drawer-name').innerText = p.name;
      document.getElementById('drawer-area').innerText = p.area || '-';

      const hasReport = Boolean(p.hasReport);
      const status = hasReport ? (p.status || 'NORMAL') : 'NO_REPORT';
      const badge = document.getElementById('drawer-status-badge');
      if (!hasReport || status === 'NO_REPORT') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700/50 text-slate-300 border border-slate-600/50';
        badge.innerText = '⚪ ยังไม่มีข้อมูลตรวจหน้างาน (รอตรวจ)';
      } else if (status === 'NORMAL') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        badge.innerText = '🟢 ปกติ (NORMAL)';
      } else if (status === 'WATCH') {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse';
        badge.innerText = '🟠 เฝ้าระวังน้ำหนุน (WATCH)';
      } else {
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse';
        badge.innerText = '🔴 น้ำท่วมขัง/วิกฤติ (CRITICAL)';
      }

      // Populate Hydrological Cross-Section Diagram & Metrics
      const hydro = p.hydro || { 
        canalBelowOuter: 40, 
        canalBelowInner: 120, 
        outerRoadWaterDepth: 0,
        innerRoadWaterDepth: 0,
        roadWaterDepth: 0, 
        innerElevation: 80, 
        safetyMargin: 80,
        innerSource: 'ENGINEERING_STANDARD', 
        asBuiltElevationDiff: 0.80, 
        flapValve: 'OPEN', 
        pumpStatus: 'READY' 
      };

      const elevMeters = (hydro.innerElevation / 100).toFixed(2);
      const elevSign = hydro.innerElevation >= 0 ? '+' : '';
      const outerDepth = hydro.outerRoadWaterDepth || 0;
      const innerDepth = hydro.innerRoadWaterDepth || 0;
      const innerElev = hydro.innerElevation || 80;
      const safetyMargin = hydro.safetyMargin != null ? hydro.safetyMargin : (innerElev - outerDepth);

      // Populate Dual-Zone Water Assessment Card
      const dzOuterDepthElem = document.getElementById('dz-outer-depth');
      const dzOuterSourceElem = document.getElementById('dz-outer-source');
      const dzInnerElevTag = document.getElementById('dz-inner-elev-tag');
      const dzInnerDepthElem = document.getElementById('dz-inner-depth');
      const dzSafetyMarginElem = document.getElementById('dz-safety-margin');
      const dzSynthesisText = document.getElementById('dz-synthesis-text');
      const dzStatusTag = document.getElementById('dz-status-tag');

      if (dzInnerElevTag) {
        const crestTag = hydro.hasEntranceCrest && hydro.crestElevation ? (' | เนิน +' + (hydro.crestElevation / 100).toFixed(2) + 'ม.') : '';
        dzInnerElevTag.innerText = 'ยก ' + elevSign + elevMeters + ' ม.' + crestTag;
      }

      // Zone 1: ถนนหน้าโครงการ / ซอยทางเข้า
      if (outerDepth > 0) {
        const depthDetail = outerDepth >= 70 ? ' (ระดับเอว)' : (outerDepth >= 30 ? ' (ระดับเข่า)' : (outerDepth >= 20 ? ' (ระดับแข้ง)' : (outerDepth >= 10 ? ' (ระดับฟุตบาท / ทางเท้า)' : ' (รอระบาย)')));
        dzOuterDepthElem.innerText = 'น้ำท่วมขัง ' + outerDepth + ' ซม.' + depthDetail;
        dzOuterDepthElem.className = 'text-sm font-bold text-amber-400';
        dzOuterSourceElem.innerText = hasReport ? 'รายงานตรวจเช็คจริงหน้างาน' : 'โทรมาตรสดคลอง (ThaiWater)';
      } else if (hasReport) {
        dzOuterDepthElem.innerText = 'แห้งสนิท สัญจรปกติ (0 ซม.)';
        dzOuterDepthElem.className = 'text-sm font-bold text-slate-200';
        dzOuterSourceElem.innerText = 'รายงานตรวจเช็คจริงหน้างาน';
      } else {
        dzOuterDepthElem.innerText = 'รอข้อมูลตรวจเช็คถนนนอก';
        dzOuterDepthElem.className = 'text-sm font-bold text-slate-400';
        dzOuterSourceElem.innerText = p.liveWater ? ('โทรมาตร: ' + (p.liveWater.stationName || 'สสน.')) : 'ยังไม่มีรายงานส่งมา';
      }

      // Zone 2: ภายในโครงการ
      if (innerDepth > 0) {
        dzInnerDepthElem.innerText = 'มีน้ำล้นเข้าโครงการ ' + innerDepth + ' ซม.';
        dzInnerDepthElem.className = 'text-sm font-bold text-rose-400 animate-pulse';
        dzSafetyMarginElem.innerText = '-' + innerDepth + ' ซม. (ระดับน้ำเกินคันกั้น)';
        dzSafetyMarginElem.className = 'font-bold text-rose-400';
      } else {
        dzInnerDepthElem.innerText = 'แห้งสนิท 100% (น้ำไม่ท่วม)';
        dzInnerDepthElem.className = 'text-sm font-bold text-emerald-400';
        if (safetyMargin > 0) {
          const barrierNote = hydro.hasEntranceCrest ? ' (แนวเนิน รปภ. เหนือน้ำนอก)' : ' เหนือน้ำนอก';
          dzSafetyMarginElem.innerText = '+' + safetyMargin + ' ซม.' + barrierNote;
          dzSafetyMarginElem.className = 'font-bold text-emerald-400';
        } else {
          dzSafetyMarginElem.innerText = 'เสี่ยงปริ่มน้ำ';
          dzSafetyMarginElem.className = 'font-bold text-amber-400';
        }
      }

      // Engineering Synthesis Box
      if (dzSynthesisText) {
        if (outerDepth > 0 && innerDepth === 0) {
          const depthLabel = outerDepth >= 10 && outerDepth <= 15 ? ' (ระดับฟุตบาท)' : '';
          const sandbagNote = /กระสอบทราย/i.test((p.waterLevel || '') + (p.notes || '')) ? ' พร้อมแนวกระสอบทรายป้องกัน' : '';
          if (hydro.hasEntranceCrest && hydro.crestElevation) {
            const crestMeters = (hydro.crestElevation / 100).toFixed(2);
            dzSynthesisText.innerHTML = '<span class="text-amber-300 font-semibold">⚠️ ถนนซอย/ทางเข้าหน้าโครงการมีน้ำท่วมขัง ' + outerDepth + ' ซม.' + depthLabel + '</span> แต่ <span class="text-emerald-400 font-bold">มีสันเนินทางเข้า/ป้อม รปภ. สูง +' + crestMeters + ' ม.</span> (ถนนในยก +' + elevMeters + ' ม.' + sandbagNote + ') ทำหน้าที่เป็นคันกั้นน้ำบ่าภายนอกอย่างสมบูรณ์ บานพับ Flap Valve ปิดกันน้ำย้อน สัญจรในโครงการแห้ง 100%';
          } else {
            dzSynthesisText.innerHTML = '<span class="text-amber-300 font-semibold">⚠️ ถนนซอย/ทางเข้าหน้าโครงการมีน้ำท่วมขัง ' + outerDepth + ' ซม.' + depthLabel + '</span> แต่ <span class="text-emerald-400 font-bold">ถนนภายในโครงการยกพื้นสูงกว่าระดับน้ำภายนอก +' + safetyMargin + ' ซม.</span> (As-Built ยกสูง +' + elevMeters + ' ม.' + sandbagNote + ') ทำให้น้ำภายนอกไม่สามารถไหลเข้าโครงการได้ บานพับ Flap Valve ปิดกันน้ำย้อน สัญจรในโครงการแห้ง 100%';
          }
          if (dzStatusTag) {
            dzStatusTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
            dzStatusTag.innerText = 'ถนนนอกท่วม / ในโครงการแห้ง';
          }
        } else if (innerDepth > 0) {
          const barrierLabel = hydro.hasEntranceCrest ? ('สันเนิน รปภ. +' + (hydro.crestElevation / 100).toFixed(2) + ' ม.') : ('ระดับยกพื้น ' + innerElev + ' ซม.');
          dzSynthesisText.innerHTML = '<span class="text-rose-400 font-bold">🚨 ระดับน้ำภายนอกสูงเกินแนวป้องกัน</span> (' + outerDepth + ' ซม. > ' + barrierLabel + ') ส่งผลให้มีน้ำเอ่อเข้าผิวถนนในโครงการ ' + innerDepth + ' ซม. เร่งเดินเครื่องสูบน้ำระบายออก';
          if (dzStatusTag) {
            dzStatusTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
            dzStatusTag.innerText = 'น้ำท่วมขังในโครงการ';
          }
        } else if (hasReport) {
          const crestInfo = hydro.hasEntranceCrest ? (' พร้อมสันเนินทางเข้า +' + (hydro.crestElevation / 100).toFixed(2) + ' ม.') : '';
          dzSynthesisText.innerHTML = '<span class="text-emerald-400 font-semibold">🟢 สภาพปกติทั้งสองโซน:</span> ถนนหน้าโครงการและถนนเมนภายในแห้งสนิท สัญจรได้คล่องตัว ระดับยกพื้นตามแบบ As-Built +' + elevMeters + ' ม.' + crestInfo + ' รองรับสถานการณ์ได้ปลอดภัย';
          if (dzStatusTag) {
            dzStatusTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            dzStatusTag.innerText = 'สภาวะปกติ';
          }
        } else {
          const crestInfo = hydro.hasEntranceCrest ? (' และมีสันเนินทางเข้า +' + (hydro.crestElevation / 100).toFixed(2) + ' ม.') : '';
          dzSynthesisText.innerHTML = '<span class="text-slate-400">⚪ รอข้อมูลตรวจเช็คสภาพผิวถนนหน้าโครงการจากภาคสนาม</span> โดยโครงการได้ถมดินยกพื้นสูง +' + elevMeters + ' ม. (As-Built)' + crestInfo + ' ตามเกณฑ์ป้องกันน้ำท่วมของแลนด์ แอนด์ เฮ้าส์';
          if (dzStatusTag) {
            dzStatusTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/50 text-slate-300 border border-slate-600/50';
            dzStatusTag.innerText = 'รอข้อมูลภาคสนาม';
          }
        }
      }

      // Update As-Built Badge in Cross-Section Header
      const asbuiltBadge = document.getElementById('cs-asbuilt-badge');
      if (asbuiltBadge) {
        const crestBadgeText = hydro.hasEntranceCrest && hydro.crestElevation ? (' (สันเนิน +' + (hydro.crestElevation / 100).toFixed(2) + ' ม.)') : '';
        if (hydro.innerSource === 'AS_BUILT') {
          asbuiltBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30';
          asbuiltBadge.innerText = '📐 As-Built: ' + elevSign + elevMeters + ' ม.' + (p.asBuiltBenchmarkMSL ? ' (' + p.asBuiltBenchmarkMSL + ')' : '') + crestBadgeText;
        } else if (hydro.innerSource === 'FIELD_MEASURED') {
          asbuiltBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
          asbuiltBadge.innerText = '📏 ตรวจวัดจริง: ' + elevSign + elevMeters + ' ม.' + crestBadgeText;
        } else {
          asbuiltBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/40';
          asbuiltBadge.innerText = '⚙️ มาตรฐาน LH: +0.80 ม.' + crestBadgeText;
        }
      }

      const baselineElem = document.getElementById('cs-baseline');
      if (baselineElem) {
        baselineElem.innerText = p.asBuiltBenchmarkMSL ? ('อ้างอิง: ' + p.asBuiltBenchmarkMSL) : 'อ้างอิงถนน 0.00 ม.';
      }

      const sourceTag = document.getElementById('cs-source-tag');
      if (sourceTag) {
        sourceTag.innerText = hydro.innerSource === 'AS_BUILT' ? '📐 As-Built' : (hydro.innerSource === 'FIELD_MEASURED' ? '📏 วัดจริง' : '⚙️ มาตรฐาน');
        sourceTag.className = hydro.innerSource === 'AS_BUILT' ? 'text-[9px] text-sky-400 font-semibold' : (hydro.innerSource === 'FIELD_MEASURED' ? 'text-[9px] text-emerald-400 font-semibold' : 'text-[9px] text-slate-400');
      }

      // Live Telemetry Banner (Section 2)
      currentSelectedProject = p;
      baseCanalElevation = typeof hydro.canalWaterElevation === 'number'
        ? hydro.canalWaterElevation
        : -(hydro.canalBelowOuter / 100);
      currentCanalElevation = baseCanalElevation;
      isSimulationActive = false;
      currentSimPreset = 'live';

      const csLiveDot = document.getElementById('cs-live-dot');
      const csStationName = document.getElementById('cs-station-name');
      const csStationLink = document.getElementById('cs-station-link');
      const csSensorMsl = document.getElementById('cs-sensor-msl');
      const csSensorDiff = document.getElementById('cs-sensor-diff');
      const csSensorTime = document.getElementById('cs-sensor-time');
      const csFreshnessBadge = document.getElementById('cs-freshness-badge');

      if (p.liveWater && p.liveWater.stationName) {
        if (csLiveDot) csLiveDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        if (csStationName) csStationName.innerText = p.liveWater.stationName + ' [' + (p.liveWater.agencyShort || 'สสน./ชป.') + ']' + (p.liveWater.distanceKm ? ' (' + p.liveWater.distanceKm + ' กม.)' : '');
        if (csStationLink) csStationLink.href = 'https://www.thaiwater.net/';
        if (csSensorMsl) csSensorMsl.innerText = p.liveWater.waterLevelMSL != null ? (p.liveWater.waterLevelMSL + ' ม.รทก.') : '- ม.รทก.';
        if (csSensorDiff) {
          csSensorDiff.innerText = p.liveWater.bankStatusText + ' ' + (p.liveWater.bankDiff != null ? p.liveWater.bankDiff + ' ม.' : '');
          csSensorDiff.className = 'font-bold ' + (p.liveWater.isOverflow ? 'text-rose-400' : 'text-sky-400');
        }
        if (csSensorTime) csSensorTime.innerText = p.liveWater.datetime || 'ล่าสุด';
        if (csFreshnessBadge) {
          const fresh = p.liveWater.freshness || 'LIVE';
          if (fresh === 'LIVE') {
            csFreshnessBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            csFreshnessBadge.innerText = p.liveWater.freshnessBadge || '🟢 สด Realtime';
          } else if (fresh === 'DELAYED') {
            csFreshnessBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
            csFreshnessBadge.innerText = p.liveWater.freshnessBadge || '🟡 ล่าช้า';
          } else {
            csFreshnessBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
            csFreshnessBadge.innerText = p.liveWater.freshnessBadge || '🔴 ข้อมูลค้าง';
          }
          csFreshnessBadge.title = p.liveWater.freshnessText || '';
        }
      } else {
        if (csLiveDot) csLiveDot.className = 'w-2 h-2 rounded-full bg-slate-500';
        if (csStationName) csStationName.innerText = p.stationName || 'สถานีลุ่มน้ำเจ้าพระยา (สสน./ชป.)';
        if (csStationLink) csStationLink.href = 'https://www.thaiwater.net/';
        if (csSensorMsl) csSensorMsl.innerText = '- ม.รทก.';
        if (csSensorDiff) {
          csSensorDiff.innerText = p.basinAlert || 'เฝ้าระวังปกติ';
          csSensorDiff.className = 'font-bold text-sky-400';
        }
        if (csSensorTime) csSensorTime.innerText = 'ตามรอบประกาศ';
        if (csFreshnessBadge) {
          csFreshnessBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700';
          csFreshnessBadge.innerText = '⚪ รอบประกาศ';
        }
      }

      // Update inner road height & house SVG in cross section
      const innerY = Math.max(50, Math.min(100, 110 - Math.round(hydro.innerElevation * 0.375)));
      const innerRoad = document.getElementById('svg-inner-road');
      const houseGroup = document.getElementById('svg-house-group');
      const crestGroup = document.getElementById('svg-crest-group');
      const crestTxt = document.getElementById('svg-crest-txt');

      if (hydro.hasEntranceCrest && hydro.crestElevation) {
        const crestMeters = (hydro.crestElevation / 100).toFixed(2);
        const crestY = Math.max(48, Math.min(100, 110 - Math.round(hydro.crestElevation * 0.375)));
        if (innerRoad) innerRoad.setAttribute('d', 'M 0,' + innerY + ' L 125,' + innerY + ' L 148,' + crestY + ' L 160,' + crestY + ' L 170,110 L 170,170 L 0,170 Z');
        if (houseGroup) houseGroup.setAttribute('transform', 'translate(35, ' + (innerY - 38) + ')');
        if (crestGroup) {
          crestGroup.style.display = 'block';
          crestGroup.setAttribute('transform', 'translate(146, ' + (crestY - 14) + ')');
          if (crestTxt) crestTxt.textContent = 'เนิน +' + crestMeters + 'ม.';
        }
      } else {
        if (innerRoad) innerRoad.setAttribute('d', 'M 0,' + innerY + ' L 160,' + innerY + ' L 170,110 L 170,170 L 0,170 Z');
        if (houseGroup) houseGroup.setAttribute('transform', 'translate(45, ' + (innerY - 38) + ')');
        if (crestGroup) crestGroup.style.display = 'none';
      }

      // แสดงหรือซ่อนเขื่อนคอนกรีตริมคลอง (เฉพาะโครงการที่มีแนวเขื่อนกั้นริมคลอง)
      const floodwallGroup = document.getElementById('svg-floodwall-group');
      if (floodwallGroup) {
        floodwallGroup.style.display = hydro.hasFloodwall ? 'block' : 'none';
      }

      // Initial visual render for cross section
      updateCrossSectionVisuals(baseCanalElevation, false);

      // Weather Section
      const w = p.weather || {};
      document.getElementById('weather-temp').innerText = (w.temp ? w.temp + '°C' : '31°C');
      document.getElementById('weather-cond').innerText = w.condition || 'ท้องฟ้าแจ่มใส';
      document.getElementById('weather-rain-prob').innerText = (w.rainProb || 60) + '%';
      document.getElementById('weather-rain-24h').innerText = (w.expectedRain24h || '25.0') + ' มม.';
      document.getElementById('weather-station').innerText = p.stationName || w.stationName || 'สถานีลุ่มน้ำเจ้าพระยา (สสน./RID)';
      document.getElementById('weather-basin').innerText = p.basinAlert || w.basinAlert || 'ระดับน้ำคลองสายหลักอยู่ในเกณฑ์ควบคุม ประตูระบายน้ำพร้อมทำงาน';

      // Live Telemetry Water Station (ThaiWater / สสน. / ชป.)
      const lw = p.liveWater;
      const sitBadge = document.getElementById('livewater-sit-badge');
      const lwName = document.getElementById('livewater-name');
      const lwDist = document.getElementById('livewater-dist');
      const lwMsl = document.getElementById('livewater-msl');
      const lwDiff = document.getElementById('livewater-diff');
      const lwTime = document.getElementById('livewater-time');

      if (lw && lw.stationName) {
        if (sitBadge) {
          sitBadge.innerText = lw.situationText || 'ปกติ';
          if (lw.isOverflow || lw.situationLevel >= 4) {
            sitBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
          } else if (lw.situationLevel >= 2) {
            sitBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
          } else {
            sitBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          }
        }
        if (lwName) lwName.innerText = lw.stationName + ' [' + lw.agencyShort + ']';
        if (lwDist) lwDist.innerText = '(ห่าง ' + lw.distanceKm + ' กม. • ' + lw.province + ')';
        if (lwMsl) lwMsl.innerText = lw.waterLevelMSL != null ? (lw.waterLevelMSL + ' ม.รทก.') : 'ปกติ';
        if (lwDiff) {
          lwDiff.innerText = lw.bankStatusText + ' ' + (lw.bankDiff != null ? lw.bankDiff + ' ม.' : '');
          lwDiff.className = 'font-bold text-xs ' + (lw.isOverflow ? 'text-rose-400' : 'text-sky-400');
        }
        if (lwTime) lwTime.innerText = lw.datetime || 'ล่าสุด';
      } else {
        if (sitBadge) { sitBadge.innerText = 'ลุ่มน้ำหลัก'; sitBadge.className = 'px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700'; }
        if (lwName) lwName.innerText = p.stationName || 'สถานีลุ่มน้ำเจ้าพระยา (สสน./ชป.)';
        if (lwDist) lwDist.innerText = '';
        if (lwMsl) lwMsl.innerText = '-';
        if (lwDiff) { lwDiff.innerText = p.basinAlert || 'เฝ้าระวังปกติ'; lwDiff.className = 'font-bold text-xs text-sky-400'; }
        if (lwTime) lwTime.innerText = 'ตามรอบประกาศ';
      }

      // External Live Links
      const linkWindy = document.getElementById('link-windy');
      if (linkWindy) linkWindy.href = 'https://www.windy.com/?' + p.lat + ',' + p.lon + ',11';

      // Field Section (Toggle Empty State vs Actual Field Report)
      const fieldEmptyBox = document.getElementById('field-empty-box');
      const fieldDataBox = document.getElementById('field-data-box');
      const photosSection = document.getElementById('photos-section');

      if (!hasReport) {
        if (fieldEmptyBox) fieldEmptyBox.classList.remove('hidden');
        if (fieldDataBox) fieldDataBox.classList.add('hidden');
        if (photosSection) photosSection.classList.add('hidden');
        document.getElementById('field-updated-at').innerText = 'ยังไม่มีข้อมูลตรวจจริงรอบนี้';
      } else {
        if (fieldEmptyBox) fieldEmptyBox.classList.add('hidden');
        if (fieldDataBox) fieldDataBox.classList.remove('hidden');
        if (photosSection) photosSection.classList.remove('hidden');
        document.getElementById('field-updated-at').innerText = p.reportDateThai || 'รอบตรวจล่าสุด';
        document.getElementById('field-water').innerText = p.waterLevel || '-';
        document.getElementById('field-canal').innerText = p.drainageCondition || '-';
        document.getElementById('field-pumps').innerText = p.pumpsRunning || '-';
      }

      // Photos Section
      const photoGrid = document.getElementById('photos-grid');
      photoGrid.innerHTML = '';
      const photoCount = (p.photos && p.photos.length) || 0;
      document.getElementById('photo-count').innerText = photoCount;

      if (photoCount > 0) {
        p.photos.forEach((ph, idx) => {
          const imgUrl = ph.url || \`/api/flood-report?id=\${p.reportId}&photo=\${ph.index ?? idx}\`;
          const thumb = document.createElement('div');
          thumb.className = 'aspect-square rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 cursor-pointer hover:border-lh-gold transition-all shadow-sm';
          thumb.innerHTML = \`<img src=\"\${imgUrl}\" class=\"w-full h-full object-cover\" loading=\"lazy\" alt=\"ภาพถ่ายหน้างาน \${idx + 1}\" onclick=\"openLightbox('\${imgUrl}')\">\`;
          photoGrid.appendChild(thumb);
        });
      } else {
        photoGrid.innerHTML = '<div class=\"col-span-4 py-2 text-center text-slate-500 text-[10px]\">ไม่มีภาพถ่ายในรายงานรอบนี้</div>';
      }
      // 1-Click LINE Field Report Share
      const btnLine = document.getElementById('btn-line-report');
      if (btnLine) {
        const outerStatus = outerDepth > 0 ? ('น้ำท่วมขัง ' + outerDepth + ' ซม.') : 'แห้งสนิท (0 ซม.)';
        const innerStatus = innerDepth > 0 ? ('น้ำท่วมขัง ' + innerDepth + ' ซม.') : 'แห้ง 100%';
        const stLabel = status === 'NORMAL' ? 'ปกติ' : (status === 'WATCH' ? 'เฝ้าระวัง' : (status === 'CRITICAL' ? 'วิกฤติ' : 'รอตรวจ'));
        const lineText = encodeURIComponent(
          '🚨 [รายงานน้ำท่วม LH] ' + p.name + ' (' + p.code + ')\n' +
          '• พื้นที่: ' + (p.area || '-') + '\n' +
          '• สถานะ: ' + stLabel + '\n' +
          '• ถนนหน้าโครงการ: ' + outerStatus + '\n' +
          '• ถนนในโครงการ: ' + innerStatus + ' (As-Built ยก +' + elevMeters + ' ม.)\n' +
          '• โทรมาตร: ' + ((p.liveWater && p.liveWater.stationName) ? p.liveWater.stationName : (p.stationName || '-')) + '\n' +
          '🔗 ตรวจสอบสดบนแผนที่: https://lh-taskflow.vercel.app/api/flood-report?focus=' + p.code
        );
        btnLine.href = 'https://line.me/R/share?text=' + lineText;
      }

      // Populate Pillar 4: As-Built Engineering Specs
      const specInner = document.getElementById('spec-inner-elev');
      if (specInner) {
        const srcText = hydro.innerSource === 'AS_BUILT' ? 'As-Built' : (hydro.innerSource === 'FIELD_MEASURED' ? 'วัดจริง' : 'มาตรฐาน');
        specInner.innerText = elevSign + elevMeters + ' ม. (' + srcText + ')';
      }
      const specCrest = document.getElementById('spec-crest-elev');
      if (specCrest) {
        if (hydro.hasEntranceCrest && hydro.crestElevation) {
          specCrest.innerText = '+' + (hydro.crestElevation / 100).toFixed(2) + ' ม.';
          specCrest.className = 'font-bold text-amber-400 text-xs';
        } else {
          specCrest.innerText = 'ไม่มีสันเนิน (เสมอถนน)';
          specCrest.className = 'font-medium text-slate-400 text-xs';
        }
      }
      const specFloodwall = document.getElementById('spec-floodwall');
      if (specFloodwall) {
        if (hydro.hasFloodwall && hydro.floodwallHeightDiff) {
          specFloodwall.innerText = '+' + Number(hydro.floodwallHeightDiff).toFixed(2) + ' ม. (ริมคลอง)';
          specFloodwall.className = 'font-bold text-sky-400 text-xs';
        } else {
          specFloodwall.innerText = 'ไม่มีแนวเขื่อน';
          specFloodwall.className = 'font-medium text-slate-400 text-xs';
        }
      }
      const specFreeboard = document.getElementById('spec-freeboard');
      if (specFreeboard) {
        if (innerDepth > 0) {
          specFreeboard.innerText = '-' + innerDepth + ' ซม. (น้ำล้นเข้า)';
          specFreeboard.className = 'font-bold text-rose-400 text-xs';
        } else if (safetyMargin > 0) {
          specFreeboard.innerText = '+' + safetyMargin + ' ซม. เหนือน้ำนอก';
          specFreeboard.className = 'font-bold text-emerald-400 text-xs';
        } else {
          specFreeboard.innerText = '0 ซม. (ปริ่มน้ำ)';
          specFreeboard.className = 'font-bold text-amber-400 text-xs';
        }
      }
      const specBenchmark = document.getElementById('spec-benchmark-msl');
      if (specBenchmark) {
        specBenchmark.innerText = p.asBuiltBenchmarkMSL || 'หมุดท้องถิ่น (0.00 ม.)';
      }

      // Buttons Links
      const btnReport = document.getElementById('btn-full-report');
      if (p.reportId) {
        btnReport.href = \`/api/flood-report?id=\${p.reportId}\`;
        btnReport.style.display = 'flex';
      } else {
        btnReport.style.display = 'none';
      }

      const btnAsbuilt = document.getElementById('btn-asbuilt-mgr');
      if (btnAsbuilt) {
        btnAsbuilt.href = '/api/flood-report?mode=asbuilt';
      }

      document.getElementById('btn-gmaps').href = p.googleMapsUrl || \`https://www.google.com/maps/dir/?api=1&destination=\${p.lat},\${p.lon}\`;

      // Open Drawer
      document.getElementById('project-drawer').classList.remove('translate-x-full');

      // Fetch Live Open-Meteo GPS Forecast
      fetchOpenMeteoHourly(p.lat, p.lon);
    }

    // Dynamic Cross-Section Visuals & Interactive Simulation
    function updateCrossSectionVisuals(canalElevationM, isSimulated) {
      if (!currentSelectedProject) return;
      const p = currentSelectedProject;
      const hydro = p.hydro || {};
      const outerDepth = Number(p.floodDepthOuter || 0);
      const innerDepth = Number(p.floodDepthInner || 0);
      const innerElevM = (hydro.innerElevation || 80) / 100;
      const elevSign = innerElevM >= 0 ? '+' : '';
      const elevMeters = innerElevM.toFixed(2);
      const hasReport = Boolean(p.hasReport);

      // Simulation Toolbar Indicator
      const simStatus = document.getElementById('sim-status-label');
      if (simStatus) {
        if (!isSimulated) {
          simStatus.innerText = 'โหมด: โทรมาตรสด';
          simStatus.className = 'text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono';
        } else {
          simStatus.innerText = 'โหมด: จำลองสถานการณ์ ⚡';
          simStatus.className = 'text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold animate-pulse';
        }
      }

      // Slider value text & range input
      const sliderValTxt = document.getElementById('slider-val-txt');
      if (sliderValTxt) {
        sliderValTxt.innerText = (canalElevationM >= 0 ? '+' : '') + canalElevationM.toFixed(2) + ' ม.';
        sliderValTxt.className = 'font-mono font-bold ' + (canalElevationM > 0 ? 'text-rose-400' : (canalElevationM >= -0.15 ? 'text-amber-400' : 'text-sky-400'));
      }
      const slider = document.getElementById('canal-sim-slider');
      if (slider) {
        slider.value = Math.round(canalElevationM * 100);
      }

      // Quick buttons styling
      const btns = {
        live: document.getElementById('sim-btn-live'),
        rain20: document.getElementById('sim-btn-rain20'),
        tide50: document.getElementById('sim-btn-tide50'),
        flood80: document.getElementById('sim-btn-flood80')
      };
      for (const k in btns) {
        const b = btns[k];
        if (!b) continue;
        if (currentSimPreset === k) {
          b.className = 'sim-btn py-1 px-1 rounded-lg bg-sky-600 text-white font-bold shadow-xs transition-all';
        } else {
          b.className = 'sim-btn py-1 px-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all font-semibold';
        }
      }

      // SVG Canal Water Level
      // Baseline road is y=110. Canal bed is y=135..170.
      // Scaling: ~35px per 1.0m (0.35px per cm)
      const hasFloodwall = Boolean(hydro.hasFloodwall);
      const floodwallLimitM = hydro.floodwallHeightDiff || 0.40;

      const canalY = Math.max(65, Math.min(155, 110 - Math.round(canalElevationM * 35)));
      const canalRect = document.getElementById('svg-canal-water');
      const waterLine = document.getElementById('svg-water-line');
      if (canalRect && waterLine) {
        canalRect.setAttribute('y', canalY);
        canalRect.setAttribute('height', Math.max(15, 170 - canalY));
        waterLine.setAttribute('d', 'M 330,' + canalY + ' Q 360,' + (canalY - 2) + ' 395,' + canalY + ' T 460,' + canalY);
        if (hasFloodwall) {
          if (canalElevationM > floodwallLimitM) {
            waterLine.setAttribute('stroke', '#f43f5e'); // Red wave on overflow wall
          } else if (canalElevationM > 0) {
            waterLine.setAttribute('stroke', '#f59e0b'); // Amber wave at/above road level but held by floodwall
          } else if (canalElevationM >= -0.15) {
            waterLine.setAttribute('stroke', '#f59e0b'); // Amber wave near road
          } else {
            waterLine.setAttribute('stroke', '#38bdf8'); // Sky blue wave
          }
        } else {
          if (canalElevationM > 0) {
            waterLine.setAttribute('stroke', '#f43f5e'); // Red wave: overflow onto road directly
          } else if (canalElevationM >= -0.15) {
            waterLine.setAttribute('stroke', '#f59e0b'); // Amber wave near road
          } else {
            waterLine.setAttribute('stroke', '#38bdf8'); // Sky blue wave
          }
        }
      }

      // Concrete Floodwall visual state (Only active if project has floodwall)
      const floodwall = document.getElementById('svg-floodwall');
      const floodwallCap = document.getElementById('svg-floodwall-cap');
      const floodwallTxt = document.getElementById('svg-floodwall-txt');
      if (floodwall && hasFloodwall) {
        if (canalElevationM > floodwallLimitM) {
          floodwall.setAttribute('fill', '#ef4444');
          floodwall.setAttribute('stroke', '#fca5a5');
          if (floodwallCap) floodwallCap.setAttribute('fill', '#fca5a5');
          if (floodwallTxt) {
            floodwallTxt.textContent = 'น้ำล้นข้ามเขื่อน! ⚠️';
            floodwallTxt.setAttribute('fill', '#ef4444');
          }
        } else if (canalElevationM > 0) {
          floodwall.setAttribute('fill', '#0284c7');
          floodwall.setAttribute('stroke', '#38bdf8');
          if (floodwallCap) floodwallCap.setAttribute('fill', '#38bdf8');
          if (floodwallTxt) {
            floodwallTxt.textContent = 'เขื่อนกั้นน้ำอยู่ 🛡️';
            floodwallTxt.setAttribute('fill', '#38bdf8');
          }
        } else {
          floodwall.setAttribute('fill', '#64748b');
          floodwall.setAttribute('stroke', '#475569');
          if (floodwallCap) floodwallCap.setAttribute('fill', '#94a3b8');
          if (floodwallTxt) {
            floodwallTxt.textContent = 'เขื่อนริมคลอง';
            floodwallTxt.setAttribute('fill', '#94a3b8');
          }
        }
      }

      // Road water puddle (outer road x=170..320)
      let effectiveOuterDepth = 0;
      if (hasFloodwall) {
        effectiveOuterDepth = Math.max(outerDepth, canalElevationM > floodwallLimitM ? Math.round((canalElevationM - floodwallLimitM) * 100) : 0);
      } else {
        effectiveOuterDepth = Math.max(outerDepth, canalElevationM > 0 ? Math.round(canalElevationM * 100) : 0);
      }
      const roadWater = document.getElementById('svg-road-water');
      if (roadWater) {
        if (effectiveOuterDepth > 0) {
          const puddleH = Math.min(25, Math.max(8, Math.round(effectiveOuterDepth * 0.6)));
          roadWater.setAttribute('y', 110 - puddleH);
          roadWater.setAttribute('height', puddleH);
          roadWater.setAttribute('fill', '#f59e0b');
          roadWater.setAttribute('opacity', '0.85');
          roadWater.style.display = 'block';
        } else {
          roadWater.style.display = 'none';
        }
      }

      // Flap valve rotation: if canal rises within 15cm of road (-0.15m) or overflows, flap valve shuts closed!
      const isValveClosed = canalElevationM >= -0.15;
      const flap = document.getElementById('svg-flap-valve');
      if (flap) {
        if (!isValveClosed) {
          flap.setAttribute('x2', '331');
          flap.setAttribute('y2', '124');
          flap.setAttribute('stroke', '#10b981'); // Green Open
        } else {
          flap.setAttribute('x2', '325');
          flap.setAttribute('y2', '137');
          flap.setAttribute('stroke', '#eab308'); // Yellow Closed
        }
      }

      // SVG Text Annotations
      // Helper to reliably update SVG text across all browser DOM engines
      function setSvgText(el, text, fill) {
        if (!el) return;
        el.textContent = text;
        if ('innerText' in el) {
          try { el.innerText = text; } catch (e) {}
        }
        if (fill) el.setAttribute('fill', fill);
      }

      // SVG Text Annotations (Top HUD Badges)
      const svgCanalTxt = document.getElementById('svg-canal-txt');
      if (svgCanalTxt) {
        if (hasFloodwall) {
          if (canalElevationM > floodwallLimitM) {
            const valTxt = '+' + canalElevationM.toFixed(2) + ' ม. (ล้นข้ามเขื่อน ⚠️)';
            setSvgText(svgCanalTxt, valTxt, '#ef4444');
          } else if (canalElevationM > 0) {
            const valTxt = '+' + canalElevationM.toFixed(2) + ' ม. (เสมอถนน มีเขื่อนกั้น)';
            setSvgText(svgCanalTxt, valTxt, '#f59e0b');
          } else {
            const subLabel = canalElevationM >= -0.15 ? 'หนุนสูง' : 'ในเกณฑ์';
            const valTxt = canalElevationM.toFixed(2) + ' ม. (' + subLabel + ')';
            setSvgText(svgCanalTxt, valTxt, canalElevationM >= -0.15 ? '#f59e0b' : '#38bdf8');
          }
        } else {
          if (canalElevationM > 0) {
            const valTxt = '+' + canalElevationM.toFixed(2) + ' ม. (ล้นตลิ่ง ⚠️)';
            setSvgText(svgCanalTxt, valTxt, '#ef4444');
          } else {
            const subLabel = canalElevationM >= -0.15 ? 'หนุนสูง' : 'ในเกณฑ์';
            const valTxt = canalElevationM.toFixed(2) + ' ม. (' + subLabel + ')';
            setSvgText(svgCanalTxt, valTxt, canalElevationM >= -0.15 ? '#f59e0b' : '#38bdf8');
          }
        }
      }

      const svgOuterTxt = document.getElementById('svg-outer-txt');
      if (svgOuterTxt) {
        if (effectiveOuterDepth > 0) {
          const depthLabel = effectiveOuterDepth >= 70 ? ' (ระดับเอว)' : (effectiveOuterDepth >= 30 ? ' (ระดับเข่า)' : (effectiveOuterDepth >= 10 ? ' (ระดับฟุตบาท)' : ''));
          setSvgText(svgOuterTxt, 'น้ำขัง ' + effectiveOuterDepth + ' ซม.' + depthLabel, '#f59e0b');
        } else if (hasReport) {
          setSvgText(svgOuterTxt, '0.00 ม. (แห้งปกติ)', '#f8fafc');
        } else {
          setSvgText(svgOuterTxt, '0.00 ม. (รอตรวจ)', '#94a3b8');
        }
      }

      const innerSrcBadge = hydro.innerSource === 'AS_BUILT' ? 'As-Built' : (hydro.innerSource === 'FIELD_MEASURED' ? 'ตรวจวัด' : 'มาตรฐาน');
      const crestSubBadge = hydro.hasEntranceCrest && hydro.crestElevation ? (' | เนิน +' + (hydro.crestElevation / 100).toFixed(2) + 'ม.') : '';
      const innerStatusTxt = innerDepth > 0 ? ('น้ำขัง ' + innerDepth + ' ซม.') : ('แห้ง 100% (' + innerSrcBadge + crestSubBadge + ')');
      const svgInnerTxt = document.getElementById('svg-inner-txt');
      if (svgInnerTxt) {
        setSvgText(svgInnerTxt, elevSign + elevMeters + ' ม. ' + innerStatusTxt, innerDepth > 0 ? '#ef4444' : '#10b981');
      }

      // Metrics Summary Table
      // 1. Canal vs Outer Road
      const canalOuterElem = document.getElementById('cs-canal-outer');
      const canalOuterSub = document.getElementById('cs-canal-outer-sub');
      if (canalOuterElem) {
        if (hasFloodwall) {
          if (canalElevationM > floodwallLimitM) {
            const overWallCm = Math.round((canalElevationM - floodwallLimitM) * 100);
            canalOuterElem.innerText = 'ล้นข้ามเขื่อน +' + overWallCm + ' ซม. ⚠️';
            canalOuterElem.className = 'font-bold text-rose-400 text-sm';
            if (canalOuterSub) canalOuterSub.innerText = 'ระดับน้ำสูงเกินแนวเขื่อนกั้นริมคลอง (+' + Math.round(floodwallLimitM * 100) + ' ซม.)';
          } else if (canalElevationM > 0) {
            const overCm = Math.round(canalElevationM * 100);
            canalOuterElem.innerText = 'สูงกว่าถนน +' + overCm + ' ซม.';
            canalOuterElem.className = 'font-bold text-amber-400 text-sm';
            if (canalOuterSub) canalOuterSub.innerText = 'เขื่อน คสล. ริมคลองกั้นน้ำไว้ ถนนหน้าโครงการแห้งปกติ';
          } else {
            const belowCm = Math.abs(Math.round(canalElevationM * 100));
            canalOuterElem.innerText = 'ต่ำกว่า ' + belowCm + ' ซม.';
            canalOuterElem.className = 'font-bold text-sm ' + (belowCm <= 15 ? 'text-amber-400' : 'text-sky-400');
            if (canalOuterSub) canalOuterSub.innerText = belowCm <= 15 ? 'ระดับน้ำหนุนสูง เฝ้าระวังใกล้ตลิ่ง' : 'เกณฑ์ควบคุมปกติ ปลอดภัย';
          }
        } else {
          if (canalElevationM > 0) {
            const overCm = Math.round(canalElevationM * 100);
            canalOuterElem.innerText = 'ล้นตลิ่ง +' + overCm + ' ซม. ⚠️';
            canalOuterElem.className = 'font-bold text-rose-400 text-sm';
            if (canalOuterSub) canalOuterSub.innerText = 'ระดับน้ำสูงกว่าผิวถนนหน้าโครงการ (ไม่มีแนวเขื่อนกั้น)';
          } else {
            const belowCm = Math.abs(Math.round(canalElevationM * 100));
            canalOuterElem.innerText = 'ต่ำกว่า ' + belowCm + ' ซม.';
            canalOuterElem.className = 'font-bold text-sm ' + (belowCm <= 15 ? 'text-amber-400' : 'text-sky-400');
            if (canalOuterSub) canalOuterSub.innerText = belowCm <= 15 ? 'ระดับน้ำหนุนสูง เฝ้าระวังใกล้ตลิ่ง' : 'เกณฑ์ควบคุมปกติ ปลอดภัย';
          }
        }
      }

      // 2. Canal vs Inner Road (Safety Margin)
      const canalInnerElem = document.getElementById('cs-canal-inner');
      const canalInnerSub = document.getElementById('cs-canal-inner-sub');
      const marginM = innerElevM - canalElevationM;
      const marginCm = Math.round(marginM * 100);

      if (canalInnerElem) {
        if (marginCm > 0) {
          canalInnerElem.innerText = 'ต่ำกว่า ' + marginCm + ' ซม.';
          canalInnerElem.className = 'font-bold text-sm ' + (marginCm >= 50 ? 'text-emerald-400' : (marginCm >= 20 ? 'text-amber-400' : 'text-rose-400'));
          if (canalInnerSub) {
            const crestNote = hydro.hasEntranceCrest && hydro.crestElevation ? (' • เนิน รปภ. +' + (hydro.crestElevation / 100).toFixed(2) + ' ม.') : '';
            canalInnerSub.innerText = (marginCm >= 50 ? '🛡️ ระยะปลอดภัยสูง' : '⚠️ ระยะเผื่อความปลอดภัยต่ำ') + ' (As-Built ยก ' + elevSign + elevMeters + ' ม.' + crestNote + ')';
          }
        } else {
          const overInnerCm = Math.abs(marginCm);
          canalInnerElem.innerText = 'ท่วมล้นใน +' + overInnerCm + ' ซม. 🚨';
          canalInnerElem.className = 'font-bold text-rose-400 text-sm animate-pulse';
          if (canalInnerSub) {
            if (hydro.hasEntranceCrest && hydro.crestElevation && canalElevationM < (hydro.crestElevation / 100)) {
              canalInnerSub.innerText = '⚠️ น้ำคลองสูงกว่าถนนใน แต่มีสันเนิน รปภ. +' + (hydro.crestElevation / 100).toFixed(2) + ' ม. ป้องกันน้ำบ่าเข้า';
            } else {
              canalInnerSub.innerText = '🚨 น้ำเอ่อล้นระดับถนน As-Built (' + elevSign + elevMeters + ' ม.)!';
            }
          }
        }
      }

      // 3. Flap Valve Status
      const flapValveElem = document.getElementById('cs-flap-valve');
      const flapValveSub = document.getElementById('cs-flap-valve-sub');
      if (flapValveElem) {
        if (!isValveClosed) {
          flapValveElem.innerText = 'เปิดระบายธรรมชาติ';
          flapValveElem.className = 'font-bold text-emerald-400';
          if (flapValveSub) flapValveSub.innerText = 'ระบายน้ำตามแรงโน้มถ่วง';
        } else {
          flapValveElem.innerText = 'ปิดป้องกันน้ำย้อน';
          flapValveElem.className = 'font-bold text-amber-400';
          if (flapValveSub) flapValveSub.innerText = 'น้ำคลองสูง บานพับปิดสนิทกันน้ำเข้าท่อ';
        }
      }

      // 4. Pump Status
      const pumpElem = document.getElementById('cs-pump-status');
      const pumpSub = document.getElementById('cs-pump-status-sub');
      if (pumpElem) {
        if (isValveClosed || effectiveOuterDepth > 0) {
          pumpElem.innerText = 'กำลังเดินเครื่องเร่งระบาย';
          pumpElem.className = 'font-bold text-amber-400 animate-pulse';
          if (pumpSub) pumpSub.innerText = 'เดินเครื่องสูบน้ำข้ามตลิ่ง (Flap Valve ปิด)';
        } else {
          pumpElem.innerText = 'พร้อมใช้งาน 100%';
          pumpElem.className = 'font-bold text-emerald-400';
          if (pumpSub) pumpSub.innerText = 'สแตนด์บายลูกลอยอัตโนมัติ';
        }
      }
    }

    function setCanalSimulation(preset) {
      if (!currentSelectedProject) return;
      currentSimPreset = preset;
      if (preset === 'live') {
        isSimulationActive = false;
        currentCanalElevation = baseCanalElevation;
        updateCrossSectionVisuals(baseCanalElevation, false);
      } else if (preset === 'rain20') {
        isSimulationActive = true;
        currentCanalElevation = baseCanalElevation + 0.20;
        updateCrossSectionVisuals(currentCanalElevation, true);
      } else if (preset === 'tide50') {
        isSimulationActive = true;
        currentCanalElevation = baseCanalElevation + 0.50;
        updateCrossSectionVisuals(currentCanalElevation, true);
      } else if (preset === 'flood80') {
        isSimulationActive = true;
        currentCanalElevation = baseCanalElevation + 0.80;
        updateCrossSectionVisuals(currentCanalElevation, true);
      }
    }

    function onCanalSliderChange(valCm) {
      if (!currentSelectedProject) return;
      currentSimPreset = 'custom';
      isSimulationActive = true;
      currentCanalElevation = parseFloat(valCm) / 100;
      updateCrossSectionVisuals(currentCanalElevation, true);
    }

    function resetCanalSimulation() {
      setCanalSimulation('live');
    }

    // Close Drawer
    function closeDrawer() {
      document.getElementById('project-drawer').classList.add('translate-x-full');
    }

    // Open/Close Lightbox
    function openLightbox(url) {
      document.getElementById('lightbox-img').src = url;
      document.getElementById('lightbox').classList.remove('hidden');
      document.getElementById('lightbox').classList.add('flex');
    }
    function closeLightbox() {
      document.getElementById('lightbox').classList.add('hidden');
      document.getElementById('lightbox').classList.remove('flex');
    }

    // Zone Filter Function
    function setZoneFilter(zone) {
      currentFilterZone = zone;
      document.querySelectorAll('.zone-btn').forEach(function(b) {
        if (b.dataset.zone === zone) {
          b.className = 'zone-btn active px-2.5 py-1 rounded-lg text-xs font-semibold bg-lh-gold text-slate-950 transition-all shadow-xs';
        } else {
          b.className = 'zone-btn px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all';
        }
      });
      renderMarkers();
      if (zone === 'all' && PROJECTS.length > 0) {
        const allBounds = L.latLngBounds(PROJECTS.map(function(p) { return [p.lat, p.lon]; }));
        map.fitBounds(allBounds, { padding: [60, 60], maxZoom: 12 });
      }
    }

    // Toggle Risk Only Filter
    function toggleRiskOnly() {
      filterRiskOnly = !filterRiskOnly;
      const btn = document.getElementById('risk-only-btn');
      if (btn) {
        if (filterRiskOnly) {
          btn.className = 'flex items-center justify-center gap-0.5 px-1 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-slate-950 border border-amber-400 transition-all shadow-sm text-center';
        } else {
          btn.className = 'flex items-center justify-center gap-0.5 px-1 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all text-center';
        }
      }
      renderMarkers();
    }

    // Toggle Outer Road Flooding Triage Filter
    function toggleOuterFloodOnly() {
      filterOuterFloodOnly = !filterOuterFloodOnly;
      const btn = document.getElementById('outer-flood-btn');
      if (btn) {
        if (filterOuterFloodOnly) {
          btn.className = 'flex items-center justify-center gap-0.5 px-1 py-1 rounded-lg text-[10px] font-bold bg-rose-500 text-white border border-rose-400 transition-all shadow-sm text-center';
        } else {
          btn.className = 'flex items-center justify-center gap-0.5 px-1 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-amber-300 hover:text-white border border-slate-700 transition-all text-center';
        }
      }
      renderMarkers();
    }

    // Toggle RainViewer Weather Radar Overlay
    async function toggleRadarLayer() {
      const btn = document.getElementById('radar-toggle-btn');
      if (isRadarActive) {
        if (radarLayer) {
          map.removeLayer(radarLayer);
          radarLayer = null;
        }
        isRadarActive = false;
        btn.className = 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-900/40 text-blue-300 hover:text-blue-100 border border-blue-700/50 transition-colors';
        btn.innerHTML = '<span>🌧️ เรดาร์สด</span>';
        return;
      }

      try {
        btn.innerHTML = '<span>⏳ โหลดเรดาร์...</span>';
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        const host = data.host || 'https://tilecache.rainviewer.com';
        const past = data.radar && data.radar.past;
        const latestFrame = (past && past.length > 0) ? past[past.length - 1] : (data.radar && data.radar.nowcast && data.radar.nowcast[0]);
        
        if (latestFrame && latestFrame.path) {
          // Note: RainViewer API provides radar raster tiles up to zoom level 7.
          // maxNativeZoom: 7 instructs Leaflet to request zoom 7 tiles and scale them smoothly up to zoom 19,
          // completely preventing "Zoom Level Not Supported" placeholder tiles when zoomed in.
          const tileUrl = host + latestFrame.path + '/256/{z}/{x}/{y}/2/1_1.png';
          radarLayer = L.tileLayer(tileUrl, {
            tileSize: 256,
            opacity: 0.65,
            zIndex: 10,
            minZoom: 3,
            maxNativeZoom: 7,
            maxZoom: 19,
            keepBuffer: 6,
            attribution: '&copy; <a href="https://www.rainviewer.com/" target="_blank" class="underline text-blue-300">RainViewer</a>'
          }).addTo(map);

          isRadarActive = true;
          btn.className = 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-500 text-white border border-blue-400 shadow-md transition-colors';
          const timeStr = latestFrame.time ? new Date(latestFrame.time * 1000).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : '';
          btn.innerHTML = '🌧️ ปิดเรดาร์ ' + (timeStr ? '<span class="text-[9px] bg-blue-950/70 text-blue-200 px-1 py-0.5 rounded font-normal">' + timeStr + ' น.</span>' : '');
        } else {
          alert('ไม่สามารถดึงข้อมูลเรดาร์ฝนขณะนี้ได้');
          btn.innerHTML = '<span>🌧️ เรดาร์สด</span>';
        }
      } catch (err) {
        console.error('Radar error:', err);
        btn.innerHTML = '<span>🌧️ เรดาร์สด</span>';
        alert('เชื่อมต่อเรดาร์ฝน RainViewer ไม่สำเร็จ');
      }
    }

    // Fetch Live Open-Meteo Hourly Forecast for Selected Coordinates
    async function fetchOpenMeteoHourly(lat, lon) {
      const container = document.getElementById('hourly-bars-container');
      try {
        const url = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&hourly=precipitation_probability,precipitation&forecast_days=1&timezone=Asia%2FBangkok\`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.hourly && data.hourly.precipitation_probability) {
          const nowHour = new Date().getHours();
          container.innerHTML = '';
          for (let i = 0; i < 6; i++) {
            const hIdx = (nowHour + i * 2) % 24;
            const prob = data.hourly.precipitation_probability[hIdx] ?? 0;
            const hourLabel = String(hIdx).padStart(2, '0') + ':00';
            const col = document.createElement('div');
            col.className = 'bg-slate-900 p-1.5 rounded-lg border border-slate-800';
            col.innerHTML = \`<span class=\"text-slate-400 block\">\${hourLabel}</span><span class=\"block font-bold \${prob >= 50 ? 'text-amber-400' : 'text-sky-400'}\">\${prob}%</span>\`;
            container.appendChild(col);
          }
          document.getElementById('hourly-updated-txt').innerText = 'อัปเดตดาวเทียม Open-Meteo สด';
        }
      } catch (e) {
        console.log('Open-Meteo fallback to cached');
      }
    }

    // Start on DOM ready
    window.addEventListener('DOMContentLoaded', initMap);
  </script>
</body>
</html>`;
}
