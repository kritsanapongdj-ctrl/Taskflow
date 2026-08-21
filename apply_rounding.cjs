const ExcelJS = require('exceljs');
const path = require('path');

async function processExcel() {
  const filePath = path.join('C:', 'Users', 'krits', 'lh-taskflow', 'rpg-performance-tracker-v5.xlsx');
  
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
    { col: 'F', avgRange: 'T', avgEnd: 'W' }, // INT range
    { col: 'G', avgRange: 'X', avgEnd: 'Z' },
    { col: 'H', avgRange: 'AA', avgEnd: 'AC' },
  ];

  for (const c of cols) {
    const startCell = `${c.col}3`;
    const refRange = `${c.col}3:${c.col}${lastRow}`;
    
    // Set the master shared formula in Row 3
    teamSheet.getCell(startCell).value = {
      formula: `ROUND(ROUND(AVERAGE(${c.avgRange}3:${c.avgEnd}3), 1), 0)`,
      ref: refRange,
      shareType: 'shared'
    };

    // Link the remaining rows to the shared formula
    for (let i = 4; i <= lastRow; i++) {
      teamSheet.getCell(`${c.col}${i}`).value = {
        sharedFormula: startCell
      };
    }
  }

  await workbook.xlsx.writeFile(filePath);
  console.log('\n✅ อัปเดตสูตรปัดเศษ (ROUND) ในหน้าประเมินผลทีมสำเร็จเรียบร้อยแล้ว!\n');
}

processExcel().catch(console.error);
