import React from 'react';
import Cropper from 'react-easy-crop';

export default function AvatarCropModal({
  isOpen,
  onClose,
  cropModal,
  setCropModal,
  onCropComplete,
  onSave,
  Icon
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[100000] flex flex-col">
      <div className="flex justify-between items-center p-4 bg-[#0f2e4a] text-white shadow-md z-10">
        <h3 className="font-bold">ครอบตัดรูปโปรไฟล์</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg"
        >
          <Icon name="x" size={24} />
        </button>
      </div>
      <div className="flex-1 relative bg-black">
        <Cropper
          image={cropModal.imageSrc}
          crop={cropModal.crop}
          zoom={cropModal.zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={(crop) => setCropModal((prev) => ({ ...prev, crop }))}
          onCropComplete={onCropComplete}
          onZoomChange={(zoom) => setCropModal((prev) => ({ ...prev, zoom }))}
        />
      </div>
      <div className="p-6 bg-white flex flex-col gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.2)] z-10">
        <div className="flex items-center gap-4">
          <Icon name="zoomOut" size={20} className="text-gray-400" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={cropModal.zoom}
            onChange={(e) =>
              setCropModal((prev) => ({ ...prev, zoom: Number(e.target.value) }))
            }
            className="flex-1 accent-[#0f2e4a]"
          />
          <Icon name="zoomIn" size={20} className="text-gray-400" />
        </div>
        <button
          type="button"
          onClick={onSave}
          className="w-full bg-[#0f2e4a] text-white py-3 rounded-xl font-bold text-lg hover:bg-[#1a3f63] shadow-lg transition-transform active:scale-95"
        >
          ยืนยันรูปโปรไฟล์
        </button>
      </div>
    </div>
  );
}
