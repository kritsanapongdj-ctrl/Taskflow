import React from 'react';

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
  'con_int_sen': 'class_17'    // Shai (ชายย์)
};

// แผนที่จับคู่คลาสพิเศษ (Tree of Savior)
const tosClassMapping = {
  'con_dex_str': 'Lancer',       // แทน Gunlancer (หอก/โล่)
  'int_sen_str': 'Necromancer',  // แทน Necromancer (วิญญาณ)
  'dex_int_sen': 'Oracle'        // แทน Astrologian (เทพยากรณ์)
};

const ClassEmblem = ({ archetypeKey, className = "", size = 100 }) => {
  // 1. หากเป็น 3 คลาสพิเศษ ให้ใช้รูปสัญลักษณ์จาก Tree of Savior (ดัดแปลงสีให้เหมือน BDO ด้วย mask-image)
  const tosClassName = tosClassMapping[archetypeKey];
  if (tosClassName) {
    const imageUrl = `https://treeofsavior.com/img/class2/class_icon/${tosClassName}.png`;
    return (
      <span
        className={`inline-block ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: 'currentColor',
          maskImage: `url('${imageUrl}')`,
          WebkitMaskImage: `url('${imageUrl}')`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          transform: 'scale(1.2)'
        }}
      />
    );
  }

  // หากอยู่ในลิสต์ BDO Official ให้ใช้รูปจากเซิร์ฟเวอร์โดยตรง
  const classId = bdoClassMapping[archetypeKey];
  
  if (classId) {
    const imageUrl = `https://static.pearlcdn.com/asset/brand/bdo/contents_bdo/img/classes/${classId}/class_icon.svg`;
    
    return (
      <span
        className={`inline-block ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: 'currentColor',
          maskImage: `url('${imageUrl}')`,
          WebkitMaskImage: `url('${imageUrl}')`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          transform: 'scale(1.2)'
        }}
      />
    );
  }

  // Fallback
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
