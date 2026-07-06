import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, GripVertical } from 'lucide-react';

interface ColumnDef {
  id: string;
  header: React.ReactNode;
  cell: (row: any) => React.ReactNode;
  defaultWidth?: number;
}

interface DynamicTableProps {
  id: string;
  data: any[];
  columns: ColumnDef[];
  className?: string;
}

export const DynamicTable: React.FC<DynamicTableProps> = ({ id, data, columns, className }) => {
  const [colOrder, setColOrder] = useState<string[]>(columns.map(c => c.id));
  const [colWidths, setColWidths] = useState<Record<string, number>>(
    columns.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultWidth || 150 }), {})
  );

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem(`dynamic-table-${id}`);
    if (saved) {
      try {
        const { order, widths } = JSON.parse(saved);
        if (order && order.length === columns.length) {
          setColOrder(order);
        }
        if (widths) {
          setColWidths(w => ({ ...w, ...widths }));
        }
      } catch (e) {
        // ignore
      }
    }
  }, [id, columns.length]);

  // Save state
  useEffect(() => {
    localStorage.setItem(`dynamic-table-${id}`, JSON.stringify({ order: colOrder, widths: colWidths }));
  }, [colOrder, colWidths, id]);

  const handleMoveLeft = (colId: string) => {
    const idx = colOrder.indexOf(colId);
    if (idx > 0) {
      const newOrder = [...colOrder];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      setColOrder(newOrder);
    }
  };

  const handleMoveRight = (colId: string) => {
    const idx = colOrder.indexOf(colId);
    if (idx < colOrder.length - 1) {
      const newOrder = [...colOrder];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      setColOrder(newOrder);
    }
  };

  const startResizing = (colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[colId] || 150;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      setColWidths(prev => ({
        ...prev,
        [colId]: Math.max(50, startWidth + deltaX)
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // HTML5 Drag and Drop for columns
  const handleDragStart = (e: React.DragEvent, colId: string) => {
    e.dataTransfer.setData('text/plain', colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const sourceColId = e.dataTransfer.getData('text/plain');
    if (sourceColId && sourceColId !== targetColId) {
      const sourceIdx = colOrder.indexOf(sourceColId);
      const targetIdx = colOrder.indexOf(targetColId);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const newOrder = [...colOrder];
        newOrder.splice(sourceIdx, 1);
        newOrder.splice(targetIdx, 0, sourceColId);
        setColOrder(newOrder);
      }
    }
  };

  const orderedColumns = colOrder.map(id => columns.find(c => c.id === id)!).filter(Boolean);

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm bg-white">
      <table className={`w-full text-left text-xs border-collapse font-sans ${className || ''}`}>
        <thead>
          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[9px] relative">
            {orderedColumns.map((col, idx) => (
              <th 
                key={col.id} 
                className="py-3 px-3 font-black relative group select-none hover:bg-slate-200/50 transition-colors"
                style={{ width: colWidths[col.id], minWidth: colWidths[col.id], maxWidth: colWidths[col.id] }}
                draggable
                onDragStart={(e) => handleDragStart(e, col.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center justify-between w-full h-full overflow-hidden">
                  <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap" title={typeof col.header === 'string' ? col.header : ''}>
                    {col.header}
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1 bg-slate-100/90 rounded px-0.5">
                    <button onClick={(e) => { e.stopPropagation(); handleMoveLeft(col.id); }} disabled={idx === 0} className="hover:text-blue-600 disabled:opacity-30 cursor-pointer p-0.5" title="Mover para esquerda">
                      <ArrowLeft size={10} />
                    </button>
                    <span title="Arraste para reordenar" className="flex items-center">
                      <GripVertical size={10} className="text-slate-400 cursor-grab active:cursor-grabbing" />
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleMoveRight(col.id); }} disabled={idx === orderedColumns.length - 1} className="hover:text-blue-600 disabled:opacity-30 cursor-pointer p-0.5" title="Mover para direita">
                      <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
                {/* Resizer Handle */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-transparent hover:bg-blue-400/50 active:bg-blue-500 z-10 transition-colors"
                  onMouseDown={(e) => startResizing(col.id, e)}
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length > 0 ? (
            data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-slate-50/50 align-top group">
                {orderedColumns.map((col) => (
                  <td 
                    key={col.id} 
                    className="py-3 px-3 leading-relaxed break-words"
                    style={{ width: colWidths[col.id], minWidth: colWidths[col.id], maxWidth: colWidths[col.id] }}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-slate-400 font-medium bg-slate-50/30 text-xs">
                Nenhum dado encontrado para este período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
