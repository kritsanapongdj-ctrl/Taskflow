import React from 'react';

export default function RadarChart({
  baseStats = [],
  userStats = [],
  selectedAxis = null,
  onSelectAxis = null
}) {
  const max = 10;
  const size = 250;
  const center = 125;
  const radius = 90;

  const getPoint = (val, index, customRadius = radius) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (Math.min(Math.max(val, 0), max) / max) * customRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const statDefs = [
    { key: 'STR', label: 'STR', name: 'กำลังผลักดัน' },
    { key: 'AGI', label: 'AGI', name: 'ความเร็วคล่องตัว' },
    { key: 'DEX', label: 'DEX', name: 'ความแม่นยำ' },
    { key: 'INT', label: 'INT', name: 'เทคโนโลยี/ระบบ' },
    { key: 'CON', label: 'CON', name: 'ความทนทาน' },
    { key: 'SEN', label: 'SEN', name: 'เจรจา/อารมณ์' }
  ];

  const levels = [2, 4, 6, 8, 10];
  const safeStats = userStats.length === 6 ? userStats : [5, 5, 5, 5, 5, 5];
  const polygonPoints = safeStats.map((v, i) => getPoint(v, i)).join(' ');

  return (
    <div className="relative w-full h-full max-w-[280px] mx-auto flex items-center justify-center select-none">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full overflow-visible drop-shadow-sm"
      >
        <defs>
          <linearGradient id="radarPolygonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bca374" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#0f2e4a" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.30" />
          </linearGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Concentric Web Grid */}
        {levels.map((lvl) => {
          const pts = statDefs.map((_, i) => getPoint(lvl, i)).join(' ');
          return (
            <polygon
              key={`grid-${lvl}`}
              points={pts}
              fill={lvl === 10 ? 'rgba(248, 250, 252, 0.5)' : 'none'}
              stroke={lvl === 10 ? '#cbd5e1' : '#e2e8f0'}
              strokeWidth={lvl === 6 ? '1.5' : '1'}
              strokeDasharray={lvl === 6 ? '3 3' : undefined}
            />
          );
        })}

        {/* Axis Lines */}
        {statDefs.map((def, i) => {
          const [x2, y2] = getPoint(10, i).split(',');
          const isSelected = selectedAxis === i || selectedAxis === def.key.toLowerCase();
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke={isSelected ? '#bca374' : '#e2e8f0'}
              strokeWidth={isSelected ? '2' : '1'}
              className="transition-colors duration-300"
            />
          );
        })}

        {/* Dynamic Animated Polygon with Spring Curve */}
        <polygon
          points={polygonPoints}
          fill="url(#radarPolygonGrad)"
          stroke="#0f2e4a"
          strokeWidth="2.5"
          strokeLinejoin="round"
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        />

        {/* Interactive Vertex Nodes */}
        {safeStats.map((val, i) => {
          const [cx, cy] = getPoint(val, i).split(',');
          const isHigh = val >= 8;
          const isSelected = selectedAxis === i || selectedAxis === statDefs[i].key.toLowerCase();

          return (
            <g
              key={`node-${i}`}
              className="cursor-pointer transition-all duration-700"
              onClick={() => onSelectAxis && onSelectAxis(i, statDefs[i].key.toLowerCase())}
            >
              {/* Pulsing ring for high scores or selected axis */}
              {(isHigh || isSelected) && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? '9' : '7'}
                  fill={isSelected ? '#0f2e4a' : '#bca374'}
                  opacity={isSelected ? '0.25' : '0.3'}
                  className="animate-ping"
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                />
              )}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="7"
                  fill="none"
                  stroke="#bca374"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? '5.5' : isHigh ? '4.5' : '3.5'}
                fill={isSelected ? '#bca374' : isHigh ? '#bca374' : '#0f2e4a'}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="transition-all duration-700 hover:scale-125"
                style={{
                  transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <title>{`${statDefs[i].key}: ${val} / 10 (${statDefs[i].name})`}</title>
              </circle>
            </g>
          );
        })}

        {/* Labels and Value Badges */}
        {statDefs.map((def, i) => {
          const [lx, ly] = getPoint(10, i, radius + 22).split(',');
          const val = safeStats[i];
          const isHighlight = val >= 8;
          const isSelected = selectedAxis === i || selectedAxis === def.key.toLowerCase();

          return (
            <g
              key={`label-${def.key}`}
              className="cursor-pointer group"
              onClick={() => onSelectAxis && onSelectAxis(i, def.key.toLowerCase())}
            >
              <text
                x={lx}
                y={Number(ly) - 2}
                fontSize={isSelected ? '12' : '11'}
                fontWeight="bold"
                fill={isSelected ? '#bca374' : isHighlight ? '#0f2e4a' : '#64748b'}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-sans transition-all duration-300 group-hover:fill-[#bca374]"
              >
                {def.key}
              </text>
              <text
                x={lx}
                y={Number(ly) + 10}
                fontSize={isSelected ? '10' : '9'}
                fontWeight="bold"
                fill={isSelected ? '#0f2e4a' : isHighlight ? '#bca374' : '#94a3b8'}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-sans transition-all duration-300"
              >
                {val}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
