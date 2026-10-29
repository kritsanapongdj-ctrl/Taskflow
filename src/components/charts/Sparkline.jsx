import React, { useState, useId } from 'react';

/**
 * Modern SVG Sparkline Component (21st.dev / Linear style)
 * Zero external dependencies — pure React, SVG & Tailwind CSS.
 * Features:
 * - Smooth Catmull-Rom cubic bezier curves
 * - Soft linear gradient area fill
 * - Terminal live pulse ping beacon on the latest data point
 * - Interactive hover tooltips with custom date and unit labels
 */
export default function Sparkline({
  data = [], // Array of numbers or { value: number, label: string }
  color = '#003C71', // Primary stroke & fill color
  height = 42,
  width = 160,
  unit = '',
  className = '',
  showArea = true,
  showBeacon = true
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const rawId = useId();
  const gradId = `spark-grad-${rawId.replace(/:/g, '')}`;

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-[11px] text-slate-300 h-10 ${className}`}>
        ไม่มีข้อมูลแนวโน้ม
      </div>
    );
  }

  // Normalize data to [{ value, label }]
  const pointsData = data.map((d, i) => {
    if (typeof d === 'object' && d !== null) {
      return { value: Number(d.value) || 0, label: d.label || `${i + 1}` };
    }
    return { value: Number(d) || 0, label: `${i + 1}` };
  });

  const padX = 8;
  const padY = 8;
  const values = pointsData.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal === minVal ? (maxVal === 0 ? 1 : maxVal * 0.25 || 1) : maxVal - minVal;

  const pts = pointsData.map((d, i) => {
    const x = pointsData.length === 1
      ? width / 2
      : padX + (i / (pointsData.length - 1)) * (width - 2 * padX);
    const normalized = (d.value - minVal) / valRange;
    const y = height - padY - normalized * (height - 2 * padY);
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      value: d.value,
      label: d.label
    };
  });

  // Calculate smooth Catmull-Rom curve to cubic bezier
  let linePath;
  if (pts.length === 1) {
    linePath = `M ${pts[0].x - 12},${pts[0].y} L ${pts[0].x + 12},${pts[0].y}`;
  } else {
    linePath = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      linePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
  }

  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x},${height} L ${pts[0].x},${height} Z`
    : '';

  const lastPt = pts[pts.length - 1];
  const activePt = hoveredIdx !== null ? pts[hoveredIdx] : null;

  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
            <stop offset="65%" stopColor={color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Gradient Area Fill */}
        {showArea && areaPath && (
          <path d={areaPath} fill={`url(#${gradId})`} />
        )}

        {/* Ambient Glow Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.18"
        />

        {/* Crisp Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Terminal Live Ping Beacon on latest data point */}
        {showBeacon && lastPt && (
          <g className="pointer-events-none">
            <circle
              cx={lastPt.x}
              cy={lastPt.y}
              r="5"
              fill={color}
              className="animate-ping opacity-40 origin-center"
            />
            <circle
              cx={lastPt.x}
              cy={lastPt.y}
              r="3"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth="2"
            />
          </g>
        )}

        {/* Active Hover Guide & Point */}
        {activePt && (
          <g className="pointer-events-none">
            <line
              x1={activePt.x}
              y1={padY}
              x2={activePt.x}
              y2={height}
              stroke={color}
              strokeWidth="1.2"
              strokeDasharray="2,2"
              opacity="0.6"
            />
            <circle
              cx={activePt.x}
              cy={activePt.y}
              r="4.5"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth="2.5"
            />
          </g>
        )}

        {/* Hitboxes for crisp hover / touch response */}
        {pts.map((pt, idx) => {
          const sliceW = width / pts.length;
          const hitX = Math.max(0, pt.x - sliceW / 2);
          return (
            <rect
              key={idx}
              x={hitX}
              y={0}
              width={sliceW}
              height={height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onTouchStart={() => setHoveredIdx(idx)}
            />
          );
        })}
      </svg>

      {/* Floating Micro Tooltip on Hover */}
      {activePt && (
        <div
          className="absolute pointer-events-none -top-8 -translate-x-1/2 bg-[#003C71] text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-lg border border-[#A8996E]/40 whitespace-nowrap z-30 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${(activePt.x / width) * 100}%`
          }}
        >
          <span className="text-slate-300 font-normal">{activePt.label}:</span>
          <span className="font-bold text-[#A8996E]">
            {activePt.value} {unit}
          </span>
        </div>
      )}
    </div>
  );
}
