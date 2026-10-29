import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';

/**
 * SegmentedPills - 21st.dev inspired Animated Sliding Segmented Control & Filter Pills
 * Features:
 * - Smooth sliding active indicator pill (spring ease)
 * - Mobile horizontal scroll with auto-centering on active item
 * - Dynamic badge counts & alert pulse beacons
 * - Zero external dependencies (Pure React 19 + Tailwind CSS)
 */
export default function SegmentedPills({
  items = [], // Array<{ id: string, label: string, count?: number, icon?: React.ReactNode, alert?: boolean, alertColor?: string }>
  activeId,
  onChange,
  size = 'md', // 'sm' | 'md'
  className = ''
}) {
  const containerRef = useRef(null);
  const pillRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // Update sliding pill position whenever activeId or items change
  useLayoutEffect(() => {
    const activeEl = pillRefs.current[activeId];
    if (activeEl && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        opacity: 1
      });

      // Auto-scroll the active pill into view on mobile
      const scrollLeft = activeEl.offsetLeft - (containerRect.width / 2) + (activeRect.width / 2);
      containerRef.current.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });
    }
  }, [activeId, items]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      const activeEl = pillRefs.current[activeId];
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeId]);

  const sizeClasses = {
    sm: 'text-[11px] py-1 px-2.5 h-7.5',
    md: 'text-xs py-1.5 px-3 h-9'
  }[size] || 'text-xs py-1.5 px-3 h-9';

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Scrollable track with hidden scrollbars */}
      <div
        ref={containerRef}
        role="tablist"
        className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/90 rounded-2xl overflow-x-auto hide-scrollbar overscroll-contain select-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Animated sliding highlight background pill */}
        <div
          className="absolute top-1 bottom-1 rounded-xl bg-white shadow-xs border border-slate-200/80 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.opacity
          }}
        />

        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => (pillRefs.current[item.id] = el)}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try {
                    navigator.vibrate(25);
                  } catch {
                    /* ignore haptic failure */
                  }
                }
                onChange(item.id);
              }}
              className={`relative z-10 shrink-0 font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap active:scale-95 ${sizeClasses} ${
                isActive
                  ? 'text-[#003C71]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span>{item.label}</span>

              {/* Count Badge / Indicator */}
              {item.count !== undefined && (
                <span
                  className={`inline-flex items-center justify-center min-w-4.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                    item.alert && item.count > 0
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : isActive
                      ? 'bg-[#003C71]/10 text-[#003C71]'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {item.alert && item.count > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse" />
                  )}
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
