import defaultArchetypesData from '../data/archetypes.json';

export const STAT_KEYS = ['str', 'agi', 'dex', 'int', 'con', 'sen'];

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
    key: 'str', name: 'STR (Strength)', group: 'The Heavy Lifters', desc: 'Execution & Impact', 
    rubric: {
      basic: 'ลังเล ต้องรอคำสั่งจากหัวหน้าเสมอ',
      intermediate: 'ตัดสินใจเองได้เฉพาะงาน Routine / ปิดเคสยากได้ตามมาตรฐานบริษัท',
      advanced: 'กล้าตัดสินใจในเคสพิพาทที่ซับซ้อน / มีความสม่ำเสมอในการเจรจารักษาสัมพันธ์ลูกค้า',
      mastery: 'อนุมัติงบพิเศษหรือมาตรการเยียวยาเพื่อจบวิกฤตได้ทันที / ปิดเคสระดับวิกฤตได้สำเร็จ'
    }
  },
  agi: { 
    key: 'agi', name: 'AGI (Agility)', group: 'The Precision Engine', desc: 'Speed & Adaptability', 
    rubric: {
      basic: 'ตอบกลับล่าช้ากว่า SLA / รับมือล่าช้าหรือไม่รู้ขั้นตอนปฏิบัติ',
      intermediate: 'ตอบกลับตามมาตรฐานเวลา / ตอบสนองเหตุการณ์ตามขั้นตอน',
      advanced: 'ตอบกลับเร็วกว่าค่าเฉลี่ย / ระงับเหตุและประสานงานแก้วิกฤตได้เร็ว',
      mastery: 'ตอบกลับทันทีและเตรียมทางออกล่วงหน้า / คาดการณ์ความเสี่ยงและเข้าถึงหน้างานก่อนเกิดเหตุบานปลาย'
    }
  },
  dex: { 
    key: 'dex', name: 'DEX (Dexterity)', group: 'The Precision Engine', desc: 'Precision & Quality', 
    rubric: {
      basic: 'พบข้อผิดพลาดบ่อย / มองไม่เห็นจุด Defect พื้นฐาน',
      intermediate: 'ข้อมูลถูกต้องตามมาตรฐาน / ตรวจพบ Defect ทั่วไปตาม Check-list',
      advanced: 'ข้อมูลแม่นยำสูง / ตรวจพบจุดบกพร่องที่ซ่อนเร้นเชิงเทคนิค',
      mastery: 'ข้อมูลและตัวเลขสมบูรณ์ 100% ไร้ที่ติ / ชี้จุดผิดพลาดที่ส่งผลต่ออายุการใช้งานได้อย่างเป๊ะ'
    }
  },
  int: { 
    key: 'int', name: 'INT (Intelligence)', group: 'The Mastermind', desc: 'Tech, Systems & Automation', 
    rubric: {
      basic: 'ใช้เครื่องมือพื้นฐานได้ไม่คล่องตัว / ทำงานซ้ำซ้อนโดยไม่ใช้ระบบช่วย',
      intermediate: 'ใช้ระบบ (CRM/Excel) ติดตามงานได้ดี / จัดคิวงานตัวเองได้อย่างเป็นระบบ',
      advanced: 'ออกแบบโฟลว์งาน (Workflow) ลดความซ้ำซ้อน / สร้าง Dashboard ควบคุมงานได้',
      mastery: 'นำเทคโนโลยีขั้นสูง (AI/Automation) มาปฏิวัติการทำงาน / วางโครงสร้างระบบไร้รอยต่อ'
    }
  },
  con: { 
    key: 'con', name: 'CON (Constitution)', group: 'The Heavy Lifters', desc: 'Resilience & Mental Toughness', 
    rubric: {
      basic: 'หลุดมาตรฐานเมื่อเจองานหนัก / ประสิทธิภาพลดลงเมื่อกดดัน',
      intermediate: 'คุมสติตามมาตรฐานวิชาชีพ / ทำงานได้ต่อเนื่องแม้งานมีปริมาณมาก',
      advanced: 'อดทนและโฟกัสกับเป้าหมายได้ดีเยี่ยม / มาตรฐานงานไม่ตกแม้เผชิญวิกฤตรอบด้าน',
      mastery: 'ยืนหยัดเป็นเสาหลักในภาวะวิกฤต (Crisis) / เปลี่ยนแรงกดดันมหาศาลเป็นพลังบวกให้ทีม'
    }
  },
  sen: { 
    key: 'sen', name: 'SEN (Sense)', group: 'The Empathizers', desc: 'Stakeholder Insight & Negotiation', 
    rubric: {
      basic: 'สื่อสารทางเดียว / ไม่เข้าใจอารมณ์และความต้องการที่แท้จริงของลูกค้าหรือช่าง',
      intermediate: 'รับฟังอย่างตั้งใจ / ควบคุมการสื่อสารในสถานการณ์ทั่วไปได้ราบรื่น',
      advanced: 'อ่านเกมขาด / โน้มน้าวและต่อรองเพื่อหาจุดร่วมที่ Win-Win ในเคสที่มีความขัดแย้งสูง',
      mastery: 'เปลี่ยนข้อพิพาทรุนแรงให้กลายเป็นความประทับใจ / สร้างพันธมิตรที่พร้อมให้ความร่วมมือระยะยาว'
    }
  }
};

export const getStatLevelText = (val) => {
  const v = Number(val);
  if (v === 10) return 'ระดับตำนาน (Legendary)';
  if (v === 9) return 'ระดับผู้นำ (Mastery)';
  if (v === 8) return 'ระดับผู้เชี่ยวชาญพิเศษ (Expert)';
  if (v === 7) return 'ระดับเชี่ยวชาญ (Advanced)';
  if (v === 6) return 'ระดับดีเยี่ยม (Good)';
  if (v === 5) return 'ระดับมาตรฐาน (Standard)';
  if (v === 4) return 'ต่ำกว่าเกณฑ์ (Below Average)';
  if (v === 3) return 'ต้องการการดูแล (Needs Help)';
  if (v === 2) return 'ต้องปรับปรุง (Poor)';
  return 'ขั้นวิกฤต (Crisis)';
};

export const getRubricText = (statOrKey, val) => {
  const stat = (typeof statOrKey === 'string') ? STAT_DEFINITIONS[statOrKey.toLowerCase()] : statOrKey;
  if (!stat || !stat.rubric) return '';
  const v = Number(val);
  if (v >= 9) return stat.rubric.mastery;
  if (v >= 7) return stat.rubric.advanced;
  if (v >= 4) return stat.rubric.intermediate;
  return stat.rubric.basic;
};

export const getArchetypeIdentity = (statsObj, archetypesData = defaultArchetypesData) => {
  if (!statsObj) return '-';
  const rawStats = Object.keys(TIE_BREAKERS).map(k => Number(statsObj[k]) || 0);
  const maxStat = Math.max(...rawStats);
  const minStat = Math.min(...rawStats);
  
  if (maxStat === minStat) {
    const uniformNames = {
      1: 'Critical Crisis (ขั้นวิกฤต/ต้องจัดการเด็ดขาด)',
      2: 'Severe Underperformer (ต่ำกว่าเกณฑ์รุนแรง)',
      3: 'Needs Intensive Care (ต้องดูแลใกล้ชิด)',
      4: 'Inconsistent Performer (ขาดความสม่ำเสมอ)',
      5: 'Standard Achiever (ผู้บรรลุมาตรฐาน)',
      6: 'Solid Contributor (ผู้ขับเคลื่อนชั้นเยี่ยม)',
      7: 'Advanced Generalist (ผู้เชี่ยวชาญรอบด้าน)',
      8: 'Expert Leader (ผู้นำระดับผู้เชี่ยวชาญ)',
      9: 'The Mastermind (ผู้คุมเกม)',
      10: 'The Legend (ระดับตำนาน)'
    };
    return uniformNames[maxStat] || 'The Standard (ผลงานตามมาตรฐาน)';
  }

  if (maxStat >= 8 && minStat <= 3) {
    return 'Polarized Prodigy (สุดโต่งแต่อ่อนไหว)';
  }

  if (maxStat <= 5) {
    if (minStat >= 4) return 'Generalist (ผู้เรียนรู้รอบด้าน)';
    const has4 = rawStats.some(v => v >= 4);
    const has3 = rawStats.some(v => v <= 3);
    if (has4 && has3) return 'Trainee (อยู่ในช่วงพัฒนาทักษะ)';
    return 'Uncalibrated (ศักยภาพที่รอการเจียระไน)';
  }

  const validStats = Object.keys(TIE_BREAKERS).map(k => ({
    key: k,
    val: Number(statsObj[k]) || 0,
    adj: (Number(statsObj[k]) || 0) + TIE_BREAKERS[k]
  })).filter(s => s.val >= 5).sort((a, b) => b.adj - a.adj);

  if (validStats.length < 2) return 'Novice (ระดับเริ่มต้น)';
  if (validStats.length === 6 && validStats[0].val === validStats[5].val) return 'All-Rounder (สายสมดุล)';
  
  const useTop3 = validStats.length >= 3 && validStats[2].val >= 6;
  const topKeys = validStats.slice(0, useTop3 ? 3 : 2).map(s => s.key).sort();
  
  const POTENTIAL_IDENTITY_MAP = {};
  archetypesData.forEach(a => {
    POTENTIAL_IDENTITY_MAP[a.key] = a.identity;
  });

  return POTENTIAL_IDENTITY_MAP[topKeys.join('_')] || '-';
};

export const analyzeArchetype = (teamForm, sets = {}, archetypesData = defaultArchetypesData) => {
  const u = teamForm;
  if (!u) return null;

  const rawStats = Object.keys(TIE_BREAKERS).map(k => [k, Number(u[k]) || 0]);
  const sortedStats = [...rawStats].sort((a, b) => b[1] - a[1]);
  const maxStat = sortedStats[0][1];
  const minStat = sortedStats[5][1];

  const validStats = Object.keys(TIE_BREAKERS)
    .map(k => [k, Number(u[k]) || 0, (Number(u[k]) || 0) + TIE_BREAKERS[k]])
    .filter(s => s[1] >= 5)
    .sort((a, b) => b[2] - a[2]);

  const archetypeMapTop2 = {};
  const archetypeMapTop3 = {};
  archetypesData.forEach(a => {
    const keys = a.key.split('_');
    if (keys.length === 2) archetypeMapTop2[a.key] = a.name + (a.thai ? ' (' + a.thai + ')' : '');
    if (keys.length === 3) archetypeMapTop3[a.key] = a.name + (a.thai ? ' (' + a.thai + ')' : '');
  });

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

  let mainStyle = '';
  let styleDesc = '';
  let prefix = '';

  if (maxStat >= 8) prefix = 'Master ';
  else if (maxStat >= 7) prefix = 'Senior ';

  if (maxStat === minStat) {
    const v = maxStat;
    if (v === 1) { mainStyle = 'Critical Crisis (ขั้นวิกฤต/ต้องจัดการเด็ดขาด)'; styleDesc = 'ผลงานและพฤติกรรมต่ำสุดในทุกมิติ ก่อให้เกิดความเสียหายร้ายแรง เป็นปัจจัยเสี่ยงระดับวิกฤตที่หัวหน้างานต้องมีมาตรการจัดการขั้นเด็ดขาด (Terminate หรือ Re-role ทันที)'; }
    else if (v === 2) { mainStyle = 'Severe Underperformer (ต่ำกว่าเกณฑ์รุนแรง)'; styleDesc = 'ผลการปฏิบัติงานต่ำกว่ามาตรฐานมาก เป็นจุดอ่อนของทีมที่ต้องเข้าสู่แผน PIP (Performance Improvement Plan) อย่างเร่งด่วนที่สุด'; }
    else if (v === 3) { mainStyle = 'Needs Intensive Care (ต้องดูแลใกล้ชิด)'; styleDesc = 'ยังไม่สามารถปล่อยให้ทำงานเองได้ ต้องมีพี่เลี้ยง (Mentor) คอยประกบแทบทุกขั้นตอนเพื่อป้องกันความผิดพลาด'; }
    else if (v === 4) { mainStyle = 'Inconsistent Performer (ขาดความสม่ำเสมอ)'; styleDesc = 'เกือบแตะมาตรฐาน แต่ยังมีจุดบกพร่องหรือหลุดบ่อย หัวหน้างานต้องคอยกระตุ้นและกำหนด Check-point ถี่ขึ้นเพื่อดึงศักยภาพ'; }
    else if (v === 5) { mainStyle = 'Standard Achiever (ผู้บรรลุมาตรฐาน)'; styleDesc = 'ปฏิบัติงานได้ตามมาตรฐานอย่างครบถ้วน เป็นฟันเฟืองที่พึ่งพาได้ ควรกล้ารับความท้าทายใหม่ๆ เพื่อยกระดับสู่ความเชี่ยวชาญ'; }
    else if (v === 6) { mainStyle = 'Solid Contributor (ผู้ขับเคลื่อนชั้นเยี่ยม)'; styleDesc = 'ทำงานได้ดีเยี่ยมและไว้ใจได้ในทุกด้าน เป็นแกนหลักที่ทีมฝากความหวังได้เสมอโดยไม่ต้องตรวจสอบซ้ำ'; }
    else if (v === 7) { mainStyle = 'Advanced Generalist (ผู้เชี่ยวชาญรอบด้าน)'; styleDesc = 'มีทักษะระดับสูงครบทุกมิติ สามารถแก้ปัญหาซับซ้อนได้อย่างอิสระและเป็นที่ปรึกษาให้ทีมได้'; }
    else if (v === 8) { mainStyle = 'Expert Leader (ผู้นำระดับผู้เชี่ยวชาญ)'; styleDesc = 'โดดเด่นรอบด้าน เป็นเสาหลักที่กำหนดมาตรฐานการทำงานของทีมและริเริ่มสิ่งใหม่ๆ ได้อย่างยอดเยี่ยม'; }
    else if (v === 9) { mainStyle = 'The Mastermind (ผู้คุมเกม)'; styleDesc = 'สุดยอดบุคลากรที่มีอิทธิพลต่อทิศทางของทีม เป็นตัวแปรสำคัญที่สามารถพลิกสถานการณ์และสร้างนวัตกรรมใหม่ๆ ได้อย่างไม่มีขีดจำกัด'; }
    else if (v === 10) { mainStyle = 'The Legend (ระดับตำนาน)'; styleDesc = 'บุคคลระดับตำนาน ไร้จุดอ่อนใดๆ เป็นรากฐานที่สร้างนิยามใหม่แห่งความสำเร็จและกำหนดทิศทางขององค์กร'; }
  } else if (maxStat >= 8 && minStat <= 3) {
    mainStyle = 'Polarized Prodigy (สุดโต่งแต่อ่อนไหว)';
    styleDesc = `มีพรสวรรค์สูงลิ่วในด้าน ${getDesc(sortedStats[0][0])} แต่มีจุดบอดวิกฤตในด้าน ${getDesc(sortedStats[5][0])} (คะแนน ${minStat}) ซึ่งอาจสร้างความเสียหายรุนแรงได้ หัวหน้างานต้องจัดสรรทีมงานมาอุดช่องโหว่นี้โดยด่วน ไม่ควรให้ลุยเดี่ยว`;
  } else if (maxStat <= 5) {
    if (minStat >= 4) {
      mainStyle = 'Generalist (ผู้เรียนรู้รอบด้าน)'; styleDesc = 'มีพื้นฐานที่สม่ำเสมอและปรับตัวได้ทุกบทบาท ควรผลักดันให้หา "ความถนัดเฉพาะทาง" 1-2 ด้าน เพื่อทะลุกำแพงสู่ระดับที่สูงขึ้น';
    } else if (sortedStats.filter(s => s[1] >= 4).length > 0 && sortedStats.filter(s => s[1] <= 3).length > 0) {
      mainStyle = 'Trainee (อยู่ในช่วงพัฒนาทักษะ)'; styleDesc = 'ทักษะโดยรวมยังต่ำกว่าเกณฑ์ปฏิบัติงานขั้นต้น (มาตรฐาน = 5) จำเป็นต้องมีระบบพี่เลี้ยง (Mentoring) คอยประกบอย่างใกล้ชิดและไม่ควรให้รับผิดชอบงานหลักเพียงลำพัง';
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
      styleDesc = `โดดเด่นด้าน${getDesc(topKeys[0])} ผสานเข้ากับ${getDesc(topKeys[1])} และเสริมด้วย${getDesc(topKeys[2])}`;
    } else {
      const topKeys = [validStats[0][0], validStats[1][0]];
      const pairKey = [...topKeys].sort().join('_');
      mainStyle = prefix + (archetypeMapTop2[pairKey] || 'Specialist (สายเฉพาะทาง)');
      styleDesc = `โดดเด่นด้าน${getDesc(topKeys[0])} และผสานเข้ากับ${getDesc(topKeys[1])} ได้อย่างยอดเยี่ยม`;
    }

    if (minStat <= 4) {
      const weakReasons = {
        str: 'งานที่ต้องลุยและใช้พลังขับเคลื่อนสูง',
        agi: 'งานด่วนที่ต้องการผลลัพธ์รวดเร็ว',
        dex: 'งานที่ต้องใช้ความละเอียดถูกต้องสูงและแข่งกับเวลา',
        int: 'งานที่ต้องประยุกต์ใช้เทคโนโลยีหรือจัดระบบขั้นตอนที่ซับซ้อน',
        con: 'งานที่เต็มไปด้วยความกดดันและยืดเยื้อ',
        sen: 'งานที่ต้องเจรจาต่อรองหรือรับมือกับอารมณ์ลูกค้า'
      };
      const weakNames = sortedStats.filter(s => s[1] <= 4).map(s => weakReasons[s[0]]).filter(Boolean);
      if (weakNames.length > 0) {
        styleDesc += ` แต่ทั้งนี้ พนักงานยังไม่เหมาะที่จะมอบหมายให้ทำ${weakNames.join(' รวมถึง ')} เนื่องจากสเตตัสในด้านดังกล่าวยังอยู่ในระดับต่ำ`;
      }
    }
  }

  let archetypeKey = 'all_rounder';
  if (maxStat <= 5) {
    if (sortedStats.filter(s => s[1] >= 4).length > 0 && sortedStats.filter(s => s[1] <= 3).length > 0) {
      archetypeKey = [sortedStats[0][0], sortedStats[1][0]].sort().join('_');
    }
  } else {
    if (validStats.length >= 2) {
      if (validStats.length === 6 && validStats[0][1] === validStats[5][1]) {
        archetypeKey = 'all_rounder';
      } else {
        const useTop3 = validStats.length >= 3 && (validStats.length === 3 || validStats[2][1] > validStats[3][1]);
        archetypeKey = validStats.slice(0, useTop3 ? 3 : 2).map(s => s[0]).sort().join('_');
      }
    }
  }

  const archObj = archetypesData.find(a => a.key === archetypeKey);
  let dynamicWeakness = '';
  let weaknessLabel = 'จุดอ่อน:';
  let weaknessColor = 'text-rose-400';

  if (archObj && validStats.length >= 2) {
    const lowestStatValue = sortedStats[5][1];
    const lowestStats = sortedStats.filter(s => s[1] === lowestStatValue);

    const weakBehaviorDefs = {
      str: 'อาจขาดความเด็ดขาดในการลุยงาน หรือลังเลที่จะตัดสินใจแก้ปัญหาเฉพาะหน้า (STR)',
      agi: 'อาจตอบสนองต่อปัญหาได้ช้า และปรับตัวไม่ทันเมื่อสถานการณ์เปลี่ยนแปลงกะทันหัน (AGI)',
      dex: 'อาจมีข้อผิดพลาดในรายละเอียดเอกสาร ขาดความประณีตในการตรวจงาน หรือบริหารเวลาได้ไม่ดีนัก (DEX)',
      int: 'อาจติดการทำงานแบบเดิมๆ ที่ใช้แรงและเวลา ขาดการนำเครื่องมือหรือระบบเข้ามาช่วยผ่อนแรง (INT)',
      con: 'อาจหมดพลังได้ง่ายเมื่อต้องแบกรับแรงกดดันสูง หรือยืนระยะในงานที่ยืดเยื้อได้ยาก (CON)',
      sen: 'อาจสื่อสารตรงเกินไปจนกระทบความรู้สึก หรืออ่านสถานการณ์ความขัดแย้งของลูกค้าและช่างไม่ออก (SEN)'
    };

    if (lowestStatValue <= 4) {
      weaknessLabel = lowestStatValue <= 2 ? 'จุดบอดวิกฤต (Crisis Gap):' : 'จุดที่ควรพัฒนาเร่งด่วน:';
      weaknessColor = lowestStatValue <= 2 ? 'text-rose-500 font-bold' : 'text-amber-400';
      dynamicWeakness = lowestStats.map(s => weakBehaviorDefs[s[0]]).join(' รวมถึง ');
    } else {
      dynamicWeakness = archObj.weaknesses;
    }
  }

  return {
    rawStats,
    sortedStats,
    maxStat,
    minStat,
    mainStyle,
    styleDesc,
    archetypeKey,
    archObj,
    dynamicWeakness,
    weaknessLabel,
    weaknessColor
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

export const analyzeOuterLayer = (u = {}, statsObj = {}) => {
  const str = Number(statsObj.str) || Number(u.str) || 5;
  const agi = Number(statsObj.agi) || Number(u.agi) || 5;
  const dex = Number(statsObj.dex) || Number(u.dex) || 5;
  const int = Number(statsObj.int) || Number(u.int) || 5;
  const con = Number(statsObj.con) || Number(u.con) || 5;
  const sen = Number(statsObj.sen) || Number(u.sen) || 5;

  const autoValues = {
    cx: Math.round((con + sen) / 2),
    tech: Math.round((int + dex) / 2),
    sla: Math.round((agi + dex) / 2),
    crisis: Math.round((str + con) / 2),
    resource: Math.round((str + sen) / 2),
    innovation: Math.round((int + sen) / 2)
  };

  const actualValues = {
    cx: (u.cx !== null && u.cx !== undefined) ? Number(u.cx) : autoValues.cx,
    tech: (u.tech !== null && u.tech !== undefined) ? Number(u.tech) : autoValues.tech,
    sla: (u.sla !== null && u.sla !== undefined) ? Number(u.sla) : autoValues.sla,
    crisis: (u.crisis !== null && u.crisis !== undefined) ? Number(u.crisis) : autoValues.crisis,
    resource: (u.resource !== null && u.resource !== undefined) ? Number(u.resource) : autoValues.resource,
    innovation: (u.innovation !== null && u.innovation !== undefined) ? Number(u.innovation) : autoValues.innovation
  };

  const outerMeta = [
    { key: 'cx', name: 'Customer Exp.', thai: 'ความพึงพอใจลูกค้า' },
    { key: 'tech', name: 'Tech. Expertise', thai: 'ทักษะเชิงลึก' },
    { key: 'sla', name: 'Ops & SLA', thai: 'เวลาและความเป๊ะ' },
    { key: 'crisis', name: 'Crisis Resolv.', thai: 'แก้ปัญหาวิกฤต' },
    { key: 'resource', name: 'Resource Ctrl.', thai: 'บริหารทรัพยากร' },
    { key: 'innovation', name: 'Innovation', thai: 'สร้างระบบใหม่' }
  ];

  const avgInner = (str + agi + dex + int + con + sen) / 6;
  const avgOuter = Object.values(actualValues).reduce((a, b) => a + b, 0) / 6;
  const gap = Math.round((avgOuter - avgInner) * 10) / 10;

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
    alignmentDesc = `มีศักยภาพแฝงสูง (${avgInner.toFixed(1)}) แต่ผลสัมฤทธิ์หน้างาน (${avgOuter.toFixed(1)}) ยังไม่ออกมาเต็มที่`;
    alignmentBadge = 'bg-amber-50 text-amber-700 border-amber-200';
    coachingAdvice = 'หัวหน้างานควรสำรวจอุปสรรคหน้างาน เช่น ปริมาณงานหรือสภาพแวดล้อม เพื่อช่วยปลดล็อกพลังแท้จริง';
  }

  const sortedOuter = outerMeta.map(m => ({ ...m, val: actualValues[m.key] })).sort((a, b) => b.val - a.val);
  const pairKey = [sortedOuter[0].key, sortedOuter[1].key].sort().join('_');

  const dnaMap = {
    'crisis_cx': { title: 'Frontline Shield (เกราะหน้าด่านพิทักษ์ลูกค้า)', desc: 'รับมืออารมณ์ลูกค้าได้ดีเยี่ยมและดับวิกฤตได้เด็ดขาด' },
    'cx_crisis': { title: 'Frontline Shield (เกราะหน้าด่านพิทักษ์ลูกค้า)', desc: 'รับมืออารมณ์ลูกค้าได้ดีเยี่ยมและดับวิกฤตได้เด็ดขาด' },
    'innovation_tech': { title: 'System Pioneer (ผู้นำนวัตกรรมระบบ)', desc: 'ริเริ่มระบบดิจิทัลและเทคโนโลยีใหม่เพื่อยกระดับทีม' },
    'tech_innovation': { title: 'System Pioneer (ผู้นำนวัตกรรมระบบ)', desc: 'ริเริ่มระบบดิจิทัลและเทคโนโลยีใหม่เพื่อยกระดับทีม' },
    'resource_sla': { title: 'Operational Commander (ผู้คุมวินัยและต้นทุน)', desc: 'งานจบตามเวลาเป๊ะและควบคุมงบประมาณได้อย่างมีประสิทธิภาพ' },
    'sla_resource': { title: 'Operational Commander (ผู้คุมวินัยและต้นทุน)', desc: 'งานจบตามเวลาเป๊ะและควบคุมงบประมาณได้อย่างมีประสิทธิภาพ' },
    'crisis_sla': { title: 'Rapid Responder (หน่วยตอบโต้ฉับไว)', desc: 'เข้าถึงจุดเกิดเหตุเร็วและระงับเหตุการณ์ฉุกเฉินได้ทันท่วงที' },
    'sla_crisis': { title: 'Rapid Responder (หน่วยตอบโต้ฉับไว)', desc: 'เข้าถึงจุดเกิดเหตุเร็วและระงับเหตุการณ์ฉุกเฉินได้ทันท่วงที' },
    'cx_resource': { title: 'Strategic Negotiator (นักเจรจาพันธมิตร)', desc: 'ประสานงานลูกค้าและคู่ค้าอย่างมืออาชีพเพื่อผลประโยชน์สูงสุด' },
    'resource_cx': { title: 'Strategic Negotiator (นักเจรจาพันธมิตร)', desc: 'ประสานงานลูกค้าและคู่ค้าอย่างมืออาชีพเพื่อผลประโยชน์สูงสุด' },
    'sla_tech': { title: 'Precision Architect (สถาปนิกงานประณีต)', desc: 'รักษามาตรฐานงานเชิงลึกและส่งมอบงานตรงเวลา 100%' },
    'tech_sla': { title: 'Precision Architect (สถาปนิกงานประณีต)', desc: 'รักษามาตรฐานงานเชิงลึกและส่งมอบงานตรงเวลา 100%' },
    'crisis_innovation': { title: 'Crisis Innovator (นักพลิกวิกฤตด้วยระบบ)', desc: 'แก้ปัญหาเฉพาะหน้าด้วยเครื่องมือและวิธีคิดใหม่ๆ' },
    'innovation_crisis': { title: 'Crisis Innovator (นักพลิกวิกฤตด้วยระบบ)', desc: 'แก้ปัญหาเฉพาะหน้าด้วยเครื่องมือและวิธีคิดใหม่ๆ' },
    'cx_tech': { title: 'Consultative Expert (ผู้เชี่ยวชาญบริการ)', desc: 'อธิบายเรื่องเทคนิคยากๆ ให้ลูกค้าเข้าใจง่ายและประทับใจ' },
    'tech_cx': { title: 'Consultative Expert (ผู้เชี่ยวชาญบริการ)', desc: 'อธิบายเรื่องเทคนิคยากๆ ให้ลูกค้าเข้าใจง่ายและประทับใจ' }
  };

  const performanceDna = dnaMap[pairKey] || {
    title: `${sortedOuter[0].name} & ${sortedOuter[1].name} Specialist`,
    desc: `โดดเด่นด้าน ${sortedOuter[0].thai} ผสานกับ ${sortedOuter[1].thai}`
  };

  return {
    autoValues,
    actualValues,
    avgInner: Math.round(avgInner * 10) / 10,
    avgOuter: Math.round(avgOuter * 10) / 10,
    gap,
    alignmentKey,
    alignmentTitle,
    alignmentDesc,
    alignmentBadge,
    coachingAdvice,
    performanceDna,
    topOuter: sortedOuter
  };
};
