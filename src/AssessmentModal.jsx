import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';
import rubricsData from './data/rubrics.json';
import { OUTER_DEFINITIONS, OUTER_KEYS, analyzeOuterLayer } from './utils/archetypeEngine';

const Icon = ({ name, ...props }) => {
  const LucideIcon = lucide[name];
  if (!LucideIcon) return null;
  return <LucideIcon {...props} />;
};

export default function AssessmentModal({ isOpen, onClose, staff, onSave }) {
  // Main Section: 'inner' (HOW: Core Stats) or 'outer' (WHAT: Field Competencies)
  const [assessmentSection, setAssessmentSection] = useState('inner');
  const [innerScores, setInnerScores] = useState({ str: [], agi: [], dex: [], int: [], con: [], sen: [] });
  const [outerScores, setOuterScores] = useState({ cx: 5, tech: 5, sla: 5, crisis: 5, resource: 5, innovation: 5 });
  const [outerCustomized, setOuterCustomized] = useState({ cx: false, tech: false, sla: false, crisis: false, resource: false, innovation: false });
  
  const [activeInnerTab, setActiveInnerTab] = useState('str');
  const [activeOuterTab, setActiveOuterTab] = useState('cx');

  const stats = [
    { id: 'str', label: 'STR (Strength)', sub: 'พลังขับเคลื่อน & ตัดสินใจ', color: 'text-rose-500', bg: 'bg-rose-500', lightBg: 'bg-rose-50' },
    { id: 'agi', label: 'AGI (Agility)', sub: 'ความรวดเร็ว & ยืดหยุ่น', color: 'text-emerald-500', bg: 'bg-emerald-50', lightBg: 'bg-emerald-50' },
    { id: 'dex', label: 'DEX (Dexterity)', sub: 'ความละเอียด & รอบคอบ', color: 'text-amber-500', bg: 'bg-amber-500', lightBg: 'bg-amber-50' },
    { id: 'int', label: 'INT (Intelligence)', sub: 'ระบบ & เทคโนโลยี', color: 'text-blue-500', bg: 'bg-blue-500', lightBg: 'bg-blue-50' },
    { id: 'con', label: 'CON (Constitution)', sub: 'ความทนทาน & คุมอารมณ์', color: 'text-orange-500', bg: 'bg-orange-500', lightBg: 'bg-orange-50' },
    { id: 'sen', label: 'SEN (Sense)', sub: 'จิตวิทยา & เจรจาต่อรอง', color: 'text-purple-500', bg: 'bg-purple-500', lightBg: 'bg-purple-50' }
  ];

  const calculateAverage = (statId) => {
    if (!innerScores[statId] || innerScores[statId].length === 0) return 5;
    const sum = innerScores[statId].reduce((a, b) => a + b, 0);
    return Math.round(sum / innerScores[statId].length);
  };

  const getBaselineOuter = (key, customInnerStats = null) => {
    const s = customInnerStats || {
      str: calculateAverage('str'),
      agi: calculateAverage('agi'),
      dex: calculateAverage('dex'),
      int: calculateAverage('int'),
      con: calculateAverage('con'),
      sen: calculateAverage('sen')
    };
    const def = OUTER_DEFINITIONS[key];
    return def ? def.calc(s) : 5;
  };

  useEffect(() => {
    if (isOpen && staff) {
      // Initialize inner stats
      const initInner = {};
      stats.forEach(s => {
        const val = Number(staff[s.id]) || 5;
        initInner[s.id] = [val, val, val];
      });
      setInnerScores(initInner);

      // Initialize outer layer
      const initOuter = {};
      const initCustomized = {};
      const currentInner = {
        str: Number(staff.str) || 5,
        agi: Number(staff.agi) || 5,
        dex: Number(staff.dex) || 5,
        int: Number(staff.int) || 5,
        con: Number(staff.con) || 5,
        sen: Number(staff.sen) || 5
      };

      OUTER_KEYS.forEach(k => {
        const autoVal = getBaselineOuter(k, currentInner);
        if (staff[k] !== undefined && staff[k] !== null) {
          initOuter[k] = Number(staff[k]);
          initCustomized[k] = Number(staff[k]) !== autoVal;
        } else {
          initOuter[k] = autoVal;
          initCustomized[k] = false;
        }
      });

      setOuterScores(initOuter);
      setOuterCustomized(initCustomized);
      setAssessmentSection('inner');
      setActiveInnerTab('str');
      setActiveOuterTab('cx');
    }
  }, [isOpen, staff]);

  if (!isOpen || !staff) return null;

  const handleInnerScoreChange = (statId, index, value) => {
    const newScores = { ...innerScores };
    newScores[statId][index] = parseInt(value, 10);
    setInnerScores(newScores);

    // Update un-customized outer scores according to updated inner averages
    const updatedInnerStats = {
      str: statId === 'str' ? Math.round(newScores.str.reduce((a, b) => a + b, 0) / newScores.str.length) : calculateAverage('str'),
      agi: statId === 'agi' ? Math.round(newScores.agi.reduce((a, b) => a + b, 0) / newScores.agi.length) : calculateAverage('agi'),
      dex: statId === 'dex' ? Math.round(newScores.dex.reduce((a, b) => a + b, 0) / newScores.dex.length) : calculateAverage('dex'),
      int: statId === 'int' ? Math.round(newScores.int.reduce((a, b) => a + b, 0) / newScores.int.length) : calculateAverage('int'),
      con: statId === 'con' ? Math.round(newScores.con.reduce((a, b) => a + b, 0) / newScores.con.length) : calculateAverage('con'),
      sen: statId === 'sen' ? Math.round(newScores.sen.reduce((a, b) => a + b, 0) / newScores.sen.length) : calculateAverage('sen')
    };

    const newOuter = { ...outerScores };
    OUTER_KEYS.forEach(k => {
      if (!outerCustomized[k]) {
        newOuter[k] = getBaselineOuter(k, updatedInnerStats);
      }
    });
    setOuterScores(newOuter);
  };

  const handleOuterScoreChange = (outerKey, value) => {
    const val = Math.min(Math.max(Number(value), 1), 10);
    setOuterScores(prev => ({ ...prev, [outerKey]: val }));
    setOuterCustomized(prev => ({ ...prev, [outerKey]: true }));
  };

  const resetOuterToBaseline = (outerKey) => {
    const baseVal = getBaselineOuter(outerKey);
    setOuterScores(prev => ({ ...prev, [outerKey]: baseVal }));
    setOuterCustomized(prev => ({ ...prev, [outerKey]: false }));
  };

  const resetAllOuterToBaseline = () => {
    const newOuter = {};
    const newCustomized = {};
    OUTER_KEYS.forEach(k => {
      newOuter[k] = getBaselineOuter(k);
      newCustomized[k] = false;
    });
    setOuterScores(newOuter);
    setOuterCustomized(newCustomized);
  };

  const currentInnerStatsObj = {
    str: calculateAverage('str'),
    agi: calculateAverage('agi'),
    dex: calculateAverage('dex'),
    int: calculateAverage('int'),
    con: calculateAverage('con'),
    sen: calculateAverage('sen')
  };

  const currentOuterAnalysis = analyzeOuterLayer(outerScores, currentInnerStatsObj);

  const handleSave = () => {
    const payload = {
      ...currentInnerStatsObj,
      cx: outerScores.cx,
      tech: outerScores.tech,
      sla: outerScores.sla,
      crisis: outerScores.crisis,
      resource: outerScores.resource,
      innovation: outerScores.innovation
    };
    onSave(payload);
  };

  const getGuidelineText = (statId, index, currentScore) => {
    if (!rubricsData[statId] || !rubricsData[statId][index]) return { text: '', level: '', color: 'text-slate-500' };
    const rubrics = rubricsData[statId][index].levels;
    const v = String(currentScore);
    const levelMap = {
      "1": { text: rubrics["1"], level: "ขั้นวิกฤต (Crisis)", color: "text-red-700" },
      "2": { text: rubrics["2"], level: "ต้องปรับปรุง (Poor)", color: "text-red-500" },
      "3": { text: rubrics["3"], level: "ต้องการการดูแล (Needs Help)", color: "text-orange-600" },
      "4": { text: rubrics["4"], level: "ต่ำกว่าเกณฑ์ (Below Average)", color: "text-orange-500" },
      "5": { text: rubrics["5"], level: "ระดับมาตรฐาน (Standard)", color: "text-emerald-600" },
      "6": { text: rubrics["6"], level: "ระดับดีเยี่ยม (Good)", color: "text-emerald-500" },
      "7": { text: rubrics["7"], level: "ระดับเชี่ยวชาญ (Advanced)", color: "text-blue-500" },
      "8": { text: rubrics["8"], level: "ระดับผู้เชี่ยวชาญพิเศษ (Expert)", color: "text-blue-600" },
      "9": { text: rubrics["9"], level: "ระดับผู้นำ (Mastery)", color: "text-purple-500" },
      "10": { text: rubrics["10"], level: "ระดับตำนาน (Legendary)", color: "text-purple-600" }
    };
    return levelMap[v] || levelMap["5"];
  };

  const getOuterGuideline = (outerKey, currentScore) => {
    if (!rubricsData[outerKey] || !rubricsData[outerKey][0]) return { text: '', level: '', color: 'text-slate-500' };
    const rubrics = rubricsData[outerKey][0].levels;
    const v = String(currentScore);
    const levelMap = {
      "1": { text: rubrics["1"], level: "ขั้นวิกฤต (Crisis)", color: "text-red-700" },
      "2": { text: rubrics["2"], level: "ต้องปรับปรุง (Poor)", color: "text-red-500" },
      "3": { text: rubrics["3"], level: "ต้องการการดูแล (Needs Help)", color: "text-orange-600" },
      "4": { text: rubrics["4"], level: "ต่ำกว่าเกณฑ์ (Below Average)", color: "text-orange-500" },
      "5": { text: rubrics["5"], level: "ระดับมาตรฐาน (Standard)", color: "text-emerald-600" },
      "6": { text: rubrics["6"], level: "ระดับดีเยี่ยม (Good)", color: "text-emerald-500" },
      "7": { text: rubrics["7"], level: "ระดับเชี่ยวชาญ (Advanced)", color: "text-blue-500" },
      "8": { text: rubrics["8"], level: "ระดับผู้เชี่ยวชาญพิเศษ (Expert)", color: "text-blue-600" },
      "9": { text: rubrics["9"], level: "ระดับผู้นำ (Mastery)", color: "text-purple-500" },
      "10": { text: rubrics["10"], level: "ระดับตำนาน (Legendary)", color: "text-purple-600" }
    };
    return levelMap[v] || levelMap["5"];
  };

  const avgInnerScore = Math.round((
    calculateAverage('str') + calculateAverage('agi') + calculateAverage('dex') +
    calculateAverage('int') + calculateAverage('con') + calculateAverage('sen')
  ) / 6 * 10) / 10;

  const avgOuterScore = Math.round((
    outerScores.cx + outerScores.tech + outerScores.sla +
    outerScores.crisis + outerScores.resource + outerScores.innovation
  ) / 6 * 10) / 10;

  const activeOuterDef = OUTER_DEFINITIONS[activeOuterTab];
  const activeOuterBaseline = getBaselineOuter(activeOuterTab);
  const activeOuterCurrentVal = outerScores[activeOuterTab];
  const isOuterOverridden = outerCustomized[activeOuterTab];
  const outerGuide = getOuterGuideline(activeOuterTab, activeOuterCurrentVal);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#0f2e4a] text-white p-4 sm:p-5 flex justify-between items-center border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#bca374]/20 text-[#e6d0a7] border border-[#bca374]/30">
                <Icon name="clipboard-check" size={20} />
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-wide">
                ระบบประเมินศักยภาพและสมรรถนะงานบริการ
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              พนักงาน: <span className="font-bold text-[#e6d0a7]">{staff.name}</span>
              <span className="mx-2 text-slate-500">|</span>
              สายงานบริการ & ดูแลรักษาสาธารณูปโภคหมู่บ้านจัดสรร
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white"
            title="ปิดหน้าต่าง"
          >
            <Icon name="x" size={22} />
          </button>
        </div>

        {/* Section Tabs Switcher (HOW vs WHAT) */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex rounded-xl bg-slate-200/80 p-1 border border-slate-300">
            <button
              type="button"
              onClick={() => setAssessmentSection('inner')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                assessmentSection === 'inner'
                  ? 'bg-white text-[#0f2e4a] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon name="activity" size={16} className={assessmentSection === 'inner' ? 'text-rose-500' : 'text-slate-400'} />
              <span>1. ศักยภาพหลัก (HOW)</span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">
                เฉลี่ย {avgInnerScore}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAssessmentSection('outer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                assessmentSection === 'outer'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon name="layers" size={16} className={assessmentSection === 'outer' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>2. สมรรถนะหน้างาน (WHAT)</span>
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200">
                เฉลี่ย {avgOuterScore}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-500">ผลวิเคราะห์สังเคราะห์:</span>
            <span className="font-bold text-[#0f2e4a] bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
              ⭐ {currentOuterAnalysis.performanceDna.title.split(' (')[0]}
            </span>
            <span className={`font-bold text-[11px] px-2 py-0.5 rounded border ${currentOuterAnalysis.alignmentBadge}`}>
              {currentOuterAnalysis.alignmentTitle.split(' (')[0]}
            </span>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
          
          {/* SECTION 1: INNER STATS (HOW) */}
          {assessmentSection === 'inner' && (
            <>
              {/* Left Sidebar for Inner Stats */}
              <div className="w-full md:w-56 bg-slate-50 border-r border-slate-200 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto shrink-0">
                {stats.map(s => {
                  const avg = calculateAverage(s.id);
                  const isAct = activeInnerTab === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveInnerTab(s.id)}
                      className={`flex items-center justify-between p-3.5 text-left border-b border-slate-200 transition-colors whitespace-nowrap ${
                        isAct 
                          ? 'bg-white border-l-4 border-l-[#0f2e4a] font-bold text-[#0f2e4a] shadow-xs' 
                          : 'text-slate-600 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-black">{s.label.split(' ')[0]}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{s.sub}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full text-white font-black ${s.bg}`}>
                        {avg}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Main Content Area for Inner Stats */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-white space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className={`text-xl font-black flex items-center gap-2 ${stats.find(s => s.id === activeInnerTab).color}`}>
                      <Icon name="activity" size={20} />
                      {stats.find(s => s.id === activeInnerTab).label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ประเมิน 3 มิติย่อยเพื่อหาค่าเฉลี่ยศักยภาพพื้นฐาน (เกณฑ์ 1-10 พร้อม Rubric อ้างอิง)
                    </p>
                  </div>
                  <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-bold mr-2">คะแนนเฉลี่ย:</span>
                    <span className={`text-xl font-black ${stats.find(s => s.id === activeInnerTab).color}`}>
                      {calculateAverage(activeInnerTab)} <span className="text-xs text-slate-400 font-normal">/ 10</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {rubricsData[activeInnerTab].map((criteria, idx) => {
                    const currentScore = innerScores[activeInnerTab][idx];
                    const guide = getGuidelineText(activeInnerTab, idx, currentScore);

                    return (
                      <div key={idx} className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                            {idx + 1}. {criteria.label}
                          </h4>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded bg-white text-[#0f2e4a] border border-slate-200 shadow-xs">
                            {currentScore} / 10
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">{criteria.desc.replace(/\\r\\n/g, ' ')}</p>

                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-slate-400 font-bold text-xs w-4 text-center">1</span>
                          <input 
                            type="range" 
                            min="1" max="10" 
                            value={currentScore}
                            onChange={(e) => handleInnerScoreChange(activeInnerTab, idx, e.target.value)}
                            className="flex-1 h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0f2e4a]"
                          />
                          <span className="text-slate-400 font-bold text-xs w-4 text-center">10</span>
                          <div className="w-10 h-10 bg-white border-2 border-[#0f2e4a] rounded-xl flex items-center justify-center font-black text-base text-[#0f2e4a] shadow-xs shrink-0">
                            {currentScore}
                          </div>
                        </div>

                        {/* Dynamic Guideline Box */}
                        <div className={`p-3.5 rounded-lg border bg-white ${guide.color.replace('text-', 'border-').replace('500', '200')} shadow-xs`}>
                          <div className={`text-[11px] font-black uppercase mb-1 flex items-center gap-1.5 ${guide.color}`}>
                            <Icon name="check-circle" size={13} />
                            {guide.level}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            "{guide.text}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setAssessmentSection('outer')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>ถัดไป: ประเมินสมรรถนะหน้างาน (Outer Layer)</span>
                    <Icon name="chevron-right" size={16} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* SECTION 2: OUTER LAYER COMPETENCIES (WHAT) */}
          {assessmentSection === 'outer' && (
            <>
              {/* Left Sidebar for Outer Layer */}
              <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto shrink-0">
                <div className="hidden md:flex justify-between items-center p-3 bg-indigo-900/5 border-b border-indigo-100">
                  <span className="text-[11px] font-black text-indigo-950">6 แกนสมรรถนะหน้างาน</span>
                  <button
                    type="button"
                    onClick={resetAllOuterToBaseline}
                    title="รีเซ็ตทุกแกนเป็นค่าคำนวณจากศักยภาพ"
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline"
                  >
                    รีเซ็ตทั้งหมด
                  </button>
                </div>

                {OUTER_KEYS.map(k => {
                  const def = OUTER_DEFINITIONS[k];
                  const val = outerScores[k];
                  const isAct = activeOuterTab === k;
                  const isCustom = outerCustomized[k];
                  const autoVal = getBaselineOuter(k);

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setActiveOuterTab(k)}
                      className={`flex items-center justify-between p-3 text-left border-b border-slate-200 transition-colors whitespace-nowrap ${
                        isAct 
                          ? 'bg-white border-l-4 border-l-indigo-600 font-bold text-indigo-950 shadow-xs' 
                          : 'text-slate-600 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black">{def.name}</span>
                          {isCustom && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="คะแนนปรับแต่ง"></span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal truncate">{def.thai}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                          isCustom ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {val}
                        </span>
                        <span className="text-[8px] text-slate-400 mt-0.5">
                          ฐาน: {autoVal}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Main Content Area for Outer Layer */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-white space-y-5">
                
                {/* Outer Axis Header */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/40 border border-indigo-100">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg text-white font-bold text-xs ${activeOuterDef.bg}`}>
                          {activeOuterDef.key.toUpperCase()}
                        </span>
                        <h3 className="text-lg sm:text-xl font-black text-indigo-950">
                          {activeOuterDef.fullName}
                        </h3>
                      </div>
                      <p className="text-xs font-bold text-[#0f2e4a] mt-1">
                        {activeOuterDef.thai}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {activeOuterDef.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">ศักยภาพคำนวณ ({activeOuterDef.formulaDesc})</div>
                        <div className="text-xs font-black text-slate-700">{activeOuterBaseline} / 10</div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center shadow-sm">
                        <span className="text-[9px] font-bold opacity-80 uppercase leading-none">คะแนน</span>
                        <span className="text-xl font-black leading-tight">{activeOuterCurrentVal}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sync / Baseline Helper Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-indigo-100/80 text-xs">
                    <span className="text-[11px] text-slate-600">
                      สถานะ: {isOuterOverridden ? (
                        <strong className="text-indigo-700">✏️ ปรับแต่งผลงานหน้างานจริง ({activeOuterCurrentVal > activeOuterBaseline ? `+${activeOuterCurrentVal - activeOuterBaseline} สูงกว่าศักยภาพ` : `${activeOuterCurrentVal - activeOuterBaseline} ต่ำกว่าศักยภาพ`})</strong>
                      ) : (
                        <strong className="text-slate-500">⚡ ใช้คะแนนคำนวณตามศักยภาพตั้งต้น</strong>
                      )}
                    </span>
                    {isOuterOverridden && (
                      <button
                        type="button"
                        onClick={() => resetOuterToBaseline(activeOuterTab)}
                        className="text-[11px] px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg font-bold flex items-center gap-1 transition shadow-xs"
                      >
                        <Icon name="rotate-ccw" size={12} />
                        คืนค่าตามศักยภาพ ({activeOuterBaseline})
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Tier Selector Buttons (ลดแรงเสียดทานการบันทึกค่า) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon name="zap" size={14} className="text-amber-500" />
                      เลือกระดับสมรรถนะหน้างานอย่างรวดเร็ว (Quick Tier Selection)
                    </label>
                    <span className="text-[10px] text-slate-400">คลิกเพื่อกำหนดระดับได้ทันที</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { tier: '1-3', label: 'ต้องเร่งปรับปรุง', sub: 'Needs Improvement', defVal: 3, color: 'border-rose-300 hover:bg-rose-50 text-rose-800 bg-rose-50/40', activeBg: 'bg-rose-500 text-white ring-2 ring-rose-400 shadow-md', match: activeOuterCurrentVal <= 3 },
                      { tier: '4-6', label: 'ตามมาตรฐานงาน', sub: 'Standard Achiever', defVal: 5, color: 'border-amber-300 hover:bg-amber-50 text-amber-800 bg-amber-50/40', activeBg: 'bg-amber-500 text-white ring-2 ring-amber-400 shadow-md', match: activeOuterCurrentVal >= 4 && activeOuterCurrentVal <= 6 },
                      { tier: '7-8', label: 'เชี่ยวชาญ/พึ่งพาได้', sub: 'Strong Performer', defVal: 8, color: 'border-blue-300 hover:bg-blue-50 text-blue-800 bg-blue-50/40', activeBg: 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md', match: activeOuterCurrentVal >= 7 && activeOuterCurrentVal <= 8 },
                      { tier: '9-10', label: 'ต้นแบบระดับผู้นำ', sub: 'Mastery / Role Model', defVal: 10, color: 'border-purple-300 hover:bg-purple-50 text-purple-800 bg-purple-50/40', activeBg: 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-md', match: activeOuterCurrentVal >= 9 }
                    ].map(t => (
                      <button
                        key={t.tier}
                        type="button"
                        onClick={() => handleOuterScoreChange(activeOuterTab, t.defVal)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          t.match ? t.activeBg : t.color
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black tracking-wide">ระดับ {t.tier}</span>
                          {t.match && <Icon name="check" size={14} />}
                        </div>
                        <div className="font-bold text-xs leading-tight">{t.label}</div>
                        <div className="text-[9px] opacity-80 mt-0.5">{t.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fine-Tuning 1-10 Numeric Chips */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-700">ปรับคะแนนละเอียด (Fine-Tune 1 - 10):</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOuterScoreChange(activeOuterTab, Math.max(1, activeOuterCurrentVal - 1))}
                        className="w-7 h-7 bg-white hover:bg-slate-200 border rounded-lg flex items-center justify-center font-black text-slate-700 text-sm shadow-xs"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-black text-indigo-900 text-sm">{activeOuterCurrentVal}</span>
                      <button
                        type="button"
                        onClick={() => handleOuterScoreChange(activeOuterTab, Math.min(10, activeOuterCurrentVal + 1))}
                        className="w-7 h-7 bg-white hover:bg-slate-200 border rounded-lg flex items-center justify-center font-black text-slate-700 text-sm shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                      const isSel = activeOuterCurrentVal === num;
                      const isBase = activeOuterBaseline === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleOuterScoreChange(activeOuterTab, num)}
                          className={`h-9 rounded-lg font-black text-xs transition-all relative ${
                            isSel 
                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400 scale-105' 
                              : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {num}
                          {isBase && !isSel && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" title="ค่าศักยภาพคำนวณ"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real-time Estate Rubric Guidance Box */}
                <div className={`p-4 rounded-xl border bg-white ${outerGuide.color.replace('text-', 'border-').replace('500', '200')} shadow-xs space-y-1.5`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-black uppercase flex items-center gap-1.5 ${outerGuide.color}`}>
                      <Icon name="award" size={15} />
                      เกณฑ์ประเมินระดับ: {outerGuide.level} (คะแนน {activeOuterCurrentVal}/10)
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">บริบทงานบริการหมู่บ้านจัดสรร</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed pt-1">
                    "{outerGuide.text}"
                  </p>
                </div>

                {/* Live Real-time Talent Preview Strip */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-md">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-sm">⭐</span>
                      <strong className="text-xs text-white font-black">{currentOuterAnalysis.performanceDna.title}</strong>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-emerald-300 border border-white/10">
                      {currentOuterAnalysis.talentGrid.title.split(' (')[0]}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    {currentOuterAnalysis.performanceDna.desc}
                  </p>

                  {/* Active Risk Alerts if any */}
                  {currentOuterAnalysis.riskAlerts.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-white/10">
                      {currentOuterAnalysis.riskAlerts.map((r, i) => (
                        <div key={i} className="text-[10px] text-amber-300 bg-amber-500/15 p-1.5 rounded border border-amber-500/30 flex items-start gap-1.5">
                          <Icon name="alert-triangle" size={13} className="shrink-0 mt-0.5 text-amber-400" />
                          <span>{r.title}: {r.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Icon name="info" size={15} className="text-slate-400" />
            <span>
              บันทึกผลการประเมินเพื่ออัปเดตสเตตัสและสมรรถนะหน้างานทันที
            </span>
          </div>

          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              type="button" 
              onClick={handleSave} 
              className="px-7 py-2 bg-[#0f2e4a] hover:bg-[#1a3f63] text-white text-xs font-black rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <Icon name="save" size={16} />
              บันทึกผลการประเมินทั้งหมด
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

