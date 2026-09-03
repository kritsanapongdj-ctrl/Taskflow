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
  const ft = informs.filter(
    (j) =>
      j.status !== 'ยกเลิก' &&
      j.date?.startsWith(gFilt.month) &&
      (gFilt.area === 'ทั้งหมด' || j.area === gFilt.area) &&
      (gFilt.project === 'ทั้งหมด' || getStdProj(j.project) === gFilt.project) &&
      (gFilt.status === 'ทั้งหมด' || j.status === gFilt.status) &&
      checkStaffMatch(j.project, gFilt.staffName)
  );

  return (
    <div className="space-y-4 animate-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border flex gap-2">
        <button
          type="button"
          onClick={() => setITab('form')}
          className={`flex-1 py-2 text-xs font-bold rounded ${
            iTab === 'form' ? 'bg-[#0f2e4a] text-white shadow' : 'bg-gray-100 text-gray-500'
          }`}
        >
          แจ้งเปิดงานใหม่
        </button>
        <button
          type="button"
          onClick={() => setITab('manage')}
          className={`flex-1 py-2 text-xs font-bold rounded ${
            iTab === 'manage' ? 'bg-[#0f2e4a] text-white shadow' : 'bg-gray-100 text-gray-500'
          }`}
        >
          จัดการสถานะ
        </button>
      </div>

      {iTab === 'form' ? (
        <form
          onSubmit={subInf}
          className="bg-white p-6 rounded-xl shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-4 border-t-4 border-t-[#bca374]"
        >
          <div>
            <label className="text-xs font-bold mb-1 block">วันที่</label>
            <input
              type="date"
              value={informForm.date}
              onChange={(e) => setInformForm({ ...informForm, date: e.target.value })}
              required
              className="border rounded-xl px-3 py-2 w-full text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">ผู้แจ้ง / เบอร์</label>
            <div className="flex gap-2">
              <input
                value={informForm.requesterName}
                onChange={(e) =>
                  setInformForm({ ...informForm, requesterName: e.target.value })
                }
                required
                placeholder="ชื่อ"
                className="border rounded-xl px-3 py-2 w-1/2 text-sm outline-none"
              />
              <input
                value={informForm.phone}
                onChange={(e) => setInformForm({ ...informForm, phone: e.target.value })}
                required
                placeholder="เบอร์โทร"
                className="border rounded-xl px-3 py-2 w-1/2 text-sm outline-none"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold mb-1 block">
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
              className="border rounded-xl px-3 py-2 w-full text-sm outline-none bg-blue-50"
            >
              <option value="">ทุกเจ้าหน้าที่ (ไม่กรอง)</option>
              {Array.from(
                new Set(
                  (sets.emails || []).map(
                    (e) => e.split('|')[2] || e.split('|')[0].split('@')[0]
                  )
                )
              )
                .filter(Boolean)
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">โครงการ (ออโต้พื้นที่)</label>
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
              className="border rounded-xl px-3 py-2 w-full text-sm outline-none"
            >
              <option value="">เลือก...</option>
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
            <label className="text-xs font-bold mb-1 block">พื้นที่</label>
            <input
              type="text"
              value={informForm.area}
              readOnly
              className="border rounded-xl px-3 py-2 w-full text-sm outline-none bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">ประเภทงาน</label>
            <select
              value={informForm.jobType}
              onChange={(e) => setInformForm({ ...informForm, jobType: e.target.value })}
              required
              className="border rounded-xl px-3 py-2 w-full text-sm outline-none"
            >
              <option value="">เลือก...</option>
              {(sets.jobTypes || []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">บริเวณ</label>
            <select
              value={informForm.location}
              onChange={(e) => setInformForm({ ...informForm, location: e.target.value })}
              required
              className="border rounded-xl px-3 py-2 w-full text-sm outline-none"
            >
              <option value="">เลือก...</option>
              {(sets.locations || []).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold mb-1 block">รายละเอียดปัญหา</label>
            <textarea
              value={informForm.details}
              onChange={(e) => setInformForm({ ...informForm, details: e.target.value })}
              required
              rows="3"
              className="border rounded-xl px-3 py-2 w-full text-sm outline-none resize-none"
            />
          </div>
          <div className="md:col-span-2 text-center mt-2">
            <button
              type="submit"
              className="bg-[#bca374] hover:bg-[#a38a5b] text-white px-10 py-2 rounded-lg text-sm font-bold shadow-md"
            >
              ส่งแจ้งงาน
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3 w-28">วันที่/ID</th>
                  <th className="p-3">ข้อมูลเบื้องต้น</th>
                  <th className="p-3 w-32">สถานะ</th>
                  <th className="p-3 w-28">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {ft.map((j) => (
                  <tr key={j.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-bold">
                      {fDate(j.date)}
                      <div className="text-[9px] text-gray-400 mt-1">{j.id}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-[#0f2e4a] text-sm">
                        {getStdProj(j.project)}{' '}
                        <span className="font-normal text-xs text-gray-500">({j.area})</span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {j.requesterName} {j.phone && `| เบอร์: ${j.phone}`}
                      </div>
                      <div className="flex gap-1 mt-1.5 mb-1">
                        {j.jobType && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium border">
                            {j.jobType}
                          </span>
                        )}
                        {j.location && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium border">
                            {j.location}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-700 font-medium line-clamp-1">
                        {j.details || '-'}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          j.status === 'เปิด Inform Job แล้ว'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
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
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setInfView(j)}
                          className="text-gray-400 hover:text-blue-600 p-1.5 bg-gray-100 rounded hover:bg-blue-50"
                          title="ดูรายละเอียด"
                        >
                          <Icon name="search" size={14} />
                        </button>
                        {j.status === 'รอดำเนินการ' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openInfModal(j.id, 'open')}
                              className="text-green-600 hover:text-green-700 p-1.5 bg-green-50 rounded hover:bg-green-100"
                              title="เปิด Inform Job"
                            >
                              <Icon name="checkCircle" size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openInfModal(j.id, 'cancel')}
                              className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded hover:bg-red-100"
                              title="ยกเลิก"
                            >
                              <Icon name="xCircle" size={14} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteInform(j)}
                          className="text-gray-400 hover:text-red-600 p-1.5 bg-gray-100 rounded hover:bg-red-50"
                          title="ลบ"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ft.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-gray-400">
                      ไม่มีรายการแจ้งงาน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
