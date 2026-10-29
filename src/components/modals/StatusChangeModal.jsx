import React, { useState } from 'react';
import SwipeButton from '../ui/SwipeButton.jsx';
import ResponsiveDrawer from '../ui/ResponsiveDrawer.jsx';

export default function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  sMod: propSMod,
  setSMod: propSetSMod,
  getTStr,
  staffList = [],
  task = null,
  _isSupervisor = false,
  supervisorSession = null
}) {
  // Isolate form state locally so that typing never triggers root App.jsx re-renders
  const [sMod, setSMod] = useState(propSMod || {});
  const [prevSyncKey, setPrevSyncKey] = useState(`${propSMod?.taskId}_${propSMod?.type}_${isOpen}`);

  const currentSyncKey = `${propSMod?.taskId}_${propSMod?.type}_${isOpen}`;
  if (isOpen && prevSyncKey !== currentSyncKey) {
    setPrevSyncKey(currentSyncKey);
    setSMod(propSMod || {});
  }

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (!sMod.recordedBy?.trim()) {
      alert('กรุณาเลือกหรือระบุชื่อผู้บันทึก');
      return false;
    }
    if (sMod.type === 'penalty_spare_part' && !sMod.reason?.trim()) {
      alert('กรุณาระบุหลักฐานหรือเหตุผลที่ตรวจพบว่าผิดเงื่อนไขรออะไหล่ (เช่น ตรวจพบอะไหล่ส่งถึงหน้างานแล้ว แต่งานไม่มีความคืบหน้า)');
      return false;
    }
    if (sMod.type === 'cancel' && !sMod.reason?.trim()) {
      alert('กรุณาระบุเหตุผลในการยกเลิกงาน');
      return false;
    }
    if (sMod.type === 'postpone_start' && !sMod.postponeStartDate) {
      alert('กรุณาระบุวันที่เริ่มงานใหม่');
      return false;
    }
    if (sMod.type === 'issue' && !sMod.reason?.trim()) {
      alert('กรุณาระบุสาเหตุที่ติดปัญหา หรืออะไหล่ที่รอ');
      return false;
    }
    if (sMod.type === 'postpone') {
      if (!sMod.postponeDate) {
        alert('กรุณาระบุวันที่ขอเลื่อนจบไปใหม่');
        return false;
      }
      if (!sMod.reason?.trim()) {
        alert('กรุณาระบุสาเหตุที่ขอเลื่อนวันจบงาน');
        return false;
      }
    }
    if (sMod.type === 'complete') {
      if (sMod.isOverdue && !sMod.overdueReason?.trim()) {
        alert('กรุณาระบุสาเหตุที่จบงานช้ากว่ากำหนด');
        return false;
      }
      if (sMod.isLateWO && !sMod.noWO && !sMod.lateWOReason?.trim()) {
        alert('กรุณาระบุสาเหตุที่เปิดใบงานล่าช้ากว่ากำหนดเกิน 3 วัน');
        return false;
      }
      if (!sMod.noWO && !sMod.workOrderNo?.trim()) {
        alert('กรุณาระบุเลขที่ใบงาน (เช่น LH-123-1234567) หรือ ติ๊กเลือก "ขอจบงานโดยยังไม่ใส่เลขที่ใบงาน" ด้านล่าง');
        return false;
      }
      if (!sMod.noWO) {
        const woRegex = /^[A-Za-z]{2}-\d{3}-\d{7}$/;
        const cleanWo = (sMod.workOrderNo || '').trim().toUpperCase();
        if (!woRegex.test(cleanWo)) {
          alert('รูปแบบเลขที่ใบงานไม่ถูกต้อง!\nต้องเป็น: อักษร 2 ตัว - เลข 3 ตัว - เลข 7 ตัว\nตัวอย่าง: LH-123-1234567');
          return false;
        }
      }
    }
    if (propSetSMod) propSetSMod(sMod);
    if (onConfirm) onConfirm(sMod);
    return true;
  };

  const handleClose = () => {
    onClose();
    if (propSetSMod) {
      propSetSMod({
        ...propSMod,
        isOpen: false,
        noWO: false,
        forceWO: false,
        isOverdue: false,
        overdueReason: '',
        postponeDate: getTStr ? getTStr() : '',
        recordedBy: '',
        isCustomStaff: false
      });
    }
  };

  const isCustom = sMod.isCustomStaff || (!staffList.includes(sMod.recordedBy) && !!sMod.recordedBy);

  const modalTitle = (
    <div
      className={`font-bold text-base flex items-center gap-1.5 ${
        sMod.type === 'penalty_spare_part'
          ? 'text-rose-700'
          : sMod.type === 'cancel'
          ? 'text-red-500'
          : sMod.type === 'postpone_start'
          ? 'text-sky-600'
          : sMod.type === 'postpone'
          ? 'text-amber-600'
          : sMod.type === 'issue'
          ? 'text-rose-600'
          : sMod.type === 'progress'
          ? 'text-indigo-600'
          : sMod.type === 'pending'
          ? 'text-slate-600'
          : 'text-emerald-700'
      }`}
    >
      {sMod.type === 'penalty_spare_part'
        ? '🚨 ผิดเงื่อนไขรออะไหล่ (ตัดคะแนนวินัย)'
        : sMod.type === 'cancel'
        ? '❌ ยกเลิกงาน'
        : sMod.type === 'postpone_start'
        ? '📅 เลื่อนวันเริ่มงาน'
        : sMod.type === 'postpone'
        ? '📅 เลื่อนวันจบงาน'
        : sMod.type === 'issue'
        ? '⚠️ รออะไหล่ / ติดปัญหา'
        : sMod.type === 'progress'
        ? (sMod.isHoldResume ? '⚙️ ได้รับอะไหล่ / ดำเนินการต่อ' : '⚙️ เปลี่ยนสถานะเป็น: กำลังดำเนินการ')
        : sMod.type === 'pending'
        ? '⏳ เปลี่ยนสถานะเป็น: รอดำเนินการ'
        : '✅ ยืนยันจบงาน'}
    </div>
  );

  return (
    <ResponsiveDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      maxWidth="max-w-md"
    >
      {/* Task Info Summary */}
        {task && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 text-xs">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-bold text-[#0f2e4a] font-mono">{task.id}</span>
              <span className="text-[11px] text-[#bca374] font-semibold truncate max-w-[200px]">
                {task.project}
              </span>
            </div>
            <div className="text-slate-700 line-clamp-2 font-medium">{task.details}</div>
          </div>
        )}

        <div className="space-y-3">
          {/* ช่องเลือกชื่อผู้บันทึกข้อมูล (Recorded By) */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>👤</span>
                <span>ผู้บันทึก / เจ้าหน้าที่ดำเนินการ *</span>
              </span>
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-100/60 px-1.5 py-0.5 rounded">
                ลงประวัติไทม์ไลน์
              </span>
            </label>

            <select
              value={isCustom ? '__custom__' : (sMod.recordedBy || '')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__custom__') {
                  setSMod({ ...sMod, isCustomStaff: true, recordedBy: sMod.recordedBy || '' });
                } else {
                  setSMod({ ...sMod, recordedBy: val, isCustomStaff: false });
                }
              }}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 bg-white focus:ring-1 focus:ring-[#0f2e4a] outline-none"
            >
              <option value="">-- กรุณาเลือกชื่อผู้บันทึก --</option>
              {staffList.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value="__custom__">✏️ ระบุชื่ออื่น / กรอกเอง...</option>
            </select>

            {isCustom && (
              <input
                type="text"
                placeholder="ระบุชื่อผู้บันทึก..."
                value={sMod.recordedBy || ''}
                onChange={(e) => setSMod({ ...sMod, recordedBy: e.target.value })}
                className="w-full border border-blue-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            )}

            <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-0.5">
              <span>🔒 เฉพาะ Foreman, Admin และ Officer ที่มีอีเมล</span>
              <span className="font-mono text-slate-400">({staffList.length} ท่าน)</span>
            </div>
          </div>

          {/* Action-specific fields */}
          {sMod.type === 'cancel' && (
            <div>
              <label className="text-xs font-bold text-red-500">เหตุผลบังคับ *</label>
              <textarea
                rows="2"
                className="w-full border rounded p-2 text-sm resize-none bg-red-50"
                placeholder="ระบุสาเหตุที่ยกเลิกงาน..."
                value={sMod.reason}
                onChange={(e) => setSMod({ ...sMod, reason: e.target.value })}
              />
            </div>
          )}

          {sMod.type === 'postpone_start' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-sky-700">วันที่เริ่มงานใหม่ *</label>
                <input
                  type="date"
                  className="w-full border border-sky-300 rounded p-2 text-sm bg-sky-50 focus:ring-1 focus:ring-sky-500 outline-none"
                  value={sMod.postponeStartDate}
                  onChange={(e) => setSMod({ ...sMod, postponeStartDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">หมายเหตุ/เหตุผล (ถ้ามี)</label>
                <textarea
                  rows="2"
                  className="w-full border rounded p-2 text-sm resize-none bg-gray-50 focus:bg-white outline-none"
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..."
                  value={sMod.reason}
                  onChange={(e) => setSMod({ ...sMod, reason: e.target.value })}
                />
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 text-[11px] text-sky-800 flex items-start gap-1.5">
                <span className="text-sky-600 font-bold shrink-0">ℹ️</span>
                <span>สามารถเลื่อนวันเริ่มงานได้ทันที <strong>โดยไม่ต้องส่งอีเมลแจ้งผู้ดูแล</strong></span>
              </div>
            </div>
          )}

          {sMod.type === 'penalty_spare_part' && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 text-xs leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-rose-950 mb-1">
                  <span>🚨</span>
                  <span>คำสั่งลงโทษทางวินัยโดยผู้ดูแล (Supervisor Disciplinary Action):</span>
                </div>
                <p className="mb-2">
                  การเปลี่ยนเป็นสถานะนี้จะล็อกตราประทับทางวินัยถาวรในระบบ Audit Trail และนำไปตัดคะแนน SLA และวินัยหน้างานของ Foreman 100% โดยอัตโนมัติ
                </p>
                {supervisorSession?.coords && (
                  <div className="bg-white/80 p-2 rounded-lg border border-rose-200 text-[10.5px] font-mono text-rose-800 space-y-0.5">
                    <div>📍 <strong>พิกัดผู้สั่งการ:</strong> {supervisorSession.coords.lat?.toFixed(5)}, {supervisorSession.coords.lng?.toFixed(5)} (±{Math.round(supervisorSession.coords.accuracy || 0)} ม.)</div>
                    <div>🛡️ <strong>ผู้ดูแลที่ลงนาม:</strong> {supervisorSession.supervisorName || sMod.recordedBy}</div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-rose-700">
                  หลักฐานและข้อเท็จจริงที่ตรวจพบ (บังคับระบุ) *
                </label>
                <textarea
                  rows="3"
                  className="w-full border-2 border-rose-300 rounded-lg p-2.5 text-sm resize-none bg-rose-50/50 focus:bg-white focus:border-rose-500 outline-none"
                  placeholder="ระบุข้อเท็จจริง เช่น ตรวจพบของ/อะไหล่ส่งถึงไซต์งานแล้ว แต่งานไม่มีความคืบหน้า..."
                  value={sMod.reason}
                  onChange={(e) => setSMod({ ...sMod, reason: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          {sMod.type === 'issue' && (
            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-bold text-rose-600">
                  สาเหตุที่ติดปัญหา หรือ อะไหล่ที่รอ (บังคับระบุ) *
                </label>
                <textarea
                  rows="3"
                  className="w-full border border-rose-300 rounded p-2 text-sm resize-none bg-rose-50 focus:ring-1 focus:ring-rose-500 outline-none"
                  placeholder="ระบุรายละเอียดสาเหตุที่ติดปัญหา หรือชิ้นส่วนอะไหล่ที่รอ..."
                  value={sMod.reason}
                  onChange={(e) => setSMod({ ...sMod, reason: e.target.value })}
                />
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-[11px] text-rose-800 flex items-start gap-1.5">
                <span className="text-rose-600 font-bold shrink-0">📧</span>
                <span>เมื่อกดยืนยัน <strong>ระบบจะส่งอีเมลแจ้งเตือนผู้ดูแลโครงการทันที</strong></span>
              </div>
            </div>
          )}

          {sMod.type === 'postpone' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-amber-600">วันที่ขอเลื่อนจบไปใหม่ *</label>
                <input
                  type="date"
                  className="w-full border border-amber-300 rounded p-2 text-sm bg-amber-50 focus:ring-1 focus:ring-amber-500 outline-none"
                  value={sMod.postponeDate}
                  onChange={(e) => setSMod({ ...sMod, postponeDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-amber-600">สาเหตุที่ขอเลื่อนวันจบ (บังคับระบุ) *</label>
                <textarea
                  rows="2"
                  className="w-full border border-amber-300 rounded p-2 text-sm resize-none bg-amber-50 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="ระบุสาเหตุที่จำเป็นต้องเลื่อนวันจบงาน..."
                  value={sMod.reason}
                  onChange={(e) => setSMod({ ...sMod, reason: e.target.value })}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800 flex items-start gap-1.5">
                <span className="text-amber-600 font-bold shrink-0">📧</span>
                <span>เมื่อกดยืนยัน <strong>ระบบจะส่งอีเมลแจ้งเตือนผู้ดูแลโครงการทันที</strong></span>
              </div>
            </div>
          )}

          {(sMod.type === 'progress' || sMod.type === 'pending') && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                หมายเหตุเพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                rows="2"
                className="w-full border rounded p-2 text-sm resize-none bg-gray-50 focus:bg-white outline-none"
                placeholder={
                  sMod.type === 'progress'
                    ? (sMod.isHoldResume ? 'ระบุการแก้ไขปัญหา หรือการได้รับอะไหล่...' : 'ระบุหมายเหตุการดำเนินงาน...')
                    : 'ระบุสาเหตุที่รอดำเนินการ...'
                }
                value={sMod.reason || ''}
                onChange={(e) => setSMod({ ...sMod, reason: e.target.value })}
              />
            </div>
          )}

          {sMod.type === 'complete' && (
            <div className="space-y-3">
              {sMod.isOverdue && (
                <div>
                  <label className="text-xs font-bold text-red-500">
                    สาเหตุที่จบงานช้ากว่ากำหนด (บังคับ) *
                  </label>
                  <textarea
                    rows="2"
                    className="w-full border rounded p-2 text-sm resize-none bg-red-50"
                    placeholder="ระบุเหตุผลที่งานล่าช้า..."
                    value={sMod.overdueReason}
                    onChange={(e) => setSMod({ ...sMod, overdueReason: e.target.value })}
                  />
                </div>
              )}
              {sMod.isLateWO && !sMod.noWO && (
                <div className="p-3 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-2.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                    <span>⚠️</span>
                    <span>เปิดใบงานล่าช้ากว่ากำหนด ({sMod.lateWODays || '>3'} วัน นับจากวันจบงานหน้างาน)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    เนื่องจากเปิดใบงานช้าเกิน 3 วัน SLA ระบบต้องบันทึกสาเหตุและกำหนดผู้รับผิดชอบตามเกณฑ์ RACI เพื่อใช้ประเมินศักยภาพ:
                  </p>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      เลือกหมวดหมู่สาเหตุความล่าช้า:
                    </label>
                    <select
                      className="w-full border border-amber-300 rounded-lg p-2 text-xs bg-white text-slate-800 outline-none"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'boq') {
                          setSMod({
                            ...sMod,
                            lateWOReason: 'รอ BOQ / รายการราคา / ถอดแบบจากช่างหรือโฟร์แมน',
                            lateWOResponsibleRole: 'foreman'
                          });
                        } else if (val === 'admin_delay') {
                          setSMod({
                            ...sMod,
                            lateWOReason: 'แอดมินออกเลขล่าช้า / ติดคิวระบบเอกสารโครงการ',
                            lateWOResponsibleRole: 'admin'
                          });
                        } else if (val === 'customer_wait') {
                          setSMod({
                            ...sMod,
                            lateWOReason: 'รอนัดหมายหรือข้อมูลเพิ่มเติมจากลูกค้า/นิติบุคคล',
                            lateWOResponsibleRole: 'waived'
                          });
                        }
                      }}
                    >
                      <option value="">-- เลือกสาเหตุมาตรฐาน --</option>
                      <option value="boq">🛠️ รอ BOQ / ราคา / สเปกจากช่าง (รับผิดชอบ: Foreman)</option>
                      <option value="admin_delay">📋 แอดมินออกเลขช้า / ติดคิวเอกสาร (รับผิดชอบ: Admin)</option>
                      <option value="customer_wait">🛡️ รอนิติ/ลูกค้าแจ้งข้อมูล (เหตุสุดวิสัย: ยกเว้น)</option>
                      <option value="other">✏️ อื่นๆ (ระบุเองด้านล่าง)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-900 block mb-1">
                      ระบุคำชี้แจง / เหตุผลความล่าช้า (บังคับ) *
                    </label>
                    <textarea
                      rows="2"
                      className="w-full border border-amber-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-amber-500 outline-none"
                      placeholder="ระบุสาเหตุ เช่น รอช่างสรุปราคา BOQ, หรือ แอดมินติดงานปิดงวด..."
                      value={sMod.lateWOReason || ''}
                      onChange={(e) => setSMod({ ...sMod, lateWOReason: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      ผู้รับผิดชอบหลักในการหักคะแนน RACI:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: 'foreman', label: '🛠️ Foreman', desc: 'ช่าง/BOQ' },
                        { id: 'admin', label: '📋 Admin', desc: 'ธุรการ/ออกเลข' },
                        { id: 'shared', label: '🤝 ร่วมกัน (50/50)', desc: 'สองฝ่าย' },
                        { id: 'waived', label: '🛡️ ยกเว้น', desc: 'เหตุสุดวิสัย' }
                      ].map((item) => {
                        const isSelected = (sMod.lateWOResponsibleRole || 'foreman') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSMod({ ...sMod, lateWOResponsibleRole: item.id })}
                            className={`p-1.5 rounded-lg border text-center transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50 text-[10.5px]'
                            }`}
                          >
                            <span className="block text-[11px] leading-tight">{item.label}</span>
                            <span className="block text-[9px] opacity-80">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-green-700">
                  เลขที่ใบงาน (บังคับ: อักษร 2 ตัว-เลข 3 ตัว-เลข 7 ตัว) *
                </label>
                <input
                  type="text"
                  placeholder="ตัวอย่าง: LH-123-1234567"
                  disabled={sMod.noWO}
                  className={`w-full border rounded p-2 text-sm uppercase ${
                    sMod.noWO
                      ? 'bg-gray-100 border-gray-300 text-gray-400'
                      : 'bg-green-50 border-green-300'
                  }`}
                  value={sMod.workOrderNo}
                  onChange={(e) =>
                    setSMod({ ...sMod, workOrderNo: e.target.value.toUpperCase() })
                  }
                />

                {!sMod.forceWO && (
                  <label className="flex items-start mt-3 text-xs text-gray-700 bg-gray-50 p-2 rounded border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sMod.noWO}
                      onChange={(e) =>
                        setSMod({ ...sMod, noWO: e.target.checked, workOrderNo: '' })
                      }
                      className="mt-0.5 mr-2 accent-[#0f2e4a]"
                    />
                    <span>
                      ขอจบงานโดยยังไม่ใส่เลขที่ใบงาน
                      <br />
                      <span className="text-red-500 font-bold text-[10px]">
                        (ต้องกลับมาใส่ภายใน 3 วัน ไม่เช่นนั้นระบบจะประทับตรา "ออกใบงานช้า")
                      </span>
                    </span>
                  </label>
                )}

                {!sMod.forceWO && !sMod.noWO && !sMod.workOrderNo?.trim() && (
                  <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5 animate-fadeIn">
                    <span className="text-amber-600 font-bold shrink-0">💡</span>
                    <span>
                      หากยังไม่มีเลขใบงาน ให้<strong>ติ๊กถูกที่ช่องสี่เหลี่ยมด้านบน</strong> เพื่อขอจบงานหน้างานก่อนได้ครับ
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions with 21st.dev Swipe-to-Confirm */}
        <div className="mt-5 space-y-2">
          <SwipeButton
            onConfirm={handleConfirmClick}
            text={
              sMod.type === 'complete'
                ? 'สไลด์เพื่อยืนยันจบงาน'
                : sMod.type === 'cancel'
                ? 'สไลด์เพื่อยืนยันยกเลิกงาน'
                : sMod.type === 'penalty_spare_part'
                ? 'สไลด์เพื่อตัดคะแนนวินัย'
                : sMod.type === 'issue'
                ? 'สไลด์เพื่อบันทึกรออะไหล่'
                : sMod.type === 'postpone' || sMod.type === 'postpone_start'
                ? 'สไลด์เพื่อยืนยันเลื่อนวัน'
                : sMod.type === 'progress'
                ? (sMod.isHoldResume ? 'สไลด์เพื่อดำเนินการต่อ' : 'สไลด์เพื่อเริ่มดำเนินการ')
                : 'สไลด์เพื่อยืนยัน'
            }
            successText="บันทึกข้อมูลเรียบร้อย..."
            variant={
              sMod.type === 'complete'
                ? 'success'
                : sMod.type === 'cancel' || sMod.type === 'penalty_spare_part'
                ? 'danger'
                : sMod.type === 'issue'
                ? 'warning'
                : 'primary'
            }
          />

          <div className="flex items-center justify-between px-1 text-xs pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-700 py-1 transition cursor-pointer font-medium"
            >
              ยกเลิก / ปิดหน้าต่าง
            </button>
            <span className="text-[11px] text-slate-400 font-normal">
              ลากไปขวา หรือ Spacebar
            </span>
          </div>
        </div>
    </ResponsiveDrawer>
  );
}
