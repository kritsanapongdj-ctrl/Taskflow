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
    {
      l: 'ปริมาณงานรวม',
      v: mt.length,
      i: 'listTodo',
      c: THEME.primary,
      accent: 'border-[#0f2e4a] hover:border-[#bca374]',
      iconBg: 'bg-[#0f2e4a]/10 text-[#0f2e4a]',
      sub: `ภารกิจเดือน ${gFilt.month}`
    },
    {
      l: 'งานวันนี้',
      v: dy.length,
      i: 'calendar',
      c: THEME.secondary,
      accent: 'border-[#bca374]',
      iconBg: 'bg-[#bca374]/15 text-[#bca374]',
      sub: 'กำหนดดำเนินการวันนี้'
    },
    {
      l: 'งานล่าช้า/เกินกำหนด',
      v: ov.length,
      i: 'alertTriangle',
      c: THEME.danger,
      accent: 'border-red-500 hover:border-red-600',
      iconBg: 'bg-red-50 text-red-500',
      clk: true,
      sub: 'ต้องติดตามเร่งด่วน'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <h2 className="text-xl font-bold text-[#0f2e4a] flex items-center tracking-tight">
          <Icon name="layoutDashboard" size={22} className="mr-2 text-[#bca374]" />
          ภาพรวมผลการดำเนินงาน (เดือน {gFilt.month})
        </h2>
        <span className="text-xs text-gray-500 font-medium">
          อัปเดตสถานะแบบเรียลไทม์
        </span>
      </div>

      {/* Metric Cards - Money-Pop Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((x, i) => (
          <div
            key={i}
            onClick={() => x.clk && onOpenOverdueModal(ov)}
            className={`bg-white p-5 rounded-2xl shadow-sm border-l-[6px] border border-gray-100 flex justify-between items-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group ${
              x.accent
            } ${x.clk ? 'cursor-pointer hover:bg-red-50/20 ring-1 ring-transparent hover:ring-red-100' : ''}`}
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                {x.l}
                {x.clk && (
                  <span className="text-[9px] font-bold text-red-600 bg-red-100/70 px-1.5 py-0.5 rounded-full animate-pulse">
                    คลิกดู
                  </span>
                )}
              </div>
              <div
                key={x.v}
                className="text-3xl font-black text-gray-800 tracking-tight transition-transform duration-300 group-hover:scale-105 origin-left"
              >
                {x.v}
              </div>
              <p className="text-[11px] text-gray-400 font-medium">{x.sub}</p>
            </div>
            <div
              className={`p-3.5 rounded-2xl ${x.iconBg} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner`}
            >
              <Icon name={x.i} size={26} color={x.c} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section - Fluid Recharts Donut Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <SimplePieChart data={getChartData(dy)} title="สถานะงานวันนี้ (Today's Tasks)" />
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <SimplePieChart data={getChartData(mt)} title="สถานะงานประจำเดือน (Monthly Status)" />
        </div>
      </div>
    </div>
  );
}
