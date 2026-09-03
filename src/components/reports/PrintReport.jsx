import React from 'react';

export default function PrintReport({
  rCfg,
  tasks = [],
  informs = [],
  sets = {},
  getTStr,
  getProjName,
  checkStaffMatch,
  chkOvdTimeAware,
  fDate
}) {
  const isY = rCfg.type === 'year';
  const fS = isY ? rCfg.val.substring(0, 4) : rCfg.val;
  const tS = getTStr();
  const pMap = {};

  (sets.projects || []).forEach((p) => {
    const name = getProjName(p);
    pMap[name.replace(/[\s\-]/g, '').toUpperCase()] = name;
  });

  const getStdName = (raw) => {
    const clean = String(raw || 'ไม่ระบุ').trim();
    const norm = clean.replace(/[\s\-]/g, '').toUpperCase();
    if (pMap[norm]) return pMap[norm];
    pMap[norm] = clean;
    return clean;
  };

  if (rCfg.topic === 'inform') {
    const allPeriodInforms = informs.filter((j) => {
      if (!j.date || !String(j.date || '').startsWith(fS)) return false;
      if (rCfg.area !== 'ทั้งหมด' && String(j.area || '').trim() !== rCfg.area) return false;
      const stdP = getStdName(j.project);
      if (rCfg.project !== 'ทั้งหมด' && stdP !== rCfg.project) return false;
      if (rCfg.staffName !== 'ทั้งหมด' && !checkStaffMatch(j.project, rCfg.staffName)) return false;
      return true;
    });

    const rI = allPeriodInforms.filter((j) => j.status !== 'ยกเลิก');
    const rOp = rI.filter((j) => j.status === 'เปิด Inform Job แล้ว');
    const rPd = rI.filter((j) => j.status === 'รอดำเนินการ');

    const pStI = {};
    rI.forEach((j) => {
      const pName = getStdName(j.project);
      if (!pStI[pName]) pStI[pName] = { t: 0, op: 0, pd: 0 };
      pStI[pName].t++;
      if (j.status === 'เปิด Inform Job แล้ว') pStI[pName].op++;
      else pStI[pName].pd++;
    });

    return (
      <div id="print-area" className="hidden p-8 font-sans bg-white">
        <div className="text-center border-b-2 border-[#0f2e4a] pb-4 mb-6">
          <h1 className="text-2xl font-bold text-[#0f2e4a] uppercase">
            สรุปรายงานแจ้งเปิดงาน (Inform-Job)
          </h1>
          <p className="text-sm text-gray-600 mt-2 font-bold">
            รอบ: {isY ? `ปี ${fS}` : `เดือน ${fS}`} | พื้นที่: {rCfg.area} | โครงการ: {rCfg.project}
          </p>
        </div>
        <div className="flex gap-4 mb-8 print-break">
          <div className="flex-1 bg-gray-50 border p-4 rounded-lg text-center">
            <p className="text-xs text-gray-500 font-bold">แจ้งเปิดงานทั้งหมด</p>
            <h2 className="text-2xl font-black">{rI.length}</h2>
          </div>
          <div className="flex-1 bg-green-50 border p-4 rounded-lg text-center">
            <p className="text-xs text-green-700 font-bold">เปิด Inform Job แล้ว</p>
            <h2 className="text-2xl font-black text-green-700">{rOp.length}</h2>
          </div>
          <div className="flex-1 bg-yellow-50 border p-4 rounded-lg text-center">
            <p className="text-xs text-yellow-700 font-bold">รอดำเนินการ</p>
            <h2 className="text-2xl font-black text-yellow-700">{rPd.length}</h2>
          </div>
        </div>

        <div className="mb-8 print-break">
          <h3 className="font-bold text-[#0f2e4a] mb-4 text-sm border-b pb-2">
            สัดส่วนแยกตามโครงการ
          </h3>
          <div className="space-y-3">
            {Object.keys(pStI).map((p) => {
              const s = pStI[p];
              return (
                <div key={p} className="flex items-center text-xs">
                  <div className="w-1/4 font-bold truncate pr-2">{p}</div>
                  <div className="w-2/4 bg-gray-200 h-5 rounded overflow-hidden flex">
                    {s.t > 0 && (
                      <div
                        style={{ width: `${(s.op / s.t) * 100}%` }}
                        className="bg-green-500 h-full"
                      />
                    )}
                    {s.t > 0 && (
                      <div
                        style={{ width: `${(s.pd / s.t) * 100}%` }}
                        className="bg-yellow-400 h-full"
                      />
                    )}
                  </div>
                  <div className="w-1/4 pl-3 text-[10px] text-gray-500">
                    รวม {s.t} (เปิด:{s.op}, รอ:{s.pd})
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 text-[10px] justify-center mt-4 font-bold">
            <div className="flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-sm mr-1" />
              เปิด Inform Job แล้ว
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-yellow-400 rounded-sm mr-1" />
              รอดำเนินการ
            </div>
          </div>
        </div>

        <div className="print-break">
          <h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">
            รายการแจ้งเปิดงาน (Inform-Job)
          </h3>
          <table className="w-full text-[11px] text-left border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 w-[20%]">วันที่แจ้ง / เลขที่อ้างอิง</th>
                <th className="border p-2">รายละเอียด / บริเวณ</th>
                <th className="border p-2 w-[25%]">โครงการ / ผู้แจ้ง</th>
                <th className="border p-2 w-[15%]">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rI.map((j) => (
                <tr key={j.id}>
                  <td className="border p-2 font-bold text-blue-700">
                    {fDate(j.date)}
                    <br />
                    <span className="text-gray-600 font-normal">{j.informNo || j.id}</span>
                  </td>
                  <td className="border p-2">
                    <div className="font-bold text-gray-800">{j.jobType}</div>
                    {j.details}
                    <br />
                    <span className="text-gray-500 text-[10px]">บริเวณ: {j.location}</span>
                  </td>
                  <td className="border p-2">
                    {getStdName(j.project)}
                    <br />
                    <span className="text-gray-500 text-[10px]">{j.requesterName}</span>
                  </td>
                  <td
                    className={`border p-2 font-bold ${
                      j.status === 'เปิด Inform Job แล้ว' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {j.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const allPeriodTasks = tasks.filter((t) => {
    if (!t.startDate || !String(t.startDate || '').startsWith(fS)) return false;
    if (rCfg.area !== 'ทั้งหมด' && String(t.area || '').trim() !== rCfg.area) return false;
    const stdP = getStdName(t.project);
    if (rCfg.project !== 'ทั้งหมด' && stdP !== rCfg.project) return false;
    if (rCfg.staffName !== 'ทั้งหมด' && !checkStaffMatch(t.project, rCfg.staffName)) return false;
    return true;
  });

  const rT = allPeriodTasks.filter((t) => t.status !== 'ยกเลิก');
  const rOd = rT.filter(
    (t) =>
      t.overdueStatus === 'เกินกำหนด' ||
      t.overdueStatus === 'ออกใบงานช้า' ||
      chkOvdTimeAware(t, tS)
  );
  const rLateWo = rT.filter((t) => t.lateWorkOrder === true);
  const rC = rT.filter((t) => t.status?.startsWith('จบงาน') && !rOd.includes(t));
  const rO = rT.filter((t) => !t.status?.startsWith('จบงาน') && !rOd.includes(t));

  const pSt = {};
  rT.forEach((t) => {
    const pName = getStdName(t.project);
    if (!pSt[pName]) pSt[pName] = { t: 0, d: 0, o: 0, od: 0 };
    pSt[pName].t++;
    if (rOd.includes(t)) pSt[pName].od++;
    else if (t.status?.startsWith('จบงาน')) pSt[pName].d++;
    else pSt[pName].o++;
  });

  const allC = tasks.filter((t) => {
    if (!t.status?.startsWith('จบงาน')) return false;
    if (rCfg.area !== 'ทั้งหมด' && String(t.area || '').trim() !== rCfg.area) return false;
    if (rCfg.project !== 'ทั้งหมด' && getStdName(t.project) !== rCfg.project) return false;
    if (rCfg.staffName !== 'ทั้งหมด' && !checkStaffMatch(t.project, rCfg.staffName)) return false;
    return true;
  });

  const unbilledTasks = allC.filter((t) => t.billingStatus !== 'ส่งเบิกแล้ว');
  const ub = unbilledTasks.length;
  const b = allC.filter((t) => t.billingStatus === 'ส่งเบิกแล้ว').length;
  const ubBreakdown = {};
  unbilledTasks.forEach((t) => {
    let m = 'ไม่ระบุเดือน';
    if (t.completedDate) m = String(t.completedDate || '').substring(0, 7);
    else if (t.endDate) m = String(t.endDate || '').substring(0, 7);
    if (!ubBreakdown[m]) ubBreakdown[m] = 0;
    ubBreakdown[m]++;
  });
  const sortedUbMonths = Object.keys(ubBreakdown).sort();

  return (
    <div id="print-area" className="hidden p-8 font-sans bg-white">
      <div className="text-center border-b-2 border-[#0f2e4a] pb-4 mb-6">
        <h1 className="text-2xl font-bold text-[#0f2e4a] uppercase">
          รายงานผลการดำเนินงาน LH Task-Flow
        </h1>
        <p className="text-sm text-gray-600 mt-2 font-bold">
          รอบ: {isY ? `ปี ${fS}` : `เดือน ${fS}`} | พื้นที่: {rCfg.area} | โครงการ: {rCfg.project}
        </p>
      </div>
      <div className="flex gap-4 mb-8 print-break">
        <div className="flex-1 bg-gray-50 border p-4 rounded-lg text-center">
          <p className="text-xs text-gray-500 font-bold">ปริมาณงานที่ได้รับ</p>
          <h2 className="text-2xl font-black">{rT.length}</h2>
        </div>
        <div className="flex-1 bg-green-50 border p-4 rounded-lg text-center">
          <p className="text-xs text-green-700 font-bold">จบงาน(ในกำหนด)</p>
          <h2 className="text-2xl font-black text-green-700">{rC.length}</h2>
        </div>
        <div className="flex-1 bg-yellow-50 border p-4 rounded-lg text-center">
          <p className="text-xs text-yellow-700 font-bold">ดำเนินการ</p>
          <h2 className="text-2xl font-black text-yellow-700">{rO.length}</h2>
        </div>
        <div className="flex-1 bg-red-50 border p-4 rounded-lg text-center">
          <p className="text-xs text-red-700 font-bold">ล่าช้า/เกินกำหนด</p>
          <h2 className="text-2xl font-black text-red-700">{rOd.length}</h2>
        </div>
      </div>
      <div className="mb-8 p-4 border rounded-lg bg-gray-50 print-break">
        <h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">
          สรุปส่งเบิก (เฉพาะงานที่จบแล้ว)
        </h3>
        <div className="flex justify-between px-4 text-sm mb-2">
          <div>
            <span className="font-bold text-green-600">ส่งเบิกแล้วทั้งหมดในระบบ:</span> {b} รายการ
          </div>
          <div>
            <span className="font-bold text-red-600">ค้างเบิก (สะสมทั้งหมด):</span> {ub} รายการ
          </div>
        </div>
        {ub > 0 && (
          <div className="px-4 text-[11px] mt-3 border-t pt-3 text-gray-600 flex flex-wrap gap-2 items-center">
            <span className="font-bold text-gray-800">แจกแจงรายการค้างเบิกตามรอบเดือน:</span>
            {sortedUbMonths.map((m) => (
              <span
                key={m}
                className="bg-white border border-gray-300 px-2 py-0.5 rounded shadow-sm text-red-600 font-bold"
              >
                {m} : {ubBreakdown[m]} รายการ
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="mb-8 print-break">
        <h3 className="font-bold text-[#0f2e4a] mb-4 text-sm border-b pb-2">
          สถานะงานแยกตามโครงการ
        </h3>
        <div className="space-y-3">
          {Object.keys(pSt).map((p) => {
            const s = pSt[p];
            return (
              <div key={p} className="flex items-center text-xs">
                <div className="w-1/4 font-bold truncate pr-2">{p}</div>
                <div className="w-2/4 bg-gray-200 h-5 rounded overflow-hidden flex">
                  {s.t > 0 && (
                    <div
                      style={{ width: `${(s.d / s.t) * 100}%` }}
                      className="bg-green-500 h-full"
                    />
                  )}
                  {s.t > 0 && (
                    <div
                      style={{ width: `${(s.o / s.t) * 100}%` }}
                      className="bg-yellow-400 h-full"
                    />
                  )}
                  {s.t > 0 && (
                    <div
                      style={{ width: `${(s.od / s.t) * 100}%` }}
                      className="bg-red-500 h-full"
                    />
                  )}
                </div>
                <div className="w-1/4 pl-3 text-[10px] text-gray-500">
                  รวม {s.t} (จบ:{s.d}, ทำ:{s.o}, ช้า:{s.od})
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 text-[10px] justify-center mt-4 font-bold">
          <div className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-sm mr-1" />
            จบงาน(ในกำหนด)
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-yellow-400 rounded-sm mr-1" />
            กำลังดำเนินการ
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-sm mr-1" />
            ล่าช้า/เกินกำหนด
          </div>
        </div>
      </div>
      <div className="print-break">
        <h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">
          งานล่าช้า/เกินกำหนด (รวมงานที่จบช้ากว่ากำหนด)
        </h3>
        <table className="w-full text-[11px] text-left border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">รหัสงาน</th>
              <th className="border p-2">รายละเอียด</th>
              <th className="border p-2">สถานะ</th>
              <th className="border p-2">กำหนดเสร็จ</th>
            </tr>
          </thead>
          <tbody>
            {rOd.map((t) => (
              <tr key={t.id}>
                <td className="border p-2 font-bold text-blue-700">
                  {t.workOrderNo || t.id}
                  <br />
                  <span className="text-gray-600 font-normal">{getStdName(t.project)}</span>
                </td>
                <td className="border p-2">
                  {t.details}
                  {t.overdueReason && (
                    <div className="mt-1 p-1 bg-red-50 text-red-600 border border-red-200 rounded">
                      <strong>สาเหตุที่ช้า:</strong> {t.overdueReason}
                    </div>
                  )}
                </td>
                <td className="border p-2 text-red-600">
                  {t.status}
                  <br />
                  <span className="text-[9px]">({t.overdueStatus || 'เกินกำหนด'})</span>
                </td>
                <td className="border p-2 text-red-600 font-bold">{fDate(t.endDate) || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rLateWo.length > 0 && (
        <div className="print-break mt-6">
          <h3 className="font-bold text-[#0f2e4a] mb-2 text-sm border-b pb-2">
            งานที่ออกใบงานช้า (เลยกำหนด 3 วัน)
          </h3>
          <table className="w-full text-[11px] text-left border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">รหัสงาน / เลขที่ใบงาน</th>
                <th className="border p-2">รายละเอียด</th>
                <th className="border p-2">สถานะ</th>
                <th className="border p-2">วันที่จบงาน/วันที่ออกใบงาน</th>
              </tr>
            </thead>
            <tbody>
              {rLateWo.map((t) => (
                <tr key={t.id}>
                  <td className="border p-2 font-bold text-amber-700">
                    {t.workOrderNo || t.id}
                    <br />
                    <span className="text-gray-600 font-normal">{getStdName(t.project)}</span>
                  </td>
                  <td className="border p-2">{t.details}</td>
                  <td className="border p-2 text-amber-700">{t.status}</td>
                  <td className="border p-2 text-amber-700 font-bold">
                    จบ: {fDate(t.completedDate) || '-'}
                    <br />
                    <span className="text-red-500 font-normal">ออกใบงานล่าช้ากว่ากำหนด</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(() => {
        const rNoSla = rT.filter(
          (t) => t.slaCategory === 'งานทั่วไป (ไม่มี SLA)' || !t.slaCategory
        );
        if (rNoSla.length > 0)
          return (
            <div className="print-break mt-6">
              <h3 className="font-bold text-gray-500 mb-2 text-sm border-b pb-2">
                งานทั่วไป (ไม่มี SLA){' '}
                <span className="font-normal text-xs text-red-500 ml-2">
                  - สำหรับสุ่มตรวจสอบการลงงานหลีกเลี่ยง SLA
                </span>
              </h3>
              <table className="w-full text-[11px] text-left border-collapse border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">รหัสงาน</th>
                    <th className="border p-2">รายละเอียด</th>
                    <th className="border p-2">สถานะ</th>
                    <th className="border p-2">ผู้แจ้ง / โครงการ</th>
                  </tr>
                </thead>
                <tbody>
                  {rNoSla.map((t) => (
                    <tr key={t.id}>
                      <td className="border p-2 font-bold text-gray-600">
                        {t.workOrderNo || t.id}
                      </td>
                      <td className="border p-2">{t.details}</td>
                      <td className="border p-2 text-gray-500">{t.status}</td>
                      <td className="border p-2 text-gray-700">
                        {t.requester}
                        <br />
                        <span className="text-gray-500 text-[10px]">
                          {getStdName(t.project)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        return null;
      })()}
    </div>
  );
}
