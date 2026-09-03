export default function SimplePieChart({ data = [], title }) {
  const t = data.reduce((s, i) => s + (i.value || 0), 0);
  const C = Math.PI / 2;

  let currentOffset = 0;
  const slices = data
    .filter((s) => s.value > 0)
    .map((s) => {
      const dash = (s.value / t) * C;
      const offset = -(currentOffset / t) * C;
      currentOffset += s.value;
      return { ...s, dash, offset };
    });

  return (
    <div className="flex flex-col items-center w-full">
      <h3 className="text-sm font-bold mb-4 text-[#0f2e4a]">{title}</h3>
      {t === 0 ? (
        <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center text-xs text-gray-400">
          ไม่มีข้อมูล
        </div>
      ) : (
        <svg viewBox="0 0 1 1" className="w-32 h-32 -rotate-90 rounded-full" style={{ overflow: 'hidden' }}>
          {slices.map((s, i) => (
            <circle
              key={i}
              cx="0.5"
              cy="0.5"
              r="0.25"
              fill="none"
              stroke={s.color}
              strokeWidth="0.5"
              strokeDasharray={`${s.dash} ${C}`}
              strokeDashoffset={s.offset}
              style={{ transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <title>{s.name}: {s.value}</title>
            </circle>
          ))}
          <circle cx="0.5" cy="0.5" r="0.15" fill="white" />
        </svg>
      )}
      <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
        {data.map((item, i) => (
          <div key={i} className="flex items-center">
            <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: item.color }} />
            {item.name} ({item.value})
          </div>
        ))}
      </div>
    </div>
  );
}
