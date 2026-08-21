const ExcelJS = require('exceljs');
const path = require('path');

async function processExcel() {
  const filePath = path.join('C:', 'Users', 'krits', 'lh-taskflow', 'rpg-performance-tracker-v5.xlsx');
  
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.error('\n❌ เปิดไฟล์ Excel ค้างไว้ครับ! กรุณา "ปิดไฟล์ Excel" ก่อนแล้วค่อยกดอัปเดตใหม่นะครับ\n');
      process.exit(1);
    }
    throw err;
  }

  const summarySheet = workbook.worksheets.find(ws => ws.name === 'สรุปผลการประเมิน');
  if (!summarySheet) return;

  const teamSheet = workbook.worksheets.find(ws => ws.name.includes('ประเมินผลทีม'));
  const rowCount = teamSheet ? teamSheet.rowCount : 100;

  for (let i = 2; i <= rowCount - 1; i++) {
    const r = i + 1; // row index in ประเมินผลทีม (starts at 3)
    const summaryRow = summarySheet.getRow(i);
    
    // We can assume if column A in team sheet has a value, we should generate formula
    if (!teamSheet.getRow(r).getCell(1).value) continue;

    // Names in team sheet
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

    // A column: ชื่อพนักงาน
    summaryRow.getCell(1).value = { formula: `'ประเมินผลทีม'!A${r}` };
    
    // B column: ตำแหน่ง
    summaryRow.getCell(2).value = { formula: `'ประเมินผลทีม'!B${r}` };

    // C column: สเตตัสเด่น
    summaryRow.getCell(3).value = { formula: statsFormula };

    // D column: Archetype Name
    summaryRow.getCell(4).value = { formula: `INDEX('Archetypes Guide V2'!$B$2:$B$36, MATCH(C${i}, 'Archetypes Guide V2'!$C$2:$C$36, 0))` };

    // E column: Description
    summaryRow.getCell(5).value = { formula: `INDEX('Archetypes Guide V2'!$D$2:$D$36, MATCH(C${i}, 'Archetypes Guide V2'!$C$2:$C$36, 0))` };

    // F column: Potential Identity
    summaryRow.getCell(6).value = { formula: `INDEX('Archetypes Guide V2'!$E$2:$E$36, MATCH(C${i}, 'Archetypes Guide V2'!$C$2:$C$36, 0))` };
  }

  await workbook.xlsx.writeFile(filePath);
  console.log('\n✅ ฝังสูตร Excel แบบคลาสสิก (ไม่พัง 100%) สำเร็จเรียบร้อยแล้ว!\n');
}

processExcel().catch(console.error);
