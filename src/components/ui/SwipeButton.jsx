import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsRight, Check } from 'lucide-react';

/**
 * SwipeButton - Modern 21st.dev inspired Swipe-to-Action / Hold-to-Confirm component
 * Optimized for mobile touchscreens & desktop mouse gestures.
 * Prevents accidental actions on critical status transitions.
 */
export default function SwipeButton({
  onConfirm,
  text = 'สไลด์เพื่อยืนยัน',
  successText = 'ยืนยันเรียบร้อยแล้ว',
  variant = 'primary', // 'primary' | 'success' | 'danger' | 'warning'
  disabled = false,
  className = ''
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [maxDrag, setMaxDrag] = useState(0);

  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const startXRef = useRef(0);

  // Measure track width minus thumb width
  const updateMaxDrag = useCallback(() => {
    if (trackRef.current && thumbRef.current) {
      const trackWidth = trackRef.current.clientWidth;
      const thumbWidth = thumbRef.current.clientWidth;
      // 8px = 4px padding on each side (p-1)
      setMaxDrag(Math.max(0, trackWidth - thumbWidth - 8));
    }
  }, []);

  useEffect(() => {
    updateMaxDrag();
    window.addEventListener('resize', updateMaxDrag);
    return () => window.removeEventListener('resize', updateMaxDrag);
  }, [updateMaxDrag]);

  // Reset confirmation state if disabled changes
  useEffect(() => {
    if (disabled) {
      setDragOffset(0);
      setIsConfirmed(false);
      setIsDragging(false);
    }
  }, [disabled]);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([30, 40, 50]);
      } catch {
        // ignore if not permitted
      }
    }
  };

  const executeConfirm = useCallback(async () => {
    triggerHaptic();
    setIsConfirmed(true);
    setDragOffset(maxDrag);

    try {
      const result = await onConfirm?.();
      // If validation returns false, reset slider
      if (result === false) {
        setIsConfirmed(false);
        setDragOffset(0);
      }
    } catch {
      setIsConfirmed(false);
      setDragOffset(0);
    }
  }, [maxDrag, onConfirm]);

  // Pointer event handlers (handles both Touch and Mouse seamlessly)
  const handlePointerDown = (e) => {
    if (disabled || isConfirmed || maxDrag <= 0) return;
    setIsDragging(true);
    startXRef.current = e.clientX - dragOffset;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging || isConfirmed) return;
    const currentX = e.clientX;
    const newOffset = Math.max(0, Math.min(currentX - startXRef.current, maxDrag));
    setDragOffset(newOffset);
  };

  const handlePointerUp = (e) => {
    if (!isDragging || isConfirmed) return;
    setIsDragging(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    // Threshold: 80% of track length triggers confirm
    if (dragOffset >= maxDrag * 0.8) {
      executeConfirm();
    } else {
      // Snap back smoothly
      setDragOffset(0);
    }
  };

  const handlePointerCancel = (e) => {
    if (!isDragging || isConfirmed) return;
    setIsDragging(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    setDragOffset(0);
  };

  // Keyboard accessibility (Space or Enter triggers confirmation)
  const handleKeyDown = (e) => {
    if (disabled || isConfirmed) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      executeConfirm();
    }
  };

  // Color theme definitions
  const theme = {
    primary: {
      track: 'bg-slate-100/90 border-slate-300/80 text-slate-700',
      fill: 'bg-gradient-to-r from-[#0f2e4a]/10 via-[#0f2e4a]/25 to-[#0f2e4a]/40',
      thumb: 'bg-[#0f2e4a] text-white hover:bg-[#1a3f63]',
      text: 'text-slate-700',
      arrow: 'text-[#0f2e4a]'
    },
    success: {
      track: 'bg-emerald-50/90 border-emerald-300/80 text-emerald-800',
      fill: 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/30 to-emerald-500/45',
      thumb: 'bg-emerald-600 text-white hover:bg-emerald-700',
      text: 'text-emerald-800',
      arrow: 'text-emerald-600'
    },
    danger: {
      track: 'bg-rose-50/90 border-rose-300/80 text-rose-800',
      fill: 'bg-gradient-to-r from-rose-500/15 via-rose-500/30 to-rose-500/45',
      thumb: 'bg-rose-600 text-white hover:bg-rose-700',
      text: 'text-rose-800',
      arrow: 'text-rose-600'
    },
    warning: {
      track: 'bg-amber-50/90 border-amber-300/80 text-amber-800',
      fill: 'bg-gradient-to-r from-amber-500/15 via-amber-500/30 to-amber-500/45',
      thumb: 'bg-amber-600 text-white hover:bg-amber-700',
      text: 'text-amber-800',
      arrow: 'text-amber-600'
    }
  }[variant] || theme.primary;

  const dragRatio = maxDrag > 0 ? dragOffset / maxDrag : 0;

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={text}
      aria-valuenow={Math.round(dragRatio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={`relative w-full h-12 select-none touch-none rounded-full border p-1 overflow-hidden transition-colors shadow-inner flex items-center ${
        theme.track
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {/* Dynamic expanding progress fill */}
      <div
        className={`absolute left-0 top-0 bottom-0 pointer-events-none rounded-full ${
          theme.fill
        } ${isDragging ? '' : 'transition-all duration-300 ease-out'}`}
        style={{
          width: `${Math.max(48, dragOffset + 48)}px`
        }}
      />

      {/* Track Label with Chevron Shimmer */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none font-bold text-xs sm:text-sm tracking-wide ${
          theme.text
        } ${isDragging ? '' : 'transition-opacity duration-200'}`}
        style={{
          opacity: isConfirmed ? 0 : Math.max(0, 1 - dragRatio * 1.5)
        }}
      >
        <span className="flex items-center gap-1.5 drop-shadow-sm">
          <span>{text}</span>
          <span className={`inline-flex font-mono text-[11px] tracking-tight animate-pulse ${theme.arrow}`}>
            ❯❯❯
          </span>
        </span>
      </div>

      {/* Confirmed / Success Message */}
      {isConfirmed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-bold text-xs sm:text-sm text-emerald-700 animate-fadeIn">
          <span className="flex items-center gap-1.5">
            <Check size={16} className="text-emerald-600" />
            <span>{successText}</span>
          </span>
        </div>
      )}

      {/* Draggable Slider Thumb */}
      <div
        ref={thumbRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md active:scale-95 ${
          theme.thumb
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab transition-transform duration-300 ease-out'} ${
          isConfirmed ? 'bg-emerald-600 text-white' : ''
        }`}
        style={{
          transform: `translateX(${dragOffset}px)`
        }}
      >
        {isConfirmed ? (
          <Check size={20} className="animate-scaleIn" />
        ) : (
          <ChevronsRight
            size={20}
            className={`transition-transform ${isDragging ? 'translate-x-0.5' : ''}`}
          />
        )}
      </div>
    </div>
  );
}
