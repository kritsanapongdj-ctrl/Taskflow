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

  const getGroupCost = (g) => {
    if (g.costAmount && Number(g.costAmount) > 0) return Number(g.costAmount);
    const tWithCost = g.tasks?.find(t => t.costAmount && Number(t.costAmount) > 0);
    return tWithCost ? Number(tWithCost.costAmount) : 0;
  };

  const ubTotalCost = ubGrp.reduce((acc, g) => acc + getGroupCost(g), 0);
  const biTotalCost = biGrp.reduce((acc, g) => acc + getGroupCost(g), 0);
  const grandTotalCost = ubTotalCost + biTotalCost;

  return (
    <div className="space-y-6 animate-in">
      {/* Header bar with Financial KPI Badges */}
      <div className="flex flex-wrap justify-between items-end pb-3 border-b border-[#A8996E]/20 gap-4">
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

        {/* Dynamic Financial Summary Cards */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white border border-slate-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div>
              <div className="text-[10px] text-slate-500 font-medium">ส่งเบิกแล้ว ({biGrp.length} ใบงาน)</div>
              <div className="text-sm font-bold text-emerald-700">
                ฿{biTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 px-3.5 py-1.5 rounded-xl shadow-2xs flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#7A1C28]" />
            <div>
              <div className="text-[10px] text-slate-500 font-medium">รอส่งเบิก ({ubGrp.length} ใบงาน)</div>
              <div className="text-sm font-bold text-[#7A1C28]">
                ฿{ubTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#003C71] to-[#0F2E4A] text-white px-4 py-1.5 rounded-xl shadow-xs">
            <div className="text-[10px] text-slate-200 font-medium">ยอดใบงานในมือ ({ubGrp.length + biGrp.length} ใบงาน)</div>
            <div className="text-sm font-black text-amber-300">
              ฿{grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
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
              {ubGrp.length} ใบงาน • ฿{ubTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 hide-scrollbar">
            {ubGrp.map((g) => {
              const cost = getGroupCost(g);
              return (
                <div
                  key={g.id}
                  onClick={() => onOpenBillingModal(g, 'รอส่งเบิก')}
                  className="bg-white p-4 rounded-xl shadow-card border border-slate-200/90 cursor-pointer hover:border-[#7A1C28]/40 hover:shadow-card-hover transition-all relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-100 text-[#0F2E4A] font-semibold px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0]?.id}`}
                      </span>
                      {cost > 0 ? (
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                          ฿{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-400 font-medium px-1.5 py-0.5 rounded text-[10px]">
                          รอ Sync ยอด
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {g.tasks.length} งาน
                    </span>
                  </div>
                  <div className="font-bold text-[#0F2E4A] text-sm mb-1">
                    {getStdProj(g.project)}
                  </div>
                  {g.costAccounts && g.costAccounts.length > 0 && (
                    <div className="text-[10px] text-amber-800 bg-amber-50/70 border border-amber-200/60 px-2 py-0.5 rounded inline-block mb-2">
                      รหัสบัญชี: {g.costAccounts.join(', ')}
                    </div>
                  )}
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
              );
            })}
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
              {biGrp.length} ใบงาน • ฿{biTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 hide-scrollbar">
            {biGrp.map((g) => {
              const cost = getGroupCost(g);
              return (
                <div
                  key={g.id}
                  onClick={() => onOpenBillingModal(g, 'ส่งเบิกแล้ว')}
                  className="bg-white p-4 rounded-xl shadow-card border border-slate-200/90 cursor-pointer hover:border-emerald-400/50 hover:shadow-card-hover transition-all relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                        {g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0]?.id}`}
                      </span>
                      {cost > 0 ? (
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                          ฿{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-400 font-medium px-1.5 py-0.5 rounded text-[10px]">
                          รอ Sync ยอด
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {g.tasks.length} งาน
                    </span>
                  </div>
                  <div className="font-bold text-[#0F2E4A] text-sm mb-1">
                    {getStdProj(g.project)}
                  </div>
                  {g.costAccounts && g.costAccounts.length > 0 && (
                    <div className="text-[10px] text-amber-800 bg-amber-50/70 border border-amber-200/60 px-2 py-0.5 rounded inline-block mb-2">
                      รหัสบัญชี: {g.costAccounts.join(', ')}
                    </div>
                  )}
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
              );
            })}
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
