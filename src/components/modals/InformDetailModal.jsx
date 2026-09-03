import React from 'react';

export default function InformDetailModal({
  inform,
  onClose,
  fDate,
  Icon
}) {
  if (!inform) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0f2e4a] p-4 flex justify-between text-white">
          <h3 className="font-bold flex items-center">
            <Icon name="search" size={16} className="mr-2" /> รายละเอียดรับแจ้ง
          </h3>
          <button type="button" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs border-b pb-3">
            <div>
              <span className="text-gray-400 font-bold">วันที่แจ้ง</span>
              <br />
              <span className="font-bold text-gray-800">{fDate ? fDate(inform.date) : inform.date}</span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">รหัสอ้างอิง</span>
              <br />
              <span className="font-bold text-gray-800">{inform.id}</span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">ผู้แจ้ง</span>
              <br />
              <span className="font-bold text-gray-800">{inform.requesterName}</span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">เบอร์ติดต่อ</span>
              <br />
              <span className="font-bold text-gray-800">{inform.phone || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">โครงการ</span>
              <br />
              <span className="font-bold text-[#bca374]">{inform.project}</span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">พื้นที่</span>
              <br />
              <span className="font-bold text-gray-800">{inform.area}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs mb-2">
            <div>
              <span className="text-gray-400 font-bold">ประเภทงาน</span>
              <br />
              <span className="font-bold text-[#0f2e4a]">{inform.jobType || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">บริเวณ</span>
              <br />
              <span className="font-bold text-[#0f2e4a]">{inform.location || '-'}</span>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border text-sm shadow-inner">
            <span className="text-gray-500 font-bold text-xs mb-1 block">รายละเอียด:</span>
            <div className="whitespace-pre-wrap text-gray-700">{inform.details || '-'}</div>
          </div>
          <div className="text-right pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 px-6 py-2 rounded-lg text-sm font-bold w-full hover:bg-gray-300 transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
