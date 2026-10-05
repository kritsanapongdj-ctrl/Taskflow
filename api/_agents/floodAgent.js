import { db, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from '../_services/firebase.js';
import { FLOOD_PROJECTS, lookupProjectForFlood } from '../_services/projectsConfig.js';
import { replyToLine, pushToLine, fetchLineImageBuffer, buildFloodFlexMessage } from '../_services/lineService.js';
import { fetchProjectWeather } from '../_services/weatherService.js';
import {
  extractDirectFieldReport,
  generateFallbackEngineeringSynthesis,
  analyzeWaterLevelFromPhotos,
  analyzeFloodReportWithGemini
} from '../_services/geminiService.js';
import { getAsBuiltOverrides } from '../_services/asBuiltService.js';

// รวมรายงาน สรุปผลด้วย AI และส่งกลับให้ Admin ในแชทส่วนตัว
export async function compileAndSendFloodReport({ userId, replyToken, host, proto }) {
  try {
    const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
    const draftSnap = await getDoc(draftRef);
    if (!draftSnap.exists()) return;

    const draft = draftSnap.data();
    const baseProject = FLOOD_PROJECTS[draft.projectCode] || {
      code: draft.projectCode,
      name: draft.projectName,
      area: draft.projectArea,
      lat: draft.lat || 13.7563,
      lon: draft.lon || 100.5018,
      stationName: 'สถานีลุ่มน้ำเจ้าพระยาตอนล่าง (สสน. / กรมชลประทาน)',
      basinAlert: 'เฝ้าระวังระดับน้ำคลองสายหลัก สูบระบายต่อเนื่อง',
      tmdAlert: 'กรมอุตุนิยมวิทยา: ร่องมรสุมพาดผ่านภาคกลาง เฝ้าระวังฝนตกสะสม'
    };

    const asBuiltOverrides = await getAsBuiltOverrides().catch(() => ({}));
    const customAsBuilt = asBuiltOverrides[draft.projectCode];
    const project = { ...baseProject };
    if (customAsBuilt) {
      if (customAsBuilt.asBuiltElevationDiff != null) project.asBuiltElevationDiff = customAsBuilt.asBuiltElevationDiff;
      if (customAsBuilt.entranceCrestDiff != null) project.entranceCrestDiff = customAsBuilt.entranceCrestDiff;
      if (customAsBuilt.hasFloodwall != null) project.hasFloodwall = customAsBuilt.hasFloodwall;
      if (customAsBuilt.floodwallHeightDiff != null) project.floodwallHeightDiff = customAsBuilt.floodwallHeightDiff;
      if (customAsBuilt.asBuiltBenchmarkMSL != null) project.asBuiltBenchmarkMSL = customAsBuilt.asBuiltBenchmarkMSL;
      if (customAsBuilt.asBuiltNotes != null) project.asBuiltNotes = customAsBuilt.asBuiltNotes;
    }

    const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
    const photos = [];
    photosSnap.forEach(d => {
      photos.push(d.data());
    });
    photos.sort((a, b) => {
      const timeDiff = (a.createdAt || 0) - (b.createdAt || 0);
      if (Math.abs(timeDiff) > 2500) {
        return timeDiff;
      }
      if (a.imageSetIndex != null && b.imageSetIndex != null) {
        return a.imageSetIndex - b.imageSetIndex;
      }
      return timeDiff;
    });

    if (photos.length === 0) {
      if (replyToken) {
        await replyToLine(replyToken, "⚠️ ยังไม่มีรูปภาพในระบบ กรุณาส่งรูปถ่ายหน้างาน (5–10 รูป) เข้ามาก่อนครับ");
      } else if (userId) {
        await pushToLine(userId, "⚠️ ยังไม่มีรูปภาพในระบบ กรุณาส่งรูปถ่ายหน้างาน (5–10 รูป) เข้ามาก่อนครับ");
      }
      return;
    }

    const finalPhotos = photos.slice(0, 10);

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const thaiYear = now.getFullYear() + 543;
    const surveyDateThai = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${thaiYear}`;
    const surveyTimeThai = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const generatedAtThai = `${surveyDateThai} เวลา ${surveyTimeThai} น.`;

    const cleanCode = project.code.replace(/[^A-Z0-9]/g, '');
    const dateCode = `${String(thaiYear).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randSeq = Math.floor(100 + Math.random() * 900);
    const reportId = `FLD-${cleanCode}-${dateCode}-${randSeq}`;

    // ดึงพยากรณ์อากาศและสถานีน้ำ Real-time ของไทย
    const weather = await fetchProjectWeather(project);

    // ดึงข้อความสถานะหน้างานตรงจาก LINE (เครื่องสูบน้ำ, สภาพคลอง/ทางระบาย)
    const directReport = extractDirectFieldReport(draft.notes);

    // วิเคราะห์ภาพถ่ายด้วย Gemini Vision + Location + หน่วยงาน เพื่อประเมินระดับน้ำผิวถนน
    // รัน parallel กับ text analysis เพื่อประหยัดเวลา
    const [aiResult, visionWaterLevel] = await Promise.all([
      analyzeFloodReportWithGemini({
        project,
        weather,
        notes: draft.notes,
        photoCount: photos.length,
        directReport
      }),
      analyzeWaterLevelFromPhotos({
        photos,
        project,
        weather,
        userText: draft.notes
      })
    ]);

    // 1. คำนวณ Fallback Engineering Synthesis ล่วงหน้าเพื่อความปลอดภัยและคุณภาพสูงสุด
    const fallbackSynthesis = generateFallbackEngineeringSynthesis({
      project,
      weather,
      directReport,
      notes: draft.notes
    });

    // 2. คัดเลือกข้อมูลสถานะหน้างาน 3 หมวด (Overall Status) อย่างถูกต้อง แม่นยำ ไม่ปะปนข้ามหมวด
    const cleanAiWater = (aiResult?.waterLevel && !/ปั๊ม|ปั้ม/i.test(aiResult.waterLevel) && !/^\s*\)/.test(aiResult.waterLevel)) ? aiResult.waterLevel : null;
    const cleanAiPumps = (aiResult?.pumpsRunning && !/ถนน|ผิวจราจร/i.test(aiResult.pumpsRunning)) ? aiResult.pumpsRunning : null;
    const cleanAiDrainage = (aiResult?.drainageCondition && !/ปั๊ม|ปั้ม/i.test(aiResult.drainageCondition)) ? aiResult.drainageCondition : null;

    const waterLevel = cleanAiWater || directReport.waterLevel || visionWaterLevel || fallbackSynthesis.waterLevel;
    const pumpsRunning = cleanAiPumps || directReport.pumpsRunning || fallbackSynthesis.pumpsRunning;
    let drainageCondition = cleanAiDrainage || directReport.drainageCondition || fallbackSynthesis.drainageCondition;

    // ป้องกันกรณีข้อความตัดเหลือแต่คำนามลอยๆ เช่น "ระดับน้ำในคลองหน้าโครงการ"
    if (drainageCondition && /^(?:ระดับน้ำในคลอง(?:หน้าโครงการ)?|ระดับน้ำคลอง|คลองหน้าโครงการ|สภาพคลอง|คลอง|ทางระบายน้ำ)$/i.test(drainageCondition.trim())) {
      drainageCondition = drainageCondition.trim() + ' อยู่ในเกณฑ์ควบคุม ระบายได้คล่องตัวตามปกติ';
    }

    // 3. บทวิเคราะห์และการประเมินสถานการณ์ (Executive Assessment & Action Taken) 4 มิติ
    const assessmentField = aiResult?.assessmentField || fallbackSynthesis.assessmentField;
    const assessmentCanal = aiResult?.assessmentCanal || fallbackSynthesis.assessmentCanal;
    const assessmentPumps = aiResult?.assessmentPumps || fallbackSynthesis.assessmentPumps;
    const assessmentOutlook = aiResult?.assessmentOutlook || fallbackSynthesis.assessmentOutlook;
    const finalStatus = aiResult?.status || fallbackSynthesis.status || 'NORMAL';
    const executiveSummary = aiResult?.summary || fallbackSynthesis.summary;

    // บันทึกรายงานหลักลง Firestore (ไม่ระบุชื่อผู้รายงาน)
    const reportRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_reports", reportId);
    await setDoc(reportRef, {
      reportId,
      userId: userId || '',
      projectCode: project.code,
      projectName: project.name,
      projectArea: project.area,
      status: finalStatus,
      waterLevel,
      pumpsRunning,
      drainageCondition,
      assessmentField,
      assessmentCanal,
      assessmentPumps,
      assessmentOutlook,
      waterStation: weather.stationName,
      basinAlert: weather.basinAlert,
      tmdAlert: weather.tmdAlert,
      executiveSummary,
      notes: draft.notes || '',
      weather,
      asBuiltElevationDiff: typeof project.asBuiltElevationDiff === 'number' ? project.asBuiltElevationDiff : 0.80,
      entranceCrestDiff: typeof project.entranceCrestDiff === 'number' ? project.entranceCrestDiff : null,
      hasFloodwall: Boolean(project.hasFloodwall),
      floodwallHeightDiff: typeof project.floodwallHeightDiff === 'number' ? project.floodwallHeightDiff : null,
      asBuiltBenchmarkMSL: project.asBuiltBenchmarkMSL || null,
      photoCount: finalPhotos.length,
      surveyDateThai,
      surveyTimeThai,
      generatedAtThai,
      createdAt: Date.now()
    });

    // บันทึกภาพลง Subcollection แบบขนาน (จำกัดไม่เกิน 10 ภาพ ตามมาตรฐาน Land & Houses)
    await Promise.all(finalPhotos.map((p, i) =>
      setDoc(doc(db, "artifacts", "default-app-id", "public", "data", "flood_reports", reportId, "photos", String(i)), {
        index: i,
        dataUrl: p.dataUrl,
        createdAt: Date.now()
      })
    ));

    // ล้างรูปภาพทั้งหมดใน Draft Subcollection ออกให้หมดจด
    try {
      const draftPhotosCol = collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos");
      const draftPhotosSnap = await getDocs(draftPhotosCol);
      const delPromises = [];
      draftPhotosSnap.forEach(p => delPromises.push(deleteDoc(p.ref)));
      await Promise.all(delPromises);
    } catch (cleanErr) {
      console.error("Clean draft photos error:", cleanErr);
    }

    // ล้าง Draft Session ออก
    await deleteDoc(draftRef);

    const domain = host || 'lh-taskflow.vercel.app';
    const protocol = proto || 'https';
    const pdfUrl = `${protocol}://${domain}/api/flood-report?id=${reportId}`;

    const flexMsg = buildFloodFlexMessage({
      reportId,
      project,
      weather,
      aiResult: {
        ...(aiResult || {}),
        status: finalStatus,
        summary: executiveSummary
      },
      photoCount: finalPhotos.length,
      surveyDateThai,
      surveyTimeThai,
      pdfUrl
    });

    const completionText = `✅ จัดทำเอกสารรายงานสถานการณ์น้ำท่วมเรียบร้อยครับ!\n` +
      `📌 โครงการ: [${project.code}] ${project.name}\n` +
      `📑 รหัสเอกสาร: ${reportId}\n` +
      `📸 ภาพถ่ายสำรวจ: ${finalPhotos.length} ภาพ\n` +
      `─────────────────────────\n` +
      `🔗 แตะปุ่ม "เปิดดูและดาวน์โหลดเอกสาร PDF" ในการ์ดด้านบน เพื่อเปิดและบันทึกเป็น PDF บนโทรศัพท์มือถือได้ทันทีครับ\n` +
      `🌐 หรือเปิดดูผ่านลิงก์ตรง:\n${pdfUrl}`;

    let delivered = false;
    if (replyToken) {
      delivered = await replyToLine(replyToken, [flexMsg, { type: 'text', text: completionText }]);
    }
    
    // หาก reply ไม่สำเร็จ หรือไม่มี replyToken ให้ push ไปยัง userId ในแชทส่วนตัวเสมอ
    if (!delivered && userId) {
      console.log(`Delivering via pushToLine to user ${userId}...`);
      await pushToLine(userId, [flexMsg, { type: 'text', text: completionText }]);
    }

  } catch (err) {
    console.error("compileAndSendFloodReport Error:", err);
    if (replyToken) {
      await replyToLine(replyToken, "❌ เกิดข้อผิดพลาดในการรวมรายงาน PDF กรุณาลองใหม่อีกครั้งครับ");
    } else if (userId) {
      await pushToLine(userId, "❌ เกิดข้อผิดพลาดในการรวมรายงาน PDF กรุณาลองใหม่อีกครั้งครับ");
    }
  }
}

export const FloodAgent = {
  name: 'FloodAgent',
  description: 'จัดการระบบรายงานสถานการณ์น้ำท่วม ภาพถ่ายสำรวจ วิเคราะห์ระดับน้ำด้วย AI และออกเอกสาร PDF ผู้บริหาร',

  canHandleText(cleanText, upperClean) {
    if (cleanText.startsWith('น้ำท่วม') || cleanText.startsWith('รายงานน้ำท่วม')) return true;
    if (upperClean === 'ยกเลิก' || upperClean === 'ล้าง' || upperClean === 'RESET' || upperClean === 'CLEAR' || upperClean === 'CANCEL') return true;
    if (/^(?:เสร็จ(?:แล้ว|ครับ|ค่ะ|คับ|คะ)?|จบ(?:งาน|แล้ว)?|เรียบร้อย(?:แล้ว|ครับ|ค่ะ)?|ออกรายงาน|สร้างPDF|PDF)$/i.test(cleanText) ||
        upperClean === 'เสร็จ' || upperClean === 'จบ' || upperClean === 'ออกรายงาน' || upperClean === 'สร้างPDF' || upperClean === 'PDF') {
      return true;
    }
    return false;
  },

  async handleText({ event, cleanText, upperClean, replyToken, userId, isGroup, host, proto }) {
    // 🌊 คำสั่งรายงานสถานการณ์น้ำท่วม (!น้ำท่วม, !รายงานน้ำท่วม, /น้ำท่วม)
    if (cleanText.startsWith('น้ำท่วม') || cleanText.startsWith('รายงานน้ำท่วม')) {
      if (isGroup) {
        await replyToLine(replyToken, "⚠️ เพื่อความเป็นระเบียบและป้องกันข้อมูลชนกัน กรุณารายงานสถานการณ์น้ำท่วมในแชทส่วนตัว (1-on-1) กับบอทเท่านั้นครับ 🙏");
        return true;
      }

      const query = cleanText.replace(/^(รายงานน้ำท่วม|น้ำท่วม)[ -]*/i, '').trim();
      if (!query) {
        const allSupportedCodes = Object.keys(FLOOD_PROJECTS).join(', ');
        const helpMsg = `🌊 ระบบรายงานสถานการณ์น้ำท่วม & การระบายน้ำ (Land & Houses)\n` +
          `─────────────────────────\n` +
          `วิธีใช้งานง่ายๆ ใน 2 ขั้นตอน:\n\n` +
          `1️⃣ พิมพ์คำสั่งพร้อมรหัสโครงการและรายละเอียด:\n` +
          `   👉 !น้ำท่วม 323 ถนนเมนแห้งสนิท สภาพปกติ ท่อระบายน้ำไหลคล่องตัว\n` +
          `   👉 !น้ำท่วม 415 คลองหกวาระดับน้ำสูง เดินเครื่องสูบน้ำระบายต่อเนื่อง\n` +
          `   👉 !น้ำท่วม LH-341 เฝ้าระวังมวลน้ำเจ้าพระยา\n\n` +
          `2️⃣ ส่งภาพถ่ายหน้างาน 5–10 รูป เข้ามาในแชทนี้\n` +
          `   บอทจะดึงพยากรณ์อากาศและสถานีน้ำ Real-time, วิเคราะห์สถานะด้วย AI และสร้างเอกสารสรุป PDF ส่งกลับให้ในแชทส่วนตัวทันทีครับ!\n\n` +
          `📌 โครงการที่รองรับ (${Object.keys(FLOOD_PROJECTS).length} โครงการ):\n` +
          `${allSupportedCodes}`;
        await replyToLine(replyToken, helpMsg);
        return true;
      }

      const match = lookupProjectForFlood(query);
      if (!match) {
        const allSupportedCodes = Object.keys(FLOOD_PROJECTS).join(', ');
        const errorMsg = `❌ ไม่พบรหัสโครงการ "${query}" ครับ\n\n` +
          `📌 ตัวอย่างรหัสโครงการที่รองรับ:\n` +
          `${allSupportedCodes}\n\n` +
          `💡 ตัวอย่าง: !น้ำท่วม 323 ถนนเมนระบายคล่องตัว เดินเครื่องสูบน้ำ 1 ตัว`;
        await replyToLine(replyToken, errorMsg);
        return true;
      }

      const { project, notes } = match;
      const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
      await setDoc(draftRef, {
        userId,
        projectCode: project.code,
        projectName: project.name,
        projectArea: project.area,
        lat: project.lat,
        lon: project.lon,
        stationName: project.stationName,
        basinAlert: project.basinAlert,
        tmdAlert: project.tmdAlert,
        notes: notes || 'ตรวจเช็คสถานะการระบายน้ำประจำวัน',
        createdAt: Date.now(),
        finalizing: false
      });

      // ตรวจสอบรูปภาพใน buffer ลบรูปเก่าที่ค้างเกิน 15 นาทีทิ้ง และนับเฉพาะรูปที่เพิ่งส่งเข้ามาสดๆ
      const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
      let recentPhotosCount = 0;
      const now = Date.now();
      for (const p of photosSnap.docs) {
        const pData = p.data();
        if (now - (pData.createdAt || 0) > 15 * 60 * 1000) {
          // รูปเก่าเกิน 15 นาที ลบทิ้งทันทีเพื่อไม่ให้ปนกับรอบใหม่
          await deleteDoc(p.ref);
        } else {
          recentPhotosCount++;
        }
      }

      if (recentPhotosCount > 0) {
        const guideWithPhotos = `🌊 ได้รับข้อมูลโครงการ [${project.code}] ${project.name} เรียบร้อยแล้วครับ!\n` +
          `📝 รายละเอียด: ${notes || 'ตรวจเช็คสถานะการระบายน้ำประจำวัน'}\n` +
          `─────────────────────────\n` +
          `📸 สถานะรูปภาพ: มีรูปถ่ายหน้างานในระบบแล้ว ${recentPhotosCount} ภาพ\n` +
          `👉 ท่านสามารถส่งรูปภาพเพิ่มเติมได้ (รวม 5–10 รูป) หรือพิมพ์ !เสร็จ เพื่อประมวลผลจัดทำ PDF ทันทีครับ`;
        await replyToLine(replyToken, guideWithPhotos);
        return true;
      }

      const guideMsg = `🌊 ได้รับข้อมูลโครงการ [${project.code}] ${project.name} เรียบร้อยแล้วครับ!\n` +
        `📝 รายละเอียด: ${notes || 'ตรวจเช็คสถานะการระบายน้ำประจำวัน'}\n` +
        `─────────────────────────\n` +
        `📸 ขั้นตอนต่อไป: กรุณาส่งรูปถ่ายหน้างาน (5–10 รูป) เข้ามาในแชทนี้ได้เลยครับ\n` +
        `💡 แนะนำภาพที่ควรส่ง:\n` +
        `1. ถนนเมน / ทางเข้า-ออกโครงการ\n` +
        `2. บ่อพัก / ท่อระบายน้ำหลัก\n` +
        `3. เครื่องสูบน้ำ / ตู้ควบคุมไฟ\n` +
        `4. คลองระบายน้ำ / บ่อหน่วงน้ำ\n` +
        `5. จุดระบายน้ำออกภายนอกโครงการ\n\n` +
        `*(ส่งภาพพร้อมกันรวดเดียวได้เลยครับ หรือเมื่อส่งครบแล้วพิมพ์ !เสร็จ เพื่อรับ PDF ทันที)*`;
      await replyToLine(replyToken, guideMsg);
      return true;
    }

    // 🗑️ คำสั่งยกเลิก/ล้างรอบรายงานค้าง (!ยกเลิก, !ล้าง, !reset)
    if (upperClean === 'ยกเลิก' || upperClean === 'ล้าง' || upperClean === 'RESET' || upperClean === 'CLEAR' || upperClean === 'CANCEL') {
      const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
      const draftSnap = await getDoc(draftRef);
      const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
      
      for (const p of photosSnap.docs) {
        await deleteDoc(p.ref);
      }
      if (draftSnap.exists()) {
        await deleteDoc(draftRef);
      }
      await replyToLine(replyToken, `🗑️ ล้างรอบรายงานและรูปภาพใน buffer เรียบร้อยแล้วครับ\nสามารถเริ่มต้นรายงานใหม่ได้ด้วยคำสั่ง:\n👉 !น้ำท่วม [รหัสโครงการ]`);
      return true;
    }

    // 🏁 คำสั่งจบการส่งรูปภาพ (!เสร็จ, !จบ, ออกรายงาน, สร้างPDF, เสร็จแล้ว, เรียบร้อย)
    const isFinishCommand = /^(?:เสร็จ(?:แล้ว|ครับ|ค่ะ|คับ|คะ)?|จบ(?:งาน|แล้ว)?|เรียบร้อย(?:แล้ว|ครับ|ค่ะ)?|ออกรายงาน|สร้างPDF|PDF)$/i.test(cleanText) ||
      upperClean === 'เสร็จ' || upperClean === 'จบ' || upperClean === 'ออกรายงาน' || upperClean === 'สร้างPDF' || upperClean === 'PDF';

    if (isFinishCommand) {
      const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
      const draftSnap = await getDoc(draftRef);
      if (draftSnap.exists()) {
        const draft = draftSnap.data();
        const nowMs = Date.now();
        const lockDuration = nowMs - (draft.finalizingAt || draft.lastPhotoAt || draft.createdAt || 0);

        // หากกำลังประมวลผลอยู่และยังไม่เกิน 60 วินาที ให้แจ้งเตือนว่ากำลังดำเนินการอยู่เพื่อป้องกันการกดซ้ำ
        if (draft.finalizing && lockDuration < 60000) {
          await replyToLine(replyToken, `⏳ ระบบกำลังประมวลผลรูปภาพและสร้างเอกสารสรุป PDF ให้เรียบร้อยแล้วครับ กรุณารอสักครู่...`);
          return true;
        }

        // Smart Wait Buffer: ดักรอรูปภาพที่กำลังเดินทาง (In-flight images) ป้องกันการที่ข้อความ '!เสร็จ' วิ่งแซงรูปภาพ
        let photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
        let currentCount = photosSnap.size;
        const expected = draft.expectedCount || 0;
        const timeSinceLastPhoto = Date.now() - (draft.lastPhotoAt || 0);

        // หากยังไม่ครบ expectedCount หรือเพิ่งมีรูปล่าสุดเข้ามาไม่ถึง 3 วินาที ให้รอ buffer ให้รูปที่เหลือโหลดเสร็จสมบูรณ์
        if ((expected > 0 && currentCount < expected) || (timeSinceLastPhoto < 3000)) {
          await new Promise(r => setTimeout(r, 2000));
          photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
        }

        const finalPhotoCount = photosSnap.size;
        if (finalPhotoCount > 0) {
          await updateDoc(draftRef, { finalizing: true, finalizingAt: Date.now() });
          // ส่ง replyToken ตรงเข้า compileAndSendFloodReport เพื่อให้ส่ง PDF กลับหาผู้ใช้ทันทีโดยไม่เสียโควต้า Push
          await compileAndSendFloodReport({ userId, replyToken, host, proto });
          return true;
        } else {
          await replyToLine(replyToken, `⚠️ ยังไม่มีภาพถ่ายในระบบ กรุณาส่งรูปภาพหน้างาน (5–10 รูป) เข้ามาก่อนครับ`);
          return true;
        }
      } else {
        // กรณีไม่มี Draft ค้างอยู่ ให้ตรวจสอบว่ามีรายงานล่าสุดที่สร้างไว้หรือไม่
        try {
          const reportsSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_reports"));
          let latestReport = null;
          reportsSnap.forEach(d => {
            const data = d.data();
            if (!latestReport || (data.createdAt || 0) > (latestReport.createdAt || 0)) {
              latestReport = data;
            }
          });

          if (latestReport && (Date.now() - (latestReport.createdAt || 0)) < 24 * 60 * 60 * 1000) {
            const domain = host || 'lh-taskflow.vercel.app';
            const protocol = proto || 'https';
            const pdfUrl = `${protocol}://${domain}/api/flood-report?id=${latestReport.reportId}`;

            const flexMsg = buildFloodFlexMessage({
              reportId: latestReport.reportId,
              project: { code: latestReport.projectCode, name: latestReport.projectName, area: latestReport.projectArea },
              weather: latestReport.weather,
              aiResult: { 
                status: latestReport.status, 
                summary: latestReport.executiveSummary 
              },
              photoCount: latestReport.photoCount || 5,
              surveyDateThai: latestReport.surveyDateThai || '-',
              surveyTimeThai: latestReport.surveyTimeThai || '-',
              pdfUrl
            });

            const msg = `✅ รายงานสถานการณ์น้ำท่วมล่าสุด:\n` +
              `📌 โครงการ: [${latestReport.projectCode}] ${latestReport.projectName}\n` +
              `📑 รหัสเอกสาร: ${latestReport.reportId}\n` +
              `─────────────────────────\n` +
              `🔗 แตะปุ่ม "เปิดดูและดาวน์โหลดเอกสาร PDF" ในการ์ด หรือเปิดดูผ่านลิงก์:\n${pdfUrl}`;

            const replied = await replyToLine(replyToken, [flexMsg, { type: 'text', text: msg }]);
            if (!replied && userId) {
              await pushToLine(userId, [flexMsg, { type: 'text', text: msg }]);
            }
            return true;
          }
        } catch (err) {
          console.error("Check recent report error:", err);
        }

        await replyToLine(replyToken, `🌊 ขณะนี้ยังไม่มีรอบการรายงานที่เปิดอยู่ครับ\nหากต้องการรายงานสถานการณ์น้ำท่วม กรุณาพิมพ์:\n👉 !น้ำท่วม [รหัสโครงการ] [รายละเอียด]\nเช่น !น้ำท่วม 410 ถนนเมนแห้งสนิท`);
        return true;
      }
    }

    return false;
  },

  async handleImageBatch({ userId, userEvents, host, proto }) {
    try {
      const draftRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId);
      const draftSnap = await getDoc(draftRef);

      // ดาวน์โหลดภาพถ่ายจาก LINE Content API และบันทึกลง Firestore แบบขนาน (Parallel) เพื่อความรวดเร็วและไม่ตกหล่น
      await Promise.all(userEvents.map(async (evt) => {
        const messageId = evt.message.id;
        const imageSet = evt.message.imageSet;
        try {
          const imgBuffer = await fetchLineImageBuffer(messageId);
          const dataUrl = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
          const photoRef = doc(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos", messageId);
          await setDoc(photoRef, {
            messageId,
            dataUrl,
            imageSetIndex: imageSet?.index ?? null,
            imageSetTotal: imageSet?.total ?? null,
            createdAt: Date.now()
          });
        } catch (pErr) {
          console.error(`Error saving image ${messageId}:`, pErr);
        }
      }));

      if (draftSnap.exists()) {
        const draft = draftSnap.data();
        if (draft.finalizing) {
          return;
        }

        await updateDoc(draftRef, {
          lastPhotoAt: Date.now()
        });

        const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
        const count = photosSnap.size;

        if (count >= 10) {
          // ได้รับครบเต็มโควต้า 10 ภาพแล้ว ให้รอ 1.5 วินาทีเพื่อให้ write ในรอบเดียวกันเสร็จสมบูรณ์ แล้วออกรายงาน PDF ทันที
          await new Promise(r => setTimeout(r, 1500));
          const latestDraftSnap = await getDoc(draftRef);
          if (latestDraftSnap.exists()) {
            const data = latestDraftSnap.data();
            const isLocked = data.finalizing && (Date.now() - (data.finalizingAt || 0) < 60000);
            if (!isLocked) {
              await updateDoc(draftRef, { finalizing: true, finalizingAt: Date.now() });
              await compileAndSendFloodReport({ userId, replyToken: null, host, proto });
            }
          }
        } else if (count >= 5) {
          // ได้รับ 5-9 ภาพ: รอ 12 วินาที (Debounce window) เผื่อมีรูปชุดที่ 2 เข้ามา (เช่น ส่ง 5+5 รูป) หรือเน็ตกำลังอัปโหลด
          await new Promise(r => setTimeout(r, 12000));
          const latestDraftSnap = await getDoc(draftRef);
          if (latestDraftSnap.exists()) {
            const data = latestDraftSnap.data();
            const timeSinceLast = Date.now() - (data.lastPhotoAt || 0);
            const isLocked = data.finalizing && (Date.now() - (data.finalizingAt || 0) < 60000);
            // หากไม่มีรูปใหม่เข้ามาเพิ่มเป็นเวลาอย่างน้อย 11 วินาที ให้จัดทำรายงานได้ทันที
            if (!isLocked && timeSinceLast >= 11000) {
              await updateDoc(draftRef, { finalizing: true, finalizingAt: Date.now() });
              await compileAndSendFloodReport({ userId, replyToken: null, host, proto });
            }
          }
        } else if (count >= 1 && count < 5) {
          // ตอบกลับแจ้งเตือนจำนวนภาพที่ได้รับ (1-4 ภาพ) เพื่อให้ผู้ใช้งานทราบสถานะว่าระบบบันทึกรูปไว้แล้ว
          const firstReplyToken = userEvents[0]?.replyToken;
          if (firstReplyToken) {
            await replyToLine(firstReplyToken, `📸 บอทได้รับรูปถ่ายหน้างานแล้ว ${count} ภาพครับ (สามารถส่งต่อได้จนครบ 10 รูป หรือพิมพ์ !เสร็จ เพื่อรับ PDF ได้ทันทีครับ)`);
          }
        }
      } else {
        // ยังไม่มี Draft เปิดอยู่ แนะนำวิธีพิมพ์คำสั่งพร้อมบอกจำนวนรูปที่ระบบจำไว้
        const photosSnap = await getDocs(collection(db, "artifacts", "default-app-id", "public", "data", "flood_drafts", userId, "photos"));
        if (photosSnap.size === userEvents.length) {
          const firstReplyToken = userEvents[0]?.replyToken;
          if (firstReplyToken) {
            await replyToLine(firstReplyToken, `📸 บอทได้รับรูปถ่ายหน้างานแล้วครับ (${photosSnap.size} ภาพ)!\nกรุณาพิมพ์รหัสโครงการเพื่อสร้างรายงาน เช่น:\n👉 !น้ำท่วม 410\n👉 !น้ำท่วม LH-379\n👉 !น้ำท่วม LA-029`);
          }
        }
      }
    } catch (imgErr) {
      console.error("Handle image batch error:", imgErr);
    }
  }
};
