import React from 'react';

export default function RadarChart({ baseStats = [], userStats = [] }) {
  const max = 10, size = 200, center = 100, radius = 80;
  const getPoint = (val, index) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (val / max) * radius;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  };
  const labels = ['STR', 'AGI', 'DEX', 'INT', 'CON', 'SEN'];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[250px] mx-auto overflow-visible">
      {[2, 4, 6, 8, 10].map(level => (
        <polygon key={level} points={labels.map((_, i) => getPoint(level, i)).join(' ')} fill="none" stroke="#e5e7eb" strokeWidth="1" />
      ))}
      {labels.map((_, i) => (
        <line key={i} x1={center} y1={center} x2={getPoint(10, i).split(',')[0]} y2={getPoint(10, i).split(',')[1]} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      {labels.map((l, i) => {
        const [x, y] = getPoint(11.5, i).split(',');
        return <text key={i} x={x} y={y} fontSize="11" fontWeight="bold" fill="#4b5563" textAnchor="middle" dominantBaseline="middle">{l}</text>;
      })}
      {userStats.length === 6 && (
        <polygon
          points={userStats.map((v, i) => getPoint(v, i)).join(' ')}
          fill="rgba(15, 46, 74, 0.4)"
          stroke="#0f2e4a"
          strokeWidth="2"
          style={{ transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      )}
      {userStats.map((v, i) => {
        const [x, y] = getPoint(v, i).split(',');
        return <circle key={i} cx={x} cy={y} r="3" fill="#0f2e4a" style={{ transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />;
      })}
    </svg>
  );
}
