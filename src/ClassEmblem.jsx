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
// 3 คลาสพิเศษ (Custom High-Quality SVG)
const ClassEmblem = ({ archetypeKey, className = "", size = 100 }) => {
  if (['con_dex_str', 'int_sen_str', 'dex_int_sen'].includes(archetypeKey)) {
    let customPath = null;
    
    // Gunlancer / Juggernaut Craftsman (Spartan Helmet & Spear)
    if (archetypeKey === 'con_dex_str') {
      customPath = (
        <path fill="currentColor" d="m81.375 21.313-7.22 124.25 36.376 22.25.814 46.375 10.906-2.907 79.72 295.25 18.03-4.874L140.312 206.5l10.813-2.875-22.03-39.5 21.093-38.813-68.813-104zM271.53 23l-30.092 3.125L262 88.28c-16.84 4.572-30.57 20.85-36.375 42.376l43.906 11.313 48.626-10.532c-5.86-21.992-19.883-38.68-37.062-43.22l20.562-62.093L271.53 23zm-48.75 126.22a94.285 94.285 0 0 0-.124 4.718c.07 32.086 16.668 58.92 38.78 65.562l.002-60.313-38.657-9.968zm98.22.718-40.875 8.875v61.375c23.323-5.21 41.072-32.752 41-66.032a94.973 94.973 0 0 0-.125-4.22zm31.875 71.125c-74.427 0-134.97 60.54-134.97 134.968 0 74.43 60.543 134.94 134.97 134.94 74.427 0 134.938-60.51 134.938-134.94 0-74.426-60.51-134.967-134.938-134.967zm0 18.687c64.327 0 116.25 51.954 116.25 116.28 0 64.328-51.923 116.25-116.25 116.25s-116.28-51.922-116.28-116.25c0-64.326 51.953-116.28 116.28-116.28zm-1.375 20.53c-52.91 0-95.813 42.873-95.813 95.783 0 52.91 42.904 95.812 95.813 95.812 52.91 0 95.78-42.903 95.78-95.813 0-52.91-42.87-95.78-95.78-95.78z" />
      );
    } 
    // Reaper / Necromancer / Mastermind Overseer (Scythe)
    else if (archetypeKey === 'int_sen_str') {
      customPath = (
        <path fill="currentColor" d="M296.625 25.406c-63.794.388-135.81 14.683-206.03 32.844-3.472 34.08 2.226 68.906 14.03 104.25C181.175 75.936 393.65 44.825 486.72 128 456.02 50.466 384.046 24.874 296.624 25.406zM65.655 61.438 27.906 71c5.643 78.022 28.546 132.393 60.44 174.47-16.54 10.348-40.693 19.673-68.782 26.843 5.664 6.597 14.25 16.18 30.53 18.53 24.846-4.33 39.912-14.982 53.75-26.593 76.24 85.145 190.22 118.955 253.126 224.22l49.436-.126C290.996 275.316 81.01 364.804 65.656 61.438z" />
      );
    } 
    // Astrologian / Visionary Consultant (Nested Eclipses)
    else if (archetypeKey === 'dex_int_sen') {
      customPath = (
        <path fill="currentColor" d="M255.225 46.588a47.63 47.63 0 0 0-47.772 47.77 47.633 47.633 0 0 0 47.772 47.775 47.632 47.632 0 0 0 47.77-47.774 47.628 47.628 0 0 0-47.77-47.772zm-69.67 5.285c-32.036 21.7-53.203 57.98-53.203 99.02 0 66.417 54.854 120.078 122.668 120.078 67.813 0 123.035-53.66 123.035-120.077 0-41.04-21.17-77.32-53.205-99.02 17.492 17.676 28.082 41.888 28.082 68.72 0 54.042-43.87 97.915-97.91 97.915-54.042 0-97.913-43.873-97.913-97.916 0-26.83 10.958-51.043 28.45-68.72h-.005zm-63.36 4.666C61.015 97.982 20.59 167.265 20.59 245.64c0 126.838 104.755 229.32 234.26 229.32 129.504 0 234.964-102.482 234.964-229.32 0-78.374-40.426-147.657-101.605-189.1 33.403 33.756 53.624 79.993 53.624 131.237 0 103.206-83.78 186.987-186.984 186.987-103.204 0-186.987-83.78-186.987-186.987 0-51.244 20.928-97.48 54.332-131.238z" />
      );
    }
    
    return (
      <svg width={size} height={size} viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
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
