import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';

export default function DiscrepancyAuditModal({
  isOpen,
  onClose,
  staff = null,
  tasks = [],
  discrepancyTasks = [],
  priorResolvedTasks = [],
  currentMonth = null,
  initialTaskId = null,
  saveD,
  isSupervisor = false,
  supervisorSession = null,
  onOpenSupervisorModal = null,
  judgeOptions = [],
  Icon
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'LATE_COMPLETED' | 'LATE_WO' | 'STALE_TASK' | 'SPARE_PARTS_45D' | 'RETROACTIVE' | 'PENALTY_SPARE_PART' | 'BILLING' | 'PRIOR_RESOLVED'
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusView, setStatusView] = useState('pending'); // 'pending' | 'decided' | 'all'
  const [judgeFilter, setJudgeFilter] = useState('');
  const PAGE_SIZE = 20;

  const formatMonthThai = (mStr) => {
    if (!mStr) return 'กันยายน 2569 เป็นต้นไป';
    const parts = mStr.split('-');
    if (parts.length < 2) return mStr;
    const monthNames = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const mIndex = parseInt(parts[1], 10);
    let year = parseInt(parts[0], 10);
    if (year < 2500) year += 543;
    return `${monthNames[mIndex] || parts[1]} ${year}`;
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      if (initialTaskId) {
        setStatusView('all');
        const allItems = [...discrepancyTasks, ...priorResolvedTasks];
        const targetItem = allItems.find(i => String(i.task.id) === String(initialTaskId));
        if (targetItem) {
          if (targetItem.type === 'RESOLVED_PRIOR_MONTH') setActiveTab('PRIOR_RESOLVED');
          else if (targetItem.type === 'LATE_COMPLETED') setActiveTab('LATE_COMPLETED');
          else if (targetItem.type === 'LATE_WO') setActiveTab('LATE_WO');
          else if (targetItem.type === 'STALE_TASK') setActiveTab('STALE_TASK');
          else if (targetItem.type === 'SPARE_PARTS_45D') setActiveTab('SPARE_PARTS_45D');
          else if (targetItem.type && targetItem.type.startsWith('RETROACTIVE')) setActiveTab('RETROACTIVE');
          else if (targetItem.type === 'PENALTY_SPARE_PART') setActiveTab('PENALTY_SPARE_PART');
          else if (targetItem.type === 'BILLING_CUTOFF') setActiveTab('BILLING');
          else setActiveTab('ALL');

          setEditingTaskId(targetItem.task.id);
        }
      }
    } else {
      setEditingTaskId(null);
    }
  }, [isOpen, initialTaskId, discrepancyTasks, priorResolvedTasks]);

  const statusItems = useMemo(() => discrepancyTasks.filter(item => {
    const decided = !!item.attribution?.isExplicit;
    if (statusView === 'pending' && decided) return false;
    if (statusView === 'decided' && !decided) return false;
    if (judgeFilter && (!decided || String(item.attribution?.by || '').trim() !== judgeFilter)) return false;
    return true;
  }), [discrepancyTasks, statusView, judgeFilter]);

  const filteredItems = useMemo(() => {
    if (!isOpen) return [];
    if (activeTab === 'PRIOR_RESOLVED') return priorResolvedTasks;
    return statusItems.filter(item => {
      if (activeTab === 'ALL') return true;
      if (activeTab === 'RETROACTIVE') return item.type === 'RETROACTIVE_START' || item.type === 'RETROACTIVE_END';
      if (activeTab === 'BILLING') return item.type === 'BILLING_CUTOFF';
      return item.type === activeTab;
    });
  }, [isOpen, activeTab, priorResolvedTasks, statusItems]);

  const pendingCount = useMemo(() => discrepancyTasks.filter(i => !i.attribution?.isExplicit).length, [discrepancyTasks]);
  const decidedCount = discrepancyTasks.length - pendingCount;

  const typeCount = (pred) => statusItems.filter(pred).length;
  const typeOptions = [
    { id: 'ALL', label: 'ทุกประเภท', count: statusItems.length },
    { id: 'LATE_COMPLETED', label: 'จบงานช้า (SLA)', count: typeCount(i => i.type === 'LATE_COMPLETED') },
    { id: 'LATE_WO', label: 'ออกใบงานช้า (>3 วัน)', count: typeCount(i => i.type === 'LATE_WO') },
    { id: 'STALE_TASK', label: 'งานค้างทิ้งร้าง (>7 วัน)', count: typeCount(i => i.type === 'STALE_TASK') },
    { id: 'SPARE_PARTS_45D', label: 'รออะไหล่ (>45 วัน)', count: typeCount(i => i.type === 'SPARE_PARTS_45D') },
    { id: 'RETROACTIVE', label: 'เลื่อนวันย้อนหลัง', count: typeCount(i => i.type === 'RETROACTIVE_START' || i.type === 'RETROACTIVE_END') },
    { id: 'PENALTY_SPARE_PART', label: 'ผิดวินัยอะไหล่', count: typeCount(i => i.type === 'PENALTY_SPARE_PART') },
    { id: 'BILLING', label: 'หลุดรอบเบิกจ่าย 15th', count: typeCount(i => i.type === 'BILLING_CUTOFF') },
    ...(priorResolvedTasks.length > 0 ? [{ id: 'PRIOR_RESOLVED', label: 'ตัดสินแล้วในเดือนก่อนหน้า', count: priorResolvedTasks.length }] : [])
  ];

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const editingItem = useMemo(() => {
    if (!editingTaskId) return null;
    return filteredItems.find(i => String(i.task.id) === String(editingTaskId)) ||
      (priorResolvedTasks || []).find(i => String(i.task.id) === String(editingTaskId)) ||
      (discrepancyTasks || []).find(i => String(i.task.id) === String(editingTaskId)) || null;
  }, [editingTaskId, filteredItems, priorResolvedTasks, discrepancyTasks]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setEditingTaskId(null);
  };

  const handleStartEdit = (item) => {
    if (String(editingTaskId) === String(item.task.id)) {
      setEditingTaskId(null);
      return;
    }
    if (!isSupervisor) {
      if (onOpenSupervisorModal) onOpenSupervisorModal();
      else alert('ต้องเข้าสู่โหมดผู้ดูแลเพื่อทำการวินิจฉัยความรับผิดชอบ');
      return;
    }
    setEditingTaskId(item.task.id);
  };

  const handleSaveResolution = async (item, role, reason) => {
    if (!reason || !reason.trim()) {
      return alert('กรุณาระบุเหตุผลหรือคำวินิจฉัยประกอบการตัดสินใจ');
    }

    setSavingTaskId(item.task.id);
    try {
      const nowIso = new Date().toISOString();
      const updatedTask = { ...item.task };
      const supervisorName = supervisorSession?.supervisorName || 'ผู้ดูแลระบบ';

      updatedTask.slaAuditResolution = {
        responsibleRole: role, // 'foreman' | 'admin' | 'shared' | 'waived'
        reason: reason.trim(),
        supervisorName,
        coords: supervisorSession?.coords || null,
        timestamp: nowIso
      };

      const timeline = Array.isArray(updatedTask.timeline) ? [...updatedTask.timeline] : [];
      const roleLabel = role === 'foreman' 
        ? '🛠️ Foreman (รับผิดชอบเต็ม 100%)' 
        : role === 'admin' 
        ? '📋 Admin (รับผิดชอบเต็ม 100%)' 
        : role === 'waived' 
        ? '🛡️ ยกเว้น (Waived - เหตุสุดวิสัย)' 
        : '🤝 รับผิดชอบร่วม (Shared)';

      timeline.push({
        timestamp: nowIso,
        action: 'SLA_AUDIT_RESOLUTION',
        title: '⚖️ วินิจฉัยความรับผิดชอบ RACI',
        note: `ผู้ดูแล (${supervisorName}) วินิจฉัยให้: ${roleLabel} | เหตุผล: ${reason.trim()}`,
        actor: supervisorName,
        securityAudit: supervisorSession?.coords ? {
          lat: supervisorSession.coords.lat,
          lng: supervisorSession.coords.lng,
          accuracy: supervisorSession.coords.accuracy
        } : null
      });

      updatedTask.timeline = timeline;

      if (saveD) {
        await saveD('task', updatedTask);
      }

      setEditingTaskId(null);
    } catch (err) {
      console.error('Save Audit Resolution Error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกคำวินิจฉัย');
    } finally {
      setSavingTaskId(null);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-3 sm:p-5 z-[100000]"
      onClick={onClose}
    >
      <div 
        className="bg-[#0f172a] border border-amber-500/40 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 p-4 sm:p-5 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-bold">
              <Icon name="scale" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white font-display">
                  วินิจฉัยและตรวจสอบงานผิดเงื่อนไข (Discrepancy Audit & RACI)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  รอบ: {formatMonthThai(currentMonth)}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                  ✓ ก.ย. 2569 เป็นต้นไป
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 shadow-xs" title="เอนจินประมวลผลพิมพ์ลื่นไหล ไม่กระตุก">
                  ⚡ v2.5 Zero-Lag Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {staff ? `บุคลากร: ${staff.name} (${staff.role || staff.classId || 'ทีมงาน'})` : 'ภาพรวมทีมงาน'} • รายการรอตรวจรอบนี้ {discrepancyTasks.length} รายการ (คลิกที่รายการเพื่อปรับผลการตัดสิน)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload(true);
                }
              }}
              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              title="กดเมื่อต้องการรีเฟรชหน้าต่างเพื่อโหลดโค้ดเวอร์ชันล่าสุดจากเซิร์ฟเวอร์ทันที"
            >
              <Icon name="refreshCw" size={12} />
              <span className="hidden sm:inline">รีโหลดเวอร์ชัน</span>
            </button>
            {!isSupervisor && (
              <button
                type="button"
                onClick={onOpenSupervisorModal}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="สลับเป็นโหมดผู้ดูแลเพื่อทำการตัดสินความรับผิดชอบ"
              >
                <Icon name="shieldAlert" size={14} />
                <span className="hidden sm:inline">เข้าสู่โหมดผู้ดูแลเพื่อตัดสิน</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Filters (hidden during single-task focus view) */}
        {!editingItem && (
          <div className="bg-slate-950/60 p-3 border-b border-slate-800 flex flex-wrap items-center gap-2 text-sm shrink-0">
            <div role="tablist" aria-label="สถานะการตัดสิน" className="flex rounded-lg border border-slate-700 overflow-hidden">
              {[
                { id: 'pending', label: 'รอตัดสิน', count: pendingCount },
                { id: 'decided', label: 'ตัดสินแล้ว', count: decidedCount },
                { id: 'all', label: 'ทั้งหมด', count: discrepancyTasks.length }
              ].map(v => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={statusView === v.id}
                  onClick={() => { setStatusView(v.id); setCurrentPage(1); if (activeTab === 'PRIOR_RESOLVED') setActiveTab('ALL'); }}
                  className={`px-3 py-2 min-h-[40px] text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${statusView === v.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
                >
                  {v.label}
                  <span className={`text-xs px-1.5 rounded-full ${statusView === v.id ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>{v.count}</span>
                </button>
              ))}
            </div>

            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value)}
              aria-label="ประเภทความผิดปกติ"
              className="min-h-[40px] px-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
            >
              {typeOptions.map(t => (
                <option key={t.id} value={t.id}>{t.label} ({t.count})</option>
              ))}
            </select>

            {judgeOptions.length > 0 && (
              <select
                value={judgeFilter}
                onChange={(e) => { setJudgeFilter(e.target.value); setCurrentPage(1); if (e.target.value && statusView === 'pending') setStatusView('decided'); }}
                aria-label="กรองตามผู้ตัดสิน"
                className="min-h-[40px] px-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
              >
                <option value="">ผู้ตัดสิน: ทุกคน</option>
                {judgeOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Main Body: Conditional View (Single-Task Focus vs Paginated List) */}
        {editingItem ? (
          /* ========================================================
             SINGLE-TASK FOCUS ADJUDICATION VIEW (Zero Layout Churn)
             ======================================================== */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Back Button & Target Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTaskId(null)}
                className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
              >
                <Icon name="arrowLeft" size={14} />
                <span>← กลับไปหน้ารายการ ({filteredItems.length} งาน)</span>
              </button>
              <span className="text-[11px] text-slate-400 font-mono">
                กำลังวินิจฉัยใบงาน: <strong className="text-amber-300">{editingItem.task.id}</strong>
              </span>
            </div>

            {/* Target Task Summary Card */}
            <div className="bg-slate-900/90 rounded-xl border border-amber-400/50 p-4 space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-amber-300 text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {editingItem.task.id}
                </span>
                <span className="text-white font-semibold text-xs truncate max-w-[280px]">
                  {editingItem.task.project}
                </span>
                <span className="text-[10px] text-slate-400">
                  • สถานะ: <strong className="text-slate-200">{editingItem.task.status}</strong>
                </span>
              </div>

              <div className="text-sm font-bold text-white leading-snug">
                {editingItem.task.details}
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10.5px] font-bold">
                  ⚠️ {editingItem.title}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {editingItem.desc}
                </span>
              </div>
            </div>

            {/* Isolated Adjudication Form (Zero competing DOM nodes, 100% native typing) */}
            <AdjudicationForm
              key={editingItem.task.id}
              item={editingItem}
              initialRole={editingItem.attribution?.role || editingItem.task?.slaAuditResolution?.responsibleRole || 'foreman'}
              initialReason={editingItem.attribution?.reason || editingItem.task?.slaAuditResolution?.reason || ''}
              supervisorSession={supervisorSession}
              onSave={handleSaveResolution}
              onCancel={() => setEditingTaskId(null)}
              isSaving={savingTaskId === editingItem.task.id}
              Icon={Icon}
            />
          </div>
        ) : (
          /* ========================================================
             PAGINATED LIST VIEW (20 Items Per Page)
             ======================================================== */
          <>
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
                  <Icon name="checkCircle" size={36} className="text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-white font-bold text-sm">ไม่พบรายการงานผิดเงื่อนไขในหมวดหมู่นี้</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    {activeTab === 'PRIOR_RESOLVED' 
                      ? 'ไม่มีรายการที่ได้รับการตัดสินในเดือนก่อนหน้า' 
                      : 'งานในขอบเขตรอบเดือนนี้ปฏิบัติตามมาตรฐาน SLA และ RACI เรียบร้อยดี'}
                  </p>
                </div>
              ) : (
                paginatedItems.map((item, idx) => {
                  const attr = item.attribution || {};
                  const decided = !!attr.isExplicit;
                  const isWaived = attr.role === 'waived';
                  const roleLabel = { foreman: 'Foreman 100%', admin: 'Admin 100%', shared: 'ร่วมกัน', waived: 'ยกเว้น' }[attr.role];

                  return (
                    <div
                      key={`${item.task.id}-${idx}`}
                      onClick={() => handleStartEdit(item)}
                      title="คลิกเพื่อวินิจฉัย/ปรับสิทธิ์งานนี้"
                      className={`rounded-lg border px-4 py-3 cursor-pointer transition flex items-start justify-between gap-3 ${
                        decided ? 'border-slate-800 bg-slate-900/50 hover:border-slate-600' : 'border-slate-700 bg-slate-900 hover:border-amber-500/60'
                      } ${item.type === 'PENALTY_SPARE_PART' && !decided ? 'border-l-4 border-l-rose-500' : ''}`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-mono font-bold text-amber-300">{item.task.id}</span>
                          <span className="text-slate-300 truncate max-w-[240px]">{item.task.project}</span>
                          <span className="text-slate-500">• {item.task.status}</span>
                        </div>
                        <div className="text-sm font-semibold text-white leading-snug line-clamp-2">{item.task.details}</div>
                        <div className="text-xs text-slate-400 leading-snug">
                          <span className="text-rose-300 font-semibold">{item.title}</span>
                          <span> — {item.desc}</span>
                        </div>
                        {decided && (
                          <div className="text-xs text-emerald-300 pt-0.5">
                            ✓ {roleLabel || 'ตัดสินแล้ว'} • โดย {attr.by || 'ผู้ดูแล'}
                            {attr.reason && <span className="text-slate-400 italic"> — "{attr.reason}"</span>}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(item); }}
                        className={`shrink-0 min-h-[40px] px-3 rounded-lg text-sm font-bold transition cursor-pointer border ${
                          decided ? 'bg-transparent text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-400'
                        }`}
                      >
                        {decided ? (isWaived ? 'ดู/แก้ไข' : 'แก้ไข') : 'ตัดสิน'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {filteredItems.length > PAGE_SIZE && (
              <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 shrink-0">
                <span className="text-slate-400 text-[11px]">
                  แสดง {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} จากทั้งหมด {filteredItems.length} รายการ
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition cursor-pointer"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="px-2 font-mono text-amber-300 font-bold">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition cursor-pointer"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>การปรับเปลี่ยนคำวินิจฉัยจะส่งผลต่อการคำนวณคะแนน SLA และเกณฑ์ BARS ของบุคลากรทันที</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const AdjudicationForm = memo(function AdjudicationForm({
  item,
  initialRole,
  initialReason,
  supervisorSession,
  onSave,
  onCancel,
  isSaving,
  Icon
}) {
  const [role, setRole] = useState(initialRole || 'foreman');
  const reasonRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const reasonText = (reasonRef.current?.value || '').trim();
    if (!reasonText) {
      return alert('กรุณาระบุเหตุผลหรือคำวินิจฉัยประกอบการตัดสินใจ');
    }
    onSave(item, role, reasonText);
  };

  return (
    <div className="space-y-4 bg-slate-950/90 p-4 sm:p-5 rounded-xl border border-amber-500/40">
      <div className="flex items-center justify-between text-xs font-bold text-amber-300">
        <span>⚖️ บันทึกคำวินิจฉัยความรับผิดชอบโดยผู้ดูแล (Supervisor Adjudication):</span>
        {supervisorSession?.supervisorName && (
          <span className="text-[11px] text-slate-400">
            🛡️ ผู้ลงนาม: <strong>{supervisorSession.supervisorName}</strong>
          </span>
        )}
      </div>

      <div>
        <label className="text-xs text-slate-300 block mb-1.5 font-bold">
          เลือกผลการวินิจฉัยความรับผิดชอบ (Responsible Entity):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'foreman', label: '🛠️ Foreman', sub: 'รับผิดชอบเต็ม 100% (หักคะแนนโฟร์แมน)' },
            { id: 'admin', label: '📋 Admin', sub: 'รับผิดชอบเต็ม 100% (หักคะแนนแอดมิน)' },
            { id: 'shared', label: '🤝 รับผิดชอบร่วม', sub: 'แบ่งสัดส่วนรับผิดชอบคู่หู' },
            { id: 'waived', label: '🛡️ ยกเว้น (Waived)', sub: 'เหตุสุดวิสัย (ไม่หักคะแนน)' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRole(opt.id)}
              className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                role === opt.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold leading-tight">{opt.label}</div>
              <div className="text-[10px] opacity-80 mt-0.5">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-300 block mb-1.5 font-bold">
          เหตุผลประกอบคำวินิจฉัย (Audit Notes & Justification) *
        </label>
        <textarea
          ref={reasonRef}
          rows="3"
          defaultValue={initialReason || ''}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onInput={(e) => e.stopPropagation()}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none resize-none leading-relaxed"
          placeholder="ระบุข้อเท็จจริง เช่น ช่างแจ้งราคา BOQ ล่าช้าจริง, หรือ ลูกค้ารอตัดสินใจ เป็นเหตุสุดวิสัย..."
        />
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSubmit}
          className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
        >
          {isSaving ? (
            <span>กำลังบันทึก...</span>
          ) : (
            <>
              <Icon name="check" size={14} />
              <span>บันทึกคำวินิจฉัย (Audit Stamp)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});
