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

// 3 คลาสพิเศษ (Custom High-Quality SVG)
const ClassEmblem = ({ archetypeKey, className = "", size = 100 }) => {
  if (['con_dex_str', 'int_sen_str', 'dex_int_sen'].includes(archetypeKey)) {
    let customPath = null;
    
    // Gunlancer (Juggernaut Craftsman) - Shield & Gunlance
    if (archetypeKey === 'con_dex_str') {
      customPath = (
        <g transform="scale(0.8) translate(12, 12)" fill="currentColor">
          <path d="M50 5 C70 5 85 15 85 30 C85 60 60 85 50 95 C40 85 15 60 15 30 C15 15 30 5 50 5 Z M50 15 C35 15 25 22 25 32 C25 55 42 75 50 82 C58 75 75 55 75 32 C75 22 65 15 50 15 Z" />
          <path d="M40 30 L60 30 L55 70 L45 70 Z M47 20 A3 3 0 1 1 53 20 A3 3 0 1 1 47 20" />
          <path d="M20 15 L35 0 L40 5 L25 20 Z M80 15 L65 0 L60 5 L75 20 Z" />
        </g>
      );
    } 
    // Reaper / Necromancer (Mastermind Overseer) - Scythe & Eye
    else if (archetypeKey === 'int_sen_str') {
      customPath = (
        <g transform="scale(0.8) translate(12, 12)" fill="currentColor">
          <path d="M75 15 C60 0 35 0 20 15 C10 25 15 45 25 50 C30 52 35 50 40 45 C35 35 45 25 55 30 C65 35 60 55 50 65 C40 75 20 70 10 60 C5 75 20 90 40 90 C65 90 90 65 90 40 C90 25 85 20 75 15 Z M70 40 C70 55 55 65 45 55 C40 50 45 35 55 35 C65 35 70 40 70 40 Z" />
          <path d="M25 95 L15 85 L85 15 L95 25 Z" />
          <path d="M50 45 A 5 5 0 1 1 50 46" fill="transparent" stroke="currentColor" strokeWidth="3" />
        </g>
      );
    } 
    // Astrologian (Visionary Consultant) - Globe & Stars
    else if (archetypeKey === 'dex_int_sen') {
      customPath = (
        <g transform="scale(0.8) translate(12, 12)" fill="currentColor">
          <path d="M50 10 A 40 40 0 1 0 90 50 A 40 40 0 0 0 50 10 Z M50 82 A 32 32 0 1 1 82 50 A 32 32 0 0 1 50 82 Z" />
          <path d="M25 50 C 25 25, 75 25, 75 50 C 75 75, 25 75, 25 50" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M50 25 C 25 25, 25 75, 50 75 C 75 75, 75 25, 50 25" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M45 45 L50 35 L55 45 L65 50 L55 55 L50 65 L45 55 L35 50 Z" />
          <circle cx="50" cy="10" r="4" />
          <circle cx="50" cy="90" r="4" />
          <circle cx="10" cy="50" r="4" />
          <circle cx="90" cy="50" r="4" />
        </g>
      );
    }
    
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
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
