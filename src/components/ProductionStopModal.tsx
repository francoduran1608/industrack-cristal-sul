import React, { useState } from 'react';
import { X, AlertTriangle, Clock, Wrench, CheckCircle, ShieldAlert, Coffee, Cpu, Utensils, Moon } from 'lucide-react';
import { useStore } from '../store';
import { getWorkScheduleStatus, STOP_REASONS_CATALOG } from '../utils/workSchedule';
import { MachineInfo, MachineStatus } from '../types';

interface ProductionStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit?: string;
  defaultMachineId?: string;
}

export const ProductionStopModal: React.FC<ProductionStopModalProps> = ({ isOpen, onClose, unit, defaultMachineId }) => {
  const { toggleProductionOpen, currentUser, productionMachines, setMachineStatus } = useStore();
  const targetUnit = unit || currentUser?.unit || 'matriz';

  const schedule = getWorkScheduleStatus(new Date());
  
  // Default reason logic: if within 11h-13h scheduled lunch break, default to almoco_programado
  const defaultReasonId = schedule.isScheduledPause ? 'almoco_programado' : 'almoco_programado';
  const [selectedReasonId, setSelectedReasonId] = useState<string>(defaultReasonId);
  const [customReasonText, setCustomReasonText] = useState('');
  const [notes, setNotes] = useState('');
  
  // Scope: 'all' or specific machineId
  const [stopScope, setStopScope] = useState<string>(defaultMachineId || 'all');

  if (!isOpen) return null;

  const selectedReasonObj = STOP_REASONS_CATALOG.find(r => r.id === selectedReasonId);
  const isCustom = selectedReasonId === 'outros';

  const unitMachines = (productionMachines && productionMachines[targetUnit]) ? Object.values(productionMachines[targetUnit]) : [];

  const handleConfirm = () => {
    let finalReasonLabel = selectedReasonObj?.label || 'Pausa / Parada';
    let finalCustomReason = customReasonText.trim();

    if (isCustom && !finalCustomReason) {
      alert('Por favor, informe o motivo da parada da produção.');
      return;
    }

    const description = isCustom ? finalCustomReason : (selectedReasonObj?.label || 'Parada');

    if (stopScope !== 'all') {
      // Individual machine closure
      let machineStatus: MachineStatus = 'pausada_outros';
      if (selectedReasonId === 'almoco_programado') {
        machineStatus = 'pausada_almoco';
      } else if (selectedReasonId === 'fim_expediente') {
        machineStatus = 'encerrada_dia';
      } else if (selectedReasonId === 'quebra_maquina') {
        machineStatus = 'quebrada';
      } else if (selectedReasonId === 'manutencao_preventiva') {
        machineStatus = 'manutencao';
      }

      setMachineStatus(
        stopScope,
        machineStatus,
        description,
        notes.trim() || undefined,
        targetUnit
      );
    } else {
      // Entire production closure
      toggleProductionOpen(false, targetUnit, {
        reason: selectedReasonId,
        customReason: isCustom ? finalCustomReason : selectedReasonObj?.label,
        isScheduledPause: selectedReasonId === 'almoco_programado' || schedule.isScheduledPause,
        notes: notes.trim(),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Fechar / Pausar Produção</h2>
              <p className="text-xs text-rose-100 font-medium">Unidade: <span className="uppercase font-bold">{targetUnit}</span> | Pausa Geral ou por Máquina</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Work schedule context banner */}
          <div className={`p-3 rounded-lg border flex items-start gap-3 ${
            schedule.isScheduledPause 
              ? 'bg-blue-50/70 border-blue-200 text-blue-900' 
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}>
            <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${schedule.isScheduledPause ? 'text-blue-600' : 'text-amber-600'}`} />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <span>Horário Atual: {schedule.dayName}, {schedule.formattedCurrentTime}</span>
                {schedule.isOvertime && (
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                    Hora Extra
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                {schedule.isScheduledPause ? (
                  <span>✅ Você está no horário de <strong>intervalo programado de almoço (11:00 às 13:00)</strong>.</span>
                ) : (
                  <span>⚠️ O expediente normal é de 07:00 às 11:00 e de 13:00 às 17:00. Selecione abaixo se deseja pausar uma máquina individual ou a produção inteira:</span>
                )}
              </p>
            </div>
          </div>

          {/* Stop Scope (All vs Single Machine) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Cpu size={14} className="text-slate-500" />
              O que você deseja pausar / finalizar? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStopScope('all')}
                className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  stopScope === 'all'
                    ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <ShieldAlert size={16} className={stopScope === 'all' ? 'text-rose-600' : 'text-slate-400'} />
                <span className="text-xs">Toda a Fábrica</span>
                <span className="text-[10px] text-slate-500">(Ambas as máquinas)</span>
              </button>

              {unitMachines.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setStopScope(m.id)}
                  className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    stopScope === m.id
                      ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <Cpu size={16} className={stopScope === m.id ? 'text-rose-600' : 'text-slate-400'} />
                  <span className="text-xs truncate max-w-[120px]">{m.name.split('(')[0].trim()}</span>
                  <span className="text-[10px] text-slate-500">
                    ({m.lineType === 'pesada' ? 'Linha Pesada' : 'Linha Média'})
                  </span>
                </button>
              ))}
            </div>

            {stopScope !== 'all' && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px]">
                ℹ️ <strong>Pausa Individual:</strong> Apenas a máquina selecionada será pausada. As demais máquinas continuarão operando e carregando veículos normalmente.
              </div>
            )}
          </div>

          {/* Reason selection */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Motivo da Parada <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {STOP_REASONS_CATALOG.map((reason) => {
                const isSelected = selectedReasonId === reason.id;
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => setSelectedReasonId(reason.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left font-medium transition-all text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 border-rose-400 text-rose-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{reason.label}</span>
                    {isSelected && <CheckCircle size={14} className="text-rose-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom reason text input */}
          {isCustom && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Especifique o Motivo <span className="text-red-500">*</span>:
              </label>
              <input
                type="text"
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                placeholder="Ex: Vazamento na tubulação de vapor..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-white"
                autoFocus
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600">
              Observações / Detalhes Adicionais (Opcional):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Equipe em intervalo, retorno previsto em 1 hora..."
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 bg-slate-50 text-slate-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert size={14} />
            {stopScope === 'all' ? 'Confirmar Fechamento Geral' : 'Confirmar Pausa da Máquina'}
          </button>
        </div>
      </div>
    </div>
  );
};
