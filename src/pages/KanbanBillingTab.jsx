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
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-end pb-3 border-b border-[#A8996E]/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-3.5 bg-[#A8996E] inline-block rounded-xs" />
            <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#A8996E] uppercase">
              BILLING &amp; DISPATCH WORKFLOW
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#003C71] tracking-tight flex items-baseline gap-2">
            <span>บอร์ดส่งเบิกงาน</span>
            <span className="font-serif text-sm font-normal text-[#A8996E]">
              (รอบเดือน {gFilt.month})
            </span>
          </h1>
        </div>
        <span className="text-xs font-semibold text-[#003C71] bg-white border border-[#A8996E]/30 px-3 py-1 rounded-full shadow-2xs">
          รวม {ubGrp.length + biGrp.length} ใบงาน
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[74vh]">
        {/* Column 1: รอส่งเบิก */}
        <div className="flex-1 bg-slate-50/70 rounded-2xl p-4.5 flex flex-col border border-slate-200 shadow-xs">
          <div className="font-bold text-[#0F2E4A] mb-3 pb-3 border-b border-slate-200 flex justify-between items-center">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#7A1C28]" />
              รอส่งเบิก / ค้างเบิก
            </span>
            <span className="bg-rose-50 text-[#7A1C28] border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              {ubGrp.length} ใบงาน
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 hide-scrollbar">
            {ubGrp.map((g) => (
              <div
                key={g.id}
                onClick={() => onOpenBillingModal(g, 'รอส่งเบิก')}
                className="bg-white p-4 rounded-xl shadow-card border border-slate-200/90 cursor-pointer hover:border-[#7A1C28]/40 hover:shadow-card-hover transition-all relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-slate-100 text-[#0F2E4A] font-semibold px-2 py-0.5 rounded text-[11px] border border-slate-200">
                    {g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0]?.id}`}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {g.tasks.length} งาน
                  </span>
                </div>
                <div className="font-bold text-[#0F2E4A] text-sm mb-2">
                  {getStdProj(g.project)}
                </div>
                <div className="space-y-1.5">
                  {g.tasks.map((t, i) => (
                    <div
                      key={t.id}
                      className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-1"
                    >
                      <span className="text-slate-400 font-semibold mr-1">#{i + 1}</span>
                      {t.details}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {ubGrp.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                ไม่มีรายการค้างส่งเบิก
              </div>
            )}
          </div>
        </div>

        {/* Column 2: ส่งเบิกแล้ว */}
        <div className="flex-1 bg-slate-50/70 rounded-2xl p-4.5 flex flex-col border border-slate-200 shadow-xs">
          <div className="font-bold text-[#0F2E4A] mb-3 pb-3 border-b border-slate-200 flex justify-between items-center">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ส่งเบิกแล้ว (รอบ {gFilt.month})
            </span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              {biGrp.length} ใบงาน
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 hide-scrollbar">
            {biGrp.map((g) => (
              <div
                key={g.id}
                onClick={() => onOpenBillingModal(g, 'ส่งเบิกแล้ว')}
                className="bg-white p-4 rounded-xl shadow-card border border-slate-200/90 cursor-pointer hover:border-emerald-400/50 hover:shadow-card-hover transition-all relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                    {g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0]?.id}`}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {g.tasks.length} งาน
                  </span>
                </div>
                <div className="font-bold text-[#0F2E4A] text-sm mb-2">
                  {getStdProj(g.project)}
                </div>
                <div className="space-y-1.5 opacity-80">
                  {g.tasks.map((t, i) => (
                    <div
                      key={t.id}
                      className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-1"
                    >
                      <span className="text-emerald-600 font-semibold mr-1">#{i + 1}</span>
                      {t.details}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {biGrp.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                ยังไม่มีรายการส่งเบิกในรอบนี้
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
