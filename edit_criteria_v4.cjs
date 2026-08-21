const ExcelJS = require('exceljs');
const path = require('path');

async function processExcel() {
  const inputPath = path.join('C:', 'Users', 'krits', 'lh-taskflow', 'rpg-performance-tracker-v3.xlsx');
  const outputPath = path.join('C:', 'Users', 'krits', 'lh-taskflow', 'rpg-performance-tracker-v4.xlsx');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);

  // 1. Read Archetypes Guide V2
  const archetypeSheet = workbook.worksheets.find(ws => ws.name.includes('Archetypes Guide V2'));
  const archetypeMap = {}; 
  
  if (archetypeSheet) {
    archetypeSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      
      const archetypeCell = row.getCell(2).value; // e.g. Frontline Berserker
      const codeCell = row.getCell(3).value; // e.g. AGI+CON+STR
      const descCell = row.getCell(4).value; // e.g. ฉับไว...
      const titleCell = row.getCell(5).value; // e.g. The Vanguard...
      
      if (codeCell && typeof codeCell === 'string') {
        // Strip ALL spaces from codeCell to match join('+')
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
    { header: 'รูปแบบการทำงาน (Archetype Name)', key: 'archetype', width: 35 },
    { header: 'คำอธิบาย', key: 'desc', width: 80 },
    { header: 'อัตลักษณ์ศักยภาพ (Potential Identity)', key: 'identity', width: 45 }
  ];
  
  // Style Headers
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };

  // Read Team Assessment
  const teamSheet = workbook.worksheets.find(ws => ws.name.includes('ประเมินผลทีม'));
  if (teamSheet) {
    teamSheet.eachRow((row, rowNumber) => {
      if (rowNumber < 3) return; // Skip headers
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

      // Sort stats descending
      stats.sort((a, b) => b.val - a.val);
      
      // Determine if 2 or 3 stats combo
      // We always take Top 2. We take Top 3 if the 3rd stat is >= 6.5.
      let topStats = [];
      if (stats[2].val >= 6.5) {
        topStats = [stats[0].name, stats[1].name, stats[2].name];
      } else {
        topStats = [stats[0].name, stats[1].name];
      }
      
      // Sort alphabetically to match the Archetypes Guide keys (e.g., AGI+CON+STR)
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

  // Format description column to wrap text
  summarySheet.getColumn('desc').alignment = { wrapText: true, vertical: 'top' };
  summarySheet.getColumn('identity').alignment = { vertical: 'top' };
  summarySheet.getColumn('archetype').alignment = { vertical: 'top' };
  summarySheet.getColumn('name').alignment = { vertical: 'top' };
  summarySheet.getColumn('role').alignment = { vertical: 'top' };
  summarySheet.getColumn('stats').alignment = { vertical: 'top' };

  await workbook.xlsx.writeFile(outputPath);
  console.log('✅ Updated file successfully created as v4!');
}

processExcel().catch(console.error);
