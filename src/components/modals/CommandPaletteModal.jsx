import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * CommandPaletteModal (Cmd+K / Spotlight Search)
 * Inspired by 21st.dev / Linear / Raycast Command Palette
 * Zero external dependencies — pure React 19 + Tailwind CSS.
 * Provides instant multi-category search:
 * 1. Tasks & Plots (เลขแปลง, บ้านเลขที่, รายละเอียดงาน, รหัสงาน)
 * 2. Projects (โครงการ)
 * 3. Staff & Technicians (ช่างและบุคลากร)
 * 4. Quick Actions (คำสั่งด่วน: เพิ่มงาน, งานเกินกำหนด, แผนที่น้ำ)
 * 5. Navigation (เมนูหลัก 9 แท็บ)
 */
export default function CommandPaletteModal({
  isOpen,
  onClose,
  tasks = [],
  staffList = [],
  getStdProj = (p) => p,
  onSelectTask,
  onSelectProject,
  onSelectStaff,
  onNavigateTab,
  onQuickAction,
  Icon
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input automatically on open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  // Static Navigation Tabs
  const navTabs = useMemo(
    () => [
      { id: 'daily', label: 'งานรายวัน (Daily Tasks)', icon: 'listTodo', category: 'navigation', desc: 'รายการงานซ่อมบำรุงประจำวัน' },
      { id: 'dashboard', label: 'แดชบอร์ด SLA (Dashboard)', icon: 'layoutDashboard', category: 'navigation', desc: 'ภาพรวมตัวชี้วัดและกราฟแนวโน้ม' },
      { id: 'monthly', label: 'ปฏิทินงาน (Monthly Calendar)', icon: 'calendar', category: 'navigation', desc: 'ตารางงานประจำเดือน' },
      { id: 'kanban', label: 'ส่งเบิกงวดงาน (Kanban Billing)', icon: 'fileText', category: 'navigation', desc: 'กระดานเบิกจ่ายและเอกสาร WO' },
      { id: 'budget', label: 'งบประมาณ 2570 (Budget Control)', icon: 'wallet', category: 'navigation', desc: 'ติดตามงบประมาณและการจัดสรร' },
      { id: 'inform', label: 'แจ้งเปิดงาน (Inform Job)', icon: 'bell', category: 'navigation', desc: 'เปิดรับเรื่องงานซ่อมใหม่' },
      { id: 'simulation', label: 'Pixel Office (ห้องทำงานเสมือน)', icon: 'cpu', category: 'navigation', desc: 'ระบบจำลองการทำงานและบอท' },
      { id: 'team', label: 'สถานะทีม (Talent Engine)', icon: 'users', category: 'navigation', desc: 'ประเมินสมรรถนะบุคลากรและ RACI SLA' },
      { id: 'settings', label: 'ตั้งค่าระบบ (Settings)', icon: 'settings', category: 'navigation', desc: 'จัดการฐานข้อมูลและการสำรองไฟล์' }
    ],
    []
  );

  // Static Quick Actions
  const quickActions = useMemo(
    () => [
      { id: 'create_task', label: '+ เพิ่มรายการงานใหม่ (New Task)', icon: 'plusCircle', category: 'action', desc: 'เปิดฟอร์มบันทึกงานซ่อมใหม่' },
      { id: 'open_overdue', label: '⚠️ ดูรายการงานเกินกำหนด (Overdue SLA Watchlist)', icon: 'alertTriangle', category: 'action', desc: 'เข้าสู่ห้องกำกับดูแลและเร่งรัดงาน' },
      { id: 'open_flood_map', label: '🗺️ เปิดแผนที่สถานการณ์น้ำ Real-time', icon: 'map', category: 'action', desc: 'ติดตามสถานการณ์น้ำและระบายน้ำ 30 โครงการ' },
      { id: 'open_changelog', label: '✨ ดูบันทึกการอัปเดตระบบ (Changelog)', icon: 'sparkles', category: 'action', desc: 'ประวัติการพัฒนาและฟีเจอร์ใหม่' }
    ],
    []
  );

  // Unique Projects List with active task counts
  const projectsList = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.status === 'ยกเลิก') return;
      const std = getStdProj(t.project) || 'ไม่ระบุโครงการ';
      map.set(std, (map.get(std) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({
        id: `proj_${name}`,
        name,
        count,
        category: 'project',
        icon: 'building2'
      }))
      .sort((a, b) => b.count - a.count);
  }, [tasks, getStdProj]);

  // Unique Staff List
  const uniqueStaff = useMemo(() => {
    const map = new Map();
    staffList.forEach((s) => {
      const name = (s.name || '').trim();
      if (!name) return;
      map.set(name, {
        id: `staff_${name}`,
        name,
        role: s.role || 'ช่าง/เจ้าหน้าที่',
        category: 'staff',
        icon: 'userCheck'
      });
    });
    return Array.from(map.values());
  }, [staffList]);

  // Filtered Results across All Categories
  const filteredSections = useMemo(() => {
    const cleanQ = query.trim().toLowerCase();

    // 1. Initial State (No search query typed)
    if (!cleanQ) {
      return [
        {
          title: 'คำสั่งด่วน (QUICK ACTIONS)',
          items: quickActions
        },
        {
          title: 'เมนูนำทาง (NAVIGATION)',
          items: navTabs.slice(0, 4)
        },
        {
          title: 'โครงการที่มีภารกิจสูงสุด (TOP ACTIVE PROJECTS)',
          items: projectsList.slice(0, 4).map((p) => ({
            id: p.id,
            label: p.name,
            icon: p.icon,
            category: 'project',
            data: p.name,
            desc: `มีงานที่กำลังดำเนินการ ${p.count} รายการ`
          }))
        }
      ];
    }

    // 2. Search Mode (Query active)
    const sections = [];

    // Category A: Matching Tasks & Plots
    const matchingTasks = tasks
      .filter((t) => {
        if (t.status === 'ยกเลิก') return false;
        const det = (t.details || '').toLowerCase();
        const proj = (t.project || '').toLowerCase();
        const staff = (t.staffName || '').toLowerCase();
        const id = (t.id || '').toLowerCase();
        const wo = (t.workOrderNo || '').toLowerCase();
        const req = (t.requester || '').toLowerCase();
        return (
          det.includes(cleanQ) ||
          proj.includes(cleanQ) ||
          staff.includes(cleanQ) ||
          id.includes(cleanQ) ||
          wo.includes(cleanQ) ||
          req.includes(cleanQ)
        );
      })
      .slice(0, 8)
      .map((t) => {
        const isOverdue = t.overdueStatus === 'เกินกำหนด' || t.overdueStatus === 'ออกใบงานช้า';
        return {
          id: `task_${t.id}`,
          label: t.details || 'ไม่ระบุรายละเอียด',
          category: 'task',
          icon: isOverdue ? 'alertTriangle' : 'fileText',
          data: t,
          project: getStdProj(t.project),
          staff: t.staffName || 'ไม่ระบุช่าง',
          status: t.status || 'รอดำเนินการ',
          date: t.endDate || t.startDate || '',
          isOverdue
        };
      });

    if (matchingTasks.length > 0) {
      sections.push({
        title: `ภารกิจงาน & แปลงบ้าน (TASKS · ${matchingTasks.length})`,
        items: matchingTasks
      });
    }

    // Category B: Matching Projects
    const matchingProjects = projectsList
      .filter((p) => p.name.toLowerCase().includes(cleanQ))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        label: p.name,
        icon: p.icon,
        category: 'project',
        data: p.name,
        desc: `พบภารกิจในโครงการ ${p.count} รายการ`
      }));

    if (matchingProjects.length > 0) {
      sections.push({
        title: `โครงการ (PROJECTS · ${matchingProjects.length})`,
        items: matchingProjects
      });
    }

    // Category C: Matching Staff
    const matchingStaff = uniqueStaff
      .filter((s) => s.name.toLowerCase().includes(cleanQ) || s.role.toLowerCase().includes(cleanQ))
      .slice(0, 4)
      .map((s) => ({
        id: s.id,
        label: s.name,
        icon: s.icon,
        category: 'staff',
        data: s.name,
        desc: `ตำแหน่ง: ${s.role}`
      }));

    if (matchingStaff.length > 0) {
      sections.push({
        title: `ทีมงาน & ช่าง (STAFF · ${matchingStaff.length})`,
        items: matchingStaff
      });
    }

    // Category D: Matching Actions
    const matchingActions = quickActions.filter(
      (a) => a.label.toLowerCase().includes(cleanQ) || a.desc.toLowerCase().includes(cleanQ)
    );
    if (matchingActions.length > 0) {
      sections.push({
        title: `คำสั่งด่วน (QUICK ACTIONS)`,
        items: matchingActions
      });
    }

    // Category E: Matching Navigation Tabs
    const matchingNav = navTabs.filter(
      (n) => n.label.toLowerCase().includes(cleanQ) || n.desc.toLowerCase().includes(cleanQ)
    );
    if (matchingNav.length > 0) {
      sections.push({
        title: `เมนูนำทาง (NAVIGATION)`,
        items: matchingNav
      });
    }

    return sections;
  }, [query, tasks, projectsList, uniqueStaff, quickActions, navTabs, getStdProj]);

  // Flattened items array for single-index keyboard navigation
  const flatItems = useMemo(() => {
    const list = [];
    filteredSections.forEach((sec) => {
      sec.items.forEach((item) => list.push(item));
    });
    return list;
  }, [filteredSections]);

  const activeIdx = Math.min(selectedIndex, Math.max(0, flatItems.length - 1));

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIdx}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIdx]);

  // Handle Item Execution
  const handleSelectItem = (item) => {
    if (!item) return;

    if (item.category === 'task') {
      if (onSelectTask) onSelectTask(item.data);
      onClose();
      return;
    }

    if (item.category === 'project') {
      if (onSelectProject) onSelectProject(item.data);
      onClose();
      return;
    }

    if (item.category === 'staff') {
      if (onSelectStaff) onSelectStaff(item.data);
      onClose();
      return;
    }

    if (item.category === 'navigation') {
      if (onNavigateTab) onNavigateTab(item.id);
      onClose();
      return;
    }

    if (item.category === 'action') {
      if (onQuickAction) onQuickAction(item.id);
      onClose();
      return;
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatItems.length === 0) return;
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatItems.length === 0) return;
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems.length > 0 && flatItems[activeIdx]) {
        handleSelectItem(flatItems[activeIdx]);
      }
      return;
    }
  };

  if (!isOpen) return null;

  let currentFlatIdx = 0;

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-start justify-center pt-[7vh] sm:pt-[12vh] px-3 sm:px-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-[#A8996E]/30 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Accent Luxury Stripe */}
        <div className="h-1 bg-gradient-to-r from-[#003C71] via-[#A8996E] to-[#003C71]" />

        {/* Search Header Bar */}
        <div className="relative flex items-center px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-white">
          <div className="text-slate-400 mr-3 shrink-0">
            <Icon name="search" size={20} className="text-[#003C71]" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="ค้นหาเลขแปลง, บ้านเลขที่, โครงการ, ช่าง, หรือพิมพ์คำสั่ง..."
            className="w-full text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-transparent outline-hidden font-sans"
            autoComplete="off"
            spellCheck="false"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                if (inputRef.current) inputRef.current.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition mr-1.5 cursor-pointer"
              title="ล้างข้อความค้นหา"
            >
              <Icon name="x" size={16} />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <kbd className="text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto divide-y divide-slate-100 overscroll-contain max-h-[58vh] p-2"
        >
          {flatItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Icon name="search" size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-600">ไม่พบข้อมูลที่ตรงกับ &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">ลองพิมพ์คำค้นหาใหม่ เช่น เลขแปลง, ชื่อโครงการ, หรือชื่อช่าง</p>
            </div>
          ) : (
            filteredSections.map((sec, secIdx) => {
              if (sec.items.length === 0) return null;

              return (
                <div key={secIdx} className="py-1">
                  <div className="px-3 py-1.5 text-[10.5px] font-serif font-bold text-[#003C71] tracking-wider uppercase flex items-center justify-between">
                    <span>{sec.title}</span>
                    <span className="text-[10px] font-sans font-normal text-slate-400">
                      {sec.items.length} รายการ
                    </span>
                  </div>

                  <div className="space-y-0.5 mt-0.5">
                    {sec.items.map((item) => {
                      const itemIdx = currentFlatIdx++;
                      const isSelected = itemIdx === activeIdx;

                      return (
                        <div
                          key={item.id}
                          data-index={itemIdx}
                          onClick={() => handleSelectItem(item)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#003C71]/6 text-[#003C71] border border-[#003C71]/15 shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                isSelected
                                  ? 'bg-[#003C71] text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <Icon name={item.icon || 'fileText'} size={16} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs sm:text-sm font-semibold truncate ${
                                  isSelected ? 'text-[#003C71]' : 'text-slate-800'
                                }`}>
                                  {item.label}
                                </span>

                                {item.project && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium border border-slate-200">
                                    {item.project}
                                  </span>
                                )}

                                {item.status && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                                      item.isOverdue
                                        ? 'bg-rose-50 text-[#7A1C28] border-rose-200'
                                        : item.status.startsWith('จบงาน')
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-blue-50 text-[#003C71] border-blue-200'
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                )}
                              </div>

                              {(item.desc || item.staff || item.date) && (
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-2">
                                  {item.desc && <span>{item.desc}</span>}
                                  {item.staff && <span>ผู้รับผิดชอบ: {item.staff}</span>}
                                  {item.date && <span className="font-mono text-[10.5px]">({item.date})</span>}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {isSelected && (
                              <span className="text-[11px] font-bold text-[#003C71] flex items-center gap-1 animate-in fade-in">
                                <span className="hidden sm:inline text-[10px] text-slate-400 font-sans font-normal">เลือก</span>
                                <span>➔</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono text-[10px] bg-white border border-slate-200 px-1 py-0.2 rounded shadow-2xs">
                ↑
              </kbd>
              <kbd className="font-mono text-[10px] bg-white border border-slate-200 px-1 py-0.2 rounded shadow-2xs">
                ↓
              </kbd>
              <span className="text-[11px] text-slate-400">นำทาง</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded shadow-2xs">
                ↵
              </kbd>
              <span className="text-[11px] text-slate-400">เลือก</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-sans">
              LH TaskFlow Spotlight
            </span>
            <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded shadow-2xs text-slate-400">
              Ctrl + K
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
