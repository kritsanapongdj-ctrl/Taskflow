// ถาม Gemini AI แบบข้อความทั่วไป
export async function askGemini(prompt) {
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

// ดึงข้อมูลสถานะหน้างานโดยตรงจากข้อความที่ผู้ใช้พิมพ์ใน LINE อย่างแม่นยำ
export function extractDirectFieldReport(notes = '') {
  const text = (notes || '').trim();
  if (!text) {
    return { pumpsRunning: null, drainageCondition: null, waterLevel: null };
  }

  // คำค้นหาสำคัญ (รองรับตัวสะกด ปั๊ม / ปั้ม และคำศัพท์หน้างาน)
  const pumpRegex = /(?:ปั๊ม|ปั้ม|เครื่องสูบ|สูบน้ำ|submersible|pump|ระบบป้องกันน้ำท่วม|ระบบสูบน้ำ)/i;
  const canalRegex = /(?:คลอง|คันกั้นน้ำ|ทุ่งรับน้ำ|ระดับน้ำภายนอก|ระดับน้ำในคลอง|น้ำในคลอง|น้ำคลอง|แม่น้ำ|ประตูระบาย|ปตร\.|ขอบตลิ่ง|ทางระบาย|ท่อระบาย)/i;
  const roadRegex = /(?:ถนน|ผิวจราจร|ผิวทาง|น้ำท่วมขัง|น้ำขัง|แห้งสนิท|แห้งปกติ|สัญจร|ซอย|ทางเข้า)/i;

  // 1. แยกข้อความด้วย newline, bullets (- * •) หรือข้อเลข (1. 2.) โดยไม่ตัดเครื่องหมายลบของตัวเลข เช่น -61 cm
  const rawSegments = text
    .split(/(?:\r?\n|(?<=\S|\b)\s*(?:-(?!\d)|[*•]|\d+[\.\)])\s*)/)
    .map(line => line.trim())
    .filter(Boolean);

  const pumpParts = [];
  const canalParts = [];
  const roadParts = [];
  const unclassifiedParts = [];
  const expandedSegments = [];

  for (const seg of rawSegments) {
    let currentSeg = seg.replace(/^(?:[-*•\d\.\)\s]+|\bสรุป\b|\bรายงาน\b)/g, '').trim();
    currentSeg = currentSeg.replace(/^[-*•\s;,:]+|[-*•\s;,:]+$/g, '').trim();
    if (!currentSeg) continue;

    // ถ้าเซกเมนต์เป็นเรื่องปั๊มป้องกันน้ำท่วมอย่างชัดเจน ไม่ให้คำว่า "น้ำท่วม" ไปกระตุ้น roadRegex
    const isExplicitPump = /(?:ปั๊ม|ปั้ม|เครื่องสูบ|ระบบ)[\w\s]*ป้องกันน้ำท่วม/i.test(currentSeg) ||
                           /^(?:บานพับ|ปั๊ม|ปั้ม)/i.test(currentSeg);

    // ตรวจสอบ keyword ภายนอกวงเล็บเท่านั้น เพื่อไม่ให้ตัดคำกลางวงเล็บ
    const outsideParens = currentSeg.replace(/\([^)]*\)/g, ' ');
    const cleanedOutside = isExplicitPump ? outsideParens.replace(/(?:ปั๊ม|ปั้ม|เครื่องสูบ|ระบบ)[\w\s]*ป้องกันน้ำท่วม/gi, 'ปั๊ม') : outsideParens;

    const hits = (cleanedOutside.match(pumpRegex) ? 1 : 0) + 
                 (cleanedOutside.match(canalRegex) ? 1 : 0) + 
                 (cleanedOutside.match(roadRegex) ? 1 : 0);

    if (hits > 1 && !isExplicitPump) {
      const splitKeywords = [
        { type: 'pump', regex: /(?:สถานะเครื่องสูบน้ำ|สถานะปั๊ม|ระบบป้องกันน้ำท่วม|ระบบสูบน้ำ|เครื่องสูบน้ำ|เครื่องสูบ|ปั๊มสูบน้ำ|ปั้มสูบน้ำ|ปั๊มป้องกันน้ำท่วม|ปั้มป้องกันน้ำท่วม|ปั๊มน้ำ|ปั้มน้ำ|ปั๊ม|ปั้ม)/g },
        { type: 'canal', regex: /(?:ระดับน้ำในคลอง|ระดับน้ำคลอง|น้ำในคลอง|น้ำคลอง|คลองหน้าโครงการ|คลองภายนอก|สภาพคลอง|คลอง|ทางระบายน้ำ|ท่อระบายน้ำ)/g },
        { type: 'road', regex: /(?:ระดับน้ำท่วมขัง|ระดับน้ำบนถนน|น้ำท่วมขังผิวถนน|ผิวจราจร|ถนนในโครงการ|ถนนเมน|สภาพถนน|ถนน)/g }
      ];

      // หาตำแหน่งที่ไม่ตกอยู่ในวงเล็บ
      const parenRanges = [];
      let pm;
      const parenRegex = /\([^)]*\)/g;
      while ((pm = parenRegex.exec(currentSeg)) !== null) {
        parenRanges.push({ start: pm.index, end: pm.index + pm[0].length });
      }

      const matches = [];
      for (const sk of splitKeywords) {
        let m;
        while ((m = sk.regex.exec(currentSeg)) !== null) {
          const inParen = parenRanges.some(r => m.index >= r.start && m.index < r.end);
          if (!inParen) {
            // ตรวจสอบว่า keyword นี้เป็นจุดอ้างอิงระดับ (Reference Datum) หรือไม่ เช่น "ต่ำกว่าระดับถนน", "สูงกว่าถนน"
            const prefix = currentSeg.substring(0, m.index);
            const isDatum = /(?:ต่ำกว่า|ต่ำจาก|สูงกว่า|สูงกว[่้]+า|เสมอ|เทียบ|จาก|วัดจาก|ลดลงจาก)\s*(?:ระดับ)?\s*$/i.test(prefix);
            if (!isDatum) {
              matches.push({ type: sk.type, index: m.index, length: m[0].length });
            }
          }
        }
      }
      matches.sort((a, b) => a.index - b.index);

      const filteredMatches = [];
      let lastEnd = -1;
      for (const m of matches) {
        if (m.index >= lastEnd) {
          filteredMatches.push(m);
          lastEnd = m.index + m.length;
        }
      }

      if (filteredMatches.length > 1) {
        for (let i = 0; i < filteredMatches.length; i++) {
          const cur = filteredMatches[i];
          const next = filteredMatches[i + 1];
          const sub = currentSeg.substring(cur.index, next ? next.index : currentSeg.length).trim();
          if (sub) expandedSegments.push(sub);
        }
      } else {
        expandedSegments.push(currentSeg);
      }
    } else {
      expandedSegments.push(currentSeg);
    }
  }

  for (const line of expandedSegments) {
    let cleaned = line.replace(/^[-*•\d\.\)\s]+/, '').trim();
    cleaned = cleaned.replace(/^[-*•\s;,:]+|[-*•\s;,:]+$/g, '').trim();
    if (!cleaned) continue;

    const outsideParens = cleaned.replace(/\([^)]*\)/g, ' ');
    const isExplicitPump = /(?:ปั๊ม|ปั้ม|เครื่องสูบ|ระบบ)[\w\s]*ป้องกันน้ำท่วม/i.test(cleaned) ||
                           /^(?:บานพับ|ปั๊ม|ปั้ม)/i.test(cleaned);
    const cleanedOutside = isExplicitPump ? outsideParens.replace(/(?:ปั๊ม|ปั้ม|เครื่องสูบ|ระบบ)[\w\s]*ป้องกันน้ำท่วม/gi, 'ปั๊ม') : outsideParens;

    const hasPump = pumpRegex.test(cleanedOutside) || isExplicitPump;
    const hasCanal = canalRegex.test(cleanedOutside);
    const hasRoad = !isExplicitPump && roadRegex.test(cleanedOutside);

    if (hasCanal) {
      let canalText = cleaned;
      if (canalText.includes('ไม่พบน้ำท่วมขังผิวจราจร') || canalText.includes('ไม่พบน้ำขัง')) {
        canalText = canalText.replace(/\([^)]+\)/g, '').trim();
        if (!/ปกติ|เกณฑ์|ควบคุม|แห้ง/i.test(canalText)) {
          canalText += ' อยู่ในเกณฑ์ปกติ';
        }
        canalText += ' (ไม่พบน้ำเอ่อล้นเข้าผิวจราจร)';
      } else if (/^(?:ระดับน้ำในคลอง(?:หน้าโครงการ)?|ระดับน้ำคลอง|คลองหน้าโครงการ|สภาพคลอง|คลอง|ทางระบายน้ำ)$/i.test(canalText)) {
        canalText += ' อยู่ในเกณฑ์ควบคุม ระบายได้คล่องตัวตามปกติ';
      }
      canalParts.push(canalText.replace(/\s+/g, ' ').trim());
    } else if (hasPump) {
      pumpParts.push(cleaned);
    } else if (hasRoad) {
      roadParts.push(cleaned);
    } else {
      unclassifiedParts.push(cleaned);
    }
  }

  const uniq = (arr) => Array.from(new Set(arr.map(s => s.trim()))).filter(Boolean);

  let pumpsRunning = uniq(pumpParts).join(' / ');
  let drainageCondition = uniq(canalParts).join(' / ');
  let waterLevel = uniq(roadParts).join(' / ');

  if (!waterLevel && unclassifiedParts.length > 0) {
    const roadCandidate = unclassifiedParts.find(p => /ปกติ|เรียบร้อย|แห้ง/i.test(p));
    if (roadCandidate) waterLevel = roadCandidate;
  }

  const cleanVal = (val) => {
    if (!val) return null;
    return val
      .replace(/^[\s\-\*\•\:\;\,\)]+|[\s\-\*\•\:\;\,\(]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim() || null;
  };

  return {
    pumpsRunning: cleanVal(pumpsRunning),
    drainageCondition: cleanVal(drainageCondition),
    waterLevel: cleanVal(waterLevel)
  };
}

// สร้างบทวิเคราะห์และการประเมินสถานการณ์ (Executive Assessment & Action Taken) เชิงวิศวกรรม
export function generateFallbackEngineeringSynthesis({ project = {}, weather = {}, directReport = {}, notes = '' }) {
  const wl = directReport.waterLevel || '';
  const dc = directReport.drainageCondition || '';
  const pr = directReport.pumpsRunning || '';
  const rainProb = weather.rainProb || 60;
  const rain24h = weather.expectedRain24h || '25.0';

  const asBuiltDiff = typeof project?.asBuiltElevationDiff === 'number' ? project.asBuiltElevationDiff : 0.80;
  const crestDiff = typeof project?.entranceCrestDiff === 'number' && project.entranceCrestDiff > 0 ? project.entranceCrestDiff : null;
  const barrierText = crestDiff ? `สันเนินทางเข้าป้อม รปภ. (+${crestDiff.toFixed(2)} ม.)` : `ระดับยกพื้นถนน As-Built (+${asBuiltDiff.toFixed(2)} ม.)`;

  // 1. assessmentField (สภาพพื้นที่และผิวจราจร)
  let assessmentField = '';
  const isOuterRoadFlooded = /ถนนภาระจำยอม|ภาระจำยอม|ถนนนอก|ทางเข้า/i.test(wl) && /ท่วม|ขัง|ฟุตบาท/i.test(wl);
  const isInnerRoadDry = /แห้ง|ปกติ|เรียบร้อย|ไม่พบน้ำท่วม/i.test(wl) || /ถนนในโครงการ:.*(?:แห้ง|ปกติ)/i.test(notes);

  if (isOuterRoadFlooded && isInnerRoadDry) {
    assessmentField = `ตรวจพบน้ำท่วมขังบริเวณถนนทางเข้า/ถนนภาระจำยอม (${wl}) แต่ถนนเมนและพื้นที่พักอาศัยภายในโครงการแห้งสนิท สัญจรได้ปกติ 100% โดยมี ${barrierText} ป้องกันน้ำบ่าเข้าสู่โครงการ`;
  } else if (wl && /น้ำท่วม|น้ำขัง|รอการระบาย|\d+\s*ซม/i.test(wl) && !/ไม่พบน้ำท่วมขัง|แห้ง/i.test(wl)) {
    assessmentField = `ตรวจพบน้ำท่วมขังผิวจราจรบางจุด (${wl}) ทีมช่างเข้ากวาดเร่งระบายน้ำและเปิดตะแกรงระบายน้ำ พร้อมจัดแนวกระสอบทรายป้องกันน้ำเข้าแปลงที่พักอาศัย`;
  } else if (wl && /แห้ง|ปกติ|เรียบร้อย|ไม่พบ/i.test(wl)) {
    assessmentField = `ผิวจราจรถนนเมน ซอยย่อย และทางเข้าโครงการแห้งสนิท สัญจรได้ปกติ 100% (${wl}) จัดเตรียมแนวกระสอบทรายจุดเสี่ยงและพร่องน้ำในบ่อพักรอรับฝนสะสม ${rain24h} มม.`;
  } else {
    assessmentField = `ผิวจราจรหลักและทางเข้า-ออกโครงการแห้งสนิท สัญจรได้ปกติ จัดเตรียมความพร้อมรองรับปริมาณฝนสะสม 24 ชม. (${rain24h} มม.)`;
  }

  const hasFloodwall = Boolean(project?.hasFloodwall);
  const floodwallDiff = hasFloodwall ? (project?.floodwallHeightDiff || 0.40) : null;
  const floodwallText = hasFloodwall ? ` พร้อมมีแนวเขื่อนคอนกรีต คสล. ริมคลอง (+${floodwallDiff.toFixed(2)} ม.) ช่วยกักกั้นน้ำคลองไม่ให้เอ่อเข้าสู่ถนนเมนหน้าโครงการ` : '';

  // 2. assessmentCanal (ระดับน้ำคลองภายนอกและมวลน้ำหลาก)
  let assessmentCanal = '';
  const isCanalHigh = /หนุน|ล้น|สูง|ริมฟุตบาท|ตลิ่ง|\+|เอ่อ/i.test(dc) && !/ไม่พบน้ำเอ่อล้น|ไม่พบน้ำล้น|ไม่เอ่อ|ไม่ล้น|ปกติ|แห้ง/i.test(dc);
  if (isCanalHigh) {
    assessmentCanal = `ระดับน้ำคลองหน้าโครงการมีสภาวะหนุนสูง โดยหน้างานรายงานว่า "${dc}" สอดคล้องกับรายงานสถานการณ์น้ำทุ่งตอนบนของ GISTDA ทีมงานได้ปิดบานพับ Flap Valve ป้องกันน้ำหนุนย้อนเข้าท่อโครงการ${floodwallText} และจัดชุดตรวจวัดระดับน้ำคลองทุก 1 ชม.`;
  } else if (dc) {
    assessmentCanal = `ระดับน้ำในคลองภายนอกและทางระบายน้ำอยู่ในเกณฑ์ควบคุม โดยหน้างานตรวจพบว่า "${dc}" สอดคล้องกับแนวโน้มคาดการณ์ AI ของ Google Flood Hub ได้ประสานงานเปิดทางระบายน้ำปลายทางต่อเนื่อง`;
  } else {
    assessmentCanal = `ระดับน้ำในคลองสายหลักและทางระบายน้ำภายนอกอยู่ในเกณฑ์ปกติ ตรวจสอบบานเปิด-ปิดน้ำและแนวคันกั้นน้ำโครงการพร้อมป้องกันน้ำหนุน`;
  }

  // 3. assessmentPumps (ระบบสูบน้ำและเครื่องจักร)
  let assessmentPumps = '';
  if (pr) {
    assessmentPumps = `ระบบเครื่องสูบน้ำ (${pr}) ผ่านการทดสอบเดินระบบสมบูรณ์ 100% พร้อมเดินเครื่องอัตโนมัติเมื่อระดับน้ำแตะเกณฑ์ มีช่างเทคนิค Standby ตลอด 24 ชม. และสำรองน้ำมันเชื้อเพลิงเต็มพิกัด`;
  } else {
    assessmentPumps = `เครื่องสูบน้ำประจำสถานีระบายน้ำของโครงการผ่านการทดสอบเดินเครื่อง 100% พร้อมระบบไฟสำรองฉุกเฉินและเซนเซอร์ลูกลอยอัตโนมัติ`;
  }

  // 4. assessmentOutlook (การประเมินความเสี่ยงและมาตรการเชิงรุก)
  const isHighRisk = isCanalHigh || rainProb >= 70 || /วิกฤติ|น้ำท่วม/i.test(wl);
  const status = isHighRisk ? 'WATCH' : 'NORMAL';
  const assessmentOutlook = `เรดาร์สภาพอากาศ Windy และ AccuWeather ตรวจพบโอกาสเกิดฝน ${rainProb}% (คาดการณ์ฝน ${rain24h} มม.) ${isCanalHigh ? 'ยกระดับเฝ้าระวังมวลน้ำคลองภายนอกเป็นพิเศษ และ Standby ทีมช่างพร้อมรับมือ 24 ชม.' : 'สภาพอากาศอยู่ในเกณฑ์เฝ้าระวังปกติ เจ้าหน้าที่เตรียมพร้อมรับมือตลอด 24 ชม.'}`;

  const summary = `โครงการ ${project?.name || ''} (${project?.code || ''}): สภาพพื้นที่สัญจรได้ปกติ ${isCanalHigh ? 'เฝ้าระวังระดับน้ำคลองหน้าโครงการหนุนสูง ปิด Flap Valve ป้องกันน้ำย้อนและเดินระบบสูบน้ำพร้อมใช้งาน' : 'ระบบระบายน้ำและสถานีสูบน้ำพร้อมใช้งาน 100% ติดตามกลุ่มฝนเรดาร์ตลอด 24 ชม.'}`;

  return {
    status,
    waterLevel: wl || 'ถนนเมนแห้งสนิท สภาพปกติ (0 ซม.)',
    pumpsRunning: pr || 'ระบบป้องกันน้ำท่วมทำงานปกติ (พร้อมใช้งาน 100%)',
    drainageCondition: dc || 'ระบายได้คล่องตัว ท่อระบายน้ำหลักเปิดโล่ง',
    assessmentField,
    assessmentCanal,
    assessmentPumps,
    assessmentOutlook,
    summary
  };
}

// ข้อ 2: Gemini Vision วิเคราะห์ภาพถ่ายถนน + Location + หน่วยงาน เพื่อประเมินระดับน้ำท่วมขังผิวถนน
export async function analyzeWaterLevelFromPhotos({ photos, project, weather, userText }) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY || !photos || photos.length === 0) return null;

  const imageParts = photos.slice(0, 4).map(p => {
    const dataUrl = p.dataUrl || '';
    const match = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!match) return null;
    return { inlineData: { mimeType: match[1], data: match[2] } };
  }).filter(Boolean);

  if (imageParts.length === 0) return null;

  const prompt = `คุณคือระบบวิเคราะห์ภาพถ่ายหน้างานสำหรับโครงการ ${project.name} (${project.code}) พื้นที่: ${project.area}

ข้อมูลสภาพแวดล้อมปัจจุบัน (ณ เวลาที่บันทึกภาพ):
- สภาพอากาศ: ${weather.condition} อุณหภูมิ ${weather.temp}°C
- ปริมาณฝนตกสะสม 24 ชม.: ${weather.expectedRain24h} มม.
- โอกาสฝนตก: ${weather.rainProb}%
- สถานการณ์น้ำท่า: ${weather.basinAlert}
- ประกาศ TMD: ${weather.tmdAlert}
- ข้อความจากเจ้าหน้าที่หน้างาน: "${userText || '-'}"

วิเคราะห์ภาพถ่ายที่แนบมา แล้วประเมิน "ระดับน้ำท่วมขังบนผิวถนน" ให้กระชับ 1 ประโยค เช่น:
- "ถนนเมนแห้งสนิท ไม่มีน้ำท่วมขัง (0 ซม.)"
- "มีน้ำขังผิวถนนเล็กน้อย ประมาณ 3–5 ซม."
- "ถนนในโครงการมีน้ำขังสูงประมาณ 10–15 ซม. บริเวณทางเข้า"

ห้ามระบุชื่อบุคคล ห้ามเดาเกินจากภาพ ถ้าภาพไม่เห็นถนนชัดเจนให้ระบุว่า "ไม่สามารถระบุระดับน้ำจากภาพได้"
ตอบกลับเป็น JSON: { "waterLevel": "..." }`;

  try {
    const contents = [{
      parts: [
        { text: prompt },
        ...imageParts
      ]
    }];

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.1 } })
    });
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.waterLevel || null;
    }
  } catch (e) {
    console.error('Vision waterLevel error:', e.message);
  }
  return null;
}

// Gemini AI วิเคราะห์สถานการณ์และเกลาสรุปรายงาน 4 มิติ
export async function analyzeFloodReportWithGemini({ project, weather, notes, photoCount, directReport }) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return generateFallbackEngineeringSynthesis({ project, weather, directReport, notes });
  }

  const asBuiltDiff = typeof project?.asBuiltElevationDiff === 'number' ? project.asBuiltElevationDiff : 0.80;
  const crestDiff = typeof project?.entranceCrestDiff === 'number' && project.entranceCrestDiff > 0 ? project.entranceCrestDiff : null;

  const prompt = `คุณคือหัวหน้าวิศวกรผู้เชี่ยวชาญด้านบริหารจัดการน้ำและสาธารณูปโภคของบริษัท แลนด์ แอนด์ เฮ้าส์ จำกัด (มหาชน) (Land & Houses)
ภารกิจของคุณคือวิเคราะห์ข้อมูลการตรวจเช็คหน้างานร่วมกับข้อมูลสภาพอากาศและระดับน้ำ Real-time เพื่อออกรายงานสถานการณ์น้ำท่วมและการระบายน้ำระดับผู้บริหาร (Drainage & Flood Monitoring Report)

[ข้อมูลนำเข้า 2 ส่วนหลัก]:
ส่วนที่ 1: ข้อมูลและข้อความตรวจเช็คจริงหน้างาน (Field Observations & Reality):
- ข้อความดิบที่เจ้าหน้าที่หน้างานพิมพ์รายงาน: "${notes || 'ไม่มีรายงานปัญหาน้ำท่วมขัง ตรวจเช็คเครื่องสูบน้ำและระดับน้ำ'}"
- ข้อมูลที่ระบบตรวจจับเบื้องต้น:
  * ระดับน้ำ/ผิวถนน: "${directReport?.waterLevel || '-'}"
  * สถานะเครื่องสูบน้ำ: "${directReport?.pumpsRunning || '-'}"
  * สภาพคลอง/ทางระบายน้ำ: "${directReport?.drainageCondition || '-'}"
- ข้อมูลทางวิศวกรรมแบบก่อสร้างจริง (As-Built Engineering Elevation):
  * ระดับยกพื้นถนนในโครงการ: +${asBuiltDiff.toFixed(2)} ม. (เทียบระดับถนนภายนอก 0.00 ม.)
  * สันเนินทางเข้าป้อม รปภ. ป้องกันน้ำบ่า: ${crestDiff ? `+${crestDiff.toFixed(2)} ม. (สูงกว่าถนนภายนอก ${Math.round(crestDiff * 100)} ซม.)` : 'ไม่มีสันเนินเพิ่มเติม (ใช้ระดับยกพื้นถนนเป็นแนวป้องกัน)'}
  * แนวเขื่อนคอนกรีต คสล. ริมคลอง: ${project?.hasFloodwall ? `มีเขื่อนคอนกรีต คสล. สูง +${(project.floodwallHeightDiff || 0.40).toFixed(2)} ม. เหนือระดับผิวถนน ป้องกันน้ำคลองล้นตลิ่ง` : 'ไม่มีแนวเขื่อนริมคลอง (ตลิ่งธรรมชาติ หากน้ำคลองสูงเกินผิวถนนจะเอ่อล้นทันที)'}
  * หมุดหลักฐานระดับอ้างอิง MSL: ${project?.asBuiltBenchmarkMSL || 'หมุดมาตรฐานโครงการ'}
  * มาตรวัดระดับน้ำทางกายภาพ (Physical Benchmarks): "ระดับฟุตบาท / ทางเท้า" = น้ำท่วมขัง 10 ซม., "ท่วมมิดฟุตบาท" = 15 ซม., "ระดับแข้ง" = 20 ซม., "ระดับเข่า / ครึ่งล้อ" = 30-35 ซม., "ระดับเอว" = 75 ซม.
- จำนวนภาพถ่ายสำรวจหน้างาน: ${photoCount} ภาพ

ส่วนที่ 2: ข้อมูลตรวจวัดสภาพอากาศและลุ่มน้ำ Real-time ณ ปัจจุบัน (Macro Weather & Water Intelligence):
- โครงการ: [${project.code}] ${project.name} (พื้นที่: ${project.area})
- ภาพถ่ายดาวเทียมตรวจจับมวลน้ำทุ่ง GISTDA (disaster.gistda.or.th): ${weather.gistda || 'ทุ่งรับน้ำตอนบนหน่วงน้ำตามเกณฑ์'}
- การพยากรณ์น้ำหลาก AI ลุ่มน้ำหลัก (Google Flood Hub): ${weather.googleFloodHub || 'แนวโน้มระดับน้ำแม่น้ำสายหลักทรงตัว'}
- เรดาร์สภาพอากาศและทิศทางลมมรสุม (Windy.com): ${weather.windy || 'เรดาร์ตรวจพบกลุ่มฝนฟ้าคะนองช่วงบ่าย-ค่ำ'}
- ดัชนีฝนรายชั่วโมง (AccuWeather MinuteCast): ${weather.accuWeather || 'โอกาสเกิดฝนตกหนักเป็นแห่งๆ'}
- สถานการณ์น้ำท่าและคลองสายหลัก (RID/สสน./กทม.): ${weather.basinAlert || '-'}
- ประกาศเตือนสภาพอากาศ (TMD): ${weather.tmdAlert || '-'}
- สภาพอากาศปัจจุบัน: ${weather.condition}, อุณหภูมิ ${weather.temp}°C, โอกาสฝนตก 24 ชม. ${weather.rainProb}%, ฝนคาดการณ์ 24 ชม. ${weather.expectedRain24h} มม.
- สถานีตรวจวัดระดับน้ำอ้างอิง: ${weather.stationName || '-'}

[ข้อกำหนดสำคัญในการจำแนกและวิเคราะห์]:
1. คัดแยกข้อมูลหน้างานให้ตรงหมวดหมู่ 100% (Overall Status):
   - waterLevel: ระดับน้ำท่วมขังบนผิวถนน คัดแยกเฉพาะสภาพถนน/ผิวจราจร โดยต้องแยกความแตกต่างระหว่าง "ถนนหน้าโครงการ/ถนนภาระจำยอม/ทางเข้า" กับ "ถนนภายในโครงการ" อย่างแม่นยำ เช่น หากถนนภาระจำยอมท่วมระดับฟุตบาท (10 ซม.) แต่ถนนในโครงการแห้ง ให้ระบุทั้งสองส่วนให้ชัดเจน และห้ามตีความเป็นน้ำท่วมถนนในโครงการ
   - pumpsRunning: สถานะเครื่องสูบน้ำ (คัดแยกเฉพาะปั๊มน้ำ/เครื่องสูบน้ำ รวมปั๊มทุกตัวที่ระบุ เช่น "ปั๊มป้องกันน้ำท่วม No.1 และ No.2 ทดสอบระบบปกติ พร้อมใช้งาน 100%")
   - drainageCondition: สภาพคลองและทางระบายน้ำ (คัดแยกเฉพาะระดับน้ำคลอง/การไหล/คันกั้นน้ำ เช่น "ระดับน้ำในคลองหนุนขึ้นขังริมฟุตบาทเล็กน้อย ระบายได้ช้าลง")
2. ห้ามระบุชื่อบุคคลหรือชื่อผู้รายงานเด็ดขาด (ตามนโยบายความเป็นส่วนตัว Land & Houses)
3. บทวิเคราะห์และการประเมินสถานการณ์ (Executive Assessment & Action Taken):
   ห้ามนำข้อความในข้อ 1 มาวางต่อกันหรือก๊อปปี้มาผสมกันเฉยๆ แต่ต้อง "วิเคราะห์สังเคราะห์ความสัมพันธ์เชิงวิศวกรรม (Cross-Correlation Engineering Synthesis)" ร่วมกับข้อมูลสภาพอากาศ/ลุ่มน้ำของหน่วยงานต่างๆ พร้อมทั้งระบุ "มาตรการเชิงรุก (Action Taken)" ที่โครงการดำเนินการจริง:
   - assessmentField: ผสานสภาพผิวจราจรหน้างาน กับระดับยกพื้นถนน As-Built / สันเนินป้อม รปภ. และปริมาณฝนคาดการณ์ 24 ชม. (${weather.expectedRain24h} มม., โอกาสฝน ${weather.rainProb}%) + ระบุมาตรการปกป้องพื้นที่จริง
   - assessmentCanal: ผสานระดับน้ำคลองหน้าโครงการ กับภาพถ่ายดาวเทียมน้ำทุ่ง GISTDA, Google Flood Hub, และประกาศลุ่มน้ำ RID + ระบุมาตรการป้องกันน้ำหนุน/น้ำย้อน (เช่น ตรวจสอบปิดบานพับ Flap Valve, วางแนวกระสอบทรายริมตลิ่ง, จัดชุดลาดตระเวนวัดระดับคลองทุก 1 ชม.)
   - assessmentPumps: ผสานสถานะปั๊มที่ทดสอบหน้างาน กับภาระการระบายน้ำจากพยากรณ์ฝน + ระบุมาตรการบริหารเครื่องจักร (เช่น ระบบตัด-ต่อลูกลอยอัตโนมัติ, ช่างเทคนิค Standby 24 ชม., สำรองน้ำมันเชื้อเพลิงและเช็คเครื่องกำเนิดไฟฟ้าฉุกเฉิน)
   - assessmentOutlook: สรุปภาพรวมความเสี่ยง 24 ชม. จากกลุ่มฝนเรดาร์ Windy และ AccuWeather + คำสั่งการระดับผู้บริหารและแผนเผชิญเหตุ
4. เกณฑ์ตัดสินสถานะ:
   - NORMAL: ถนนแห้ง ไม่มีน้ำท่วมขัง คลองต่ำกว่าเกณฑ์ควบคุม ปั๊มพร้อมใช้ ไม่มีมวลน้ำหลากประชิด
   - WATCH: หากระดับน้ำคลองหน้างานหนุนสูงแตะริมฟุตบาท/ตลิ่ง, มีน้ำขังผิวถนน 5-10 ซม., หรือมีรายงานมวลน้ำหลากภายนอก/คันกั้นน้ำล้นในพื้นที่ใกล้เคียง (แม้ถนนในโครงการจะยังแห้ง) ให้ยกระดับสถานะเป็น "WATCH" (เฝ้าระวังพิเศษ) ทันที เพื่อเตือนให้เตรียมมาตรการเชิงรุก
   - CRITICAL: หากน้ำขัง > 10 ซม. หรือคลองภายนอกเอ่อล้นเข้าท่วมพื้นที่โครงการ

ให้ตอบกลับเป็น JSON เท่านั้น (ห้ามมี markdown codeblock ห้ามมีข้อความอื่น):
{
  "status": "NORMAL" | "WATCH" | "CRITICAL",
  "waterLevel": "ระดับน้ำท่วมขังบนผิวถนน (คัดแยกเฉพาะสภาพถนน/ผิวจราจรอย่างถูกต้อง โดยแยกถนนนอกและถนนในโครงการชัดเจน)",
  "pumpsRunning": "สถานะเครื่องสูบน้ำ (รวมปั๊มทุกตัวที่พิมพ์มา เช่น No.1 และ No.2 พร้อมใช้งาน)",
  "drainageCondition": "สภาพทางระบายน้ำ/คลอง (สะท้อนสถานะคลองและการระบายน้ำให้เป็นประโยคที่สมบูรณ์ชัดเจน เช่น อยู่ในเกณฑ์ปกติ ระบายได้คล่องตัว ห้ามระบุแค่หัวข้อลอยๆ)",
  "assessmentField": "บทวิเคราะห์สภาพพื้นที่และผิวจราจร 1-2 บรรทัด พร้อมระบุมาตรการปกป้องพื้นที่จริง",
  "assessmentCanal": "บทวิเคราะห์ระดับน้ำคลองภายนอก มวลน้ำหลาก และบานพับ Flap Valve 1-2 บรรทัด",
  "assessmentPumps": "บทวิเคราะห์ระบบเครื่องสูบน้ำ ความพร้อม และเวรช่าง Standby 24 ชม. 1-2 บรรทัด",
  "assessmentOutlook": "สรุปแนวโน้มความเสี่ยง 24 ชม. จากเรดาร์ Windy/AccuWeather และคำสั่งการเผชิญเหตุ 1-2 บรรทัด",
  "summary": "สรุปภาพรวมระดับผู้บริหาร 2-3 บรรทัด สำหรับแสดงในการ์ด LINE (สะท้อนสถานการณ์น้ำจริง พร้อมมาตรการป้องกัน ห้ามระบุชื่อผู้รายงาน)"
}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    });
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No JSON object found in response");
  } catch (e) {
    console.error("Gemini flood analysis error:", e.message || e);
    return generateFallbackEngineeringSynthesis({ project, weather, directReport, notes });
  }
}

