import React from 'react';

export default function BillingModal({
  isOpen,
  onClose,
  group,
  type,
  onMoveGroup,
  currentMonth,
  getStdProj,
  fDate,
  Icon
}) {
  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] animate-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div
          className={`p-4 flex justify-between text-white ${
            type === 'ส่งเบิกแล้ว' ? 'bg-green-700' : 'bg-[#0f2e4a]'
          }`}
        >
          <h3 className="font-bold flex items-center">
            <Icon name="fileText" size={18} className="mr-2" />
            {group.isWO && group.woNo
              ? `รายละเอียดใบงาน: ${group.woNo}`
              : `รายละเอียด JOB: ${group.tasks[0]?.id}`}
          </h3>
          <button type="button" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 bg-gray-50/50">
          <div className="mb-4">
            <div className="text-sm text-gray-500 font-bold mb-1">โครงการ</div>
            <div className="text-lg font-black text-[#0f2e4a]">{getStdProj(group.project)}</div>
          </div>

          <div className="space-y-4">
            {group.tasks.map((t, i) => {
              const isCompleteOnTime = !t.overdueStatus || t.overdueStatus === 'ในกำหนด';
              const isOpenedLate = t.lateWorkOrder || t.overdueStatus === 'ออกใบงานช้า';
              return (
                <div key={t.id} className="bg-white border rounded-lg p-4 shadow-sm relative">
                  <div className="absolute top-0 right-0 bg-gray-100 text-gray-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
                    #{i + 1}
                  </div>

                  <div className="text-xs text-gray-400 mb-1">ID: {t.id}</div>
                  <div className="text-sm font-medium text-gray-800 mb-3">{t.details}</div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t pt-3 mt-3">
                    <div>
                      <div className="text-gray-500 mb-0.5">วันที่บันทึก</div>
                      <div className="font-bold">{fDate(t.receivedDate)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">กำหนดเสร็จ</div>
                      <div className="font-bold">{fDate(t.endDate)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">สถานะใบงาน</div>
                      <div className={`font-bold ${isOpenedLate ? 'text-red-600' : 'text-green-600'}`}>
                        {isOpenedLate ? 'ออกล่าช้า' : 'ปกติ'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">สถานะจบงาน</div>
                      <div
                        className={`font-bold flex items-center ${
                          isCompleteOnTime ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isCompleteOnTime ? (
                          <Icon name="checkCircle" size={14} className="mr-1" />
                        ) : (
                          <Icon name="alertCircle" size={14} className="mr-1" />
                        )}
                        {isCompleteOnTime ? 'ในกำหนด' : 'ล่าช้า'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-gray-100 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50"
          >
            ปิดหน้าต่าง
          </button>
          {type === 'รอส่งเบิก' ? (
            <button
              type="button"
              onClick={() => onMoveGroup(group.id, 'ส่งเบิกแล้ว')}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-md flex items-center hover:bg-green-700"
            >
              <Icon name="check" size={16} className="mr-2" /> ยืนยันการส่งเบิก (เดือน {currentMonth})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onMoveGroup(group.id, 'รอส่งเบิก')}
              className="px-6 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm font-bold shadow-sm flex items-center hover:bg-red-200"
            >
              <Icon name="rotateCcw" size={16} className="mr-2" /> ยกเลิกการส่งเบิก
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
