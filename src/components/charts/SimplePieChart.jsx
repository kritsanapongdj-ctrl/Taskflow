import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip
} from 'recharts';

export default function SimplePieChart({ data = [], title }) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const validData = data.filter((item) => Number(item.value) > 0);

  // Custom Glassmorphic Tooltip matching LH-TaskFlow theme
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-[#0f2e4a]/95 backdrop-blur-md border border-[#bca374]/50 shadow-xl rounded-xl px-3.5 py-2 text-white text-xs z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: item.payload.color || item.fill }}
            />
            <span className="font-bold text-slate-200">{item.name}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black text-[#bca374]">{item.value}</span>
            <span className="text-[10px] text-slate-400">({pct}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center w-full select-none">
      <div className="w-full flex justify-between items-center mb-1">
        <h3 className="text-sm font-bold text-[#0f2e4a] tracking-tight">{title}</h3>
        <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          รวม {total} งาน
        </span>
      </div>

      <div className="w-full h-56 relative flex items-center justify-center">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center w-36 h-36 rounded-full border-2 border-dashed border-gray-200 text-xs text-gray-400">
            <span className="text-gray-300 mb-1 font-bold text-lg">0</span>
            <span>ไม่มีข้อมูล</span>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220} minWidth={200} minHeight={220}>
              <PieChart>
                <RechartsTooltip content={<CustomTooltip />} />
                <Pie
                  data={validData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={validData.length > 1 ? 4 : 0}
                  cornerRadius={6}
                  isAnimationActive={true}
                  animationDuration={850}
                  animationEasing="ease-out"
                  stroke="none"
                >
                  {validData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-all duration-300 hover:opacity-85 hover:scale-105 cursor-pointer filter drop-shadow-sm"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Summary Label inside the Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[#0f2e4a] leading-none tracking-tight">
                {total}
              </span>
              <span className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-wider">
                ภารกิจ
              </span>
            </div>
          </>
        )}
      </div>

      {/* Interactive Legend with Badges */}
      <div className="grid grid-cols-3 gap-2 w-full mt-2 pt-3 border-t border-gray-100">
        {data.map((item, i) => {
          const count = Number(item.value) || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
          return (
            <div
              key={i}
              className="flex flex-col items-center p-1.5 rounded-lg bg-gray-50/70 hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-medium text-gray-600 truncate max-w-[80px]">
                  {item.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-gray-800">{count}</span>
                <span className="text-[9px] text-gray-400">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
