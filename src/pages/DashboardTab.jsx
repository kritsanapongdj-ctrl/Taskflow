import React, { useState } from 'react';
import SimplePieChart from '../components/charts/SimplePieChart';

const REQUESTER_PALETTE = {
  'SVC': '#0f2e4a',
  'ICSC': '#bca374',
  'จนท./ผจก.LH': '#10b981',
  'ผู้ควบคุมงาน': '#3b82f6',
  'CEM': '#8b5cf6',
};
const FALLBACK_COLORS = ['#f59e0b', '#ec4899', '#06b6d4', '#64748b', '#84cc16', '#14b8a6'];

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
      checkStaffMatch(t.project, gFilt.staffName) &&
      (!gFilt.requester || gFilt.requester === 'ทั้งหมด' || t.requester === gFilt.requester)
  );

  const dy = aT.filter(
    (t) =>
      (tS >= t.startDate && tS <= t.endDate) ||
      (!t.status?.startsWith('จบงาน') && chkOvdTimeAware(t, tS))
  );

  const [fYear, fMonth] = (gFilt.month || tS.slice(0, 7)).split('-').map(Number);
  const mStart = `${gFilt.month}-01`;
  const lastDay = new Date(fYear, fMonth, 0).getDate();
  const mEnd = `${gFilt.month}-${String(lastDay).padStart(2, '0')}`;

  const mt = aT.filter((t) => {
    if (t.startDate && t.startDate.startsWith(gFilt.month)) return true;
    if (t.endDate && t.endDate.startsWith(gFilt.month)) return true;
    const s = t.startDate || t.endDate;
    const e = t.endDate || t.startDate;
    if (!s || !e) return false;
    return s <= mEnd && e >= mStart;
  });

  const isOverdue = (t) =>
    t.overdueStatus === 'เกินกำหนด' ||
    t.overdueStatus === 'ออกใบงานช้า' ||
    chkOvdTimeAware(t, tS);

  const isCurrentMonth = tS.startsWith(gFilt.month);
  const ovMap = new Map();
  mt.filter(isOverdue).forEach((t) => ovMap.set(t.id, t));
  if (isCurrentMonth) {
    dy.filter(isOverdue).forEach((t) => ovMap.set(t.id, t));
  }
  const ov = Array.from(ovMap.values());

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

  const [chartTab, setChartTab] = useState('all');

  const getRequesterChartData = (arr) => {
    const counts = {};
    arr.forEach((t) => {
      const req = (t.requester || 'ไม่ระบุผู้แจ้ง').trim();
      counts[req] = (counts[req] || 0) + 1;
    });

    const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sortedEntries.map(([name, value], idx) => ({
      name,
      value,
      color: REQUESTER_PALETTE[name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
    }));
  };

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

      {/* Chart Section Header with View Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-6 bg-[#0f2e4a] rounded-full" />
          <h3 className="text-base font-bold text-[#0f2e4a]">
            การวิเคราะห์กราฟข้อมูล (Data Analytics)
          </h3>
        </div>
        <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600 self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setChartTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              chartTab === 'all' ? 'bg-white text-[#0f2e4a] shadow-xs' : 'hover:text-[#0f2e4a]'
            }`}
          >
            แสดงทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setChartTab('status')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              chartTab === 'status' ? 'bg-white text-[#0f2e4a] shadow-xs' : 'hover:text-[#0f2e4a]'
            }`}
          >
            สถานะงาน
          </button>
          <button
            type="button"
            onClick={() => setChartTab('requester')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              chartTab === 'requester' ? 'bg-white text-[#0f2e4a] shadow-xs' : 'hover:text-[#0f2e4a]'
            }`}
          >
            สัดส่วนผู้แจ้ง
          </button>
        </div>
      </div>

      {/* 1. Status Charts */}
      {(chartTab === 'all' || chartTab === 'status') && (
        <div className="space-y-3">
          {chartTab === 'all' && (
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <span className="w-2 h-2 rounded-full bg-[#0f2e4a]"></span>
              สถิติสถานะการปฏิบัติงาน (Task Status)
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <SimplePieChart data={getChartData(dy)} title="สถานะงานวันนี้ (Today's Tasks)" />
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <SimplePieChart data={getChartData(mt)} title="สถานะงานประจำเดือน (Monthly Status)" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Requester Charts (Requirement 1) */}
      {(chartTab === 'all' || chartTab === 'requester') && (
        <div className="space-y-3">
          {chartTab === 'all' && (
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 pt-2">
              <span className="w-2 h-2 rounded-full bg-[#bca374]"></span>
              สถิติสัดส่วนผู้แจ้งงาน (Requester Breakdown)
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Today's Requester Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex flex-col justify-between">
              <SimplePieChart 
                data={getRequesterChartData(dy)} 
                title="สัดส่วนผู้แจ้งงานวันนี้ (Today's Requesters)" 
              />
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-semibold">ผู้แจ้งงานสูงสุดวันนี้:</span>
                {getRequesterChartData(dy).length > 0 && dy.length > 0 ? (
                  <span className="font-bold text-[#0f2e4a] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    🥇 {getRequesterChartData(dy)[0].name} ({getRequesterChartData(dy)[0].value} งาน / {((getRequesterChartData(dy)[0].value / dy.length) * 100).toFixed(1)}%)
                  </span>
                ) : (
                  <span className="text-gray-400">- ไม่มีข้อมูลงานวันนี้ -</span>
                )}
              </div>
            </div>

            {/* Monthly Requester Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 flex flex-col justify-between">
              <SimplePieChart 
                data={getRequesterChartData(mt)} 
                title={`สัดส่วนผู้แจ้งงานประจำเดือน (${gFilt.month})`} 
              />
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-semibold">ผู้แจ้งงานสูงสุดประจำเดือน:</span>
                {getRequesterChartData(mt).length > 0 && mt.length > 0 ? (
                  <span className="font-bold text-[#0f2e4a] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                    🥇 {getRequesterChartData(mt)[0].name} ({getRequesterChartData(mt)[0].value} งาน / {((getRequesterChartData(mt)[0].value / mt.length) * 100).toFixed(1)}%)
                  </span>
                ) : (
                  <span className="text-gray-400">- ไม่มีข้อมูลงานเดือนนี้ -</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
