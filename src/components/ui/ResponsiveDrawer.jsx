import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * ResponsiveDrawer - 21st.dev / Vaul inspired Native-feel Responsive Drawer / Bottom Sheet
 * Desktop: Elegant Centered Modal Dialog
 * Mobile: Native iOS/Android Bottom Sheet with Drag Handle & Swipe-Down-To-Dismiss
 */
export default function ResponsiveDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
  showCloseButton = true,
  className = ''
}) {
  const sheetRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
    }
  }

  // Touch Swipe-Down to Dismiss on Mobile
  const handleTouchStart = (e) => {
    if (window.innerWidth >= 768) return; // Only enable drag on mobile
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // Dismiss threshold: 80px downward swipe
    if (dragY > 80) {
      onClose();
    } else {
      setDragY(0);
    }
  }, [dragY, isDragging, onClose]);

  // Keyboard accessibility: Escape key closes drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
        role="presentation"
        aria-label="ปิดหน้าต่าง"
        onClick={onClose}
      />

      {/* Sheet Container (Bottom on mobile, Centered on desktop) */}
      <div
        ref={sheetRef}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 200ms ease-out'
        }}
        className={`relative z-10 w-full ${maxWidth} bg-white rounded-t-[28px] md:rounded-2xl shadow-2xl border-t md:border border-slate-200/90 max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] ${className}`}
      >
        {/* Mobile Drag Handle Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="md:hidden pt-3 pb-1 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center shrink-0 touch-none select-none"
        >
          <div className="w-12 h-1.5 bg-slate-300 rounded-full transition-transform active:scale-95" />
        </div>

        {/* Header (if title exists) */}
        {(title || showCloseButton) && (
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="px-5 pt-3 md:pt-4 pb-3 flex items-center justify-between border-b border-slate-100 shrink-0 select-none"
          >
            <div className="flex-1 pr-3">
              {typeof title === 'string' ? (
                <h3 className="font-bold text-base text-[#0F2E4A]">{title}</h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิด"
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 hide-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
