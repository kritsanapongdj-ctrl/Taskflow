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

  const handleEdit = (t) => {
    const pwd = prompt('กรุณาใส่รหัสผ่านเพื่อแก้ไขข้อมูล:');
    if (pwd !== '131236') return alert('รหัสผ่านไม่ถูกต้อง!');
    openTaskModal(t);
  };

  const getStatusBadge = (status) => {
    if (status?.startsWith('จบงาน')) {
      if (status === 'จบงาน(รอใบงาน)') {
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            จบงาน (รอใบงาน)
          </span>
        );
      }
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          จบงาน
        </span>
      );
    }
    if (status === 'ติดปัญหา/รออะไหล่') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          ติดปัญหา/รออะไหล่
        </span>
      );
    }
    if (status === 'รอดำเนินการ') {
      return (
        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          รอดำเนินการ
        </span>
      );
    }
    // Default / อยู่ระหว่างดำเนินการ / กำลังดำเนินการ
    return (
      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        กำลังดำเนินการ
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-[#0f2e4a]">งานประจำวัน</h2>
          <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
            {vT.length} งาน
          </span>
        </div>
        <button
          type="button"
          onClick={() => openTaskModal()}
          className="bg-[#0f2e4a] text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-md hover:bg-[#1a3f63] active:scale-95 transition cursor-pointer"
        >
          <Icon name="plus" size={16} className="mr-1.5" /> เพิ่มงาน
        </button>
      </div>

      {/* 1. Mobile View: Responsive Task Cards (width < 768px) */}
      <div className="block md:hidden space-y-3.5 pb-24">
        {vT.map((t) => {
          const od = chkOvdTimeAware(t, getTStr());
          const isOverdue = od && !t.status?.startsWith('จบงาน');
          const currentSelectVal =
            t.status === 'อยู่ระหว่างดำเนินการ' ? 'กำลังดำเนินการ' : t.status;

          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-3 hover:border-slate-300 transition"
            >
              {/* Project & Status Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[#bca374] text-base leading-snug break-words">
                    {getStdProj(t.project)}
                  </h3>
                  {t.area && (
                    <span className="inline-block text-[11px] text-slate-500 font-medium mt-0.5">
                      📍 {t.area}
                    </span>
                  )}
                </div>
                {getStatusBadge(t.status)}
              </div>

              {/* Task Details */}
              <div>
                <div className="text-sm font-semibold text-slate-800 leading-relaxed break-words">
                  {t.details}
                </div>
                <div className="text-[11px] text-slate-400 mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px]">
                    {t.id}
                  </span>
                  {t.requester && (
                    <span className="text-slate-500">
                      ผู้แจ้ง: {t.requester}
                    </span>
                  )}
                  {t.workOrderNo && (
                    <span className="bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded text-[10px] border border-blue-200">
                      WO: {t.workOrderNo}
                    </span>
                  )}
                </div>
              </div>

              {/* Duration & Overdue Status */}
              <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-600 border border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Icon name="calendar" size={14} className="text-slate-400 shrink-0" />
                  <span>
                    เริ่ม: <strong className="text-slate-700">{fDate(t.startDate)}</strong>
                  </span>
                  <span>—</span>
                  <span>
                    จบ:{' '}
                    <strong
                      className={
                        isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'
                      }
                    >
                      {fDate(t.endDate)}
                    </strong>
                  </span>
                </div>
                {isOverdue && (
                  <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-rose-200 shrink-0 animate-pulse">
                    เกินกำหนด
                  </span>
                )}
              </div>

              {/* Mobile Bottom Action Bar (Thumb-friendly >= 44px) */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <div className="flex-1">
                  <select
                    value={currentSelectVal}
                    onChange={(e) => initSt(t.id, e.target.value)}
                    className="w-full h-11 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white focus:border-[#0f2e4a] focus:ring-1 focus:ring-[#0f2e4a] outline-none shadow-xs"
                  >
                    <option value="รอดำเนินการ">⏳ รอดำเนินการ</option>
                    <option value="กำลังดำเนินการ">⚙️ กำลังดำเนินการ</option>
                    <option value="ติดปัญหา/รออะไหล่">⚠️ ติดปัญหา/รออะไหล่</option>
                    <option value="จบงาน">✅ จบงาน</option>
                    {t.status === 'จบงาน(รอใบงาน)' && (
                      <option value="จบงาน(รอใบงาน)">📋 จบงาน (รอใบงาน)</option>
                    )}
                    {t.status === 'เลื่อนงาน' && (
                      <option value="เลื่อนงาน">📅 เลื่อนงาน</option>
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleEdit(t)}
                  className="w-11 h-11 shrink-0 rounded-xl bg-slate-100 text-slate-600 hover:text-[#0f2e4a] hover:bg-slate-200 active:scale-95 flex items-center justify-center transition shadow-xs cursor-pointer"
                  title="แก้ไขงาน"
                >
                  <Icon name="edit2" size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => deleteTask(t)}
                  className="w-11 h-11 shrink-0 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 flex items-center justify-center transition shadow-xs cursor-pointer border border-rose-200"
                  title="ลบงาน"
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </div>
          );
        })}

        {vT.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
            <Icon name="clipboardCheck" size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">ไม่มีงานสำหรับวันนี้</p>
          </div>
        )}
      </div>

      {/* 2. Desktop View: Original Clean Table (width >= 768px) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-x-auto">
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
              const currentSelectVal =
                t.status === 'อยู่ระหว่างดำเนินการ' ? 'กำลังดำเนินการ' : t.status;

              return (
                <tr key={t.id} className="border-b hover:bg-gray-50/80 transition">
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{t.details}</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex gap-1.5 items-center">
                      <span>
                        {t.id} | {t.requester}
                      </span>
                      {t.workOrderNo && (
                        <span className="bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                          WO:{t.workOrderNo}
                        </span>
                      )}
                      {t.overdueStatus === 'เกินกำหนด' && (
                        <span className="text-red-500 px-1 border border-red-200 rounded font-bold">
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
                        od && !t.status?.startsWith('จบงาน')
                          ? 'text-red-500 font-bold'
                          : ''
                      }
                    >
                      จบ: {fDate(t.endDate)}
                    </span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(t.status)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <select
                        value={currentSelectVal}
                        onChange={(e) => initSt(t.id, e.target.value)}
                        className="border rounded text-xs p-1.5 outline-none bg-gray-50 hover:bg-white font-medium focus:border-[#0f2e4a]"
                      >
                        <option value="รอดำเนินการ">รอดำเนินการ</option>
                        <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                        <option value="ติดปัญหา/รออะไหล่">ติดปัญหา/รออะไหล่</option>
                        <option value="จบงาน">จบงาน</option>
                        {t.status === 'จบงาน(รอใบงาน)' && (
                          <option value="จบงาน(รอใบงาน)">จบงาน (รอใบงาน)</option>
                        )}
                        {t.status === 'เลื่อนงาน' && (
                          <option value="เลื่อนงาน">เลื่อนงาน</option>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleEdit(t)}
                        className="text-gray-500 hover:text-[#0f2e4a] p-1.5 bg-gray-100 rounded hover:bg-gray-200 transition"
                        title="แก้ไขงาน"
                      >
                        <Icon name="edit2" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(t)}
                        className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded hover:bg-red-100 transition"
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
