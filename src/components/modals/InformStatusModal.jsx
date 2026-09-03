import React from 'react';

export default function InformStatusModal({
  isOpen,
  onClose,
  onConfirm,
  iMod,
  setIMod
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm">
        <h3
          className={`font-bold mb-3 ${
            iMod.type === 'cancel' ? 'text-red-500' : 'text-green-500'
          }`}
        >
          {iMod.type === 'cancel' ? 'ยกเลิกแจ้งงาน' : 'เปิดงาน'}
        </h3>
        {iMod.type === 'open' ? (
          <input
            placeholder="เลข Inform..."
            className="w-full border rounded p-2 text-sm uppercase"
            value={iMod.val}
            onChange={(e) => setIMod({ ...iMod, val: e.target.value })}
          />
        ) : (
          <textarea
            placeholder="เหตุผล..."
            className="w-full border rounded p-2 text-sm resize-none"
            value={iMod.val}
            onChange={(e) => setIMod({ ...iMod, val: e.target.value })}
          />
        )}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 p-2 text-xs rounded font-bold"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!iMod.val.trim()}
            className="flex-1 bg-[#0f2e4a] text-white p-2 text-xs rounded font-bold disabled:opacity-50"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
