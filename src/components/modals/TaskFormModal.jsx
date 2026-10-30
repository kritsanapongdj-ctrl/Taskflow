import React, { useMemo } from 'react';
import { detectSlaCategory, detectAllSlaCategories, isSlaMismatch } from '../../utils/slaDetector.js';
import SearchableSlaSelect from '../ui/SearchableSlaSelect.jsx';

export default function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  taskForm,
  setTaskForm,
  eTask,
  REQ_TYPES = [],
  sets = {},
  getProjName,
  getProjArea,
  checkStaffMatch,
  showStartReason,
  setShowStartReason,
  sRsn,
  setSReason,
  frequentCategories = [],
  Icon
}) {
  const detectedSlas = useMemo(() => {
    return detectAllSlaCategories(taskForm.details, sets.slas || [], 3);
  }, [taskForm.details, sets.slas]);

  const primaryDetectedSla = detectedSlas[0] || { hasMatch: false };
  const hasMismatch = isSlaMismatch(primaryDetectedSla, taskForm.slaCategory);

  const handleSlaSelect = (catName, days) => {
    let newEndDate = taskForm.endDate;
    const numDays = typeof days === 'number' ? days : parseInt(days, 10);
    if (!isNaN(numDays) && numDays > 0) {
      const sDate = new Date(taskForm.startDate || new Date());
      sDate.setDate(sDate.getDate() + (numDays - 1));
      const y = sDate.getFullYear();
      const m = String(sDate.getMonth() + 1).padStart(2, '0');
      const d = String(sDate.getDate()).padStart(2, '0');
      newEndDate = `${y}-${m}-${d}`;
    }
    setTaskForm({
      ...taskForm,
      slaCategory: catName,
      endDate: newEndDate
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-[#0f2e4a] p-4 flex justify-between text-white">
          <h3 className="font-bold">{eTask ? 'แก้ไข' : 'เพิ่ม'}งานประจำวัน</h3>
          <button
            type="button"
            aria-label="ปิด"
            onClick={() => {
              onClose();
              setSReason('');
              setShowStartReason(false);
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-3 max-h-[70vh] overflow-auto overscroll-contain">
          <div>
            <label className="text-[10px] font-bold text-gray-500">
              วันที่รับเรื่อง (ห้ามแก้ไขย้อนหลัง)
            </label>
            <input
              type="date"
              required
              value={taskForm.receivedDate}
              onChange={(e) => setTaskForm({ ...taskForm, receivedDate: e.target.value })}
              disabled={!!eTask}
              className="w-full border rounded p-2 text-sm bg-gray-50"
            />
          </div>
          <textarea
            required
            value={taskForm.details}
            onChange={(e) => setTaskForm({ ...taskForm, details: e.target.value })}
            rows="2"
            placeholder="รายละเอียดงาน..."
            className="w-full border rounded p-2 text-sm outline-none"
          />

          {/* Smart SLA Keyword Detection Banner & Multi-Match Chips */}
          {detectedSlas.length > 0 && (
            hasMismatch ? (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-2.5 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-start gap-2 text-xs text-amber-950">
                  <span className="text-amber-600 text-sm mt-0.5">💡</span>
                  <div className="flex-1">
                    <strong className="font-bold block text-amber-900">
                      ตรวจพบคีย์เวิร์ดเข้าข่ายหมวด SLA ({detectedSlas.length} รายการที่ตรง):
                    </strong>
                    <div className="text-[10px] text-amber-700 mt-0.5">
                      คำที่พบ: "{primaryDetectedSla.matchedKeyword}"
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {detectedSlas.map((match) => (
                    <button
                      key={match.detectedCategory}
                      type="button"
                      onClick={() => handleSlaSelect(match.detectedCategory, match.slaDays)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-amber-300 hover:border-amber-500 hover:bg-amber-100/70 text-amber-950 shadow-2xs transition cursor-pointer"
                    >
                      <span>⚡ {match.detectedCategory}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                        {match.slaDays} วัน
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-emerald-800 animate-in fade-in duration-200">
                <span>✅</span>
                <span>หมวด SLA ตรงกับคีย์เวิร์ดหน้างาน: <strong>{primaryDetectedSla.detectedCategory} ({primaryDetectedSla.slaDays} วัน)</strong></span>
              </div>
            )
          )}

          <div>
            <label className="text-[10px] font-bold text-gray-500 mb-1 block">
              ผู้แจ้ง <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={taskForm.requester}
              onChange={(e) => setTaskForm({ ...taskForm, requester: e.target.value })}
              className="w-full border rounded p-2 text-sm bg-white"
            >
              <option value="">ผู้แจ้ง...</option>
              {REQ_TYPES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-gray-500">
                หมวดงาน SLA / กรอบเวลาส่งมอบ <span className="text-red-500">*</span>
              </label>
              <span className="text-[9px] text-gray-400">เลือกเพื่อคำนวณวันเสร็จอัตโนมัติ</span>
            </div>
            <SearchableSlaSelect
              value={taskForm.slaCategory}
              onChange={handleSlaSelect}
              slas={sets.slas || []}
              getProjName={getProjName}
              getProjArea={getProjArea}
              frequentCategories={frequentCategories}
              placeholder="--- ค้นหาหรือเลือกหมวด SLA ---"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 mb-1 block">
              เจ้าหน้าที่ดูแลโครงการ (ตัวกรองโครงการ)
            </label>
            <select
              value={taskForm.staffName}
              onChange={(e) =>
                setTaskForm({ ...taskForm, staffName: e.target.value, project: '', area: '' })
              }
              className="w-full border rounded p-2 text-sm bg-blue-50"
            >
              <option value="">ทุกเจ้าหน้าที่ (ไม่กรอง)</option>
              {Array.from(
                new Set([
                  ...(sets.emails || []).flatMap(e => {
                    const parts = e.split('|');
                    const rawName = (parts[2] || parts[0].split('@')[0] || '').trim();
                    return rawName.split(/[,/]/).map(n => n.trim()).filter(Boolean);
                  }),
                  ...(sets.staffStats || []).flatMap(s => {
                    const rawName = (s.name || '').trim();
                    return rawName.split(/[,/]/).map(n => n.trim()).filter(Boolean);
                  })
                ])
              )
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, 'th'))
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-2">
            <select
              required
              value={taskForm.project}
              onChange={(e) => {
                const p = (sets.projects || []).find((x) => getProjName(x) === e.target.value);
                setTaskForm({
                  ...taskForm,
                  project: e.target.value,
                  area: getProjArea(p)
                });
              }}
              className="w-2/3 border rounded p-2 text-sm"
            >
              <option value="">โครงการ (เลือกเพื่อดึงพื้นที่)...</option>
              {(sets.projects || [])
                .filter(
                  (p) =>
                    !taskForm.staffName ||
                    checkStaffMatch(getProjName(p), taskForm.staffName)
                )
                .map((p) => (
                  <option key={p} value={getProjName(p)}>
                    {getProjName(p)}
                  </option>
                ))}
            </select>
            <input
              type="text"
              readOnly
              value={taskForm.area}
              placeholder="พื้นที่..."
              className="w-1/3 border rounded p-2 text-sm bg-gray-100"
            />
          </div>

          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="text-[10px] font-bold">เริ่มงาน</label>
              <input
                type="date"
                required
                value={taskForm.startDate}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  let newEndDate = taskForm.endDate;
                  if (taskForm.slaCategory) {
                    const slaItem = (sets.slas || []).find((s) => getProjName(s) === taskForm.slaCategory);
                    if (slaItem) {
                      const days = parseInt(getProjArea(slaItem), 10);
                      if (!isNaN(days) && days > 0 && newStartDate) {
                        const sDate = new Date(newStartDate);
                        sDate.setDate(sDate.getDate() + (days - 1));
                        const y = sDate.getFullYear();
                        const m = String(sDate.getMonth() + 1).padStart(2, '0');
                        const d = String(sDate.getDate()).padStart(2, '0');
                        newEndDate = `${y}-${m}-${d}`;
                      }
                    }
                  }
                  setTaskForm({ ...taskForm, startDate: newStartDate, endDate: newEndDate });
                  if (eTask) setShowStartReason(newStartDate !== eTask.startDate);
                }}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
            <div className="w-1/2">
              <label className="text-[10px] font-bold">กำหนดเสร็จ</label>
              <input
                type="date"
                required
                value={taskForm.endDate}
                onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
          </div>

          {showStartReason && (
            <div className="mt-2 animate-in">
              <label className="text-[10px] font-bold text-sky-700">
                หมายเหตุการเปลี่ยนวันเริ่มงาน (ถ้ามี)
              </label>
              <textarea
                value={sRsn}
                onChange={(e) => setSReason(e.target.value)}
                rows="2"
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)..."
                className="w-full border border-sky-300 rounded p-2 text-sm outline-none bg-sky-50 focus:bg-white"
              />
              <p className="text-[10px] text-sky-600 mt-0.5">ℹ️ เลื่อนวันเริ่มงานได้ทันทีโดยไม่ต้องส่งอีเมลแจ้งผู้ดูแล</p>
            </div>
          )}
          <div className="text-right mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                setSReason('');
                setShowStartReason(false);
              }}
              className="bg-gray-200 px-4 py-2 rounded text-sm font-bold flex-1"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="bg-[#0f2e4a] text-white px-4 py-2 rounded text-sm font-bold flex-1 disabled:opacity-50"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
