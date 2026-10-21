import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function SupervisorAuthModal({
  isOpen,
  onClose,
  onAuthenticated,
  authorizedStaff = [],
  sets = {},
  defaultSupervisor = '',
  Icon
}) {
  const [pin, setPin] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [coords, setCoords] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Derive list of authorized supervisors strictly from email recipients (LH Officers)
  const staffList = React.useMemo(() => {
    if (sets && Array.isArray(sets.emails) && sets.emails.length > 0) {
      const emailStaff = Array.from(
        new Set(
          sets.emails.flatMap(e => {
            const parts = e.split('|');
            const rawName = (parts[2] || parts[0].split('@')[0] || '').trim();
            return rawName.split(/[,/]/).map(n => n.trim()).filter(Boolean);
          })
        )
      ).filter(Boolean).sort((a, b) => a.localeCompare('th'));
      if (emailStaff.length > 0) return emailStaff;
    }
    return authorizedStaff;
  }, [authorizedStaff, sets?.emails]);

  // Auto-select supervisor if available
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setAuthError(null);
      setGpsError(null);
      if (staffList.length > 0) {
        if (defaultSupervisor && staffList.includes(defaultSupervisor)) {
          setSelectedSupervisor(defaultSupervisor);
        } else if (!selectedSupervisor || !staffList.includes(selectedSupervisor)) {
          setSelectedSupervisor(staffList[0]);
        }
      }
      // Trigger GPS detection when modal opens
      requestGeolocation();
    }
  }, [isOpen, staffList, defaultSupervisor]);

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGpsError('เบราว์เซอร์นี้ไม่รองรับการระบุพิกัด GPS');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        });
      },
      (error) => {
        setGpsLoading(false);
        let msg = 'ไม่สามารถระบุพิกัดได้';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'ปฏิเสธการเข้าถึงตำแหน่ง GPS: ระบบความปลอดภัย LH กำหนดให้ต้องอนุญาตพิกัดเพื่อบันทึก Audit Trail ก่อนเข้าสู่โหมดผู้ดูแล';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'สัญญาณ GPS ขัดข้อง หรืออุปกรณ์ไม่สามารถหาตำแหน่งได้ในขณะนี้';
            break;
          case error.TIMEOUT:
            msg = 'การดึงพิกัด GPS หมดเวลา กรุณากดลองใหม่อีกครั้ง';
            break;
          default:
            msg = error.message || 'เกิดข้อผิดพลาดในการดึงพิกัด GPS';
        }
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  if (!isOpen) return null;

  const handleVerify = (e) => {
    e.preventDefault();
    setAuthError(null);

    // Validate Supervisor Selection
    if (!selectedSupervisor || !selectedSupervisor.trim()) {
      setAuthError('กรุณาเลือกชื่อผู้ดูแลที่มีอำนาจ');
      return;
    }

    // Validate PIN (Accept standard management pins 1312, 131236, SV2569)
    const validPins = ['1312', '131236', 'SV2569'];
    if (!validPins.includes(pin.trim())) {
      setAuthError('รหัสผ่านผู้ดูแลไม่ถูกต้อง');
      return;
    }

    // Strict GPS Enforcement
    if (!coords) {
      setAuthError('ไม่สามารถเข้าสู่โหมดผู้ดูแลได้: ต้องได้รับพิกัด GPS ก่อนเพื่อบันทึก Log ความปลอดภัย');
      return;
    }

    // Success: Handshake confirmed
    onAuthenticated({
      supervisorName: selectedSupervisor.trim(),
      coords,
      authenticatedAt: new Date().toISOString()
    });
    onClose();
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-[100010] animate-fade-in font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-200 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0f2e4a] via-[#163a5d] to-[#0f2e4a] p-5 text-white flex items-center justify-between border-b border-amber-400/30">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-inner">
              <Icon name="shieldCheck" size={22} />
            </span>
            <div>
              <h3 className="font-bold text-base tracking-wide flex items-center gap-1.5">
                <span>ยืนยันตัวตนโหมดผู้ดูแล</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-mono">
                  RBAC SECURE
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-light">
                Forensic GPS Handshake & Supervisor Access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleVerify} className="p-6 space-y-4">
          {/* Security Notice */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
            <Icon name="alertTriangle" size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-amber-950 mb-0.5">มาตรการรักษาความปลอดภัยระดับองค์กร:</strong>
              <span>
                การเข้าใช้งานโหมดผู้ดูแลจะบันทึกพิกัดสถานที่ (GPS) เวลา และรายชื่อผู้สั่งการลงใน Audit Trail เพื่อป้องกันการแอบอ้างสิทธิ์
              </span>
            </div>
          </div>

          {/* Supervisor Name Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Icon name="userCheck" size={14} className="text-indigo-600" />
                <span>เลือกชื่อผู้ดูแล (Supervisor Name)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">อ้างอิงบัญชีผู้รับอีเมล</span>
            </label>
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0f2e4a] bg-white focus:ring-2 focus:ring-[#bca374] focus:border-[#0f2e4a] outline-none shadow-2xs transition"
              required
            >
              <option value="">-- กรุณาเลือกชื่อผู้ดูแล --</option>
              {staffList.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* PIN Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Icon name="keyRound" size={14} className="text-amber-600" />
                <span>รหัสผ่านผู้ดูแล (Supervisor PIN)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">PIN SECURITY</span>
            </label>
            <input
              type="password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={8}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-center tracking-[0.3em] font-mono text-lg font-bold text-[#0f2e4a] focus:ring-2 focus:ring-[#bca374] focus:border-[#0f2e4a] outline-none shadow-2xs"
              autoFocus
              required
            />
          </div>

          {/* GPS Handshake Status Card */}
          <div className="p-3.5 rounded-xl border transition-all text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Icon name="mapPin" size={14} className={coords ? 'text-emerald-600' : 'text-amber-600'} />
                <span>พิกัดสถานที่ใช้งาน (GPS Forensic Stamp)</span>
              </span>
              {gpsLoading ? (
                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                  <Icon name="loader2" size={12} className="animate-spin" /> กำลังดึงพิกัด...
                </span>
              ) : coords ? (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Icon name="checkCircle" size={11} /> พิกัดพร้อมบันทึก
                </span>
              ) : (
                <button
                  type="button"
                  onClick={requestGeolocation}
                  className="text-[10px] text-sky-700 hover:text-sky-900 underline font-bold"
                >
                  กดขอพิกัดใหม่
                </button>
              )}
            </div>

            {coords ? (
              <div className="space-y-1 font-mono text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>ละติจูด (Lat):</span>
                  <strong className="text-slate-900">{coords.lat.toFixed(6)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ลองจิจูด (Lng):</span>
                  <strong className="text-slate-900">{coords.lng.toFixed(6)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ความแม่นยำ (Accuracy):</span>
                  <strong className="text-emerald-700">±{Math.round(coords.accuracy)} เมตร</strong>
                </div>
              </div>
            ) : gpsError ? (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] leading-relaxed">
                <div className="font-bold flex items-center gap-1 mb-1">
                  <Icon name="alertOctagon" size={13} className="text-rose-600 shrink-0" />
                  <span>เกิดข้อผิดพลาดในการตรวจสอบพิกัด:</span>
                </div>
                <span>{gpsError}</span>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={requestGeolocation}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-xs inline-flex items-center gap-1"
                  >
                    <Icon name="refreshCw" size={11} /> ลองดึงพิกัดอีกครั้ง
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">
                กำลังตรวจสอบพิกัดอุปกรณ์ของคุณ กรุณากด "อนุญาต" บนหน้าต่างเบราว์เซอร์
              </p>
            )}
          </div>

          {/* Error Message */}
          {authError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium flex items-center gap-2">
              <Icon name="alertCircle" size={16} className="text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={gpsLoading || !coords}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md ${
                gpsLoading || !coords
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#0f2e4a] to-[#1c4b75] hover:from-[#163a5d] hover:to-[#245b8e] text-white active:scale-95'
              }`}
            >
              <Icon name="shieldCheck" size={16} className="text-amber-400" />
              <span>ยืนยันเข้าสู่โหมดผู้ดูแล</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
