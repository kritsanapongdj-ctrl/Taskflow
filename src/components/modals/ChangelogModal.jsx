import React from 'react';

export const CURRENT_VERSION = 'v2.2.0';

export default function ChangelogModal({
  isOpen,
  onClose,
  onDismiss,
  Icon
}) {
  if (!isOpen) return null;

  const handleDismiss = () => {
    if (onDismiss) onDismiss();
    onClose();
  };

  const updates = [
    {
      icon: 'smartphone',
      title: 'การ์ดงานบนมือถือ (Mobile Responsive)',
      desc: 'ปรับหน้าจอ "งานประจำวัน" บนมือถือให้เป็นการ์ดรายการอ่านง่าย สบายตา ชื่อโครงการและรายละเอียดชัดเจน พร้อมปุ่มกดขนาดใหญ่ 44x44 px ใช้งานง่ายด้วยนิ้วโป้ง'
    },
    {
      icon: 'alertCircle',
      title: 'เพิ่มสถานะใหม่ "ติดปัญหา/รออะไหล่"',
      desc: 'ช่วยแยกแยะและติดตามงานที่ติดขัด รออะไหล่ หรือติดอุปสรรคหน้างานได้อย่างแม่นยำ ป้องกันการตกหล่น'
    },
    {
      icon: 'checkCircle2',
      title: 'ปรับปรุง Workflow สถานะงาน 4 ขั้นตอน',
      desc: 'เลือกเปลี่ยนสถานะงานได้รวดเร็ว: รอดำเนินการ ➔ กำลังดำเนินการ ➔ ติดปัญหา/รออะไหล่ ➔ จบงาน (รองรับข้อมูลเก่าในระบบเดิม 100%)'
    },
    {
      icon: 'bot',
      title: 'บอทสรุปงาน LINE รองรับสถานะใหม่',
      desc: 'ระบบรายงานงานค้างประจำวันของบอท จะกวาดทั้งงานกำลังดำเนินการและงานติดปัญหา/รออะไหล่ มารายงานทีมงานอัตโนมัติ'
    },
    {
      icon: 'award',
      title: 'ปรับปรุงการประเมินศักยภาพบุคลากร (ระบบหลังบ้าน)',
      desc: 'ปรับระบบวิเคราะห์ศักยภาพใหม่ สเตตัสระดับมาตรฐาน (5/10) จะไม่ถูกประเมินเป็นจุดอ่อน แต่แสดงเป็นข้อเสนอแนะในการพัฒนาและทักษะสนับสนุนอย่างสร้างสรรค์'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 transform transition-all">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0f2e4a] to-[#1a446c] p-5 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-[#bca374] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-xs">
                {CURRENT_VERSION}
              </span>
              <span className="text-xs text-blue-200 font-medium">อัปเดตระบบใหม่</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
              title="ปิด"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <h3 className="text-lg font-bold mt-2 text-white flex items-center gap-2">
            🚀 มีอะไรใหม่ใน LH TaskFlow
          </h3>
          <p className="text-xs text-blue-100/80 mt-0.5">
            ปรับปรุงประสิทธิภาพและประสบการณ์การใช้งานบนมือถือ
          </p>
        </div>

        {/* Modal Body: Updates List */}
        <div className="p-5 space-y-3.5 max-h-[65vh] overflow-y-auto">
          {updates.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#0f2e4a]/10 text-[#0f2e4a] flex items-center justify-center font-bold">
                <Icon name={item.icon} size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            จำค่าการแจ้งเตือนในอุปกรณ์นี้
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="bg-[#0f2e4a] hover:bg-[#1a446c] active:scale-[0.98] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
          >
            เข้าใจแล้ว & เริ่มใช้งาน
          </button>
        </div>
      </div>
    </div>
  );
}
