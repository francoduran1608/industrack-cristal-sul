import React, { useState, useEffect } from 'react';
import { useStore, cleanOccurrenceTypeName, defaultProductionMachines } from '../store';
import { Movement, MachineInfo } from '../types';
import { calculateKanbanForecasts } from '../utils/productionAverage';
import { getWorkScheduleStatus } from '../utils/workSchedule';
import { Search, FileText, Printer, ArrowLeft, Check, CheckSquare, XCircle, AlertCircle, Info, Download, ExternalLink, X, KanbanSquare, List, Pause, Play, Droplet, Lock, Unlock, Wrench, AlertTriangle, Cpu, Clock, ShieldAlert, Layers, Sun, Sunset, Droplets, Gauge } from 'lucide-react';
import { InlineClientEditor } from '../components/InlineClientEditor';
import { ProductionControlModal } from '../components/ProductionControlModal';
import { ProductionStopModal } from '../components/ProductionStopModal';
import { MachineStatusManagerModal } from '../components/MachineStatusManagerModal';
import { QuickMachineStopModal } from '../components/QuickMachineStopModal';
import { MachineStopsReportView } from '../components/MachineStopsReportView';

export const FilaProducao: React.FC = () => {
  const { 
    movements, 
    updateMovementStatus, 
    updateKanbanStep, 
    toggleProductionOpen, 
    productionOpen, 
    productionMachines,
    productionStatusDetails,
    setMachineStatus,
    pauseMachineForLunch,
    endMachineDay,
    resumeMachineOperation,
    resetAllMachines,
    currentUser, 
    customVehicleCategories = [], 
    companyLogo, 
    avgTimeDischarging = 30, 
    avgTimeLoading = 45, 
    registeredVehicles = [], 
    customAvariaTypes = [] 
  } = useStore();
  const targetUnit = currentUser?.unit || 'matriz';
  const hasWriteAccess = currentUser?.role !== 'visualizador' && currentUser?.role !== 'supervisor';

  // Machine breakdown and single line mode calculations
  const unitMachines = (productionMachines && productionMachines[targetUnit]) 
    ? productionMachines[targetUnit] 
    : (defaultProductionMachines[targetUnit] || defaultProductionMachines.matriz);
  const machinesList: MachineInfo[] = Object.values(unitMachines);
  const brokenMachines = machinesList.filter(m => m.status === 'quebrada' || m.status === 'manutencao');
  const lunchMachines = machinesList.filter(m => m.status === 'pausada_almoco');
  const closedDayMachines = machinesList.filter(m => m.status === 'encerrada_dia');
  const allStoppedMachines = machinesList.filter(m => m.status !== 'operacional');
  const operationalMachines = machinesList.filter(m => m.status === 'operacional');
  const allMachinesStopped = machinesList.length > 0 && machinesList.every(m => m.status !== 'operacional');

  const isProductionOpen = (productionOpen?.[targetUnit] !== false) && !allMachinesStopped;
  const isReadOnly = !hasWriteAccess || !isProductionOpen;

  const isSingleLineMode = targetUnit !== 'filial' && machinesList.length >= 2 && brokenMachines.length === 1;
  const isAllBrokenMode = targetUnit !== 'filial' && machinesList.length >= 2 && brokenMachines.length >= machinesList.length;
  const activeMachine = operationalMachines[0];
  const brokenMachine = brokenMachines[0];

  const currentStatusDetail = productionStatusDetails?.[targetUnit];
  const scheduleStatus = getWorkScheduleStatus(new Date());

  const [showStopModal, setShowStopModal] = useState(false);
  const [showMachineManagerModal, setShowMachineManagerModal] = useState(false);
  const [quickStopMachine, setQuickStopMachine] = useState<MachineInfo | null>(null);

  const isPurchaseType = (type: any): boolean => {
    if (!type || typeof type !== 'string') return false;
    const cleaned = cleanOccurrenceTypeName(type).toLowerCase().trim();
    const found = (customAvariaTypes || []).find(t => cleanOccurrenceTypeName(t?.type || '').toLowerCase().trim() === cleaned);
    if (found) {
      return found.category === 'compra' || found.category === 'vasilhame_rota';
    }
    const norm = (type || '').toLowerCase().trim();
    return norm === 'vasilhame de rota' || norm.startsWith('+') || norm.includes('compra') || norm.includes('são pedro') || norm.includes('sao pedro') || norm.includes('prime') || norm.includes('rota');
  };

  const forecasts = calculateKanbanForecasts(
    movements,
    avgTimeDischarging,
    avgTimeLoading,
    currentUser?.unit,
    registeredVehicles
  );

  // View state
  const [activeTab, setActiveTab] = useState<'lista' | 'kanban'>('lista');
  const [showKanbanReport, setShowKanbanReport] = useState(false);
  const [showMachineStopsModal, setShowMachineStopsModal] = useState(false);
  const [selectedVehicleForProduction, setSelectedVehicleForProduction] = useState<Movement | null>(null);
  const [productionFocusPhase, setProductionFocusPhase] = useState<'descarregamento' | 'carregamento' | 'all'>('all');
  const [productionTransitionOnSave, setProductionTransitionOnSave] = useState<'aguardando_carregamento' | 'concluido' | null>(null);

  const [activePauseMenuVehicleId, setActivePauseMenuVehicleId] = useState<string | null>(null);

  // Search filter states
  const [searchPlate, setSearchPlate] = useState('');
  const [searchDriver, setSearchDriver] = useState('');

  // Report view toggle state
  const [reportMode, setReportMode] = useState(false);
  const [timeReportMode, setTimeReportMode] = useState(false);
  const [printType, setPrintType] = useState<'queue' | 'times'>('queue');
  const [showPrintGuide, setShowPrintGuide] = useState(false);

  // Shared Time Report Filter States
  const [timeReportFilterDate, setTimeReportFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeReportFilterPlate, setTimeReportFilterPlate] = useState('');
  const [timeReportFilterDriver, setTimeReportFilterDriver] = useState('');
  const [timeReportFilterClient, setTimeReportFilterClient] = useState('');

  // Auto print when URL param is present
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoPrint') === 'true') {
      // Force reportMode to true so the report page actually displays before invoking native print
      setReportMode(true);
      const timer = setTimeout(() => {
        window.print();
      }, 1200);
      return () => clearTimeout(timer);
    } else if (params.get('autoPrintTime') === 'true') {
      // Load filters from URL if present
      const fDate = params.get('filterDate');
      const fPlate = params.get('filterPlate');
      const fDriver = params.get('filterDriver');
      const fClient = params.get('filterClient');
      
      if (fDate !== null) setTimeReportFilterDate(fDate);
      if (fPlate !== null) setTimeReportFilterPlate(fPlate);
      if (fDriver !== null) setTimeReportFilterDriver(fDriver);
      if (fClient !== null) setTimeReportFilterClient(fClient);

      setTimeReportMode(true);
      const timer = setTimeout(() => {
        window.print();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const getLineType = (type: string) => ['carreta', 'truck'].includes(type) ? 'pesada' : 'media';

  const matchesSearch = (m: Movement) => {
    const plateMatches = m.plate.toUpperCase().includes(searchPlate.toUpperCase().trim());
    const driverMatches = m.driver.toLowerCase().includes(searchDriver.toLowerCase().trim());
    return plateMatches && driverMatches;
  };

  const queuePesada = movements
    .filter(m => 
      m.status !== 'saida' && 
      m.status !== 'concluido' && 
      !m.bypassProduction &&
      (m.unit || 'matriz') === (currentUser?.unit || 'matriz') &&
      getLineType(m.vehicleType) === 'pesada' &&
      matchesSearch(m)
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const queueMedia = movements
    .filter(m => 
      m.status !== 'saida' && 
      m.status !== 'concluido' && 
      !m.bypassProduction &&
      (m.unit || 'matriz') === (currentUser?.unit || 'matriz') &&
      getLineType(m.vehicleType) === 'media' &&
      matchesSearch(m)
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const isFilial = currentUser?.unit === 'filial';

  const queueFilial = movements
    .filter(m => 
      m.status !== 'saida' && 
      m.status !== 'concluido' && 
      !m.bypassProduction &&
      (m.unit || 'matriz') === (currentUser?.unit || 'matriz') &&
      matchesSearch(m)
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const queueSingleLine = movements
    .filter(m => 
      m.status !== 'saida' && 
      m.status !== 'concluido' && 
      !m.bypassProduction &&
      (m.unit || 'matriz') === (currentUser?.unit || 'matriz') &&
      matchesSearch(m)
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Trigger browser print action
  const handlePrint = (type: 'queue' | 'times' = 'queue') => {
    setPrintType(type);
    if (isIframe) {
      setShowPrintGuide(true);
    } else {
      window.print();
    }
  };

  const handleExportCSV = () => {
    const headers = ['Fila/Linha', 'Posicao', 'Placa', 'Categoria', 'Proprietario', 'Condutor', 'Cliente', 'Horario Entrada', 'Vistoria Status', 'Status Geral'];
    const rows: any[] = [];
    
    if (isFilial) {
      queueFilial.forEach((m, idx) => {
        const isChecked = m.checklist && m.checklist.brakes && m.checklist.tires;
        rows.push([
          'Fila de Produção Filial',
          `${idx + 1}º`,
          m.plate,
          customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType,
          m.ownerType,
          m.driver,
          m.client || '',
          new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          m.ownerType === 'terceiro' ? 'DISPENSADO' : (isChecked ? 'REALIZADA' : 'PENDENTE'),
          m.status.toUpperCase().replace('_', ' ')
        ]);
      });
    } else {
      queuePesada.forEach((m, idx) => {
        const isChecked = m.checklist && m.checklist.brakes && m.checklist.tires;
        rows.push([
          'Linha Pesada',
          `${idx + 1}º`,
          m.plate,
          customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType,
          m.ownerType,
          m.driver,
          m.client || '',
          new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          m.ownerType === 'terceiro' ? 'DISPENSADO' : (isChecked ? 'REALIZADA' : 'PENDENTE'),
          m.status.toUpperCase().replace('_', ' ')
        ]);
      });
      
      queueMedia.forEach((m, idx) => {
        const isChecked = m.checklist && m.checklist.brakes && m.checklist.tires;
        rows.push([
          'Linha Média',
          `${idx + 1}º`,
          m.plate,
          customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType,
          m.ownerType,
          m.driver,
          m.client || '',
          new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          m.ownerType === 'terceiro' ? 'DISPENSADO' : (isChecked ? 'REALIZADA' : 'PENDENTE'),
          m.status.toUpperCase().replace('_', ' ')
        ]);
      });
    }
    
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
      
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fila_producao_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Kanban Data
  const K_STEPS = [
    { id: 'aguardando_descarregamento', label: 'Aguardando Descarregamento', color: 'bg-slate-100 border-slate-300' },
    { id: 'descarregamento', label: 'Descarregamento', color: 'bg-indigo-50 border-indigo-200' },
    { id: 'aguardando_carregamento', label: 'Aguardando Carregamento', color: 'bg-amber-50 border-amber-200' },
    { id: 'carregamento', label: 'Carregamento', color: 'bg-emerald-50 border-emerald-200' },
    { id: 'concluido', label: 'Concluídos', color: 'bg-blue-50 border-blue-200' }
  ] as const;

  const getVehicleMachine = (vehicle: Movement): MachineInfo | undefined => {
    if (targetUnit === 'filial') return undefined;
    const line = getLineType(vehicle.vehicleType);
    const machineId = line === 'pesada' ? 'machine_1' : 'machine_2';
    return unitMachines[machineId];
  };

  const QueueCard = ({ vehicle }: { vehicle: Movement }) => {
    const isAtendimento = vehicle.kanbanStep && vehicle.kanbanStep !== 'aguardando_descarregamento' && vehicle.kanbanStep !== 'concluido';
    const borderCol = isAtendimento ? 'border-l-emerald-500' : 'border-l-orange-500';
    const bgCol = isAtendimento ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white';
    const vehicleMachine = getVehicleMachine(vehicle);
    
    let statusLabel = 'NA FILA';
    if (vehicle.kanbanStep) {
        const step = K_STEPS.find(s => s.id === vehicle.kanbanStep);
        if (step) statusLabel = step.label.toUpperCase();
    }
    if (vehicle.kanbanPausedAt) {
      if (vehicle.kanbanPauseReason === 'almoco') {
        statusLabel += ' (ALMOÇO 🍽️)';
      } else if (vehicle.kanbanPauseReason === 'oficina') {
        statusLabel += ' (OFICINA 🔧)';
      } else if (vehicle.kanbanPauseReason === 'producao_fechada') {
        statusLabel += ' (PROD. FECHADA 🔒)';
      } else {
        statusLabel += ' (PAUSADO ⏸️)';
      }
    } else if (vehicle.gateStatus === 'ausente_oficina') {
      statusLabel += ' (FORA: OFICINA 🔧)';
    } else if (vehicle.gateStatus === 'ausente_almoco') {
      statusLabel += ' (FORA: ALMOÇO 🍽️)';
    } else if (vehicleMachine && vehicleMachine.status !== 'operacional') {
      if (vehicleMachine.status === 'pausada_almoco') statusLabel += ' (MÁQ. EM ALMOÇO 🍽️)';
      else if (vehicleMachine.status === 'encerrada_dia') statusLabel += ' (MÁQ. ENCERRADA 🌙)';
      else if (vehicleMachine.status === 'quebrada') statusLabel += ' (MÁQ. QUEBRADA 🔴)';
      else if (vehicleMachine.status === 'manutencao') statusLabel += ' (MÁQ. MANUTENÇÃO 🟡)';
    }

    return (
      <div id={`queue-card-${vehicle.id}`} className={`p-3 border border-slate-200 border-l-4 ${borderCol} ${bgCol} rounded-xl shadow-xs flex flex-col gap-1 transition-all`}>
        <div className="flex justify-between font-bold text-sm text-slate-800">
          <span className="font-mono tracking-tight flex flex-wrap items-center gap-1">
            <span>{vehicle.plate}</span>
            <span className="text-[10px] font-normal text-slate-500 uppercase">({vehicle.ownerType})</span>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1 py-0.5 rounded uppercase">
              {customVehicleCategories.find(c => c.id === vehicle.vehicleType)?.name || vehicle.vehicleType}
            </span>
            {vehicle.gateStatus === 'ausente_oficina' && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-1 animate-pulse">
                🔧 NA OFICINA
              </span>
            )}
            {vehicle.gateStatus === 'ausente_almoco' && (
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-1 animate-pulse">
                🍽️ ALMOÇO
              </span>
            )}
            {vehicleMachine && vehicleMachine.status !== 'operacional' && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-1 ${
                vehicleMachine.status === 'pausada_almoco' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                vehicleMachine.status === 'encerrada_dia' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                vehicleMachine.status === 'quebrada' ? 'bg-red-100 text-red-900 border border-red-300' :
                'bg-yellow-100 text-yellow-900 border border-yellow-300'
              }`}>
                {vehicleMachine.status === 'pausada_almoco' ? '🍽️ MÁQ. ALMOÇO' :
                 vehicleMachine.status === 'encerrada_dia' ? '🌙 MÁQ. ENCERRADA' :
                 vehicleMachine.status === 'quebrada' ? '🔴 MÁQ. QUEBRADA' : '🟡 MÁQ. MANUTENÇÃO'}
              </span>
            )}
          </span>
          <span className="text-xs text-slate-500 font-medium tabular-nums">{new Date(vehicle.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="text-xs text-slate-600 truncate" title={vehicle.driver}>
          Condutor: {vehicle.driver} {vehicle.odometer && `| Odo: ${vehicle.odometer}km`}
        </div>
        
        {/* Client editing option (optional) */}
        <div className="text-[10px] flex items-center gap-1.5 font-medium mt-0.5">
          <span className="text-slate-400">Cliente:</span>
          <InlineClientEditor vehicleId={vehicle.id} initialClient={vehicle.client || ''} disabled={isReadOnly} />
        </div>
        
        {/* Short indicator if vistoria checklist is completed */}
        <div className="text-[10px] flex items-center gap-1 font-medium mt-0.5">
          <span className="text-slate-400">Vistoria:</span>
          {vehicle.ownerType === 'terceiro' ? (
            <span className="text-slate-500 font-medium bg-slate-100 px-1 py-0.2 rounded uppercase tracking-wide text-slate-400">Dispensado</span>
          ) : vehicle.checklist && vehicle.checklist.brakes && vehicle.checklist.tires ? (
            <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded uppercase tracking-wide">Realizada ✓</span>
          ) : (
            <span className="text-amber-700 font-bold bg-amber-50 px-1 py-0.2 rounded uppercase">Pendente na bomba</span>
          )}
        </div>

        {/* Real-time forecast inline inside QueueCard */}
        {(() => {
          const f = forecasts[vehicle.id];
          if (!f || vehicle.kanbanStep === 'concluido') return null;
          
          const isWaitingDesc = !vehicle.kanbanStep || vehicle.kanbanStep === 'aguardando_descarregamento';
          const isWaitingLoad = vehicle.kanbanStep === 'aguardando_carregamento';
          const isDesc = vehicle.kanbanStep === 'descarregamento';
          const isLoad = vehicle.kanbanStep === 'carregamento';

          return (
            <div className="text-[10px] flex items-center justify-between font-semibold mt-1 bg-slate-50 border border-slate-100 rounded px-1.5 py-1">
              <span className="text-slate-500 font-bold flex items-center gap-1">🔮 Previsão:</span>
              <span className="font-mono text-blue-700 font-bold">
                {isWaitingDesc && (
                  f.estimatedStartSecs === 0 ? 'Fila p/ iniciar: Próximo✓' : `Inicia em ~ ${formatSeconds(f.estimatedStartSecs)}`
                )}
                {isWaitingLoad && (
                  f.estimatedStartSecs === 0 ? 'Fila p/ iniciar: Próximo✓' : `Inicia em ~ ${formatSeconds(f.estimatedStartSecs)}`
                )}
                {isDesc && (
                  `Faltam ~ ${formatSeconds(f.estimatedRemainingSecs)}`
                )}
                {isLoad && (
                  `Faltam ~ ${formatSeconds(f.estimatedRemainingSecs)}`
                )}
              </span>
            </div>
          );
        })()}

        <div className="mt-1.5 flex items-center pt-1.5 border-t border-slate-100">
          <div className={`text-[9px] font-bold tracking-wider uppercase flex items-center gap-1.5 ${isAtendimento ? 'text-emerald-600' : 'text-orange-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAtendimento ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
            STATUS: {statusLabel}
          </div>
        </div>
      </div>
    );
  };

  const Column = ({ 
    title, 
    subTitle, 
    items, 
    pillClass, 
    borderClass,
    machine
  }: { 
    title: string; 
    subTitle: string; 
    items: Movement[]; 
    pillClass: string; 
    borderClass: string;
    machine?: MachineInfo;
  }) => {
    const isMachOp = !machine || machine.status === 'operacional';
    const isMachLunch = machine?.status === 'pausada_almoco';
    const isMachClosed = machine?.status === 'encerrada_dia';
    const isMachBroken = machine?.status === 'quebrada';
    const isMachMaint = machine?.status === 'manutencao';

    return (
      <section className={`bg-white border rounded-lg flex flex-col overflow-hidden shadow-sm h-full ${!isMachOp ? 'border-amber-300' : 'border-slate-200'}`}>
        <div className={`px-3 py-2 border-b flex flex-wrap justify-between items-center gap-2 shrink-0 ${
          isMachLunch ? 'bg-amber-50 border-amber-200' :
          isMachClosed ? 'bg-purple-50 border-purple-200' :
          isMachBroken ? 'bg-red-50 border-red-200' :
          isMachMaint ? 'bg-yellow-50 border-yellow-200' :
          'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <span>Linha: {title}</span>
                {machine && (
                  <span className={`text-[10px] font-black uppercase px-2 py-0.2 rounded-full border ${
                    isMachOp ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    isMachLunch ? 'bg-amber-100 text-amber-900 border-amber-300' :
                    isMachClosed ? 'bg-purple-100 text-purple-900 border-purple-300' :
                    isMachBroken ? 'bg-red-100 text-red-900 border-red-300' :
                    'bg-yellow-100 text-yellow-900 border-yellow-300'
                  }`}>
                    {isMachOp ? '🟢 Em Operação' : isMachLunch ? '🍽️ Almoço' : isMachClosed ? '🌙 Encerrada' : isMachBroken ? '🔴 Quebrada' : '🟡 Manutenção'}
                  </span>
                )}
              </h2>
              <span className="text-[10px] text-slate-500 font-medium normal-case block">
                {subTitle} {machine?.reason && <span className="font-semibold text-slate-700 ml-1">({machine.reason})</span>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {machine && hasWriteAccess && (
              isMachOp ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => pauseMachineForLunch(machine.id, targetUnit)}
                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                    title="Pausar esta máquina para almoço"
                  >
                    🍽️ Almoço
                  </button>
                  <button
                    type="button"
                    onClick={() => endMachineDay(machine.id, targetUnit)}
                    className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                    title="Encerrar expediente desta máquina hoje"
                  >
                    🌙 Fim do Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickStopMachine(machine)}
                    className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
                    title="Informar se a máquina está quebrada, em manutenção ou outra pausa"
                  >
                    <Wrench size={10} /> Parada / Manutenção
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => resumeMachineOperation(machine.id, targetUnit)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shadow-xs animate-pulse"
                    title="Retomar operação desta máquina"
                  >
                    <Play size={10} fill="currentColor" /> Retomar
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickStopMachine(machine)}
                    className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] transition-colors cursor-pointer"
                    title="Alterar motivo de parada / manutenção desta máquina"
                  >
                    <Wrench size={12} />
                  </button>
                </div>
              )
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${pillClass}`}>
              {items.length} Veículos
            </span>
          </div>
        </div>

        <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-slate-100 min-h-[300px]">
          {items.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 font-bold uppercase tracking-widest border border-dashed border-slate-300 rounded bg-slate-50/50">
              Nenhum veículo ativo nesta fila
            </div>
          ) : (
            items.map(item => <QueueCard key={item.id} vehicle={item} />)
          )}
        </div>
      </section>
    );
  };

  // Kanban Data & Components
  const validKanbanMovements = movements
    .filter(m => {
      return matchesSearch(m) && 
        (m.unit || 'matriz') === (currentUser?.unit || 'matriz') && 
        (!m.bypassProduction) && 
        m.status !== 'saida';
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const StepTimer = ({ vehicle, currentStepId }: { vehicle: Movement, currentStepId: string }) => {
    const [now, setNow] = useState(Date.now());
    
    const isAbsent = vehicle.gateStatus === 'ausente_almoco' || vehicle.gateStatus === 'ausente_oficina';
    
    useEffect(() => {
      if (vehicle.kanbanStep === 'concluido' || !!vehicle.kanbanPausedAt || isAbsent) return;
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }, [vehicle.kanbanStep, vehicle.kanbanPausedAt, isAbsent]);

    const timings = vehicle.kanbanTimings || {};

    if (currentStepId === 'concluido') {
      const { totalSec } = getVehicleTimeDetails(vehicle);
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 tabular-nums">
          Total: {formatSeconds(totalSec)}
        </span>
      );
    }

    const startObj = currentStepId === 'aguardando_descarregamento' ? (timings[currentStepId] || vehicle.timestamp) : timings[currentStepId];
    
    if (!startObj) return <span className="text-[10px] text-slate-400">00:00</span>;

    const start = new Date(startObj).getTime();
    let currentEnd = now;

    const activeExit = (vehicle.gateTemporaryExits || []).find(e => !e.returnedAt);

    if (vehicle.kanbanPausedAt) {
      currentEnd = new Date(vehicle.kanbanPausedAt).getTime();
    } else if (activeExit) {
      currentEnd = new Date(activeExit.exitedAt).getTime();
    }

    let diff = Math.max(0, currentEnd - start);
    diff -= (vehicle.kanbanTotalPause?.[currentStepId] || 0);
    
    // Subtract finished temporary exits in this step
    const finishedAbsenceMs = (vehicle.gateTemporaryExits || [])
      .filter(e => e.returnedAt && (e.step === currentStepId || (!e.step && currentStepId === 'aguardando_descarregamento')))
      .reduce((sum, e) => sum + (e.durationMs || 0), 0);
      
    diff -= finishedAbsenceMs;
    diff = Math.max(0, diff);

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return (
      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded tabular-nums tracking-tighter ${(vehicle.kanbanPausedAt || isAbsent) ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
        ⏱ {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    );
  };

  const KanbanCard = ({ vehicle }: { vehicle: Movement }) => {
    const isPaused = !!vehicle.kanbanPausedAt;
    const currentStepId = vehicle.kanbanStep || 'aguardando_descarregamento';

    const cardBgClass = isPaused ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200 bg-white';

    const getDiffLabel = (pc: any) => {
      if (!pc) return '';
      if (pc.differenceReasonsBreakdown && pc.differenceReasonsBreakdown.some((b: any) => b.qty > 0)) {
        return pc.differenceReasonsBreakdown
          .filter((b: any) => b.qty > 0)
          .map((b: any) => `${b.qty} ${b.reason === 'venda' ? 'Venda' : b.reason === 'vasilhame_cliente' ? 'Vas. Cliente' : b.reason === 'comodato' ? 'Comodato' : b.reason === 'falta' ? 'Falta' : 'Outros'}`)
          .join(', ');
      }
      const qty = pc.differenceQty || 0;
      if (qty > 0) {
        return pc.differenceReason === 'venda' ? 'Venda' : pc.differenceReason === 'vasilhame_cliente' ? 'Vas. Cliente' : pc.differenceReason === 'comodato' ? 'Comodato' : 'Falta';
      }
      return 'Excesso';
    };

    return (
      <div className={`p-3 rounded shadow-sm border ${cardBgClass} text-xs flex flex-col gap-2 relative transition-colors`}>
        {isPaused && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-white border border-amber-600 rounded-full px-2 py-0.5 text-[9px] font-black uppercase shadow-xs flex items-center gap-1 z-10">
            ⏸️ Pausado
          </div>
        )}
        <div className="flex justify-between items-start">
          <span className="font-bold text-slate-800 tracking-wider font-mono flex flex-wrap items-center gap-1">
            <span>{vehicle.plate}</span>
            {vehicle.gateStatus === 'ausente_oficina' && (
              <span className="text-[8px] font-black bg-amber-100 text-amber-800 border border-amber-200 px-1 py-0.2 rounded uppercase inline-flex items-center gap-0.5 animate-pulse">
                🔧 OFICINA
              </span>
            )}
            {vehicle.gateStatus === 'ausente_almoco' && (
              <span className="text-[8px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 px-1 py-0.2 rounded uppercase inline-flex items-center gap-0.5 animate-pulse">
                🍽️ ALMOÇO
              </span>
            )}
          </span>
          <div className="flex items-center gap-1 font-sans">
             <span className="text-[10px] text-slate-400 tabular-nums">
               {new Date(vehicle.timestamp).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
             </span>
             <StepTimer vehicle={vehicle} currentStepId={currentStepId} />
          </div>
        </div>
        <div className="text-slate-600 truncate font-semibold">{vehicle.driver}</div>

        {/* Production summary if exists */}
        {vehicle.productionControl && (
          <div className="bg-slate-50 border border-slate-100 rounded p-1.5 text-[9px] text-slate-500 font-medium space-y-0.5 leading-snug">
            <div className="flex justify-between">
              <span>Descarregado:</span>
              <span className="font-bold text-slate-700">{vehicle.productionControl.descarregadoQty} un</span>
            </div>
            <div className="flex justify-between">
              <span>A carregar:</span>
              <span className="font-bold text-blue-700">
                {(vehicle.productionControl.totalCarregado || 0) + (vehicle.productionControl.retornoVasilhameCheio || 0)} un
                {vehicle.productionControl.retornoVasilhameCheio > 0 && (
                  <span className="text-[7.5px] text-slate-450 font-normal ml-1">
                    ({vehicle.productionControl.totalCarregado} env. + {vehicle.productionControl.retornoVasilhameCheio} ret.)
                  </span>
                )}
              </span>
            </div>
            {vehicle.ownerType === 'proprio' && vehicle.productionControl.differenceQty !== undefined && vehicle.productionControl.differenceQty !== 0 && (
              <div className="bg-amber-50 text-amber-800 text-[8px] font-bold uppercase rounded px-1 py-0.5 text-center border border-amber-200 mt-1 flex flex-col items-center justify-center gap-0.5 leading-normal">
                <div>
                  ⚠️ {vehicle.productionControl.differenceQty > 0 
                    ? `Falta: ${vehicle.productionControl.differenceQty}` 
                    : `Sobra: ${Math.abs(vehicle.productionControl.differenceQty)}`
                  } un
                </div>
                <div className="lowercase text-[7px] text-amber-700 font-semibold font-sans">
                  ({getDiffLabel(vehicle.productionControl)})
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real-time Loading/Discharging Forecast */}
        {(currentStepId === 'descarregamento' || currentStepId === 'carregamento') && (
          <div className="bg-slate-50 border border-slate-150 rounded p-1.5 text-[9px] font-sans">
            <div className="flex justify-between font-bold text-slate-700 uppercase text-[8px] tracking-wider mb-1 pb-1 border-b border-slate-200">
              <span>⏱️ Indicador de Tempo</span>
              <span className="text-blue-600">
                {currentStepId === 'descarregamento' ? 'Descarregamento' : 'Carregamento'}
              </span>
            </div>
            {(() => {
              const isDesc = currentStepId === 'descarregamento';
              const qty = isDesc 
                ? (vehicle.productionControl?.expectedDischargeQty || vehicle.productionControl?.descarregadoQty || 0)
                : (vehicle.productionControl?.totalCarregado || vehicle.productionControl?.descarregadoQty || 0);
              
              const avg = isDesc ? avgTimeDischarging : avgTimeLoading;
              const predictedSecs = avg > 0 ? (qty / avg) * 60 : 0;
              
              // Calculate current elapsed time for this step
              const timings = vehicle.kanbanTimings || {};
              const startObj = timings[currentStepId];
              if (!startObj) return <div className="text-slate-400 italic font-medium">Cronômetro não iniciado</div>;
              
              const start = new Date(startObj).getTime();
              const activeExit = (vehicle.gateTemporaryExits || []).find(e => !e.returnedAt);
              const currentEnd = vehicle.kanbanPausedAt 
                ? new Date(vehicle.kanbanPausedAt).getTime() 
                : (activeExit ? new Date(activeExit.exitedAt).getTime() : Date.now());
              let diff = Math.max(0, currentEnd - start);
              diff -= (vehicle.kanbanTotalPause?.[currentStepId] || 0);
              
              // Subtract finished temporary exits in this step
              const finishedAbsenceMs = (vehicle.gateTemporaryExits || [])
                .filter(e => e.returnedAt && (e.step === currentStepId || (!e.step && (currentStepId as string) === 'aguardando_descarregamento')))
                .reduce((sum, e) => sum + (e.durationMs || 0), 0);
                
              diff -= finishedAbsenceMs;
              const elapsedSecs = Math.max(0, Math.floor(diff / 1000));
              
              const over = elapsedSecs > predictedSecs;
              const diffSecs = Math.abs(elapsedSecs - predictedSecs);

              return (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Previsto ({qty} un):</span>
                    <span className="font-bold text-slate-800 font-mono">{formatSeconds(predictedSecs)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Realizado:</span>
                    <span className="font-mono font-bold text-slate-800">{formatSeconds(elapsedSecs)}</span>
                  </div>
                  {predictedSecs > 0 && (
                    <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between items-center">
                      <span>Status:</span>
                      <span className={`px-1 py-0.5 rounded uppercase font-black text-[8px] leading-tight flex items-center gap-0.5 ${
                        over ? 'bg-rose-50 border border-rose-100 text-rose-600' : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                      }`}>
                        {over ? `⚠️ Atrasado +${formatSeconds(diffSecs)}` : `✅ No prazo -${formatSeconds(diffSecs)}`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Previsão de Tempo Kanban (Fila / Atendimento) */}
        {(() => {
          const f = forecasts[vehicle.id];
          if (!f) return null;

          const isWaitingDesc = currentStepId === 'aguardando_descarregamento';
          const isWaitingLoad = currentStepId === 'aguardando_carregamento';
          const isDesc = currentStepId === 'descarregamento';
          const isLoad = currentStepId === 'carregamento';

          if (isDesc || isLoad || currentStepId === 'concluido') return null;

          return (
            <div className="bg-blue-50/50 border border-blue-100 rounded p-1.5 text-[9px] font-sans">
              <div className="flex justify-between font-bold text-blue-800 uppercase text-[8px] tracking-wider mb-1 pb-1 border-b border-blue-100/60">
                <span>🔮 Previsão de Início/Fim (Média)</span>
                <span className="text-blue-500 font-semibold">Previsão</span>
              </div>
              <div className="space-y-1 font-medium">
                {(isWaitingDesc || isWaitingLoad) && (
                  <>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Início {isWaitingDesc ? 'Desc.' : 'Carreg.'} em:</span>
                      <span className={`font-black font-mono ${f.estimatedStartSecs === 0 ? 'text-emerald-705 bg-emerald-50 px-1 rounded' : 'text-blue-700'}`}>
                        {f.estimatedStartSecs === 0 ? 'Próximo ✓' : `~ ${formatSeconds(f.estimatedStartSecs)}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Tempo total est.:</span>
                      <span className="font-bold text-slate-700 font-mono">~ {formatSeconds(f.estimatedTotalWaitSecs)}</span>
                    </div>
                  </>
                )}
                {(isDesc || isLoad) && (
                  <>
                    <div className="flex justify-between items-center text-slate-605">
                      <span>Desvio / Faltam:</span>
                      <span className="font-black text-indigo-700 font-mono">~ {formatSeconds(f.estimatedRemainingSecs)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {currentStepId !== 'aguardando_descarregamento' && (
          <button
            onClick={() => {
              setSelectedVehicleForProduction(vehicle);
              if (currentStepId === 'descarregamento') {
                setProductionFocusPhase('descarregamento');
                setProductionTransitionOnSave('aguardando_carregamento');
              } else if (currentStepId === 'carregamento') {
                setProductionFocusPhase('carregamento');
                setProductionTransitionOnSave('concluido');
              } else {
                setProductionFocusPhase('all');
                setProductionTransitionOnSave(null);
              }
            }}
            disabled={isReadOnly}
            className={`w-full text-[10px] uppercase font-bold py-1 px-2 rounded tracking-wider flex items-center justify-center gap-1 transition-colors ${
              isReadOnly 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 border border-slate-200' 
                : 'bg-slate-105 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer'
            }`}
          >
            <Droplet size={11} className="text-blue-600 fill-current" />
            Controle de Produção 💧
          </button>
        )}

        <div className="flex justify-between items-center gap-2 mt-1">
          {currentStepId !== 'concluido' && !isProductionOpen && (
            <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-red-200">
              <Lock size={10} /> Produção Fechada
            </div>
          )}

          {currentStepId !== 'concluido' && isProductionOpen && (() => {
            const mach = getVehicleMachine(vehicle);
            if (!mach || mach.status === 'operacional') return null;
            return (
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                mach.status === 'pausada_almoco' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                mach.status === 'encerrada_dia' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                mach.status === 'quebrada' ? 'bg-red-100 text-red-900 border-red-300' :
                'bg-yellow-100 text-yellow-900 border-yellow-300'
              }`}>
                <span>
                  {mach.status === 'pausada_almoco' ? '🍽️ Máq. Almoço' :
                   mach.status === 'encerrada_dia' ? '🌙 Máq. Encerrada' :
                   mach.status === 'quebrada' ? '🔴 Máq. Quebrada' : '🟡 Máq. Manutenção'}
                </span>
              </div>
            );
          })()}
          
          {(() => {
            const currentStepIdx = K_STEPS.findIndex(s => s.id === currentStepId);
            const isLastStep = currentStepIdx === K_STEPS.length - 1;
            if (isLastStep) {
              return (
                <div className="w-full flex items-center justify-center gap-1.5 py-1.5 font-bold uppercase tracking-wider text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  <Check size={12} /> Processo Concluído
                </div>
              );
            }
            
            const handleStepTransition = () => {
              if (currentStepId === 'aguardando_descarregamento') {
                // Sair de aguardando descarregamento para ir direto a descarregamento
                updateKanbanStep(vehicle.id, 'descarregamento');
              } else if (currentStepId === 'aguardando_carregamento') {
                // Sair de aguardando carregamento para ir direto a carregamento
                updateKanbanStep(vehicle.id, 'carregamento');
              } else if (currentStepId === 'descarregamento') {
                // Abrir registro obrigatório de descarregamento antes de prosseguir
                setSelectedVehicleForProduction(vehicle);
                setProductionFocusPhase('descarregamento');
                setProductionTransitionOnSave('aguardando_carregamento');
              } else if (currentStepId === 'carregamento') {
                // Abrir registro obrigatório de carregamento antes de prosseguir
                setSelectedVehicleForProduction(vehicle);
                setProductionFocusPhase('carregamento');
                setProductionTransitionOnSave('concluido');
              } else {
                updateKanbanStep(vehicle.id, K_STEPS[currentStepIdx + 1].id);
              }
            };

            const isVehicleAbsent = vehicle.gateStatus === 'ausente_oficina' || vehicle.gateStatus === 'ausente_almoco';
            const vehicleMach = getVehicleMachine(vehicle);
            const isMachInactive = vehicleMach && vehicleMach.status !== 'operacional';

            return (
              <button
                onClick={handleStepTransition}
                disabled={isPaused || isReadOnly || isVehicleAbsent || isMachInactive}
                className={`flex-1 text-[10px] uppercase font-bold py-1.5 px-2 rounded tracking-wider transition-all ${
                  isPaused || isReadOnly || isVehicleAbsent || isMachInactive
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                }`}
                title={
                  isVehicleAbsent ? "Veículo fora (oficina ou almoço) - Não está no pátio" :
                  isMachInactive ? `Máquina ${vehicleMach?.name} pausada/inoperante` : ""
                }
              >
                {isVehicleAbsent ? 'Fora do Pátio 🚫' : isMachInactive ? 'Máquina Pausada ⏸️' : 'Próxima Etapa →'}
              </button>
            );
          })()}
        </div>
      </div>
    );
  };

  const KanbanBoard = () => {
    return (
      <div className="flex-1 flex overflow-x-auto gap-4 pb-2 snap-x hide-scrollbar h-full items-start">
        {K_STEPS.map(step => {
          const items = validKanbanMovements.filter(m => (m.kanbanStep || 'aguardando_descarregamento') === step.id);
          return (
            <div key={step.id} className={`w-72 shrink-0 flex flex-col rounded-xl border ${step.color} shadow-sm overflow-hidden h-full snap-center`}>
              <div className="px-3 py-2 border-b border-inherit bg-white/50 backdrop-blur-sm flex justify-between items-center z-10 sticky top-0">
                <span className="font-bold text-xs uppercase text-slate-700">{step.label}</span>
                <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 shadow-sm">{items.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 relative min-h-[300px]">
                {items.length === 0 ? (
                  <div className="text-center p-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-dashed border-slate-300 rounded m-2">Vazio</div>
                ) : (
                  items.map(m => <KanbanCard key={m.id} vehicle={m} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const formatSeconds = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '0s';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  const formatTimeDiff = (ms: number) => {
    return formatSeconds(Math.max(0, Math.floor(ms / 1000)));
  };

  const getVehicleTimeDetails = (m: Movement) => {
    const t = m.kanbanTimings || {};
    const pauses = m.kanbanTotalPause || {};
    
    const stepSecs = K_STEPS.slice(0, 4).map((s, i) => {
      const start = s.id === 'aguardando_descarregamento' ? (t[s.id] || m.timestamp) : t[s.id];
      const end = K_STEPS[i + 1].id === 'aguardando_descarregamento' ? (t[K_STEPS[i + 1].id] || m.timestamp) : t[K_STEPS[i + 1].id];
      if (!start || !end) return null;
      let diff = new Date(end).getTime() - new Date(start).getTime();
      diff -= (pauses[s.id] || 0);

      // Subtract temporary exits for this step
      const stepAbsenceMs = (m.gateTemporaryExits || [])
        .filter(e => e.step === s.id || (!e.step && s.id === 'aguardando_descarregamento'))
        .reduce((sum, e) => {
          if (e.durationMs) return sum + e.durationMs;
          const exitTime = new Date(e.exitedAt).getTime();
          const stepEndTime = new Date(end).getTime();
          if (exitTime < stepEndTime) {
            return sum + (stepEndTime - exitTime);
          }
          return sum;
        }, 0);
      diff -= stepAbsenceMs;

      return Math.max(0, Math.floor(diff / 1000));
    });

    let totalSec = 0;
    let hasAnyStep = false;
    stepSecs.forEach(sec => {
      if (sec !== null) {
        totalSec += sec;
        hasAnyStep = true;
      }
    });

    if (!hasAnyStep) {
      const overallStart = t['aguardando_descarregamento'] || m.timestamp;
      const overallEnd = t['concluido'];
      if (overallStart && overallEnd) {
        let diff = new Date(overallEnd).getTime() - new Date(overallStart).getTime();
        Object.values(pauses).forEach(p => diff -= p);

        // Subtract all temporary exits durations
        const totalAbsenceMs = (m.gateTemporaryExits || []).reduce((sum, e) => {
          if (e.durationMs) return sum + e.durationMs;
          const exitTime = new Date(e.exitedAt).getTime();
          const overallEndTime = new Date(overallEnd).getTime();
          if (exitTime < overallEndTime) {
            return sum + (overallEndTime - exitTime);
          }
          return sum;
        }, 0);
        diff -= totalAbsenceMs;

        totalSec = Math.max(0, Math.floor(diff / 1000));
      }
    }

    return { stepSecs, totalSec };
  };

  const KanbanReportModal = ({ onClose }: { onClose: () => void }) => {
    const allKanbanMovements = movements.filter(m => 
      (m.unit || 'matriz') === (currentUser?.unit || 'matriz') &&
      (!m.bypassProduction) &&
      m.kanbanStep === 'concluido' &&
      m.kanbanTimings
    );

    const closedMovements = allKanbanMovements.filter(m => {
      const mDate = new Date(m.timestamp).toISOString().split('T')[0];
      if (timeReportFilterDate && mDate !== timeReportFilterDate) return false;
      if (timeReportFilterPlate && !m.plate.toLowerCase().includes(timeReportFilterPlate.toLowerCase())) return false;
      if (timeReportFilterDriver && !m.driver.toLowerCase().includes(timeReportFilterDriver.toLowerCase())) return false;
      if (timeReportFilterClient && !(m.client || '').toLowerCase().includes(timeReportFilterClient.toLowerCase())) return false;
      return true;
    });
    
    // Calculate averages
    const stepTimes: Record<string, number[]> = {};
    K_STEPS.forEach(s => stepTimes[s.id] = []);

    closedMovements.forEach(m => {
      const timings = m.kanbanTimings || {};
      const pauses = m.kanbanTotalPause || {};
      
      const getTiming = (s: string) => s === 'aguardando_descarregamento' ? (timings[s] || m.timestamp) : timings[s];

      for (let i = 0; i < K_STEPS.length - 1; i++) {
        const step = K_STEPS[i].id;
        const nextStep = K_STEPS[i + 1].id;
        const start = getTiming(step);
        const end = getTiming(nextStep);
        if (start && end) {
          let diff = new Date(end).getTime() - new Date(start).getTime();
          diff -= (pauses[step] || 0);
          stepTimes[step].push(Math.max(0, diff));
        }
      }
    });

    const exportTimesToCSV = () => {
      const csvHeaders = [
        'Placa', 
        'Motorista', 
        'Cliente', 
        ...K_STEPS.slice(0, 4).map(s => `Tempo ${s.label}`), 
        'Tempo Total Liquido (Excluindo Pausas)',
        'Formula Descarregamento',
        'Qtd Descarregada',
        'Total Avarias',
        'Total Avarias de Troca',
        'Total Carregado Final',
        'Observações Produção'
      ];
      const csvRows: any[] = [];
      
      closedMovements.forEach(m => {
        const { stepSecs, totalSec } = getVehicleTimeDetails(m);
        const stepTimesCSV = stepSecs.map(sec => sec === null ? '-' : formatSeconds(sec));
        const totalTime = totalSec > 0 ? formatSeconds(totalSec) : '-';
        
        const p = m.productionControl;
        const totalAvarias = p ? (
          p.avariasDescarregamento.filter(a => !isPurchaseType(a.type) && !a.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + item.qty, 0) +
          p.avariasCarregamento.filter(c => !isPurchaseType(c.type) && !c.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + item.qty, 0)
        ) : 0;
        
        const totalTroca = p ? (
          p.avariasDescarregamento.filter(a => !isPurchaseType(a.type) && a.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + item.qty, 0) +
          p.avariasCarregamento.filter(c => !isPurchaseType(c.type) && c.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + item.qty, 0)
        ) : 0;

        csvRows.push([
          m.plate,
          m.driver,
          m.client || '',
          ...stepTimesCSV,
          totalTime,
          p?.descarregadoFormula || '',
          p?.descarregadoQty !== undefined ? p.descarregadoQty : '-',
          totalAvarias,
          totalTroca,
          p?.totalCarregado !== undefined ? (p.totalCarregado + (p.retornoVasilhameCheio || 0)) : '-',
          p?.observacoes || ''
        ]);
      });
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_tempos_producao_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const printTimesReport = () => {
      setShowKanbanReport(false);
      setTimeReportMode(true);
      if (isIframe) {
        setPrintType('times');
        setShowPrintGuide(true);
      } else {
        setTimeout(() => {
          window.print();
        }, 1000);
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white z-10 shrink-0">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              Relatório Tempos de Processo - Produção
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={exportTimesToCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Exportar dados para planilha Excel"
              >
                <Download size={14} /> Planilha Excel
              </button>
              <button 
                onClick={printTimesReport}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Visualizar / Imprimir em PDF"
              >
                <Printer size={14} /> Gerar PDF / Imprimir
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-650 rounded-full hover:bg-slate-100 cursor-pointer" title="Fechar"><X size={18} /></button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto flex-1 bg-slate-50 space-y-6">
            
            {/* Filters Section */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-3 items-end font-sans">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data</label>
                <input type="date" value={timeReportFilterDate} onChange={e => setTimeReportFilterDate(e.target.value)} className="w-full text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Placa</label>
                <input type="text" value={timeReportFilterPlate} onChange={e => setTimeReportFilterPlate(e.target.value)} placeholder="XYZ-1234" className="w-full text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 uppercase" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motorista</label>
                <input type="text" value={timeReportFilterDriver} onChange={e => setTimeReportFilterDriver(e.target.value)} placeholder="Busca por motorista..." className="w-full text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cliente</label>
                <input type="text" value={timeReportFilterClient} onChange={e => setTimeReportFilterClient(e.target.value)} placeholder="Busca por cliente..." className="w-full text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500" />
              </div>
              <button 
                onClick={() => { setTimeReportFilterDate(''); setTimeReportFilterPlate(''); setTimeReportFilterDriver(''); setTimeReportFilterClient(''); }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 p-1.5 cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>

            {/* Envasamento & Produção Breakdown Section */}
            {(() => {
              let totalEnvasado = 0;
              let totalManha = 0;
              let totalTarde = 0;
              let m1Manha = 0;
              let m1Tarde = 0;
              let m2Manha = 0;
              let m2Tarde = 0;

              closedMovements.forEach(m => {
                const qty = (m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0);
                totalEnvasado += qty;

                const ts = (m.productionControl as any)?.carregamentoFinishedAt || (m.productionControl as any)?.finishedAt || m.exitTimestamp || m.entryTimestamp || m.timestamp;
                const hour = ts ? new Date(ts).getHours() : 0;
                const isManha = hour < 12;

                const isPesada = ['carreta', 'truck'].includes((m.vehicleType || '').toLowerCase().trim());
                if (isManha) {
                  totalManha += qty;
                  if (isPesada) m1Manha += qty;
                  else m2Manha += qty;
                } else {
                  totalTarde += qty;
                  if (isPesada) m1Tarde += qty;
                  else m2Tarde += qty;
                }
              });

              const m1Total = m1Manha + m1Tarde;
              const m2Total = m2Manha + m2Tarde;

              return (
                <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-4 rounded-xl text-white shadow-sm border border-slate-800 space-y-3 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Droplets size={16} className="text-blue-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        Resumo de Água Envasada & Produção por Expediente e Máquina
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-blue-300 font-bold bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700/40">
                      Total: {totalEnvasado.toLocaleString('pt-BR')} u
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <span className="text-[9px] uppercase font-bold text-amber-300 block mb-0.5 flex items-center gap-1">
                        <Sun size={11} /> ☀️ Manhã (07h-12h)
                      </span>
                      <span className="text-lg font-black font-mono text-white">{totalManha.toLocaleString('pt-BR')} u</span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">
                        {totalEnvasado > 0 ? `${((totalManha / totalEnvasado) * 100).toFixed(1)}% do total` : '0%'}
                      </span>
                    </div>

                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 flex items-center gap-1">
                        <Sunset size={11} /> ⛅ Tarde (12h-18h+)
                      </span>
                      <span className="text-lg font-black font-mono text-white">{totalTarde.toLocaleString('pt-BR')} u</span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">
                        {totalEnvasado > 0 ? `${((totalTarde / totalEnvasado) * 100).toFixed(1)}% do total` : '0%'}
                      </span>
                    </div>

                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <span className="text-[9px] uppercase font-bold text-blue-300 block mb-0.5">
                        🏭 Máquina 1 (Pesada)
                      </span>
                      <span className="text-lg font-black font-mono text-white">{m1Total.toLocaleString('pt-BR')} u</span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">
                        Manhã: {m1Manha}u | Tarde: {m1Tarde}u
                      </span>
                    </div>

                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <span className="text-[9px] uppercase font-bold text-emerald-300 block mb-0.5">
                        🚚 Máquina 2 (Média)
                      </span>
                      <span className="text-lg font-black font-mono text-white">{m2Total.toLocaleString('pt-BR')} u</span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">
                        Manhã: {m2Manha}u | Tarde: {m2Tarde}u
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Averages Section */}
            <div className="space-y-3 font-sans">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tempo Médio por Etapa (Baseado no Filtro)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {K_STEPS.slice(0, 4).map(step => {
                  const times = stepTimes[step.id];
                  const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
                  return (
                    <div key={step.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase leading-tight h-8 flex items-center justify-center">{step.label}</div>
                      <div className="text-lg font-black text-slate-800 tabular-nums">{times.length ? formatTimeDiff(avgMs) : '-'}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{times.length} amostras</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="space-y-3 font-sans">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalhamento por Veículo ({closedMovements.length})</h3>
               <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
                 <table className="w-full text-left text-xs whitespace-nowrap">
                   <thead>
                     <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                       <th className="p-3">Veículo / Info</th>
                       <th className="p-3 text-right">T. Fila Entrada</th>
                       <th className="p-3 text-right text-indigo-750 font-black">Descarregamento (Real vs Prev)</th>
                       <th className="p-3 text-right">T. Fila Pátio</th>
                       <th className="p-3 text-right text-emerald-750 font-black">Carregamento (Real vs Prev)</th>
                       <th className="p-3 text-right">Tempo Total</th>
                       <th className="p-3 text-right text-indigo-700">Descarregado</th>
                       <th className="p-3 text-right text-red-650">Avarias</th>
                       <th className="p-3 text-right text-emerald-650">Carregado</th>
                       <th className="p-3 text-center">Comprovante</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {closedMovements.length === 0 ? (
                       <tr><td colSpan={10} className="p-8 text-center text-slate-400 font-medium uppercase text-[10px] tracking-widest font-sans font-semibold">Nenhum veículo concluído para os filtros selecionados</td></tr>
                     ) : (
                       closedMovements.map(m => {
                         const { stepSecs, totalSec } = getVehicleTimeDetails(m);
                         const totalTime = totalSec > 0 ? formatSeconds(totalSec) : '-';
                         return (
                           <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                             <td className="p-3">
                               <div className="font-mono font-bold text-slate-800">{m.plate}</div>
                               <div className="text-[9px] text-slate-500 uppercase mt-0.5">{m.driver} {m.client && <span className="font-medium text-slate-700 ml-1">({m.client})</span>}</div>
                             </td>
                             
                             {/* 1. Fila Entrada */}
                             <td className="p-3 text-right font-medium text-slate-600 tabular-nums">
                               {stepSecs[0] !== null ? formatSeconds(stepSecs[0]) : '-'}
                             </td>

                             {/* 2. Descarregamento (Real vs Prev) */}
                             <td className="p-3 text-right tabular-nums">
                               {(() => {
                                 const qty = m.productionControl?.expectedDischargeQty || m.productionControl?.descarregadoQty || 0;
                                 const pred = avgTimeDischarging > 0 ? (qty / avgTimeDischarging) * 60 : 0;
                                 const real = stepSecs[1];
                                 if (real === null) return <span className="text-slate-400">-</span>;
                                 const diff = real - pred;
                                 const over = diff > 0;
                                 return (
                                   <div className="inline-flex flex-col items-end">
                                     <div className="font-bold text-indigo-700">Real: {formatSeconds(real)}</div>
                                     <div className="text-[9px] text-slate-400">Prev ({qty}u): {formatSeconds(pred)}</div>
                                     {pred > 0 && (
                                       <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full mt-0.5 ${
                                         over ? 'bg-rose-50 border border-rose-100 text-rose-650' : 'bg-emerald-50 border border-emerald-100 text-emerald-800'
                                       }`}>
                                         {over ? `⚠️ +${formatSeconds(diff)}` : `✅ -${formatSeconds(Math.abs(diff))}`}
                                       </span>
                                     )}
                                   </div>
                                 );
                                })()}
                              </td>

                             {/* 3. Fila Pátio */}
                             <td className="p-3 text-right font-medium text-slate-600 tabular-nums">
                               {stepSecs[2] !== null ? formatSeconds(stepSecs[2]) : '-'}
                             </td>

                             {/* 4. Carregamento (Real vs Prev) */}
                             <td className="p-3 text-right tabular-nums">
                               {(() => {
                                 const qty = (m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0) || m.productionControl?.descarregadoQty || 0;
                                 const pred = avgTimeLoading > 0 ? (qty / avgTimeLoading) * 60 : 0;
                                 const real = stepSecs[3];
                                 if (real === null) return <span className="text-slate-400">-</span>;
                                 const diff = real - pred;
                                 const over = diff > 0;
                                 return (
                                   <div className="inline-flex flex-col items-end">
                                     <div className="font-bold text-emerald-700">Real: {formatSeconds(real)}</div>
                                     <div className="text-[9px] text-slate-400">Prev ({qty}u): {formatSeconds(pred)}</div>
                                     {pred > 0 && (
                                       <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full mt-0.5 ${
                                         over ? 'bg-rose-50 border border-rose-100 text-rose-655' : 'bg-emerald-50 border border-emerald-100 text-emerald-800'
                                       }`}>
                                         {over ? `⚠️ +${formatSeconds(diff)}` : `✅ -${formatSeconds(Math.abs(diff))}`}
                                       </span>
                                     )}
                                   </div>
                                 );
                                })()}
                             </td>

                             <td className="p-3 text-right font-black text-blue-700 tabular-nums">{totalTime}</td>
                             <td className="p-3 text-right font-bold text-indigo-700 tabular-nums">{m.productionControl ? m.productionControl.descarregadoQty : '-'}</td>
                             <td className="p-3 text-right font-semibold text-red-650 tabular-nums">
                               <div className="flex items-center justify-end gap-1">
                                 <span>{m.productionControl ? (
                                   m.productionControl.avariasDescarregamento.filter(a => !isPurchaseType(a.type) && !a.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + item.qty, 0) +
                                   m.productionControl.avariasCarregamento.filter(c => !isPurchaseType(c.type) && !c.type.toLowerCase().includes('troca')).reduce((sum, item) => sum + item.qty, 0)
                                 ) : '-'}</span>
                                 {m.productionControl && (
                                   m.productionControl.avariasDescarregamentoPhoto || 
                                   m.productionControl.avariasCarregamentoPhoto || 
                                   m.productionControl.hasAvariasDescarregamentoPhoto || 
                                   m.productionControl.hasAvariasCarregamentoPhoto
                                 ) ? (
                                   <span className="text-[10px]" title="Possui registro fotográfico">📸</span>
                                 ) : null}
                               </div>
                             </td>
                             <td className="p-3 text-right font-black text-emerald-600 tabular-nums">{m.productionControl ? (m.productionControl.totalCarregado + (m.productionControl.retornoVasilhameCheio || 0)) : '-'}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedVehicleForProduction(m);
                                    setProductionFocusPhase('all');
                                    setProductionTransitionOnSave(null);
                                  }}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer mx-auto"
                                >
                                  <Printer size={12} />
                                  Comprovante
                                </button>
                              </td>
                           </tr>
                         );
                       })
                     )}
                   </tbody>
                 </table>
               </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // Render printable PDF Document Mode for Process Times
  if (timeReportMode) {
    const allKanbanMovements = movements.filter(m => 
      (m.unit || 'matriz') === (currentUser?.unit || 'matriz') &&
      (!m.bypassProduction) &&
      m.kanbanStep === 'concluido' &&
      m.kanbanTimings
    );

    const closedMovements = allKanbanMovements.filter(m => {
      const mDate = new Date(m.timestamp).toISOString().split('T')[0];
      if (timeReportFilterDate && mDate !== timeReportFilterDate) return false;
      if (timeReportFilterPlate && !m.plate.toLowerCase().includes(timeReportFilterPlate.toLowerCase())) return false;
      if (timeReportFilterDriver && !m.driver.toLowerCase().includes(timeReportFilterDriver.toLowerCase())) return false;
      if (timeReportFilterClient && !(m.client || '').toLowerCase().includes(timeReportFilterClient.toLowerCase())) return false;
      return true;
    });

    // Calculate averages
    const stepTimes: Record<string, number[]> = {};
    K_STEPS.forEach(s => stepTimes[s.id] = []);

    closedMovements.forEach(m => {
      const timings = m.kanbanTimings || {};
      const pauses = m.kanbanTotalPause || {};
      
      const getTiming = (s: string) => s === 'aguardando_descarregamento' ? (timings[s] || m.timestamp) : timings[s];

      for (let i = 0; i < K_STEPS.length - 1; i++) {
        const step = K_STEPS[i].id;
        const nextStep = K_STEPS[i + 1].id;
        const start = getTiming(step);
        const end = getTiming(nextStep);
        if (start && end) {
          let diff = new Date(end).getTime() - new Date(start).getTime();
          diff -= (pauses[step] || 0);
          stepTimes[step].push(Math.max(0, diff));
        }
      }
    });

    const exportToCSV = () => {
      const csvHeaders = ['Placa', 'Motorista', 'Cliente', ...K_STEPS.slice(0, 4).map(s => `Tempo ${s.label}`), 'Tempo Total Liquido (Excluindo Pausas)'];
      const csvRows: any[] = [];
      
      closedMovements.forEach(m => {
        const { stepSecs, totalSec } = getVehicleTimeDetails(m);
        const stepTimesCSV = stepSecs.map(sec => sec === null ? '-' : formatSeconds(sec));
        const totalTime = totalSec > 0 ? formatSeconds(totalSec) : '-';
        
        csvRows.push([
          m.plate,
          m.driver,
          m.client || '',
          ...stepTimesCSV,
          totalTime
        ]);
      });
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');
        
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_tempos_producao_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 pb-10 animate-in fade-in duration-200">
        
        {/* Document toolbar */}
        <div className="flex justify-between items-center bg-white p-3 border border-slate-200 rounded-lg shadow-sm print:hidden font-sans">
          <button 
            onClick={() => {
              setTimeReportMode(false);
              setShowKanbanReport(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft size={16} /> Voltar p/ o Relatório
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download size={15} /> Exportar Planilha
            </button>
            <button 
              onClick={() => handlePrint('times')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={15} /> Imprimir / PDF
            </button>
          </div>
        </div>

        {/* Dica de PDF/Impressão para o iFrame */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 print:hidden font-sans">
          <p className="text-slate-600 text-xs flex gap-2 items-start font-medium leading-relaxed">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>Dica de Impressão & Exportação PDF:</strong> Se as restrições de segurança do iframe impedirem a ação de impressão direta, clique no botão de <strong>Nova Aba</strong> no menu superior direito do navegador para abrir a URL independente e imprimir perfeitamente.
            </span>
          </p>
        </div>

        {/* Paper Document Layout (A4 ratio, optimized margin, crisp styling) */}
        <div id="pdf-container" className="bg-white border border-slate-300 p-8 shadow-md rounded-md print:border-0 print:p-0 print:shadow-none min-h-[842px] flex flex-col justify-between text-slate-800 font-sans">
          
          {/* Header block */}
          <div className="space-y-4">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div className="flex gap-4 items-center">
                {companyLogo && (
                  <img src={companyLogo || undefined} alt="Logo" className="max-h-12 max-w-[120px] object-contain rounded-md border border-slate-100 p-0.5 bg-white" referrerPolicy="no-referrer" />
                )}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Relatório Técnico</span>
                  <h1 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">Kpi Tempos de Processo - Produção</h1>
                  <p className="text-xs text-slate-500 font-medium">Controle de Tempos Médios de Atendimento, Pausas e Gargalos Operacionais</p>
                </div>
              </div>
              <div className="text-right text-[10px] space-y-0.5 font-medium text-slate-500">
                <p className="text-xs font-bold text-slate-800">INDUSTRACK SYSTEM</p>
                <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
                <p>Hora: {new Date().toLocaleTimeString('pt-BR')}</p>
              </div>
            </div>

            {/* Document stats / filters details */}
            <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center text-xs">
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Amostras</span>
                <span className="text-base font-black text-slate-800 tabular-nums">{closedMovements.length}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Filtros Aplicados</span>
                <span className="text-[10px] text-slate-700 font-semibold block truncate mt-1">
                  {timeReportFilterDate ? `Data: ${new Date(timeReportFilterDate + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Todas as datas'}
                  {timeReportFilterPlate ? ` | Placa: ${timeReportFilterPlate.toUpperCase()}` : ''}
                  {timeReportFilterDriver ? ` | Mot: ${timeReportFilterDriver}` : ''}
                  {timeReportFilterClient ? ` | Cli: ${timeReportFilterClient}` : ''}
                </span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Operador</span>
                <span className="text-xs font-bold text-slate-800 block truncate mt-1">
                  {currentUser ? currentUser.name : 'Operador'}
                </span>
              </div>
            </div>

            {/* Averages cards */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-1">Métricas de Tempo Médio por Etapa</h3>
              <div className="grid grid-cols-4 gap-3">
                {K_STEPS.slice(0, 4).map(step => {
                  const times = stepTimes[step.id] || [];
                  const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
                  return (
                    <div key={step.id} className="bg-slate-50/70 p-2.5 rounded border border-slate-200 text-center">
                      <div className="text-[9px] font-bold text-slate-500 uppercase leading-tight h-6 flex items-center justify-center">{step.label}</div>
                      <div className="text-sm font-black text-slate-800 tabular-nums">{times.length ? formatTimeDiff(avgMs) : '-'}</div>
                      <div className="text-[8px] text-slate-400 font-medium">{times.length} amostras</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="space-y-2 pt-4">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-1">Detalhamento dos Tempos de Atendimento</h3>
              <table className="w-full text-left text-[9px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-350 text-slate-650 uppercase tracking-wide text-[7.5px] font-bold">
                    <th className="p-2 w-2/12">Veículo / Informações</th>
                    <th className="p-2 text-right">T. Fila Entrada</th>
                    <th className="p-2 text-right text-indigo-700">Descarregamento (Real vs Prev)</th>
                    <th className="p-2 text-right">T. Fila Pátio</th>
                    <th className="p-2 text-right text-emerald-700">Carregamento (Real vs Prev)</th>
                    <th className="p-2 text-right w-1.5/12">Tempo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {closedMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 uppercase tracking-widest italic font-bold">
                        Nenhum registro de tempo encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    closedMovements.map((m, idx) => {
                      const { stepSecs, totalSec } = getVehicleTimeDetails(m);
                      const totalTime = totalSec > 0 ? formatSeconds(totalSec) : '-';

                      return (
                        <tr key={m.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="p-2">
                            <div className="font-mono font-bold text-slate-900 tracking-wider text-xs">{m.plate}</div>
                            <div className="text-[7.5px] text-slate-500 uppercase mt-0.5">
                              Mot: {m.driver} {m.client && <span className="font-bold text-slate-755 ml-1">({m.client})</span>}
                            </div>
                          </td>
                          <td className="p-2 text-right font-medium text-slate-600 tabular-nums">
                            {stepSecs[0] !== null ? formatSeconds(stepSecs[0]) : '-'}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {(() => {
                              const qty = m.productionControl?.expectedDischargeQty || m.productionControl?.descarregadoQty || 0;
                              const pred = avgTimeDischarging > 0 ? (qty / avgTimeDischarging) * 60 : 0;
                              const real = stepSecs[1];
                              if (real === null) return <span className="text-slate-400">-</span>;
                              const diff = real - pred;
                              const over = diff > 0;
                              return (
                                <div className="inline-flex flex-col items-end">
                                  <div className="font-bold text-indigo-750">Real: {formatSeconds(real)}</div>
                                  <div className="text-[8px] text-slate-500">Prev ({qty}u): {formatSeconds(pred)}</div>
                                  {pred > 0 && (
                                    <span className={`text-[7.5px] font-black mt-0.5 ${over ? 'text-rose-600' : 'text-emerald-700'}`}>
                                      {over ? `⚠️ Atraso: +${formatSeconds(diff)}` : `✅ No Prazo: -${formatSeconds(Math.abs(diff))}`}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-2 text-right font-medium text-slate-600 tabular-nums">
                            {stepSecs[2] !== null ? formatSeconds(stepSecs[2]) : '-'}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {(() => {
                              const qty = (m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0) || m.productionControl?.descarregadoQty || 0;
                              const pred = avgTimeLoading > 0 ? (qty / avgTimeLoading) * 60 : 0;
                              const real = stepSecs[3];
                              if (real === null) return <span className="text-slate-400">-</span>;
                              const diff = real - pred;
                              const over = diff > 0;
                              return (
                                <div className="inline-flex flex-col items-end">
                                  <div className="font-bold text-emerald-750">Real: {formatSeconds(real)}</div>
                                  <div className="text-[8px] text-slate-500">Prev ({qty}u): {formatSeconds(pred)}</div>
                                  {pred > 0 && (
                                    <span className={`text-[7.5px] font-black mt-0.5 ${over ? 'text-rose-600' : 'text-emerald-700'}`}>
                                      {over ? `⚠️ Atraso: +${formatSeconds(diff)}` : `✅ No Prazo: -${formatSeconds(Math.abs(diff))}`}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-2 text-right font-black text-blue-700 tabular-nums">{totalTime}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Notas regulatórias */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[8px] text-slate-500 leading-relaxed mt-4 font-sans">
              <span className="font-bold text-slate-700 block mb-0.5 uppercase tracking-wider">Notas Técnicas de Desempenho (KPI):</span>
              Os tempos apresentados excluem os períodos de interrupções (pausas) acionadas formalmente pelos operadores de cada etapa do Kanban. Os registros de auditoria temporal são gerados sob integridade do sistema de balança, descarregamento e carregamento automatizados.
            </div>
          </div>

          {/* Footer block */}
          <div className="border-t border-slate-300 pt-6 mt-10 grid grid-cols-2 text-[10px] text-slate-400">
            <div>
              <p className="font-bold text-slate-600 uppercase">Responsável Operacional</p>
              <div className="h-10 border-b border-dashed border-slate-300 w-48 mt-1"></div>
              <p className="mt-1 font-medium font-sans">{currentUser ? currentUser.name : 'Operador'} - ID: {currentUser ? currentUser.id : 'N/A'}</p>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="font-bold uppercase tracking-widest text-slate-500">Documento Oficial de Pátio</p>
              <p>© {new Date().getFullYear()} Industrack Logística S/A</p>
              <p className="text-[8px] font-mono tracking-tight mt-0.5">Hash autógrafo: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
            </div>
          </div>

        </div>

        {showPrintGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center font-sans">
                <div className="flex items-center gap-2">
                  <Printer className="text-blue-400" size={18} />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Como Gerar PDF / Imprimir</h3>
                </div>
                <button 
                  onClick={() => setShowPrintGuide(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-5 space-y-4 text-xs text-slate-650 leading-relaxed font-sans">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-800 flex gap-2.5 items-start">
                  <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="font-semibold text-[11px]">
                    Por segurança, os navegadores modernos bloqueiam o comando de impressão (PDF) quando o aplicativo está sendo executado em caixas protegidas (iframe) como a pré-visualização do editor.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Passos Simples para Gerar o PDF:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 font-medium text-slate-600">
                    <li>Clique no botão azul <strong className="text-slate-800">"Abrir em Nova Aba"</strong> abaixo.</li>
                    <li>O sistema será carregado com segurança diretamente em uma aba exclusiva do seu navegador.</li>
                    <li>O diálogo de impressão/salvamento em PDF abrirá automaticamente! Caso não abra, basta usar a mesma ação de <strong className="text-slate-800">"Imprimir / PDF"</strong> lá.</li>
                  </ol>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPrintGuide(false)}
                    className="px-3 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold uppercase text-[10px] tracking-wider rounded transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <a
                    href={`${window.location.origin}${window.location.pathname}?tab=fila&autoPrintTime=true&filterDate=${timeReportFilterDate}&filterPlate=${encodeURIComponent(timeReportFilterPlate)}&filterDriver=${encodeURIComponent(timeReportFilterDriver)}&filterClient=${encodeURIComponent(timeReportFilterClient)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPrintGuide(false)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-wider rounded flex items-center gap-1.5 shadow-md shadow-blue-100 transition-colors cursor-pointer"
                  >
                    <ExternalLink size={14} /> Abrir em Nova Aba
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Render printable PDF Document Mode
  if (reportMode) {
    const allActiveInQueue = movements
      .filter(m => 
        m.status !== 'saida' && 
        m.status !== 'concluido' &&
        (m.unit || 'matriz') === (currentUser?.unit || 'matriz') &&
        matchesSearch(m)
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const pesadaInQueue = allActiveInQueue.filter(m => getLineType(m.vehicleType) === 'pesada');
    const mediaInQueue = allActiveInQueue.filter(m => getLineType(m.vehicleType) === 'media');

    const renderReportTable = (title: string, subtitle: string, items: Movement[]) => (
      <div className="space-y-2 pt-2">
        <div className="flex justify-between items-baseline border-b border-slate-300 pb-1">
          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">{title}</h3>
          <span className="text-[10px] text-slate-500 font-semibold uppercase">{subtitle} — {items.length} veículo(s)</span>
        </div>
        
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-650 uppercase tracking-wide text-[9px] font-bold">
              <th className="p-2 w-2/12">Placa</th>
              <th className="p-2 w-2/12">Tipo</th>
              <th className="p-2 w-2/12">Categoria</th>
              <th className="p-2 w-3/12">Motorista</th>
              <th className="p-2 w-1/12">Entrada</th>
              <th className="p-2 w-2/12">Vistoria</th>
              <th className="p-2 w-2/12 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {items.map((m, idx) => {
              const isChecked = m.checklist && m.checklist.brakes && m.checklist.tires;
              return (
                <tr key={m.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="p-2 font-mono font-bold text-slate-900 tracking-wider text-xs">{m.plate}</td>
                  <td className="p-2 capitalize font-medium text-slate-600">{m.ownerType}</td>
                  <td className="p-2 uppercase font-semibold text-slate-500">
                    {customVehicleCategories.find(c => c.id === m.vehicleType)?.name || m.vehicleType}
                  </td>
                  <td className="p-2 text-slate-700 font-medium">
                    <div className="truncate max-w-[150px]" title={m.driver}>{m.driver}</div>
                    {m.client && (
                      <div className="text-[9px] text-indigo-700 font-bold uppercase tracking-wide mt-0.5">Cli: {m.client}</div>
                    )}
                  </td>
                  <td className="p-2 tabular-nums text-slate-500">
                    {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-2 font-semibold">
                    {m.ownerType === 'terceiro' ? (
                      <span className="text-slate-400 uppercase text-[9px]">Dispensado</span>
                    ) : isChecked ? (
                      <span className="text-emerald-700 uppercase text-[9px] font-bold bg-emerald-50 px-1 py-0.5 rounded">Realizada</span>
                    ) : null}
                  </td>
                  <td className="p-2 text-right uppercase font-bold text-slate-600 text-[9px]">
                    {m.status.replace('_', ' ')}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400 uppercase tracking-widest italic font-bold">
                  Nenhum veículo ativo nesta linha de produção.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
    
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 pb-10">
        
        {/* Document toolbar */}
        <div className="flex justify-between items-center bg-white p-3 border border-slate-200 rounded-lg shadow-sm print:hidden">
          <button 
            onClick={() => setReportMode(false)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 uppercase tracking-wider"
          >
            <ArrowLeft size={16} /> Voltar p/ o Painel
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download size={15} /> Exportar Planilha
            </button>
            <button 
              onClick={() => handlePrint('queue')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer size={15} /> Imprimir / PDF
            </button>
          </div>
        </div>

        {/* Dica de PDF/Impressão para o iFrame */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 print:hidden">
          <p className="text-slate-600 text-xs flex gap-2 items-start font-medium leading-relaxed">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>Dica de Impressão & Exportação PDF:</strong> Se as restrições de segurança do iframe impedirem a ação de impressão direta, clique no botão de <strong>Nova Aba</strong> no menu superior direito do navegador para abrir a URL independente e imprimir perfeitamente.
            </span>
          </p>
        </div>

        {/* Paper Document Layout (A4 ratio, optimized margin, crisp styling) */}
        <div id="pdf-container" className="bg-white border border-slate-300 p-8 shadow-md rounded-md print:border-0 print:p-0 print:shadow-none min-h-[842px] flex flex-col justify-between text-slate-800 font-sans">
          
          {/* Header block */}
          <div className="space-y-4">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div className="flex gap-4 items-center">
                {companyLogo && (
                  <img src={companyLogo || undefined} alt="Logo" className="max-h-12 max-w-[120px] object-contain rounded-md border border-slate-100 p-0.5 bg-white" referrerPolicy="no-referrer" />
                )}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Relatório Técnico</span>
                  <h1 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">Fila de Produção e Logística</h1>
                  <p className="text-xs text-slate-500 font-medium">Controle Integrado de Movimentação, Estacionamento e vistorias</p>
                </div>
              </div>
              <div className="text-right text-[10px] space-y-0.5 font-medium text-slate-500">
                <p className="text-xs font-bold text-slate-800">INDUSTRACK SYSTEM</p>
                <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
                <p>Hora: {new Date().toLocaleTimeString('pt-BR')}</p>
              </div>
            </div>

            {/* Document stats */}
            <div className={`grid ${isFilial ? 'grid-cols-3' : 'grid-cols-4'} gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-center`}>
              <div>
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Total na fila</span>
                <span className="text-base font-black text-slate-800 tabular-nums">{allActiveInQueue.length}</span>
              </div>
              {isFilial ? (
                <div>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Unidade</span>
                  <span className="text-xs font-bold text-slate-800 block truncate mt-2 uppercase">Filial</span>
                </div>
              ) : (
                <>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Linha Pesada</span>
                    <span className="text-base font-black text-slate-800 tabular-nums">
                      {pesadaInQueue.length}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Linha Média</span>
                    <span className="text-base font-black text-slate-800 tabular-nums">
                      {mediaInQueue.length}
                    </span>
                  </div>
                </>
              )}
              <div>
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Operador</span>
                <span className="text-xs font-bold text-slate-800 block truncate mt-1">
                  {currentUser ? currentUser.name : 'Doutor Operador'}
                </span>
              </div>
            </div>

            {/* Official Report Tables - Separated by Line */}
            <div className="space-y-6 pt-2">
              {isFilial ? (
                renderReportTable("Fila de Produção - Filial", "Todas as Categorias", allActiveInQueue)
              ) : (
                <>
                  {renderReportTable("Linha Pesada", "Carreta / Truck", pesadaInQueue)}
                  {renderReportTable("Linha Média", "Toco / 3/4", mediaInQueue)}
                </>
              )}
            </div>

            {/* Document warnings or general specifications */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded text-[10px] text-slate-500 leading-relaxed mt-6">
              <span className="font-bold text-slate-700 block mb-0.5 uppercase tracking-wider">Notas Regulatórias de Vistoria:</span>
              Os veículos da frota própria cadastrados neste relatório foram inspecionados em campo junto aos dispensers do Posto de Combustíveis em conformidade com o regulamento operacional Nº 4. Atendimentos concluídos e saídas físicas do pátio são registrados de forma temporal imutável nos bancos de auditoria do sistema.
            </div>
          </div>

          {/* Footer block */}
          <div className="border-t border-slate-300 pt-6 mt-10 grid grid-cols-2 text-[10px] text-slate-400">
            <div>
              <p className="font-bold text-slate-650 uppercase">Responsável Operacional</p>
              <div className="h-10 border-b border-dashed border-slate-300 w-48 mt-1"></div>
              <p className="mt-1 font-medium">{currentUser ? currentUser.name : 'Doutor Operador'} - ID: {currentUser ? currentUser.id : 'N/A'}</p>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="font-bold uppercase tracking-widest text-slate-500">Documento Oficial de Pátio</p>
              <p>© {new Date().getFullYear()} Industrack Logística S/A</p>
              <p className="text-[8px] font-mono tracking-tight mt-0.5">Hash autógrafo: {crypto.randomUUID().slice(0,8)}</p>
            </div>
          </div>

        </div>

        {showPrintGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Printer className="text-blue-400" size={18} />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Como Gerar PDF / Imprimir</h3>
                </div>
                <button 
                  onClick={() => setShowPrintGuide(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-5 space-y-4 text-xs text-slate-650 leading-relaxed">
                <div className="bg-blue-50 border border-blue-105 rounded-lg p-3 text-blue-800 flex gap-2.5 items-start">
                  <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="font-semibold text-[11px]">
                    Por segurança, os navegadores modernos bloqueiam o comando de impressão (PDF) quando o aplicativo está sendo executado em caixas protegidas (iframe) como a pré-visualização do editor.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Passos Simples para Gerar o PDF:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 font-medium text-slate-600">
                    <li>Clique no botão azul <strong className="text-slate-800">"Abrir em Nova Aba"</strong> abaixo.</li>
                    <li>O sistema será carregado com segurança diretamente em uma aba exclusiva do seu navegador.</li>
                    <li>O diálogo de impressão/salvamento em PDF abrirá automaticamente! Caso não abra, basta clicar no mesmo botão <strong className="text-slate-800">"Imprimir"</strong> lá.</li>
                  </ol>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPrintGuide(false)}
                    className="px-3 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold uppercase text-[10px] tracking-wider rounded transition-colors"
                  >
                    Fechar
                  </button>
                  <a
                    href={`${window.location.origin}${window.location.pathname}?tab=fila&autoPrint=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowPrintGuide(false)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-wider rounded flex items-center gap-1.5 shadow-md shadow-blue-100 transition-colors"
                  >
                    <ExternalLink size={14} /> Abrir em Nova Aba
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="h-full flex flex-col w-full gap-4">
      
      {/* Top action and filter bar */}
      <div className="bg-white px-4 py-3 border border-slate-200 rounded-lg shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Plates */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 pointer-events-none">
              <Search size={14} />
            </span>
            <input 
              type="text" 
              placeholder="Filtrar por Placa..."
              value={searchPlate}
              onChange={e => setSearchPlate(e.target.value)}
              className="bg-slate-50 text-xs border border-slate-200 p-1.5 pl-8 rounded font-mono outline-none focus:border-blue-400 focus:bg-white shadow-inner max-w-[140px]"
            />
          </div>

          {/* Filter Drivers */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 pointer-events-none">
              <Search size={14} />
            </span>
            <input 
              type="text" 
              placeholder="Filtrar por Motorista..."
              value={searchDriver}
              onChange={e => setSearchDriver(e.target.value)}
              className="bg-slate-50 text-xs border border-slate-200 p-1.5 pl-8 rounded outline-none focus:border-blue-400 focus:bg-white shadow-inner max-w-[150px]"
            />
          </div>

          {/* Work Schedule Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold border ${
            scheduleStatus.isScheduledPause 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : scheduleStatus.isOvertime 
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : scheduleStatus.isWithinWorkHours 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
          }`} title={scheduleStatus.currentPeriodName}>
            <Clock size={13} className="shrink-0" />
            <span>
              {scheduleStatus.dayName.slice(0, 3)} {scheduleStatus.formattedCurrentTime}: {scheduleStatus.currentPeriodName}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Machine Status Manager Button */}
          <button
            type="button"
            onClick={() => setShowMachineManagerModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border transition-all cursor-pointer ${
              allStoppedMachines.length > 0
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 animate-pulse'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Gerenciar status e pausas de cada máquina (Almoço, Fim de Expediente, Quebras)"
          >
            <Cpu size={14} className={allStoppedMachines.length > 0 ? 'text-amber-600' : 'text-slate-500'} />
            <span>Máquinas ({operationalMachines.length}/{machinesList.length} Op)</span>
            {lunchMachines.length > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 rounded-full">
                {lunchMachines.length} Almoço
              </span>
            )}
            {closedDayMachines.length > 0 && (
              <span className="bg-purple-600 text-white text-[9px] font-black px-1.5 rounded-full">
                {closedDayMachines.length} Encerrada
              </span>
            )}
            {brokenMachines.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 rounded-full">
                {brokenMachines.length} Parada
              </span>
            )}
          </button>

          {/* Production Toggle */}
          {hasWriteAccess && (
            <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
              {isProductionOpen ? (
                <button
                  type="button"
                  onClick={() => setShowStopModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded text-red-700 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                  title="Fechar / Pausar Produção"
                >
                  <Lock size={14} /> Fechar Produção
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleProductionOpen(true, targetUnit)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded text-emerald-700 hover:bg-white hover:shadow-sm transition-all animate-pulse cursor-pointer"
                  title="Abrir / Retomar Produção"
                >
                  <Unlock size={14} /> Retomar Produção
                </button>
              )}
            </div>
          )}

          {/* View Tab selector */}
          <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${activeTab === 'lista' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List size={14} /> Fila
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${activeTab === 'kanban' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <KanbanSquare size={14} /> Produção
            </button>
          </div>

          <button 
            type="button"
            onClick={() => setShowMachineStopsModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded-md flex items-center gap-1.5 shadow-sm shadow-amber-100 transition-colors cursor-pointer"
            title="Relatório de Paradas & Ociosidade de Máquinas"
          >
            <Wrench size={14} /> Relatório Paradas
          </button>

          <button 
            type="button"
            onClick={() => activeTab === 'kanban' ? setShowKanbanReport(true) : setReportMode(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded-md flex items-center gap-1.5 shadow-sm shadow-blue-100 transition-colors cursor-pointer"
          >
            <FileText size={15} /> {activeTab === 'kanban' ? 'Relatório Tempos' : 'Relatório (PDF)'}
          </button>
        </div>
      </div>

      {/* Production Closed Banner */}
      {!isProductionOpen && (
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-950 animate-in fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-xs uppercase tracking-wider text-red-800 flex flex-wrap items-center gap-2">
                <span>🛑 Produção Fechada / Pausada</span>
                {currentStatusDetail?.isScheduledPause && (
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.2 rounded-full">
                    Pausa Programada de Almoço
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-700 font-medium mt-0.5">
                <strong>Motivo:</strong> {currentStatusDetail?.customReason || currentStatusDetail?.reason || 'Produção Fechada'}
                {currentStatusDetail?.closedBy && ` | Responsável: ${currentStatusDetail.closedBy}`}
                {currentStatusDetail?.closedAt && ` | Início: ${new Date(currentStatusDetail.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                {currentStatusDetail?.notes && <span className="italic ml-1">({currentStatusDetail.notes})</span>}
              </div>
            </div>
          </div>
          {hasWriteAccess && (
            <button
              type="button"
              onClick={() => toggleProductionOpen(true, targetUnit)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 animate-pulse"
            >
              <Unlock size={14} /> Retomar Produção
            </button>
          )}
        </div>
      )}

      {/* Single Line Breakdown Banner */}
      {isSingleLineMode && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-xs uppercase tracking-wider text-amber-800 flex flex-wrap items-center gap-2">
                <span>⚠️ Modo Linha Única Ativo: Máquina Parada</span>
                <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.2 rounded-full border border-red-200">
                  {brokenMachine?.name} ({brokenMachine?.status === 'quebrada' ? 'Quebrada' : 'Manutenção'})
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                Como uma das máquinas está inoperante ({brokenMachine?.reason || 'Parada técnica'}), a fábrica está operando em <strong>Linha Única</strong>. Toda a fila de veículos pesados e médios foi consolidada e está sendo processada pela <strong>{activeMachine?.name}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowMachineManagerModal(true)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Wrench size={13} /> Gerenciar Máquinas
          </button>
        </div>
      )}

      {activeTab === 'lista' ? (
        /* Main Grid Queue Columns */
        <div className={`grid grid-cols-1 ${isFilial || isSingleLineMode ? 'max-w-3xl' : 'md:grid-cols-2 max-w-5xl'} gap-4 flex-1 min-h-0 w-full mx-auto`}>
          {isFilial ? (
            <div className="md:col-span-2 h-full">
              <Column 
                title="FILA ÚNICA" 
                subTitle="Fila Unificada Filial" 
                items={queueFilial} 
                pillClass="bg-indigo-100 text-indigo-700 font-extrabold"
                borderClass="border-l-indigo-600"
              />
            </div>
          ) : isSingleLineMode ? (
            <div className="md:col-span-2 h-full">
              <Column 
                title={`FILA ÚNICA (MÁQUINA ATIVA: ${activeMachine?.name || 'MÁQUINA 1'})`} 
                subTitle={`Modo Linha Única Emergencial (${brokenMachine?.name} Inoperante)`} 
                items={queueSingleLine} 
                pillClass="bg-amber-100 text-amber-900 font-extrabold border border-amber-300"
                borderClass="border-l-amber-600"
                machine={activeMachine}
              />
            </div>
          ) : (
            <>
              <Column 
                title="PESADA (MÁQUINA 1)" 
                subTitle="Carreta / Truck" 
                items={queuePesada} 
                pillClass="bg-red-100 text-red-700"
                borderClass="border-l-red-500"
                machine={unitMachines.machine_1}
              />
              <Column 
                title="MÉDIA (MÁQUINA 2)" 
                subTitle="Toco / 3/4" 
                items={queueMedia} 
                pillClass="bg-blue-100 text-blue-700"
                borderClass="border-l-slate-400"
                machine={unitMachines.machine_2}
              />
            </>
          )}
        </div>
      ) : (
        <KanbanBoard />
      )}
      
      {showKanbanReport && <KanbanReportModal onClose={() => setShowKanbanReport(false)} />}
      {selectedVehicleForProduction && (
        <ProductionControlModal 
          vehicle={selectedVehicleForProduction} 
          onClose={() => {
            setSelectedVehicleForProduction(null);
            setProductionFocusPhase('all');
            setProductionTransitionOnSave(null);
          }} 
          focusPhase={productionFocusPhase}
          transitionOnSave={productionTransitionOnSave}
        />
      )}

      {/* Production Stop Modal */}
      <ProductionStopModal 
        isOpen={showStopModal} 
        onClose={() => setShowStopModal(false)} 
        unit={targetUnit} 
      />

      {/* Machine Status Manager Modal */}
      <MachineStatusManagerModal 
        isOpen={showMachineManagerModal} 
        onClose={() => setShowMachineManagerModal(false)} 
        unit={targetUnit} 
      />

      {/* Quick Machine Stop Modal (from wrench tag) */}
      <QuickMachineStopModal
        isOpen={!!quickStopMachine}
        onClose={() => setQuickStopMachine(null)}
        machine={quickStopMachine}
        unit={targetUnit}
      />

      {/* Machine Stops & Downtime Report Modal */}
      {showMachineStopsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-400/30">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Relatório de Paradas & Ociosidade de Máquinas
                  </h3>
                  <span className="text-[10px] text-slate-300 font-mono">
                    Unidade: {targetUnit.toUpperCase()} • Análise de Perdas de Produção
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMachineStopsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <MachineStopsReportView initialUnit={targetUnit} isStandalone={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
