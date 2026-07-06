import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSign: (signature: string | null) => void;
  width?: number | string;
  height?: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSign, width = '100%', height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      // Set actual canvas size to match container for crisp drawing
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a'; // slate-900
      }
    }
  }, []);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Capture pointer so pointer events are sent to canvas even if pointer moves outside
    canvas.setPointerCapture(e.pointerId);

    setIsDrawing(true);
    setHasDrawn(true);
    setIsConfirmed(false); // Reset confirmation if they start drawing again

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (isDrawing && canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
  };

  const confirmSignature = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasDrawn && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSign(dataUrl);
      setIsConfirmed(true);
    }
  };

  const clearPad = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      setIsConfirmed(false);
      onSign(null);
    }
  };

  return (
    <div className="flex flex-col items-center select-none">
      <div 
        ref={containerRef}
        className="border-2 border-slate-300 rounded-lg overflow-hidden touch-none"
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="w-full h-full cursor-crosshair bg-white"
        />
      </div>
      <div className="flex justify-between items-center w-full mt-2 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Assinatura</span>
          {isConfirmed ? (
            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
              Concluída ✓
            </span>
          ) : hasDrawn ? (
            <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
              Pendente de Conclusão
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
              Vazia
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={clearPad} 
            className="text-[10px] font-bold text-red-600 uppercase hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors cursor-pointer"
          >
            Limpar
          </button>
          
          <button 
            type="button"
            disabled={!hasDrawn || isConfirmed}
            onClick={confirmSignature}
            className={`text-[10px] font-bold uppercase px-3 py-1 rounded transition-all cursor-pointer ${
              !hasDrawn
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : isConfirmed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            {isConfirmed ? 'Confirmado' : 'Concluir'}
          </button>
        </div>
      </div>
    </div>
  );
};
