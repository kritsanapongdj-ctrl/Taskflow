import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Define the new cinematic view function
cinematic_view_code = """
    const renderCinematicView = () => {
      const u = teamForm;
      if (!u.id) return null;
      const role = classMap[u.classId];

      const statsObj = { str: Number(u.str)||0, agi: Number(u.agi)||0, dex: Number(u.dex)||0, int: Number(u.int)||0, con: Number(u.con)||0, sen: Number(u.sen)||0 };
      const sortedStats = Object.entries(statsObj).sort((a,b) => b[1] - a[1]);
      
      const archetypeMapTop2 = {
        'agi_str': 'Striker (สายจู่โจมความเร็วสูง)', 'dex_str': 'Blademaster (สายปฏิบัติการเฉียบขาด)', 'int_str': 'Battlemage (สายผสานแผน)', 'con_str': 'Juggernaut (สายลุยงานหนัก)', 'sen_str': 'Warlord (สายผู้นำบุกเบิก)',
        'agi_dex': 'Phantom (สายไร้ร่องรอย)', 'agi_int': 'Tactical Runner (สายรุกฉับไว)', 'agi_con': 'Resilient Scout (สายสำรวจด่วน)', 'agi_sen': 'Pathfinder (สายประสานงาน)', 'dex_int': 'System Artisan (สายสร้างสรรค์)',
        'con_dex': 'Iron Sentinel (สายคุมมาตรฐาน)', 'dex_sen': 'Sniper (สายจับเป้าหมาย)', 'con_int': 'Fortress Architect (สายวางโครงสร้าง)', 'int_sen': 'Supreme Tactician (สายเจรจา)', 'con_sen': 'Unbreakable (สายรับแรงกดดัน)'
      };

      const archetypeMapTop3 = {
        'agi_con_dex': 'Swift Guardian', 'agi_con_int': 'Blitz Strategist', 'agi_con_sen': 'Vanguard Tracker', 'agi_con_str': 'Frontline Berserker', 'agi_dex_int': 'Digital Ronin', 'agi_dex_sen': 'Mirage Walker',
        'agi_dex_str': 'Swift Duelist', 'agi_int_sen': 'Spymaster', 'agi_int_str': 'Arcane Vanguard', 'agi_sen_str': 'Vanguard Warlord', 'con_dex_int': 'Foundation Maestro', 'con_dex_sen': 'Titan Warden',
        'con_dex_str': 'Juggernaut Craftsman', 'con_int_sen': 'Grand Pillar', 'con_int_str': 'Citadel Builder', 'con_sen_str': 'Indomitable Chief', 'dex_int_sen': 'Visionary Consultant', 'dex_int_str': 'Grandmaster',
        'dex_sen_str': 'Sharpshooter', 'int_sen_str': 'Mastermind Overseer'
      };

      const validStats = sortedStats.filter(s => s[1] >= 5);
      const maxStat = validStats.length > 0 ? validStats[0][1] : 0;
      
      let prefix = '';
      if (maxStat >= 9) prefix = 'Elite ';
      else if (maxStat >= 7) prefix = 'Veteran ';
      else if (maxStat >= 5) prefix = 'Adept ';
      else prefix = 'Trainee ';

      const getDesc = (k) => {
         const defaults = { str: 'พลังดันงาน', agi: 'ความไว', dex: 'คุณภาพ', int: 'วิเคราะห์', con: 'ทนทาน', sen: 'ไหวพริบ' };
         return defaults[k];
      };

      let mainStyle = ''; let styleDesc = '';
      if (validStats.length < 2) {
         mainStyle = prefix + 'Novice'; styleDesc = 'ทักษะยังอยู่ในระดับเริ่มต้น แนะนำให้พัฒนาศักยภาพเพิ่มเติม';
      } else if (validStats.length === 6 && validStats[0][1] === validStats[5][1]) {
         mainStyle = prefix + 'All-Rounder'; styleDesc = 'สมดุลในทุกมิติ ปรับตัวได้กับทุกสถานการณ์';
      } else {
         let useTop3 = false;
         if (validStats.length >= 3 && (validStats.length === 3 || validStats[2][1] > validStats[3][1])) useTop3 = true;
         if (useTop3) {
            const topKeys = [validStats[0][0], validStats[1][0], validStats[2][0]];
            mainStyle = prefix + (archetypeMapTop3[topKeys.sort().join('_')] || 'Hybrid');
            styleDesc = `โดดเด่นด้าน ${getDesc(topKeys[0])}, ${getDesc(topKeys[1])} และ ${getDesc(topKeys[2])}`;
         } else {
            const topKeys = [validStats[0][0], validStats[1][0]];
            mainStyle = prefix + (archetypeMapTop2[topKeys.sort().join('_')] || 'Specialist');
            styleDesc = `ความเชี่ยวชาญด้าน ${getDesc(topKeys[0])} ผสานกับ ${getDesc(topKeys[1])}`;
         }
      }

      // Compute Outer Layer simple stats for presentation
      const outers = [
        { k: 'cx', n: 'Customer Exp.', val: Math.round((statsObj.con + statsObj.sen)/2) },
        { k: 'tech', n: 'Tech. Expertise', val: Math.round((statsObj.int + statsObj.dex)/2) },
        { k: 'sla', n: 'Ops & SLA', val: Math.round((statsObj.agi + statsObj.dex)/2) },
        { k: 'crisis', n: 'Crisis Resolv.', val: Math.round((statsObj.str + statsObj.con)/2) },
        { k: 'resource', n: 'Resource Ctrl.', val: Math.round((statsObj.str + statsObj.sen)/2) },
        { k: 'innovation', n: 'Innovation', val: Math.round((statsObj.int + statsObj.sen)/2) }
      ].map(o => ({...o, finalVal: (u[o.k] !== null && u[o.k] !== undefined) ? u[o.k] : o.val}));

      return (
        <div className="flex-1 w-full bg-[#08080c] relative overflow-hidden flex flex-col md:flex-row shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
           {/* Background cinematic effects */}
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#08080c] to-[#08080c] pointer-events-none"></div>
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#bca374] rounded-full blur-[150px] opacity-10 pointer-events-none mix-blend-screen translate-x-1/3 -translate-y-1/4"></div>

           {/* LEFT PANEL: Data Presentation */}
           <div className="w-full md:w-1/2 p-8 md:p-12 z-10 flex flex-col justify-center border-r border-white/10 relative">
              <div className="absolute top-4 right-4 z-20">
                <button type="button" onClick={() => setTeamEditMode(true)} className="bg-white/10 hover:bg-white/20 text-white/50 hover:text-white p-2 rounded-full backdrop-blur-sm transition">
                  <Icon name="settings" size={20} />
                </button>
              </div>

              <div className="animate-in fade-in slide-in-from-left-8 duration-700">
                <h5 className="text-[#bca374] text-sm md:text-base font-bold tracking-[0.2em] uppercase mb-2 drop-shadow-md">
                   {role?.name || 'ไม่ระบุสายอาชีพ'}
                </h5>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 drop-shadow-lg" style={{textShadow: '0 4px 20px rgba(188,163,116,0.3)'}}>
                   {mainStyle}
                </h1>
                <p className="text-lg text-slate-300 font-light mb-8 max-w-md border-l-4 border-[#bca374] pl-4">
                   "{styleDesc}"
                </p>
                
                {/* Stats Bars */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 mb-10">
                   {[
                     { l: 'STR', val: statsObj.str, c: 'from-rose-600 to-rose-400' },
                     { l: 'AGI', val: statsObj.agi, c: 'from-emerald-600 to-emerald-400' },
                     { l: 'DEX', val: statsObj.dex, c: 'from-amber-600 to-amber-400' },
                     { l: 'INT', val: statsObj.int, c: 'from-blue-600 to-blue-400' },
                     { l: 'CON', val: statsObj.con, c: 'from-orange-600 to-orange-400' },
                     { l: 'SEN', val: statsObj.sen, c: 'from-purple-600 to-purple-400' }
                   ].map(s => (
                     <div key={s.l} className="flex flex-col">
                        <div className="flex justify-between items-end mb-1.5">
                           <span className="text-xs font-bold text-slate-400 tracking-wider">{s.l}</span>
                           <span className="text-sm font-bold text-white">{s.val}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                           <div className={`h-full bg-gradient-to-r ${s.c} rounded-full`} style={{width: `${(s.val/10)*100}%`, boxShadow: '0 0 10px currentColor'}}></div>
                        </div>
                     </div>
                   ))}
                </div>

                {/* Outer Layers */}
                <div className="flex flex-wrap gap-2">
                   {outers.map(o => (
                      <div key={o.k} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex flex-col backdrop-blur-md">
                         <span className="text-[10px] text-slate-400 uppercase tracking-wider">{o.n}</span>
                         <span className="text-white font-bold text-sm">{o.finalVal} <span className="text-slate-500 text-[10px] font-normal">/10</span></span>
                      </div>
                   ))}
                </div>
              </div>
           </div>

           {/* RIGHT PANEL: Avatar Presentation */}
           <div className="w-full md:w-1/2 min-h-[400px] flex items-center justify-center relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen pointer-events-none"></div>
              
              <div className="relative z-10 w-full h-full flex items-center justify-center p-8 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 fill-mode-both">
                {u.image ? (
                   <img src={u.image} className="max-w-full max-h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] transform scale-110" style={{maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'}} alt="Character" />
                ) : (
                   <div className="w-64 h-64 bg-slate-800/50 rounded-full flex items-center justify-center border border-white/5 backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                     <Icon name="user" size={64} className="text-slate-600" />
                   </div>
                )}
              </div>
              
              {/* Gradient overlay at bottom to blend character */}
              <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#08080c] to-transparent pointer-events-none z-20"></div>
              
              {/* Giant Name Watermark */}
              <div className="absolute bottom-10 -right-10 text-[150px] font-black text-white/5 whitespace-nowrap pointer-events-none z-0 transform -rotate-12 select-none tracking-tighter mix-blend-overlay">
                 {u.name.split(' ')[0]}
              </div>
           </div>
        </div>
      );
    };
"""

# Insert renderCinematicView right before "const renderAnalysis = () => {"
code = code.replace("const renderAnalysis = () => {", cinematic_view_code + "\n    const renderAnalysis = () => {")

# Now modify the return statement of rTeam to handle teamEditMode
old_return = """        <div className="flex-1 bg-white border rounded-xl shadow-sm flex flex-col h-auto md:h-full overflow-hidden">
          {(!selTeam && !teamForm.name && !teamForm.id) ? ("""

new_return = """        <div className="flex-1 bg-white border rounded-xl shadow-sm flex flex-col h-auto md:h-full overflow-hidden">
          {(!selTeam && !teamForm.name && !teamForm.id) ? ("""

# Replace the conditional render inside the flex-1 container.
# Currently it is:
# {(!selTeam && !teamForm.name && !teamForm.id) ? ( ... empty state ... ) : ( ... edit form ... )}
# We want:
# {(!selTeam && !teamForm.name && !teamForm.id) ? ( ... empty state ... ) : ( (!teamEditMode && teamForm.id) ? renderCinematicView() : ( ... edit form with cancel button ... ) )}

target_block = """          {(!selTeam && !teamForm.name && !teamForm.id) ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
               <Icon name="users" size={64} className="mb-4 opacity-50" />
               <p className="font-bold">เลือกทีมงานจากเมนูด้านซ้าย</p>
               <p className="text-xs mt-1">หรือกด "+ เพิ่ม" เพื่อสร้างโปรไฟล์ใหม่</p>
             </div>
          ) : ("""

replacement_block = """          {(!selTeam && !teamForm.name && !teamForm.id) ? (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
               <Icon name="users" size={64} className="mb-4 opacity-50" />
               <p className="font-bold">เลือกทีมงานจากเมนูด้านซ้าย</p>
               <p className="text-xs mt-1">หรือกด "+ เพิ่ม" เพื่อสร้างโปรไฟล์ใหม่</p>
             </div>
          ) : ( (!teamEditMode && teamForm.id && !selTeam?.isNew) ? renderCinematicView() : ("""

code = code.replace(target_block, replacement_block)

# Add a "Cancel Edit" button in the edit form if teamForm.id exists
cancel_btn_target = """<button type="button" onClick={saveTeam} className="flex-1 bg-[#0f2e4a] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-[#1a3f63] flex justify-center items-center"><Icon name="save" size={16} className="mr-2"/> บันทึกข้อมูล</button>"""
cancel_btn_replace = """<button type="button" onClick={saveTeam} className="flex-1 bg-[#0f2e4a] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-[#1a3f63] flex justify-center items-center"><Icon name="save" size={16} className="mr-2"/> บันทึกข้อมูล</button>
                        {teamForm.id && <button type="button" onClick={()=>setTeamEditMode(false)} className="bg-slate-100 text-slate-600 px-4 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>}"""
code = code.replace(cancel_btn_target, cancel_btn_replace)

# Close the parens for the ternary operator at the end of rTeam
end_target = """                </div>
             </div>
          )}
        </div>
      </div>
    );
  };"""
end_replace = """                </div>
             </div>
          ))}
        </div>
      </div>
    );
  };"""
code = code.replace(end_target, end_replace)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Modification complete.")
