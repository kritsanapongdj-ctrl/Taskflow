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
    <div className="bg-white rounded-xl shadow-sm border p-4 animate-in">
      <h2 className="text-xl font-bold text-[#0f2e4a] mb-4 flex items-center">
        <Icon name="calendar" size={20} className="mr-2 text-[#bca374]" /> ปฏิทินเดือน {gFilt.month}
      </h2>
      <div className="grid grid-cols-7 gap-px bg-gray-200 border rounded-lg overflow-hidden">
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => (
          <div key={d} className="bg-gray-50 py-2 text-center text-xs font-bold text-gray-500">
            {d}
          </div>
        ))}
        {ds.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="bg-white/50 min-h-[80px]" />;
          const dS = pYMD(d);
          const iT = dS === tS;
          const dTs = tasks.filter(
            (t) =>
              t.status !== 'ยกเลิก' &&
              (gFilt.area === 'ทั้งหมด' || t.area === gFilt.area) &&
              (gFilt.project === 'ทั้งหมด' || getStdProj(t.project) === gFilt.project) &&
              checkStaffMatch(t.project, gFilt.staffName) &&
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
              className={`bg-white min-h-[80px] p-1 border-t cursor-pointer hover:bg-slate-50 transition-colors ${
                iT ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-300' : ''
              }`}
            >
              <div
                className={`text-right text-[10px] mb-1 ${
                  iT ? 'font-black text-blue-600' : 'text-gray-400'
                }`}
              >
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {dTs.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className={`text-[8px] px-1 rounded truncate font-bold ${
                      t.status?.startsWith('จบงาน')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {getStdProj(t.project)}
                  </div>
                ))}
                {dTs.length > 3 && (
                  <div className="text-[8px] text-center text-gray-400 font-bold">
                    + {dTs.length - 3}
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
