import React from 'react';
import SimplePieChart from '../components/charts/SimplePieChart';

export default function DashboardTab({
  tasks = [],
  gFilt,
  THEME,
  getTStr,
  getStdProj,
  checkStaffMatch,
  chkOvdTimeAware,
  onOpenOverdueModal,
  Icon
}) {
  const tS = getTStr();
  const aT = tasks.filter(
    (t) =>
      t.status !== 'ยกเลิก' &&
      (gFilt.area === 'ทั้งหมด' || t.area === gFilt.area) &&
      (gFilt.project === 'ทั้งหมด' || getStdProj(t.project) === gFilt.project) &&
      checkStaffMatch(t.project, gFilt.staffName)
  );

  const dy = aT.filter(
    (t) =>
      (tS >= t.startDate && tS <= t.endDate) ||
      (!t.status?.startsWith('จบงาน') && chkOvdTimeAware(t, tS))
  );

  const mt = aT.filter((t) => t.startDate && t.startDate.startsWith(gFilt.month));
  const ov = mt.filter(
    (t) =>
      t.overdueStatus === 'เกินกำหนด' ||
      t.overdueStatus === 'ออกใบงานช้า' ||
      chkOvdTimeAware(t, tS)
  );

  const getChartData = (arr) => [
    {
      name: 'จบงาน(ในกำหนด)',
      value: arr.filter(
        (t) =>
          t.status?.startsWith('จบงาน') &&
          !(t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า') &&
          !chkOvdTimeAware(t, getTStr())
      ).length,
      color: THEME.success
    },
    {
      name: 'ดำเนินการ',
      value: arr.filter(
        (t) =>
          !t.status?.startsWith('จบงาน') &&
          !(t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า') &&
          !chkOvdTimeAware(t, getTStr())
      ).length,
      color: THEME.secondary
    },
    {
      name: 'ล่าช้า/เกินกำหนด',
      value: arr.filter(
        (t) =>
          t.overdueStatus === 'เกินกำหนด' ||
          t.overdueStatus === 'ออกใบงานช้า' ||
          chkOvdTimeAware(t, getTStr())
      ).length,
      color: THEME.danger
    }
  ];

  const cards = [
    { l: 'ปริมาณงานรวม', v: mt.length, i: 'listTodo', c: THEME.primary },
    { l: 'งานวันนี้', v: dy.length, i: 'calendar', c: THEME.secondary },
    { l: 'งานล่าช้า/เกินกำหนด', v: ov.length, i: 'alertTriangle', c: THEME.danger, clk: true }
  ];

  return (
    <div className="space-y-6 animate-in">
      <h2 className="text-xl font-bold text-[#0f2e4a] flex items-center">
        <Icon name="layoutDashboard" size={20} className="mr-2" /> ภาพรวม (เดือน {gFilt.month})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((x, i) => (
          <div
            key={i}
            onClick={() => x.clk && onOpenOverdueModal(ov)}
            className={`bg-white p-6 rounded-xl shadow-sm border-l-[6px] flex justify-between items-center transition-all duration-300 ${
              x.clk
                ? 'cursor-pointer hover:shadow-md border-red-500 hover:-translate-y-1'
                : 'border-[#0f2e4a] hover:shadow-md hover:-translate-y-1'
            }`}
          >
            <div>
              <div className="text-xs text-gray-500 font-bold mb-1">
                {x.l}{' '}
                {x.clk && (
                  <span className="text-[9px] text-red-500 bg-red-50 px-1 rounded">(คลิกดู)</span>
                )}
              </div>
              <div
                key={x.v}
                className="text-3xl font-black animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                {x.v}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-full transition-transform duration-500 hover:scale-110 hover:rotate-3">
              <Icon name={x.i} size={24} color={x.c} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <SimplePieChart data={getChartData(dy)} title="สถานะงานวันนี้" />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <SimplePieChart data={getChartData(mt)} title="สถานะเดือนนี้" />
        </div>
      </div>
    </div>
  );
}
