import React from 'react';

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
  Icon
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-[#0f2e4a] p-4 flex justify-between text-white">
          <h3 className="font-bold">{eTask ? 'แก้ไข' : 'เพิ่ม'}งานประจำวัน</h3>
          <button
            type="button"
            onClick={() => {
              onClose();
              setSReason('');
              setShowStartReason(false);
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-3 max-h-[70vh] overflow-auto">
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

          <div className="flex gap-2">
            <select
              required
              value={taskForm.requester}
              onChange={(e) => setTaskForm({ ...taskForm, requester: e.target.value })}
              className="w-1/2 border rounded p-2 text-sm"
            >
              <option value="">ผู้แจ้ง...</option>
              {REQ_TYPES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select
              value={taskForm.slaCategory}
              onChange={(e) => setTaskForm({ ...taskForm, slaCategory: e.target.value })}
              className="w-1/2 border rounded p-2 text-sm"
            >
              <option value="">--- กรุณาเลือกหมวด SLA ---</option>
              <option value="งานทั่วไป (ไม่มี SLA)">งานทั่วไป (ไม่มี SLA)</option>
              {(sets.slas || []).map((s) => (
                <option key={s} value={getProjName(s)}>
                  {getProjName(s)} ({getProjArea(s)} วัน)
                </option>
              ))}
            </select>
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
                new Set(
                  (sets.emails || []).map(
                    (e) => e.split('|')[2] || e.split('|')[0].split('@')[0]
                  )
                )
              )
                .filter(Boolean)
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
                  setTaskForm({ ...taskForm, startDate: e.target.value });
                  if (eTask) setShowStartReason(e.target.value !== eTask.startDate);
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
              <label className="text-[10px] font-bold text-red-500">
                เหตุผลที่เลื่อนวันเริ่ม (บังคับ) *
              </label>
              <textarea
                required
                value={sRsn}
                onChange={(e) => setSReason(e.target.value)}
                rows="2"
                className="w-full border border-red-300 rounded p-2 text-sm outline-none bg-red-50"
              />
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
              disabled={showStartReason && !sRsn.trim()}
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
