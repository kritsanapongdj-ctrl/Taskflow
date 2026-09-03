import React from 'react';

export default function OverdueTasksModal({ isOpen, onClose, tasks = [], currentMonth, onManageTask, fDate, Icon }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="font-bold text-red-600 flex items-center">
            <Icon name="alertTriangle" size={18} className="mr-2" />
            งานล่าช้า/เกินกำหนด (ประจำเดือน {currentMonth})
          </h3>
          <button type="button" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="overflow-auto space-y-2 flex-1">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="p-3 border border-red-100 bg-red-50/50 rounded-lg flex justify-between items-center"
            >
              <div>
                <div className="font-bold text-sm text-[#0f2e4a]">{t.project}</div>
                <div className="text-xs text-gray-600">{t.details}</div>
                <div className="text-[10px] text-red-500 mt-1 font-bold">
                  ID: {t.id} | จบ: {fDate(t.endDate)} | สถานะ: {t.status}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onManageTask(t)}
                className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded text-[10px] font-bold shadow-sm"
              >
                จัดการ
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
