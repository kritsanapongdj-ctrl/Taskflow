import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Clock, Pin } from 'lucide-react';

/**
 * SearchableSlaSelect
 * A searchable combobox for SLA categories with instant live filter,
 * frequent category quick-pins, and SLA days badges.
 *
 * Adheres to LH-TaskFlow High Luxury styling guidelines.
 */
export default function SearchableSlaSelect({
  value = '',
  onChange,
  slas = [],
  getProjName = (s) => (s ? String(s).split('|')[0] : ''),
  getProjArea = (s) => (s ? String(s).split('|')[1] || '' : ''),
  frequentCategories = [],
  placeholder = '--- ค้นหาหรือเลือกหมวด SLA ---',
  disabled = false,
  className = '',
  id = 'sla-select'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options into structured list
  const options = useMemo(() => {
    const list = [
      {
        name: 'งานทั่วไป (ไม่มี SLA)',
        days: 0,
        isGeneral: true,
        raw: 'งานทั่วไป (ไม่มี SLA)'
      }
    ];

    const seen = new Set(['งานทั่วไป (ไม่มี SLA)']);

    (slas || []).forEach((s) => {
      const name = getProjName(s).trim();
      if (!name || seen.has(name)) return;
      seen.add(name);

      const rawDays = getProjArea(s);
      const days = parseInt(rawDays, 10);
      list.push({
        name,
        days: isNaN(days) ? 0 : days,
        isGeneral: false,
        raw: s
      });
    });

    return list;
  }, [slas, getProjName, getProjArea]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (!value) return null;
    return (
      options.find((o) => o.name === value) || {
        name: value,
        days: 0,
        isGeneral: value.includes('ไม่มี SLA')
      }
    );
  }, [options, value]);

  // Resolve top quick pins
  const pinOptions = useMemo(() => {
    if (!frequentCategories || frequentCategories.length === 0) {
      // Default pins if history is empty
      const defaultPins = [
        'งานทั่วไป (ไม่มี SLA)',
        'ท่อสปริงเกอร์แตก',
        'หัวสปริงเกอร์แตก',
        'สุขภัณฑ์ป้อมหน้า'
      ];
      return defaultPins
        .map((name) => options.find((o) => o.name.toLowerCase() === name.toLowerCase()))
        .filter(Boolean);
    }

    const matched = [];
    frequentCategories.forEach((catName) => {
      const found = options.find((o) => o.name.toLowerCase() === catName.toLowerCase());
      if (found && !matched.some((m) => m.name === found.name)) {
        matched.push(found);
      }
    });

    return matched.slice(0, 5);
  }, [frequentCategories, options]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.trim().toLowerCase();
    return options.filter((o) => {
      const nameMatch = o.name.toLowerCase().includes(term);
      const daysMatch = o.days > 0 && (`${o.days} วัน`.includes(term) || `${o.days}` === term);
      const genMatch = o.isGeneral && ('ไม่มี sla'.includes(term) || 'ทั่วไป'.includes(term));
      return nameMatch || daysMatch || genMatch;
    });
  }, [options, searchTerm]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Autofocus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keep highlighted item in view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex];
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt) => {
    if (onChange) {
      onChange(opt.name, opt.days);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('', 0);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-left font-sans ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Combobox Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg p-2 text-sm transition-all outline-none bg-white ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : isOpen
            ? 'border-[#0F2E4A] ring-2 ring-[#0F2E4A]/15 shadow-xs'
            : 'border-gray-300 hover:border-gray-400 focus:border-[#0F2E4A] focus:ring-2 focus:ring-[#0F2E4A]/15'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption ? (
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-semibold text-[#0F2E4A] truncate">
                {selectedOption.name}
              </span>
              {selectedOption.days > 0 ? (
                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                  <Clock size={10} className="inline" />
                  {selectedOption.days} วัน
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  ไม่มี SLA
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  handleClear(e);
                }
              }}
              title="ล้างหมวดที่เลือก"
              className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 cursor-pointer transition"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#0F2E4A]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
          {/* Live Search Input Box */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="พิมพ์เพื่อค้นหาหมวดงาน หรือจำนวนวัน..."
              className="w-full text-xs bg-transparent outline-none placeholder:text-gray-400 text-gray-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Quick Pins Section (หมวดใช้งานบ่อย) */}
          {!searchTerm && pinOptions.length > 0 && (
            <div className="p-2 bg-gradient-to-r from-slate-50 to-amber-50/30 border-b border-slate-100">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                <Pin size={10} className="text-amber-600" />
                <span>หมวดใช้งานบ่อย:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pinOptions.map((pin) => {
                  const isSelected = selectedOption?.name === pin.name;
                  return (
                    <button
                      key={pin.name}
                      type="button"
                      onClick={() => handleSelect(pin)}
                      className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-[#0F2E4A] text-white border-[#0F2E4A] shadow-xs'
                          : 'bg-white hover:bg-amber-100/60 text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <span>{pin.name}</span>
                      {pin.days > 0 ? (
                        <span
                          className={`text-[9px] px-1 rounded-sm ${
                            isSelected
                              ? 'bg-amber-400/30 text-amber-200'
                              : 'bg-amber-50 text-amber-700 font-bold'
                          }`}
                        >
                          {pin.days}ว
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SLA Categories List */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-56 overflow-y-auto divide-y divide-gray-50 p-1"
          >
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                ไม่พบหมวด SLA ที่ค้นหา "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = selectedOption?.name === opt.name;
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={opt.name}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-[#0F2E4A]/10 text-[#0F2E4A] font-semibold'
                        : isHighlighted
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#0F2E4A] text-white'
                            : 'border border-gray-300 text-transparent'
                        }`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className="truncate">{opt.name}</span>
                    </div>

                    <div className="shrink-0">
                      {opt.days > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          {opt.days} วัน
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          ไม่มี SLA
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
