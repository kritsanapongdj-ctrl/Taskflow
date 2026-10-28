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

  const cost = Number(group.costAmount || 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] animate-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div
          className={`p-4 flex justify-between text-white ${
            type === 'ส่งเบิกแล้ว' ? 'bg-emerald-800' : 'bg-[#0f2e4a]'
          }`}
        >
          <h3 className="font-bold flex items-center">
            <Icon name="fileText" size={18} className="mr-2" />
            {group.isWO && group.woNo
              ? `รายละเอียดใบงาน: ${group.woNo}`
              : `รายละเอียด JOB: ${group.tasks[0]?.id}`}
          </h3>
          <button type="button" onClick={onClose} className="hover:opacity-80 transition cursor-pointer">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 bg-gray-50/50 space-y-4">
          <div className="flex flex-wrap justify-between items-baseline border-b pb-3 border-slate-200">
            <div>
              <div className="text-xs text-gray-500 font-bold mb-0.5">โครงการ</div>
              <div className="text-lg font-black text-[#0f2e4a]">{getStdProj(group.project)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium">รวมทั้งสิ้นในกลุ่มนี้</div>
              <div className="text-sm font-bold text-slate-700">{group.tasks.length} รายการงาน</div>
            </div>
          </div>

          {/* กล่องแสดงข้อมูลงบประมาณและยอดเงินจากระบบ LH (LHServ Cost Panel) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
            <div className="flex flex-wrap justify-between items-center pb-2.5 mb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-sm text-[#0F2E4A]">ข้อมูลค่าใช้จ่ายใบสั่งซ่อม (LHServ)</span>
                {group.costContractor && (
                  <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium border border-slate-200">
                    {group.costContractor}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-slate-500">รวมค่าดำเนินการ 20%:</span>
                <span className={`text-lg font-black ${cost > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {cost > 0
                    ? `฿${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : 'รอรอบตรวจสอบจ่าย'}
                </span>
              </div>
            </div>

            {/* ตารางแสดงแจกแจงค่าแรง ค่าของ ค่าดำเนินการรายหมวด */}
            {group.costBreakdown && group.costBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2">หมวดงาน</th>
                      <th className="p-2">รหัสบัญชี</th>
                      <th className="p-2 text-right">ค่าแรง (บาท)</th>
                      <th className="p-2 text-right">ค่าของ (บาท)</th>
                      <th className="p-2 text-right">รวม+20% (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {group.costBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="p-2 font-medium">{item.reportType || 'สาธารณูฯ'}</td>
                        <td className="p-2 font-mono font-bold text-amber-800">{item.accountCode}</td>
                        <td className="p-2 text-right">{Number(item.laborCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{Number(item.materialCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-bold text-emerald-700">{Number(item.feeCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : group.costAccounts && group.costAccounts.length > 0 ? (
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span>รหัสบัญชีที่ผูก:</span>
                <span className="font-bold text-amber-800 font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  {group.costAccounts.join(', ')}
                </span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                💡 ยอดเงินจะถูกนำเข้าอัตโนมัติเมื่อ บอท The Auditor กวาดรอบอนุมัติค่าใช้จ่ายจาก LHServ ประจำงวด
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">รายการงานที่ผูกกับใบงานนี้</div>
            {group.tasks.map((t, i) => {
              const isCompleteOnTime = !t.overdueStatus || t.overdueStatus === 'ในกำหนด';
              const isOpenedLate = t.lateWorkOrder || t.overdueStatus === 'ออกใบงานช้า';
              return (
                <div key={t.id} className="bg-white border rounded-xl p-4 shadow-sm relative">
                  <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-bl-lg rounded-tr-xl border-l border-b border-slate-200">
                    #{i + 1}
                  </div>

                  <div className="text-xs text-slate-400 mb-1 font-mono">ID: {t.id}</div>
                  <div className="text-sm font-medium text-slate-800 mb-3">{t.details}</div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t pt-3 mt-3 border-slate-100">
                    <div>
                      <div className="text-slate-500 mb-0.5">วันที่บันทึก</div>
                      <div className="font-bold text-slate-700">{fDate(t.receivedDate)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-0.5">กำหนดเสร็จ</div>
                      <div className="font-bold text-slate-700">{fDate(t.endDate)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-0.5">สถานะใบงาน</div>
                      <div className={`font-bold ${isOpenedLate ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isOpenedLate ? 'ออกล่าช้า' : 'ปกติ'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-0.5">สถานะจบงาน</div>
                      <div
                        className={`font-bold flex items-center ${
                          isCompleteOnTime ? 'text-emerald-600' : 'text-rose-600'
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
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
          {type === 'รอส่งเบิก' ? (
            <button
              type="button"
              onClick={() => onMoveGroup(group.id, 'ส่งเบิกแล้ว')}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md flex items-center hover:bg-emerald-700 transition cursor-pointer"
            >
              <Icon name="check" size={16} className="mr-2" /> ยืนยันการส่งเบิก (เดือน {currentMonth})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onMoveGroup(group.id, 'รอส่งเบิก')}
              className="px-6 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm font-bold shadow-sm flex items-center hover:bg-rose-100 transition cursor-pointer"
            >
              <Icon name="rotateCcw" size={16} className="mr-2" /> ยกเลิกการส่งเบิก
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
