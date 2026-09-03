import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import ClassEmblem from '../ClassEmblem';
import AssessmentModal from '../AssessmentModal';
import AgentPixelArt from '../AgentPixelArt';
import RadarChart from '../components/charts/RadarChart';
import archetypesData from '../data/archetypes.json';
import { 
  getArchetypeIdentity, 
  getStatLevelText, 
  getRubricText, 
  analyzeArchetype, 
  STAT_DEFINITIONS, 
  STAT_KEYS 
} from '../utils/archetypeEngine';

export default function TeamStatusTab({
  teamUnlk,
  setTeamUnlk,
  pwd,
  setPwd,
  sets,
  setSets,
  saveD,
  teamForm,
  setTeamForm,
  selTeam,
  setSelTeam,
  teamEditMode,
  setTeamEditMode,
  setCropModal,
  saveTeam,
  Icon
}) {
  const [assessMode, setAssessMode] = useState(false);
    if (!teamUnlk) return (<div className="bg-white p-8 rounded-xl shadow border text-center max-w-sm mx-auto mt-10"><h2 className="text-lg font-bold mb-4 text-[#0f2e4a]">เข้าสู่ระบบทีมงาน</h2><input type="password" placeholder="รหัสผ่าน" className="border p-3 rounded-lg w-full mb-4 text-center tracking-widest text-lg outline-none focus:ring-2 focus:ring-[#bca374]" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&pwd==='1312'&&setTeamUnlk(true)} /><button type="button" onClick={()=>pwd==='1312'&&setTeamUnlk(true)} className="bg-[#bca374] hover:bg-[#a38a5b] text-white px-4 py-2 rounded-lg w-full font-bold transition">ยืนยัน</button></div>);

    const sList = sets.staffStats || [];
    const classMap = (sets.staffClasses||[]).reduce((a,c)=>{a[c.id]=c; return a;},{});
    
    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (setCropModal) {
          setCropModal({ isOpen: true, imageSrc: ev.target.result, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null });
        }
      };
      reader.readAsDataURL(file);
    };

    const handleExcelUpload = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames.includes('ประเมินผลทีม') ? 'ประเมินผลทีม' : workbook.SheetNames[1] || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let ns = [...(sets.staffStats||[])];
          let addedCount = 0;
          for(let i=2; i<rows.length; i++) {
            const row = rows[i];
            if(!row || !row[0] || row[0].toString().trim() === '') continue;
            
            const name = row[0].toString().trim();
            const avg = (arr) => {
               const valid = arr.filter(v => typeof v === 'number');
               if(valid.length === 0) return 5;
               const sum = valid.reduce((a,b)=>a+b,0);
               const rawAvg = sum/valid.length;
               const r1 = Math.round(rawAvg * 10) / 10;
               return Math.round(r1);
            };
            const str = avg([row[10], row[11], row[12]]);
            const agi = avg([row[13], row[14], row[15]]);
            const dex = avg([row[16], row[17], row[18]]);
            const int = avg([row[19], row[20], row[21], row[22], row[27], row[28]]);
            const con = avg([row[23], row[24], row[25]]);
            const sen = avg([row[26], row[29], row[30]]);
            
            const tieBreakers = { str: 0.06, agi: 0.05, dex: 0.04, int: 0.03, con: 0.02, sen: 0.01 };
            const stats = { str, agi, dex, int, con, sen };
            const validStats = Object.keys(stats).filter(k => stats[k] >= 5).map(k => ({ key: k, val: stats[k], adj: stats[k] + tieBreakers[k] }));
            
            let archetypeKey = 'novice';
            if (validStats.length >= 2) {
               validStats.sort((a,b) => b.adj - a.adj); // Sort descending by adjusted score
               const useTop3 = validStats.length >= 3 && validStats[2].val >= 6;
               const topKeys = validStats.slice(0, useTop3 ? 3 : 2).map(s => s.key).sort();
               archetypeKey = topKeys.join('_');
            }

            const potentialIdentity = getArchetypeIdentity(stats, archetypesData);
            
            const existingIdx = ns.findIndex(x => x.name === name);
            const newObj = {
              name: name, str, agi, dex, int, con, sen, archetypeKey, potentialIdentity
            };
            if(existingIdx > -1) {
              ns[existingIdx] = {...ns[existingIdx], ...newObj};
            } else {
              ns.push({ id: Date.now().toString() + i, classId: '', image: '', ...newObj });
            }
            addedCount++;
          }
          const newSets = {...sets, staffStats: ns};
          setSets(newSets);
          saveD('settings', newSets);
          alert(`นำเข้าข้อมูลพนักงานสำเร็จจำนวน ${addedCount} รายการ!`);
        } catch (err) {
          console.error(err);
          alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบว่าเลือกไฟล์ที่ถูกต้อง');
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = null;
    };
    
    const renderCinematicView = () => {
      const u = teamForm;
      if (!u.id) return null;
      const role = classMap[u.classId];

      const statsObj = { str: Number(u.str)||0, agi: Number(u.agi)||0, dex: Number(u.dex)||0, int: Number(u.int)||0, con: Number(u.con)||0, sen: Number(u.sen)||0 };
      const sortedStats = Object.entries(statsObj).sort((a,b) => b[1] - a[1]);
      
      const archetypeMapTop2 = {};
        const archetypeMapTop3 = {};
        archetypesData.forEach(a => {
           const keys = a.key.split('_');
           if (keys.length === 2) archetypeMapTop2[a.key] = a.name + (a.thai ? ' (' + a.thai + ')' : '');
           if (keys.length === 3) archetypeMapTop3[a.key] = a.name + (a.thai ? ' (' + a.thai + ')' : '');
        });
        archetypesData.forEach(a => {
           const keys = a.key.split('_');
           if (keys.length === 2) archetypeMapTop2[a.key] = a.name + (a.thai ? ' (' + a.thai + ')' : '');
           if (keys.length === 3) archetypeMapTop3[a.key] = a.name + (a.thai ? ' (' + a.thai + ')' : '');
        });

      const validStats = sortedStats.filter(s => s[1] >= 5);
      const minStat = sortedStats[5][1];
      const maxStat = sortedStats[0][1];
      
      let prefix = '';
      if (maxStat >= 10) prefix = 'Master ';
      else if (maxStat >= 9) prefix = 'Elite ';
      else if (maxStat >= 8) prefix = 'Expert ';
      else if (maxStat >= 7) prefix = 'Veteran ';
      else if (maxStat >= 6) prefix = 'Adept ';

      const getDesc = (k) => {
         const defaults = { str: 'พลังดันงาน', agi: 'ความไว', dex: 'ความละเอียด', int: 'เทคโนโลยี', con: 'ทนทาน', sen: 'วุฒิภาวะทางอารมณ์' };
         return defaults[k];
      };

      let mainStyleRaw = ''; let styleDesc = ''; let useTop3 = false;
      if (maxStat === minStat) {
         const v = maxStat;
         if (v === 1) { mainStyleRaw = 'Critical Crisis (ขั้นวิกฤต/ต้องจัดการเด็ดขาด)'; styleDesc = 'ผลงานและพฤติกรรมต่ำสุดในทุกมิติ ก่อให้เกิดความเสียหายร้ายแรง เป็นปัจจัยเสี่ยงระดับวิกฤตที่หัวหน้างานต้องมีมาตรการจัดการขั้นเด็ดขาด (Terminate หรือ Re-role ทันที)'; }
         else if (v === 2) { mainStyleRaw = 'Severe Underperformer (ต่ำกว่าเกณฑ์รุนแรง)'; styleDesc = 'ผลการปฏิบัติงานต่ำกว่ามาตรฐานมาก เป็นจุดอ่อนของทีมที่ต้องเข้าสู่แผน PIP (Performance Improvement Plan) อย่างเร่งด่วนที่สุด'; }
         else if (v === 3) { mainStyleRaw = 'Needs Intensive Care (ต้องดูแลใกล้ชิด)'; styleDesc = 'ยังไม่สามารถปล่อยให้ทำงานเองได้ ต้องมีพี่เลี้ยง (Mentor) คอยประกบแทบทุกขั้นตอนเพื่อป้องกันความผิดพลาด'; }
         else if (v === 4) { mainStyleRaw = 'Inconsistent Performer (ขาดความสม่ำเสมอ)'; styleDesc = 'เกือบแตะมาตรฐาน แต่ยังมีจุดบกพร่องหรือหลุดบ่อย หัวหน้างานต้องคอยกระตุ้นและกำหนด Check-point ถี่ขึ้นเพื่อดึงศักยภาพ'; }
         else if (v === 5) { mainStyleRaw = 'Standard Achiever (ผู้บรรลุมาตรฐาน)'; styleDesc = 'ปฏิบัติงานได้ตามมาตรฐานอย่างครบถ้วน เป็นฟันเฟืองที่พึ่งพาได้ ควรกล้ารับความท้าทายใหม่ๆ เพื่อยกระดับสู่ความเชี่ยวชาญ'; }
         else if (v === 6) { mainStyleRaw = 'Solid Contributor (ผู้ขับเคลื่อนชั้นเยี่ยม)'; styleDesc = 'ทำงานได้ดีเยี่ยมและไว้ใจได้ในทุกด้าน เป็นแกนหลักที่ทีมฝากความหวังได้เสมอโดยไม่ต้องตรวจสอบซ้ำ'; }
         else if (v === 7) { mainStyleRaw = 'Advanced Generalist (ผู้เชี่ยวชาญรอบด้าน)'; styleDesc = 'มีทักษะระดับสูงครบทุกมิติ สามารถแก้ปัญหาซับซ้อนได้อย่างอิสระและเป็นที่ปรึกษาให้ทีมได้'; }
         else if (v === 8) { mainStyleRaw = 'Expert Leader (ผู้นำระดับผู้เชี่ยวชาญ)'; styleDesc = 'โดดเด่นรอบด้าน เป็นเสาหลักที่กำหนดมาตรฐานการทำงานของทีมและริเริ่มสิ่งใหม่ๆ ได้อย่างยอดเยี่ยม'; }
         else if (v === 9) { mainStyleRaw = 'The Mastermind (ผู้คุมเกม)'; styleDesc = 'สุดยอดบุคลากรที่มีอิทธิพลต่อทิศทางของทีม เป็นตัวแปรสำคัญที่สามารถพลิกสถานการณ์และสร้างนวัตกรรมใหม่ๆ ได้อย่างไม่มีขีดจำกัด'; }
         else if (v === 10) { mainStyleRaw = 'The Legend (ระดับตำนาน)'; styleDesc = 'บุคคลระดับตำนาน ไร้จุดอ่อนใดๆ เป็นรากฐานที่สร้างนิยามใหม่แห่งความสำเร็จและกำหนดทิศทางขององค์กร'; }
      } else if (maxStat >= 8 && minStat <= 3) {
         mainStyleRaw = 'Polarized Prodigy (สุดโต่งแต่อ่อนไหว)';
         styleDesc = `มีพรสวรรค์สูงลิ่วในด้าน ${getDesc(sortedStats[0][0])} แต่มีจุดบอดวิกฤตในด้าน ${getDesc(sortedStats[5][0])} (คะแนน ${minStat}) ซึ่งอาจสร้างความเสียหายรุนแรงได้ หัวหน้างานต้องจัดสรรทีมงานมาอุดช่องโหว่นี้โดยด่วน ไม่ควรให้ลุยเดี่ยว`;
      } else if (maxStat <= 5) {
         if (minStat >= 4) {
            mainStyleRaw = 'Generalist (ผู้เรียนรู้รอบด้าน)'; styleDesc = 'มีพื้นฐานที่สม่ำเสมอและปรับตัวได้ทุกบทบาท ควรผลักดันให้หา "ความถนัดเฉพาะทาง" 1-2 ด้าน เพื่อทะลุกำแพงสู่ระดับที่สูงขึ้น';
         } else if (sortedStats.filter(s => s[1] >= 4).length > 0 && sortedStats.filter(s => s[1] <= 3).length > 0) {
            mainStyleRaw = 'Trainee (อยู่ในช่วงพัฒนาทักษะ)'; styleDesc = 'ทักษะโดยรวมยังต่ำกว่าเกณฑ์ปฏิบัติงานขั้นต้น (มาตรฐาน = 5) จำเป็นต้องมีระบบพี่เลี้ยง (Mentoring) คอยประกบอย่างใกล้ชิดและไม่ควรให้รับผิดชอบงานหลักเพียงลำพัง';
         } else {
            mainStyleRaw = 'Uncalibrated (ศักยภาพที่รอการเจียระไน)'; styleDesc = 'ศักยภาพแฝงมีแต่ผลงานยังขาดความสม่ำเสมอ หัวหน้าควรช่วยจัดลำดับความสำคัญและแก้จุดอ่อนทีละจุดเพื่อให้ผลงานนิ่งขึ้น';
         }
      } else {
         if (validStats.length >= 3 && (validStats.length === 3 || validStats[2][1] > validStats[3][1])) useTop3 = true;
         if (useTop3) {
            const topKeys = [validStats[0][0], validStats[1][0], validStats[2][0]];
            mainStyleRaw = (archetypeMapTop3[topKeys.sort().join('_')] || 'Hybrid (สายผสมผสาน)');
            styleDesc = `โดดเด่นอย่างมากด้าน ${getDesc(topKeys[0])}, ${getDesc(topKeys[1])} และ ${getDesc(topKeys[2])}`;
         } else {
            const topKeys = [validStats[0][0], validStats[1][0]];
            mainStyleRaw = (archetypeMapTop2[topKeys.sort().join('_')] || 'Specialist (สายเฉพาะทาง)');
            styleDesc = `ความเชี่ยวชาญพิเศษด้าน ${getDesc(topKeys[0])} ผสานกับ ${getDesc(topKeys[1])}`;
         }
         if (minStat <= 4) {
            const weakReasons = { str: 'งานที่ต้องลุยและใช้พลังขับเคลื่อนสูง', agi: 'งานด่วนที่ต้องการผลลัพธ์รวดเร็ว', dex: 'งานที่ต้องใช้ความละเอียดถูกต้องสูงและแข่งกับเวลา', int: 'งานที่ต้องประยุกต์ใช้เทคโนโลยีหรือจัดระบบขั้นตอนที่ซับซ้อน', con: 'งานที่เต็มไปด้วยความกดดันและยืดเยื้อ', sen: 'งานที่ต้องเจรจาต่อรองหรือรับมือกับอารมณ์ลูกค้า' };
            const weakNames = sortedStats.filter(s => s[1] <= 4).map(s => weakReasons[s[0]]).filter(Boolean);
            if (weakNames.length > 0) styleDesc += ` แต่ทั้งนี้ พนักงานยังไม่เหมาะที่จะมอบหมายให้ทำ${weakNames.join(' รวมถึง ')} เนื่องจากสเตตัสในด้านดังกล่าวยังอยู่ในระดับต่ำ`;
         }
      }

      let archetypeKey = 'novice';
        let identityText = '-';
        let bottomDescText = <>{styleDesc}</>;
  
        if (maxStat <= 5) {
           if (sortedStats.filter(s => s[1] >= 4).length > 0 && sortedStats.filter(s => s[1] <= 3).length > 0) {
              archetypeKey = [sortedStats[0][0], sortedStats[1][0]].sort().join('_');
           }
        } else {
           if (validStats.length >= 2) {
              if (validStats.length === 6 && validStats[0][1] === validStats[5][1]) {
                 archetypeKey = 'all_rounder';
              } else {
                 archetypeKey = validStats.slice(0, useTop3 ? 3 : 2).map(s=>s[0]).sort().join('_');
              }
           }
        }
        
        const archObj = archetypesData.find(a => a.key === archetypeKey);
        if (archObj && validStats.length >= 2) {
            let dynamicWeakness = "";
            let weaknessLabel = "จุดอ่อน:";
            let weaknessColor = "text-rose-400";
            const lowestStatValue = sortedStats[5][1];
            const lowestStats = sortedStats.filter(s => s[1] === lowestStatValue);
            
            const weakBehaviorDefs = { 
                str: 'อาจขาดความเด็ดขาดในการลุยงาน หรือลังเลที่จะตัดสินใจแก้ปัญหาเฉพาะหน้า (STR)', 
                agi: 'อาจตอบสนองต่อปัญหาได้ช้า และปรับตัวไม่ทันเมื่อสถานการณ์เปลี่ยนแปลงกะทันหัน (AGI)', 
                dex: 'อาจมีข้อผิดพลาดในรายละเอียดเอกสาร ขาดความประณีตในการตรวจงาน หรือบริหารเวลาได้ไม่ดีนัก (DEX)', 
                int: 'อาจใช้เครื่องมือ/เทคโนโลยีช่วยทำงานได้ไม่คล่อง หรือจัดลำดับกระบวนการทำงานได้ไม่เป็นระบบพอ (INT)', 
                con: 'อาจทนรับความกดดันจากงานที่ยืดเยื้อไม่ได้ดีนัก และเสี่ยงต่อภาวะหมดไฟได้ง่าย (CON)', 
                sen: 'อาจควบคุมอารมณ์ได้ไม่ดีเมื่อถูกยั่วยุ สื่อสารเจตนาคลาดเคลื่อน หรือขาดศิลปะในการเจรจา (SEN)' 
            };
            const weakBehaviors = lowestStats.map(s => weakBehaviorDefs[s[0]]).join(' รวมถึง ');

            if (lowestStatValue <= 4) {
                weaknessLabel = "จุดอ่อน:";
                dynamicWeakness = `${weakBehaviors} (สเตตัสต่ำกว่าเกณฑ์มาตรฐาน: ${lowestStatValue}/10) จำเป็นต้องมีระบบพี่เลี้ยงคอยดูแล`;
            } else {
                weaknessLabel = "ข้อควรระวัง:";
                weaknessColor = "text-amber-400";
                dynamicWeakness = `${weakBehaviors} แม้จะอยู่ในระดับที่สอบผ่าน (${lowestStatValue}/10) แต่ถือเป็นจุดที่ยังอ่อนที่สุดเมื่อเทียบกับศักยภาพด้านอื่นของพนักงาน`;
            }

            bottomDescText = (
                <span className="flex flex-col gap-1.5 mt-2 bg-stone-900/40 p-2.5 rounded-lg border border-stone-800/50">
                    <span className="text-stone-300 italic">"{archObj.desc}"</span>
                    <span className="mt-1 flex items-start"><span className="text-emerald-400 font-bold mr-1 shrink-0">จุดเด่น:</span> <span>{archObj.strengths}</span></span>
                    <span className="flex items-start"><span className={`font-bold mr-1 shrink-0 ${weaknessColor}`}>{weaknessLabel}</span> <span>{dynamicWeakness}</span></span>
                </span>
            );
        } else {
            bottomDescText = <span className="text-gray-400 italic block mt-2">{styleDesc}</span>;
        }

      identityText = getArchetypeIdentity(statsObj, archetypesData);

      const nameMatch = mainStyleRaw.match(/^(.+?)\s*\((.+?)\)$/);
      const enTitle = nameMatch ? nameMatch[1].trim() : mainStyleRaw.trim();
      const thTitle = nameMatch ? nameMatch[2].trim() : '';

      const flavorMap = {
        'Master': 'ระดับปรมาจารย์',
        'Elite': 'ระดับผู้เชี่ยวชาญสูงสุด',
        'Expert': 'ระดับผู้เชี่ยวชาญ',
        'Veteran': 'ระดับชำนาญการ',
        'Adept': 'ระดับผู้มีความสามารถ',
        'Trainee': 'ระดับผู้ฝึกฝน'
      };
      const prefixText = prefix.trim();
      const flavorText = flavorMap[prefixText] || '';

      const outers = [
        { k: 'cx', n: 'Customer Exp.', val: Math.round((statsObj.con + statsObj.sen)/2) },
        { k: 'tech', n: 'Tech. Expertise', val: Math.round((statsObj.int + statsObj.dex)/2) },
        { k: 'sla', n: 'Ops & SLA', val: Math.round((statsObj.agi + statsObj.dex)/2) },
        { k: 'crisis', n: 'Crisis Resolv.', val: Math.round((statsObj.str + statsObj.con)/2) },
        { k: 'resource', n: 'Resource Ctrl.', val: Math.round((statsObj.str + statsObj.sen)/2) },
        { k: 'innovation', n: 'Innovation', val: Math.round((statsObj.int + statsObj.sen)/2) }
      ].map(o => ({...o, finalVal: (u[o.k] !== null && u[o.k] !== undefined) ? u[o.k] : o.val}));

      return (
          <>
            <AssessmentModal 
               isOpen={assessMode} 
               onClose={() => setAssessMode(false)} 
               staff={teamForm} 
               onSave={(newStats) => {
                  const ns = [...(sets.staffStats||[])];
                  const idx = ns.findIndex(x => x.id === teamForm.id);
                  if (idx >= 0) {
                     ns[idx] = { ...ns[idx], ...newStats };
                  }
                  const newSets = { ...sets, staffStats: ns };
                  setSets(newSets);
                  saveD('settings', newSets);
                  setTeamForm({ ...teamForm, ...newStats });
                  setSelTeam({ ...selTeam, ...newStats });
                  setAssessMode(false);
                  alert('บันทึกผลการประเมินเรียบร้อยแล้ว!\n\nพนักงานได้รับการอัปเดตสเตตัสเรียบร้อย');
               }}
            />
        <div key={u.id} className="animate-fade-in-up flex-1 w-full bg-[#08080c] relative overflow-y-auto custom-scrollbar flex flex-col md:flex-row shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] rounded-xl h-full min-h-[450px]">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#08080c] to-[#08080c] pointer-events-none"></div>
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#bca374] rounded-full blur-[150px] opacity-10 pointer-events-none mix-blend-screen translate-x-1/3 -translate-y-1/4"></div>

           <div className="w-full md:w-[55%] p-5 lg:p-8 z-10 flex flex-col border-r border-white/10 relative h-auto">
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button type="button" onClick={() => setTeamEditMode(true)} title="ตั้งค่าข้อมูลพื้นฐาน" className="bg-white/10 hover:bg-white/20 text-white/50 hover:text-white p-2 rounded-full backdrop-blur-sm transition">
                    <Icon name="settings" size={18} />
                  </button>
                  <button type="button" onClick={() => setAssessMode(true)} title="ประเมินศักยภาพบุคลากร" className="bg-[#bca374]/20 hover:bg-[#bca374]/40 border border-[#bca374]/30 text-[#e6d0a7] hover:text-white p-2 rounded-full backdrop-blur-sm transition shadow-[0_0_15px_rgba(188,163,116,0.3)]">
                    <Icon name="clipboard-check" size={18} />
                  </button>
                </div>

              <div className="animate-in fade-in slide-in-from-left-8 duration-700 mt-auto mb-auto py-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-5 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] group">
                    <div className="absolute inset-0 bg-white/10 blur-xl rounded-full mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                    <ClassEmblem archetypeKey={archetypeKey} size="100%" className="text-white transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="flex flex-col">
                    <h5 className="text-[#bca374] text-[10px] sm:text-xs lg:text-sm font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-md flex flex-wrap items-center gap-2">
                       <span>{role?.name || 'ไม่ระบุสายอาชีพ'}</span>
                       {prefixText && <span className="bg-[#bca374]/20 text-[#e6d0a7] px-2 py-0.5 rounded text-[9px] border border-[#bca374]/30">{prefixText}</span>}
                    </h5>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-lg" style={{textShadow: '0 4px 20px rgba(188,163,116,0.3)'}}>
                       {enTitle}
                    </h1>
                  </div>
                </div>
                <div className="mb-4 lg:mb-5 border-l-4 border-[#bca374] pl-3">
                  <p className="text-[11px] sm:text-xs lg:text-sm text-slate-300 font-light italic mb-1 lg:mb-2">
                     "{styleDesc}"
                  </p>
                  <p className="text-[10px] sm:text-[11px] lg:text-xs text-[#bca374] leading-relaxed font-bold mb-1">
                     อัตลักษณ์ศักยภาพ: <span className="text-[#e6d0a7]">{identityText}</span>
                  </p>
                  <p className="text-[10px] sm:text-[11px] lg:text-xs text-slate-400 leading-relaxed font-bold mb-0.5">
                     สไตล์: <span className="text-[#e6d0a7]">{thTitle}</span> {flavorText && <span className="text-[9px] text-slate-500 font-normal ml-1">({flavorText})</span>}
                  </p>
                  <p className="text-[9px] sm:text-[10px] lg:text-[11px] text-slate-300 leading-relaxed drop-shadow-md">
                     {bottomDescText}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 2xl:grid-cols-3 gap-x-4 lg:gap-x-6 gap-y-2 lg:gap-y-3 mb-4 lg:mb-5">
                   {[
                     { l: 'STR', val: statsObj.str, c: 'from-rose-600 to-rose-400' },
                     { l: 'AGI', val: statsObj.agi, c: 'from-emerald-600 to-emerald-400' },
                     { l: 'DEX', val: statsObj.dex, c: 'from-amber-600 to-amber-400' },
                     { l: 'INT', val: statsObj.int, c: 'from-blue-600 to-blue-400' },
                     { l: 'CON', val: statsObj.con, c: 'from-orange-600 to-orange-400' },
                     { l: 'SEN', val: statsObj.sen, c: 'from-purple-600 to-purple-400' }
                   ].map(s => (
                     <div key={s.l} className="flex flex-col">
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-slate-400 tracking-wider">{s.l}</span>
                           <span className="text-[10px] sm:text-xs lg:text-sm font-bold text-white">{s.val}</span>
                        </div>
                        <div className="w-full h-1 lg:h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                           <div className={`h-full bg-gradient-to-r ${s.c} rounded-full`} style={{width: `${(s.val/10)*100}%`, boxShadow: '0 0 10px currentColor'}}></div>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="flex flex-wrap gap-1.5 lg:gap-2">
                   {outers.map(o => (
                      <div key={o.k} className="bg-white/5 border border-white/10 rounded-md px-1.5 py-1 lg:px-2 lg:py-1.5 flex flex-col backdrop-blur-md">
                         <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-wider">{o.n}</span>
                         <span className="text-white font-bold text-[10px] sm:text-xs">{o.finalVal} <span className="text-slate-500 text-[8px] sm:text-[9px] font-normal">/10</span></span>
                      </div>
                   ))}
                </div>
              </div>
           </div>

           <div className="w-full md:w-[45%] min-h-[300px] h-full flex items-start justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen pointer-events-none"></div>
              
              <div className="relative z-10 w-full h-full flex items-center justify-center p-4 lg:p-8 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 fill-mode-both">
                {u.image ? (
                   <img src={u.image} className="max-w-[85%] max-h-[90%] object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] transform scale-105" style={{maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'}} alt="Character" />
                ) : (
                   <div className="w-64 h-64 bg-slate-800/50 rounded-full flex items-center justify-center border border-white/5 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                     <Icon name="user" size={64} className="text-slate-600" />
                   </div>
                )}
              </div>
              
              <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#08080c] to-transparent pointer-events-none z-20"></div>
              
              <div className="absolute bottom-10 -right-10 text-[150px] font-black text-white/5 whitespace-nowrap pointer-events-none z-0 transform -rotate-12 select-none tracking-tighter mix-blend-overlay">
                 {u.name.split(' ')[0]}
                           </div>
           </div>
        </div>
      </>);
    };

    const renderAnalysis = () => {
      const u = teamForm;
      if (!u.id && !selTeam?.isNew) return null;
      const role = classMap[u.classId];
      
      const analysis = analyzeArchetype(u, sets, archetypesData);
      if (!analysis) return null;
      const { mainStyle, styleDesc } = analysis;

      const strengths = [];
      const gaps = [];
      STAT_KEYS.forEach((k) => {
        const uVal = Number(u[k]) || 5;
        const s = STAT_DEFINITIONS[k];
        if (uVal >= 8) strengths.push({ ...s, uVal });
        else if (uVal <= 4) gaps.push({ ...s, uVal });
      });

      strengths.sort((a, b) => b.uVal - a.uVal);
      gaps.sort((a, b) => a.uVal - b.uVal);

      return (
        <div className="mt-6 pt-4 w-full text-left relative z-10 font-sans">
          <h4 className="font-bold text-[#0f2e4a] text-sm flex items-center mb-3">
            <Icon name="user" size={16} className="mr-2 text-[#bca374]" /> วิเคราะห์ศักยภาพ (Talent Discovery)
          </h4>
          
          <div className="mb-4 text-[12px] p-3 rounded bg-[#f8fafc] text-slate-700 border border-slate-200 shadow-sm relative z-10">
             <strong className="block mb-1 text-[#0f2e4a] font-bold">▶ แนวโน้มการทำงาน (Work Style Tendency):</strong>
             <span className="font-bold text-[#0f2e4a] text-sm block ml-3 mb-1">{mainStyle}</span>
             <span className="block text-slate-600 leading-relaxed ml-3">{styleDesc}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-2 relative z-10">
            <div className="bg-emerald-50/70 p-3 rounded border border-emerald-200 relative overflow-hidden">
              <strong className="text-emerald-800 text-[13px] flex items-center mb-2"><Icon name="trendingUp" size={14} className="mr-1.5 text-emerald-600"/> จุดเด่น (Strengths)</strong>
              {strengths.length > 0 ? (
                <ul className="text-[12px] text-slate-700 space-y-1.5 relative z-10 pl-2 border-l-2 border-emerald-300 ml-1">
                  {strengths.map(s => (
                    <li key={s.key} className="py-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium">{s.name}</span>
                        <span className="font-bold text-emerald-700">
                          {s.uVal} <span className="text-slate-400 font-normal ml-1 text-[10px]">({getStatLevelText(s.uVal)})</span>
                        </span>
                      </div>
                      <div className="text-slate-600 leading-snug">▶ {getRubricText(s, s.uVal)}</div>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-[11px] text-slate-500 relative z-10 ml-2">ไม่มีสเตตัสระดับสูง</div>}
            </div>

            <div className="bg-orange-50/70 p-3 rounded border border-orange-200 relative overflow-hidden mt-1">
              <strong className="text-orange-800 text-[13px] flex items-center mb-2"><Icon name="alertCircle" size={14} className="mr-1.5 text-orange-600"/> สิ่งที่ควรพัฒนา (Gaps)</strong>
              {gaps.length > 0 ? (
                <ul className="space-y-3 relative z-10 pl-2 border-l-2 border-orange-300 ml-1">
                  {gaps.map(s => {
                    const baseTarget = role?.baseStats?.[s.key] ? Number(role.baseStats[s.key]) : null;
                    const isBelowTarget = baseTarget && s.uVal < baseTarget;
                    return (
                    <li key={s.key} className="text-slate-700 text-[12px] pb-2 border-b border-orange-100 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1">
                        <strong className="text-[#0f2e4a]">{s.name}</strong>
                        <span className="font-bold text-orange-600">
                           {s.uVal} <span className="text-slate-400 font-normal ml-1 text-[10px]">({getStatLevelText(s.uVal)})</span>
                        </span>
                      </div>
                      <div className="text-orange-700 leading-snug mb-1">
                        ▶ {getRubricText(s, s.uVal)}
                      </div>
                      {isBelowTarget && (
                        <div className="text-[10px] text-rose-600 font-medium bg-rose-50 p-1 rounded inline-block mt-0.5">
                           * เป้าหมายของตำแหน่ง {role.name} คือระดับ {baseTarget}
                        </div>
                      )}
                    </li>
                  )})}
                </ul>
              ) : <div className="text-[11px] text-slate-500 relative z-10 ml-2">ไม่พบความเสี่ยงที่น่ากังวล</div>}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 relative z-10">
             <h4 className="font-bold text-[#0f2e4a] text-[13px] flex items-center mb-1">
                <Icon name="layers" size={14} className="mr-2 text-indigo-500" />
                6 แกนสมรรถนะผลงาน (The Outer Layer)
             </h4>
             <p className="text-[10px] text-slate-500 mb-3 leading-snug">
                * ระบบวิเคราะห์ค่าจากศักยภาพตั้งต้น (HOW) หัวหน้างานสามารถสไลด์ปรับเพิ่ม/ลดคะแนนเพื่อสะท้อนผลลัพธ์หน้างานจริง (WHAT)
             </p>
             <div className="grid grid-cols-2 gap-3">
                {[
                  { k: 'cx', n: 'Customer Exp.', d: 'ความพึงพอใจลูกค้า' },
                  { k: 'tech', n: 'Tech. Expertise', d: 'ทักษะเชิงลึก' },
                  { k: 'sla', n: 'Ops & SLA', d: 'เวลาและความเป๊ะ' },
                  { k: 'crisis', n: 'Crisis Resolv.', d: 'แก้ปัญหาวิกฤต' },
                  { k: 'resource', n: 'Resource Ctrl.', d: 'บริหารทรัพยากร' },
                  { k: 'innovation', n: 'Innovation', d: 'สร้างระบบใหม่' }
                ].map(out => {
                   const autoVal = Math.round(
                      out.k === 'cx' ? (statsObj.con + statsObj.sen)/2 :
                      out.k === 'tech' ? (statsObj.int + statsObj.dex)/2 :
                      out.k === 'sla' ? (statsObj.agi + statsObj.dex)/2 :
                      out.k === 'crisis' ? (statsObj.str + statsObj.con)/2 :
                      out.k === 'resource' ? (statsObj.str + statsObj.sen)/2 :
                      (statsObj.int + statsObj.sen)/2
                   );
                   const actualVal = (u[out.k] !== null && u[out.k] !== undefined) ? u[out.k] : autoVal;
                   const isOverride = u[out.k] !== null && u[out.k] !== undefined && u[out.k] !== autoVal;
                   const gap = actualVal - autoVal;
                   
                   return (
                     <div key={out.k} className={`bg-white p-2.5 rounded-lg border ${isOverride ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200'} shadow-sm flex flex-col justify-between`}>
                        <div className="flex justify-between items-start mb-1">
                           <div>
                              <strong className="text-[11px] text-indigo-900 block">{out.n}</strong>
                              <span className="text-[9px] text-slate-400">{out.d}</span>
                           </div>
                           <span className={`font-bold text-[12px] ${isOverride ? 'text-indigo-600' : 'text-slate-500'}`}>
                             {actualVal}<span className="text-[9px] text-slate-400">/10</span>
                           </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                           <input type="range" min="1" max="10" step="1" 
                              className="w-[70%] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                              value={actualVal} 
                              onChange={e => setTeamForm({...teamForm, [out.k]: Number(e.target.value)})} 
                           />
                           {isOverride && (
                             <button type="button" className="text-[9px] text-slate-400 hover:text-indigo-500 underline ml-1" onClick={() => setTeamForm({...teamForm, [out.k]: null})}>คืนค่า</button>
                           )}
                        </div>
                        {gap <= -2 && (
                           <div className="mt-2 text-[10px] text-rose-700 bg-rose-50 p-1.5 rounded font-medium leading-tight border border-rose-100">
                              ⚠️ ศักยภาพ {autoVal} แต่ผลงาน {actualVal} (Low Result) → ขาดประสบการณ์หน้างาน ควรทำ OJT ด่วน
                           </div>
                        )}
                        {gap >= 2 && (
                           <div className="mt-2 text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded font-medium leading-tight border border-emerald-100">
                              ⭐ ผลงาน {actualVal} แซงศักยภาพ {autoVal} → ค้นพบ Best Practice ควรแชร์ต่อในทีม
                           </div>
                        )}
                     </div>
                   );
                })}
             </div>
          </div>
        </div>
      );
    };

    return (
      <div className="flex flex-col md:flex-row gap-6 animate-in h-auto md:h-full pb-10">
        <div className="w-full md:w-72 bg-white border rounded-xl shadow-sm flex flex-col min-h-[300px] max-h-[350px] md:max-h-none md:h-full shrink-0">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
            <h3 className="font-bold text-[#0f2e4a]">รายชื่อทีมงาน</h3>
            <div className="flex gap-2">
               <label className="bg-indigo-600 text-white text-[11px] px-2 py-1 rounded hover:bg-indigo-700 cursor-pointer flex items-center transition shadow-sm">
                 <Icon name="upload" size={12} className="mr-1" /> Excel
                 <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
               </label>
               <button type="button" onClick={()=>{setSelTeam({isNew: true}); setTeamForm({id:'', name:'', classId:'', image:'', str:5, agi:5, dex:5, int:5, con:5, sen:5});}} className="bg-[#bca374] text-white text-[11px] px-2 py-1 rounded hover:bg-[#a38a5b] transition shadow-sm">+ เพิ่ม</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
            {sList.map(s => (
              <div key={s.id} onClick={()=>{setSelTeam(s); setTeamForm({...s});}} className={`flex items-center p-2 rounded-lg cursor-pointer transition ${selTeam?.id===s.id ? 'bg-[#0f2e4a] text-white' : 'hover:bg-blue-50 text-gray-700'}`}>
                {s.image ? <img src={s.image} className="w-8 h-8 rounded-full object-cover mr-3 border border-white/50" /> : <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-xs font-bold ${selTeam?.id===s.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{s.name.substring(0,2)}</div>}
                <div className="truncate flex-1">
                  <div className="font-bold text-sm truncate">{s.name}</div>
                  <div className={`text-[10px] ${selTeam?.id===s.id ? 'text-blue-200' : 'text-gray-400'}`}>{classMap[s.classId]?.name || 'ไม่ระบุคลาส'}</div>
                  <div className={`text-[9px] ${selTeam?.id===s.id ? 'text-[#e6d0a7]' : 'text-[#bca374]'} font-bold truncate mt-0.5`}>{s.potentialIdentity || getArchetypeIdentity(s)}</div>
                </div>
              </div>
            ))}
            {sList.length === 0 && <div className="text-center text-xs text-gray-400 p-4">ยังไม่มีรายชื่อทีมงาน<br/>กด "+ เพิ่ม" เพื่อสร้างใหม่</div>}
          </div>
        </div>

        <div className="flex-1 bg-white border rounded-xl shadow-sm flex flex-col h-auto md:h-full overflow-hidden">
          {(!selTeam && !teamForm.name && !teamForm.id) ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
               <Icon name="users" size={64} className="mb-4 opacity-50" />
               <p className="font-bold">เลือกทีมงานจากเมนูด้านซ้าย</p>
               <p className="text-xs mt-1">หรือกด "+ เพิ่ม" เพื่อสร้างโปรไฟล์ใหม่</p>
             </div>
          ) : ( (!teamEditMode && teamForm.id && !selTeam?.isNew) ? renderCinematicView() : (
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
               <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
                 <div className="w-full lg:w-1/2 flex flex-col items-center bg-white/90 p-4 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-transparent via-[#bca374] to-transparent opacity-30"></div>
                    <div className="relative group mb-6 mt-2">
                      <div className="w-32 h-32 rounded-full border-[3px] border-[#bca374] shadow-[0_0_20px_rgba(188,163,116,0.3)] overflow-hidden bg-[#0f2e4a] flex items-center justify-center relative z-10">
                        {teamForm.image ? <img src={teamForm.image} className="w-full h-full object-cover" /> : <Icon name="camera" size={32} className="text-[#bca374]/50"/>}
                      </div>
                      <div className="absolute -inset-2 border-2 border-dashed border-[#bca374]/30 rounded-full animate-[spin_20s_linear_infinite] pointer-events-none"></div>
                      <label className="absolute bottom-0 right-0 bg-gradient-to-tr from-[#bca374] to-[#e6d0a7] text-[#0f2e4a] p-2.5 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform z-20 border border-white/50">
                        <Icon name="upload" size={16} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                    
                    <div className="w-full space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">ชื่อ - นามสกุล</label>
                        <input type="text" className="w-full border rounded-lg px-4 py-2 text-sm font-bold text-[#0f2e4a] focus:ring-2 focus:ring-[#bca374] outline-none" placeholder="ชื่อพนักงาน..." value={teamForm.name} onChange={e=>setTeamForm({...teamForm, name:e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">คลาส (สายอาชีพ)</label>
                        <select className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#bca374] outline-none" value={teamForm.classId} onChange={e=>setTeamForm({...teamForm, classId:e.target.value})}>
                          <option value="">-- ไม่ระบุ --</option>
                          {(sets.staffClasses||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-3 gap-y-3 pt-4 border-t border-slate-100 mt-2">
                        {[{k:'str',l:'STR',f:'Strength',c:'text-rose-600',bg:'bg-rose-50',b:'border-rose-200'},{k:'agi',l:'AGI',f:'Agility',c:'text-emerald-600',bg:'bg-emerald-50',b:'border-emerald-200'},{k:'dex',l:'DEX',f:'Dexterity',c:'text-amber-600',bg:'bg-amber-50',b:'border-amber-200'},{k:'int',l:'INT',f:'Intelligence',c:'text-blue-600',bg:'bg-blue-50',b:'border-blue-200'},{k:'con',l:'CON',f:'Constitution',c:'text-orange-600',bg:'bg-orange-50',b:'border-orange-200'},{k:'sen',l:'SEN',f:'Sense',c:'text-purple-600',bg:'bg-purple-50',b:'border-purple-200'}].map(s=>(
                          <div key={s.k} className={`flex items-center justify-between ${s.bg} p-2 rounded-lg border ${s.b} shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-transform hover:scale-[1.02]`}>
                            <div className="flex flex-col">
                              <label className={`text-[12px] font-black ${s.c} leading-none`}>{s.l}</label>
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{s.f}</label>
                            </div>
                            <input type="number" min="1" max="10" className={`w-10 text-center text-[14px] font-black border-b-2 border-transparent focus:${s.b} bg-transparent outline-none ${s.c}`} value={teamForm[s.k]} onChange={e=>setTeamForm({...teamForm, [s.k]: Number(e.target.value)||1})} />
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button type="button" onClick={saveTeam} className="flex-1 bg-[#0f2e4a] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-[#1a3f63] flex justify-center items-center"><Icon name="save" size={16} className="mr-2"/> บันทึกข้อมูล</button>
                        {teamForm.id && !selTeam?.isNew && <button type="button" onClick={()=>{setTeamEditMode(false); setTeamForm({...selTeam});}} className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>}
                        {teamForm.id && <button type="button" onClick={()=>{if(confirm('ลบพนักงานคนนี้?')){ let ns=(sets.staffStats||[]).filter(x=>x.id!==teamForm.id); const newSets = {...sets, staffStats: ns}; setSets(newSets); saveD('settings', newSets); setSelTeam(null); setTeamForm({id:'', name:'', classId:'', image:'', str:5, agi:5, dex:5, int:5, con:5, sen:5}); }}} className="bg-red-50 text-red-500 p-2.5 rounded-lg border border-red-200 hover:bg-red-100"><Icon name="trash" size={16}/></button>}
                      </div>
                    </div>
                 </div>

                 <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl border-2 border-slate-100 relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#0f2e4a] to-transparent opacity-20"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-100/50 via-transparent to-transparent pointer-events-none"></div>
                    <div className="w-full mt-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
                       <h4 className="font-bold text-[#0f2e4a] mb-6 text-center tracking-wider flex items-center justify-center text-sm"><Icon name="swords" size={18} className="mr-2 text-[#bca374]"/> PERFORMANCE MAP</h4>
                       <div className="w-full max-w-[280px] aspect-square">
                         <RadarChart 
                            userStats={[teamForm.str, teamForm.agi, teamForm.dex, teamForm.int, teamForm.con, teamForm.sen]}
                         />
                       </div>
                       <div className="flex flex-wrap justify-center gap-4 mt-6 text-[11px] font-bold text-slate-500">
                          <div className="flex items-center"><div className="w-3 h-3 bg-[#0f2e4a] mr-2 rounded-sm opacity-60"></div> ระดับสเตตัสพนักงาน</div>
                       </div>
                       <div className="w-full mt-6 border-t border-slate-100"></div>
                       {renderAnalysis()}
                    </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
