import React, { useState } from 'react';
import { X, Wrench, CheckCircle, AlertOctagon, RotateCcw, AlertTriangle, Cpu, Layers, Utensils, Moon, Play, Pause, Clock } from 'lucide-react';
import { useStore, defaultProductionMachines } from '../store';
import { MachineInfo, MachineStatus } from '../types';

interface MachineStatusManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit?: string;
}

export const MachineStatusManagerModal: React.FC<MachineStatusManagerModalProps> = ({ isOpen, onClose, unit }) => {
  const { productionMachines, setMachineStatus, resetAllMachines, setMachineCapacity: setMachineCapacityStore, currentUser } = useStore();
  const targetUnit = unit || currentUser?.unit || 'matriz';

  const machinesMap = (productionMachines && productionMachines[targetUnit]) 
    ? productionMachines[targetUnit] 
    : (defaultProductionMachines[targetUnit] || defaultProductionMachines.matriz);

  const machines = Object.values(machinesMap);

  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<MachineStatus>('quebrada');
  const [breakdownReason, setBreakdownReason] = useState('');
  const [breakdownNotes, setBreakdownNotes] = useState('');
  const [capacityInput, setCapacityInput] = useState<number>(0);

  if (!isOpen) return null;

  const stoppedMachines = machines.filter(m => m.status !== 'operacional');
  const brokenOrMaintenanceMachines = machines.filter(m => m.status === 'quebrada' || m.status === 'manutencao');
  const isSingleLineMode = brokenOrMaintenanceMachines.length === 1 && machines.length >= 2;
  const isAllBrokenMode = brokenOrMaintenanceMachines.length >= 2;

  const handleOpenEdit = (machine: MachineInfo) => {
    setEditingMachineId(machine.id);
    setSelectedStatus(machine.status === 'operacional' ? 'pausada_almoco' : machine.status);
    setBreakdownReason(machine.reason || '');
    setBreakdownNotes(machine.notes || '');
    setCapacityInput(machine.capacityPerHour || (machine.lineType === 'pesada' ? 600 : 400));
  };

  const handleQuickStatus = (machineId: string, status: MachineStatus, defaultReason?: string) => {
    setMachineStatus(
      machineId,
      status,
      status === 'operacional' ? undefined : defaultReason,
      undefined,
      targetUnit
    );
  };

  const handleSaveStatus = (machineId: string) => {
    if (selectedStatus === 'quebrada' && !breakdownReason.trim()) {
      alert('Por favor, informe o motivo da quebra da máquina.');
      return;
    }

    if (capacityInput > 0) {
      setMachineCapacityStore(machineId, capacityInput, targetUnit);
    }

    setMachineStatus(
      machineId,
      selectedStatus,
      selectedStatus === 'operacional' ? undefined : (breakdownReason.trim() || undefined),
      selectedStatus === 'operacional' ? undefined : (breakdownNotes.trim() || undefined),
      targetUnit
    );

    setEditingMachineId(null);
  };

  const handleRestoreNormal = () => {
    if (window.confirm('Deseja restaurar todas as máquinas para o status OPERACIONAL (Operação Normal)?')) {
      resetAllMachines(targetUnit);
    }
  };

  const getStatusBadge = (status: MachineStatus) => {
    switch (status) {
      case 'operacional':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">🟢 Operando</span>;
      case 'pausada_almoco':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">🍽️ Pausa Almoço</span>;
      case 'encerrada_dia':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-indigo-100 text-indigo-800 border-indigo-300">🌙 Expediente Encerrado</span>;
      case 'quebrada':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-red-100 text-red-800 border-red-300 animate-pulse">🔴 Quebrada</span>;
      case 'manutencao':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-yellow-100 text-yellow-800 border-yellow-300">🟡 Manutenção</span>;
      case 'pausada_outros':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-slate-100 text-slate-800 border-slate-300">⏸️ Pausa Operacional</span>;
      default:
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">🟢 Operando</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Status e Gestão Individual das Máquinas</h2>
              <p className="text-xs text-slate-300">Unidade: <span className="uppercase font-bold text-blue-300">{targetUnit}</span> | Controle Independente de Almoço, Expediente e Manutenção</p>
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
          {/* Explanation Banner */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-950 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Produção Independente por Máquina:</strong> Cada máquina pode sair para almoço ou encerrar o expediente separadamente (ex: Máquina 1 finaliza os carregamentos e sai para o almoço enquanto a Máquina 2 continua operando normalmente, ou uma encerra o expediente antes da outra).
            </p>
          </div>

          {/* Status banner */}
          {isSingleLineMode && (
            <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-950">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-black text-sm uppercase tracking-wide flex items-center gap-1.5 text-amber-800">
                  <span>⚠️ Modo Linha Única Emergencial Ativo</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Como uma das máquinas está inoperante por quebra/manutenção, o sistema consolidou automaticamente as filas de veículos pesados e médios em <strong>Fila Única</strong> na máquina operacional.
                </p>
              </div>
            </div>
          )}

          {isAllBrokenMode && (
            <div className="p-3.5 bg-red-500/10 border-2 border-red-500/30 rounded-xl flex items-start gap-3 text-red-950">
              <AlertOctagon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-black text-sm uppercase tracking-wide text-red-800">
                  🛑 Todas as Máquinas Paradas por Quebra/Manutenção
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Ambas as máquinas de produção estão inoperantes. A produção de vasilhames está temporariamente interrompida.
                </p>
              </div>
            </div>
          )}

          {/* Machine cards list */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-slate-500" />
              Máquinas Cadastradas ({machines.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {machines.map((machine) => {
                const isEditing = editingMachineId === machine.id;
                const isBroken = machine.status === 'quebrada';
                const isMaintenance = machine.status === 'manutencao';
                const isLunch = machine.status === 'pausada_almoco';
                const isClosed = machine.status === 'encerrada_dia';
                const isOtherPause = machine.status === 'pausada_outros';
                const isOp = machine.status === 'operacional';

                const cardBorderClass = isBroken 
                  ? 'border-red-300 bg-red-50/40 shadow-xs' 
                  : isMaintenance 
                    ? 'border-yellow-300 bg-yellow-50/40 shadow-xs' 
                    : isLunch 
                      ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                      : isClosed 
                        ? 'border-indigo-300 bg-indigo-50/40 shadow-xs'
                        : isOtherPause 
                          ? 'border-slate-300 bg-slate-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs';

                return (
                  <div
                    key={machine.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${cardBorderClass}`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-slate-800 tracking-tight block">
                            {machine.name}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Tipo de Linha: {machine.lineType === 'pesada' ? 'Pesada (Carreta/Truck)' : 'Média (Toco/3/4)'}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-blue-600 block">
                            Capacidade: {machine.capacityPerHour || (machine.lineType === 'pesada' ? 600 : 400)} u/h
                          </span>
                        </div>

                        {getStatusBadge(machine.status)}
                      </div>

                      {/* Card Details if stopped */}
                      {!isOp && (
                        <div className="mt-2.5 p-2.5 bg-white/90 border border-inherit rounded-lg text-slate-700 text-[11px] space-y-1 shadow-xs">
                          {machine.reason && (
                            <div className="font-bold text-slate-800">
                              Status: {machine.reason}
                            </div>
                          )}
                          {machine.notes && (
                            <div className="text-slate-500 italic">
                              Obs: {machine.notes}
                            </div>
                          )}
                          {machine.stoppedAt && (
                            <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 flex items-center justify-between">
                              <span>Início: {new Date(machine.stoppedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              {machine.stoppedBy && <span>Resp: {machine.stoppedBy}</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inline edit form */}
                    {isEditing ? (
                      <div className="pt-2 border-t border-slate-200 space-y-2.5 animate-in fade-in">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase">Alterar Status da Máquina:</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedStatus('operacional')}
                              className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                selectedStatus === 'operacional' 
                                  ? 'bg-emerald-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              🟢 Operando
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStatus('pausada_almoco')}
                              className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                selectedStatus === 'pausada_almoco' 
                                  ? 'bg-amber-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              🍽️ Almoço
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStatus('encerrada_dia')}
                              className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                selectedStatus === 'encerrada_dia' 
                                  ? 'bg-indigo-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              🌙 Fim do Dia
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStatus('quebrada')}
                              className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                selectedStatus === 'quebrada' 
                                  ? 'bg-red-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              🔴 Quebrada
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStatus('manutencao')}
                              className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                selectedStatus === 'manutencao' 
                                  ? 'bg-yellow-600 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              🟡 Manutenção
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStatus('pausada_outros')}
                              className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                selectedStatus === 'pausada_outros' 
                                  ? 'bg-slate-700 text-white shadow-xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              ⏸️ Outra Pausa
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase">Capacidade Nominal (Garrafões/Hora):</label>
                          <input
                            type="number"
                            min="1"
                            value={capacityInput}
                            onChange={(e) => setCapacityInput(Number(e.target.value))}
                            className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>

                        {selectedStatus !== 'operacional' && (
                          <>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-700">
                                Motivo / Descrição:
                              </label>
                              <input
                                type="text"
                                value={breakdownReason}
                                onChange={(e) => setBreakdownReason(e.target.value)}
                                placeholder={
                                  selectedStatus === 'pausada_almoco' ? 'Pausa para Almoço da Linha' :
                                  selectedStatus === 'encerrada_dia' ? 'Expediente da linha encerrado no dia' :
                                  selectedStatus === 'quebrada' ? 'Ex: Quebra do motor da esteira de envase...' :
                                  'Ex: Manutenção preventiva programada...'
                                }
                                className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-600">Observações adicionais:</label>
                              <textarea
                                rows={1}
                                value={breakdownNotes}
                                onChange={(e) => setBreakdownNotes(e.target.value)}
                                placeholder="Ex: Operadores liberados, previsão de retorno 13:00..."
                                className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                              />
                            </div>
                          </>
                        )}

                        <div className="flex gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingMachineId(null)}
                            className="flex-1 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveStatus(machine.id)}
                            className="flex-1 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs cursor-pointer"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Quick action buttons per machine */
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {isOp ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(machine.id, 'pausada_almoco', 'Pausa para Almoço')}
                              className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Pausar esta máquina para almoço"
                            >
                              <Utensils size={12} />
                              Almoço
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(machine.id, 'encerrada_dia', 'Expediente Encerrado (Fim do Dia)')}
                              className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Encerrar o dia desta máquina"
                            >
                              <Moon size={12} />
                              Encerrar Dia
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(machine)}
                              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Outras opções (quebra, manutenção, etc)"
                            >
                              <Wrench size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(machine.id, 'operacional')}
                              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <Play size={12} fill="currentColor" />
                              {isLunch ? 'Retornar do Almoço' : isClosed ? 'Reabrir Máquina' : 'Retomar Operação'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(machine)}
                              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Editar motivo ou detalhes"
                            >
                              <Wrench size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 shrink-0">
          <div>
            {stoppedMachines.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreNormal}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                Restaurar Todas as Máquinas (Operação Normal)
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
