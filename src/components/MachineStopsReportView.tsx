import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { 
  generateMachineStopsReport, 
  categorizeStopReason, 
  StopRecordAnalysis, 
  MachineStopsSummary,
  calculateScheduleOverlap,
  calculateLineRates
} from '../utils/machineStopsAnalytics';
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  Droplets, 
  TrendingDown, 
  Calendar, 
  Download, 
  Printer, 
  Filter, 
  Gauge, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  Truck,
  Activity,
  Layers
} from 'lucide-react';
import { DynamicTable } from './DynamicTable';
import { printElementDirectly } from '../utils/printReceipt';

export const MachineStopsReportView: React.FC<{
  initialUnit?: string;
  isStandalone?: boolean;
}> = ({ initialUnit, isStandalone = false }) => {
  const { 
    productionStopLogs = [], 
    productionMachines, 
    movements = [], 
    currentUser 
  } = useStore();

  const targetUnit = initialUnit || currentUser?.unit || 'matriz';

  // Filters
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    // Default to last 7 days or today
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filterMachine, setFilterMachine] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Quick Date presets
  const setDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setFilterStartDate(yStr);
      setFilterEndDate(yStr);
    } else if (preset === 'week') {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      setFilterStartDate(w.toISOString().split('T')[0]);
      setFilterEndDate(todayStr);
    } else if (preset === 'month') {
      const m = new Date();
      m.setMonth(m.getMonth() - 1);
      setFilterStartDate(m.toISOString().split('T')[0]);
      setFilterEndDate(todayStr);
    } else if (preset === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  // Generate the analytics
  const reportData = useMemo(() => {
    return generateMachineStopsReport(
      productionStopLogs,
      productionMachines,
      movements,
      targetUnit,
      filterStartDate,
      filterEndDate,
      filterMachine,
      filterCategory
    );
  }, [
    productionStopLogs,
    productionMachines,
    movements,
    targetUnit,
    filterStartDate,
    filterEndDate,
    filterMachine,
    filterCategory
  ]);

  // Filter records by search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return reportData.records;
    const term = searchTerm.toLowerCase().trim();
    return reportData.records.filter(r => 
      r.machineName.toLowerCase().includes(term) ||
      (r.customReason || '').toLowerCase().includes(term) ||
      r.reason.toLowerCase().includes(term) ||
      r.stoppedBy.toLowerCase().includes(term) ||
      (r.notes || '').toLowerCase().includes(term) ||
      r.stoppedAt.includes(term)
    );
  }, [reportData.records, searchTerm]);

  const expectedVsActual = useMemo(() => {
    const start = filterStartDate ? new Date(`${filterStartDate}T00:00:00`) : new Date();
    const end = filterEndDate ? new Date(`${filterEndDate}T23:59:59`) : new Date();
    if (!filterStartDate && movements.length > 0) {
      const firstMovement = Math.min(...movements.map(m => new Date(m.timestamp).getTime()));
      start.setTime(firstMovement);
    }

    const overlap = calculateScheduleOverlap(start, end);
    const workHours = overlap.workHoursMs / 3600000;

    let expectedTotal = 0;
    const machinesInUnit = productionMachines?.[targetUnit] || {};
    const defaultRates = calculateLineRates([], targetUnit);

    Object.values(machinesInUnit).forEach(m => {
      let rate = m.capacityPerHour;
      if (!rate) {
        rate = m.lineType === 'pesada' ? defaultRates.pesadaPerHour : (m.lineType === 'media' ? defaultRates.mediaPerHour : defaultRates.filialPerHour);
      }
      expectedTotal += rate * workHours;
    });

    const filteredMovements = movements.filter(m => {
      if ((m.unit || 'matriz') !== targetUnit) return false;
      const mDateStr = m.timestamp.split('T')[0];
      if (filterStartDate && mDateStr < filterStartDate) return false;
      if (filterEndDate && mDateStr > filterEndDate) return false;
      return true;
    });

    const realTotal = filteredMovements.reduce((sum, m) => sum + (m.productionControl?.totalCarregado || 0) + (m.productionControl?.retornoVasilhameCheio || 0), 0);
    const percentMet = expectedTotal > 0 ? (realTotal / expectedTotal) * 100 : 0;

    return {
      expected: Math.round(expectedTotal),
      real: realTotal,
      percentMet: Math.round(percentMet),
      workHours: Math.round(workHours)
    };
  }, [filterStartDate, filterEndDate, movements, targetUnit, productionMachines]);

  // Format Milliseconds to readable string
  const formatDurationMs = (ms: number) => {
    if (ms <= 0) return '0 min';
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}min` : ''}`.trim();
    }
    return `${mins} min`;
  };

  const formatDateTime = (ts: string) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Data Início',
      'Hora Início',
      'Data Retorno',
      'Hora Retorno',
      'Status',
      'Unidade',
      'Máquina / Linha',
      'Tipo de Parada',
      'Categoria da Parada',
      'Motivo Detalhado',
      'Duração Total (min)',
      'Tempo Perdido no Expediente (min)',
      'Tempo de Descanso/Programado (min)',
      'Taxa Linha (Garrafões/Hora)',
      'Garrafões Não Envasados (20L)',
      'Volume Perdido (Litros)',
      'Responsável Parada',
      'Responsável Retomada',
      'Observações Técnicas'
    ];

    const rows = filteredRecords.map(r => {
      const startParts = r.stoppedAt.split('T');
      const startDate = startParts[0];
      const startTime = startParts[1]?.substring(0, 5) || '-';

      let returnDate = '-';
      let returnTime = '-';
      if (r.resumedAt) {
        const endParts = r.resumedAt.split('T');
        returnDate = endParts[0];
        returnTime = endParts[1]?.substring(0, 5) || '-';
      }

      const totalMins = Math.round(r.totalDurationMs / 60000);
      const workHoursMins = Math.round(r.workHoursDurationMs / 60000);
      const scheduledMins = Math.round((r.scheduledPauseMs + r.offHoursMs) / 60000);

      return [
        startDate,
        startTime,
        returnDate,
        returnTime,
        r.isActive ? 'EM ANDAMENTO (PARADA)' : 'CONCLUÍDA',
        r.unit,
        r.machineName,
        r.isUnproductiveLoss ? 'IMPRODUTIVA (QUEBRA/MANUTENÇÃO)' : 'PROGRAMADA (DESCANSO/TURNO)',
        r.reasonCategory.toUpperCase(),
        `"${(r.customReason || r.reason || '').replace(/"/g, '""')}"`,
        totalMins,
        workHoursMins,
        scheduledMins,
        r.productionRatePerHour,
        r.lostBottlesEstimate,
        r.lostLitersEstimate,
        `"${(r.stoppedBy || '').replace(/"/g, '""')}"`,
        `"${(r.resumedBy || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_paradas_ociosidade_maquinas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    printElementDirectly('relatorio-paradas-maquina-container', 'Relatório de Paradas & Ociosidade de Máquinas');
  };

  // Badge helpers
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'quebra':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><AlertTriangle size={11} /> Quebra / Defeito</span>;
      case 'manutencao':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><Wrench size={11} /> Manutenção Técnica</span>;
      case 'almoco':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">🍽️ Almoço (Descanso)</span>;
      case 'insumos':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><Layers size={11} /> Falta Insumos</span>;
      case 'fim_expediente':
        return <span className="bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">🌙 Fim de Expediente</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><Activity size={11} /> Outra Pausa</span>;
    }
  };

  // Dynamic Table columns
  const tableColumns = [
    {
      id: 'status',
      header: 'Status',
      defaultWidth: 110,
      cell: (r: StopRecordAnalysis) => (
        <div>
          {r.isActive ? (
            <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-2xs">
              🔴 Parada Ativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200">
              <CheckCircle2 size={10} /> Concluída
            </span>
          )}
        </div>
      )
    },
    {
      id: 'data',
      header: 'Início & Retorno',
      defaultWidth: 160,
      cell: (r: StopRecordAnalysis) => (
        <div className="font-mono text-xs">
          <div className="font-bold text-slate-800">
            {formatDateTime(r.stoppedAt)}
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
            <span>Até:</span>
            {r.resumedAt ? (
              <span className="text-slate-700 font-semibold">{formatDateTime(r.resumedAt)}</span>
            ) : (
              <span className="text-rose-600 font-extrabold">Ainda inoperante</span>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'maquina',
      header: 'Máquina / Linha',
      defaultWidth: 170,
      cell: (r: StopRecordAnalysis) => (
        <div>
          <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${r.lineType === 'pesada' ? 'bg-blue-600' : r.lineType === 'media' ? 'bg-emerald-600' : 'bg-purple-600'}`} />
            {r.machineName}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Taxa: <span className="font-bold text-slate-700 font-mono">{r.productionRatePerHour} u/h</span> (~{(r.productionRatePerHour / 60).toFixed(1)} u/min)
          </div>
        </div>
      )
    },
    {
      id: 'motivo',
      header: 'Motivo & Tipo',
      defaultWidth: 230,
      cell: (r: StopRecordAnalysis) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {getCategoryBadge(r.reasonCategory)}
            {r.isUnproductiveLoss ? (
              <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1 rounded">
                Improdutiva
              </span>
            ) : (
              <span className="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1 rounded">
                Programada
              </span>
            )}
          </div>
          <div className="font-semibold text-slate-800 text-xs leading-snug">
            {r.customReason || r.reason}
          </div>
          {r.notes && (
            <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 p-1.5 rounded italic">
              "{r.notes}"
            </div>
          )}
        </div>
      )
    },
    {
      id: 'tempoOcioso',
      header: 'Tempo Perdido no Expediente',
      defaultWidth: 170,
      cell: (r: StopRecordAnalysis) => (
        <div className="text-right">
          {r.isUnproductiveLoss ? (
            <div>
              <div className={`font-mono text-xs font-black ${r.workHoursDurationMs > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                {formatDurationMs(r.workHoursDurationMs)}
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Duração: {formatDurationMs(r.totalDurationMs)}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-mono text-xs font-bold text-slate-400">
                0 min <span className="text-[9px] font-sans font-medium text-emerald-700">(Descanso)</span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Pausa: {formatDurationMs(r.totalDurationMs)}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'aguaPerdida',
      header: 'Água Deixada de Envasar',
      defaultWidth: 180,
      cell: (r: StopRecordAnalysis) => (
        <div className="text-right">
          {r.lostBottlesEstimate > 0 ? (
            <div>
              <div className="font-mono text-xs font-black text-rose-800 flex items-center justify-end gap-1">
                <TrendingDown size={12} className="text-rose-600" />
                ~{r.lostBottlesEstimate.toLocaleString('pt-BR')} <span className="text-[10px] font-bold text-rose-600">garrafões 20L</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono font-medium mt-0.5">
                {(r.lostLitersEstimate).toLocaleString('pt-BR')} Litros
              </div>
            </div>
          ) : (
            <div>
              <span className="text-slate-400 text-xs font-mono font-semibold">-</span>
              <div className="text-[9px] text-slate-400 font-sans">
                Sem perda (Programado)
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'responsavel',
      header: 'Responsável',
      defaultWidth: 130,
      cell: (r: StopRecordAnalysis) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">{r.stoppedBy || 'Operador'}</div>
          {r.resumedBy && r.resumedBy !== r.stoppedBy && (
            <div className="text-[9px] text-slate-500">Retomado por: {r.resumedBy}</div>
          )}
        </div>
      )
    }
  ];

  return (
    <div id="relatorio-paradas-maquina-container" className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-750 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-400/30 rounded-xl shadow-inner">
              <Wrench size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-white">
                  Relatório de Paradas & Ociosidade de Máquinas
                </h2>
                <span className="bg-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-amber-400/30 font-mono">
                  Downtime & Perdas
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Cálculo de perda de produção e tempo ocioso aplicado estritamente a <strong>quebras e manutenções</strong> durante o expediente (07h-11h / 13h-17h). Pausas para almoço e fim de turno são classificadas como paradas programadas / horário de descanso.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Exportar dados consolidados em planilha CSV"
            >
              <Download size={14} /> Exportar CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Imprimir visualização formatada"
            >
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>

        {/* 5 Main Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Meta de Produção vs Realizado */}
          <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold text-emerald-300 tracking-wider">Meta x Realizado</span>
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  {expectedVsActual.percentMet}%
                </div>
                <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Atingido</div>
              </div>
              <div className="text-[10px] text-slate-300 mt-1 flex flex-col gap-0.5 font-medium">
                <div className="flex justify-between">
                  <span>Realizado:</span>
                  <span className="font-bold text-white">{expectedVsActual.real.toLocaleString('pt-BR')} un</span>
                </div>
                <div className="flex justify-between">
                  <span>Expectativa:</span>
                  <span className="font-bold text-slate-400">{expectedVsActual.expected.toLocaleString('pt-BR')} un</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tempo Perdido por Quebras/Manutenções */}
          <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold text-amber-300 tracking-wider">Tempo Perdido (Quebra/Manut.)</span>
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                {formatDurationMs(reportData.totalWorkHoursDowntimeMs)}
              </div>
              <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-medium">
                <span>{reportData.unproductiveStopsCount} quebra(s)/manut.</span>
                <span className="text-amber-300 font-semibold">No Expediente</span>
              </div>
            </div>
          </div>

          {/* Garrafões Não Envasados */}
          <div className="bg-slate-800/80 border border-rose-500/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold text-rose-300 tracking-wider">Água Deixada de Envasar</span>
              <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
                <TrendingDown size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
                ~{reportData.totalLostBottles.toLocaleString('pt-BR')} <span className="text-xs font-bold text-rose-300 font-sans">garrafões 20L</span>
              </div>
              <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-medium">
                <span>Volume: {reportData.totalLostLiters.toLocaleString('pt-BR')} L</span>
                <span className="text-rose-300 font-bold">Perda Operacional</span>
              </div>
            </div>
          </div>

          {/* Pausas Programadas (Descanso e Fora de Turno) */}
          <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold text-emerald-300 tracking-wider">Pausas Programadas</span>
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-300 font-mono tracking-tight">
                {formatDurationMs(reportData.totalScheduledPauseMs + reportData.totalOffHoursDowntimeMs)}
              </div>
              <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-medium">
                <span>Almoço & Turno ({reportData.scheduledStopsCount})</span>
                <span className="text-emerald-300 font-bold">Descanso Normal</span>
              </div>
            </div>
          </div>

          {/* Produtividade e Ocorrências */}
          <div className="bg-slate-800/80 border border-blue-500/30 rounded-xl p-3.5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-extrabold text-blue-300 tracking-wider">Taxa de Linha & Total</span>
              <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                <Gauge size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {reportData.avgLoadingRatePerHour} <span className="text-xs font-bold text-blue-400 font-sans">u/h</span>
              </div>
              <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between font-medium">
                <span>Total: {reportData.totalStopsCount} paradas</span>
                <span className="text-blue-300 font-bold">Unidade {targetUnit.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-2">
              <Filter size={14} className="text-blue-600" />
              <span>Filtros do Período:</span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setDatePreset('today')}
                className="px-2 py-1 text-[10px] font-bold rounded hover:bg-white text-slate-700 transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('yesterday')}
                className="px-2 py-1 text-[10px] font-bold rounded hover:bg-white text-slate-700 transition-colors cursor-pointer"
              >
                Ontem
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('week')}
                className="px-2 py-1 text-[10px] font-bold rounded hover:bg-white text-slate-700 transition-colors cursor-pointer"
              >
                Últimos 7 dias
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('month')}
                className="px-2 py-1 text-[10px] font-bold rounded hover:bg-white text-slate-700 transition-colors cursor-pointer"
              >
                30 dias
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('all')}
                className="px-2 py-1 text-[10px] font-bold rounded hover:bg-white text-slate-700 transition-colors cursor-pointer"
              >
                Tudo
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Start Date */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-medium">De:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-blue-500"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-medium">Até:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-blue-500"
              />
            </div>

            {/* Machine Filter */}
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-blue-500"
            >
              <option value="all">Todas as Máquinas</option>
              <option value="machine_1">Máquina 1 (Linha Pesada)</option>
              <option value="machine_2">Máquina 2 (Linha Média)</option>
              <option value="machine_filial">Máquina Filial</option>
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-blue-500"
            >
              <option value="all">Todos os Motivos</option>
              <option value="quebra">Quebra de Máquina / Defeito</option>
              <option value="manutencao">Manutenção / Ajustes</option>
              <option value="almoco">Almoço / Refeição</option>
              <option value="insumos">Falta de Vasilhame / Insumos</option>
              <option value="fim_expediente">Fim de Expediente</option>
              <option value="outros">Outras Pausas</option>
            </select>
          </div>
        </div>

        {/* Text Search input */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <input
            type="text"
            placeholder="Pesquisar por motivo, observação técnica ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-blue-500"
          />
          <span className="text-[11px] font-bold text-slate-500">
            {filteredRecords.length} ocorrência(s) encontrada(s)
          </span>
        </div>
      </div>

      {/* Comparative Cards by Machine & Breakdown by Reason */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Machine Breakdown */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-blue-600" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Desempenho & Ociosidade por Máquina / Linha
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Expediente: 07h-11h / 13h-17h
            </span>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[9px] font-bold">
                <tr>
                  <th className="py-2 px-3">Equipamento / Linha</th>
                  <th className="py-2 px-3 text-center">Taxa Nominal</th>
                  <th className="py-2 px-3 text-center">Quebras / Manut.</th>
                  <th className="py-2 px-3 text-center">Programadas</th>
                  <th className="py-2 px-3 text-right">Tempo Perdido (Exp.)</th>
                  <th className="py-2 px-3 text-right">Garrafões 20L Perdidos</th>
                  <th className="py-2 px-3 text-right">Volume Perdido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.values(reportData.byMachine).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-400 text-xs italic">
                      Nenhuma parada registrada para as máquinas no período selecionado.
                    </td>
                  </tr>
                ) : (
                  Object.values(reportData.byMachine).map(m => (
                    <tr key={m.machineId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900">{m.machineName}</div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{m.lineType}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {m.ratePerHour} u/h
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                        {m.unproductiveStopsCount}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                        {m.scheduledStopsCount}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-800 bg-amber-50/30">
                        {formatDurationMs(m.workHoursDowntimeMs)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-rose-700 bg-rose-50/30">
                        ~{m.lostBottles.toLocaleString('pt-BR')} u
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                        {m.lostLiters.toLocaleString('pt-BR')} L
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-900 text-xs">
                <tr>
                  <td className="py-2.5 px-3 uppercase text-[10px] font-black" colSpan={2}>
                    TOTAL DO PERÍODO
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-black text-rose-300">
                    {reportData.unproductiveStopsCount}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                    {reportData.scheduledStopsCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300">
                    {formatDurationMs(reportData.totalWorkHoursDowntimeMs)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-rose-300">
                    ~{reportData.totalLostBottles.toLocaleString('pt-BR')} u
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-blue-300">
                    {reportData.totalLostLiters.toLocaleString('pt-BR')} L
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Breakdown by Reason */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Motivos de Parada
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500">
              Por Categoria
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-start">
            {Object.values(reportData.byReason).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                Nenhum motivo registrado.
              </div>
            ) : (
              Object.values(reportData.byReason).map(r => {
                const isLoss = r.isUnproductive;
                const percent = isLoss && reportData.totalWorkHoursDowntimeMs > 0
                  ? Math.round((r.workHoursDowntimeMs / reportData.totalWorkHoursDowntimeMs) * 100)
                  : 0;

                return (
                  <div key={r.reasonCategory} className={`border rounded-lg p-2.5 space-y-1.5 ${isLoss ? 'bg-rose-50/30 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-extrabold text-slate-800 flex items-center gap-1">
                        {getCategoryBadge(r.reasonCategory)}
                      </div>
                      <span className="font-mono font-bold text-slate-700">
                        {isLoss ? `${formatDurationMs(r.workHoursDowntimeMs)} (${percent}%)` : `${formatDurationMs(r.totalDowntimeMs)} (Programado)`}
                      </span>
                    </div>

                    {/* Progress Bar for Losses */}
                    {isLoss ? (
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${r.reasonCategory === 'quebra' ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
                        />
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        ✓ Horário de descanso/turno • Sem impacto na perda de envasamento
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{r.stopsCount} parada(s)</span>
                      {isLoss ? (
                        <span className="font-mono font-bold text-rose-700">~{r.lostBottles.toLocaleString('pt-BR')} galões perdidos</span>
                      ) : (
                        <span className="font-mono text-slate-500">Descanso programado</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Detailed Stop Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-700" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Histórico Detalhado de Paradas & Ociosidade de Máquinas
            </h3>
          </div>
          <span className="bg-slate-200/80 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
            {filteredRecords.length} Eventos
          </span>
        </div>

        <DynamicTable 
          id="relatorio-paradas-maquina" 
          data={filteredRecords} 
          columns={tableColumns} 
          className="w-full text-left text-xs border-collapse font-sans border-0 shadow-none" 
        />
      </div>
    </div>
  );
};
