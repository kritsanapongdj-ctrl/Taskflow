import React from 'react';

export default function DailyTasksTab({
  tasks = [],
  gFilt,
  getTStr,
  getStdProj,
  checkStaffMatch,
  chkOvdTimeAware,
  fDate,
  openTaskModal,
  initSt,
  deleteTask,
  Icon
}) {
  const tD = gFilt.date;
  const vT = tasks.filter(
    (t) =>
      t.status !== 'ยกเลิก' &&
      (gFilt.area === 'ทั้งหมด' || t.area === gFilt.area) &&
      (gFilt.project === 'ทั้งหมด' || getStdProj(t.project) === gFilt.project) &&
      checkStaffMatch(t.project, gFilt.staffName) &&
      ((tD >= t.startDate && tD <= t.endDate) ||
        (!t.status?.startsWith('จบงาน') && chkOvdTimeAware(t, tD) && tD === getTStr()))
  );

  return (
    <div className="space-y-4 animate-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#0f2e4a]">งานประจำวัน</h2>
        <button
          type="button"
          onClick={() => openTaskModal()}
          className="bg-[#0f2e4a] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-[#1a3f63] transition"
        >
          <Icon name="plus" size={16} className="mr-2" /> เพิ่มงาน
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
            <tr>
              <th className="p-4">รายละเอียด</th>
              <th className="p-4">โครงการ</th>
              <th className="p-4">ระยะเวลา</th>
              <th className="p-4">สถานะ</th>
              <th className="p-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {vT.map((t) => {
              const od = chkOvdTimeAware(t, getTStr());
              return (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{t.details}</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex gap-1 items-center">
                      <span>
                        {t.id} | {t.requester}
                      </span>
                      {t.workOrderNo && (
                        <span className="bg-blue-50 text-blue-600 px-1 rounded">
                          WO:{t.workOrderNo}
                        </span>
                      )}
                      {t.overdueStatus === 'เกินกำหนด' && (
                        <span className="text-red-500 px-1 border border-red-200 rounded">
                          {t.overdueStatus}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-[#bca374]">
                    {getStdProj(t.project)}
                    <div className="text-xs text-gray-400 font-normal">{t.area}</div>
                  </td>
                  <td className="p-4 text-xs text-gray-600">
                    เริ่ม: {fDate(t.startDate)}
                    <br />
                    <span
                      className={
                        od && !t.status?.startsWith('จบงาน') ? 'text-red-500 font-bold' : ''
                      }
                    >
                      จบ: {fDate(t.endDate)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold ${
                        t.status?.startsWith('จบงาน')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : t.status === 'จบงาน(รอใบงาน)'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      <select
                        value={t.status}
                        onChange={(e) => initSt(t.id, e.target.value)}
                        className="border rounded text-xs p-1 outline-none bg-gray-50"
                      >
                        <option value="อยู่ระหว่างดำเนินการ">ดำเนินการ</option>
                        <option value="เลื่อนงาน">เลื่อนงาน</option>
                        <option value="จบงาน">จบงาน</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const pwd = prompt('กรุณาใส่รหัสผ่านเพื่อแก้ไขข้อมูล:');
                          if (pwd !== '131236') return alert('รหัสผ่านไม่ถูกต้อง!');
                          openTaskModal(t);
                        }}
                        className="text-gray-400 hover:text-[#0f2e4a] p-1 bg-gray-100 rounded hover:bg-gray-200"
                        title="แก้ไขงาน"
                      >
                        <Icon name="edit2" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(t)}
                        className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded hover:bg-red-100"
                        title="ลบงาน"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {vT.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-400">
                  ไม่มีงาน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
