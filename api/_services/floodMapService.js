import { FLOOD_PROJECTS } from './projectsConfig.js';
import { extractDirectFieldReport, generateFallbackEngineeringSynthesis } from './geminiService.js';

// คำนวณระดับน้ำอุทกวิทยา 3 ชั้น (คลอง vs ถนนนอก/ซอยหน้าโครงการ vs ถนนในโครงการ เกณฑ์ระดับอ้างอิง)
export function calculateHydrologicalLevels(report = {}, project = {}, liveWater = null) {
  const hasFieldReport = Boolean(report && (report.reportId || report.id || report.createdAt || (report.notes && report.notes.trim().length > 0)));
  const rawNotes = ((report.notes || '') + ' \n ' + (report.drainageCondition || '') + ' \n ' + (report.waterLevel || '')).trim();
  const status = hasFieldReport ? (report.status || 'NORMAL') : 'NO_REPORT';

  let canalBelowOuter = null; // ซม. (ผิวน้ำคลองต่ำกว่าถนนภายนอก: ค่าบวก = ต่ำกว่าตลิ่ง, ค่าลบ = ล้นตลิ่ง, null = ไม่ได้ระบุ)
  let canalWaterElevation = null; // เมตร เทียบระดับถนนหน้าโครงการ (0.00 ม.)
  let isCanalOverflow = false;
  let canalStatusText = 'ไม่ได้ระบุระดับคลอง';
  let canalSource = 'UNSPECIFIED'; // 'LIVE_TELEMETRY' | 'FIELD_REPORT' | 'UNSPECIFIED'
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
  if (liveWater && (liveWater.bankDiff != null || liveWater.isOverflow || liveWater.waterLevelMSL != null)) {
    const rawDiffM = Math.abs(liveWater.bankDiff != null ? Number(liveWater.bankDiff) : 0);
    const diffCm = Math.round(rawDiffM * 100);
    const hasExplicitLow = (liveWater.bankStatusText || '').includes('ต่ำกว่า') || (liveWater.bankStatusText || '').includes('ต่ำจาก');
    isCanalOverflow = !hasExplicitLow && Boolean(liveWater.isOverflow || (liveWater.bankStatusText || '').includes('ล้น'));
    
    // 📐 การคำนวณแบบแม่นยำระดับ ม.รทก. (Absolute MSL Benchmark)
    // หากโครงการมีระดับถนนนอก (outerRoadBenchmarkMSL) และสถานีมี waterLevelMSL:
    const outerRoadMSL = typeof project?.outerRoadBenchmarkMSL === 'number' && !isNaN(project.outerRoadBenchmarkMSL)
      ? project.outerRoadBenchmarkMSL
      : (typeof project?.outerRoadMSL === 'number' && !isNaN(project.outerRoadMSL) ? project.outerRoadMSL : null);

    if (outerRoadMSL != null && liveWater.waterLevelMSL != null) {
      const mslDiff = Number((liveWater.waterLevelMSL - outerRoadMSL).toFixed(2));
      canalWaterElevation = mslDiff; // ผิวน้ำเทียบระดับถนนนอก (ม.) เช่น -0.52 ม. หรือ +0.10 ม.
      canalBelowOuter = -Math.round(mslDiff * 100); // ซม. (ค่าบวก = ต่ำกว่าถนน, ค่าลบ = ล้นถนน)
      isCanalOverflow = mslDiff > 0;
      if (isCanalOverflow) {
        canalStatusText = `ล้นถนนนอก ${Math.abs(canalBelowOuter)} ซม. ⚠️ (ระดับ ${liveWater.waterLevelMSL.toFixed(2)} ม.รทก.)`;
      } else {
        const distBelow = Math.abs(canalBelowOuter);
        canalStatusText = distBelow <= 20
          ? `หนุนสูง (ต่ำกว่าถนน ${distBelow} ซม. / ${liveWater.waterLevelMSL.toFixed(2)} ม.รทก.)`
          : `ในเกณฑ์ (ต่ำกว่าถนน ${distBelow} ซม. / ${liveWater.waterLevelMSL.toFixed(2)} ม.รทก.)`;
      }
    } else if (isCanalOverflow) {
      // ⚠️ กรณีตลิ่งธรรมชาติของสถานีโทรมาตรภายนอกล้น แต่ยังไม่ทราบระดับความสูงถนนเทียบ ม.รทก. แน่ชัด
      // ห้ามด่วนสรุปว่าน้ำท่วมผิวถนนหน้าโครงการ ให้ตั้งระดับน้ำเสมอถนน/ตลิ่งภายนอก (0.00 ม.) เพื่อเฝ้าระวัง
      canalWaterElevation = 0.00;
      canalBelowOuter = 0;
      canalStatusText = `สถานีโทรมาตร: ระดับน้ำแม่น้ำ/คลองภายนอกล้นตลิ่ง (+${diffCm} ซม.) ⚠️ เฝ้าระวังมวลน้ำ`;
    } else {
      canalWaterElevation = -(rawDiffM); // ผิวน้ำต่ำกว่าตลิ่ง เช่น -0.77ม. หรือ -1.19ม.
      canalBelowOuter = diffCm;
      canalStatusText = diffCm <= 20 ? `หนุนสูง (ต่ำกว่าตลิ่ง ${diffCm} ซม.)` : `ในเกณฑ์ (ต่ำกว่าตลิ่ง ${diffCm} ซม.)`;
    }
    canalSource = 'LIVE_TELEMETRY';
  }

  // 1. ตรวจสอบการยกสูงของถนนในโครงการเทียบกับถนนหน้าโครงการที่หน้างานแจ้ง (Field-measured Road Elevation)
  let fieldInnerElevationDiff = null;
  const innerElevMatch = rawNotes.match(/(?:ถนนใน(?:โครงการ)?|พื้นโครงการ|ระดับถนนใน(?:โครงการ)?)\s*(?:ยก)?สูงกว่า\s*(?:ถนน(?:นอก|หน้าโครงการ)?|ระดับถนนหน้าโครงการ|ระดับถนน)[^0-9\n]*(\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i) ||
                         rawNotes.match(/(?:ต่างระดับ|สูงกว่าถนน(?:หน้าโครงการ|นอก))\s*(?:อยู่)?\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i);
  if (innerElevMatch) {
    let elevCm = parseFloat(innerElevMatch[1]);
    const isMeter = /(?:\d+\s*(?:ม\.|เมตร|\.m|m)(?!\s*(?:ซม|cm)))/i.test(innerElevMatch[0]);
    if (isMeter && !/(?:cm|ซม|เซน)/i.test(innerElevMatch[0])) elevCm *= 100;
    fieldInnerElevationDiff = Math.round(elevCm);
  }

  // 2. ถ้ามีรายงานตรวจจริงหน้างานระบุระดับคลอง ให้อ้างอิงตามหน้างาน (ลำดับความสำคัญสูงสุด)
  // ตัดข้อความความต่างระดับถนนในโครงการยกสูงกว่าถนนนอก ออกก่อน เพื่อไม่ให้คำว่า "สูงกว่าถนน... 50 cm" ไปหลอกว่าน้ำคลองล้นตลิ่ง!
  // และตัดข้อความเกี่ยวกับ "บ่อบำบัด/บ่อพัก/บ่อสูบ/บ่อหน่วง/ขอบบ่อ" และถนนในโครงการออก เพื่อไม่ให้สับสนกับระดับน้ำคลองภายนอก
  // แยกข้อความเป็นเซกเมนต์เพื่อกรองข้อมูลถนนในโครงการและบ่อบำบัดออก โดยไม่ทำให้ข้อความคลองในบรรทัดเดียวกันหายไป
  const rawCanalSegments = rawNotes
    .split(/(?:\r?\n|(?<=\S|\b)\s*(?:-(?!\d)|[*•]|>>|\d+\.(?!\d)\s*|\d+\)\s*)\s*)/)
    .map(s => s.trim())
    .filter(Boolean);

  const canalSegments = rawCanalSegments.filter(s => {
    // ข้ามเซกเมนต์ที่เป็นเฉพาะถนนในโครงการ หรือบ่อบำบัด/บ่อพัก (ที่ไม่มีคำเกี่ยวกับคลอง/ทางระบายน้ำ)
    if (/(?:ถนนใน(?:โครงการ)?|พื้นโครงการ|ระดับถนนใน(?:โครงการ)?|บ่อบำบัด|ปากบ่อ|บ่อพัก|บ่อสูบ|บ่อหน่วง|ขอบบ่อ)/i.test(s) &&
        !/(?:คลอง|ทางระบาย|ท่อระบาย|ตลิ่ง)/i.test(s)) {
      return false;
    }
    return true;
  });

  const canalSearchText = canalSegments.join(' \n ');

  const canalAboveMatch = canalSearchText.match(/[-+]?\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)\s*(?:สูงกว่า|เสมอระดับ|เสมอผิวถนน|เสมอถนน|เหนือถนน)\s*(?:ระดับ)?\s*(?:ผิวถนน|ถนนหน้าโครงการ|ถนนนอก|ถนน|ตลิ่ง)/i) ||
                          canalSearchText.match(/(?:สูงกว่า|เสมอระดับ)(?:ระดับ)?\s*(?:ผิวถนน|ถนนหน้าโครงการ|ถนนนอก|ถนน|ตลิ่ง)[^\d\n]*?[+]?(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)/i) ||
                          canalSearchText.match(/\+\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)\s*(?:สูงกว่า|เสมอระดับผิวถนน|เสมอผิวถนน|เสมอถนน|เหนือถนน)/i) ||
                          canalSearchText.match(/(?:คลอง|ระดับน้ำในคลอง)[^0-9\n]*?\(\s*\+\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)/i) ||
                          canalSearchText.match(/(?:คลอง|ระดับน้ำในคลอง)[^0-9\n]*?\+\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)/i) ||
                          canalSearchText.match(/(?:คลอง|ระดับน้ำในคลอง)[^0-9\n]*?สูง(?:กว่า|ขึ้นมา)\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)/i);

  const canalBelowMatch = canalSearchText.match(/[-]?\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)\s*(?:ต่ำกว่า|ต่ำจาก|ลดลงจาก|จาก)\s*(?:ระดับ)?\s*(?:ผิวถนน|ถนนหน้าโครงการ|ถนนนอก|ถนน|ตลิ่ง)/i) ||
                          canalSearchText.match(/(?:ต่ำกว่า|ต่ำจาก|ลดลงจาก)(?:ระดับ)?\s*(?:ผิวถนน|ถนนหน้าโครงการ|ถนนนอก|ถนน|ตลิ่ง)[^\d\n]*?[-+]?(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)/i) ||
                          canalSearchText.match(/-\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)\s*(?:จากผิวถนน|จากถนนนอก|จากตลิ่ง|จากถนน)/i) ||
                          canalSearchText.match(/(?:คลอง|ระดับน้ำในคลอง|น้ำในคลอง)[^0-9\n]*?ต่ำกว่า(?:ระดับ)?\s*(?:ผิวถนน|ถนน|ตลิ่ง)[^\d\n]*?[-+]?(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)/i) ||
                          canalSearchText.match(/ต่ำกว่า(?:ระดับ)?\s*(?:ผิวถนน|ถนน|ตลิ่ง)[^\d\n]*?[-+]?(\d+(?:\.\d+)?)\s*(?:cm|ซม|เซน|ม\.?|เมตร|m)/i);

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
  } else if (/หนุน|ปริ่ม|ใกล้ตลิ่ง/i.test(report.drainageCondition || '') && !/ต่ำกว่า|ต่ำจาก|ลดลงจาก|ปกติ|แห้ง|-\s*\d+/i.test(report.drainageCondition || '')) {
    canalBelowOuter = 10;
    canalWaterElevation = -0.10;
    canalStatusText = 'หน้างานแจ้ง: น้ำคลองหนุนสูง (ต่ำกว่าตลิ่ง 10 ซม.)';
    canalSource = 'FIELD_REPORT';
  } else if (canalSource === 'UNSPECIFIED') {
    // ⚠️ คำสั่งเคร่งครัด: หากหน้างานไม่ได้พิมพ์ส่งมา และไม่มีโทรมาตร ห้ามคิดตัวเลขขึ้นมาเองเด็ดขาด
    canalBelowOuter = null;
    canalWaterElevation = null;
    isCanalOverflow = false;
    canalStatusText = hasFieldReport ? 'หน้างานไม่ได้ระบุระดับคลอง' : 'รอข้อมูลสำรวจระดับน้ำคลอง';
  }

  // 2.1 วิเคราะห์ระดับน้ำในบ่อพักระบายน้ำ (หลังประตูน้ำ จุดที่เชื่อมกับแหล่งน้ำสาธารณะ) เทียบกับขอบบ่อ
  let outfallSumpWaterVsRimCm = null;
  let outfallSumpConditionText = null;
  const sumpPattern = /(?:ระดับน้ำใน)?(?:บ่อพัก(?:ระบายน้ำ)?|บ่อระบายน้ำ|บ่อสูบ|บ่อหน่วง)?\s*(?:หลัง\s*(?:ประตูน้ำ|ปตร\.)|จุดเชื่อม(?:แหล่ง)?น้ำสาธารณะ|จุดเชื่อมท่อสาธารณะ)[^\n\r]*?(?:ต่ำกว่า|ต่ำจาก|สูงกว่า|เสมอ|จาก)\s*(?:ขอบบ่อ|ปากบ่อ)[^\d\n\-+]*?([-+]?\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i;
  const sumpAltPattern = /(?:ระดับน้ำใน)?(?:บ่อพักระบายน้ำ|บ่อพักหลัง|บ่อระบายน้ำ)[^\n\r]*?(?:ต่ำกว่า|ต่ำจาก|สูงกว่า|เสมอ)\s*(?:ขอบบ่อ|ปากบ่อ)[^\d\n\-+]*?([-+]?\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i;
  const sumpGenericPattern = /(?:ต่ำกว่า|ต่ำจาก|ลดลงจาก)\s*(?:ขอบบ่อ|ปากบ่อ)[^\d\n\-+]*?([-+]?\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i;
  const sumpAboveGenericPattern = /(?:สูงกว่า|เสมอระดับ|เสมอ)\s*(?:ขอบบ่อ|ปากบ่อ)[^\d\n\-+]*?([-+]?\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i;
  const sumpMatch = rawNotes.match(sumpPattern) || rawNotes.match(sumpAltPattern) || rawNotes.match(sumpGenericPattern) || rawNotes.match(sumpAboveGenericPattern);

  if (sumpMatch) {
    let parsedCm = parseFloat(sumpMatch[1]);
    const isMeter = /(?:\d+\s*(?:ม\.|เมตร|\.m|m)(?!\s*(?:ซม|cm)))/i.test(sumpMatch[0]);
    if (isMeter && !/(?:cm|ซม|เซน)/i.test(sumpMatch[0])) parsedCm *= 100;
    const isBelow = /(?:ต่ำกว่า|ต่ำจาก|ลดลงจาก)/i.test(sumpMatch[0]);
    const isAbove = /(?:สูงกว่า|ล้นขอบ|เหนือขอบ)/i.test(sumpMatch[0]);

    if (isBelow) {
      outfallSumpWaterVsRimCm = -Math.abs(Math.round(parsedCm)); // ค่าติดลบ = ต่ำกว่าขอบบ่อ
      outfallSumpConditionText = `ต่ำกว่าขอบบ่อ ${Math.abs(outfallSumpWaterVsRimCm)} ซม.`;
    } else if (isAbove) {
      outfallSumpWaterVsRimCm = +Math.abs(Math.round(parsedCm)); // ค่าบวก = ล้นสูงกว่าขอบบ่อ
      outfallSumpConditionText = `ล้นสูงกว่าขอบบ่อ +${outfallSumpWaterVsRimCm} ซม. ⚠️`;
    } else {
      outfallSumpWaterVsRimCm = -Math.abs(Math.round(parsedCm));
      outfallSumpConditionText = `ต่ำกว่าขอบบ่อ ${Math.abs(outfallSumpWaterVsRimCm)} ซม.`;
    }
  }

  // 2.2 วิเคราะห์ระดับน้ำในท่อระบายน้ำเทียบกับระดับถนนนอกโครงการ (กรณีไม่ติดคลอง แต่มีท่อระบายน้ำ)
  let publicDrainWaterVsOuterCm = null;
  let publicDrainConditionText = null;
  const drainPattern = /(?:ระดับน้ำใน)?(?:ท่อระบายน้ำ(?:สาธารณะ)?|ท่อสาธารณะ|ท่อระบาย)[^\n\r]*?(?:ต่ำกว่า|ต่ำจาก|ลดลงจาก|สูงกว่า)\s*(?:ระดับ)?\s*(?:ผิวถนน(?:นอก)?|ถนนนอก|ถนนหน้าโครงการ|ถนน)[^\d\n\-+]*?([-+]?\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i;
  const drainAltPattern = /(?:ต่ำกว่า|ต่ำจาก|ลดลงจาก|สูงกว่า)\s*(?:ระดับ)?\s*(?:ผิวถนน(?:นอก)?|ถนนนอก|ถนนหน้าโครงการ)[^\n\r]*?(?:ท่อระบายน้ำ|ท่อสาธารณะ)[^\d\n\-+]*?([-+]?\d+(?:\.\d+)?)\s*(?:cm|ซม|ม\.?)/i;
  const drainMatch = rawNotes.match(drainPattern) || rawNotes.match(drainAltPattern);

  if (drainMatch) {
    let parsedCm = parseFloat(drainMatch[1]);
    const isMeter = /(?:\d+\s*(?:ม\.|เมตร|\.m|m)(?!\s*(?:ซม|cm)))/i.test(drainMatch[0]);
    if (isMeter && !/(?:cm|ซม|เซน)/i.test(drainMatch[0])) parsedCm *= 100;
    const isBelow = /(?:ต่ำกว่า|ต่ำจาก|ลดลงจาก)/i.test(drainMatch[0]);
    const isAbove = /(?:สูงกว่า|ล้นท่อ)/i.test(drainMatch[0]);

    if (isBelow) {
      publicDrainWaterVsOuterCm = -Math.abs(Math.round(parsedCm)); // ค่าติดลบ = ต่ำกว่าผิวถนนนอก
      publicDrainConditionText = `ท่อระบายน้ำต่ำกว่าถนนนอก ${Math.abs(publicDrainWaterVsOuterCm)} ซม.`;
    } else if (isAbove) {
      publicDrainWaterVsOuterCm = +Math.abs(Math.round(parsedCm)); // ค่าบวก = น้ำในท่อเอ่อล้นถนนนอก
      publicDrainConditionText = `ท่อระบายน้ำเอ่อล้นถนนนอก +${publicDrainWaterVsOuterCm} ซม. ⚠️`;
    } else {
      publicDrainWaterVsOuterCm = -Math.abs(Math.round(parsedCm));
      publicDrainConditionText = `ท่อระบายน้ำต่ำกว่าถนนนอก ${Math.abs(publicDrainWaterVsOuterCm)} ซม.`;
    }
  }

  // 3. คำนวณระดับยกพื้น/ระดับถนนในโครงการ (innerElevation) ตามลำดับความสำคัญ (3-Tier Precedence)
  let innerElevation = 80;
  let innerSource = 'ENGINEERING_STANDARD'; // 'FIELD_MEASURED' | 'AS_BUILT' | 'ENGINEERING_STANDARD'

  if (fieldInnerElevationDiff !== null) {
    innerElevation = fieldInnerElevationDiff;
    innerSource = 'FIELD_MEASURED';
  } else {
    const innerMatch = rawNotes.match(/-\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)\s*(?:จากพื้นโครงการ|จากถนนในโครงการ|จากในโครงการ)/i);
    if (innerMatch) {
      let parsedInner = parseFloat(innerMatch[1]);
      const isMeter = /(?:\d+\s*(?:ม\.|เมตร|\.m|m)(?!\s*(?:ซม|cm)))/i.test(innerMatch[0]);
      if (isMeter && !/(?:cm|ซม|เซน)/i.test(innerMatch[0])) parsedInner *= 100;
      if (canalBelowOuter !== null && parsedInner > canalBelowOuter) {
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
  }

  // 3.1 สันเนินทางเข้า / ป้อม รปภ. (Entrance Crest Level) ถ้ามี
  const hasEntranceCrest = typeof project?.entranceCrestDiff === 'number' && !isNaN(project.entranceCrestDiff) && project.entranceCrestDiff > 0;
  const entranceCrestDiff = hasEntranceCrest ? Number(project.entranceCrestDiff) : null;
  const crestElevation = hasEntranceCrest ? Math.round(entranceCrestDiff * 100) : null;
  // เกณฑ์กั้นน้ำบ่าภายนอกเข้าโครงการ (Effective Inflow Barrier)
  const effectiveBarrier = hasEntranceCrest ? Math.max(innerElevation, crestElevation) : innerElevation;

  // ระยะผิวน้ำคลองเทียบถนนในโครงการ (innerElevation ลบด้วยระดับน้ำคลอง)
  const canalBelowInner = (canalWaterElevation !== null) ? (innerElevation - Math.round(canalWaterElevation * 100)) : null;

  // 4. วิเคราะห์ระดับน้ำบนถนนหน้าโครงการ / ซอยภายนอก / ถนนภาระจำยอม (Outer Road Water) จาก 2 แหล่ง
  const segments = rawNotes
    .split(/(?:\r?\n|(?<=\S|\b)\s*(?:-(?!\d)|[*•]|>>|\d+\.(?!\d)\s*|\d+\)\s*)\s*)/)
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
      // ข้ามเซกเมนต์ที่เป็นเพียงการวัดระดับน้ำภายในบ่อพัก/บ่อสูบ/บ่อหน่วง/ขอบบ่อ (ไม่ได้ท่วมผิวถนน)
      const isSubsurfacePond = /(?:บ่อพัก|บ่อสูบ|บ่อหน่วง|บ่อบำบัด|ขอบบ่อ|ปากบ่อ)/i.test(cleanedSeg) &&
                               !/(?:เอ่อล้น|ล้นข้าม|ล้นบ่อ|ท่วมผิว|ท่วมถนน)/i.test(cleanedSeg);

      if (!isSubsurfacePond && !isDrySeg) {
        // 1. ระบุตัวเลขความลึกน้ำชัดเจน เช่น "น้ำท่วมขัง 10 cm", "มีน้ำขัง 15 ซม."
        const numMatch = cleanedSeg.match(/(?:ท่วมขัง|น้ำท่วมขัง|มีน้ำขัง|น้ำท่วม|ท่วมสูง|รอการระบาย)[^0-9\n]*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i);
        if (numMatch) {
          hasExplicitOuterFlood = true;
          detectedOuterDepth = Math.max(detectedOuterDepth, parseFloat(numMatch[1]));
        }

        // 2. ระดับหมุดหมายกายภาพ (Physical Landmark Depths)
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
        } else if (/(?:มีน้ำท่วมขัง|น้ำท่วมขัง|ท่วมขัง|น้ำท่วม|มีน้ำขัง)/i.test(cleanedSeg)) {
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
    // กรองข้อความระดับน้ำในบ่อพัก/บ่อสูบ/บ่อหน่วงออก ไม่ให้คิดว่าน้ำในบ่อคือน้ำท่วมบนผิวถนนในโครงการ
    const innerCleanedNotes = rawNotes
      .replace(/\([^)]*(?:บ่อพัก|บ่อสูบ|บ่อหน่วง|บ่อบำบัด|ขอบบ่อ|ปากบ่อ)[^)]*\)/gi, '')
      .replace(/(?:บ่อพัก|บ่อสูบ|บ่อหน่วง|บ่อบำบัด)[^\n\r]*(?:ท่วม|ขัง|ระดับน้ำ)[^\n\r]*/gi, '');
    const innerFloodMatch = innerCleanedNotes.match(/(?:ในโครงการ|ถนนใน|ถนนเมนโครงการ)[^0-9\n]*(?:ท่วม|ขัง)\s*(\d+(?:\.\d+)?)\s*(?:cm|ซม)/i);
    if (innerFloodMatch && !/(?:ในบ่อ|ในท่อ)/i.test(innerFloodMatch[0])) {
      innerRoadWaterDepth = parseFloat(innerFloodMatch[1]);
    } else {
      innerRoadWaterDepth = 0; // ในโครงการแห้งสนิท เพราะยกพื้น/มีเนิน รปภ. กั้นน้ำบ่า
    }
  }

  // ระยะความปลอดภัย (Safety Freeboard Margin)
  const safetyMargin = effectiveBarrier - outerRoadWaterDepth;

  const isCanalHigh = isCanalOverflow || (canalWaterElevation !== null && canalWaterElevation >= -0.15) || status === 'WATCH' || status === 'CRITICAL' || /หนุน|ล้น|สูง|ริมฟุตบาท/i.test(report.drainageCondition || '');
  const flapValve = isCanalHigh ? 'CLOSED' : 'OPEN';
  const pumpStatus = (isCanalOverflow || outerRoadWaterDepth > 0 || status === 'CRITICAL') ? 'ACTIVE' : (isCanalHigh ? 'STANDBY' : 'READY');

  const sumpRimVsInnerDiff = typeof project?.sumpRimVsInnerDiff === 'number' && !isNaN(project.sumpRimVsInnerDiff)
    ? project.sumpRimVsInnerDiff
    : 0.00;

  const sumpRimVsOuterDiff = typeof project?.sumpRimVsOuterDiff === 'number' && !isNaN(project.sumpRimVsOuterDiff)
    ? project.sumpRimVsOuterDiff
    : (typeof project?.asBuiltElevationDiff === 'number' ? (project.asBuiltElevationDiff + sumpRimVsInnerDiff) : 0.80);

  const sumpWaterElevationVsOuter = (outfallSumpWaterVsRimCm !== null)
    ? Number((sumpRimVsOuterDiff + (outfallSumpWaterVsRimCm / 100)).toFixed(2))
    : null;

  const publicDrainWaterElevation = (publicDrainWaterVsOuterCm !== null)
    ? Number((publicDrainWaterVsOuterCm / 100).toFixed(2))
    : null;

  const isBackwaterHazard = (sumpWaterElevationVsOuter !== null) && (
    (canalWaterElevation !== null && canalWaterElevation > sumpWaterElevationVsOuter) ||
    (publicDrainWaterElevation !== null && publicDrainWaterElevation > sumpWaterElevationVsOuter)
  );

  return {
    hasFieldReport,
    canalWaterElevation: canalWaterElevation !== null ? Number(canalWaterElevation.toFixed(2)) : null,
    canalBelowOuter: canalBelowOuter !== null ? Math.round(canalBelowOuter) : null,
    canalBelowInner: canalBelowInner !== null ? Math.round(canalBelowInner) : null,
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
    sumpRimVsInnerDiff,
    sumpRimVsOuterDiff,
    outfallSumpWaterVsRimCm,
    outfallSumpConditionText,
    sumpWaterElevationVsOuter,
    isBackwaterHazard,
    publicDrainWaterVsOuterCm,
    publicDrainConditionText,
    publicDrainWaterElevation,
    asBuiltBenchmarkMSL: project?.asBuiltBenchmarkMSL || null,
    asBuiltNotes: project?.asBuiltNotes || null,
    hasFloodwall,
    floodwallHeightDiff,
    floodwallElevation,
    outerElevation: 0,  // เกณฑ์อ้างอิงถนนภายนอก (0 ซม.)
    canalElevation: canalWaterElevation !== null ? Number(canalWaterElevation.toFixed(2)) : null,
    flapValve,
    pumpStatus
  };
}

// สร้าง HTML สำหรับหน้า Map Dashboard
export function generateFloodMapHtml({ 
  projectsData = [], 
  summaryStats = {}, 
  generatedAtThai = '',
  damIndicators = {},
  watergates = {},
  tidalStatus = {},
  tmdAdvisory = {}
}) {
  const safeDataJson = JSON.stringify(projectsData).replace(/</g, '\\u003c');
  const safeDamJson = JSON.stringify(damIndicators || {}).replace(/</g, '\\u003c');
  const safeGatesJson = JSON.stringify(watergates || {}).replace(/</g, '\\u003c');
  const safeTidalJson = JSON.stringify(tidalStatus || {}).replace(/</g, '\\u003c');
  const safeTmdJson = JSON.stringify(tmdAdvisory || {}).replace(/</g, '\\u003c');

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
        <a href="/api/flood-report?mode=asbuilt" class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/60 transition-colors shadow-sm" title="จัดการเกณฑ์ระดับความสูงอ้างอิงโครงการ">
          <span>📐</span>
          <span class="hidden sm:inline">เกณฑ์ระดับโครงการ</span>
          <span class="sm:hidden">ระดับโครงการ</span>
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

    <!-- 🌊 แถบโทรมาตรต้นน้ำ, เขื่อนหลัก, ประตูระบายน้ำ และรอบน้ำทะเลหนุน (Basin Hydro Barometer) -->
    <div class="w-full mt-2 pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
      <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <!-- C.13 เขื่อนเจ้าพระยา (ชัยนาท) -->
        <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/80 border border-rose-700/70 text-rose-200 shadow-xs" title="อัตราการระบายน้ำท้ายเขื่อนเจ้าพระยา สถานี C.13 ชัยนาท">
          <span>🌊</span>
          <span class="font-bold">เขื่อนเจ้าพระยา C.13:</span>
          <span class="font-mono font-black text-rose-400 text-xs">${damIndicators.c13?.discharge ?? 2500} ลบ.ม./วิ</span>
          <span class="px-1.5 py-0.2 rounded text-[9px] bg-rose-900/70 font-semibold text-rose-300">${damIndicators.c13?.statusText ?? 'วิกฤติน้ำหลาก'}</span>
        </div>

        <!-- S.28 เขื่อนป่าสัก & S.26 พระรามหก -->
        <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/70 border border-amber-700/60 text-amber-200 shadow-xs" title="อัตราการระบายน้ำเขื่อนป่าสักชลสิทธิ์ (S.28) และท้ายเขื่อนพระรามหก (S.26)">
          <span>🏞️</span>
          <span class="font-semibold">ป่าสัก (S.28):</span>
          <span class="font-mono font-bold text-amber-300">${damIndicators.s28?.discharge ?? 460} ลบ.ม./วิ</span>
          <span class="text-slate-500">|</span>
          <span class="font-semibold">พระรามหก:</span>
          <span class="font-mono font-bold text-amber-300">${damIndicators.s26?.discharge ?? 740}</span>
        </div>

        <!-- อิทธิพลน้ำทะเลหนุน กรมอุทกศาสตร์ กองทัพเรือ -->
        <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-950/70 border border-sky-700/60 text-sky-200 shadow-xs" title="${tidalStatus.advice || 'รอบน้ำทะเลหนุน กรมอุทกศาสตร์ กองทัพเรือ'}">
          <span>⚓</span>
          <span class="font-semibold">น้ำทะเลหนุน:</span>
          <span class="font-bold text-sky-300">${tidalStatus.badge ?? 'ช่วงน้ำหนุน'}</span>
          <span class="text-[10px] text-slate-400 font-mono">(พีค ${tidalStatus.morningPeak ? tidalStatus.morningPeak.split(' ')[0] : '08:30'} / ${tidalStatus.eveningPeak ? tidalStatus.eveningPeak.split(' ')[0] : '20:00'})</span>
        </div>

        <!-- ปตร.จุฬาลงกรณ์ (ATG101 คลองรังสิต) -->
        <div class="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 shadow-xs" title="${watergates.atg101?.statusText || 'ปตร.จุฬาลงกรณ์ คลองรังสิตประยูรศักดิ์'}">
          <span>🚪</span>
          <span class="font-semibold">ปตร.จุฬาฯ:</span>
          <span class="font-mono text-emerald-300 text-[10px]">ใน ${watergates.atg101?.levelIn ?? 2.23} ม.</span>
          <span class="text-slate-500">/</span>
          <span class="font-mono text-amber-300 text-[10px]">นอก ${watergates.atg101?.levelOut ?? 2.24} ม.</span>
        </div>
      </div>

      <!-- ปุ่มเปิดเรดาร์ Doppler และประกาศ TMD -->
      <div class="flex items-center gap-1.5 ml-auto">
        <button onclick="openDopplerModal()" class="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/60 transition-all shadow-md animate-pulse" title="เปิดหน้าต่างเรดาร์ Doppler กทม. & กรมอุตุฯ สด">
          <span>📡 เรดาร์ Doppler สด</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Filter & Layer Controls (Floating Left) -->
  <aside class="fixed top-36 md:top-32 left-3 z-20 flex flex-col gap-2 max-w-[280px] sm:max-w-xs pointer-events-auto">
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

      <!-- Secondary Filters: Outer Flood Triage, Risk, Radar & Doppler -->
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
      <div class="pt-1">
        <button onclick="openDopplerModal()" id="doppler-radar-btn" class="w-full flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold bg-indigo-950/70 text-indigo-300 hover:text-white border border-indigo-700/60 transition-all text-center shadow-xs" title="เปิดหน้าต่างเรดาร์ Doppler กทม. และ สุวรรณภูมิ สำหรับ Nowcasting">
          <span>📡 เรดาร์ Doppler กทม./อุตุฯ (0-2 ชม.)</span>
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
            ยังไม่มีเจ้าหน้าที่โครงการส่งผลสำรวจจริง ข้อมูลที่แสดงประเมินจากโทรมาตรสถานีน้ำใกล้เคียงและเกณฑ์ระดับความสูงอ้างอิงโครงการ
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
          <div id="field-sump-row" style="display: none;"><strong class="text-slate-400">🕳️ บ่อพักหลัง ปตร.:</strong> <span id="field-sump-water" class="text-sky-300 font-semibold">-</span></div>
          <div id="field-drain-row" style="display: none;"><strong class="text-slate-400">🚰 ท่อระบายน้ำสาธารณะ:</strong> <span id="field-drain-water" class="text-sky-300 font-semibold">-</span></div>
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

        <!-- Engineering & Ground Synthesis Summary Table (ประมวลผลร่วมกับหน้างาน) -->
        <div class="space-y-2 pt-1">
          <div class="flex items-center justify-between text-[10px] font-semibold text-slate-300">
            <span>🛡️ เกณฑ์วิศวกรรมป้องกันน้ำท่วมของโครงการ (Engineering Defense)</span>
            <span id="cs-source-tag" class="text-[9px] text-sky-400 font-semibold">📐 เกณฑ์อ้างอิง</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <div class="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <span class="text-slate-400 block text-[10px]">ระดับน้ำคลองเทียบถนนนอก</span>
              <span id="cs-canal-outer" class="font-bold text-sky-400 text-sm">ต่ำกว่า 40 ซม.</span>
              <span id="cs-canal-outer-sub" class="text-[9px] text-slate-400 block leading-tight">เกณฑ์ควบคุมปกติ</span>
            </div>
            <div class="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <span class="text-slate-400 block text-[10px]">ระยะปลอดภัยถนนใน (Freeboard)</span>
              <span id="cs-canal-inner" class="font-bold text-emerald-400 text-sm">ต่ำกว่า 120 ซม.</span>
              <span id="cs-canal-inner-sub" class="text-[9px] text-slate-400 block leading-tight">ปลอดภัยสูง (ถมดินยก +0.80 ม.)</span>
            </div>
            <div class="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <span class="text-slate-400 block text-[10px]">บานพับ Flap Valve</span>
              <span id="cs-flap-valve" class="font-bold text-emerald-400">เปิดระบายธรรมชาติ</span>
              <span id="cs-flap-valve-sub" class="text-[9px] text-slate-400 block leading-tight">ระบายน้ำตามแรงโน้มถ่วง</span>
            </div>
            <div class="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <span class="text-slate-400 block text-[10px]">ระบบเครื่องสูบน้ำโครงการ</span>
              <span id="cs-pump-status" class="font-bold text-emerald-400">พร้อมใช้งาน 100%</span>
              <span id="cs-pump-status-sub" class="text-[9px] text-slate-400 block leading-tight">สแตนด์บายลูกลอยอัตโนมัติ</span>
            </div>
          </div>
        </div>

        <!-- โครงสร้างป้องกันเสริม (สันเนินทางเข้าป้อม รปภ. / เขื่อน คสล. ริมคลอง) -->
        <div id="cs-barrier-box" class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[10px]" style="display:none;">
          <div class="flex items-center gap-1.5 text-amber-300 font-semibold">
            <span>🧱 โครงสร้างป้องกันเสริม:</span>
            <span id="cs-barrier-text" class="text-slate-200 font-normal">-</span>
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
      <!-- 📐 หมวด 4: เกณฑ์ระดับความสูงอ้างอิงโครงการ & แนวคันกั้นน้ำ (LH Engineering Resilience) -->
      <!-- แหล่งข้อมูล: เกณฑ์ระดับวิศวกรรม Land & Houses & การสำรวจหมุดระดับ -->
      <!-- ========================================== -->
      <div class="bg-slate-900/90 rounded-2xl p-3.5 border border-amber-900/50 space-y-2.5 shadow-md">
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <h3 class="font-bold text-white text-xs flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-lh-gold"></span>
              <span>หมวด 4: เกณฑ์ระดับความสูงอ้างอิงโครงการ & แนวคันกั้นน้ำ</span>
            </h3>
            <p class="text-[9px] text-slate-400">แหล่งข้อมูล: เกณฑ์ระดับวิศวกรรม Land & Houses & การสำรวจหมุดระดับ</p>
          </div>
          <span id="cs-asbuilt-badge" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">📐 เกณฑ์อ้างอิง: +0.80 ม.</span>
        </div>

        <!-- Engineering Elevation Specs Grid -->
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800 space-y-0.5">
            <span class="text-slate-400 block text-[10px]">🏡 ถนนในโครงการ (เกณฑ์อ้างอิง)</span>
            <div id="spec-inner-elev" class="font-bold text-emerald-400 text-xs">+0.80 ม.</div>
            <span class="text-[9px] text-slate-500 block">ยกสูงเหนือถนนภายนอก</span>
          </div>
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-800 space-y-0.5">
            <span class="text-slate-400 block text-[10px]">🕳️ ปากบ่อพักหลัง ปตร.</span>
            <div id="spec-sump-rim-elev" class="font-bold text-sky-400 text-xs">เสมอถนนใน (0.00 ม.)</div>
            <span id="spec-sump-rim-outer" class="text-[9px] text-slate-500 block">เทียบถนนนอก +0.80 ม.</span>
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
          <div class="col-span-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-slate-400 block text-[10px]">📏 ระยะปลอดภัยถนนในโครงการ (Freeboard)</span>
              <span class="text-[9px] text-slate-500 block">ความสูงถนนในเหนือผิวน้ำภายนอก</span>
            </div>
            <div id="spec-freeboard" class="font-bold text-emerald-400 text-sm">+80 ซม.</div>
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

        <!-- Shortcut to Project Elevation Benchmark Manager -->
        <div class="pt-1">
          <a id="btn-asbuilt-mgr" href="/api/flood-report?mode=asbuilt" target="_blank" class="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 transition-all font-semibold text-xs shadow-xs" title="เปิดระบบบันทึกและจัดการเกณฑ์ระดับความสูงโครงการ">
            <span>📐 เปิดระบบจัดการเกณฑ์ระดับความสูงโครงการ ↗</span>
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
            dzSynthesisText.innerHTML = '<span class="text-amber-300 font-semibold">⚠️ ถนนซอย/ทางเข้าหน้าโครงการมีน้ำท่วมขัง ' + outerDepth + ' ซม.' + depthLabel + '</span> แต่ <span class="text-emerald-400 font-bold">ถนนภายในโครงการยกพื้นสูงกว่าระดับน้ำภายนอก +' + safetyMargin + ' ซม.</span> (ถมยกพื้นสูงกว่าถนนนอก +' + elevMeters + ' ม.' + sandbagNote + ') ทำให้น้ำภายนอกไม่สามารถไหลเข้าโครงการได้ บานพับ Flap Valve ปิดกันน้ำย้อน สัญจรในโครงการแห้ง 100%';
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
          dzSynthesisText.innerHTML = '<span class="text-emerald-400 font-semibold">🟢 สภาพปกติทั้งสองโซน:</span> ถนนหน้าโครงการและถนนเมนภายในแห้งสนิท สัญจรได้คล่องตัว ระดับยกพื้นโครงการสูงกว่าถนนนอก +' + elevMeters + ' ม.' + crestInfo + ' รองรับสถานการณ์ได้ปลอดภัย';
          if (dzStatusTag) {
            dzStatusTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            dzStatusTag.innerText = 'สภาวะปกติ';
          }
        } else {
          const crestInfo = hydro.hasEntranceCrest ? (' และมีสันเนินทางเข้า +' + (hydro.crestElevation / 100).toFixed(2) + ' ม.') : '';
          dzSynthesisText.innerHTML = '<span class="text-slate-400">⚪ รอข้อมูลตรวจเช็คสภาพผิวถนนหน้าโครงการจากภาคสนาม</span> โดยโครงการได้ถมดินยกพื้นสูง +' + elevMeters + ' ม. (เกณฑ์อ้างอิง)' + crestInfo + ' ตามเกณฑ์ป้องกันน้ำท่วมของแลนด์ แอนด์ เฮ้าส์';
          if (dzStatusTag) {
            dzStatusTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/50 text-slate-300 border border-slate-600/50';
            dzStatusTag.innerText = 'รอข้อมูลภาคสนาม';
          }
        }

        if (hydro.isBackwaterHazard) {
          dzSynthesisText.innerHTML += '<div class="mt-1.5 pt-1 border-t border-slate-800 text-rose-300 font-semibold flex items-center gap-1 text-[10px]"><span>⚠️</span><span>ตรวจพบความเสี่ยงน้ำย้อน (Backwater Hazard): ระดับน้ำภายนอกสูงกว่าระดับน้ำในบ่อพัก ตรวจสอบบาน Flap Valve ให้ปิดสนิทและเดินปั๊มสูบระบาย</span></div>';
        }
      }

      // Update Elevation Benchmark Badge in Cross-Section Header
      const asbuiltBadge = document.getElementById('cs-asbuilt-badge');
      if (asbuiltBadge) {
        const crestBadgeText = hydro.hasEntranceCrest && hydro.crestElevation ? (' (สันเนิน +' + (hydro.crestElevation / 100).toFixed(2) + ' ม.)') : '';
        if (hydro.innerSource === 'AS_BUILT') {
          asbuiltBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30';
          asbuiltBadge.innerText = '📐 เกณฑ์อ้างอิง: ' + elevSign + elevMeters + ' ม.' + (p.asBuiltBenchmarkMSL ? ' (' + p.asBuiltBenchmarkMSL + ')' : '') + crestBadgeText;
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
        sourceTag.innerText = hydro.innerSource === 'AS_BUILT' ? '📐 เกณฑ์อ้างอิง' : (hydro.innerSource === 'FIELD_MEASURED' ? '📏 วัดจริง' : '⚙️ มาตรฐาน');
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

      // โครงสร้างป้องกันเสริม (สันเนินทางเข้าป้อม รปภ. / เขื่อน คสล. ริมคลอง)
      const barrierBox = document.getElementById('cs-barrier-box');
      const barrierText = document.getElementById('cs-barrier-text');
      if (barrierBox && barrierText) {
        const barriers = [];
        if (hydro.hasEntranceCrest && hydro.crestElevation) {
          barriers.push('สันเนินป้อม รปภ. ยกสูง +' + (hydro.crestElevation / 100).toFixed(2) + ' ม. (ป้องกันน้ำบ่าเข้าโครงการ)');
        }
        if (hydro.hasFloodwall) {
          barriers.push('เขื่อนคอนกรีต คสล. ริมคลองสูง +' + (p.floodwallHeightDiff || 0.40).toFixed(2) + ' ม. (กั้นคลองสายหลัก)');
        }
        if (barriers.length > 0) {
          barrierBox.style.display = 'block';
          barrierText.innerText = barriers.join(' • ');
        } else {
          barrierBox.style.display = 'none';
        }
      }

      // อัปเดตข้อมูลวิศวกรรมและการประมวลผลร่วมกับภาคสนาม (Section 2)
      updateTelemetryAndEngineeringMetrics(p, hydro);

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
        const sumpRow = document.getElementById('field-sump-row');
        if (sumpRow) sumpRow.style.display = 'none';
        const drainRow = document.getElementById('field-drain-row');
        if (drainRow) drainRow.style.display = 'none';
      } else {
        if (fieldEmptyBox) fieldEmptyBox.classList.add('hidden');
        if (fieldDataBox) fieldDataBox.classList.remove('hidden');
        if (photosSection) photosSection.classList.remove('hidden');
        document.getElementById('field-updated-at').innerText = p.reportDateThai || 'รอบตรวจล่าสุด';
        document.getElementById('field-water').innerText = p.waterLevel || '-';
        document.getElementById('field-canal').innerText = p.drainageCondition || '-';
        document.getElementById('field-pumps').innerText = p.pumpsRunning || '-';

        // บ่อพักหลัง ปตร. และท่อระบายน้ำสาธารณะ (แสดงเฉพาะเมื่อมีรายงานจริง ห้ามแสดงถ้าไม่มี)
        const sumpRow = document.getElementById('field-sump-row');
        const sumpVal = document.getElementById('field-sump-water');
        if (sumpRow && sumpVal) {
          if (hydro.outfallSumpWaterVsRimCm !== null) {
            sumpVal.innerText = hydro.outfallSumpConditionText || (hydro.outfallSumpWaterVsRimCm < 0 ? ('ต่ำกว่าขอบบ่อ ' + Math.abs(hydro.outfallSumpWaterVsRimCm) + ' ซม.') : ('ล้นขอบบ่อ +' + hydro.outfallSumpWaterVsRimCm + ' ซม.'));
            sumpRow.style.display = 'block';
          } else {
            sumpRow.style.display = 'none';
          }
        }

        const drainRow = document.getElementById('field-drain-row');
        const drainVal = document.getElementById('field-drain-water');
        if (drainRow && drainVal) {
          if (hydro.publicDrainWaterVsOuterCm !== null) {
            drainVal.innerText = hydro.publicDrainConditionText || (hydro.publicDrainWaterVsOuterCm < 0 ? ('ต่ำกว่าถนนนอก ' + Math.abs(hydro.publicDrainWaterVsOuterCm) + ' ซม.') : ('เอ่อล้นถนนนอก +' + hydro.publicDrainWaterVsOuterCm + ' ซม.'));
            drainRow.style.display = 'block';
          } else {
            drainRow.style.display = 'none';
          }
        }
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
        const lineParts = [
          '🚨 [รายงานน้ำท่วม LH] ' + p.name + ' (' + p.code + ')',
          '• พื้นที่: ' + (p.area || '-'),
          '• สถานะ: ' + stLabel,
          '• ถนนหน้าโครงการ: ' + outerStatus,
          '• ถนนในโครงการ: ' + innerStatus + ' (ถมยก +' + elevMeters + ' ม.)',
          '• โทรมาตร: ' + ((p.liveWater && p.liveWater.stationName) ? p.liveWater.stationName : (p.stationName || '-')),
          '🔗 ตรวจสอบสดบนแผนที่: https://lh-taskflow.vercel.app/api/flood-report?focus=' + p.code
        ];
        btnLine.href = 'https://line.me/R/share?text=' + encodeURIComponent(lineParts.join(String.fromCharCode(10)));
      }

      // Populate Pillar 4: Project Elevation Benchmark Specs
      const specInner = document.getElementById('spec-inner-elev');
      if (specInner) {
        const srcText = hydro.innerSource === 'AS_BUILT' ? 'เกณฑ์อ้างอิง' : (hydro.innerSource === 'FIELD_MEASURED' ? 'วัดจริง' : 'มาตรฐาน');
        specInner.innerText = elevSign + elevMeters + ' ม. (' + srcText + ')';
      }
      const specSumpRim = document.getElementById('spec-sump-rim-elev');
      const specSumpRimOuter = document.getElementById('spec-sump-rim-outer');
      if (specSumpRim) {
        const rimDiff = hydro.sumpRimVsInnerDiff != null ? hydro.sumpRimVsInnerDiff : 0.00;
        const rimOuter = hydro.sumpRimVsOuterDiff != null ? hydro.sumpRimVsOuterDiff : (Number(elevMeters) + rimDiff);
        const rimDiffText = rimDiff === 0 ? 'เสมอถนนใน (0.00 ม.)' : (rimDiff < 0 ? ('ต่ำกว่าถนนใน ' + rimDiff.toFixed(2) + ' ม.') : ('สูงกว่าถนนใน +' + rimDiff.toFixed(2) + ' ม.'));
        specSumpRim.innerText = rimDiffText;
        if (specSumpRimOuter) {
          specSumpRimOuter.innerText = 'เทียบถนนนอก ' + (rimOuter >= 0 ? '+' : '') + rimOuter.toFixed(2) + ' ม.';
        }
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

    // การประมวลผลข้อมูลโทรมาตรภาครัฐร่วมกับรายงานภาคสนามและเกณฑ์วิศวกรรมของโครงการ
    function updateTelemetryAndEngineeringMetrics(p, hydro) {
      if (!p) return;
      hydro = hydro || p.hydro || {};
      const outerDepth = Number(p.floodDepthOuter || 0);
      const innerDepth = Number(p.floodDepthInner || 0);
      const innerElevM = (hydro.innerElevation || 80) / 100;
      const elevSign = innerElevM >= 0 ? '+' : '';
      const elevMeters = innerElevM.toFixed(2);
      const hasFloodwall = Boolean(hydro.hasFloodwall);
      const floodwallLimitM = hydro.floodwallHeightDiff || 0.40;

      // Source Tag
      const sourceTag = document.getElementById('cs-source-tag');
      if (sourceTag) {
        if (hydro.innerSource === 'AS_BUILT') {
          sourceTag.innerText = '📐 เกณฑ์อ้างอิง As-Built';
          sourceTag.className = 'text-[9px] text-sky-400 font-semibold';
        } else if (hydro.innerSource === 'FIELD_MEASURED') {
          sourceTag.innerText = '📐 วัดจริงภาคสนาม';
          sourceTag.className = 'text-[9px] text-emerald-400 font-semibold';
        } else {
          sourceTag.innerText = '📐 เกณฑ์มาตรฐาน (+0.80 ม.)';
          sourceTag.className = 'text-[9px] text-slate-400 font-semibold';
        }
      }

      // 1. ระดับน้ำคลองเทียบถนนนอก (Canal vs Outer Road)
      const canalOuterElem = document.getElementById('cs-canal-outer');
      const canalOuterSub = document.getElementById('cs-canal-outer-sub');
      const canalElev = hydro.canalWaterElevation;

      if (canalOuterElem) {
        if (canalElev == null) {
          canalOuterElem.innerText = 'รอข้อมูลสำรวจคลอง';
          canalOuterElem.className = 'font-bold text-slate-400 text-sm';
          if (canalOuterSub) canalOuterSub.innerText = 'ไม่มีข้อมูลระดับคลองหรือโทรมาตรในจุดนี้';
        } else if (hasFloodwall) {
          if (canalElev > floodwallLimitM) {
            const overWallCm = Math.round((canalElev - floodwallLimitM) * 100);
            canalOuterElem.innerText = 'ล้นข้ามเขื่อน +' + overWallCm + ' ซม. ⚠️';
            canalOuterElem.className = 'font-bold text-rose-400 text-sm';
            if (canalOuterSub) canalOuterSub.innerText = 'ระดับน้ำสูงเกินแนวเขื่อนกั้นริมคลอง (+' + Math.round(floodwallLimitM * 100) + ' ซม.)';
          } else if (canalElev > 0) {
            const overCm = Math.round(canalElev * 100);
            canalOuterElem.innerText = 'สูงกว่าถนน +' + overCm + ' ซม. (มีเขื่อนกั้น)';
            canalOuterElem.className = 'font-bold text-amber-400 text-sm';
            if (canalOuterSub) canalOuterSub.innerText = 'เขื่อน คสล. ริมคลองกั้นน้ำไว้ ถนนหน้าโครงการแห้งปกติ';
          } else {
            const belowCm = Math.abs(Math.round(canalElev * 100));
            canalOuterElem.innerText = 'ต่ำกว่า ' + belowCm + ' ซม.';
            canalOuterElem.className = 'font-bold text-sm ' + (belowCm <= 15 ? 'text-amber-400' : 'text-sky-400');
            if (canalOuterSub) canalOuterSub.innerText = belowCm <= 15 ? 'ระดับน้ำหนุนสูง เฝ้าระวังใกล้ตลิ่ง' : 'เกณฑ์ควบคุมปกติ ปลอดภัย';
          }
        } else {
          if (canalElev > 0) {
            const overCm = Math.round(canalElev * 100);
            canalOuterElem.innerText = 'ล้นตลิ่ง +' + overCm + ' ซม. ⚠️';
            canalOuterElem.className = 'font-bold text-rose-400 text-sm';
            if (canalOuterSub) canalOuterSub.innerText = 'ระดับน้ำสูงกว่าผิวถนนหน้าโครงการ (ไม่มีแนวเขื่อนกั้น)';
          } else {
            const belowCm = Math.abs(Math.round(canalElev * 100));
            canalOuterElem.innerText = 'ต่ำกว่า ' + belowCm + ' ซม.';
            canalOuterElem.className = 'font-bold text-sm ' + (belowCm <= 15 ? 'text-amber-400' : 'text-sky-400');
            if (canalOuterSub) canalOuterSub.innerText = belowCm <= 15 ? 'ระดับน้ำหนุนสูง เฝ้าระวังใกล้ตลิ่ง' : 'เกณฑ์ควบคุมปกติ ปลอดภัย';
          }
        }
      }

      // 2. ระยะปลอดภัยถนนในโครงการ (Freeboard & Safety Margin)
      const canalInnerElem = document.getElementById('cs-canal-inner');
      const canalInnerSub = document.getElementById('cs-canal-inner-sub');
      const marginM = canalElev != null ? (innerElevM - canalElev) : innerElevM;
      const marginCm = Math.round(marginM * 100);

      if (canalInnerElem) {
        if (canalElev == null) {
          canalInnerElem.innerText = 'รอข้อมูลสำรวจคลอง';
          canalInnerElem.className = 'font-bold text-slate-400 text-sm';
          if (canalInnerSub) {
            const crestNote = hydro.hasEntranceCrest && hydro.crestElevation ? (' • เนิน รปภ. +' + (hydro.crestElevation / 100).toFixed(2) + ' ม.') : '';
            canalInnerSub.innerText = 'ระดับถนนในโครงการยกสูง ' + elevSign + elevMeters + ' ม.' + crestNote;
          }
        } else if (marginCm > 0) {
          canalInnerElem.innerText = 'ต่ำกว่า ' + marginCm + ' ซม.';
          canalInnerElem.className = 'font-bold text-sm ' + (marginCm >= 50 ? 'text-emerald-400' : (marginCm >= 20 ? 'text-amber-400' : 'text-rose-400'));
          if (canalInnerSub) {
            const crestNote = hydro.hasEntranceCrest && hydro.crestElevation ? (' • เนิน รปภ. +' + (hydro.crestElevation / 100).toFixed(2) + ' ม.') : '';
            canalInnerSub.innerText = (marginCm >= 50 ? '🛡️ ระยะปลอดภัยสูง' : '⚠️ ระยะเผื่อความปลอดภัยต่ำ') + ' (ยกระดับถนนใน ' + elevSign + elevMeters + ' ม.' + crestNote + ')';
          }
        } else {
          const overInnerCm = Math.abs(marginCm);
          canalInnerElem.innerText = 'ท่วมล้นใน +' + overInnerCm + ' ซม. 🚨';
          canalInnerElem.className = 'font-bold text-rose-400 text-sm animate-pulse';
          if (canalInnerSub) {
            if (hydro.hasEntranceCrest && hydro.crestElevation && canalElev < (hydro.crestElevation / 100)) {
              canalInnerSub.innerText = '⚠️ น้ำคลองสูงกว่าถนนใน แต่มีสันเนิน รปภ. +' + (hydro.crestElevation / 100).toFixed(2) + ' ม. ป้องกันน้ำบ่าเข้า';
            } else {
              canalInnerSub.innerText = '🚨 น้ำเอ่อล้นระดับถนนโครงการ (' + elevSign + elevMeters + ' ม.)!';
            }
          }
        }
      }

      // 3. สถานะบานพับ Flap Valve (เปิดระบาย / ปิดกันน้ำย้อน)
      const isValveClosed = (canalElev != null && canalElev >= -0.15) || outerDepth > 0;
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
          if (flapValveSub) flapValveSub.innerText = 'น้ำคลอง/ถนนสูง บานพับปิดสนิทกันน้ำเข้าท่อ';
        }
      }

      // 4. สถานะระบบเครื่องสูบน้ำโครงการ (Pump Status)
      const pumpElem = document.getElementById('cs-pump-status');
      const pumpSub = document.getElementById('cs-pump-status-sub');
      if (pumpElem) {
        if (isValveClosed || outerDepth > 0 || innerDepth > 0) {
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

    // Compatibility stubs for legacy simulation calls
    function setCanalSimulation(preset) {}
    function onCanalSliderChange(valCm) {}
    function resetCanalSimulation() {}
    function updateCrossSectionVisuals(canalElevationM, isSimulated) {}

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

    // ==========================================
    // 📡 Doppler Radar Modal Controls
    // ==========================================
    let currentDopplerTab = 'bma_radar';

    function openDopplerModal() {
      const modal = document.getElementById('doppler-modal');
      if (modal) {
        modal.classList.remove('hidden');
        switchDopplerTab(currentDopplerTab);
      }
    }

    function closeDopplerModal() {
      const modal = document.getElementById('doppler-modal');
      if (modal) modal.classList.add('hidden');
    }

    function switchDopplerTab(tab) {
      currentDopplerTab = tab;
      document.querySelectorAll('.doppler-tab-btn').forEach(b => {
        b.className = 'doppler-tab-btn px-3 py-1.5 rounded-t-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 whitespace-nowrap';
      });
      const activeBtn = document.getElementById('tab-btn-' + tab);
      if (activeBtn) {
        activeBtn.className = 'doppler-tab-btn active px-3 py-1.5 rounded-t-lg font-bold border-b-2 border-indigo-400 text-white bg-slate-800/90 whitespace-nowrap';
      }

      const content = document.getElementById('doppler-content');
      const extLink = document.getElementById('doppler-ext-link');
      const t = Date.now();

      if (tab === 'bma_radar') {
        extLink.href = 'https://weather.bangkok.go.th/Radar/RadarAnimation.aspx';
        content.innerHTML = \`
          <div class="relative max-w-xl w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg min-h-[300px] flex items-center justify-center">
            <div id="radar-loader" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-slate-400 gap-2 text-xs">
              <svg class="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
              <span>กำลังดึงภาพเรดาร์ สำนักการระบายน้ำ กทม...</span>
            </div>
            <img src="https://weather.bangkok.go.th/Images/Radar/radar.jpg?_t=\${t}" alt="เรดาร์สำนักการระบายน้ำ กทม." class="w-full h-auto object-contain mx-auto transition-opacity duration-300 opacity-0" onload="this.classList.remove('opacity-0'); document.getElementById('radar-loader')?.remove();" onerror="this.onerror=null; this.src='https://weather.tmd.go.th/svp/svp120_latest.jpg?_t=' + Date.now(); document.getElementById('radar-loader')?.remove(); this.classList.remove('opacity-0');"/>
          </div>
          <p class="text-xs text-slate-300 font-semibold text-center">เรดาร์ตรวจสภาพอากาศสด สำนักการระบายน้ำ กทม. ครอบคลุม กรุงเทพฯ และปริมณฑล (อัปเดตทุก 5–10 นาที)</p>
        \`;
      } else if (tab === 'tmd_suvarnabhumi') {
        extLink.href = 'https://weather.tmd.go.th/svp/';
        content.innerHTML = \`
          <div class="relative max-w-xl w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg min-h-[300px] flex items-center justify-center">
            <div id="radar-loader" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-slate-400 gap-2 text-xs">
              <svg class="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
              <span>กำลังดึงภาพเรดาร์สุวรรณภูมิ TMD 120 กม...</span>
            </div>
            <img src="https://weather.tmd.go.th/svp/svp120_latest.jpg?_t=\${t}" alt="เรดาร์สุวรรณภูมิ กรมอุตุนิยมวิทยา" class="w-full h-auto object-contain mx-auto transition-opacity duration-300 opacity-0" onload="this.classList.remove('opacity-0'); document.getElementById('radar-loader')?.remove();" onerror="document.getElementById('radar-loader')?.remove(); this.classList.remove('opacity-0');"/>
          </div>
          <p class="text-xs text-slate-300 font-semibold text-center">เรดาร์ TMD Doppler สุวรรณภูมิ รัศมี 120 กม. ครอบคลุม กทม., สมุทรปราการ, ปทุมธานี (รังสิต), นนทบุรี, ฉะเชิงเทรา</p>
        \`;
      } else if (tab === 'tmd_wide') {
        extLink.href = 'https://weather.tmd.go.th/';
        content.innerHTML = \`
          <div class="relative max-w-xl w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg min-h-[300px] flex items-center justify-center">
            <div id="radar-loader" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-slate-400 gap-2 text-xs">
              <svg class="animate-spin h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
              <span>กำลังดึงภาพเรดาร์ภาคกลาง TMD 240 กม...</span>
            </div>
            <img src="https://weather.tmd.go.th/svp/svp240_latest.jpg?_t=\${t}" alt="เรดาร์สุวรรณภูมิ 240 กม. กรมอุตุนิยมวิทยา" class="w-full h-auto object-contain mx-auto transition-opacity duration-300 opacity-0" onload="this.classList.remove('opacity-0'); document.getElementById('radar-loader')?.remove();" onerror="document.getElementById('radar-loader')?.remove(); this.classList.remove('opacity-0');"/>
          </div>
          <p class="text-xs text-slate-300 font-semibold text-center">เรดาร์ TMD Doppler สุวรรณภูมิ มุมกว้าง 240 กม. ตรวจจับการเคลื่อนตัวของกลุ่มฝนจากอ่าวไทยและภาคกลาง</p>
        \`;
      } else if (tab === 'thaiwater') {
        extLink.href = 'https://www.thaiwater.net/weather/radar';
        content.innerHTML = \`
          <div class="w-full h-[400px] rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
            <iframe src="https://www.thaiwater.net/weather/radar" class="w-full h-full border-0 rounded-lg"></iframe>
          </div>
          <p class="text-xs text-slate-300 font-semibold text-center">คลังข้อมูลน้ำแห่งชาติ (สสน.) เรดาร์รวมภาพดาวเทียมและกลุ่มฝนสดทั่วประเทศ</p>
        \`;
      } else if (tab === 'windy') {
        extLink.href = 'https://www.windy.com/?weatherRadar,13.754,100.501,8';
        content.innerHTML = \`
          <div class="w-full h-[420px] rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
            <iframe src="https://embed.windy.com/embed2.html?lat=13.754&lon=100.501&detailLat=13.754&detailLon=100.501&width=650&height=450&zoom=8&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1" class="w-full h-full border-0 rounded-lg"></iframe>
          </div>
          <p class="text-xs text-slate-300 font-semibold text-center">Windy Doppler Radar & Lightning (เรดาร์ตรวจจับเมฆฝนและฟ้าผ่าความถี่สูง)</p>
        \`;
      }

      // Safety timeout: ป้องกันสถานะค้าง หากเซิร์ฟเวอร์ช้าเกิน 2.5 วินาที ให้ซ่อน loader ทันที
      setTimeout(() => {
        document.getElementById('radar-loader')?.remove();
        document.querySelectorAll('#doppler-content img').forEach(img => img.classList.remove('opacity-0'));
      }, 2500);
    }

    function refreshDopplerImage() {
      switchDopplerTab(currentDopplerTab);
    }
  </script>

  <!-- Modal: Live Doppler Weather Radar (BMA / TMD / ThaiWater) -->
  <div id="doppler-modal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md hidden flex items-center justify-center p-3 sm:p-5">
    <div class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
      <!-- Modal Header -->
      <div class="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-900/60 flex items-center justify-center border border-indigo-500/40 text-lg">
            📡
          </div>
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>เรดาร์ตรวจสภาพอากาศ Doppler สด (Nowcasting 0–2 ชม.)</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live Radar</span>
            </h3>
            <p class="text-[11px] text-slate-400">ตรวจจับเม็ดฝนจริง ความเข้มของเมฆฝนฟ้าคะนอง และทิศทางการเคลื่อนตัว</p>
          </div>
        </div>
        <button onclick="closeDopplerModal()" class="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Station Selector Tabs -->
      <div class="px-3 pt-2 border-b border-slate-800 flex gap-1.5 bg-slate-950/60 overflow-x-auto text-xs">
        <button onclick="switchDopplerTab('bma_radar')" id="tab-btn-bma_radar" class="doppler-tab-btn active px-3 py-1.5 rounded-t-lg font-bold border-b-2 border-indigo-400 text-white bg-slate-800/90 whitespace-nowrap">กทม. (สำนักการระบายน้ำ)</button>
        <button onclick="switchDopplerTab('tmd_suvarnabhumi')" id="tab-btn-tmd_suvarnabhumi" class="doppler-tab-btn px-3 py-1.5 rounded-t-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 whitespace-nowrap">กรมอุตุฯ สุวรรณภูมิ (120 กม.)</button>
        <button onclick="switchDopplerTab('tmd_wide')" id="tab-btn-tmd_wide" class="doppler-tab-btn px-3 py-1.5 rounded-t-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 whitespace-nowrap">กรมอุตุฯ ภาคกลาง (240 กม.)</button>
        <button onclick="switchDopplerTab('thaiwater')" id="tab-btn-thaiwater" class="doppler-tab-btn px-3 py-1.5 rounded-t-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 whitespace-nowrap">สสน. (ThaiWater)</button>
        <button onclick="switchDopplerTab('windy')" id="tab-btn-windy" class="doppler-tab-btn px-3 py-1.5 rounded-t-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 whitespace-nowrap">Windy Radar สด</button>
      </div>

      <!-- Modal Body (Radar View) -->
      <div class="p-3 sm:p-4 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-slate-950/90 min-h-[360px]">
        <div id="doppler-content" class="w-full flex flex-col items-center gap-3">
          <!-- Dynamic Content rendered via JavaScript -->
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="p-2.5 sm:p-3 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span class="text-[11px]">💡 สำนักการระบายน้ำ กทม. & กรมอุตุนิยมวิทยา & คลังข้อมูลน้ำแห่งชาติ</span>
        <div class="flex items-center gap-2">
          <a id="doppler-ext-link" href="https://weather.bangkok.go.th/radar/" target="_blank" class="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 text-[11px] font-semibold flex items-center gap-1">
            <span>🌐 เปิดเว็บเรดาร์ทางการ</span>
            <span>↗</span>
          </a>
          <button onclick="refreshDopplerImage()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1">
            <span>🔄 รีเฟรช</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
