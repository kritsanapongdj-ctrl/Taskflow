const fs = require('fs');

let appJsx = fs.readFileSync('src/App.jsx', 'utf8');

const newLogic1 =       const validStats = sortedStats.filter(s => s[1] >= 5);
      const minStat = sortedStats[5][1];
      const maxStat = sortedStats[0][1];
      
      let prefix = '';
      if (maxStat >= 9) prefix = 'Elite ';
      else if (maxStat >= 7) prefix = 'Veteran ';
      else if (maxStat >= 6) prefix = 'Adept ';

      const getDesc = (k) => {
         const defaults = { str: 'พลังดันงาน', agi: 'ความไว', dex: 'คุณภาพ', int: 'วิเคราะห์', con: 'ทนทาน', sen: 'ไหวพริบ' };
         return defaults[k];
      };

      let mainStyleRaw = ''; let styleDesc = ''; let useTop3 = false;
      if (maxStat <= 5) {
         if (maxStat === 5 && minStat === 5) {
            mainStyleRaw = 'Standard Achiever (ผู้บรรลุมาตรฐาน)'; styleDesc = 'ปฏิบัติงานได้ตามมาตรฐานอย่างครบถ้วนในทุกมิติ เป็นฟันเฟืองที่พึ่งพาได้ ควรกล้ารับความท้าทายใหม่ๆ เพื่อยกระดับสู่ผู้เชี่ยวชาญ';
         } else if (maxStat === 4 && minStat === 4) {
            mainStyleRaw = 'The Maintainer (ผู้ประคองงาน)'; styleDesc = 'ประคองการทำงานภาพรวมได้ แต่มีช่องโหว่ในรายละเอียด ควรเน้นความรอบคอบและเรียนรู้จากพี่เลี้ยงเพื่อยกระดับผลงาน';
         } else if (maxStat <= 3 && minStat === maxStat) {
            mainStyleRaw = 'Needs Attention (ผู้ต้องได้รับการดูแล)'; styleDesc = 'ผลการปฏิบัติงานต่ำกว่าเกณฑ์ในทุกมิติ หัวหน้างานควรเร่งประเมินสาเหตุและวางแผนปรับพื้นฐานใหม่ (Re-train) อย่างเร่งด่วน';
         } else if (minStat >= 4) {
            mainStyleRaw = 'Generalist (ผู้เรียนรู้รอบด้าน)'; styleDesc = 'มีพื้นฐานที่สม่ำเสมอและปรับตัวได้ทุกบทบาท ควรผลักดันให้หา "ความถนัดเฉพาะทาง" 1-2 ด้าน เพื่อทะลุกำแพงสู่ระดับที่สูงขึ้น';
         } else if (maxStat <= 3) {
            mainStyleRaw = 'Apprentice (ผู้ฝึกหัด)'; styleDesc = 'อยู่ในช่วงเริ่มต้นหรือยังไม่คุ้นเคยกับกระบวนการ ต้องการการสอนงานอย่างใกล้ชิด (OJT) และกำหนดเป้าหมายที่ชัดเจน';
         } else if (sortedStats.filter(s => s[1] >= 4).length > 0 && sortedStats.filter(s => s[1] <= 3).length > 0) {
            const bestKey = sortedStats[0][0]; const secondBestKey = sortedStats[1][0];
            let topName = archetypeMapTop2[[bestKey, secondBestKey].sort().join('_')] || 'Specialist (สายเฉพาะทาง)';
            mainStyleRaw = \Rookie \ (ดาวรุ่งสาย\)\; styleDesc = \เริ่มฉายแววในด้าน\ แต่ทักษะอื่นยังไม่เสถียร ควรส่งเสริมจุดแข็งและใช้พี่เลี้ยงประคองจุดอ่อน\;
         } else {
            mainStyleRaw = 'Uncalibrated (ศักยภาพที่รอการเจียระไน)'; styleDesc = 'ศักยภาพแฝงมีแต่ผลงานยังขาดความสม่ำเสมอ หัวหน้าควรช่วยจัดลำดับความสำคัญและแก้จุดอ่อนทีละจุดเพื่อให้ผลงานนิ่งขึ้น';
         }
      } else {
         if (validStats.length >= 3 && (validStats.length === 3 || validStats[2][1] > validStats[3][1])) useTop3 = true;
         if (useTop3) {
            const topKeys = [validStats[0][0], validStats[1][0], validStats[2][0]];
            mainStyleRaw = (archetypeMapTop3[topKeys.sort().join('_')] || 'Hybrid (สายผสมผสาน)');
            styleDesc = \โดดเด่นอย่างมากด้าน \, \ และ \\;
         } else {
            const topKeys = [validStats[0][0], validStats[1][0]];
            mainStyleRaw = (archetypeMapTop2[topKeys.sort().join('_')] || 'Specialist (สายเฉพาะทาง)');
            styleDesc = \ความเชี่ยวชาญพิเศษด้าน \ ผสานกับ \\;
         }
      }\;

const oldLogic1 = \      const validStats = sortedStats.filter(s => s[1] >= 5);
      const maxStat = validStats.length > 0 ? validStats[0][1] : 0;
      
      let prefix = '';
      if (maxStat >= 9) prefix = 'Elite ';
      else if (maxStat >= 7) prefix = 'Veteran ';
      else if (maxStat >= 5) prefix = 'Adept ';
      else prefix = 'Trainee ';

      const getDesc = (k) => {
         const defaults = { str: 'พลังดันงาน', agi: 'ความไว', dex: 'คุณภาพ', int: 'วิเคราะห์', con: 'ทนทาน', sen: 'ไหวพริบ' };
         return defaults[k];
      };

      let mainStyleRaw = ''; let styleDesc = ''; let useTop3 = false;
      if (validStats.length < 2) {
         mainStyleRaw = 'Novice (ระดับเริ่มต้น)'; styleDesc = 'ทักษะยังอยู่ในระดับเริ่มต้น แนะนำให้มุ่งเน้นการพัฒนาศักยภาพเพิ่มเติม';
      } else if (validStats.length === 6 && validStats[0][1] === validStats[5][1]) {
         mainStyleRaw = 'All-Rounder (สายสมดุล)'; styleDesc = 'สมดุลในทุกมิติ ปรับตัวได้กับทุกสถานการณ์และแก้ไขปัญหาได้ทุกรูปแบบ';
      } else {
         if (validStats.length >= 3 && (validStats.length === 3 || validStats[2][1] > validStats[3][1])) useTop3 = true;
         if (useTop3) {
            const topKeys = [validStats[0][0], validStats[1][0], validStats[2][0]];
            mainStyleRaw = (archetypeMapTop3[topKeys.sort().join('_')] || 'Hybrid (สายผสมผสาน)');
            styleDesc = \\\โดดเด่นอย่างมากด้าน \\\, \\\ และ \\\\\\;
         } else {
            const topKeys = [validStats[0][0], validStats[1][0]];
            mainStyleRaw = (archetypeMapTop2[topKeys.sort().join('_')] || 'Specialist (สายเฉพาะทาง)');
            styleDesc = \\\ความเชี่ยวชาญพิเศษด้าน \\\ ผสานกับ \\\\\\;
         }
      }\;

appJsx = appJsx.replace(oldLogic1, newLogic1);

const newLogic2 = \      const validStats = sortedStats.filter(s => s[1] >= 5);
      const minStat = sortedStats[5][1];
      const maxStat = sortedStats[0][1];
      
      let prefix = '';
      if (maxStat >= 9) prefix = 'Elite ';
      else if (maxStat >= 7) prefix = 'Veteran ';
      else if (maxStat >= 6) prefix = 'Adept ';

      const getDesc = (k) => {
         const conf = sets.statConfigs && sets.statConfigs[k];
         if (conf && conf.desc) return conf.desc.trim();
         const defaults = {
             str: 'พลังในการผลักดันงานหนัก', agi: 'ความรวดเร็วและคล่องตัว', dex: 'ความแม่นยำและคุณภาพงาน',
             int: 'การวิเคราะห์และวางระบบ', con: 'ความทนทานต่อความกดดัน', sen: 'ไหวพริบและการจัดการอารมณ์'
         };
         return defaults[k];
      };

      if (maxStat <= 5) {
         if (maxStat === 5 && minStat === 5) {
            mainStyle = 'Standard Achiever (ผู้บรรลุมาตรฐาน)'; styleDesc = 'ปฏิบัติงานได้ตามมาตรฐานอย่างครบถ้วนในทุกมิติ เป็นฟันเฟืองที่พึ่งพาได้ ควรกล้ารับความท้าทายใหม่ๆ เพื่อยกระดับสู่ผู้เชี่ยวชาญ';
         } else if (maxStat === 4 && minStat === 4) {
            mainStyle = 'The Maintainer (ผู้ประคองงาน)'; styleDesc = 'ประคองการทำงานภาพรวมได้ แต่มีช่องโหว่ในรายละเอียด ควรเน้นความรอบคอบและเรียนรู้จากพี่เลี้ยงเพื่อยกระดับผลงาน';
         } else if (maxStat <= 3 && minStat === maxStat) {
            mainStyle = 'Needs Attention (ผู้ต้องได้รับการดูแล)'; styleDesc = 'ผลการปฏิบัติงานต่ำกว่าเกณฑ์ในทุกมิติ หัวหน้างานควรเร่งประเมินสาเหตุและวางแผนปรับพื้นฐานใหม่ (Re-train) อย่างเร่งด่วน';
         } else if (minStat >= 4) {
            mainStyle = 'Generalist (ผู้เรียนรู้รอบด้าน)'; styleDesc = 'มีพื้นฐานที่สม่ำเสมอและปรับตัวได้ทุกบทบาท ควรผลักดันให้หา "ความถนัดเฉพาะทาง" 1-2 ด้าน เพื่อทะลุกำแพงสู่ระดับที่สูงขึ้น';
         } else if (maxStat <= 3) {
            mainStyle = 'Apprentice (ผู้ฝึกหัด)'; styleDesc = 'อยู่ในช่วงเริ่มต้นหรือยังไม่คุ้นเคยกับกระบวนการ ต้องการการสอนงานอย่างใกล้ชิด (OJT) และกำหนดเป้าหมายที่ชัดเจน';
         } else if (sortedStats.filter(s => s[1] >= 4).length > 0 && sortedStats.filter(s => s[1] <= 3).length > 0) {
            const bestKey = sortedStats[0][0]; const secondBestKey = sortedStats[1][0];
            let topName = archetypeMapTop2[[bestKey, secondBestKey].sort().join('_')] || 'Specialist (สายเฉพาะทาง)';
            mainStyle = \Rookie \ (ดาวรุ่งสาย\)\; styleDesc = \เริ่มฉายแววในด้าน\ แต่ทักษะอื่นยังไม่เสถียร ควรส่งเสริมจุดแข็งและใช้พี่เลี้ยงประคองจุดอ่อน\;
         } else {
            mainStyle = 'Uncalibrated (ศักยภาพที่รอการเจียระไน)'; styleDesc = 'ศักยภาพแฝงมีแต่ผลงานยังขาดความสม่ำเสมอ หัวหน้าควรช่วยจัดลำดับความสำคัญและแก้จุดอ่อนทีละจุดเพื่อให้ผลงานนิ่งขึ้น';
         }
      } else {
         let useTop3 = false;
         if (validStats.length >= 3) {
            if (validStats.length === 3 || validStats[2][1] > validStats[3][1]) {
               useTop3 = true;
            }
         }

         if (useTop3) {
            const topKeys = [validStats[0][0], validStats[1][0], validStats[2][0]];
            const pairKey = [...topKeys].sort().join('_');
            mainStyle = prefix + (archetypeMapTop3[pairKey] || 'Hybrid (สายผสมแบบพิเศษ)');
            styleDesc = \โดดเด่นด้าน\ ผสานเข้ากับ\ และเสริมด้วย\\;
         } else {
            const topKeys = [validStats[0][0], validStats[1][0]];
            const pairKey = [...topKeys].sort().join('_');
            mainStyle = prefix + (archetypeMapTop2[pairKey] || 'Specialist (สายเฉพาะทาง)');
            styleDesc = \โดดเด่นด้าน\ และผสานเข้ากับ\ ได้อย่างยอดเยี่ยม\;
         }
      }\;

const oldLogic2 = \      const validStats = sortedStats.filter(s => s[1] >= 5);
      const maxStat = validStats.length > 0 ? validStats[0][1] : 0;
      
      let prefix = '';
      if (maxStat >= 9) prefix = 'Elite ';
      else if (maxStat >= 7) prefix = 'Veteran ';
      else if (maxStat >= 5) prefix = 'Adept ';
      else prefix = 'Trainee ';

      const getDesc = (k) => {
         const conf = sets.statConfigs && sets.statConfigs[k];
         if (conf && conf.desc) return conf.desc.trim();
         const defaults = {
             str: 'พลังในการผลักดันงานหนัก', agi: 'ความรวดเร็วและคล่องตัว', dex: 'ความแม่นยำและคุณภาพงาน',
             int: 'การวิเคราะห์และวางระบบ', con: 'ความทนทานต่อความกดดัน', sen: 'ไหวพริบและการจัดการอารมณ์'
         };
         return defaults[k];
      };

      if (validStats.length < 2) {
         mainStyle = prefix + 'Novice (สายเริ่มต้น)';
         styleDesc = 'ทักษะยังอยู่ในระดับเริ่มต้น แนะนำให้ประเมินความสามารถเพื่อวางแผนพัฒนาศักยภาพเพิ่มเติม';
      } else if (validStats.length === 6 && validStats[0][1] === validStats[5][1]) {
         mainStyle = prefix + 'All-Rounder (สายสมดุล)';
         styleDesc = 'มีความสามารถรอบด้าน บาลานซ์ในทุกมิติ สามารถปรับตัวเข้าได้กับทุกสถานการณ์';
      } else {
         let useTop3 = false;
         if (validStats.length >= 3) {
            if (validStats.length === 3 || validStats[2][1] > validStats[3][1]) {
               useTop3 = true;
            }
         }

         if (useTop3) {
            const topKeys = [validStats[0][0], validStats[1][0], validStats[2][0]];
            const pairKey = [...topKeys].sort().join('_');
            mainStyle = prefix + (archetypeMapTop3[pairKey] || 'Hybrid (สายผสมแบบพิเศษ)');
            styleDesc = \\\โดดเด่นด้าน\\\ ผสานเข้ากับ\\\ และเสริมด้วย\\\\\\;
         } else {
            const topKeys = [validStats[0][0], validStats[1][0]];
            const pairKey = [...topKeys].sort().join('_');
            mainStyle = prefix + (archetypeMapTop2[pairKey] || 'Specialist (สายเฉพาะทาง)');
            styleDesc = \\\โดดเด่นด้าน\\\ และผสานเข้ากับ\\\ ได้อย่างยอดเยี่ยม\\\;
         }
      }\;

appJsx = appJsx.replace(oldLogic2, newLogic2);
fs.writeFileSync('src/App.jsx', appJsx, 'utf8');

let updateSum = fs.readFileSync('update_summary.cjs', 'utf8');
const oldLogic3 = \      stats.sort((a, b) => b.val - a.val);
      
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
      };\;

const newLogic3 = \      stats.sort((a, b) => b.val - a.val);
      
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
             archetypeData.archetypeName = \\\Rookie \\\ (ดาวรุ่ง)\\\;
             archetypeData.desc = \\\เริ่มฉายแววในด้าน \\\ แต่ทักษะอื่นยังไม่เสถียร ควรส่งเสริมจุดแข็งและใช้พี่เลี้ยงประคองจุดอ่อน\\\;
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
      }\;

updateSum = updateSum.replace(oldLogic3, newLogic3);
fs.writeFileSync('update_summary.cjs', updateSum, 'utf8');

console.log('Update Complete.');
