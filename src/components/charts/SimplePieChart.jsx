import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip
} from 'recharts';

// 80s Cyber-Corporate High-Contrast Tooltip
const CustomTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="bg-[#060E21] border-2 border-[#B89246] shadow-[4px_4px_0px_#0B1B3D] px-3.5 py-2 text-white text-xs z-50 rounded-none font-tech">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 shadow-sm"
            style={{ backgroundColor: item.payload.color || item.fill }}
          />
          <span className="font-bold text-white tracking-wide">{item.name}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-black text-[#00F0FF]">{item.value}</span>
          <span className="text-[10px] text-[#E5C989]">({pct}%)</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function SimplePieChart({ data = [], title }) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const validData = data.filter((item) => Number(item.value) > 0);

  return (
    <div className="flex flex-col items-center w-full select-none">
      <div className="w-full flex justify-between items-center mb-2 pb-2 border-b border-[#B89246]/20">
        <h3 className="text-sm font-bold text-white tracking-wide font-display">{title}</h3>
        <span className="text-[11px] font-tech font-bold text-[#00F0FF] bg-[#060E21] border border-[#00F0FF]/40 px-2 py-0.5 rounded-none shadow-[2px_2px_0px_#060E21]">
          TOTAL: {total}
        </span>
      </div>

      <div className="w-full h-56 relative flex items-center justify-center">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center w-36 h-36 border-2 border-dashed border-[#B89246]/40 text-xs font-tech text-[#E5C989]">
            <span className="text-white mb-1 font-bold text-lg">0</span>
            <span>NO_DATA_QUEUED</span>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220} minWidth={200} minHeight={220}>
              <PieChart>
                <RechartsTooltip content={<CustomTooltip total={total} />} />
                <Pie
                  data={validData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={validData.length > 1 ? 3 : 0}
                  cornerRadius={0}
                  isAnimationActive={true}
                  animationDuration={850}
                  animationEasing="ease-out"
                  stroke="#0B1B3D"
                  strokeWidth={2}
                >
                  {validData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-all duration-200 hover:opacity-90 cursor-pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Summary Label inside the Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black font-tech text-white leading-none tracking-tight drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                {total}
              </span>
              <span className="text-[10px] font-tech font-bold text-[#B89246] mt-1.5 uppercase tracking-widest">
                TASKS
              </span>
            </div>
          </>
        )}
      </div>

      {/* 80s Interactive Hardware Legend with High Contrast */}
      <div className="grid grid-cols-3 gap-2 w-full mt-2 pt-3 border-t border-[#B89246]/30">
        {data.map((item, i) => {
          const count = Number(item.value) || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
          return (
            <div
              key={i}
              className="flex flex-col items-center p-2 rounded-none bg-[#060E21] border border-[#B89246]/40 hover:border-[#00F0FF] hover:shadow-[2px_2px_0px_#00F0FF] transition-all"
            >
              <div className="flex items-center gap-1.5 mb-1 w-full justify-center">
                <span
                  className="w-2 h-2 shrink-0 shadow-xs"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-tech text-slate-200 truncate max-w-[85px] text-center" title={item.name}>
                  {item.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-tech">
                <span className="text-xs font-bold text-[#00F0FF]">{count}</span>
                <span className="text-[10px] text-[#E5C989]">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
