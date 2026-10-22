import React from 'react';

export default function MonthlyCalendarTab({
  tasks = [],
  gFilt,
  getTStr,
  getStdProj,
  checkStaffMatch,
  pYMD,
  onOpenCalendarModal,
  Icon
}) {
  const tS = getTStr();
  if (!gFilt.month) return null;

  const sM = new Date(gFilt.month + '-01');
  const y = sM.getFullYear();
  const m = sM.getMonth();
  const dM = new Date(y, m + 1, 0).getDate();
  const fD = new Date(y, m, 1).getDay();
  const ds = Array(fD)
    .fill(null)
    .concat(Array.from({ length: dM }, (_, i) => new Date(y, m, i + 1)));

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 animate-in space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#A8996E]/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-3.5 bg-[#A8996E] inline-block rounded-xs" />
            <span className="font-serif tracking-[0.16em] text-[10.5px] font-semibold text-[#A8996E] uppercase">
              MONTHLY DISPATCH SCHEDULE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#003C71] tracking-tight flex items-baseline gap-2">
            <span>ปฏิทินงานประจำเดือน</span>
            <span className="font-serif text-sm font-normal text-[#A8996E]">
              ({gFilt.month})
            </span>
          </h1>
        </div>
        <span className="text-xs font-semibold text-[#003C71] bg-white border border-[#A8996E]/30 px-3 py-1 rounded-full shadow-2xs">
          รอบเดือน {gFilt.month}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'].map((d) => (
          <div key={d} className="bg-slate-50 py-2.5 text-center text-xs font-semibold text-slate-600">
            {d}
          </div>
        ))}
        {ds.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="bg-slate-50/50 min-h-[90px]" />;
          const dS = pYMD(d);
          const iT = dS === tS;
          const dTs = tasks.filter(
            (t) =>
              t.status !== 'ยกเลิก' &&
              (gFilt.area === 'ทั้งหมด' || t.area === gFilt.area) &&
              (gFilt.project === 'ทั้งหมด' || getStdProj(t.project) === gFilt.project) &&
              checkStaffMatch(t.project, gFilt.staffName) &&
              (!gFilt.requester || gFilt.requester === 'ทั้งหมด' || t.requester === gFilt.requester) &&
              dS >= (t.startDate || '') &&
              dS <=
                (t.status?.startsWith('จบงาน')
                  ? t.completedDate || t.endDate
                  : (t.endDate || '') > tS
                  ? t.endDate
                  : tS)
          );

          return (
            <div
              key={dS}
              onClick={() => dTs.length > 0 && onOpenCalendarModal(dS, dTs)}
              className={`min-h-[90px] p-2 transition-colors cursor-pointer relative ${
                iT
                  ? 'bg-rose-50/40 ring-1 ring-inset ring-[#7A1C28]/40'
                  : 'bg-white hover:bg-slate-50/80'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                {iT ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#7A1C28] text-white">
                    วันนี้
                  </span>
                ) : <span />}
                <div
                  className={`text-right text-xs font-semibold ${
                    iT ? 'text-[#7A1C28] font-bold' : 'text-slate-400'
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
              <div className="space-y-1">
                {dTs.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${
                      t.status?.startsWith('จบงาน')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'bg-slate-100 text-[#0F2E4A] border border-slate-200'
                    }`}
                    title={t.details}
                  >
                    {getStdProj(t.project)}
                  </div>
                ))}
                {dTs.length > 3 && (
                  <div className="text-[10px] text-center text-slate-500 font-semibold bg-slate-50 rounded py-0.5 border border-slate-200">
                    + {dTs.length - 3} งาน
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
