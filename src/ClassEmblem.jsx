import React from 'react';
import classSvgData from './data/classSvgData.json';

// แผนที่จับคู่ archetypeKey กับรหัสคลาสของ BDO ตามเว็บ Official
const bdoClassMapping = {
  'agi_str': 'class_19',       // Striker (สไตรเกอร์)
  'dex_str': 'class_20',       // Musa (มูซา)
  'int_str': 'class_27',       // Dark Knight (ดาร์คไนท์)
  'con_str': 'class_12',       // Berserker (เบอร์เซิร์กเกอร์)
  'sen_str': 'class_0',        // Warrior (วอร์ริเออร์)
  'agi_dex': 'class_26',       // Ninja (นินจา)
  'agi_int': 'class_1',        // Hashashin (ฮัสซาซิน)
  'agi_con': 'class_10',       // Corsair (คอร์แซร์)
  'agi_sen': 'class_11',       // Lahn (รัน)
  'dex_int': 'class_6',        // Scholar (สกอลาร์)
  'con_dex': 'class_24',       // Valkyrie (วาลคิรี)
  'dex_sen': 'class_29',       // Archer (อาร์เชอร์)
  'con_int': 'class_9',        // Nova (โนวา)
  'int_sen': 'class_15',       // Maegu (เมกุ)
  'con_sen': 'class_5',        // Guardian (การ์เดียน)
  'agi_dex_str': 'class_4',    // Ranger (เรนเจอร์)
  'agi_int_str': 'class_30',   // Woosa (วูซา)
  'agi_con_str': 'class_23',   // Mystic (มิสติก)
  'agi_sen_str': 'class_3',    // Wukong (หงอคง)
  'dex_int_str': 'class_35',   // Agent (เอเจนต์)
  'dex_sen_str': 'class_34',   // Deadeye (เดดอายส์)
  'con_int_str': 'class_28',   // Wizard (วิซาร์ด)
  'con_sen_str': 'class_31',   // Witch (วิทช์)
  'agi_dex_int': 'class_21',   // Maehwa (เมฮวา)
  'agi_con_dex': 'class_7',    // Drakania (ดาร์คาเนีย)
  'agi_dex_sen': 'class_25',   // Kunoichi (คุโนะอิชิ)
  'agi_con_int': 'class_33',   // Dosa (โดซา)
  'agi_int_sen': 'class_8',    // Sorceress (ซอเซอร์เรส)
  'agi_con_sen': 'class_16',   // Tamer (เทเมอร์)
  'con_dex_int': 'class_2',    // Sage (เซจจ์)
  'con_dex_sen': 'class_32',   // Seraph (เซราฟ)
  'con_int_sen': 'class_17',   // Shai (ชายย์)
  'all_rounder': 'class_0',    // Warrior (นักรบสมดุลทุกด้าน)
  'generalist': 'class_0',     // Generalist
  'polarized_prodigy': 'class_0',
  'uniform_1': 'class_0',
  'uniform_2': 'class_0',
  'uniform_3': 'class_0',
  'uniform_4': 'class_0',
  'uniform_5': 'class_0',
  'uniform_6': 'class_0',
  'uniform_7': 'class_0',
  'uniform_8': 'class_0',
  'uniform_9': 'class_0',
  'uniform_10': 'class_0',
  'novice': 'class_0',         // Warrior
  'trainee': 'class_0',
  'uncalibrated': 'class_0'
};

// แผนที่จับคู่คลาสพิเศษผสม 2 คลาสเข้าด้วยกัน
const compositeClassMapping = {
  'con_dex_str': { // Juggernaut Craftsman (Nova + Scholar)
     base: 'class_9', 
     overlay: 'class_6',
     scaleBase: 1.15,
     scaleOverlay: 0.75
  },
  'dex_int_sen': { // Visionary Consultant (Woosa + Sorceress)
     base: 'class_30', 
     overlay: 'class_8',
     scaleBase: 1.15,
     scaleOverlay: 0.75
  },
  'int_sen_str': { // Mastermind Overseer (Dark Knight + Shai)
     base: 'class_17', // Shai (บูมเมอแรงเป็นรัศมี)
     overlay: 'class_27', // Dark Knight (ดาบตรงกลาง)
     scaleBase: 1.25,
     scaleOverlay: 0.85
  }
};

const ClassEmblem = ({ archetypeKey, className = "", size = 100 }) => {
  // 1. ตรวจสอบว่าเป็นคลาสพิเศษที่ต้องผสมรูปหรือไม่
  const composite = compositeClassMapping[archetypeKey];
  if (composite) {
    const baseSvg = classSvgData[composite.base] || classSvgData['class_0'];
    const overlaySvg = classSvgData[composite.overlay] || classSvgData['class_0'];
    
    return (
      <svg
        viewBox="0 0 38 38"
        width={size}
        height={size}
        className={`inline-block ${className}`}
        style={{ width: size, height: size }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g 
          style={{ transform: `scale(${composite.scaleBase})`, transformOrigin: 'center' }} 
          dangerouslySetInnerHTML={{ __html: baseSvg }} 
        />
        <g 
          style={{ transform: `scale(${composite.scaleOverlay})`, transformOrigin: 'center' }} 
          dangerouslySetInnerHTML={{ __html: overlaySvg }} 
        />
      </svg>
    );
  }

  // 2. ดึง SVG ของคลาสจากฐานข้อมูลเวกเตอร์ในเครื่อง (Fallback เป็น class_0 Warrior)
  const classId = bdoClassMapping[archetypeKey] || 'class_0';
  const svgContent = classSvgData[classId] || classSvgData['class_0'];

  if (svgContent) {
    return (
      <svg
        viewBox="0 0 38 38"
        width={size}
        height={size}
        className={`inline-block ${className}`}
        style={{ width: size, height: size }}
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  // 3. Fallback (กรณีที่ไม่มีข้อมูล)
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
      <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r="35" strokeDasharray="4 6" opacity="0.5" />
        <path d="M-20 0 L20 0 M0 -20 L0 20" opacity="0.5" />
        <circle cx="0" cy="0" r="5" fill="currentColor" />
      </g>
    </svg>
  );
};

export default ClassEmblem;
