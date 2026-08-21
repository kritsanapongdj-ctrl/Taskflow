const ExcelJS = require('exceljs');
const path = require('path');

async function processExcel() {
  const filePath = path.join('C:', 'Users', 'krits', 'lh-taskflow', 'rpg-performance-tracker-v6.xlsx');
  
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.error('\n❌ เปิดไฟล์ Excel ค้างไว้ครับ! กรุณา "ปิดไฟล์ Excel" ก่อนรันคำสั่ง\n');
      process.exit(1);
    }
    throw err;
  }

  const teamSheet = workbook.worksheets.find(ws => ws.name.includes('ประเมินผลทีม'));
  if (!teamSheet) {
    console.error('❌ ไม่พบ Sheet ประเมินผลทีม');
    process.exit(1);
  }

  // Find the last row of data in Column A
  let lastRow = 3;
  teamSheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 3 && row.getCell(1).value) {
      lastRow = rowNumber;
    }
  });

  const cols = [
    { col: 'C', avgRange: 'K', avgEnd: 'M' },
    { col: 'D', avgRange: 'N', avgEnd: 'P' },
    { col: 'E', avgRange: 'Q', avgEnd: 'S' },
    { col: 'F', avgRange: 'T', avgEnd: 'W' },
    { col: 'G', avgRange: 'X', avgEnd: 'Z' },
    { col: 'H', avgRange: 'AA', avgEnd: 'AC' },
  ];

  for (const c of cols) {
    for (let i = 3; i <= lastRow; i++) {
      teamSheet.getCell(`${c.col}${i}`).value = {
        formula: `ROUND(ROUND(AVERAGE(${c.avgRange}${i}:${c.avgEnd}${i}), 1), 0)`
      };
    }
  }

  // Verify that summary sheet still has formulas
  const summarySheet = workbook.worksheets.find(ws => ws.name === 'สรุปผลการประเมิน');
  if (summarySheet) {
    for (let i = 2; i <= lastRow - 1; i++) {
      const r = i + 1; // row index in ประเมินผลทีม
      const summaryRow = summarySheet.getRow(i);
      
      if (!teamSheet.getRow(r).getCell(1).value) continue;

      const S_STR = `'ประเมินผลทีม'!C${r}`;
      const S_AGI = `'ประเมินผลทีม'!D${r}`;
      const S_DEX = `'ประเมินผลทีม'!E${r}`;
      const S_INT = `'ประเมินผลทีม'!F${r}`;
      const S_CON = `'ประเมินผลทีม'!G${r}`;
      const S_SEN = `'ประเมินผลทีม'!H${r}`;

      const V_STR = `(${S_STR}+0.06)`;
      const V_AGI = `(${S_AGI}+0.05)`;
      const V_DEX = `(${S_DEX}+0.04)`;
      const V_INT = `(${S_INT}+0.03)`;
      const V_CON = `(${S_CON}+0.02)`;
      const V_SEN = `(${S_SEN}+0.01)`;

      const ARR_STATS = `CHOOSE({1,2,3,4,5,6},${S_STR},${S_AGI},${S_DEX},${S_INT},${S_CON},${S_SEN})`;
      const ARR_ADJ = `CHOOSE({1,2,3,4,5,6},${V_STR},${V_AGI},${V_DEX},${V_INT},${V_CON},${V_SEN})`;

      const T = `IF(LARGE(${ARR_STATS},3)>=6.5,LARGE(${ARR_ADJ},3),LARGE(${ARR_ADJ},2))`;
      const statsFormula = `SUBSTITUTE(TRIM(IF(${V_AGI}>=${T}," AGI","")&IF(${V_CON}>=${T}," CON","")&IF(${V_DEX}>=${T}," DEX","")&IF(${V_INT}>=${T}," INT","")&IF(${V_SEN}>=${T}," SEN","")&IF(${V_STR}>=${T}," STR",""))," ","+")`;

      const MAX_S = `MAX('ประเมินผลทีม'!C${r}:H${r})`;
      const MIN_S = `MIN('ประเมินผลทีม'!C${r}:H${r})`;
      const C4 = `COUNTIF('ประเมินผลทีม'!C${r}:H${r}, ">=4")`;
      const C3 = `COUNTIF('ประเมินผลทีม'!C${r}:H${r}, "<=3")`;

      const growthFormulaName = `IFS(AND(${MAX_S}=5, ${MIN_S}=5), "Standard Achiever (ผู้บรรลุมาตรฐาน)", AND(${MAX_S}=4, ${MIN_S}=4), "The Maintainer (ผู้ประคองงาน)", AND(${MAX_S}<=3, ${MIN_S}=${MAX_S}), "Needs Attention (ผู้ต้องได้รับการดูแล)", ${MIN_S}>=4, "Generalist (ผู้เรียนรู้รอบด้าน)", ${MAX_S}<=3, "Apprentice (ผู้ฝึกหัด)", AND(${C4}>0, ${C3}>0), "Rookie (ดาวรุ่ง)", TRUE, "Uncalibrated (ศักยภาพที่รอการเจียระไน)")`;
      
      const growthFormulaDesc = `IFS(AND(${MAX_S}=5, ${MIN_S}=5), "ปฏิบัติงานได้ตามมาตรฐานอย่างครบถ้วนในทุกมิติ เป็นฟันเฟืองที่พึ่งพาได้ ควรกล้ารับความท้าทายใหม่ๆ เพื่อยกระดับสู่ผู้เชี่ยวชาญ", AND(${MAX_S}=4, ${MIN_S}=4), "ประคองการทำงานภาพรวมได้ แต่มีช่องโหว่ในรายละเอียด ควรเน้นความรอบคอบและเรียนรู้จากพี่เลี้ยงเพื่อยกระดับผลงาน", AND(${MAX_S}<=3, ${MIN_S}=${MAX_S}), "ผลการปฏิบัติงานต่ำกว่าเกณฑ์ในทุกมิติ หัวหน้างานควรเร่งประเมินสาเหตุและวางแผนปรับพื้นฐานใหม่ (Re-train) อย่างเร่งด่วน", ${MIN_S}>=4, "มีพื้นฐานที่สม่ำเสมอและปรับตัวได้ทุกบทบาท ควรผลักดันให้หา ""ความถนัดเฉพาะทาง"" 1-2 ด้าน เพื่อทะลุกำแพงสู่ระดับที่สูงขึ้น", ${MAX_S}<=3, "อยู่ในช่วงเริ่มต้นหรือยังไม่คุ้นเคยกับกระบวนการ ต้องการการสอนงานอย่างใกล้ชิด (OJT) และกำหนดเป้าหมายที่ชัดเจน", AND(${C4}>0, ${C3}>0), "เริ่มฉายแววในด้านที่ถนัด แต่ทักษะอื่นยังไม่เสถียร ควรส่งเสริมจุดแข็งและใช้พี่เลี้ยงประคองจุดอ่อน", TRUE, "ศักยภาพแฝงมีแต่ผลงานยังขาดความสม่ำเสมอ หัวหน้าควรช่วยจัดลำดับความสำคัญและแก้จุดอ่อนทีละจุดเพื่อให้ผลงานนิ่งขึ้น")`;

      const growthFormulaIdentity = `IFS(AND(${MAX_S}=5, ${MIN_S}=5), "The Standard", AND(${MAX_S}=4, ${MIN_S}=4), "The Maintainer", AND(${MAX_S}<=3, ${MIN_S}=${MAX_S}), "Needs Attention", ${MIN_S}>=4, "Undeveloped Potential", ${MAX_S}<=3, "The Beginner", AND(${C4}>0, ${C3}>0), "Emerging Talent", TRUE, "Uncalibrated")`;

      summaryRow.getCell(1).value = { formula: `'ประเมินผลทีม'!A${r}` };
      summaryRow.getCell(2).value = { formula: `'ประเมินผลทีม'!B${r}` };
      summaryRow.getCell(3).value = { formula: `IF(${MAX_S}<=5, "Growth Tendency", ${statsFormula})` };
      summaryRow.getCell(4).value = { formula: `IF(${MAX_S}<=5, ${growthFormulaName}, INDEX('Archetypes Guide V2'!$B$2:$B$36, MATCH(C${i}, 'Archetypes Guide V2'!$C$2:$C$36, 0)))` };
      summaryRow.getCell(5).value = { formula: `IF(${MAX_S}<=5, ${growthFormulaDesc}, INDEX('Archetypes Guide V2'!$D$2:$D$36, MATCH(C${i}, 'Archetypes Guide V2'!$C$2:$C$36, 0)))` };
      summaryRow.getCell(6).value = { formula: `IF(${MAX_S}<=5, ${growthFormulaIdentity}, INDEX('Archetypes Guide V2'!$E$2:$E$36, MATCH(C${i}, 'Archetypes Guide V2'!$C$2:$C$36, 0)))` };
    }
  }

  const outputPath = path.join('C:', 'Users', 'krits', 'lh-taskflow', 'rpg-performance-tracker-v6.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('\n✅ แก้ไขบั๊กสูตรและอัปเดตไฟล์ V6 สำเร็จเรียบร้อยแล้ว!\n');
}

processExcel().catch(console.error);
