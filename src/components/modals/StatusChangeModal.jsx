import React from 'react';

export default function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  sMod,
  setSMod,
  getTStr
}) {
  if (!isOpen) return null;

  const isConfirmDisabled =
    (sMod.type === 'postpone_start' && !sMod.postponeStartDate) ||
    ((sMod.type === 'cancel' || sMod.type === 'postpone' || sMod.type === 'issue') && !sMod.reason.trim()) ||
    (sMod.type === 'postpone' && !sMod.postponeDate) ||
    (sMod.type === 'complete' && !sMod.noWO && !sMod.workOrderNo.trim()) ||
    (sMod.type === 'complete' && sMod.isOverdue && !sMod.overdueReason.trim());

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3
          className={`font-bold text-lg mb-3 ${
            sMod.type === 'cancel'
              ? 'text-red-500'
              : sMod.type === 'postpone_start'
              ? 'text-sky-600'
              : sMod.type === 'postpone'
              ? 'text-amber-600'
              : sMod.type === 'issue'
              ? 'text-rose-600'
              : 'text-green-500'
          }`}
        >
          {sMod.type === 'cancel'
            ? 'ยกเลิกงาน'
            : sMod.type === 'postpone_start'
            ? '📅 เลื่อนวันเริ่มงาน'
            : sMod.type === 'postpone'
            ? '📅 เลื่อนวันจบงาน'
            : sMod.type === 'issue'
            ? '⚠️ รออะไหล่ / ติดปัญหา'
            : 'ยืนยันจบงาน'}
        </h3>
        <div className="space-y-3">
          {sMod.type === 'cancel' && (
            <div>
              <label className="text-xs font-bold text-red-500">เหตุผลบังคับ *</label>
              <textarea
                rows="2"
                className="w-full border rounded p-2 text-sm resize-none bg-red-50"
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
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              setSMod({
                ...sMod,
                isOpen: false,
                noWO: false,
                forceWO: false,
                isOverdue: false,
                overdueReason: '',
                postponeDate: getTStr ? getTStr() : ''
              });
            }}
            className="flex-1 bg-gray-100 p-2 text-xs font-bold rounded"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="flex-1 bg-[#0f2e4a] text-white p-2 text-xs font-bold rounded disabled:opacity-50 shadow-sm active:scale-95 transition-all"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
