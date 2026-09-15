import { Movement, ProductionStopLog, MachineInfo } from '../types';
import { getWorkScheduleStatus } from './workSchedule';

export interface StopRecordAnalysis {
  id: string;
  unit: string;
  machineId?: string;
  machineName: string;
  lineType: 'pesada' | 'media' | 'filial' | 'todas';
  stoppedAt: string;
  resumedAt?: string;
  isActive: boolean;
  totalDurationMs: number;
  workHoursDurationMs: number; // Duration of LOST PRODUCTION falling in regular work hours (07-11, 13-17) - strictly for quebra & manutencao
  scheduledPauseMs: number;    // Duration falling in scheduled pauses / descanso (e.g. 11-13, almoço)
  offHoursMs: number;          // Duration falling outside work schedule / fim de expediente
  reason: string;
  reasonCategory: 'quebra' | 'manutencao' | 'almoco' | 'insumos' | 'fim_expediente' | 'outros';
  isUnproductiveLoss: boolean;  // True ONLY for 'quebra' and 'manutencao'
  customReason?: string;
  isScheduledPause: boolean;
  stoppedBy: string;
  resumedBy?: string;
  notes?: string;
  productionRatePerHour: number; // Garrafões/hora rate of this line
  lostBottlesEstimate: number;   // Estimated 20L bottles lost during work hours (0 for scheduled pauses / descanso)
  lostLitersEstimate: number;    // Estimated liters lost (bottles * 20) (0 for scheduled pauses / descanso)
}

export interface MachineStopsSummary {
  totalStopsCount: number;
  activeStopsCount: number;
  unproductiveStopsCount: number;  // Quebras + Manutenções
  scheduledStopsCount: number;     // Almoço + Fim de Expediente
  totalDowntimeMs: number;
  totalWorkHoursDowntimeMs: number; // Somente Quebras + Manutenções durante expediente
  totalScheduledPauseMs: number;    // Almoço / Descanso
  totalOffHoursDowntimeMs: number;  // Fim de expediente / Fora de turno
  totalLostBottles: number;         // Somente Quebras + Manutenções
  totalLostLiters: number;          // Somente Quebras + Manutenções
  avgLoadingRatePerHour: number;
  
  // By Machine
  byMachine: Record<string, {
    machineId: string;
    machineName: string;
    lineType: string;
    stopsCount: number;
    unproductiveStopsCount: number;
    scheduledStopsCount: number;
    totalDowntimeMs: number;
    workHoursDowntimeMs: number;
    scheduledPauseMs: number;
    lostBottles: number;
    lostLiters: number;
    ratePerHour: number;
  }>;

  // By Reason Category
  byReason: Record<string, {
    reasonCategory: string;
    label: string;
    isUnproductive: boolean;
    stopsCount: number;
    totalDowntimeMs: number;
    workHoursDowntimeMs: number;
    scheduledPauseMs: number;
    lostBottles: number;
    lostLiters: number;
  }>;

  // By Date
  byDate: Record<string, {
    date: string;
    stopsCount: number;
    workHoursDowntimeMs: number;
    totalDowntimeMs: number;
    lostBottles: number;
    lostLiters: number;
  }>;

  records: StopRecordAnalysis[];
}

/**
 * Calculates overlap of any time window [start, end] with official work hours.
 * Mon-Fri: 07:00-11:00 (4h) and 13:00-17:00 (4h)
 * Sat: 07:00-11:00 (4h)
 * Scheduled Lunch: 11:00-13:00
 */
export function calculateScheduleOverlap(
  startDate: Date,
  endDate: Date
): {
  totalMs: number;
  workHoursMs: number;
  scheduledPauseMs: number;
  offHoursMs: number;
} {
  const totalMs = Math.max(0, endDate.getTime() - startDate.getTime());
  if (totalMs === 0) {
    return { totalMs: 0, workHoursMs: 0, scheduledPauseMs: 0, offHoursMs: 0 };
  }

  let workHoursMs = 0;
  let scheduledPauseMs = 0;
  let offHoursMs = 0;

  // Iterate day by day in the interval
  let current = new Date(startDate.getTime());

  while (current < endDate) {
    const day = current.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const year = current.getFullYear();
    const month = current.getMonth();
    const dateNum = current.getDate();

    // Work intervals for this day
    const dayStart = new Date(year, month, dateNum, 0, 0, 0, 0);
    const dayEnd = new Date(year, month, dateNum, 23, 59, 59, 999);

    const periodStart = current > startDate ? current : startDate;
    const periodEnd = endDate < dayEnd ? endDate : dayEnd;

    const t7h = new Date(year, month, dateNum, 7, 0, 0, 0);
    const t11h = new Date(year, month, dateNum, 11, 0, 0, 0);
    const t13h = new Date(year, month, dateNum, 13, 0, 0, 0);
    const t17h = new Date(year, month, dateNum, 17, 0, 0, 0);

    const getOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) => {
      const maxStart = Math.max(startA.getTime(), startB.getTime());
      const minEnd = Math.min(endA.getTime(), endB.getTime());
      return Math.max(0, minEnd - maxStart);
    };

    if (day >= 1 && day <= 5) {
      // Mon to Fri: 07:00-11:00 (work), 11:00-13:00 (lunch), 13:00-17:00 (work)
      const morningWork = getOverlap(periodStart, periodEnd, t7h, t11h);
      const lunchPause = getOverlap(periodStart, periodEnd, t11h, t13h);
      const afternoonWork = getOverlap(periodStart, periodEnd, t13h, t17h);

      const dayPeriodTotal = periodEnd.getTime() - periodStart.getTime();
      const nonWork = Math.max(0, dayPeriodTotal - morningWork - lunchPause - afternoonWork);

      workHoursMs += (morningWork + afternoonWork);
      scheduledPauseMs += lunchPause;
      offHoursMs += nonWork;
    } else if (day === 6) {
      // Saturday: 07:00-11:00 (work)
      const satWork = getOverlap(periodStart, periodEnd, t7h, t11h);
      const dayPeriodTotal = periodEnd.getTime() - periodStart.getTime();
      const nonWork = Math.max(0, dayPeriodTotal - satWork);

      workHoursMs += satWork;
      offHoursMs += nonWork;
    } else {
      // Sunday: off hours
      offHoursMs += (periodEnd.getTime() - periodStart.getTime());
    }

    // Advance to next day at 00:00:00
    current = new Date(year, month, dateNum + 1, 0, 0, 0, 0);
  }

  return {
    totalMs,
    workHoursMs,
    scheduledPauseMs,
    offHoursMs,
  };
}

/**
 * Calculates machine production rate based on real loading movements or default standard rates.
 */
export function calculateLineRates(
  movements: Movement[],
  unit?: string
): {
  pesadaPerHour: number;
  mediaPerHour: number;
  filialPerHour: number;
  overallPerHour: number;
} {
  const filtered = movements.filter(m => 
    (!unit || (m.unit || 'matriz') === unit) &&
    m.productionControl &&
    (m.productionControl.totalCarregado || 0) > 0
  );

  let pesadaQty = 0;
  let pesadaMs = 0;
  let mediaQty = 0;
  let mediaMs = 0;
  let filialQty = 0;
  let filialMs = 0;

  filtered.forEach(m => {
    const pc = m.productionControl!;
    const qty = (pc.totalCarregado || 0) + (pc.retornoVasilhameCheio || 0);
    const timings = m.kanbanTimings || {};
    const pauses = m.kanbanTotalPause || {};

    const start = timings['carregamento'];
    const end = timings['concluido'] || m.exitTimestamp;

    if (start && end) {
      let activeMs = new Date(end).getTime() - new Date(start).getTime();
      activeMs -= (pauses['carregamento'] || 0);
      
      if (activeMs > 60000 && qty > 0) { // at least 1 min to be a valid sample
        const isFilial = (m.unit || 'matriz') === 'filial';
        const isPesada = ['carreta', 'truck'].includes((m.vehicleType || '').toLowerCase().trim());

        if (isFilial) {
          filialQty += qty;
          filialMs += activeMs;
        } else if (isPesada) {
          pesadaQty += qty;
          pesadaMs += activeMs;
        } else {
          mediaQty += qty;
          mediaMs += activeMs;
        }
      }
    }
  });

  // Default calibrated baseline rates (bottles/hour)
  const defaultPesadaRate = 500; // ~8.3 bottles/min
  const defaultMediaRate = 400;  // ~6.7 bottles/min
  const defaultFilialRate = 350; // ~5.8 bottles/min

  const pesadaPerHour = pesadaMs > 0 && pesadaQty > 0 
    ? Math.round((pesadaQty / (pesadaMs / 3600000))) 
    : defaultPesadaRate;

  const mediaPerHour = mediaMs > 0 && mediaQty > 0 
    ? Math.round((mediaQty / (mediaMs / 3600000))) 
    : defaultMediaRate;

  const filialPerHour = filialMs > 0 && filialQty > 0 
    ? Math.round((filialQty / (filialMs / 3600000))) 
    : defaultFilialRate;

  const totalSamplesQty = pesadaQty + mediaQty + filialQty;
  const totalSamplesMs = pesadaMs + mediaMs + filialMs;

  const overallPerHour = totalSamplesMs > 0 && totalSamplesQty > 0
    ? Math.round((totalSamplesQty / (totalSamplesMs / 3600000)))
    : Math.round((pesadaPerHour + mediaPerHour) / 2);

  return {
    pesadaPerHour,
    mediaPerHour,
    filialPerHour,
    overallPerHour,
  };
}

/**
 * Categorizes a stop reason string into clean analytical groups.
 */
export function categorizeStopReason(reason: string, customReason?: string): {
  category: 'quebra' | 'manutencao' | 'almoco' | 'insumos' | 'fim_expediente' | 'outros';
  label: string;
  isUnproductive: boolean; // True if it represents an operational failure or maintenance loss
} {
  const norm = `${reason || ''} ${customReason || ''}`.toLowerCase();

  if (norm.includes('quebra') || norm.includes('quebrada') || norm.includes('defeito') || norm.includes('corretiva')) {
    return { category: 'quebra', label: 'Quebra de Máquina / Defeito', isUnproductive: true };
  }
  if (norm.includes('manuten') || norm.includes('preventiva') || norm.includes('lubrific') || norm.includes('calibr') || norm.includes('ajuste') || norm.includes('higieniz')) {
    return { category: 'manutencao', label: 'Manutenção / Ajuste Técnico', isUnproductive: true };
  }
  if (norm.includes('almoço') || norm.includes('almoco') || norm.includes('refeic') || norm.includes('refeição')) {
    return { category: 'almoco', label: 'Pausa para Almoço / Refeição (Descanso)', isUnproductive: false };
  }
  if (norm.includes('fim') || norm.includes('encerr') || norm.includes('turno') || norm.includes('expediente') || norm.includes('fechamento')) {
    return { category: 'fim_expediente', label: 'Encerramento de Expediente / Turno', isUnproductive: false };
  }
  if (norm.includes('vasilhame') || norm.includes('garraf') || norm.includes('insumo') || norm.includes('tampa') || norm.includes('rotulo') || norm.includes('energia') || norm.includes('agua')) {
    return { category: 'insumos', label: 'Falta de Insumos / Garrafões / Energia', isUnproductive: false };
  }

  return { category: 'outros', label: customReason || reason || 'Outras Pausas Operacionais', isUnproductive: false };
}

/**
 * Builds full Machine Stops Analytics from stop logs, current machine statuses, and kanban pauses.
 */
export function generateMachineStopsReport(
  stopLogs: ProductionStopLog[] = [],
  productionMachines?: Record<string, Record<string, MachineInfo>>,
  movements: Movement[] = [],
  targetUnit?: string,
  filterStartDate?: string,
  filterEndDate?: string,
  filterMachineId?: string,
  filterReasonCategory?: string
): MachineStopsSummary {
  const now = new Date();
  const rates = calculateLineRates(movements, targetUnit);

  const rawRecords: Array<{
    id: string;
    unit: string;
    machineId?: string;
    machineName: string;
    lineType: 'pesada' | 'media' | 'filial' | 'todas';
    stoppedAt: string;
    resumedAt?: string;
    reason: string;
    customReason?: string;
    isScheduledPause: boolean;
    stoppedBy: string;
    resumedBy?: string;
    notes?: string;
  }> = [];

  // 1. Process explicit stop logs
  stopLogs.forEach(log => {
    const logUnit = log.unit || 'matriz';
    if (targetUnit && targetUnit !== 'todas' && logUnit !== targetUnit) return;

    let lineType: 'pesada' | 'media' | 'filial' | 'todas' = 'todas';
    let machineName = 'Todas as Linhas (Geral)';

    if (log.machineId) {
      if (log.machineId.includes('1') || log.machineId.includes('pesada')) {
        lineType = 'pesada';
        machineName = 'Máquina 1 (Linha Pesada)';
      } else if (log.machineId.includes('2') || log.machineId.includes('media')) {
        lineType = 'media';
        machineName = 'Máquina 2 (Linha Média)';
      } else if (log.machineId.includes('filial')) {
        lineType = 'filial';
        machineName = 'Máquina Filial';
      }
    } else if (logUnit === 'filial') {
      lineType = 'filial';
      machineName = 'Máquina Filial';
    }

    rawRecords.push({
      id: log.id,
      unit: logUnit,
      machineId: log.machineId,
      machineName,
      lineType,
      stoppedAt: log.stoppedAt,
      resumedAt: log.resumedAt,
      reason: log.reason,
      customReason: log.customReason,
      isScheduledPause: !!log.isScheduledPause,
      stoppedBy: log.stoppedBy || 'Operador',
      resumedBy: log.resumedBy,
      notes: log.notes,
    });
  });

  // 2. Also check if machines in productionMachines are currently stopped without an open log
  if (productionMachines) {
    Object.entries(productionMachines).forEach(([uKey, unitMachines]) => {
      if (targetUnit && targetUnit !== 'todas' && uKey !== targetUnit) return;

      Object.values(unitMachines || {}).forEach(m => {
        if (m.status !== 'operacional' && m.stoppedAt) {
          // Check if there is already an active log for this machine
          const exists = rawRecords.some(r => r.machineId === m.id && !r.resumedAt);
          if (!exists) {
            rawRecords.push({
              id: `active_${m.id}_${m.stoppedAt}`,
              unit: uKey,
              machineId: m.id,
              machineName: m.name,
              lineType: m.lineType as any || (m.id === 'machine_1' ? 'pesada' : 'media'),
              stoppedAt: m.stoppedAt,
              resumedAt: m.resumedAt,
              reason: m.status,
              customReason: m.reason || m.notes || `Máquina ${m.status}`,
              isScheduledPause: m.status === 'pausada_almoco',
              stoppedBy: m.stoppedBy || 'Operador',
              notes: m.notes,
            });
          }
        }
      });
    });
  }

  // 3. Filter by date, machine, and reason
  const processedRecords: StopRecordAnalysis[] = [];

  rawRecords.forEach(raw => {
    const stopDateStr = raw.stoppedAt.split('T')[0];

    if (filterStartDate && stopDateStr < filterStartDate) return;
    if (filterEndDate && stopDateStr > filterEndDate) return;
    if (filterMachineId && filterMachineId !== 'all' && raw.machineId && raw.machineId !== filterMachineId) return;

    const { category, label, isUnproductive } = categorizeStopReason(raw.reason, raw.customReason);
    if (filterReasonCategory && filterReasonCategory !== 'all' && category !== filterReasonCategory) return;

    const start = new Date(raw.stoppedAt);
    const end = raw.resumedAt ? new Date(raw.resumedAt) : now;

    if (isNaN(start.getTime())) return;

    const overlap = calculateScheduleOverlap(start, end);
    const isActive = !raw.resumedAt;

    // Rate for this line
    let lineRate = rates.overallPerHour;
    const currentMachineInfo = productionMachines && productionMachines[raw.unit] && raw.machineId ? productionMachines[raw.unit][raw.machineId] : null;
    
    if (currentMachineInfo && currentMachineInfo.capacityPerHour) {
      lineRate = currentMachineInfo.capacityPerHour;
    } else if (raw.lineType === 'pesada') {
      lineRate = rates.pesadaPerHour;
    } else if (raw.lineType === 'media') {
      lineRate = rates.mediaPerHour;
    } else if (raw.lineType === 'filial') {
      lineRate = rates.filialPerHour;
    }

    // RULE: Lost production time and lost bottles calculation applies ONLY to QUEBRA and MANUTENCAO!
    // Lunch (almoço) and end of shift (fim de expediente) are scheduled rest/closed periods and do not penalize production.
    let lostProductionWorkHoursMs = 0;
    let lostBottlesEstimate = 0;
    let lostLitersEstimate = 0;
    let scheduledPauseMs = overlap.scheduledPauseMs;
    let offHoursMs = overlap.offHoursMs;

    if (isUnproductive) {
      // Unplanned downtime: count overlap with regular work hours (07-11, 13-17)
      lostProductionWorkHoursMs = overlap.workHoursMs;
      const lostHours = lostProductionWorkHoursMs / (1000 * 60 * 60);
      lostBottlesEstimate = Math.round(lostHours * lineRate);
      lostLitersEstimate = lostBottlesEstimate * 20;
    } else {
      // Scheduled rest or operational pause: no production loss penalty
      lostProductionWorkHoursMs = 0;
      lostBottlesEstimate = 0;
      lostLitersEstimate = 0;

      if (category === 'almoco') {
        scheduledPauseMs = overlap.totalMs;
        offHoursMs = 0;
      } else if (category === 'fim_expediente') {
        offHoursMs = overlap.totalMs;
        scheduledPauseMs = 0;
      } else {
        scheduledPauseMs = overlap.scheduledPauseMs + overlap.workHoursMs;
      }
    }

    processedRecords.push({
      id: raw.id,
      unit: raw.unit,
      machineId: raw.machineId,
      machineName: raw.machineName,
      lineType: raw.lineType,
      stoppedAt: raw.stoppedAt,
      resumedAt: raw.resumedAt,
      isActive,
      totalDurationMs: overlap.totalMs,
      workHoursDurationMs: lostProductionWorkHoursMs,
      scheduledPauseMs,
      offHoursMs,
      reason: raw.reason,
      reasonCategory: category,
      isUnproductiveLoss: isUnproductive,
      customReason: raw.customReason || label,
      isScheduledPause: raw.isScheduledPause || !isUnproductive,
      stoppedBy: raw.stoppedBy,
      resumedBy: raw.resumedBy,
      notes: raw.notes,
      productionRatePerHour: lineRate,
      lostBottlesEstimate,
      lostLitersEstimate,
    });
  });

  // Sort by stoppedAt descending (newest first)
  processedRecords.sort((a, b) => new Date(b.stoppedAt).getTime() - new Date(a.stoppedAt).getTime());

  // Aggregate stats
  let totalDowntimeMs = 0;
  let totalWorkHoursDowntimeMs = 0;
  let totalScheduledPauseMs = 0;
  let totalOffHoursDowntimeMs = 0;
  let totalLostBottles = 0;
  let totalLostLiters = 0;
  let activeStopsCount = 0;
  let unproductiveStopsCount = 0;
  let scheduledStopsCount = 0;

  const byMachine: MachineStopsSummary['byMachine'] = {};
  const byReason: MachineStopsSummary['byReason'] = {};
  const byDate: MachineStopsSummary['byDate'] = {};

  processedRecords.forEach(r => {
    totalDowntimeMs += r.totalDurationMs;
    totalWorkHoursDowntimeMs += r.workHoursDurationMs;
    totalScheduledPauseMs += r.scheduledPauseMs;
    totalOffHoursDowntimeMs += r.offHoursMs;
    totalLostBottles += r.lostBottlesEstimate;
    totalLostLiters += r.lostLitersEstimate;
    if (r.isActive) activeStopsCount++;
    if (r.isUnproductiveLoss) unproductiveStopsCount++;
    else scheduledStopsCount++;

    // Group By Machine
    const mKey = r.machineId || r.lineType || 'geral';
    if (!byMachine[mKey]) {
      byMachine[mKey] = {
        machineId: r.machineId || 'geral',
        machineName: r.machineName,
        lineType: r.lineType,
        stopsCount: 0,
        unproductiveStopsCount: 0,
        scheduledStopsCount: 0,
        totalDowntimeMs: 0,
        workHoursDowntimeMs: 0,
        scheduledPauseMs: 0,
        lostBottles: 0,
        lostLiters: 0,
        ratePerHour: r.productionRatePerHour,
      };
    }
    byMachine[mKey].stopsCount += 1;
    if (r.isUnproductiveLoss) byMachine[mKey].unproductiveStopsCount += 1;
    else byMachine[mKey].scheduledStopsCount += 1;
    byMachine[mKey].totalDowntimeMs += r.totalDurationMs;
    byMachine[mKey].workHoursDowntimeMs += r.workHoursDurationMs;
    byMachine[mKey].scheduledPauseMs += r.scheduledPauseMs;
    byMachine[mKey].lostBottles += r.lostBottlesEstimate;
    byMachine[mKey].lostLiters += r.lostLitersEstimate;

    // Group By Reason
    const rKey = r.reasonCategory;
    if (!byReason[rKey]) {
      const { label, isUnproductive } = categorizeStopReason(r.reason, r.customReason);
      byReason[rKey] = {
        reasonCategory: rKey,
        label,
        isUnproductive,
        stopsCount: 0,
        totalDowntimeMs: 0,
        workHoursDowntimeMs: 0,
        scheduledPauseMs: 0,
        lostBottles: 0,
        lostLiters: 0,
      };
    }
    byReason[rKey].stopsCount += 1;
    byReason[rKey].totalDowntimeMs += r.totalDurationMs;
    byReason[rKey].workHoursDowntimeMs += r.workHoursDurationMs;
    byReason[rKey].scheduledPauseMs += r.scheduledPauseMs;
    byReason[rKey].lostBottles += r.lostBottlesEstimate;
    byReason[rKey].lostLiters += r.lostLitersEstimate;

    // Group By Date
    const dKey = r.stoppedAt.split('T')[0];
    if (!byDate[dKey]) {
      byDate[dKey] = {
        date: dKey,
        stopsCount: 0,
        totalDowntimeMs: 0,
        workHoursDowntimeMs: 0,
        lostBottles: 0,
        lostLiters: 0,
      };
    }
    byDate[dKey].stopsCount += 1;
    byDate[dKey].totalDowntimeMs += r.totalDurationMs;
    byDate[dKey].workHoursDowntimeMs += r.workHoursDurationMs;
    byDate[dKey].lostBottles += r.lostBottlesEstimate;
    byDate[dKey].lostLiters += r.lostLitersEstimate;
  });

  return {
    totalStopsCount: processedRecords.length,
    activeStopsCount,
    unproductiveStopsCount,
    scheduledStopsCount,
    totalDowntimeMs,
    totalWorkHoursDowntimeMs,
    totalScheduledPauseMs,
    totalOffHoursDowntimeMs,
    totalLostBottles,
    totalLostLiters,
    avgLoadingRatePerHour: rates.overallPerHour,
    byMachine,
    byReason,
    byDate,
    records: processedRecords,
  };
}
