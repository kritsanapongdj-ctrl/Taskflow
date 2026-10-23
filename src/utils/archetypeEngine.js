import defaultArchetypesData from '../data/archetypes.json' with { type: 'json' };
import rubricsData from '../data/rubrics.json' with { type: 'json' };

export const STAT_KEYS = ['str', 'agi', 'dex', 'int', 'con', 'sen'];

export const UNIVERSAL_BASELINE = 5;

export const ROLE_TARGET_PROFILES = {
  admin: {
    key: 'admin',
    name: 'ธุรการบริการ (Customer Service Admin)',
    shortRole: 'ธุรการ',
    baseline: 5,
    targetStats: { str: 5, agi: 6, dex: 7, int: 7, con: 6, sen: 6 },
    targetArray: [5, 6, 7, 7, 6, 6],
    coreFocus: ['dex', 'int', 'con', 'sen', 'agi'],
    flexibleStats: ['str'],
    mission: 'ดูแลระบบใบงาน LHAppServ ตรวจสอบเอกสารค่าใช้จ่าย 9 หมวดใน LHServ Portal วินัยในงาน Routine และประสานงานลูกบ้าน',
    strengthDesc: 'มีความแม่นยำด้านเอกสารสูง ใช้ระบบดิจิทัลคล่องแคล่ว มีวินัยต่องาน Routine และมีจิตวิทยาบริการยอดเยี่ยม'
  },
  foreman: {
    key: 'foreman',
    name: 'ผู้ควบคุมงาน (Customer Service Foreman)',
    shortRole: 'โฟร์แมน',
    baseline: 5,
    targetStats: { str: 7, agi: 7, dex: 6, int: 5, con: 7, sen: 5 },
    targetArray: [7, 7, 6, 5, 7, 5],
    coreFocus: ['str', 'agi', 'dex', 'con'],
    flexibleStats: ['int', 'sen'],
    mission: 'ควบคุมงานระบบสาธารณูปโภค 6 หมวด (ประปา สระว่ายน้ำ ไฟฟ้า สวน) ตรวจรับงานผู้รับเหมา และแก้ปัญหาฉุกเฉินหน้างาน',
    strengthDesc: 'ขับเคลื่อนงานหน้างานเด็ดขาด รุดหน้าเข้าพื้นที่ฉับไว อึดทนต่อสภาพแวดล้อม และมีมาตรฐานการตรวจงานช่างเข้มงวด'
  },
  officer: {
    key: 'officer',
    name: 'เจ้าหน้าที่บริการ (Customer Service Officer)',
    shortRole: 'เจ้าหน้าที่',
    baseline: 5,
    targetStats: { str: 6, agi: 6, dex: 6, int: 6, con: 6, sen: 6 },
    targetArray: [6, 6, 6, 6, 6, 6],
    coreFocus: ['str', 'agi', 'dex', 'int', 'con', 'sen'],
    flexibleStats: [],
    mission: 'บริหารจัดการภาพรวมโครงการ ควบคุมยอดงานค้าง Wait คุมงบประมาณต้นทุนทางอ้อมรวม 9 หมวด และกำกับดูแลทีมโฟร์แมนและธุรการ',
    strengthDesc: 'มีความสมดุลรอบด้านในการบริหารโครงการ ตัดสินใจเชิงกลยุทธ์ และเป็นตัวแทนบริษัทในการเจรจาเคสสำคัญ'
  }
};

export const getRoleTargetProfile = (roleOrClass) => {
  if (!roleOrClass) return ROLE_TARGET_PROFILES.officer;
  const str = (typeof roleOrClass === 'string' ? roleOrClass : (roleOrClass.name || roleOrClass.title || roleOrClass.key || '')).toLowerCase();
  if (str.includes('admin') || str.includes('ธุรการ') || str.includes('ประสาน')) return ROLE_TARGET_PROFILES.admin;
  if (str.includes('foreman') || str.includes('โฟร์แมน') || str.includes('ช่าง') || str.includes('ผู้ควบคุม')) return ROLE_TARGET_PROFILES.foreman;
  return ROLE_TARGET_PROFILES.officer;
};

export const DATA_ANCHOR_GUIDE = {
  str: {
    source: 'LHAppServ & LHServ Portal (54012)',
    metrics: 'อัตราการปิดเคสวิกฤตหน้างาน (ท่อเมนแตก, ปั๊มดับ) และการตัดสินใจแก้ปัญหา',
    baselineRule: 'ระดับ 5: ตัดสินใจแก้ปัญหาหน้างานตามขั้นตอนมาตรฐานได้สำเร็จ งานไม่สะดุด'
  },
  agi: {
    source: 'LHAppServ & Taskflow (Response Time)',
    metrics: 'ความเร็วในการตอบสนองรับเรื่อง และการกระจายงานตามกรอบ SLA',
    baselineRule: 'ระดับ 5: ตอบสนองและประสานงานรับแจ้งซ่อมตาม SLA ไม่ดองสถานะเรื่อง'
  },
  dex: {
    source: 'LHServ Portal (9 หมวดงบประมาณ) & LHAppServ',
    metrics: 'ความถูกต้องของข้อมูลแปลง/เลขที่อ้างอิง และอัตรางานซ่อมซ้ำ (Recurring Defect)',
    baselineRule: 'ระดับ 5: ข้อมูลถูกต้องตามมาตรฐาน ตรวจสอบงานละเอียด เอกสารไม่ตีกลับ'
  },
  int: {
    source: 'Taskflow System & LHAppServ',
    metrics: 'การใช้งาน Taskflow รายวัน และการนำประวัติงานซ่อมมาวางแผน PM',
    baselineRule: 'ระดับ 5: ใช้ระบบ Taskflow และเครื่องมือดิจิทัลติดตามงานได้อย่างคล่องแคล่ว'
  },
  con: {
    source: 'Daily Work Logs & Customer Escalations',
    metrics: 'วินัยในงาน Routine ประจำวัน และการควบคุมอารมณ์ภายใต้ความกดดัน',
    baselineRule: 'ระดับ 5: ทำงานต่อเนื่องตามเป้าหมาย คุมอารมณ์และสมาธิในงาน Routine ได้มั่นคง'
  },
  sen: {
    source: 'Customer Logs & Contractor Meetings',
    metrics: 'มารยาทการสื่อสาร Service Mind และการประสานงานลดข้อขัดแย้ง',
    baselineRule: 'ระดับ 5: มี Service Mind สื่อสารสุภาพ เจรจาประสานงานได้ราบรื่น'
  }
};

export const TIE_BREAKERS = {
  str: 0.06,
  agi: 0.05,
  dex: 0.04,
  int: 0.03,
  con: 0.02,
  sen: 0.01
};

export const STAT_DEFINITIONS = {
  str: { 
    key: 'str', 
    label: 'STR',
    name: 'STR (Strength)', 
    thai: 'พลังขับเคลื่อนและการตัดสินใจ',
    group: 'The Heavy Lifters', 
    desc: 'พลังขับเคลื่อนและการตัดสินใจ (Core Execution, Problem Solving & Supervision)', 
    corporate: {
      code: 'EXEC',
      name: 'Core Execution & Decisiveness',
      thai: 'การขับเคลื่อนงานหลักและการตัดสินใจ',
      group: 'Strategic Execution',
      desc: 'ความสามารถในการผลักดันงานสำคัญให้สำเร็จตามเป้าหมาย การตัดสินใจแก้ปัญหาเฉพาะหน้า และการกำกับดูแลผู้ปฏิบัติงาน'
    },
    categories: [
      { name: 'พลังในการขับเคลื่อนงานหลัก (Core Execution)' },
      { name: 'การตัดสินใจแก้ปัญหาเฉพาะหน้า (Problem Solving & Decision Making)' },
      { name: 'การควบคุมผู้ปฏิบัติงานและผลลัพธ์ (Supervision & Result Control)' }
    ]
  },
  agi: { 
    key: 'agi', 
    label: 'AGI',
    name: 'AGI (Agility)', 
    thai: 'ความรวดเร็วและการปรับตัว',
    group: 'The Precision Engine', 
    desc: 'ความรวดเร็วและการปรับตัว (Responsiveness, Adaptability & Field Agility)', 
    corporate: {
      code: 'AGIL',
      name: 'Operational Agility & Responsiveness',
      thai: 'ความคล่องตัวและการตอบสนองต่อปัญหา',
      group: 'Operational Agility',
      desc: 'ความเร็วในการตอบสนองต่อคำขอ การปรับตัวรับมือความเปลี่ยนแปลง และความฉับไวในการเข้าถึงพื้นที่หน้างาน'
    },
    categories: [
      { name: 'ความรวดเร็วในการตอบสนอง (Responsiveness)' },
      { name: 'การปรับตัวรับมือความเปลี่ยนแปลง (Adaptability)' },
      { name: 'การเข้าถึงพื้นที่และการลงมือปฏิบัติ (Field Agility & Action)' }
    ]
  },
  dex: { 
    key: 'dex', 
    label: 'DEX',
    name: 'DEX (Dexterity)', 
    thai: 'ความแม่นยำและมาตรฐานคุณภาพ',
    group: 'The Precision Engine', 
    desc: 'ความแม่นยำและมาตรฐานคุณภาพ (Data Accuracy, Time Management & Quality Control)', 
    corporate: {
      code: 'PREC',
      name: 'Precision & Quality Excellence',
      thai: 'ความแม่นยำและการควบคุมคุณภาพ',
      group: 'Quality Excellence',
      desc: 'ความถูกต้องแม่นยำของข้อมูลเอกสาร การบริหารเวลา และการตรวจสอบมาตรฐานความประณีตของผลงาน'
    },
    categories: [
      { name: 'ความถูกต้องแม่นยำของข้อมูลและเอกสาร (Data Accuracy & Document)' },
      { name: 'การบริหารเวลา (Time Management)' },
      { name: 'การตรวจสอบมาตรฐานและการควบคุมคุณภาพ (Quality Control)' }
    ]
  },
  int: { 
    key: 'int', 
    label: 'INT',
    name: 'INT (Intelligence)', 
    thai: 'ระบบเทคโนโลยีและการจัดการ',
    group: 'The Mastermind', 
    desc: 'ระบบเทคโนโลยีและการจัดการ (Basic Tools, Workflow Optimization & Advanced Automation)', 
    corporate: {
      code: 'SYST',
      name: 'Systems & Workflow Optimization',
      thai: 'ระบบงานและการคิดเชิงระบบ',
      group: 'Systems & Optimization',
      desc: 'ความเชี่ยวชาญการใช้เครื่องมือดิจิทัล Taskflow การออกแบบกระบวนการทำงานให้มีประสิทธิภาพ และการวิเคราะห์ข้อมูล'
    },
    categories: [
      { name: 'การใช้เครื่องมือและระบบพื้นฐาน (Basic Tool Proficiency)' },
      { name: 'การออกแบบระบบและกระบวนการทำงาน (Workflow Optimization)' },
      { name: 'การประยุกต์ใช้เทคโนโลยีขั้นสูง (Advanced Automation)' }
    ]
  },
  con: { 
    key: 'con', 
    label: 'CON',
    name: 'CON (Constitution)', 
    thai: 'ความทรหดและการควบคุมอารมณ์',
    group: 'The Heavy Lifters', 
    desc: 'ความทรหดและการควบคุมอารมณ์ (Stress Tolerance, Stamina & Grit)', 
    corporate: {
      code: 'RESL',
      name: 'Resilience & Stress Tolerance',
      thai: 'ความทรหดและวุฒิภาวะทางอารมณ์',
      group: 'Personal Mastery',
      desc: 'ความอดทนต่อสภาวะกดดัน ความต่อเนื่องและวินัยในงาน Routine และความมุ่งมั่นไม่ยอมแพ้ต่องานยาก'
    },
    categories: [
      { name: 'ความอดทนต่อสภาวะกดดัน (Stress Tolerance)' },
      { name: 'ความรับผิดชอบต่องานยืดเยื้อ (Stamina in Protracted Tasks)' },
      { name: 'ความทรหดและไม่ยอมแพ้ต่องานยาก (Grit & Perseverance)' }
    ]
  },
  sen: { 
    key: 'sen', 
    label: 'SEN',
    name: 'SEN (Sense)', 
    thai: 'การเจรจาและความเข้าใจผู้คน',
    group: 'The Empathizers', 
    desc: 'การเจรจาและความเข้าใจผู้คน (Emotional Control, Empathy & Communication)', 
    corporate: {
      code: 'EMPA',
      name: 'Stakeholder Empathy & Communication',
      thai: 'การเข้าใจผู้มีส่วนได้ส่วนเสียและการสื่อสาร',
      group: 'Relationship & Influence',
      desc: 'การควบคุมอารมณ์และบุคลิกภาพ จิตวิทยาบริการ ความเข้าใจมุมมองลูกบ้าน และศิลปะการเจรจาประสานงานเพื่อลดข้อขัดแย้ง'
    },
    categories: [
      { name: 'การควบคุมอารมณ์และบุคลิกภาพ (Emotional Control)' },
      { name: 'ความเข้าใจผู้คนและการบริการ (Empathy & Perspective Taking)' },
      { name: 'ศิลปะการสื่อสารและเจรจา (Communication & Conflict Resolution)' }
    ]
  }
};

export const getStatDisplay = (statKey, viewMode = 'rpg') => {
  const k = (statKey || '').toLowerCase();
  const def = STAT_DEFINITIONS[k] || {
    key: k,
    label: k.toUpperCase(),
    name: k.toUpperCase(),
    thai: k.toUpperCase(),
    group: 'General'
  };

  if (viewMode === 'corporate' && def.corporate) {
    return {
      key: k,
      code: def.corporate.code,
      label: def.corporate.code,
      name: def.corporate.name,
      thai: def.corporate.thai,
      group: def.corporate.group,
      desc: def.corporate.desc || def.desc
    };
  }

  return {
    key: k,
    code: def.label,
    label: def.label,
    name: def.name,
    thai: def.thai,
    group: def.group,
    desc: def.desc
  };
};

export const getCorporateArchetypePersona = (archetypeKey, mainStyle) => {
  const map = {
    'uniform_1': { title: 'Critical Risk Profile', thai: 'กลุ่มความเสี่ยงวิกฤต' },
    'uniform_2': { title: 'Underperforming Associate', thai: 'กลุ่มต้องฟื้นฟูผลงานเร่งด่วน' },
    'uniform_3': { title: 'Developing Operator', thai: 'ผู้ปฏิบัติการในระยะดูแลใกล้ชิด' },
    'uniform_4': { title: 'Developing Support', thai: 'ผู้ปฏิบัติการสนับสนุนขั้นต้น' },
    'uniform_5': { title: 'Standard All-Rounder', thai: 'ผู้ปฏิบัติการมาตรฐานรอบด้าน' },
    'uniform_6': { title: 'Proficient Generalist', thai: 'ผู้ชำนาญการรอบด้าน' },
    'uniform_7': { title: 'Senior Operational Lead', thai: 'ผู้นำปฏิบัติการอาวุโส' },
    'uniform_8': { title: 'Master Specialist', thai: 'ผู้เชี่ยวชาญพิเศษระดับสูง' },
    'uniform_9': { title: 'Strategic Systems Lead', thai: 'ผู้นำเชิงกลยุทธ์และระบบ' },
    'uniform_10': { title: 'Organizational Benchmark', thai: 'ต้นแบบระดับองค์กร' },
    'polarized_prodigy': { title: 'High-Impact Specialist (Blindspot Gap)', thai: 'ผู้เชี่ยวชาญเฉพาะทางที่ต้องการทีมหนุน' },
    'generalist': { title: 'Cross-Functional Generalist', thai: 'ผู้ปฏิบัติการรอบด้าน' },
    'trainee': { title: 'Developing Associate', thai: 'ผู้ปฏิบัติการในระยะสร้างสมรรถนะ' },
  };

  if (map[archetypeKey]) return map[archetypeKey];

  if (/commander|enforcer|berserker|juggernaut/i.test(mainStyle || '')) {
    return { title: 'Operational Execution Lead', thai: 'ผู้นำการขับเคลื่อนหน้างานและการตัดสินใจ' };
  }
  if (/vanguard|scout|striker/i.test(mainStyle || '')) {
    return { title: 'Agile Response Specialist', thai: 'ผู้เชี่ยวชาญความคล่องตัวและการแก้ปัญหาฉับไว' };
  }
  if (/craftsman|inspector|technician|sniper/i.test(mainStyle || '')) {
    return { title: 'Quality & Technical Specialist', thai: 'ผู้เชี่ยวชาญมาตรฐานคุณภาพและความแม่นยำ' };
  }
  if (/architect|mastermind|engineer|tactician/i.test(mainStyle || '')) {
    return { title: 'Systems & Workflow Architect', thai: 'สถาปนิกผู้วางระบบและเทคโนโลยี' };
  }
  if (/guardian|paladin|sentinel|bulwark/i.test(mainStyle || '')) {
    return { title: 'Resilient Service Guardian', thai: 'ผู้พิทักษ์เสถียรภาพและคุณภาพบริการ' };
  }
  if (/diplomat|empathizer|mediator|sage/i.test(mainStyle || '')) {
    return { title: 'Stakeholder Relationship Lead', thai: 'ผู้นำการสื่อสารและการประสานงานผู้มีส่วนได้ส่วนเสีย' };
  }

  return { title: mainStyle || 'Operational Professional', thai: 'บุคลากรสายปฏิบัติการ' };
};

export const getStatLevelText = (val) => {
  const v = Math.min(Math.max(Math.round(Number(val) || 5), 1), 10);
  const levels = {
    10: 'ระดับตำนาน (Legendary)',
    9: 'ระดับผู้นำ (Mastery)',
    8: 'ผู้เชี่ยวชาญพิเศษ (Expert)',
    7: 'ระดับเชี่ยวชาญ (Advanced)',
    6: 'ระดับดีเยี่ยม (Good)',
    5: 'ระดับมาตรฐาน (Standard)',
    4: 'ต่ำกว่าเกณฑ์ (Below Average)',
    3: 'ต้องการการดูแล (Needs Help)',
    2: 'ต้องปรับปรุง (Poor)',
    1: 'ขั้นวิกฤต (Crisis)'
  };
  return levels[v] || 'ระดับมาตรฐาน (Standard)';
};

export const getRubricText = (statOrKey, val, catIndex = 0) => {
  const k = (typeof statOrKey === 'string' ? statOrKey : statOrKey?.key || '').toLowerCase();
  const v = String(Math.min(Math.max(Math.round(Number(val) || 5), 1), 10));
  
  // 1. Direct lookup in rubricsData (from rpg perform updated 20-9-69.xlsx)
  if (rubricsData && rubricsData[k]) {
    const list = rubricsData[k];
    const cat = list[catIndex] || list[0];
    if (cat && cat.levels && cat.levels[v]) {
      return cat.levels[v];
    }
  }

  // 2. Fallback to basic text if not matched
  const stat = STAT_DEFINITIONS[k] || OUTER_DEFINITIONS[k];
  if (stat && stat.rubric) {
    if (stat.rubric[v]) return stat.rubric[v];
    const num = Number(v);
    if (num >= 9) return stat.rubric.mastery || '';
    if (num >= 7) return stat.rubric.advanced || '';
    if (num >= 4) return stat.rubric.intermediate || '';
    return stat.rubric.basic || '';
  }
  return '';
};

export const calculateArchetypeKey = (statsObj, archetypesData = defaultArchetypesData) => {
  if (!statsObj) return 'uncalibrated';
  const rawStats = Object.keys(TIE_BREAKERS).map(k => Number(statsObj[k]) || 0);
  const maxStat = Math.max(...rawStats);
  const minStat = Math.min(...rawStats);

  // 1. Uniform Stats (ALL = 1 to 10)
  if (maxStat === minStat) {
    const uniformKey = `uniform_${maxStat}`;
    if (archetypesData.some(a => a.key === uniformKey)) return uniformKey;
    return 'uniform_5';
  }

  // 2. Polarized Prodigy (Max >= 8 & Min <= 3)
  if (maxStat >= 8 && minStat <= 3) {
    return 'polarized_prodigy';
  }

  // 3. Baseline & Developing (Max <= 5)
  if (maxStat <= 5) {
    if (minStat >= 4) return 'generalist';
    const has4 = rawStats.some(v => v >= 4);
    const has3 = rawStats.some(v => v <= 3);
    if (has4 && has3) return 'trainee';
    return 'uncalibrated';
  }

  // 4. Standard / High Potential (Max > 5)
  const validStats = Object.keys(TIE_BREAKERS).map(k => ({
    key: k,
    val: Number(statsObj[k]) || 0,
    adj: (Number(statsObj[k]) || 0) + TIE_BREAKERS[k]
  })).filter(s => s.val >= 5).sort((a, b) => b.adj - a.adj);

  if (validStats.length < 2) return 'novice';
  if (validStats.length === 6 && validStats[0].val === validStats[5].val) return 'all_rounder';

  // Tri-stat unlocked if 3rd valid stat >= 6 (according to Adventurer's Tome spec)
  const useTop3 = validStats.length >= 3 && validStats[2].val >= 6;
  const topKeys = validStats.slice(0, useTop3 ? 3 : 2).map(s => s.key).sort();
  const key = topKeys.join('_');

  if (archetypesData.some(a => a.key === key)) return key;
  return validStats.slice(0, 2).map(s => s.key).sort().join('_');
};

export const getArchetypeIdentity = (statsObj, archetypesData = defaultArchetypesData) => {
  if (!statsObj) return '-';
  const key = calculateArchetypeKey(statsObj, archetypesData);
  const arch = archetypesData.find(a => a.key === key);
  return arch?.identity || arch?.name || '-';
};

export const analyzeArchetype = (teamForm, _sets = {}, archetypesData = defaultArchetypesData, roleInput = null) => {
  const u = teamForm;
  if (!u) return null;

  const roleProfile = getRoleTargetProfile(roleInput || u.role || u.classId || _sets?.staffClasses?.find?.(c => c.id === u.classId));

  const statsObj = {
    str: Number(u.str) || 0,
    agi: Number(u.agi) || 0,
    dex: Number(u.dex) || 0,
    int: Number(u.int) || 0,
    con: Number(u.con) || 0,
    sen: Number(u.sen) || 0
  };

  const rawStats = Object.keys(TIE_BREAKERS).map(k => [k, statsObj[k]]);
  const sortedStats = [...rawStats].sort((a, b) => b[1] - a[1]);
  const maxStat = sortedStats[0][1];
  const minStat = sortedStats[5][1];

  const validStats = Object.keys(TIE_BREAKERS)
    .map(k => [k, statsObj[k], statsObj[k] + TIE_BREAKERS[k]])
    .filter(s => s[1] >= 5)
    .sort((a, b) => b[2] - a[2]);

  let prefix = '';
  if (maxStat >= 8 && minStat >= 5) prefix = 'Master ';
  else if (maxStat >= 7 && minStat >= 4) prefix = 'Senior ';

  // Single Source of Truth for Archetype Resolution from Adventurer's Tome
  const archetypeKey = calculateArchetypeKey(statsObj, archetypesData);
  const archObj = archetypesData.find(a => a.key === archetypeKey) || archetypesData.find(a => a.key === 'uncalibrated') || {
    key: archetypeKey,
    name: 'Specialist',
    thai: 'สายเฉพาะทาง',
    identity: 'The Specialist',
    desc: 'มีความเชี่ยวชาญเฉพาะทางตามบทบาทหน้าที่',
    strengths: 'ปฏิบัติงานได้ดีในสายงานหลัก',
    weaknesses: 'ควรพัฒนาทักษะรอบด้านเพิ่มเติม'
  };

  const enTitle = prefix ? `${prefix}${archObj.name}` : archObj.name;
  const thTitle = archObj.thai || '';
  const mainStyle = thTitle ? `${enTitle} (${thTitle})` : enTitle;
  const identityText = archObj.identity || `${enTitle} (${thTitle})`;
  const styleDesc = archObj.desc || '';

  const getDesc = (k) => {
    const defaults = {
      str: 'การลงมือทำอย่างเด็ดขาดและมีพลังขับเคลื่อนสูง',
      agi: 'ความรวดเร็วในการตอบสนองและแก้ไขปัญหาเฉพาะหน้า',
      dex: 'ความประณีตละเอียดรอบคอบและถูกต้องตามมาตรฐาน',
      int: 'การประยุกต์ใช้เทคโนโลยีและการวางระบบงานอย่างมีประสิทธิภาพ',
      con: 'ความอดทนไม่ย่อท้อและการควบคุมอารมณ์ภายใต้ความกดดัน',
      sen: 'การเข้าใจผู้อื่นและการประสานงานเจรจาอย่างมีชั้นเชิง'
    };
    return defaults[k] || k;
  };

  let dynamicWeakness = '';
  let weaknessLabel = 'จุดอ่อน:';
  let weaknessColor = 'text-rose-400';

  if (archObj) {
    const lowestStatValue = sortedStats[5][1];
    const lowestStats = sortedStats.filter(s => s[1] === lowestStatValue);

    const subStandardBehaviorDefs = {
      str: 'อาจต้องเพิ่มพลังขับเคลื่อนและความมั่นใจในการตัดสินใจลุยงาน (STR: พลังขับเคลื่อนและการตัดสินใจ)',
      agi: 'ความรวดเร็วและการปรับตัวรับมือกับงานเร่งด่วนยังต้องเสริมเพิ่มเติม (AGI: ความรวดเร็วและการปรับตัว)',
      dex: 'ควรเพิ่มความแม่นยำในการบันทึกข้อมูลและตรวจสอบมาตรฐานคุณภาพงาน (DEX: ความแม่นยำและมาตรฐานคุณภาพ)',
      int: 'การใช้เครื่องมือระบบดิจิทัลและการจัดการกระบวนการทำงานยังต้องได้รับการแนะนำ (INT: ระบบเทคโนโลยีและการจัดการ)',
      con: 'ความทรหดอดทนต่อสภาวะกดดันและงานยืดเยื้ออาจต้องได้รับการสนับสนุนจากทีม (CON: ความทรหดและการควบคุมอารมณ์)',
      sen: 'การเจรจาสื่อสารและทำความเข้าใจลูกบ้านในสถานการณ์ตึงเครียดควรปรึกษาหัวหน้างานก่อน (SEN: การเจรจาและความเข้าใจผู้คน)'
    };

    if (lowestStatValue >= 7) {
      weaknessLabel = 'จุดเด่นรอบด้าน:';
      weaknessColor = 'text-emerald-400';
      dynamicWeakness = 'มีทักษะระดับสูงครบทุกมิติ ปฏิบัติงานได้อย่างสมบูรณ์แบบ สามารถเป็นเสาหลักและพี่เลี้ยงถ่ายทอดความรู้ให้ทีมได้อย่างดีเยี่ยม';
    } else if (lowestStatValue >= 5) {
      weaknessLabel = 'ข้อเสนอแนะในการพัฒนา:';
      weaknessColor = 'text-sky-300';
      const statNames = lowestStats.map(s => s[0].toUpperCase()).join(', ');
      dynamicWeakness = `ทักษะทุกด้านผ่านเกณฑ์มาตรฐานองค์กร (Universal Baseline 5/10) ครบถ้วน โดยด้าน ${statNames} (${lowestStatValue}/10) อยู่ในระดับมาตรฐานการทำงานทั่วไป ซึ่งสามารถพัฒนาต่อยอดสู่ความเป็นเลิศตามสายอาชีพ`;
    } else {
      const isAllFlexible = lowestStats.every(s => roleProfile.flexibleStats.includes(s[0]));
      if (isAllFlexible) {
        weaknessLabel = 'จุดพิจารณาเพื่อการสนับสนุน:';
        weaknessColor = 'text-amber-400 font-medium';
        dynamicWeakness = `สเตตัสในด้าน ${lowestStats.map(s => s[0].toUpperCase()).join(', ')} (${lowestStatValue}/10) อยู่ในระดับที่ควรได้รับการสนับสนุน ซึ่งสอดคล้องกับธรรมชาติของงาน${roleProfile.shortRole} หัวหน้างานสามารถมอบหมายให้คู่หูหรือทีมงานช่วยเสริมในมิตินี้`;
      } else if (lowestStatValue >= 3) {
        weaknessLabel = 'จุดที่ควรเสริมทักษะ:';
        weaknessColor = 'text-amber-400';
        dynamicWeakness = `${lowestStats.map(s => subStandardBehaviorDefs[s[0]]).join(' รวมถึง ')} (คะแนน: ${lowestStatValue}/10) ควรได้รับการสนับสนุนหรือมีพี่เลี้ยงช่วยแนะนำในการปฏิบัติงานจริง`;
      } else {
        weaknessLabel = 'จุดบอดที่ต้องดูแลใกล้ชิด:';
        weaknessColor = 'text-rose-500 font-bold';
        dynamicWeakness = `${lowestStats.map(s => subStandardBehaviorDefs[s[0]]).join(' รวมถึง ')} (สเตตัสต่ำกว่าเกณฑ์มาตรฐานมาก: ${lowestStatValue}/10) จำเป็นต้องมีระบบพี่เลี้ยงคอยดูแลอย่างใกล้ชิด`;
      }
    }
  }

  const signatureStrengths = sortedStats.filter(s => s[1] >= 7).map(s => ({
    key: s[0],
    val: s[1],
    name: STAT_DEFINITIONS[s[0]]?.name || s[0].toUpperCase(),
    desc: getDesc(s[0])
  }));

  const standardPass = sortedStats.filter(s => s[1] >= 5 && s[1] < 7).map(s => ({
    key: s[0],
    val: s[1],
    name: STAT_DEFINITIONS[s[0]]?.name || s[0].toUpperCase(),
    desc: getDesc(s[0])
  }));

  const STAT_SPECIFIC_ADVICE = {
    str: {
      core: 'กำหนด Check-list การตัดสินใจหน้างานให้ชัดเจน และให้หัวหน้าประกบช่วยตัดสินใจในเคสที่มีความเสี่ยงสูง',
      support: 'จัดคู่หูสายลุยงานคอยช่วยขับเคลื่อนและร่วมลงพื้นที่แก้ไขปัญหาเฉพาะหน้า'
    },
    agi: {
      core: 'ฝึกทักษะการจัดลำดับความสำคัญของใบงานเร่งด่วน (Triage) และตั้งระบบแจ้งเตือนก่อนถึงกำหนด SLA',
      support: 'ให้ทีมงานช่วยคัดกรองงานด่วนและช่วยกระจายงานเพื่อป้องกันงานค้างสะสม'
    },
    dex: {
      core: 'สร้างระเบียบการตรวจรับงานซ้ำ (Double-check) ก่อนส่งมอบงาน และตรวจสอบการกรอกข้อมูลแปลง/เลขที่อ้างอิงให้ครบ',
      support: 'ให้เพื่อนร่วมทีมที่ละเอียดเรื่องเอกสารช่วยตรวจทานความถูกต้องก่อนปิดใบงาน'
    },
    int: {
      core: 'จัดติวเข้มการใช้งาน Taskflow และระบบรายงานดิจิทัล รวมถึงการอ่านประวัติงานซ่อมเพื่อวางแผน PM',
      support: 'ให้คู่หูที่มีความคุ้นเคยกับระบบดิจิทัลช่วยแนะนำขั้นตอนการใช้งานระบบงาน'
    },
    con: {
      core: 'ติดตามภาระงานอย่างใกล้ชิด หลีกเลี่ยงการให้รับงานตึงเครียดต่อเนื่อง และสอนเทคนิคการรับมืออารมณ์',
      support: 'จัดตารางงานให้มีการสลับผลัดเพื่อป้องกันอาการล้าสะสม และคอยรับฟังข้อติดขัด'
    },
    sen: {
      core: 'ฝึกอบรมศิลปะการเจรจาและ Service Mind ให้คำแนะนำเรื่องการใช้น้ำเสียงและการรับฟังลูกบ้านเชิงรุก',
      support: 'ในเคสที่ลูกบ้านอารมณ์ร้อน ให้หัวหน้าหรือเพื่อนร่วมทีมที่มี SEN สูงร่วมเข้าเจรจาด้วย'
    }
  };

  const considerations = sortedStats.filter(s => s[1] <= 4).map(s => {
    const isCore = roleProfile.coreFocus.includes(s[0]);
    const adviceObj = STAT_SPECIFIC_ADVICE[s[0]] || { core: 'เน้นการประกบดูแล', support: 'จัดคู่หูช่วยเสริม' };
    return {
      key: s[0],
      val: s[1],
      name: STAT_DEFINITIONS[s[0]]?.name || s[0].toUpperCase(),
      isCore,
      roleStatus: isCore ? 'จุดสำคัญของตำแหน่งที่ต้องพัฒนา' : 'จุดสนับสนุน (ทีม/คู่หูช่วยเสริมได้)',
      advice: isCore ? adviceObj.core : adviceObj.support
    };
  });

  // --- Score-Tiered Competency Framework (HR Calibration Standard) ---
  let competencyTier = {
    level: 2,
    code: 'tier2',
    name: 'Tier 2: Baseline Developing',
    thai: 'ระดับสมรรถนะพื้นฐาน (กำลังพัฒนา)',
    badgeColor: 'text-sky-300 bg-sky-950/60 border-sky-800'
  };

  if (maxStat < 5) {
    competencyTier = {
      level: 1,
      code: 'tier1',
      name: 'Tier 1: Foundational Stage',
      thai: 'ระดับสร้างพื้นฐาน (ยังไม่ผ่านเกณฑ์ 5/10)',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800'
    };
  } else if (maxStat >= 8 && minStat >= 5) {
    competencyTier = {
      level: 4,
      code: 'tier4',
      name: 'Tier 4: Master Benchmark',
      thai: 'ระดับเชี่ยวชาญพิเศษ (ต้นแบบองค์กร)',
      badgeColor: 'text-emerald-300 bg-emerald-950/60 border-emerald-800'
    };
  } else if (maxStat >= 7 || (maxStat >= 6 && minStat >= 4)) {
    competencyTier = {
      level: 3,
      code: 'tier3',
      name: 'Tier 3: Proficient Specialist',
      thai: 'ระดับชำนาญการเฉพาะทาง',
      badgeColor: 'text-indigo-300 bg-indigo-950/60 border-indigo-800'
    };
  }

  // --- Dynamic Strengths Calculation (Eliminating False Strengths) ---
  let dynamicStrengthLabel;
  let dynamicStrengthColor;
  let dynamicStrength;

  if (maxStat < 5) {
    dynamicStrengthLabel = 'สถานะสมรรถนะ:';
    dynamicStrengthColor = 'text-amber-400';
    const topStat = sortedStats[0];
    const topStatName = STAT_DEFINITIONS[topStat[0]]?.name || topStat[0].toUpperCase();
    dynamicStrength = `อยู่ระหว่างสร้างสมรรถนะพื้นฐาน (ทุกค่าต่ำกว่าเกณฑ์มาตรฐาน 5/10) ยังไม่มีจุดเด่นระดับปฏิบัติการอิสระ${topStat[1] >= 3 ? ` • ศักยภาพเริ่มต้นที่พอมีแววเพื่อใช้เป็นจุดตั้งต้นในการพัฒนา: ${topStatName} (${topStat[1]}/10)` : ''}`;
  } else if (signatureStrengths.length === 0) {
    if (minStat >= 4 && maxStat <= 5) {
      dynamicStrengthLabel = 'ระดับสมรรถนะพื้นฐาน:';
      dynamicStrengthColor = 'text-sky-300';
      dynamicStrength = 'ทักษะผ่านเกณฑ์การทำงานทั่วไปตามมาตรฐานองค์กร (Baseline 5/10) ครบทุกมิติ แต่ยังไม่มีทักษะโดดเด่นเฉพาะทาง (Spike Skill) แนะนำให้ค้นหาความถนัดเพื่อเลือกสายทางเฉพาะด้าน';
    } else {
      dynamicStrengthLabel = 'สมรรถนะระดับปฏิบัติการ (5-6):';
      dynamicStrengthColor = 'text-emerald-400';
      dynamicStrength = standardPass.map(s => `${s.name} (${s.val}/10)`).join(', ') + ' — ปฏิบัติงานตามกรอบมาตรฐานได้ครบถ้วน';
    }
  } else {
    if (maxStat >= 8) {
      dynamicStrengthLabel = 'จุดเด่นระดับเชี่ยวชาญพิเศษ (≥ 8):';
      dynamicStrengthColor = 'text-emerald-300 font-bold';
    } else {
      dynamicStrengthLabel = 'จุดเด่นประจำตัว (≥ 7):';
      dynamicStrengthColor = 'text-emerald-400 font-bold';
    }
    dynamicStrength = signatureStrengths.map(s => `${s.name} (${s.val}/10: ${s.desc})`).join(' | ');
  }

  // --- Action Playbook for Managers (The 4-Box Talent Action Framework) ---
  let actionPlaybook = {
    type: 'specialize',
    title: 'ส่งเสริมการสร้างความเชี่ยวชาญเฉพาะด้าน (Specialization Track)',
    tag: 'ค้นหาความถนัด',
    color: 'text-sky-400 border-sky-700 bg-sky-950/30',
    desc: 'มอบหมายงานหรือโปรเจกต์ที่หลากหลาย เพื่อให้ค้นพบทักษะที่ตนเองสนใจและถนัดที่สุด พัฒนาจาก Generalist สู่ Specialist',
    question: 'งานประเภทไหนที่ทำแล้วรู้สึกท้าทายและอยากพัฒนาให้เก่งขึ้นเป็นพิเศษ?'
  };

  if (maxStat < 5) {
    actionPlaybook = {
      type: 'mentor',
      title: 'ประกบดูแลแบบ OJT รายวัน (Daily Mentoring & Supervision)',
      tag: 'ประกบดูแลเร่งด่วน',
      color: 'text-amber-400 border-amber-700 bg-amber-950/30',
      desc: 'เน้นการสอนงานแบบ Step-by-Step มอบหมายงานที่มี Checklist ชัดเจน และมีพี่เลี้ยงตรวจทานความถูกต้องก่อนส่งมอบ',
      question: 'ขั้นตอนการทำงานส่วนไหนที่รู้สึกติดขัดหรือไม่มั่นใจที่สุด อยากให้หัวหน้าช่วยแนะนำตรงไหนเป็นพิเศษ?'
    };
  } else if (maxStat >= 7 && minStat <= 3) {
    actionPlaybook = {
      type: 'pairing',
      title: 'ใช้จุดแข็งนำ & จัดคู่บัดดี้ปิดจุดบอด (Pairing & Shielding)',
      tag: 'จับคู่เสริมทัพ',
      color: 'text-purple-400 border-purple-700 bg-purple-950/30',
      desc: 'มอบหมายงานที่ได้ใช้จุดแข็งขั้นสูงอย่างเต็มที่ และจัดทีมคู่หูช่วยเสริมในส่วนที่เป็นจุดอ่อน ไม่ปล่อยให้รับผิดชอบจุดบอดคนเดียว',
      question: 'จะดึงจุดเด่นของตัวเองมาแก้ปัญหาในงานนี้ได้อย่างไร และอยากให้ใครมาช่วยสนับสนุนส่วนงานเอกสาร/ประสานงาน?'
    };
  } else if (maxStat >= 8 && minStat >= 5) {
    actionPlaybook = {
      type: 'delegate',
      title: 'มอบหมายงานอิสระ & เป็นพี่เลี้ยงถ่ายทอดความรู้ (Delegation & SME)',
      tag: 'ส่งต่อองค์ความรู้',
      color: 'text-emerald-400 border-emerald-700 bg-emerald-950/30',
      desc: 'ให้อิสระในการตัดสินใจวางแผนงาน ยกระดับให้เป็น Role Model และมอบหมายให้เป็นพี่เลี้ยงสอนงานสมาชิกรุ่นน้องในทีม',
      question: 'มีกระบวนการหรือนวัตกรรมใดที่คิดว่าสามารถนำมาปรับปรุงระบบงานของทั้งแผนกให้ดียิ่งขึ้นได้บ้าง?'
    };
  } else if (signatureStrengths.length > 0) {
    actionPlaybook = {
      type: 'empower',
      title: 'ต่อยอดทักษะหลักสู่ความเป็นเลิศ (Core Skill Deepening)',
      tag: 'ผลักดันสู่ยอดฝีมือ',
      color: 'text-indigo-400 border-indigo-700 bg-indigo-950/30',
      desc: 'สนับสนุนให้ขยายขอบเขตความรับผิดชอบในทักษะเด่น พร้อมพัฒนาจุดสนับสนุนให้แตะระดับมาตรฐานอย่างต่อเนื่อง',
      question: 'คิดว่าจะนำจุดแข็งที่มีไปช่วยยกระดับเป้าหมายและผลงานของทีมในไตรมาสนี้ได้อย่างไร?'
    };
  }

  const roleFitPct = calculateRoleFit(statsObj, roleProfile);
  const statInteractions = STAT_INTERACTION_RULES.filter(rule => rule.check(statsObj));
  const subInsights = analyzeSubCriteria(u, rubricsData);

  return {
    rawStats,
    sortedStats,
    maxStat,
    minStat,
    mainStyle,
    enTitle,
    thTitle,
    prefixText: prefix.trim(),
    identityText,
    styleDesc,
    archetypeKey,
    archObj,
    dynamicWeakness,
    weaknessLabel,
    weaknessColor,
    universalBaseline: UNIVERSAL_BASELINE,
    roleProfile,
    signatureStrengths,
    standardPass,
    considerations,
    competencyTier,
    dynamicStrengthLabel,
    dynamicStrengthColor,
    dynamicStrength,
    actionPlaybook,
    roleFitPct,
    statInteractions,
    subInsights
  };
};

export const STAT_INTERACTION_RULES = [
  {
    pair: 'agi_dex',
    check: (s) => (s.agi >= 6 && s.dex <= 4),
    title: 'เร็วแต่งานอาจหลุดมาตรฐาน (Rapid but Prone to Rework)',
    desc: 'มีความรวดเร็วในการเข้าถึงงานสูง (AGI) แต่ความละเอียดรอบคอบยังตามไม่ทัน (DEX) เสี่ยงต่องานซ่อมซ้ำหรือเอกสารตีกลับ',
    coaching: 'เน้นให้หยุดตรวจทานงาน (Self-Check 2 นาทีก่อนปิดเคส) ไม่รีบปิดงานจนขาดความประณีต'
  },
  {
    pair: 'dex_agi',
    check: (s) => (s.dex >= 6 && s.agi <= 4),
    title: 'ประณีตแต่งานอาจชะลอตัว (High Precision, Pace Gap)',
    desc: 'คุณภาพงานละเอียดถูกต้องสูงมาก (DEX) แต่ความเร็วและการปรับตัวยังช้า (AGI) เสี่ยงต่อการหลุดกรอบ SLA เมื่องานชุก',
    coaching: 'ช่วยจัดลำดับความสำคัญ แนะนำว่างานส่วนใดต้องการความประณีต 100% และส่วนใดต้องการความรวดเร็วตามกรอบเวลา'
  },
  {
    pair: 'str_con',
    check: (s) => (s.str >= 6 && s.con <= 4),
    title: 'ลุยแรงแต่หมดพลังไว (High Drive, Stamina Vulnerability)',
    desc: 'พลังขับเคลื่อนในการตัดสินใจลุยงานสูง (STR) แต่ความทรหดต่อแรงกดดันสะสมยังเปราะบาง (CON) เสี่ยงต่ออาการ Burnout',
    coaching: 'ควบคุมการกระจายงานไม่ให้ลุยเดี่ยวจนหมดแรง ส่งเสริมการผ่อนคลายและดูแลสภาวะอารมณ์'
  },
  {
    pair: 'con_str',
    check: (s) => (s.con >= 6 && s.str <= 4),
    title: 'ทนทานมั่นคงแต่งานเชิงรุกยังชะลอ (Steady Resilience, Low Initiative)',
    desc: 'อึด ทน นิ่งต่อแรงกดดันได้ดีเยี่ยม (CON) แต่งานเชิงรุกและการตัดสินใจลุยยังขาดพลังผลักดัน (STR)',
    coaching: 'กระตุ้นความมั่นใจในการกล้าตัดสินใจแก้ปัญหาหน้างาน โดยหัวหน้าคอยเป็นแนวหลังสนับสนุน'
  },
  {
    pair: 'int_sen',
    check: (s) => (s.int >= 6 && s.sen <= 4),
    title: 'ตรรกะระบบเป๊ะแต่การสื่อสารอาจแข็งกร้าว (System Logic, Empathy Gap)',
    desc: 'คิดวิเคราะห์เชิงระบบและใช้เทคโนโลยีเก่ง (INT) แต่มุมมองจิตวิทยาผู้คนและการสื่อสารยังแข็ง (SEN) เสี่ยงต่อข้อขัดแย้งกับลูกบ้าน',
    coaching: 'ฝึกการใช้ Soft Skills และ Empathy ในการพูดคุย รับฟังความรู้สึกของคู่สนทนาก่อนอธิบายเหตุผลและข้อเท็จจริง'
  },
  {
    pair: 'sen_str',
    check: (s) => (s.sen >= 6 && s.str <= 4),
    title: 'เข้าอกเข้าใจคนสูงแต่ไม่เด็ดขาด (Empathetic Diplomat, Reluctant Decision)',
    desc: 'รับฟังและประสานงานผู้คนได้ราบรื่น (SEN) แต่ขาดความเด็ดขาดในการตัดบทหรือยืนหยัดตามระเบียบ (STR)',
    coaching: 'ฝึกทักษะการปฏิเสธอย่างสุภาพ (Assertive Communication) ไม่ยอมตามใจลูกบ้านหรือผู้รับเหมาจนกระทบมาตรฐาน'
  },
  {
    pair: 'int_dex',
    check: (s) => (s.int >= 6 && s.dex <= 4),
    title: 'เข้าใจหลักการแต่ขาดความแม่นยำหน้างาน (Theoretical Knowledge, Hands-on Deficit)',
    desc: 'วางแผนและเข้าใจระบบดิจิทัลได้ดี (INT) แต่งานช่างจริงหรือการตรวจงานภาคสนามยังมีความคลาดเคลื่อน (DEX)',
    coaching: 'ให้ลงมือปฏิบัติจริงคู่กับช่างผู้มีประสบการณ์ เพื่อแปลงความเข้าใจเชิงทฤษฎีสู่ความแม่นยำทางปฏิบัติ'
  },
  {
    pair: 'dex_int',
    check: (s) => (s.dex >= 6 && s.int <= 4),
    title: 'ช่างฝีมือประณีตแต่ยังไม่คล่องระบบดิจิทัล (Master Craftsman, Digital Gap)',
    desc: 'ฝีมือช่างและการลงมือทำละเอียดถูกต้องสูง (DEX) แต่การใช้งาน Taskflow และการจัดการข้อมูลเชิงระบบยังช้า (INT)',
    coaching: 'สอนใช้งาน Taskflow แบบ Step-by-Step มอบหมายคู่หูคอยประกบด้านการบันทึกระบบ'
  },
  {
    pair: 'str_sen',
    check: (s) => (s.str >= 6 && s.sen <= 4),
    title: 'เด็ดขาดลุยงานแต่ขาดความนุ่มนวล (Direct Commander, Blunt Delivery)',
    desc: 'ตัดสินใจรวดเร็ว งานเดินหน้าได้ดั่งใจ (STR) แต่วิธีการพูดคุยหรือการเจรจาอาจตรงเกินไปจนคู่สนทนารู้สึกกดดัน (SEN)',
    coaching: 'แนะนำศิลปะการสื่อสารแบบประนีประนอม และให้ระมัดระวังคำพูดในสถานการณ์ที่ลูกบ้านกำลังตึงเครียด'
  },
  {
    pair: 'sen_int',
    check: (s) => (s.sen >= 6 && s.int <= 4),
    title: 'มนุษยสัมพันธ์ดีเด่นแต่การวางระบบยังไม่เป็นขั้นตอน (People Person, Process Gap)',
    desc: 'ลูกบ้านรัก เพื่อนร่วมงานชอบ (SEN) แต่การวางแผนงานเชิงระบบ การทำ PM และการติดตามสถิติยังไม่เป็นระบบ (INT)',
    coaching: 'ช่วยสร้าง Checklist และตารางเวลาทำงานที่ชัดเจนเพื่อไม่ให้หลงลืมงานเชิงกระบวนการ'
  }
];

export const calculateRoleFit = (statsObj, roleProfile) => {
  if (!roleProfile || !roleProfile.targetStats) return 100;
  let weightedSum = 0;
  let totalWeight = 0;
  
  STAT_KEYS.forEach(k => {
    const val = Number(statsObj[k]) || 5;
    const target = Number(roleProfile.targetStats[k]) || 6;
    const isCore = (roleProfile.coreFocus || []).includes(k);
    const weight = isCore ? 2 : 1;
    const ratio = Math.min(val / target, 1.2);
    weightedSum += ratio * weight;
    totalWeight += weight;
  });
  
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 100;
};

export const analyzeSubCriteria = (staff, rubrics = rubricsData) => {
  let innerScores = staff?.innerScores || staff?.subScores;
  if (!innerScores || typeof innerScores !== 'object') {
    innerScores = {};
    STAT_KEYS.forEach(k => {
      const v = Math.min(Math.max(Math.round(Number(staff?.[k]) || 5), 1), 10);
      innerScores[k] = [v, v, v];
    });
  }
  
  const subInsights = [];
  STAT_KEYS.forEach(k => {
    let list = innerScores[k];
    if (!Array.isArray(list) || list.length !== 3) {
      const v = Math.min(Math.max(Math.round(Number(staff?.[k]) || 5), 1), 10);
      list = [v, v, v];
    }
    const minVal = Math.min(...list);
    const maxVal = Math.max(...list);
    const diff = maxVal - minVal;
    
    const statRubrics = rubrics[k] || [];
    const minIdx = list.indexOf(minVal);
    const maxIdx = list.lastIndexOf(maxVal);
    
    const minCriterion = statRubrics[minIdx] || statRubrics[0];
    const maxCriterion = statRubrics[maxIdx] || statRubrics[0];
    
    const minLevelDesc = minCriterion?.levels?.[String(minVal)] || '';
    const minNextLevelDesc = minCriterion?.levels?.[String(Math.min(minVal + 1, 10))] || '';
    const maxLevelDesc = maxCriterion?.levels?.[String(maxVal)] || '';

    const corpDef = STAT_DEFINITIONS[k]?.corporate;
    
    subInsights.push({
      statKey: k,
      statName: STAT_DEFINITIONS[k]?.name || k.toUpperCase(),
      corporateName: corpDef?.name || k.toUpperCase(),
      corporateThai: corpDef?.thai || '',
      scores: list,
      minVal,
      maxVal,
      variance: diff,
      hasVariance: diff >= 2,
      lowestCriterionLabel: minCriterion?.label || `เกณฑ์ย่อยที่ ${minIdx + 1}`,
      highestCriterionLabel: maxCriterion?.label || `เกณฑ์ย่อยที่ ${maxIdx + 1}`,
      currentBehaviorText: minLevelDesc,
      nextGrowthBehaviorText: minNextLevelDesc,
      strengthBehaviorText: maxLevelDesc
    });
  });
  
  return subInsights;
};

export const generateHeuristicTalentDiagnostic = (staff, sets = {}, archetypesData = defaultArchetypesData, roleInput = null, options = {}) => {
  const analysis = analyzeArchetype(staff, sets, archetypesData, roleInput);
  if (!analysis) return null;

  const { 
    roleProfile, 
    competencyTier, 
    dynamicStrength, 
    actionPlaybook, 
    signatureStrengths, 
    considerations, 
    roleFitPct = 100, 
    statInteractions = [], 
    subInsights = null,
    archetypeKey = 'generalist',
    mainStyle = 'Specialist'
  } = analysis;

  const statsObj = {
    str: Number(staff.str) || 5,
    agi: Number(staff.agi) || 5,
    dex: Number(staff.dex) || 5,
    int: Number(staff.int) || 5,
    con: Number(staff.con) || 5,
    sen: Number(staff.sen) || 5
  };

  const outerAnalysis = analyzeOuterLayer(staff, statsObj, options?.telemetry ? options : { telemetry: staff?.telemetry });

  const staffName = staff.name || 'พนักงาน';
  const roleName = roleProfile.name || 'เจ้าหน้าที่ปฏิบัติการ';

  // Corporate Persona & Tier translation
  const corporatePersona = getCorporateArchetypePersona(archetypeKey, mainStyle);
  const corporateTierName = competencyTier.level === 4
    ? 'Tier 4: Benchmark Role Model (ระดับต้นแบบองค์กร)'
    : competencyTier.level === 3
    ? 'Tier 3: Advanced Professional (ระดับชำนาญการเฉพาะทาง)'
    : competencyTier.level === 2
    ? 'Tier 2: Standard Competent (ระดับมาตรฐานการทำงาน)'
    : 'Tier 1: Developing Associate (ระดับพัฒนาสมรรถนะ)';

  // 1. Overall Verdict (Personalized with Role-Fit & Primary Work Style)
  let overallVerdict;
  if (competencyTier.level === 4) {
    overallVerdict = `${staffName} แสดงความพร้อมต่อบทบาท ${roleName} สูงถึง ${roleFitPct}% จัดอยู่ในระดับต้นแบบขององค์กร (Benchmark) มีทักษะหลักโดดเด่นสมบูรณ์แบบ สามารถปฏิบัติงานได้อย่างอิสระและเป็นเสาหลักถ่ายทอดองค์ความรู้ให้ทีม`;
  } else if (competencyTier.level === 3) {
    overallVerdict = `${staffName} มีความพร้อมต่อบทบาท ${roleName} อยู่ที่ ${roleFitPct}% จัดอยู่ในระดับชำนาญการเฉพาะทาง มีจุดแข็งชัดเจนในการขับเคลื่อนงาน ผลงานมีความเสถียรและพร้อมพัฒนาสู่การเป็นพี่เลี้ยง`;
  } else if (competencyTier.level === 2) {
    overallVerdict = `${staffName} มีความพร้อมต่อบทบาท ${roleName} อยู่ที่ ${roleFitPct}% ทักษะผ่านเกณฑ์มาตรฐานการทำงานพื้นฐาน (Universal Baseline 5/10) ครบทุกมิติ แต่ยังไม่มีทักษะโดดเด่นเฉพาะทาง (Spike Skill) แนะนำให้หัวหน้าช่วยกำหนดทิศทางเพื่อสร้างความเชี่ยวชาญ`;
  } else {
    overallVerdict = `${staffName} กำลังอยู่ในช่วงสร้างสมรรถนะพื้นฐาน (ความพร้อมต่อบทบาท ${roleName}: ${roleFitPct}%) สเตตัสส่วนใหญ่ยังไม่ผ่านเกณฑ์มาตรฐานการทำงานอิสระ 5/10 จำเป็นต้องมีระบบพี่เลี้ยง OJT ประกบดูแลและตรวจสอบอย่างใกล้ชิด`;
  }

  // 2. Verified Strengths (Anchored with Sub-criteria rubric if available)
  let verifiedStrengths = dynamicStrength;
  let primaryBarsStrength = null;
  if (subInsights && subInsights.length > 0) {
    const highestSub = [...subInsights].sort((a, b) => b.maxVal - a.maxVal)[0];
    if (highestSub && highestSub.strengthBehaviorText) {
      primaryBarsStrength = {
        statName: highestSub.statName,
        corporateName: highestSub.corporateName,
        criterionLabel: highestSub.highestCriterionLabel,
        level: highestSub.maxVal,
        behaviorText: highestSub.strengthBehaviorText
      };
      if (highestSub.maxVal >= 6) {
        verifiedStrengths += `\n▶ พฤติกรรมเด่นเชิงประจักษ์ (BARS Level ${highestSub.maxVal}): ด้าน「${highestSub.highestCriterionLabel}」\n"${highestSub.strengthBehaviorText}"`;
      }
    }
  }

  // 3. Operational Risks (Combined with Interaction rules & Lowest Sub-criterion BARS)
  const riskLines = [];
  let primaryBarsDevelopment = null;
  if (subInsights && subInsights.length > 0) {
    const lowestSub = [...subInsights].sort((a, b) => a.minVal - b.minVal)[0];
    if (lowestSub && lowestSub.currentBehaviorText && lowestSub.minVal <= 5) {
      primaryBarsDevelopment = {
        statName: lowestSub.statName,
        corporateName: lowestSub.corporateName,
        criterionLabel: lowestSub.lowestCriterionLabel,
        level: lowestSub.minVal,
        behaviorText: lowestSub.currentBehaviorText
      };
      riskLines.push(`• จุดที่ต้องการการสนับสนุนเชิงพฤติกรรม (BARS Level ${lowestSub.minVal}): ด้าน「${lowestSub.lowestCriterionLabel}」\n"${lowestSub.currentBehaviorText}"`);
    }
  }

  if (considerations.length > 0) {
    considerations.forEach(c => {
      riskLines.push(`• ${c.name} (${c.val}/10): ${c.advice}`);
    });
  } else if (!primaryBarsDevelopment) {
    riskLines.push('• สเตตัสหลักทุกด้านผ่านเกณฑ์มาตรฐานองค์กร (≥ 5/10)');
  }

  // Add stat interaction nuances if found
  if (statInteractions.length > 0) {
    statInteractions.forEach(inter => {
      riskLines.push(`⚠️ ความไม่สมดุลคู่ทักษะ (${inter.title}): ${inter.desc}`);
    });
  }

  // Add Outer Layer Can-Do vs Will-Do gap if assessed
  if (outerAnalysis?.isAssessed && outerAnalysis.gapInsights?.length > 0) {
    outerAnalysis.gapInsights.forEach(gi => {
      riskLines.push(`⚡ มิติผลงานหน้างาน (${gi.name}): ${gi.text}`);
    });
  } else if (outerAnalysis && !outerAnalysis.isAssessed) {
    riskLines.push('ℹ️ สมรรถนะหน้างาน 6 แกน (The Outer Layer): ยังไม่ได้รับการประเมินผลงานจริง ควรทำแบบประเมินต่อเพื่อวิเคราะห์ความสอดคล้องระหว่างศักยภาพกับผลสัมฤทธิ์');
  }

  const operationalRisks = riskLines.join('\n');

  // 4. Manager Action Plan
  let managerActionPlan = `${actionPlaybook.title}\n▶ ${actionPlaybook.desc}`;
  if (statInteractions.length > 0) {
    managerActionPlan += `\n▶ จุดเน้นพิเศษ: ${statInteractions[0].coaching}`;
  }

  // 5. Tailored 1-on-1 Coaching Questions
  const coachingQuestions = [actionPlaybook.question];
  if (statInteractions.length > 0) {
    coachingQuestions.push(`สังเกตเห็นว่าคุณมีจุดเด่นและจุดที่กำลังพัฒนาควบคู่กัน มีขั้นตอนหรือเครื่องมือใดที่คิดว่าจะช่วยลดข้อผิดพลาดในเคสที่ต้องใช้ทั้งสองด้านนี้พร้อมกัน?`);
  } else if (subInsights && subInsights.length > 0) {
    const targetSub = subInsights.find(s => s.hasVariance);
    if (targetSub) {
      coachingQuestions.push(`ในด้าน ${targetSub.statName} คุณทำ「${targetSub.highestCriterionLabel}」ได้ดีมาก อะไรคือเคล็ดลับ และคิดว่าจะนำมาปรับใช้กับ「${targetSub.lowestCriterionLabel}」ได้อย่างไร?`);
    } else {
      coachingQuestions.push(`ในการปฏิบัติงานสัปดาห์ที่ผ่านมา มีเคสหรือปัญหาใดที่ทำให้รู้สึกว่าต้องใช้ทักษะพิเศษในการแก้ไขมากที่สุด?`);
    }
  } else {
    coachingQuestions.push(`ในการปฏิบัติงานสัปดาห์ที่ผ่านมา มีเคสหรือปัญหาใดที่ทำให้รู้สึกว่าต้องใช้ทักษะพิเศษในการแก้ไขมากที่สุด?`);
  }

  // 6. Next Growth Milestone (Explicit BARS N+1 text)
  let nextGrowthMilestone = '';
  let primaryBarsNextMilestone = null;
  if (subInsights && subInsights.length > 0) {
    const targetSub = subInsights.find(s => s.minVal <= 5) || [...subInsights].sort((a, b) => a.minVal - b.minVal)[0];
    if (targetSub && targetSub.nextGrowthBehaviorText) {
      const targetLvl = Math.min(targetSub.minVal + 1, 10);
      primaryBarsNextMilestone = {
        statName: targetSub.statName,
        corporateName: targetSub.corporateName,
        criterionLabel: targetSub.lowestCriterionLabel,
        targetLevel: targetLvl,
        behaviorText: targetSub.nextGrowthBehaviorText
      };
      nextGrowthMilestone = `ยกระดับทักษะ ${targetSub.statName} (${targetSub.corporateName}) ในด้าน「${targetSub.lowestCriterionLabel}」จากระดับ ${targetSub.minVal} สู่เป้าหมายถัดไป (Level ${targetLvl}):\n"${targetSub.nextGrowthBehaviorText}" (ภายใน 30-60 วัน)`;
    }
  }

  if (!nextGrowthMilestone) {
    nextGrowthMilestone = competencyTier.level === 1
      ? `ยกระดับสเตตัสในแกนวิกฤต (${considerations[0]?.name || 'งานพื้นฐาน'}) ให้แตะเกณฑ์มาตรฐาน 5/10 ภายใน 30-60 วัน โดยเน้นการปฏิบัติตาม Job Checklist รายวัน`
      : competencyTier.level === 2
      ? `เลือกทักษะที่สนใจ 1-2 ด้าน (เช่น ${roleProfile.coreFocus.slice(0, 2).map(k => k.toUpperCase()).join(', ')}) เพื่อผลักดันให้แตะระดับชำนาญการ (≥ 7/10) ภายใน 60 วัน`
      : competencyTier.level === 3
      ? `ถ่ายทอดทักษะจุดแข็ง (${signatureStrengths.map(s => s.name).join(', ')}) สู่เพื่อนร่วมทีม และปิดจุดสนับสนุน (${considerations[0]?.name || 'ส่วนประสานงาน'}) ให้แตะมาตรฐาน 5/10`
      : `พัฒนาหลักสูตรหรือ Best Practice หน้างานของสายงาน ${roleName} เพื่อส่งต่อองค์ความรู้และขยายผลทั่วทั้งโครงการ`;
  }

  return {
    overallVerdict,
    competencyTier: `${competencyTier.name} (${competencyTier.thai})`,
    corporateTierName,
    tierLevel: competencyTier.level,
    roleFitPct,
    verifiedStrengths,
    operationalRisks,
    managerActionPlan,
    coachingQuestions,
    nextGrowthMilestone,
    primaryBarsStrength,
    primaryBarsDevelopment,
    primaryBarsNextMilestone,
    subInsights,
    corporatePersona,
    mainStyle,
    archetypeKey,
    source: 'engine',
    isOuterAssessed: outerAnalysis?.isAssessed || false
  };
};

export const analyzeRadarMorphology = (statsObj = {}) => {
  const keys = ['str', 'agi', 'dex', 'int', 'con', 'sen'];
  const values = keys.map(k => Math.min(Math.max(Number(statsObj[k]) || 5, 1), 10));
  
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / 6;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 6;
  const stdDev = Math.sqrt(variance);
  
  const sorted = keys.map((k, i) => ({ key: k, val: values[i] })).sort((a, b) => b.val - a.val);
  const maxVal = sorted[0].val;
  const minVal = sorted[5].val;
  const gap = maxVal - minVal;

  // Radar Area Coverage in polar coords (equilateral 60 deg slices)
  let areaSum = 0;
  for (let i = 0; i < 6; i++) {
    areaSum += values[i] * values[(i + 1) % 6];
  }
  const area = 0.5 * (Math.sqrt(3) / 2) * areaSum;
  const maxArea = 0.5 * (Math.sqrt(3) / 2) * 600;
  const coveragePct = Math.min(100, Math.round((area / maxArea) * 100));

  let shapeKey = 'irregular';
  let shapeName = 'ทรงเฉพาะกิจ (Dynamic Polygon)';
  let shapeDesc = 'มีทิศทางการเติบโตที่เป็นเอกลักษณ์ตามภารกิจที่รับผิดชอบ';
  let managementAdvice = 'จัดสรรงานตามจุดยอดที่ยื่นสูง และประกบพี่เลี้ยงในจุดที่เว้าต่ำ';
  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';

  if (maxVal === minVal) {
    shapeKey = 'concentric';
    shapeName = `ทรงหกเหลี่ยมสมมาตร (${maxVal}/10)`;
    shapeDesc = `สเตตัสเท่ากันทุกมิติที่ระดับ ${maxVal} เป็นรูปทรงสมดุล 100%`;
    managementAdvice = maxVal >= 7 ? 'เป็นเสาหลักที่ไว้ใจได้ในทุกสถานการณ์ ไร้จุดบอด' : 'เน้นการพัฒนาเสริมทักษะเฉพาะทางเพื่อสร้างจุดเด่น';
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (gap >= 5 && minVal <= 3) {
    shapeKey = 'hourglass';
    shapeName = 'ทรงคอดกิ่ว / จุดบอดลึก (Hourglass Gap)';
    shapeDesc = `มีมิติที่พุ่งสูง (${sorted[0].key.toUpperCase()} ${maxVal}) แต่มีจุดบอดวิกฤต (${sorted[5].key.toUpperCase()} ${minVal}) ที่เว้าลึกอย่างเห็นได้ชัด`;
    managementAdvice = '⚠️ ห้ามมอบหมายงานเดี่ยวที่ต้องอาศัยจุดบอดนี้เด็ดขาด ต้องมีทีมหรือคู่หูประกบอุดช่องโหว่ทันที';
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (stdDev < 1.3 && mean >= 6.5) {
    shapeKey = 'full_hexagon';
    shapeName = 'ทรงหกเหลี่ยมสมบูรณ์ (All-Round Pillar)';
    shapeDesc = 'ใยแมงมุมแผ่ขยายกว้างรอบทิศทางอย่างมั่นคง มีความพร้อมรอบด้านในระดับสูง';
    managementAdvice = 'เหมาะสำหรับบทบาทผู้ประสานงานหลักของทีม หรือผู้นำที่ต้องดูแลภาพรวมในทุกมิติ';
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (maxVal <= 5 && minVal >= 4) {
    shapeKey = 'compact_core';
    shapeName = 'ทรงแกนกลางมาตรฐาน (Standard Core)';
    shapeDesc = 'รูปทรงเกาะกลุ่มรอบมาตรฐานขั้นต้น (5/10) ยังไม่มีมิติใดที่ฉีกเด่นชัดเจน';
    managementAdvice = 'ควรวางแผน Career Path ให้ทดลองงานหลากหลาย เพื่อค้นหา "จุดแข็งเฉพาะตัว" 1-2 ด้าน';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (maxVal <= 4) {
    shapeKey = 'contracted';
    shapeName = 'ทรงหดตัว (Under-developed Core)';
    shapeDesc = 'สเตตัสทุกด้านยังอยู่ต่ำกว่าเกณฑ์มาตรฐานขั้นต้น ต้องการการฟื้นฟูโดยด่วน';
    managementAdvice = 'ต้องมีพี่เลี้ยงดูแลใกล้ชิด และจัดอบรม (OJT) เพื่อยกระดับทักษะพื้นฐานให้ถึงเกณฑ์มาตรฐาน';
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (sorted.filter(s => s.val >= 7).length === 3) {
    shapeKey = 'tri_force';
    shapeName = 'ทรงสามเหลี่ยมผสาน (Tri-Force Prism)';
    shapeDesc = `รูปทรงสามเหลี่ยมเด่น 3 มิติ (${sorted.slice(0, 3).map(s => s.key.toUpperCase()).join(' - ')}) ที่เสริมแรงกันเป็นฐานค้ำยัน`;
    managementAdvice = 'มอบหมายโปรเจกต์ที่ต้องผสมผสานทั้งสามทักษะนี้ จะสร้างผลลัพธ์ที่ทรงพลังที่สุด';
    badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (sorted.filter(s => s.val >= 8).length <= 2 && sorted.filter(s => s.val >= 8).length >= 1) {
    shapeKey = 'spearhead';
    shapeName = 'ทรงหัวหอกทะลวง (Spearhead Delta)';
    shapeDesc = `มียอดแหลมพุ่งเด่นอย่างทรงพลังในด้าน ${sorted[0].key.toUpperCase()} (${maxVal}/10) เป็นท่าไม้ตายเฉพาะตัว`;
    managementAdvice = 'ใช้เป็น "มือสังหาร/ตัวจบงาน" ในสถานการณ์ที่ต้องอาศัยทักษะจุดนี้เป็นตัวตัดสิน';
    badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
  }

  const vectorNames = {
    str: 'พลังขับเคลื่อน (STR)',
    agi: 'ความไวตอบสนอง (AGI)',
    dex: 'ความแม่นยำประณีต (DEX)',
    int: 'เทคโนโลยีระบบ (INT)',
    con: 'ความทนทานอารมณ์ (CON)',
    sen: 'การเจรจาจิตวิทยา (SEN)'
  };
  const top2Names = [vectorNames[sorted[0].key], vectorNames[sorted[1].key]].join(' และ ');

  return {
    values,
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    maxVal,
    minVal,
    gap,
    coveragePct,
    shapeKey,
    shapeName,
    shapeDesc,
    managementAdvice,
    badgeColor,
    topFocus: top2Names,
    sorted
  };
};

export const OUTER_KEYS = ['cx', 'tech', 'sla', 'crisis', 'resource', 'innovation'];

export const OUTER_DEFINITIONS = {
  cx: {
    key: 'cx',
    name: 'Customer Exp.',
    fullName: 'Customer Experience & Empathy',
    thai: 'การรับมือลูกบ้านและศิลปะการประสานงาน',
    desc: 'รับมือกับอารมณ์ร้อนที่ได้รับ พูดคุยทั่วไป นัดหมาย และอธิบายขั้นตอนการทำงานอย่างมืออาชีพ',
    color: 'text-pink-500',
    bg: 'bg-pink-500',
    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
    formulaDesc: '(CON + SEN) / 2',
    calc: (s) => Math.round(((Number(s?.con) || 5) + (Number(s?.sen) || 5)) / 2)
  },
  tech: {
    key: 'tech',
    name: 'Tech. Expertise',
    fullName: 'Technical Diagnosis & Facility Standards',
    thai: 'การวินิจฉัยเชิงช่างและมาตรฐานสาธารณูปโภค',
    desc: 'ทักษะงานซ่อมสาธารณูปโภค และตรวจการงานก่อนส่งงานให้ผู้บังคับบัญชา',
    color: 'text-blue-500',
    bg: 'bg-blue-500',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    formulaDesc: '(INT + DEX) / 2',
    calc: (s) => Math.round(((Number(s?.int) || 5) + (Number(s?.dex) || 5)) / 2)
  },
  sla: {
    key: 'sla',
    name: 'Ops & SLA',
    fullName: 'Operational Discipline & SLA Speed',
    thai: 'วินัยเวลา ความรวดเร็ว และการปิดใบงาน',
    desc: 'ตรงต่อเวลานัดหมาย ดำเนินการแต่ละกรณีอย่างรวดเร็ว ไม่ปล่อยสถานะรอใบงานค้าง บันทึกและปิดงานในระบบ Taskflow',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    formulaDesc: '(AGI + DEX) / 2',
    calc: (s) => Math.round(((Number(s?.agi) || 5) + (Number(s?.dex) || 5)) / 2)
  },
  crisis: {
    key: 'crisis',
    name: 'Crisis Resolv.',
    fullName: 'Emergency Response & Crisis Mastery',
    thai: 'การดำเนินการฉุกเฉินในพื้นที่สาธารณูปโภคในโครงการ',
    desc: 'การดำเนินการฉุกเฉินในพื้นที่สาธารณูปโภคในโครงการ เช่น ท่อเมนแตก ปั๊มน้ำดับทั้งโครงการ ไฟดับทั้งซอย',
    color: 'text-rose-500',
    bg: 'bg-rose-500',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    formulaDesc: '(STR + CON) / 2',
    calc: (s) => Math.round(((Number(s?.str) || 5) + (Number(s?.con) || 5)) / 2)
  },
  resource: {
    key: 'resource',
    name: 'Resource Ctrl.',
    fullName: 'Cost, Contractor & Material Stewardship',
    thai: 'การบริหารงบประมาณ ผู้รับเหมา และอะไหล่',
    desc: 'ควบคุมงบซ่อมแซม ตรวจรับงานผู้รับเหมา ควบคุมคลังอะไหล่ส่วนกลาง ไม่ให้งบรั่วไหล',
    color: 'text-amber-500',
    bg: 'bg-amber-500',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    formulaDesc: '(STR + SEN) / 2',
    calc: (s) => Math.round(((Number(s?.str) || 5) + (Number(s?.sen) || 5)) / 2)
  },
  innovation: {
    key: 'innovation',
    name: 'Innovation & PM',
    fullName: 'Preventive Maintenance & Digital Systems',
    thai: 'งานเชิงรุก บำรุงรักษาป้องกัน และระบบดิจิทัล',
    desc: 'แผน PM ปั๊ม/บ่อบำบัด/ตู้ไฟ ใช้ Taskflow คล่องแคล่ว พัฒนาโฟลว์งาน ลดการซ่อมซ้ำซาก',
    color: 'text-purple-500',
    bg: 'bg-purple-500',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    formulaDesc: '(INT + SEN) / 2',
    calc: (s) => Math.round(((Number(s?.int) || 5) + (Number(s?.sen) || 5)) / 2)
  }
};

export const analyzeOuterLayer = (u = {}, statsObj = {}, options = {}) => {
  const isPreview = options.preview === true || u?._preview === true;
  const isExplicitAssessed = Boolean(
    u?.outerAssessed === true ||
    (u?.outerCustomized && typeof u.outerCustomized === 'object' && Object.values(u.outerCustomized).some(Boolean))
  );
  const isAssessed = isPreview || isExplicitAssessed;

  const str = Number(statsObj.str) || Number(u.str) || 5;
  const agi = Number(statsObj.agi) || Number(u.agi) || 5;
  const dex = Number(statsObj.dex) || Number(u.dex) || 5;
  const int = Number(statsObj.int) || Number(u.int) || 5;
  const con = Number(statsObj.con) || Number(u.con) || 5;
  const sen = Number(statsObj.sen) || Number(u.sen) || 5;

  const avgInner = (str + agi + dex + int + con + sen) / 6;

  const getGridLevel = (score) => {
    if (score >= 6.8) return 'high';
    if (score >= 4.5) return 'med';
    return 'low';
  };

  const howLevel = getGridLevel(avgInner);

  // Extract penalties from options or u (Live Auto-Deduct from Decision Room)
  const penalties = options.penalties || options.telemetry?.penalties || u.telemetry?.penalties || [];
  const penaltiesByAxis = {
    cx: 0,
    tech: 0,
    sla: 0,
    crisis: 0,
    resource: 0,
    innovation: 0
  };
  penalties.forEach(p => {
    if (p.axis && penaltiesByAxis[p.axis] !== undefined) {
      penaltiesByAxis[p.axis] += (Number(p.points) || 0);
    }
  });

  const totalPenalties = Object.values(penaltiesByAxis).reduce((a, b) => a + b, 0);

  // Base raw values assessed by managers or default neutral baseline
  const rawValues = {
    cx: (u.cx !== null && u.cx !== undefined) ? Number(u.cx) : 5,
    tech: (u.tech !== null && u.tech !== undefined) ? Number(u.tech) : 5,
    sla: (u.sla !== null && u.sla !== undefined) ? Number(u.sla) : 5,
    crisis: (u.crisis !== null && u.crisis !== undefined) ? Number(u.crisis) : 5,
    resource: (u.resource !== null && u.resource !== undefined) ? Number(u.resource) : 5,
    innovation: (u.innovation !== null && u.innovation !== undefined) ? Number(u.innovation) : 5
  };

  // Pure decoupled WHAT assessment values with live penalty deduction (bounded between 1.0 and 10.0)
  const actualValues = {
    cx: Math.max(1, Math.min(10, Math.round((rawValues.cx - penaltiesByAxis.cx) * 10) / 10)),
    tech: Math.max(1, Math.min(10, Math.round((rawValues.tech - penaltiesByAxis.tech) * 10) / 10)),
    sla: Math.max(1, Math.min(10, Math.round((rawValues.sla - penaltiesByAxis.sla) * 10) / 10)),
    crisis: Math.max(1, Math.min(10, Math.round((rawValues.crisis - penaltiesByAxis.crisis) * 10) / 10)),
    resource: Math.max(1, Math.min(10, Math.round((rawValues.resource - penaltiesByAxis.resource) * 10) / 10)),
    innovation: Math.max(1, Math.min(10, Math.round((rawValues.innovation - penaltiesByAxis.innovation) * 10) / 10))
  };

  if (!isAssessed) {
    return {
      isAssessed: false,
      rawValues,
      penaltiesByAxis,
      totalPenalties,
      actualValues: {
        cx: null,
        tech: null,
        sla: null,
        crisis: null,
        resource: null,
        innovation: null
      },
      avgInner: Math.round(avgInner * 10) / 10,
      avgOuter: null,
      gap: null,
      alignmentKey: 'unassessed',
      alignmentTitle: 'ยังไม่ได้รับการประเมินสมรรถนะหน้างาน (WHAT)',
      alignmentDesc: 'พนักงานได้รับการประเมินเฉพาะสเตตัสศักยภาพตั้งต้น (HOW) ยังไม่ได้บันทึกผลการประเมิน 6 แกนสมรรถนะหน้างานจริง (WHAT)',
      alignmentBadge: 'bg-slate-100 text-slate-600 border-slate-300',
      coachingAdvice: 'เข้าเมนูประเมินเพื่อกำหนดสมรรถนะ 6 แกนหน้างานจริง ช่วยวัดผลสัมฤทธิ์เทียบกับศักยภาพตั้งต้น',
      performanceDna: {
        title: 'ยังไม่ได้รับการประเมินสมรรถนะหน้างาน (WHAT)',
        tag: 'รอการประเมิน 6 แกน',
        desc: 'ยังไม่มีข้อมูลผลสัมฤทธิ์ 6 แกนสมรรถนะหน้างานจริง กรุณาประเมินภาคสนามเพื่อสังเคราะห์ Performance DNA และ 9-Box Grid อย่างสมบูรณ์'
      },
      topOuter: [],
      talentGrid: {
        key: `${howLevel}_unassessed`,
        howLevel,
        whatLevel: null,
        isAssessed: false,
        title: '⏳ รอผลการประเมินผลงานหน้างาน (WHAT)',
        desc: `ประเมินศักยภาพตั้งต้นแล้ว (HOW: ${avgInner.toFixed(1)}/10 อยู่ในระดับ ${howLevel === 'high' ? 'ศักยภาพสูง' : howLevel === 'med' ? 'ศักยภาพปานกลาง' : 'ศักยภาพพื้นฐาน'}) รอผลประเมิน 6 แกนหน้างานเพื่อระบุช่องใน 9-Box`,
        badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
        action: 'เปิดเมนูประเมินเพื่อบันทึกผลสัมฤทธิ์ 6 แกนหน้างานจริง'
      },
      riskAlerts: [],
      gapInsights: [],
      bestFitAssignment: 'รอการประเมินสมรรถนะหน้างาน 6 แกนเพื่อวิเคราะห์ภารกิจที่เหมาะสม',
      pairingRecommendation: 'รอการประเมินสมรรถนะหน้างานเพื่อวิเคราะห์การจับคู่คู่หู'
    };
  }

  const autoValues = {
    cx: Math.round((con + sen) / 2),
    tech: Math.round((int + dex) / 2),
    sla: Math.round((agi + dex) / 2),
    crisis: Math.round((str + con) / 2),
    resource: Math.round((str + sen) / 2),
    innovation: Math.round((int + sen) / 2)
  };

  const outerMeta = [
    { key: 'cx', name: 'Customer Exp.', fullName: 'Customer Experience & Empathy', thai: 'การรับมือลูกบ้านและศิลปะการประสานงาน', rawVal: (con + sen) / 2, statSum: con + sen },
    { key: 'tech', name: 'Tech. Expertise', fullName: 'Technical Diagnosis & Facility Standards', thai: 'การวินิจฉัยเชิงช่างและมาตรฐานสาธารณูปโภค', rawVal: (int + dex) / 2, statSum: int + dex },
    { key: 'sla', name: 'Ops & SLA', fullName: 'Operational Discipline & SLA Speed', thai: 'วินัยเวลา ความรวดเร็ว และการปิดใบงาน', rawVal: (agi + dex) / 2, statSum: agi + dex },
    { key: 'crisis', name: 'Crisis Resolv.', fullName: 'Emergency Response & Crisis Mastery', thai: 'การดำเนินการฉุกเฉินในพื้นที่สาธารณูปโภคในโครงการ', rawVal: (str + con) / 2, statSum: str + con },
    { key: 'resource', name: 'Resource Ctrl.', fullName: 'Cost, Contractor & Material Stewardship', thai: 'การบริหารงบประมาณ ผู้รับเหมา และอะไหล่', rawVal: (str + sen) / 2, statSum: str + sen },
    { key: 'innovation', name: 'Innovation & PM', fullName: 'Preventive Maintenance & Digital Systems', thai: 'งานเชิงรุก บำรุงรักษาป้องกัน และระบบดิจิทัล', rawVal: (int + sen) / 2, statSum: int + sen }
  ];

  const avgOuter = Object.values(actualValues).reduce((a, b) => a + b, 0) / 6;
  const gap = Math.round((avgOuter - avgInner) * 10) / 10;

  // Alignment
  let alignmentKey = 'harmonized';
  let alignmentTitle = 'สมดุลเต็มศักยภาพ (Harmonized)';
  let alignmentDesc = 'ผลสัมฤทธิ์หน้างานจริงสอดคล้องกับศักยภาพตั้งต้นอย่างมั่นคง เป็นไปตามมาตรฐานที่คาดหวัง';
  let alignmentBadge = 'bg-blue-50 text-blue-700 border-blue-200';
  let coachingAdvice = 'รักษาระดับผลงานต่อเนื่อง และมอบหมายความท้าทายใหม่ๆ เพื่อขยายเพดานความสามารถ';

  if (gap >= 1.2) {
    alignmentKey = 'over_achiever';
    alignmentTitle = 'ผลงานแซงศักยภาพ (Over-Achiever)';
    alignmentDesc = `ผลงานจริง (${avgOuter.toFixed(1)}) สูงกว่าศักยภาพคำนวณ (${avgInner.toFixed(1)}) โดดเด่น มีวินัยและความขยันเป็นเลิศ`;
    alignmentBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    coachingAdvice = 'ค้นหาเคล็ดลับหน้างาน (Best Practice) ของพนักงาน เพื่อนำมาแชร์และเป็นต้นแบบให้แก่ทีม';
  } else if (gap <= -1.2) {
    alignmentKey = 'under_leveraged';
    alignmentTitle = 'ศักยภาพยังไม่ถูกปลดล็อก (Under-Leveraged)';
    const potentialText = avgInner >= 6 ? 'มีศักยภาพแฝงสูง' : (avgInner >= 4 ? 'มีศักยภาพพื้นฐาน' : 'มีศักยภาพประเมินเริ่มต้น');
    alignmentDesc = `${potentialText} (${avgInner.toFixed(1)}) แต่ผลสัมฤทธิ์หน้างานจริง (${avgOuter.toFixed(1)}) ต่ำกว่าที่ควรจะเป็น`;
    alignmentBadge = 'bg-amber-50 text-amber-700 border-amber-200';
    coachingAdvice = avgInner >= 5 ? 'หัวหน้างานควรสำรวจอุปสรรคหน้างาน เช่น ปริมาณงานหรือสภาพแวดล้อม เพื่อช่วยปลดล็อกพลังแท้จริง' : 'หัวหน้างานต้องเข้าไปตรวจสอบสาเหตุการทำงานที่ต่ำกว่ามาตรฐานอย่างเร่งด่วน และปรับปรุงกระบวนการดูแลหน้างาน';
  }

  // Sorting Outer Axes with fair tie-breaker based on raw unrounded float average & stat sum
  const sortedOuter = outerMeta.map(m => {
    const val = actualValues[m.key];
    const tieScore = (val * 1000) + (m.rawVal * 10) + (m.statSum * 0.1);
    return { ...m, val, tieScore };
  }).sort((a, b) => b.tieScore - a.tieScore);
  const pairKey = [sortedOuter[0].key, sortedOuter[1].key].sort().join('_');

  // Comprehensive 15-Pair Performance DNA Matrix for Housing Estate Operations
  const dnaMap = {
    'crisis_cx': {
      title: 'De-escalation Guardian (เกราะหน้าด่านพิทักษ์ความสัมพันธ์) [Frontline Shield]',
      tag: 'Frontline Shield',
      desc: 'รับมือลูกบ้านอารมณ์ร้อนได้อย่างใจเย็นและอยู่หมัด พร้อมดำเนินการฉุกเฉินในพื้นที่สาธารณูปโภคในโครงการได้อย่างรวดเร็วและปลอดภัย'
    },
    'crisis_innovation': {
      title: 'Agile Crisis Innovator (นักพลิกแพลงกู้วิกฤตเฉพาะหน้า) [Creative Responder]',
      tag: 'Creative Responder',
      desc: 'ในสถานการณ์คับขันที่ระบบขัดข้อง สามารถประยุกต์ใช้อุปกรณ์ทดแทนและหาทางออกใหม่ๆ เพื่อกู้ระบบสาธารณูปโภคให้ฟื้นคืนได้เร็วที่สุด'
    },
    'crisis_resource': {
      title: 'Crisis Commander (ผู้บัญชาการสถานการณ์และทรัพยากร) [Operations Guardian]',
      tag: 'Operations Guardian',
      desc: 'คุมสถานการณ์ฉุกเฉินได้อย่างสงบนิ่ง และจัดสรรกำลังคน เครื่องจักร ตลอดจนงบประมาณซ่อมแซมได้อย่างคุ้มค่า ปลอดภัย ไม่สิ้นเปลือง'
    },
    'crisis_sla': {
      title: 'Rapid Emergency Responder (หน่วยตอบโต้เหตุฉุกเฉินฉับไว) [Rapid Strike]',
      tag: 'Rapid Strike',
      desc: 'ทันทีที่รับแจ้งเหตุฉุกเฉิน (ท่อเมนแตก ไฟดับ พายุพัด) จะเข้าถึงหน้างานเร็วที่สุด วินัยเวลาเป๊ะ ระงับเหตุก่อนสร้างความเสียหายลุกลาม'
    },
    'crisis_tech': {
      title: 'Infrastructure Rescuer (หน่วยกู้วิกฤตสาธารณูปโภค) [System Rescuer]',
      tag: 'System Rescuer',
      desc: 'มีความรู้เชิงช่างลึกซึ้งและกล้าตัดสินใจ สามารถเข้าควบคุมและกู้ระบบสาธารณูปโภคหลักที่ชำรุดฉุกเฉินให้กลับมาใช้งานได้เร็วที่สุด'
    },
    'cx_innovation': {
      title: 'Experience Designer (นักออกแบบประสบการณ์ลูกบ้าน) [Service Innovator]',
      tag: 'Service Innovator',
      desc: 'เข้าใจจิตวิทยาและความต้องการของลูกบ้านอย่างลึกซึ้ง พร้อมริเริ่มนำระบบ Taskflow และการสื่อสารเชิงรุกมาสร้างความประทับใจระดับบอกต่อ'
    },
    'cx_resource': {
      title: 'Value Negotiator (นักประสานประโยชน์เพื่อชุมชน) [Diplomatic Steward]',
      tag: 'Diplomatic Steward',
      desc: 'ประสานงานลูกบ้านและผู้รับเหมาอย่างลงตัว อธิบายเรื่องงบประมาณส่วนกลางได้อย่างโปร่งใส ปกป้องผลประโยชน์ของนิติบุคคลโดยไม่กระทบความสัมพันธ์'
    },
    'cx_sla': {
      title: 'Reliable Ambassador (ทูตบริการฉับไว ตรงเวลาเป็นเลิศ) [Trusted Ambassador]',
      tag: 'Trusted Ambassador',
      desc: 'รักษาเวลานัดหมาย 100% สุภาพ กริยางดงาม แจ้งความคืบหน้ารวดเร็ว ไม่ปล่อยให้ลูกบ้านต้องตามงาน ลูกบ้านไว้วางใจสูงสุด'
    },
    'cx_tech': {
      title: 'Consultative Master (ปรมาจารย์ที่ปรึกษาเชิงช่าง) [Consultative Expert]',
      tag: 'Consultative Expert',
      desc: 'วินิจฉัยงานระบบได้เฉียบขาด พูดคุยอธิบายขั้นตอนงานให้ลูกบ้านเข้าใจง่าย และตรวจงานละเอียดก่อนส่งงานให้ผู้บังคับบัญชา'
    },
    'innovation_resource': {
      title: 'Facility Asset Optimizer (ผู้วางระบบสินทรัพย์ยั่งยืน) [Asset Optimizer]',
      tag: 'Asset Optimizer',
      desc: 'จัดระบบคลังอะไหล่ เครื่องมือ และแผน Preventive Maintenance อย่างเป็นระบบ นำเทคโนโลยีมาลดการสูญหายและประหยัดงบประมาณส่วนกลางระยะยาว'
    },
    'innovation_sla': {
      title: 'Agile Workflow Optimizer (ผู้ขับเคลื่อนโฟลว์ความเร็วสูง) [Workflow Driver]',
      tag: 'Workflow Driver',
      desc: 'ใช้เครื่องมือใน LH-Taskflow คล่องแคล่ว ลดขั้นตอนที่ซ้ำซ้อน ทำให้การส่งต่องานระหว่างช่างและฝ่ายบริการรวดเร็ว ปิดใบงานในกรอบ SLA ได้เสมอ'
    },
    'innovation_tech': {
      title: 'Smart Facility Engineer (วิศวกรสาธารณูปโภคอัจฉริยะ) [Tech Pioneer]',
      tag: 'Tech Pioneer',
      desc: 'มีความรู้เชิงช่างระดับสูง และนำระบบตรวจวัด ระบบอัตโนมัติมาดูแลบ่อบำบัด สปริงเกอร์ และตู้ควบคุมไฟ ลดการเกิดปัญหาซ้ำซากได้อย่างยั่งยืน'
    },
    'resource_sla': {
      title: 'Operations Controller (ผู้บัญชาการงานบริการและงบประมาณ) [Disciplined Controller]',
      tag: 'Disciplined Controller',
      desc: 'บริหารเวลาและทรัพยากรได้อย่างเฉียบคม คุมผู้รับเหมาให้ส่งงานตรงเวลา เบิกจ่ายอะไหล่คุ้มค่า ไร้งานค้างและไร้งบรั่วไหล'
    },
    'resource_tech': {
      title: 'Technical Inspector (ผู้คุมมาตรฐานและต้นทุนเชิงช่าง) [Master Inspector]',
      tag: 'Master Inspector',
      desc: 'รู้เท่าทันเทคนิคเชิงช่าง ตรวจรับงานผู้รับเหมาละเอียดยิบ ไม่ปล่อยให้มีการหมกเม็ด เลือกใช้วัสดุที่ทนทานคุ้มค่าต่องบประมาณโครงการ'
    },
    'sla_tech': {
      title: 'First-Time Fixer (ช่างแม่นยำ ปิดงานตรงกรอบ) [Precision Fixer]',
      tag: 'Precision Fixer',
      desc: 'วินิจฉัยอาการเสียแม่นยำ ซ่อมประปา ไฟฟ้า สปริงเกอร์จบในครั้งแรก ไม่เกิดเคสซ่อมซ้ำ และปิดใบงานในระบบได้อย่างรวดเร็วตามกรอบเวลา'
    }
  };

  let performanceDna;

  if (sortedOuter[0].val <= 2) {
    // Red Zone
    performanceDna = {
      title: 'Novice (พนักงานระดับเริ่มต้น / ต้องประเมินผลงานเร่งด่วน)',
      tag: 'Needs PIP',
      desc: 'สมรรถนะโดยรวมอยู่ในระดับวิกฤต ไม่สามารถปฏิบัติงานตามมาตรฐานได้ ต้องเข้าสู่แผนฟื้นฟูและประเมินผลงานอย่างใกล้ชิด ห้ามปล่อยให้ปฏิบัติหน้าที่เพียงลำพัง'
    };
  } else if (sortedOuter[0].val <= 4) {
    // Orange Zone
    performanceDna = {
      title: 'Trainee (พนักงานฝึกหัด / อยู่ในช่วงพัฒนาทักษะ)',
      tag: 'Needs Mentoring',
      desc: 'สมรรถนะหน้างานยังต่ำกว่าเกณฑ์มาตรฐานที่คาดหวัง สามารถทำงานพื้นฐานได้แต่ยังต้องมีระบบพี่เลี้ยง (Mentoring) คอยตรวจสอบคุณภาพงานอย่างสม่ำเสมอ'
    };
  } else if (avgOuter <= 4.5 || sortedOuter[5].val <= 2) {
    // Yellow Zone
    performanceDna = {
      title: 'Unbalanced Contributor (ผลงานไม่คงที่ / ต้องอุดช่องโหว่)',
      tag: 'Focus Improvement',
      desc: 'มีทักษะบางด้านที่พอใช้งานได้ แต่มีจุดบอดที่รุนแรงในมิติอื่น ทำให้ผลงานโดยรวมขาดความสม่ำเสมอ ต้องเร่งพัฒนาจุดอ่อนเพื่อไม่ให้เป็นภาระของทีม'
    };
  } else {
    // Mastery Track (15-Pair DNA)
    let outerPrefix = '';
    if (sortedOuter[0].val >= 8 && sortedOuter[1].val >= 7) outerPrefix = 'Master ';
    else if (sortedOuter[0].val >= 7 && sortedOuter[1].val >= 6) outerPrefix = 'Senior ';

    performanceDna = dnaMap[pairKey] ? { ...dnaMap[pairKey] } : {
      title: `${sortedOuter[0].name} & ${sortedOuter[1].name} Specialist`,
      tag: 'Specialist',
      desc: `โดดเด่นด้าน ${sortedOuter[0].thai} ผสานกับ ${sortedOuter[1].thai} ในการบริหารจัดการโครงการบ้านจัดสรร`
    };
    
    if (dnaMap[pairKey]) {
      performanceDna.title = outerPrefix + performanceDna.title;

      // Role-Aware Context Refinement: ปรับสำนวนให้ตรงบทบาทสำหรับสายงานประสานงาน/แอดมิน
      const userRoleStr = (typeof u.role === 'string' ? u.role : u.role?.name || u.potentialIdentity || '').toLowerCase();
      const isAdminOrCoord = userRoleStr.includes('admin') || userRoleStr.includes('ประสาน') || userRoleStr.includes('ธุรการ');

      if (isAdminOrCoord && pairKey === 'innovation_tech') {
        performanceDna.title = `${outerPrefix}Digital Coordinator & Tech Analyst (ผู้เชี่ยวชาญประสานงานระบบและข้อมูลเชิงช่าง)`;
        performanceDna.desc = 'เชี่ยวชาญการใช้ระบบติดตามงาน LH-Taskflow รวบรวมและวิเคราะห์ข้อมูลประวัติงานซ่อม ตรวจสอบรายละเอียดเชิงช่าง และประสานงานส่งต่องานระหว่างลูกบ้านกับทีมช่างได้อย่างแม่นยำ ไร้รอยต่อ';
      }
    }
  }

  // 9-Box Operational Talent Grid (HOW Potential vs WHAT Performance)
  const whatLevel = getGridLevel(avgOuter);

  const talentGridMatrix = {
    'high_high': {
      title: '🏆 Star Leader (เสาหลักผู้ขับเคลื่อนโครงการ)',
      desc: 'ศักยภาพสูงและผลงานจริงยอดเยี่ยมรอบด้าน เป็นเสาหลักที่ไว้ใจได้สูงสุดในการดูแลหมู่บ้าน',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      action: 'มอบหมายเป็นหัวหน้าชุดซ่อมบำรุง / มอบหมายเคส VIP หรือโครงการปรับปรุงสาธารณูปโภคใหญ่'
    },
    'med_high': {
      title: '🔥 High-Discipline Achiever (นักสู้ผู้ทุ่มเทด้วยวินัยสูง)',
      desc: 'ผลงานหน้างานโดดเด่นแซงศักยภาพคำนวณ ขยัน มีวินัยสูง และทุ่มเทเพื่อโครงการอย่างแท้จริง',
      badge: 'bg-teal-50 text-teal-800 border-teal-300',
      action: 'ชื่นชมและถอดบทเรียนการทำงาน (Best Practice) ส่งเสริมให้เรียนรู้ทักษะเทคนิคเชิงลึกเพิ่มเติม'
    },
    'low_high': {
      title: '⭐ Field Hero (ยอดฝีมือหน้างานตัวจริง)',
      desc: 'แม้มิติการประเมินพื้นฐานจะยังต่ำ แต่ผลลัพธ์หน้างานจริงแก้ปัญหาได้ดีเยี่ยม ไว้วางใจได้',
      badge: 'bg-cyan-50 text-cyan-800 border-cyan-300',
      action: 'เสริมความรู้เชิงทฤษฎีและการใช้ระบบดิจิทัล เพื่อลดความเหนื่อยล้าในการใช้แรงกายเพียงอย่างเดียว'
    },
    'high_med': {
      title: '💎 High-Potential Core (ดาวเด่นรอการขัดเกลา)',
      desc: 'มีศักยภาพพื้นฐานสูงมาก ผลงานอยู่ในเกณฑ์มาตรฐาน พร้อมทะลุขีดจำกัดสู่ระดับยอดเยี่ยม',
      badge: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      action: 'เพิ่มความท้าทาย มอบหมายเคสวิกฤตหรือเคสยากเพื่อให้ได้ปล่อยของและสร้างผลงานเชิงประจักษ์'
    },
    'med_med': {
      title: '⚙️ Dependable Pillar (ฟันเฟืองหลักที่มั่นคง)',
      desc: 'ผลงานและศักยภาพสอดคล้องกันตามมาตรฐาน เป็นกำลังหลักที่พึ่งพาได้ในงานประจำวัน',
      badge: 'bg-blue-50 text-blue-800 border-blue-300',
      action: 'รักษาระดับมาตรฐาน และค้นหาความถนัดเฉพาะทาง 1-2 ด้าน เพื่อสร้างจุดเด่นเฉพาะตัว'
    },
    'low_med': {
      title: '🔨 Steady Operator (ผู้ปฏิบัติงานมาตรฐาน)',
      desc: 'ทำงานตามหน้าที่และคำสั่งได้ครบถ้วน แต่อาจยังต้องการคำแนะนำในเคสที่ไม่คุ้นเคย',
      badge: 'bg-slate-50 text-slate-800 border-slate-300',
      action: 'กำหนดเช็คลิสต์การตรวจงานให้ชัดเจน และจัดคู่หูกับช่างอาวุโสในงานซับซ้อน'
    },
    'high_low': {
      title: '⚠️ Under-Leveraged Talent (ช้างเผือกที่ยังไม่ได้ปล่อยของ)',
      desc: 'มีศักยภาพแฝงสูงมากแต่ผลงานจริงยังไม่ออก อาจหมดไฟ (Burnout) หรือติดขัดหน้างาน',
      badge: 'bg-amber-50 text-amber-800 border-amber-300',
      action: 'พูดคุย One-on-One ทันทีเพื่อค้นหาสาเหตุ (สภาพแวดล้อม ปริมาณงาน หรือการมอบหมายงานไม่ตรงจุด)'
    },
    'med_low': {
      title: '📉 Inconsistent Performer (ผลงานแกว่ง ต้องกระตุ้น)',
      desc: 'มีพื้นฐานพอใช้แต่ผลงานหน้างานยังไม่สม่ำเสมอ ขาดความต่อเนื่องในการส่งมอบงานให้ได้ตามมาตรฐาน',
      badge: 'bg-orange-50 text-orange-800 border-orange-300',
      action: 'กำหนด Check-point ถี่ขึ้น ติดตามการปิดใบงานรายวัน และทบทวนขั้นตอนระเบียบปฏิบัติงาน'
    },
    'low_low': {
      title: '🚨 Urgent OJT Required (ต้องเข้าโปรแกรมฟื้นฟูเร่งด่วน)',
      desc: 'ทั้งศักยภาพและผลงานต่ำกว่าเกณฑ์ปฏิบัติงาน เป็นจุดเสี่ยงของทีมที่ต้องได้รับการดูแลใกล้ชิด',
      badge: 'bg-rose-50 text-rose-800 border-rose-300',
      action: 'จัดพี่เลี้ยงประกบ 1:1 ห้ามทำงานเดี่ยว เข้าแผนพัฒนาทักษะหน้างาน (OJT) ประเมินผลทุก 15 วัน'
    }
  };

  const talentGrid = {
    key: `${howLevel}_${whatLevel}`,
    howLevel,
    whatLevel,
    isAssessed: true,
    ...(talentGridMatrix[`${howLevel}_${whatLevel}`] || talentGridMatrix['med_med'])
  };

  // 4-Point Operational Risk Engine (Role-Smart Filter)
  const riskAlerts = [];
  const userRoleStr = (typeof u.role === 'string' ? u.role : u.role?.name || u.potentialIdentity || '').toLowerCase();
  const isAdminOrCoord = userRoleStr.includes('admin') || userRoleStr.includes('ประสาน') || userRoleStr.includes('ธุรการ');

  // 1. Speed vs Quality Risk (สำหรับสายงานภาคสนาม/ช่าง)
  if (!isAdminOrCoord && (actualValues.sla - actualValues.tech >= 2)) {
    riskAlerts.push({
      type: 'quality_speed',
      level: 'warning',
      title: '⚠️ เสี่ยงงานเร่งด่วนจนกระทบคุณภาพ QC (Speed vs Quality Risk)',
      desc: `ความเร็วสูง (SLA ${actualValues.sla}) แต่วินิจฉัยเชิงช่างต่ำกว่า (TECH ${actualValues.tech}) เสี่ยงซ่อมไม่จบ เกิดเคสซ่อมซ้ำ (Recurring Defect)`,
      advice: 'เพิ่มขั้นตอน QC ตรวจสอบการทำงานเชิงช่างให้เรียบร้อยก่อนปิดใบงาน'
    });
  }

  // 2. Customer Escalation Risk
  if ((actualValues.tech >= 7 || actualValues.sla >= 7) && actualValues.cx <= 4) {
    riskAlerts.push({
      type: 'escalation',
      level: 'danger',
      title: '🚨 เสี่ยงเกิดข้อพิพาทรุนแรงกับลูกบ้าน (Customer Escalation Risk)',
      desc: `ความเชี่ยวชาญหรือความเร็วดีเยี่ยม แต่ทักษะบริการลูกบ้านต่ำ (CX ${actualValues.cx}) มีความเสี่ยงที่จะเกิดการกระทบกระทั่ง`,
      advice: 'จัดคู่หูที่มี CX สูงช่วยประสานงาน หรือฝึกอบรมทักษะการเจรจาลดความขัดแย้ง'
    });
  }

  // 3. Contractor & Cost Leakage Risk (ปรับคำอธิบายตามบทบาท)
  if (actualValues.resource <= 4) {
    riskAlerts.push({
      type: 'leakage',
      level: 'warning',
      title: isAdminOrCoord 
        ? '📑 เสี่ยงเอกสารเบิกจ่ายงบประมาณคลาดเคลื่อน (Expense Documentation Risk)'
        : '💸 เสี่ยงงบประมาณรั่วไหล / ควบคุมผู้รับเหมาไม่ได้ (Contractor Leakage Risk)',
      desc: isAdminOrCoord
        ? `การดูแลเอกสารส่งเบิกหรือรหัสบัญชีงบประมาณต่ำกว่าเกณฑ์ (RESOURCE ${actualValues.resource}) อาจทำให้เอกสารเบิกจ่าย 9 หมวดในระบบ LHServ Portal ตีกลับหรือล่าช้า`
        : `การคุมงบและตรวจรับงานต่ำกว่าเกณฑ์ (RESOURCE ${actualValues.resource}) เสี่ยงต่อการถูกผู้รับเหมาหมกเม็ดงาน หรือเบิกอะไหล่ผิดพลาด`,
      advice: isAdminOrCoord
        ? 'จัดทำ Check-list ตรวจสอบรหัสบัญชี (54010-54021) และใบส่งของก่อนส่งเบิก'
        : 'ให้หัวหน้างานช่วยตรวจรับมอบงานผู้รับเหมาและควบคุมการเบิกจ่ายอะไหล่'
    });
  }

  // 4. Firefighting Trap Risk
  if (actualValues.crisis >= 7 && actualValues.innovation <= 4) {
    riskAlerts.push({
      type: 'firefighting',
      level: 'info',
      title: '🚒 เสี่ยงติดกับดักวิ่งดับเพลิง (Firefighting Trap)',
      desc: `แก้เหตุฉุกเฉินเก่ง (CRISIS ${actualValues.crisis}) แต่งานเชิงรุกต่ำ (INNOVATION ${actualValues.innovation}) ทำให้ต้องวิ่งแก้ปัญหาเดิมๆ ซ้ำซาก`,
      advice: 'วางแผนงานบำรุงรักษาเชิงป้องกัน (PM) เพื่อลดการเกิดเหตุฉุกเฉินซ้ำซาก'
    });
  }

  const dnaBestFitMap = {
    'crisis_cx': 'เหมาะเป็นตัวแทนรับหน้าลูกบ้านในเคสพิพาทรุนแรง พร้อมทั้งคุมสถานการณ์ฉุกเฉินหน้างานไม่ให้บานปลาย',
    'crisis_innovation': 'มอบหมายงานกู้คืนระบบฉุกเฉินที่ไม่มีอะไหล่ตรงรุ่น หรืองานดัดแปลงเชิงวิศวกรรมเฉพาะหน้า',
    'crisis_resource': 'มอบหมายเป็นผู้บัญชาการเหตุการณ์ยามวิกฤต (เช่น น้ำท่วมโครงการ, ไฟฟ้าดับทั้งเฟส)',
    'crisis_sla': 'มอบหมายเป็นหน่วยเคลื่อนที่เร็วเข้าตัดตอนความเสียหายก่อนที่งานจะขยายวงกว้าง',
    'crisis_tech': 'มอบหมายเคสงานระบบสาธารณูปโภคหลักล่ม หรือเคสเทคนิคขั้นสูงที่มีผลกระทบต่อลูกบ้านทั้งหมู่บ้าน',
    'cx_innovation': 'ให้เป็นผู้ออกแบบข้อความแจ้งเตือน การอัปเดตงานบริการ และจัดทำคู่มือการสื่อสารลูกบ้าน',
    'cx_resource': 'มอบหมายงานชี้แจงค่าใช้จ่ายส่วนกลาง งานเจรจาต่อรองค่าชดเชย และประสานงานผู้รับเหมาในพื้นที่ส่วนกลาง',
    'cx_sla': 'มอบหมายเคสลูกบ้าน VIP หรือเคสที่เคยมีประวัติผิดหวังเรื่องการผิดนัดหมายมาก่อน',
    'cx_tech': 'ให้ร่วมเข้าตรวจบ้านพร้อมลูกบ้านในเคสที่มีข้อสงสัยเชิงวิศวกรรมซับซ้อน',
    'innovation_resource': 'มอบหมายให้ดูแลการวางแผน PM ประจำปี การบริหารสต็อกอะไหล่ และลดต้นทุนดำเนินงานโครงการ',
    'innovation_sla': 'มอบหมายให้เป็น Super User ระบบ Taskflow คอยตรวจสอบและปรับปรุงขั้นตอนการส่งต่องานในทีม',
    'innovation_tech': 'ให้วางแผนระบบ Smart Utility บ่อบำบัดน้ำเสียอัตโนมัติ และระบบตั้งเวลารดน้ำสวนส่วนกลาง',
    'resource_sla': 'มอบหมายให้ควบคุมภาพรวมกระดานงานซ่อมแซมรายวันและการจัดสรรงบประมาณซ่อมบำรุง',
    'resource_tech': 'มอบหมายให้เป็นผู้ตรวจรับมอบงานงวดสุดท้ายของผู้รับเหมาภายนอกทั้งหมด',
    'sla_tech': 'มอบหมายเคสซ่อมแซมทั่วไปที่มีปริมาณมาก เพื่อเร่งระบายงานค้างและรักษามาตรฐาน SLA'
  };

  const bestFitTaskMap = {
    cx: 'เน้นการเจรจาต่อรอง การสื่อสารเพื่อลดความขัดแย้ง และงานบริการที่ต้องการความเห็นอกเห็นใจสูง (มอบหมายรับเรื่องลูกบ้านอารมณ์ร้อน, ชี้แจงโครงการ, ประสานงานข้อพิพาทระหว่างบ้าน)',
    tech: 'ต้องการความรู้เชิงลึกทางวิศวกรรม งานตรวจสอบมาตรฐานที่ซับซ้อน และงานที่ต้องอาศัยความแม่นยำสูง (มอบหมายงานซ่อมปั๊มน้ำ, ตู้ MDB, สระว่ายน้ำ, ถังบำบัดน้ำเสีย, งานประปาแรงดันสูง)',
    sla: 'งานเร่งด่วนที่มีเวลาจำกัด งานที่ต้องเคลียร์ให้จบอย่างรวดเร็ว และการบริหารจัดการเวลาที่เข้มงวด (มอบหมายเคลียร์ใบงานค้างประจำวัน, งานซ่อมด่วนที่ลูกบ้านนัดเวลากระชั้นชิด)',
    crisis: 'งานระงับเหตุฉุกเฉินเฉพาะหน้า งานที่มีความกดดันสูง และสถานการณ์ที่ต้องตัดสินใจอย่างเด็ดขาด (มอบหมายเข้าจุดเกิดเหตุท่อเมนแตก, ไฟดับทั้งโครงการ, พายุฝนตกหนักน้ำท่วมขัง)',
    resource: 'งานควบคุมงบประมาณ งานบริหารจัดการผู้รับเหมา และการจัดสรรทรัพยากรส่วนกลางให้เกิดความคุ้มค่า (มอบหมายตรวจรับงานผู้รับเหมาภายนอก, ตรวจสอบสต็อกอะไหล่, ควบคุมงบประมาณซ่อมบำรุง)',
    innovation: 'งานวางแผนเชิงรุก งานบำรุงรักษาเชิงป้องกัน (PM) และการริเริ่มนำระบบดิจิทัลมาปรับปรุงกระบวนการ (มอบหมายจัดทำแผน PM ประจำเดือน, อบรมการใช้งาน Taskflow ให้ทีม, ออกแบบเช็คลิสต์ดิจิทัล)'
  };

  let bestFitAssignment;
  if (sortedOuter[0].val <= 2 || performanceDna.tag === 'Needs PIP') {
    bestFitAssignment = 'เน้นการฝึกอบรมทักษะพื้นฐานในศูนย์การเรียนรู้ ปฏิบัติงานร่วมกับหัวหน้างานอย่างใกล้ชิด และยังไม่ควรปล่อยให้รับเคสเดี่ยว';
  } else if (sortedOuter[0].val <= 4 || performanceDna.tag === 'Needs Mentoring') {
    if (sortedOuter[0].key === 'tech' || sortedOuter[0].key === 'sla') {
      bestFitAssignment = 'เหมาะสำหรับงานสนับสนุนช่างพี่เลี้ยง งานตรวจเช็กตามรอบบำรุงรักษาเชิงป้องกัน (PM) และงานซ่อมบำรุงพื้นฐานที่ไม่ซับซ้อน';
    } else if (sortedOuter[0].key === 'cx') {
      bestFitAssignment = 'เหมาะสำหรับงานต้อนรับและประสานงานเบื้องต้น รับฟังความต้องการลูกบ้าน และส่งต่องานซ่อมให้ทีมช่าง';
    } else {
      bestFitAssignment = 'เหมาะสำหรับงานช่วยจัดเตรียมเครื่องมือ อุปกรณ์ และสนับสนุนงานปฏิบัติการภาคสนามตามคำสั่งหัวหน้างาน';
    }
  } else if (avgOuter <= 4.5 || sortedOuter[5].val <= 2) {
    const strongPillar = sortedOuter[0].thai;
    const weakPillar = sortedOuter[5].thai;
    bestFitAssignment = `เหมาะสำหรับงานที่เน้น ${strongPillar} เป็นหลัก โดยควรมีทีมงานช่วยดูแลและตรวจสอบในด้าน ${weakPillar} เพื่อลดความผิดพลาดหน้างาน`;
  } else if (dnaBestFitMap[pairKey]) {
    bestFitAssignment = dnaBestFitMap[pairKey];

    // Role-Aware Best Fit Assignment for Admin/Coordinator
    const userRoleStr = (typeof u.role === 'string' ? u.role : u.role?.name || u.potentialIdentity || '').toLowerCase();
    const isAdminOrCoord = userRoleStr.includes('admin') || userRoleStr.includes('ประสาน') || userRoleStr.includes('ธุรการ');
    if (isAdminOrCoord && pairKey === 'innovation_tech') {
      bestFitAssignment = 'เหมาะสำหรับงานควบคุมระบบติดตามใบงาน LH-Taskflow การตรวจสอบสเปกและรายละเอียดงานซ่อม และการประสานงานข้อมูลเชิงช่างกับทีมภาคสนาม';
    }
  } else {
    const topKey = sortedOuter[0].key;
    bestFitAssignment = bestFitTaskMap[topKey] || 'เหมาะสำหรับงานปฏิบัติการทั่วไปตามที่ได้รับมอบหมาย';
  }

  let pairingRecommendation = 'สามารถปฏิบัติหน้าที่เดี่ยวหรือนำทีมงานปฏิบัติการได้อย่างมั่นใจ';
  const lowestAxis = sortedOuter[sortedOuter.length - 1];

  if (sortedOuter[0].val <= 2 || performanceDna.tag === 'Needs PIP') {
    pairingRecommendation = 'ต้องจัดหัวหน้างานหรือช่างระดับ Specialist ประกบ 1:1 ห้ามปล่อยให้ปฏิบัติงานเดี่ยว';
  } else if (sortedOuter[0].val <= 4 || performanceDna.tag === 'Needs Mentoring') {
    pairingRecommendation = 'ควรจับคู่กับช่างเทคนิคอาวุโส (Senior Technician) เป็นพี่เลี้ยงคอยให้คำแนะนำหน้างานอย่างใกล้ชิด';
  } else if (actualValues.cx <= 4 && actualValues.tech >= 6) {
    pairingRecommendation = 'ควรจับคู่กับผู้ที่มีคะแนน CX สูง เพื่อช่วยสื่อสารและสร้างสัมพันธ์กับลูกบ้านขณะเข้าซ่อม';
  } else if (actualValues.tech <= 4 && actualValues.cx >= 6) {
    pairingRecommendation = 'ควรจับคู่กับช่างเทคนิคอาวุโส เพื่อเรียนรู้วิธีการวินิจฉัยอาการเสียจริงหน้างาน';
  } else if (lowestAxis.val <= 4) {
    if (lowestAxis.key === 'tech') {
      pairingRecommendation = 'ควรจับคู่กับช่างผู้เชี่ยวชาญเชิงเทคนิค (Technical Specialist) เพื่อช่วยวินิจฉัยและตรวจรับงาน ป้องกันเคสซ่อมซ้ำ';
    } else if (lowestAxis.key === 'cx') {
      pairingRecommendation = 'ควรจับคู่กับทีมงานที่มีทักษะ CX สูง เพื่อเป็นตัวแทนสื่อสาร อธิบายขั้นตอนงาน และสร้างความสัมพันธ์เชิงบวกกับลูกบ้าน';
    } else if (lowestAxis.key === 'resource') {
      pairingRecommendation = 'ควรให้หัวหน้างานหรือผู้จัดการโครงการช่วยตรวจสอบการเบิกจ่ายอะไหล่ และร่วมตรวจรับมอบงานผู้รับเหมาอย่างรัดกุม';
    } else if (lowestAxis.key === 'sla') {
      pairingRecommendation = 'ควรจับคู่กับทีมงานที่มีความคล่องตัวสูง (Agile Driver) และร่วม Morning Toolbox Talk เพื่อจัดลำดับความสำคัญของคิวงาน';
    } else if (lowestAxis.key === 'crisis') {
      pairingRecommendation = 'ควรหลีกเลี่ยงการส่งออกรับเหตุฉุกเฉินเดี่ยว และจับคู่กับหน่วยตอบโต้เหตุฉุกเฉิน (Rapid Responder)';
    } else if (lowestAxis.key === 'innovation') {
      pairingRecommendation = 'ควรมีพี่เลี้ยงช่วยแนะนำการใช้ระบบดิจิทัล (Taskflow) และร่วมวางแผนงานบำรุงรักษาเชิงป้องกัน (PM)';
    }
  } else if (sortedOuter[0].val >= 7) {
    pairingRecommendation = 'มีสมรรถนะโดดเด่น สามารถปฏิบัติหน้าที่เดี่ยวได้อย่างมั่นใจ หรือทำหน้าที่เป็นพี่เลี้ยง (Mentor) ถ่ายทอดทักษะให้ทีมงาน';
  } else {
    pairingRecommendation = 'ผลงานอยู่ในเกณฑ์มาตรฐาน สามารถปฏิบัติหน้าที่เดี่ยวได้ และหมุนเวียนจับคู่เพื่อเสริมทักษะข้ามสายงาน (Cross-functional)';
  }

  const gapInsights = outerMeta.map(m => {
    const act = actualValues[m.key];
    const base = autoValues[m.key];
    const diff = act - base;
    let text;
    if (diff >= 2) {
      text = `ผลงานจริง (${act}/10) โดดเด่นแซงศักยภาพคำนวณ (${base}/10) สะท้อนความขยัน/ประสบการณ์หน้างานเข้มข้น`;
    } else if (diff <= -2) {
      text = `ผลงานจริง (${act}/10) ต่ำกว่าศักยภาพคำนวณ (${base}/10) อย่างมีนัยสำคัญ อาจมีอุปสรรคหรือขาดการสนับสนุน`;
    } else {
      text = `ผลงานจริง (${act}/10) สอดคล้องกับศักยภาพคำนวณ (${base}/10)`;
    }
    return {
      key: m.key,
      name: m.name,
      thai: m.thai,
      actual: act,
      baseline: base,
      diff,
      text,
      isSignificantGap: Math.abs(diff) >= 2
    };
  }).filter(g => g.isSignificantGap);

  // 5. Operational Audit Penalty Alert (Live connection from Decision Room)
  if (totalPenalties > 0) {
    const penaltySummaryText = Object.entries(penaltiesByAxis)
      .filter(([_, pts]) => pts > 0)
      .map(([axisKey, pts]) => `${axisKey.toUpperCase()} -${pts}`)
      .join(', ');
    riskAlerts.unshift({
      type: 'audit_penalty',
      level: 'danger',
      title: '🚨 คะแนนสมรรถนะถูกปรับลดจากผลการตัดสินห้องตัดสิน (Audit Penalties)',
      desc: `พนักงานมีแต้มหักสะสมรวม ${totalPenalties} แต้ม (ส่งผลกระทบต่อ: ${penaltySummaryText})`,
      advice: 'ตรวจสอบรายละเอียดงานผิดเงื่อนไขในห้องตัดสิน และเร่งรัดแก้ไขข้อบกพร่องหน้างาน'
    });
  }

  return {
    isAssessed: true,
    rawValues,
    penaltiesByAxis,
    totalPenalties,
    autoValues,
    actualValues,
    avgInner: Math.round(avgInner * 10) / 10,
    avgOuter: Math.round(avgOuter * 10) / 10,
    gap,
    gapInsights,
    alignmentKey,
    alignmentTitle,
    alignmentDesc,
    alignmentBadge,
    coachingAdvice,
    performanceDna,
    topOuter: sortedOuter,
    talentGrid,
    riskAlerts,
    bestFitAssignment,
    pairingRecommendation
  };
};

/**
 * Full 3x3 McKinsey 9-Box Talent Matrix Definitions
 * Y-Axis = Potential / Agility (HOW: Core Stats) -> High, Med, Low
 * X-Axis = Performance / Field Execution (WHAT: Outer Layer) -> Low, Med, High
 */
export const NINE_BOX_DEFINITIONS = [
  // Row 0: High Potential (HOW: High >= 6.8)
  {
    code: 'high_low',
    howLevel: 'high',
    whatLevel: 'low',
    row: 0,
    col: 0,
    title: 'Under-Leveraged Talent',
    thai: 'ช้างเผือกที่ยังไม่ได้ปล่อยของ',
    category: 'High Potential / Low Performance',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    colorHex: '#f59e0b',
    desc: 'มีศักยภาพแฝงสูงมากแต่ผลงานจริงยังไม่ออก อาจหมดไฟ (Burnout) หรือติดขัดอุปสรรคหน้างาน',
    action: 'พูดคุย 1-on-1 ทันทีเพื่อค้นหาสาเหตุ มอบหมายงานให้ตรงจุด และปลดล็อกอุปสรรค'
  },
  {
    code: 'high_med',
    howLevel: 'high',
    whatLevel: 'med',
    row: 0,
    col: 1,
    title: 'High-Potential Core',
    thai: 'ดาวเด่นรอการขัดเกลา',
    category: 'High Potential / Moderate Performance',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    colorHex: '#6366f1',
    desc: 'มีศักยภาพพื้นฐานสูงมาก ผลงานอยู่ในเกณฑ์มาตรฐาน พร้อมทะลุขีดจำกัดสู่ระดับยอดเยี่ยม',
    action: 'เพิ่มความท้าทาย มอบหมายเคสวิกฤตหรือเคสยากเพื่อให้ได้ปล่อยของและสร้างผลงานเชิงประจักษ์'
  },
  {
    code: 'high_high',
    howLevel: 'high',
    whatLevel: 'high',
    row: 0,
    col: 2,
    title: 'Star Leader',
    thai: 'เสาหลักผู้ขับเคลื่อนโครงการ',
    category: 'High Potential / High Performance',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    colorHex: '#10b981',
    desc: 'ศักยภาพสูงและผลงานจริงยอดเยี่ยมรอบด้าน เป็นเสาหลักที่ไว้ใจได้สูงสุดในการดูแลหมู่บ้าน',
    action: 'มอบหมายเป็นหัวหน้าชุดซ่อมบำรุง / มอบหมายเคส VIP หรือโครงการปรับปรุงสาธารณูปโภคใหญ่ เตรียมสืบทอดตำแหน่ง'
  },

  // Row 1: Medium Potential (HOW: Med 4.5 - 6.7)
  {
    code: 'med_low',
    howLevel: 'med',
    whatLevel: 'low',
    row: 1,
    col: 0,
    title: 'Inconsistent Performer',
    thai: 'ผลงานแกว่ง ต้องกระตุ้น',
    category: 'Medium Potential / Low Performance',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    colorHex: '#f97316',
    desc: 'มีพื้นฐานพอใช้แต่ผลงานหน้างานยังไม่สม่ำเสมอ ขาดความต่อเนื่องในการส่งมอบงานให้ได้ตามมาตรฐาน',
    action: 'กำหนด Check-point ถี่ขึ้น ติดตามการปิดใบงานรายวัน และทบทวนขั้นตอนระเบียบปฏิบัติงาน'
  },
  {
    code: 'med_med',
    howLevel: 'med',
    whatLevel: 'med',
    row: 1,
    col: 1,
    title: 'Dependable Pillar',
    thai: 'ฟันเฟืองหลักที่มั่นคง',
    category: 'Medium Potential / Moderate Performance',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    colorHex: '#3b82f6',
    desc: 'ผลงานและศักยภาพสอดคล้องกันตามมาตรฐาน เป็นกำลังหลักที่พึ่งพาได้ในงานประจำวัน',
    action: 'รักษาระดับมาตรฐาน และค้นหาความถนัดเฉพาะทาง 1-2 ด้าน เพื่อสร้างจุดเด่นเฉพาะตัว'
  },
  {
    code: 'med_high',
    howLevel: 'med',
    whatLevel: 'high',
    row: 1,
    col: 2,
    title: 'High-Discipline Achiever',
    thai: 'นักสู้ผู้ทุ่มเทด้วยวินัยสูง',
    category: 'Medium Potential / High Performance',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
    colorHex: '#14b8a6',
    desc: 'ผลงานหน้างานโดดเด่นแซงศักยภาพคำนวณ ขยัน มีวินัยสูง และทุ่มเทเพื่อโครงการอย่างแท้จริง',
    action: 'ชื่นชมและถอดบทเรียนการทำงาน (Best Practice) ส่งเสริมให้เรียนรู้ทักษะเทคนิคเชิงลึกเพิ่มเติม'
  },

  // Row 2: Low Potential (HOW: Low < 4.5)
  {
    code: 'low_low',
    howLevel: 'low',
    whatLevel: 'low',
    row: 2,
    col: 0,
    title: 'Urgent OJT Required',
    thai: 'ต้องเข้าโปรแกรมฟื้นฟูเร่งด่วน',
    category: 'Low Potential / Low Performance',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    colorHex: '#ef4444',
    desc: 'ทั้งศักยภาพและผลงานต่ำกว่าเกณฑ์ปฏิบัติงาน เป็นจุดเสี่ยงของทีมที่ต้องได้รับการดูแลใกล้ชิด',
    action: 'จัดพี่เลี้ยงประกบ 1:1 ห้ามทำงานเดี่ยว เข้าแผนพัฒนาทักษะหน้างาน (OJT) ประเมินผลทุก 15 วัน'
  },
  {
    code: 'low_med',
    howLevel: 'low',
    whatLevel: 'med',
    row: 2,
    col: 1,
    title: 'Steady Operator',
    thai: 'ผู้ปฏิบัติงานมาตรฐาน',
    category: 'Low Potential / Moderate Performance',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    colorHex: '#64748b',
    desc: 'ทำงานตามหน้าที่และคำสั่งได้ครบถ้วน แต่อาจยังต้องการคำแนะนำในเคสที่ไม่คุ้นเคย',
    action: 'กำหนดเช็คลิสต์การตรวจงานให้ชัดเจน และจัดคู่หูกับช่างอาวุโสในงานซับซ้อน'
  },
  {
    code: 'low_high',
    howLevel: 'low',
    whatLevel: 'high',
    row: 2,
    col: 2,
    title: 'Field Hero',
    thai: 'ยอดฝีมือหน้างานตัวจริง',
    category: 'Low Potential / High Performance',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    colorHex: '#06b6d4',
    desc: 'แม้มิติการประเมินพื้นฐานจะยังต่ำ แต่ผลลัพธ์หน้างานจริงแก้ปัญหาได้ดีเยี่ยม ไว้วางใจได้',
    action: 'เสริมความรู้เชิงทฤษฎีและการใช้ระบบดิจิทัล เพื่อลดความเหนื่อยล้าในการใช้แรงกายเพียงอย่างเดียว'
  }
];

/**
 * Calculates Strategic Business Risk Index based on TaskFlow telemetry and field competency scores.
 */
export const calculateBusinessRiskIndex = (staff, telemetry = {}, outerSummary = {}) => {
  const roleProfile = getRoleTargetProfile(staff?.role || staff?.class || staff?.classId);
  const isOfficer = roleProfile.key === 'officer';

  // 1. SLA Speed & Overdue Risk
  let slaLevel = 'low';
  let slaReason = 'ไม่มีสถิติงวดงานล่าช้า รักษามาตรฐาน SLA ได้ดี';
  if (!isOfficer && telemetry) {
    const late = telemetry.lateTasksCount || 0;
    const missed = telemetry.totalViolations || 0;
    if (late >= 3 || missed >= 4) {
      slaLevel = 'high';
      slaReason = `พบงานปิดช้า/หลุด SLA สะสม ${missed} รายการ เสี่ยงต่อความพึงพอใจโครงการ`;
    } else if (late >= 1 || missed >= 1) {
      slaLevel = 'moderate';
      slaReason = `พบงานหลุด SLA ${missed} รายการ อยู่ในระดับที่ต้องเฝ้าระวัง`;
    }
  }

  // 2. Quality & Defect Risk
  let qualityLevel = 'low';
  let qualityReason = 'มาตรฐานงานซ่อมประณีต ควบคุมคุณภาพได้ตามเกณฑ์';
  const dexVal = Number(staff?.dex) || 5;
  const techVal = outerSummary?.actualValues?.tech;
  if (dexVal <= 4 || (techVal !== null && techVal !== undefined && techVal <= 4)) {
    qualityLevel = 'high';
    qualityReason = 'คะแนน DEX หรือ TECH ต่ำกว่าเกณฑ์มาตรฐาน เสี่ยงเกิดงานซ่อมซ้ำ (Recurring Defect)';
  } else if (dexVal <= 5) {
    qualityLevel = 'moderate';
    qualityReason = 'ความแม่นยำอยู่ในระดับเกณฑ์ขั้นต่ำ ควรตรวจทานงานซ้ำก่อนส่งมอบ';
  }

  // 3. Fiscal & Governance Risk
  let fiscalLevel = 'low';
  let fiscalReason = 'ควบคุมขั้นตอนงบประมาณ ใบงาน และคลังอะไหล่ได้โปร่งใส';
  const resourceVal = outerSummary?.actualValues?.resource;
  const staleCount = telemetry?.staleTasksCount || 0;
  const lateWOCount = telemetry?.lateWOCount || 0;
  if (staleCount > 0 || lateWOCount >= 2 || (resourceVal !== null && resourceVal !== undefined && resourceVal <= 4)) {
    fiscalLevel = 'high';
    fiscalReason = `พบงานค้างเกิน 30 วัน หรือใบงานออกช้าสะสม ${lateWOCount + staleCount} รายการ เสี่ยงงบประมาณและการตรวจสอบ`;
  } else if (lateWOCount >= 1 || (resourceVal !== null && resourceVal !== undefined && resourceVal <= 5)) {
    fiscalLevel = 'moderate';
    fiscalReason = 'มีประวัติออกใบงานล่าช้าเล็กน้อย อยู่ระหว่างการติดตามการออกเอกสาร';
  }

  // Composite Risk Score
  const riskWeights = { low: 1, moderate: 4, high: 8 };
  const compositeScore = Math.round((riskWeights[slaLevel] + riskWeights[qualityLevel] + riskWeights[fiscalLevel]) / 3);
  let overallLevel = 'low';
  let overallBadge = 'bg-emerald-50 text-emerald-700 border-emerald-300';
  let overallTitle = 'ระดับความเสี่ยงต่ำ (Low Risk)';
  if (compositeScore >= 6) {
    overallLevel = 'high';
    overallBadge = 'bg-rose-50 text-rose-700 border-rose-300';
    overallTitle = 'ระดับความเสี่ยงสูง (High Operational Risk)';
  } else if (compositeScore >= 3) {
    overallLevel = 'moderate';
    overallBadge = 'bg-amber-50 text-amber-700 border-amber-300';
    overallTitle = 'ระดับความเสี่ยงปานกลาง (Moderate Risk)';
  }

  return {
    overallLevel,
    overallBadge,
    overallTitle,
    compositeScore,
    slaRisk: { level: slaLevel, reason: slaReason },
    qualityRisk: { level: qualityLevel, reason: qualityReason },
    fiscalRisk: { level: fiscalLevel, reason: fiscalReason }
  };
};

/**
 * Calculates Succession Readiness Index for career progression (Foreman/Admin -> Lead/Senior).
 */
export const calculateSuccessionReadiness = (staff, archAnalysis = {}, outerSummary = {}) => {
  const roleFit = archAnalysis?.roleFitPct || 70;
  const rawObj = archAnalysis?.rawStats || {};
  const rawList = Object.values(rawObj);
  const avgInner = rawList.length > 0 ? (rawList.reduce((a, b) => a + b, 0) / rawList.length) : 5;
  const avgOuter = outerSummary?.isAssessed && outerSummary?.avgOuter !== null ? outerSummary.avgOuter : null;

  let score;
  if (avgOuter !== null) {
    score = Math.round((roleFit * 0.4) + (avgInner * 3) + (avgOuter * 3));
  } else {
    score = Math.round((roleFit * 0.6) + (avgInner * 3.5));
    score = Math.min(score, 75); // Cap until WHAT is evaluated
  }
  score = Math.min(Math.max(score, 10), 98);

  let readinessLevel = 'developing';
  let statusTitle = 'Developing (กำลังพัฒนาศักยภาพ)';
  let statusThai = 'ต้องการเวลาพัฒนา 2-3 ปี';
  let badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
  let timeHorizon = '2-3 ปี';
  let keyMilestones = [
    'ยกระดับสเตตัสหลักในตำแหน่งปัจจุบันให้ได้เกณฑ์มาตรฐาน ≥ 6/10',
    'ประเมินสมรรถนะหน้างาน 6 แกน (WHAT) ให้ครบถ้วน'
  ];

  if (score >= 85) {
    readinessLevel = 'ready_now';
    statusTitle = 'Ready Now (พร้อมเลื่อนขั้นทันที)';
    statusThai = 'มีความพร้อมเป็นผู้นำทีม / พี่เลี้ยงอาวุโส';
    badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    timeHorizon = '3 - 6 เดือน';
    keyMilestones = [
      'มอบหมายบทบาทผู้ช่วยหัวหน้างาน หรือ Lead ในโครงการใหญ่',
      'ทำหน้าที่เป็นพี่เลี้ยง (Mentor) ถ่ายทอด Best Practice แก่พนักงานใหม่',
      'เข้าร่วมประชุมวิเคราะห์งบประมาณและวางแผน PM ประจำปี'
    ];
  } else if (score >= 70) {
    readinessLevel = 'ready_medium';
    statusTitle = 'Ready in 1-2 Years (พร้อมใน 1-2 ปี)';
    statusThai = 'ดาวเด่นสายปฏิบัติการ อยู่ระหว่างเก็บเกี่ยวประสบการณ์';
    badgeClass = 'bg-blue-50 text-blue-800 border-blue-300';
    timeHorizon = '1 - 2 ปี';
    keyMilestones = [
      'ขยายขอบเขตการตัดสินใจหน้างานในเคสที่มีความซับซ้อน',
      'พัฒนาทักษะการเจรจากับลูกบ้านและการบริหารผู้รับเหมาเพิ่มเติม',
      'รักษาระดับผลงาน SLA และลดอัตรางานซ่อมซ้ำต่อเนื่อง'
    ];
  }

  return {
    score,
    readinessLevel,
    statusTitle,
    statusThai,
    badgeClass,
    timeHorizon,
    keyMilestones,
    isProvisional: avgOuter === null
  };
};

/**
 * Returns the normalized role type ('foreman' | 'admin' | 'officer') for a staff member.
 */
export const getStaffRoleType = (staff, sets = {}) => {
  if (!staff) return 'officer';
  const classObj = (sets?.staffClasses || []).find(c => c.id === staff.classId);
  const target = getRoleTargetProfile(classObj || staff.role || staff.classId || staff.name);
  return target.key; // 'admin' | 'foreman' | 'officer'
};

/**
 * Returns the list of assigned project names for a staff member.
 * Checks:
 * 1. staff.assignedProjects / staff.projects directly on the staff object
 * 2. sets.staffStats for matching staff member
 * 3. sets.emails (format: email|proj1,proj2|name) with exact & substring matching
 */
export const getStaffAssignedProjects = (staffOrName, sets = {}) => {
  if (!staffOrName) return [];

  // 1. Direct object inspection (staff.assignedProjects or staff.projects)
  if (typeof staffOrName === 'object') {
    if (Array.isArray(staffOrName.assignedProjects) && staffOrName.assignedProjects.length > 0) {
      return staffOrName.assignedProjects;
    }
    if (Array.isArray(staffOrName.projects) && staffOrName.projects.length > 0) {
      return staffOrName.projects;
    }
  }

  const staffName = (typeof staffOrName === 'string' ? staffOrName : (staffOrName.name || '')).trim();
  if (!staffName) return [];
  const cleanTargetName = staffName.toLowerCase();

  // 2. Check sets.staffStats
  const staffInStats = (sets?.staffStats || []).find(s => {
    if (typeof staffOrName === 'object' && staffOrName.id && String(s.id) === String(staffOrName.id)) return true;
    return (s.name || '').trim().toLowerCase() === cleanTargetName;
  });
  if (staffInStats) {
    if (Array.isArray(staffInStats.assignedProjects) && staffInStats.assignedProjects.length > 0) {
      return staffInStats.assignedProjects;
    }
    if (Array.isArray(staffInStats.projects) && staffInStats.projects.length > 0) {
      return staffInStats.projects;
    }
  }

  // 3. Check sets.emails (existing format: email|proj1,proj2|name)
  if (sets?.emails) {
    const entries = (sets.emails || []).filter(e => {
      const parts = e.split('|');
      const nameInEntry = (parts[2] || parts[0].split('@')[0] || '').trim().toLowerCase();
      return nameInEntry === cleanTargetName || (nameInEntry && (cleanTargetName.includes(nameInEntry) || nameInEntry.includes(cleanTargetName)));
    });
    const projects = entries.flatMap(e => {
      const projStr = e.split('|')[1] || '';
      return projStr.split(',').map(p => p.trim());
    }).filter(Boolean);
    if (projects.length > 0) {
      return Array.from(new Set(projects));
    }
  }

  return [];
};

export const GO_LIVE_DATE_CUTOFF = '2026-09-01'; // 1 กันยายน 2569 (วันเริ่มใช้งานระบบจริง)

/**
 * Normalizes date string to standard Gregorian YYYY-MM-DD
 * Handles Thai Buddhist Era (256x -> 202x) if present.
 */
export const normalizeToGregorianDate = (dateStr) => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (s.startsWith('256')) {
    const year = parseInt(s.substring(0, 4), 10);
    const ceYear = year - 543;
    return `${ceYear}${s.substring(4)}`;
  }
  return s;
};

/**
 * Returns the primary operational date of a task in YYYY-MM-DD format.
 */
export const getTaskOperationalDate = (t) => {
  if (!t) return '';
  const rawDate = t.completedDate || t.endDate || t.issueReportedAt || t.startDate || t.receivedDate || t.createdAt || t.updatedAt || '';
  const normalized = normalizeToGregorianDate(rawDate);
  return normalized ? normalized.substring(0, 10) : '';
};

/**
 * Checks if a task was already adjudicated by a supervisor in a month prior to activeMonth.
 * If resMonth < activeMonth (e.g. resolved in 2026-09 and viewing 2026-10), it returns true.
 */
export const isTaskDecidedInPriorMonth = (t, activeMonth) => {
  if (!t || !t.slaAuditResolution || !t.slaAuditResolution.responsibleRole) {
    return false;
  }
  const timestamp = t.slaAuditResolution.timestamp;
  if (!timestamp) return false;
  const normalizedTs = normalizeToGregorianDate(timestamp);
  const resMonth = normalizedTs.substring(0, 7);
  const curMonth = normalizeToGregorianDate(activeMonth).substring(0, 7);
  return resMonth < curMonth;
};

/**
 * Evaluates whether a specific discrepancy task actually results in penalty point deductions
 * for a specific staff member based on their role type ('foreman' | 'admin' | 'officer') and RACI attribution.
 */
export const doesDiscrepancyPenalizeStaff = (item, roleType) => {
  if (!item || !roleType) return false;
  if (roleType === 'officer') return false; // Officers are exempt
  const attrRole = item.attribution?.role;
  if (attrRole === 'waived') return false; // Waived tasks deduct from nobody

  if (roleType === 'foreman') {
    if (item.type === 'LATE_COMPLETED') return attrRole !== 'admin' && attrRole !== 'waived';
    if (item.type === 'LATE_WO') return attrRole === 'foreman' || attrRole === 'shared';
    if (item.type === 'STALE_TASK') return attrRole !== 'waived';
    if (item.type === 'SPARE_PARTS_45D' || item.type === 'PENALTY_SPARE_PART' || (item.type && item.type.startsWith('RETROACTIVE'))) {
      return attrRole !== 'admin' && attrRole !== 'waived';
    }
    return false;
  }

  if (roleType === 'admin') {
    if (item.type === 'LATE_WO' || item.type === 'DUPLICATE_WO' || item.type === 'BILLING_CUTOFF') {
      return attrRole === 'admin' || attrRole === 'shared';
    }
    if (item.type === 'LATE_COMPLETED') return attrRole === 'admin';
    if (item.type === 'STALE_TASK') return attrRole !== 'waived';
    return false;
  }

  return false;
};

/**
 * Aggregates live TaskFlow operational telemetry for a staff member based on RACI rules.
 * Strictly separates:
 * - Officer: EXEMPT from operational task metric penalties (governance role).
 * - Foreman: Field execution, SLA speed, retroactive postponements, BOQ delivery, parts integrity.
 * - Admin: Work order creation speed (3-day SLA), system integrity, 15th cut-off billing discipline.
 * 
 * Rules:
 * 1. Go-Live Cutoff: Tasks older than September 2569 (2026-09-01) are excluded as legacy/pre-launch data.
 * 2. Prior Resolution Roll-forward: Tasks decided by a supervisor in a prior month do not reappear in subsequent months.
 */
export const aggregateStaffTaskTelemetry = (staff, tasks = [], sets = {}, currentMonth = null) => {
  const now = new Date();
  const currentSystemMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const activeMonth = currentMonth ? normalizeToGregorianDate(currentMonth).substring(0, 7) : currentSystemMonth;

  if (!staff || !staff.name) {
    return {
      isExempt: false,
      roleType: 'unknown',
      roleTitle: 'ไม่ระบุสายอาชีพ',
      roleBadge: 'ไม่ระบุสายอาชีพ',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
      assignedProjects: [],
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      activeOverdueTasks: 0,
      lateFinishedTasks: 0,
      sparePartsOver45Days: 0,
      lateWOTasks: 0,
      slaRate: 100,
      discrepancyTasks: [],
      priorResolvedDiscrepancies: [],
      penalties: [],
      alerts: [],
      activeMonth,
      goLiveCutoff: GO_LIVE_DATE_CUTOFF
    };
  }

  const roleType = getStaffRoleType(staff, sets);
  const staffName = staff.name.trim();
  const assignedProjects = getStaffAssignedProjects(staff, sets);
  const hasAllProjects = assignedProjects.includes('ทั้งหมด') || assignedProjects.includes('ทุกโครงการ');

  // 1. Officer Role: Strictly EXEMPT from TaskFlow operational task metric penalties
  if (roleType === 'officer') {
    return {
      isExempt: true,
      roleType: 'officer',
      roleTitle: 'เจ้าหน้าที่บริหารโครงการ (LH Officer)',
      roleBadge: '🛡️ เจ้าหน้าที่บริหารโครงการ (LH Officer) — ได้รับการยกเว้นจากการนำสถิติ TaskFlow มาคิดคะแนน',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
      reason: 'เจ้าหน้าที่บริหารโครงการ / ผจก. LH มีบทบาทเป็นผู้กำกับดูแล (Supervisor & Approver) จึงไม่ถูกตัดคะแนนจาก SLA หน้างาน',
      assignedProjects,
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      slaRate: 100,
      penalties: [],
      discrepancyTasks: [],
      priorResolvedDiscrepancies: [],
      activeMonth,
      goLiveCutoff: GO_LIVE_DATE_CUTOFF,
      alerts: [
        {
          type: 'info',
          title: 'ผู้ประเมินและกำกับดูแล (Evaluator Role)',
          desc: 'บุคลากรนี้มีสถานะเป็นผู้กำกับดูแลโครงการ คะแนนศักยภาพมาจากแบบประเมินผู้บริหาร ไม่นำสถิติ SLA รายงานมาหักคะแนน'
        }
      ]
    };
  }

  // 2. Filter tasks within the staff member's operational scope AND after the Go-Live Date (Sep 2026)
  const scopedTasks = tasks.filter(t => {
    if (!t) return false;

    // Rule: Exclude tasks prior to Go-Live Date (September 2569 / 2026-09-01)
    const opDate = getTaskOperationalDate(t);
    if (opDate && opDate < GO_LIVE_DATE_CUTOFF) {
      return false; // Older than September 2026: Ignore completely as system was not live yet
    }

    const taskStaff = (t.staffName || '').trim().toLowerCase();
    const isDirectStaffMatch = taskStaff && taskStaff === staffName.toLowerCase();
    
    if (isDirectStaffMatch) return true;
    if (hasAllProjects) return true;
    if (assignedProjects.length > 0 && t.project) {
      const cleanTaskProj = t.project.trim().toLowerCase();
      return assignedProjects.some(p => {
        const cleanP = p.trim().toLowerCase();
        return cleanTaskProj.includes(cleanP) || cleanP.includes(cleanTaskProj);
      });
    }
    return false;
  });

  const totalAssigned = scopedTasks.length;
  const completedTasks = scopedTasks.filter(t => t.status === 'จบงาน' || t.status === 'จบงาน(รอใบงาน)');
  const activeTasks = scopedTasks.filter(t => t.status === 'รอดำเนินการ' || t.status === 'กำลังดำเนินการ');
  const issueTasks = scopedTasks.filter(t => t.status === 'ติดปัญหา/รออะไหล่' || t.status === 'รออะไหล่/ติดปัญหา');
  const canceledTasks = scopedTasks.filter(t => t.status === 'ยกเลิก');

  // Helper to determine attribution with precedence:
  // 1. Explicit supervisor audit resolution (slaAuditResolution)
  // 2. Explicit WO attribution recorded upon completion (woAttribution)
  // 3. Automated heuristic fallback
  const getTaskAttribution = (t, defaultType = 'unassigned') => {
    if (t.slaAuditResolution && t.slaAuditResolution.responsibleRole) {
      return {
        role: t.slaAuditResolution.responsibleRole, // 'foreman' | 'admin' | 'shared' | 'waived'
        reason: t.slaAuditResolution.reason || '',
        by: t.slaAuditResolution.supervisorName || 'ผู้ดูแล',
        timestamp: t.slaAuditResolution.timestamp,
        coords: t.slaAuditResolution.coords,
        isExplicit: true
      };
    }
    if (t.woAttribution && t.woAttribution.responsibleRole) {
      return {
        role: t.woAttribution.responsibleRole,
        reason: t.woAttribution.reason || '',
        by: t.woAttribution.recordedBy || 'ระบบ',
        timestamp: t.woAttribution.timestamp,
        isExplicit: true
      };
    }
    // Heuristic fallback for late WO
    const text = `${t.overdueReason || ''} ${t.issueReason || ''}`.toLowerCase();
    if (text.includes('boq') || text.includes('ราคา') || text.includes('สเปก') || text.includes('เสนอราคา')) {
      return { role: 'foreman', reason: 'ตรวจพบสาเหตุระบุเกี่ยวกับ BOQ/ราคา (อัตโนมัติ)', isExplicit: false };
    }
    return { role: defaultType, reason: '', isExplicit: false };
  };

  // Rule 1: Late finish (จบงานช้า) -> Overdue completions & active overdue (Waived and Admin-attributed tasks excluded from Foreman penalties)
  const activeOverdue = scopedTasks.filter(t => {
    if (t.status === 'จบงาน' || t.status === 'ยกเลิก') return false;
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false; // Already decided in prior month
    const attr = getTaskAttribution(t, 'foreman');
    if (attr.role === 'waived' || attr.role === 'admin') return false;
    return t.overdueStatus === 'เกินกำหนด';
  });

  const lateCompleted = completedTasks.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false; // Already decided in prior month
    const attr = getTaskAttribution(t, 'foreman');
    if (attr.role === 'waived') return false; // Supervisor granted waiver
    if (attr.role === 'admin') return false; // Supervisor attributed to Admin, Foreman is not penalized
    if (t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า') return true;
    if (t.completedDate && t.endDate && t.completedDate > t.endDate) return true;
    return false;
  });

  const lateCompletedAdminAttributed = completedTasks.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false;
    const attr = getTaskAttribution(t, 'foreman');
    return attr.role === 'admin';
  });

  const onTimeCompleted = completedTasks.length - lateCompleted.length;
  const slaRate = completedTasks.length > 0 ? Math.round((Math.max(0, onTimeCompleted) / completedTasks.length) * 100) : 100;

  // Rule 2: Retroactive start postponements (เลื่อนวันเริ่มหลังกำหนดเริ่ม)
  const retroactiveStartPostpones = scopedTasks.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false;
    const attr = getTaskAttribution(t, 'foreman');
    if (attr.role === 'waived' || attr.role === 'admin') return false;
    if (t.status === 'เลื่อนวันเริ่ม' && t.startPostponedAt && t.previousStartDate) {
      return new Date(t.startPostponedAt) > new Date(t.previousStartDate);
    }
    return false;
  });

  // Rule 3: Retroactive end postponements (เลื่อนวันจบหลังจากเลยกำหนดเดิมไปแล้ว >= 1 วัน)
  const retroactiveEndPostpones = scopedTasks.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false;
    const attr = getTaskAttribution(t, 'foreman');
    if (attr.role === 'waived' || attr.role === 'admin') return false;
    if (t.postponedAt && t.previousEndDate) {
      const diffMs = new Date(t.postponedAt).getTime() - new Date(t.previousEndDate).getTime();
      return diffMs >= 86400000; // >= 1 day
    }
    return false;
  });

  // Rule 4: Late Work Order issuance (> 3 days between completedDate and WO assignment)
  const lateWOTasks = scopedTasks.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false;
    if (t.lateWorkOrder) return true;
    if (t.status === 'จบงาน' && t.completedDate && t.workOrderNo) {
      const woEntry = (t.timeline || []).find(e => e.action === 'WO_ATTACHED');
      if (woEntry && t.completedDate) {
        const diffDays = (new Date(woEntry.timestamp).getTime() - new Date(t.completedDate).getTime()) / (1000 * 3600 * 24);
        return diffDays > 3;
      }
    }
    return false;
  });

  const lateWOForemanAttributed = lateWOTasks.filter(t => {
    const attr = getTaskAttribution(t, 'admin');
    if (attr.role === 'waived') return false;
    return attr.role === 'foreman' || attr.role === 'shared';
  });

  const lateWOAdminAttributed = lateWOTasks.filter(t => {
    const attr = getTaskAttribution(t, 'admin');
    if (attr.role === 'waived') return false;
    return attr.role === 'admin' || attr.role === 'shared';
  });

  // Rule 5: Abandoned / Ghost tasks (> 7 days without update)
  const nowMs = Date.now();
  const staleGhostTasks = activeTasks.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false;
    const lastTime = t.updatedAt || t.startDate || t.receivedDate;
    if (!lastTime) return false;
    const diffDays = (nowMs - new Date(lastTime).getTime()) / (1000 * 3600 * 24);
    return diffDays > 7;
  });

  // Rule 6: Waiting for parts ceiling (> 45 days)
  const sparePartsOver45Days = issueTasks.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false;
    const attr = getTaskAttribution(t, 'foreman');
    if (attr.role === 'waived' || attr.role === 'admin') return false;
    const reportTime = t.issueReportedAt || t.startDate;
    if (!reportTime) return false;
    const diffDays = (nowMs - new Date(reportTime).getTime()) / (1000 * 3600 * 24);
    return diffDays > 45;
  });

  // Rule 6B: Disciplinary Revocation Flag ("ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)")
  const penaltySparePartsTasks = scopedTasks.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false;
    return t.status === 'ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)' || t.penaltyRevokeSla === true;
  });

  // Rule 7: Duplicate Work Order Cancellation
  const duplicateCancellations = canceledTasks.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false;
    const attr = getTaskAttribution(t, 'admin');
    if (attr.role === 'waived') return false;
    const text = (t.cancelReason || '').toLowerCase();
    return text.includes('ซ้ำ') || text.includes('duplicate') || text.includes('เปิดเบิ้ล');
  });

  // Rule 8: Monthly Billing Cycle (15th Cut-off Rule) - Evaluated for Admin
  const billingEligible = completedTasks.filter(t => t.completedDate);
  const billingViolations = billingEligible.filter(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) return false;
    const attr = getTaskAttribution(t, 'admin');
    if (attr.role === 'waived') return false;
    if (!t.completedDate) return false;
    const compParts = t.completedDate.split('-');
    if (compParts.length < 3) return false;
    const day = parseInt(compParts[2], 10);
    const compMonth = `${compParts[0]}-${compParts[1]}`;
    const isFinishedBefore15 = day <= 15;
    
    // If finished on or before 15th, must be billed in that same month or earlier
    if (isFinishedBefore15 && t.billingStatus !== 'ส่งเบิกแล้ว') {
      if (activeMonth > compMonth) return true; // Past the cycle without billing
    }
    return false;
  });

  // Collect All Discrepancy Tasks for Audit
  const discrepancyTasks = [];

  // Rule 1 Discrepancies
  lateCompleted.forEach(t => {
    discrepancyTasks.push({
      task: t,
      type: 'LATE_COMPLETED',
      title: 'จบงานช้ากว่ากำหนด SLA',
      ruleNo: 1,
      desc: `กำหนดเสร็จ ${t.endDate || '-'} แต่จบงานจริงเมื่อ ${t.completedDate || '-'}`,
      days: 0,
      attribution: getTaskAttribution(t, 'foreman')
    });
  });

  lateWOTasks.forEach(t => {
    let diffDays = 3;
    if (t.completedDate) {
      const woEntry = (t.timeline || []).find(e => e.action === 'WO_ATTACHED');
      if (woEntry) {
        diffDays = Math.max(3, Math.round((new Date(woEntry.timestamp).getTime() - new Date(t.completedDate).getTime()) / (1000 * 3600 * 24)));
      }
    }
    discrepancyTasks.push({
      task: t,
      type: 'LATE_WO',
      title: 'ออกใบงานช้าเกิน 3 วัน',
      ruleNo: 4,
      desc: `จบงานหน้างานเมื่อ ${t.completedDate || '-'} แต่เปิดใบงานช้าไป ${diffDays} วัน`,
      days: diffDays,
      attribution: getTaskAttribution(t, 'admin')
    });
  });

  staleGhostTasks.forEach(t => {
    const lastTime = t.updatedAt || t.startDate || t.receivedDate;
    const diffDays = Math.round((nowMs - new Date(lastTime).getTime()) / (1000 * 3600 * 24));
    discrepancyTasks.push({
      task: t,
      type: 'STALE_TASK',
      title: 'งานค้างทิ้งร้างเกิน 7 วัน',
      ruleNo: 5,
      desc: `ไม่มีการอัปเดตสถานะในระบบมาแล้ว ${diffDays} วัน`,
      days: diffDays,
      attribution: getTaskAttribution(t, 'shared')
    });
  });

  sparePartsOver45Days.forEach(t => {
    const reportTime = t.issueReportedAt || t.startDate;
    const diffDays = Math.round((nowMs - new Date(reportTime).getTime()) / (1000 * 3600 * 24));
    discrepancyTasks.push({
      task: t,
      type: 'SPARE_PARTS_45D',
      title: 'รออะไหล่เกินเพดาน 45 วัน',
      ruleNo: 6,
      desc: `ติดปัญหารออะไหล่มาแล้ว ${diffDays} วัน (เกินเพดานอนุโลม 45 วัน)`,
      days: diffDays,
      attribution: getTaskAttribution(t, 'foreman')
    });
  });

  penaltySparePartsTasks.forEach(t => {
    discrepancyTasks.push({
      task: t,
      type: 'PENALTY_SPARE_PART',
      title: '🚨 ผิดเงื่อนไขรออะไหล่ (คำสั่งวินัย)',
      ruleNo: 6.5,
      desc: t.penaltyAudit?.reason || 'ตรวจพบอะไหล่ถึงหน้างานแล้วแต่งานไม่คืบหน้า (ถูกประทับตราตัดคะแนน)',
      days: 0,
      attribution: {
        role: 'foreman',
        reason: t.penaltyAudit?.reason || 'คำสั่งลงโทษโดยผู้ดูแล',
        by: t.penaltyAudit?.supervisorName || 'ผู้ดูแล',
        timestamp: t.penaltyAudit?.timestamp,
        coords: t.penaltyAudit?.coords,
        isExplicit: true
      }
    });
  });

  retroactiveStartPostpones.forEach(t => {
    discrepancyTasks.push({
      task: t,
      type: 'RETROACTIVE_START',
      title: 'เลื่อนวันเริ่มย้อนหลัง',
      ruleNo: 2,
      desc: `ขอเลื่อนวันเริ่มหลังจากเลยกำหนดเริ่มเดิม (${t.previousStartDate || '-'})`,
      days: 0,
      attribution: getTaskAttribution(t, 'foreman')
    });
  });

  retroactiveEndPostpones.forEach(t => {
    discrepancyTasks.push({
      task: t,
      type: 'RETROACTIVE_END',
      title: 'เลื่อนวันจบหลังเลยกำหนด',
      ruleNo: 3,
      desc: `ขอเลื่อนวันจบหลังจากเลยกำหนดเดิมเกิน 1 วัน (${t.previousEndDate || '-'})`,
      days: 0,
      attribution: getTaskAttribution(t, 'foreman')
    });
  });

  duplicateCancellations.forEach(t => {
    discrepancyTasks.push({
      task: t,
      type: 'DUPLICATE_WO',
      title: 'เปิดงานซ้ำซ้อนจนต้องยกเลิก',
      ruleNo: 7,
      desc: t.cancelReason || 'ยกเลิกเนื่องจากเปิดใบงานซ้ำ',
      days: 0,
      attribution: getTaskAttribution(t, 'admin')
    });
  });

  billingViolations.forEach(t => {
    discrepancyTasks.push({
      task: t,
      type: 'BILLING_CUTOFF',
      title: 'หลุดรอบส่งเบิกเงินวันที่ 15',
      ruleNo: 8,
      desc: `งานจบก่อนวันที่ 15 (${t.completedDate}) แต่ยังไม่ส่งเบิกในรอบเดือน`,
      days: 0,
      attribution: getTaskAttribution(t, 'admin')
    });
  });

  // Calculate Deductions & Recommendations
  const penalties = [];
  const alerts = [];

  if (roleType === 'foreman') {
    // Foreman Penalties: SLA Speed, Proactive Planning, Time Discipline, Crisis Discipline
    if (lateCompleted.length > 0) {
      penalties.push({
        axis: 'sla',
        points: Math.min(5, lateCompleted.length),
        reason: `จบงานช้ากว่ากำหนดจำนวน ${lateCompleted.length} งาน (หักคะแนน SLA Speed)`
      });
    }
    if (retroactiveStartPostpones.length > 0) {
      penalties.push({
        axis: 'tech',
        points: Math.min(4, retroactiveStartPostpones.length),
        reason: `ขอเลื่อนวันเริ่มย้อนหลังจำนวน ${retroactiveStartPostpones.length} ครั้ง (หักคะแนนการวางแผนเชิงรุก)`
      });
    }
    if (retroactiveEndPostpones.length > 0) {
      penalties.push({
        axis: 'sla',
        points: Math.min(4, retroactiveEndPostpones.length),
        reason: `ขอเลื่อนวันจบหลังเลยกำหนดเดิมเกิน 1 วัน จำนวน ${retroactiveEndPostpones.length} ครั้ง (หักคะแนนวินัยเวลา)`
      });
    }
    if (lateWOForemanAttributed.length > 0) {
      penalties.push({
        axis: 'tech',
        points: Math.min(4, lateWOForemanAttributed.length),
        reason: `ออกใบงานช้าเกิน 3 วันจากสาเหตุรอ BOQ/ราคา จำนวน ${lateWOForemanAttributed.length} รายการ (หักคะแนนความเร็วทำราคา)`
      });
    }
    // Rule 5: Stale tasks (70% responsibility)
    const activeUnwaivedStale = staleGhostTasks.filter(t => getTaskAttribution(t, 'shared').role !== 'waived');
    if (activeUnwaivedStale.length > 0) {
      penalties.push({
        axis: 'sla',
        points: Math.min(5, activeUnwaivedStale.length),
        reason: `มีงานค้างทิ้งร้างในระบบเกิน 7 วันจำนวน ${activeUnwaivedStale.length} งาน (รับผิดชอบร่วม 70% ด้านการขับเคลื่อนงาน)`
      });
    }
    if (penaltySparePartsTasks.length > 0) {
      penalties.push({
        axis: 'crisis',
        points: Math.min(6, penaltySparePartsTasks.length * 2),
        reason: `🚨 ถูกผู้ดูแลลงโทษสถานะ "ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)" จำนวน ${penaltySparePartsTasks.length} รายการ (หักคะแนนวินัยวิกฤต)`
      });
      alerts.push({
        type: 'danger',
        title: '🚨 ตรวจพบการถูกลงโทษทางวินัยอะไหล่',
        desc: `พบงานที่ถูกผู้ดูแลประทับตรา "ผิดเงื่อนไขรออะไหล่" จำนวน ${penaltySparePartsTasks.length} รายการ ส่งผลให้ถูกตัดคะแนน SLA และ Crisis ทันที`
      });
    }
    if (sparePartsOver45Days.length > 0) {
      alerts.push({
        type: 'warning',
        title: '⚠️ งานรออะไหล่เกินเพดาน 45 วัน',
        desc: `มีงานรออะไหล่นานเกิน 45 วันจำนวน ${sparePartsOver45Days.length} รายการ ควรตรวจสอบและเร่งรัดผู้ผลิต/ผู้รับเหมา`
      });
    }
  } else if (roleType === 'admin') {
    // Admin Penalties: WO SLA Speed, Billing Cycle Discipline (15th Cut-off), Late Completions Attributed to Admin, System Integrity
    if (lateCompletedAdminAttributed.length > 0) {
      penalties.push({
        axis: 'sla',
        points: Math.min(4, lateCompletedAdminAttributed.length),
        reason: `งานจบช้ากว่ากำหนดจากสาเหตุฝ่ายธุรการ/เอกสาร จำนวน ${lateCompletedAdminAttributed.length} งาน (คำวินิจฉัยผู้ดูแล)`
      });
    }
    if (lateWOAdminAttributed.length > 0) {
      penalties.push({
        axis: 'sla',
        points: Math.min(5, lateWOAdminAttributed.length),
        reason: `ออกใบงานช้าเกิน 3 วัน SLA จำนวน ${lateWOAdminAttributed.length} รายการ (หักคะแนนความเร็วระบบเอกสาร)`
      });
    }
    // Rule 5: Stale tasks (30% responsibility)
    const activeUnwaivedStale = staleGhostTasks.filter(t => getTaskAttribution(t, 'shared').role !== 'waived');
    if (activeUnwaivedStale.length > 0) {
      penalties.push({
        axis: 'sla',
        points: Math.min(3, activeUnwaivedStale.length),
        reason: `มีงานค้างทิ้งร้างในระบบเกิน 7 วันจำนวน ${activeUnwaivedStale.length} งาน (รับผิดชอบร่วม 30% ด้านการติดตามระบบ)`
      });
    }
    if (duplicateCancellations.length > 0) {
      penalties.push({
        axis: 'innovation',
        points: Math.min(4, duplicateCancellations.length),
        reason: `เปิดใบงานซ้ำซ้อนจนต้องยกเลิกจำนวน ${duplicateCancellations.length} รายการ (หักคะแนนความถูกต้องของระบบ)`
      });
    }
    if (billingViolations.length > 0) {
      penalties.push({
        axis: 'resource',
        points: Math.min(5, billingViolations.length),
        reason: `ไม่ส่งเบิกงานที่จบก่อนวันที่ 15 ภายในรอบเดือน จำนวน ${billingViolations.length} รายการ (หักคะแนนวินัยการเงิน)`
      });
      alerts.push({
        type: 'warning',
        title: '⚠️ หลุดรอบส่งเบิกเงินตามเกณฑ์วันที่ 15',
        desc: `พบงานที่ปิดจบก่อนวันที่ 15 แต่ยังไม่ส่งเบิกในรอบเดือนจำนวน ${billingViolations.length} รายการ`
      });
    }
  }

  // Collect All Prior-Resolved Discrepancies (Historical Audits from Prior Months)
  // These are preserved for audit trail transparency, but excluded from active month queues and deductions
  const priorResolvedDiscrepancies = [];
  scopedTasks.forEach(t => {
    if (isTaskDecidedInPriorMonth(t, activeMonth)) {
      const res = t.slaAuditResolution || {};
      const resDate = res.timestamp ? String(res.timestamp).substring(0, 10) : '';
      priorResolvedDiscrepancies.push({
        task: t,
        type: 'RESOLVED_PRIOR_MONTH',
        title: 'งานที่ตัดสินเสร็จสิ้นในเดือนก่อนหน้า',
        ruleNo: 0,
        desc: `คำวินิจฉัย: "${res.reason || 'ตัดสินแล้ว'}" (วินิจฉัยให้: ${res.responsibleRole || '-'} โดย ${res.supervisorName || 'ผู้ดูแล'} เมื่อ ${resDate})`,
        days: 0,
        attribution: getTaskAttribution(t, 'foreman')
      });
    }
  });

  return {
    isExempt: false,
    roleType,
    roleTitle: roleType === 'foreman' ? 'วิศวกร/โฟร์แมนหน้างาน (Foreman)' : 'ธุรการ/ผู้ประสานงานโครงการ (Admin)',
    roleBadge: roleType === 'foreman' 
      ? '🛠️ โฟร์แมน/วิศวกรภาคสนาม (Field Operations) — ผูกโยงสถิติงานหน้างานจริง'
      : '📋 ธุรการ/ผู้ประสานงานโครงการ (System & Fiscal Operations) — ผูกโยงสถิติระบบและรอบเบิกจ่าย',
    badgeClass: roleType === 'foreman' ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' : 'bg-blue-500/20 text-blue-300 border-blue-400/40',
    assignedProjects,
    totalTasks: totalAssigned,
    completedTasks: completedTasks.length,
    activeTasks: activeTasks.length,
    issueTasks: issueTasks.length,
    canceledTasks: canceledTasks.length,
    activeOverdueTasks: activeOverdue.length,
    lateFinishedTasks: lateCompleted.length,
    onTimeFinishedTasks: onTimeCompleted,
    slaRate,
    retroactiveStartPostpones: retroactiveStartPostpones.length,
    retroactiveEndPostpones: retroactiveEndPostpones.length,
    lateWOTasks: lateWOTasks.length,
    lateWOForemanAttributed: lateWOForemanAttributed.length,
    lateWOAdminAttributed: lateWOAdminAttributed.length,
    lateCompletedAdminAttributed: lateCompletedAdminAttributed.length,
    staleGhostTasks: staleGhostTasks.length,
    sparePartsOver45Days: sparePartsOver45Days.length,
    penaltySparePartsTasks: penaltySparePartsTasks.length,
    duplicateCancellations: duplicateCancellations.length,
    billingViolations: billingViolations.length,
    discrepancyTasks,
    priorResolvedDiscrepancies,
    penalties,
    alerts,
    activeMonth,
    goLiveCutoff: GO_LIVE_DATE_CUTOFF
  };
};


