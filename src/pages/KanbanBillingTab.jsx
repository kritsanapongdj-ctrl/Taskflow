import React from 'react';

export default function KanbanBillingTab({
  tasks = [],
  gFilt,
  groupTasks,
  getStdProj,
  checkStaffMatch,
  onOpenBillingModal,
  Icon
}) {
  const cT = tasks.filter(
    (t) =>
      t.status?.startsWith('จบงาน') &&
      (gFilt.area === 'ทั้งหมด' || t.area === gFilt.area) &&
      (gFilt.project === 'ทั้งหมด' || getStdProj(t.project) === gFilt.project) &&
      checkStaffMatch(t.project, gFilt.staffName) &&
      (!gFilt.requester || gFilt.requester === 'ทั้งหมด' || t.requester === gFilt.requester)
  );

  const ubGrp = groupTasks(cT.filter((t) => t.billingStatus !== 'ส่งเบิกแล้ว'));
  const biGrp = groupTasks(
    cT.filter(
      (t) =>
        t.billingStatus === 'ส่งเบิกแล้ว' &&
        (t.billingMonth === gFilt.month ||
          (gFilt.month === '2026-06' && (!t.billingMonth || t.billingMonth < '2026-07')))
    )
  );

  return (
    <div className="space-y-4 animate-in">
      {/* Terminal Window Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0B1B3D] border-2 border-[#B89246] shadow-[3px_3px_0px_#B89246] text-white">
        <h2 className="text-sm sm:text-base font-serif font-bold text-[#B89246] tracking-wider uppercase flex items-center gap-2">
          <span className="w-2.5 h-5 bg-[#B89246] inline-block shadow-[0_0_8px_#B89246]" />
          <Icon name="fileText" size={18} className="text-[#00F0FF]" />
          <span>KANBAN_BILLING // บอร์ดส่งเบิก</span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-tech text-xs text-[#00F0FF] bg-[#102A43] px-2 py-0.5 border border-[#00F0FF]/40 font-bold">
            [ CYCLE // {gFilt.month} ]
          </span>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="flex flex-col md:flex-row gap-4 h-[72vh]">
        {/* Column 1: Pending Billing */}
        <div className="flex-1 bg-[#F0F4F8] border-2 border-[#0B1B3D] shadow-[3px_3px_0px_#0B1B3D] p-3 flex flex-col">
          <div className="bg-[#0B1B3D] text-[#FFEA00] border-2 border-[#B89246] p-2.5 mb-3 flex justify-between items-center shadow-[1px_1px_0px_#B89246]">
            <span className="font-serif font-bold text-xs tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#FFEA00] inline-block" />
              01 // รอส่งเบิก & ค้างเบิก
            </span>
            <span className="bg-[#102A43] text-[#FFEA00] border border-[#FFEA00]/50 px-2 py-0.2 text-[10px] font-tech font-bold">
              [ {ubGrp.length} ITEMS ]
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pr-0.5">
            {ubGrp.map((g) => (
              <div
                key={g.id}
                onClick={() => onOpenBillingModal(g, 'รอส่งเบิก')}
                className="bg-white p-3.5 border-2 border-[#0B1B3D] shadow-[2px_2px_0px_#0B1B3D] cursor-pointer hover:border-[#B89246] hover:shadow-[3px_3px_0px_#B89246] active:translate-x-0.5 active:translate-y-0.5 transition-all relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-[#0B1B3D] text-[#00F0FF] font-tech font-bold px-2 py-0.5 text-[10px] border border-[#00F0FF]/40 shadow-[1px_1px_0px_#00F0FF]">
                    {g.isWO && g.woNo ? `WO: ${g.woNo}` : `JOB: ${g.tasks[0]?.id}`}
                  </span>
                  <span className="text-[10px] font-tech font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                    {g.tasks.length} TASKS
                  </span>
                </div>
                <div className="font-serif font-bold text-[#0B1B3D] text-sm mb-2">
                  {getStdProj(g.project)}
                </div>
                <div className="space-y-1.5">
                  {g.tasks.map((t, i) => (
                    <div
                      key={t.id}
                      className="text-[11px] text-slate-800 bg-[#F0F4F8] p-1.5 border border-[#0B1B3D]/15 line-clamp-1 font-sans"
                    >
                      <span className="text-[#B89246] font-tech font-bold mr-1">#{i + 1}</span>
                      {t.details}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {ubGrp.length === 0 && (
              <div className="p-8 text-center text-slate-400 font-tech font-bold text-xs">
                [ NO_PENDING_ITEMS // ไม่มีรายการรอส่งเบิก ]
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Submitted Billing */}
        <div className="flex-1 bg-[#F0F4F8] border-2 border-[#00F0FF]/60 shadow-[3px_3px_0px_#00F0FF]/30 p-3 flex flex-col">
          <div className="bg-[#060E21] text-[#00F0FF] border-2 border-[#00F0FF]/80 p-2.5 mb-3 flex justify-between items-center shadow-[1px_1px_0px_#00F0FF]">
            <span className="font-serif font-bold text-xs tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#00F0FF] inline-block shadow-[0_0_6px_#00F0FF]" />
              02 // ส่งเบิกแล้ว (SUBMITTED)
            </span>
            <span className="bg-[#102A43] text-[#00F0FF] border border-[#00F0FF]/50 px-2 py-0.2 text-[10px] font-tech font-bold">
              [ {biGrp.length} ITEMS ]
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pr-0.5">
            {biGrp.map((g) => (
              <div
                key={g.id}
                onClick={() => onOpenBillingModal(g, 'ส่งเบิกแล้ว')}
                className="bg-white p-3.5 border-2 border-[#00F0FF]/50 shadow-[2px_2px_0px_#00F0FF]/25 cursor-pointer hover:border-[#00F0FF] hover:shadow-[3px_3px_0px_#00F0FF] active:translate-x-0.5 active:translate-y-0.5 transition-all relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-[#060E21] text-[#00F0FF] font-tech font-bold px-2 py-0.5 text-[10px] border border-[#00F0FF]/60 shadow-[1px_1px_0px_#00F0FF]">
                    {g.isWO && g.woNo ? `WO: ${g.woNo}` : `JOB: ${g.tasks[0]?.id}`}
                  </span>
                  <span className="text-[10px] font-tech font-bold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 border border-cyan-200">
                    {g.tasks.length} TASKS
                  </span>
                </div>
                <div className="font-serif font-bold text-[#0B1B3D] text-sm mb-2">
                  {getStdProj(g.project)}
                </div>
                <div className="space-y-1.5 opacity-80">
                  {g.tasks.map((t, i) => (
                    <div
                      key={t.id}
                      className="text-[11px] text-slate-700 bg-cyan-50/30 p-1.5 border border-[#00F0FF]/20 line-clamp-1 font-sans"
                    >
                      <span className="text-cyan-700 font-tech font-bold mr-1">#{i + 1}</span>
                      {t.details}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {biGrp.length === 0 && (
              <div className="p-8 text-center text-slate-400 font-tech font-bold text-xs">
                [ NO_SUBMITTED_ITEMS // ยังไม่มีรายการส่งเบิกในรอบนี้ ]
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
