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

const ClassEmblem = ({ archetypeKey, className = "", size = 100 }) => {
  // หากเป็น 3 คลาสพิเศษ (Extra) ที่ไม่มีใน BDO ให้วาด SVG เลียนแบบสไตล์ BDO
  if (['con_dex_str', 'int_sen_str', 'dex_int_sen'].includes(archetypeKey)) {
    let customPath = null;
    if (archetypeKey === 'con_dex_str') {
      customPath = (
        <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 -35 L10 35 M0 -15 L20 -15" />
          <path d="M-25 -5 L-25 15 C-25 30 -5 40 -5 40 C-5 40 -5 -15 -25 -5 Z" opacity="0.6" />
          <path d="M10 -35 L5 -25 L15 -25 Z" fill="currentColor" />
        </g>
      );
    } else if (archetypeKey === 'int_sen_str') {
      customPath = (
        <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-20 35 L20 -25" />
          <path d="M20 -25 C10 -40 -15 -35 -25 -20 C-15 -30 5 -25 10 -10 Z" fill="currentColor" />
          <circle cx="-10" cy="15" r="4" fill="currentColor" opacity="0.6" />
        </g>
      );
    } else if (archetypeKey === 'dex_int_sen') {
      customPath = (
        <g strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="0" cy="0" rx="25" ry="10" transform="rotate(30)" />
          <ellipse cx="0" cy="0" rx="25" ry="10" transform="rotate(-30)" />
          <circle cx="0" cy="0" r="15" opacity="0.4" />
          <circle cx="0" cy="0" r="3" fill="currentColor" />
        </g>
      );
    }
    
    return (
      <svg width={size} height={size} viewBox="-50 -50 100 100" className={className} stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        {customPath}
      </svg>
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
