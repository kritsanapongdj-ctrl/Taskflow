import React, { useState, useMemo } from 'react';
import * as lucide from 'lucide-react';
import { analyzeArchetype, getRoleTargetProfile } from '../../utils/archetypeEngine';

const Icon = ({ name, ...props }) => {
  const LucideIcon = lucide[name];
  if (!LucideIcon) return null;
  return <LucideIcon {...props} />;
};

export default function TeamCalibrationModal({ isOpen, onClose, staffList = [], sets = {}, archetypesData, onSelectStaff }) {
  const [filterTier, setFilterTier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const classMap = useMemo(() => {
    return (sets.staffClasses || []).reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [sets.staffClasses]);

  // Compute calibration data for all staff
  const calibratedStaff = useMemo(() => {
    return staffList.map(s => {
      const roleObj = classMap[s.classId];
      const roleProfile = getRoleTargetProfile(s.role || s.classId || roleObj);
      const analysis = analyzeArchetype(s, sets, archetypesData) || {};
      const tier = analysis.competencyTier || { level: 2, name: 'Tier 2', thai: 'กำลังพัฒนา' };
      
      return {
        raw: s,
        id: s.id,
        name: s.name,
        image: s.image,
        roleName: roleObj?.name || roleProfile.name || 'ไม่ระบุสายงาน',
        analysis,
        tier,
        tierLevel: tier.level,
        maxStat: analysis.maxStat,
        minStat: analysis.minStat,
        dynamicStrength: analysis.dynamicStrength,
        dynamicWeakness: analysis.dynamicWeakness,
        actionPlaybook: analysis.actionPlaybook,
        stats: {
          str: Number(s.str) || 5,
          agi: Number(s.agi) || 5,
          dex: Number(s.dex) || 5,
          int: Number(s.int) || 5,
          con: Number(s.con) || 5,
          sen: Number(s.sen) || 5
        }
      };
    });
  }, [staffList, classMap, sets, archetypesData]);

  // Statistics breakdown
  const statsSummary = useMemo(() => {
    const total = calibratedStaff.length;
    const tier4 = calibratedStaff.filter(s => s.tierLevel === 4).length;
    const tier3 = calibratedStaff.filter(s => s.tierLevel === 3).length;
    const tier2 = calibratedStaff.filter(s => s.tierLevel === 2).length;
    const tier1 = calibratedStaff.filter(s => s.tierLevel === 1).length;
    return { total, tier4, tier3, tier2, tier1 };
  }, [calibratedStaff]);

  // Filtered list
  const filteredList = useMemo(() => {
    return calibratedStaff.filter(s => {
      if (filterTier !== 'all' && s.tierLevel !== Number(filterTier)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = (s.name || '').toLowerCase().includes(term);
        const matchesRole = (s.roleName || '').toLowerCase().includes(term);
        const matchesArchetype = (s.analysis.mainStyle || '').toLowerCase().includes(term);
        if (!matchesName && !matchesRole && !matchesArchetype) return false;
      }
      return true;
    });
  }, [calibratedStaff, filterTier, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-5xl rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Icon name="sliders" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <span>ตรวจสอบและเทียบระดับศักยภาพทั้งทีม (Talent Calibration)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {statsSummary.total} คนในระบบ
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                ตรวจสอบความสอดคล้องระหว่างคะแนนจริงและผลการประเมินตามเกณฑ์มาตรฐาน Score-Tiered Competency
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Tier Distribution Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-900/60 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setFilterTier(filterTier === '4' ? 'all' : '4')}
            className={`p-2.5 rounded-xl border text-left transition ${
              filterTier === '4' 
                ? 'bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/30' 
                : 'bg-slate-800/50 border-slate-700/60 hover:border-emerald-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400">Tier 4: Master</span>
              <span className="text-base font-black text-emerald-300">{statsSummary.tier4}</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">เชี่ยวชาญพิเศษ / ต้นแบบ</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterTier(filterTier === '3' ? 'all' : '3')}
            className={`p-2.5 rounded-xl border text-left transition ${
              filterTier === '3' 
                ? 'bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/30' 
                : 'bg-slate-800/50 border-slate-700/60 hover:border-indigo-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-400">Tier 3: Specialist</span>
              <span className="text-base font-black text-indigo-300">{statsSummary.tier3}</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">ชำนาญการเฉพาะทาง (≥7)</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterTier(filterTier === '2' ? 'all' : '2')}
            className={`p-2.5 rounded-xl border text-left transition ${
              filterTier === '2' 
                ? 'bg-sky-950/50 border-sky-500 ring-2 ring-sky-500/30' 
                : 'bg-slate-800/50 border-slate-700/60 hover:border-sky-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-sky-400">Tier 2: Baseline</span>
              <span className="text-base font-black text-sky-300">{statsSummary.tier2}</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">มาตรฐานพื้นฐาน (5-6)</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterTier(filterTier === '1' ? 'all' : '1')}
            className={`p-2.5 rounded-xl border text-left transition ${
              filterTier === '1' 
                ? 'bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/30' 
                : 'bg-slate-800/50 border-slate-700/60 hover:border-amber-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400">Tier 1: Foundation</span>
              <span className="text-base font-black text-amber-300">{statsSummary.tier1}</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">กำลังสร้างพื้นฐาน (&lt;5)</p>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Icon name="search" size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อพนักงาน, ตำแหน่ง, สายอาชีพ..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>แสดง {filteredList.length} จาก {calibratedStaff.length} คน</span>
            {filterTier !== 'all' && (
              <button
                type="button"
                onClick={() => setFilterTier('all')}
                className="text-amber-400 hover:underline ml-1 font-bold text-[11px]"
              >
                (ล้างตัวกรอง)
              </button>
            )}
          </div>
        </div>

        {/* Calibration Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {filteredList.map(item => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/80 hover:border-amber-500/50 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
            >
              {/* Left Column: Staff Info */}
              <div className="flex items-center gap-3 min-w-[220px]">
                <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden shrink-0 border border-slate-600">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-300">
                      {(item.name || 'TH').substring(0, 2)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-bold text-sm">{item.name}</strong>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${item.tier.badgeColor || 'text-slate-300'}`}>
                      Tier {item.tierLevel}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    {item.roleName} • <span className="text-amber-300 font-semibold">{item.analysis.mainStyle}</span>
                  </div>
                </div>
              </div>

              {/* Middle Column: Radar Stats Preview */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                {['str', 'agi', 'dex', 'int', 'con', 'sen'].map(k => {
                  const val = item.stats[k];
                  const color = val >= 7 ? 'text-emerald-400 font-black' : val >= 5 ? 'text-sky-300 font-bold' : 'text-amber-400';
                  return (
                    <div key={k} className="flex flex-col items-center px-1">
                      <span className="text-[8px] text-slate-500 uppercase">{k}</span>
                      <span className={`text-[11px] ${color}`}>{val}</span>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Assessment Verdict */}
              <div className="flex-1 min-w-[240px] max-w-md text-[11px] space-y-1">
                <div>
                  <span className={`${item.analysis.dynamicStrengthColor || 'text-emerald-400'} font-bold mr-1`}>
                    {item.analysis.dynamicStrengthLabel || 'จุดเด่น:'}
                  </span>
                  <span className="text-slate-300 line-clamp-1">
                    {item.dynamicStrength}
                  </span>
                </div>
                {item.dynamicWeakness && (
                  <div className="text-slate-400 line-clamp-1">
                    <span className="text-rose-400 font-bold mr-1">จุดระวัง:</span>
                    <span>{item.dynamicWeakness}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Manager Action & Select Button */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {item.actionPlaybook && (
                  <span className={`text-[9px] font-bold px-2 py-1 rounded border hidden lg:inline-block ${item.actionPlaybook.color}`}>
                    {item.actionPlaybook.tag}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectStaff) onSelectStaff(item.raw);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition flex items-center gap-1"
                >
                  <span>เปิดดูการ์ด</span>
                  <Icon name="arrowRight" size={12} />
                </button>
              </div>
            </div>
          ))}

          {filteredList.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Icon name="users" size={36} className="mx-auto mb-2 opacity-40" />
              <p>ไม่พบรายชื่อพนักงานตามเงื่อนไขที่ค้นหา</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-400">
          <span>
            💡 ระบบปรับปรุงผลประเมินพนักงานทุกคนให้สอดคล้องกับคะแนนจริงโดยอัตโนมัติแล้ว
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
