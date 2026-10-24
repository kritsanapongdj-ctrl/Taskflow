import React, { useState, useEffect } from 'react';
import { getBangkokDateStr } from '../../utils/dateUtils.js';
import { verifyAdminPin } from '../../utils/security.js';

export default function InformDetailModal({
  inform,
  initialEditMode = false,
  onClose,
  onSave,
  onDelete,
  sets = {},
  getProjName = (p) => (typeof p === 'string' ? p.split('|')[0] : p?.name || ''),
  getProjArea = (p) => (typeof p === 'string' ? p.split('|')[1] || '' : p?.area || ''),
  getTStr = () => getBangkokDateStr(),
  fDate,
  Icon
}) {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [form, setForm] = useState({
    date: '',
    requesterName: '',
    phone: '',
    project: '',
    area: '',
    jobType: '',
    location: '',
    details: '',
    status: 'รอดำเนินการ',
    informNo: '',
    cancelReason: ''
  });

  useEffect(() => {
    setIsEditing(initialEditMode);
  }, [initialEditMode, inform]);

  useEffect(() => {
    if (inform) {
      setForm({
        ...inform,
        date: inform.date || getTStr(),
        requesterName: inform.requesterName || '',
        phone: inform.phone || '',
        project: inform.project || '',
        area: inform.area || '',
        jobType: inform.jobType || '',
        location: inform.location || '',
        details: inform.details || '',
        status: inform.status || 'รอดำเนินการ',
        informNo: inform.informNo || '',
        cancelReason: inform.cancelReason || ''
      });
    }
  }, [inform]);

  if (!inform) return null;

  const handleUnlockEdit = () => {
    const pwd = prompt('กรุณาใส่รหัสผู้ดูแลเพื่อแก้ไขข้อมูล:');
    if (pwd === null) return;
    if (!verifyAdminPin(pwd, 'inform_admin')) return alert('รหัสผู้ดูแลไม่ถูกต้อง!');
    setIsEditing(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.requesterName.trim()) return alert('กรุณาระบุชื่อผู้แจ้ง');
    if (!form.project) return alert('กรุณาเลือกโครงการ');

    const updated = {
      ...inform,
      ...form,
      requesterName: form.requesterName.trim(),
      phone: form.phone.trim(),
      informNo: form.status === 'เปิด Inform Job แล้ว' ? (form.informNo || '').trim() : '',
      cancelReason: form.status === 'ยกเลิก' ? (form.cancelReason || '').trim() : ''
    };

    if (form.status === 'เปิด Inform Job แล้ว' && !updated.openedMonth) {
      const today = getTStr();
      updated.openedDate = today;
      updated.openedMonth = today.slice(0, 7);
    }

    if (onSave) onSave(updated);
  };

  const projectOptions = (sets.projects || []).map((p) => getProjName(p)).filter(Boolean);
  if (form.project && !projectOptions.includes(form.project)) {
    projectOptions.unshift(form.project);
  }

  const jobTypeOptions = [...(sets.jobTypes || [])];
  if (form.jobType && !jobTypeOptions.includes(form.jobType)) {
    jobTypeOptions.unshift(form.jobType);
  }

  const locationOptions = [...(sets.locations || [])];
  if (form.location && !locationOptions.includes(form.location)) {
    locationOptions.unshift(form.location);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in border border-slate-200 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#003C71] p-4 flex justify-between items-center text-white border-b-2 border-[#A8996E]">
          <h3 className="font-bold flex items-center gap-2 text-sm">
            <Icon name={isEditing ? 'edit2' : 'search'} size={16} className="text-[#A8996E]" />
            <span>{isEditing ? 'แก้ไขข้อมูลแจ้งเปิดงาน (Inform Job)' : 'รายละเอียดรับแจ้งเปิดงาน'}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="text-white/80 hover:text-white cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[82vh] overflow-y-auto text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">วันที่แจ้ง</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">รหัสอ้างอิง</label>
                <input
                  type="text"
                  value={inform.id}
                  readOnly
                  className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-xl px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">ผู้แจ้ง</label>
                <input
                  type="text"
                  value={form.requesterName}
                  onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                  required
                  placeholder="ชื่อผู้แจ้ง"
                  className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">เบอร์ติดต่อ</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="เบอร์โทรศัพท์"
                  className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">โครงการ</label>
                <select
                  value={form.project}
                  onChange={(e) => {
                    const pData = (sets.projects || []).find(
                      (p) => getProjName(p) === e.target.value
                    );
                    setForm({
                      ...form,
                      project: e.target.value,
                      area: pData ? getProjArea(pData) : form.area
                    });
                  }}
                  required
                  className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none bg-white"
                >
                  <option value="">เลือกโครงการ...</option>
                  {projectOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">พื้นที่</label>
                <input
                  type="text"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="w-full border border-slate-200 bg-slate-50 text-slate-600 rounded-xl px-3 py-2 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">ประเภทงาน</label>
                <select
                  value={form.jobType}
                  onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                  required
                  className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none bg-white"
                >
                  <option value="">เลือกประเภทงาน...</option>
                  {jobTypeOptions.map((jt) => (
                    <option key={jt} value={jt}>
                      {jt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">บริเวณ</label>
                <select
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                  className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none bg-white"
                >
                  <option value="">เลือกบริเวณ...</option>
                  {locationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">สถานะ</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none bg-white font-semibold"
                >
                  <option value="รอดำเนินการ">รอดำเนินการ</option>
                  <option value="เปิด Inform Job แล้ว">เปิด Inform Job แล้ว</option>
                  <option value="ยกเลิก">ยกเลิก</option>
                </select>
              </div>
              {form.status === 'เปิด Inform Job แล้ว' && (
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">เลข Inform Job</label>
                  <input
                    type="text"
                    value={form.informNo}
                    onChange={(e) => setForm({ ...form, informNo: e.target.value })}
                    placeholder="ระบุเลข Inform..."
                    className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none uppercase font-mono"
                  />
                </div>
              )}
              {form.status === 'ยกเลิก' && (
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">เหตุผลที่ยกเลิก</label>
                  <input
                    type="text"
                    value={form.cancelReason}
                    onChange={(e) => setForm({ ...form, cancelReason: e.target.value })}
                    placeholder="ระบุเหตุผล..."
                    className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block">รายละเอียดปัญหา</label>
              <textarea
                rows="3"
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                required
                className="w-full border border-slate-200 focus:border-[#003C71] rounded-xl px-3 py-2 outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#003C71] hover:bg-[#002B52] text-white py-2.5 rounded-xl font-bold shadow-xs transition cursor-pointer"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        ) : (
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
                <span className="font-bold text-[#A8996E]">{inform.project}</span>
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
                <span className="font-bold text-[#003C71]">{inform.jobType || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold">บริเวณ</span>
                <br />
                <span className="font-bold text-[#003C71]">{inform.location || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold">สถานะ</span>
                <br />
                <span className="font-bold text-gray-800">{inform.status || '-'}</span>
              </div>
              {inform.informNo && (
                <div>
                  <span className="text-gray-400 font-bold">เลข Inform Job</span>
                  <br />
                  <span className="font-bold text-blue-600">#{inform.informNo}</span>
                </div>
              )}
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border text-sm shadow-inner">
              <span className="text-gray-500 font-bold text-xs mb-1 block">รายละเอียด:</span>
              <div className="whitespace-pre-wrap text-gray-700">{inform.details || '-'}</div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleUnlockEdit}
                className="flex-1 bg-[#003C71] hover:bg-[#002B52] text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Icon name="edit2" size={14} /> แก้ไขข้อมูล
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(inform)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  title="ลบรายการ"
                >
                  <Icon name="trash" size={14} /> ลบ
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
