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
    <div className="bg-white border-2 border-[#0B1B3D] shadow-[4px_4px_0px_#0B1B3D] p-4 animate-in space-y-4">
      {/* Terminal Window Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0B1B3D] border-2 border-[#B89246] shadow-[2px_2px_0px_#B89246] text-white">
        <h2 className="text-sm sm:text-base font-serif font-bold text-[#B89246] tracking-wider uppercase flex items-center gap-2">
          <span className="w-2.5 h-5 bg-[#B89246] inline-block shadow-[0_0_8px_#B89246]" />
          <Icon name="calendar" size={18} className="text-[#00F0FF]" />
          <span>CALENDAR_MATRIX // ปฏิทินงานประจำเดือน</span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-tech text-xs text-[#00F0FF] bg-[#102A43] px-2 py-0.5 border border-[#00F0FF]/40 font-bold">
            [ MONTH // {gFilt.month} ]
          </span>
        </div>
      </div>

      {/* Cyber Grid Calendar */}
      <div className="grid grid-cols-7 gap-px bg-[#0B1B3D] border-2 border-[#0B1B3D] shadow-[2px_2px_0px_#0B1B3D] overflow-hidden">
        {['อา (SUN)', 'จ (MON)', 'อ (TUE)', 'พ (WED)', 'พฤ (THU)', 'ศ (FRI)', 'ส (SAT)'].map((d) => (
          <div key={d} className="bg-[#0B1B3D] py-2 text-center text-[11px] font-tech font-bold text-[#B89246] border-b border-[#102A43]">
            {d}
          </div>
        ))}
        {ds.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="bg-slate-100/60 min-h-[90px]" />;
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
              className={`min-h-[90px] p-1.5 transition-colors cursor-pointer relative ${
                iT
                  ? 'bg-cyan-50/60 border-2 border-[#00F0FF]'
                  : 'bg-white hover:bg-amber-50/30'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                {iT ? (
                  <span className="text-[9px] font-tech font-bold px-1 py-0.2 bg-[#00F0FF] text-[#0B1B3D]">
                    TODAY
                  </span>
                ) : <span />}
                <div
                  className={`text-right text-[11px] font-tech font-bold ${
                    iT ? 'text-[#0B1B3D]' : 'text-slate-500'
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
              <div className="space-y-1">
                {dTs.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className={`text-[9px] px-1 py-0.5 truncate font-tech font-bold ${
                      t.status?.startsWith('จบงาน')
                        ? 'bg-[#060E21] text-[#00F0FF] border border-[#00F0FF]/40 shadow-[1px_1px_0px_#00F0FF]'
                        : 'bg-[#102A43] text-[#FFEA00] border border-[#FFEA00]/40 shadow-[1px_1px_0px_#FFEA00]'
                    }`}
                    title={t.details}
                  >
                    {getStdProj(t.project)}
                  </div>
                ))}
                {dTs.length > 3 && (
                  <div className="text-[9px] text-center text-[#0B1B3D] font-tech font-bold bg-[#F0F4F8] border border-[#0B1B3D]/30 py-0.2">
                    + {dTs.length - 3} MORE
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
