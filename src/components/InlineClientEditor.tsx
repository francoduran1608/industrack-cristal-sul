import React, { useState } from 'react';
import { useStore } from '../store';
import { Pencil, Check, X } from 'lucide-react';

interface InlineClientEditorProps {
  vehicleId: string;
  initialClient: string;
  disabled?: boolean;
}

export const InlineClientEditor: React.FC<InlineClientEditorProps> = ({ vehicleId, initialClient, disabled }) => {
  const { updateMovementDetails } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(initialClient);

  React.useEffect(() => {
    setTempVal(initialClient);
  }, [initialClient]);

  if (isEditing) {
    return (
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          updateMovementDetails(vehicleId, { client: tempVal.trim() !== '' ? tempVal.trim() : undefined });
          setIsEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5"
      >
        <input
          required
          type="text"
          value={tempVal}
          onChange={(e) => setTempVal(e.target.value)}
          placeholder="Nome do cliente/destino"
          className="text-[11px] bg-white border border-blue-400 rounded-md px-2 py-0.5 outline-none font-medium focus:ring-1 focus:ring-blue-400 shadow-sm text-slate-800 w-36"
          autoFocus
        />
        <button 
          type="submit" 
          title="Salvar"
          className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-1 rounded-md border border-emerald-200 transition-colors shadow-xs cursor-pointer"
        >
          <Check size={11} className="stroke-[3]" />
        </button>
        <button 
          type="button" 
          title="Cancelar"
          onClick={() => {
            setTempVal(initialClient);
            setIsEditing(false);
          }} 
          className="text-slate-500 bg-slate-50 hover:bg-slate-100 p-1 rounded-md border border-slate-200 transition-colors shadow-xs cursor-pointer"
        >
          <X size={11} className="stroke-[3]" />
        </button>
      </form>
    );
  }

  return (
    <div 
      className="inline-flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {initialClient ? (
        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-150 uppercase tracking-wide">
          {initialClient}
        </span>
      ) : (
        <span className="text-[10px] text-slate-400 italic font-medium">Não informado</span>
      )}
      {!disabled && (
        <button 
          type="button" 
          onClick={() => setIsEditing(true)} 
          className="inline-flex items-center gap-1 text-[9px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider hover:bg-blue-50 px-1.5 py-0.5 rounded transition-all"
          title="Inserir/Editar cliente"
        >
          <Pencil size={9} />
          {initialClient ? 'Alterar' : '+ Cliente'}
        </button>
      )}
    </div>
  );
};
