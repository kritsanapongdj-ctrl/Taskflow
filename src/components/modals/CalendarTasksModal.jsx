import React from 'react';

export default function CalendarTasksModal({
  isOpen,
  onClose,
  date,
  tasks = [],
  onManageDate,
  fDate,
  chkOvdTimeAware,
  getTStr,
  Icon
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="font-bold text-[#0f2e4a] flex items-center">
            <Icon name="calendar" size={18} className="mr-2 text-[#bca374]" />
            งานประจำวันที่ {fDate(date)}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="overflow-auto space-y-2 flex-1 pr-1 hide-scrollbar">
          {tasks.map((t) => {
            const isOvd = t.overdueStatus === 'เกินกำหนด' || chkOvdTimeAware(t, getTStr());
            return (
              <div
                key={t.id}
                className="p-3 border border-blue-100 bg-blue-50/30 rounded-lg flex justify-between items-center hover:bg-blue-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-sm text-[#0f2e4a]">{t.project}</div>
                  <div className="text-xs text-gray-600 line-clamp-1">{t.details}</div>
                  <div className="text-[10px] mt-1 font-bold">
                    <span className="text-gray-400">ID: {t.id}</span>
                    <span className="mx-1 text-gray-300">|</span>
                    <span
                      className={
                        t.status === 'จบงาน'
                          ? 'text-green-600'
                          : isOvd
                          ? 'text-red-600'
                          : 'text-amber-600'
                      }
                    >
                      สถานะ: {t.status} {isOvd && t.status !== 'จบงาน' ? '(เกินกำหนด)' : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onManageDate(date)}
                  className="bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded text-[10px] font-bold shadow-sm hover:bg-blue-100 whitespace-nowrap ml-2"
                >
                  จัดการงาน
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
