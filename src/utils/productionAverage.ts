import { Movement, RegisteredVehicle } from '../types';

export interface CalculatedAverages {
  avgDischarging: number | null; // average in seconds per container, or null if no data
  avgLoading: number | null; // average in seconds per container, or null if no data
  totalDischargingSampleCount: number;
  totalLoadingSampleCount: number;
  totalDischargedQty: number;
  totalLoadedQty: number;
  totalDischargingSecs: number;
  totalLoadingSecs: number;
}

/**
 * Calculates the actual real-world average times for discharging and loading empty containers,
 * based on completed Kanban movements with recorded production quantities and elapsed durations.
 */
export function calculateRealAverages(movements: Movement[], unit?: 'matriz' | 'filial'): CalculatedAverages {
  const filtered = movements.filter(m => 
    (!unit || (m.unit || 'matriz') === unit) &&
    !m.bypassProduction && 
    m.kanbanStep === 'concluido' &&
    m.kanbanTimings &&
    m.productionControl
  );

  let totalDischargingSecs = 0;
  let totalDischargedQty = 0;
  let totalDischargingSampleCount = 0;

  let totalLoadingSecs = 0;
  let totalLoadedQty = 0;
  let totalLoadingSampleCount = 0;

  filtered.forEach(m => {
    const t = m.kanbanTimings || {};
    const pauses = m.kanbanTotalPause || {};
    const pc = m.productionControl!;

    // 1. Discharging (Descarregamento)
    const dischargeStart = t['descarregamento'];
    const dischargeEnd = t['aguardando_carregamento'];
    const dischargeQty = pc.descarregadoQty;

    if (dischargeStart && dischargeEnd && dischargeQty > 0) {
      let diffMs = new Date(dischargeEnd).getTime() - new Date(dischargeStart).getTime();
      diffMs -= (pauses['descarregamento'] || 0);
      
      const stepAbsenceMs = (m.gateTemporaryExits || [])
        .filter(e => e.step === 'descarregamento')
        .reduce((sum, e) => {
          if (e.durationMs) return sum + e.durationMs;
          const exitTime = new Date(e.exitedAt).getTime();
          const stepEndTime = new Date(dischargeEnd).getTime();
          if (exitTime < stepEndTime) {
            return sum + (stepEndTime - exitTime);
          }
          return sum;
        }, 0);
      diffMs -= stepAbsenceMs;
      
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      
      totalDischargingSecs += secs;
      totalDischargedQty += dischargeQty;
      totalDischargingSampleCount++;
    }

    // 2. Loading (Carregamento)
    const loadStart = t['carregamento'];
    const loadEnd = t['concluido'];
    const loadQty = pc.totalCarregado;

    if (loadStart && loadEnd && loadQty > 0) {
      let diffMs = new Date(loadEnd).getTime() - new Date(loadStart).getTime();
      diffMs -= (pauses['carregamento'] || 0);
      
      const stepAbsenceMs = (m.gateTemporaryExits || [])
        .filter(e => e.step === 'carregamento')
        .reduce((sum, e) => {
          if (e.durationMs) return sum + e.durationMs;
          const exitTime = new Date(e.exitedAt).getTime();
          const stepEndTime = new Date(loadEnd).getTime();
          if (exitTime < stepEndTime) {
            return sum + (stepEndTime - exitTime);
          }
          return sum;
        }, 0);
      diffMs -= stepAbsenceMs;
      
      const secs = Math.max(0, Math.floor(diffMs / 1000));

      totalLoadingSecs += secs;
      totalLoadedQty += loadQty;
      totalLoadingSampleCount++;
    }
  });

  return {
    avgDischarging: totalDischargingSecs > 0 && totalDischargedQty > 0 ? Math.round((totalDischargedQty / (totalDischargingSecs / 60)) * 10) / 10 : null,
    avgLoading: totalLoadingSecs > 0 && totalLoadedQty > 0 ? Math.round((totalLoadedQty / (totalLoadingSecs / 60)) * 10) / 10 : null,
    totalDischargingSampleCount,
    totalLoadingSampleCount,
    totalDischargedQty,
    totalLoadedQty,
    totalDischargingSecs,
    totalLoadingSecs,
  };
}

export interface StepForecast {
  estimatedStartSecs: number;       // Forecasted wait time to start the step, in seconds
  estimatedRemainingSecs: number;   // Forecasted remaining time to finish the step, in seconds
  estimatedTotalWaitSecs: number;   // Total wait time until final exit from this or final step
}

/**
 * Calculates real-time forecasts for all active Kanban vehicles.
 * Generates predictions based on active slots and order of arrival in columns.
 */
export function calculateKanbanForecasts(
  movements: Movement[],
  avgTimeDischarging: number,
  avgTimeLoading: number,
  unit?: 'matriz' | 'filial',
  registeredVehicles?: RegisteredVehicle[]
): Record<string, StepForecast> {
  const forecasts: Record<string, StepForecast> = {};

  // Custom helpers to determine estimated quantity of bottles/packages
  const getDischargeQty = (m: Movement): number => {
    const qty = m.productionControl?.expectedDischargeQty || m.productionControl?.descarregadoQty || 0;
    if (qty > 0) return qty;
    if (registeredVehicles && m.plate) {
      const cleanPlate = m.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const regVeh = registeredVehicles.find(v => v.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanPlate);
      if (regVeh && regVeh.averageVasilhames !== undefined && regVeh.averageVasilhames > 0) {
        return regVeh.averageVasilhames;
      }
    }
    return 0;
  };

  const getLoadingQty = (m: Movement): number => {
    const qty = m.productionControl?.totalCarregado || m.productionControl?.descarregadoQty || 0;
    if (qty > 0) return qty;
    if (registeredVehicles && m.plate) {
      const cleanPlate = m.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const regVeh = registeredVehicles.find(v => v.plate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanPlate);
      if (regVeh && regVeh.averageVasilhames !== undefined && regVeh.averageVasilhames > 0) {
        return regVeh.averageVasilhames;
      }
    }
    return 0;
  };

  // We only care about active movements in the Kanban
  const activeMovements = movements
    .filter(m => 
      (!unit || (m.unit || 'matriz') === unit) &&
      !m.bypassProduction &&
      m.status !== 'saida' &&
      m.kanbanStep !== 'concluido'
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 1. Group active movements by Kanban step
  const waitingDischarge = activeMovements.filter(m => !m.kanbanStep || m.kanbanStep === 'aguardando_descarregamento');
  const discharging = activeMovements.filter(m => m.kanbanStep === 'descarregamento');
  const waitingLoad = activeMovements.filter(m => m.kanbanStep === 'aguardando_carregamento');
  const loading = activeMovements.filter(m => m.kanbanStep === 'carregamento');

  // Helper: Calculate elapsed seconds for a running step
  const getElapsedSeconds = (m: Movement, stepId: string): number => {
    const timings = m.kanbanTimings || {};
    const startObj = timings[stepId];
    if (!startObj) return 0;
    
    const start = new Date(startObj).getTime();
    const activeExit = (m.gateTemporaryExits || []).find(e => !e.returnedAt);
    const currentEnd = m.kanbanPausedAt 
      ? new Date(m.kanbanPausedAt).getTime() 
      : (activeExit ? new Date(activeExit.exitedAt).getTime() : Date.now());
      
    let diff = Math.max(0, currentEnd - start);
    diff -= (m.kanbanTotalPause?.[stepId] || 0);
    
    // Subtract finished temporary exits in this step
    const finishedAbsenceMs = (m.gateTemporaryExits || [])
      .filter(e => e.returnedAt && (e.step === stepId || (!e.step && stepId === 'aguardando_descarregamento')))
      .reduce((sum, e) => sum + (e.durationMs || 0), 0);
      
    diff -= finishedAbsenceMs;
    return Math.max(0, Math.floor(diff / 1000));
  };

  // --- MODEL DISCHARGING FLOW ---
  // Active discharging slots list containing the remaining seconds of each running discharge
  const dischargingSlots: number[] = discharging.map(m => {
    const qty = getDischargeQty(m);
    const totalEst = avgTimeDischarging > 0 ? (qty / avgTimeDischarging) * 60 : 0;
    const elapsed = getElapsedSeconds(m, 'descarregamento');
    const remaining = Math.max(0, totalEst - elapsed);
    
    // Save forecasts for active discharging
    forecasts[m.id] = {
      estimatedStartSecs: 0,
      estimatedRemainingSecs: remaining,
      estimatedTotalWaitSecs: remaining
    };
    return remaining;
  });

  // If no one is actively discharging, we assume at least 1 throughput channel is open
  if (dischargingSlots.length === 0) {
    dischargingSlots.push(0);
  }

  // Calculate forecasts for those waiting to discharge
  // Sorted by queue, they occupy discharging slots as they free up.
  waitingDischarge.forEach(m => {
    // Find the slot that becomes available first
    dischargingSlots.sort((a, b) => a - b);
    const startWait = dischargingSlots[0]; // Wait time to start unloading

    const qty = getDischargeQty(m);
    const stepDuration = avgTimeDischarging > 0 ? (qty / avgTimeDischarging) * 60 : 0;
    const finalDischargeTime = startWait + stepDuration;

    // Update the slot to reflect when this vehicle will finish discharging
    dischargingSlots[0] = finalDischargeTime;

    forecasts[m.id] = {
      estimatedStartSecs: startWait,
      estimatedRemainingSecs: stepDuration,
      estimatedTotalWaitSecs: finalDischargeTime
    };
  });


  // --- MODEL LOADING FLOW ---
  // Active loading slots list containing the remaining seconds of each running load
  const loadingSlots: number[] = loading.map(m => {
    const qty = getLoadingQty(m);
    const totalEst = avgTimeLoading > 0 ? (qty / avgTimeLoading) * 60 : 0;
    const elapsed = getElapsedSeconds(m, 'carregamento');
    const remaining = Math.max(0, totalEst - elapsed);

    forecasts[m.id] = {
      estimatedStartSecs: 0,
      estimatedRemainingSecs: remaining,
      estimatedTotalWaitSecs: remaining
    };
    return remaining;
  });

  // If no one is actively loading, we assume at least 1 throughput slot is open
  if (loadingSlots.length === 0) {
    loadingSlots.push(0);
  }

  // Calculate forecasts for those waiting to load
  // Sorted by queue, they occupy loading slots.
  waitingLoad.forEach(m => {
    loadingSlots.sort((a, b) => a - b);
    const startWait = loadingSlots[0];

    const qty = getLoadingQty(m);
    const stepDuration = avgTimeLoading > 0 ? (qty / avgTimeLoading) * 60 : 0;
    const finalLoadTime = startWait + stepDuration;

    loadingSlots[0] = finalLoadTime;

    forecasts[m.id] = {
      estimatedStartSecs: startWait,
      estimatedRemainingSecs: stepDuration,
      estimatedTotalWaitSecs: finalLoadTime
    };
  });

  return forecasts;
}
