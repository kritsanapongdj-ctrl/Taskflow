const ExcelJS = require('exceljs');
const path = require('path');

async function processExcel() {
  const filePath = path.join('C:', 'Users', 'krits', 'lh-taskflow', 'rpg-performance-tracker-v2.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // 1. Update Detailed Criteria (เกณฑ์ประเมินแบบละเอียด)
  const detailSheet = workbook.worksheets.find(ws => ws.name.includes('เกณฑ์ประเมินแบบละเอียด'));
  if (detailSheet) {
    let int4RowIndex = -1;
    detailSheet.eachRow((row, rowNumber) => {
      const code = row.getCell(2).value;
      if (code === 'DEX1') {
        row.getCell(3).value = "ความถูกต้องของข้อมูลและงานเอกสาร\r\n(Data & Document Accuracy)";
        row.getCell(4).value = "คีย์ข้อมูลและทำเอกสารผิดพลาดบ่อยครั้ง ข้อมูลนัดหมายคลาดเคลื่อน สร้างภาระให้ส่วนงานอื่นต้องตามแก้";
        row.getCell(5).value = "จัดทำเอกสารและตรวจสอบข้อมูลทั่วไปได้ถูกต้องเป็นส่วนใหญ่ แต่อาจมีตกหล่นเล็กน้อยในช่วงที่งานเร่งด่วน";
        row.getCell(6).value = "จัดทำเอกสารสำคัญ ส่งรายงาน และบันทึกข้อมูลในระบบได้ถูกต้องครบถ้วน 100% ปราศจากความผิดพลาด";
        row.getCell(7).value = "ความแม่นยำระดับ Auditor ตรวจพบข้อผิดพลาดในเอกสารของแผนกอื่น และแก้ไขก่อนเกิดความเสียหายทางกฎหมายได้";
      }
      if (code === 'INT3') {
        row.getCell(3).value = "การวางแผนและการแก้ปัญหาเชิงประยุกต์\r\n(Preventive & Creative Solving)";
        row.getCell(4).value = "ไม่มีแผนรองรับการชำรุดล่วงหน้า ยึดติดกับวิธีเดิมๆ ไม่ปรับตัวเมื่อเจอข้อจำกัด";
        row.getCell(5).value = "ทำตามแผนบำรุงรักษา (PM) ได้ตามตาราง พยายามคิดวิธีใหม่ได้บ้างแต่ยังขาดความยืดหยุ่น";
        row.getCell(6).value = "จัดทำแผน PM ครบถ้วน พร้อมเสนอไอเดียพลิกแพลงทางออกรูปแบบใหม่ (Win-Win) ที่ประหยัดงบ";
        row.getCell(7).value = "ออกแบบระบบป้องกันวิกฤตขั้นสูง และคิดค้นนวัตกรรมการบริการหรือเทคนิคเจรจาใหม่ๆ ที่ไม่มีในตำรา";
      }
      if (code === 'INT4') int4RowIndex = rowNumber;
    });
    if (int4RowIndex !== -1) {
      detailSheet.spliceRows(int4RowIndex, 1);
    }
  }

  // 2. Rewrite Archetypes Guide V2 to Business Language
  const archetypeSheet = workbook.worksheets.find(ws => ws.name.includes('Archetypes Guide V2'));
  const archetypeMap = {}; // for summary sheet
  
  if (archetypeSheet) {
    // Update header Schrift Title -> อัตลักษณ์ศักยภาพ
    archetypeSheet.getRow(1).getCell(5).value = "อัตลักษณ์ศักยภาพ (Potential Identity)";

    const mappings = [
      { r: /ลุยหน้างาน/g, v: 'ปฏิบัติการเชิงรุก' },
      { r: /พุ่งชนปัญหา|ชาร์จปัญหาไว/g, v: 'ตอบสนองต่ออุปสรรคฉับไว' },
      { r: /เอาลูกน้อง\/ช่างอยู่หมัด|ฟาดผู้รับเหมา/g, v: 'ควบคุมผู้รับเหมาได้อย่างเด็ดขาด' },
      { r: /ไม่กลัวดราม่าหน้างาน|รับดราม่า/g, v: 'รับมือข้อร้องเรียนได้ดี' },
      { r: /ดราม่า/g, v: 'ข้อร้องเรียน' },
      { r: /งานไฟไหม้|เคสไฟไหม้/g, v: 'วิกฤตเร่งด่วน' },
      { r: /จบงาน|ปิดเคส/g, v: 'ส่งมอบงาน' },
      { r: /เนี๊ยบ/g, v: 'ความละเอียดระดับสูง' },
      { r: /บี้ซัพพลายเออร์|บี้ผู้รับเหมา/g, v: 'ควบคุมมาตรฐานผู้รับเหมาอย่างเคร่งครัด' },
      { r: /ดุดัน/g, v: 'เด็ดขาด' },
      { r: /แบกความกดดัน/g, v: 'รองรับสภาวะกดดันสูง' },
      { r: /เสี้ยววิ/g, v: 'ทันท่วงที' },
      { r: /ตัวแทงค์/g, v: 'ผู้รับมือกับความเสี่ยงหลัก' },
      { r: /มันสมอง/g, v: 'นักวางกลยุทธ์' },
      { r: /สายลุย/g, v: 'บุคลากรสายปฏิบัติการ' },
      { r: /อยู่หมัด/g, v: 'ได้อย่างมีประสิทธิภาพ' },
      { r: /เป๊ะ/g, v: 'ถูกต้องแม่นยำ' },
      { r: /ลูกน้อง/g, v: 'ทีมงาน' },
      { r: /หลุด/g, v: 'ข้อผิดพลาด' },
      { r: /กะทันหัน/g, v: 'เร่งด่วน' },
      { r: /หน้างาน/g, v: 'พื้นที่ปฏิบัติงาน' },
      { r: /ฉลุย/g, v: 'ราบรื่น' },
      { r: /ไว, /g, v: 'ฉับไว, ' }
    ];

    archetypeSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const codeCell = row.getCell(3).value; // e.g. AGI+CON+STR
      const descCell = row.getCell(4);
      const titleCell = row.getCell(5).value; // e.g. The Vanguard...
      
      if (descCell && descCell.value && typeof descCell.value === 'string') {
        let newDesc = descCell.value;
        mappings.forEach(m => {
          newDesc = newDesc.replace(m.r, m.v);
        });
        descCell.value = newDesc;
        
        if (codeCell) {
          archetypeMap[codeCell] = {
            title: titleCell,
            desc: newDesc
          };
        }
      }
    });
  }

  // 3. Generate Summary Sheet
  let summarySheet = workbook.worksheets.find(ws => ws.name === 'สรุปผลการประเมิน');
  if (summarySheet) {
    workbook.removeWorksheet(summarySheet.id);
  }
  summarySheet = workbook.addWorksheet('สรุปผลการประเมิน');
  
  // Headers
  summarySheet.columns = [
    { header: 'ชื่อพนักงาน', key: 'name', width: 30 },
    { header: 'ตำแหน่ง', key: 'role', width: 25 },
    { header: '3 สเตตัสเด่น', key: 'top3', width: 20 },
    { header: 'รูปแบบการทำงาน (Archetype Name)', key: 'archetype', width: 45 },
    { header: 'คำอธิบาย (ภาษาธุรกิจ)', key: 'desc', width: 80 }
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

      // Sort stats descending and take top 3
      stats.sort((a, b) => b.val - a.val);
      const top3 = [stats[0].name, stats[1].name, stats[2].name];
      // Sort alphabetically to match the Archetypes Guide keys (e.g., AGI+CON+STR)
      top3.sort();
      const comboKey = top3.join('+');

      const archetypeData = archetypeMap[comboKey] || { title: 'Unknown', desc: 'No exact match found.' };

      summarySheet.addRow({
        name: name,
        role: role,
        top3: comboKey,
        archetype: archetypeData.title,
        desc: archetypeData.desc
      });
    });
  }

  const outputPath = path.join('C:', 'Users', 'krits', 'lh-taskflow', 'rpg-performance-tracker-v3.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('✅ Updated file successfully created as v3!');
}

processExcel().catch(console.error);
