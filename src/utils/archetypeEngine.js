import defaultArchetypesData from '../data/archetypes.json' with { type: 'json' };

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
      basic: 'ลังเล ไม่กล้าตัดสินใจในเรื่องพื้นฐาน ต้องรอรับคำสั่งเสมอ',
      intermediate: 'ตัดสินใจแก้ปัญหาเฉพาะหน้าตามคู่มือและขั้นตอนมาตรฐานได้ดี',
      advanced: 'กล้าตัดสินใจในเคสซับซ้อนหน้างาน มีพลังขับเคลื่อนงานสูง',
      mastery: 'ตัดสินใจเชิงกลยุทธ์ในภาวะวิกฤต เป็นผู้นำขับเคลื่อนผลลัพธ์ขององค์กร'
    }
  },
  agi: { 
    key: 'agi', name: 'AGI (Agility)', group: 'The Precision Engine', desc: 'Speed & Adaptability', 
    rubric: {
      basic: 'ตอบสนองและรับงานล่าช้า ต้องได้รับการติดตามทวงถามซ้ำ',
      intermediate: 'ตอบสนองรวดเร็วตามเกณฑ์เวลา SLA และปรับตัวตามขั้นตอนได้ราบรื่น',
      advanced: 'ตอบสนองฉับไว เข้าถึงพื้นที่หน้างานทันที ระงับเหตุได้รวดเร็ว',
      mastery: 'คาดการณ์ความเสี่ยงล่วงหน้า วางระบบส่งต่องานที่เป็นมาตรฐานรวดเร็วที่สุด'
    }
  },
  dex: { 
    key: 'dex', name: 'DEX (Dexterity)', group: 'The Precision Engine', desc: 'Precision & Quality', 
    rubric: {
      basic: 'บันทึกข้อมูลไม่ครบถ้วนหรือมีข้อผิดพลาดบ่อย ตรวจงานไม่ละเอียด',
      intermediate: 'บันทึกข้อมูลและตรวจสอบคุณภาพงานได้ถูกต้องครบถ้วนตามเกณฑ์มาตรฐาน',
      advanced: 'ข้อมูลแม่นยำสูง ตรวจพบจุดบกพร่องเชิงลึก งานประณีตเรียบร้อย',
      mastery: 'ข้อมูลสมบูรณ์แบบ ไร้ข้อผิดพลาด 100% กำหนดมาตรฐานคุณภาพระดับองค์กร'
    }
  },
  int: { 
    key: 'int', name: 'INT (Intelligence)', group: 'The Mastermind', desc: 'Tech, Systems & Automation', 
    rubric: {
      basic: 'ใช้งานระบบและเครื่องมือดิจิทัลไม่คล่อง การจัดระเบียบงานยังล่าช้า',
      intermediate: 'ใช้ระบบ Taskflow, ERP และเครื่องมือดิจิทัลติดตามงานได้อย่างเป็นระบบ',
      advanced: 'ออกแบบ Workflow ลดขั้นตอนซ้ำซ้อน นำเครื่องมือใหม่มาประยุกต์ใช้อย่างเชี่ยวชาญ',
      mastery: 'วางแผนยกระดับกระบวนการทำงานด้วยเทคโนโลยีดิจิทัล ขับเคลื่อนนวัตกรรมระดับองค์กร'
    }
  },
  con: { 
    key: 'con', name: 'CON (Constitution)', group: 'The Heavy Lifters', desc: 'Resilience & Mental Toughness', 
    rubric: {
      basic: 'ประสิทธิภาพลดลงเมื่อเผชิญความกดดัน ขาดความต่อเนื่องในภารกิจระยะยาว',
      intermediate: 'อดทนต่อสภาวะกดดันได้ดี รับผิดชอบงานอย่างต่อเนื่องจนสำเร็จตามเป้าหมาย',
      advanced: 'นิ่งสงบในสถานการณ์ตึงเครียด มุ่งมั่นไม่ย่อท้อต่องานยากและซับซ้อน',
      mastery: 'เป็นเสาหลักที่มั่นคงในภาวะวิกฤต นำพาทีมงานข้ามผ่านอุปสรรคใหญ่ได้อย่างมั่นคง'
    }
  },
  sen: { 
    key: 'sen', name: 'SEN (Sense)', group: 'The Empathizers', desc: 'Stakeholder Insight & Negotiation', 
    rubric: {
      basic: 'ควบคุมอารมณ์ได้ไม่ดี สื่อสารไม่ชัดเจน ขาดความเข้าใจความต้องการของผู้อื่น',
      intermediate: 'สื่อสารสุภาพ มี Service Mind รับฟังและเข้าใจความต้องการของผู้รับบริการอย่างจริงใจ',
      advanced: 'มีศิลปะในการสื่อสารและเจรจาต่อรอง ไกล่เกลี่ยข้อพิพาทและคลี่คลายสถานการณ์ตึงเครียดได้ดีเยี่ยม',
      mastery: 'มีวุฒิภาวะผู้นำสูงสุด สร้างความเชื่อมั่นและความสัมพันธ์อันดีอย่างยั่งยืนระหว่างบริษัทและชุมชน'
    }
  }
};

export const getStatLevelText = (val) => {
  const v = Number(val);
  if (v === 10) return 'ระดับเชี่ยวชาญสูงสุด (Mastery)';
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
      10: 'The Pinnacle Specialist (ระดับเชี่ยวชาญสูงสุด)'
    };
    return uniformNames[maxStat] || 'The Standard (ผลงานตามมาตรฐาน)';
  }

  if (maxStat >= 8 && minStat <= 3) {
    return 'Specialized Talent (ทักษะเฉพาะทางสูง)';
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

export const analyzeArchetype = (teamForm, _sets = {}, archetypesData = defaultArchetypesData) => {
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

  if (maxStat >= 8 && minStat >= 5) prefix = 'Master ';
  else if (maxStat >= 7 && minStat >= 4) prefix = 'Senior ';

  if (maxStat === minStat) {
    const v = maxStat;
    if (v === 1) { mainStyle = 'Critical Crisis (ขั้นวิกฤต/ต้องจัดการเด็ดขาด)'; styleDesc = 'ผลงานและพฤติกรรมต่ำสุดในทุกมิติ ก่อให้เกิดความเสียหายร้ายแรง เป็นปัจจัยเสี่ยงระดับวิกฤตที่หัวหน้างานต้องมีมาตรการจัดการขั้นเด็ดขาด (Terminate หรือ Re-role ทันที)'; }
    else if (v === 2) { mainStyle = 'Severe Underperformer (ต่ำกว่าเกณฑ์รุนแรง)'; styleDesc = 'ผลการปฏิบัติงานต่ำกว่ามาตรฐานมาก เป็นจุดอ่อนของทีมที่ต้องเข้าสู่แผน PIP (Performance Improvement Plan) อย่างเร่งด่วนที่สุด'; }
    else if (v === 3) { mainStyle = 'Needs Intensive Care (ต้องดูแลใกล้ชิด)'; styleDesc = 'ยังไม่สามารถปล่อยให้ทำงานเองได้ ต้องมีพี่เลี้ยง (Mentor) คอยประกบแทบทุกขั้นตอนเพื่อป้องกันความผิดพลาด'; }
    else if (v === 4) { mainStyle = 'Inconsistent Performer (ขาดความสม่ำเสมอ)'; styleDesc = 'เกือบแตะมาตรฐาน แต่ยังมีข้อผิดพลาดเกิดขึ้นบ่อยครั้งเมื่อไม่มีผู้ควบคุม หัวหน้างานต้องคอยกระตุ้นและกำหนด Check-point ถี่ขึ้นเพื่อดึงศักยภาพ'; }
    else if (v === 5) { mainStyle = 'Standard Achiever (ผู้บรรลุมาตรฐาน)'; styleDesc = 'ปฏิบัติงานได้ตามมาตรฐานอย่างครบถ้วน เป็นฟันเฟืองที่พึ่งพาได้ ควรกล้ารับความท้าทายใหม่ๆ เพื่อยกระดับสู่ความเชี่ยวชาญ'; }
    else if (v === 6) { mainStyle = 'Solid Contributor (ผู้ขับเคลื่อนชั้นเยี่ยม)'; styleDesc = 'ทำงานได้ดีเยี่ยมและไว้ใจได้ในทุกด้าน เป็นแกนหลักที่ทีมฝากความหวังได้เสมอโดยไม่ต้องตรวจสอบซ้ำ'; }
    else if (v === 7) { mainStyle = 'Advanced Generalist (ผู้เชี่ยวชาญรอบด้าน)'; styleDesc = 'มีทักษะระดับสูงครบทุกมิติ สามารถแก้ปัญหาซับซ้อนได้อย่างอิสระและเป็นที่ปรึกษาให้ทีมได้'; }
    else if (v === 8) { mainStyle = 'Expert Leader (ผู้นำระดับผู้เชี่ยวชาญ)'; styleDesc = 'โดดเด่นรอบด้าน เป็นเสาหลักที่กำหนดมาตรฐานการทำงานของทีมและริเริ่มสิ่งใหม่ๆ ได้อย่างยอดเยี่ยม'; }
    else if (v === 9) { mainStyle = 'The Mastermind (ผู้คุมเกม)'; styleDesc = 'สุดยอดบุคลากรที่มีอิทธิพลต่อทิศทางของทีม เป็นตัวแปรสำคัญที่สามารถพลิกสถานการณ์และสร้างนวัตกรรมใหม่ๆ ได้อย่างไม่มีขีดจำกัด'; }
    else if (v === 10) { mainStyle = 'The Pinnacle Specialist (ระดับเชี่ยวชาญสูงสุด)'; styleDesc = 'มีความเชี่ยวชาญระดับสูงสุดในทุกมิติ เป็นแบบอย่างความเป็นเลิศที่กำหนดมาตรฐานและถ่ายทอดองค์ความรู้แก่องค์กร'; }
  } else if (maxStat >= 8 && minStat <= 3) {
    mainStyle = 'Specialized Talent (ทักษะเฉพาะทางสูง)';
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
    } else if (validStats.length >= 2) {
      const topKeys = [validStats[0][0], validStats[1][0]];
      const pairKey = [...topKeys].sort().join('_');
      mainStyle = prefix + (archetypeMapTop2[pairKey] || 'Specialist (สายเฉพาะทาง)');
      styleDesc = `โดดเด่นด้าน${getDesc(topKeys[0])} และผสานเข้ากับ${getDesc(topKeys[1])} ได้อย่างยอดเยี่ยม`;
    } else {
      const topKeys = [sortedStats[0][0], sortedStats[1][0]];
      const pairKey = [...topKeys].sort().join('_');
      mainStyle = prefix + (archetypeMapTop2[pairKey] || 'Specialist (สายเฉพาะทาง)');
      styleDesc = `มีความโดดเด่นด้าน${getDesc(topKeys[0])} (${sortedStats[0][1]}/10) เป็นพิเศษ แต่ทักษะด้าน${getDesc(topKeys[1])} และด้านอื่นๆ ยังต้องได้รับการพัฒนาเพิ่มเติม`;
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
    } else {
      archetypeKey = [sortedStats[0][0], sortedStats[1][0]].sort().join('_');
    }
  }

  let archObj = archetypesData.find(a => a.key === archetypeKey);
  if (maxStat <= 4) {
      archObj = {
          name: maxStat <= 2 ? 'Novice' : 'Trainee',
          identity: maxStat <= 2 ? 'The Beginner (ระดับเริ่มต้น)' : 'The Learner (อยู่ในช่วงพัฒนา)',
          desc: maxStat <= 2 ? 'ทักษะอยู่ในระดับวิกฤต จำเป็นต้องเริ่มฝึกฝนใหม่ตั้งแต่พื้นฐานและอยู่ในความดูแลอย่างใกล้ชิด' : 'ทักษะโดยรวมยังต้องได้รับการขัดเกลาและพัฒนาเพิ่มเติม ไม่ควรรับผิดชอบงานสำคัญเพียงลำพัง',
          strengths: 'กำลังอยู่ในช่วงเรียนรู้และปรับตัว',
          weaknesses: archObj ? archObj.weaknesses : ''
      };
  }
  let dynamicWeakness = '';
  let weaknessLabel = 'จุดอ่อน:';
  let weaknessColor = 'text-rose-400';

  if (archObj && validStats.length >= 2) {
    const lowestStatValue = sortedStats[5][1];
    const lowestStats = sortedStats.filter(s => s[1] === lowestStatValue);

    const subStandardBehaviorDefs = {
      str: 'อาจต้องเพิ่มความมั่นใจในการตัดสินใจลุยงานเฉพาะหน้า (STR)',
      agi: 'ความคล่องตัวในการปรับตัวรับมือกับงานด่วนฉุกเฉินยังต้องเสริมเพิ่มเติม (AGI)',
      dex: 'ควรมี Check-list ตรวจทานความประณีตของเอกสารและรายละเอียดซ้ำ (DEX)',
      int: 'การประยุกต์ใช้เครื่องมือดิจิทัลหรือระบบงานซับซ้อนยังต้องได้รับการแนะนำ (INT)',
      con: 'การยืนระยะในงานที่มีแรงกดดันสูงและยืดเยื้ออาจต้องได้รับการสนับสนุนจากทีม (CON)',
      sen: 'การสื่อสารเจรจาในสถานการณ์ตึงเครียดควรปรึกษาหัวหน้างานหรือทีมก่อน (SEN)'
    };

    if (lowestStatValue >= 7) {
      weaknessLabel = 'จุดเด่นรอบด้าน:';
      weaknessColor = 'text-emerald-400';
      dynamicWeakness = 'มีทักษะระดับสูงครบทุกมิติ ปฏิบัติงานได้อย่างสมบูรณ์แบบ สามารถเป็นเสาหลักและพี่เลี้ยงถ่ายทอดความรู้ให้ทีมได้อย่างดีเยี่ยม';
    } else if (lowestStatValue >= 5) {
      weaknessLabel = 'ข้อเสนอแนะในการพัฒนา:';
      weaknessColor = 'text-sky-300';
      const statNames = lowestStats.map(s => s[0].toUpperCase()).join(', ');
      dynamicWeakness = `ทักษะทุกด้านผ่านเกณฑ์มาตรฐานขึ้นไป (ไม่มีจุดบกพร่องต่ำกว่าเกณฑ์) โดยด้าน ${statNames} (${lowestStatValue}/10) อยู่ในระดับมาตรฐานการทำงานทั่วไป ซึ่งสามารถพัฒนาต่อยอดเป็นทักษะเสริมเพื่อความรอบด้านยิ่งขึ้น`;
    } else if (lowestStatValue >= 3) {
      weaknessLabel = 'จุดที่ควรเสริมทักษะ:';
      weaknessColor = 'text-amber-400';
      dynamicWeakness = `${lowestStats.map(s => subStandardBehaviorDefs[s[0]]).join(' รวมถึง ')} (คะแนน: ${lowestStatValue}/10) ควรได้รับการสนับสนุนหรือมีพี่เลี้ยงช่วยแนะนำในการปฏิบัติงานจริง`;
    } else {
      weaknessLabel = 'จุดบอดวิกฤต:';
      weaknessColor = 'text-rose-500 font-bold';
      dynamicWeakness = `${lowestStats.map(s => subStandardBehaviorDefs[s[0]]).join(' รวมถึง ')} (สเตตัสต่ำกว่าเกณฑ์มาตรฐานมาก: ${lowestStatValue}/10) จำเป็นต้องมีระบบพี่เลี้ยงคอยดูแลอย่างใกล้ชิด`;
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
    desc: 'รับมือลูกบ้านอารมณ์ร้อน พูดคุยทั่วไป นัดหมาย และอธิบายขั้นตอนการทำงาน',
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
    desc: 'ทักษะประปา สปริงเกอร์ ไฟฟ้า สโมสร สระว่ายน้ำ บ่อบำบัด และตรวจงานก่อนส่งงานให้ผู้บังคับบัญชา',
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
    desc: 'ตรงต่อเวลานัดหมาย เคลียร์เคสฉับไว ไม่ดองสถานะรอใบงาน',
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
    desc: 'คุมงบซ่อมแซม ตรวจรับงานผู้รับเหมา ควบคุมคลังอะไหล่ส่วนกลาง',
    color: 'text-amber-500',
    bg: 'bg-amber-500',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    formulaDesc: '(STR + SEN) / 2',
    calc: (s) => Math.round(((Number(s?.str) || 5) + (Number(s?.sen) || 5)) / 2)
  },
  innovation: {
    key: 'innovation',
    name: 'Innovation',
    fullName: 'Digital Systems & Preventive Maintenance',
    thai: 'งานเชิงรุก ระบบติดตามงานดิจิทัล และการบำรุงรักษาเชิงป้องกัน',
    desc: 'ใช้ Taskflow ติดตามงานแม่นยำ วางแผน PM เชิงรุก และลดปัญหาซ้ำซาก',
    color: 'text-purple-500',
    bg: 'bg-purple-500',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    formulaDesc: '(INT + SEN) / 2',
    calc: (s) => Math.round(((Number(s?.int) || 5) + (Number(s?.sen) || 5)) / 2)
  }
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
    { key: 'cx', name: 'Customer Exp.', fullName: 'Customer Experience & Empathy', thai: 'การรับมือลูกบ้านและประสานงาน', rawVal: (con + sen) / 2, statSum: con + sen },
    { key: 'tech', name: 'Tech. Expertise', fullName: 'Technical Diagnosis & Facility Standards', thai: 'การวินิจฉัยเชิงช่างและตรวจงาน', rawVal: (int + dex) / 2, statSum: int + dex },
    { key: 'sla', name: 'Ops & SLA', fullName: 'Operational Discipline & SLA Speed', thai: 'วินัยเวลาและความรวดเร็ว', rawVal: (agi + dex) / 2, statSum: agi + dex },
    { key: 'crisis', name: 'Crisis Resolv.', fullName: 'Emergency Response & Crisis Mastery', thai: 'การดำเนินการฉุกเฉินสาธารณูปโภค', rawVal: (str + con) / 2, statSum: str + con },
    { key: 'resource', name: 'Resource Ctrl.', fullName: 'Cost, Contractor & Material Stewardship', thai: 'การบริหารงบและผู้รับเหมา', rawVal: (str + sen) / 2, statSum: str + sen },
    { key: 'innovation', name: 'Innovation', fullName: 'Digital Systems & Preventive Maintenance', thai: 'งานเชิงรุกและระบบติดตามงาน', rawVal: (int + sen) / 2, statSum: int + sen }
  ];

  const avgInner = (str + agi + dex + int + con + sen) / 6;
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
      title: 'De-escalation Guardian (เกราะหน้าด่านพิทักษ์ความสัมพันธ์)',
      tag: 'Frontline Shield',
      desc: 'รับมือลูกบ้านในภาวะตึงเครียดได้อย่างใจเย็นและอยู่หมัด พร้อมเข้าควบคุมและระงับเหตุฉุกเฉินในโครงการได้อย่างรวดเร็วและปลอดภัย'
    },
    'crisis_innovation': {
      title: 'Agile Problem Solver (นักแก้ปัญหาเฉพาะหน้าและพลิกแพลงเชิงรุก)',
      tag: 'Creative Responder',
      desc: 'ในสถานการณ์คับขันสามารถประยุกต์ใช้เครื่องมือและระบบติดตามงานเพื่อระดมทรัพยากร หาทางออกใหม่ๆ และกู้คืนระบบสาธารณูปโภคของโครงการให้กลับมาใช้งานได้เร็วที่สุด'
    },
    'crisis_resource': {
      title: 'Crisis Commander (ผู้บัญชาการสถานการณ์และทรัพยากร)',
      tag: 'Operations Guardian',
      desc: 'คุมสถานการณ์ฉุกเฉินได้อย่างสงบนิ่ง จัดสรรกำลังคน เครื่องจักร ตลอดจนควบคุมงบประมาณซ่อมแซมเร่งด่วนได้อย่างคุ้มค่า ปลอดภัย ไม่สิ้นเปลือง'
    },
    'crisis_sla': {
      title: 'Rapid Emergency Responder (หน่วยตอบโต้เหตุฉุกเฉินฉับไว)',
      tag: 'Rapid Strike',
      desc: 'ทันทีที่รับแจ้งเหตุฉุกเฉินในโครงการ จะเข้าถึงหน้างานเร็วที่สุด วินัยเวลาเป๊ะ ระงับเหตุก่อนสร้างความเสียหายลุกลาม'
    },
    'crisis_tech': {
      title: 'Infrastructure Rescuer (ผู้เชี่ยวชาญกู้วิกฤตระบบสาธารณูปโภค)',
      tag: 'System Rescuer',
      desc: 'มีความรู้เชิงช่างลึกซึ้งและกล้าตัดสินใจ สามารถเข้าควบคุมและกู้คืนระบบสาธารณูปโภคหลักของโครงการที่เกิดเหตุชำรุดฉุกเฉินได้อย่างปลอดภัยและมีประสิทธิภาพ'
    },
    'cx_innovation': {
      title: 'Service & Tech Innovator (นักพัฒนาบริการและระบบข้อมูลลูกบ้าน)',
      tag: 'Service Innovator',
      desc: 'เข้าใจความต้องการของลูกบ้านอย่างลึกซึ้ง ผสานการใช้ระบบ Taskflow แจ้งสถานะและประสานงานเชิงรุก สร้างความโปร่งใสและมอบประสบการณ์การบริการที่น่าประทับใจ'
    },
    'cx_resource': {
      title: 'Value Negotiator (นักประสานประโยชน์และจัดการสินทรัพย์)',
      tag: 'Diplomatic Steward',
      desc: 'ประสานงานลูกบ้านและผู้รับเหมาอย่างลงตัว อธิบายข้อกำหนดและงบประมาณส่วนกลางได้อย่างโปร่งใส ปกป้องผลประโยชน์ของโครงการโดยไม่กระทบความสัมพันธ์'
    },
    'cx_sla': {
      title: 'Reliable Ambassador (ทูตบริการฉับไว ตรงเวลาเป็นเลิศ)',
      tag: 'Trusted Ambassador',
      desc: 'รักษาเวลานัดหมาย 100% สุภาพ กริยางดงาม แจ้งความคืบหน้ารวดเร็วผ่านระบบ ไม่ปล่อยให้ลูกบ้านต้องตามงาน ได้รับความไว้วางใจสูงสุด'
    },
    'cx_tech': {
      title: 'Consultative Master (ปรมาจารย์ที่ปรึกษาเชิงช่าง)',
      tag: 'Consultative Expert',
      desc: 'วินิจฉัยงานระบบได้เฉียบขาด พูดคุยอธิบายขั้นตอนทางเทคนิคให้ลูกบ้านเข้าใจง่าย และตรวจงานละเอียดก่อนส่งมอบงาน'
    },
    'innovation_resource': {
      title: 'Asset & PM Optimizer (ผู้วางแผนสินทรัพย์และงานเชิงรุก)',
      tag: 'Asset Optimizer',
      desc: 'บริหารจัดการคลังเครื่องมือ อะไหล่ และจัดทำแผนบำรุงรักษาเชิงป้องกัน (PM) ผ่านระบบติดตามงานอย่างเป็นระบบ ช่วยยืดอายุการใช้งานของทรัพย์สินส่วนกลางและคุมงบประมาณได้อย่างคุ้มค่า'
    },
    'innovation_sla': {
      title: 'Agile Workflow Driver (ผู้ขับเคลื่อนโฟลว์งานและความเร็ว)',
      tag: 'Workflow Driver',
      desc: 'ใช้ระบบติดตามงาน LH-Taskflow ได้อย่างคล่องแคล่ว ติดตามและประสานงานสถานะใบงานแบบเรียลไทม์ ลดขั้นตอนซ้ำซ้อน ส่งต่องานรวดเร็ว และรักษามาตรฐาน SLA ได้เสมอ'
    },
    'innovation_tech': {
      title: 'Digital Tech Specialist (ผู้เชี่ยวชาญเชิงช่างและระบบติดตามงาน)',
      tag: 'Tech & Workflow Pioneer',
      desc: 'มีความรู้เชิงช่างระดับสูง ผสานความเชี่ยวชาญในการใช้ระบบติดตามการทำงาน (Taskflow) และการวางแผนบำรุงรักษาเชิงป้องกัน (PM) บันทึกและวิเคราะห์ประวัติงานซ่อมอย่างแม่นยำ ช่วยลดปัญหาเชิงระบบและแก้ไขปัญหางานซ่อมซ้ำซากได้อย่างยั่งยืน'
    },
    'resource_sla': {
      title: 'Operations Controller (ผู้บัญชาการงานปฏิบัติการและงบประมาณ)',
      tag: 'Disciplined Controller',
      desc: 'บริหารเวลาและทรัพยากรได้อย่างเฉียบคม กำกับผู้รับเหมาให้ส่งงานตรงเวลา เบิกจ่ายอะไหล่คุ้มค่า ไร้งานค้างและไร้งบรั่วไหล'
    },
    'resource_tech': {
      title: 'Technical Inspector (ผู้คุมมาตรฐานและต้นทุนเชิงช่าง)',
      tag: 'Master Inspector',
      desc: 'รู้เท่าทันเทคนิคเชิงช่าง ตรวจรับงานผู้รับเหมาอย่างละเอียดรอบคอบ ควบคุมมาตรฐานฝีมือช่าง และเลือกใช้วัสดุที่ทนทานคุ้มค่าต่องบประมาณโครงการ'
    },
    'sla_tech': {
      title: 'First-Time Fixer (ช่างแม่นยำ จบงานไวตรงกรอบเวลา)',
      tag: 'Precision Fixer',
      desc: 'วินิจฉัยอาการเสียแม่นยำ ซ่อมงานระบบสาธารณูปโภคและอาคารจบในครั้งแรก (First-Time Fix) ไม่เกิดเคสซ่อมซ้ำ และอัปเดตปิดใบงานในระบบติดตามได้อย่างรวดเร็วตามกรอบเวลา'
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
  const getGridLevel = (score) => {
    if (score >= 6.8) return 'high';
    if (score >= 4.5) return 'med';
    return 'low';
  };
  const howLevel = getGridLevel(avgInner);
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
      title: '⚠️ Under-Leveraged Talent (บุคลากรศักยภาพสูงที่ยังไม่แสดงผลงานเต็มที่)',
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
    'low_low': (avgOuter < 3.0 || avgInner < 3.0) ? {
      title: '🚨 Urgent PIP Required (ต้องเข้าโปรแกรมฟื้นฟูเร่งด่วน)',
      desc: 'ทั้งศักยภาพและผลงานต่ำกว่าเกณฑ์ปฏิบัติงานอย่างมีนัยสำคัญ เป็นจุดเสี่ยงของทีมที่ต้องได้รับการดูแลใกล้ชิด',
      badge: 'bg-rose-50 text-rose-800 border-rose-300',
      action: 'จัดพี่เลี้ยงประกบ 1:1 ห้ามทำงานเดี่ยว เข้าแผนพัฒนาผลงาน (PIP) ประเมินผลทุก 15 วัน'
    } : {
      title: '🌱 Developing Operator (ผู้ปฏิบัติงานพัฒนาทักษะ)',
      desc: 'อยู่ในช่วงพัฒนาทักษะและเรียนรู้งานโครงการ กำลังสั่งสมประสบการณ์เพื่อยกระดับสู่มาตรฐาน',
      badge: 'bg-amber-50 text-amber-800 border-amber-300',
      action: 'จัดพี่เลี้ยงประกบแนะนำหน้างาน กำหนด Check-point สม่ำเสมอ และติดตามการทำงานอย่างต่อเนื่อง'
    }
  };

  const talentGrid = talentGridMatrix[`${howLevel}_${whatLevel}`] || talentGridMatrix['med_med'];

  // 4-Point Operational Risk Engine
  const riskAlerts = [];

  // 1. Speed vs Quality Risk
  if (actualValues.sla - actualValues.tech >= 2) {
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
      desc: `ฝีมือช่างหรือความเร็วดีเยี่ยม แต่ทักษะบริการลูกบ้านต่ำ (CX ${actualValues.cx}) มีความเสี่ยงสูงที่จะเกิดการกระทบกระทั่ง`,
      advice: 'จัดคู่หูที่มี CX สูงช่วยประสานงาน หรือฝึกอบรมทักษะการเจรจาลดความขัดแย้ง'
    });
  }

  // 3. Contractor & Cost Leakage Risk
  if (actualValues.resource <= 4) {
    riskAlerts.push({
      type: 'leakage',
      level: 'warning',
      title: '💸 เสี่ยงงบประมาณรั่วไหล / ควบคุมผู้รับเหมาไม่ได้ (Contractor Leakage Risk)',
      desc: `การคุมงบและตรวจรับงานต่ำกว่าเกณฑ์ (RESOURCE ${actualValues.resource}) เสี่ยงต่อการถูกผู้รับเหมาหมกเม็ดงาน หรือเบิกอะไหล่ผิดพลาด`,
      advice: 'ให้หัวหน้างานช่วยตรวจรับมอบงานผู้รับเหมาและควบคุมการเบิกจ่ายอะไหล่'
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
    'crisis_cx': 'เหมาะสำหรับงานเข้าเจรจาระงับข้อพิพาทรุนแรง ลูกบ้านอารมณ์ร้อน และการควบคุมสถานการณ์ฉุกเฉินเฉพาะหน้าในโครงการ',
    'crisis_innovation': 'เหมาะสำหรับงานแก้ปัญหาเฉพาะหน้าในภาวะวิกฤต การประยุกต์ใช้อุปกรณ์กู้คืนระบบสาธารณูปโภค และงานซ่อมฉุกเฉินที่ซับซ้อน',
    'crisis_resource': 'เหมาะสำหรับงานบัญชาการเหตุการณ์ฉุกเฉิน การจัดสรรเครื่องจักรและกำลังคน ตลอดจนควบคุมงบประมาณซ่อมแซมเร่งด่วน',
    'crisis_sla': 'เหมาะสำหรับหน่วยเคลื่อนที่เร็วระงับเหตุฉุกเฉินในโครงการ ที่ต้องเข้าถึงหน้างานทันทีและหยุดยั้งความเสียหาย',
    'crisis_tech': 'เหมาะสำหรับงานกู้คืนระบบสาธารณูปโภคหลักของโครงการ (ระบบไฟฟ้า ปั๊มน้ำเมน ท่อเมนแรงดันสูง) ในภาวะฉุกเฉิน',
    'cx_innovation': 'เหมาะสำหรับงานบริการลูกบ้านเชิงรุก การสื่อสารแจ้งสถานะงานซ่อมผ่านระบบดิจิทัล และการประสานงานแก้ไขข้อร้องเรียนอย่างเป็นระบบ',
    'cx_resource': 'เหมาะสำหรับงานประสานประโยชน์ลูกบ้านและผู้รับเหมา การเจรจาอธิบายข้อกำหนดระเบียบโครงการ และการจัดซื้อจัดจ้างที่เป็นธรรม',
    'cx_sla': 'เหมาะสำหรับงานนัดหมายบริการด่วน การสื่อสารแจ้งสถานะงานซ่อมแบบเรียลไทม์ และงานบริการที่ต้องการความประทับใจระดับบอกต่อ',
    'cx_tech': 'เหมาะสำหรับงานที่ปรึกษาเชิงช่าง (Consultative Master) ตรวจสอบปัญหาซับซ้อน อธิบายให้ลูกบ้านเข้าใจง่าย และสร้างความเชื่อมั่น',
    'innovation_resource': 'เหมาะสำหรับงานวางแผนบำรุงรักษาทรัพย์สินส่วนกลาง การควบคุมคลังอะไหล่และอุปกรณ์ซ่อมบำรุง และการวางแผนงบประมาณซ่อมบำรุงเชิงรุก',
    'innovation_sla': 'เหมาะสำหรับงานบริหารโฟลว์งานในระบบ LH-Taskflow การติดตามเร่งรัดการปิดใบงานให้ตรงเวลา และการลดขั้นตอนซ้ำซ้อน',
    'innovation_tech': 'เหมาะสำหรับงานซ่อมบำรุงเชิงเทคนิคที่ต้องใช้ระบบติดตามงานอย่างแม่นยำ การบันทึกวิเคราะห์ประวัติงานซ่อม การวางแผนบำรุงรักษาเชิงป้องกัน (PM) และการควบคุมคุณภาพงานระบบส่วนกลาง',
    'resource_sla': 'เหมาะสำหรับงานควบคุมผู้รับเหมาให้ส่งมอบงานตรงเวลา การบริหารรอบเวลาเบิกจ่าย และการคุมต้นทุนไม่ให้บานปลาย',
    'resource_tech': 'เหมาะสำหรับงานตรวจรับมอบงานผู้รับเหมาอย่างละเอียด การตรวจสอบสเปกวัสดุอุปกรณ์ และการควบคุมมาตรฐานงานช่างของโครงการ',
    'sla_tech': 'เหมาะสำหรับงานช่างซ่อมบำรุงที่เน้น First-Time Fix วินิจฉัยแม่นยำ ปิดงานจบไวในรอบเดียว และไม่เกิดเคสซ่อมซ้ำ'
  };

  const bestFitTaskMap = {
    cx: 'เหมาะสำหรับงานที่ต้องเน้นการเจรจาต่อรอง การสื่อสารเพื่อลดความขัดแย้ง และงานบริการที่ต้องการความเห็นอกเห็นใจสูง',
    tech: 'เหมาะสำหรับงานที่ต้องการความรู้เชิงลึกทางวิศวกรรม งานตรวจสอบมาตรฐานที่ซับซ้อน และงานที่ต้องอาศัยความแม่นยำสูง',
    sla: 'เหมาะสำหรับงานเร่งด่วนที่มีเวลาจำกัด งานที่ต้องเคลียร์ให้จบอย่างรวดเร็ว และการบริหารจัดการเวลาที่เข้มงวด',
    crisis: 'เหมาะสำหรับงานระงับเหตุฉุกเฉินเฉพาะหน้า งานที่มีความกดดันสูง และสถานการณ์ที่ต้องตัดสินใจอย่างเด็ดขาดเพื่อแก้ปัญหา',
    resource: 'เหมาะสำหรับงานควบคุมงบประมาณ งานบริหารจัดการผู้รับเหมา และการจัดสรรทรัพยากรส่วนกลางให้เกิดความคุ้มค่า',
    innovation: 'เหมาะสำหรับงานวางแผนเชิงรุก งานบำรุงรักษาเชิงป้องกัน (PM) และการริเริ่มนำระบบดิจิทัลมาปรับปรุงกระบวนการ'
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
    topOuter: sortedOuter,
    talentGrid,
    riskAlerts,
    bestFitAssignment,
    pairingRecommendation
  };
};

