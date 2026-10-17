import React, { useState, useEffect } from 'react';
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
  Icon
}) {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'LATE_COMPLETED' | 'LATE_WO' | 'STALE_TASK' | 'SPARE_PARTS_45D' | 'RETROACTIVE' | 'PENALTY_SPARE_PART' | 'BILLING' | 'PRIOR_RESOLVED'
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [auditRole, setAuditRole] = useState('foreman');
  const [auditReason, setAuditReason] = useState('');
  const [savingTaskId, setSavingTaskId] = useState(null);

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
    if (isOpen && initialTaskId) {
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
        setAuditRole(targetItem.attribution?.role || 'foreman');
        setAuditReason(targetItem.attribution?.reason || targetItem.task?.slaAuditResolution?.reason || '');
      }
    }
  }, [isOpen, initialTaskId, discrepancyTasks, priorResolvedTasks]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const filteredItems = activeTab === 'PRIOR_RESOLVED' 
    ? priorResolvedTasks 
    : discrepancyTasks.filter(item => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'LATE_COMPLETED') return item.type === 'LATE_COMPLETED';
        if (activeTab === 'LATE_WO') return item.type === 'LATE_WO';
        if (activeTab === 'STALE_TASK') return item.type === 'STALE_TASK';
        if (activeTab === 'SPARE_PARTS_45D') return item.type === 'SPARE_PARTS_45D';
        if (activeTab === 'RETROACTIVE') return item.type === 'RETROACTIVE_START' || item.type === 'RETROACTIVE_END';
        if (activeTab === 'PENALTY_SPARE_PART') return item.type === 'PENALTY_SPARE_PART';
        if (activeTab === 'BILLING') return item.type === 'BILLING_CUTOFF';
        return true;
      });

  const lateCompletedCount = discrepancyTasks.filter(i => i.type === 'LATE_COMPLETED').length;
  const lateWOCount = discrepancyTasks.filter(i => i.type === 'LATE_WO').length;
  const staleCount = discrepancyTasks.filter(i => i.type === 'STALE_TASK').length;
  const partsCount = discrepancyTasks.filter(i => i.type === 'SPARE_PARTS_45D').length;
  const retroCount = discrepancyTasks.filter(i => i.type === 'RETROACTIVE_START' || i.type === 'RETROACTIVE_END').length;
  const penaltyCount = discrepancyTasks.filter(i => i.type === 'PENALTY_SPARE_PART').length;
  const billingCount = discrepancyTasks.filter(i => i.type === 'BILLING_CUTOFF').length;

  const handleStartEdit = (item) => {
    if (String(editingTaskId) === String(item.task.id)) {
      setEditingTaskId(null); // Toggle off if already editing
      return;
    }
    if (!isSupervisor) {
      if (onOpenSupervisorModal) onOpenSupervisorModal();
      else alert('ต้องเข้าสู่โหมดผู้ดูแลเพื่อทำการวินิจฉัยความรับผิดชอบ');
      return;
    }
    setEditingTaskId(item.task.id);
    setAuditRole(item.attribution?.role || item.task?.slaAuditResolution?.responsibleRole || 'foreman');
    setAuditReason(item.attribution?.reason || item.task?.slaAuditResolution?.reason || '');
  };

  const handleSaveResolution = async (item) => {
    if (!auditReason.trim()) {
      return alert('กรุณาระบุเหตุผลหรือคำวินิจฉัยประกอบการตัดสินใจ');
    }

    setSavingTaskId(item.task.id);
    try {
      const nowIso = new Date().toISOString();
      const updatedTask = { ...item.task };
      const supervisorName = supervisorSession?.supervisorName || 'ผู้ดูแลระบบ';

      updatedTask.slaAuditResolution = {
        responsibleRole: auditRole, // 'foreman' | 'admin' | 'shared' | 'waived'
        reason: auditReason.trim(),
        supervisorName,
        coords: supervisorSession?.coords || null,
        timestamp: nowIso
      };

      const timeline = Array.isArray(updatedTask.timeline) ? [...updatedTask.timeline] : [];
      const roleLabel = auditRole === 'foreman' 
        ? '🛠️ Foreman (100%)' 
        : auditRole === 'admin' 
        ? '📋 Admin (100%)' 
        : auditRole === 'waived' 
        ? '🛡️ ยกเว้น (Waived)' 
        : '🤝 รับผิดชอบร่วม (Shared)';

      timeline.push({
        timestamp: nowIso,
        action: 'SLA_AUDIT_RESOLUTION',
        title: '⚖️ วินิจฉัยความรับผิดชอบ RACI',
        note: `ผู้ดูแล (${supervisorName}) วินิจฉัยให้: ${roleLabel} | เหตุผล: ${auditReason.trim()}`,
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
      setAuditReason('');
    } catch (err) {
      console.error('Save Audit Resolution Error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกคำวินิจฉัย');
    } finally {
      setSavingTaskId(null);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/85 flex items-center justify-center p-3 sm:p-5 z-[100000] backdrop-blur-md animate-in"
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
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {staff ? `บุคลากร: ${staff.name} (${staff.role || staff.classId || 'ทีมงาน'})` : 'ภาพรวมทีมงาน'} • รายการรอตรวจรอบนี้ {discrepancyTasks.length} รายการ (คลิกที่รายการเพื่อปรับผลการตัดสิน)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Tab Filters */}
        <div className="bg-slate-950/60 p-2 sm:p-3 border-b border-slate-800 flex flex-wrap items-center gap-1.5 text-xs shrink-0 overflow-x-auto">
          {[
            { id: 'ALL', label: 'ทั้งหมดรอบเดือนนี้', count: discrepancyTasks.length },
            { id: 'LATE_COMPLETED', label: 'จบงานช้า (SLA)', count: lateCompletedCount },
            { id: 'LATE_WO', label: 'ออกใบงานช้า (>3 วัน)', count: lateWOCount },
            { id: 'STALE_TASK', label: 'งานค้างทิ้งร้าง (>7 วัน)', count: staleCount },
            { id: 'SPARE_PARTS_45D', label: 'รออะไหล่ (>45 วัน)', count: partsCount },
            { id: 'RETROACTIVE', label: 'เลื่อนวันย้อนหลัง', count: retroCount },
            { id: 'PENALTY_SPARE_PART', label: '🚨 ผิดวินัยอะไหล่', count: penaltyCount },
            { id: 'BILLING', label: 'หลุดรอบเบิกจ่าย 15th', count: billingCount },
            ...(priorResolvedTasks.length > 0 ? [{ id: 'PRIOR_RESOLVED', label: '🏛️ ตัดสินแล้วในเดือนก่อนหน้า', count: priorResolvedTasks.length }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* List of Discrepancy Items */}
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
            filteredItems.map((item, idx) => {
              const isEditing = String(editingTaskId) === String(item.task.id);
              const attr = item.attribution || {};
              const isWaived = attr.role === 'waived';
              const isExplicit = attr.isExplicit;

              return (
                <div 
                  key={`${item.task.id}-${idx}`}
                  className={`bg-slate-900/90 rounded-xl border p-4 transition ${
                    isWaived 
                      ? 'border-emerald-500/30 bg-emerald-950/10' 
                      : item.type === 'PENALTY_SPARE_PART'
                      ? 'border-rose-500/50 bg-rose-950/20'
                      : isEditing
                      ? 'border-amber-400/80 bg-amber-950/20 shadow-lg'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div 
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer group"
                    onClick={() => handleStartEdit(item)}
                    title="คลิกเพื่อวินิจฉัย/ปรับสิทธิ์งานนี้"
                  >
                    {/* Left: Task Info & Trigger Violation */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-amber-300 text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          {item.task.id}
                        </span>
                        <span className="text-white font-semibold text-xs truncate max-w-[220px]">
                          {item.task.project}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • สถานะ: <strong className="text-slate-200">{item.task.status}</strong>
                        </span>
                      </div>

                      <div className="text-sm font-bold text-white leading-snug">
                        {item.task.details}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10.5px] font-bold">
                          ⚠️ {item.title}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {item.desc}
                        </span>
                      </div>

                      {/* Current Attribution Box */}
                      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px]">การกำหนดความรับผิดชอบ RACI:</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                            attr.role === 'foreman'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : attr.role === 'admin'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : attr.role === 'waived'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          }`}>
                            {attr.role === 'foreman' && '🛠️ Foreman (100%)'}
                            {attr.role === 'admin' && '📋 Admin (100%)'}
                            {attr.role === 'shared' && '🤝 ร่วมกัน (Shared)'}
                            {attr.role === 'waived' && '🛡️ ได้รับการยกเว้น (Waived)'}
                            {!attr.role && '⏳ ยังไม่ระบุ'}
                          </span>
                          {isExplicit ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-800">
                              ✓ มีการวินิจฉัยโดย {attr.by || 'ผู้ดูแล'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                              (ระบบจัดสรรอัตโนมัติ)
                            </span>
                          )}
                        </div>

                        {attr.reason && (
                          <div className="text-[11px] text-slate-300 italic w-full">
                            "{attr.reason}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="shrink-0 flex items-center sm:flex-col gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(item);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isEditing
                            ? 'bg-slate-700 text-white'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        <Icon name="scale" size={13} />
                        <span>{isEditing ? 'ยกเลิกแก้ไข' : 'วินิจฉัย/ปรับสิทธิ์'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Attribution Form for Supervisor */}
                  {isEditing && (
                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-3 bg-slate-950/90 p-3.5 rounded-xl border border-amber-500/30 animate-fadeIn">
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
                            { id: 'foreman', label: '🛠️ Foreman', sub: 'ตัดคะแนนโฟร์แมน 100%' },
                            { id: 'admin', label: '📋 Admin', sub: 'ตัดคะแนนแอดมิน 100%' },
                            { id: 'shared', label: '🤝 รับผิดชอบร่วม', sub: 'แบ่งสัดส่วนทั้งคู่' },
                            { id: 'waived', label: '🛡️ ยกเว้น (Waived)', sub: 'เหตุสุดวิสัย ไม่หักคะแนน' }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAuditRole(opt.id)}
                              className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                                auditRole === opt.id
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                              }`}
                            >
                              <div className="text-xs leading-tight">{opt.label}</div>
                              <div className="text-[9.5px] opacity-80 mt-0.5">{opt.sub}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1 font-bold">
                          เหตุผลประกอบคำวินิจฉัย (Audit Notes & Justification) *
                        </label>
                        <textarea
                          rows="2"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none resize-none"
                          placeholder="ระบุข้อเท็จจริง เช่น ช่างแจ้งราคา BOQ ล่าช้าจริง, หรือ ลูกค้ารอตัดสินใจ เป็นเหตุสุดวิสัย..."
                          value={auditReason}
                          onChange={(e) => setAuditReason(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          disabled={savingTaskId === item.task.id}
                          onClick={() => handleSaveResolution(item)}
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          {savingTaskId === item.task.id ? (
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
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
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
