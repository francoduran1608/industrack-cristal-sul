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
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Use the bounding box width/height or contentRect
        const rect = container.getBoundingClientRect();
        const newWidth = rect.width;
        const newHeight = rect.height;

        if (newWidth <= 0 || newHeight <= 0) continue;

        // Save existing canvas image if drawing already started
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        const hasContent = canvas.width > 0 && canvas.height > 0;
        if (tempCtx && hasContent) {
          try {
            tempCtx.drawImage(canvas, 0, 0);
          } catch (e) {
            console.error(e);
          }
        }

        // Set actual canvas size to match container for crisp drawing
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Restore saved content if it was already drawn
          if (hasContent && tempCanvas.width > 0 && tempCanvas.height > 0) {
            try {
              ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
            } catch (e) {
              console.error(e);
            }
          }

          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#0f172a'; // slate-900
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
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
    if (isConfirmed) {
      setIsConfirmed(false);
      onSign(null);
    }

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
    <div className="flex flex-col items-center select-none pb-2 w-full">
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
            className={`text-[11px] font-black uppercase px-3.5 py-1.5 rounded transition-all flex items-center gap-1 cursor-pointer shadow-xs ${
              !hasDrawn
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : isConfirmed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white'
            }`}
          >
            {isConfirmed ? '✓ Assinatura Concluída' : 'Concluir Assinatura'}
          </button>
        </div>
      </div>
    </div>
  );
};
