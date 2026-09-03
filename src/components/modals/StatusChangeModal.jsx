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
    ((sMod.type === 'cancel' || sMod.type === 'postpone') && !sMod.reason.trim()) ||
    (sMod.type === 'complete' && !sMod.noWO && !sMod.workOrderNo.trim()) ||
    (sMod.type === 'complete' && sMod.isOverdue && !sMod.overdueReason.trim());

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3
          className={`font-bold text-lg mb-3 ${
            sMod.type === 'cancel'
              ? 'text-red-500'
              : sMod.type === 'postpone'
              ? 'text-amber-500'
              : 'text-green-500'
          }`}
        >
          {sMod.type === 'cancel'
            ? 'ยกเลิกงาน'
            : sMod.type === 'postpone'
            ? 'เลื่อนวันจบงาน'
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
          {sMod.type === 'postpone' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-amber-600">วันที่ขอเลื่อนไป *</label>
                <input
                  type="date"
                  className="w-full border rounded p-2 text-sm bg-amber-50"
                  value={sMod.postponeDate}
                  onChange={(e) => setSMod({ ...sMod, postponeDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-amber-600">เหตุผลที่ขอเลื่อน *</label>
                <textarea
                  rows="2"
                  className="w-full border rounded p-2 text-sm resize-none bg-amber-50"
                  placeholder="ระบุเหตุผล..."
                  value={sMod.reason}
                  onChange={(e) => setSMod({ ...sMod, reason: e.target.value })}
                />
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
