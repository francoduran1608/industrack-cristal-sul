import React, { useState, useRef } from 'react';
import { Camera, Image, Check, X, RefreshCw, AlertCircle } from 'lucide-react';

interface OrderPhotoSelectorProps {
  onPhotoSelected: (base64Photo: string | null) => void;
  selectedPhoto: string | null;
}

export const OrderPhotoSelector: React.FC<OrderPhotoSelectorProps> = ({
  onPhotoSelected,
  selectedPhoto,
}) => {
  const [mode, setMode] = useState<'idle' | 'camera' | 'gallery'>('idle');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Video play error:", e));
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        'Não foi possível acessar a câmera do aparelho. Por favor, verifique a permissão ou use a opção de galeria.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const compressImage = (base64Str: string, callback: (compressed: string) => void) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxSize = 640;
      
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        callback(compressedBase64);
      } else {
        callback(base64Str);
      }
    };
    img.onerror = () => {
      callback(base64Str);
    };
    img.src = base64Str;
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        compressImage(dataUrl, (compressed) => {
          onPhotoSelected(compressed);
        });
        stopCamera();
        setMode('idle');
      }
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        compressImage(rawBase64, (compressed) => {
          onPhotoSelected(compressed);
        });
        setMode('idle');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelCamera = () => {
    stopCamera();
    setMode('idle');
  };

  return (
    <div className="mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-2 text-left">
        Foto do Pedido de Venda/Produção <span className="text-amber-600 font-normal italic">(Solicitado para veículos da produção)</span>
      </label>

      {/* Preview of the Selected Photo */}
      {selectedPhoto ? (
        <div className="relative border border-slate-205 rounded-lg overflow-hidden bg-white shadow-xs max-w-full">
          <img
            src={selectedPhoto}
            alt="Pedido"
            className="w-full h-40 object-contain bg-slate-900"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => onPhotoSelected(null)}
              className="bg-red-650 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md hover:scale-105 transition-all cursor-pointer"
              title="Remover Foto"
            >
              <X size={15} />
            </button>
          </div>
          <div className="bg-slate-900/80 text-white text-[10px] uppercase font-bold py-1 px-2.5 flex items-center justify-between">
            <span>Imagem do Pedido Carregada</span>
            <span className="text-emerald-400 font-black">Pronto ✓</span>
          </div>
        </div>
      ) : mode === 'camera' ? (
        /* Native Webcam Stream View */
        <div className="space-y-3">
          {cameraError ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex gap-2 items-start text-left">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase text-[10px] mb-1">Acesso à Câmera Falhou</p>
                <p className="text-slate-600 leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    setMode('idle');
                  }}
                  className="mt-2 text-[10px] text-blue-650 hover:underline font-bold uppercase"
                >
                  Ok, voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-black shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-56 object-cover bg-black"
              />
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelCamera}
                  className="bg-slate-900/95 hover:bg-slate-900 text-white border border-slate-700 font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center gap-1 shadow-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-102 transition-transform"
                >
                  <Camera size={13} /> Capturar Foto
                </button>
              </div>
              <div className="absolute top-2 left-2 bg-black/60 rounded px-2 py-0.5 text-white font-mono text-[9px] tracking-widest uppercase">
                CÂMERA ATIVA
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Action Buttons Selector (Idle mode) */
        <div className="grid grid-cols-2 gap-2">
          {/* Take Photo Widget Button */}
          <button
            type="button"
            onClick={startCamera}
            className="flex flex-col items-center justify-center p-3.5 border border-dashed border-slate-300 hover:border-blue-400 rounded-lg hover:bg-blue-50/20 text-slate-600 hover:text-blue-700 transition-all gap-1.5 cursor-pointer shadow-xs active:bg-blue-50/35"
          >
            <Camera size={20} className="stroke-[2]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Tirar Foto</span>
            <span className="text-[9px] text-slate-400 font-medium normal-case">Usar câmera integrada</span>
          </button>

          {/* Import Gallery Widget Button */}
          <label className="flex flex-col items-center justify-center p-3.5 border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-700 transition-all gap-1.5 cursor-pointer shadow-xs active:bg-indigo-50/35">
            <input
              type="file"
              accept="image/*"
              onChange={handleGalleryUpload}
              className="hidden"
            />
            <Image size={20} className="stroke-[2]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Foto da Galeria</span>
            <span className="text-[9px] text-slate-400 font-medium normal-case">Selecionar arquivo</span>
          </label>
        </div>
      )}
    </div>
  );
};
