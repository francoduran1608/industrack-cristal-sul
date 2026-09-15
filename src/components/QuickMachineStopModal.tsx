import React, { useState, useEffect } from 'react';
import { X, Wrench, AlertTriangle, AlertOctagon, Pause, Utensils, Moon, CheckCircle } from 'lucide-react';
import { useStore } from '../store';
import { MachineInfo, MachineStatus } from '../types';

interface QuickMachineStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: MachineInfo | null;
  unit?: string;
}

export const QuickMachineStopModal: React.FC<QuickMachineStopModalProps> = ({
  isOpen,
  onClose,
  machine,
  unit
}) => {
  const { setMachineStatus, currentUser } = useStore();
  const targetUnit = unit || currentUser?.unit || 'matriz';

  const [selectedStatus, setSelectedStatus] = useState<MachineStatus>('quebrada');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (machine) {
      if (machine.status !== 'operacional') {
        setSelectedStatus(machine.status);
        setReason(machine.reason || '');
        setNotes(machine.notes || '');
      } else {
        setSelectedStatus('quebrada');
        setReason('');
        setNotes('');
      }
    }
  }, [machine, isOpen]);

  if (!isOpen || !machine) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStatus === 'quebrada' && !reason.trim()) {
      alert('Por favor, informe o defeito ou motivo da quebra da máquina.');
      return;
    }

    let defaultReason = reason.trim();
    if (!defaultReason) {
      if (selectedStatus === 'manutencao') defaultReason = 'Manutenção Preventiva / Ajuste Técnico';
      else if (selectedStatus === 'pausada_outros') defaultReason = 'Pausa Operacional da Linha';
      else if (selectedStatus === 'pausada_almoco') defaultReason = 'Pausa para Almoço da Linha';
      else if (selectedStatus === 'encerrada_dia') defaultReason = 'Expediente Encerrado no Dia';
    }

    setMachineStatus(
      machine.id,
      selectedStatus,
      defaultReason,
      notes.trim() || undefined,
      targetUnit
    );

    onClose();
  };

  const statusOptions: {
    id: MachineStatus;
    title: string;
    description: string;
    icon: React.ReactNode;
    badgeClass: string;
    borderClass: string;
    bgSelected: string;
  }[] = [
    {
      id: 'quebrada',
      title: 'Máquina Quebrada',
      description: 'Falha mecânica, elétrica, pneumática ou corretiva emergencial',
      icon: <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />,
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
      borderClass: 'border-red-500 ring-2 ring-red-400/20',
      bgSelected: 'bg-red-50/70 border-red-400'
    },
    {
      id: 'manutencao',
      title: 'Manutenção / Ajuste',
      description: 'Manutenção preventiva, lubrificação, higienização ou calibração',
      icon: <Wrench className="w-5 h-5 text-amber-600 shrink-0" />,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      borderClass: 'border-amber-500 ring-2 ring-amber-400/20',
      bgSelected: 'bg-amber-50/70 border-amber-400'
    },
    {
      id: 'pausada_outros',
      title: 'Outra Pausa Operacional',
      description: 'Falta temporária de insumos/galões, alinhamento de equipe ou pausa interna',
      icon: <Pause className="w-5 h-5 text-slate-600 shrink-0" />,
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
      borderClass: 'border-slate-500 ring-2 ring-slate-400/20',
      bgSelected: 'bg-slate-100/80 border-slate-400'
    },
    {
      id: 'pausada_almoco',
      title: 'Horário de Almoço',
      description: 'Pausa para intervalo de refeição da equipe da linha',
      icon: <Utensils className="w-5 h-5 text-amber-600 shrink-0" />,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      borderClass: 'border-amber-500 ring-2 ring-amber-400/20',
      bgSelected: 'bg-amber-50/80 border-amber-400'
    },
    {
      id: 'encerrada_dia',
      title: 'Fim do Dia (Expediente Encerrado)',
      description: 'Encerramento oficial das operações desta máquina na data de hoje',
      icon: <Moon className="w-5 h-5 text-indigo-600 shrink-0" />,
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      borderClass: 'border-indigo-500 ring-2 ring-indigo-400/20',
      bgSelected: 'bg-indigo-50/80 border-indigo-400'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-yellow-600 text-white rounded-lg shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                <span>Parada / Status da {machine.name}</span>
              </h2>
              <p className="text-xs text-slate-300">
                Linha: <span className="font-bold uppercase text-yellow-400">{machine.lineType === 'pesada' ? 'Pesada (Carreta/Truck)' : 'Média (Toco/3/4)'}</span> | Unidade: <span className="uppercase font-bold text-blue-300">{targetUnit}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          
          <div className="space-y-2">
            <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
              Selecione o Tipo de Parada / Situação:
            </label>
            <div className="space-y-2">
              {statusOptions.map((opt) => {
                const isSelected = selectedStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedStatus(opt.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected 
                        ? opt.bgSelected + ' shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="mt-0.5">{opt.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 text-xs">{opt.title}</span>
                        {isSelected && (
                          <span className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1">
                            <CheckCircle size={13} /> Selecionado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Motivo / Descrição */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
              Motivo / Detalhes da Parada {selectedStatus === 'quebrada' && <span className="text-red-500 font-bold">*</span>}:
            </label>
            <input
              type="text"
              required={selectedStatus === 'quebrada'}
              placeholder={
                selectedStatus === 'quebrada' ? 'Ex: Esteira travada, vazamento no bico envasador...' :
                selectedStatus === 'manutencao' ? 'Ex: Lubrificação preventiva, troca de retentor...' :
                selectedStatus === 'pausada_outros' ? 'Ex: Aguardando remessa de garrafões, alinhamento...' :
                'Motivo ou observação adicional (opcional)'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Observações Opcionais */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
              Observações Técnicas / Previsão (Opcional):
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Técnico chamado, previsão de retorno em 30 minutos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Warning / Rules Info */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-950 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Regra de Produção:</strong> Ao pausar esta máquina, os veículos da sua fila serão pausados ou consolidados na outra máquina. Se <strong>todas as máquinas</strong> da fábrica forem pausadas (por almoço, fim do dia ou quebra), o sistema entenderá que a produção geral está <strong>Fechada / Pausada</strong> automaticamente.
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold uppercase text-[10px] tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold uppercase text-[10px] tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Wrench size={13} /> Confirmar Parada da Máquina
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
