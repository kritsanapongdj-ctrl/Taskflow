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
      checkStaffMatch(t.project, gFilt.staffName)
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#0f2e4a]">ส่งเบิก (เดือน {gFilt.month})</h2>
      </div>
      <div className="flex flex-col md:flex-row gap-4 h-[70vh]">
        <div className="flex-1 bg-gray-100 rounded-xl p-3 flex flex-col border">
          <h3 className="font-bold text-gray-700 mb-3 border-b-2 border-gray-300 pb-2 flex justify-between">
            <span>รอส่งเบิก / ค้างเบิก</span>
            <span className="bg-gray-200 px-2 rounded-full text-xs">{ubGrp.length} กลุ่ม</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar">
            {ubGrp.map((g) => (
              <div
                key={g.id}
                onClick={() => onOpenBillingModal(g, 'รอส่งเบิก')}
                className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px]">
                    {g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0]?.id}`}
                  </span>
                </div>
                <div className="font-bold text-[#0f2e4a] text-sm mb-1">
                  {getStdProj(g.project)}{' '}
                  <span className="text-xs text-gray-500 font-normal">
                    ({g.tasks.length} งาน)
                  </span>
                </div>
                <div className="space-y-1.5 mt-2">
                  {g.tasks.map((t, i) => (
                    <div
                      key={t.id}
                      className="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 line-clamp-1"
                    >
                      <span className="text-gray-400 font-bold mr-1">#{i + 1}</span>
                      {t.details}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-green-50 rounded-xl p-3 flex flex-col border border-green-100">
          <h3 className="font-bold text-green-700 mb-3 border-b-2 border-green-200 pb-2 flex justify-between">
            <span>ส่งเบิกแล้ว (รอบ {gFilt.month})</span>
            <span className="bg-green-200 px-2 rounded-full text-xs">{biGrp.length} กลุ่ม</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar">
            {biGrp.map((g) => (
              <div
                key={g.id}
                onClick={() => onOpenBillingModal(g, 'ส่งเบิกแล้ว')}
                className="bg-white p-3 rounded-lg shadow-sm border border-green-200 cursor-pointer hover:border-green-400 hover:shadow-md transition-all relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded text-[10px]">
                    {g.isWO && g.woNo ? `ใบงาน: ${g.woNo}` : `JOB: ${g.tasks[0]?.id}`}
                  </span>
                </div>
                <div className="font-bold text-green-800 text-sm mb-1">
                  {getStdProj(g.project)}{' '}
                  <span className="text-xs text-green-600/70 font-normal">
                    ({g.tasks.length} งาน)
                  </span>
                </div>
                <div className="space-y-1.5 mt-2 opacity-70">
                  {g.tasks.map((t, i) => (
                    <div
                      key={t.id}
                      className="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 line-clamp-1"
                    >
                      <span className="text-gray-400 font-bold mr-1">#{i + 1}</span>
                      {t.details}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
