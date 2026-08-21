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
      
      const maxStat = stats[0].val;
      const minStat = stats[5].val;

      let archetypeData = { archetypeName: 'Unknown', desc: 'ไม่พบข้อมูลตรงกับตาราง', identity: 'Unknown' };
      let comboKey = '';

      if (maxStat <= 5) {
          comboKey = 'Growth Tendency';
          if (maxStat === 5 && minStat === 5) {
             archetypeData.archetypeName = 'Standard Achiever (ผู้บรรลุมาตรฐาน)';
             archetypeData.desc = 'ปฏิบัติงานได้ตามมาตรฐานอย่างครบถ้วนในทุกมิติ เป็นฟันเฟืองที่พึ่งพาได้ ควรกล้ารับความท้าทายใหม่ๆ เพื่อยกระดับสู่ผู้เชี่ยวชาญ';
             archetypeData.identity = 'The Standard';
          } else if (maxStat === 4 && minStat === 4) {
             archetypeData.archetypeName = 'The Maintainer (ผู้ประคองงาน)';
             archetypeData.desc = 'ประคองการทำงานภาพรวมได้ แต่มีช่องโหว่ในรายละเอียด ควรเน้นความรอบคอบและเรียนรู้จากพี่เลี้ยงเพื่อยกระดับผลงาน';
             archetypeData.identity = 'The Maintainer';
          } else if (maxStat <= 3 && minStat === maxStat) {
             archetypeData.archetypeName = 'Needs Attention (ผู้ต้องได้รับการดูแล)';
             archetypeData.desc = 'ผลการปฏิบัติงานต่ำกว่าเกณฑ์ในทุกมิติ หัวหน้างานควรเร่งประเมินสาเหตุและวางแผนปรับพื้นฐานใหม่ (Re-train) อย่างเร่งด่วน';
             archetypeData.identity = 'Needs Attention';
          } else if (minStat >= 4) {
             archetypeData.archetypeName = 'Generalist (ผู้เรียนรู้รอบด้าน)';
             archetypeData.desc = 'มีพื้นฐานที่สม่ำเสมอและปรับตัวได้ทุกบทบาท ควรผลักดันให้หา "ความถนัดเฉพาะทาง" 1-2 ด้าน เพื่อทะลุกำแพงสู่ระดับที่สูงขึ้น';
             archetypeData.identity = 'Undeveloped Potential';
          } else if (maxStat <= 3) {
             archetypeData.archetypeName = 'Apprentice (ผู้ฝึกหัด)';
             archetypeData.desc = 'อยู่ในช่วงเริ่มต้นหรือยังไม่คุ้นเคยกับกระบวนการ ต้องการการสอนงานอย่างใกล้ชิด (OJT) และกำหนดเป้าหมายที่ชัดเจน';
             archetypeData.identity = 'The Beginner';
          } else if (stats.filter(s => s.val >= 4).length > 0 && stats.filter(s => s.val <= 3).length > 0) {
             const bestKey = [stats[0].name, stats[1].name].sort().join('+');
             let topName = archetypeMap[bestKey]?.archetypeName || 'Specialist';
             archetypeData.archetypeName = `Rookie ${topName.split(' ')[0]} (ดาวรุ่ง)`;
             archetypeData.desc = `เริ่มฉายแววในด้าน ${stats[0].name} แต่ทักษะอื่นยังไม่เสถียร ควรส่งเสริมจุดแข็งและใช้พี่เลี้ยงประคองจุดอ่อน`;
             archetypeData.identity = 'Emerging Talent';
          } else {
             archetypeData.archetypeName = 'Uncalibrated (ศักยภาพที่รอการเจียระไน)';
             archetypeData.desc = 'ศักยภาพแฝงมีแต่ผลงานยังขาดความสม่ำเสมอ หัวหน้าควรช่วยจัดลำดับความสำคัญและแก้จุดอ่อนทีละจุดเพื่อให้ผลงานนิ่งขึ้น';
             archetypeData.identity = 'Uncalibrated';
          }
      } else {
          let topStats = [];
          if (stats[2].val >= 6.5) {
            topStats = [stats[0].name, stats[1].name, stats[2].name];
          } else {
            topStats = [stats[0].name, stats[1].name];
          }
          
          topStats.sort();
          comboKey = topStats.join('+');

          archetypeData = archetypeMap[comboKey] || { 
            archetypeName: 'Unknown', 
            desc: 'ไม่พบข้อมูลตรงกับตาราง',
            identity: 'Unknown'
          };
      }

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
