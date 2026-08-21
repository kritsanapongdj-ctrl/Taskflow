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

  // 1. Read Archetypes Guide V2
  const archetypeSheet = workbook.worksheets.find(ws => ws.name.includes('Archetypes Guide V2'));
  const archetypeMap = {}; 
  
  if (archetypeSheet) {
    archetypeSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const archetypeCell = row.getCell(2).value; 
      const codeCell = row.getCell(3).value; 
      const descCell = row.getCell(4).value; 
      const titleCell = row.getCell(5).value; 
      
      if (codeCell && typeof codeCell === 'string') {
        const cleanCode = codeCell.replace(/\s+/g, '');
        archetypeMap[cleanCode] = {
          archetypeName: archetypeCell,
          desc: descCell,
          identity: titleCell
        };
      }
    });
  }

  // 2. Generate Summary Sheet
  let summarySheet = workbook.worksheets.find(ws => ws.name === 'สรุปผลการประเมิน');
  if (summarySheet) {
    workbook.removeWorksheet(summarySheet.id);
  }
  summarySheet = workbook.addWorksheet('สรุปผลการประเมิน');
  
  // Headers
  summarySheet.columns = [
    { header: 'ชื่อพนักงาน', key: 'name', width: 30 },
    { header: 'ตำแหน่ง', key: 'role', width: 25 },
    { header: 'สเตตัสเด่น', key: 'stats', width: 20 },
    { header: 'รูปแบบการทำงาน (Archetype Name)', key: 'archetype', width: 45 },
    { header: 'คำอธิบาย', key: 'desc', width: 80 },
    { header: 'อัตลักษณ์ศักยภาพ (Potential Identity)', key: 'identity', width: 45 }
  ];
  
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };

  // Read Team Assessment
  const teamSheet = workbook.worksheets.find(ws => ws.name.includes('ประเมินผลทีม'));
  if (teamSheet) {
    teamSheet.eachRow((row, rowNumber) => {
      if (rowNumber < 3) return; 
      const name = row.getCell(1).value;
      const role = row.getCell(2).value;
      if (!name) return;

      const getVal = (cell) => {
        const val = cell.value;
        if (val && typeof val === 'object' && val.result !== undefined) return parseFloat(val.result) || 0;
        return parseFloat(val) || 0;
      };

      const stats = [
        { name: 'STR', val: getVal(row.getCell(3)) },
        { name: 'AGI', val: getVal(row.getCell(4)) },
        { name: 'DEX', val: getVal(row.getCell(5)) },
        { name: 'INT', val: getVal(row.getCell(6)) },
        { name: 'CON', val: getVal(row.getCell(7)) },
        { name: 'SEN', val: getVal(row.getCell(8)) },
      ];

      stats.sort((a, b) => b.val - a.val);
      
      let topStats = [];
      if (stats[2].val >= 6.5) {
        topStats = [stats[0].name, stats[1].name, stats[2].name];
      } else {
        topStats = [stats[0].name, stats[1].name];
      }
      
      topStats.sort();
      const comboKey = topStats.join('+');

      const archetypeData = archetypeMap[comboKey] || { 
        archetypeName: 'Unknown', 
        desc: 'ไม่พบข้อมูลตรงกับตาราง',
        identity: 'Unknown'
      };

      summarySheet.addRow({
        name: name,
        role: role,
        stats: comboKey,
        archetype: archetypeData.archetypeName,
        desc: archetypeData.desc,
        identity: archetypeData.identity
      });
    });
  }

  summarySheet.getColumn('desc').alignment = { wrapText: true, vertical: 'top' };
  summarySheet.getColumn('identity').alignment = { vertical: 'top' };
  summarySheet.getColumn('archetype').alignment = { vertical: 'top' };
  summarySheet.getColumn('name').alignment = { vertical: 'top' };
  summarySheet.getColumn('role').alignment = { vertical: 'top' };
  summarySheet.getColumn('stats').alignment = { vertical: 'top' };

  await workbook.xlsx.writeFile(filePath);
  console.log('\n✅ อัปเดตข้อมูลหน้า "สรุปผลการประเมิน" สำเร็จเรียบร้อยแล้ว!\n');
}

processExcel().catch(console.error);
