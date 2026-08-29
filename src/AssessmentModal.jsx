import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';
import rubricsData from './data/rubrics.json';

const Icon = ({ name, ...props }) => {
  const LucideIcon = lucide[name];
  if (!LucideIcon) return null;
  return <LucideIcon {...props} />;
};

export default function AssessmentModal({ isOpen, onClose, staff, onSave }) {
  const [scores, setScores] = useState({ str: [], agi: [], dex: [], int: [], con: [], sen: [] });
  const [activeTab, setActiveTab] = useState('str');
  
  const stats = [
    { id: 'str', label: 'STR (Strength)', color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'agi', label: 'AGI (Agility)', color: 'text-emerald-500', bg: 'bg-emerald-500' },
    { id: 'dex', label: 'DEX (Dexterity)', color: 'text-amber-500', bg: 'bg-amber-500' },
    { id: 'int', label: 'INT (Intelligence)', color: 'text-blue-500', bg: 'bg-blue-500' },
    { id: 'con', label: 'CON (Constitution)', color: 'text-orange-500', bg: 'bg-orange-500' },
    { id: 'sen', label: 'SEN (Sense)', color: 'text-purple-500', bg: 'bg-purple-500' }
  ];

  useEffect(() => {
    if (isOpen && staff) {
      // Initialize with existing stats as baseline (assuming 3 criteria per stat)
      const initScores = {};
      stats.forEach(s => {
        initScores[s.id] = [staff[s.id] || 5, staff[s.id] || 5, staff[s.id] || 5];
      });
      setScores(initScores);
      setActiveTab('str');
    }
  }, [isOpen, staff]);

  if (!isOpen || !staff) return null;

  const handleScoreChange = (statId, index, value) => {
    const newScores = { ...scores };
    newScores[statId][index] = parseInt(value, 10);
    setScores(newScores);
  };

  const calculateAverage = (statId) => {
    const sum = scores[statId].reduce((a, b) => a + b, 0);
    return Math.round(sum / scores[statId].length);
  };

  const handleSave = () => {
    const newStats = {
      str: calculateAverage('str'),
      agi: calculateAverage('agi'),
      dex: calculateAverage('dex'),
      int: calculateAverage('int'),
      con: calculateAverage('con'),
      sen: calculateAverage('sen'),
    };
    onSave(newStats);
  };

  const getGuidelineText = (statId, index, currentScore) => {
    const rubrics = rubricsData[statId][index].levels;
    if (currentScore <= 3) return { text: rubrics["1"], level: "ระดับพื้นฐาน (1-3)", color: "text-red-500" };
    if (currentScore === 4) return { text: rubrics["4"], level: "ระดับพอใช้ (4)", color: "text-orange-500" };
    if (currentScore === 5) return { text: rubrics["5"], level: "ระดับมาตรฐานขั้นต้น (5)", color: "text-emerald-600" };
    if (currentScore === 6) return { text: rubrics["6"], level: "ระดับมาตรฐานขั้นดี (6)", color: "text-emerald-500" };
    if (currentScore <= 8) return { text: rubrics["7"], level: "ระดับสูง (7-8)", color: "text-blue-500" };
    return { text: rubrics["9"], level: "ระดับสูงสุด (9-10)", color: "text-purple-500" };
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#0f2e4a] text-white p-5 flex justify-between items-center border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              <Icon name="clipboard-check" size={24} className="mr-2 text-[#bca374]" />
              ประเมินศักยภาพบุคลากร
            </h2>
            <p className="text-sm text-slate-300 mt-1 opacity-80">พนักงาน: <span className="font-bold text-white">{staff.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white">
            <Icon name="x" size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-full md:w-48 bg-slate-50 border-r border-slate-200 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto">
            {stats.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                className={`flex items-center justify-between p-4 text-left border-b border-slate-200 transition-colors whitespace-nowrap ${activeTab === s.id ? 'bg-white border-l-4 border-l-[#0f2e4a] font-bold text-[#0f2e4a]' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <span>{s.id.toUpperCase()}</span>
                <div className="flex items-center">
                  <span className={`text-xs px-2 py-1 rounded-full text-white ${s.bg}`}>{calculateAverage(s.id)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Main Assessment Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            <div className="mb-6 flex items-center justify-between border-b pb-4">
              <h3 className={`text-2xl font-black ${stats.find(s=>s.id===activeTab).color}`}>
                {stats.find(s=>s.id===activeTab).label}
              </h3>
              <div className="bg-slate-100 px-4 py-2 rounded-lg">
                <span className="text-sm text-slate-500 font-bold mr-2">คะแนนเฉลี่ย:</span>
                <span className={`text-xl font-black ${stats.find(s=>s.id===activeTab).color}`}>{calculateAverage(activeTab)} / 10</span>
              </div>
            </div>

            <div className="space-y-8">
              {rubricsData[activeTab].map((criteria, idx) => {
                const currentScore = scores[activeTab][idx];
                const guide = getGuidelineText(activeTab, idx, currentScore);
                
                return (
                  <div key={idx} className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-lg mb-1">{criteria.label}</h4>
                    <p className="text-sm text-slate-500 mb-5">{criteria.desc.replace(/\\r\\n/g, ' ')}</p>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-slate-400 font-bold w-4 text-center">1</span>
                      <input 
                        type="range" 
                        min="1" max="10" 
                        value={currentScore}
                        onChange={(e) => handleScoreChange(activeTab, idx, e.target.value)}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0f2e4a]"
                      />
                      <span className="text-slate-400 font-bold w-4 text-center">10</span>
                      <div className="w-12 h-12 bg-white border-2 border-[#0f2e4a] rounded-xl flex items-center justify-center font-black text-xl text-[#0f2e4a] shadow-sm ml-2">
                        {currentScore}
                      </div>
                    </div>

                    {/* Dynamic Guideline Box */}
                    <div className={`mt-4 p-4 rounded-lg border bg-white ${guide.color.replace('text-', 'border-').replace('500', '200')} shadow-inner`}>
                      <div className={`text-xs font-black uppercase mb-1 ${guide.color}`}>
                        {guide.level}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        "{guide.text}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleSave} className="px-8 py-2.5 bg-[#0f2e4a] text-white rounded-lg font-bold shadow-md hover:bg-[#1a3f63] transition-colors flex items-center">
            <Icon name="save" size={18} className="mr-2" />
            บันทึกการประเมิน
          </button>
        </div>

      </div>
    </div>
  );
}
