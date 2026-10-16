import React from 'react';

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
    <div className="space-y-4 animate-in">
      {/* Top Switcher Bar */}
      <div className="p-2.5 bg-[#0B1B3D] border-2 border-[#B89246] shadow-[3px_3px_0px_#B89246] flex gap-2">
        <button
          type="button"
          onClick={() => setITab('form')}
          className={`flex-1 py-2 text-xs font-serif font-bold transition-all cursor-pointer border ${
            iTab === 'form'
              ? 'bg-[#B89246] text-[#0B1B3D] border-[#00F0FF] shadow-[2px_2px_0px_#00F0FF] translate-x-0.5'
              : 'bg-[#102A43] text-slate-300 border-white/20 hover:text-white hover:border-[#B89246] active:translate-x-0.5 active:translate-y-0.5'
          }`}
        >
          [ 01 // NEW_INFORM // แจ้งเปิดงานใหม่ ]
        </button>
        <button
          type="button"
          onClick={() => setITab('manage')}
          className={`flex-1 py-2 text-xs font-serif font-bold transition-all cursor-pointer border ${
            iTab === 'manage'
              ? 'bg-[#B89246] text-[#0B1B3D] border-[#00F0FF] shadow-[2px_2px_0px_#00F0FF] translate-x-0.5'
              : 'bg-[#102A43] text-slate-300 border-white/20 hover:text-white hover:border-[#B89246] active:translate-x-0.5 active:translate-y-0.5'
          }`}
        >
          [ 02 // MANAGE_STATUS // จัดการสถานะ ]
        </button>
      </div>

      {iTab === 'form' ? (
        <form
          onSubmit={subInf}
          className="bg-white p-6 border-2 border-[#0B1B3D] shadow-[4px_4px_0px_#0B1B3D] grid grid-cols-1 md:grid-cols-2 gap-4 border-t-4 border-t-[#B89246]"
        >
          <div>
            <label className="text-xs font-serif font-bold text-[#0B1B3D] mb-1.5 block uppercase">
              DATE // วันที่
            </label>
            <input
              type="date"
              value={informForm.date}
              onChange={(e) => setInformForm({ ...informForm, date: e.target.value })}
              required
              className="border-2 border-[#0B1B3D] px-3 py-2 w-full text-xs font-tech font-bold outline-none shadow-[2px_2px_0px_#0B1B3D] focus:border-[#B89246]"
            />
          </div>
          <div>
            <label className="text-xs font-serif font-bold text-[#0B1B3D] mb-1.5 block uppercase">
              REQUESTER / PHONE // ผู้แจ้ง & เบอร์
            </label>
            <div className="flex gap-2">
              <input
                value={informForm.requesterName}
                onChange={(e) =>
                  setInformForm({ ...informForm, requesterName: e.target.value })
                }
                required
                placeholder="ชื่อผู้แจ้ง"
                className="border-2 border-[#0B1B3D] px-3 py-2 w-1/2 text-xs font-bold outline-none shadow-[2px_2px_0px_#0B1B3D] focus:border-[#B89246]"
              />
              <input
                value={informForm.phone}
                onChange={(e) => setInformForm({ ...informForm, phone: e.target.value })}
                required
                placeholder="เบอร์โทรศัพท์"
                className="border-2 border-[#0B1B3D] px-3 py-2 w-1/2 text-xs font-tech font-bold outline-none shadow-[2px_2px_0px_#0B1B3D] focus:border-[#B89246]"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-serif font-bold text-[#0B1B3D] mb-1.5 block uppercase">
              STAFF FILTER // เจ้าหน้าที่ดูแลโครงการ
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
              className="border-2 border-[#0B1B3D] px-3 py-2 w-full text-xs font-bold outline-none bg-cyan-50/40 shadow-[2px_2px_0px_#0B1B3D] focus:border-[#B89246]"
            >
              <option value="">ทุกเจ้าหน้าที่ (ไม่กรอง)</option>
              {Array.from(
                new Set([
                  ...(sets.emails || []).flatMap(e => {
                    const parts = e.split('|');
                    const rawName = (parts[2] || parts[0].split('@')[0] || '').trim();
                    return rawName.split(/[,/]/).map(n => n.trim()).filter(Boolean);
                  }),
                  ...(sets.staffStats || []).flatMap(s => {
                    const rawName = (s.name || '').trim();
                    return rawName.split(/[,/]/).map(n => n.trim()).filter(Boolean);
                  })
                ])
              )
                .filter(Boolean)
                .sort((a, b) => a.localeCompare('th'))
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-serif font-bold text-[#0B1B3D] mb-1.5 block uppercase">
              PROJECT // โครงการ (ออโต้พื้นที่)
            </label>
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
              className="border-2 border-[#0B1B3D] px-3 py-2 w-full text-xs font-bold outline-none shadow-[2px_2px_0px_#0B1B3D] focus:border-[#B89246]"
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
            <label className="text-xs font-serif font-bold text-[#0B1B3D] mb-1.5 block uppercase">
              AREA // พื้นที่
            </label>
            <input
              type="text"
              value={informForm.area}
              readOnly
              className="border-2 border-[#0B1B3D]/50 px-3 py-2 w-full text-xs font-tech font-bold outline-none bg-slate-100 text-slate-600"
            />
          </div>
          <div>
            <label className="text-xs font-serif font-bold text-[#0B1B3D] mb-1.5 block uppercase">
              JOB TYPE // ประเภทงาน
            </label>
            <select
              value={informForm.jobType}
              onChange={(e) => setInformForm({ ...informForm, jobType: e.target.value })}
              required
              className="border-2 border-[#0B1B3D] px-3 py-2 w-full text-xs font-bold outline-none shadow-[2px_2px_0px_#0B1B3D] focus:border-[#B89246]"
            >
              <option value="">เลือกประเภทงาน...</option>
              {(sets.jobTypes || []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-serif font-bold text-[#0B1B3D] mb-1.5 block uppercase">
              LOCATION // บริเวณ
            </label>
            <select
              value={informForm.location}
              onChange={(e) => setInformForm({ ...informForm, location: e.target.value })}
              required
              className="border-2 border-[#0B1B3D] px-3 py-2 w-full text-xs font-bold outline-none shadow-[2px_2px_0px_#0B1B3D] focus:border-[#B89246]"
            >
              <option value="">เลือกบริเวณ...</option>
              {(sets.locations || []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-serif font-bold text-[#0B1B3D] mb-1.5 block uppercase">
              DETAILS // รายละเอียดปัญหา
            </label>
            <textarea
              value={informForm.details}
              onChange={(e) => setInformForm({ ...informForm, details: e.target.value })}
              required
              rows="3"
              className="border-2 border-[#0B1B3D] px-3 py-2 w-full text-xs outline-none resize-none shadow-[2px_2px_0px_#0B1B3D] focus:border-[#B89246]"
            />
          </div>
          <div className="md:col-span-2 text-center mt-2">
            <button
              type="submit"
              className="bg-[#B89246] hover:bg-[#d4ac5d] text-[#0B1B3D] px-10 py-2.5 text-xs font-serif font-bold border-2 border-[#00F0FF] shadow-[3px_3px_0px_#00F0FF] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer uppercase tracking-wider"
            >
              + SUBMIT_INFORM // ส่งแจ้งงาน
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {carriedOverCount > 0 && (
            <div className="bg-[#0B1B3D] border-2 border-[#FFEA00] text-white p-3.5 shadow-[3px_3px_0px_#FFEA00] flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-[#102A43] border border-[#FFEA00]/60 shrink-0">
                  <Icon name="alert-triangle" size={18} className="text-[#FFEA00]" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-serif font-bold text-[#FFEA00] leading-tight">
                    ตรวจพบรายการค้างจากเดือนก่อนหน้าที่ยังไม่ได้เปิด Inform Job ({carriedOverCount} รายการ)
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-300 leading-tight mt-0.5 font-tech">
                    [ SYS_ALERT ]: ระบบยกยอดมาแสดงผลในรอบเดือนปัจจุบัน ({currentMonth}) โปรดตรวจสอบและเปิด Inform Job
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-tech font-bold bg-[#FFEA00] text-[#0B1B3D] px-2.5 py-1 border border-[#FFEA00] shrink-0 whitespace-nowrap shadow-[1px_1px_0px_#0B1B3D]">
                [ CARRIED: {carriedOverCount} ]
              </span>
            </div>
          )}

          <div className="bg-white border-2 border-[#0B1B3D] shadow-[4px_4px_0px_#0B1B3D] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0B1B3D] text-[#B89246] border-b-2 border-[#B89246] font-tech">
                  <tr>
                    <th className="p-3 w-32 border-r border-[#102A43]">[ 01 // DATE & ID ]</th>
                    <th className="p-3 border-r border-[#102A43]">[ 02 // JOB_DETAILS ]</th>
                    <th className="p-3 w-36 border-r border-[#102A43]">[ 03 // STATUS ]</th>
                    <th className="p-3 w-28 text-center">[ 04 // ACTION ]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B1B3D]/10">
                  {ft.map((j) => {
                    const isCarriedOver = j.status === 'รอดำเนินการ' && j.date && j.date.slice(0, 7) < currentMonth;
                    const isOpenedFromPrior = j.status === 'เปิด Inform Job แล้ว' && j.openedMonth === currentMonth && j.date && j.date.slice(0, 7) < currentMonth;

                    return (
                      <tr 
                        key={j.id} 
                        className={`border-b border-[#0B1B3D]/10 transition-colors ${
                          isCarriedOver 
                            ? 'bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-[#B89246]' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3 font-bold align-top font-tech">
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-slate-900">{fDate(j.date)}</span>
                            {isCarriedOver && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold bg-[#0B1B3D] text-[#FFEA00] border border-[#FFEA00]/50 shadow-[1px_1px_0px_#FFEA00]">
                                <Icon name="alert-triangle" size={10} className="text-[#FFEA00]" />
                                ค้างจากเดือนก่อน
                              </span>
                            )}
                            {isOpenedFromPrior && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold bg-[#060E21] text-[#00F0FF] border border-[#00F0FF]/50">
                                📋 เปิดในเดือนนี้
                              </span>
                            )}
                            <div className="text-[9px] text-[#00F0FF] bg-[#0B1B3D] px-1 py-0.2 border border-[#00F0FF]/30">
                              {j.id}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="font-serif font-bold text-[#0B1B3D] text-sm">
                            {getStdProj(j.project)}{' '}
                            <span className="font-tech text-xs text-[#B89246]">({j.area})</span>
                          </div>
                          <div className="text-slate-600 mt-1 font-sans text-[11px]">
                            {j.requesterName} {j.phone && `| TEL: ${j.phone}`}
                          </div>
                          <div className="flex gap-1 mt-1.5 mb-1 font-tech">
                            {j.jobType && (
                              <span className="bg-[#102A43] text-slate-200 px-1.5 py-0.2 text-[10px] border border-white/20">
                                {j.jobType}
                              </span>
                            )}
                            {j.location && (
                              <span className="bg-[#102A43] text-[#00F0FF] px-1.5 py-0.2 text-[10px] border border-[#00F0FF]/30">
                                {j.location}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-900 font-medium line-clamp-1 font-sans">
                            {j.details || '-'}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-tech font-bold border inline-block ${
                              j.status === 'เปิด Inform Job แล้ว'
                                ? 'bg-[#060E21] text-[#00F0FF] border-[#00F0FF]/60 shadow-[1px_1px_0px_#00F0FF]'
                                : 'bg-[#102A43] text-[#FFEA00] border-[#FFEA00]/60 shadow-[1px_1px_0px_#FFEA00]'
                            }`}
                          >
                            {j.status}
                          </span>
                          {j.informNo && (
                            <div className="text-[10px] text-[#0B1B3D] font-tech font-bold mt-1 bg-amber-50 px-1 border border-[#B89246] inline-block">
                              INFORM: #{j.informNo}
                            </div>
                          )}
                        </td>
                        <td className="p-3 align-top text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setInfView(j)}
                              className="text-[#0B1B3D] p-1.5 bg-[#F0F4F8] hover:bg-[#0B1B3D] hover:text-[#00F0FF] border border-[#0B1B3D]/30 shadow-[1px_1px_0px_#0B1B3D] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
                              title="ดูรายละเอียด"
                            >
                              <Icon name="search" size={13} />
                            </button>
                            {j.status === 'รอดำเนินการ' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openInfModal(j.id, 'open')}
                                  className="text-white p-1.5 bg-emerald-700 hover:bg-emerald-800 border border-emerald-900 shadow-[1px_1px_0px_#047857] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
                                  title="เปิด Inform Job"
                                >
                                  <Icon name="checkCircle" size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openInfModal(j.id, 'cancel')}
                                  className="text-white p-1.5 bg-amber-600 hover:bg-amber-700 border border-amber-800 shadow-[1px_1px_0px_#d97706] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
                                  title="ยกเลิก"
                                >
                                  <Icon name="xCircle" size={13} />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteInform(j)}
                              className="text-white p-1.5 bg-rose-600 hover:bg-rose-700 border border-rose-800 shadow-[1px_1px_0px_#e11d48] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
                              title="ลบ"
                            >
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {ft.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-slate-400 font-tech font-bold text-xs bg-slate-50">
                        [ NO_INFORM_ITEMS // ไม่มีรายการแจ้งงาน ]
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
