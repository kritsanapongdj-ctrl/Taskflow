// Display vocabulary for the two assessment modes.
// RPG   = game language (class, skill, quest, party, level).
// Corporate = HR competency language (role fit, mentoring, IDP, tiers).
// The underlying facts (scores, gaps, penalties) are identical; only wording differs.

const isCorp = (mode) => mode === 'corporate';

const HEADINGS = {
  rpg: {
    outerHeading: 'ฝีมือสนามจริง 6 สกิล (Field Skills)',
    howLabel: 'พลังพื้นฐาน (Base Stats)',
    whatLabel: 'ฝีมือสนามจริง (Field Skill)',
    gapLabel: 'ส่วนต่างเลเวล',
    bestFit: '⚔️ เควสต์ที่เหมาะกับคลาสนี้:',
    pairing: '🤝 เพื่อนร่วมปาร์ตี้ที่ควรจับคู่:',
    coaching: '📢 คำแนะนำจากกิลด์มาสเตอร์:',
    riskAdvice: '🛡️ ทางรอด:',
    barsHeading: (level) => `สกิลที่ปลดล็อกแล้ว (Skill Lv.${level})`,
    barsNext: (level) => `สกิลถัดไปที่ต้องฝึก (Lv.${level}):`,
    nineBoxHeading: 'SKILL TREE MATRIX',
    nineBoxPending: 'รอปลุกสกิลสนามจริง',
    nineBoxDone: 'ปลดล็อกแล้ว',
    unassessedBadge: 'ยังไม่ได้ปลุกสกิล'
  },
  corporate: {
    outerHeading: '6 สมรรถนะการปฏิบัติงานจริง (Job Performance)',
    howLabel: 'ศักยภาพตั้งต้น (Potential)',
    whatLabel: 'ผลสัมฤทธิ์จริง (Performance)',
    gapLabel: 'ส่วนต่าง (Gap)',
    bestFit: '🎯 งานที่มอบหมายได้เหมาะสม (Role Fit):',
    pairing: '👥 การจับคู่พี่เลี้ยง (Mentoring Pair):',
    coaching: '📢 แนวทางการโค้ช (Coaching):',
    riskAdvice: 'แนวทางบริหารความเสี่ยง:',
    barsHeading: (level) => `พฤติกรรมที่สังเกตได้ (BARS Level ${level})`,
    barsNext: (level) => `เป้าหมายพัฒนาถัดไป (Level ${level}):`,
    nineBoxHeading: '9-BOX TALENT GRID',
    nineBoxPending: 'รอประเมินผลสัมฤทธิ์',
    nineBoxDone: 'ประเมินแล้ว',
    unassessedBadge: 'ยังไม่ประเมินผลสัมฤทธิ์'
  }
};

export const getModeVocab = (mode) => (isCorp(mode) ? HEADINGS.corporate : HEADINGS.rpg);

// ---- tier badge -------------------------------------------------------------
const RPG_TIER = {
  1: 'Lv.1 Novice (ผู้เริ่มต้นผจญภัย)',
  2: 'Lv.2 Adept (นักฝึกหัดขั้นกลาง)',
  3: 'Lv.3 Veteran (ผู้ช่ำชองสนามจริง)',
  4: 'Lv.4 Grandmaster (ปรมาจารย์ต้นแบบ)'
};
export const getTierBadge = (level, mode, fallback = '') => (isCorp(mode) ? fallback : (RPG_TIER[level] || fallback));

// ---- outer-layer axes (short card labels) -----------------------------------
// RPG keeps the original stat vocabulary: each WHAT axis is shown by the stats it is computed from
// (same formulas as OUTER_DEFINITIONS.formulaDesc). Corporate uses competency names.
const OUTER_FORMULA = {
  cx: 'CON+SEN', tech: 'INT+DEX', sla: 'AGI+DEX', crisis: 'STR+CON', resource: 'STR+SEN', innovation: 'INT+SEN'
};
const OUTER_SHORT = {
  rpg: OUTER_FORMULA,
  corporate: { cx: 'Customer', tech: 'Technical', sla: 'Timeliness', crisis: 'Incident', resource: 'Resource', innovation: 'Innovation' }
};
export const getOuterShort = (key, mode, fallback = '') => (OUTER_SHORT[isCorp(mode) ? 'corporate' : 'rpg'][key] || fallback);

// ---- outer-layer axes (full names) -------------------------------------------
const OUTER_NAMES = {
  corporate: {
    cx: ['Customer Service Excellence', 'ความเป็นเลิศด้านบริการลูกบ้าน'],
    tech: ['Technical Competence', 'สมรรถนะเชิงช่างและมาตรฐานสาธารณูปโภค'],
    sla: ['Delivery & Timeliness', 'การส่งมอบตรงเวลาและการปิดใบงาน'],
    crisis: ['Incident Management', 'การบริหารเหตุฉุกเฉิน'],
    resource: ['Resource & Vendor Management', 'การบริหารงบประมาณ ผู้รับเหมา และอะไหล่'],
    innovation: ['Proactive Maintenance & Digital', 'งานเชิงรุก PM และระบบดิจิทัล']
  }
};
export const getOuterNames = (key, mode, def = {}) => {
  if (!isCorp(mode)) {
    // original system name + the stats it is built from, e.g. "Customer Exp. [CON+SEN]"
    return { name: `${def.name || key} [${OUTER_FORMULA[key]}]`, thai: def.thai };
  }
  const pair = OUTER_NAMES.corporate[key];
  return pair ? { name: pair[0], thai: pair[1] } : { name: def.name, thai: def.thai };
};

// ---- alignment (HOW vs WHAT gap) ---------------------------------------------
const ALIGNMENT = {
  rpg: {
    harmonized: { title: '⚖️ เลเวลสมดุลกับฝีมือ (In Sync)' },
    over_achiever: { title: '🚀 ฝีมือเกินเลเวล (Over-Leveled)' },
    under_leveraged: { title: '💤 พลังยังไม่ถูกปลุก (Untapped Power)' }
  },
  corporate: {
    harmonized: { title: 'ผลงานสอดคล้องศักยภาพ (Aligned)' },
    over_achiever: { title: 'ผลงานเกินศักยภาพที่ประเมิน (Over-Performing)' },
    under_leveraged: { title: 'ศักยภาพยังไม่ถูกใช้เต็มที่ (Under-Leveraged)' }
  }
};
export const getAlignmentDisplay = (key, mode, base = {}) => {
  const set = ALIGNMENT[isCorp(mode) ? 'corporate' : 'rpg'][key] || {};
  return { title: set.title || base.title };
};

// ---- performance DNA (top-2 outer axes) ---------------------------------------
const RPG_DNA = {
  'Frontline Shield': '🛡️ Shield Bearer (ผู้ถือโล่หน้าด่าน)',
  'Creative Responder': '🎲 Trickster Medic (นักแก้เกมเฉพาะหน้า)',
  'Operations Guardian': '⚔️ Field Marshal (จอมพลคุมสนาม)',
  'Rapid Strike': '⚡ Lightning Striker (หน่วยจู่โจมสายฟ้า)',
  'System Rescuer': '🔧 Dungeon Rescuer (ผู้กู้ภัยสาธารณูปโภค)',
  'Service Innovator': '🎭 Bard (นักสร้างสีสันประสบการณ์ลูกบ้าน)',
  'Diplomatic Steward': '🕊️ Diplomat (ทูตประสานประโยชน์)',
  'Trusted Ambassador': '🎖️ Herald (ผู้ประกาศข่าวผู้ตรงเวลา)',
  'Consultative Expert': '📜 Sage (ปราชญ์ที่ปรึกษาเชิงช่าง)',
  'Asset Optimizer': '🧰 Quartermaster (ผู้คุมคลังเสบียง)',
  'Workflow Driver': '🏇 Pathrunner (นักบุกเบิกโฟลว์ความเร็วสูง)',
  'Tech Pioneer': '🔮 Artificer (นักประดิษฐ์ผู้บุกเบิกเทค)',
  'Disciplined Controller': '🧭 Warden (ผู้คุมกฎแห่งวินัย)',
  'Master Inspector': '🔍 Inspector Paladin (อัศวินผู้ตรวจรับงาน)',
  'Precision Fixer': '🎯 Marksman Fixer (นักซ่อมแม่นปืน)',
  'Specialist': '🧙 Specialist (สายเฉพาะทาง)',
  'Needs PIP': '🥚 Fresh Recruit (ผู้เริ่มต้น ต้องปรับพื้นฐานเร่งด่วน)',
  'Needs Mentoring': '🌱 Trainee Adventurer (นักผจญภัยฝึกหัด)',
  'Focus Improvement': '🧩 Lopsided Build (บิลด์เอียง ต้องอุดจุดอ่อน)'
};
export const getDnaTitle = (dna, mode) => {
  if (!dna) return '';
  const base = String(dna.title || '');
  const tier = /^(Master|Senior)\s/.exec(base);
  if (isCorp(mode)) {
    const clean = base.replace(/\s*\[[^\]]*\]\s*$/, '');
    return tier ? clean.replace(/^Master\s/, 'Principal ') : clean;
  }
  const rpg = RPG_DNA[dna.tag];
  if (!rpg) return base;
  if (!tier) return rpg;
  const prefix = tier[1] === 'Master' ? 'Grand ' : 'Veteran ';
  return rpg.replace(/^(\S+\s)/, `$1${prefix}`);
};

// ---- 9-box --------------------------------------------------------------------
const NINE_BOX = {
  rpg: {
    high_high: { title: '🏆 Raid Leader', thai: 'หัวหน้าปาร์ตี้ผู้นำทัพ', desc: 'พลังพื้นฐานสูงและฝีมือสนามจริงยอดเยี่ยม เป็นตัวหลักที่ปาร์ตี้ฝากชีวิตได้', action: 'มอบเควสต์ระดับบอส หรือให้นำทีมซ่อมบำรุงชุดสำคัญ' },
    med_high: { title: '🔥 Grinder', thai: 'สายขยันเลเวลอัปด้วยวินัย', desc: 'ฝีมือในสนามเกินพลังพื้นฐานที่วัดได้ เพราะซ้อมสม่ำเสมอและไม่ทิ้งเควสต์', action: 'ถอดเทคนิคไปสอนกิลด์ และส่งไปฝึกสกิลสายระบบเพิ่ม' },
    low_high: { title: '⭐ Street Hero', thai: 'วีรบุรุษหน้างานตัวจริง', desc: 'สเตตัสพื้นฐานไม่สูง แต่แก้เควสต์หน้างานได้เก่งจากประสบการณ์สะสม', action: 'เสริมทฤษฎีและเครื่องมือดิจิทัลให้ใช้แรงน้อยลงแต่ได้ผลเท่าเดิม' },
    high_med: { title: '💎 Rising Star', thai: 'ดาวรุ่งรอเลเวลอัป', desc: 'พลังพื้นฐานสูงมาก ฝีมือสนามจริงอยู่ระดับมาตรฐาน พร้อมทะลุเพดาน', action: 'ส่งเข้าเควสต์ยากขึ้นเพื่อดึงพลังที่ซ่อนอยู่ออกมา' },
    med_med: { title: '⚙️ Party Backbone', thai: 'แกนหลักประจำปาร์ตี้', desc: 'สเตตัสกับฝีมือไปด้วยกัน เป็นกำลังที่ปาร์ตี้พึ่งได้ทุกวัน', action: 'หาสกิลเฉพาะทาง 1–2 สายให้ฝึก เพื่อสร้างจุดเด่นของตัวเอง' },
    low_med: { title: '🔨 Apprentice Fighter', thai: 'นักรบฝึกหัดที่ทำตามแผนได้', desc: 'ทำเควสต์ตามคำสั่งได้ครบ แต่ยังต้องมีรุ่นพี่คอยแนะในเคสที่ซับซ้อน', action: 'ให้เช็กลิสต์เควสต์ชัดเจน และจับคู่กับนักรบอาวุโส' },
    high_low: { title: '🐉 Sleeping Dragon', thai: 'มังกรหลับใหล ยังไม่ปล่อยพลัง', desc: 'มีพลังแฝงสูงมากแต่ฝีมือในสนามยังไม่ออก อาจเหนื่อยล้าหรือติดอุปสรรคที่มองไม่เห็น', action: 'คุยตัวต่อตัวหาสาเหตุ ปลดล็อกอุปสรรค แล้วให้เควสต์ที่ตรงกับพลังจริง' },
    med_low: { title: '📉 Unstable Skill', thai: 'สกิลติดๆ ดับๆ ต้องปลุกฟอร์ม', desc: 'พื้นฐานพอใช้แต่ฟอร์มในสนามไม่นิ่ง ขาดความต่อเนื่อง', action: 'ตั้งเช็กพอยต์ถี่ขึ้น ติดตามการปิดเควสต์รายวัน และทบทวนขั้นตอน' },
    low_low: { title: '🚨 Respawn Camp', thai: 'ต้องกลับค่ายฝึกเร่งด่วน', desc: 'ทั้งพลังพื้นฐานและฝีมือสนามต่ำกว่าเกณฑ์ เป็นจุดเสี่ยงของปาร์ตี้', action: 'จับคู่รุ่นพี่ประกบ 1:1 ห้ามออกเควสต์เดี่ยว จนกว่าจะผ่านด่านฝึก' }
  },
  corporate: {
    high_high: { title: 'Star Leader', thai: 'ผู้นำต้นแบบที่ขับเคลื่อนโครงการ' },
    med_high: { title: 'High-Discipline Achiever', thai: 'ผู้สร้างผลงานเกินคาดด้วยวินัยสูง' },
    low_high: { title: 'Field Expert', thai: 'ผู้เชี่ยวชาญหน้างานที่ผลงานเกินศักยภาพที่ประเมิน' },
    high_med: { title: 'High-Potential Core', thai: 'บุคลากรศักยภาพสูงที่กำลังพัฒนา' },
    med_med: { title: 'Dependable Core', thai: 'กำลังหลักที่พึ่งพาได้' },
    low_med: { title: 'Steady Operator', thai: 'ผู้ปฏิบัติงานตามมาตรฐาน' },
    high_low: { title: 'Under-Utilized Talent', thai: 'บุคลากรศักยภาพสูงที่ยังไม่ได้ใช้เต็มที่' },
    med_low: { title: 'Inconsistent Performer', thai: 'ผู้ปฏิบัติงานที่ผลงานไม่สม่ำเสมอ' },
    low_low: { title: 'Urgent Development Case', thai: 'กรณีที่ต้องพัฒนาเร่งด่วน' }
  }
};
export const getNineBoxDisplay = (key, mode, base = {}) => {
  const set = NINE_BOX[isCorp(mode) ? 'corporate' : 'rpg'][key];
  if (!set) return { title: base.title, thai: base.thai, desc: base.desc, action: base.action };
  return {
    title: set.title,
    thai: set.thai,
    desc: set.desc || base.desc,
    action: set.action || base.action
  };
};
