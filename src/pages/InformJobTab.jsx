import React from 'react';
import SegmentedPills from '../components/ui/SegmentedPills.jsx';

export default function InformJobTab({
  informs = [],
  iTab,
  setITab,
  informForm,
  setInformForm,
  subInf,
  gFilt,
  sets,
  getProjName,
  getProjArea,
  getStdProj,
  checkStaffMatch,
  fDate,
  openInfModal,
  openInfEdit,
  setInfView,
  deleteInform,
  Icon
}) {
  const currentMonth = gFilt.month || '';

  const ft = informs
    .filter((j) => {
      if (j.status === 'ยกเลิก') return false;
      if (gFilt.area !== 'ทั้งหมด' && j.area !== gFilt.area) return false;
      if (gFilt.project !== 'ทั้งหมด' && getStdProj(j.project) !== gFilt.project) return false;
      if (gFilt.status !== 'ทั้งหมด' && j.status !== gFilt.status) return false;
      if (!checkStaffMatch(j.project, gFilt.staffName)) return false;
      if (gFilt.requester && gFilt.requester !== 'ทั้งหมด' && j.requesterName !== gFilt.requester) return false;

      // ตรรกะตรวจจับเดือน:
      // 1. รายการที่สร้างในเดือนที่เลือกตามปกติ
      const isCurrentMonth = j.date && j.date.startsWith(currentMonth);
      // 2. รายการค้างจากเดือนก่อนหน้าที่ยัง "รอดำเนินการ"
      const isCarriedOver = j.status === 'รอดำเนินการ' && j.date && j.date.slice(0, 7) < currentMonth;
      // 3. รายการที่ยกยอดมาแล้วเพิ่งเปิดงานในเดือนนี้
      const isOpenedInCurrentMonth = j.openedMonth === currentMonth;

      return isCurrentMonth || isCarriedOver || isOpenedInCurrentMonth;
    })
    .sort((a, b) => {
      const aCarried = a.status === 'รอดำเนินการ' && a.date && a.date.slice(0, 7) < currentMonth;
      const bCarried = b.status === 'รอดำเนินการ' && b.date && b.date.slice(0, 7) < currentMonth;

      // ลำดับที่ 1: รายการค้างจากเดือนก่อนหน้าให้ขึ้นบนสุดเสมอ
      if (aCarried && !bCarried) return -1;
      if (!aCarried && bCarried) return 1;

      // ลำดับที่ 2: หากเป็นรายการค้างด้วยกัน ให้เรียงวันที่เก่าสุดขึ้นก่อน (ค้างนานสุดจัดการก่อน)
      if (aCarried && bCarried) {
        return (a.date || '').localeCompare(b.date || '');
      }

      // หากเป็นรายการปกติ ให้เรียงวันที่ล่าสุดขึ้นก่อน
      return (b.date || '').localeCompare(a.date || '');
    });

  const carriedOverCount = ft.filter(
    (j) => j.status === 'รอดำเนินการ' && j.date && j.date.slice(0, 7) < currentMonth
  ).length;

  return (
    <div className="space-y-6 animate-in">
      {/* Top Switcher Bar with 21st.dev Sliding SegmentedPills */}
      <SegmentedPills
        items={[
          { id: 'form', label: 'แจ้งเปิดงานใหม่ (CREATE JOB)' },
          { id: 'manage', label: 'จัดการสถานะงาน', count: ft.length }
        ]}
        activeId={iTab}
        onChange={setITab}
      />

      {iTab === 'form' ? (
        <form
          onSubmit={subInf}
          className="bg-white p-6 sm:p-7 rounded-2xl shadow-card border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5 border-t-4 border-t-[#7A1C28]"
        >
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">วันที่</label>
            <input
              type="date"
              value={informForm.date}
              onChange={(e) => setInformForm({ ...informForm, date: e.target.value })}
              required
              className="border border-slate-200 focus:border-[#7A1C28] focus:ring-2 focus:ring-[#7A1C28]/15 rounded-xl px-3.5 py-2.5 w-full text-xs outline-none shadow-2xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">ผู้แจ้ง / เบอร์โทร</label>
            <div className="flex gap-2">
              <input
                value={informForm.requesterName}
                onChange={(e) =>
                  setInformForm({ ...informForm, requesterName: e.target.value })
                }
                required
                placeholder="ชื่อผู้แจ้ง"
                className="border border-slate-200 focus:border-[#7A1C28] focus:ring-2 focus:ring-[#7A1C28]/15 rounded-xl px-3.5 py-2.5 w-1/2 text-xs outline-none shadow-2xs"
              />
              <input
                value={informForm.phone}
                onChange={(e) => setInformForm({ ...informForm, phone: e.target.value })}
                required
                placeholder="เบอร์โทรศัพท์"
                className="border border-slate-200 focus:border-[#7A1C28] focus:ring-2 focus:ring-[#7A1C28]/15 rounded-xl px-3.5 py-2.5 w-1/2 text-xs outline-none shadow-2xs"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              เจ้าหน้าที่ดูแลโครงการ (ตัวกรอง)
            </label>
            <select
              value={informForm.staffName}
              onChange={(e) =>
                setInformForm({
                  ...informForm,
                  staffName: e.target.value,
                  project: '',
                  area: ''
                })
              }
              className="border border-slate-200 focus:border-[#7A1C28] focus:ring-2 focus:ring-[#7A1C28]/15 rounded-xl px-3.5 py-2.5 w-full text-xs outline-none bg-slate-50/60 shadow-2xs"
            >
              <option value="">ทุกเจ้าหน้าที่ LH (ไม่กรอง)</option>
              {Array.from(
                new Set(
                  (sets.emails || []).flatMap(e => {
                    const parts = e.split('|');
                    const rawName = (parts[2] || parts[0].split('@')[0] || '').trim();
                    return rawName.split(/[,/]/).map(n => n.trim()).filter(Boolean);
                  })
                )
              )
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, 'th'))
                .map((n) => {
                  const assignedCount = (sets.emails || []).reduce((acc, e) => {
                    const parts = e.split('|');
                    const rawName = (parts[2] || parts[0].split('@')[0] || '').trim().toLowerCase();
                    const names = rawName.split(/[,/]/).map(x => x.trim());
                    if (names.includes(n.toLowerCase())) {
                      const projs = (parts[1] || '').split(',').map(p => p.trim()).filter(Boolean);
                      if (projs.includes('ทั้งหมด') || projs.includes('ทุกโครงการ')) return 'ทุกโครงการ';
                      return typeof acc === 'number' ? acc + projs.length : acc;
                    }
                    return acc;
                  }, 0);

                  const countLabel = assignedCount === 'ทุกโครงการ' 
                    ? '(ทุกโครงการ)' 
                    : typeof assignedCount === 'number' && assignedCount > 0 
                    ? `(${assignedCount} โครงการ)` 
                    : '';

                  return (
                    <option key={n} value={n}>
                      {n} {countLabel}
                    </option>
                  );
                })}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">โครงการ (ออโต้พื้นที่)</label>
            <select
              value={informForm.project}
              required
              onChange={(e) => {
                const pData = (sets.projects || []).find(
                  (p) => getProjName(p) === e.target.value
                );
                setInformForm({
                  ...informForm,
                  project: e.target.value,
                  area: getProjArea(pData)
                });
              }}
              className="border border-slate-200 focus:border-[#7A1C28] focus:ring-2 focus:ring-[#7A1C28]/15 rounded-xl px-3.5 py-2.5 w-full text-xs outline-none shadow-2xs"
            >
              <option value="">เลือกโครงการ...</option>
              {(sets.projects || [])
                .filter(
                  (p) =>
                    !informForm.staffName ||
                    checkStaffMatch(getProjName(p), informForm.staffName)
                )
                .map((p) => (
                  <option key={p} value={getProjName(p)}>
                    {getProjName(p)}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">พื้นที่</label>
            <input
              type="text"
              value={informForm.area}
              readOnly
              className="border border-slate-200 rounded-xl px-3.5 py-2.5 w-full text-xs outline-none bg-slate-100 text-slate-500 font-medium"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">ประเภทงาน</label>
            <select
              value={informForm.jobType}
              onChange={(e) => setInformForm({ ...informForm, jobType: e.target.value })}
              required
              className="border border-slate-200 focus:border-[#7A1C28] focus:ring-2 focus:ring-[#7A1C28]/15 rounded-xl px-3.5 py-2.5 w-full text-xs outline-none shadow-2xs"
            >
              <option value="">เลือกประเภทงาน...</option>
              {(sets.jobTypes || []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">บริเวณ</label>
            <select
              value={informForm.location}
              onChange={(e) => setInformForm({ ...informForm, location: e.target.value })}
              required
              className="border border-slate-200 focus:border-[#7A1C28] focus:ring-2 focus:ring-[#7A1C28]/15 rounded-xl px-3.5 py-2.5 w-full text-xs outline-none shadow-2xs"
            >
              <option value="">เลือกบริเวณ...</option>
              {(sets.locations || []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">รายละเอียดปัญหา</label>
            <textarea
              value={informForm.details}
              onChange={(e) => setInformForm({ ...informForm, details: e.target.value })}
              required
              rows="3"
              className="border border-slate-200 focus:border-[#7A1C28] focus:ring-2 focus:ring-[#7A1C28]/15 rounded-xl px-3.5 py-2.5 w-full text-xs outline-none resize-none shadow-2xs"
            />
          </div>
          <div className="md:col-span-2 text-center mt-2">
            <button
              type="submit"
              className="bg-[#7A1C28] hover:bg-[#65121E] text-white px-10 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              ส่งแจ้งงาน
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {carriedOverCount > 0 && (
            <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-white/20 rounded-xl shrink-0">
                  <Icon name="alertTriangle" size={18} className="text-white" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold leading-tight">
                    ตรวจพบรายการค้างจากเดือนก่อนหน้าที่ยังไม่ได้เปิด Inform Job จำนวน {carriedOverCount} รายการ
                  </h4>
                  <p className="text-[11px] text-amber-100 leading-tight mt-0.5">
                    ระบบยกยอดมาแสดงผลในเดือนปัจจุบัน ({currentMonth}) เพื่อป้องกันการตกหล่น
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-white text-amber-900 px-3 py-1 rounded-full shadow-xs shrink-0 whitespace-nowrap">
                ค้าง {carriedOverCount} รายการ
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0F2E4A] text-white border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-32 font-semibold">วันที่/ID</th>
                    <th className="p-3.5 font-semibold">ข้อมูลเบื้องต้น</th>
                    <th className="p-3.5 w-32 font-semibold">สถานะ</th>
                    <th className="p-3.5 w-36 font-semibold text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ft.map((j) => {
                    const isCarriedOver = j.status === 'รอดำเนินการ' && j.date && j.date.slice(0, 7) < currentMonth;
                    const isOpenedFromPrior = j.status === 'เปิด Inform Job แล้ว' && j.openedMonth === currentMonth && j.date && j.date.slice(0, 7) < currentMonth;

                    return (
                      <tr 
                        key={j.id} 
                        className={`border-b transition-colors ${
                          isCarriedOver 
                            ? 'bg-amber-50/60 hover:bg-amber-100/70 border-l-4 border-l-amber-500' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3.5 font-bold align-top">
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-slate-900">{fDate(j.date)}</span>
                            {isCarriedOver && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Icon name="alertTriangle" size={10} className="text-amber-600" />
                                ค้างจากเดือนก่อน
                              </span>
                            )}
                            {isOpenedFromPrior && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                📋 เปิดในเดือนนี้
                              </span>
                            )}
                            <div className="text-[10px] text-slate-400 font-mono">{j.id}</div>
                          </div>
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="font-bold text-[#0F2E4A] text-sm">
                            {getStdProj(j.project)}{' '}
                            <span className="font-normal text-xs text-slate-500">({j.area})</span>
                          </div>
                          <div className="text-slate-500 mt-1">
                            {j.requesterName} {j.phone && `| เบอร์: ${j.phone}`}
                          </div>
                          <div className="flex gap-1.5 mt-1.5 mb-1">
                            {j.jobType && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-medium border border-slate-200">
                                {j.jobType}
                              </span>
                            )}
                            {j.location && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-medium border border-slate-200">
                                {j.location}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-700 font-medium line-clamp-1">
                            {j.details || '-'}
                          </div>
                        </td>
                        <td className="p-3.5 align-top">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold inline-block ${
                              j.status === 'เปิด Inform Job แล้ว'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {j.status}
                          </span>
                          {j.informNo && (
                            <div className="text-[10px] text-blue-600 font-bold mt-1">
                              #{j.informNo}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 align-top text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setInfView(j)}
                              className="text-slate-400 hover:text-blue-600 p-1.5 bg-slate-100 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                              title="ดูรายละเอียด"
                            >
                              <Icon name="search" size={14} />
                            </button>
                            {j.status === 'รอดำเนินการ' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openInfModal(j.id, 'open')}
                                  className="text-emerald-600 hover:text-emerald-700 p-1.5 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
                                  title="เปิด Inform Job"
                                >
                                  <Icon name="checkCircle" size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openInfModal(j.id, 'cancel')}
                                  className="text-rose-500 hover:text-rose-700 p-1.5 bg-rose-50 rounded-lg hover:bg-rose-100 transition cursor-pointer"
                                  title="ยกเลิก"
                                >
                                  <Icon name="xCircle" size={14} />
                                </button>
                              </>
                            )}
                            {openInfEdit && (
                              <button
                                type="button"
                                onClick={() => openInfEdit(j)}
                                className="text-slate-500 hover:text-[#003C71] p-1.5 bg-slate-100 rounded-lg hover:bg-amber-50 transition cursor-pointer"
                                title="แก้ไขข้อมูล"
                              >
                                <Icon name="edit2" size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteInform(j)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 bg-slate-100 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="ลบ"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {ft.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-slate-400">
                        ไม่มีรายการแจ้งงาน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
