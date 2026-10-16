import React from 'react';

export const CURRENT_VERSION = 'v2.4.0';

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
      icon: 'palette',
      iconBg: 'bg-[#7A1C28]/10 text-[#7A1C28]',
      title: 'ดีไซน์ใหม่ Corporate Minimalism & สบายตา',
      desc: 'โครงสร้างแบบ Card Grid สมดุล โปร่งสบายตาด้วย White Space เพิ่มระยะบรรทัดเพื่อลดความเมื่อยล้า ผสานคู่สีพรีเมียม Burgundy (#7A1C28) และ Deep Navy (#0F2E4A) บนพื้นผิวสีขาวและเทาอ่อนสะอาดตา พร้อมฟอนต์ Sans-serif (Prompt & Inter) อ่านง่ายทุกอุปกรณ์'
    },
    {
      icon: 'award',
      iconBg: 'bg-indigo-50 text-indigo-700',
      title: 'ระบบวิเคราะห์ศักยภาพทีมงาน Talent Engine 2.0',
      desc: 'ยกระดับการประเมิน 8 มิติด้วยเกณฑ์รูบริก BARS พิกัด 9-Box Grid แผนผัง Talent Morphology และการวิเคราะห์ความพร้อมสืบทอดตำแหน่ง (Succession Readiness)'
    },
    {
      icon: 'maximize2',
      iconBg: 'bg-sky-50 text-sky-700',
      title: 'ห้องตัดสินทีม Focus Mode & หน้าต่างแยกอิสระ',
      desc: 'ขยายหน้าจอวิเคราะห์ทีมงานเต็มจอไร้สิ่งรบกวน พร้อมปุ่มเปิดแท็บใหม่บนเบราว์เซอร์ เพื่อการประชุม Calibration และการประเมินที่คล่องตัว กดปุ่ม Esc เพื่อออกได้ทันที'
    },
    {
      icon: 'layers',
      iconBg: 'bg-emerald-50 text-emerald-700',
      title: 'การ์ดงานรายวัน & ตัวกรองบทบาทหน้าที่แบบสองชั้น',
      desc: 'จัดระเบียบงานรายวันด้วยการ์ดโปร่งตา ปุ่มสั่งการสัมผัสสะดวกสำหรับมือถือ พร้อมตัวกรองบทบาทหน้าที่ (Cascading Role Filter) แยกตามสายงานและโครงการอย่างแม่นยำ'
    },
    {
      icon: 'checkCircle2',
      iconBg: 'bg-amber-50 text-amber-700',
      title: 'Workflow สถานะ 4 ขั้นตอน & LINE Bot อัจฉริยะ',
      desc: 'จัดการสถานะงานชัดเจน: รอดำเนินการ ➔ กำลังดำเนินการ ➔ ติดปัญหา/รออะไหล่ ➔ จบงาน พร้อมบอทกวาดงานค้างแจ้งเตือนเข้ากลุ่มอัตโนมัติ'
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 transform transition-all font-sans">
        {/* Modal Header */}
        <div className="bg-[#0F2E4A] p-5 text-white relative border-b border-[#0F2E4A]/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-[#7A1C28] text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                {CURRENT_VERSION}
              </span>
              <span className="text-xs text-slate-300 font-medium">อัปเดตระบบใหม่</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="ปิด"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <h3 className="text-lg font-bold mt-2.5 text-white flex items-center gap-2">
            🚀 มีอะไรใหม่ใน LH TaskFlow
          </h3>
          <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
            สัมผัสประสบการณ์ Corporate Minimalism & ยกระดับการบริหารจัดการทีมอย่างมืออาชีพ
          </p>
        </div>

        {/* Modal Body: Updates List */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto bg-slate-50/50">
          {updates.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-card transition"
            >
              <div className={`w-9 h-9 shrink-0 rounded-lg ${item.iconBg} flex items-center justify-center font-bold shadow-2xs`}>
                <Icon name={item.icon} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-[#0F2E4A] flex items-center gap-1.5">
                  {item.title}
                </h4>
                <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            จำค่าการแจ้งเตือนเวอร์ชันนี้ในอุปกรณ์ของคุณ
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="bg-[#7A1C28] hover:bg-[#8F2230] active:scale-[0.98] text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition cursor-pointer"
          >
            เข้าใจแล้ว &amp; เริ่มใช้งาน
          </button>
        </div>
      </div>
    </div>
  );
}
